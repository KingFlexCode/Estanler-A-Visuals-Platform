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

    /*
     * CSS multi-column layouts create an inline line box when masonry cards are
     * balanced into later columns. Removing that line-height and top-aligning
     * each card keeps the first image in every column on the same baseline.
     */
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
    }
  `;
  document.head.appendChild(style);
}

export function installPublicGalleryGridStability() {
  if (typeof window === "undefined") return;
  if (window.__est114PublicGalleryGridStabilityV2Installed) return;

  window.__est114PublicGalleryGridStabilityV2Installed = true;
  installGalleryHoverStyles();
}
