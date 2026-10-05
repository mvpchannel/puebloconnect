// Stand-in images shown wherever a real photo hasn't been added yet.
// They're deliberately labelled "placeholder" so nobody mistakes them for
// real content. Swap any of these files in public/images/placeholders/
// (same filename) to change them everywhere, or upload a real photo and
// it takes over automatically.
export const PLACEHOLDER = {
  businessLogo: "/images/placeholders/business-logo.png",
  businessCover: "/images/placeholders/business-cover.png",
  eventCover: "/images/placeholders/event-cover.png",
  groupCover: "/images/placeholders/group-cover.png",
  cover: "/images/placeholders/cover-default.png",
  spotlight: "/images/placeholders/spotlight.png",
  classified: "/images/placeholders/classified.png",
  stream: "/images/placeholders/stream.png",
} as const;
