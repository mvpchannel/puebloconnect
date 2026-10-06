"use client";

import { useEffect, useRef, useState } from "react";

export type CropAspect = { key: string; label: string; ratio: number | null }; // ratio = width / height; null = keep the whole photo

export const DEFAULT_ASPECTS: CropAspect[] = [
  { key: "original", label: "Original (no crop)", ratio: null },
  { key: "square", label: "Square 1:1", ratio: 1 },
  { key: "landscape", label: "Landscape 16:9", ratio: 16 / 9 },
  { key: "photo", label: "Photo 4:3", ratio: 4 / 3 },
  { key: "portrait", label: "Portrait 4:5", ratio: 4 / 5 },
  { key: "cover", label: "Wide cover 3:1", ratio: 3 },
];

const PREVIEW_W = 480;
const OUTPUT_MAX = 1600;

// Pick a photo, then (optionally) crop it: choose a shape, drag to position, zoom.
// Everything happens in the browser. The parent gets a function that returns the
// finished JPEG as a data URL (or null while no photo is chosen).
export default function PhotoCropper({
  aspects = DEFAULT_ASPECTS,
  initialAspect = "original",
  onChange,
}: {
  aspects?: CropAspect[];
  initialAspect?: string;
  onChange: (getDataUrl: (() => string) | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectKey, setAspectKey] = useState(initialAspect);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 }); // crop centre as a fraction of the photo

  const aspect = aspects.find((a) => a.key === aspectKey) ?? aspects[0];

  // Source rectangle (in photo pixels) for the current shape, zoom and position.
  function sourceRect(img: HTMLImageElement) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const ratio = aspect.ratio ?? iw / ih;
    const baseW = Math.min(iw, ih * ratio);
    const sw = baseW / zoom;
    const sh = sw / ratio;
    const sx = Math.min(Math.max(center.x * iw - sw / 2, 0), iw - sw);
    const sy = Math.min(Math.max(center.y * ih - sh / 2, 0), ih - sh);
    return { sx, sy, sw, sh, ratio };
  }

  function render(target: HTMLCanvasElement, outW: number) {
    const img = imgRef.current;
    if (!img) return;
    const { sx, sy, sw, sh, ratio } = sourceRect(img);
    target.width = Math.round(outW);
    target.height = Math.round(outW / ratio);
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, target.width, target.height);
  }

  // Redraw the preview whenever the shape, zoom or position changes.
  useEffect(() => {
    if (loaded && canvasRef.current) render(canvasRef.current, PREVIEW_W);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, aspectKey, zoom, center]);

  // Give the parent a fresh "make the finished picture" function when the settings change.
  useEffect(() => {
    if (!loaded) return onChange(null);
    onChange(() => {
      const img = imgRef.current!;
      const { sw, ratio } = sourceRect(img);
      const outW = Math.min(sw, ratio >= 1 ? OUTPUT_MAX : OUTPUT_MAX * ratio);
      const c = document.createElement("canvas");
      render(c, outW);
      return c.toDataURL("image/jpeg", 0.88);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, aspectKey, zoom, center]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("That file isn't an image.");
    setError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      imgRef.current = img;
      setZoom(1);
      setCenter({ x: 0.5, y: 0.5 });
      setLoaded(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Couldn't read that image.");
    };
    img.src = url;
  }

  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!loaded || aspect.ratio === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, cx: center.x, cy: center.y };
  }
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    const img = imgRef.current;
    if (!d || !img) return;
    const { sw, sh } = sourceRect(img);
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - d.x) / rect.width) * (sw / img.naturalWidth);
    const dy = ((e.clientY - d.y) / rect.height) * (sh / img.naturalHeight);
    setCenter({ x: Math.min(1, Math.max(0, d.cx - dx)), y: Math.min(1, Math.max(0, d.cy - dy)) });
  }
  function pointerUp() {
    drag.current = null;
  }

  return (
    <div>
      <label className="btn btn-default btn-sm" style={{ margin: "0 0 12px" }}>
        {loaded ? "Choose a different photo" : "Choose a photo"}
        <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      </label>
      {error && <p role="alert" style={{ color: "#e02020" }}>{error}</p>}
      {loaded && (
        <>
          <div style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ margin: 0 }}>
              Shape{" "}
              <select value={aspectKey} onChange={(e) => { setAspectKey(e.target.value); setZoom(1); setCenter({ x: 0.5, y: 0.5 }); }}>
                {aspects.map((a) => (
                  <option key={a.key} value={a.key}>{a.label}</option>
                ))}
              </select>
            </label>
            {aspect.ratio !== null && (
              <label style={{ margin: 0 }}>
                Zoom{" "}
                <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              </label>
            )}
          </div>
          <canvas
            ref={canvasRef}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            style={{
              width: "100%",
              maxWidth: PREVIEW_W,
              height: "auto",
              border: "1px solid #ccc",
              borderRadius: 4,
              touchAction: "none",
              cursor: aspect.ratio === null ? "default" : "grab",
              background: "#eee",
            }}
          />
          {aspect.ratio !== null && <p style={{ color: "#888", fontSize: 12, marginTop: 6 }}>Drag the picture to move it. Use Zoom to get closer.</p>}
        </>
      )}
    </div>
  );
}
