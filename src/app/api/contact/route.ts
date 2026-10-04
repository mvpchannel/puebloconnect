import { NextRequest, NextResponse } from "next/server";
import { createContactMessage } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { sendTransactionalEmail, buildContactMessageEmail } from "@/lib/email";
import { checkAndRecordRateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

// POST /api/contact — backs src/app/(site)/contact/ContactForm.tsx, which
// previously just set local React state and told the visitor their
// message wasn't going anywhere. Works for a signed-out visitor (most
// real "contact us" forms don't require an account) as well as a member.
//
// Every submission is stored (createContactMessage — a real inbox table,
// queryable the moment an admin page is built for it) and also emailed
// to SITE_CONTACT_EMAIL so it's actually seen without anyone needing to
// check the database.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = checkAndRecordRateLimit(`contact:ip:${ip}`, RATE_LIMITS.contact);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many messages sent. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, phone, company, message } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanMessage = message.trim();
  const cleanPhone = typeof phone === "string" ? phone.trim() : "";
  const cleanCompany = typeof company === "string" ? company.trim() : "";

  if (!cleanName || cleanName.length > 100) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!cleanMessage || cleanMessage.length > 5000) {
    return NextResponse.json(
      { error: cleanMessage ? "Message is too long." : "Enter a message." },
      { status: 400 }
    );
  }

  const session = requireUser(req);

  const saved = createContactMessage({
    userId: session?.sub ?? null,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone || null,
    company: cleanCompany || null,
    message: cleanMessage,
  });

  // A failure to deliver the email must not be reported as the message
  // having failed to send — it's already saved in contact_messages —
  // same "store first, email is best-effort" pattern as registration's
  // verification email.
  const emailResult = await sendTransactionalEmail(
    "business_inquiry",
    buildContactMessageEmail(cleanName, cleanEmail, cleanPhone || null, cleanCompany || null, cleanMessage)
  );

  return NextResponse.json({ ok: true, id: saved.id, emailDelivered: emailResult.delivered });
}
