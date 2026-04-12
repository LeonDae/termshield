import type { Risk } from "@/types";

interface RiskCardProps {
  risk: Risk;
}

const severityStyles = {
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

const categoryLabels: Record<string, string> = {
  ip: "Intellectual Property",
  payment: "Payment Terms",
  "non-compete": "Non-Compete",
  termination: "Termination",
};

export function RiskCard({ risk }: RiskCardProps) {
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

      {risk.fixMessage && (
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
