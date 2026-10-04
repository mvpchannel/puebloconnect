import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { retrieveCheckoutSession } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/stripe-fulfillment";
import { getTransactionBySessionId } from "@/lib/db";

export const runtime = "nodejs"; // needs node:sqlite

// GET /api/stripe/checkout/:sessionId/confirm
//
// Called by the success page right after Stripe redirects the buyer back.
// This is NOT the source of truth (the webhook is — see that route's
// comment) but a same-request fallback: it re-fetches the session directly
// from Stripe and runs it through the exact same verify-then-activate
// logic, so the UI can show "active" immediately instead of telling a
// buyer who just paid to "wait for an email." If the webhook already
// completed this transaction, this is a no-op read.
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const user = requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const { sessionId } = params;
  const transaction = getTransactionBySessionId(sessionId);
  if (!transaction) {
    return NextResponse.json({ error: "Unknown checkout session." }, { status: 404 });
  }
  if (transaction.user_id !== user.sub) {
    return NextResponse.json({ error: "This checkout session doesn't belong to you." }, { status: 403 });
  }

  if (transaction.status === "completed") {
    return NextResponse.json({ status: "completed", plan: transaction.plan });
  }

  let session;
  try {
    session = await retrieveCheckoutSession(sessionId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not reach Stripe." },
      { status: 502 }
    );
  }

  const result = fulfillCheckoutSession(session);

  if (result.status === "failed") {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }
  if (result.status === "unknown_session") {
    return NextResponse.json({ error: "Unknown checkout session." }, { status: 404 });
  }
  if (result.status === "pending") {
    return NextResponse.json({ status: "pending" });
  }
  return NextResponse.json({ status: "completed", plan: result.plan });
}
