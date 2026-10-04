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
  });
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

  const { firstName, lastName, city, profilePhotoDataUrl, removePhoto } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof firstName !== "string" || typeof lastName !== "string") {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }
  const cleanFirst = firstName.trim();
  const cleanLast = lastName.trim();
  if (!cleanFirst || !cleanLast) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }
  if (cleanFirst.length > 60 || cleanLast.length > 60) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }
  const cleanCity = typeof city === "string" ? city.trim().slice(0, 120) : "";

  // profilePhotoPath stays `undefined` (leave existing photo alone)
  // unless the member either removed it or submitted a new one — same
  // 3-state handling the update function expects.
  let profilePhotoPath: string | null | undefined = undefined;

  if (removePhoto === true) {
    profilePhotoPath = null;
  } else if (typeof profilePhotoDataUrl === "string" && profilePhotoDataUrl.length > 0) {
    const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(profilePhotoDataUrl);
    if (!match) {
      return NextResponse.json(
        { error: "Profile photo must be a PNG, JPEG, or WEBP image." },
        { status: 400 }
      );
    }
    const [, , ext, base64Data] = match;
    const buffer = Buffer.from(base64Data, "base64");
    const MAX_BYTES = 3 * 1024 * 1024; // 3MB
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "Profile photo must be smaller than 3MB." }, { status: 400 });
    }
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    const safeExt = ext === "jpeg" ? "jpg" : ext;
    const fileName = `${randomUUID()}.${safeExt}`;
    writeFileSync(path.join(uploadsDir, fileName), buffer);
    profilePhotoPath = `/uploads/avatars/${fileName}`;
  }

  const updated = updateUserProfile(session.sub, {
    firstName: cleanFirst,
    lastName: cleanLast,
    city: cleanCity || null,
    profilePhotoPath,
  });

  return NextResponse.json({ user: updated });
}
