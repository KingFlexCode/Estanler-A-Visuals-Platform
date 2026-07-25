import {
  installDownloadInterceptors,
  syncPublicTracking,
} from "./publicTracking.js";
import {
  resetAdminActivityCache,
  syncAdminActivityPanel,
  syncAdminTracking,
} from "./adminDashboard.js";
import { syncAdminSettingsPanel } from "./adminSettings.js";

function syncVisitorActivity() {
  syncPublicTracking();
  syncAdminTracking();
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

  // EST-83 previously watched every DOM mutation. Updating the returning
  // visitor favorites button changed the DOM again, which could create a
  // self-triggering observer loop after a password-protected gallery unlocked.
  // A lightweight scheduled sync is enough for the public and admin surfaces
  // and avoids locking the browser during repeat visits.
  window.setInterval(syncVisitorActivity, 1000);
  syncVisitorActivity();
}