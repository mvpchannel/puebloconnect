import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getUserById, updateUserProfile } from "@/lib/db";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

// GET/POST /api/account/profile — the real "Edit Profile" form's backend.
// Lets the signed-in member change their first/last name, city, and
// avatar — the same fields collected at signup (see
// src/app/api/auth/register/route.ts, which this route's photo handling
// mirrors) rather than inventing a separate shape for them. Username and
// email are deliberately not editable here (uniqueness/verification are
// a separate concern from this feature).
export async function GET(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const user = getUserById(session.sub);
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  return NextResponse.json({
    firstName: user.first_name,
    lastName: user.last_name,
    city: user.city,
    profilePhotoPath: user.profile_photo_path,
    bio: user.bio,
    coverPhotoPath: user.cover_photo_path,
  });
}

// Shared by the avatar and cover-photo upload paths below — same
// validation (PNG/JPEG/WEBP, 3MB cap), different destination folder.
function saveDataUrlImage(dataUrl: string, subdir: string): string | { error: string } {
  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "Image must be a PNG, JPEG, or WEBP file." };
  }
  const [, , ext, base64Data] = match;
  const buffer = Buffer.from(base64Data, "base64");
  const MAX_BYTES = 3 * 1024 * 1024; // 3MB
  if (buffer.length > MAX_BYTES) {
    return { error: "Image must be smaller than 3MB." };
  }
  const uploadsDir = path.join(process.cwd(), "public", "uploads", subdir);
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  const safeExt = ext === "jpeg" ? "jpg" : ext;
  const fileName = `${randomUUID()}.${safeExt}`;
  writeFileSync(path.join(uploadsDir, fileName), buffer);
  return `/uploads/${subdir}/${fileName}`;
}

export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (!session) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    firstName,
    lastName,
    city,
    profilePhotoDataUrl,
    removePhoto,
    bio,
    coverPhotoDataUrl,
    removeCoverPhoto,
  } = (body ?? {}) as Record<string, unknown>;

  // Name/city are optional so the profile page's inline avatar/cover
  // controls can send an image-only update; anything omitted keeps its
  // current value (the Edit Profile form always sends all of them).
  const existing = getUserById(session.sub);
  if (!existing) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  const cleanFirst = (typeof firstName === "string" ? firstName : existing.first_name ?? "").trim();
  const cleanLast = (typeof lastName === "string" ? lastName : existing.last_name ?? "").trim();
  if (!cleanFirst || !cleanLast) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }
  if (cleanFirst.length > 60 || cleanLast.length > 60) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }
  const cleanCity = typeof city === "string" ? city.trim().slice(0, 120) : existing.city ?? "";

  // profilePhotoPath/coverPhotoPath stay `undefined` (leave existing image
  // alone) unless the member either removed it or submitted a new one —
  // same 3-state handling the update function expects.
  let profilePhotoPath: string | null | undefined = undefined;
  if (removePhoto === true) {
    profilePhotoPath = null;
  } else if (typeof profilePhotoDataUrl === "string" && profilePhotoDataUrl.length > 0) {
    const result = saveDataUrlImage(profilePhotoDataUrl, "avatars");
    if (typeof result !== "string") {
      return NextResponse.json({ error: `Profile photo: ${result.error}` }, { status: 400 });
    }
    profilePhotoPath = result;
  }

  let coverPhotoPath: string | null | undefined = undefined;
  if (removeCoverPhoto === true) {
    coverPhotoPath = null;
  } else if (typeof coverPhotoDataUrl === "string" && coverPhotoDataUrl.length > 0) {
    const result = saveDataUrlImage(coverPhotoDataUrl, "covers");
    if (typeof result !== "string") {
      return NextResponse.json({ error: `Cover photo: ${result.error}` }, { status: 400 });
    }
    coverPhotoPath = result;
  }

  const cleanBio = typeof bio === "string" ? bio.trim().slice(0, 500) : undefined;

  const updated = updateUserProfile(session.sub, {
    firstName: cleanFirst,
    lastName: cleanLast,
    city: cleanCity || null,
    profilePhotoPath,
    bio: typeof bio === "string" ? (cleanBio || null) : undefined,
    coverPhotoPath,
  });

  return NextResponse.json({ user: updated });
}
