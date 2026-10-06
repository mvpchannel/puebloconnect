// The social media accounts staff can link in the site footer. Each address must be
// https and on that network's own site, so a typo or a pasted wrong link can't send
// visitors somewhere unexpected.

export type SocialNetwork = { key: string; label: string; icon: string; hosts: string[]; example: string };

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { key: "social_facebook", label: "Facebook", icon: "fa-facebook-square", hosts: ["facebook.com", "fb.com"], example: "https://www.facebook.com/yourpage" },
  { key: "social_instagram", label: "Instagram", icon: "fa-instagram", hosts: ["instagram.com"], example: "https://www.instagram.com/youraccount" },
  { key: "social_x", label: "X (Twitter)", icon: "fa-twitter-square", hosts: ["x.com", "twitter.com"], example: "https://x.com/youraccount" },
  { key: "social_youtube", label: "YouTube", icon: "fa-youtube-play", hosts: ["youtube.com", "youtu.be"], example: "https://www.youtube.com/@yourchannel" },
  { key: "social_tiktok", label: "TikTok", icon: "fa-music", hosts: ["tiktok.com"], example: "https://www.tiktok.com/@youraccount" },
];

// Returns the cleaned address, "" for blank (meaning: remove it), or null when it isn't valid for that network.
export function cleanSocialUrl(network: SocialNetwork, raw: string): string | "" | null {
  const value = raw.trim();
  if (!value) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const ok = network.hosts.some((h) => host === h || host.endsWith(`.${h}`));
  return ok ? u.toString() : null;
}
