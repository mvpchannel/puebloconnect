import Link from "next/link";

// Cross-promotes the real Report & Track feature (src/app/(site)/reports)
// from the Pueblo Live pages — a sidebar widget, same slot/pattern as the
// "Deal of the Day" widget on the newsfeed. Links straight to the real
// report form, nothing decorative or fake behind the button.
export default function SeeSomethingPromo() {
  return (
    <div
      className="widget stick-widget"
      style={{
        marginTop: 20,
        background: "linear-gradient(135deg, #0f1f3d, #16305c)",
        borderRadius: 6,
        overflow: "hidden",
        padding: "22px 20px",
        color: "#fff",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: "bold", letterSpacing: 0.5, color: "#f5a623" }}>
        <i className="fa fa-map-marker" style={{ marginRight: 6 }} />
        NEIGHBOR-POWERED ACTION
      </span>
      <h4 style={{ color: "#fff", margin: "8px 0 6px", fontSize: 18, lineHeight: 1.3 }}>
        See something?
        <br />
        Say something.
      </h4>
      <p style={{ color: "#c3cfe6", fontSize: 13, marginBottom: 16 }}>
        A streetlight out, a sidewalk hazard, a park that needs attention — snap a photo and get it on the
        neighborhood&rsquo;s radar.
      </p>
      <Link
        href="/reports#report-form"
        className="mtr-btn signup"
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <span>
          <i className="fa fa-camera" style={{ marginRight: 6 }} />
          Start a Report
        </span>
      </Link>
    </div>
  );
}
