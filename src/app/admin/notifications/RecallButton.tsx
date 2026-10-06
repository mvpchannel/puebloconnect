"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecallButton({ batch }: { batch: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function recall() {
    if (!window.confirm("Take this announcement back from every member?")) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/notifications/${batch}`, { method: "DELETE" });
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
      <button type="button" className="btn btn-default btn-xs" disabled={busy} onClick={recall}>Take back</button>
      {error && <div style={{ color: "#e02020", fontSize: 12 }}>Couldn&rsquo;t do that. Try again.</div>}
    </div>
  );
}
