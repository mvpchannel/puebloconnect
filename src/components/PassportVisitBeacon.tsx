"use client";

import { useEffect, useRef } from "react";

type PassportVisitBeaconProps = {
  isLoggedIn: boolean;
  category: "business" | "pueblo_live" | "explore_3d";
  refId: number | null;
  label: string;
};

// Renders nothing — fires one POST to /api/passport/visit on mount for
// a logged-in member, to grant a Pueblo Passport stamp for this
// business channel / live stream / Explore 3D visit. Safe to mount on
// every page load: grantPassportStamp is idempotent, so repeat visits
// never add a second stamp for the same thing.
export default function PassportVisitBeacon({ isLoggedIn, category, refId, label }: PassportVisitBeaconProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || fired.current) return;
    fired.current = true;
    fetch("/api/passport/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, refId, label }),
    }).catch(() => {
      /* best-effort — a missed stamp isn't worth surfacing an error for */
    });
  }, [isLoggedIn, category, refId, label]);

  return null;
}
