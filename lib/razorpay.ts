import crypto from "crypto";
import Razorpay from "razorpay";

export const BASIC_SCAN_AMOUNT_PAISE = 19900;   // ₹199
export const PREMIUM_SCAN_AMOUNT_PAISE = 49900;  // ₹499

export function getPlanAmount(plan: "basic" | "premium") {
  return plan === "premium" ? PREMIUM_SCAN_AMOUNT_PAISE : BASIC_SCAN_AMOUNT_PAISE;
}

/**
 * Returns a configured Razorpay instance.
 * Throws if the required env vars are missing.
 */
export function getRazorpayClient(): InstanceType<typeof Razorpay> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local."
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Creates a Razorpay order for the given plan and scan.
 */
export async function createRazorpayOrder(
  plan: "basic" | "premium",
  scanId: string
) {
  const razorpay = getRazorpayClient();
  const amount = getPlanAmount(plan);

  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: `scan_${scanId}`,
    notes: {
      scan_id: scanId,
      plan_type: plan,
    },
  });

  return order;
}

/**
 * Verifies the Razorpay payment signature using HMAC SHA256.
 * This is used on the client-side callback flow (not the webhook).
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error("RAZORPAY_KEY_SECRET is not set.");
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Verifies the Razorpay webhook signature.
 * Uses the webhook secret (different from the API key secret).
 */
export function verifyWebhookSignature(
  rawBody: string,
  webhookSignature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not set.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === webhookSignature;
}
