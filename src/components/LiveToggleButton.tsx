"use client";

import { useState } from "react";

type Props = {
  endpoint: string; // POST turns it on, DELETE turns it off
  initialOn: boolean;
  isLoggedIn: boolean;
  labelOff: string; // e.g. "Follow", "Remind Me"
  labelOn: string; // e.g. "Following", "Reminder set"
  variant?: "solid" | "outline";
  size?: "md" | "sm";
};

// One small toggle used for "Follow" (hosts) and "Remind Me" (upcoming
// streams) on the Pueblo Live pages. Logged-out visitors are sent to log in.
export default function LiveToggleButton({
  endpoint,
  initialOn,
  isLoggedIn,
  labelOff,
  labelOn,
  variant = "solid",
  size = "md",
}: Props) {
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: on ? "DELETE" : "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't do that.");
        return;
      }
      setOn(!on);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const pad = size === "sm" ? "5px 14px" : "10px 26px";
  const font = size === "sm" ? 12.5 : 14;
  const active = on;
  const style: React.CSSProperties =
    variant === "solid"
      ? {
          background: active ? "#eaf2ff" : "#1673f0",
          color: active ? "#1673f0" : "#fff",
          border: active ? "1px solid #1673f0" : "1px solid #1673f0",
        }
      : {
          background: active ? "#eaf2ff" : "#fff",
          color: "#1673f0",
          border: "1px solid #1673f0",
        };
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start" }}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={on}
        style={{
          ...style,
          borderRadius: size === "sm" ? 999 : 10,
          padding: pad,
          fontSize: font,
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {on ? (
          <>
            <i className="fa fa-check" style={{ marginRight: 6 }} />
            {labelOn}
          </>
        ) : (
          labelOff
        )}
      </button>
      {error && (
        <span role="alert" style={{ color: "#e02020", fontSize: 11, marginTop: 4 }}>
          {error}
        </span>
      )}
    </span>
  );
}
