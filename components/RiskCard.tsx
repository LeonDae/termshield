"use client";

import { useState } from "react";
import type { Risk } from "@/types";

interface RiskCardProps {
  risk: Risk;
  index?: number;
  isPremium?: boolean;
}

export const severityStyles = {
  critical: {
    accent: "accent-critical",
    bg: "bg-error/5",
    badge: "bg-error/15 text-error",
    icon: "text-error",
  },
  important: {
    accent: "accent-important",
    bg: "bg-yellow-400/5",
    badge: "bg-yellow-400/15 text-yellow-300",
    icon: "text-yellow-300",
  },
  safe: {
    accent: "accent-safe",
    bg: "bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-400",
    icon: "text-emerald-400",
  },
};

export const categoryLabels: Record<string, string> = {
  ip: "Intellectual Property",
  payment: "Payment Terms",
  "non-compete": "Non-Compete",
  termination: "Termination",
  liability: "Liability",
  indemnity: "Indemnity",
  confidentiality: "Confidentiality",
  revisions: "Revisions",
  acceptance: "Acceptance",
  "auto-renewal": "Auto-Renewal",
};

export const categoryIcons: Record<string, string> = {
  ip: "⚖️",
  payment: "💸",
  "non-compete": "💼",
  termination: "🚪",
  liability: "🛡️",
  indemnity: "📋",
  confidentiality: "🔒",
  revisions: "🔄",
  acceptance: "✅",
  "auto-renewal": "🔁",
};

const detectionMethodBadge: Record<string, { label: string; className: string }> = {
  rule: { label: "⚡ Rule", className: "bg-emerald-500/15 text-emerald-300" },
  retrieval: { label: "🔍 Retrieval", className: "bg-blue-500/15 text-blue-300" },
  llm: { label: "🤖 AI", className: "bg-purple-500/15 text-purple-300" },
  hybrid: { label: "⚡🤖 Hybrid", className: "bg-amber-500/15 text-amber-300" },
};

export function RiskCard({ risk, index = 0, isPremium = false }: RiskCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const style = severityStyles[risk.severity];
  const delayClass = `stagger-${Math.min(index + 1, 6)}`;

  return (
    <div
      className={`flip-card-container h-[400px] animate-slide-up ${delayClass} ${isFlipped ? "flipped-state" : ""}`}
    >
      <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
        
        {/* ================================= FRONT SIDE ================================= */}
        <div className={`flip-card-front glass-card p-6 ${style.accent} border border-white/10 bg-[#1c1f2d]/85 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between`}>
          <div className="diagonal-glow-overlay" />
          
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3 mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <span className="text-xl">{categoryIcons[risk.category] || "📄"}</span>
                <h3 className="text-base font-semibold text-on-surface">
                  {categoryLabels[risk.category] ?? risk.category}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {risk.detectionMethod && detectionMethodBadge[risk.detectionMethod] && (
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${detectionMethodBadge[risk.detectionMethod].className}`}>
                    {detectionMethodBadge[risk.detectionMethod].label}
                  </span>
                )}
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge} ${risk.severity === 'critical' ? 'animate-glow' : ''}`}>
                  {risk.severity}
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto card-body-scroll pr-1 space-y-4 relative z-10">
              {/* Risk Explanation */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
                  <span>⚠️</span> Risk Summary
                </h4>
                <p className="text-sm leading-relaxed text-on-surface/90">
                  {risk.explanation}
                </p>
              </div>

              {/* Impact Card */}
              {risk.impact && (
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#d0bcff] mb-1 flex items-center gap-1.5">
                    <span>💰</span> Estimated Financial Impact
                  </h4>
                  <p className="text-xs leading-relaxed text-on-surface/80">
                    {risk.impact}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 mt-3 border-t border-outline-variant/5 relative z-10 flex items-center justify-between">
            <span className="text-[9px] text-on-surface-variant/40 italic">TermShield Risk ID: #{risk.id.slice(0, 5)}</span>
            <button
              onClick={() => setIsFlipped(true)}
              className="px-4 py-2 text-xs font-bold text-primary rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/15 transition-all hover:scale-[1.03] flex items-center gap-1.5"
            >
              {isPremium ? "Explore Clause & Rewrite" : "Explore Clause Details"}
              <span>→</span>
            </button>
          </div>
        </div>

        {/* ================================= BACK SIDE ================================= */}
        <div className={`flip-card-back glass-card p-6 ${style.accent} border border-white/10 relative overflow-hidden flex flex-col justify-between`}>
          <div className="diagonal-glow-overlay" />

          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3 mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-lg">{categoryIcons[risk.category] || "📄"}</span>
                <span className="text-xs font-bold text-on-surface truncate max-w-[150px]">
                  {categoryLabels[risk.category] ?? risk.category}
                </span>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                {risk.severity} Details
              </span>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto card-body-scroll pr-1 space-y-4 relative z-10">
              {/* Contract Clause */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1 flex items-center gap-1.5">
                  <span>📄</span> Original Contract Clause
                </h4>
                <blockquote className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-3 text-xs italic font-serif leading-relaxed text-on-surface-variant/90 shadow-inner">
                  &ldquo;{risk.clauseText}&rdquo;
                </blockquote>
              </div>

              {/* Key Evidence */}
              {risk.evidenceSnippet && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-error/80 mb-1 flex items-center gap-1.5">
                    <span>🎯</span> Crucial Evidence
                  </h4>
                  <blockquote className="rounded-xl bg-error/5 border border-error/10 p-3 text-xs italic font-serif leading-relaxed text-error/90 shadow-inner">
                    &ldquo;{risk.evidenceSnippet}&rdquo;
                  </blockquote>
                </div>
              )}

              {/* Suggested Fix */}
              {isPremium && (risk.suggestedRewrite || risk.fixMessage) && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
                    <span>💡</span> Suggested Negotiation Rewrite
                  </h4>
                  <p className="text-xs leading-relaxed text-on-surface/95 font-medium">
                    {risk.suggestedRewrite || risk.fixMessage}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 mt-3 border-t border-outline-variant/5 relative z-10 flex items-center justify-between">
            {risk.confidence !== undefined && (
              <span className="text-[9px] text-on-surface-variant/40 uppercase font-semibold">
                Confidence: {Math.round(risk.confidence * 100)}%
              </span>
            )}
            <button
              onClick={() => setIsFlipped(false)}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant rounded-full border border-outline-variant/30 bg-surface-container-lowest/30 hover:bg-surface-container-lowest/60 transition-all hover:scale-[1.03] flex items-center gap-1.5"
            >
              <span>←</span>
              Back to Summary
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
