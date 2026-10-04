// Authoritative, server-side plan prices. This is the ONLY place a dollar
// amount for a membership plan is allowed to live. The client sends a
// plan ID ("basic" | "plus" | "premier") and NEVER an amount — every
// server route that charges money looks the price up here, ignoring
// anything the browser might have sent. See src/app/api/stripe/checkout/route.ts.

import type { PlanId } from "@/lib/db";

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number;
  priceLabel: string;
  tagline: string;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: "basic",
    name: "Basic",
    priceCents: 4900,
    priceLabel: "$49/month",
    tagline: "Get your business on Pueblo Connect.",
    features: ["Business profile", "Directory listing", "Business posts"],
  },
  plus: {
    id: "plus",
    name: "Plus",
    priceCents: 9900,
    priceLabel: "$99/month",
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
    id: "premier",
    name: "Premier",
    priceCents: 19900,
    priceLabel: "$199/month",
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

export const PLAN_IDS: PlanId[] = ["basic", "plus", "premier"];

export function isPlanId(value: unknown): value is PlanId {
  return value === "basic" || value === "plus" || value === "premier";
}

export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
