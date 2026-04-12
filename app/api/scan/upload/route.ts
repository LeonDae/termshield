import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createScanInputSchema,
  createScanRecord,
  getScanSetupMessage,
} from "@/lib/scans";
import { extractTextFromPDF } from "@/lib/pdf";
import { runLLMPipeline } from "@/lib/pipeline";

/**
 * POST /api/scan/upload
 *
 * Accepts either:
 *   - A multipart/form-data body with a PDF file + planType
 *   - A JSON body with { contractText, planType, filename? }
 *
 * Creates a scan record in Supabase and triggers the LLM processing
 * endpoint asynchronously (fire-and-forget).
 */
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

    // Create the scan record in Supabase (status: pending)
    const scan = await createScanRecord(input);

    // We must await this pipeline locally because Next.js dev server terminates background
    // promises as soon as the HTTP response goes out!
    try {
      await runLLMPipeline(scan.id, input.contractText);
    } catch (err) {
      console.error("Failed to execute scan processing pipeline:", err);
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
