# Admin pages: what each one does today

The old vendor-template demo screens (made-up people, numbers and ticket threads) are gone.
Every admin page below is a real tool that reads or writes real data. Last updated 2026-10-06.

| Page | What it does |
| --- | --- |
| Dashboard | Overview (`/admin`) |
| Inbox | The signed-in admin's real conversations |
| Create a post | Post text, a photo or a video to the newsfeed; list latest posts; delete any post |
| Share a link | Post a web address, with an optional note, to the newsfeed |
| Post a photo | Crop and post a photo to the newsfeed or as a 24-hour story |
| Crop image | Crop a photo in the browser and download it (nothing saved on the site) |
| Preview a post | Write a post, see a simplified preview, then publish it |
| Notifications | Send an in-app announcement to every active member; see reach; take it back |
| Contact messages | Messages from the Contact page, with a Status (New / Read / Replied / Closed) |
| Reviews | All business reviews, star filter, delete |
| Traffic | Page views vs unique visitors over time, traffic sources, visitor locations, most visited pages |
| Locations | Business directory with addresses, map links, "no address" filter |
| Calendar | Month view of community events in Pueblo (Los Angeles) time |
| Connect accounts | Social media addresses shown in the footer's Follow column |
| Edit profile | The admin's own name, city, about text and profile photo |

Not built (by design, for now): editing or scheduling posts, link preview cards, sending
announcements by email, editing events from the calendar, map pins (businesses store an
address, not coordinates), and posting to the social networks from the site.

Traffic counting: each page sends a note to /api/track when it opens. It stores the page, a one-way visitor code (never the IP), the source and, when the host supplies it (e.g. Cloudflare), a rough location. No cookies; bots, the admin area and Do Not Track visitors are skipped. Update the Privacy page to say so (needs legal review).
