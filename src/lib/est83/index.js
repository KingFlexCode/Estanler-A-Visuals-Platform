import {
  initializePublicGallery,
  installDownloadInterceptors,
  refreshPublicPhotos,
  syncFavoritesDownloadButton,
  tryLogVisit,
} from "./publicTracking.js";
import {
  resetAdminActivityCache,
  syncAdminActivityPanel,
  syncAdminTracking,
} from "./adminDashboard.js";
import { syncAdminSettingsPanel } from "./adminSettings.js";
import { publicGallerySlug } from "./shared.js";

let lastPublicSlug = "";
let lastUnlockPassword;
let syncRunning = false;

async function syncPublicVisitorActivity() {
  const slug = publicGallerySlug();
  await initializePublicGallery();

  if (!slug) {
    lastPublicSlug = "";
    lastUnlockPassword = undefined;
    return;
  }

  const savedPassword = window.sessionStorage.getItem(`client-gallery-unlock:${slug}`) || "";
  const galleryChanged = slug !== lastPublicSlug;
  const passwordChanged = savedPassword !== lastUnlockPassword;

  if (galleryChanged || passwordChanged) {
    lastPublicSlug = slug;
    lastUnlockPassword = savedPassword;
    await refreshPublicPhotos();
  }

  tryLogVisit();
  syncFavoritesDownloadButton();
}

async function syncVisitorActivity() {
  if (syncRunning) return;
  syncRunning = true;
  try {
    await syncPublicVisitorActivity();
    syncAdminTracking();
  } finally {
    syncRunning = false;
  }
}

export function installClientGalleryVisitorActivity() {
  if (typeof window === "undefined" || window.__est83VisitorActivityInstalled) return;
  window.__est83VisitorActivityInstalled = true;
  installDownloadInterceptors();

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button[title]");
    if (!button) return;
    if (button.title === "Activity") {
      resetAdminActivityCache();
      window.setTimeout(() => syncAdminActivityPanel(), 140);
    }
    if (button.title === "Settings") {
      window.setTimeout(() => syncAdminSettingsPanel(), 140);
    }
  });

  // Watching every DOM mutation caused the returning visitor Favorites button
  // to trigger the observer repeatedly after password unlock. A scheduled sync
  // avoids that browser-locking loop. The public payload is refreshed only when
  // the gallery or its saved unlock password changes.
  window.setInterval(syncVisitorActivity, 1000);
  syncVisitorActivity();
}