import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { updatePuebloQuestion, softDeletePuebloQuestion, getPuebloQuestionById } from "@/lib/db";
import { parseQuestionBody } from "@/lib/we-asked";

// PUT /api/admin/we-asked/:id — edit a question or change draft/open/closed. DELETE removes it.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = parseQuestionBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const q = updatePuebloQuestion(Number(params.id), parsed.input);
  if (!q) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || !getPuebloQuestionById(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  softDeletePuebloQuestion(id);
  return NextResponse.json({ ok: true });
}
