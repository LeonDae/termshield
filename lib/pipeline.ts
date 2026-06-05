import { analyzeContractRisks } from "@/lib/llm";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function runLLMPipeline(scanId: string, contractText: string) {
  try {
    const supabase = createSupabaseServerClient();

    // Mark scan as processing and retrieve user_id and filename
    const { data: scanRow, error: updateProcessError } = await supabase
      .from("scans")
      .update({ status: "processing" })
      .eq("id", scanId)
      .select("user_id, filename")
      .single();

    if (updateProcessError) {
      console.warn(`Failed to update/retrieve scan info for ${scanId}:`, updateProcessError.message);
    }

    const userId = scanRow?.user_id;
    const filename = scanRow?.filename;

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

    // If user is logged in, insert history row
    if (userId) {
      const riskSummary = analysis.risks.map((r) => ({
        category: r.category,
        severity: r.severity,
        fixMessage: r.fix_message,
      }));

      const { error: historyError } = await supabase
        .from("scan_history")
        .insert({
          user_id: userId,
          scan_id: scanId,
          filename: filename || "untitled-contract.txt",
          confidence_score: Math.round(avgConfidence * 100),
          risk_summary: riskSummary,
          was_exported: false,
        });

      if (historyError) {
        console.error("Failed to insert scan history:", historyError.message);
      }
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
