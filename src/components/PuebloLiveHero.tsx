import LiveGoLiveButton from "./LiveGoLiveButton";

// Pueblo Live page header: broadcast mark, wordmark, tagline and the
// red Go Live button (opens the real create/schedule form).
export default function PuebloLiveHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "20px 28px",
        marginBottom: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 18,
        boxShadow: "0 1px 6px rgba(11,42,91,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="7" fill="#e8261e" />
            <path d="M17 17a15 15 0 0 0 0 22M39 17a15 15 0 0 1 0 22" stroke="#e8261e" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M9 9a27 27 0 0 0 0 38M47 9a27 27 0 0 1 0 38" stroke="#e8261e" strokeWidth="4" strokeLinecap="round" fill="none" />
          </svg>
          <h1 style={{ margin: 0, fontSize: 42, fontWeight: 900, color: "#0b2a5b", letterSpacing: 0.5, lineHeight: 1 }}>
            PUEBLO LIVE
          </h1>
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0b2a5b", lineHeight: 1.15 }}>
            Your Community. <span style={{ color: "#1673f0" }}>Live.</span>
          </div>
          <div style={{ color: "#4b5b73", fontSize: 14, marginTop: 4 }}>
            Northeast Los Angeles &bull; Local People &bull; Local Businesses &bull; Local Events
          </div>
        </div>
      </div>
      <LiveGoLiveButton isLoggedIn={isLoggedIn} />
    </div>
  );
}
