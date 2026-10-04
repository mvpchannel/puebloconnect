import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, WebhookVerificationError, type CheckoutSession } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";
import { markTransactionFailed } from "@/lib/db";

export const runtime = "nodejs"; // needs node:crypto's createHmac + node:sqlite

// POST /api/stripe/webhook — Stripe calls this directly, not the browser.
//
// This is the AUTHORITATIVE path that activates a paid membership. Unlike
// the success-page redirect (which the buyer's browser controls and could
// in principle never hit — closed tab, network drop, etc.), Stripe
// guarantees webhook delivery with retries, so this is what production
// correctness actually rests on. The success page's own reconciliation
// check (src/app/api/stripe/checkout/[sessionId]/confirm) exists only so
// testing works immediately, before webhook forwarding is configured.
//
// Must read the RAW request body — NOT req.json() — because signature
// verification is computed over the exact bytes Stripe sent.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    const message = err instanceof WebhookVerificationError ? err.message : "Invalid webhook.";
    // 400, not 401/403 — Stripe's own guidance: return 4xx so a genuinely
    // malformed/misdirected request isn't retried forever, while a real
    // signature failure is logged for investigation, not silently accepted.
    console.error("Stripe webhook rejected:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as unknown as CheckoutSession;
      const result = fulfillCheckoutSession(session);
      if (result.status === "failed") {
        console.error(`Stripe webhook: session ${session.id} failed verification: ${result.reason}`);
      }
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as unknown as CheckoutSession;
      markTransactionFailed(session.id);
      break;
    }
    default:
      // Every other event type is ignored on purpose — this endpoint only
      // needs to know when a Checkout Session resolves either way.
      break;
  }

  // Always 200 once the signature verifies and we've handled (or
  // deliberately ignored) the event type — a non-2xx here makes Stripe
  // keep retrying an event we already processed.
  return NextResponse.json({ received: true });
}
