import { analyzeContractRisks } from "@/lib/llm";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function runLLMPipeline(scanId: string, contractText: string) {
  try {
    const supabase = createSupabaseServerClient();

    // Mark scan as processing
    await supabase
      .from("scans")
      .update({ status: "processing" })
      .eq("id", scanId);

    // Run Gemini LLM analysis with Zod validation
    const analysis = await analyzeContractRisks(contractText);

    // Calculate overall confidence score (average of all risks)
    let avgConfidence = 0;
    if (analysis.risks.length > 0) {
      avgConfidence =
        analysis.risks.reduce((sum, r) => sum + r.confidence, 0) /
        analysis.risks.length;
    }

    // Insert the risk rows
    const riskRows = analysis.risks.map((risk) => ({
      scan_id: scanId,
      category: risk.category,
      severity: risk.severity,
      clause_text: risk.clause_text,
      explanation: risk.explanation,
      fix_message: risk.fix_message,
      confidence: risk.confidence,
    }));

    if (riskRows.length > 0) {
      const { error: risksError } = await supabase.from("risks").insert(riskRows);
      if (risksError) {
        throw new Error(`Failed to insert risks: ${risksError.message}`);
      }
    }

    // Mark scan as complete
    const { error: updateError } = await supabase
      .from("scans")
      .update({
        status: "complete",
        confidence_score: Math.round(avgConfidence * 100),
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);

    if (updateError) {
      throw new Error(`Failed to update scan status: ${updateError.message}`);
    }
  } catch (error) {
    console.error(`Pipeline failed for scan ${scanId}:`, error);

    try {
      const supabase = createSupabaseServerClient();
      await supabase.from("scans").update({ status: "failed" }).eq("id", scanId);

      await supabase.from("errors").insert({
        scan_id: scanId,
        error_message: error instanceof Error ? error.message : "Unknown pipeline error",
        error_stage: "llm_processing",
      });
    } catch {
      // Swallow error during error handling
    }
  }
}
