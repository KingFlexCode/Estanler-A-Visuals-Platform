import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BUCKET = "client-galleries";
const WATERMARK_CLASS = "est-gallery-watermark-overlay";
const WATERMARK_IMAGE_CLASS = "est-gallery-watermark-image";

function isPublicGalleryPage() {
  return window.location.pathname.startsWith("/gallery/");
}

function getSlugFromPathname(pathname = window.location.pathname) {
  const [, gallery, slug] = pathname.split("/");
  return gallery === "gallery" ? slug || "" : "";
}

function unlockStorageKey(slug = "") {
  return slug ? `client-gallery-unlock:${slug}` : "";
}

function galleryDownloadsEnabled() {
  return Boolean(document.querySelector('[title="Download gallery ZIP"]'));
}

function isGalleryImageTarget(target) {
  return Boolean(target?.closest?.("img"));
}

function storageUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function removeWatermarks() {
  document.querySelectorAll(`.${WATERMARK_CLASS}`).forEach((node) => node.remove());
}

function isLightboxImage(image) {
  return !image.closest("main#gallery-sections");
}

function getWatermarkParent(image) {
  const photoCard = image.closest("article");
  if (photoCard) return photoCard;

  const lightboxFrame = image.parentElement;
  if (lightboxFrame && lightboxFrame.style?.placeItems === "center") return lightboxFrame;

  return image.parentElement;
}

function resetOverlay(overlay) {
  overlay.innerHTML = "";
  overlay.style.backgroundImage = "none";
  overlay.style.backgroundRepeat = "initial";
  overlay.style.backgroundSize = "initial";
  overlay.style.backgroundPosition = "initial";
  overlay.style.opacity = "";
  overlay.style.filter = "none";
  overlay.dataset.watermarkKey = "";
}

function positionOverlay(overlay, image, parent, lightbox) {
  if (!lightbox) {
    Object.assign(overlay.style, {
      inset: "0",
      left: "auto",
      top: "auto",
      width: "auto",
      height: "auto",
    });
    return;
  }

  const imageRect = image.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  Object.assign(overlay.style, {
    inset: "auto",
    left: `${imageRect.left - parentRect.left}px`,
    top: `${imageRect.top - parentRect.top}px`,
    width: `${imageRect.width}px`,
    height: `${imageRect.height}px`,
  });
}

function styleWatermark(overlay, config, image, parent) {
  const mode = config.watermarkMode || "off";
  const lightbox = isLightboxImage(image);
  const layout = lightbox ? "fit" : config.watermarkLayout || "fit";
  const watermarkUrl = storageUrl(config.watermarkFilePath);
  const strong = mode === "strong";
  const imageRect = image.getBoundingClientRect();
  const key = `${watermarkUrl}|${mode}|${layout}|${lightbox}|${Math.round(imageRect.width)}x${Math.round(imageRect.height)}`;

  if (!watermarkUrl) {
    resetOverlay(overlay);
    return;
  }

  positionOverlay(overlay, image, parent, lightbox);
  if (overlay.dataset.watermarkKey === key) return;

  overlay.dataset.watermarkKey = key;
  overlay.innerHTML = "";

  Object.assign(overlay.style, {
    position: "absolute",
    zIndex: "2147483000",
    pointerEvents: "none",
    overflow: "hidden",
    boxSizing: "border-box",
    userSelect: "none",
  });

  if (layout === "tile") {
    Object.assign(overlay.style, {
      display: "block",
      padding: "0",
      backgroundImage: `url("${watermarkUrl}")`,
      backgroundRepeat: "repeat",
      backgroundPosition: "center",
      backgroundSize: strong ? "clamp(96px, 18%, 190px) auto" : "clamp(116px, 22%, 230px) auto",
      opacity: strong ? "0.36" : "0.2",
      filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.3))",
    });
    return;
  }

  Object.assign(overlay.style, {
    display: "grid",
    placeItems: "center",
    padding: strong ? "clamp(1rem, 4vw, 3rem)" : "clamp(1rem, 5vw, 4rem)",
    backgroundImage: "none",
    backgroundRepeat: "no-repeat",
    backgroundSize: "auto",
    backgroundPosition: "center",
    opacity: "1",
    filter: "none",
  });

  const watermarkImage = document.createElement("img");
  watermarkImage.className = WATERMARK_IMAGE_CLASS;
  watermarkImage.src = watermarkUrl;
  watermarkImage.alt = "";
  watermarkImage.draggable = false;
  Object.assign(watermarkImage.style, {
    display: "block",
    maxWidth: lightbox ? (strong ? "52%" : "38%") : (strong ? "min(62%, 560px)" : "min(44%, 380px)"),
    maxHeight: lightbox ? (strong ? "34%" : "24%") : (strong ? "42%" : "30%"),
    objectFit: "contain",
    opacity: strong ? "0.54" : "0.3",
    filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.38))",
    transform: "rotate(-14deg)",
    userSelect: "none",
  });

  overlay.appendChild(watermarkImage);
}

function applyWatermarks(config) {
  if (!isPublicGalleryPage() || !config || config.watermarkMode === "off" || !config.watermarkFilePath) {
    removeWatermarks();
    return;
  }

  const targets = document.querySelectorAll("main#gallery-sections img, div[style*='rgba(0,0,0,0.96)'] img");
  const activeParents = new Set();

  targets.forEach((image) => {
    if (image.closest?.(`.${WATERMARK_CLASS}`)) return;

    const parent = getWatermarkParent(image);
    if (!parent) return;
    activeParents.add(parent);

    const currentPosition = window.getComputedStyle(parent).position;
    if (currentPosition === "static") parent.style.position = "relative";

    let overlay = Array.from(parent.children).find((child) => child.classList?.contains(WATERMARK_CLASS));
    if (!overlay) {
      overlay = document.createElement("span");
      overlay.className = WATERMARK_CLASS;
      parent.appendChild(overlay);
    }
    styleWatermark(overlay, config, image, parent);
  });

  document.querySelectorAll(`.${WATERMARK_CLASS}`).forEach((overlay) => {
    if (!activeParents.has(overlay.parentElement)) overlay.remove();
  });
}

function normalizeConfig(gallery) {
  return {
    downloadsEnabled: gallery?.allow_downloads !== false,
    watermarkMode: gallery?.watermark_mode || "off",
    watermarkLayout: gallery?.watermark_layout || "fit",
    watermarkFilePath: gallery?.watermark_file_path || "",
  };
}

export default function GalleryImageGuard() {
  const location = useLocation();
  const configRef = useRef({ downloadsEnabled: true, watermarkMode: "off", watermarkLayout: "fit", watermarkFilePath: "" });
  const frameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const slug = getSlugFromPathname(location.pathname);

    function scheduleWatermarkSync() {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        applyWatermarks(configRef.current);
      });
    }

    async function loadGalleryProtection() {
      if (!slug) {
        configRef.current = { downloadsEnabled: true, watermarkMode: "off", watermarkLayout: "fit", watermarkFilePath: "" };
        removeWatermarks();
        return;
      }

      const savedPassword = window.sessionStorage.getItem(unlockStorageKey(slug));
      const { data, error } = await supabase.rpc("get_client_gallery_public_payload", {
        p_slug: slug,
        p_password: savedPassword || null,
      });

      if (cancelled || error) return;
      if (data?.gallery) configRef.current = normalizeConfig(data.gallery);
      scheduleWatermarkSync();
    }

    loadGalleryProtection();

    const observer = new MutationObserver(() => scheduleWatermarkSync());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleWatermarkSync);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", scheduleWatermarkSync);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      removeWatermarks();
    };
  }, [location.pathname]);

  useEffect(() => {
    function shouldBlockImageSave(event) {
      const downloadsDisabled = configRef.current?.downloadsEnabled === false || !galleryDownloadsEnabled();
      return isPublicGalleryPage() && isGalleryImageTarget(event.target) && downloadsDisabled;
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
