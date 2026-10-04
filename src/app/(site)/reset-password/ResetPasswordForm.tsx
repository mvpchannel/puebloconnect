"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token. Request a new one from the Forgot Password page.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't reset your password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Couldn't reach the server. Please try again.");
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
              <h2 className="log-title">Create New Password</h2>
              {done ? (
                <p role="status" style={{ color: "#1f6feb" }}>
                  Your password has been changed. Taking you to login…
                </p>
              ) : (
                <form method="post" onSubmit={handleSubmit}>
                  {!token && (
                    <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
                      This link is missing its reset token. Open it directly from the email,
                      or request a new link from the{" "}
                      <a href="/forgot-password">Forgot Password</a> page.
                    </p>
                  )}
                  {error && (
                    <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
                      {error}
                    </p>
                  )}
                  <div className="form-group">
                    <input
                      type="password"
                      id="new-password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <label className="control-label" htmlFor="new-password">New Password</label>
                    <i className="mtrl-select" />
                  </div>
                  <div className="form-group">
                    <input
                      type="password"
                      id="confirm-new-password"
                      required
                      minLength={8}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <label className="control-label" htmlFor="confirm-new-password">Confirm New Password</label>
                    <i className="mtrl-select" />
                  </div>
                  <div className="submit-btns">
                    <button className="mtr-btn signin" type="submit" disabled={busy}>
                      <span>{busy ? "Changing password…" : "Change Password"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
