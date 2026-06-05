"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface RiskSummaryItem {
  category: string;
  severity: "critical" | "important" | "safe";
  fixMessage?: string;
}

interface ScanHistoryItem {
  id: string;
  scan_id: string;
  filename: string;
  confidence_score: number;
  risk_summary: RiskSummaryItem[] | null;
  was_exported: boolean;
  created_at: string;
}

export default function HistoryPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchHistory() {
      if (!session) return;

      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/scan/history", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch scan history.");
        }

        const data = await res.json();
        setHistory(data.history || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong while fetching history.");
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchHistory();
    }
  }, [session]);

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Header */}
      <header className="glass-heavy sticky top-0 z-40 transition-colors duration-500" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-on-surface">
              Term<span className="text-primary">Shield</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-primary font-medium">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <Link href="/" className="text-sm text-on-surface-variant hover:text-primary transition">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-12 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-on-surface">Scan History</h1>
          <p className="mt-2 text-on-surface-variant">
            Review past scans, confidence evaluations, and exported rectifications.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-error-container/20 border border-error/20 p-4 text-sm leading-6 text-error mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-sm text-on-surface-variant">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center max-w-xl mx-auto mt-8 flex flex-col items-center">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-on-surface">No scans recorded yet</h2>
            <p className="mt-2 text-sm text-on-surface-variant max-w-sm">
              Any contracts you scan while logged in will appear here. Start scanning to secure your agreements!
            </p>
            <Link href="/" className="btn-primary mt-6 rounded-full px-6 py-2.5 text-sm font-semibold shadow-glow-primary">
              Scan a Contract
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {history.map((item) => {
              const summaryItems = item.risk_summary || [];
              const severityCounts = summaryItems.reduce(
                (acc, r) => {
                  if (r.severity === "critical") acc.critical++;
                  else if (r.severity === "important") acc.important++;
                  else if (r.severity === "safe") acc.safe++;
                  return acc;
                },
                { critical: 0, important: 0, safe: 0 }
              );

              return (
                <div key={item.id} className="glass-card rounded-2xl p-6 hover:border-primary/20 transition-all duration-300 group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-on-surface line-clamp-1">
                          {item.filename}
                        </h3>
                        <span className="text-xs text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Badges for severity counts */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {severityCounts.critical > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-error bg-error/10 border border-error/20 px-2.5 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-error animate-pulse"></span>
                            {severityCounts.critical} Critical
                          </span>
                        )}
                        {severityCounts.important > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 border border-warning/20 px-2.5 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning"></span>
                            {severityCounts.important} Important
                          </span>
                        )}
                        {severityCounts.safe > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                            {severityCounts.safe} Safe
                          </span>
                        )}
                        {summaryItems.length === 0 && (
                          <span className="text-xs text-on-surface-variant">No risks identified.</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 border-outline-variant/15 pt-4 md:pt-0">
                      {/* Confidence Score Indicator */}
                      <div className="text-left md:text-right">
                        <span className="text-xs text-on-surface-variant block">Confidence</span>
                        <span className="text-lg font-bold text-primary">
                          {item.confidence_score}%
                        </span>
                      </div>

                      {/* Export Status Badge */}
                      <div className="flex items-center gap-2">
                        {item.was_exported ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Exported
                          </span>
                        ) : null}
                        
                        <Link
                          href={`/scan/${item.scan_id}`}
                          className="btn-primary rounded-full px-4 py-1.5 text-xs font-semibold shadow-glow-primary group-hover:scale-[1.02] transition"
                        >
                          View Results
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
