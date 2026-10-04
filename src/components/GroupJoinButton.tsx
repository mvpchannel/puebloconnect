"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GroupJoinButtonProps = {
  slug: string;
  isLoggedIn: boolean;
  initialIsMember: boolean;
  initialRole: "owner" | "member" | null;
};

// Real backend: POST /api/groups/:slug/join and /leave
// (src/app/api/groups/[slug]/{join,leave}/route.ts), backed by the
// group_members table in src/lib/db.ts.
export default function GroupJoinButton({
  slug,
  isLoggedIn,
  initialIsMember,
  initialRole,
}: GroupJoinButtonProps) {
  const router = useRouter();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [role, setRole] = useState(initialRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!isLoggedIn) {
      setError("Log in to join this group.");
      return;
    }
    setBusy(true);
    setError(null);
    const endpoint = isMember ? "leave" : "join";
    try {
      const res = await fetch(`/api/groups/${slug}/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Couldn't ${endpoint} that group.`);
        return;
      }
      setIsMember(!isMember);
      setRole(isMember ? null : "member");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (role === "owner") {
    return <span className="mtr-btn signin" style={{ display: "inline-block" }}><span>You own this group</span></span>;
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ color: "#e02020", margin: "0 0 8px" }}>
          {error}
        </p>
      )}
      <button className="mtr-btn signup" type="button" onClick={handleClick} disabled={busy}>
        <span>{busy ? "Working…" : isMember ? "Leave group" : "Join group"}</span>
      </button>
    </div>
  );
}
