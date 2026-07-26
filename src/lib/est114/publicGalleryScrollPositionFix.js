function findPublicGalleryLightbox() {
  const candidates = document.querySelectorAll('div[style*="position: fixed"]');

  return (
    [...candidates].find((element) => {
      if (window.getComputedStyle(element).zIndex !== "220") return false;
      if (!element.querySelector("img")) return false;
      return [...element.querySelectorAll("button")].some(
        (button) => button.textContent?.trim() === "×",
      );
    }) || null
  );
}

function isPublicClientGalleryRoute() {
  return /^\/gallery\/[^/]+/.test(window.location.pathname);
}

function isViewerOpeningInteraction(target) {
  if (!(target instanceof Element)) return false;

  const slideshowButton = target.closest('button[title="Play slideshow"]');
  if (slideshowButton) return true;

  if (target.closest("button")) return false;
  return Boolean(target.closest("main#gallery-sections article"));
}

export function installPublicGalleryScrollPositionFix() {
  if (
    typeof window === "undefined" ||
    window.__est114PublicGalleryScrollPositionFixInstalled
  ) {
    return;
  }

  window.__est114PublicGalleryScrollPositionFixInstalled = true;

  const baselineDocumentStyles = {
    overflow: document.documentElement.style.overflow,
    overscrollBehavior: document.documentElement.style.overscrollBehavior,
  };
  const baselineBodyStyles = {
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    right: document.body.style.right,
    width: document.body.style.width,
    overflow: document.body.style.overflow,
    touchAction: document.body.style.touchAction,
    overscrollBehavior: document.body.style.overscrollBehavior,
  };

  let savedScrollY = 0;
  let searchFrame = null;
  let remainingSearchFrames = 0;

  function neutralizeFixedBodyLock(overlay) {
    if (!overlay || overlay.dataset.est114ScrollPositionFixed === "true") return;

    overlay.dataset.est114ScrollPositionFixed = "true";

    // The main viewer locks the body with position: fixed. That can visually
    // jump Safari to the top. Keep the document at its real scroll position
    // and rely on overflow + the full-screen overlay to block background input.
    document.body.style.position = baselineBodyStyles.position;
    document.body.style.top = baselineBodyStyles.top;
    document.body.style.left = baselineBodyStyles.left;
    document.body.style.right = baselineBodyStyles.right;
    document.body.style.width = baselineBodyStyles.width;

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    window.scrollTo(0, savedScrollY);
  }

  function findOpenedViewer() {
    searchFrame = null;

    const overlay = findPublicGalleryLightbox();
    if (overlay) {
      neutralizeFixedBodyLock(overlay);
      return;
    }

    remainingSearchFrames -= 1;
    if (remainingSearchFrames > 0) {
      searchFrame = window.requestAnimationFrame(findOpenedViewer);
    }
  }

  function scheduleViewerCheck() {
    window.cancelAnimationFrame(searchFrame);
    remainingSearchFrames = 20;
    searchFrame = window.requestAnimationFrame(findOpenedViewer);
  }

  function captureViewerOpening(event) {
    if (!isPublicClientGalleryRoute()) return;
    if (!isViewerOpeningInteraction(event.target)) return;

    savedScrollY = window.scrollY || window.pageYOffset || 0;
    scheduleViewerCheck();
  }

  document.addEventListener("pointerdown", captureViewerOpening, true);
  document.addEventListener("click", captureViewerOpening, true);

  // If the module is installed while a viewer is already open, normalize it
  // once without installing a broad mutation or hover observer.
  const existingOverlay = findPublicGalleryLightbox();
  if (existingOverlay) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    neutralizeFixedBodyLock(existingOverlay);
  }

  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(searchFrame);
    document.documentElement.style.overflow = baselineDocumentStyles.overflow;
    document.documentElement.style.overscrollBehavior =
      baselineDocumentStyles.overscrollBehavior;
    document.body.style.position = baselineBodyStyles.position;
    document.body.style.top = baselineBodyStyles.top;
    document.body.style.left = baselineBodyStyles.left;
    document.body.style.right = baselineBodyStyles.right;
    document.body.style.width = baselineBodyStyles.width;
    document.body.style.overflow = baselineBodyStyles.overflow;
    document.body.style.touchAction = baselineBodyStyles.touchAction;
    document.body.style.overscrollBehavior = baselineBodyStyles.overscrollBehavior;
  });
}
