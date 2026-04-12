import Link from "next/link";

import { RiskDashboard } from "@/components/RiskDashboard";
import type { Scan } from "@/types";

interface DemoPreviewProps {
  scan: Scan;
}

export function DemoPreview({ scan }: DemoPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Demo flow
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Shared data, used by both UI and API
          </h2>
        </div>
        <Link
          href={`/scan/${scan.id}`}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
        >
          Open demo page
        </Link>
      </div>
      <RiskDashboard scan={scan} />
    </div>
  );
}
