"use client";

import { useState } from "react";

type PlanId = "basic" | "plus" | "premier";

const PLAN_DISPLAY: Record<
  PlanId,
  { name: string; price: string; tagline: string; features: string[] }
> = {
  basic: {
    name: "Basic",
    price: "$49",
    tagline: "Get your business on Pueblo Connect.",
    features: ["Business profile", "Directory listing", "Business posts"],
  },
  plus: {
    name: "Plus",
    price: "$99",
    tagline: "Everything in Basic, with more visibility.",
    features: [
      "Everything in Basic",
      "Deals & coupons",
      "Events",
      "Enhanced directory placement",
      "1 sponsored post each month",
    ],
  },
  premier: {
    name: "Premier",
    price: "$199",
    tagline: "Maximum visibility and priority promotion.",
    features: [
      "Everything in Plus",
      "Featured business placement",
      "2 sponsored posts per month",
      "Priority promotion",
      "Monthly performance report",
    ],
  },
};

const PLAN_ORDER: PlanId[] = ["basic", "plus", "premier"];

/**
 * STATUS: real. Clicking "Subscribe" calls POST /api/stripe/checkout
 * (server decides the price from src/lib/plans.ts — this component never
 * sends an amount) and redirects the browser to Stripe's own hosted
 * Checkout page. Stripe handles all card entry; no payment UI or card data
 * ever touches this codebase. After payment, Stripe redirects back to
 * /membership/success, which verifies the payment server-side before
 * showing "active" — see that page and src/app/api/stripe/webhook/route.ts
 * for the actual activation logic. Nothing here marks a membership active
 * on its own.
 *
 * This is a one-time payment representing one month, not an auto-renewing
 * subscription — see the project README for why, and what true
 * auto-renewal would need (Stripe Billing) instead.
 */
export default function MembershipPlans({
  currentPlan,
}: {
  currentPlan: PlanId | null;
}) {
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(plan: PlanId) {
    setError(null);
    setPendingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout.");
        setPendingPlan(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again.");
      setPendingPlan(null);
    }
  }

  return (
    <div>
      <div className="plan-grid">
        {PLAN_ORDER.map((plan) => {
          const p = PLAN_DISPLAY[plan];
          const isCurrent = currentPlan === plan;
          return (
            <div key={plan} className={`plan-card${plan === "plus" ? " featured" : ""}`}>
              <h3>{p.name}</h3>
              <div className="plan-price">
                {p.price} <span>/ month</span>
              </div>
              <div className="plan-tagline">{p.tagline}</div>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="current-plan-badge">Your current plan</span>
              ) : (
                <button
                  type="button"
                  className="plan-subscribe-btn"
                  disabled={pendingPlan !== null}
                  onClick={() => handleSubscribe(plan)}
                >
                  {pendingPlan === plan ? "Redirecting to Stripe…" : "Subscribe"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="plan-sdk-env-note error">{error}</p>}
      <p className="plan-sdk-env-note">
        Payment is handled entirely by Stripe&rsquo;s own secure checkout page —
        your card details never pass through Pueblo Connect.
      </p>
    </div>
  );
}
