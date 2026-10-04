"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BusinessFollowButtonProps = {
  slug: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  initialIsFollowing: boolean;
};

// Real backend: POST /api/businesses/:slug/follow and /unfollow,
// backed by the business_followers table in src/lib/db.ts.
export default function BusinessFollowButton({
  slug,
  isLoggedIn,
  isOwner,
  initialIsFollowing,
}: BusinessFollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!isLoggedIn) {
      setError("Log in to follow this business.");
      return;
    }
    setBusy(true);
    setError(null);
    const endpoint = isFollowing ? "unfollow" : "follow";
    try {
      const res = await fetch(`/api/businesses/${slug}/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Couldn't ${endpoint} that business.`);
        return;
      }
      setIsFollowing(!isFollowing);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (isOwner) {
    return <span className="mtr-btn signin" style={{ display: "inline-block" }}><span>You own this channel</span></span>;
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ color: "#e02020", margin: "0 0 8px" }}>
          {error}
        </p>
      )}
      <button className="mtr-btn signup" type="button" onClick={handleClick} disabled={busy}>
        <span>{busy ? "Working…" : isFollowing ? "Unfollow" : "Follow"}</span>
      </button>
    </div>
  );
}
