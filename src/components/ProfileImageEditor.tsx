"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/compress-image";

type Props = {
  kind: "cover" | "avatar";
  hasImage: boolean;
};

// Owner-only controls rendered on top of the member's own cover banner or
// avatar (see src/app/(site)/profile/[userId]/page.tsx). Replace uploads a
// new image, Remove clears it back to the default — both go through the
// real POST /api/account/profile (image-only update), then refresh the page.
export default function ProfileImageEditor({ kind, hasImage }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCover = kind === "cover";

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't save that change.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    try {
      const dataUrl = await compressImageFile(file, isCover ? 1200 : 480);
      await send(isCover ? { coverPhotoDataUrl: dataUrl } : { profilePhotoDataUrl: dataUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image.");
    }
  }

  function onRemove() {
    if (!confirm(isCover ? "Remove your cover photo?" : "Remove your profile photo?")) return;
    send(isCover ? { removeCoverPhoto: true } : { removePhoto: true });
  }

  const btn: React.CSSProperties = {
    border: "none",
    cursor: busy ? "wait" : "pointer",
    background: "rgba(255,255,255,0.95)",
    color: "#222",
    fontWeight: 600,
    fontSize: 13,
    boxShadow: "0 1px 4px rgba(0,0,0,.3)",
  };

  const input = (
    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
  );

  if (isCover) {
    return (
      <div style={{ position: "absolute", right: 16, bottom: 16, display: "flex", gap: 8, zIndex: 3, alignItems: "center" }}>
        {error && <span role="alert" style={{ background: "#fff", color: "#c0392b", fontSize: 12, padding: "4px 8px", borderRadius: 6 }}>{error}</span>}
        {input}
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} style={{ ...btn, borderRadius: 6, padding: "8px 12px" }}>
          <i className="fa fa-camera" /> {busy ? "Saving…" : hasImage ? "Change cover photo" : "Add cover photo"}
        </button>
        {hasImage && (
          <button type="button" disabled={busy} onClick={onRemove} style={{ ...btn, borderRadius: 6, padding: "8px 12px" }} title="Remove cover photo">
            <i className="fa fa-trash-o" /> Remove
          </button>
        )}
      </div>
    );
  }

  const round: React.CSSProperties = { ...btn, width: 34, height: 34, borderRadius: "50%", padding: 0 };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 8, display: "flex", justifyContent: "center", gap: 6, zIndex: 3 }}>
      {input}
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} style={round} title={hasImage ? "Change profile photo" : "Add profile photo"} aria-label="Change profile photo">
        <i className="fa fa-camera" />
      </button>
      {hasImage && (
        <button type="button" disabled={busy} onClick={onRemove} style={round} title="Remove profile photo" aria-label="Remove profile photo">
          <i className="fa fa-times" />
        </button>
      )}
      {error && <span role="alert" style={{ position: "absolute", bottom: 40, background: "#fff", color: "#c0392b", fontSize: 11, padding: "2px 6px", borderRadius: 6 }}>{error}</span>}
    </div>
  );
}
