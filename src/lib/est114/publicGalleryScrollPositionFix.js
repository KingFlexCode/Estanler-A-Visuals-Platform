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
  let savedDocumentStyles = null;
  let savedBodyStyles = null;

  const rememberScrollPosition = () => {
    if (!activeOverlay) {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
    }
  };

  const preventBackgroundScroll = (event) => {
    if (!activeOverlay) return;
    event.preventDefault();
  };

  function openViewer(overlay) {
    activeOverlay = overlay;
    activeOverlay.dataset.est114ScrollPositionFix = "true";

    savedDocumentStyles = {
      overflow: document.documentElement.style.overflow,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
    };
    savedBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      touchAction: document.body.style.touchAction,
      overscrollBehavior: document.body.style.overscrollBehavior,
    };

    // The main EST-114 enhancement initially uses a fixed-body lock. On mobile
    // Safari that can visually jump the gallery to the top. Restore normal body
    // positioning immediately, then lock scrolling without moving the document.
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    window.scrollTo(0, savedScrollY);
  }

  function closeViewer() {
    activeOverlay = null;

    document.documentElement.style.overflow =
      savedDocumentStyles?.overflow || "";
    document.documentElement.style.overscrollBehavior =
      savedDocumentStyles?.overscrollBehavior || "";

    document.body.style.position = savedBodyStyles?.position || "";
    document.body.style.top = savedBodyStyles?.top || "";
    document.body.style.left = savedBodyStyles?.left || "";
    document.body.style.right = savedBodyStyles?.right || "";
    document.body.style.width = savedBodyStyles?.width || "";
    document.body.style.overflow = savedBodyStyles?.overflow || "";
    document.body.style.touchAction = savedBodyStyles?.touchAction || "";
    document.body.style.overscrollBehavior =
      savedBodyStyles?.overscrollBehavior || "";

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
