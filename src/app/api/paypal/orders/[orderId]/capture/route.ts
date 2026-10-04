import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { capturePayPalOrder } from "@/lib/paypal";
import {
  getTransactionByOrderId,
  markTransactionCompleted,
  markTransactionFailed,
  activateMembership,
} from "@/lib/db";
import { PLANS } from "@/lib/plans";

// POST /api/paypal/orders/:orderId/capture
//
// Real verification, not a trust-the-client "mark it paid" endpoint:
// 1. The order must exist in OUR database, created by the logged-in user
//    making this request (not just any order ID someone could guess).
// 2. PayPal's own capture response must say COMPLETED.
// 3. The amount PayPal actually captured must match what we recorded when
//    the order was created (which itself came only from src/lib/plans.ts,
//    never the client) — if those ever disagree, something is wrong and
//    the membership is NOT activated.
// Only after all three hold does a membership get activated.
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const session = requireUser(req);
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const { orderId } = params;
  const transaction = getTransactionByOrderId(orderId);
  if (!transaction) {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }
  if (transaction.user_id !== session.sub) {
    return NextResponse.json({ error: "This order doesn't belong to you." }, { status: 403 });
  }

  // Idempotent: if we already recorded this as completed (e.g. the client
  // retried after a slow response), don't call PayPal again — just
  // confirm the already-active membership.
  if (transaction.status === "completed") {
    return NextResponse.json({ status: "completed", plan: transaction.plan });
  }

  let captured;
  try {
    captured = await capturePayPalOrder(orderId);
  } catch (err) {
    markTransactionFailed(orderId);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal capture failed." },
      { status: 502 }
    );
  }

  const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];

  if (captured.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
    markTransactionFailed(orderId);
    return NextResponse.json(
      { error: `Payment was not completed (status: ${captured.status}).` },
      { status: 402 }
    );
  }

  // Defense in depth: confirm PayPal actually captured the amount we
  // expect for this plan, in case the recorded transaction and the live
  // PayPal order ever disagree (e.g. tampering, a bug, a stale record).
  const expected = PLANS[transaction.plan].priceCents;
  const capturedCents = Math.round(parseFloat(capture.amount.value) * 100);
  if (capturedCents !== expected || capture.amount.currency_code !== transaction.currency) {
    markTransactionFailed(orderId);
    return NextResponse.json(
      { error: "Captured amount did not match the expected plan price." },
      { status: 500 }
    );
  }

  markTransactionCompleted(orderId);
  const membership = activateMembership(transaction.user_id, transaction.plan);

  return NextResponse.json({ status: "completed", plan: membership.plan });
}
