import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/require-user";
import { countUsers, listBusinesses, listEvents } from "@/lib/db";

export const metadata: Metadata = {
  title: "Pueblo Connect — Connect Local. Shop Local. Grow Together.",
};

type FeatureCard = {
  href: string;
  icon: string;
  title: string;
  description: string;
};

// Real features only — every card below links to a page that actually
// exists and works (confirmed real end-to-end in this session's site
// audit), described in what it actually does, not vendor-template
// marketing language. No stock "community" photography either (this
// theme's /images/resources are vendor demo stock photos of unrelated
// people — using them here would misrepresent who's actually on Pueblo
// Connect), just the same icon font already used across the real site.
const FEATURES: FeatureCard[] = [
  {
    href: "/newsfeed",
    icon: "ti-home",
    title: "Newsfeed",
    description: "Post, follow, like, and comment with your neighbors — the real heart of Pueblo Connect.",
  },
  {
    href: "/reports",
    icon: "ti-location-pin",
    title: "Report & Track",
    description: "See a street light out, a pothole, or a dumped item? Snap a photo and get it on the city's radar.",
  },
  {
    href: "/live",
    icon: "ti-video-camera",
    title: "Pueblo Live",
    description: "Watch and go live with the community — real streaming, not a demo.",
  },
  {
    href: "/businesses",
    icon: "ti-shopping-cart",
    title: "Business Channels",
    description: "Browse local businesses, follow your favorites, and see their deals, menus, and job postings.",
  },
  {
    href: "/events",
    icon: "ti-calendar",
    title: "Events",
    description: "Find what's happening around the Pueblo, RSVP, and check in when you get there.",
  },
  {
    href: "/groups",
    icon: "ti-user",
    title: "Groups",
    description: "Join or start a group around anything — a neighborhood, a hobby, a cause.",
  },
  {
    href: "/deals",
    icon: "ti-tag",
    title: "Pueblo Deals",
    description: "Real, claimable deals from real local businesses.",
  },
  {
    href: "/best-of",
    icon: "ti-star",
    title: "Best of the Pueblo",
    description: "Vote for your favorites each season and see the Pueblo's Hall of Fame winners.",
  },
  {
    href: "/rewards",
    icon: "ti-gift",
    title: "Pueblo Rewards",
    description: "Earn points for the things you already do — posting, voting, showing up — and climb the leaderboard.",
  },
  {
    href: "/passport",
    icon: "ti-world",
    title: "Pueblo Passport",
    description: "Collect stamps automatically as you visit businesses, check in to events, and explore the Pueblo.",
  },
  {
    href: "/booth",
    icon: "ti-comment-alt",
    title: "The Pueblo Booth",
    description: "A new community question every week — answer it and see what your neighbors said.",
  },
  {
    href: "/street-team",
    icon: "ti-camera",
    title: "Pueblo Street Team",
    description: "Share your own photos and videos from around town — approved submissions go up in a public gallery.",
  },
];

// Public landing page at "/" — previously just an unconditional redirect
// straight to /login, so a brand-new visitor saw a sign-in form before
// ever being told what Pueblo Connect is. An already-signed-in visitor
// still skips straight past this to their real home.
export default async function LandingPage() {
  const session = await getCurrentUser();
  if (session) {
    redirect("/newsfeed");
  }

  const memberCount = countUsers();
  const businessCount = listBusinesses(500).length;
  const upcomingEventCount = listEvents("upcoming", 500).length;

  return (
    <>
      <link rel="stylesheet" href="/css/landing.css" />
      <Header />

      <section className="landing-hero">
        <h1>Connect Local. Shop Local. Grow Together.</h1>
        <p>
          Pueblo Connect is the community-focused social network for Pueblo
          residents and local businesses — powered by The Daily Pueblo.
          Free to use, for as long as you want.
        </p>
        <div className="landing-hero-ctas">
          <Link href="/login?register=1" title="" className="primary">
            Join Pueblo Connect
          </Link>
          <Link href="/login" title="" className="secondary">
            Sign In
          </Link>
          <Link href="/about" title="" className="secondary">
            What is Pueblo Connect?
          </Link>
        </div>

        <div className="landing-stats">
          <div>
            <strong>{memberCount.toLocaleString()}</strong>
            <span>Neighbors</span>
          </div>
          <div>
            <strong>{businessCount.toLocaleString()}</strong>
            <span>Local Businesses</span>
          </div>
          <div>
            <strong>{upcomingEventCount.toLocaleString()}</strong>
            <span>Upcoming Events</span>
          </div>
        </div>
      </section>

      <div className="landing-wrap">
        <div className="landing-section-title">
          <h2>Everything your Pueblo needs in one place</h2>
          <p>Every card below is a real, working part of Pueblo Connect — not a preview.</p>
        </div>
        <div className="landing-grid">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href} title="" className="landing-card">
              <i className={f.icon} />
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="landing-closing">
        <h2>Ready to join your neighbors?</h2>
        <p>It&rsquo;s free, and it only takes a minute.</p>
        <Link href="/login?register=1" title="">
          Create your free account
        </Link>
      </div>

      <Footer />
    </>
  );
}
