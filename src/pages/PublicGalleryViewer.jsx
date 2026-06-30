import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { zipSync } from "fflate";
import { Spinner } from "../components/UI";
import { COLORS } from "../lib/constants";
import { supabase } from "../lib/supabase";

const BUCKET = "client-galleries";
const BRAND_NAME = "Estanler Aleman Photography";
const shellFont = "'Inter', sans-serif";
const displayFont = "'Playfair Display', Georgia, serif";

const shareOptions = [
  ["Messenger", "◖"],
  ["WhatsApp", "◔"],
  ["Facebook", "f"],
  ["Email", "✉"],
  ["X (Twitter)", "𝕏"],
  ["Pinterest", "P"],
  ["Threads", "@"],
  ["More", "…"],
];

function publicUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function photoUrl(photo, preferred = "display") {
  if (!photo) return "";
  const path =
    preferred === "original"
      ? photo.original_path || photo.display_path || photo.thumbnail_path
      : preferred === "thumbnail"
        ? photo.thumbnail_path || photo.display_path || photo.original_path
        : photo.display_path || photo.thumbnail_path || photo.original_path;
  return publicUrl(path);
}

function sortByOrder(items = []) {
  return [...items].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function sanitizeFileName(value = "file") {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";
}

function typography(style = "classic") {
  const map = {
    classic: { family: displayFont, weight: 600, spacing: "0.02em", transform: "none" },
    modern: { family: shellFont, weight: 800, spacing: "-0.03em", transform: "none" },
    editorial: { family: displayFont, weight: 600, spacing: "0.18em", transform: "uppercase" },
    luxury: { family: "Didot, 'Bodoni 72', 'Playfair Display', Georgia, serif", weight: 500, spacing: "0.01em", transform: "none" },
    romantic: { family: "'Snell Roundhand', 'Brush Script MT', cursive", weight: 500, spacing: "0.01em", transform: "none" },
    fashion: { family: "Impact, 'Arial Black', sans-serif", weight: 800, spacing: "0.04em", transform: "uppercase" },
    cinematic: { family: shellFont, weight: 700, spacing: "0.2em", transform: "uppercase" },
    minimal: { family: "Helvetica, Arial, sans-serif", weight: 300, spacing: "0.08em", transform: "uppercase" },
    playful: { family: "'Trebuchet MS', Arial, sans-serif", weight: 800, spacing: "0.01em", transform: "none" },
    street: { family: "'Arial Black', Impact, sans-serif", weight: 900, spacing: "-0.02em", transform: "uppercase" },
  };
  return map[style] || map.classic;
}

function useFavorites(galleryId, enabled) {
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    if (!galleryId || !enabled) {
      setFavorites(new Set());
      return;
    }
    try {
      const stored = window.localStorage.getItem(`client-gallery-favorites:${galleryId}`);
      setFavorites(new Set(stored ? JSON.parse(stored) : []));
    } catch {
      setFavorites(new Set());
    }
  }, [enabled, galleryId]);

  useEffect(() => {
    if (!galleryId || !enabled) return;
    window.localStorage.setItem(`client-gallery-favorites:${galleryId}`, JSON.stringify([...favorites]));
  }, [enabled, favorites, galleryId]);

  const toggleFavorite = (photoId) => {
    if (!enabled) return;
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  return { favorites, toggleFavorite };
}

function AccessState({ title, message, children }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.white, display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ color: COLORS.gold, fontFamily: shellFont, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", marginBottom: "1rem", textTransform: "uppercase" }}>{BRAND_NAME}</div>
        <h1 style={{ fontFamily: displayFont, fontSize: "clamp(2.2rem, 7vw, 4.4rem)", lineHeight: 1, margin: "0 0 1rem" }}>{title}</h1>
        <p style={{ color: COLORS.muted, fontFamily: shellFont, lineHeight: 1.7, margin: "0 auto 1.5rem", maxWidth: 420 }}>{message}</p>
        {children}
      </div>
    </div>
  );
}

export default function PublicGalleryViewer() {
  const { slug } = useParams();
  const cancelRef = useRef(false);
  const abortRef = useRef(null);
  const [gallery, setGallery] = useState(null);
  const [sections, setSections] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hoveredPhotoId, setHoveredPhotoId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [downloadState, setDownloadState] = useState({ busy: false, progress: 0, total: 0, currentFile: "", status: "idle", message: "" });

  const downloadsEnabled = gallery?.allow_downloads !== false;
  const favoritesEnabled = gallery?.allow_favorites !== false;
  const sharingEnabled = gallery?.allow_sharing !== false;

  const orderedSections = useMemo(() => sortByOrder(sections), [sections]);
  const orderedPhotos = useMemo(() => sortByOrder(photos), [photos]);
  const visibleSectionIds = useMemo(() => new Set(orderedSections.map((section) => section.id)), [orderedSections]);
  const publicPhotos = useMemo(() => orderedPhotos.filter((photo) => !photo.section_id || visibleSectionIds.has(photo.section_id)), [orderedPhotos, visibleSectionIds]);
  const coverPhoto = useMemo(() => publicPhotos.find((photo) => photo.id === gallery?.cover_image_id) || publicPhotos[0] || null, [gallery?.cover_image_id, publicPhotos]);
  const lightboxIndex = lightbox ? publicPhotos.findIndex((photo) => photo.id === lightbox.id) : -1;
  const { favorites, toggleFavorite } = useFavorites(gallery?.id, favoritesEnabled);

  const galleryUrl = useMemo(() => {
    if (typeof window === "undefined") return `/gallery/${slug || ""}`;
    return `${window.location.origin}/gallery/${slug || gallery?.slug || ""}`;
  }, [gallery?.slug, slug]);

  const loadGallery = useCallback(async (password = null) => {
    setError("");
    const { data, error: payloadError } = await supabase.rpc("get_client_gallery_public_payload", {
      p_slug: slug,
      p_password: password,
    });

    if (payloadError) {
      setError(payloadError.message || "Gallery could not load.");
      setStatus("error");
      return;
    }

    const nextState = data?.state || "unavailable";
    setGallery(data?.gallery || null);
    setSections(data?.sections || []);
    setPhotos(data?.photos || []);

    if (nextState === "available") {
      setPasswordError("");
      setStatus("view");
      return;
    }
    if (nextState === "locked") {
      setStatus("locked");
      if (password) setPasswordError("That password did not work. Please try again.");
      return;
    }
    if (nextState === "expired") {
      setStatus("expired");
      return;
    }
    setStatus("notfound");
  }, [slug]);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  useEffect(() => {
    if (!notice || downloadState.busy) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice, downloadState.busy]);

  useEffect(() => {
    if (!lightbox) {
      setSlideshowPlaying(false);
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setLightbox(null);
        setSlideshowPlaying(false);
      }
      if (event.key === "ArrowRight" && lightboxIndex < publicPhotos.length - 1) setLightbox(publicPhotos[lightboxIndex + 1]);
      if (event.key === "ArrowLeft" && lightboxIndex > 0) setLightbox(publicPhotos[lightboxIndex - 1]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox, lightboxIndex, publicPhotos]);

  useEffect(() => {
    if (!slideshowPlaying || !lightbox || publicPhotos.length < 2) return undefined;
    const timer = window.setTimeout(() => {
      const nextIndex = lightboxIndex >= publicPhotos.length - 1 ? 0 : lightboxIndex + 1;
      setLightbox(publicPhotos[nextIndex]);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [lightbox, lightboxIndex, publicPhotos, slideshowPlaying]);

  const submitPassword = async (event) => {
    event.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError("Enter the gallery password.");
      return;
    }
    setUnlocking(true);
    await loadGallery(passwordInput);
    setUnlocking(false);
  };

  const sectionPhotos = useCallback((sectionId) => publicPhotos.filter((photo) => photo.section_id === sectionId), [publicPhotos]);

  const copyText = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(message);
    } catch {
      setNotice("Copy failed. Please copy from the address bar.");
    }
  };

  const saveBlob = (blob, fileName) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const downloadPhoto = async (photo) => {
    if (!downloadsEnabled) {
      setNotice("Downloads are turned off for this gallery.");
      return;
    }
    const url = photoUrl(photo, "original");
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed.");
      const blob = await response.blob();
      saveBlob(blob, photo.file_name || "gallery-photo.jpg");
    } catch {
      setNotice("Download could not start. Please try again.");
    }
  };

  const sharePhoto = async (photo) => {
    if (!sharingEnabled) {
      setNotice("Sharing is turned off for this gallery.");
      return;
    }
    const url = photoUrl(photo, "display");
    if (navigator.share) {
      try {
        await navigator.share({ title: photo.file_name || gallery?.title || BRAND_NAME, url });
        return;
      } catch {
        return;
      }
    }
    copyText(url, "Photo link copied.");
  };

  const openDownloadModal = () => {
    if (!downloadsEnabled) {
      setNotice("Downloads are turned off for this gallery.");
      return;
    }
    setDownloadModalOpen(true);
    setDownloadState({ busy: false, progress: 0, total: publicPhotos.length, currentFile: "", status: "idle", message: "Ready to package this gallery into one ZIP file." });
  };

  const cancelZipDownload = () => {
    cancelRef.current = true;
    abortRef.current?.abort();
    setDownloadState((current) => ({ ...current, busy: false, status: "cancelled", message: "ZIP download cancelled." }));
  };

  const startZipDownload = async () => {
    if (!downloadsEnabled || downloadState.busy) return;
    if (!publicPhotos.length) {
      setDownloadState({ busy: false, progress: 0, total: 0, currentFile: "", status: "error", message: "No photos available to package yet." });
      return;
    }

    cancelRef.current = false;
    const folderName = sanitizeFileName(gallery?.slug || gallery?.title || slug || "gallery");
    const files = {};
    setDownloadState({ busy: true, progress: 0, total: publicPhotos.length, currentFile: "", status: "preparing", message: "Preparing gallery ZIP..." });

    try {
      for (let index = 0; index < publicPhotos.length; index += 1) {
        if (cancelRef.current) throw new Error("cancelled");
        const photo = publicPhotos[index];
        const url = photoUrl(photo, "original");
        if (!url) continue;

        const fileName = sanitizeFileName(photo.file_name || `photo-${index + 1}.jpg`);
        setDownloadState((current) => ({ ...current, progress: index + 1, currentFile: fileName, message: `Preparing ${index + 1} / ${publicPhotos.length}` }));
        const controller = new AbortController();
        abortRef.current = controller;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Photo could not be fetched.");
        files[`${folderName}/${String(index + 1).padStart(3, "0")}-${fileName}`] = new Uint8Array(await response.arrayBuffer());
      }

      if (cancelRef.current) throw new Error("cancelled");
      setDownloadState((current) => ({ ...current, busy: true, currentFile: "", status: "packaging", message: "Packaging ZIP file..." }));
      const zipBytes = zipSync(files, { level: 0 });
      saveBlob(new Blob([zipBytes], { type: "application/zip" }), `${folderName}.zip`);
      setDownloadState((current) => ({ ...current, busy: false, progress: current.total, status: "done", message: "ZIP download started." }));
    } catch (zipError) {
      if (cancelRef.current || zipError?.message === "cancelled" || zipError?.name === "AbortError") {
        setDownloadState((current) => ({ ...current, busy: false, status: "cancelled", message: "ZIP download cancelled." }));
      } else {
        setDownloadState((current) => ({ ...current, busy: false, status: "error", message: "ZIP download could not be prepared. Try downloading individual photos for now." }));
      }
    } finally {
      abortRef.current = null;
    }
  };

  const shareViaOption = async (label) => {
    if (!sharingEnabled) return;
    if (label === "Email") {
      window.location.href = `mailto:?subject=${encodeURIComponent(gallery?.title || BRAND_NAME)}&body=${encodeURIComponent(galleryUrl)}`;
      return;
    }
    if (label === "More" && navigator.share) {
      try {
        await navigator.share({ title: gallery?.title || BRAND_NAME, url: galleryUrl });
        return;
      } catch {
        return;
      }
    }
    copyText(galleryUrl, `${label} link copied.`);
  };

  const startSlideshow = () => {
    if (!publicPhotos.length) {
      setNotice("No photos available for slideshow yet.");
      return;
    }
    setLightbox(publicPhotos[0]);
    setSlideshowPlaying(true);
  };

  const goLightbox = (direction) => {
    const nextIndex = lightboxIndex + direction;
    if (nextIndex >= 0 && nextIndex < publicPhotos.length) setLightbox(publicPhotos[nextIndex]);
  };

  if (status === "loading") return <div style={{ minHeight: "100vh", background: COLORS.bg, display: "grid", placeItems: "center" }}><Spinner /></div>;

  if (status === "locked") {
    return (
      <AccessState title={gallery?.title || "Locked Gallery"} message="This gallery is password protected. Enter the password to view the photos.">
        <form onSubmit={submitPassword} style={{ display: "grid", gap: "0.85rem", margin: "0 auto", maxWidth: 360 }}>
          <input type="password" value={passwordInput} onChange={(event) => { setPasswordInput(event.target.value); setPasswordError(""); }} placeholder="Gallery password" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, color: COLORS.white, fontFamily: shellFont, fontSize: 14, outline: "none", padding: "0.95rem 1rem" }} />
          {passwordError && <div style={{ color: "#ff8b8b", fontFamily: shellFont, fontSize: 12 }}>{passwordError}</div>}
          <button type="submit" disabled={unlocking} style={{ background: COLORS.gold, border: "none", color: COLORS.bg, cursor: unlocking ? "not-allowed" : "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", opacity: unlocking ? 0.6 : 1, padding: "1rem 1.2rem", textTransform: "uppercase" }}>{unlocking ? "Checking..." : "Unlock Gallery"}</button>
        </form>
      </AccessState>
    );
  }

  if (status === "expired") return <AccessState title="Expired Gallery" message="This gallery is no longer available. Please contact the photographer if you need access restored." />;
  if (status === "notfound" || status === "error") return <AccessState title="Gallery Not Available" message={error || "This gallery may be hidden, archived, expired, or the link may be incorrect."} />;

  const themeColor = gallery.theme_color || COLORS.gold;
  const coverStyle = gallery.cover_style || "center";
  const gridStyle = gallery.grid_style || "masonry";
  const typeTheme = typography(gallery.typography_style || "classic");
  const coverUrl = photoUrl(coverPhoto, "display");
  const objectPosition = `${gallery.cover_focal_x ?? 50}% ${gallery.cover_focal_y ?? 50}%`;
  const coverBackground = { backgroundImage: coverUrl ? `url(${coverUrl})` : "linear-gradient(135deg, #111, #333)", backgroundPosition: objectPosition, backgroundSize: "cover", backgroundRepeat: "no-repeat" };
  const visiblePhotoCount = orderedSections.reduce((total, section) => total + sectionPhotos(section.id).length, 0);

  const actionIconStyle = { background: "transparent", border: "none", color: "#555", cursor: "pointer", fontFamily: shellFont, fontSize: 24, lineHeight: 1, padding: "0.55rem 0.65rem" };
  const photoActionButtonStyle = { background: "rgba(0,0,0,0.16)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "grid", fontSize: 18, height: 38, lineHeight: 1, placeItems: "center", width: 38 };
  const modalButtonStyle = { background: "#4f4f4f", border: "none", color: "#fff", cursor: "pointer", fontFamily: shellFont, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", padding: "1rem 1.35rem", textTransform: "uppercase" };

  const titleBlock = (align = "center", color = "#fff", options = {}) => <div style={{ textAlign: align, color, width: "100%", maxWidth: options.maxWidth || 760, textShadow: color === "#fff" ? "0 14px 36px rgba(0,0,0,0.42)" : "none" }}><div style={{ color: options.dateColor || themeColor, fontFamily: shellFont, fontSize: options.dateSize || 12, fontWeight: 800, letterSpacing: "0.18em", marginBottom: "0.85rem", textTransform: "uppercase" }}>{formatDate(gallery.event_date)}</div><h1 style={{ fontFamily: typeTheme.family, fontSize: options.titleSize || "clamp(2.55rem, 8vw, 6.4rem)", fontWeight: typeTheme.weight, letterSpacing: typeTheme.spacing, lineHeight: 0.98, margin: 0, overflowWrap: "anywhere", textTransform: typeTheme.transform }}>{gallery.title}</h1>{gallery.client_name && <div style={{ fontFamily: shellFont, fontSize: options.clientSize || 13, letterSpacing: "0.14em", marginTop: "1.1rem", textTransform: "uppercase" }}>{gallery.client_name}</div>}</div>;
  const viewButton = (variant = "light") => <button type="button" onClick={() => document.getElementById("gallery-sections")?.scrollIntoView({ behavior: "smooth" })} style={{ background: variant === "dark" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.11)", border: `1px solid ${variant === "dark" ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.65)"}`, color: variant === "dark" ? "#111" : "#fff", cursor: "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", marginTop: "2.2rem", padding: "0.95rem 1.6rem", textTransform: "uppercase" }}>View Gallery</button>;

  const renderHero = () => {
    const heroHeight = "100vh";
    const compactTitle = { titleSize: "clamp(2rem, 4.4vw, 3.7rem)", maxWidth: 520, dateSize: 11, clientSize: 12 };
    if (coverStyle === "novel" || coverStyle === "journal") {
      const imageFirst = coverStyle === "journal";
      return <section style={{ minHeight: heroHeight, background: "#fff", color: "#111", display: "grid", gridTemplateColumns: imageFirst ? "minmax(0, 62%) minmax(280px, 38%)" : "minmax(280px, 42%) minmax(0, 58%)", border: coverStyle === "novel" ? "clamp(14px, 2vw, 28px) solid #fff" : "none", boxSizing: "border-box" }}>{!imageFirst && <div style={{ display: "grid", placeItems: "center", padding: "clamp(2rem, 5vw, 5rem)" }}><div>{titleBlock("left", "#111", compactTitle)}{viewButton("dark")}</div></div>}<div style={{ ...coverBackground, minHeight: heroHeight }} />{imageFirst && <div style={{ display: "grid", placeItems: "center", padding: "clamp(2rem, 4vw, 4rem)" }}><div>{titleBlock("left", "#111", compactTitle)}{viewButton("dark")}</div></div>}</section>;
    }
    if (coverStyle === "minimal") return <section style={{ minHeight: heroHeight, background: "#fff", color: "#111", display: "grid", placeItems: "center", padding: "clamp(2rem, 5vw, 5rem)", boxSizing: "border-box", textAlign: "center" }}><div style={{ width: "min(760px, 100%)" }}><div style={{ ...coverBackground, width: "min(300px, 64vw)", aspectRatio: "1 / 1", margin: "0 auto 2rem" }} />{titleBlock("center", "#111", { titleSize: "clamp(2rem, 6vw, 4.25rem)" })}{viewButton("dark")}</div></section>;
    if (coverStyle === "split") return <section style={{ minHeight: heroHeight, background: "#101010", color: "#fff", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 1fr)" }}><div style={{ ...coverBackground, minHeight: heroHeight }} /><div style={{ display: "grid", placeItems: "center", padding: "clamp(2rem, 5vw, 5rem)" }}><div>{titleBlock("left", "#fff", compactTitle)}{viewButton()}</div></div></section>;
    if (coverStyle === "vintage") return <section style={{ minHeight: heroHeight, background: "#252525", padding: "clamp(1rem, 2.5vw, 2rem)", boxSizing: "border-box", display: "grid", gridTemplateRows: "minmax(360px, 1fr) auto" }}><div style={{ ...coverBackground, minHeight: "calc(100vh - 128px)" }} /><div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 1fr) minmax(0, auto) minmax(140px, 1fr)", alignItems: "center", gap: "1.5rem", color: "#fff", padding: "clamp(1.3rem, 3vw, 2rem) 0.5rem 0.35rem" }}><div style={{ fontFamily: shellFont, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.78 }}>{BRAND_NAME}</div>{titleBlock("center", "#fff", { titleSize: "clamp(1.8rem, 4vw, 3.45rem)", maxWidth: 720 })}<div style={{ textAlign: "right" }}>{viewButton()}</div></div></section>;
    if (coverStyle === "divider") return <section style={{ minHeight: heroHeight, ...coverBackground, display: "flex", alignItems: "stretch", justifyContent: "flex-start" }}><div style={{ width: "min(520px, 46vw)", minHeight: heroHeight, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(1px)", display: "grid", placeItems: "center", padding: "clamp(2rem, 5vw, 4rem)", boxSizing: "border-box" }}><div style={{ textAlign: "center" }}>{titleBlock("center", "#fff", { titleSize: "clamp(1.8rem, 4vw, 3.3rem)", maxWidth: 430 })}{viewButton()}</div></div></section>;
    const hasTint = ["center", "left", "stripe"].includes(coverStyle);
    const alignItems = coverStyle === "stripe" ? "center" : "flex-end";
    const justifyContent = coverStyle === "left" ? "flex-start" : "center";
    const textAlign = coverStyle === "left" ? "left" : "center";
    return <section style={{ minHeight: heroHeight, ...coverBackground, position: "relative", display: "flex", alignItems, justifyContent, padding: "clamp(2rem, 6vw, 6rem)", boxSizing: "border-box", overflow: "hidden" }}>{hasTint && <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.48), rgba(0,0,0,0.22))" }} />}{coverStyle === "stripe" && <span style={{ position: "absolute", left: "12%", right: "12%", top: "50%", height: 1, background: "rgba(255,255,255,0.72)" }} />}{coverStyle === "frame" && <span style={{ position: "absolute", inset: "clamp(1.25rem, 4vw, 3.2rem)", border: "2px solid rgba(255,255,255,0.9)", boxShadow: "0 0 0 1px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(0,0,0,0.2)" }} />}<div style={{ position: "relative", zIndex: 1, textAlign }}><div style={{ fontFamily: shellFont, fontSize: 11, letterSpacing: "0.2em", marginBottom: "clamp(4rem, 16vh, 9rem)", textTransform: "uppercase", color: "#fff" }}>{BRAND_NAME}</div>{titleBlock(textAlign, "#fff")}{viewButton()}</div></section>;
  };

  const PhotoCard = ({ photo, mode = "masonry", index = 0 }) => {
    const thumbnailUrl = photoUrl(photo, "thumbnail");
    const displayUrl = photoUrl(photo, "display");
    const imageUrl = displayUrl || thumbnailUrl;
    const isFavorite = favorites.has(photo.id);
    const hovered = hoveredPhotoId === photo.id;
    const isSquare = mode === "square";
    const isMosaicFeature = mode === "mosaic" && index % 7 === 0;
    return <article onClick={() => setLightbox(photo)} onMouseEnter={() => setHoveredPhotoId(photo.id)} onMouseLeave={() => setHoveredPhotoId(null)} style={{ breakInside: "avoid", marginBottom: mode === "clean" || mode === "editorial" ? 18 : 8, position: "relative", overflow: "hidden", background: "#111", cursor: "pointer", gridColumn: isMosaicFeature ? "span 2" : undefined, gridRow: isMosaicFeature ? "span 2" : undefined, aspectRatio: isSquare || mode === "mosaic" ? "1 / 1" : undefined }}><img src={imageUrl} alt={photo.alt_text || photo.title || photo.file_name || "Gallery photo"} loading="lazy" onError={(event) => { if (thumbnailUrl && event.currentTarget.src !== thumbnailUrl) event.currentTarget.src = thumbnailUrl; }} style={{ width: "100%", height: isSquare || mode === "mosaic" ? "100%" : "auto", objectFit: isSquare || mode === "mosaic" ? "cover" : "cover", display: "block" }} /><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 82, background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.34) 48%, transparent 100%)", opacity: hovered ? 1 : 0, transition: "opacity 0.2s ease", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: "0.75rem", padding: "0.8rem" }}>{favoritesEnabled && <button type="button" onClick={(event) => { event.stopPropagation(); toggleFavorite(photo.id); }} style={{ ...photoActionButtonStyle, color: isFavorite ? themeColor : "#fff" }} title="Favorite photo">{isFavorite ? "♥" : "♡"}</button>}{downloadsEnabled && <button type="button" onClick={(event) => { event.stopPropagation(); downloadPhoto(photo); }} style={photoActionButtonStyle} title="Download photo">⇩</button>}{sharingEnabled && <button type="button" onClick={(event) => { event.stopPropagation(); sharePhoto(photo); }} style={photoActionButtonStyle} title="Share photo">↗</button>}</div></article>;
  };

  const renderSectionPhotos = (items) => {
    if (!items.length) return <div style={{ color: "#777", fontFamily: shellFont, fontSize: 14 }}>No photos in this set yet.</div>;
    if (gridStyle === "square") return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>{items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="square" index={index} />)}</div>;
    if (gridStyle === "horizontal") return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>{items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="horizontal" index={index} />)}</div>;
    if (gridStyle === "mosaic") return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gridAutoRows: 170, gap: 10 }}>{items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="mosaic" index={index} />)}</div>;
    if (gridStyle === "filmstrip") return <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>{items.map((photo, index) => <div key={photo.id} style={{ flex: "0 0 min(74vw, 420px)" }}><PhotoCard photo={photo} mode="filmstrip" index={index} /></div>)}</div>;
    const columnCount = gridStyle === "vertical" ? "2 300px" : gridStyle === "clean" ? "4 220px" : gridStyle === "editorial" ? "3 280px" : "3 240px";
    return <div style={{ columns: columnCount, columnGap: gridStyle === "editorial" || gridStyle === "clean" ? 18 : 8 }}>{items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode={gridStyle} index={index} />)}</div>;
  };

  const renderShareModal = () => {
    if (!shareModalOpen || !sharingEnabled) return null;
    return <div style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.68)", display: "grid", placeItems: "center", padding: "2rem" }}><div style={{ width: "min(760px, 94vw)", background: "#1d1d1d", color: "#fff", boxShadow: "0 34px 90px rgba(0,0,0,0.5)", padding: "clamp(2rem, 5vw, 4rem)", position: "relative" }}><button type="button" onClick={() => setShareModalOpen(false)} style={{ position: "absolute", right: 22, top: 18, background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 30 }}>×</button><h2 style={{ fontFamily: shellFont, fontSize: "1.65rem", letterSpacing: "0.16em", margin: "0 0 2.2rem", textTransform: "uppercase" }}>Share</h2><div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", background: "#282828", marginBottom: "2.4rem" }}><input value={galleryUrl} readOnly style={{ background: "transparent", border: "none", color: "#fff", fontFamily: shellFont, fontSize: "1rem", minWidth: 0, outline: "none", padding: "1.25rem" }} /><button type="button" onClick={() => copyText(galleryUrl, "Gallery link copied.")} style={modalButtonStyle}>Copy</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(90px, 1fr))", gap: "2rem 1.2rem" }}>{shareOptions.map(([label, icon]) => <button key={label} type="button" onClick={() => shareViaOption(label)} style={{ background: "transparent", border: "none", color: "#b9b9b9", cursor: "pointer", fontFamily: shellFont, fontSize: "1rem" }}><span style={{ width: 64, height: 64, borderRadius: "50%", background: "#b9b9b9", color: "#222", display: "grid", placeItems: "center", fontSize: "1.8rem", fontWeight: 900, margin: "0 auto 0.7rem" }}>{icon}</span>{label}</button>)}</div></div></div>;
  };

  const renderDownloadModal = () => {
    if (!downloadModalOpen || !downloadsEnabled) return null;
    const progressPercent = downloadState.total > 0 ? Math.round((downloadState.progress / downloadState.total) * 100) : 0;
    return <div style={{ position: "fixed", inset: 0, zIndex: 265, background: "rgba(0,0,0,0.68)", display: "grid", placeItems: "center", padding: "2rem" }}><div style={{ width: "min(580px, 94vw)", background: "#1d1d1d", color: "#fff", boxShadow: "0 34px 90px rgba(0,0,0,0.5)", padding: "clamp(2rem, 5vw, 3.2rem)", position: "relative" }}><button type="button" onClick={() => downloadState.busy ? cancelZipDownload() : setDownloadModalOpen(false)} style={{ position: "absolute", right: 22, top: 18, background: "transparent", border: "none", color: "#aaa", cursor: "pointer", fontSize: 30 }}>×</button><h2 style={{ fontFamily: shellFont, fontSize: "1.5rem", letterSpacing: "0.16em", margin: "0 0 0.8rem", textTransform: "uppercase" }}>Download Gallery</h2><p style={{ color: "#b9b9b9", fontFamily: shellFont, lineHeight: 1.7, margin: "0 0 1.8rem" }}>Package {publicPhotos.length} photo{publicPhotos.length === 1 ? "" : "s"} into one ZIP file instead of downloading each image one by one.</p><div style={{ background: "#282828", padding: "1.2rem", marginBottom: "1.4rem" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", color: "#fff", fontFamily: shellFont, fontWeight: 800, marginBottom: 10 }}><span>{downloadState.message || "Ready"}</span><span>{downloadState.progress} / {downloadState.total || publicPhotos.length}</span></div><div style={{ height: 8, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}><div style={{ width: `${progressPercent}%`, height: "100%", background: themeColor, transition: "width 0.2s ease" }} /></div>{downloadState.currentFile && <div style={{ color: "#aaa", fontFamily: shellFont, fontSize: 12, marginTop: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Current: {downloadState.currentFile}</div>}</div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>{downloadState.busy ? <button type="button" onClick={cancelZipDownload} style={{ ...modalButtonStyle, background: "transparent", border: "1px solid rgba(255,255,255,0.28)" }}>Cancel</button> : <button type="button" onClick={() => setDownloadModalOpen(false)} style={{ ...modalButtonStyle, background: "transparent", border: "1px solid rgba(255,255,255,0.28)" }}>Close</button>}<button type="button" onClick={startZipDownload} disabled={downloadState.busy || downloadState.status === "done"} style={{ ...modalButtonStyle, background: themeColor, color: "#111", opacity: downloadState.busy || downloadState.status === "done" ? 0.55 : 1 }}>{downloadState.busy ? "Preparing..." : downloadState.status === "done" ? "Done" : "Start ZIP Download"}</button></div></div></div>;
  };

  return <div style={{ minHeight: "100vh", background: "#f4f2ee", color: "#111" }}>{renderHero()}<header style={{ position: "sticky", top: 0, zIndex: 70, background: "rgba(255,255,255,0.94)", borderBottom: "1px solid rgba(0,0,0,0.08)", backdropFilter: "blur(14px)", display: "grid", gridTemplateColumns: "minmax(180px, 1fr) auto minmax(180px, 1fr)", alignItems: "center", gap: "1rem", padding: "0.9rem clamp(1rem, 4vw, 3rem)" }}><div style={{ minWidth: 0 }}><div style={{ fontFamily: displayFont, fontSize: "1.1rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gallery.title}</div><div style={{ color: "#777", fontFamily: shellFont, fontSize: 12, marginTop: 2 }}>{visiblePhotoCount} photo{visiblePhotoCount === 1 ? "" : "s"}{favoritesEnabled && favorites.size > 0 ? ` · ${favorites.size} favorite${favorites.size === 1 ? "" : "s"}` : ""}</div></div><nav style={{ display: "flex", gap: "0.4rem", overflowX: "auto", justifyContent: "center", maxWidth: "44vw" }}>{orderedSections.map((section) => <button key={section.id} type="button" onClick={() => document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ background: "transparent", border: "none", color: "#333", cursor: "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", padding: "0.65rem 0.8rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>{section.title}</button>)}</nav><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>{favoritesEnabled && <button type="button" onClick={() => setNotice(favorites.size > 0 ? `${favorites.size} favorite${favorites.size === 1 ? "" : "s"} saved on this device.` : "Tap the heart on any photo to add favorites.")} style={{ ...actionIconStyle, color: favorites.size > 0 ? themeColor : "#555" }} title="Favorites">♡</button>}{downloadsEnabled && <button type="button" onClick={openDownloadModal} style={actionIconStyle} title="Download gallery ZIP">⇩</button>}{sharingEnabled && <button type="button" onClick={() => setShareModalOpen(true)} style={actionIconStyle} title="Share gallery">↗</button>}<button type="button" onClick={startSlideshow} style={actionIconStyle} title="Play slideshow">▶</button></div></header>{notice && <div style={{ position: "fixed", top: 82, left: "50%", transform: "translateX(-50%)", zIndex: 120, background: "#111", color: "#fff", border: `1px solid ${themeColor}`, boxShadow: "0 16px 48px rgba(0,0,0,0.24)", fontFamily: shellFont, fontSize: 13, padding: "0.85rem 1rem" }}>{notice}</div>}<main id="gallery-sections" style={{ padding: "clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem)" }}>{orderedSections.length === 0 && <div style={{ color: "#777", fontFamily: shellFont, padding: "4rem 1rem", textAlign: "center" }}>No visible photo sets yet.</div>}{orderedSections.map((section) => { const items = sectionPhotos(section.id); return <section id={`section-${section.id}`} key={section.id} style={{ scrollMarginTop: 110, marginBottom: "clamp(3rem, 7vw, 6rem)" }}><div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem" }}><h2 style={{ fontFamily: displayFont, fontSize: "clamp(2rem, 4vw, 3.3rem)", lineHeight: 1, margin: 0 }}>{section.title}</h2><div style={{ color: "#777", fontFamily: shellFont, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>{items.length} photo{items.length === 1 ? "" : "s"}</div></div>{renderSectionPhotos(items)}</section>; })}</main>{lightbox && <div style={{ position: "fixed", inset: 0, zIndex: 220, background: "rgba(0,0,0,0.96)", color: "#fff", display: "grid", gridTemplateRows: "auto 1fr auto" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1rem clamp(1rem, 3vw, 2rem)" }}><div style={{ minWidth: 0 }}><div style={{ fontFamily: shellFont, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)" }}>{lightboxIndex + 1} / {publicPhotos.length}{slideshowPlaying ? " · Slideshow" : ""}</div><div style={{ fontFamily: displayFont, fontSize: "1.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lightbox.title || lightbox.file_name || gallery.title}</div></div><button type="button" onClick={() => { setLightbox(null); setSlideshowPlaying(false); }} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 26 }}>×</button></div><div style={{ position: "relative", display: "grid", placeItems: "center", minHeight: 0, padding: "0 4rem" }}>{lightboxIndex > 0 && <button type="button" onClick={() => goLightbox(-1)} style={{ position: "absolute", left: "1rem", background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "3rem" }}>‹</button>}<img src={photoUrl(lightbox, "display")} alt={lightbox.alt_text || lightbox.title || lightbox.file_name || "Gallery photo"} style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", display: "block" }} />{lightboxIndex < publicPhotos.length - 1 && <button type="button" onClick={() => goLightbox(1)} style={{ position: "absolute", right: "1rem", background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "3rem" }}>›</button>}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.8rem", padding: "1rem" }}>{favoritesEnabled && <button type="button" onClick={() => toggleFavorite(lightbox.id)} style={{ background: "transparent", border: "none", color: favorites.has(lightbox.id) ? themeColor : "#fff", cursor: "pointer", fontSize: "1.7rem", lineHeight: 1 }}>{favorites.has(lightbox.id) ? "♥" : "♡"}</button>}{sharingEnabled && <button type="button" onClick={() => sharePhoto(lightbox)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", cursor: "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", padding: "0.75rem 1rem", textTransform: "uppercase" }}>Share</button>}{downloadsEnabled && <button type="button" onClick={() => downloadPhoto(lightbox)} style={{ background: themeColor, border: "none", color: "#111", cursor: "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", padding: "0.75rem 1rem", textTransform: "uppercase" }}>Download</button>}<button type="button" onClick={() => setSlideshowPlaying((playing) => !playing)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", cursor: "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", padding: "0.75rem 1rem", textTransform: "uppercase" }}>{slideshowPlaying ? "Pause" : "Play"}</button></div></div>}{renderShareModal()}{renderDownloadModal()}<footer style={{ borderTop: "1px solid rgba(0,0,0,0.08)", padding: "2.5rem 1rem", textAlign: "center" }}><a href="/" style={{ color: "#777", fontFamily: shellFont, fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textDecoration: "none", textTransform: "uppercase" }}>{BRAND_NAME}</a></footer></div>;
}
