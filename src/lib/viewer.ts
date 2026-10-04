import { getUserById } from "@/lib/db";

// The signed-in member's own avatar (or the default), for the post box and
// comment box — so they show the real member, not a template stock photo.
export function viewerAvatarSrc(userId?: number | null): string {
  const user = userId ? getUserById(userId) : undefined;
  return user?.profile_photo_path || "/images/defaults/default-avatar-male.jpg";
}
