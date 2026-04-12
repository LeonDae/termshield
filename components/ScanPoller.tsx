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
      <div className="glass-card rounded-3xl p-6 text-center border-error/20">
        <p className="text-sm font-semibold text-error">{error}</p>
        <button
          onClick={() => {
            setError("");
            setIsPolling(true);
          }}
          className="mt-3 rounded-full bg-error/20 px-4 py-2 text-xs font-semibold text-error transition hover:bg-error/30"
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
      <section className="glass-card rounded-3xl p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-surface-container-high border-t-primary animate-spin" style={{boxShadow: '0 0 20px rgba(78, 222, 163, 0.2)'}} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-on-surface">
              Analyzing your contract...
            </h2>
            <p className="mt-2 max-w-md text-sm text-on-surface-variant">
              Our AI is scanning for risky clauses across IP, Payment,
              Non-Compete, and Termination categories. This usually takes 15–30
              seconds.
            </p>
          </div>
          <div className="mt-4 grid w-full max-w-sm gap-3 rounded-2xl bg-surface-container-lowest/40 border border-outline-variant/10 p-4">
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
      <section className="glass-card rounded-3xl p-8 border-error/20">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg
            className="h-10 w-10 text-error"
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
          <h2 className="text-xl font-semibold text-error">
            Scan failed
          </h2>
          <p className="max-w-md text-sm text-on-surface-variant">
            Something went wrong while analyzing your contract. This happens
            occasionally. Please try uploading again.
          </p>
          <a
            href="/"
            className="mt-2 btn-primary rounded-full px-6 py-2.5 text-sm font-semibold"
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
      <div className="glass-card rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-label text-primary">
              Scan Complete
            </p>
            <h2 className="text-2xl font-semibold text-on-surface">
              {scan.filename}
            </h2>
          </div>
          <div className="flex gap-3 text-sm">
            <StatBadge
              label="Critical"
              count={criticalCount}
              color="bg-error/15 text-error"
            />
            <StatBadge
              label="Important"
              count={importantCount}
              color="bg-yellow-400/15 text-yellow-300"
            />
            <StatBadge
              label="Safe"
              count={safeCount}
              color="bg-primary/15 text-primary"
            />
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Overall confidence</span>
            <span className="font-semibold text-primary">{scan.confidenceScore}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-container-lowest">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary transition-all duration-700"
              style={{ width: `${scan.confidenceScore}%`, boxShadow: '0 0 12px rgba(78, 222, 163, 0.3)' }}
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
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={
          highlight
            ? "rounded-full bg-yellow-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-300"
            : "font-semibold text-on-surface"
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
    <div className="space-y-4">
      <div className="h-32 rounded-3xl shimmer" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 rounded-2xl shimmer" />
        <div className="h-48 rounded-2xl shimmer" />
        <div className="h-48 rounded-2xl shimmer" />
        <div className="h-48 rounded-2xl shimmer" />
      </div>
    </div>
  );
}

const severityStyles = {
  critical: {
    accent: "accent-critical",
    badge: "bg-error/15 text-error",
  },
  important: {
    accent: "accent-important",
    badge: "bg-yellow-400/15 text-yellow-300",
  },
  safe: {
    accent: "accent-safe",
    badge: "bg-primary/15 text-primary",
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
      className={`glass-card rounded-2xl p-5 ${style.accent} transition-all duration-300`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${style.badge}`}
          >
            {risk.severity}
          </span>
          <h3 className="mt-2 text-sm font-semibold text-on-surface">
            {categoryLabels[risk.category] ?? risk.category}
          </h3>
        </div>
        {risk.confidence !== undefined && (
          <span className="text-xs text-on-surface-variant">
            {Math.round(risk.confidence)}% conf.
          </span>
        )}
      </div>

      <blockquote className="mt-3 border-l-2 border-outline-variant/30 pl-3 text-xs italic leading-5 text-on-surface-variant">
        &ldquo;{risk.clauseText}&rdquo;
      </blockquote>

      <p className="mt-3 text-sm leading-6 text-on-surface/80">
        {risk.explanation}
      </p>

      {showFix && risk.fixMessage && (
        <div className="mt-3 rounded-xl bg-surface-container-lowest/40 border border-outline-variant/10 p-3">
          <p className="text-label text-primary/70">
            Suggested fix message
          </p>
          <p className="mt-1 text-sm leading-6 text-on-surface/80">
            {risk.fixMessage}
          </p>
        </div>
      )}
    </div>
  );
}
