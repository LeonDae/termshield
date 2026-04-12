import Link from "next/link";

import { ScanPoller } from "@/components/ScanPoller";
import { RiskDashboard } from "@/components/RiskDashboard";
import { demoScan } from "@/lib/demo-scan";
import { getScanRecordById, getScanSetupMessage } from "@/lib/scans";
import { hasSupabaseServerConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ScanResultsPage({
  params,
}: {
  params: { id: string };
}) {
  // Demo mode — show pre-computed results
  if (params.id === demoScan.id) {
    return (
      <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <Link
            href="/"
            className="inline-flex text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            ← Back to home
          </Link>
          <RiskDashboard scan={demoScan} />
        </div>
      </main>
    );
  }

  // Supabase not configured
  if (!hasSupabaseServerConfig()) {
    return (
      <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-700">
            Setup Required
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-amber-950">
            Supabase is not connected yet
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-amber-900">
            {getScanSetupMessage()}
          </p>
        </section>
      </main>
    );
  }

  // Try to get the initial scan state for SSR
  let initialScan = null;
  try {
    initialScan = await getScanRecordById(params.id);
  } catch {
    // Will be fetched client-side
  }

  // Use the polling client component for real scans
  return (
    <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-slate-600 transition hover:text-slate-950"
        >
          ← Back to home
        </Link>
        <ScanPoller scanId={params.id} initialScan={initialScan} />
      </div>
    </main>
  );
}
