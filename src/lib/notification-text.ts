// Shared between Header.tsx (bell dropdown) and the full /notifications
// page (NotificationsList.tsx) — one place for "what does each
// notification kind say and link to" so the two don't drift apart.

export type NotificationActor = { id: number; username: string; name: string; profilePhotoPath: string | null } | null;

export type NotificationItem = {
  id: number;
  kind: "friend_request" | "friend_accepted" | "new_message" | "post_like" | "post_comment" | "stream_live";
  read: boolean;
  createdAt: string;
  actor: NotificationActor;
};

export const NOTIFICATION_TEXT: Record<NotificationItem["kind"], (name: string) => string> = {
  friend_request: (name) => `${name} sent you a friend request`,
  friend_accepted: (name) => `${name} accepted your friend request`,
  new_message: (name) => `${name} sent you a message`,
  post_like: (name) => `${name} liked your post`,
  post_comment: (name) => `${name} commented on your post`,
  stream_live: (name) => `${name} is live now on Pueblo Live`,
};

export const NOTIFICATION_LINK: Record<NotificationItem["kind"], string> = {
  friend_request: "/friends",
  friend_accepted: "/friends",
  new_message: "/messages",
  post_like: "/newsfeed",
  post_comment: "/newsfeed",
  stream_live: "/live",
};
