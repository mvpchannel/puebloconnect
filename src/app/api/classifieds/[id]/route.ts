import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getClassifiedById, setClassifiedStatus, softDeleteClassified } from "@/lib/db";

// PATCH /api/classifieds/:id  { status: "sold" | "active" } — owner only.
// DELETE /api/classifieds/:id — owner or admin.
async function load(req: NextRequest, idParam: string) {
  const session = requireUser(req);
  if (!session) return { error: NextResponse.json({ error: "Not logged in." }, { status: 401 }) };
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: NextResponse.json({ error: "Invalid listing id." }, { status: 400 }) };
  }
  const item = getClassifiedById(id);
  if (!item) return { error: NextResponse.json({ error: "Listing not found." }, { status: 404 }) };
  return { session, item };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await load(req, params.id);
  if ("error" in r) return r.error;
  if (r.item.author_id !== r.session.sub) {
    return NextResponse.json({ error: "Only the poster can change this listing." }, { status: 403 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (body.status !== "sold" && body.status !== "active") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  setClassifiedStatus(r.item.id, body.status);
  return NextResponse.json({ ok: true, status: body.status });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await load(req, params.id);
  if ("error" in r) return r.error;
  if (r.item.author_id !== r.session.sub && r.session.role !== "admin") {
    return NextResponse.json({ error: "You can't delete someone else's listing." }, { status: 403 });
  }
  softDeleteClassified(r.item.id);
  return NextResponse.json({ ok: true });
}
