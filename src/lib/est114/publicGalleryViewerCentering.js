function injectViewerCenteringStyles() {
  if (document.getElementById("est114-viewer-centering-fix")) return;

  const style = document.createElement("style");
  style.id = "est114-viewer-centering-fix";
  style.textContent = `
    div[data-est114-lightbox="true"] > :nth-child(2) {
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-rows: minmax(0, 1fr) !important;
      align-items: center !important;
      justify-items: center !important;
    }

    div[data-est114-lightbox="true"] > :nth-child(2) > img {
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: 100% !important;
      margin: auto !important;
      align-self: center !important;
      justify-self: center !important;
      object-fit: contain !important;
      object-position: 50% 50% !important;
      position: relative !important;
      top: auto !important;
      right: auto !important;
      bottom: auto !important;
      left: auto !important;
    }
  `;

  document.head.appendChild(style);
}

export function installPublicGalleryViewerCentering() {
  if (typeof window === "undefined") return;
  if (window.__est114PublicGalleryViewerCenteringInstalled) return;

  window.__est114PublicGalleryViewerCenteringInstalled = true;
  injectViewerCenteringStyles();
}
