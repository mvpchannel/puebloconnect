// Server-side PayPal client — Orders v2 REST API. This file is the only
// place the PayPal Client Secret is ever read or used; it never reaches
// the browser.
//
// Sandbox vs. production is controlled entirely by the PAYPAL_ENV
// environment variable (default: "sandbox"), which also decides which
// REST API base URL this file talks to and which SDK script domain the
// client loads (see src/app/api/paypal/config/route.ts). Flip one env
// var to go live — no code change.

const PAYPAL_ENV = process.env.PAYPAL_ENV === "production" ? "production" : "sandbox";

const API_BASE =
  PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set. Copy .env.example to " +
        ".env.local and fill them in with your PayPal Sandbox (or live) app " +
        "credentials from the PayPal Developer Dashboard."
    );
  }
  return { clientId, clientSecret };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10_000) {
    return cachedToken.value;
  }
  const { clientId, clientSecret } = getCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PayPal OAuth token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export type CreatedOrder = { id: string; status: string };

export async function createPayPalOrder(
  description: string,
  amountValue: string,
  currencyCode: string,
  referenceId: string
): Promise<CreatedOrder> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // Idempotency key: a retried request with the same key won't double-create
      // an order. Good enough uniqueness for this: referenceId + a timestamp
      // bucket isn't needed since each call here originates one user action.
      "PayPal-Request-Id": `${referenceId}-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          description,
          amount: { currency_code: currencyCode, value: amountValue },
        },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PayPal create-order failed (${res.status}): ${text}`);
  }

  return (await res.json()) as CreatedOrder;
}

export type CapturedOrder = {
  id: string;
  status: string;
  purchase_units: {
    reference_id?: string;
    payments?: {
      captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[];
    };
  }[];
};

export async function capturePayPalOrder(orderId: string): Promise<CapturedOrder> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PayPal capture-order failed (${res.status}): ${text}`);
  }

  return (await res.json()) as CapturedOrder;
}

export function getPayPalEnv(): "sandbox" | "production" {
  return PAYPAL_ENV;
}

// Public (non-secret) — safe to send to the browser. The Client ID
// identifies the PayPal app, it is not a credential; PayPal's own JS SDK
// is designed to receive it client-side. Still read from env, never
// literally written into a committed file, so switching sandbox/live
// accounts is a config change, not a code change.
export function getPublicClientId(): string {
  const { clientId } = getCredentials();
  return clientId;
}
