type Level = { key: string; label: string; threshold: number; unlocked: boolean };
type HistoryEntry = { id: number; action: string; label: string; points: number; createdAt: string };
type LeaderboardRow = { userId: number; name: string; totalPoints: number };

type RewardsPanelProps = {
  totalPoints: number;
  levels: Level[];
  currentLevel: Level;
  history: HistoryEntry[];
  leaderboard: LeaderboardRow[];
  viewerId: number | null;
};

// Read-only display — every point shown here was earned automatically
// by using the rest of Pueblo Connect (posting, following a business,
// reviewing, RSVPing, checking in, claiming deals, voting, answering
// the Booth, getting a Street Team submission approved, collecting
// Passport stamps). Real backend: GET /api/rewards.
export default function RewardsPanel({
  totalPoints,
  levels,
  currentLevel,
  history,
  leaderboard,
  viewerId,
}: RewardsPanelProps) {
  const nextLevel = levels.find((l) => !l.unlocked);

  return (
    <div>
      <div className="central-meta item" style={{ padding: 20, marginBottom: 20 }}>
        <h4 style={{ marginBottom: 4 }}>{totalPoints} points</h4>
        <p style={{ margin: "0 0 12px", color: "#2a8f2a", fontWeight: 600 }}>{currentLevel.label}</p>
        {nextLevel && (
          <p style={{ fontSize: 13, color: "#999", margin: 0 }}>
            {nextLevel.threshold - totalPoints} more to reach {nextLevel.label}
          </p>
        )}
        <div style={{ marginTop: 14 }}>
          {levels.map((l) => (
            <span
              key={l.key}
              style={{
                display: "inline-block",
                marginRight: 8,
                marginBottom: 6,
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 12,
                background: l.unlocked ? "#2a8f2a" : "#eee",
                color: l.unlocked ? "#fff" : "#999",
              }}
            >
              {l.label} ({l.threshold})
            </span>
          ))}
        </div>
      </div>

      <div className="row">
        <div className="col-md-7">
          <div className="central-meta item" style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Recent activity</h4>
            {history.length === 0 && (
              <p style={{ color: "#888" }}>
                No points yet — post on a wall, follow a business, RSVP to an event, or try
                anything else around the site to start earning.
              </p>
            )}
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                <span>{h.label}</span>
                <span style={{ color: "#2a8f2a", fontWeight: 600 }}>+{h.points}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-md-5">
          <div className="central-meta item" style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Leaderboard</h4>
            {leaderboard.length === 0 && <p style={{ color: "#888" }}>No points earned yet.</p>}
            {leaderboard.map((row, i) => (
              <div
                key={row.userId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: row.userId === viewerId ? 700 : 400,
                }}
              >
                <span>
                  {i + 1}. {row.name}
                  {row.userId === viewerId ? " (you)" : ""}
                </span>
                <span>{row.totalPoints}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
