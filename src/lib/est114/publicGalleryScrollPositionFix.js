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

export function installPublicGalleryScrollPositionFix() {
  if (
    typeof window === "undefined" ||
    window.__est114PublicGalleryScrollPositionFixInstalled
  ) {
    return;
  }

  window.__est114PublicGalleryScrollPositionFixInstalled = true;

  let activeOverlay = null;
  let savedScrollY = window.scrollY || window.pageYOffset || 0;

  // Keep the normal gallery page styles as the baseline. The main EST-114
  // enhancement may temporarily change these before this observer runs.
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

  const rememberScrollPosition = () => {
    if (!activeOverlay) {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
    }
  };

  const preventBackgroundScroll = (event) => {
    if (!activeOverlay) return;
    event.preventDefault();
  };

  function applyBaselineBodyPosition() {
    document.body.style.position = baselineBodyStyles.position;
    document.body.style.top = baselineBodyStyles.top;
    document.body.style.left = baselineBodyStyles.left;
    document.body.style.right = baselineBodyStyles.right;
    document.body.style.width = baselineBodyStyles.width;
  }

  function openViewer(overlay) {
    activeOverlay = overlay;
    activeOverlay.dataset.est114ScrollPositionFix = "true";

    // A fixed-body lock can visually jump mobile Safari to the top. Return the
    // body to its normal position, preserve the current scroll offset, and lock
    // interaction through overflow plus event prevention instead.
    applyBaselineBodyPosition();
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";
    window.scrollTo(0, savedScrollY);
  }

  function closeViewer() {
    activeOverlay = null;

    document.documentElement.style.overflow = baselineDocumentStyles.overflow;
    document.documentElement.style.overscrollBehavior =
      baselineDocumentStyles.overscrollBehavior;
    applyBaselineBodyPosition();
    document.body.style.overflow = baselineBodyStyles.overflow;
    document.body.style.touchAction = baselineBodyStyles.touchAction;
    document.body.style.overscrollBehavior = baselineBodyStyles.overscrollBehavior;

    window.requestAnimationFrame(() => {
      window.scrollTo(0, savedScrollY);
    });
  }

  window.addEventListener("scroll", rememberScrollPosition, { passive: true });
  document.addEventListener("touchmove", preventBackgroundScroll, {
    passive: false,
  });
  document.addEventListener("wheel", preventBackgroundScroll, {
    passive: false,
  });

  const observer = new MutationObserver(() => {
    const nextOverlay = findPublicGalleryLightbox();

    if (nextOverlay && !activeOverlay) {
      openViewer(nextOverlay);
      return;
    }

    if (!nextOverlay && activeOverlay) {
      closeViewer();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
