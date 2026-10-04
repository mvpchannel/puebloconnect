"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PayPalSdkInstance } from "@/types/paypal";

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
 * Loads the PayPal JS SDK v6 once, creates one SDK instance, and wires a
 * real "Pay with PayPal" button for each plan.
 *
 * STATUS: real. createOrder calls POST /api/paypal/orders (server decides
 * the price from src/lib/plans.ts — this component never sends an
 * amount); onApprove calls POST /api/paypal/orders/:id/capture, which
 * verifies the payment with PayPal directly before activating anything.
 * Nothing here marks a membership active on its own.
 *
 * This is a one-time Orders-API payment representing one month, not an
 * auto-renewing subscription — see the project README for why, and what
 * true auto-renewal would need (PayPal Subscriptions API) instead.
 */
export default function MembershipPlans({
  currentPlan,
}: {
  currentPlan: PlanId | null;
}) {
  const router = useRouter();
  const [sdkState, setSdkState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [env, setEnv] = useState<"sandbox" | "production" | null>(null);
  const instanceRef = useRef<PayPalSdkInstance | null>(null);
  const buttonRefs = useRef<Record<PlanId, HTMLDivElement | null>>({
    basic: null,
    plus: null,
    premier: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let config: { clientId: string; env: "sandbox" | "production" };
      try {
        const res = await fetch("/api/paypal/config");
        if (!res.ok) throw new Error("config unavailable");
        config = await res.json();
      } catch {
        if (!cancelled) setSdkState("unavailable");
        return;
      }
      if (cancelled) return;
      setEnv(config.env);

      const scriptSrc =
        config.env === "production"
          ? "https://www.paypal.com/web-sdk/v6/core"
          : "https://www.sandbox.paypal.com/web-sdk/v6/core";

      // Avoid injecting the script twice if this component remounts.
      let script = document.querySelector<HTMLScriptElement>(
        `script[data-paypal-sdk="v6"]`
      );
      if (!script) {
        script = document.createElement("script");
        script.src = scriptSrc;
        script.async = true;
        script.dataset.paypalSdk = "v6";
        document.head.appendChild(script);
      }

      const onLoaded = async () => {
        if (cancelled || !window.paypal) return;
        try {
          const instance = await window.paypal.createInstance({
            clientId: config.clientId,
            components: ["paypal-payments"],
            pageType: "checkout",
          });
          if (cancelled) return;
          instanceRef.current = instance;
          mountButtons(instance);
          setSdkState("ready");
        } catch {
          if (!cancelled) setSdkState("unavailable");
        }
      };

      if (window.paypal) {
        onLoaded();
      } else {
        script.addEventListener("load", onLoaded, { once: true });
        script.addEventListener(
          "error",
          () => !cancelled && setSdkState("unavailable"),
          { once: true }
        );
      }
    }

    function mountButtons(instance: PayPalSdkInstance) {
      for (const plan of PLAN_ORDER) {
        const container = buttonRefs.current[plan];
        if (!container) continue;
        container.innerHTML = "";

        const buttonEl = document.createElement("paypal-button");
        buttonEl.setAttribute("type", "pay");
        container.appendChild(buttonEl);

        const session = instance.createPayPalOneTimePaymentSession({
          onApprove: async ({ orderId }) => {
            try {
              const res = await fetch(`/api/paypal/orders/${orderId}/capture`, {
                method: "POST",
              });
              const data = await res.json();
              if (!res.ok) {
                router.push(`/membership/error?reason=${encodeURIComponent(data.error || "capture_failed")}`);
                return;
              }
              router.push(`/membership/success?plan=${data.plan}`);
            } catch {
              router.push("/membership/error?reason=network");
            }
          },
          onCancel: () => {
            router.push("/membership/cancel");
          },
          onError: (error) => {
            router.push(`/membership/error?reason=${encodeURIComponent(error.message || "unknown")}`);
          },
        });

        buttonEl.addEventListener("click", async () => {
          await session.start({ presentationMode: "auto" }, createOrder(plan));
        });
      }
    }

    async function createOrder(plan: PlanId): Promise<{ orderId: string }> {
      const res = await fetch("/api/paypal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout.");
      return { orderId: data.orderId };
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                <div
                  className="paypal-slot"
                  data-state={sdkState}
                  ref={(el) => {
                    buttonRefs.current[plan] = el;
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {env === "sandbox" && (
        <p className="plan-sdk-env-note sandbox">
          PayPal Sandbox mode — test payments only, no real money moves. Switch
          PAYPAL_ENV to "production" (with live credentials) to accept real
          payments.
        </p>
      )}
    </div>
  );
}
