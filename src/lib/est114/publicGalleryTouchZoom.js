const MIN_SCALE = 1;
const MAX_SCALE = 4;
const RESET_SCALE_THRESHOLD = 1.02;
const VIEWER_SEARCH_FRAMES = 30;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function isTouchPointer(event) {
  return event.pointerType === "touch";
}

function viewerParts() {
  const overlay = document.querySelector('div[data-est114-lightbox="true"]');
  if (!overlay) return null;

  const stage = overlay.children[1];
  const image = stage?.querySelector("img") || null;
  if (!stage || !image) return null;

  return { overlay, stage, image };
}

function isViewerOpeningInteraction(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('button[title="Play slideshow"]')) return true;
  if (target.closest("button")) return false;
  return Boolean(target.closest("main#gallery-sections article"));
}

function midpoint(first, second) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function distance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function installPublicGalleryTouchZoom() {
  if (typeof window === "undefined") return;
  if (window.__est114PublicGalleryTouchZoomInstalled) return;

  window.__est114PublicGalleryTouchZoomInstalled = true;

  let activeStage = null;
  let activeImage = null;
  let stageObserver = null;
  let searchFrame = null;
  let remainingSearchFrames = 0;
  let lastImageSource = "";

  const pointers = new Map();
  let scale = MIN_SCALE;
  let panX = 0;
  let panY = 0;
  let pinchStart = null;
  let panStart = null;
  let suppressSwipeUntilPointersClear = false;

  function availableStageSize() {
    if (!activeStage) return { width: 0, height: 0 };

    const styles = window.getComputedStyle(activeStage);
    const horizontalPadding =
      (Number.parseFloat(styles.paddingLeft) || 0) +
      (Number.parseFloat(styles.paddingRight) || 0);
    const verticalPadding =
      (Number.parseFloat(styles.paddingTop) || 0) +
      (Number.parseFloat(styles.paddingBottom) || 0);

    return {
      width: Math.max(0, activeStage.clientWidth - horizontalPadding),
      height: Math.max(0, activeStage.clientHeight - verticalPadding),
    };
  }

  function clampPan() {
    if (!activeImage || !activeStage || scale <= MIN_SCALE) {
      panX = 0;
      panY = 0;
      return;
    }

    const stageSize = availableStageSize();
    const baseWidth = activeImage.offsetWidth || activeImage.clientWidth || 0;
    const baseHeight = activeImage.offsetHeight || activeImage.clientHeight || 0;
    const maximumX = Math.max(0, (baseWidth * scale - stageSize.width) / 2);
    const maximumY = Math.max(0, (baseHeight * scale - stageSize.height) / 2);

    panX = clamp(panX, -maximumX, maximumX);
    panY = clamp(panY, -maximumY, maximumY);
  }

  function applyTransform(animated = false) {
    if (!activeImage) return;

    clampPan();
    activeImage.style.transition = animated
      ? "transform 220ms cubic-bezier(.22,.8,.28,1), opacity 180ms ease"
      : "none";
    activeImage.style.transformOrigin = "50% 50%";
    activeImage.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
    activeImage.style.opacity = "1";
  }

  function resetZoom(animated = true) {
    scale = MIN_SCALE;
    panX = 0;
    panY = 0;
    pinchStart = null;
    panStart = null;
    pointers.clear();
    suppressSwipeUntilPointersClear = false;
    applyTransform(animated);
  }

  function prepareImage(image) {
    activeImage = image;
    lastImageSource = image.currentSrc || image.src || "";
    activeImage.style.transformOrigin = "50% 50%";
    activeImage.style.willChange = "transform, opacity";
    resetZoom(false);
  }

  function activateViewer(parts) {
    if (!parts) return;

    if (parts.stage === activeStage && parts.image === activeImage) return;

    stageObserver?.disconnect();
    activeStage = parts.stage;
    prepareImage(parts.image);

    stageObserver = new MutationObserver(() => {
      if (!activeStage?.isConnected) return;

      const nextImage = activeStage.querySelector("img");
      if (!nextImage) return;

      const nextSource = nextImage.currentSrc || nextImage.src || "";
      if (nextImage !== activeImage || nextSource !== lastImageSource) {
        prepareImage(nextImage);
      }
    });
    stageObserver.observe(activeStage, {
      attributes: true,
      attributeFilter: ["src", "srcset"],
      childList: true,
      subtree: true,
    });
  }

  function stageCenter() {
    const rectangle = activeStage.getBoundingClientRect();
    return {
      x: rectangle.left + rectangle.width / 2,
      y: rectangle.top + rectangle.height / 2,
    };
  }

  function startPinch() {
    const [first, second] = [...pointers.values()];
    if (!first || !second || !activeStage) return;

    const startMidpoint = midpoint(first, second);
    const center = stageCenter();
    const startingDistance = Math.max(distance(first, second), 1);

    pinchStart = {
      distance: startingDistance,
      scale,
      contentX: (startMidpoint.x - center.x - panX) / scale,
      contentY: (startMidpoint.y - center.y - panY) / scale,
    };
    panStart = null;
  }

  function startPan(pointer) {
    if (!pointer) return;

    panStart = {
      pointerId: pointer.id,
      x: pointer.x,
      y: pointer.y,
      panX,
      panY,
    };
    pinchStart = null;
  }

  function updatePinch() {
    const [first, second] = [...pointers.values()];
    if (!first || !second || !pinchStart) return;

    const currentMidpoint = midpoint(first, second);
    const center = stageCenter();
    const currentDistance = Math.max(distance(first, second), 1);

    scale = clamp(
      pinchStart.scale * (currentDistance / pinchStart.distance),
      MIN_SCALE,
      MAX_SCALE,
    );
    panX = currentMidpoint.x - center.x - pinchStart.contentX * scale;
    panY = currentMidpoint.y - center.y - pinchStart.contentY * scale;
    applyTransform(false);
  }

  function updatePan(pointer) {
    if (!pointer || !panStart || pointer.id !== panStart.pointerId) return;

    panX = panStart.panX + pointer.x - panStart.x;
    panY = panStart.panY + pointer.y - panStart.y;
    applyTransform(false);
  }

  function onPointerDown(event) {
    if (!isTouchPointer(event)) return;

    const parts = viewerParts();
    if (!parts || !parts.stage.contains(event.target)) return;
    if (event.target.closest?.("button")) return;

    activateViewer(parts);
    pointers.set(event.pointerId, {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.size >= 2) {
      suppressSwipeUntilPointersClear = true;
      startPinch();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (scale > MIN_SCALE || suppressSwipeUntilPointersClear) {
      startPan(pointers.get(event.pointerId));
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function onPointerMove(event) {
    if (!isTouchPointer(event) || !pointers.has(event.pointerId)) return;

    const pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    pointers.set(event.pointerId, pointer);

    if (pointers.size >= 2) {
      if (!pinchStart) startPinch();
      updatePinch();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (scale > MIN_SCALE || suppressSwipeUntilPointersClear) {
      if (!panStart) startPan(pointer);
      updatePan(pointer);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function finishPointer(event) {
    if (!isTouchPointer(event) || !pointers.has(event.pointerId)) return;

    const gestureWasControlled =
      suppressSwipeUntilPointersClear || pointers.size >= 2 || scale > MIN_SCALE;
    pointers.delete(event.pointerId);

    if (gestureWasControlled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (pointers.size >= 2) {
      startPinch();
      return;
    }

    if (pointers.size === 1 && scale > MIN_SCALE) {
      startPan([...pointers.values()][0]);
      return;
    }

    pinchStart = null;
    panStart = null;

    if (scale <= RESET_SCALE_THRESHOLD) resetZoom(true);
    if (pointers.size === 0) suppressSwipeUntilPointersClear = false;
  }

  function searchForViewer() {
    searchFrame = null;
    const parts = viewerParts();

    if (parts) {
      activateViewer(parts);
      return;
    }

    remainingSearchFrames -= 1;
    if (remainingSearchFrames > 0) {
      searchFrame = window.requestAnimationFrame(searchForViewer);
    }
  }

  function scheduleViewerSearch() {
    window.cancelAnimationFrame(searchFrame);
    remainingSearchFrames = VIEWER_SEARCH_FRAMES;
    searchFrame = window.requestAnimationFrame(searchForViewer);
  }

  document.addEventListener("pointerdown", onPointerDown, {
    capture: true,
    passive: false,
  });
  document.addEventListener("pointermove", onPointerMove, {
    capture: true,
    passive: false,
  });
  document.addEventListener("pointerup", finishPointer, {
    capture: true,
    passive: false,
  });
  document.addEventListener("pointercancel", finishPointer, {
    capture: true,
    passive: false,
  });
  document.addEventListener(
    "click",
    (event) => {
      if (activeStage?.contains(event.target)) {
        window.setTimeout(() => {
          const parts = viewerParts();
          if (parts) activateViewer(parts);
        }, 0);
        return;
      }

      if (isViewerOpeningInteraction(event.target)) scheduleViewerSearch();
    },
    true,
  );
  window.addEventListener("resize", () => {
    if (!activeImage || scale <= MIN_SCALE) return;
    applyTransform(false);
  });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => {
      if (!activeImage || scale <= MIN_SCALE) return;
      applyTransform(false);
    }, 150);
  });

  const existingParts = viewerParts();
  if (existingParts) activateViewer(existingParts);
}
