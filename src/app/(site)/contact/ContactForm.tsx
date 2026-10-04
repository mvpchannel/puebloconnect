"use client";

import { useState, FormEvent } from "react";

/**
 * Ported from winku-html/contact.html's "Send us a message" form.
 *
 * Real backend: POST /api/contact (src/lib/db.ts createContactMessage +
 * an email to the site's real contact inbox) — the form used to just set
 * local state and tell the visitor it wasn't wired to anything.
 */
export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, company, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't send your message. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Couldn't send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="contact-form">
      <div className="cnt-title">
        <span>Send us a message</span>
        <i><img src="/images/envelop.png" alt="" /></i>
      </div>
      {submitted ? (
        <p role="status" style={{ padding: "20px 0" }}>
          Thanks, {name.split(" ")[0] || "there"} &mdash; your message has been sent. We&rsquo;ll
          get back to you at {email}.
        </p>
      ) : (
        <form method="post" onSubmit={handleSubmit}>
          {error && (
            <p role="alert" style={{ color: "#c0392b", marginBottom: 16 }}>
              {error}
            </p>
          )}
          <div className="form-group">
            <input
              type="text"
              id="contact-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <label className="control-label" htmlFor="contact-name">First &amp; Last Name</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <input
              type="email"
              id="contact-email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <label className="control-label" htmlFor="contact-email">Email@</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <input
              type="tel"
              id="contact-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
            <label className="control-label" htmlFor="contact-phone">Phone No.</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <input
              type="text"
              id="contact-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
            />
            <label className="control-label" htmlFor="contact-company">Company</label>
            <i className="mtrl-select" />
          </div>
          <div className="form-group">
            <textarea
              rows={4}
              id="contact-message"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <label className="control-label" htmlFor="contact-message">Message</label>
            <i className="mtrl-select" />
          </div>
          <div className="submit-btns">
            <button className="mtr-btn signup" type="submit" disabled={submitting}>
              <i className="fa fa-paper-plane" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
