"use client";

import { useEffect, useState, useCallback } from "react";
import type { Scan } from "@/types";
import { ShareModal } from "@/components/ShareModal";
import { severityStyles, categoryLabels, categoryIcons } from "@/components/RiskCard";

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
  const [isShareOpen, setIsShareOpen] = useState(false);

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

  const categories = [
    { key: "ip", label: "Intellectual Property", icon: "⚖️" },
    { key: "payment", label: "Payment Terms", icon: "💸" },
    { key: "non-compete", label: "Non-Compete", icon: "💼" },
    { key: "termination", label: "Termination", icon: "🚪" }
  ];

  const severityLabels = {
    critical: "Critical Risk 🔴",
    important: "Important 🟡",
    safe: "Safe 🟢"
  };

  const severityBadgeClass = {
    critical: "border-error/30 text-error bg-error/5",
    important: "border-yellow-500/30 text-yellow-300 bg-yellow-500/5",
    safe: "border-primary/30 text-primary bg-primary/5"
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <p className="text-label text-primary tracking-widest">
                Scan Complete
              </p>
            </div>
            <h2 className="text-2xl font-bold text-on-surface">
              {scan.filename}
            </h2>
            <p className="text-sm text-on-surface-variant max-w-xl">
              We completed scanning your contract across all 4 key areas. Review the risks below and take action directly using the controls.
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-lowest/80 px-5 py-3 text-sm font-semibold text-on-surface hover:text-primary hover:border-primary/40 transition-all hover:scale-[1.02]"
            >
              <span>📄</span> Export PDF
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex items-center justify-center gap-2 rounded-full btn-primary px-6 py-3 text-sm font-semibold hover:scale-[1.02] shadow-glow-primary"
            >
              <span>📧</span> Send Counter Offer
            </button>
          </div>
        </div>

        {/* Quick status summary grid */}
        <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4 border-t border-outline-variant/10 pt-6">
          {categories.map((cat) => {
            const risk = scan.risks.find((r) => r.category === cat.key);
            const severity = risk?.severity || "safe";
            return (
              <div
                key={cat.key}
                className="rounded-2xl bg-surface-container-lowest/40 border border-outline-variant/10 p-4 flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 text-on-surface-variant mb-3">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider truncate">{cat.label}</span>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityBadgeClass[severity]}`}>
                    {severityLabels[severity]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Confidence bar (kept as overall dashboard metric) */}
        <div className="mt-6 border-t border-outline-variant/5 pt-4">
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1.5">
            <span>Overall confidence score</span>
            <span className="font-semibold text-primary">{scan.confidenceScore}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-lowest">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary transition-all duration-700"
              style={{ width: `${scan.confidenceScore}%`, boxShadow: '0 0 12px rgba(78, 222, 163, 0.3)' }}
            />
          </div>
        </div>
      </div>

      {/* Risk cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {sortedRisks.map((risk) => (
          <RiskResultCard key={risk.id} risk={risk} showFix={scan.planType === "premium"} />
        ))}
      </div>

      {/* Share Modal */}
      {isShareOpen && (
        <ShareModal scan={scan} onClose={() => setIsShareOpen(false)} />
      )}
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
  };
  showFix: boolean;
}) {
  const style = severityStyles[risk.severity];

  return (
    <div
      className={`glass-card rounded-2xl p-6 ${style.accent} transition-all duration-300 flex flex-col justify-between relative overflow-hidden`}
    >
      <div>
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">{categoryIcons[risk.category] || "📄"}</span>
            <h3 className="text-base font-semibold text-on-surface">
              {categoryLabels[risk.category] ?? risk.category}
            </h3>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${style.badge}`}
          >
            {risk.severity}
          </span>
        </div>

        <div className="space-y-4">
          {/* Monospace/Serif Document Clause */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70 mb-1.5 flex items-center gap-1.5">
              <span>📄</span> Contract Clause
            </h4>
            <blockquote className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-3.5 text-xs italic font-serif leading-relaxed text-on-surface-variant/90 shadow-inner">
              &ldquo;{risk.clauseText}&rdquo;
            </blockquote>
          </div>

          {/* Risk Explanation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70 mb-1.5 flex items-center gap-1.5">
              <span>⚠️</span> Risk Analysis
            </h4>
            <p className="text-sm leading-relaxed text-on-surface/90">
              {risk.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Fix Message (Premium only) */}
      {showFix && risk.fixMessage && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mt-4 shadow-sm animate-slide-up">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
            <span>💡</span> Suggested Negotiation Edit
          </h4>
          <p className="text-sm leading-relaxed text-on-surface/90 font-medium">
            {risk.fixMessage}
          </p>
        </div>
      )}
    </div>
  );
}
