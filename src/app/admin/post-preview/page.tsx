import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/require-user";
import { getUserById } from "@/lib/db";
import PreviewForm from "./PreviewForm";

export const metadata: Metadata = {
  title: "Preview a Post",
};

// Real tool: write a post, see a simplified preview of how it will look on the newsfeed, and
// publish it under the signed-in admin's name. The preview is an approximation of the feed card.
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getCurrentUser();
  const user = session ? getUserById(session.sub) : null;
  if (!user) return <p style={{ color: "#888" }}>Sign in again to preview a post.</p>;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 style={{ marginBottom: 12 }}>Preview a Post</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Write a post and see how it will look before it goes out. The preview is a simplified version of the
          newsfeed card, so spacing may differ slightly. When it looks right, post it from here.
        </p>
        <PreviewForm author={{ name, photo: user.profile_photo_path || "/images/defaults/default-avatar-male.jpg" }} />
      </div>
    </div>
  );
}
