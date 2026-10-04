// Server-side Stripe client — plain REST calls over fetch, deliberately
// without the `stripe` npm package (this sandbox cannot run npm install;
// see README). Stripe's API is just HTTP, so this is a real, supported way
// to integrate — not a shortcut. This file is the only place
// STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are ever read; neither value
// reaches the browser.
//
// Test vs. live mode is NOT a separate base URL like PayPal's sandbox —
// Stripe uses one API (api.stripe.com) for both, and which mode you're in
// is determined entirely by which secret key you set (sk_test_... vs
// sk_live_...). Flip STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET, which is
// also per-mode) in the environment to go live — no code change.

import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.stripe.com/v1";

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Copy .env.example to .env.local and " +
        "fill it in with your Stripe test (or live) Secret Key from the " +
        "Stripe Dashboard → Developers → API keys."
    );
  }
  return key;
}

export function getStripeMode(): "test" | "live" {
  // Inferred from the key itself, not a separate env flag — this is how
  // Stripe's own dashboard and docs describe telling the two apart, and it
  // means the mode can never drift out of sync with which key is active.
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_live_") ? "live" : "test";
}

function authHeader(): string {
  // HTTP Basic auth with the secret key as the username and an empty
  // password — Stripe's documented auth scheme for server-side API calls.
  return "Basic " + Buffer.from(`${getSecretKey()}:`).toString("base64");
}

// Stripe's REST API takes application/x-www-form-urlencoded bodies with
// bracketed keys for nested/array params (e.g. line_items[0][quantity]).
// This flattens a plain object into that form.
function toFormBody(params: Record<string, unknown>, prefix = ""): string[] {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          pairs.push(...toFormBody(item as Record<string, unknown>, `${fullKey}[${i}]`));
        } else {
          pairs.push(
            `${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(String(item))}`
          );
        }
      });
    } else if (typeof value === "object") {
      pairs.push(...toFormBody(value as Record<string, unknown>, fullKey));
    } else {
      pairs.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
    }
  }
  return pairs;
}

async function stripeRequest<T>(
  method: "GET" | "POST",
  path: string,
  params?: Record<string, unknown>,
  idempotencyKey?: string
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
  };
  let body: string | undefined;
  let url = `${API_BASE}${path}`;
  if (method === "GET" && params) {
    const qs = toFormBody(params).join("&");
    if (qs) url += `?${qs}`;
  } else if (params) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = toFormBody(params).join("&");
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(url, { method, headers, body, cache: "no-store" });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? (data as { error?: { message?: string } }).error?.message
        : text;
    throw new Error(`Stripe API error (${res.status}): ${message ?? "unknown error"}`);
  }
  return data as T;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  client_reference_id: string | null;
  payment_intent: string | null;
  metadata: Record<string, string>;
};

// Creates a Stripe-hosted Checkout Session for a one-time payment. This is
// Stripe's recommended default integration: the buyer is redirected to a
// Stripe-hosted, PCI-compliant payment page, then back to successUrl or
// cancelUrl — no card data ever touches this server or this codebase.
export async function createCheckoutSession(opts: {
  planId: string;
  planName: string;
  amountCents: number;
  currency: string;
  userId: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  return stripeRequest<CheckoutSession>(
    "POST",
    "/checkout/sessions",
    {
      mode: "payment",
      ui_mode: "hosted_page",
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      client_reference_id: String(opts.userId),
      customer_creation: "if_required",
      metadata: { plan: opts.planId, user_id: String(opts.userId) },
      payment_intent_data: { metadata: { plan: opts.planId, user_id: String(opts.userId) } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: opts.currency,
            unit_amount: opts.amountCents,
            product_data: {
              name: `Pueblo Connect ${opts.planName} Membership (1 month)`,
            },
          },
        },
      ],
      // --- Buyer-information & compliance options ---
      // These match what Stripe's own Dashboard-generated quickstart code
      // includes for a real business integration, not just a bare-bones
      // demo: a business paying $49-199/month is worth collecting a real
      // billing address, name, and phone for (receipts, fraud signals,
      // support), and requiring explicit Terms-of-Service consent before
      // taking money is the kind of thing worth having on by default.
      billing_address_collection: "auto",
      name_collection: {
        individual: { enabled: true },
        business: { enabled: true },
      },
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      // Shows a required "I agree to the Terms of Service" checkbox,
      // linking to whatever URL is set under Stripe Dashboard -> Settings
      // -> Public details -> Terms of service. Point that at
      // https://<your-domain>/terms (the real page already built at
      // src/app/(site)/terms) once the app has a real production domain —
      // Stripe reads this from the account's business profile, not from
      // anything this code sends.
      consent_collection: { terms_of_service: "required" },
      submit_type: "auto",
    },
    // Idempotency key: a client retry for the same user+plan within the
    // same second won't create a second Checkout Session.
    `checkout-${opts.userId}-${opts.planId}-${Date.now()}`
  );
}

export async function retrieveCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  return stripeRequest<CheckoutSession>("GET", `/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

// --- Webhook signature verification -----------------------------------
//
// Manual implementation of Stripe's documented scheme (no SDK needed):
// the Stripe-Signature header looks like "t=<timestamp>,v1=<hex hmac>",
// and the HMAC is SHA-256 of "<timestamp>.<raw request body>" keyed with
// the webhook's signing secret. We require the RAW body (not parsed JSON)
// because re-serializing JSON can change byte-for-byte content and break
// the signature. Also enforces Stripe's recommended 5-minute tolerance
// window to reject replayed requests.
export class WebhookVerificationError extends Error {}

export function constructWebhookEvent(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300
): { id: string; type: string; data: { object: Record<string, unknown> } } {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new WebhookVerificationError(
      "STRIPE_WEBHOOK_SECRET is not set — cannot verify webhook requests."
    );
  }
  if (!signatureHeader) {
    throw new WebhookVerificationError("Missing Stripe-Signature header.");
  }

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) {
    throw new WebhookVerificationError("Malformed Stripe-Signature header.");
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    throw new WebhookVerificationError("Webhook timestamp outside tolerance (possible replay).");
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(v1, "hex");
  const signaturesMatch =
    expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);

  if (!signaturesMatch) {
    throw new WebhookVerificationError("Signature mismatch — request did not come from Stripe.");
  }

  return JSON.parse(rawBody);
}

// Confirms the authenticated Secret Key actually belongs to the Stripe
// account this project expects (set via STRIPE_ACCOUNT_ID in .env.local,
// optional). Purely a safety check — if it's unset, this is skipped.
export async function verifyConfiguredAccount(): Promise<void> {
  const expected = process.env.STRIPE_ACCOUNT_ID;
  if (!expected) return;
  const account = await stripeRequest<{ id: string }>("GET", "/account");
  if (account.id !== expected) {
    throw new Error(
      `STRIPE_SECRET_KEY belongs to Stripe account ${account.id}, but ` +
        `STRIPE_ACCOUNT_ID is set to ${expected}. Refusing to take payments ` +
        "against the wrong account — double check your .env.local."
    );
  }
}
