import type { Metadata } from "next";
import { listUsers, countUsers } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin",
};

// Real, working, role-gated admin page — reachable only if middleware.ts
// confirmed a valid session with role === 'admin' (see src/middleware.ts).
// This replaces the old winku admin/ static HTML panel's complete lack of
// access control for at least this one page; the rest of that panel still
// needs to be ported here page by page to get the same real protection
// (see FUNCTIONALITY_STATUS.md).
export default function AdminPage() {
  const users = listUsers();
  const total = countUsers();

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1>Pueblo Connect — Admin</h1>
      <p>
        You&rsquo;re seeing this page because your session has <code>role: admin</code>.
        Anyone without that role is redirected to <code>/newsfeed</code> before this
        page ever renders — enforced in <code>src/middleware.ts</code>, not just hidden
        in the UI.
      </p>

      <h2>Users ({total})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th style={{ padding: "8px 4px" }}>ID</th>
            <th style={{ padding: "8px 4px" }}>Username</th>
            <th style={{ padding: "8px 4px" }}>Email</th>
            <th style={{ padding: "8px 4px" }}>Role</th>
            <th style={{ padding: "8px 4px" }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px 4px" }}>{u.id}</td>
              <td style={{ padding: "8px 4px" }}>{u.username}</td>
              <td style={{ padding: "8px 4px" }}>{u.email}</td>
              <td style={{ padding: "8px 4px" }}>{u.role}</td>
              <td style={{ padding: "8px 4px" }}>{u.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && <p>No users yet.</p>}

      <p style={{ marginTop: 32, color: "#666", fontSize: 14 }}>
        STATUS: this page only reads and lists real users from the database —
        it&rsquo;s a real, working example of an authenticated admin page, not a
        full admin panel. The other admin screens (tickets, reviews, location
        management, etc.) still live as static HTML in{" "}
        <code>../pueblo-connect/winku admin/</code> and need to be ported here,
        one page at a time, to get this same real protection.
      </p>
    </div>
  );
}
