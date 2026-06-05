"use client";

import { useState } from "react";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { RiskCard } from "@/components/RiskCard";
import { ShareModal } from "@/components/ShareModal";
import type { Scan } from "@/types";

interface RiskDashboardProps {
  scan: Scan;
}

export function RiskDashboard({ scan }: RiskDashboardProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);

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
      {/* Header card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <p className="text-label text-primary tracking-widest">
                Results Dashboard
              </p>
            </div>
            <h2 className="text-2xl font-bold text-on-surface">
              {scan.filename}
            </h2>
            <p className="text-sm text-on-surface-variant max-w-xl">
              This is a demo contract preview. Review the details below and test the sharing or export features.
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

        {/* Overall confidence bar (kept as overall dashboard metric) */}
        <div className="mt-6 border-t border-outline-variant/5 pt-4">
          <ConfidenceBar score={scan.confidenceScore} />
        </div>
      </div>

      {/* Risks Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {scan.risks.map((risk, index) => (
          <RiskCard key={risk.id} risk={risk} index={index} />
        ))}
      </div>

      {/* Share Modal */}
      {isShareOpen && (
        <ShareModal scan={scan} onClose={() => setIsShareOpen(false)} />
      )}
    </section>
  );
}
