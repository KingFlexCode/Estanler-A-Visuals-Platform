import { supabase } from "./supabase";

export const FAVORITES_TABLE = "client_gallery_favorites";
export const VISITOR_KEY = "client-gallery-visitor-id";
export const FAVORITES_STORAGE_PREFIX = "client-gallery-favorites:";

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

export async function loadGalleryFavoriteSummary(galleryId) {
  if (!galleryId) return [];
  const { data, error } = await supabase
    .from("client_gallery_favorite_summary")
    .select("image_id,favorite_count,last_favorited_at")
    .eq("gallery_id", galleryId);
  if (error) throw error;
  return data || [];
}

function parseFavoriteIds(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function syncFavoriteIds(galleryId, previousIds, nextIds) {
  const visitorId = getGalleryVisitorId();
  const previous = new Set(previousIds);
  const next = new Set(nextIds);
  await Promise.all([...next].map((imageId) => saveGalleryFavorite(galleryId, imageId, visitorId)));
  await Promise.all([...previous].filter((imageId) => !next.has(imageId)).map((imageId) => removeGalleryFavorite(galleryId, imageId, visitorId)));
}

export function installGalleryFavoriteSync() {
  if (typeof window === "undefined" || window.__galleryFavoriteSyncInstalled) return;
  window.__galleryFavoriteSyncInstalled = true;
  const installedAt = Date.now();

  const nativeSetItem = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (key, value) => {
    const normalizedKey = String(key);
    const previousValue = normalizedKey.startsWith(FAVORITES_STORAGE_PREFIX) ? window.localStorage.getItem(normalizedKey) : null;
    const isInitialEmptyOverwrite = Date.now() - installedAt < 3000 && previousValue && previousValue !== "[]" && value === "[]";
    nativeSetItem(key, isInitialEmptyOverwrite ? previousValue : value);
    if (!normalizedKey.startsWith(FAVORITES_STORAGE_PREFIX) || isInitialEmptyOverwrite) return;
    const galleryId = normalizedKey.slice(FAVORITES_STORAGE_PREFIX.length);
    syncFavoriteIds(galleryId, parseFavoriteIds(previousValue), parseFavoriteIds(value)).catch(() => undefined);
  };
}

export function emptyFavoriteSet() {
  return new Set();
}

export { supabase };
