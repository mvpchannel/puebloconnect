import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createPuebloDrop } from "@/lib/db";
import { parseDropBody } from "@/lib/drop-input";

// POST /api/admin/drops — hide a new treasure in the 3D Pueblo (admin only).
export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = parseDropBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const drop = createPuebloDrop(parsed.input);
  return NextResponse.json({ drop: { id: drop.id } }, { status: 201 });
}
