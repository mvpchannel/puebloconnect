"use client";

import { useState, FormEvent } from "react";

// A real inquiry form for sales-led programs (Own Your Block, 360° Advertising…).
// It posts to the existing /api/contact endpoint, which stores the message and
// emails the site's contact inbox. Nothing is charged or reserved here — the
// copy says so. `program` is prefixed to the message so the inbox can tell
// which program the lead came from.
export default function SponsorInquiryForm({
  program,
  interestLabel,
  interestPlaceholder,
}: {
  program: string;
  interestLabel: string;
  interestPlaceholder: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [interest, setInterest] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const message = [`[${program} inquiry]`, `${interestLabel}: ${interest.trim()}`, notes.trim() && `Notes: ${notes.trim()}`]
        .filter(Boolean)
        .join("\n");
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, company, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't send your inquiry. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't send your inquiry. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p role="status" style={{ padding: "12px 0" }}>
        Thanks, {name.split(" ")[0] || "there"} — your inquiry was sent. We&rsquo;ll reply to {email}.
      </p>
    );
  }

  const field: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: 4, marginBottom: 10 };
  return (
    <form onSubmit={submit}>
      {error && <p role="alert" style={{ color: "#c0392b" }}>{error}</p>}
      <input style={field} required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} />
      <input style={field} required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <input style={field} type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      <input style={field} placeholder="Business name" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
      <input style={field} required placeholder={interestPlaceholder} aria-label={interestLabel} value={interest} onChange={(e) => setInterest(e.target.value)} maxLength={200} />
      <textarea style={field} rows={4} placeholder="Anything else we should know (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={3000} />
      <button className="mtr-btn signup" type="submit" disabled={busy}><span>{busy ? "Sending…" : "Send inquiry"}</span></button>
    </form>
  );
}
