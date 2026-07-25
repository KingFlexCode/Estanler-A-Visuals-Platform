import { zipSync } from "fflate";
import {
  FAVORITES_BUTTON_ID,
  FAVORITES_STORAGE_PREFIX,
  OVERLAY_ID,
  normalizeRpcObject,
  photoOriginalUrl,
  publicGallerySlug,
  publicStorageUrl,
  readIdentity,
  registerVisitor,
  safeFileName,
  saveBlob,
  state,
  supabase,
} from "./shared.js";

function removeIdentityOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
}

function renderIdentityOverlay(context) {
  if (!context?.require_visitor_identity || state.publicIdentity) {
    removeIdentityOverlay();
    return;
  }
  if (document.getElementById(OVERLAY_ID)) return;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,10,.98);display:grid;place-items:center;padding:1.5rem;color:#fff;font-family:'Inter',sans-serif;";

  const card = document.createElement("section");
  card.style.cssText = "width:min(460px,100%);border:1px solid rgba(255,255,255,.16);background:#111;padding:clamp(1.5rem,5vw,2.5rem);box-sizing:border-box;box-shadow:0 30px 90px rgba(0,0,0,.45);";

  const brand = document.createElement("div");
  brand.textContent = "Estanler Aleman Photography";
  brand.style.cssText = "color:#c8a96a;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin-bottom:.85rem;";
  const title = document.createElement("h1");
  title.textContent = context.title || "Client Gallery";
  title.style.cssText = "font-family:'Playfair Display',Georgia,serif;font-size:clamp(2rem,7vw,3.4rem);line-height:1;margin:0 0 1rem;";
  const description = document.createElement("p");
  description.textContent = "Enter your email to continue. This helps the photographer identify gallery visits, favorites, and downloads without creating a full account.";
  description.style.cssText = "color:#bdbdbd;font-size:13px;line-height:1.65;margin:0 0 1.4rem;";
  card.append(brand, title, description);

  const form = document.createElement("form");
  form.style.cssText = "display:grid;gap:.85rem;";
  const inputStyle = "background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);color:#fff;font:400 14px 'Inter',sans-serif;outline:none;padding:1rem;width:100%;box-sizing:border-box;";

  const email = document.createElement("input");
  email.type = "email";
  email.required = true;
  email.autocomplete = "email";
  email.placeholder = "Email address";
  email.style.cssText = inputStyle;
  form.append(email);

  let name = null;
  if (context.collect_visitor_name) {
    name = document.createElement("input");
    name.type = "text";
    name.autocomplete = "name";
    name.placeholder = "Name (optional)";
    name.style.cssText = inputStyle;
    form.append(name);
  }

  const error = document.createElement("div");
  error.style.cssText = "color:#ff9f9f;font-size:12px;min-height:1em;";
  form.append(error);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Continue to Gallery";
  submit.style.cssText = "background:#c8a96a;border:none;color:#101010;cursor:pointer;font:900 11px 'Inter',sans-serif;letter-spacing:.16em;padding:1rem 1.2rem;text-transform:uppercase;";
  form.append(submit);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    submit.disabled = true;
    submit.textContent = "Saving...";
    try {
      await registerVisitor(context, email.value.trim().toLowerCase(), name?.value.trim() || null);
      removeIdentityOverlay();
      await refreshPublicPhotos();
      tryLogVisit();
    } catch (submitError) {
      error.textContent = submitError.message || "Your information could not be saved. Please try again.";
      submit.disabled = false;
      submit.textContent = "Continue to Gallery";
    }
  });

  card.append(form);
  overlay.append(card);
  document.body.append(overlay);
  window.setTimeout(() => email.focus(), 50);
}

async function loadPublicRequirements(slug) {
  const { data, error } = await supabase.rpc("get_client_gallery_identity_requirements", { p_slug: slug });
  if (error) throw error;
  return normalizeRpcObject(data);
}

export async function refreshPublicPhotos() {
  const slug = state.publicSlug;
  if (!slug || state.loadingPhotos) return;
  state.loadingPhotos = true;
  try {
    const savedPassword = window.sessionStorage.getItem(`client-gallery-unlock:${slug}`) || null;
    const { data, error } = await supabase.rpc("get_client_gallery_public_payload", {
      p_slug: slug,
      p_password: savedPassword,
    });
    if (error) return;
    const payload = normalizeRpcObject(data);
    if (payload?.state !== "available") return;
    state.publicPhotos = Array.isArray(payload.photos) ? payload.photos : [];
    const map = new Map();
    state.publicPhotos.forEach((photo) => {
      [photo.original_path, photo.display_path, photo.thumbnail_path].filter(Boolean).forEach((path) => {
        const url = publicStorageUrl(path);
        if (url) map.set(url, photo);
      });
    });
    state.photoByUrl = map;
  } finally {
    state.loadingPhotos = false;
  }
}

export async function initializePublicGallery() {
  const slug = publicGallerySlug();
  if (!slug) {
    state.publicSlug = "";
    state.publicContext = null;
    state.publicIdentity = null;
    state.publicPhotos = [];
    state.photoByUrl = new Map();
    state.visitLogged = false;
    removeIdentityOverlay();
    document.getElementById(FAVORITES_BUTTON_ID)?.remove();
    return;
  }

  if (state.publicSlug !== slug) {
    state.publicSlug = slug;
    state.publicContext = null;
    state.publicIdentity = null;
    state.publicPhotos = [];
    state.photoByUrl = new Map();
    state.recentPhotoFetches = [];
    state.visitLogged = false;
  }
  if (state.loadingPublic || state.publicContext) return;

  state.loadingPublic = true;
  try {
    const context = await loadPublicRequirements(slug);
    if (!context?.available || !context.gallery_id) return;
    state.publicContext = context;
    state.publicIdentity = readIdentity(context.gallery_id);

    if (context.require_visitor_identity && !state.publicIdentity) {
      renderIdentityOverlay(context);
      return;
    }

    if (!state.publicIdentity) {
      try {
        await registerVisitor(context, null, null);
      } catch {
        // Anonymous tracking must not block a gallery that does not require identity.
      }
    }

    removeIdentityOverlay();
    await refreshPublicPhotos();
    tryLogVisit();
  } catch {
    // The existing gallery remains usable before the EST-83 SQL is installed.
  } finally {
    state.loadingPublic = false;
  }
}

export async function tryLogVisit() {
  if (state.visitLogged || !state.publicContext?.gallery_id || !state.publicIdentity?.id) return;
  if (!document.getElementById("gallery-sections")) return;
  state.visitLogged = true;
  const { error } = await supabase.rpc("log_client_gallery_visit", {
    p_gallery_id: state.publicContext.gallery_id,
    p_visitor_id: state.publicIdentity.id,
    p_user_agent: navigator.userAgent || null,
    p_referrer: document.referrer || null,
  });
  if (error) state.visitLogged = false;
}

async function logDownload(type, imageIds, fileName, metadata = {}) {
  if (!state.publicContext?.gallery_id || !state.publicIdentity?.id) return;
  const ids = [...new Set((imageIds || []).filter(Boolean))];
  await supabase.rpc("log_client_gallery_download", {
    p_gallery_id: state.publicContext.gallery_id,
    p_visitor_id: state.publicIdentity.id,
    p_download_type: type,
    p_image_ids: ids,
    p_file_name: fileName || null,
    p_metadata: metadata,
  });
}

export function installDownloadInterceptors() {
  if (window.__est83DownloadInterceptorsInstalled) return;
  window.__est83DownloadInterceptorsInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url;
    const response = await nativeFetch(...args);
    if (state.publicSlug && requestUrl) {
      const photo = state.photoByUrl.get(String(requestUrl));
      if (photo) {
        state.recentPhotoFetches.push({ photoId: photo.id, at: Date.now() });
        state.recentPhotoFetches = state.recentPhotoFetches.filter((item) => Date.now() - item.at < 180000).slice(-500);
      }
    }
    return response;
  };

  const nativeAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function trackedAnchorClick(...args) {
    try {
      if (state.publicSlug && this.download && this.dataset.est83Tracked !== "true") {
        const fileName = String(this.download || "");
        const now = Date.now();
        const isZip = fileName.toLowerCase().endsWith(".zip");
        const ageLimit = isZip ? 180000 : 15000;
        const recent = state.recentPhotoFetches.filter((item) => now - item.at < ageLimit);
        const imageIds = [...new Set(recent.map((item) => item.photoId))];
        if (isZip) {
          const type = fileName.toLowerCase().includes("favorite") ? "favorites_zip" : "gallery_zip";
          logDownload(type, imageIds, fileName, { source: "public-gallery" }).catch(() => undefined);
          state.recentPhotoFetches = [];
        } else if (imageIds.length) {
          const imageId = imageIds[imageIds.length - 1];
          logDownload("photo", [imageId], fileName, { source: "public-gallery" }).catch(() => undefined);
          state.recentPhotoFetches = state.recentPhotoFetches.filter((item) => item.photoId !== imageId);
        }
      }
    } catch {
      // Download tracking must never interrupt a client download.
    }
    return nativeAnchorClick.apply(this, args);
  };
}

function favoriteIds() {
  const galleryId = state.publicContext?.gallery_id;
  if (!galleryId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${FAVORITES_STORAGE_PREFIX}${galleryId}`) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function downloadFavoriteSelection(button) {
  const ids = favoriteIds();
  const photos = state.publicPhotos.filter((photo) => ids.includes(photo.id));
  if (!photos.length) return;
  const original = button.textContent;
  button.disabled = true;
  const files = {};
  try {
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      button.textContent = `Preparing ${index + 1}/${photos.length}`;
      const response = await fetch(photoOriginalUrl(photo));
      if (!response.ok) throw new Error("A selected photo could not be prepared.");
      const fileName = safeFileName(photo.file_name || photo.title || `favorite-${index + 1}.jpg`);
      files[`${String(index + 1).padStart(3, "0")}-${fileName}`] = new Uint8Array(await response.arrayBuffer());
    }
    const zipBytes = zipSync(files, { level: 0 });
    const zipName = `${safeFileName(state.publicContext.title || state.publicSlug)}-favorites.zip`;
    saveBlob(new Blob([zipBytes], { type: "application/zip" }), zipName, true);
    await logDownload("favorites_zip", photos.map((photo) => photo.id), zipName, { source: "public-favorites-button" });
    state.recentPhotoFetches = [];
    button.textContent = "Download Started";
  } catch {
    button.textContent = "Download Failed";
  } finally {
    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = original;
    }, 1700);
  }
}

export function syncFavoritesDownloadButton() {
  const existing = document.getElementById(FAVORITES_BUTTON_ID);
  const context = state.publicContext;
  const ids = favoriteIds();
  const shouldShow = Boolean(
    state.publicSlug &&
    context?.allow_downloads !== false &&
    context?.allow_favorites !== false &&
    state.publicIdentity?.id &&
    document.getElementById("gallery-sections") &&
    ids.length,
  );
  if (!shouldShow) {
    existing?.remove();
    return;
  }
  if (existing) {
    if (!existing.disabled) existing.textContent = `Download Favorites (${ids.length})`;
    return;
  }
  const button = document.createElement("button");
  button.id = FAVORITES_BUTTON_ID;
  button.type = "button";
  button.textContent = `Download Favorites (${ids.length})`;
  button.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:1800;background:#111;border:1px solid rgba(255,255,255,.3);box-shadow:0 14px 40px rgba(0,0,0,.3);color:#fff;cursor:pointer;font:900 10px 'Inter',sans-serif;letter-spacing:.12em;padding:12px 14px;text-transform:uppercase;";
  button.addEventListener("click", () => downloadFavoriteSelection(button));
  document.body.append(button);
}

export function syncPublicTracking() {
  initializePublicGallery();
  if (!state.publicSlug) return;
  refreshPublicPhotos();
  tryLogVisit();
  syncFavoritesDownloadButton();
}
