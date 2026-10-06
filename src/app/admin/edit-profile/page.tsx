import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/require-user";
import { getUserById } from "@/lib/db";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = {
  title: "Edit Profile",
};

// Real tool: the signed-in admin edits their own name, city, bio and profile photo. It
// saves through the same route as Account settings. Cover photo, password and email
// preferences stay in Account settings.
export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getCurrentUser();
  const user = session ? getUserById(session.sub) : null;
  if (!user) return <p style={{ color: "#888" }}>Sign in again to edit your profile.</p>;

  return (
    <div className="row">
      <div className="col-md-12" style={{ maxWidth: 720 }}>
        <h2 style={{ marginBottom: 12 }}>Edit Profile</h2>
        <p style={{ color: "#555", marginBottom: 18 }}>
          Change your own name, city, about text and profile photo. Your cover photo, password and email
          preferences are in <Link href="/account-settings">Account settings</Link>.
        </p>
        <ProfileForm
          initial={{
            firstName: user.first_name ?? "",
            lastName: user.last_name ?? "",
            city: user.city ?? "",
            bio: user.bio ?? "",
            photo: user.profile_photo_path,
          }}
        />
      </div>
    </div>
  );
}
