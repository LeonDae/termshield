"use client";

import { useEffect, useState, useCallback } from "react";
import type { Scan } from "@/types";
import { ShareModal } from "@/components/ShareModal";
import { categoryLabels, categoryIcons } from "@/components/RiskCard";

interface ScanPollerProps {
  scanId: string;
  initialScan?: Scan | null;
}



const detectionMethodBadge: Record<string, { label: string; className: string }> = {
  rule: { label: "⚡ Rule", className: "bg-emerald-500/15 text-emerald-300" },
  retrieval: { label: "🔍 Retrieval", className: "bg-blue-500/15 text-blue-300" },
  llm: { label: "🤖 AI", className: "bg-purple-500/15 text-purple-300" },
  hybrid: { label: "⚡🤖 Hybrid", className: "bg-amber-500/15 text-amber-300" },
};

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
    return <ScanningAnimation scan={scan} />;
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

  // Build dynamic categories from scan results
  const uniqueCategories = scan.risks
    .map((r) => r.category)
    .filter((cat, i, arr) => arr.indexOf(cat) === i)
    .map((cat) => ({
      key: cat,
      label: categoryLabels[cat] ?? cat,
      icon: categoryIcons[cat] ?? "📄",
    }));

  // Stats
  const criticalCount = scan.risks.filter(r => r.severity === "critical").length;
  const importantCount = scan.risks.filter(r => r.severity === "important").length;
  const safeCount = scan.risks.filter(r => r.severity === "safe").length;

  return (
    <section className="space-y-8 page-transition-enter">
      {/* ═══════ Header Panel ═══════ */}
      <div className="glass-card rounded-3xl relative overflow-hidden">
        {/* Top gradient accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#ff6b6b] via-[#fbbf24] to-[#10b981]" />
        
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                <p className="text-label text-primary tracking-widest">
                  Analysis Complete
                </p>
              </div>
              <h2 className="text-2xl font-bold text-on-surface">
                {scan.filename}
              </h2>
              <p className="text-sm text-on-surface-variant max-w-xl leading-relaxed">
                Our hybrid AI pipeline analyzed your contract across <strong className="text-on-surface">{uniqueCategories.length} risk categories</strong>, identifying {criticalCount + importantCount} actionable findings.
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 no-print shrink-0">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/80 px-5 py-2.5 text-sm font-semibold text-on-surface hover:text-primary hover:border-primary/40 transition-all hover:scale-[1.02]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Export PDF
              </button>
              {scan.planType === "premium" && (
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl btn-primary px-6 py-2.5 text-sm font-semibold hover:scale-[1.02] shadow-glow-primary"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                  Send Counter Offer
                </button>
              )}
            </div>
          </div>

          {/* Summary Stats Bar */}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-outline-variant/10 pt-5">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-[#ff6b6b]/8 border border-[#ff6b6b]/15 px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-[#ff6b6b] animate-pulse" />
                <span className="text-xs font-bold text-[#ff6b6b]">{criticalCount}</span>
                <span className="text-xs text-[#ff6b6b]/70">Critical</span>
              </div>
            )}
            {importantCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-[#fbbf24]/8 border border-[#fbbf24]/15 px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                <span className="text-xs font-bold text-[#fbbf24]">{importantCount}</span>
                <span className="text-xs text-[#fbbf24]/70">Important</span>
              </div>
            )}
            {safeCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-400">{safeCount}</span>
                <span className="text-xs text-emerald-400/70">Safe</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/10 px-4 py-2">
              <span className="text-xs text-on-surface-variant">Confidence</span>
              <span className="text-sm font-bold text-primary">{scan.confidenceScore}%</span>
            </div>
          </div>

          {/* Category pills */}
          <div className={`mt-4 grid gap-3 ${
            uniqueCategories.length <= 3
              ? "grid-cols-3"
              : uniqueCategories.length <= 4
              ? "grid-cols-2 lg:grid-cols-4"
              : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          }`}>
            {uniqueCategories.map((cat) => {
              const risk = scan.risks.find((r) => r.category === cat.key);
              const severity = risk?.severity || "safe";
              const severityColor = severity === "critical" ? "#ff6b6b" : severity === "important" ? "#fbbf24" : "#10b981";
              return (
                <div
                  key={cat.key}
                  className="rounded-xl bg-surface-container-lowest/40 border border-outline-variant/10 p-3 flex items-center gap-3 transition-all hover:border-outline-variant/25"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-on-surface truncate block">{cat.label}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: severityColor }}>{severity}</span>
                  </div>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: severityColor }} />
                </div>
              );
            })}
          </div>

          {/* Confidence bar */}
          <div className="mt-5 pt-4 border-t border-outline-variant/5">
            <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1.5">
              <span>Detection Confidence</span>
              <span className="font-semibold text-primary">{scan.confidenceScore}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-lowest">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${scan.confidenceScore}%`,
                  background: `linear-gradient(90deg, #3b82f6, ${scan.confidenceScore > 80 ? '#3b82f6' : scan.confidenceScore > 50 ? '#fbbf24' : '#ff6b6b'})`,
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.25)'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Risk Cards Grid ═══════ */}
      <div className="grid gap-6 md:grid-cols-2">
        {sortedRisks.map((risk, idx) => (
          <RiskResultCard
            key={risk.id}
            risk={risk}
            index={idx}
            isPremium={scan.planType === "premium"}
          />
        ))}
      </div>

      {/* Share Modal */}
      {isShareOpen && (
        <ShareModal scan={scan} onClose={() => setIsShareOpen(false)} />
      )}
    </section>
  );
}
/* ─── Rich Scanning Animation ─── */

const SCAN_STAGES = [
  { id: "rule", label: "Rule Matching", icon: "⚡" },
  { id: "retrieval", label: "Semantic Retrieval", icon: "🔍" },
  { id: "ai", label: "AI Analysis", icon: "🤖" },
];

function ScanningAnimation({ scan }: { scan: { filename: string; planType: string; status: string } }) {
  const [activeStage, setActiveStage] = useState(0);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    // Cycle through stages
    const stageInterval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % SCAN_STAGES.length);
    }, 4000);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const increment = Math.random() * 8 + 2;
        return Math.min(92, prev + increment);
      });
    }, 2000);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <section className="glass-card rounded-3xl p-8 page-transition-enter">
      <div className="scan-animation-container">
        {/* Floating particles */}
        <div className="scan-particles">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="scan-particle" />
          ))}
        </div>

        {/* Document silhouette with scan line */}
        <div className="scan-document">
          <div className="scan-doc-fold" />
          <div className="scan-line" />
          <div className="scan-line-glow" />
          <div className="scan-doc-lines">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="scan-doc-line" />
            ))}
          </div>
        </div>

        {/* Title and description */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-on-surface">
            Analyzing your contract...
          </h2>
          <p className="max-w-md text-sm text-on-surface-variant mx-auto">
            Our hybrid AI pipeline is scanning for risky clauses across 10
            risk categories. This usually takes 15–45 seconds.
          </p>
        </div>

        {/* Stage indicators */}
        <div className="scan-stages">
          {SCAN_STAGES.map((stage, i) => {
            let stageClass = "scan-stage";
            if (i === activeStage) stageClass += " active";
            else if (i < activeStage) stageClass += " completed";
            return (
              <div key={stage.id} className={stageClass}>
                <div className="scan-stage-dot" />
                <span>{stage.icon}</span>
                <span>{stage.label}</span>
                {i < activeStage && <span className="text-[10px]">✓</span>}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="scan-progress-track">
          <div
            className="scan-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* File metadata */}
        <div className="grid w-full max-w-sm gap-3 rounded-2xl bg-surface-container-lowest/40 border border-outline-variant/10 p-4">
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
  index = 0,
  isPremium = false,
}: {
  risk: {
    id: string;
    category: string;
    severity: "critical" | "important" | "safe";
    clauseText: string;
    explanation: string;
    fixMessage?: string;
    evidenceSnippet?: string;
    impact?: string;
    suggestedRewrite?: string;
    detectionMethod?: string;
    confidence?: number;
    pageNumber?: number;
    sectionTitle?: string;
  };
  index?: number;
  isPremium?: boolean;
}) {
  const [showFullClause, setShowFullClause] = useState(false);

  const severityConfig = {
    critical: {
      gradient: "from-[#ff6b6b] to-[#ff4757]",
      borderColor: "border-[#ff6b6b]/25",
      bgTint: "bg-[#ff6b6b]/[0.03]",
      textColor: "text-[#ff6b6b]",
      badgeBg: "bg-[#ff6b6b]/12 text-[#ff6b6b] border-[#ff6b6b]/20",
      evidenceBg: "bg-[#ff6b6b]/5 border-[#ff6b6b]/10",
      evidenceText: "text-[#ff6b6b]/90",
      label: "Critical Risk",
      icon: "🔴",
      barColor: "#ff6b6b",
    },
    important: {
      gradient: "from-[#fbbf24] to-[#f59e0b]",
      borderColor: "border-[#fbbf24]/25",
      bgTint: "bg-[#fbbf24]/[0.02]",
      textColor: "text-[#fbbf24]",
      badgeBg: "bg-[#fbbf24]/12 text-[#fbbf24] border-[#fbbf24]/20",
      evidenceBg: "bg-[#fbbf24]/5 border-[#fbbf24]/10",
      evidenceText: "text-[#fbbf24]/90",
      label: "Needs Attention",
      icon: "🟡",
      barColor: "#fbbf24",
    },
    safe: {
      gradient: "from-[#10b981] to-[#059669]",
      borderColor: "border-[#10b981]/25",
      bgTint: "bg-[#10b981]/[0.02]",
      textColor: "text-[#10b981]",
      badgeBg: "bg-[#10b981]/12 text-[#10b981] border-[#10b981]/20",
      evidenceBg: "bg-[#10b981]/5 border-[#10b981]/10",
      evidenceText: "text-[#10b981]/90",
      label: "Low Risk",
      icon: "🟢",
      barColor: "#10b981",
    },
  };

  const config = severityConfig[risk.severity];
  const confidencePercent = risk.confidence !== undefined ? Math.round(risk.confidence * 100) : null;

  // Determine if the suggested edit is meaningful (not a placeholder)
  const rawSuggestion = risk.suggestedRewrite || risk.fixMessage || "";
  const isPlaceholder = /^(no\s+(change|rewrite)\s+(needed|is needed)|no\s+rewrite\s+is\s+needed|review\s+manually|n\/a|no\s+change\s+needed)/i.test(rawSuggestion.trim());
  const hasMeaningfulSuggestion = rawSuggestion.length > 0 && !isPlaceholder;

  // Fallback: for critical/important risks without meaningful suggestions, show an actionable fallback
  const fallbackSuggestions: Record<string, string> = {
    payment: "Negotiate milestone-based payments instead of full upfront payment. Add a clause requiring partial refunds for undelivered work and specify a clear payment dispute resolution process.",
    ip: "Request shared IP ownership or include a license-back clause granting you usage rights for portfolio purposes. Ensure IP transfer only occurs after full payment.",
    liability: "Cap liability to the total contract value. Remove unlimited indemnification clauses and ensure mutual liability terms apply equally to both parties.",
    termination: "Add a minimum notice period (14-30 days) for termination. Include a kill fee for work completed but not delivered, and ensure payment for work done up to termination date.",
    "non-compete": "Narrow the non-compete scope to direct competitors only, limit the duration to 6 months maximum, and restrict the geographical area to relevant markets only.",
    indemnity: "Limit indemnification to direct damages caused by your work. Exclude consequential damages and cap the indemnification amount to the contract value.",
    confidentiality: "Set a reasonable expiration period (2-3 years) for confidentiality obligations. Exclude publicly available information and your pre-existing knowledge from scope.",
    revisions: "Define a maximum number of revision rounds (2-3) included in the scope. Specify that additional revisions beyond the limit will be billed separately at an agreed hourly rate.",
    acceptance: "Include a defined acceptance period (5-10 business days) after which deliverables are deemed accepted. Require written feedback for rejections with specific actionable items.",
    "auto-renewal": "Add a clear opt-out mechanism with 30-day notice before auto-renewal. Include a cap on price increases upon renewal and allow termination at any renewal point.",
  };

  const displaySuggestion = hasMeaningfulSuggestion
    ? rawSuggestion
    : (risk.severity !== "safe" ? (fallbackSuggestions[risk.category] || "Review this clause carefully with a legal professional. Consider negotiating more balanced terms that protect both parties equally.") : "");
  const showSuggestionBox = displaySuggestion.length > 0;

  // Truncate long clause text for preview
  const clausePreviewLength = 180;
  const isLongClause = risk.clauseText.length > clausePreviewLength;
  const displayedClause = showFullClause ? risk.clauseText : risk.clauseText.slice(0, clausePreviewLength);

  return (
    <div
      className={`rounded-2xl ${config.bgTint} border ${config.borderColor} overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/20 animate-slide-up flex flex-col`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Severity gradient top bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${config.gradient}`} />
      
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/10 flex items-center justify-center text-lg">
              {categoryIcons[risk.category] || "📄"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface leading-tight">
                {categoryLabels[risk.category] ?? risk.category}
              </h3>
              {risk.sectionTitle && (
                <span className="text-[10px] text-on-surface-variant/60">§ {risk.sectionTitle}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {risk.detectionMethod && detectionMethodBadge[risk.detectionMethod] && (
              <span
                className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${detectionMethodBadge[risk.detectionMethod].className}`}
              >
                {detectionMethodBadge[risk.detectionMethod].label}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${config.badgeBg}`}>
              <span>{config.icon}</span>
              {config.label}
            </span>
          </div>
        </div>

        {/* ── Body sections ── */}
        <div className="space-y-4 flex-1">
          
          {/* 1. Key Evidence */}
          {risk.evidenceSnippet && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-md bg-surface-container-lowest/60 flex items-center justify-center text-[10px] font-bold text-on-surface-variant/60">1</span>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">Key Evidence</h4>
              </div>
              <blockquote className={`rounded-xl ${config.evidenceBg} border p-3.5 text-[13px] italic leading-relaxed ${config.evidenceText}`}>
                &ldquo;{risk.evidenceSnippet}&rdquo;
              </blockquote>
            </div>
          )}

          {/* 2. Contract Clause (collapsible) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-md bg-surface-container-lowest/60 flex items-center justify-center text-[10px] font-bold text-on-surface-variant/60">{risk.evidenceSnippet ? "2" : "1"}</span>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">Contract Clause</h4>
            </div>
            <blockquote className="rounded-xl bg-surface-container-lowest/60 border border-outline-variant/10 p-3.5 text-[13px] italic leading-relaxed text-on-surface-variant/80">
              &ldquo;{displayedClause}{isLongClause && !showFullClause ? "..." : ""}&rdquo;
            </blockquote>
            {isLongClause && (
              <button
                onClick={() => setShowFullClause(!showFullClause)}
                className="mt-1.5 text-[11px] font-semibold text-primary/70 hover:text-primary transition-colors"
              >
                {showFullClause ? "← Show less" : "Show full clause →"}
              </button>
            )}
          </div>

          {/* 3. Risk Analysis */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-md bg-surface-container-lowest/60 flex items-center justify-center text-[10px] font-bold text-on-surface-variant/60">{risk.evidenceSnippet ? "3" : "2"}</span>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">Analysis</h4>
            </div>
            <p className="text-[13px] leading-relaxed text-on-surface/85">
              {risk.explanation.replace(/^\[Verified Match\]\s*/i, "")}
            </p>
          </div>

          {/* 4. Impact */}
          {risk.impact && !/^(no\s+negative\s+impact|unknown|n\/a)\.?$/i.test(risk.impact.trim()) && (
            <div className="rounded-xl bg-surface-container-lowest/40 border border-outline-variant/8 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">💰</span>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">Impact</h4>
              </div>
              <p className="text-[13px] leading-relaxed text-on-surface/80">
                {risk.impact}
              </p>
            </div>
          )}

          {/* 5. Suggested Negotiation Edit — shown for Premium clauses */}
          {isPremium && showSuggestionBox && (
            <div className="rounded-xl bg-primary/[0.04] border border-primary/15 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">💡</span>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary/80">Suggested Edit</h4>
                {!hasMeaningfulSuggestion && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant/40 bg-surface-container-lowest/60 rounded px-1.5 py-0.5">Auto-generated</span>
                )}
              </div>
              <p className="text-[13px] leading-relaxed text-on-surface/90 font-medium">
                {displaySuggestion}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-outline-variant/8">
          <div className="flex items-center gap-3 text-[10px] text-on-surface-variant/50 uppercase tracking-wider">
            {risk.pageNumber && <span>Page {risk.pageNumber}</span>}
            <span className="opacity-30">•</span>
            <span>ID: {risk.id.slice(0, 8)}</span>
          </div>
          {confidencePercent !== null && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${confidencePercent}%`,
                    backgroundColor: config.barColor,
                    opacity: 0.7,
                  }}
                />
              </div>
              <span className="text-[10px] font-semibold text-on-surface-variant/60">{confidencePercent}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

