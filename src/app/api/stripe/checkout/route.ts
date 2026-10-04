import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { isPlanId, PLANS } from "@/lib/plans";
import { createCheckoutSession, verifyConfiguredAccount } from "@/lib/stripe";
import { recordCheckoutSessionCreated } from "@/lib/db";

export const runtime = "nodejs"; // needs node:sqlite via @/lib/db

// POST /api/stripe/checkout — body: { plan: "basic" | "plus" | "premier" }
//
// This is the ONLY place that decides how much a plan costs. The client
// sends a plan ID, never an amount — even if a tampered client sent
// { plan: "premier", amount: "1.00" }, that field is ignored; the price is
// always looked up server-side from src/lib/plans.ts and used to build the
// Checkout Session's own line item, so there's nothing for the browser to
// override before the buyer reaches Stripe's hosted payment page.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) {
    return NextResponse.json(
      { error: "You must be logged in to purchase a membership." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { plan } = (body ?? {}) as Record<string, unknown>;
  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const planConfig = PLANS[plan];
  const origin = req.nextUrl.origin;

  try {
    await verifyConfiguredAccount();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe account mismatch." },
      { status: 500 }
    );
  }

  let checkoutSession;
  try {
    checkoutSession = await createCheckoutSession({
      planId: plan,
      planName: planConfig.name,
      amountCents: planConfig.priceCents,
      currency: "usd",
      userId: session.sub,
      successUrl: `${origin}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/membership/cancel`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create Stripe Checkout Session." },
      { status: 502 }
    );
  }

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  recordCheckoutSessionCreated(
    checkoutSession.id,
    session.sub,
    plan,
    planConfig.priceCents,
    "usd"
  );

  return NextResponse.json({ url: checkoutSession.url });
}
