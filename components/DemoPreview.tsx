import type { Scan } from "@/types";

interface DemoPreviewProps {
  scan: Scan;
}

export function DemoPreview({ scan }: DemoPreviewProps) {
  const sortedRisks = [...scan.risks].sort((a, b) => {
    const order = { critical: 0, important: 1, safe: 2 };
    return order[a.severity] - order[b.severity];
  });

  const severityBadgeClass = {
    critical: "bg-error/15 text-error",
    important: "bg-yellow-400/15 text-yellow-300",
    safe: "bg-primary/15 text-primary",
  };

  return (
    <div className="glass-card rounded-3xl p-6 animate-float">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-3 w-3 rounded-full bg-error/70" />
        <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
        <div className="h-3 w-3 rounded-full bg-primary/70" />
        <span className="ml-auto text-label text-on-surface-variant">DEMO PREVIEW</span>
      </div>

      <h3 className="text-sm font-semibold text-on-surface mb-1">{scan.filename}</h3>
      <p className="text-xs text-on-surface-variant mb-4">
        Confidence: <span className="text-primary font-semibold">{scan.confidenceScore}%</span>
      </p>

      <div className="space-y-3">
        {sortedRisks.slice(0, 3).map((risk) => (
          <div
            key={risk.id}
            className="rounded-xl bg-surface-container-lowest/40 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityBadgeClass[risk.severity]}`}
              >
                {risk.severity}
              </span>
              <span className="text-xs font-medium text-on-surface">
                {risk.category}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant leading-5 line-clamp-2">
              {risk.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
