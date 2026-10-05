// Shared by the classifieds API (validation) and UI (labels).
export const CLASSIFIED_CATEGORIES = [
  { value: "for-sale", label: "Items for sale" },
  { value: "services", label: "Services" },
  { value: "wanted", label: "Wanted" },
  { value: "free", label: "Free stuff" },
  { value: "announcements", label: "Announcements" },
] as const;

export type ClassifiedCategory = (typeof CLASSIFIED_CATEGORIES)[number]["value"];

export function isClassifiedCategory(v: unknown): v is ClassifiedCategory {
  return CLASSIFIED_CATEGORIES.some((c) => c.value === v);
}

export function classifiedCategoryLabel(v: string): string {
  return CLASSIFIED_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

// Listings stay up this long, then drop off the board.
export const CLASSIFIED_LIFETIME_DAYS = 30;
