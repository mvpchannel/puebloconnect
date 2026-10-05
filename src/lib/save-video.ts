import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

const TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

// Saves an uploaded video (MP4/WebM/MOV, 50MB cap) under
// public/uploads/<subdir>/ and returns its public path, or an error. The
// file's first bytes are checked against the container format, so a
// mislabelled file (say, HTML named .mp4) is rejected, not stored.
export async function saveUploadedVideo(
  file: File,
  subdir: string
): Promise<string | { error: string }> {
  const ext = TYPES[file.type];
  if (!ext) return { error: "Video must be an MP4, WebM, or MOV file." };
  if (file.size > MAX_VIDEO_BYTES) return { error: "Video must be smaller than 50MB." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const isWebm = buffer.length > 4 && buffer.readUInt32BE(0) === 0x1a45dfa3;
  const isIsoBmff = buffer.length > 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  if ((ext === "webm" && !isWebm) || (ext !== "webm" && !isIsoBmff)) {
    return { error: "That file doesn't look like a valid video." };
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const fileName = `${randomUUID()}.${ext}`;
  writeFileSync(path.join(dir, fileName), buffer);
  return `/uploads/${subdir}/${fileName}`;
}
