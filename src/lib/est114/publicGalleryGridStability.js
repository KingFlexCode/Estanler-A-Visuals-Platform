const COLUMN_LEFT_TOLERANCE_PX = 6;
const COLUMN_ALIGNMENT_PROPERTY = "--est114-column-offset";

function installGalleryHoverStyles() {
  document.getElementById("est114-gallery-layout-fixes")?.remove();
  document.getElementById("est114-stable-gallery-hover")?.remove();
  document.getElementById("est114-grid-stability-styles")?.remove();

  const style = document.createElement("style");
  style.id = "est114-grid-stability-styles";
  style.textContent = `
    main#gallery-sections article > div:last-child {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    @media (hover: hover) and (pointer: fine) {
      main#gallery-sections article:hover > div:last-child {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    }

    @media (hover: none), (pointer: coarse) {
      main#gallery-sections article > div:last-child {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    }

    main#gallery-sections div[style*="columns"] {
      line-height: 0 !important;
    }

    main#gallery-sections div[style*="columns"] > article {
      display: inline-block !important;
      width: 100% !important;
      margin-top: 0 !important;
      vertical-align: top !important;
      line-height: normal !important;
      break-inside: avoid-column !important;
      -webkit-column-break-inside: avoid !important;
      transform: translateY(var(${COLUMN_ALIGNMENT_PROPERTY}, 0px)) !important;
    }
  `;
  document.head.appendChild(style);
}

function masonryContainers() {
  return [
    ...document.querySelectorAll('main#gallery-sections div[style*="columns"]'),
  ];
}

function currentColumnOffset(card) {
  const value = Number.parseFloat(
    card.style.getPropertyValue(COLUMN_ALIGNMENT_PROPERTY),
  );
  return Number.isFinite(value) ? value : 0;
}

function clearColumnOffsets(cards) {
  cards.forEach((card) => card.style.removeProperty(COLUMN_ALIGNMENT_PROPERTY));
}

function alignMasonryContainer(container) {
  const cards = [...container.children].filter(
    (element) => element instanceof HTMLElement && element.tagName === "ARTICLE",
  );

  if (cards.length < 2) {
    clearColumnOffsets(cards);
    return;
  }

  const columns = [];

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const naturalTop = rect.top - currentColumnOffset(card);
    let column = columns.find(
      (candidate) => Math.abs(candidate.left - rect.left) <= COLUMN_LEFT_TOLERANCE_PX,
    );

    if (!column) {
      column = { left: rect.left, top: naturalTop, cards: [] };
      columns.push(column);
    }

    column.top = Math.min(column.top, naturalTop);
    column.cards.push(card);
  });

  if (columns.length < 2) {
    clearColumnOffsets(cards);
    return;
  }

  const targetTop = Math.min(...columns.map((column) => column.top));

  columns.forEach((column) => {
    const offset = Math.round(targetTop - column.top);
    column.cards.forEach((card) => {
      if (Math.abs(offset) <= 1) {
        card.style.removeProperty(COLUMN_ALIGNMENT_PROPERTY);
      } else {
        card.style.setProperty(COLUMN_ALIGNMENT_PROPERTY, `${offset}px`);
      }
    });
  });
}

function installMeasuredColumnAlignment() {
  let alignmentFrame = null;
  let observedGallery = null;
  let discoveryAttempts = 0;
  const resizeObserver = new ResizeObserver(() => scheduleAlignment());

  function alignAllMasonryColumns() {
    alignmentFrame = null;
    masonryContainers().forEach(alignMasonryContainer);
  }

  function scheduleAlignment() {
    window.cancelAnimationFrame(alignmentFrame);
    alignmentFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(alignAllMasonryColumns);
    });
  }

  function discoverGallery() {
    const gallery = document.getElementById("gallery-sections");
    if (gallery && gallery !== observedGallery) {
      if (observedGallery) resizeObserver.unobserve(observedGallery);
      observedGallery = gallery;
      resizeObserver.observe(gallery);
      scheduleAlignment();
    }

    discoveryAttempts += 1;
    if (!observedGallery && discoveryAttempts < 80) {
      window.setTimeout(discoverGallery, 250);
    }
  }

  document.addEventListener(
    "load",
    (event) => {
      if (
        event.target instanceof HTMLImageElement &&
        event.target.closest("main#gallery-sections")
      ) {
        scheduleAlignment();
      }
    },
    true,
  );

  window.addEventListener("resize", scheduleAlignment, { passive: true });
  window.addEventListener("orientationchange", scheduleAlignment, {
    passive: true,
  });

  discoverGallery();
  window.setTimeout(scheduleAlignment, 500);
  window.setTimeout(scheduleAlignment, 1500);
}

export function installPublicGalleryGridStability() {
  if (typeof window === "undefined") return;
  if (window.__est114PublicGalleryGridStabilityV3Installed) return;

  window.__est114PublicGalleryGridStabilityV3Installed = true;
  installGalleryHoverStyles();
  installMeasuredColumnAlignment();
}
