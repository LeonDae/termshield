import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

/**
 * GET /api/cron/weekly-digest
 *
 * Vercel cron: Monday 9am IST.
 * Generates a summary of the past week's revenue and scan usage.
 * Week 2 milestone: will send this via Resend email.
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get scan stats for the past week
    const { data: scans, error: scansError } = await supabase
      .from("scans")
      .select("id, status, plan_type, created_at")
      .gte("created_at", sevenDaysAgo);

    if (scansError) throw new Error(scansError.message);

    // Get payment stats for the past week
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount_paise, status, created_at")
      .eq("status", "captured")
      .gte("created_at", sevenDaysAgo);

    if (paymentsError) throw new Error(paymentsError.message);

    const totalScans = scans?.length ?? 0;
    const completedScans = scans?.filter((s) => s.status === "complete").length ?? 0;
    const failedScans = scans?.filter((s) => s.status === "failed").length ?? 0;
    const totalRevenuePaise = payments?.reduce((sum, p) => sum + p.amount_paise, 0) ?? 0;
    const totalRevenueINR = totalRevenuePaise / 100;

    const digest = {
      period: `${new Date(sevenDaysAgo).toLocaleDateString("en-IN")} – ${new Date().toLocaleDateString("en-IN")}`,
      scans: {
        total: totalScans,
        completed: completedScans,
        failed: failedScans,
      },
      revenue: {
        totalINR: totalRevenueINR,
        transactions: payments?.length ?? 0,
      },
    };

    // TODO (Week 2): Send this digest via Resend email
    // For now, just return it as JSON so it's visible in Vercel logs.

    return NextResponse.json({
      message: "Weekly digest generated.",
      digest,
    });
  } catch (error) {
    console.error("Weekly digest failed:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Digest job failed." },
      { status: 500 }
    );
  }
}
