const CONTROL_HIDE_DELAY_MS = 2400;
const SWIPE_MIN_DISTANCE_PX = 56;
const SWIPE_DISTANCE_RATIO = 0.12;

function findPublicGalleryLightbox() {
  const candidates = document.querySelectorAll('div[style*="position: fixed"]');

  return [...candidates].find((element) => {
    if (element.dataset.est114Lightbox === "true") return true;
    if (window.getComputedStyle(element).zIndex !== "220") return false;
    if (!element.querySelector("img")) return false;
    return [...element.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "×",
    );
  }) || null;
}

function navButton(stage, direction) {
  const symbol = direction < 0 ? "‹" : "›";
  return [...stage.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === symbol,
  ) || null;
}

export function installPublicGalleryViewerEnhancements() {
  if (
    typeof window === "undefined" ||
    window.__est114PublicGalleryViewerEnhancementsInstalled
  ) {
    return;
  }

  window.__est114PublicGalleryViewerEnhancementsInstalled = true;

  let activeOverlay = null;
  let activeImage = null;
  let activeImageSrc = "";
  let controlsTimer = null;
  let pendingEnterDirection = 0;
  let cleanupOverlayListeners = null;
  let syncFrame = null;
  let bodyLocked = false;
  let lockedScrollY = 0;
  let savedDocumentStyles = null;
  let savedBodyStyles = null;

  function lockBackgroundScroll() {
    if (bodyLocked) return;

    bodyLocked = true;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
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

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";
  }

  function unlockBackgroundScroll() {
    if (!bodyLocked) return;

    document.documentElement.style.overflow = savedDocumentStyles?.overflow || "";
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

    bodyLocked = false;
    window.scrollTo(0, lockedScrollY);
  }

  function currentParts() {
    if (!activeOverlay) return null;
    const [header, stage, footer] = activeOverlay.children;
    const image = stage?.querySelector("img") || null;
    if (!header || !stage || !footer || !image) return null;
    return { header, stage, footer, image };
  }

  function setControlsVisible(visible) {
    const parts = currentParts();
    if (!parts) return;

    const { header, stage, footer } = parts;
    const metadata = header.firstElementChild;
    const closeButton = [...header.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "×",
    );
    const arrows = [navButton(stage, -1), navButton(stage, 1)].filter(Boolean);

    if (metadata) {
      metadata.style.opacity = visible ? "1" : "0";
      metadata.style.transform = visible ? "translateY(0)" : "translateY(-8px)";
    }

    footer.style.opacity = visible ? "1" : "0";
    footer.style.transform = visible ? "translateY(0)" : "translateY(10px)";
    footer.style.pointerEvents = visible ? "auto" : "none";

    arrows.forEach((button) => {
      button.style.opacity = visible ? "1" : "0";
      button.style.pointerEvents = visible ? "auto" : "none";
    });

    if (closeButton) {
      closeButton.style.opacity = "1";
      closeButton.style.pointerEvents = "auto";
    }
  }

  function scheduleControlsHide() {
    window.clearTimeout(controlsTimer);
    controlsTimer = window.setTimeout(
      () => setControlsVisible(false),
      CONTROL_HIDE_DELAY_MS,
    );
  }

  function showControls() {
    setControlsVisible(true);
    scheduleControlsHide();
  }

  function animateIncomingImage(image) {
    if (!pendingEnterDirection) {
      image.style.transform = "translate3d(0, 0, 0)";
      image.style.opacity = "1";
      return;
    }

    const direction = pendingEnterDirection;
    pendingEnterDirection = 0;
    image.style.transition = "none";
    image.style.transform = `translate3d(${direction * 12}vw, 0, 0)`;
    image.style.opacity = "0.62";

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        image.style.transition =
          "transform 240ms cubic-bezier(.22,.8,.28,1), opacity 220ms ease";
        image.style.transform = "translate3d(0, 0, 0)";
        image.style.opacity = "1";
      });
    });
  }

  function styleLightbox() {
    const parts = currentParts();
    if (!parts) return;

    const { header, stage, footer, image } = parts;
    const metadata = header.firstElementChild;
    const closeButton = [...header.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "×",
    );
    const previousButton = navButton(stage, -1);
    const nextButton = navButton(stage, 1);

    Object.assign(activeOverlay.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100dvh",
      minHeight: "100vh",
      display: "block",
      overflow: "hidden",
      overscrollBehavior: "none",
      touchAction: "none",
      background: "#000",
    });
    activeOverlay.setAttribute("role", "dialog");
    activeOverlay.setAttribute("aria-modal", "true");
    activeOverlay.setAttribute("aria-label", "Full-screen gallery image viewer");

    Object.assign(header.style, {
      position: "absolute",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "6",
      padding:
        "max(0.85rem, env(safe-area-inset-top)) max(0.85rem, env(safe-area-inset-right)) 2.8rem max(0.85rem, env(safe-area-inset-left))",
      background:
        "linear-gradient(to bottom, rgba(0,0,0,.72), rgba(0,0,0,.28) 58%, transparent)",
      pointerEvents: "none",
    });

    if (metadata) {
      metadata.style.transition = "opacity 220ms ease, transform 220ms ease";
      metadata.style.pointerEvents = "none";
      metadata.style.maxWidth = "calc(100vw - 6rem)";
    }

    if (closeButton) {
      Object.assign(closeButton.style, {
        width: "46px",
        height: "46px",
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.42)",
        border: "1px solid rgba(255,255,255,.28)",
        fontSize: "30px",
        lineHeight: "1",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        pointerEvents: "auto",
      });
      closeButton.setAttribute("aria-label", "Close full-screen image viewer");
    }

    Object.assign(stage.style, {
      position: "absolute",
      inset: "0",
      zIndex: "1",
      display: "grid",
      placeItems: "center",
      minHeight: "0",
      padding: "0",
      overflow: "hidden",
      touchAction: "none",
      overscrollBehavior: "none",
      cursor: "grab",
    });

    Object.assign(image.style, {
      width: "100%",
      height: "100%",
      maxWidth: "none",
      maxHeight: "none",
      objectFit: "contain",
      display: "block",
      userSelect: "none",
      WebkitUserSelect: "none",
      pointerEvents: "none",
      willChange: "transform, opacity",
      transform: image.style.transform || "translate3d(0, 0, 0)",
    });
    image.draggable = false;

    [
      [previousButton, "left"],
      [nextButton, "right"],
    ].forEach(([button, side]) => {
      if (!button) return;
      Object.assign(button.style, {
        position: "absolute",
        top: "50%",
        [side]: `max(0.55rem, env(safe-area-inset-${side}))`,
        zIndex: "7",
        width: "clamp(46px, 11vw, 58px)",
        height: "clamp(46px, 11vw, 58px)",
        borderRadius: "999px",
        display: "grid",
        placeItems: "center",
        transform: "translateY(-50%)",
        background: "rgba(0,0,0,.38)",
        border: "1px solid rgba(255,255,255,.28)",
        fontSize: "clamp(2rem, 7vw, 3rem)",
        lineHeight: "1",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        transition: "opacity 220ms ease, background 180ms ease",
      });
      button.setAttribute(
        "aria-label",
        side === "left" ? "Previous photo" : "Next photo",
      );
    });

    Object.assign(footer.style, {
      position: "absolute",
      left: "0",
      right: "0",
      bottom: "0",
      zIndex: "6",
      padding:
        "3rem max(0.85rem, env(safe-area-inset-right)) max(0.85rem, env(safe-area-inset-bottom)) max(0.85rem, env(safe-area-inset-left))",
      background:
        "linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.3) 62%, transparent)",
      transition: "opacity 220ms ease, transform 220ms ease",
    });

    const nextImageSrc = image.currentSrc || image.src || "";
    if (activeImage !== image || activeImageSrc !== nextImageSrc) {
      activeImage = image;
      activeImageSrc = nextImageSrc;
      animateIncomingImage(image);
      showControls();
    }
  }

  function attachOverlayListeners(overlay) {
    const parts = currentParts();
    if (!parts) return () => undefined;

    const { stage } = parts;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let dragging = false;

    const resetImage = () => {
      const image = currentParts()?.image;
      if (!image) return;
      image.style.transition =
        "transform 220ms cubic-bezier(.22,.8,.28,1), opacity 180ms ease";
      image.style.transform = "translate3d(0, 0, 0)";
      image.style.opacity = "1";
    };

    const finishSwipe = (event) => {
      if (pointerId === null || (event.pointerId !== undefined && event.pointerId !== pointerId)) {
        return;
      }

      const image = currentParts()?.image;
      const stageWidth = stage.clientWidth || window.innerWidth || 1;
      const threshold = Math.max(
        SWIPE_MIN_DISTANCE_PX,
        stageWidth * SWIPE_DISTANCE_RATIO,
      );
      const direction = deltaX < 0 ? 1 : -1;
      const targetButton = navButton(stage, direction);
      const shouldNavigate = dragging && Math.abs(deltaX) >= threshold && targetButton;

      if (shouldNavigate && image) {
        pendingEnterDirection = direction;
        image.style.transition =
          "transform 180ms cubic-bezier(.4,0,.7,.2), opacity 160ms ease";
        image.style.transform = `translate3d(${direction > 0 ? "-110vw" : "110vw"}, 0, 0)`;
        image.style.opacity = "0.42";
        window.setTimeout(() => targetButton.click(), 145);
      } else {
        resetImage();
      }

      if (pointerId !== null && stage.hasPointerCapture?.(pointerId)) {
        stage.releasePointerCapture(pointerId);
      }
      pointerId = null;
      deltaX = 0;
      dragging = false;
      stage.style.cursor = "grab";
      showControls();
    };

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest?.("button")) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      deltaX = 0;
      dragging = false;
      stage.setPointerCapture?.(pointerId);
      stage.style.cursor = "grabbing";
      const image = currentParts()?.image;
      if (image) image.style.transition = "none";
      showControls();
    };

    const onPointerMove = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const image = currentParts()?.image;
      if (!image) return;

      const nextDeltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (!dragging) {
        if (Math.abs(nextDeltaX) < 8) return;
        if (Math.abs(deltaY) > Math.abs(nextDeltaX) * 1.15) return;
        dragging = true;
      }

      event.preventDefault();
      deltaX = nextDeltaX;
      const stageWidth = stage.clientWidth || window.innerWidth || 1;
      const opacity = 1 - Math.min(Math.abs(deltaX) / (stageWidth * 1.7), 0.28);
      image.style.transform = `translate3d(${deltaX}px, 0, 0) scale(.995)`;
      image.style.opacity = String(opacity);
    };

    const onOverlayClick = (event) => {
      if (event.target.closest?.("button")) return;
      showControls();
    };

    const onActivity = () => showControls();

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove, { passive: false });
    stage.addEventListener("pointerup", finishSwipe);
    stage.addEventListener("pointercancel", finishSwipe);
    overlay.addEventListener("click", onOverlayClick);
    overlay.addEventListener("pointermove", onActivity, { passive: true });

    return () => {
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", finishSwipe);
      stage.removeEventListener("pointercancel", finishSwipe);
      overlay.removeEventListener("click", onOverlayClick);
      overlay.removeEventListener("pointermove", onActivity);
    };
  }

  function clearActiveOverlay() {
    cleanupOverlayListeners?.();
    cleanupOverlayListeners = null;
    activeOverlay = null;
    activeImage = null;
    activeImageSrc = "";
    pendingEnterDirection = 0;
    window.clearTimeout(controlsTimer);
    unlockBackgroundScroll();
  }

  function syncLightbox() {
    syncFrame = null;
    const overlay = findPublicGalleryLightbox();

    if (!overlay) {
      if (activeOverlay) clearActiveOverlay();
      return;
    }

    if (overlay !== activeOverlay) {
      clearActiveOverlay();
      activeOverlay = overlay;
      activeOverlay.dataset.est114Lightbox = "true";
      lockBackgroundScroll();
      styleLightbox();
      cleanupOverlayListeners = attachOverlayListeners(overlay);
      showControls();
      return;
    }

    styleLightbox();
  }

  function scheduleSync() {
    if (syncFrame !== null) return;
    syncFrame = window.requestAnimationFrame(syncLightbox);
  }

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });

  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("orientationchange", scheduleSync, { passive: true });
  scheduleSync();
}
