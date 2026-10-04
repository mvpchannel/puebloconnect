// Turns the share/watch URL a host pastes in (what YouTube/Facebook/
// Vimeo actually hand you when you copy a broadcast's link) into the
// <iframe> src each platform's embed player actually needs — those are
// different URLs, and pasting the watch-page URL straight into an
// <iframe> either refuses to render (YouTube/Vimeo) or shows nothing
// (Facebook, which needs its plugin wrapper). Pure string transforms, no
// network calls — if a URL doesn't match a known shape, the original URL
// is returned as-is so an unusual-but-valid link (already an /embed/
// URL, say) still works rather than being mangled.

export function toEmbedSrc(platform: "youtube" | "facebook" | "vimeo", url: string): string {
  try {
    const parsed = new URL(url);

    if (platform === "youtube") {
      if (parsed.pathname.startsWith("/embed/")) return url;
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.slice(1);
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      // A channel/live URL with no video id yet (stream not started) —
      // YouTube's "embed a channel's current live broadcast" URL shape.
      const channelMatch = parsed.pathname.match(/^\/channel\/([^/]+)/);
      if (channelMatch) {
        return `https://www.youtube.com/embed/live_stream?channel=${channelMatch[1]}`;
      }
      return url;
    }

    if (platform === "facebook") {
      if (parsed.hostname.includes("plugins") && parsed.pathname.includes("/plugins/video.php")) {
        return url;
      }
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
    }

    if (platform === "vimeo") {
      if (parsed.hostname.includes("player.vimeo.com")) return url;
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
      return url;
    }

    return url;
  } catch {
    return url;
  }
}
