"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePostButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this post from the newsfeed?")) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-default btn-xs" disabled={busy} onClick={remove}>Delete</button>
      {error && <div style={{ color: "#e02020", fontSize: 12 }}>Couldn&rsquo;t delete. Try again.</div>}
    </div>
  );
}
