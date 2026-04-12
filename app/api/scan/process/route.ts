import { NextResponse } from "next/server";
import { runLLMPipeline } from "@/lib/pipeline";
import { createSupabaseServerClient } from "@/lib/supabase";

/**
 * POST /api/scan/process
 *
 * Internal route — NEVER expose to the public internet without auth.
 * Accepts { scanId, contractText }, runs the Gemini LLM analysis,
 * validates with Zod, and persists the risks to Supabase.
 */
export async function POST(request: Request) {
  try {
    // Basic internal auth via CRON_SECRET header
    const authHeader = request.headers.get("x-cron-secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== cronSecret) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { scanId, contractText } = body;

    if (!scanId || !contractText) {
      return NextResponse.json(
        { message: "scanId and contractText are required." },
        { status: 400 }
      );
    }

    // Await the pipeline completely since this is usually called by a cron or explicit request
    await runLLMPipeline(scanId, contractText);

    // Fetch the updated scan to return the score
    const supabase = createSupabaseServerClient();
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
