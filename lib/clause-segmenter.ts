/**
 * Clause Segmenter — breaks cleaned contract text into structured clauses
 * with metadata (clause index, section title, page number, surrounding context).
 */

// ── Types ────────────────────────────────────────────────────────────────────
export interface SegmentedClause {
  clauseIndex: number;
  clauseText: string;
  sectionTitle: string | null;
  pageNumber: number | null;
  surroundingContext: string;
  clauseType: "heading" | "clause" | "subclause" | "definition" | "schedule";
}

// ── Patterns ─────────────────────────────────────────────────────────────────

/** Matches numbered clause patterns: "1.", "1.1", "1.1.1", "12.3" etc. */
const NUMBERED_CLAUSE = /^(\d+(?:\.\d+)*)\.\s+/;

/** Matches lettered sub-clauses: "(a)", "(b)", "(i)", "(ii)", "(iv)" etc. */
const LETTERED_SUBCLAUSE = /^\(([a-z]|[ivxlc]+)\)\s+/i;

/** Matches section headings: ALL CAPS lines, or lines ending with ":" */
const SECTION_HEADING = /^(?:[A-Z][A-Z\s,&-]{4,}|.{3,80}:)\s*$/;

/** Matches "SCHEDULE", "ANNEXURE", "EXHIBIT", "APPENDIX" markers */
const SCHEDULE_MARKER = /^\s*(?:schedule|annexure|exhibit|appendix)\s+/i;

/** Matches definition patterns: "Defined term" means / shall mean */
const DEFINITION_PATTERN = /[""]([^""]+)[""]\s+(?:means?|shall mean|refers? to)/i;

/** Page break markers (form feed or explicit page markers) */
const PAGE_BREAK = /\f|^-{3,}\s*page\s*-{3,}$/im;

// ── Main function ────────────────────────────────────────────────────────────

/**
 * Segments cleaned contract text into individual clauses with metadata.
 *
 * Strategy:
 * 1. Split text on page breaks to track page numbers
 * 2. Within each page, split on numbered clause patterns
 * 3. Detect and tag headings, sub-clauses, definitions, and schedules
 * 4. Attach surrounding context (±1 clause) to each clause
 */
export function segmentIntoClauses(cleanedText: string): SegmentedClause[] {
  // Split on page breaks first to track page numbers
  const pages = cleanedText.split(PAGE_BREAK);
  const rawClauses: Array<{
    text: string;
    pageNumber: number;
    clauseType: SegmentedClause["clauseType"];
    sectionTitle: string | null;
  }> = [];

  let currentSection: string | null = null;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageText = pages[pageIdx].trim();
    if (!pageText) continue;

    const pageNumber = pageIdx + 1;

    // Split page text into paragraphs (double newline or clause number boundary)
    const paragraphs = splitIntoParagraphs(pageText);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed || trimmed.length < 5) continue;

      // Classify this paragraph
      if (SECTION_HEADING.test(trimmed) && trimmed.length < 100) {
        currentSection = trimmed.replace(/:$/, "").trim();
        rawClauses.push({
          text: trimmed,
          pageNumber,
          clauseType: "heading",
          sectionTitle: currentSection,
        });
      } else if (SCHEDULE_MARKER.test(trimmed)) {
        currentSection = trimmed.trim();
        rawClauses.push({
          text: trimmed,
          pageNumber,
          clauseType: "schedule",
          sectionTitle: currentSection,
        });
      } else if (DEFINITION_PATTERN.test(trimmed)) {
        rawClauses.push({
          text: trimmed,
          pageNumber,
          clauseType: "definition",
          sectionTitle: currentSection,
        });
      } else if (LETTERED_SUBCLAUSE.test(trimmed)) {
        rawClauses.push({
          text: trimmed,
          pageNumber,
          clauseType: "subclause",
          sectionTitle: currentSection,
        });
      } else {
        rawClauses.push({
          text: trimmed,
          pageNumber,
          clauseType: "clause",
          sectionTitle: currentSection,
        });
      }
    }
  }

  // Build final SegmentedClause array with surrounding context
  const result: SegmentedClause[] = [];

  for (let i = 0; i < rawClauses.length; i++) {
    const raw = rawClauses[i];
    const prev = i > 0 ? rawClauses[i - 1].text : "";
    const next = i < rawClauses.length - 1 ? rawClauses[i + 1].text : "";
    const surroundingContext = [prev, next].filter(Boolean).join("\n\n");

    result.push({
      clauseIndex: i,
      clauseText: raw.text,
      sectionTitle: raw.sectionTitle,
      pageNumber: raw.pageNumber,
      surroundingContext,
      clauseType: raw.clauseType,
    });
  }

  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Splits a page of text into logical paragraphs by:
 * 1. Double newlines
 * 2. Numbered clause boundaries (e.g., "1. ", "2.1 ")
 */
function splitIntoParagraphs(text: string): string[] {
  const paragraphs: string[] = [];
  let current = "";

  const lines = text.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if this line starts a new numbered clause
    if (NUMBERED_CLAUSE.test(trimmedLine) || LETTERED_SUBCLAUSE.test(trimmedLine)) {
      if (current.trim()) {
        paragraphs.push(current.trim());
      }
      current = trimmedLine;
    } else if (trimmedLine === "") {
      // Empty line = paragraph break
      if (current.trim()) {
        paragraphs.push(current.trim());
        current = "";
      }
    } else if (SECTION_HEADING.test(trimmedLine) && trimmedLine.length < 100) {
      // Section heading starts its own paragraph
      if (current.trim()) {
        paragraphs.push(current.trim());
      }
      paragraphs.push(trimmedLine);
      current = "";
    } else {
      // Continuation of current paragraph
      current += (current ? " " : "") + trimmedLine;
    }
  }

  if (current.trim()) {
    paragraphs.push(current.trim());
  }

  return paragraphs;
}

/**
 * Generates a SHA-256-like hash of the full document text for deduplication.
 * Uses a simple string hash since we're in a server environment.
 */
export function hashDocumentText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex and pad to ensure consistent length
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  // Also include length for better uniqueness
  return `${hex}-${text.length}`;
}

/**
 * Deduplicates clauses that are >90% similar (by word overlap).
 * Returns unique clauses only.
 */
export function deduplicateClauses(
  clauses: SegmentedClause[]
): SegmentedClause[] {
  const unique: SegmentedClause[] = [];

  for (const clause of clauses) {
    const isDuplicate = unique.some(
      (existing) => jaccardSimilarity(existing.clauseText, clause.clauseText) > 0.9
    );
    if (!isDuplicate) {
      unique.push(clause);
    }
  }

  return unique;
}

/**
 * Calculates Jaccard similarity between two texts (word-level).
 */
function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
