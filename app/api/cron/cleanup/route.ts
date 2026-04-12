import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

/**
 * GET /api/cron/cleanup
 *
 * Vercel cron: daily.
 * Deletes scan records older than 30 days and their associated risks/payments.
 * Since risks have ON DELETE CASCADE, we only need to delete the scans.
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Delete old completed or failed scans (risks cascade automatically)
    const { data, error } = await supabase
      .from("scans")
      .delete()
      .lt("created_at", thirtyDaysAgo)
      .in("status", ["complete", "failed"])
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    const deletedCount = data?.length ?? 0;

    // Also clean up old error logs
    await supabase
      .from("errors")
      .delete()
      .lt("created_at", thirtyDaysAgo);

    return NextResponse.json({
      message: `Cleanup complete. Deleted ${deletedCount} old scan(s).`,
      deleted: deletedCount,
    });
  } catch (error) {
    console.error("Cron cleanup failed:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Cleanup job failed." },
      { status: 500 }
    );
  }
}
