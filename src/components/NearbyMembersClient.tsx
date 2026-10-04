"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NearbyMember = {
  userId: number;
  name: string;
  profilePhotoPath: string | null;
  city: string | null;
  region: string | null;
  distanceMiles: number;
};

type LocationState = {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  region: string | null;
  source: "manual" | "ip" | null;
};

type NearbyMembersClientProps = {
  initialLocation: LocationState;
};

// Real backend: src/app/api/geo/location, src/app/api/geo/locate-by-ip,
// and src/app/api/members/nearby — spherical-geometry distance math and
// IP2Location lookup live in src/lib/geo.ts.
export default function NearbyMembersClient({ initialLocation }: NearbyMembersClientProps) {
  const router = useRouter();
  const [location, setLocation] = useState(initialLocation);
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [members, setMembers] = useState<NearbyMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocation = location.latitude !== null && location.longitude !== null;

  async function useBrowserLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support sharing location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/geo/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Couldn't save your location.");
            return;
          }
          setLocation(data.location);
          router.refresh();
        } catch {
          setError("Couldn't reach the server.");
        } finally {
          setBusy(false);
        }
      },
      (geoError) => {
        setBusy(false);
        setError(`Couldn't get your location from the browser: ${geoError.message}`);
      }
    );
  }

  async function detectFromIp() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/geo/locate-by-ip", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't detect your location from your IP address.");
        return;
      }
      setLocation(data.location);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function clearLocation() {
    setError(null);
    setBusy(true);
    try {
      await fetch("/api/geo/location", { method: "DELETE" });
      setLocation({ latitude: null, longitude: null, city: null, region: null, source: null });
      setMembers([]);
      setSearched(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function searchNearby() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/members/nearby?radiusMiles=${radiusMiles}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't search for nearby members.");
        return;
      }
      setMembers(data.members || []);
      setSearched(true);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="central-meta item">
          <p role="alert" style={{ color: "#c0392b", padding: 16, margin: 0 }}>{error}</p>
        </div>
      )}

      <div className="central-meta item">
        <div style={{ padding: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Your location</h4>
          {hasLocation ? (
            <p style={{ color: "#555" }}>
              {location.city ? `${location.city}${location.region ? `, ${location.region}` : ""}` : "Set"}{" "}
              <span style={{ color: "#999" }}>
                ({location.source === "manual" ? "shared from your browser" : "detected from your IP"})
              </span>
            </p>
          ) : (
            <p style={{ color: "#888" }}>No location set yet.</p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button className="mtr-btn signup" type="button" onClick={useBrowserLocation} disabled={busy}>
              <span>Use my location</span>
            </button>
            <button className="mtr-btn signin" type="button" onClick={detectFromIp} disabled={busy}>
              <span>Detect from IP</span>
            </button>
            {hasLocation && (
              <button className="mtr-btn signin" type="button" onClick={clearLocation} disabled={busy}>
                <span>Clear location</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {hasLocation && (
        <div className="central-meta item">
          <div style={{ padding: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Find members near you</h4>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="radius">Within</label>
              <select
                id="radius"
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value))}
                style={{ padding: "6px 10px" }}
              >
                <option value={5}>5 miles</option>
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
                <option value={50}>50 miles</option>
                <option value={100}>100 miles</option>
              </select>
              <button className="mtr-btn signup" type="button" onClick={searchNearby} disabled={busy}>
                <span>{busy ? "Searching…" : "Search"}</span>
              </button>
            </div>

            {searched && members.length === 0 && (
              <p style={{ color: "#888", marginTop: 16 }}>
                No members found within {radiusMiles} miles who&apos;ve shared their location.
              </p>
            )}
            {members.length > 0 && (
              <ul className="naves" style={{ marginTop: 16 }}>
                {members.map((m) => (
                  <li key={m.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>
                      {m.name}
                      {m.city && <span style={{ color: "#999" }}> — {m.city}</span>}
                    </span>
                    <span style={{ color: "#555" }}>{m.distanceMiles} mi</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
