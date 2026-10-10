import type { NeighborhoodReport } from "@/lib/db";

export function shapeReport(r: NeighborhoodReport) {
  return {
    id: r.id,
    reporterId: r.reporter_id,
    reporterName: [r.reporter_first_name, r.reporter_last_name].filter(Boolean).join(" ") || r.reporter_username,
    category: r.category,
    description: r.description,
    photoUrl: r.photo_url,
    hasPhoto: Boolean(r.has_photo),
    locationText: r.location_text,
    latitude: r.latitude,
    longitude: r.longitude,
    status: r.status,
    resolutionNote: r.resolution_note,
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    followerCount: r.follower_count,
  };
}
