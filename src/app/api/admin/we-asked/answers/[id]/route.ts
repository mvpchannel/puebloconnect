import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { moderatePuebloAnswer } from "@/lib/db";

// PUT /api/admin/we-asked/answers/:id — approve/reject an answer, or mark it selected for The Daily Pueblo.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const change: { status?: "pending" | "approved" | "rejected"; selected?: boolean } = {};
  if (body.status !== undefined) {
    if (body.status !== "pending" && body.status !== "approved" && body.status !== "rejected") {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    change.status = body.status;
  }
  if (body.selected !== undefined) {
    if (typeof body.selected !== "boolean") return NextResponse.json({ error: "Invalid selected value." }, { status: 400 });
    change.selected = body.selected;
  }
  const row = moderatePuebloAnswer(Number(params.id), change);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ answer: { id: row.id, status: row.status, selected: Boolean(row.selected) } });
}
