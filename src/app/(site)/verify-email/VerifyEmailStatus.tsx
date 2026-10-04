"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "checking" | "success" | "error";

const REASON_MESSAGES: Record<string, string> = {
  missing_token: "This verification link is missing its token.",
  invalid_token: "This verification link isn't valid.",
  already_used: "This verification link has already been used. If your email is already verified, you can just log in.",
  expired: "This verification link has expired. Log in and request a new one from your account settings.",
};

export default function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("checking");
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setReason("missing_token");
      return;
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setReason(data.reason || "invalid_token");
        }
      })
      .catch(() => {
        setStatus("error");
        setReason("invalid_token");
      });
  }, [token]);

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
              {status === "checking" && <h2 className="log-title">Verifying…</h2>}
              {status === "success" && (
                <>
                  <h2 className="log-title">WELCOME TO PUEBLO CONNECT</h2>
                  <p>Your email has been verified. Your Pueblo Connect account is ready.</p>
                  <p style={{ marginTop: 16 }}>
                    <a href="/login" className="mtr-btn signin" style={{ display: "inline-block" }}>
                      <span>Go to Login</span>
                    </a>
                  </p>
                </>
              )}
              {status === "error" && (
                <>
                  <h2 className="log-title">Verification Problem</h2>
                  <p role="alert" style={{ color: "#e02020" }}>
                    {REASON_MESSAGES[reason || ""] || "We couldn't verify your email."}
                  </p>
                  <p style={{ marginTop: 16 }}>
                    <a href="/login">Back to login</a>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
