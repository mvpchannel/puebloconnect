// Minimal service worker — exists to satisfy PWA installability (Chrome/
// Android requires a registered service worker with a fetch handler before
// it will fire the `beforeinstallprompt` event used by InstallAppButton).
//
// Deliberately does NOT cache anything. This app is session/cookie-backed
// (see src/lib/session.ts) and every page renders per-request data (likes,
// unread counts, who's logged in) — caching responses here would risk
// serving a signed-out shell to a signed-in member, or stale report/stream
// status. So every fetch just passes straight through to the network,
// same as if this file didn't exist at all for request handling; it only
// exists to be "a service worker that's there."
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
