import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

const MAX_RETRIES = 3;

/**
 * GET /api/cron/retry-scans
 *
 * Vercel cron: every 5 minutes.
 * Finds scans stuck in "failed" or "processing" (>2 min old) and retries them.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    // Find scans that are failed with retries remaining
    const { data: failedScans, error } = await supabase
      .from("scans")
      .select("id, retry_count")
      .or(`status.eq.failed,and(status.eq.processing,created_at.lt.${twoMinutesAgo})`)
      .lt("retry_count", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      throw new Error(error.message);
    }

    if (!failedScans || failedScans.length === 0) {
      return NextResponse.json({ message: "No scans to retry.", retried: 0 });
    }

    let retriedCount = 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    for (const scan of failedScans) {
      // Mark as retrying and increment retry count
      await supabase
        .from("scans")
        .update({
          status: "retrying",
          retry_count: scan.retry_count + 1,
        })
        .eq("id", scan.id);

      // Re-trigger the process endpoint
      fetch(`${appUrl}/api/scan/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": cronSecret ?? "",
        },
        body: JSON.stringify({ scanId: scan.id }),
      }).catch((err) =>
        console.error(`Retry trigger failed for scan ${scan.id}:`, err)
      );

      retriedCount++;
    }

    return NextResponse.json({
      message: `Retried ${retriedCount} scan(s).`,
      retried: retriedCount,
    });
  } catch (error) {
    console.error("Cron retry-scans failed:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Retry job failed." },
      { status: 500 }
    );
  }
}
