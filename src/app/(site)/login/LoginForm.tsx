"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Ported from landing.html. The sign-in/register panel swap was originally
 * driven by main.min.js (jQuery) toggling a `.show` class — reimplemented
 * here as real React state instead of silently dropping the interaction.
 *
 * STATUS: real. Both forms submit to actual API routes
 * (/api/auth/login, /api/auth/register) backed by a real SQLite users
 * table with hashed passwords, signed session cookies, and a full
 * email-verification / password-reset system — see src/lib/db.ts,
 * src/lib/password.ts, src/lib/session.ts, src/lib/tokens.ts,
 * src/lib/email.ts.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/newsfeed";

  const [showRegister, setShowRegister] = useState(false);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regAgree, setRegAgree] = useState(false);
  const [regPhoto, setRegPhoto] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [regNotice, setRegNotice] = useState<string | null>(null);
  const [regBusy, setRegBusy] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Login failed.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setLoginError("Couldn't reach the server. Try again.");
    } finally {
      setLoginBusy(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setRegPhoto(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRegPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setRegError(null);
    setRegNotice(null);

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      return;
    }
    if (!regAgree) {
      setRegError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setRegBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: regFirstName,
          lastName: regLastName,
          username: regUsername,
          email: regEmail,
          password: regPassword,
          confirmPassword: regConfirmPassword,
          city: regCity,
          agreeToTerms: regAgree,
          profilePhotoDataUrl: regPhoto,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Registration failed.");
        return;
      }
      router.push("/newsfeed");
      router.refresh();
    } catch {
      setRegError("Couldn't reach the server. Try again.");
    } finally {
      setRegBusy(false);
    }
  }

  return (
    <div className="container-fluid pdng0">
      <div className="row merged">
        <div className="col-lg-6 col-md-6 col-sm-6 col-xs-12">
          <div className="land-featurearea">
            <div className="land-meta">
              <h1>Pueblo Connect&nbsp;</h1>
              <p>
                Pueblo Connect is free to use for as long as you want.
              </p>
            </div>
          </div>
        </div>
        <div className="col-lg-6 col-md-6 col-sm-6 col-xs-12">
          <div className={`login-reg-bg${showRegister ? " show" : ""}`}>
            <div className="log-reg-area sign">
              <h2 className="log-title">Login</h2>
              <p>
                Don&rsquo;t use Pueblo Connect yet?{" "}
                <a href="#" title="">Take the tour</a> or{" "}
                <a
                  href="#"
                  title=""
                  onClick={(e) => {
                    e.preventDefault();
                    setShowRegister(true);
                  }}
                >
                  Join now
                </a>
              </p>
              <form method="post" onSubmit={handleLogin}>
                {loginError && (
                  <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
                    {loginError}
                  </p>
                )}
                <div className="form-group">
                  <input
                    type="text"
                    id="login-username"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    autoComplete="username"
                  />
                  <label className="control-label" htmlFor="login-username">Username or Email</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    id="login-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <label className="control-label" htmlFor="login-password">Password</label>
                  <i className="mtrl-select" />
                </div>
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <i className="check-box" />
                    Always remember me.
                  </label>
                </div>
                <a href="/forgot-password" title="" className="forgot-pwd">Forgot password?</a>
                <div className="submit-btns">
                  <button className="mtr-btn signin" type="submit" disabled={loginBusy}>
                    <span>{loginBusy ? "Logging in…" : "Login"}</span>
                  </button>
                  <button
                    className="mtr-btn signup"
                    type="button"
                    onClick={() => setShowRegister(true)}
                  >
                    <span>Register</span>
                  </button>
                </div>
              </form>
            </div>
            <div className="log-reg-area reg">
              <h2 className="log-title">Register</h2>
              <p>
                Don&rsquo;t use Pueblo Connect yet?{" "}
                <a href="#" title="">Take the tour</a> or{" "}
                <a
                  href="#"
                  title=""
                  onClick={(e) => {
                    e.preventDefault();
                    setShowRegister(false);
                  }}
                >
                  Already have an account
                </a>
              </p>
              <form method="post" onSubmit={handleRegister}>
                {regError && (
                  <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
                    {regError}
                  </p>
                )}
                {regNotice && (
                  <p role="status" style={{ color: "#1f6feb", marginBottom: 12 }}>
                    {regNotice}
                  </p>
                )}
                <div className="form-group">
                  <input
                    type="text"
                    id="reg-first-name"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                  <label className="control-label" htmlFor="reg-first-name">First Name</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    id="reg-last-name"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                  <label className="control-label" htmlFor="reg-last-name">Last Name</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    id="reg-username"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    autoComplete="username"
                  />
                  <label className="control-label" htmlFor="reg-username">User Name</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input
                    type="email"
                    id="reg-email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <label className="control-label" htmlFor="reg-email">Email</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    id="reg-password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <label className="control-label" htmlFor="reg-password">Password (min. 8 characters)</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    id="reg-confirm-password"
                    required
                    minLength={8}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <label className="control-label" htmlFor="reg-confirm-password">Confirm Password</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    id="reg-city"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    autoComplete="address-level2"
                  />
                  <label className="control-label" htmlFor="reg-city">City / Neighborhood (optional)</label>
                  <i className="mtrl-select" />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-photo" style={{ display: "block", marginBottom: 6 }}>
                    Profile photo (optional)
                  </label>
                  <input
                    type="file"
                    id="reg-photo"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                  />
                </div>
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      required
                      checked={regAgree}
                      onChange={(e) => setRegAgree(e.target.checked)}
                    />
                    <i className="check-box" />
                    Accept <a href="/terms" target="_blank" rel="noreferrer">Terms &amp; Conditions</a>?
                  </label>
                </div>
                <div className="submit-btns">
                  <button className="mtr-btn signup" type="submit" disabled={regBusy}>
                    <span>{regBusy ? "Creating account…" : "Register"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
