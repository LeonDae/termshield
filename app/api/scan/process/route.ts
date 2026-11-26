import { NextResponse } from "next/server";
import { runLLMPipeline } from "@/lib/pipeline";
import { createSupabaseServerClient } from "@/lib/supabase";

/**
 * POST /api/scan/process
 *
 * Internal route — NEVER expose to the public internet without auth.
 * Accepts { scanId, contractText }, runs the Gemini LLM analysis,
 * validates with Zod, and persists the risks to Supabase.
 *
 * This route runs the heavy LLM pipeline and needs a generous timeout.
 * On Vercel Hobby plan this caps at 60s; on Pro plan up to 300s.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("x-cron-secret");
    const cronSecret = process.env.CRON_SECRET;
    const isAuthorizedCron = Boolean(cronSecret && authHeader === cronSecret);

    const body = await request.json();
    const { scanId, contractText } = body;

    if (!scanId || !contractText) {
      return NextResponse.json(
        { message: "scanId and contractText are required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    if (!isAuthorizedCron) {
      // Allow client-triggered processing ONLY for scans currently in "pending" state,
      // and atomically claim it by transitioning to "processing" so it runs at most once.
      const { data: claimedScan, error: claimError } = await supabase
        .from("scans")
        .update({ status: "processing" })
        .eq("id", scanId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (claimError) {
        return NextResponse.json(
          { message: claimError.message },
          { status: 500 }
        );
      }

      if (!claimedScan) {
        return NextResponse.json(
          { message: "Scan is already processing, completed, or not found." },
          { status: 409 }
        );
      }
    }

    // Await the pipeline completely
    await runLLMPipeline(scanId, contractText);

    // Fetch the updated scan to return the score
    const { data: scan } = await supabase
      .from("scans")
      .select("confidence_score")
      .eq("id", scanId)
      .single();

    return NextResponse.json({
      message: "Scan processed successfully.",
      scanId,
      confidenceScore: scan?.confidence_score ?? 0,
    });
  } catch (error) {
    console.error("Scan processing trigger failed:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Scan processing failed.",
      },
      { status: 500 }
    );
  }
}
