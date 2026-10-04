import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getUserById, updateUserRole, deleteUser, countAdmins } from "@/lib/db";

// PATCH /api/admin/users/:id  — body: { role: "member" | "admin" }
// DELETE /api/admin/users/:id
//
// Real admin actions, not decorative buttons: both require an admin
// session (checked here directly, not just by middleware.ts — see
// src/lib/require-admin.ts for why), and both refuse to let an admin
// demote/delete themselves or remove the last remaining admin, so the
// panel can't lock everyone out of itself.

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const targetId = Number(params.id);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { role } = (body ?? {}) as Record<string, unknown>;
  if (role !== "member" && role !== "admin") {
    return NextResponse.json({ error: "Role must be 'member' or 'admin'." }, { status: 400 });
  }

  const target = getUserById(targetId);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (targetId === admin.sub && role === "member") {
    return NextResponse.json(
      { error: "You can't remove your own admin access." },
      { status: 400 }
    );
  }
  if (target.role === "admin" && role === "member" && countAdmins() <= 1) {
    return NextResponse.json(
      { error: "Can't demote the last remaining admin." },
      { status: 400 }
    );
  }

  updateUserRole(targetId, role);
  return NextResponse.json({ user: getUserById(targetId) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const targetId = Number(params.id);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const target = getUserById(targetId);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (targetId === admin.sub) {
    return NextResponse.json(
      { error: "You can't delete your own account from here." },
      { status: 400 }
    );
  }
  if (target.role === "admin" && countAdmins() <= 1) {
    return NextResponse.json(
      { error: "Can't delete the last remaining admin." },
      { status: 400 }
    );
  }

  deleteUser(targetId);
  return NextResponse.json({ ok: true });
}
