import "server-only";

import { z } from "zod";

import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase";
import type { Risk, Scan } from "@/types";

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
};

export function getScanSetupMessage() {
  return "Configure Supabase in .env.local before creating live scans. The code is wired, but the database connection is intentionally external to the app.";
}

function mapRiskRow(row: RiskRow): Risk {
  return {
    id: row.id,
    category: row.category,
    severity: row.severity,
    clauseText: row.clause_text ?? "",
    explanation: row.explanation ?? "",
    fixMessage: row.fix_message ?? undefined,
    confidence: row.confidence ?? undefined,
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
    .select("id, category, severity, clause_text, explanation, fix_message, confidence")
    .eq("scan_id", id)
    .order("created_at", { ascending: true });

  if (risksError) {
    throw new Error(risksError.message);
  }

  return mapScanRow(scan as ScanRow, (risks ?? []) as RiskRow[]);
}
