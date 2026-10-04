import Link from "next/link";

type MiniReport = {
  id: number;
  category: string;
  description: string;
  status: string;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  street_light: "Street light outage",
  dumped_item: "Dumped item",
  park_maintenance: "Park maintenance",
  traffic_hazard: "Traffic hazard",
  other: "Other",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  submitted: { text: "Submitted", color: "#999" },
  acknowledged: { text: "Acknowledged", color: "#1877d1" },
  in_progress: { text: "In Progress", color: "#f5a623" },
  resolved: { text: "Resolved", color: "#2a8f2a" },
  closed: { text: "Closed", color: "#999" },
};

// Real counts from the signed-in member's own reports (listNeighborhoodReports
// with reporterId) — not decorative placeholder numbers. Logged-out visitors
// see the same shell with zeros and a log-in prompt, since there's nothing
// of theirs to count yet.
export default function ReportsDashboard({
  isLoggedIn,
  myReports,
}: {
  isLoggedIn: boolean;
  myReports: MiniReport[];
}) {
  const inProgressCount = myReports.filter((r) => r.status === "acknowledged" || r.status === "in_progress").length;
  const resolvedCount = myReports.filter((r) => r.status === "resolved" || r.status === "closed").length;
  const recent = myReports.slice(0, 3);

  return (
    <>
      <div className="row merged20" style={{ marginBottom: 20 }}>
        <div className="col-md-4">
          <div className="central-meta item" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <i className="fa fa-file-text-o" style={{ fontSize: 20, color: "#1877d1" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{myReports.length}</div>
              <div style={{ color: "#999", fontSize: 12.5 }}>Your reports</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="central-meta item" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <i className="fa fa-clock-o" style={{ fontSize: 20, color: "#f5a623" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{inProgressCount}</div>
              <div style={{ color: "#999", fontSize: 12.5 }}>Being followed up</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="central-meta item" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <i className="fa fa-check-circle" style={{ fontSize: 20, color: "#2a8f2a" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{resolvedCount}</div>
              <div style={{ color: "#999", fontSize: 12.5 }}>Resolved</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row merged20">
        <div className="col-md-8">
          <div className="central-meta item">
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>My Reports</h4>
                <a href="#report-form" style={{ fontSize: 13 }}>
                  + New report
                </a>
              </div>
              {!isLoggedIn && (
                <p style={{ color: "#888" }}>
                  <a href="/login">Log in</a> to submit and track your own reports.
                </p>
              )}
              {isLoggedIn && recent.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <i className="fa fa-file-text-o" style={{ fontSize: 30, color: "#ddd", marginBottom: 10 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Your first report starts here.</p>
                  <p style={{ color: "#999", fontSize: 13 }}>Notice something that could use attention? Share it below.</p>
                </div>
              )}
              {recent.map((r) => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0", color: "inherit" }}
                >
                  <span>
                    <strong>{CATEGORY_LABELS[r.category] || r.category}</strong>
                    <span style={{ color: "#999", marginLeft: 8, fontSize: 12.5 }}>{r.description.slice(0, 60)}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: "bold", color: STATUS_LABELS[r.status]?.color }}>
                    {STATUS_LABELS[r.status]?.text}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="central-meta item">
            <div style={{ padding: 20 }}>
              <span style={{ fontSize: 11, fontWeight: "bold", color: "#1877d1", letterSpacing: 0.5 }}>
                COMMUNITY NOTE
              </span>
              <h5 style={{ margin: "8px 0" }}>Help crews find the right spot</h5>
              <p style={{ color: "#888", fontSize: 13 }}>
                Add the nearest cross street and a clear photo when you report a non-emergency issue. For immediate
                danger, call 911.
              </p>
              <p style={{ color: "#bbb", fontSize: 11.5, marginBottom: 0 }}>
                Report &amp; Track isn&rsquo;t an emergency service.
              </p>
            </div>
          </div>

          <div className="central-meta item">
            <div style={{ padding: 20 }}>
              <h5 style={{ marginBottom: 10 }}>Better reports, better follow-through</h5>
              <ol style={{ paddingLeft: 18, color: "#555", fontSize: 13, margin: 0 }}>
                <li style={{ marginBottom: 6 }}>Choose the closest issue type.</li>
                <li style={{ marginBottom: 6 }}>Add a cross street or landmark.</li>
                <li>Attach a photo link if it&rsquo;s safe to do so.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
