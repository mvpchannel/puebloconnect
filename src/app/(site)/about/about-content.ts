// Programs shown on /about. Descriptions follow the owner's program
// breakdown. `status` reflects what exists in the app today:
//   live     — a working page/feature exists (href points to it)
//   prototype— an early version exists
//   soon     — planned, not built yet
// Edit statuses here as programs launch.
export type Status = "live" | "prototype" | "soon";
export type Program = { name: string; description: string; status: Status; href?: string };
export type ProgramGroup = { title: string; icon: string; programs: Program[] };

export const INTRO = [
  "Pueblo Connect is the digital town square for our community: one local platform made of connected programs. Each does a different job, but they all push toward the same goal — discover the community, interact with it, and spend locally.",
  "Residents create a profile, follow people and businesses, discover local news, communicate, see events, find deals and reach every other Pueblo program. Membership for residents is free, because the bigger the community grows, the more valuable it becomes for everyone in it.",
];

export const FLOW =
  "The Daily Pueblo → Pueblo Connect → Pueblo Pass → Pueblo Points → Pueblo Deals → Local Business → Pueblo Live → Events → Explore in 3D → Real-world visit → Reward → Return to Pueblo Connect";

export const FLOW_NOTE =
  "Pueblo Connect isn't one program. It's the digital infrastructure connecting The Daily Pueblo, residents, businesses and the physical community.";

export const GROUPS: ProgramGroup[] = [
  {
    title: "The Community",
    icon: "ti-user",
    programs: [
      { name: "Pueblo Connect — The Main Platform", status: "live", href: "/newsfeed", description: "The central community network and home for everything else. Create a profile, follow people and businesses, share, communicate and reach the other Pueblo programs." },
      { name: "Pueblo Community Groups", status: "live", href: "/groups", description: "Residents organize around neighborhoods and interests — parents, youth sports, schools, local history, business owners, arts, churches, community improvement and more." },
      { name: "Pueblo People / People Nearby", status: "live", href: "/nearby", description: "Discover other participating members, follow people and build neighborhood connections, with privacy and location controls." },
      { name: "Pueblo Messages & Notifications", status: "live", href: "/messages", description: "Messaging keeps conversations inside the platform. Notifications tell you when someone responds, a business you follow posts, or something relevant happens in your Pueblo." },
      { name: "Pueblo Photo & Video", status: "live", href: "/newsfeed", description: "Members, businesses and Pueblo Connect share neighborhood photographs and videos — community storytelling in pictures." },
      { name: "Best of the Pueblo / People's Choice", status: "live", href: "/best-of", description: "Residents vote for favorite restaurants, businesses, services, events and community organizations. Winners earn recognition in Pueblo Connect and The Daily Pueblo." },
      { name: "Pueblo Street Team", status: "live", href: "/street-team", description: "The real-world side of Pueblo Connect: representatives at community events who help businesses join, register members and connect the digital product with actual neighborhoods." },
    ],
  },
  {
    title: "Local Business",
    icon: "ti-shopping-cart",
    programs: [
      { name: "Pueblo Business", status: "live", href: "/businesses", description: "Local businesses get their own presence: name, photos, address, hours, description, contact information, promotions and links, with more advanced tools available through business memberships." },
      { name: "Pueblo Business Directory", status: "live", href: "/businesses", description: "A searchable local directory. Instead of searching the whole internet, find restaurants, markets, auto repair, attorneys, salons, contractors, doctors, nonprofits, churches and more — right here in the Pueblo." },
      { name: "Pueblo Business Channel", status: "live", href: "/businesses", description: "Follow a business and see its deals, announcements, videos and events — a mini media channel for every local business." },
      { name: "Pueblo Jobs", status: "live", href: "/businesses", description: "Local employers post openings for people in the surrounding community, in one central place." },
      { name: "Pueblo Advertising", status: "live", href: "/advertise", description: "Sponsored posts, featured businesses, directory upgrades, banners, category sponsorships, deals and events for businesses that want to reach the local audience." },
      { name: "Pueblo Classifieds", status: "live", href: "/classifieds", description: "Inexpensive community listings for services, items and announcements." },
      { name: "Pueblo Business Spotlight", status: "live", href: "/spotlight", description: "A more substantial feature than an advertisement — a business's story, owner, history, products and community connection." },
      { name: "Own Your Block", status: "prototype", href: "/own-your-block", description: "A premium sponsorship: a business becomes a prominent sponsor of a neighborhood, category or Pueblo Connect area." },
      { name: "Pueblo 360° Advertising", status: "prototype", href: "/360-advertising", description: "One campaign across The Daily Pueblo, Pueblo Connect, Deals, Pass, Live, Events and the 3D Pueblo." },
    ],
  },
  {
    title: "Deals & Rewards",
    icon: "ti-gift",
    programs: [
      { name: "Pueblo Deals", status: "live", href: "/deals", description: "The local offers marketplace: 20% off dinner tonight, buy two tacos and get one free, $10 off a service. A reason to come back often." },
      { name: "Pueblo Flash Deals", status: "live", href: "/deals", description: "The urgent version of Deals — offers that last a few hours or a day, like “25% off from 4–7 PM today.”" },
      { name: "Pueblo Pass", status: "soon", description: "The digital membership card for the Pueblo. Eventually, show your Pass at participating businesses to unlock discounts, events, rewards and special experiences." },
      { name: "Pueblo Points", status: "live", href: "/rewards", description: "Earn points for activities that benefit the community — visiting businesses, checking into events, exploring the 3D Pueblo, watching Pueblo Live, referring friends. Redeem them for participating-business rewards." },
      { name: "Pueblo Passport", status: "live", href: "/passport", description: "Exploring the community as a game. Collect digital stamps for visiting participating places and earn badges like “Taste of the Pueblo.”" },
      { name: "Pueblo Check-In", status: "live", href: "/events", description: "Check in at participating events and businesses to earn Points, Passport stamps and rewards." },
    ],
  },
  {
    title: "What's Happening",
    icon: "ti-calendar",
    programs: [
      { name: "Pueblo Events", status: "live", href: "/events", description: "The community calendar: festivals, farmers markets, school events, sports, nonprofit activities, cultural celebrations, performances and more." },
      { name: "Pueblo Live", status: "live", href: "/live", description: "The community's live-video network — restaurant openings, chef demos, high-school sports, community meetings, festivals, interviews and concerts." },
      { name: "What's Happening in the Pueblo?", status: "soon", description: "Instead of searching, see what's interesting right now: trending stories, events, deals, popular businesses, conversations, photos and live broadcasts." },
      { name: "What's Happening Tonight?", status: "live", href: "/tonight", description: "Open it and see what's on today and tonight: food specials, live music, family activities, sports, meetings, Live broadcasts and Flash Deals." },
      { name: "Pueblo Media Hub", status: "soon", description: "Watch. Read. Discover. Connect. Pueblo Live broadcasts and replays, Daily Pueblo content and other Pueblo-produced media in one place." },
      { name: "The Daily Pueblo Digital Connection", status: "soon", description: "Newspaper stories and ads carry QR codes into Pueblo Connect — an ad leads to its Deal, an article to a video, an event story to registration." },
      { name: "We Asked the Pueblo", status: "soon", description: "Residents answer questions about neighborhoods, schools, businesses and culture; selected answers appear both online and in The Daily Pueblo." },
    ],
  },
  {
    title: "Explore the Pueblo in 3D",
    icon: "ti-world",
    programs: [
      { name: "Explore the Pueblo in 3D", status: "prototype", href: "/explore-3d", description: "A virtual version of the Pueblo you can walk through, discovering businesses, The Daily Pueblo, Pueblo HQ and community destinations. Movement, destinations and navigation work today; the social and business features come next." },
      { name: "3D Business Storefronts", status: "soon", description: "Branded locations inside the 3D Pueblo — walk up, click, and see a business's profile, deal, menu, website or video." },
      { name: "360° Virtual Business Tours", status: "soon", description: "Walk to a business in the 3D Pueblo, select ENTER BUSINESS, and explore the real interior through connected 360° views." },
      { name: "Pueblo 3D Advertising", status: "soon", description: "Billboards, building signs, banners and sponsored areas inside the virtual community." },
      { name: "Pueblo Drops / Treasure Hunts", status: "soon", description: "Digital prizes, coupons and “Golden Pueblo Tickets” hidden in the 3D Pueblo — a reason to keep coming back." },
    ],
  },
];
