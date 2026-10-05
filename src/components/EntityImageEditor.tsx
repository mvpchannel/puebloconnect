"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/compress-image";

export type ImageSlot = { kind?: "logo" | "cover"; label: string; hasImage: boolean; maxSide: number };

// Owner-only "Change / Remove picture" buttons for business logos & covers
// and event / group covers. Posts to the entity's /image endpoint, then
// refreshes the page so the new picture (or the placeholder) shows.
export default function EntityImageEditor({ endpoint, slots }: { endpoint: string; slots: ImageSlot[] }) {
  const router = useRouter();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(slot: ImageSlot, payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(slot.kind ? { kind: slot.kind } : {}), ...payload }),
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

  async function onFile(slot: ImageSlot, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("That file isn't an image.");
    try {
      await send(slot, { imageDataUrl: await compressImageFile(file, slot.maxSide) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image.");
    }
  }

  const btn: React.CSSProperties = {
    border: "none",
    borderRadius: 8,
    padding: "7px 14px",
    cursor: busy ? "wait" : "pointer",
    background: "rgba(255,255,255,0.95)",
    color: "#222",
    fontWeight: 600,
    fontSize: 13,
    boxShadow: "0 1px 4px rgba(0,0,0,.3)",
  };

  return (
    <div style={{ position: "absolute", right: 16, bottom: 16, zIndex: 5, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {slots.map((slot, i) => (
        <span key={slot.label} style={{ display: "inline-flex", gap: 6 }}>
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => onFile(slot, e)}
          />
          <button type="button" style={btn} disabled={busy} onClick={() => refs.current[i]?.click()}>
            {slot.hasImage ? `Change ${slot.label}` : `Add ${slot.label}`}
          </button>
          {slot.hasImage && (
            <button
              type="button"
              style={btn}
              disabled={busy}
              onClick={() => confirm(`Remove the ${slot.label}?`) && send(slot, { remove: true })}
            >
              Remove
            </button>
          )}
        </span>
      ))}
      {error && (
        <span role="alert" style={{ background: "#fff", color: "#e02020", fontSize: 12, padding: "6px 10px", borderRadius: 8, flexBasis: "100%", textAlign: "right" }}>
          {error}
        </span>
      )}
    </div>
  );
}
