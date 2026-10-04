# Admin demo pages: what's real vs. vendor sample content

Status: **reference / not started.** This is the file every one of the 12
pages below points to in its own `STATUS: visual port of the vendor demo UI
only ... see FUNCTIONALITY_STATUS.md` comment — that file never actually
existed until now, so this replaces that stale pointer.

None of these 12 routes have been deleted or built out. This file exists so
the backlog is scoped and decision-ready instead of a vague "needs backend"
note repeated 12 times. For each page: what the vendor template actually
shows, what's fake, what real work it would take, and — most importantly —
whether it overlaps with a Pueblo Connect feature that's *already real*
elsewhere in the app (posts + moderation, notifications, the Contact Us
inbox, friends/messages, Report & Track).

## Cross-cutting findings (read this part first)

- **All 12 pages share the same vendor chrome** — a profile banner, fake
  follower/project/following counts, two sample notification dropdowns
  (Alexander / BuddyPress / BP-Tricks), and a social-icon row. All of it is
  decorative (`href="#"`, no handlers) in every single page. This is one
  shared concern (admin's own profile/notification chrome, separate from
  the member-facing Header.tsx this session already made real), not 12
  separate ones.
- **Four of the twelve are near-duplicates**: `/admin/posting-panel`,
  `/admin/link-posting`, `/admin/image-cropper`, and `/admin/image-opener`
  all render essentially the same body — the same `AdminPostForm` composer,
  the same vendor activity feed (poster "Diana Dare", themeforest.net
  sample links, five named sample commenters), and the same hardcoded
  8-person "My Friends List" sidebar (literal text: "You have 522
  Freinds" — the vendor template's own typo). `image-cropper` and
  `image-opener` don't contain any actual crop/photo-picker UI despite
  their names — they're mislabeled copies of the composer page, not
  unbuilt versions of a distinct feature.
- **`/admin/calendar` is the least-built of all of them** — its body is a
  single empty `<div className="clndr"></div>`. The vendor's calendar
  widget (a jQuery plugin) was never ported in, so there's no sample data,
  no grid, nothing — just the shared chrome around an empty box.
- **`/admin/inbox` is the strongest "don't build a second one" case** —
  it's a two-pane 1:1 chat UI with a hardcoded conversation ("Bob Frank,"
  4 sample messages), and Pueblo Connect already has a real
  friends/messages feature (`src/app/api/messages/*`, the `messages`
  table). This page duplicates that rather than filling a gap.

## Page by page

### `/admin/tickets-1`
- **What it is:** A support-ticket thread view with a reply box.
- **Fake data:** Sender "Marketingmike77," a lorem-ish ticket body, a nested
  fake reply, the shared vendor notification chrome, follower/project/
  following counts (1,245 / 535 / 994).
- **Dead interactive elements:** `AdminReplyForm`'s reply box doesn't
  persist anywhere; profile-banner file input, notification dropdowns,
  social icons, and emoji-rating icons are all `href="#"`.
- **To make real:** a `tickets` table (subject/body, requester, status,
  created_at), a `ticket_replies` table, `/api/admin/tickets` (list +
  reply), and real persistence behind `AdminReplyForm`.
- **Overlaps a real feature?** No — Pueblo Connect has no support-ticket
  system. The Contact Us form (`contact_messages`, built this session) is
  the closest real analog for "a member asking for help," so a real
  ticket system should probably be designed as the admin-side *reply* half
  of that inbox, not a separate ticket concept.

### `/admin/tickets-2`
- **What it is:** Despite the name, this isn't a ticket queue — it's a
  social activity feed (posts + comment threads + like/share counts)
  mislabeled "Ticketing."
- **Fake data:** User "Bspotted" with three dated sample posts, comments
  from "Peter Alexander" and "Eva De Villers," like/comment/share counts.
- **Dead interactive elements:** "Reply" links, comment-thread toggle,
  emoji-rating icons, notification chrome — all non-functional.
- **To make real:** if kept as a second ticket view, same backend as
  tickets-1. As actually built, it would need a generic `comments` table
  keyed to whatever it threads on, plus like/share counters.
- **Overlaps a real feature?** Conceptually yes — this looks more like
  real post/comment activity than a ticket queue, which is itself a sign
  this route may be redundant with the real posts feature rather than a
  distinct thing worth building.

### `/admin/post-preview`
- **What it is:** Shows one draft rendered as it would look posted to
  five different *external* networks — Facebook, Google+, Twitter,
  SMS/text, and Foursquare.
- **Fake data:** Poster "Felix Russell," garbled lorem text, a fake phone
  number, a fake location ("Cosa Nostra La Gelateria"), per-platform stock
  images, character counters.
- **Dead interactive elements:** `PostPreviewForm`, a raw file input, and
  every per-platform Save/Edit/Delete dropdown and Like/Comment/+1/retweet
  icon — all `href="#"`.
- **To make real:** Pueblo Connect only has one internal feed — it doesn't
  cross-post to Facebook/Twitter/G+/Foursquare — so the whole multi-network
  premise doesn't map to anything real unless that's an actual planned
  feature. A real version of "preview before it posts" would be a single
  preview of the real `posts` row before creation, not five fake ones.
- **Overlaps a real feature?** Yes, partially — "preview before it's
  live" is a real and reasonable idea for the real posts/moderation
  feature. The multi-social-network angle specifically has no real
  equivalent and shouldn't be built as-is.

### `/admin/locations`
- **What it is:** A business-directory "Locations Management" list —
  three cards with address, phone, website, hours.
- **Fake data:** Three identical "Finance Industry" cards, same fake
  address/phone/website/hours on each, stock images.
- **Dead interactive elements:** "Edit" links per location — no edit form
  exists at all.
- **To make real:** a `locations` table (name, address, phone, website,
  hours, banner image), `/api/admin/locations` CRUD, a real edit form.
- **Overlaps a real feature?** No — nothing in the real feature set
  (posts, notifications, contact_messages, friends/messages, Report &
  Track) is a business directory. This is net-new scope, not a gap-fill,
  and whether Pueblo Connect wants a business directory at all is a
  product question, not a backend one.

### `/admin/posting-panel`
- **What it is:** An admin post composer + the shared vendor activity feed
  + a "My Friends List" sidebar. See the cross-cutting note above — this
  is one of the four near-duplicate composer pages.
- **Fake data:** Poster "Diana Dare," themeforest.net sample links, five
  named sample commenters, the 8-person hardcoded friends list.
- **Dead interactive elements:** feed filter tabs, comment reply form,
  Like/Comment/Send links, comment Edit/Delete dropdowns — none wired.
- **To make real:** wire `AdminPostForm` to the real posts API (worth
  checking whether it already partially is — it's a shared component),
  replace the vendor feed with a real query, replace the hardcoded friends
  list with the real friends table.
- **Overlaps a real feature?** Yes, significantly — the composer overlaps
  with real post creation/moderation, and the sidebar duplicates the real
  friends feature. Most of what's "missing" here is vendor chrome wrapped
  around things that already have a real backend elsewhere, not new scope.

### `/admin/reviews`
- **What it is:** A moderation panel for *third-party template* reviews
  (ratings/likes on marketplace-style listings), with timeframe/group/
  location/star-rating filters.
- **Fake data:** Three fake template listings ("80's Mod," "Dictate,"
  "Lifeline NGO and Charity"), identical boilerplate descriptions, fake
  like/share counts.
- **Dead interactive elements:** every filter dropdown, "Mark As Read,"
  "Create Ticket," and "View All Reviews" — all `href="#"`.
- **To make real:** a `reviews` table, filter/query support, an
  `/api/admin/reviews` route, and (since "Create Ticket" implies it) a
  dependency on a real ticket system too.
- **Overlaps a real feature?** No — this is leftover marketplace-template
  content (reviews of design *templates*, not of anything Pueblo Connect
  actually has). Doesn't correspond to any real feature and may not even
  fit Pueblo Connect's purpose as a community app.

### `/admin/connect`
- **What it is:** A settings page for linking/unlinking third-party social
  accounts (Facebook, Twitter, Google+, Foursquare) to the admin profile.
- **Fake data:** A fake "Your Activated Accounts" list with made-up
  connected handles for each network.
- **Dead interactive elements:** every connect/disconnect icon —
  `href="#"`, no OAuth flow, no toggle logic.
- **To make real:** real OAuth integration per network, a
  `connected_accounts` table (user_id, provider, external_id, token), and
  connect/disconnect routes. This is a substantial, security-sensitive
  feature (real API keys, real OAuth consent screens per provider), not a
  simple CRUD page.
- **Overlaps a real feature?** No — there's no existing account-linking
  feature to extend. Likely out of scope for a community-app admin panel
  unless there's a specific reason to post Pueblo Connect content to
  external social networks.

### `/admin/link-posting`
- **What it is:** Byte-for-byte the same composer + feed + friends-list
  body as `/admin/posting-panel`, just a different title/route ("Share a
  Link").
- **Fake/dead/to-make-real:** identical to posting-panel above.
- **Overlaps a real feature?** Yes — and it duplicates posting-panel
  itself, not just real features elsewhere. These two routes look like two
  vendor-template variants of one composer concept that were both ported
  rather than picking one.

### `/admin/inbox`
- **What it is:** A two-pane 1:1 direct-message chat UI — friends list on
  the left, one active conversation on the right.
- **Fake data:** The same 8-person friends list as the composer pages, one
  hardcoded chat with "Bob Frank" (4 sample messages).
- **Dead interactive elements:** message compose form, emoji picker,
  "Add Files"/"Add Photos" file inputs, "Send" link — nothing persists or
  delivers.
- **To make real:** this is the one page on this list that shouldn't be
  built as a *new* backend — Pueblo Connect already has real
  friends/messages (`src/app/api/messages/*`, the real `messages` table,
  the real `/messages` page members use). The right fix here, if an admin
  messaging view is wanted at all, is restyling this page to call the
  existing real messages API, not building a second message store.
- **Overlaps a real feature?** Yes, directly.

### `/admin/image-cropper`
- **What it is:** Named "Crop Image," but the actual page body is the same
  posting-panel/link-posting composer + feed + friends list. There is no
  crop tool, canvas, or crop UI anywhere in this file.
- **Fake/dead:** same as posting-panel, plus it's simply mislabeled.
- **To make real:** if image cropping is an actually-wanted feature (e.g.
  for the avatar upload this session already built in Account Settings,
  or for post photos), this page needs to be built from scratch with a
  real crop library and an endpoint to persist the cropped result — the
  current file has no cropping logic to extend.
- **Overlaps a real feature?** Same overlap as posting-panel (real
  posts, real friends) — plus it doesn't deliver on its own name at all.

### `/admin/image-opener`
- **What it is:** Named "Post a Photo," same situation as image-cropper —
  functionally identical to the posting-panel body, no distinct photo-
  picker UI present.
- **Fake/dead/to-make-real:** same as posting-panel/image-cropper above.
- **Overlaps a real feature?** Same as the other three composer-variant
  pages — this is effectively a fourth near-duplicate of one vendor
  template, not four different unbuilt features.

### `/admin/calendar`
- **What it is:** A calendar/scheduling page whose body is a single empty
  `<div className="clndr"></div>` — the vendor's actual calendar widget
  (a jQuery plugin) was never ported in.
- **Fake data:** None at all — no events, no sample dates, nothing.
- **Dead interactive elements:** none present (there's nothing to click);
  only the shared profile/notification chrome around the empty box.
- **To make real:** a full feature from zero — an `events` table (title,
  date/time, location, created_by), a real calendar UI actually rendered
  into that div, and `/api/admin/events` CRUD. Lowest effort to document,
  highest effort to actually build, since literally nothing exists yet
  even visually.
- **Overlaps a real feature?** No.

## If/when this backlog gets picked up

Priority, if any of these get built for real:

1. **`/admin/inbox`** — replace with the real messages API rather than
   building anything new. Smallest real effort on this list.
2. **A real reply mechanism for Contact Us submissions** (`tickets-1`'s
   actual useful idea) — extend `contact_messages` with a status/reply
   flow instead of inventing a separate ticket system.
3. **Consolidate the four composer duplicates** (`posting-panel`,
   `link-posting`, `image-cropper`, `image-opener`) into one real admin
   post-composer wired to the real posts API, and delete the other three
   routes rather than maintaining four copies of the same page.
4. Everything else (`tickets-2`, `post-preview`'s multi-network angle,
   `locations`, `reviews`, `connect`, `calendar`) is net-new product scope
   with no existing feature to extend — each is a product decision
   ("do we actually want a business directory / OAuth social linking /
   a calendar?") before it's a backend task.
