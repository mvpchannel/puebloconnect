import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { isPlanId, PLANS, formatCents } from "@/lib/plans";
import { createPayPalOrder } from "@/lib/paypal";
import { recordOrderCreated } from "@/lib/db";

// POST /api/paypal/orders — body: { plan: "basic" | "plus" | "premier" }
//
// This is the ONLY place that decides how much a plan costs. The client
// sends a plan ID, never an amount — even if a tampered client sent
// { plan: "premier", amount: "1.00" }, that amount field is ignored here;
// the price is always looked up server-side from src/lib/plans.ts.
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to purchase a membership." }, { status: 401 });
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

  let order;
  try {
    order = await createPayPalOrder(
      `Pueblo Connect ${planConfig.name} Membership (1 month)`,
      formatCents(planConfig.priceCents),
      "USD",
      `${plan}-${session.sub}`
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create PayPal order." },
      { status: 502 }
    );
  }

  recordOrderCreated(order.id, session.sub, plan, planConfig.priceCents, "USD");

  return NextResponse.json({ orderId: order.id });
}
