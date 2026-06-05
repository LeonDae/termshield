interface ConfidenceBarProps {
  score: number;
}

export function ConfidenceBar({ score }: ConfidenceBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span>Confidence</span>
        <span className="font-semibold text-primary">{score}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-container-lowest">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary transition-all duration-700"
          style={{ width: `${score}%`, boxShadow: '0 0 12px rgba(78, 222, 163, 0.3)' }}
        />
      </div>
    </div>
  );
}
