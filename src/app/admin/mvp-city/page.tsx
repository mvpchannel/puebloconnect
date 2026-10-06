import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MVP Lounge 3D City",
};

// Embeds the MVP Lounge "3D City" page inside the admin area. The address comes
// from MVP_CITY_URL (set it in .env); the default is the live site's /city page.
// The embedded page keeps its own sign-in, so staff may be asked to log in to it once.
const DEFAULT_URL = "https://passportstolove.com/city";

export default function Page() {
  const url = process.env.MVP_CITY_URL || DEFAULT_URL;
  return (
    <div className="panel-content">
      <div className="row">
        <div className="col-md-12">
          <h2 style={{ marginBottom: 8 }}>MVP Lounge 3D City</h2>
          <p style={{ color: "#555", marginBottom: 12 }}>
            The MVP Lounge 3D City, shown inside the admin area. If it asks you to sign in, sign in to it
            once here. If the frame stays blank,{" "}
            <a href={url} target="_blank" rel="noopener noreferrer">open it in its own tab</a>.
          </p>
          <iframe
            src={url}
            title="MVP Lounge 3D City"
            allow="fullscreen; microphone; camera; autoplay; geolocation"
            allowFullScreen
            style={{ width: "100%", height: "78vh", minHeight: 520, border: 0, background: "#111", borderRadius: 4 }}
          />
        </div>
      </div>
    </div>
  );
}
