import { NextResponse } from "next/server";
import { getPublicClientId, getPayPalEnv } from "@/lib/paypal";

// GET /api/paypal/config — hands the browser what it needs to load the
// PayPal JS SDK v6: the Client ID (public by design — it identifies the
// app, it is not a secret) and which environment to use, which also
// decides which SDK script domain to load (sandbox vs. production). Both
// values come from server env vars, never hardcoded in any committed
// file — see .env.example.
export async function GET() {
  try {
    return NextResponse.json({
      clientId: getPublicClientId(),
      env: getPayPalEnv(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal is not configured." },
      { status: 503 }
    );
  }
}
