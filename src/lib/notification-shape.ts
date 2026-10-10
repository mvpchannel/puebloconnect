import type { Notification } from "@/lib/db";

export function shapeNotification(n: Notification) {
  return {
    id: n.id,
    kind: n.kind,
    refType: n.ref_type,
    refId: n.ref_id,
    message: n.message,
    read: n.read_at !== null,
    createdAt: n.created_at,
    actor: n.actor_id
      ? {
          id: n.actor_id,
          username: n.actor_username,
          name: [n.actor_first_name, n.actor_last_name].filter(Boolean).join(" ") || n.actor_username,
          profilePhotoPath: n.actor_profile_photo_path,
        }
      : null,
  };
}
