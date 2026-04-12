interface ConfidenceBarProps {
  score?: number;
}

export function ConfidenceBar({ score = 0 }: ConfidenceBarProps) {
  const width = Math.max(0, Math.min(100, score));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Confidence</span>
        <span>{width}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-950 transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
