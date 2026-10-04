"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Stripe redirects here with ?session_id={CHECKOUT_SESSION_ID} after a
 * successful Checkout. This page is a CONVENIENCE check, not the source of
 * truth: it asks our own server (/api/stripe/checkout/:id/confirm) to
 * re-verify the session with Stripe and activate the membership if that
 * hasn't happened yet. The webhook (src/app/api/stripe/webhook/route.ts)
 * is what production correctness actually depends on — this just means a
 * buyer doesn't have to wait on webhook delivery to see "active" if they
 * land here first.
 */
export default function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "completed"; plan: string }
    | { kind: "pending" }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    if (!sessionId) {
      setState({ kind: "error", message: "Missing checkout session." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stripe/checkout/${encodeURIComponent(sessionId)}/confirm`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error", message: data.error || "Could not confirm payment." });
        } else if (data.status === "completed") {
          setState({ kind: "completed", plan: data.plan });
        } else {
          setState({ kind: "pending" });
        }
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Network error confirming payment." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state.kind === "loading") {
    return (
      <div className="checkout-result success">
        <h1>Confirming your payment…</h1>
        <p>One moment while we verify this with Stripe.</p>
      </div>
    );
  }

  if (state.kind === "completed") {
    const plan = state.plan[0].toUpperCase() + state.plan.slice(1);
    return (
      <div className="checkout-result success">
        <div className="result-icon">✓</div>
        <h1>Payment successful</h1>
        <p>
          Your <strong>{plan}</strong> membership is now active. Thanks for
          supporting Pueblo Connect.
        </p>
        <Link href="/membership" className="mtr-btn signin">
          <span>View membership</span>
        </Link>
      </div>
    );
  }

  if (state.kind === "pending") {
    return (
      <div className="checkout-result success">
        <h1>Payment still processing</h1>
        <p>
          Stripe hasn&rsquo;t confirmed this payment yet (this can happen with
          some payment methods). We&rsquo;ll activate your membership
          automatically as soon as it clears — no action needed.
        </p>
        <Link href="/membership" className="mtr-btn signin">
          <span>Check membership status</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-result error">
      <div className="result-icon">!</div>
      <h1>Couldn&rsquo;t confirm payment</h1>
      <p>{state.message} If you were charged, contact us and we&rsquo;ll sort it out.</p>
      <Link href="/membership" className="mtr-btn signin">
        <span>Back to plans</span>
      </Link>
    </div>
  );
}
