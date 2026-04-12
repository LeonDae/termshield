import { ConfidenceBar } from "@/components/ConfidenceBar";
import { RiskCard } from "@/components/RiskCard";
import type { Scan } from "@/types";

interface RiskDashboardProps {
  scan: Scan;
}

export function RiskDashboard({ scan }: RiskDashboardProps) {
  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-label text-primary">
            Results Dashboard
          </p>
          <div>
            <h2 className="text-2xl font-semibold text-on-surface">
              {scan.filename}
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              This UI is the frontend. Later it will read live results from
              `/api/scan/[id]`, which is the backend route for scan polling.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl bg-surface-container-lowest/40 border border-outline-variant/10 p-4 sm:min-w-72">
          <div className="flex items-center justify-between text-sm text-on-surface-variant">
            <span>Status</span>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {scan.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-on-surface-variant">
            <span>Plan</span>
            <span className="font-semibold uppercase text-on-surface">
              {scan.planType}
            </span>
          </div>
          <ConfidenceBar score={scan.confidenceScore} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {scan.risks.map((risk, index) => (
          <RiskCard key={risk.id} risk={risk} index={index} />
        ))}
      </div>
    </section>
  );
}
