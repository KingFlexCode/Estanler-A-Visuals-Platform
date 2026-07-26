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
  `;
  document.head.appendChild(style);
}

export function installPublicGalleryGridStability() {
  if (typeof window === "undefined") return;
  if (window.__est114PublicGalleryGridStabilityV4Installed) return;

  window.__est114PublicGalleryGridStabilityV4Installed = true;
  installGalleryHoverStyles();
}
