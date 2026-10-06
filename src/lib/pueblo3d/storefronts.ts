// Turns real businesses with a 3D storefront into Place objects for the engine.
// Pure functions only (no database import), so this is safe to use anywhere.
import type { Place } from "./places";

export type StorefrontInput = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  storefront_lot: number;
  storefront_color: string | null;
  billboard_text?: string | null;
};

/** A business's current live deal, used for the billboard when no custom headline is set. */
export type BillboardDeal = { title: string; discount_text: string } | null;

// One row of lots along z = 62, centered on x = 0. The row sits in front of the
// existing buildings, and the "Walk here" spot (z + depth/2 + 7 = 75) stays
// inside the world boundary (92).
const LOT_X = [-75, -50, -25, 0, 25, 50, 75];
const LOT_Z = 62;
export const DEFAULT_STOREFRONT_COLOR = "#c7794b";

export function parseHexColor(hex: string | null): number {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex ?? "");
  return parseInt((m ? m[1] : DEFAULT_STOREFRONT_COLOR.slice(1)), 16);
}

// Billboard content: the admin-set headline if there is one, otherwise the
// business's current active deal, otherwise no billboard at all (never filler).
export function billboardFor(
  customText: string | null | undefined,
  deal: BillboardDeal
): { headline: string; detail?: string } | undefined {
  const custom = (customText ?? "").trim();
  if (custom) return { headline: custom.slice(0, 60) };
  if (deal) return { headline: deal.title.slice(0, 60), detail: deal.discount_text.slice(0, 40) };
  return undefined;
}

export function storefrontToPlace(b: StorefrontInput, deal: BillboardDeal = null): Place {
  const desc = (b.description ?? "").trim();
  return {
    id: `biz-${b.id}`,
    name: b.name,
    category: "business",
    categoryLabel: "LOCAL BUSINESS",
    description: desc ? (desc.length > 180 ? `${desc.slice(0, 177)}…` : desc) : "A Pueblo Connect business.",
    x: LOT_X[b.storefront_lot] ?? 0,
    z: LOT_Z,
    width: 18,
    height: 9 + (b.id % 3) * 1.5,
    depth: 12,
    color: parseHexColor(b.storefront_color),
    href: `/businesses/${b.slug}`,
    hrefLabel: "Open business page",
    billboard: billboardFor(b.billboard_text, deal),
    deal: deal ? { title: deal.title.slice(0, 80), detail: deal.discount_text.slice(0, 60) } : null,
  };
}
