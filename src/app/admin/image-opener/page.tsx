import type { Metadata } from "next";
import PhotoPostForm from "./PhotoPostForm";

export const metadata: Metadata = {
  title: "Post a Photo",
};

// Real tool: staff pick a photo, optionally crop it, and post it to the newsfeed or as a
// 24-hour story under their own account. Uses the same routes as the member boxes.
export default function Page() {
  return (
    <div className="row">
      <div className="col-md-12" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: 12 }}>Post a Photo</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Choose a photo, crop it if you like, and post it under your own account as a newsfeed post or a story
          that disappears after 24 hours.
        </p>
        <PhotoPostForm />
      </div>
    </div>
  );
}
