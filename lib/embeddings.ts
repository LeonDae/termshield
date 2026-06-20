/**
 * Embeddings Module — Cached embedding generation + pgvector storage + retrieval.
 *
 * Uses Google's text-embedding-004 model via LangChain.
 * Implements a two-tier caching strategy:
 *   1. In-memory cache (per request/process)
 *   2. Supabase embedding_cache table (persistent across requests)
 */

import { getGeminiClient, embeddingLimiter } from "@/lib/gemini-client";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { SegmentedClause } from "@/lib/clause-segmenter";

// ── Types ────────────────────────────────────────────────────────────────────
export interface SimilarClause {
  clauseText: string;
  riskLabel: string | null;
  similarity: number;
  sectionTitle: string | null;
}

// ── In-memory cache (per process lifetime) ───────────────────────────────────
const memoryCache = new Map<string, number[]>();
const DEBUG = process.env.NODE_ENV !== "production";

// ── Gemini SDK client (shared, rate-limited) ───────────────────────────────

// ── Hashing ──────────────────────────────────────────────────────────────────

/**
 * Creates a simple hash for cache lookup. Not cryptographic, just fast & deterministic.
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0") + "-" + text.length;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get embedding for a single text string, with two-tier caching.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const hash = hashText(text);

  // Tier 1: in-memory cache
  const cached = memoryCache.get(hash);
  if (cached) {
    DEBUG && console.log(`[Embeddings] In-memory cache hit for hash: ${hash}`);
    return cached;
  }

  // Tier 2: Supabase embedding_cache
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("embedding_cache")
      .select("embedding")
      .eq("text_hash", hash)
      .maybeSingle();

    if (data?.embedding) {
      // Parse the pgvector string format "[0.1,0.2,...]" into number[]
      const embedding = parseVectorString(data.embedding);
      if (embedding && embedding.length === 768) {
        DEBUG && console.log(`[Embeddings] Supabase cache hit for hash: ${hash}`);
        memoryCache.set(hash, embedding);
        return embedding;
      }
    }
  } catch (err) {
    // Cache miss or table doesn't exist yet — fall through to API call
    console.warn(`[Embeddings] Supabase cache lookup failed/missed for hash: ${hash}`);
  }

  // Cache miss — call the API
  DEBUG && console.log(`[Embeddings] Cache miss. Calling Gemini embedding API for: "${text.slice(0, 40)}..."`);
  const ai = getGeminiClient();
  await embeddingLimiter.waitForToken();
  const res = await ai.models.embedContent({
    model: "models/gemini-embedding-2",
    contents: text,
    config: { outputDimensionality: 768 },
  });

  const embedding = res.embeddings?.[0]?.values;
  if (!embedding || embedding.length !== 768) {
    throw new Error(`Embedding API returned invalid vector: expected 768, got ${embedding?.length || 0}`);
  }

  DEBUG && console.log(`[Embeddings] Successfully generated embedding of dimension: ${embedding.length}`);

  // Store in both caches
  memoryCache.set(hash, embedding);
  await storeInCache(hash, embedding);

  return embedding;
}

/**
 * Get embeddings for multiple texts, batched and cached.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  // Check caches first
  for (let i = 0; i < texts.length; i++) {
    const hash = hashText(texts[i]);
    const cached = memoryCache.get(hash);
    if (cached) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  // Check Supabase cache for remaining
  if (uncachedTexts.length > 0) {
    try {
      const supabase = createSupabaseServerClient();
      const hashes = uncachedTexts.map(hashText);
      const { data } = await supabase
        .from("embedding_cache")
        .select("text_hash, embedding")
        .in("text_hash", hashes);

      if (data) {
        const dbCache = new Map(data.map((d: any) => [d.text_hash, d.embedding]));
        const stillUncached: number[] = [];

        for (let j = 0; j < uncachedTexts.length; j++) {
          const hash = hashText(uncachedTexts[j]);
          const dbEmbedding = dbCache.get(hash);
          if (dbEmbedding) {
            const parsed = parseVectorString(dbEmbedding);
            if (parsed && parsed.length === 768) {
              results[uncachedIndices[j]] = parsed;
              memoryCache.set(hash, parsed);
            } else {
              stillUncached.push(j);
            }
          } else {
            stillUncached.push(j);
          }
        }

        // Only API-call for truly uncached texts
        if (stillUncached.length > 0) {
          const textsToEmbed = stillUncached.map((j) => uncachedTexts[j]);
          DEBUG && console.log(`[Embeddings] Batch cache miss. Calling Gemini embedding API for ${textsToEmbed.length} texts...`);
          const ai = getGeminiClient();
          await embeddingLimiter.waitForToken();
          const res = await ai.models.embedContent({
            model: "models/gemini-embedding-2",
            contents: textsToEmbed,
            config: { outputDimensionality: 768 },
          });

          if (!res.embeddings || res.embeddings.length !== textsToEmbed.length) {
            throw new Error(`Embedding API returned mismatch in batch count: expected ${textsToEmbed.length}, got ${res.embeddings?.length || 0}`);
          }

          for (let k = 0; k < stillUncached.length; k++) {
            const j = stillUncached[k];
            const originalIdx = uncachedIndices[j];
            const values = res.embeddings[k]?.values;
            if (!values || values.length !== 768) {
              throw new Error(`Embedding API returned invalid vector at index ${k}: expected 768, got ${values?.length || 0}`);
            }
            results[originalIdx] = values;

            const hash = hashText(uncachedTexts[j]);
            memoryCache.set(hash, values);
            // Fire-and-forget cache store
            storeInCache(hash, values).catch((err) => {
              console.warn(`[Embeddings] Fire-and-forget cache store failed:`, err);
            });
          }
        }

        return results;
      }
    } catch (dbErr) {
      console.warn("[Embeddings] Supabase batch cache lookup failed:", dbErr);
      // DB cache unavailable — fall through
    }

    // Fallback: just embed all uncached texts directly
    DEBUG && console.log(`[Embeddings] Fallback. Calling Gemini embedding API for all ${uncachedTexts.length} uncached texts...`);
    const ai = getGeminiClient();
    await embeddingLimiter.waitForToken();
    const res = await ai.models.embedContent({
      model: "models/gemini-embedding-2",
      contents: uncachedTexts,
      config: { outputDimensionality: 768 },
    });

    if (!res.embeddings || res.embeddings.length !== uncachedTexts.length) {
      throw new Error(`Embedding API returned mismatch in fallback batch count: expected ${uncachedTexts.length}, got ${res.embeddings?.length || 0}`);
    }

    for (let j = 0; j < uncachedTexts.length; j++) {
      const originalIdx = uncachedIndices[j];
      const values = res.embeddings[j]?.values;
      if (!values || values.length !== 768) {
        throw new Error(`Embedding API returned invalid vector at index ${j} in fallback: expected 768, got ${values?.length || 0}`);
      }
      results[originalIdx] = values;

      const hash = hashText(uncachedTexts[j]);
      memoryCache.set(hash, values);
      storeInCache(hash, values).catch((err) => {
        console.warn(`[Embeddings] Fallback cache store failed:`, err);
      });
    }
  }

  return results;
}

/**
 * Store clause embeddings in the pgvector-backed clause_embeddings table.
 * Returns a mapping from clause text to the inserted DB row ID.
 */
export async function storeClauseEmbeddings(
  scanId: string,
  documentHash: string,
  clauses: SegmentedClause[],
  embeddings: number[][],
  riskLabels: (string | null)[]
): Promise<Map<string, string>> {
  const supabase = createSupabaseServerClient();
  const textToIdMap = new Map<string, string>();

  // Validate embeddings beforehand to make sure we don't insert invalid vectors
  const rows = [];
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const embedding = embeddings[i];

    if (!embedding || embedding.length !== 768) {
      console.warn(`[Embeddings] Skipping DB insertion for clause ${clause.clauseIndex} due to invalid embedding dimension: ${embedding?.length || 0}`);
      continue;
    }

    rows.push({
      scan_id: scanId,
      document_hash: documentHash,
      clause_index: clause.clauseIndex,
      clause_text: clause.clauseText,
      embedding: vectorToString(embedding),
      clause_type: clause.clauseType,
      page_number: clause.pageNumber,
      section_title: clause.sectionTitle,
      risk_label: riskLabels[i],
    });
  }

  if (rows.length === 0) {
    DEBUG && console.log(`[Embeddings] No valid embeddings to store in Supabase for scan ${scanId}`);
    return textToIdMap;
  }

  DEBUG && console.log(`[Embeddings] Storing ${rows.length} clause embeddings for scan ${scanId} in Supabase...`);
  // Insert in batches of 50 to avoid request size limits
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { data, error } = await supabase
      .from("clause_embeddings")
      .insert(batch)
      .select("id, clause_text");

    if (error) {
      console.error("[Embeddings] Failed to store clause embeddings batch:", error.message);
      throw error;
    } else if (data) {
      DEBUG && console.log(`[Embeddings] Successfully stored batch of ${data.length} clause embeddings.`);
      for (const row of data) {
        textToIdMap.set(row.clause_text, row.id);
      }
    }
  }

  return textToIdMap;
}

/**
 * Retrieve similar risky clauses from the pgvector store (past scans).
 * Uses cosine similarity search via Supabase RPC (requires a match function).
 * Falls back to a simpler query if the RPC function doesn't exist.
 */
export async function retrieveSimilarClauses(
  queryEmbedding: number[],
  riskType: string | null,
  topK: number = 5
): Promise<SimilarClause[]> {
  const supabase = createSupabaseServerClient();

  if (!queryEmbedding || queryEmbedding.length !== 768) {
    console.warn(`[Embeddings] Cannot retrieve similar clauses: query embedding is invalid (dimension: ${queryEmbedding?.length || 0})`);
    return [];
  }

  try {
    // Try using Supabase RPC for vector similarity search
    const { data, error } = await supabase.rpc("match_clause_embeddings", {
      query_embedding: vectorToString(queryEmbedding),
      match_threshold: 0.6,
      match_count: topK,
      filter_risk_type: riskType,
    });

    if (error) {
      console.warn("[Embeddings] match_clause_embeddings RPC failed:", error.message);
    } else if (data) {
      DEBUG && console.log(`[Embeddings] Vector retrieval: found ${data.length} matching clauses.`);
      return data.map((row: any) => ({
        clauseText: row.clause_text,
        riskLabel: row.risk_label,
        similarity: row.similarity,
        sectionTitle: row.section_title,
      }));
    }
  } catch (rpcErr) {
    // RPC function doesn't exist yet — that's OK
    console.warn("[Embeddings] RPC execution exception:", rpcErr);
  }

  // Fallback: simple query without vector search (less accurate but functional)
  DEBUG && console.log("[Embeddings] Falling back to text-based/simple retrieval");
  try {
    const query = supabase
      .from("clause_embeddings")
      .select("clause_text, risk_label, section_title")
      .not("risk_label", "is", null)
      .order("created_at", { ascending: false })
      .limit(topK);

    if (riskType) {
      query.eq("risk_label", riskType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Embeddings] Fallback retrieval query failed:", error.message);
    } else if (data) {
      DEBUG && console.log(`[Embeddings] Fallback retrieval returned ${data.length} items (text-based, no vector similarity)`);
      return data.map((row: any) => ({
        clauseText: row.clause_text,
        riskLabel: row.risk_label,
        similarity: 0.0, // No vector similarity — text-based fallback only
        sectionTitle: row.section_title,
      }));
    }
  } catch (fallbackErr) {
    console.error("[Embeddings] Fallback retrieval exception:", fallbackErr);
  }

  return [];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert number[] to pgvector string format: "[0.1,0.2,0.3]"
 */
function vectorToString(vec: number[]): string {
  return "[" + vec.join(",") + "]";
}

/**
 * Parse pgvector string "[0.1,0.2,...]" back to number[]
 */
function parseVectorString(vec: any): number[] {
  if (Array.isArray(vec)) return vec;
  if (typeof vec === "string") {
    return vec
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(Number);
  }
  return [];
}

/**
 * Store an embedding in the persistent cache table.
 */
async function storeInCache(hash: string, embedding: number[]): Promise<void> {
  if (!embedding || embedding.length !== 768) return;
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("embedding_cache").upsert(
      {
        text_hash: hash,
        embedding: vectorToString(embedding),
        model: "models/gemini-embedding-2",
      },
      { onConflict: "text_hash" }
    );
    if (error) {
      console.warn(`[Embeddings] Failed to upsert embedding in cache:`, error.message);
    }
  } catch {
    // Non-critical — cache store failure shouldn't break the pipeline
  }
}
