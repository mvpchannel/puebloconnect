"use client";

import { useState, FormEvent } from "react";

/**
 * Ported from winku-html/contact.html's "Send us a message" form.
 *
 * STATUS: needs backend/API — there is no contact-submissions inbox or API
 * route yet (no node:sqlite table or /api/contact endpoint). Rather than
 * silently submitting nowhere, this honestly tells the person their message
 * wasn't sent anywhere and gives them a real way to reach Pueblo Connect in
 * the meantime. Same pattern as src/components/PostComposer.tsx.
 */
export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="contact-form">
      <div className="cnt-title">
        <span>Send us a message</span>
        <i><img src="/images/envelop.png" alt="" /></i>
      </div>
      {submitted ? (
        <p role="status" style={{ padding: "20px 0" }}>
          Thanks &mdash; contact form submissions aren&rsquo;t wired up to an
          inbox yet. Email us directly at{" "}
          <a href="mailto:latenitegano@gmail.com">latenitegano@gmail.com</a>{" "}
          or call{" "}
          <a href="tel:+13232459408">323-245-9408</a> in the meantime.
        </p>
      ) : (
        <form method="post" onSubmit={handleSubmit}>
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
            <button className="mtr-btn signup" type="submit">
              <i className="fa fa-paper-plane" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
