type Stamp = {
  id: number;
  category: "business" | "event" | "pueblo_live" | "explore_3d" | "daily_pueblo";
  refId: number | null;
  label: string;
  createdAt: string;
};

type Reward = { key: string; label: string; threshold: number; unlocked: boolean };

type PassportPanelProps = {
  stamps: Stamp[];
  rewards: Reward[];
};

const CATEGORY_ICONS: Record<Stamp["category"], string> = {
  business: "🏪",
  event: "🎉",
  pueblo_live: "🔴",
  explore_3d: "🧭",
  daily_pueblo: "📰",
};

// Read-only display — stamps are earned automatically by visiting
// business channels, checking into events, watching Pueblo Live, and
// exploring in 3D (see PassportVisitBeacon and the events check-in
// route). Real backend: GET /api/passport.
export default function PassportPanel({ stamps, rewards }: PassportPanelProps) {
  const nextReward = rewards.find((r) => !r.unlocked);

  return (
    <div>
      <div className="central-meta item" style={{ padding: 20, marginBottom: 20 }}>
        <h4 style={{ marginBottom: 12 }}>Rewards</h4>
        {rewards.map((r) => (
          <div key={r.key} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{r.unlocked ? "🏅" : "🔒"}</span>
            <span style={{ fontWeight: r.unlocked ? 600 : 400, color: r.unlocked ? "#2a8f2a" : "#888" }}>
              {r.label} — {r.threshold} stamps
            </span>
          </div>
        ))}
        <p style={{ fontSize: 13, color: "#999", marginTop: 10, marginBottom: 0 }}>
          {stamps.length} stamp{stamps.length === 1 ? "" : "s"} collected
          {nextReward && ` — ${nextReward.threshold - stamps.length} more to unlock ${nextReward.label}`}
        </p>
      </div>

      <div className="central-meta item" style={{ padding: 20 }}>
        <h4 style={{ marginBottom: 12 }}>Your stamps</h4>
        {stamps.length === 0 && (
          <p style={{ color: "#888" }}>
            No stamps yet — visit a business channel, check into an event, watch Pueblo Live, or
            explore the Pueblo in 3D to start collecting.
          </p>
        )}
        {stamps.map((s) => (
          <div key={s.id} style={{ marginBottom: 10, fontSize: 14 }}>
            {CATEGORY_ICONS[s.category]} {s.label}
            <span style={{ color: "#999", fontSize: 12, marginLeft: 8 }}>
              {new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
