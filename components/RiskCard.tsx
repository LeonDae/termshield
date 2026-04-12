import type { Risk, RiskSeverity } from "@/types";

interface RiskCardProps {
  risk: Risk;
}

const severityClasses: Record<RiskSeverity, string> = {
  critical: "border-red-200 bg-red-50 text-red-800",
  important: "border-amber-200 bg-amber-50 text-amber-800",
  safe: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function RiskCard({ risk }: RiskCardProps) {
  const categoryLabel = risk.category.replace("-", " ");

  return (
    <article
      className={`rounded-[1.5rem] border p-5 shadow-sm ${severityClasses[risk.severity]}`}
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em]">
        {categoryLabel}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold capitalize">{risk.severity}</h3>
        <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold">
          {risk.confidence ?? 0}% confidence
        </span>
      </div>
      <p className="mt-3 text-sm leading-6">{risk.explanation}</p>
      <div className="mt-4 rounded-xl bg-white/70 p-3 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-slate-900">Clause excerpt</p>
        <p className="mt-1">{risk.clauseText}</p>
      </div>
    </article>
  );
}
