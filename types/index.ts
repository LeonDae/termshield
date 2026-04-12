export type RiskCategory = "ip" | "payment" | "non-compete" | "termination";

export type RiskSeverity = "critical" | "important" | "safe";

export type ScanStatus =
  | "pending"
  | "processing"
  | "complete"
  | "failed"
  | "retrying";

export interface Risk {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  clauseText: string;
  explanation: string;
  fixMessage?: string;
  confidence?: number;
}

export interface Scan {
  id: string;
  filename: string;
  status: ScanStatus;
  confidenceScore: number;
  planType: "basic" | "premium";
  risks: Risk[];
}
