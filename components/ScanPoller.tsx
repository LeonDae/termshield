"use client";

import { useEffect, useState, useCallback } from "react";
import type { Scan } from "@/types";

interface ScanPollerProps {
  scanId: string;
  initialScan?: Scan | null;
}

/**
 * Client component that polls /api/scan/[id] every 3 seconds
 * until the scan is "complete" or "failed".
 */
export function ScanPoller({ scanId, initialScan }: ScanPollerProps) {
  const [scan, setScan] = useState<Scan | null>(initialScan ?? null);
  const [error, setError] = useState("");
  const [isPolling, setIsPolling] = useState(true);

  const fetchScan = useCallback(async () => {
    try {
      const res = await fetch(`/api/scan/${scanId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Failed to load scan.");
        return;
      }

      if (data.scan) {
        setScan(data.scan);

        // Stop polling once terminal state reached
        if (data.scan.status === "complete" || data.scan.status === "failed") {
          setIsPolling(false);
        }
      }
    } catch {
      setError("Network error while loading scan status.");
    }
  }, [scanId]);

  useEffect(() => {
    // Initial fetch
    fetchScan();

    if (!isPolling) return;

    const interval = setInterval(fetchScan, 3000);
    return () => clearInterval(interval);
  }, [fetchScan, isPolling]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-semibold text-red-800">{error}</p>
        <button
          onClick={() => {
            setError("");
            setIsPolling(true);
          }}
          className="mt-3 rounded-full bg-red-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!scan) {
    return <ScanLoadingSkeleton />;
  }

  // --- Processing / Pending state ---
  if (scan.status !== "complete" && scan.status !== "failed") {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950"></div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Analyzing your contract...
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Our AI is scanning for risky clauses across IP, Payment,
              Non-Compete, and Termination categories. This usually takes 15–30
              seconds.
            </p>
          </div>
          <div className="mt-4 grid w-full max-w-sm gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <StatusRow label="File" value={scan.filename} />
            <StatusRow label="Plan" value={scan.planType.toUpperCase()} />
            <StatusRow
              label="Status"
              value={scan.status.toUpperCase()}
              highlight
            />
          </div>
        </div>
      </section>
    );
  }

  // --- Failed state ---
  if (scan.status === "failed") {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg
            className="h-10 w-10 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-red-900">
            Scan failed
          </h2>
          <p className="max-w-md text-sm text-red-800">
            Something went wrong while analyzing your contract. This happens
            occasionally. Please try uploading again.
          </p>
          <a
            href="/"
            className="mt-2 rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Try again
          </a>
        </div>
      </section>
    );
  }

  // --- Complete state: show risk results ---
  const severityOrder = { critical: 0, important: 1, safe: 2 };
  const sortedRisks = [...scan.risks].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  const criticalCount = scan.risks.filter((r) => r.severity === "critical").length;
  const importantCount = scan.risks.filter((r) => r.severity === "important").length;
  const safeCount = scan.risks.filter((r) => r.severity === "safe").length;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Scan Complete
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              {scan.filename}
            </h2>
          </div>
          <div className="flex gap-3 text-sm">
            <StatBadge
              label="Critical"
              count={criticalCount}
              color="bg-red-100 text-red-800"
            />
            <StatBadge
              label="Important"
              count={importantCount}
              color="bg-amber-100 text-amber-800"
            />
            <StatBadge
              label="Safe"
              count={safeCount}
              color="bg-emerald-100 text-emerald-800"
            />
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Overall confidence</span>
            <span className="font-semibold">{scan.confidenceScore}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950 transition-all duration-700"
              style={{ width: `${scan.confidenceScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Risk cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {sortedRisks.map((risk) => (
          <RiskResultCard key={risk.id} risk={risk} showFix={scan.planType === "premium"} />
        ))}
      </div>
    </section>
  );
}

/* ─── Helper components ─── */

function StatusRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span
        className={
          highlight
            ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800"
            : "font-semibold text-slate-950"
        }
      >
        {value}
      </span>
    </div>
  );
}

function StatBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${color}`}
    >
      {count} {label}
    </span>
  );
}

function ScanLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-32 rounded-[2rem] bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 rounded-2xl bg-slate-200" />
        <div className="h-48 rounded-2xl bg-slate-200" />
        <div className="h-48 rounded-2xl bg-slate-200" />
        <div className="h-48 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

const severityStyles = {
  critical: {
    border: "border-red-200",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-800",
    icon: "text-red-600",
  },
  important: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    icon: "text-amber-600",
  },
  safe: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    icon: "text-emerald-600",
  },
};

const categoryLabels: Record<string, string> = {
  ip: "Intellectual Property",
  payment: "Payment Terms",
  "non-compete": "Non-Compete",
  termination: "Termination",
};

function RiskResultCard({
  risk,
  showFix,
}: {
  risk: {
    id: string;
    category: string;
    severity: "critical" | "important" | "safe";
    clauseText: string;
    explanation: string;
    fixMessage?: string;
    confidence?: number;
  };
  showFix: boolean;
}) {
  const style = severityStyles[risk.severity];

  return (
    <div
      className={`rounded-2xl border ${style.border} ${style.bg} p-5 transition`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${style.badge}`}
          >
            {risk.severity}
          </span>
          <h3 className="mt-2 text-sm font-semibold text-slate-950">
            {categoryLabels[risk.category] ?? risk.category}
          </h3>
        </div>
        {risk.confidence !== undefined && (
          <span className="text-xs text-slate-500">
            {Math.round(risk.confidence)}% conf.
          </span>
        )}
      </div>

      <blockquote className="mt-3 border-l-2 border-slate-300 pl-3 text-xs italic leading-5 text-slate-700">
        &ldquo;{risk.clauseText}&rdquo;
      </blockquote>

      <p className="mt-3 text-sm leading-6 text-slate-800">
        {risk.explanation}
      </p>

      {showFix && risk.fixMessage && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Suggested fix message
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-800">
            {risk.fixMessage}
          </p>
        </div>
      )}
    </div>
  );
}
