// Static hero banner for /reports — page-specific, like PuebloLiveHero,
// not a redesign of the sitewide Header/Sidebar.
export default function ReportsHero() {
  return (
    <div
      className="central-meta item"
      style={{
        background: "linear-gradient(120deg, #0f1f3d, #16305c)",
        color: "#fff",
        padding: "36px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 24,
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <span style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 1, color: "#f5a623" }}>
          <i className="fa fa-map-marker" style={{ marginRight: 6 }} />
          NEIGHBOR-POWERED ACTION
        </span>
        <h2 style={{ color: "#fff", margin: "10px 0 12px", fontSize: 30, lineHeight: 1.25 }}>
          See something?
          <br />
          Let&rsquo;s get it fixed.
        </h2>
        <p style={{ color: "#c3cfe6", marginBottom: 20 }}>
          A streetlight out, a sidewalk hazard, or a park that needs attention — send a quick report to get it on the
          neighborhood&rsquo;s radar.
        </p>
        <a
          href="#report-form"
          className="mtr-btn signup"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <span>
            <i className="fa fa-camera" style={{ marginRight: 6 }} />
            Start a Report
          </span>
        </a>
      </div>
      <div
        aria-hidden
        style={{
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(245,166,35,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: "rgba(245,166,35,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i className="fa fa-map-marker" style={{ fontSize: 42, color: "#f5a623" }} />
        </div>
      </div>
    </div>
  );
}
