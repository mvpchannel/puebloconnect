// Page-specific banner for the Pueblo Live section — scoped to this
// page only, not a redesign of the sitewide Header/Sidebar chrome.
// No "Go Live" button here: stream creation is the real
// StreamCreateForm already on the list page, right below this banner
// — a second button here would just have to fake-navigate to it.
export default function PuebloLiveHero({ liveCount }: { liveCount?: number }) {
  return (
    <div
      className="central-meta item"
      style={{
        background: "linear-gradient(120deg, #1a1a1a, #2c2c2c)",
        color: "#fff",
        padding: "22px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#e02020",
            display: "inline-block",
            boxShadow: "0 0 0 rgba(224,32,32,0.6)",
            animation: "pc-live-pulse 1.6s infinite",
          }}
        />
        <div>
          <h4 style={{ margin: 0, letterSpacing: 1, color: "#fff" }}>PUEBLO LIVE</h4>
          <span style={{ color: "#bbb", fontSize: 13 }}>
            Watch, chat, and earn Pueblo Rewards with your community — live.
          </span>
        </div>
      </div>
      {typeof liveCount === "number" && liveCount > 0 && (
        <span style={{ color: "#f5a623", fontSize: 13, fontWeight: 600 }}>
          <i className="fa fa-circle" style={{ marginRight: 6, fontSize: 9 }} />
          {liveCount} live now
        </span>
      )}
      <style>{`
        @keyframes pc-live-pulse {
          0% { box-shadow: 0 0 0 0 rgba(224,32,32,0.55); }
          70% { box-shadow: 0 0 0 9px rgba(224,32,32,0); }
          100% { box-shadow: 0 0 0 0 rgba(224,32,32,0); }
        }
      `}</style>
    </div>
  );
}
