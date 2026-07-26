function isPublicGalleryRoute() {
  return /^\/gallery\/[^/]+/.test(window.location.pathname);
}

function installGalleryHoverStyles() {
  document.getElementById("est114-gallery-layout-fixes")?.remove();
  document.getElementById("est114-stable-gallery-hover")?.remove();
  document.getElementById("est114-grid-stability-styles")?.remove();

  const style = document.createElement("style");
  style.id = "est114-grid-stability-styles";
  style.textContent = `
    main#gallery-sections article > div:last-child {
      opacity: 0 !important;
    }

    @media (hover: hover) and (pointer: fine) {
      main#gallery-sections article:hover > div:last-child {
        opacity: 1 !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installPublicGalleryGridStability() {
  if (typeof window === "undefined") return;
  if (window.__est114PublicGalleryGridStabilityInstalled) return;

  window.__est114PublicGalleryGridStabilityInstalled = true;
  installGalleryHoverStyles();

  const stopReactHoverRerender = (event) => {
    if (!isPublicGalleryRoute()) return;
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest("main#gallery-sections article")) return;

    event.stopPropagation();
  };

  document.addEventListener("mouseover", stopReactHoverRerender, true);
  document.addEventListener("mouseout", stopReactHoverRerender, true);
}
