import {
  FAVORITES_STORAGE_PREFIX,
  getGalleryVisitorId,
  supabase,
} from "../clientGalleryFavorites.jsx";

export { FAVORITES_STORAGE_PREFIX, getGalleryVisitorId, supabase };

export const BUCKET = "client-galleries";
export const IDENTITY_SESSION_PREFIX = "client-gallery-identity:";
export const OVERLAY_ID = "est83-visitor-identity-overlay";
export const FAVORITES_BUTTON_ID = "est83-download-favorites-button";
export const SETTINGS_PANEL_ID = "est83-visitor-settings-panel";
export const ACTIVITY_PANEL_ID = "est83-visitor-activity-panel";
export const SIDEBAR_PANEL_ID = "est83-visitor-sidebar-summary";
export const ADMIN_CACHE_MS = 5000;

export const state = {
  publicSlug: "",
  publicContext: null,
  publicIdentity: null,
  publicPhotos: [],
  photoByUrl: new Map(),
  recentPhotoFetches: [],
  visitLogged: false,
  loadingPublic: false,
  loadingPhotos: false,
  adminGalleryId: "",
  adminActivity: null,
  adminActivityLoadedAt: 0,
  adminActivityLoading: false,
  adminSettingsLoading: false,
};

export function publicGallerySlug() {
  const match = window.location.pathname.match(/^\/gallery\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function adminGalleryId() {
  const match = window.location.pathname.match(/^\/admin\/galleries\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function identityStorageKey(galleryId) {
  return `${IDENTITY_SESSION_PREFIX}${galleryId}`;
}

export function readIdentity(galleryId) {
  if (!galleryId) return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(identityStorageKey(galleryId)) || "null");
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function saveIdentity(galleryId, identity) {
  window.sessionStorage.setItem(identityStorageKey(galleryId), JSON.stringify(identity));
}

export function normalizeRpcObject(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

export function publicStorageUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

export function photoOriginalUrl(photo) {
  return publicStorageUrl(photo?.original_path || photo?.display_path || photo?.thumbnail_path);
}

export function safeFileName(value = "gallery-photo") {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "gallery-photo";
}

export function displayVisitor(visitor = {}) {
  return visitor.name || visitor.email || "Anonymous visitor";
}

export function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

export function downloadTypeLabel(type) {
  if (type === "photo") return "Individual photo";
  if (type === "favorites_zip") return "Favorite selection ZIP";
  return "Full gallery ZIP";
}

export function createButton(label, kind = "light") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  const dark = kind === "dark";
  button.style.cssText = `background:${dark ? "#111" : "transparent"};border:1px solid ${dark ? "#111" : "#d9d9d9"};color:${dark ? "#fff" : "#111"};cursor:pointer;font:800 10px 'Inter',sans-serif;letter-spacing:.12em;padding:10px 12px;text-transform:uppercase;`;
  return button;
}

export function createMetric(label, value) {
  const card = document.createElement("div");
  card.style.cssText = "background:#fff;border:1px solid #e5e5e5;padding:1rem;";
  const number = document.createElement("div");
  number.textContent = String(value ?? 0);
  number.style.cssText = "color:#111;font:900 1.8rem/1 'Inter',sans-serif;";
  const text = document.createElement("div");
  text.textContent = label;
  text.style.cssText = "color:#777;font:900 10px 'Inter',sans-serif;letter-spacing:.14em;margin-top:.5rem;text-transform:uppercase;";
  card.append(number, text);
  return card;
}

export function createSection(title, description = "") {
  const section = document.createElement("section");
  section.style.cssText = "background:#fff;border:1px solid #e5e5e5;padding:1rem;min-width:0;";
  const heading = document.createElement("h3");
  heading.textContent = title;
  heading.style.cssText = "color:#111;font:800 1rem 'Inter',sans-serif;margin:0;";
  section.append(heading);
  if (description) {
    const copy = document.createElement("p");
    copy.textContent = description;
    copy.style.cssText = "color:#777;font:400 12px/1.55 'Inter',sans-serif;margin:.35rem 0 1rem;";
    section.append(copy);
  }
  return section;
}

export function saveBlob(blob, fileName, tracked = false) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  if (tracked) link.dataset.est83Tracked = "true";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function registerVisitor(context, email = null, name = null) {
  const browserToken = getGalleryVisitorId();
  const { data, error } = await supabase.rpc("register_client_gallery_visitor", {
    p_gallery_id: context.gallery_id,
    p_email: email || null,
    p_name: name || null,
    p_browser_token: browserToken,
  });
  if (error) throw error;
  const visitor = normalizeRpcObject(data);
  if (!visitor?.id) throw new Error("Visitor identity could not be saved.");
  const identity = {
    id: visitor.id,
    email: visitor.email || email || null,
    name: visitor.name || name || null,
    browserToken,
  };
  saveIdentity(context.gallery_id, identity);
  state.publicIdentity = identity;
  return identity;
}
