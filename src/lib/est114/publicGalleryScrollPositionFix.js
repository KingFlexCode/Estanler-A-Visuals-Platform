function findPublicGalleryLightbox() {
  const candidates = document.querySelectorAll('div[style*="position: fixed"]');

  return [...candidates].find((element) => {
    if (window.getComputedStyle(element).zIndex !== "220") return false;
    if (!element.querySelector("img")) return false;
    return [...element.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "×",
    );
  }) || null;
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
  let restoreFrame = null;

  function captureCurrentPageState() {
    if (activeOverlay) return;

    savedScrollY = window.scrollY || window.pageYOffset || 0;
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
  }

  function keepBackgroundAtCapturedPosition() {
    window.cancelAnimationFrame(restoreFrame);

    restoreFrame = window.requestAnimationFrame(() => {
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";

      document.body.style.position = savedBodyStyles?.position || "";
      document.body.style.top = savedBodyStyles?.top || "";
      document.body.style.left = savedBodyStyles?.left || "";
      document.body.style.right = savedBodyStyles?.right || "";
      document.body.style.width = savedBodyStyles?.width || "";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.overscrollBehavior = "none";

      window.scrollTo(0, savedScrollY);
    });
  }

  function restorePageState() {
    window.cancelAnimationFrame(restoreFrame);

    restoreFrame = window.requestAnimationFrame(() => {
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

      window.scrollTo(0, savedScrollY);
    });
  }

  document.addEventListener("pointerdown", captureCurrentPageState, true);
  document.addEventListener("click", captureCurrentPageState, true);
  window.addEventListener(
    "scroll",
    () => {
      if (!activeOverlay) savedScrollY = window.scrollY || window.pageYOffset || 0;
    },
    { passive: true },
  );

  const observer = new MutationObserver(() => {
    const nextOverlay = findPublicGalleryLightbox();

    if (nextOverlay && nextOverlay !== activeOverlay) {
      activeOverlay = nextOverlay;
      activeOverlay.dataset.est114ScrollPositionFix = "true";
      keepBackgroundAtCapturedPosition();
      window.setTimeout(keepBackgroundAtCapturedPosition, 60);
      return;
    }

    if (!nextOverlay && activeOverlay) {
      activeOverlay = null;
      restorePageState();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
