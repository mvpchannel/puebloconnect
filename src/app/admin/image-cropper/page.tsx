import type { Metadata } from "next";
import CropTool from "./CropTool";

export const metadata: Metadata = {
  title: "Crop Image",
};

// Real tool: crop a photo by hand (choose a shape, drag, zoom) and download the result.
// It all happens in the browser; nothing is uploaded or saved on the site.
export default function Page() {
  return (
    <div className="row">
      <div className="col-md-12" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: 12 }}>Crop Image</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Crop a photo to the shape you need, then download it as a JPEG. Nothing is uploaded or saved on the
          site. The result is at most 1600 pixels on its long side.
        </p>
        <CropTool />
      </div>
    </div>
  );
}
