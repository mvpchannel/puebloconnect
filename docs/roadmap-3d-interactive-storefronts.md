# Roadmap notes: 3D interactive storefronts for Explore the Pueblo in 3D

Status: **reference / not started.** Captured verbatim from the owner's notes
on 2026-10-03 so the idea isn't lost. Nothing in this file is built — see
`src/app/(site)/explore-3d/` for what exists today (a Phase 1 prototype:
walkable avatar, The Daily Pueblo building, Pueblo Connect HQ, a handful of
sample business buildings — see `src/lib/pueblo3d/places.ts`'s own status
note on placeholder business data).

This describes a **physical capture pipeline** (360° photography or
Matterport-style scanning of real locations) plus a **new interactive layer**
on top of the existing 3D engine. It is a separate, larger effort from
anything built in a code session so far — it needs real photo/scan equipment
and a decision on which businesses to capture first, not just more code.

## The three tiers

1. **Pueblo Virtual Business — 360° Pueblo Tour.** ~6-15 photographed
   positions per business, viewer clicks arrows/hotspots to move between
   them (Street View style). Cheap, fast, good for getting many local
   businesses participating.
2. **Pueblo Interactive Business — Full 3D Digital Twin.** Full spatial scan
   of the interior (Matterport-style) so visitors feel like they're actually
   walking through it. Best for restaurants, event venues, real estate,
   gyms, larger retailers.
3. **Pueblo 3D Premier Business — Pueblo Interactive Store.** Takes the
   captured/scanned business and adds Pueblo Connect interactive layers on
   top:
   - A floating "TODAY'S PUEBLO DEAL" button near the counter → claim deal
   - A virtual TV showing "WATCH THIS BUSINESS LIVE" → links to that
     business's Pueblo Live broadcast
   - A "VIEW MENU" hotspot
   - "MEET THE OWNER — Watch Video" — a filmed owner intro shot in the real
     space (e.g. "Welcome to Highland Café. We've been serving this
     community for 18 years...")
   - "GET DIRECTIONS | CALL | RESERVE | FOLLOW | SHARE" hotspots
   - Optional: video of the owner/staff in action (chef prepping a dish, a
     barber demonstrating a haircut, a bookstore owner recommending books,
     a nonprofit explaining its services) — gives the space personality
     beyond a static photo tour.

## Suggested first proof-of-concept

One real Daily Pueblo advertiser, one location, minimal gear (one 360
camera + tripod/monopod + smartphone):

> exterior storefront → clickable door → 360° interior (5-8 movement
> points: outside → entrance → front room → counter → seating → important
> displays → back area if appropriate) → Pueblo Deal hotspot → owner video →
> exit back to the 3D Pueblo map

Once that works, it becomes the template to duplicate for every advertiser.
Only after the proof-of-concept would it make sense to decide whether
premium-package businesses get full Matterport-style scanning instead of
the simpler 360° tour.

## Proposed advertiser packages (examples — not finalized)

Prices are illustrative; they'd be set for real once capture/hosting cost per
location is known.

| Package | Setup | Includes |
|---|---|---|
| Pueblo Virtual Business | $299 | 360° interior tour + business profile + one Pueblo Deal |
| Pueblo Interactive Business | $599 | Larger walkthrough + interactive products/menu + owner video + deals + events |
| Pueblo 3D Premier Business | $999+ | Full digital twin + custom 3D storefront + Pueblo Live integration + interactive advertising + featured placement |

Plus an ongoing $29-99/month to keep the virtual location active, update
deals/content, and provide analytics.

## Beyond businesses

Not limited to paying advertisers — churches, schools, museums, community
centers, historic locations, and event venues could eventually be scanned
too. In the 3D Pueblo map, walking into The Daily Pueblo's building could
lead to:
- A newsroom, with a desk you can walk up to → "📰 READ THIS MONTH'S DAILY
  PUEBLO"
- A television → "🔴 PUEBLO LIVE"
- A door → "🏛️ PUEBLO HISTORY ROOM"

At that point Explore the Pueblo in 3D stops being just a map and becomes a
navigable digital community.

## What this would actually take to build

Not evaluated yet — flagged here so it isn't forgotten when this gets
picked up:
- A real capture/scanning workflow (equipment, who does it, how often)
- Hosting for 360°/3D scan assets (likely well beyond what SQLite + this
  app's current `data/` directory is set up for)
- A hotspot/interactive-layer data model: per-location hotspot type (deal,
  menu, owner-video, live, directions/call/reserve/follow/share), position,
  and what it links to in Pueblo Connect's real data (a business's deals,
  menu, streams, etc. — once those exist)
- Decide how this interacts with the existing Phase 1 `explore-3d` engine:
  replace it, or layer scanned/captured locations into the same walkable
  city alongside the current simple building boxes
