// Small relative-time formatter for "published: 2 hours ago" labels.
// SQLite's datetime('now') (used for every created_at column in db.ts)
// stores "YYYY-MM-DD HH:MM:SS" in UTC with no timezone suffix — appending
// "Z" is what makes `new Date(...)` parse it as UTC instead of the
// server's local time.
export function formatRelativeTime(sqliteUtcDatetime: string): string {
  const date = new Date(sqliteUtcDatetime.replace(" ", "T") + "Z");
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 30) return "just now";
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
