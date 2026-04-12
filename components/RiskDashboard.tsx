import { ConfidenceBar } from "@/components/ConfidenceBar";
import { RiskCard } from "@/components/RiskCard";
import type { Scan } from "@/types";

interface RiskDashboardProps {
  scan: Scan;
}

export function RiskDashboard({ scan }: RiskDashboardProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Results dashboard
          </p>
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              {scan.filename}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This UI is the frontend. Later it will read live results from
              `/api/scan/[id]`, which is the backend route for scan polling.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:min-w-72">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Status</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              {scan.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Plan</span>
            <span className="font-semibold uppercase text-slate-950">
              {scan.planType}
            </span>
          </div>
          <ConfidenceBar score={scan.confidenceScore} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {scan.risks.map((risk) => (
          <RiskCard key={risk.id} risk={risk} />
        ))}
      </div>
    </section>
  );
}
