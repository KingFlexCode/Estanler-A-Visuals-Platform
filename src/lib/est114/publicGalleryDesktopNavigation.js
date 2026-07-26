function isDesktopPointerLayout() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function activeViewerParts() {
  const overlay = document.querySelector('div[data-est114-lightbox="true"]');
  if (!overlay) return null;

  const stage = overlay.children[1];
  const image = stage?.querySelector("img") || null;
  if (!stage || !image) return null;

  return { overlay, stage, image };
}

function navigationButton(stage, direction) {
  const symbol = direction < 0 ? "‹" : "›";
  return (
    [...stage.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === symbol,
    ) || null
  );
}

function injectDesktopNavigationStyles() {
  if (document.getElementById("est114-desktop-navigation-styles")) return;

  const style = document.createElement("style");
  style.id = "est114-desktop-navigation-styles";
  style.textContent = `
    @media (hover: hover) and (pointer: fine) {
      div[data-est114-lightbox="true"] > :nth-child(2) {
        cursor: default !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installPublicGalleryDesktopNavigation() {
  if (typeof window === "undefined") return;
  if (window.__est114PublicGalleryDesktopNavigationInstalled) return;

  window.__est114PublicGalleryDesktopNavigationInstalled = true;
  injectDesktopNavigationStyles();

  const blockDesktopSwipe = (event) => {
    if (!isDesktopPointerLayout()) return;

    const parts = activeViewerParts();
    if (!parts || !parts.stage.contains(event.target)) return;
    if (event.target.closest?.("button")) return;

    // The original EST-114 pointer handlers remain available for coarse touch
    // devices, but mouse and trackpad gestures never reach them on desktop.
    event.stopImmediatePropagation();
  };

  const navigateFromDesktopGutter = (event) => {
    if (!isDesktopPointerLayout()) return;

    const parts = activeViewerParts();
    if (!parts || !parts.stage.contains(event.target)) return;
    if (event.target.closest?.("button")) return;

    const imageRect = parts.image.getBoundingClientRect();
    let direction = 0;

    if (event.clientX < imageRect.left) direction = -1;
    if (event.clientX > imageRect.right) direction = 1;
    if (!direction) return;

    const button = navigationButton(parts.stage, direction);
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    button.click();
  };

  ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach(
    (eventName) => {
      document.addEventListener(eventName, blockDesktopSwipe, true);
    },
  );

  document.addEventListener("click", navigateFromDesktopGutter, true);
}
