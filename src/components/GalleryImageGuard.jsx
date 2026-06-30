import { useEffect } from "react";

function isPublicGalleryPage() {
  return window.location.pathname.startsWith("/gallery/");
}

function galleryDownloadsEnabled() {
  return Boolean(document.querySelector('[title="Download gallery ZIP"]'));
}

function isGalleryImageTarget(target) {
  return Boolean(target?.closest?.("img"));
}

export default function GalleryImageGuard() {
  useEffect(() => {
    function shouldBlockImageSave(event) {
      return isPublicGalleryPage() && isGalleryImageTarget(event.target) && !galleryDownloadsEnabled();
    }

    function handleContextMenu(event) {
      if (!shouldBlockImageSave(event)) return;
      event.preventDefault();
    }

    function handleDragStart(event) {
      if (!shouldBlockImageSave(event)) return;
      event.preventDefault();
    }

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("dragstart", handleDragStart, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("dragstart", handleDragStart, true);
    };
  }, []);

  return null;
}
