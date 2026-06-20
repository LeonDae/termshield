// ── Risk Categories (expanded from 4 → 10) ──────────────────────────────────
export type RiskCategory =
  | "ip"
  | "payment"
  | "non-compete"
  | "termination"
  | "liability"
  | "indemnity"
  | "confidentiality"
  | "revisions"
  | "acceptance"
  | "auto-renewal";

export type RiskSeverity = "critical" | "important" | "safe";

export type DetectionMethod = "rule" | "retrieval" | "llm" | "hybrid";

export type ScanStatus =
  | "pending"
  | "processing"
  | "complete"
  | "failed"
  | "retrying";

// ── Risk interface (backward-compatible + new fields) ────────────────────────
export interface Risk {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  clauseText: string;
  explanation: string;
  fixMessage?: string;
  confidence?: number;

  // ── New fields from hybrid pipeline ──
  riskType?: RiskCategory;
  evidenceSnippet?: string;
  impact?: string;
  suggestedRewrite?: string;
  detectionMethod?: DetectionMethod;
  clauseId?: string;
  pageNumber?: number;
  sectionTitle?: string;
}

// ── Scan interface ───────────────────────────────────────────────────────────
export interface Scan {
  id: string;
  filename: string;
  status: ScanStatus;
  confidenceScore: number;
  planType: "basic" | "premium";
  risks: Risk[];
}
