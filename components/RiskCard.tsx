import type { Risk } from "@/types";

interface RiskCardProps {
  risk: Risk;
  index?: number;
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
    bg: "bg-primary/5",
    badge: "bg-primary/15 text-primary",
    icon: "text-primary",
  },
};

export const categoryLabels: Record<string, string> = {
  ip: "Intellectual Property",
  payment: "Payment Terms",
  "non-compete": "Non-Compete",
  termination: "Termination",
};

export const categoryIcons: Record<string, string> = {
  ip: "⚖️",
  payment: "💸",
  "non-compete": "💼",
  termination: "🚪",
};

export function RiskCard({ risk, index = 0 }: RiskCardProps) {
  const style = severityStyles[risk.severity];
  const delayClass = `stagger-${Math.min(index + 1, 6)}`;

  return (
    <div
      className={`glass-card rounded-2xl p-6 ${style.accent} animate-slide-up ${delayClass} transition-all duration-300 flex flex-col justify-between relative overflow-hidden`}
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
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${style.badge} ${risk.severity === 'critical' ? 'animate-glow' : ''}`}
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

      {/* Suggested Fix Message */}
      {risk.fixMessage && (
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
