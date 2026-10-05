import type { StoryRow } from "@/lib/db";

export type StoryGroup = {
  authorId: number;
  authorName: string;
  authorPhoto: string | null;
  stories: { id: number; imagePath: string; caption: string | null; createdAt: string }[];
  latest: string;
};

// One tile per member: their active stories in play order, members with
// the most recent story first.
export function groupStories(rows: StoryRow[]): StoryGroup[] {
  const byAuthor = new Map<number, StoryGroup>();
  for (const r of rows) {
    let g = byAuthor.get(r.author_id);
    if (!g) {
      g = {
        authorId: r.author_id,
        authorName: [r.author_first_name, r.author_last_name].filter(Boolean).join(" ") || r.author_username,
        authorPhoto: r.author_profile_photo_path,
        stories: [],
        latest: r.created_at,
      };
      byAuthor.set(r.author_id, g);
    }
    g.stories.push({ id: r.id, imagePath: r.image_path, caption: r.caption, createdAt: r.created_at });
    g.latest = r.created_at;
  }
  return [...byAuthor.values()].sort((a, b) => (a.latest < b.latest ? 1 : a.latest > b.latest ? -1 : 0));
}
