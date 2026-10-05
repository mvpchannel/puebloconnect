import { isAnyStreamHost } from "./safe-url";

// Turns the share/watch URL a host pastes in (what YouTube/Facebook/
// Vimeo actually hand you when you copy a broadcast's link) into the
// <iframe> src each platform's embed player actually needs — those are
// different URLs, and pasting the watch-page URL straight into an
// <iframe> either refuses to render (YouTube/Vimeo) or shows nothing
// (Facebook, which needs its plugin wrapper). Pure string transforms, no
// network calls — if a URL doesn't match a known shape, the original URL
// is returned as-is so an unusual-but-valid link (already an /embed/
// URL, say) still works rather than being mangled.

// startSeconds is for jumping a VOD replay to a highlight-clip
// timestamp — honestly supported only where the platform's embed URL
// has a real seek parameter (YouTube's `start`, Vimeo's `#t=`).
// Facebook's plugin embed has no reliable unauthenticated seek param,
// so a Facebook clip is a label only — never a fake jump.
function buildEmbedSrc(
  platform: "youtube" | "facebook" | "vimeo",
  url: string,
  startSeconds?: number
): string {
  try {
    const parsed = new URL(url);

    if (platform === "youtube") {
      const withStart = (base: string) =>
        startSeconds && startSeconds > 0
          ? `${base}${base.includes("?") ? "&" : "?"}start=${Math.floor(startSeconds)}`
          : base;

      if (parsed.pathname.startsWith("/embed/")) return withStart(url);
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.slice(1);
        if (id) return withStart(`https://www.youtube.com/embed/${id}`);
      }
      const v = parsed.searchParams.get("v");
      if (v) return withStart(`https://www.youtube.com/embed/${v}`);
      // A channel/live URL with no video id yet (stream not started) —
      // YouTube's "embed a channel's current live broadcast" URL shape.
      const channelMatch = parsed.pathname.match(/^\/channel\/([^/]+)/);
      if (channelMatch) {
        return `https://www.youtube.com/embed/live_stream?channel=${channelMatch[1]}`;
      }
      return withStart(url);
    }

    if (platform === "facebook") {
      if (parsed.hostname.includes("plugins") && parsed.pathname.includes("/plugins/video.php")) {
        return url;
      }
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
    }

    if (platform === "vimeo") {
      const withStart = (base: string) =>
        startSeconds && startSeconds > 0 ? `${base}#t=${Math.floor(startSeconds)}s` : base;
      if (parsed.hostname.includes("player.vimeo.com")) return withStart(url);
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match) return withStart(`https://player.vimeo.com/video/${match[1]}`);
      return withStart(url);
    }

    return url;
  } catch {
    return url;
  }
}

// Public entry point. The iframe src is re-checked against the
// supported-platform host allowlist, so a row saved before validation
// existed (or any URL the transforms above passed through unchanged)
// can never frame an arbitrary site.
export function toEmbedSrc(
  platform: "youtube" | "facebook" | "vimeo",
  url: string,
  startSeconds?: number
): string {
  const src = buildEmbedSrc(platform, url, startSeconds);
  return isAnyStreamHost(src) ? src : "about:blank";
}
