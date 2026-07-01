import { supabase } from "./supabase";

export const FAVORITES_TABLE = "client_gallery_favorites";
export const VISITOR_KEY = "client-gallery-visitor-id";

export function createGalleryVisitorId() {
  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getGalleryVisitorId() {
  if (typeof window === "undefined") return "server-visitor";
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const next = createGalleryVisitorId();
  window.localStorage.setItem(VISITOR_KEY, next);
  return next;
}

export async function loadGalleryFavorites(galleryId, visitorId = getGalleryVisitorId()) {
  if (!galleryId || !visitorId) return new Set();
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select("image_id")
    .eq("gallery_id", galleryId)
    .eq("visitor_id", visitorId);
  if (error) throw error;
  return new Set((data || []).map((row) => row.image_id));
}

export async function saveGalleryFavorite(galleryId, imageId, visitorId = getGalleryVisitorId()) {
  if (!galleryId || !imageId || !visitorId) return;
  const { error } = await supabase
    .from(FAVORITES_TABLE)
    .upsert(
      { gallery_id: galleryId, image_id: imageId, visitor_id: visitorId },
      { onConflict: "gallery_id,image_id,visitor_id" },
    );
  if (error) throw error;
}

export async function removeGalleryFavorite(galleryId, imageId, visitorId = getGalleryVisitorId()) {
  if (!galleryId || !imageId || !visitorId) return;
  const query = supabase.from(FAVORITES_TABLE);
  const { error } = await query["delete"]()
    .eq("gallery_id", galleryId)
    .eq("image_id", imageId)
    .eq("visitor_id", visitorId);
  if (error) throw error;
}

export function emptyFavoriteSet() {
  return new Set();
}

export { supabase };
