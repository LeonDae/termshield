import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

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
  const header = (
    <header className="glass-heavy sticky top-0 z-40 transition-colors duration-500" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="group">
          <BrandLogo iconSize={32} textClassName="text-lg font-extrabold tracking-wider text-white font-sans" />
        </Link>
        <Link href="/" className="text-sm text-on-surface-variant hover:text-primary transition">
          ← Back to Home
        </Link>
      </div>
    </header>
  );

  // Demo mode — show pre-computed results
  if (params.id === demoScan.id) {
    return (
      <>
        {header}
        <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <RiskDashboard scan={demoScan} />
          </div>
        </main>
      </>
    );
  }

  // Supabase not configured
  if (!hasSupabaseServerConfig()) {
    return (
      <>
        {header}
        <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
          <section className="mx-auto max-w-4xl glass-card rounded-3xl p-8 border-yellow-400/20">
            <p className="text-label text-yellow-300">
              Setup Required
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-on-surface">
              Supabase is not connected yet
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-on-surface-variant">
              {getScanSetupMessage()}
            </p>
          </section>
        </main>
      </>
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
    <>
      {header}
      <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <ScanPoller scanId={params.id} initialScan={initialScan} />
        </div>
      </main>
    </>
  );
}
