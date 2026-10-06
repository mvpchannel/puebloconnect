"use client";

import { useState } from "react";
import PhotoCropper from "@/components/admin/PhotoCropper";

export default function CropTool() {
  const [make, setMake] = useState<(() => string) | null>(null);

  function download() {
    if (!make) return;
    const a = document.createElement("a");
    a.href = make();
    a.download = "cropped-photo.jpg";
    a.click();
  }

  return (
    <div>
      <PhotoCropper initialAspect="square" onChange={(fn) => setMake(() => fn)} />
      {make && (
        <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} onClick={download}>
          Download cropped photo
        </button>
      )}
    </div>
  );
}
