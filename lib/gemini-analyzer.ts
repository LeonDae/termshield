/**
 * Gemini Analyzer — Selective LLM analysis for ambiguous clauses.
 *
 * Called ONLY when the rule engine cannot confidently classify a clause.
 * Sends the minimum context needed (target clause + surrounding context +
 * retrieved similar clauses) — NOT the full contract.
 *
 * Includes a verification pass to reject hallucinated evidence.
 */

import { Type, Schema } from "@google/genai";
import { getGeminiClient, generateContentLimiter } from "@/lib/gemini-client";
import { z } from "zod";
import {
  ClauseAnalysisSchema,
  geminiClauseResponseSchema,
  type ClauseAnalysis,
} from "@/lib/schemas";
import type { SegmentedClause } from "@/lib/clause-segmenter";
import type { RuleMatch } from "@/lib/rule-engine";
import type { SimilarClause } from "@/lib/embeddings";

// ── Types ────────────────────────────────────────────────────────────────────
export interface GeminiAnalysisRequest {
  targetClause: SegmentedClause;
  ruleResult: RuleMatch | null;
  retrievedSimilar: SimilarClause[];
  surroundingContext: string;
}

// ── Gemini client (shared, rate-limited) ─────────────────────────────────────

const DEBUG = process.env.NODE_ENV !== "production";

// ── Main analysis function ───────────────────────────────────────────────────

/**
 * Analyzes a single ambiguous clause using Gemini with targeted context.
 *
 * Context sent to Gemini:
 * 1. The target clause text
 * 2. Its surrounding context (±1 clause)
 * 3. Up to 3 similar risky clauses from past scans (RAG context)
 * 4. Any partial rule engine result (if available)
 *
 * Total token budget: ~500-800 tokens of context per call.
 */
/**
 * Helper to retry an async function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;

    // For 429 rate-limit errors, use much longer backoff
    const is429 = error?.status === 429 || error?.message?.includes("429");
    const actualDelay = is429 ? Math.max(delay, 10_000) : delay;

    console.warn(`[Gemini-Resilience] API call failed (${is429 ? "429 Rate Limit" : "error"}). Retrying in ${actualDelay}ms... (Remaining retries: ${retries})`);
    await new Promise((resolve) => setTimeout(resolve, actualDelay));
    return retryWithBackoff(fn, retries - 1, actualDelay * 2);
  }
}

/**
 * Fallback analysis if Gemini API is completely unavailable
 */
function getFallbackAnalysis(request: GeminiAnalysisRequest): ClauseAnalysis {
  DEBUG && console.log(`[Gemini-Resilience] Gemini API completely unavailable. Invoking fallback path.`);
  const { targetClause, ruleResult } = request;

  if (ruleResult) {
    DEBUG && console.log(`[Gemini-Resilience] Fallback: Reusing preliminary rule match for category "${ruleResult.riskType}"`);
    return {
      riskType: ruleResult.riskType,
      severity: ruleResult.severity,
      confidence: Math.max(ruleResult.confidence * 0.85, 0.1), // Slightly discount fallback confidence
      evidenceSnippet: ruleResult.evidenceSnippet,
      explanation: `[Gemini API Offline - Fallback Match] ${ruleResult.explanation}`,
      suggestedRewrite: ruleResult.suggestedRewrite,
      impact: ruleResult.impact,
    };
  }

  DEBUG && console.log(`[Gemini-Resilience] Fallback: No rule match found. Defaulting to safe/needs review.`);
  return {
    riskType: "liability",
    severity: "safe",
    confidence: 0.1,
    evidenceSnippet: targetClause.clauseText.slice(0, 100),
    explanation: "[Gemini API Offline - Unresolved] The clause could not be analyzed due to API unavailability. Please review manually.",
    suggestedRewrite: "Review manually for IP, payment, or liability risks.",
    impact: "Potential unanalyzed legal risk due to service outage.",
  };
}

export async function analyzeClauseWithGemini(
  request: GeminiAnalysisRequest
): Promise<ClauseAnalysis | null> {
  const ai = getGeminiClient();
  const prompt = buildPrompt(request);

  try {
    const response = await retryWithBackoff(async () => {
      await generateContentLimiter.waitForToken();
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: geminiClauseResponseSchema,
          temperature: 0.1, // Maximum determinism
        },
      });
    }, 3, 1000);

    if (!response.text) {
      console.error("Gemini returned empty response for clause analysis");
      return getFallbackAnalysis(request);
    }

    const rawData = JSON.parse(response.text);
    const parsed = ClauseAnalysisSchema.parse(rawData);

    // Verification pass — check that the evidence is grounded
    return verifyGeminiOutput(parsed, request.targetClause);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Gemini output failed Zod validation:", error.errors);
      return null;
    }
    console.error("Gemini API error during clause analysis:", error);
    return getFallbackAnalysis(request);
  }
}

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(request: GeminiAnalysisRequest): string {
  const { targetClause, ruleResult, retrievedSimilar, surroundingContext } = request;

  const parts: string[] = [
    "You are a legal contract risk analyzer specializing in Indian freelance and independent contractor agreements.",
    "Analyze the following contract clause for risks to the freelancer/contractor.",
    "",
    "RULES:",
    "1. Return your analysis as structured JSON matching the provided schema.",
    "2. The 'evidenceSnippet' MUST be an EXACT substring copied from the 'Target Clause' below. Do not paraphrase or fabricate text.",
    "3. Be specific about financial and practical impact for Indian freelancers.",
    "4. IMPORTANT: Err on the side of flagging risks. Most contract clauses contain at least subtle risks for the freelancer.",
    "   - Only mark a clause as severity 'safe' if it is GENUINELY balanced, has no one-sided terms, and explicitly protects the freelancer.",
    "   - Vague or ambiguous language should be flagged as 'important' since it can be exploited.",
    "   - One-sided clauses (even if standard in the industry) should be flagged.",
    "5. Classify the risk into exactly one of: ip, payment, non-compete, termination, liability, indemnity, confidentiality, revisions, acceptance, auto-renewal.",
    "6. Choose the BEST-FIT risk category for the clause. Every clause should map to the category it most closely relates to.",
    "",
    "═══ TARGET CLAUSE ═══",
    targetClause.clauseText,
    "",
  ];

  if (targetClause.sectionTitle) {
    parts.push(`Section: ${targetClause.sectionTitle}`);
    parts.push("");
  }

  if (surroundingContext) {
    parts.push("═══ SURROUNDING CONTEXT ═══");
    // Truncate to ~300 chars to keep token budget low
    parts.push(surroundingContext.slice(0, 300));
    parts.push("");
  }

  if (ruleResult) {
    parts.push("═══ PRELIMINARY RULE ANALYSIS ═══");
    parts.push(`Detected pattern: ${ruleResult.matchedPattern}`);
    parts.push(`Preliminary risk type: ${ruleResult.riskType}`);
    parts.push(`Preliminary severity: ${ruleResult.severity}`);
    parts.push(`Confidence: ${ruleResult.confidence.toFixed(2)}`);
    parts.push("Refine or override this analysis based on the full clause context.");
    parts.push("");
  }

  if (retrievedSimilar.length > 0) {
    parts.push("═══ SIMILAR CLAUSES FROM PAST SCANS ═══");
    const top3 = retrievedSimilar.slice(0, 3);
    for (let i = 0; i < top3.length; i++) {
      const similar = top3[i];
      parts.push(`[${i + 1}] (similarity: ${similar.similarity.toFixed(2)}, labeled: ${similar.riskLabel || "unknown"})`);
      // Truncate each similar clause to ~150 chars
      parts.push(similar.clauseText.slice(0, 150));
      parts.push("");
    }
  }

  return parts.join("\n");
}

// ── Verification pass ────────────────────────────────────────────────────────

/**
 * Verifies that Gemini's output is grounded in the actual clause text.
 *
 * Checks:
 * 1. evidenceSnippet must appear in the clause (fuzzy substring match)
 * 2. If evidence is not found, downgrade confidence and flag for review
 */
function verifyGeminiOutput(
  result: ClauseAnalysis,
  clause: SegmentedClause
): ClauseAnalysis {
  const clauseTextLower = clause.clauseText.toLowerCase();
  const evidenceLower = result.evidenceSnippet.toLowerCase().trim();

  // Check if evidence snippet exists in the clause (fuzzy match)
  const isGrounded = evidenceLower.length > 5 && (
    clauseTextLower.includes(evidenceLower) ||
    fuzzySubstringMatch(clauseTextLower, evidenceLower, 0.8)
  );

  if (!isGrounded) {
    // Downgrade confidence and flag for review
    return {
      ...result,
      confidence: Math.min(result.confidence, 0.3),
      explanation: `[NEEDS REVIEW] ${result.explanation} — The AI-identified evidence could not be verified in the original clause text.`,
      // Try to extract a better evidence snippet from the actual clause
      evidenceSnippet: clause.clauseText.slice(0, 100),
    };
  }

  return result;
}

/**
 * Fuzzy substring match — checks if target appears in source with ≥threshold similarity.
 * Uses a sliding window approach with word overlap.
 */
function fuzzySubstringMatch(
  source: string,
  target: string,
  threshold: number
): boolean {
  const targetWords = target.split(/\s+/).filter(Boolean);
  const sourceWords = source.split(/\s+/).filter(Boolean);

  if (targetWords.length === 0) return false;
  if (targetWords.length > sourceWords.length) return false;

  // Sliding window of target length across source
  for (let i = 0; i <= sourceWords.length - targetWords.length; i++) {
    const window = sourceWords.slice(i, i + targetWords.length);
    let matches = 0;
    for (let j = 0; j < targetWords.length; j++) {
      if (window[j] === targetWords[j]) matches++;
    }
    const similarity = matches / targetWords.length;
    if (similarity >= threshold) return true;
  }

  return false;
}

// ── Bulk analysis (timeout fallback) ─────────────────────────────────────────

/**
 * Analyzes multiple clauses in a single Gemini API call.
 * Used as a fast fallback when the RAG pipeline exceeds the 60-second timeout.
 * Sends all clauses concatenated with index markers, asks for array response.
 */
export async function bulkAnalyzeClausesWithGemini(
  clauses: SegmentedClause[]
): Promise<Map<number, ClauseAnalysis>> {
  const ai = getGeminiClient();
  const resultMap = new Map<number, ClauseAnalysis>();

  if (clauses.length === 0) return resultMap;

  // Build a single prompt with all clauses
  const parts: string[] = [
    "You are a legal contract risk analyzer specializing in Indian freelance and independent contractor agreements.",
    "Analyze EACH of the following contract clauses for risks to the freelancer/contractor.",
    "",
    "RULES:",
    "1. Return a JSON array with one analysis object per clause, in the same order as presented.",
    "2. Each object must have: riskType, severity, confidence, evidenceSnippet, explanation, suggestedRewrite, impact.",
    "3. The 'evidenceSnippet' MUST be an EXACT substring from the corresponding clause text.",
    "4. Classify risk into exactly one of: ip, payment, non-compete, termination, liability, indemnity, confidentiality, revisions, acceptance, auto-renewal.",
    "5. IMPORTANT: Err on the side of flagging risks. Most contract clauses contain at least subtle risks for the freelancer.",
    "   - Only mark a clause as severity 'safe' if it is GENUINELY balanced and explicitly protects the freelancer.",
    "   - Vague or ambiguous language should be flagged as 'important'.",
    "   - Every clause MUST be assigned a relevant risk category even if safe.",
    "",
  ];

  for (let i = 0; i < clauses.length; i++) {
    parts.push(`═══ CLAUSE ${i + 1} ═══`);
    parts.push(clauses[i].clauseText);
    if (clauses[i].sectionTitle) {
      parts.push(`Section: ${clauses[i].sectionTitle}`);
    }
    parts.push("");
  }

  const prompt = parts.join("\n");

  // Schema for array response
  const bulkResponseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        riskType: {
          type: Type.STRING,
          enum: ["ip", "payment", "non-compete", "termination", "liability", "indemnity", "confidentiality", "revisions", "acceptance", "auto-renewal"],
        },
        severity: {
          type: Type.STRING,
          enum: ["critical", "important", "safe"],
        },
        confidence: { type: Type.NUMBER },
        evidenceSnippet: { type: Type.STRING },
        explanation: { type: Type.STRING },
        suggestedRewrite: { type: Type.STRING },
        impact: { type: Type.STRING },
      },
      required: ["riskType", "severity", "confidence", "evidenceSnippet", "explanation", "suggestedRewrite", "impact"],
    },
  };

  try {
    DEBUG && console.log(`[Gemini-Bulk] Sending ${clauses.length} clauses in a single Gemini API call...`);
    const response = await retryWithBackoff(async () => {
      await generateContentLimiter.waitForToken();
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: bulkResponseSchema,
          temperature: 0.1,
        },
      });
    }, 2, 1000);

    if (!response.text) {
      console.error("[Gemini-Bulk] Empty response from Gemini");
      return resultMap;
    }

    const rawArray = JSON.parse(response.text);
    if (!Array.isArray(rawArray)) {
      console.error("[Gemini-Bulk] Response is not an array");
      return resultMap;
    }

    DEBUG && console.log(`[Gemini-Bulk] Received ${rawArray.length} analyses from Gemini`);

    for (let i = 0; i < Math.min(rawArray.length, clauses.length); i++) {
      try {
        const parsed = ClauseAnalysisSchema.parse(rawArray[i]);
        const verified = verifyGeminiOutput(parsed, clauses[i]);
        resultMap.set(clauses[i].clauseIndex, verified);
      } catch (parseErr) {
        console.warn(`[Gemini-Bulk] Failed to parse result for clause ${i}:`, parseErr);
      }
    }

    DEBUG && console.log(`[Gemini-Bulk] Successfully parsed ${resultMap.size}/${clauses.length} clause analyses`);
  } catch (error) {
    console.error("[Gemini-Bulk] Bulk analysis failed:", error);
    // Return fallback analyses for all clauses
    for (const clause of clauses) {
      resultMap.set(clause.clauseIndex, {
        riskType: "liability",
        severity: "safe",
        confidence: 0.1,
        evidenceSnippet: clause.clauseText.slice(0, 100),
        explanation: "[Bulk Analysis Failed] Could not analyze this clause. Please review manually.",
        suggestedRewrite: "Review manually.",
        impact: "Unknown — analysis failed.",
      });
    }
  }

  return resultMap;
}

