// Shared "a Checkout Session says it's paid — now what" logic, used by
// BOTH the webhook handler (the authoritative, production path) and the
// success-page reconciliation route (a same-request fallback so testing
// doesn't require webhook delivery to be set up first — see README). Both
// callers funnel through here so there's exactly one place that verifies
// an amount and activates a membership, not two copies that could drift.

import type { CheckoutSession } from "@/lib/stripe";
import {
  getTransactionBySessionId,
  markTransactionCompleted,
  markTransactionFailed,
  activateMembership,
  type PlanId,
} from "@/lib/db";
import { PLANS, isPlanId } from "@/lib/plans";

export type FulfillmentResult =
  | { status: "completed"; plan: PlanId }
  | { status: "pending" }
  | { status: "failed"; reason: string }
  | { status: "unknown_session" };

export function fulfillCheckoutSession(session: CheckoutSession): FulfillmentResult {
  const transaction = getTransactionBySessionId(session.id);
  if (!transaction) {
    // A session we never recorded (e.g. created outside this flow). Never
    // trust metadata alone to activate something we have no record of.
    return { status: "unknown_session" };
  }

  // Idempotent: webhook and success-page reconciliation can both fire for
  // the same session — only the first one does anything.
  if (transaction.status === "completed") {
    return { status: "completed", plan: transaction.plan };
  }

  if (session.payment_status !== "paid") {
    return { status: "pending" };
  }

  const planFromMetadata = session.metadata?.plan;
  if (!isPlanId(planFromMetadata) || planFromMetadata !== transaction.plan) {
    markTransactionFailed(session.id);
    return { status: "failed", reason: "Plan mismatch between Stripe session and our record." };
  }

  // Defense in depth: confirm Stripe actually collected the amount we
  // expect for this plan (the same amount we told Stripe to charge when
  // creating the session — see src/lib/plans.ts), in case the recorded
  // transaction and the live Stripe session ever disagree.
  const expectedCents = PLANS[transaction.plan].priceCents;
  if (
    session.amount_total !== expectedCents ||
    (session.currency ?? "").toLowerCase() !== transaction.currency.toLowerCase()
  ) {
    markTransactionFailed(session.id);
    return { status: "failed", reason: "Paid amount did not match the expected plan price." };
  }

  markTransactionCompleted(session.id, session.payment_intent);
  const membership = activateMembership(transaction.user_id, transaction.plan);
  return { status: "completed", plan: membership.plan };
}
