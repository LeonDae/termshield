import { NextResponse } from "next/server";
import { z } from "zod";

import { createRazorpayOrder } from "@/lib/razorpay";
import { createSupabaseServerClient } from "@/lib/supabase";

const createOrderSchema = z.object({
  planType: z.enum(["basic", "premium"]),
  scanId: z.string().uuid("Invalid scan ID."),
});

/**
 * POST /api/payment/create
 *
 * Creates a Razorpay order for the selected plan.
 * The frontend uses the returned order ID to open the Razorpay checkout modal.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planType, scanId } = createOrderSchema.parse(body);

    // Verify the scan exists and is pending
    const supabase = createSupabaseServerClient();
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("id, status")
      .eq("id", scanId)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { message: "Scan not found." },
        { status: 404 }
      );
    }

    if (scan.status !== "pending") {
      return NextResponse.json(
        { message: `Scan is already ${scan.status}. Cannot create a new payment.` },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const order = await createRazorpayOrder(planType, scanId);

    // Insert a pending payment record
    await supabase.from("payments").insert({
      scan_id: scanId,
      amount_paise: order.amount,
      currency: order.currency,
      provider: "razorpay",
      provider_id: order.id,
      status: "pending",
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    console.error("Payment creation failed:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create payment order.",
      },
      { status: 500 }
    );
  }
}
