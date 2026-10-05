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


// The Pueblo's local time zone. Servers run in UTC, so "today" and
// "tonight" must be computed in this zone, not the server's.
export const PUEBLO_TZ = "America/Los_Angeles";

function puebloOffsetMs(at: Date): number {
  // Offset (ms) to add to a UTC instant to get Pueblo wall-clock time.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PUEBLO_TZ, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

// The instant the current Pueblo calendar day ends (next local midnight).
export function endOfPuebloDay(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + puebloOffsetMs(now));
  const localMidnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  // Convert that wall-clock midnight back to a real instant.
  let guess = new Date(localMidnightAsUtc - puebloOffsetMs(now));
  guess = new Date(localMidnightAsUtc - puebloOffsetMs(guess)); // settle across a DST change
  return guess;
}

export function formatPuebloTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { timeZone: PUEBLO_TZ, hour: "numeric", minute: "2-digit" });
}
