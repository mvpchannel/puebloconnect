// Reusable Pueblo Connect email system — ONE place that knows how to send
// mail, instead of ad-hoc fetch/SMTP calls scattered through API routes.
//
// TRANSPORT
// ---------
// Real sending uses Resend's plain HTTP API (https://api.resend.com) via
// `fetch` — no SDK/npm package required, same pattern already used for
// Stripe in src/lib/stripe.ts. Resend was picked because:
//   - It's a single POST with a JSON body (easiest to self-host/no-SDK).
//   - It documents SPF/DKIM/DMARC domain verification clearly (see the
//     README section this file's header points to).
//   - It has a generous free tier appropriate for a community site this
//     size, and a flat REST surface that doesn't lock this file into a
//     specific SDK.
// Swapping to SendGrid, Postmark, or anything else that takes a plain
// HTTPS POST means only rewriting `sendViaResend` below — every call site
// in this codebase goes through `sendTransactionalEmail`, never the
// transport directly.
//
// This sandbox's network egress allowlist blocks api.resend.com (verified
// by hand: a real fetch() to it returns "403 Host not in allowlist"), so
// real delivery cannot be exercised from inside this development
// environment. Once RESEND_API_KEY is set in a real deployment (where
// that host is reachable), this code sends real mail with no further
// changes.
//
// DEV FALLBACK
// ------------
// If RESEND_API_KEY is not set, emails are written to
// data/outbox/<timestamp>-<to>-<kind>.json and logged to the console
// instead of silently doing nothing or pretending to send. This is how
// the full registration → verify → login → forgot-password → reset flow
// was actually exercised and tested in this sandbox (see
// scripts/test-membership-flow.mjs) — it is clearly a development
// fallback, never mistaken for real delivery, and is skipped entirely
// once a real provider is configured.
//
// SECRETS
// -------
// RESEND_API_KEY is read from process.env only (server-side), never sent
// to the browser, never hardcoded. See .env.example.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  listPendingQueuedEmails,
  markQueuedEmailSent,
  markQueuedEmailFailed,
  type QueuedEmail,
} from "./db";

const FROM_NAME = "Pueblo Connect";
// Must be an address on a domain the sender has verified with the email
// provider (SPF/DKIM/DMARC) — see README "EMAIL PROVIDER/SMTP
// CONFIGURATION" section. Placeholder until the real Pueblo Connect
// sending domain is provided/confirmed.
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "no-reply@pueblo-connect.example";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Where a Contact Us submission is delivered (see buildContactMessageEmail
// below and /api/contact) — same address already shown to visitors on the
// Contact and About pages, so this isn't a new inbox being invented, just
// the real one the site already advertises.
export const SITE_CONTACT_EMAIL = "latenitegano@gmail.com";

export type EmailKind =
  | "welcome_verify"
  | "email_verified"
  | "password_reset"
  | "password_changed"
  | "account_deleted"
  | "friend_request"
  | "friend_accepted"
  | "new_message"
  | "report_status_update"
  | "business_inquiry";

// Still future, not implemented yet: new_comment, new_reply, mention,
// event_invite, event_reminder, pueblo_deal, pueblo_live,
// daily_pueblo_update. Adding one of those later means:
//   1. Add the kind to EmailKind above (and to QueuedEmailKind in db.ts
//      if it should go through the queue rather than send inline).
//   2. Add a template function below, same shape as the ones here.
//   3. If it's optional/marketing rather than security, check the
//      member's notification preference (see db.ts
//      updateUserNotificationPreferences) before calling sendTransactionalEmail
//      or enqueueEmail.
// Security/account mail (welcome_verify, email_verified, password_reset,
// password_changed) is never gated by a preference — members can't opt
// out of knowing their password changed. The three social kinds below ARE
// routed through the queue (see enqueueEmail/processEmailQueue at the
// bottom of this file) since nothing about them is time-critical enough
// to make an HTTP request wait on mail delivery.

type EmailMessage = { to: string; subject: string; html: string; text: string };

// Every other template below only ever interpolates trusted DB data
// (a member's own name). The Contact Us template is the first one that
// has to interpolate raw visitor-submitted text into HTML, so it needs
// this — otherwise a message containing "<" or "&" would corrupt the
// rendered email (not an XSS risk to the member reading it in their own
// mail client, but still real HTML breakage worth avoiding).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#1f6feb;padding:20px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;">Pueblo Connect</span>
          </td></tr>
          <tr><td style="padding:32px;color:#1f2430;font-size:15px;line-height:1.6;">
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f8f9fb;color:#6b7280;font-size:12px;">
            Connect Local. Shop Local. Grow Together.<br/>
            Pueblo Connect — Powered by The Daily Pueblo
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="text-align:center;margin:28px 0;">
    <a href="${href}" style="background:#1f6feb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;display:inline-block;">${label}</a>
  </p>`;
}

function welcomeVerifyTemplate(verifyUrl: string): EmailMessage["html"] & string {
  return wrapHtml(`
    <p style="font-size:18px;font-weight:bold;margin-top:0;">Welcome to Pueblo Connect!</p>
    <p>You're one step away from joining your local community online.</p>
    <p>Please verify your email address by clicking the button below.</p>
    ${button(verifyUrl, "VERIFY MY EMAIL")}
  `);
}

function passwordResetTemplate(resetUrl: string): string {
  return wrapHtml(`
    <p>We received a request to reset your Pueblo Connect password.</p>
    ${button(resetUrl, "RESET MY PASSWORD")}
    <p>If you didn't request this change, you can ignore this email.</p>
  `);
}

function passwordChangedTemplate(): string {
  return wrapHtml(`
    <p>Your Pueblo Connect password was successfully changed.</p>
    <p>If you made this change, no further action is required.</p>
    <p>If you did not make this change, contact Pueblo Connect immediately.</p>
  `);
}

function accountDeletedTemplate(): string {
  return wrapHtml(`
    <p>Your Pueblo Connect account has been deleted.</p>
    <p>Your profile, posts, comments, messages and other personal information were removed. Some records we are required to keep (such as payment records) no longer identify you.</p>
    <p>If you did not do this, contact Pueblo Connect right away.</p>
  `);
}

function emailVerifiedTemplate(): string {
  return wrapHtml(`
    <p style="font-size:18px;font-weight:bold;margin-top:0;">WELCOME TO PUEBLO CONNECT</p>
    <p>Your email has been verified. Your Pueblo Connect account is ready.</p>
  `);
}

export function buildVerificationEmail(to: string, rawToken: string): EmailMessage {
  const verifyUrl = `${APP_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  return {
    to,
    subject: "Verify Your Pueblo Connect Account",
    html: welcomeVerifyTemplate(verifyUrl),
    text:
      "Welcome to Pueblo Connect!\n\nYou're one step away from joining your local community online.\n\n" +
      `Verify your email: ${verifyUrl}\n\nConnect Local. Shop Local. Grow Together.\nPueblo Connect\nPowered by The Daily Pueblo`,
  };
}

export function buildEmailVerifiedEmail(to: string): EmailMessage {
  return {
    to,
    subject: "Your Pueblo Connect Email Is Verified",
    html: emailVerifiedTemplate(),
    text: "WELCOME TO PUEBLO CONNECT\n\nYour email has been verified. Your Pueblo Connect account is ready.",
  };
}

export function buildPasswordResetEmail(to: string, rawToken: string): EmailMessage {
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  return {
    to,
    subject: "Reset Your Pueblo Connect Password",
    html: passwordResetTemplate(resetUrl),
    text:
      "We received a request to reset your Pueblo Connect password.\n\n" +
      `Reset your password: ${resetUrl}\n\nIf you didn't request this change, you can ignore this email.`,
  };
}

export function buildPasswordChangedEmail(to: string): EmailMessage {
  return {
    to,
    subject: "Your Pueblo Connect Password Was Changed",
    html: passwordChangedTemplate(),
    text:
      "Your Pueblo Connect password was successfully changed.\n\n" +
      "If you made this change, no further action is required.\n" +
      "If you did not make this change, contact Pueblo Connect immediately.",
  };
}

export function buildAccountDeletedEmail(to: string): EmailMessage {
  return {
    to,
    subject: "Your Pueblo Connect Account Was Deleted",
    html: accountDeletedTemplate(),
    text:
      "Your Pueblo Connect account has been deleted.\n\n" +
      "Your profile, posts, comments, messages and other personal information were removed.\n" +
      "If you did not do this, contact Pueblo Connect right away.",
  };
}

function friendRequestTemplate(fromName: string, requestsUrl: string): string {
  return wrapHtml(`
    <p style="font-size:18px;font-weight:bold;margin-top:0;">New friend request</p>
    <p><strong>${fromName}</strong> sent you a friend request on Pueblo Connect.</p>
    ${button(requestsUrl, "VIEW FRIEND REQUESTS")}
  `);
}

function friendAcceptedTemplate(fromName: string, friendsUrl: string): string {
  return wrapHtml(`
    <p style="font-size:18px;font-weight:bold;margin-top:0;">Friend request accepted</p>
    <p><strong>${fromName}</strong> accepted your friend request.</p>
    ${button(friendsUrl, "VIEW FRIENDS")}
  `);
}

function newMessageTemplate(fromName: string, messagesUrl: string): string {
  return wrapHtml(`
    <p style="font-size:18px;font-weight:bold;margin-top:0;">New message</p>
    <p>You have a new message from <strong>${fromName}</strong>.</p>
    ${button(messagesUrl, "VIEW MESSAGE")}
  `);
}

const REPORT_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

function reportStatusUpdateTemplate(
  reportDescription: string,
  newStatus: string,
  note: string | null,
  reportUrl: string
): string {
  const label = REPORT_STATUS_LABELS[newStatus] || newStatus;
  return wrapHtml(`
    <p style="font-size:18px;font-weight:bold;margin-top:0;">Report update: ${label}</p>
    <p>A neighborhood report you're tracking — "<strong>${reportDescription}</strong>" — is now marked <strong>${label}</strong>.</p>
    ${note ? `<p style="color:#555;">${note}</p>` : ""}
    ${button(reportUrl, "VIEW REPORT")}
  `);
}

export function buildReportStatusUpdateEmail(
  to: string,
  reportId: number,
  reportDescription: string,
  newStatus: string,
  note: string | null
): EmailMessage {
  const reportUrl = `${APP_URL}/reports/${reportId}`;
  const label = REPORT_STATUS_LABELS[newStatus] || newStatus;
  return {
    to,
    subject: `Report update: ${label}`,
    html: reportStatusUpdateTemplate(reportDescription, newStatus, note, reportUrl),
    text:
      `A neighborhood report you're tracking — "${reportDescription}" — is now marked ${label}.\n\n` +
      (note ? `${note}\n\n` : "") +
      `View it: ${reportUrl}`,
  };
}

function contactMessageTemplate(name: string, email: string, phone: string | null, company: string | null, message: string): string {
  return wrapHtml(`
    <p style="font-size:18px;font-weight:bold;margin-top:0;">New Contact Us message</p>
    <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
    ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
    ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
    <p style="white-space:pre-wrap;border-top:1px solid #eee;padding-top:16px;margin-top:16px;">${escapeHtml(message)}</p>
  `);
}

// Delivered to SITE_CONTACT_EMAIL (the site owner's inbox, not the
// submitter's) — the Contact Us form has no reply-to-the-member flow of
// its own, so this is the honest equivalent of "someone will read this
// and reach out," same as any real contact form.
export function buildContactMessageEmail(
  name: string,
  email: string,
  phone: string | null,
  company: string | null,
  message: string
): EmailMessage {
  return {
    to: SITE_CONTACT_EMAIL,
    subject: `Contact form: ${name}`,
    html: contactMessageTemplate(name, email, phone, company, message),
    text:
      `New Contact Us message from ${name} <${email}>` +
      (phone ? `\nPhone: ${phone}` : "") +
      (company ? `\nCompany: ${company}` : "") +
      `\n\n${message}`,
  };
}

export function buildFriendRequestEmail(to: string, fromName: string): EmailMessage {
  const requestsUrl = `${APP_URL}/friends`;
  return {
    to,
    subject: `${fromName} sent you a friend request`,
    html: friendRequestTemplate(fromName, requestsUrl),
    text: `${fromName} sent you a friend request on Pueblo Connect.\n\nView it: ${requestsUrl}`,
  };
}

export function buildFriendAcceptedEmail(to: string, fromName: string): EmailMessage {
  const friendsUrl = `${APP_URL}/friends`;
  return {
    to,
    subject: `${fromName} accepted your friend request`,
    html: friendAcceptedTemplate(fromName, friendsUrl),
    text: `${fromName} accepted your friend request on Pueblo Connect.\n\nView your friends: ${friendsUrl}`,
  };
}

export function buildNewMessageEmail(to: string, fromName: string): EmailMessage {
  const messagesUrl = `${APP_URL}/messages`;
  return {
    to,
    subject: `New message from ${fromName}`,
    html: newMessageTemplate(fromName, messagesUrl),
    text: `You have a new message from ${fromName} on Pueblo Connect.\n\nView it: ${messagesUrl}`,
  };
}

async function sendViaResend(msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Resend API returned ${res.status}: ${await res.text()}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const OUTBOX_DIR = path.join(process.cwd(), "data", "outbox");

// Dev-only fallback — writes the email that WOULD have been sent to a
// local file + console, so the real token/link inside it can be read back
// out and used to actually exercise the flow (see
// scripts/test-membership-flow.mjs). Never used once RESEND_API_KEY is set.
function sendViaDevOutbox(msg: EmailMessage, kind: EmailKind): { ok: true; outboxPath: string } {
  if (!existsSync(OUTBOX_DIR)) mkdirSync(OUTBOX_DIR, { recursive: true });
  const fileName = `${Date.now()}-${kind}-${msg.to.replace(/[^a-z0-9@.]/gi, "_")}.json`;
  const outPath = path.join(OUTBOX_DIR, fileName);
  writeFileSync(outPath, JSON.stringify(msg, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(
    `[email:dev-outbox] RESEND_API_KEY not set — wrote "${msg.subject}" to ${msg.to} -> ${outPath} instead of sending it for real.`
  );
  return { ok: true, outboxPath: outPath };
}

export type SendEmailResult =
  | { delivered: true; mode: "resend" }
  | { delivered: true; mode: "dev-outbox"; outboxPath: string }
  | { delivered: false; error: string };

export async function sendTransactionalEmail(
  kind: EmailKind,
  msg: EmailMessage
): Promise<SendEmailResult> {
  if (process.env.RESEND_API_KEY) {
    const result = await sendViaResend(msg);
    if (result.ok) return { delivered: true, mode: "resend" };
    // Fall through to the dev outbox only if there's no key at all is
    // handled above; a configured-but-failing provider should surface as
    // a real failure, not silently degrade.
    return { delivered: false, error: result.error ?? "unknown error" };
  }
  const { outboxPath } = sendViaDevOutbox(msg, kind);
  return { delivered: true, mode: "dev-outbox", outboxPath };
}

// ---------------------------------------------------------------------
// Email queue — re-exported here (rather than only in db.ts) because
// enqueueEmail is this module's public API for "send this later"; db.ts
// stays the only file that touches SQLite directly.
export { enqueueEmail } from "./db";

function templateForQueuedEmail(email: QueuedEmail): EmailMessage {
  const payload = JSON.parse(email.payload_json) as Record<string, string>;
  switch (email.kind) {
    case "friend_request":
      return buildFriendRequestEmail(email.to_address, payload.fromName);
    case "friend_accepted":
      return buildFriendAcceptedEmail(email.to_address, payload.fromName);
    case "new_message":
      return buildNewMessageEmail(email.to_address, payload.fromName);
    case "report_status_update":
      return buildReportStatusUpdateEmail(
        email.to_address,
        Number(payload.reportId),
        payload.reportDescription,
        payload.newStatus,
        payload.note ?? null
      );
    default:
      // Exhaustiveness guard — a new QueuedEmailKind added to db.ts
      // without a case here is a bug, not a silently-dropped email.
      throw new Error(`No email template wired up for queued kind "${email.kind}".`);
  }
}

// The queue "worker". Call it fire-and-forget right after enqueueEmail so
// the HTTP response isn't held up by mail delivery (see the call sites in
// src/app/api/friends/* and src/app/api/messages/*), or call it from a
// scheduled task/cron in a real deployment — same function either way.
// Processes up to `limit` pending rows per call and never throws: a
// failure on one email is recorded on that row (status='failed',
// last_error) and processing continues with the rest.
export async function processEmailQueue(limit = 20): Promise<{ sent: number; failed: number }> {
  const pending = listPendingQueuedEmails(limit);
  let sent = 0;
  let failed = 0;
  for (const email of pending) {
    try {
      const msg = templateForQueuedEmail(email);
      const result = await sendTransactionalEmail(email.kind, msg);
      if (result.delivered) {
        markQueuedEmailSent(email.id);
        sent += 1;
      } else {
        markQueuedEmailFailed(email.id, result.error);
        failed += 1;
      }
    } catch (err) {
      markQueuedEmailFailed(email.id, err instanceof Error ? err.message : String(err));
      failed += 1;
    }
  }
  return { sent, failed };
}
