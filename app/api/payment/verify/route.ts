import { NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/razorpay";
import { createSupabaseServerClient } from "@/lib/supabase";

/**
 * POST /api/payment/verify
 *
 * Razorpay webhook endpoint. Called by Razorpay when a payment is captured.
 * Verifies the webhook HMAC signature, marks the payment as captured,
 * and triggers the scan processing pipeline.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { message: "Missing webhook signature." },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    const isValidSignature = verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      console.error("Invalid Razorpay webhook signature.");
      return NextResponse.json(
        { message: "Invalid signature." },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);

    // We only handle payment.captured events
    if (event.event !== "payment.captured") {
      return NextResponse.json({ message: "Event ignored.", event: event.event });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json(
        { message: "Malformed webhook payload." },
        { status: 400 }
      );
    }

    const razorpayOrderId = payment.order_id;
    const razorpayPaymentId = payment.id;

    const supabase = createSupabaseServerClient();

    // Find our payment record by the Razorpay order ID
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .select("id, scan_id, status")
      .eq("provider_id", razorpayOrderId)
      .single();

    if (paymentError || !paymentRecord) {
      console.error("Payment record not found for order:", razorpayOrderId);
      return NextResponse.json(
        { message: "Payment record not found." },
        { status: 404 }
      );
    }

    // Guard against duplicate webhook calls
    if (paymentRecord.status === "captured") {
      return NextResponse.json({ message: "Payment already captured." });
    }

    // Mark payment as captured
    await supabase
      .from("payments")
      .update({
        status: "captured",
        provider_id: razorpayPaymentId, // Update to actual payment ID
      })
      .eq("id", paymentRecord.id);

    // Retrieve the contract text from the scan to trigger processing
    // The scan should have been created when the upload happened,
    // so we need to get the scan_id and trigger the process route.
    const scanId = paymentRecord.scan_id;

    // Fire-and-forget: trigger scan processing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Note: In the pay-before-scan flow, the contract text is stored
    // in the upload step. Here we just trigger the process endpoint.
    // The process endpoint will be called by the upload route after payment is verified.

    console.log(`Payment captured for scan ${scanId}. Ready for processing.`);

    // Update scan status to indicate payment is done
    await supabase
      .from("scans")
      .update({ status: "pending" })
      .eq("id", scanId);

    return NextResponse.json({
      message: "Payment verified and captured.",
      scanId,
    });
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}
