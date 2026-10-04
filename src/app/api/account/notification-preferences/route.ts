import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getUserById, updateUserNotificationPreferences } from "@/lib/db";

// GET/POST /api/account/notification-preferences — the backend half of
// "notification preferences separating security emails from marketing
// preferences" (see src/lib/email.ts header comment). Security/account
// email (verification, password reset, password-changed) is never
// optional and is not controlled by this at all — this only ever gates
// the marketing_emails_opt_in column, which starts OFF for every member
// and is never flipped on without the member doing it here themselves.
//
// There is deliberately no dedicated settings PAGE wired to this yet
// (see the existing honest "edit profile / account setting" placeholders
// in src/components/Header.tsx) — this route exists so that work, when
// it happens, has a real API to call rather than inventing one then too.
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const user = getUserById(session.sub);
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  return NextResponse.json({
    marketingEmailsOptIn: Boolean(user.marketing_emails_opt_in),
  });
}

export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { marketingEmailsOptIn } = (body ?? {}) as Record<string, unknown>;
  if (typeof marketingEmailsOptIn !== "boolean") {
    return NextResponse.json({ error: "marketingEmailsOptIn must be a boolean." }, { status: 400 });
  }

  updateUserNotificationPreferences(session.sub, marketingEmailsOptIn);
  return NextResponse.json({ ok: true, marketingEmailsOptIn });
}
