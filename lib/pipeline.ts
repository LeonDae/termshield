/**
 * Hybrid Pipeline Orchestrator — Rules → Retrieval → Selective Gemini
 *
 * Flow:
 * 1. Clean text
 * 2. Segment into clauses
 * 3. Deduplicate clauses
 * 4. For each clause:
 *    a. Run rule engine
 *    b. If safe → mark safe, skip embedding + Gemini
 *    c. If high-confidence risk → record, skip Gemini
 *    d. If ambiguous → embed → retrieve similar → analyze with Gemini → verify
 * 5. Persist all results
 */

import { createSupabaseServerClient } from "@/lib/supabase";
import { cleanContractText } from "@/lib/pdf";
import {
  segmentIntoClauses,
  deduplicateClauses,
  hashDocumentText,
  type SegmentedClause,
} from "@/lib/clause-segmenter";
import { runRuleEngine, needsFurtherAnalysis, type RuleMatch } from "@/lib/rule-engine";
import { getEmbeddings, storeClauseEmbeddings, retrieveSimilarClauses } from "@/lib/embeddings";
import { analyzeClauseWithGemini, bulkAnalyzeClausesWithGemini } from "@/lib/gemini-analyzer";
import type { ClauseAnalysis } from "@/lib/schemas";

// ── Constants ────────────────────────────────────────────────────────────────
const RAG_TIMEOUT_MS = 55_000; // 55 seconds — leaves 5s buffer for DB writes
const GEMINI_CONCURRENCY = 2; // Max parallel Gemini API calls (conservative for free tier)
const DEBUG = process.env.NODE_ENV !== "production";

/**
 * Run async tasks with a concurrency limit.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < tasks.length) {
      const idx = nextIdx++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface PipelineResult {
  riskType: string;
  severity: "critical" | "important" | "safe";
  confidence: number;
  evidenceSnippet: string;
  explanation: string;
  suggestedRewrite: string;
  impact: string;
  detectionMethod: "rule" | "retrieval" | "llm" | "hybrid";
  clauseText: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  clauseId: string | null;
}

// ── Main pipeline function ───────────────────────────────────────────────────

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

    // ── Step 1: Clean text ──
    const cleanedText = cleanContractText(contractText);
    const documentHash = hashDocumentText(cleanedText);

    // ── Step 2: Segment into clauses ──
    const allClauses = segmentIntoClauses(cleanedText);

    // ── Step 3: Deduplicate ──
    const clauses = deduplicateClauses(allClauses);

    DEBUG && console.log(`[Pipeline] ${scanId}: ${allClauses.length} raw clauses → ${clauses.length} unique clauses`);

    // ── Step 4: Process each clause ──
    const results: PipelineResult[] = [];
    const clausesNeedingEmbedding: SegmentedClause[] = [];
    const ruleResults: Map<number, RuleMatch | null> = new Map();

    // 4a: Run rule engine on ALL clauses (fast, zero cost)
    DEBUG && console.log(`[Pipeline] Running deterministic rule engine on ${clauses.length} clauses...`);
    for (const clause of clauses) {
      const ruleResult = runRuleEngine(clause);
      ruleResults.set(clause.clauseIndex, ruleResult);

      if (ruleResult && !needsFurtherAnalysis(ruleResult)) {
        // High-confidence rule match — record directly
        DEBUG && console.log(`[Pipeline] Clause ${clause.clauseIndex} matched rule "${ruleResult.matchedPattern}" with high confidence (${ruleResult.confidence.toFixed(2)})`);
        results.push({
          riskType: ruleResult.riskType,
          severity: ruleResult.severity,
          confidence: calculateConfidence("rule", ruleResult.confidence, null, null),
          evidenceSnippet: ruleResult.evidenceSnippet,
          explanation: ruleResult.explanation,
          suggestedRewrite: ruleResult.suggestedRewrite,
          impact: ruleResult.impact,
          detectionMethod: "rule",
          clauseText: clause.clauseText,
          pageNumber: clause.pageNumber,
          sectionTitle: clause.sectionTitle,
          clauseId: null,
        });
      } else {
        // Needs further analysis — queue for embedding
        DEBUG && console.log(`[Pipeline] Clause ${clause.clauseIndex} needs further analysis (Rule Match: ${ruleResult ? `low confidence ${ruleResult.confidence.toFixed(2)}` : "None"})`);
        clausesNeedingEmbedding.push(clause);
      }
    }

    const ruleOnlyCount = results.length;
    DEBUG && console.log(`[Pipeline] ${scanId}: ${ruleOnlyCount} clauses resolved by rules, ${clausesNeedingEmbedding.length} need embedding + pgvector retrieval`);

    // 4b-4d: RAG path with 60-second timeout
    // If the RAG pipeline (embeddings + retrieval + individual Gemini calls) exceeds
    // the timeout, we cancel and fall back to a single bulk Gemini API call.
    let geminiCallCount = 0;
    let retrievalMatchCount = 0;
    let usedBulkFallback = false;

    if (clausesNeedingEmbedding.length > 0) {
      const ragStartTime = Date.now();

      // If too many clauses need Gemini, skip individual RAG path entirely and
      // use bulk analysis to minimize API calls (critical for free tier limits).
      const BULK_THRESHOLD = 10;

      if (clausesNeedingEmbedding.length > BULK_THRESHOLD) {
        DEBUG && console.log(`[Pipeline] ${clausesNeedingEmbedding.length} clauses need analysis (> ${BULK_THRESHOLD}). Using bulk batched mode to conserve API quota...`);
        usedBulkFallback = true;

        // Process in batches of 20 clauses to stay within token limits
        const BATCH_SIZE = 20;
        for (let batchStart = 0; batchStart < clausesNeedingEmbedding.length; batchStart += BATCH_SIZE) {
          const batch = clausesNeedingEmbedding.slice(batchStart, batchStart + BATCH_SIZE);
          DEBUG && console.log(`[Pipeline] Bulk batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: analyzing ${batch.length} clauses...`);

          try {
            const bulkResults = await bulkAnalyzeClausesWithGemini(batch);
            geminiCallCount++;

            for (const clause of batch) {
              const analysis = bulkResults.get(clause.clauseIndex);
              if (analysis) {
                const ruleResult = ruleResults.get(clause.clauseIndex) ?? null;
                const finalConfidence = calculateConfidence(
                  ruleResult ? "hybrid" : "llm",
                  ruleResult?.confidence || null,
                  null,
                  analysis.confidence
                );
                results.push({
                  riskType: analysis.riskType,
                  severity: analysis.severity,
                  confidence: finalConfidence,
                  evidenceSnippet: analysis.evidenceSnippet,
                  explanation: analysis.explanation,
                  suggestedRewrite: analysis.suggestedRewrite,
                  impact: analysis.impact,
                  detectionMethod: ruleResult ? "hybrid" : "llm",
                  clauseText: clause.clauseText,
                  pageNumber: clause.pageNumber,
                  sectionTitle: clause.sectionTitle,
                  clauseId: null,
                });
              }
            }
          } catch (batchErr) {
            console.error(`[Pipeline] Bulk batch failed:`, batchErr);
            // Fallback: mark these clauses as needing manual review
            for (const clause of batch) {
              results.push({
                riskType: "liability",
                severity: "safe",
                confidence: 0.1,
                evidenceSnippet: clause.clauseText.slice(0, 100),
                explanation: "[Bulk Analysis Failed] Could not analyze this clause. Please review manually.",
                suggestedRewrite: "Review manually.",
                impact: "Unknown — analysis failed.",
                detectionMethod: "llm",
                clauseText: clause.clauseText,
                pageNumber: clause.pageNumber,
                sectionTitle: clause.sectionTitle,
                clauseId: null,
              });
            }
          }
        }
      } else {
        // Small number of clauses — use the full RAG path (individual analysis)
        try {
          const ragResult = await Promise.race([
            runRAGPath(supabase, scanId, clausesNeedingEmbedding, ruleResults, results),
            new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), RAG_TIMEOUT_MS)),
          ]);

          if (ragResult === "timeout") {
            const elapsed = ((Date.now() - ragStartTime) / 1000).toFixed(1);
            console.warn(`[Pipeline] ⏱️ RAG pipeline timed out after ${elapsed}s. Falling back to bulk Gemini API call...`);

            const resolvedClauseTexts = new Set(results.map(r => r.clauseText));
            const unresolvedClauses = clausesNeedingEmbedding.filter(
              c => !resolvedClauseTexts.has(c.clauseText)
            );

            if (unresolvedClauses.length > 0) {
              DEBUG && console.log(`[Pipeline] Bulk-analyzing ${unresolvedClauses.length} unresolved clauses via single Gemini call...`);
              const bulkResults = await bulkAnalyzeClausesWithGemini(unresolvedClauses);
              geminiCallCount = 1;
              usedBulkFallback = true;

              for (const clause of unresolvedClauses) {
                const analysis = bulkResults.get(clause.clauseIndex);
                if (analysis) {
                  const ruleResult = ruleResults.get(clause.clauseIndex) ?? null;
                  const finalConfidence = calculateConfidence(
                    ruleResult ? "hybrid" : "llm",
                    ruleResult?.confidence || null,
                    null,
                    analysis.confidence
                  );
                  results.push({
                    riskType: analysis.riskType,
                    severity: analysis.severity,
                    confidence: finalConfidence,
                    evidenceSnippet: analysis.evidenceSnippet,
                    explanation: analysis.explanation,
                    suggestedRewrite: analysis.suggestedRewrite,
                    impact: analysis.impact,
                    detectionMethod: ruleResult ? "hybrid" : "llm",
                    clauseText: clause.clauseText,
                    pageNumber: clause.pageNumber,
                    sectionTitle: clause.sectionTitle,
                    clauseId: null,
                  });
                }
              }
            }
          } else if (ragResult) {
            geminiCallCount = ragResult.geminiCallCount;
            retrievalMatchCount = ragResult.retrievalMatchCount;
          }
        } catch (ragErr) {
          console.error(`[Pipeline] ${scanId}: RAG path failed:`, ragErr);
          const resolvedClauseTexts = new Set(results.map(r => r.clauseText));
          const unresolvedClauses = clausesNeedingEmbedding.filter(
            c => !resolvedClauseTexts.has(c.clauseText)
          );
          if (unresolvedClauses.length > 0) {
            DEBUG && console.log(`[Pipeline] Error recovery: Bulk-analyzing ${unresolvedClauses.length} clauses...`);
            const bulkResults = await bulkAnalyzeClausesWithGemini(unresolvedClauses);
            usedBulkFallback = true;
            for (const clause of unresolvedClauses) {
              const analysis = bulkResults.get(clause.clauseIndex);
              if (analysis) {
                results.push({
                  riskType: analysis.riskType,
                  severity: analysis.severity,
                  confidence: calculateConfidence("llm", null, null, analysis.confidence),
                  evidenceSnippet: analysis.evidenceSnippet,
                  explanation: analysis.explanation,
                  suggestedRewrite: analysis.suggestedRewrite,
                  impact: analysis.impact,
                  detectionMethod: "llm",
                  clauseText: clause.clauseText,
                  pageNumber: clause.pageNumber,
                  sectionTitle: clause.sectionTitle,
                  clauseId: null,
                });
              }
            }
          }
        }
      }
    }

    const savingsPercent = clauses.length > 0 
      ? ((1 - geminiCallCount / clauses.length) * 100).toFixed(0) 
      : "100";
    const method = usedBulkFallback ? " (bulk fallback)" : "";
    DEBUG && console.log(`[Pipeline] ${scanId} Savings: ${geminiCallCount} Gemini API calls made${method} (vs ${clauses.length} total clauses = ${savingsPercent}% savings)`);

    // ── Step 5: Store clause embeddings in pgvector and collect IDs ──
    // Note: Embeddings are generated inside runRAGPath. If the RAG path timed out
    // or we used bulk fallback, we regenerate embeddings for storage (fire-and-forget).
    let clauseTextToIdMap = new Map<string, string>();
    if (clausesNeedingEmbedding.length > 0) {
      try {
        // Re-generate embeddings for storage (they're cached so this is fast)
        const textsToEmbed = clausesNeedingEmbedding.map((c) => c.clauseText);
        const storageEmbeddings = await getEmbeddings(textsToEmbed);
        if (storageEmbeddings.some((e: number[]) => e && e.length === 768)) {
          const riskLabels = clausesNeedingEmbedding.map((clause) => {
            const result = results.find((r) => r.clauseText === clause.clauseText);
            return result?.riskType ?? null;
          });
          DEBUG && console.log(`[Pipeline] Storing ${clausesNeedingEmbedding.length} clause embeddings in Supabase...`);
          clauseTextToIdMap = await storeClauseEmbeddings(scanId, documentHash, clausesNeedingEmbedding, storageEmbeddings, riskLabels);
          DEBUG && console.log(`[Pipeline] Successfully saved clause embeddings. IDs mapped: ${clauseTextToIdMap.size}`);
        }
      } catch (error) {
        console.error(`[Pipeline] ${scanId}: Failed to store clause embeddings:`, error);
      }
    }

    // ── Step 6: Collect ALL clause results (including safe) for display ──
    // Deduplicate by clauseText only. Every clause gets a card in the UI —
    // safe ones show as green, risky ones as yellow/red.
    const seenClauseTexts = new Set<string>();
    const finalResults: PipelineResult[] = [];
    for (const result of results) {
      const key = result.clauseText.trim().toLowerCase();
      if (seenClauseTexts.has(key)) continue;
      seenClauseTexts.add(key);
      finalResults.push(result);
    }

    // ── Step 7: Calculate overall confidence score ──
    // Base the score on risky clauses — higher confidence in detection = higher score
    const riskyResults = finalResults.filter(r => r.severity !== "safe");
    let avgConfidence = 0;
    if (riskyResults.length > 0) {
      avgConfidence =
        riskyResults.reduce((sum, r) => sum + r.confidence, 0) / riskyResults.length;
    } else if (finalResults.length > 0) {
      // All safe — high confidence
      avgConfidence = 0.95;
    }

    // ── Step 8: Insert risk rows linked via clause_id ──
    const riskRows = finalResults.map((result) => ({
      scan_id: scanId,
      category: result.riskType,
      severity: result.severity,
      clause_text: result.clauseText,
      explanation: result.explanation,
      fix_message: result.suggestedRewrite,
      confidence: result.confidence,
      // New v2 columns
      risk_type: result.riskType,
      evidence_snippet: result.evidenceSnippet,
      impact: result.impact,
      suggested_rewrite: result.suggestedRewrite,
      detection_method: result.detectionMethod,
      page_number: result.pageNumber,
      section_title: result.sectionTitle,
      clause_id: clauseTextToIdMap.get(result.clauseText) || null, // Link pgvector store ID
    }));

    if (riskRows.length > 0) {
      DEBUG && console.log(`[Pipeline] Inserting ${riskRows.length} risks into database for scan ${scanId}...`);
      const { error: risksError } = await supabase.from("risks").insert(riskRows);
      if (risksError) {
        throw new Error(`Failed to insert risks: ${risksError.message}`);
      }
      DEBUG && console.log(`[Pipeline] Risks successfully inserted.`);
    }

    // ── Step 9: Mark scan as complete ──
    const finalScore = Math.round(avgConfidence * 100);
    DEBUG && console.log(`[Pipeline] Updating scan status to complete (Confidence score: ${finalScore}%)`);
    const { error: updateError } = await supabase
      .from("scans")
      .update({
        status: "complete",
        confidence_score: finalScore,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);

    if (updateError) {
      throw new Error(`Failed to update scan status: ${updateError.message}`);
    }

    // ── Step 10: Insert history row for logged-in users ──
    if (userId) {
      const riskSummary = finalResults
        .filter((r) => r.severity !== "safe")
        .map((r) => ({
          category: r.riskType,
          severity: r.severity,
          fixMessage: r.suggestedRewrite,
        }));

      const { error: historyError } = await supabase
        .from("scan_history")
        .insert({
          user_id: userId,
          scan_id: scanId,
          filename: filename || "untitled-contract.txt",
          confidence_score: finalScore,
          risk_summary: riskSummary,
          was_exported: false,
        });

      if (historyError) {
        console.error("Failed to insert scan history:", historyError.message);
      }
    }

    DEBUG && console.log(`[Pipeline] ${scanId}: ✅ Complete — ${finalResults.length} risks detected, avg confidence ${finalScore}%`);

  } catch (error) {
    console.error(`Pipeline failed for scan ${scanId}:`, error);

    try {
      const supabase = createSupabaseServerClient();
      await supabase.from("scans").update({ status: "failed" }).eq("id", scanId);

      await supabase.from("errors").insert({
        scan_id: scanId,
        error_message: error instanceof Error ? error.message : "Unknown pipeline error",
        error_stage: "hybrid_pipeline",
      });
    } catch {
      // Swallow error during error handling
    }
  }
}

/**
 * Derives and clamps confidence scores mathematically.
 * Prevents hardcoded or generated 100% confidence values by capping at 98%.
 */

// ── RAG Path (runs under timeout) ────────────────────────────────────────────

interface RAGPathResult {
  geminiCallCount: number;
  retrievalMatchCount: number;
}

/**
 * Runs the full RAG path: embedding generation → vector retrieval → parallel Gemini calls.
 * This function is called inside a Promise.race with a timeout in the main pipeline.
 * It pushes results directly into the `results` array (shared reference).
 */
async function runRAGPath(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  scanId: string,
  clausesNeedingEmbedding: SegmentedClause[],
  ruleResults: Map<number, RuleMatch | null>,
  results: PipelineResult[]
): Promise<RAGPathResult> {
  let geminiCallCount = 0;
  let retrievalMatchCount = 0;

  // 4b: Generate embeddings for ambiguous clauses (batched + cached)
  let embeddings: number[][] = [];
  try {
    const textsToEmbed = clausesNeedingEmbedding.map((c) => c.clauseText);
    DEBUG && console.log(`[Pipeline] Generating embeddings for ${textsToEmbed.length} clauses...`);
    embeddings = await getEmbeddings(textsToEmbed);
    const dimension = embeddings[0]?.length || 0;
    DEBUG && console.log(`[Pipeline] Embedding generation successful. Generated ${embeddings.length} vectors of dimension ${dimension}`);
  } catch (error) {
    console.error(`[Pipeline] ${scanId}: Embedding generation failed:`, error);
    // Continue without embeddings — Gemini can still analyze without retrieval
    embeddings = clausesNeedingEmbedding.map(() => []);
  }

  // 4c: For each clause, try retrieval first, collect those needing Gemini
  interface GeminiTask {
    clause: SegmentedClause;
    ruleResult: RuleMatch | null;
    similarClauses: Awaited<ReturnType<typeof retrieveSimilarClauses>>;
  }
  const geminiTasks: GeminiTask[] = [];

  for (let i = 0; i < clausesNeedingEmbedding.length; i++) {
    const clause = clausesNeedingEmbedding[i];
    const embedding = embeddings[i];
    const ruleResult = ruleResults.get(clause.clauseIndex) ?? null;

    let resolvedByRetrieval = false;
    let similarClauses: Awaited<ReturnType<typeof retrieveSimilarClauses>> = [];

    // Retrieve similar risky clauses from past scans
    if (embedding && embedding.length === 768) {
      try {
        const riskTypeHint = ruleResult?.riskType ?? null;
        DEBUG && console.log(`[Pipeline] Querying pgvector similarity for clause ${clause.clauseIndex} ("${clause.clauseText.slice(0, 30)}...")`);
        similarClauses = await retrieveSimilarClauses(embedding, riskTypeHint, 5);

        if (similarClauses.length > 0) {
          DEBUG && console.log(`[Pipeline] Retrieved ${similarClauses.length} similar clauses for Clause ${clause.clauseIndex}:`);
          if (DEBUG) {
            similarClauses.forEach((sim, idx) => {
              console.log(`  - Match [${idx + 1}] Similarity: ${sim.similarity.toFixed(4)} | Label: ${sim.riskLabel || "safe"} | Snippet: "${sim.clauseText.slice(0, 50)}..."`);
            });
          }

          const bestMatch = similarClauses[0];
          // High-confidence retrieval match (similarity >= 0.90)
          if (bestMatch.similarity >= 0.90) {
            DEBUG && console.log(`[Pipeline] High-confidence similarity match (${bestMatch.similarity.toFixed(4)} >= 0.90). Attempting to reuse analysis.`);

            if (bestMatch.riskLabel === null || bestMatch.riskLabel === "safe" || bestMatch.riskLabel === "") {
              // Resolved as safe by retrieval
              DEBUG && console.log(`[Pipeline] Retrieved clause was labeled safe. Mapping current clause ${clause.clauseIndex} to safe.`);
              results.push({
                riskType: "liability",
                severity: "safe",
                confidence: calculateConfidence("retrieval", null, bestMatch.similarity, null),
                evidenceSnippet: clause.clauseText.slice(0, 100),
                explanation: "Verified as standard and safe based on highly similar past contract reviews.",
                suggestedRewrite: "No change needed.",
                impact: "Standard terms with no negative impact.",
                detectionMethod: "retrieval",
                clauseText: clause.clauseText,
                pageNumber: clause.pageNumber,
                sectionTitle: clause.sectionTitle,
                clauseId: null,
              });
              resolvedByRetrieval = true;
              retrievalMatchCount++;
            } else {
              // Fetch full risk details from the database risks table
              const { data: dbRisks, error: dbRisksErr } = await supabase
                .from("risks")
                .select("severity, explanation, suggested_rewrite, impact, evidence_snippet")
                .eq("clause_text", bestMatch.clauseText)
                .limit(1);

              if (!dbRisksErr && dbRisks && dbRisks.length > 0) {
                const dbRisk = dbRisks[0];
                DEBUG && console.log(`[Pipeline] Reusing risk analysis from past scan for clause ${clause.clauseIndex}`);
                results.push({
                  riskType: bestMatch.riskLabel,
                  severity: dbRisk.severity as any,
                  confidence: calculateConfidence("retrieval", ruleResult?.confidence || null, bestMatch.similarity, null),
                  evidenceSnippet: dbRisk.evidence_snippet || clause.clauseText.slice(0, 100),
                  explanation: `[Verified Match] ${dbRisk.explanation}`,
                  suggestedRewrite: dbRisk.suggested_rewrite || "No change needed.",
                  impact: dbRisk.impact || "No negative impact.",
                  detectionMethod: "retrieval",
                  clauseText: clause.clauseText,
                  pageNumber: clause.pageNumber,
                  sectionTitle: clause.sectionTitle,
                  clauseId: null,
                });
                resolvedByRetrieval = true;
                retrievalMatchCount++;
              } else {
                DEBUG && console.log(`[Pipeline] Risk details not found in DB for similar clause "${bestMatch.clauseText.slice(0, 30)}...". Falling back to Gemini.`);
              }
            }
          }
        }
      } catch (retrievalErr) {
        console.warn(`[Pipeline] Retrieval analysis failed for clause ${clause.clauseIndex}:`, retrievalErr);
      }
    }

    // Queue for Gemini if not resolved by retrieval
    if (!resolvedByRetrieval) {
      geminiTasks.push({ clause, ruleResult, similarClauses });
    }
  }

  // 4d: Parallel Gemini calls with concurrency limit
  if (geminiTasks.length > 0) {
    DEBUG && console.log(`[Pipeline] Processing ${geminiTasks.length} clauses via Gemini (concurrency: ${GEMINI_CONCURRENCY})...`);

    const tasks = geminiTasks.map((task) => async () => {
      try {
        geminiCallCount++;
        DEBUG && console.log(`[Pipeline] Calling Gemini for clause ${task.clause.clauseIndex}...`);
        const geminiResult = await analyzeClauseWithGemini({
          targetClause: task.clause,
          ruleResult: task.ruleResult,
          retrievedSimilar: task.similarClauses,
          surroundingContext: task.clause.surroundingContext,
        });

        if (geminiResult) {
          const detectionMethod: PipelineResult["detectionMethod"] =
            task.ruleResult ? "hybrid" : (task.similarClauses.length > 0 ? "hybrid" : "llm");

          const finalConfidence = calculateConfidence(
            detectionMethod,
            task.ruleResult?.confidence || null,
            task.similarClauses[0]?.similarity || null,
            geminiResult.confidence
          );

          DEBUG && console.log(`[Pipeline] Gemini analyzed clause ${task.clause.clauseIndex} successfully. Category: ${geminiResult.riskType}, Confidence: ${finalConfidence.toFixed(2)}`);

          results.push({
            riskType: geminiResult.riskType,
            severity: geminiResult.severity,
            confidence: finalConfidence,
            evidenceSnippet: geminiResult.evidenceSnippet,
            explanation: geminiResult.explanation,
            suggestedRewrite: geminiResult.suggestedRewrite,
            impact: geminiResult.impact,
            detectionMethod,
            clauseText: task.clause.clauseText,
            pageNumber: task.clause.pageNumber,
            sectionTitle: task.clause.sectionTitle,
            clauseId: null,
          });
        }
      } catch (error) {
        console.error(`[Pipeline] Gemini analysis failed for clause ${task.clause.clauseIndex}:`, error);
      }
    });

    await runWithConcurrency(tasks, GEMINI_CONCURRENCY);
  }

  return { geminiCallCount, retrievalMatchCount };
}

// ── Confidence Scoring ───────────────────────────────────────────────────────
function calculateConfidence(
  method: "rule" | "retrieval" | "llm" | "hybrid",
  ruleConfidence: number | null,
  retrievalSimilarity: number | null,
  geminiConfidence: number | null
): number {
  let conf = 0.5; // Default fallback

  if (method === "rule" && ruleConfidence !== null) {
    conf = ruleConfidence;
  } else if (method === "retrieval" && retrievalSimilarity !== null) {
    conf = retrievalSimilarity * 0.95; // Discount vector similarity slightly
  } else if (method === "llm" && geminiConfidence !== null) {
    conf = geminiConfidence * 0.90; // Discount Gemini raw confidence slightly
  } else if (method === "hybrid") {
    const components: number[] = [];
    if (ruleConfidence !== null) components.push(ruleConfidence);
    if (retrievalSimilarity !== null) components.push(retrievalSimilarity);
    if (geminiConfidence !== null) components.push(geminiConfidence);

    if (components.length > 0) {
      conf = components.reduce((sum, val) => sum + val, 0) / components.length;
    }
  }

  // Clamp strictly between 0.10 and 0.98 to avoid hardcoded 100% (1.00) values
  return Math.min(Math.max(conf, 0.10), 0.98);
}
