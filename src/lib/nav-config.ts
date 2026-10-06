// The site's navigation, defined once. The desktop top menu, the mobile menu
// and the left "Shortcuts" sidebar all read from here, so they can never drift
// apart. Static previews are generated from the same list.
//
// Audit notes (what changed from the old menu):
//  - Old top row: Home, Timeline, Account settings, More pages. "More pages" held
//    20 links in one long list, "Timeline" held one link and "Home" listed the
//    login page even to people who were logged in.
//  - New top row: 7 items. Single links stand alone; the rest are short groups
//    (4 to 8 links) named for what the visitor wants to do.
//  - Account links (profile, settings, messages, log in/out) live in the avatar
//    menu on desktop and in a "My account" section on mobile.
//  - Company pages (About, Contact, Terms, Privacy, Sitemap) moved into "More".

export type NavItem = { label: string; href: string; icon: string };
export type NavGroup = {
  label: string;
  /** A group with an href and no items is a plain link in the top row. */
  href?: string;
  icon?: string;
  items?: NavItem[];
};

export const NAV_PRIMARY: NavGroup[] = [
  { label: "Home", href: "/newsfeed", icon: "ti-home" },
  { label: "Pueblo Live", href: "/live", icon: "ti-video-camera" },
  {
    label: "What’s On",
    items: [
      { label: "Events", href: "/events", icon: "ti-calendar" },
      { label: "Happening Tonight", href: "/tonight", icon: "ti-timer" },
      { label: "What’s Happening", href: "/happening", icon: "ti-pulse" },
      { label: "Media Hub", href: "/media", icon: "ti-video-clapper" },
      { label: "We Asked the Pueblo", href: "/we-asked", icon: "ti-comments" },
    ],
  },
  {
    label: "Local Business",
    items: [
      { label: "Business Channels", href: "/businesses", icon: "ti-briefcase" },
      { label: "Pueblo Deals", href: "/deals", icon: "ti-tag" },
      { label: "Business Spotlight", href: "/spotlight", icon: "ti-medall" },
      { label: "Classifieds", href: "/classifieds", icon: "ti-clipboard" },
      { label: "Best of the Pueblo", href: "/best-of", icon: "ti-crown" },
      { label: "Advertise", href: "/advertise", icon: "ti-announcement" },
      { label: "Business Membership", href: "/membership", icon: "ti-id-badge" },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Inbox", href: "/messages", icon: "ti-mouse-alt" },
      { label: "Groups", href: "/groups", icon: "ti-files" },
      { label: "Friends", href: "/friends", icon: "ti-user" },
      { label: "Members Near You", href: "/nearby", icon: "ti-location-pin" },
      { label: "Pueblo Street Team", href: "/street-team", icon: "ti-camera" },
      { label: "The Pueblo Booth", href: "/booth", icon: "ti-microphone-alt" },
      { label: "Report & Track", href: "/reports", icon: "ti-flag-alt-2" },
    ],
  },
  {
    label: "Explore & Rewards",
    items: [
      { label: "Explore the Pueblo in 3D", href: "/explore-3d", icon: "ti-world" },
      { label: "Pueblo Pass", href: "/pass", icon: "ti-credit-card" },
      { label: "Pueblo Passport", href: "/passport", icon: "ti-id-badge" },
      { label: "Pueblo Rewards", href: "/rewards", icon: "ti-star" },
      { label: "My Treasures", href: "/treasures", icon: "ti-gift" },
    ],
  },
  {
    label: "More",
    items: [
      { label: "About Pueblo Connect", href: "/about", icon: "ti-info-alt" },
      { label: "Contact us", href: "/contact", icon: "ti-email" },
      { label: "Terms & conditions", href: "/terms", icon: "ti-write" },
      { label: "Privacy policy", href: "/privacy", icon: "ti-lock" },
      { label: "Sitemap", href: "/sitemap-page", icon: "ti-map-alt" },
    ],
  },
];

/** Account links for the mobile menu (desktop has the avatar menu). */
export const NAV_ACCOUNT: NavItem[] = [
  { label: "My profile", href: "/profile", icon: "ti-user" },
  { label: "Account settings", href: "/account-settings", icon: "ti-settings" },
  { label: "Messages", href: "/messages", icon: "ti-comment" },
];
