import { z } from "zod";

import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase";
import type { Risk, Scan, DetectionMethod, RiskCategory } from "@/types";

export const createScanInputSchema = z.object({
  filename: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((value) => value || undefined),
  contractText: z.string().trim().min(120, "Paste at least 120 characters of contract text."),
  planType: z.enum(["basic", "premium"]),
});

export type CreateScanInput = z.infer<typeof createScanInputSchema>;

type ScanRow = {
  id: string;
  filename: string | null;
  status: Scan["status"];
  confidence_score: number | null;
  plan_type: Scan["planType"] | null;
};

type RiskRow = {
  id: string;
  category: Risk["category"];
  severity: Risk["severity"];
  clause_text: string | null;
  explanation: string | null;
  fix_message: string | null;
  confidence: number | null;
  // New v2 columns (nullable for backward compat)
  risk_type: string | null;
  evidence_snippet: string | null;
  impact: string | null;
  suggested_rewrite: string | null;
  detection_method: string | null;
  clause_id: string | null;
  page_number: number | null;
  section_title: string | null;
};

export function getScanSetupMessage() {
  return "Configure Supabase in .env.local before creating live scans. The code is wired, but the database connection is intentionally external to the app.";
}

function mapRiskRow(row: RiskRow): Risk {
  return {
    id: row.id,
    category: (row.risk_type ?? row.category) as RiskCategory,
    severity: row.severity,
    clauseText: row.clause_text ?? "",
    explanation: row.explanation ?? "",
    fixMessage: row.suggested_rewrite ?? row.fix_message ?? undefined,
    confidence: row.confidence ?? undefined,
    // New v2 fields
    riskType: (row.risk_type ?? row.category) as RiskCategory,
    evidenceSnippet: row.evidence_snippet ?? undefined,
    impact: row.impact ?? undefined,
    suggestedRewrite: row.suggested_rewrite ?? undefined,
    detectionMethod: (row.detection_method ?? undefined) as DetectionMethod | undefined,
    clauseId: row.clause_id ?? undefined,
    pageNumber: row.page_number ?? undefined,
    sectionTitle: row.section_title ?? undefined,
  };
}

function mapScanRow(row: ScanRow, risks: RiskRow[] = []): Scan {
  return {
    id: row.id,
    filename: row.filename ?? "untitled-contract.txt",
    status: row.status,
    confidenceScore: row.confidence_score ?? 0,
    planType: row.plan_type ?? "basic",
    risks: risks.map(mapRiskRow),
  };
}

export async function createScanRecord(input: CreateScanInput, userId?: string): Promise<Scan> {
  if (!hasSupabaseServerConfig()) {
    throw new Error(getScanSetupMessage());
  }

  const supabase = createSupabaseServerClient();
  const filename =
    input.filename?.trim() || `${input.planType}-contract-${Date.now()}.txt`;

  const { data, error } = await supabase
    .from("scans")
    .insert({
      filename,
      plan_type: input.planType,
      status: "pending",
      user_id: userId || null,
    })
    .select("id, filename, status, confidence_score, plan_type")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create the scan record.");
  }

  return mapScanRow(data as ScanRow);
}

export async function getScanRecordById(id: string): Promise<Scan | null> {
  if (!hasSupabaseServerConfig()) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("id, filename, status, confidence_score, plan_type")
    .eq("id", id)
    .maybeSingle();

  if (scanError) {
    throw new Error(scanError.message);
  }

  if (!scan) {
    return null;
  }

  const { data: risks, error: risksError } = await supabase
    .from("risks")
    .select("id, category, severity, clause_text, explanation, fix_message, confidence, risk_type, evidence_snippet, impact, suggested_rewrite, detection_method, clause_id, page_number, section_title")
    .eq("scan_id", id)
    .order("created_at", { ascending: true });

  if (risksError) {
    throw new Error(risksError.message);
  }

  return mapScanRow(scan as ScanRow, (risks ?? []) as RiskRow[]);
}
