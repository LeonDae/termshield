import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createScanInputSchema,
  createScanRecord,
  getScanSetupMessage,
} from "@/lib/scans";
import { extractTextFromPDF } from "@/lib/pdf";
import { runLLMPipeline } from "@/lib/pipeline";
import { createSupabaseServerClient } from "@/lib/supabase";

/**
 * POST /api/scan/upload
 *
 * Accepts either:
 *   - A multipart/form-data body with a PDF file + planType
 *   - A JSON body with { contractText, planType, filename? }
 *
 * Creates a scan record in Supabase and returns it immediately.
 * The heavy LLM processing pipeline runs in the background
 * (fire-and-forget) so the response is fast and won't hit
 * serverless function timeouts.
 */

// Allow up to 60s for PDF extraction + scan record creation.
// The actual LLM pipeline is fire-and-forget and runs via /api/scan/process.
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    let contractText: string;
    let filename: string | undefined;
    let planType: "basic" | "premium";

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // ---------- PDF upload flow ----------
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      planType = (formData.get("planType") as string) === "premium"
        ? "premium"
        : "basic";

      if (!file) {
        return NextResponse.json(
          { message: "No file uploaded." },
          { status: 400 }
        );
      }

      filename = file.name;

      // Convert file to Buffer and extract text
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log("PDF Upload received. File name:", filename, "Buffer length:", buffer.length);
      contractText = await extractTextFromPDF(buffer);
    } else {
      // ---------- JSON / paste text flow ----------
      const body = await request.json();
      contractText = body.contractText;
      filename = body.filename;
      planType = body.planType;
    }

    // Validate with Zod
    const input = createScanInputSchema.parse({
      contractText,
      filename,
      planType,
    });

    // Try to get authenticated user
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    let userId: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token) {
        try {
          const supabase = createSupabaseServerClient();
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            userId = user.id;
          }
        } catch (err) {
          console.error("Auth token verification failed in scan upload API:", err);
        }
      }
    }

    // Create the scan record in Supabase (status: pending)
    const scan = await createScanRecord(input, userId);

    // ── Trigger the LLM pipeline ──
    // In development: await the pipeline directly since Next.js dev server
    // terminates background promises when the response goes out.
    // In production (Vercel): fire-and-forget fetch to /api/scan/process
    // so the upload route returns quickly and avoids serverless timeouts.
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      // Dev mode: await inline (background promises get killed on response)
      try {
        await runLLMPipeline(scan.id, input.contractText);
      } catch (err) {
        console.error("Failed to execute scan processing pipeline:", err);
      }
    } else {
      // Production: fire-and-forget call to the process endpoint
      const vercelUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL !== "http://localhost:3000"
        ? process.env.NEXT_PUBLIC_APP_URL
        : vercelUrl || "http://localhost:3000";

      fetch(`${appUrl}/api/scan/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET ? { "x-cron-secret": process.env.CRON_SECRET } : {}),
        },
        body: JSON.stringify({
          scanId: scan.id,
          contractText: input.contractText,
        }),
      }).catch((err) => {
        console.error("Failed to trigger scan processing endpoint:", err);
      });
    }

    return NextResponse.json({
      message: "Scan created. Processing will begin shortly.",
      scan,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid scan request." },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const status = error.message === getScanSetupMessage() ? 503 : 400;
      return NextResponse.json({ message: error.message }, { status });
    }

    return NextResponse.json(
      { message: "Unable to create the scan record." },
      { status: 500 }
    );
  }
}
