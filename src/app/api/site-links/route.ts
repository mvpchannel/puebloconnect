import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/db";
import { SOCIAL_NETWORKS } from "@/lib/social-links";

// GET /api/site-links — the social media accounts to show in the site footer (public).
export const dynamic = "force-dynamic";

export async function GET() {
  const saved = getSiteSettings(SOCIAL_NETWORKS.map((n) => n.key));
  const links = SOCIAL_NETWORKS.filter((n) => saved[n.key]).map((n) => ({
    key: n.key,
    label: n.label,
    icon: n.icon,
    url: saved[n.key],
  }));
  return NextResponse.json({ links });
}
