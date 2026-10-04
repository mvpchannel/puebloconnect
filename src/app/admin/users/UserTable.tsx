"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/db";

/**
 * Real user management — not a mockup. Calls PATCH/DELETE
 * /api/admin/users/:id, which checks for an admin session itself (see
 * src/lib/require-admin.ts) on top of the page-level middleware check.
 * Ported from winku admin/user-mangement.html's table layout; the
 * original's bulk-select checkboxes and "export" button were decorative
 * (no handler in the vendor template either) and aren't reimplemented —
 * marked below rather than silently carried over as if they worked.
 */
export default function UserTable({
  initialUsers,
  currentUserId,
}: {
  initialUsers: PublicUser[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(id: number, role: "member" | "admin") {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't update that user.");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(id: number, username: string) {
    if (!confirm(`Delete ${username}? This can't be undone.`)) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't delete that user.");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" style={{ color: "#e02020", marginBottom: 12 }}>
          {error}
        </p>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const busy = busyId === u.id;
            return (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.created_at}</td>
                <td>
                  {u.role === "member" ? (
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={busy}
                      onClick={() => changeRole(u.id, "admin")}
                    >
                      Make admin
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-secondary"
                      disabled={busy || isSelf}
                      title={isSelf ? "You can't remove your own admin access." : ""}
                      onClick={() => changeRole(u.id, "member")}
                    >
                      Remove admin
                    </button>
                  )}{" "}
                  <button
                    className="btn btn-sm btn-danger"
                    disabled={busy || isSelf}
                    title={isSelf ? "You can't delete your own account from here." : ""}
                    onClick={() => removeUser(u.id, u.username)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {users.length === 0 && <p>No users.</p>}
    </div>
  );
}
