// Pueblo Connect 3D City — place/building data.
//
// STATUS: placeholder content. Pueblo Connect has no real business
// directory backend yet (see FUNCTIONALITY_STATUS.md — "Searchable
// business directory" is still 🟡 needs backend). These five businesses
// plus the two community buildings are illustrative sample content so the
// Phase 1 prototype has something real to walk up to and click, exactly
// like the rate card on /advertise is real copy but not live ad inventory.
//
// When a real business directory exists, replace `PLACES` below with data
// fetched from that API (e.g. a server component passing `places` as a
// prop into <Explore3DClient>) — nothing else in the engine needs to
// change, since the engine only depends on the `Place` shape.

export type PlaceCategory = "community" | "news" | "business";

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  categoryLabel: string;
  description: string;
  /** Position of the building's center on the ground plane. */
  x: number;
  z: number;
  /** Building footprint/height in scene units. */
  width: number;
  height: number;
  depth: number;
  /** Base color for the building mass (hex, e.g. 0xe63b35). */
  color: number;
  /**
   * Real route to send the member to for this place, if one exists today.
   * Left undefined when nothing real exists to link to yet — the UI shows
   * an honest "not built yet" note instead of a dead or fake link.
   */
  href?: string;
  hrefLabel?: string;
  /** Rooftop billboard text, drawn by the engine when present. */
  billboard?: { headline: string; detail?: string };
  /** True for illustrative placeholder buildings that are not real businesses. */
  sample?: boolean;
};

export const PLACES: Place[] = [
  {
    id: "hq",
    name: "Pueblo Connect Headquarters",
    category: "community",
    categoryLabel: "COMMUNITY",
    description:
      "The digital heart of Pueblo Connect — your newsfeed, profile, and account live here.",
    x: -30,
    z: -30,
    width: 20,
    height: 13,
    depth: 16,
    color: 0xe63b35,
    href: "/newsfeed",
    hrefLabel: "Go to Newsfeed",
  },
  {
    id: "daily",
    name: "The Daily Pueblo",
    category: "news",
    categoryLabel: "NEWS & MEDIA",
    description:
      "Community news, stories and the Pueblo digital newsstand. A full newsroom section is planned for a later phase.",
    x: 30,
    z: -30,
    width: 22,
    height: 12,
    depth: 16,
    color: 0xf4c542,
  },
  {
    id: "cafe",
    name: "Pueblo Café",
    category: "business",
    categoryLabel: "LOCAL BUSINESS",
    sample: true,
    description: "Coffee, breakfast and a neighborhood place to connect. Sample business — not a real Pueblo Connect member yet.",
    x: -30,
    z: 28,
    width: 18,
    height: 9,
    depth: 14,
    color: 0xc7794b,
  },
  {
    id: "market",
    name: "Pueblo Market",
    category: "business",
    categoryLabel: "LOCAL BUSINESS",
    sample: true,
    description: "Local groceries, fresh food and community specials. Sample business — not a real Pueblo Connect member yet.",
    x: 30,
    z: 28,
    width: 20,
    height: 10,
    depth: 15,
    color: 0x5aa66f,
  },
  {
    id: "grill",
    name: "Main Street Grill",
    category: "business",
    categoryLabel: "LOCAL BUSINESS",
    sample: true,
    description: "Neighborhood food and specials. Sample business — not a real Pueblo Connect member yet.",
    x: -55,
    z: 28,
    width: 17,
    height: 9,
    depth: 14,
    color: 0xb95f4b,
  },
  {
    id: "books",
    name: "Pueblo Books & Arts",
    category: "business",
    categoryLabel: "LOCAL BUSINESS",
    sample: true,
    description: "Books, local authors, art and community creativity. Sample business — not a real Pueblo Connect member yet.",
    x: 55,
    z: 28,
    width: 18,
    height: 10,
    depth: 14,
    color: 0x7163a8,
  },
  {
    id: "shop",
    name: "Pueblo Family Shop",
    category: "business",
    categoryLabel: "LOCAL BUSINESS",
    sample: true,
    description: "A locally owned neighborhood store. Sample business — not a real Pueblo Connect member yet.",
    x: 55,
    z: -30,
    width: 18,
    height: 9,
    depth: 14,
    color: 0x4d91bd,
  },
];

export function getPlaceById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

// The community and news buildings, which are always in the city.
export const LANDMARKS: Place[] = PLACES.filter((p) => !p.sample);
// Placeholder businesses, shown only while no real business has a storefront.
export const SAMPLE_BUSINESSES: Place[] = PLACES.filter((p) => p.sample);

// Hiding spots for treasure drops: open ground away from every building,
// tree and storefront lot (checked by a test against the building footprints).
export const DROP_SPOTS: { id: string; label: string; x: number; z: number }[] = [
  { id: "plaza", label: "Beside the plaza", x: 8, z: 6 },
  { id: "north-trees", label: "By the north-west trees", x: -14, z: -14 },
  { id: "main-east", label: "East end of Main Street", x: 75, z: 0 },
  { id: "main-west", label: "West end of Main Street", x: -75, z: 0 },
  { id: "behind-hq", label: "Behind Headquarters", x: -30, z: -48 },
  { id: "behind-daily", label: "Behind The Daily Pueblo", x: 30, z: -48 },
  { id: "north-field", label: "North field", x: 0, z: -70 },
  { id: "south-lawn", label: "South lawn", x: 0, z: 45 },
  { id: "between-shops", label: "Between the café and the market", x: 0, z: 28 },
  { id: "nw-corner", label: "Far north-west corner", x: -80, z: -80 },
  { id: "ne-corner", label: "Far north-east corner", x: 80, z: -80 },
];
