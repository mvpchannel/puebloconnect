import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

// Saves a base64 image data URL (PNG/JPEG/WEBP, 3MB cap) under
// public/uploads/<subdir>/ and returns its public path, or an error.
export function saveDataUrlImage(dataUrl: string, subdir: string): string | { error: string } {
  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "Image must be a PNG, JPEG, or WEBP file." };
  }
  const [, , ext, base64Data] = match;
  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length > 3 * 1024 * 1024) {
    return { error: "Image must be smaller than 3MB." };
  }
  const uploadsDir = path.join(process.cwd(), "public", "uploads", subdir);
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  const safeExt = ext === "jpeg" ? "jpg" : ext;
  const fileName = `${randomUUID()}.${safeExt}`;
  writeFileSync(path.join(uploadsDir, fileName), buffer);
  return `/uploads/${subdir}/${fileName}`;
}
