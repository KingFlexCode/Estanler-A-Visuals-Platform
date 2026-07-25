import {
  installDownloadInterceptors,
  syncFavoritesDownloadButton,
  syncPublicTracking,
  tryLogVisit,
} from "./publicTracking.js";
import {
  resetAdminActivityCache,
  syncAdminActivityPanel,
  syncAdminTracking,
} from "./adminDashboard.js";
import { syncAdminSettingsPanel } from "./adminSettings.js";

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

  const observer = new MutationObserver(() => {
    tryLogVisit();
    syncFavoritesDownloadButton();
    syncAdminSettingsPanel();
    syncAdminActivityPanel();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.setInterval(() => {
    syncPublicTracking();
    syncAdminTracking();
  }, 850);

  syncPublicTracking();
  syncAdminTracking();
}
