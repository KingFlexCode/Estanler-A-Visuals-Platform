import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const DEFAULT_WATERMARK_TEXT = "Estanler Aleman Photography";
const WATERMARK_CLASS = "est-gallery-watermark-overlay";

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

function removeWatermarks() {
  document.querySelectorAll(`.${WATERMARK_CLASS}`).forEach((node) => node.remove());
}

function getWatermarkParent(image) {
  const photoCard = image.closest("article");
  if (photoCard) return photoCard;

  const lightboxFrame = image.parentElement;
  if (lightboxFrame && lightboxFrame.style?.placeItems === "center") return lightboxFrame;

  return image.parentElement;
}

function styleWatermark(overlay, config) {
  const strong = config.watermarkMode === "strong";
  overlay.textContent = (config.watermarkText || DEFAULT_WATERMARK_TEXT).trim() || DEFAULT_WATERMARK_TEXT;
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    zIndex: "12",
    pointerEvents: "none",
    display: "grid",
    placeItems: "center",
    color: "rgba(255,255,255,0.86)",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: strong ? "clamp(1rem, 4.5vw, 3.25rem)" : "clamp(0.85rem, 2.7vw, 1.85rem)",
    fontWeight: strong ? "900" : "800",
    letterSpacing: strong ? "0.16em" : "0.12em",
    lineHeight: "1.2",
    opacity: strong ? "0.46" : "0.24",
    textAlign: "center",
    textShadow: "0 2px 14px rgba(0,0,0,0.58)",
    textTransform: "uppercase",
    transform: "rotate(-18deg)",
    userSelect: "none",
    mixBlendMode: "screen",
    padding: "1rem",
    boxSizing: "border-box",
  });
}

function applyWatermarks(config) {
  if (!isPublicGalleryPage() || !config || config.watermarkMode === "off") {
    removeWatermarks();
    return;
  }

  const targets = document.querySelectorAll("main#gallery-sections img, div[style*='rgba(0,0,0,0.96)'] img");
  const activeParents = new Set();

  targets.forEach((image) => {
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
    styleWatermark(overlay, config);
  });

  document.querySelectorAll(`.${WATERMARK_CLASS}`).forEach((overlay) => {
    if (!activeParents.has(overlay.parentElement)) overlay.remove();
  });
}

function normalizeConfig(gallery) {
  return {
    downloadsEnabled: gallery?.allow_downloads !== false,
    watermarkMode: gallery?.watermark_mode || "off",
    watermarkText: gallery?.watermark_text || gallery?.client_name || DEFAULT_WATERMARK_TEXT,
  };
}

export default function GalleryImageGuard() {
  const location = useLocation();
  const configRef = useRef({ downloadsEnabled: true, watermarkMode: "off", watermarkText: DEFAULT_WATERMARK_TEXT });
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
        configRef.current = { downloadsEnabled: true, watermarkMode: "off", watermarkText: DEFAULT_WATERMARK_TEXT };
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

    return () => {
      cancelled = true;
      observer.disconnect();
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
