"use client";

import { useState, FormEvent } from "react";

// Reuses the exact login-panel CSS classes (log-reg-area, form-group,
// mtr-btn) from the existing template — no new visual design, just the
// same login card with a password-reset-request form in it.
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      // The API always returns the same neutral message, by design — see
      // src/app/api/auth/forgot-password/route.ts.
      setMessage(
        data.message || "If an account exists for that email address, we've sent password-reset instructions."
      );
    } catch {
      setMessage("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-fluid pdng0">
      <div className="row merged">
        <div className="col-lg-6 col-md-6 col-sm-6 col-xs-12">
          <div className="land-featurearea">
            <div className="land-meta">
              <h1>Pueblo Connect&nbsp;</h1>
              <p>Connect Local. Shop Local. Grow Together.</p>
            </div>
          </div>
        </div>
        <div className="col-lg-6 col-md-6 col-sm-6 col-xs-12">
          <div className="login-reg-bg">
            <div className="log-reg-area sign" style={{ margin: "0 auto" }}>
              <h2 className="log-title">Forgot Password?</h2>
              <p>Enter your email address and we&rsquo;ll send you password-reset instructions.</p>
              <form method="post" onSubmit={handleSubmit}>
                {message && (
                  <p role="status" style={{ color: "#1f6feb", marginBottom: 12 }}>
                    {message}
                  </p>
                )}
                <div className="form-group">
                  <input
                    type="email"
                    id="forgot-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <label className="control-label" htmlFor="forgot-email">Email</label>
                  <i className="mtrl-select" />
                </div>
                <div className="submit-btns">
                  <button className="mtr-btn signin" type="submit" disabled={busy}>
                    <span>{busy ? "Sending…" : "Send Reset Instructions"}</span>
                  </button>
                </div>
              </form>
              <p style={{ marginTop: 16 }}>
                <a href="/login">Back to login</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
