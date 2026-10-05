"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./explore-3d.module.css";
import type { Place } from "@/lib/pueblo3d/places";
import type { CityEngine, DropMarker } from "@/lib/pueblo3d/engine";

type SessionUser = { id: number; username: string; email: string; role: "member" | "admin" };

type MoveDir = "forward" | "backward" | "left" | "right";

/**
 * Explore the Pueblo in 3D — Phase 1 prototype.
 *
 * STATUS, feature by feature (see FUNCTIONALITY_STATUS.md for the
 * authoritative, longer version):
 *   🟢 Working now: the 3D neighborhood, streets/sidewalks, HQ + Daily
 *      Pueblo + 5 sample business buildings, desktop keyboard movement,
 *      mobile touch movement, drag-to-look camera, clicking/tapping a
 *      building, the map/teleport panel, and the avatar nameplate showing
 *      the real logged-in member's username (from /api/auth/session).
 *   🟡 Needs backend/API: real business directory data (buildings are
 *      sample content today), business profile pages, Pueblo Deals.
 *   🟠 Needs credentials/3rd-party service + backend: real-time
 *      multiplayer presence/movement and chat need a WebSocket or
 *      realtime service — the engine already exposes
 *      upsertRemotePlayer/removeRemotePlayer for this, unused for now.
 *   ⚪ Future enhancement: events, Pueblo Live video, moderation/reporting
 *      tools, GLB models/LOD in place of the current primitive geometry.
 *
 * This component only owns the HUD (React state). The WebGL scene itself
 * lives in src/lib/pueblo3d/engine.ts, which this mounts into a plain div
 * ref inside a browser-only effect (avoids any SSR/WebGL mismatch).
 */
export default function Explore3DClient({
  places,
  drops,
  screen,
}: {
  places: Place[];
  drops: DropMarker[];
  screen: { headline: string; status: string };
}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Result of clicking a treasure drop: a message, plus the prize and code when claimed.
  const [dropResult, setDropResult] = useState<{ message: string; prize?: string; code?: string } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CityEngine | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        /* Middleware already requires a session to reach this route; if this
           call fails the HUD just falls back to a generic member name. */
      })
      .finally(() => {
        if (!cancelled) setUserLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDropClick = useCallback(async (id: number, near: boolean) => {
    if (!near) {
      setDropResult({ message: "You found a treasure! Walk closer to pick it up." });
      return;
    }
    try {
      const res = await fetch(`/api/drops/${id}/claim`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.claimed) {
        engineRef.current?.removeDrop(id);
        setDropResult({
          message: data.golden ? "You found a Golden Pueblo Ticket!" : "You found a treasure!",
          prize: data.prize,
          code: data.code,
        });
      } else {
        if (data.reason && data.reason !== "inactive") engineRef.current?.removeDrop(id);
        setDropResult({ message: data.error || "That treasure can't be claimed." });
      }
    } catch {
      setDropResult({ message: "Couldn't reach the server. Try again." });
    }
  }, []);

  const handlePlaceClick = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  // Mount the Three.js engine once we know the real username and the
  // container is in the DOM. Dynamically imported so the (sizeable)
  // three.js bundle is only ever fetched by someone visiting this page.
  useEffect(() => {
    if (!userLoaded || !containerRef.current) return;
    let disposed = false;
    const playerName = user?.username || "Pueblo Member";

    import("@/lib/pueblo3d/engine").then(({ createCityEngine }) => {
      if (disposed || !containerRef.current) return;
      const engine = createCityEngine({
        container: containerRef.current,
        playerName,
        onPlaceClick: handlePlaceClick,
        onReady: () => setReady(true),
        places,
        drops,
        screen,
        onDropClick: handleDropClick,
      });
      engineRef.current = engine;
    });

    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded]);

  function teleport(id: string) {
    engineRef.current?.teleportTo(id);
    setSelectedPlace(null);
    setMapOpen(false);
  }

  function setMove(dir: MoveDir, active: boolean) {
    engineRef.current?.setMobileMove(dir, active);
  }

  function mobilePadHandlers(dir: MoveDir) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        setMove(dir, true);
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        setMove(dir, false);
      },
      onPointerCancel: (e: React.PointerEvent) => {
        e.preventDefault();
        setMove(dir, false);
      },
      onPointerLeave: () => setMove(dir, false),
    };
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>PUEBLO CONNECT</span>
          <h1>Explore the Pueblo in 3D</h1>
          <p>Step inside your community.</p>
        </div>
        <div className={styles.member}>
          <span className={styles.onlineDot} />
          {user ? user.username : "Pueblo Member"}
        </div>
      </div>

      <section className={styles.shell} aria-label="Pueblo Connect 3D City">
        <div ref={containerRef} className={styles.canvas} />

        <div className={styles.topControls}>
          <button type="button" onClick={() => setMapOpen(true)}>
            Map
          </button>
          <button type="button" onClick={() => teleport("hq")}>
            Pueblo HQ
          </button>
          <button type="button" onClick={() => teleport("daily")}>
            Daily Pueblo
          </button>
          <button type="button" onClick={() => setHelpOpen(true)}>
            Controls
          </button>
        </div>

        {selectedPlace && (
          <aside className={styles.panel}>
            <button
              className={styles.closeBtn}
              type="button"
              aria-label="Close"
              onClick={() => setSelectedPlace(null)}
            >
              ×
            </button>
            <span className={styles.panelType}>{selectedPlace.categoryLabel}</span>
            <h2>{selectedPlace.name}</h2>
            <p>{selectedPlace.description}</p>

            {selectedPlace.sample && (
              <p className={styles.statusNote}>
                This is a sample building for the prototype, not a real Pueblo Connect
                business.
              </p>
            )}
            {selectedPlace.category === "news" && (
              <p className={styles.statusNote}>
                A full Daily Pueblo newsroom section is a planned future enhancement.
              </p>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionPrimary}
                onClick={() => teleport(selectedPlace.id)}
              >
                Walk here
              </button>
              {selectedPlace.href && (
                <Link href={selectedPlace.href}>{selectedPlace.hrefLabel || "Open"}</Link>
              )}
              {selectedPlace.category === "business" && <Link href="/advertise">Advertise your business</Link>}
            </div>
          </aside>
        )}

        {dropResult && (
          <aside className={styles.panel}>
            <button className={styles.closeBtn} type="button" aria-label="Close" onClick={() => setDropResult(null)}>
              ×
            </button>
            <span className={styles.panelType}>TREASURE</span>
            <h2>{dropResult.message}</h2>
            {dropResult.prize && <p>{dropResult.prize}</p>}
            {dropResult.code && (
              <p className={styles.statusNote}>
                Your code: <strong>{dropResult.code}</strong>. It&apos;s saved under{" "}
                <Link href="/treasures">My Treasures</Link>. Show it to claim your prize.
              </p>
            )}
          </aside>
        )}

        {mapOpen && (
          <aside className={styles.panel}>
            <button
              className={styles.closeBtn}
              type="button"
              aria-label="Close"
              onClick={() => setMapOpen(false)}
            >
              ×
            </button>
            <h2>Pueblo City Map</h2>
            <p>Choose a destination.</p>
            <div className={styles.destinations}>
              {places.map((p) => (
                <button key={p.id} type="button" onClick={() => teleport(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </aside>
        )}

        {helpOpen && (
          <aside className={styles.panel}>
            <button
              className={styles.closeBtn}
              type="button"
              aria-label="Close"
              onClick={() => setHelpOpen(false)}
            >
              ×
            </button>
            <h2>Explore the Pueblo</h2>
            <p>
              <strong>Desktop:</strong> W/A/S/D or arrow keys to walk. Drag the scene to look
              around. Click a building to open it.
            </p>
            <p>
              <strong>Mobile:</strong> Use the on-screen direction pad. Drag to look around and
              tap a building.
            </p>
          </aside>
        )}

        <div className={styles.hud}>
          <div className={styles.hudPill}>📍 Pueblo Plaza</div>
          <div className={styles.hudPill}>
            <span className={styles.onlineDot} /> 1 online (multiplayer is a future enhancement)
          </div>
        </div>

        <div className={styles.mobilePad} aria-label="Movement controls">
          <button aria-label="Walk forward" {...mobilePadHandlers("forward")}>
            ▲
          </button>
          <div>
            <button aria-label="Walk left" {...mobilePadHandlers("left")}>
              ◀
            </button>
            <button aria-label="Walk backward" {...mobilePadHandlers("backward")}>
              ▼
            </button>
            <button aria-label="Walk right" {...mobilePadHandlers("right")}>
              ▶
            </button>
          </div>
        </div>

        {!ready && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <strong>Entering the Pueblo…</strong>
          </div>
        )}
      </section>

      <p className={styles.note}>
        Phase 1 prototype: movement, destinations, building interaction and navigation run
        entirely in your browser. Multiplayer presence, chat, business profiles, Pueblo Deals,
        events and moderation tools are planned next phases — see FUNCTIONALITY_STATUS.md.
      </p>
    </div>
  );
}
