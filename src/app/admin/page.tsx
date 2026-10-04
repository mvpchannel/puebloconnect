import type { Metadata } from "next";
import { listUsers, countUsers } from "@/lib/db";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Real, working, role-gated dashboard — reachable only if middleware.ts
// confirmed a valid session with role === 'admin' (see src/middleware.ts).
// Ported from winku admin/index.html's overall page structure (top-bar +
// sidebar now live in AdminChrome via admin/layout.tsx); the vendor
// template's decorative content below the fold (a fake "profile banner"
// editor, fake activity feed with a hardcoded "Stephen N. Arellano") was
// not carried over — it wasn't a real feature, just demo filler for a
// theme preview. Replaced with a real summary of what the data layer
// actually has today.
export default function AdminDashboardPage() {
  const total = countUsers();
  const users = listUsers();
  const admins = users.filter((u) => u.role === "admin").length;
  const members = total - admins;
  const recent = users.slice(0, 5);

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 20 }}>Dashboard</h2>

        <div className="row" style={{ marginBottom: 30 }}>
          <div className="col-md-4">
            <div className="widget-box" style={cardStyle}>
              <h3 style={{ margin: 0, fontSize: 32 }}>{total}</h3>
              <p style={{ margin: 0, color: "#888" }}>Total users</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="widget-box" style={cardStyle}>
              <h3 style={{ margin: 0, fontSize: 32 }}>{members}</h3>
              <p style={{ margin: 0, color: "#888" }}>Members</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="widget-box" style={cardStyle}>
              <h3 style={{ margin: 0, fontSize: 32 }}>{admins}</h3>
              <p style={{ margin: 0, color: "#888" }}>Admins</p>
            </div>
          </div>
        </div>

        <h4>Recently joined</h4>
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recent.length === 0 && <p>No users yet.</p>}

        <p style={{ marginTop: 32, color: "#888", fontSize: 13 }}>
          STATUS: the numbers and table above are real, read live from the
          database — not sample data. Everything else in this admin panel
          (tickets, reviews, calendar, location management, etc.) is still
          the ported vendor demo UI with no real data behind it yet; see{" "}
          <code>FUNCTIONALITY_STATUS.md</code> for the page-by-page
          breakdown.
        </p>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 6,
  padding: "20px",
  textAlign: "center",
};
