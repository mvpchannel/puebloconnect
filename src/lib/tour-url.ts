// Validates a virtual-tour link and turns it into a safe <iframe> src.
// Only three providers are accepted, and the embed address is rebuilt from a
// strictly validated ID, so the stored value is never an arbitrary address.
export type TourProvider = "youtube" | "vimeo" | "matterport";
export type ParsedTour = { provider: TourProvider; embedSrc: string };

export const TOUR_PROVIDER_LABEL: Record<TourProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  matterport: "Matterport",
};

export function parseTourUrl(raw: unknown): ParsedTour | { error: string } {
  const fail = { error: "Use a YouTube, Vimeo or Matterport link." };
  if (typeof raw !== "string") return fail;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return fail;
  }
  if (u.protocol !== "https:") return { error: "The link must start with https://" };
  if (u.username || u.password) return fail;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com") {
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? null;
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? null;
    else id = u.searchParams.get("v");
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      return { provider: "youtube", embedSrc: `https://www.youtube.com/embed/${id}` };
    }
    return { error: "That YouTube link doesn't point to a single video." };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = /^\/(?:video\/)?(\d{5,12})(?:\/|$)/.exec(u.pathname);
    if (m) return { provider: "vimeo", embedSrc: `https://player.vimeo.com/video/${m[1]}` };
    return { error: "That Vimeo link doesn't point to a single video." };
  }

  if (host === "my.matterport.com") {
    const id = u.searchParams.get("m");
    if (u.pathname.startsWith("/show") && id && /^[A-Za-z0-9]{8,16}$/.test(id)) {
      return { provider: "matterport", embedSrc: `https://my.matterport.com/show/?m=${id}` };
    }
    return { error: "Use the Matterport share link (my.matterport.com/show/?m=…)." };
  }

  return fail;
}
