/**
 * Centralized Gemini AI client with built-in rate limiting.
 *
 * Solves two problems:
 * 1. Prevents stale API key caching when .env.local is edited during dev.
 * 2. Enforces per-minute rate limits to avoid 429 TooManyRequests errors
 *    on the Gemini free tier (15 RPM for generateContent, 1500 RPM for embeddings).
 */

import { GoogleGenAI } from "@google/genai";

// ── Singleton with staleness detection ──────────────────────────────────────

let _client: GoogleGenAI | null = null;
let _lastApiKey: string | undefined;

/**
 * Returns the shared GoogleGenAI client.
 * Re-creates the client if the API key env var has changed (e.g. hot-reload).
 */
export function getGeminiClient(): GoogleGenAI {
  const currentKey = process.env.GEMINI_API_KEY;

  if (!currentKey) {
    throw new Error(
      "[Gemini] GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server."
    );
  }

  // Re-create client if key changed (handles .env.local edits during dev)
  if (!_client || currentKey !== _lastApiKey) {
    console.log("[Gemini] Initializing GoogleGenAI client...");
    _client = new GoogleGenAI({ apiKey: currentKey });
    _lastApiKey = currentKey;
  }

  return _client;
}

// ── Rate limiter ────────────────────────────────────────────────────────────

/**
 * Simple token-bucket rate limiter.
 * Ensures we stay within Gemini's free tier limits.
 */
class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillIntervalMs: number;
  private lastRefill: number;

  constructor(maxRequestsPerMinute: number) {
    this.maxTokens = maxRequestsPerMinute;
    this.tokens = maxRequestsPerMinute;
    this.refillIntervalMs = 60_000; // 1 minute
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    // No tokens available — wait until next refill
    const msUntilRefill = this.refillIntervalMs - (Date.now() - this.lastRefill);
    const waitMs = Math.max(msUntilRefill, 1000) + Math.random() * 500; // Add jitter
    console.warn(
      `[Gemini-RateLimit] Rate limit reached. Waiting ${(waitMs / 1000).toFixed(1)}s before next request...`
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    // Refill and take a token
    this.refill();
    this.tokens = Math.max(this.tokens - 1, 0);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }
}

// gemini-2.5-flash free tier: 15 RPM for generateContent, 1500 RPD
// Embeddings use a separate model with higher limits.
export const generateContentLimiter = new RateLimiter(12); // 12 RPM — leave headroom below 15 RPM cap
export const embeddingLimiter = new RateLimiter(14); // Embeddings have higher limits
