import { z } from "zod";
import { Type, Schema } from "@google/genai";

// ── Risk categories ──────────────────────────────────────────────────────────
export const RISK_CATEGORIES = [
  "ip",
  "payment",
  "non-compete",
  "termination",
  "liability",
  "indemnity",
  "confidentiality",
  "revisions",
  "acceptance",
  "auto-renewal",
] as const;

export type RiskCategoryEnum = (typeof RISK_CATEGORIES)[number];

// ── Zod schema for a single clause analysis ──────────────────────────────────
export const ClauseAnalysisSchema = z.object({
  riskType: z.enum(RISK_CATEGORIES),
  severity: z.enum(["critical", "important", "safe"]),
  confidence: z.number().min(0).max(1),
  evidenceSnippet: z.string().min(1),
  explanation: z.string().min(1),
  suggestedRewrite: z.string(),
  impact: z.string(),
});

export type ClauseAnalysis = z.infer<typeof ClauseAnalysisSchema>;

// ── Zod schema for full scan result (array of clause analyses) ───────────────
export const ScanResultSchema = z.object({
  risks: z.array(ClauseAnalysisSchema),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;

// ── Gemini response schema (for responseSchema enforcement) ──────────────────
export const geminiClauseResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    riskType: {
      type: Type.STRING,
      enum: [...RISK_CATEGORIES],
      description: "The risk category this clause falls under",
    },
    severity: {
      type: Type.STRING,
      enum: ["critical", "important", "safe"],
      description: "Severity level of the risk",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score between 0 and 1",
    },
    evidenceSnippet: {
      type: Type.STRING,
      description: "The exact text from the clause that constitutes the risk evidence",
    },
    explanation: {
      type: Type.STRING,
      description: "Plain English explanation of why this clause is risky for an Indian freelancer",
    },
    suggestedRewrite: {
      type: Type.STRING,
      description: "A suggested rewrite of the risky clause to make it fairer",
    },
    impact: {
      type: Type.STRING,
      description: "The financial or practical impact of this clause on a freelancer",
    },
  },
  required: [
    "riskType",
    "severity",
    "confidence",
    "evidenceSnippet",
    "explanation",
    "suggestedRewrite",
    "impact",
  ],
};
