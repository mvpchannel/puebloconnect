import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getPuebloDropById, setPuebloDropActive, softDeletePuebloDrop } from "@/lib/db";

// PUT /api/admin/drops/:id — { active: boolean } pauses or resumes a drop. DELETE removes it.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(params.id);
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.active !== "boolean") return NextResponse.json({ error: "Missing active flag." }, { status: 400 });
  if (!Number.isInteger(id) || !getPuebloDropById(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  setPuebloDropActive(id, body.active);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || !getPuebloDropById(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  softDeletePuebloDrop(id);
  return NextResponse.json({ ok: true });
}
