import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "../components/UI";
import { COLORS } from "../lib/constants";
import { supabase } from "../lib/supabase";

const CLIENT_GALLERY_BUCKET = "client-galleries";
const BRAND_NAME = "Estanler Aleman Photography";

const shellFont = "'Inter', sans-serif";
const displayFont = "'Playfair Display', Georgia, serif";

function getGalleryPhotoUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(CLIENT_GALLERY_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function sortByOrder(items = []) {
  return [...items].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getPhotoUrl(photo, preferred = "display") {
  if (!photo) return "";
  const path =
    preferred === "original"
      ? photo.original_path || photo.display_path || photo.thumbnail_path
      : preferred === "thumbnail"
        ? photo.thumbnail_path || photo.display_path || photo.original_path
        : photo.display_path || photo.thumbnail_path || photo.original_path;
  return getGalleryPhotoUrl(path);
}

function getTypographyTheme(style = "classic") {
  const themes = {
    classic: {
      family: displayFont,
      weight: 600,
      spacing: "0.02em",
      transform: "none",
    },
    modern: {
      family: shellFont,
      weight: 800,
      spacing: "-0.03em",
      transform: "none",
    },
    editorial: {
      family: displayFont,
      weight: 600,
      spacing: "0.18em",
      transform: "uppercase",
    },
    luxury: {
      family: "Didot, 'Bodoni 72', 'Playfair Display', Georgia, serif",
      weight: 500,
      spacing: "0.01em",
      transform: "none",
    },
    romantic: {
      family: "'Snell Roundhand', 'Brush Script MT', cursive",
      weight: 500,
      spacing: "0.01em",
      transform: "none",
    },
    fashion: {
      family: "Impact, 'Arial Black', sans-serif",
      weight: 800,
      spacing: "0.04em",
      transform: "uppercase",
    },
    cinematic: {
      family: shellFont,
      weight: 700,
      spacing: "0.2em",
      transform: "uppercase",
    },
    minimal: {
      family: "Helvetica, Arial, sans-serif",
      weight: 300,
      spacing: "0.08em",
      transform: "uppercase",
    },
    playful: {
      family: "'Trebuchet MS', Arial, sans-serif",
      weight: 800,
      spacing: "0.01em",
      transform: "none",
    },
    street: {
      family: "'Arial Black', Impact, sans-serif",
      weight: 900,
      spacing: "-0.02em",
      transform: "uppercase",
    },
  };

  return themes[style] || themes.classic;
}

function useLocalFavorites(galleryId) {
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    if (!galleryId) return;
    try {
      const stored = window.localStorage.getItem(`client-gallery-favorites:${galleryId}`);
      setFavorites(new Set(stored ? JSON.parse(stored) : []));
    } catch {
      setFavorites(new Set());
    }
  }, [galleryId]);

  useEffect(() => {
    if (!galleryId) return;
    window.localStorage.setItem(
      `client-gallery-favorites:${galleryId}`,
      JSON.stringify(Array.from(favorites)),
    );
  }, [favorites, galleryId]);

  const toggleFavorite = useCallback((photoId) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}

export default function Gallery() {
  const { slug } = useParams();
  const [gallery, setGallery] = useState(null);
  const [sections, setSections] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [hoveredPhotoId, setHoveredPhotoId] = useState(null);
  const [slideshowPlaying, setSlideshowPlaying] = useState(false);

  const { favorites, toggleFavorite } = useLocalFavorites(gallery?.id);

  const orderedSections = useMemo(() => sortByOrder(sections), [sections]);
  const orderedPhotos = useMemo(() => sortByOrder(photos), [photos]);
  const coverPhoto = useMemo(
    () =>
      orderedPhotos.find((photo) => photo.id === gallery?.cover_image_id) ||
      orderedPhotos[0] ||
      null,
    [gallery?.cover_image_id, orderedPhotos],
  );
  const lightboxIndex = useMemo(
    () => (lightbox ? orderedPhotos.findIndex((photo) => photo.id === lightbox.id) : -1),
    [lightbox, orderedPhotos],
  );

  const loadGallery = useCallback(async () => {
    if (!slug) return;
    setState("loading");
    setError("");

    const { data: galleryData, error: galleryError } = await supabase
      .from("client_galleries")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (galleryError || !galleryData) {
      setGallery(null);
      setState("notfound");
      return;
    }

    const [sectionResult, photoResult] = await Promise.all([
      supabase
        .from("client_gallery_sections")
        .select("*")
        .eq("gallery_id", galleryData.id)
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("client_gallery_images")
        .select("*")
        .eq("gallery_id", galleryData.id)
        .order("display_order", { ascending: true }),
    ]);

    if (sectionResult.error || photoResult.error) {
      setError(sectionResult.error?.message || photoResult.error?.message || "Gallery could not load.");
      setState("error");
      return;
    }

    setGallery(galleryData);
    setSections(sectionResult.data || []);
    setPhotos(photoResult.data || []);
    setState("view");
  }, [slug]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
      if (event.key === "ArrowRight" && lightboxIndex < orderedPhotos.length - 1) {
        setLightbox(orderedPhotos[lightboxIndex + 1]);
      }
      if (event.key === "ArrowLeft" && lightboxIndex > 0) {
        setLightbox(orderedPhotos[lightboxIndex - 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox, lightboxIndex, orderedPhotos]);

  useEffect(() => {
    if (!slideshowPlaying || !lightbox || orderedPhotos.length < 2) return undefined;
    const timer = window.setTimeout(() => {
      const nextIndex = lightboxIndex >= orderedPhotos.length - 1 ? 0 : lightboxIndex + 1;
      setLightbox(orderedPhotos[nextIndex]);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [lightbox, lightboxIndex, orderedPhotos, slideshowPlaying]);

  const scrollToPhotos = () => {
    document.getElementById("gallery-sections")?.scrollIntoView({ behavior: "smooth" });
  };

  const sectionPhotos = useCallback(
    (sectionId) => orderedPhotos.filter((photo) => photo.section_id === sectionId),
    [orderedPhotos],
  );

  const copyText = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(message);
    } catch {
      setNotice("Copy failed. Please copy from the address bar.");
    }
  };

  const shareGallery = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: gallery?.title || BRAND_NAME, url });
        return;
      } catch {
        return;
      }
    }
    copyText(url, "Gallery link copied.");
  };

  const sharePhoto = async (photo) => {
    const url = getPhotoUrl(photo, "display");
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

  const downloadPhoto = (photo) => {
    const url = getPhotoUrl(photo, "original");
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = photo.file_name || "gallery-photo";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadAllPhotos = async () => {
    if (!orderedPhotos.length) return;
    setNotice(`Starting ${orderedPhotos.length} photo download${orderedPhotos.length === 1 ? "" : "s"}.`);
    for (const photo of orderedPhotos) {
      downloadPhoto(photo);
      await new Promise((resolve) => window.setTimeout(resolve, 130));
    }
  };

  const startSlideshow = () => {
    if (!orderedPhotos.length) {
      setNotice("No photos available for slideshow yet.");
      return;
    }
    setLightbox(orderedPhotos[0]);
    setSlideshowPlaying(true);
  };

  const goLightbox = (direction) => {
    const nextIndex = lightboxIndex + direction;
    if (nextIndex >= 0 && nextIndex < orderedPhotos.length) {
      setLightbox(orderedPhotos[nextIndex]);
    }
  };

  const iconButtonStyle = {
    background: "transparent",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontFamily: shellFont,
    fontSize: 24,
    lineHeight: 1,
    padding: "0.55rem 0.65rem",
  };

  if (state === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (state === "notfound" || state === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          color: COLORS.white,
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontFamily: displayFont, fontSize: "2.3rem", margin: "0 0 1rem" }}>
            Gallery Not Found
          </h1>
          <p style={{ color: COLORS.muted, fontFamily: shellFont, lineHeight: 1.7, margin: 0 }}>
            {error || "This gallery may be hidden, archived, or the link may be incorrect."}
          </p>
        </div>
      </div>
    );
  }

  const themeColor = gallery.theme_color || COLORS.gold;
  const coverStyle = gallery.cover_style || "center";
  const gridStyle = gallery.grid_style || "masonry";
  const typeTheme = getTypographyTheme(gallery.typography_style || "classic");
  const coverUrl = getPhotoUrl(coverPhoto, "display");
  const objectPosition = `${gallery.cover_focal_x ?? 50}% ${gallery.cover_focal_y ?? 50}%`;
  const coverBackground = {
    backgroundImage: coverUrl ? `url(${coverUrl})` : "linear-gradient(135deg, #111, #333)",
    backgroundPosition: objectPosition,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  };
  const visiblePhotoCount = orderedSections.reduce(
    (total, section) => total + sectionPhotos(section.id).length,
    0,
  );

  const titleBlock = (align = "center", color = "#fff", options = {}) => (
    <div
      style={{
        textAlign: align,
        color,
        width: "100%",
        maxWidth: options.maxWidth || 760,
        textShadow: color === "#fff" ? "0 14px 36px rgba(0,0,0,0.42)" : "none",
      }}
    >
      <div
        style={{
          color: options.dateColor || themeColor,
          fontFamily: shellFont,
          fontSize: options.dateSize || 12,
          fontWeight: 800,
          letterSpacing: "0.18em",
          marginBottom: "0.85rem",
          textTransform: "uppercase",
        }}
      >
        {formatDate(gallery.event_date)}
      </div>
      <h1
        style={{
          fontFamily: typeTheme.family,
          fontSize: options.titleSize || "clamp(2.55rem, 8vw, 6.4rem)",
          fontWeight: typeTheme.weight,
          letterSpacing: typeTheme.spacing,
          lineHeight: 0.98,
          margin: 0,
          overflowWrap: "anywhere",
          textTransform: typeTheme.transform,
        }}
      >
        {gallery.title}
      </h1>
      {gallery.client_name && (
        <div
          style={{
            fontFamily: shellFont,
            fontSize: options.clientSize || 13,
            letterSpacing: "0.14em",
            marginTop: "1.1rem",
            textTransform: "uppercase",
          }}
        >
          {gallery.client_name}
        </div>
      )}
    </div>
  );

  const viewButton = (variant = "light") => (
    <button
      type="button"
      onClick={scrollToPhotos}
      style={{
        background: variant === "dark" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.11)",
        border: `1px solid ${variant === "dark" ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.65)"}`,
        color: variant === "dark" ? "#111" : "#fff",
        cursor: "pointer",
        fontFamily: shellFont,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.16em",
        marginTop: "2.2rem",
        padding: "0.95rem 1.6rem",
        textTransform: "uppercase",
      }}
    >
      View Gallery
    </button>
  );

  const renderHero = () => {
    const heroHeight = "100vh";
    const compactTitle = {
      titleSize: "clamp(2rem, 4.4vw, 3.7rem)",
      maxWidth: 520,
      dateSize: 11,
      clientSize: 12,
    };

    if (coverStyle === "novel") {
      return (
        <section
          style={{
            minHeight: heroHeight,
            background: "#fff",
            color: "#111",
            display: "grid",
            gridTemplateColumns: "minmax(280px, 42%) minmax(0, 58%)",
            border: "clamp(14px, 2vw, 28px) solid #fff",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "grid", placeItems: "center", padding: "clamp(2rem, 5vw, 5rem)" }}>
            <div>{titleBlock("left", "#111", compactTitle)}{viewButton("dark")}</div>
          </div>
          <div style={{ ...coverBackground, minHeight: heroHeight }} />
        </section>
      );
    }

    if (coverStyle === "journal") {
      return (
        <section
          style={{
            minHeight: heroHeight,
            background: "#fff",
            color: "#111",
            display: "grid",
            gridTemplateColumns: "minmax(0, 62%) minmax(280px, 38%)",
          }}
        >
          <div style={{ ...coverBackground, minHeight: heroHeight }} />
          <div style={{ display: "grid", placeItems: "center", padding: "clamp(2rem, 4vw, 4rem)" }}>
            <div>{titleBlock("left", "#111", compactTitle)}{viewButton("dark")}</div>
          </div>
        </section>
      );
    }

    if (coverStyle === "minimal") {
      return (
        <section
          style={{
            minHeight: heroHeight,
            background: "#fff",
            color: "#111",
            display: "grid",
            placeItems: "center",
            padding: "clamp(2rem, 5vw, 5rem)",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <div style={{ width: "min(760px, 100%)" }}>
            <div
              style={{
                ...coverBackground,
                width: "min(300px, 64vw)",
                aspectRatio: "1 / 1",
                margin: "0 auto 2rem",
              }}
            />
            {titleBlock("center", "#111", { titleSize: "clamp(2rem, 6vw, 4.25rem)" })}
            {viewButton("dark")}
          </div>
        </section>
      );
    }

    if (coverStyle === "split") {
      return (
        <section
          style={{
            minHeight: heroHeight,
            background: "#101010",
            color: "#fff",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 1fr)",
          }}
        >
          <div style={{ ...coverBackground, minHeight: heroHeight }} />
          <div style={{ display: "grid", placeItems: "center", padding: "clamp(2rem, 5vw, 5rem)" }}>
            <div>{titleBlock("left", "#fff", compactTitle)}{viewButton()}</div>
          </div>
        </section>
      );
    }

    if (coverStyle === "vintage") {
      return (
        <section
          style={{
            minHeight: heroHeight,
            background: "#252525",
            padding: "clamp(1rem, 2.5vw, 2rem)",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateRows: "minmax(360px, 1fr) auto",
          }}
        >
          <div style={{ ...coverBackground, minHeight: "calc(100vh - 128px)" }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(140px, 1fr) minmax(0, auto) minmax(140px, 1fr)",
              alignItems: "center",
              gap: "1.5rem",
              color: "#fff",
              padding: "clamp(1.3rem, 3vw, 2rem) 0.5rem 0.35rem",
            }}
          >
            <div style={{ fontFamily: shellFont, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.78 }}>
              {BRAND_NAME}
            </div>
            {titleBlock("center", "#fff", { titleSize: "clamp(1.8rem, 4vw, 3.45rem)", maxWidth: 720 })}
            <div style={{ textAlign: "right" }}>{viewButton()}</div>
          </div>
        </section>
      );
    }

    if (coverStyle === "divider") {
      return (
        <section
          style={{
            minHeight: heroHeight,
            ...coverBackground,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "flex-start",
          }}
        >
          <div
            style={{
              width: "min(520px, 46vw)",
              minHeight: heroHeight,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(1px)",
              display: "grid",
              placeItems: "center",
              padding: "clamp(2rem, 5vw, 4rem)",
              boxSizing: "border-box",
            }}
          >
            <div style={{ textAlign: "center" }}>
              {titleBlock("center", "#fff", { titleSize: "clamp(1.8rem, 4vw, 3.3rem)", maxWidth: 430 })}
              {viewButton()}
            </div>
          </div>
        </section>
      );
    }

    const hasTint = ["center", "left", "stripe"].includes(coverStyle);
    const alignItems = coverStyle === "stripe" ? "center" : "flex-end";
    const justifyContent = coverStyle === "left" ? "flex-start" : "center";
    const textAlign = coverStyle === "left" ? "left" : "center";

    return (
      <section
        style={{
          minHeight: heroHeight,
          ...coverBackground,
          position: "relative",
          display: "flex",
          alignItems,
          justifyContent,
          padding: "clamp(2rem, 6vw, 6rem)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {hasTint && <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.48), rgba(0,0,0,0.22))" }} />}
        {coverStyle === "stripe" && <span style={{ position: "absolute", left: "12%", right: "12%", top: "50%", height: 1, background: "rgba(255,255,255,0.72)" }} />}
        {coverStyle === "frame" && <span style={{ position: "absolute", inset: "clamp(1.25rem, 4vw, 3.2rem)", border: "2px solid rgba(255,255,255,0.9)", boxShadow: "0 0 0 1px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(0,0,0,0.2)" }} />}
        <div style={{ position: "relative", zIndex: 1, textAlign }}>
          <div style={{ fontFamily: shellFont, fontSize: 11, letterSpacing: "0.2em", marginBottom: "clamp(4rem, 16vh, 9rem)", textTransform: "uppercase", color: "#fff" }}>
            {BRAND_NAME}
          </div>
          {titleBlock(textAlign, "#fff")}
          {viewButton()}
        </div>
      </section>
    );
  };

  const PhotoCard = ({ photo, mode = "masonry", index = 0 }) => {
    const thumbnailUrl = getPhotoUrl(photo, "thumbnail");
    const displayUrl = getPhotoUrl(photo, "display");
    const imageUrl = displayUrl || thumbnailUrl;
    const isFavorite = favorites.has(photo.id);
    const hovered = hoveredPhotoId === photo.id;
    const isSquare = mode === "square";
    const isMosaicFeature = mode === "mosaic" && index % 7 === 0;

    return (
      <article
        onMouseEnter={() => setHoveredPhotoId(photo.id)}
        onMouseLeave={() => setHoveredPhotoId(null)}
        style={{
          breakInside: "avoid",
          marginBottom: mode === "clean" || mode === "editorial" ? 18 : 8,
          position: "relative",
          overflow: "hidden",
          background: "#111",
          cursor: "zoom-in",
          gridColumn: isMosaicFeature ? "span 2" : undefined,
          gridRow: isMosaicFeature ? "span 2" : undefined,
          aspectRatio: isSquare || mode === "mosaic" ? "1 / 1" : undefined,
        }}
      >
        <img
          src={imageUrl}
          alt={photo.alt_text || photo.title || photo.file_name || "Gallery photo"}
          loading="lazy"
          onClick={() => setLightbox(photo)}
          onError={(event) => {
            if (thumbnailUrl && event.currentTarget.src !== thumbnailUrl) {
              event.currentTarget.src = thumbnailUrl;
            }
          }}
          style={{
            width: "100%",
            height: isSquare || mode === "mosaic" ? "100%" : "auto",
            objectFit: isSquare || mode === "mosaic" ? "cover" : "cover",
            display: "block",
            transform: hovered ? "scale(1.035)" : "scale(1)",
            transition: "transform 0.45s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.74), rgba(0,0,0,0.06) 58%, transparent)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.25s ease",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0.8rem",
          }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setLightbox(photo);
            }}
            style={{
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.36)",
              color: "#fff",
              cursor: "pointer",
              fontFamily: shellFont,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
              padding: "0.55rem 0.75rem",
              textTransform: "uppercase",
            }}
          >
            View
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                sharePhoto(photo);
              }}
              style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}
              title="Share photo"
            >
              ↗
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleFavorite(photo.id);
              }}
              style={{ background: "transparent", border: "none", color: isFavorite ? themeColor : "#fff", cursor: "pointer", fontSize: "1.35rem", lineHeight: 1 }}
              title="Favorite photo"
            >
              {isFavorite ? "♥" : "♡"}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderSectionPhotos = (section, items) => {
    if (!items.length) {
      return <div style={{ color: "#777", fontFamily: shellFont, fontSize: 14 }}>No photos in this set yet.</div>;
    }

    if (gridStyle === "square") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
          {items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="square" index={index} />)}
        </div>
      );
    }

    if (gridStyle === "horizontal") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="horizontal" index={index} />)}
        </div>
      );
    }

    if (gridStyle === "mosaic") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gridAutoRows: 170, gap: 10 }}>
          {items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="mosaic" index={index} />)}
        </div>
      );
    }

    if (gridStyle === "filmstrip") {
      return (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
          {items.map((photo, index) => (
            <div key={photo.id} style={{ flex: "0 0 min(74vw, 420px)" }}>
              <PhotoCard photo={photo} mode="filmstrip" index={index} />
            </div>
          ))}
        </div>
      );
    }

    const columnCount = gridStyle === "vertical" ? "2 300px" : gridStyle === "clean" ? "4 220px" : gridStyle === "editorial" ? "3 280px" : "3 240px";
    return (
      <div style={{ columns: columnCount, columnGap: gridStyle === "editorial" || gridStyle === "clean" ? 18 : 8 }}>
        {items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode={gridStyle} index={index} />)}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f2ee", color: "#111" }}>
      {renderHero()}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 70,
          background: "rgba(255,255,255,0.94)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(14px)",
          display: "grid",
          gridTemplateColumns: "minmax(180px, 1fr) auto minmax(180px, 1fr)",
          alignItems: "center",
          gap: "1rem",
          padding: "0.9rem clamp(1rem, 4vw, 3rem)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: displayFont, fontSize: "1.1rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {gallery.title}
          </div>
          <div style={{ color: "#777", fontFamily: shellFont, fontSize: 12, marginTop: 2 }}>
            {visiblePhotoCount} photo{visiblePhotoCount === 1 ? "" : "s"}
            {favorites.size > 0 ? ` · ${favorites.size} favorite${favorites.size === 1 ? "" : "s"}` : ""}
          </div>
        </div>

        <nav style={{ display: "flex", gap: "0.4rem", overflowX: "auto", justifyContent: "center", maxWidth: "44vw" }}>
          {orderedSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{
                background: "transparent",
                border: "none",
                color: "#333",
                cursor: "pointer",
                fontFamily: shellFont,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                padding: "0.65rem 0.8rem",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {section.title}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <button
            type="button"
            onClick={() => setNotice(favorites.size > 0 ? `${favorites.size} favorite${favorites.size === 1 ? "" : "s"} saved on this device.` : "Tap the heart on any photo to add favorites.")}
            style={{ ...iconButtonStyle, color: favorites.size > 0 ? themeColor : "#555" }}
            title="Favorites"
          >
            ♡
          </button>
          <button type="button" onClick={downloadAllPhotos} style={iconButtonStyle} title="Download all photos">
            ⇩
          </button>
          <button type="button" onClick={shareGallery} style={iconButtonStyle} title="Share gallery">
            ↗
          </button>
          <button type="button" onClick={startSlideshow} style={iconButtonStyle} title="Play slideshow">
            ▶
          </button>
        </div>
      </header>

      {notice && (
        <div
          style={{
            position: "fixed",
            top: 82,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 120,
            background: "#111",
            color: "#fff",
            border: `1px solid ${themeColor}`,
            boxShadow: "0 16px 48px rgba(0,0,0,0.24)",
            fontFamily: shellFont,
            fontSize: 13,
            padding: "0.85rem 1rem",
          }}
        >
          {notice}
        </div>
      )}

      <main id="gallery-sections" style={{ padding: "clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem)" }}>
        {orderedSections.length === 0 && (
          <div style={{ color: "#777", fontFamily: shellFont, padding: "4rem 1rem", textAlign: "center" }}>
            No visible photo sets yet.
          </div>
        )}

        {orderedSections.map((section) => {
          const items = sectionPhotos(section.id);
          return (
            <section id={`section-${section.id}`} key={section.id} style={{ scrollMarginTop: 110, marginBottom: "clamp(3rem, 7vw, 6rem)" }}>
              <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem" }}>
                <h2 style={{ fontFamily: displayFont, fontSize: "clamp(2rem, 4vw, 3.3rem)", lineHeight: 1, margin: 0 }}>
                  {section.title}
                </h2>
                <div style={{ color: "#777", fontFamily: shellFont, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  {items.length} photo{items.length === 1 ? "" : "s"}
                </div>
              </div>
              {renderSectionPhotos(section, items)}
            </section>
          );
        })}
      </main>

      {lightbox && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 220,
            background: "rgba(0,0,0,0.96)",
            color: "#fff",
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1rem clamp(1rem, 3vw, 2rem)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: shellFont, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)" }}>
                {lightboxIndex + 1} / {orderedPhotos.length}{slideshowPlaying ? " · Slideshow" : ""}
              </div>
              <div style={{ fontFamily: displayFont, fontSize: "1.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lightbox.title || lightbox.file_name || gallery.title}
              </div>
            </div>
            <button type="button" onClick={() => { setLightbox(null); setSlideshowPlaying(false); }} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 26 }}>×</button>
          </div>

          <div style={{ position: "relative", display: "grid", placeItems: "center", minHeight: 0, padding: "0 4rem" }}>
            {lightboxIndex > 0 && (
              <button type="button" onClick={() => goLightbox(-1)} style={{ position: "absolute", left: "1rem", background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "3rem" }}>‹</button>
            )}
            <img
              src={getPhotoUrl(lightbox, "display")}
              alt={lightbox.alt_text || lightbox.title || lightbox.file_name || "Gallery photo"}
              style={{ maxWidth: "100%", maxHeight: "78vh", objectFit: "contain", display: "block" }}
            />
            {lightboxIndex < orderedPhotos.length - 1 && (
              <button type="button" onClick={() => goLightbox(1)} style={{ position: "absolute", right: "1rem", background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "3rem" }}>›</button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.8rem", padding: "1rem" }}>
            <button type="button" onClick={() => toggleFavorite(lightbox.id)} style={{ background: "transparent", border: "none", color: favorites.has(lightbox.id) ? themeColor : "#fff", cursor: "pointer", fontSize: "1.7rem", lineHeight: 1 }}>
              {favorites.has(lightbox.id) ? "♥" : "♡"}
            </button>
            <button type="button" onClick={() => sharePhoto(lightbox)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", cursor: "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", padding: "0.75rem 1rem", textTransform: "uppercase" }}>
              Share
            </button>
            <button type="button" onClick={() => downloadPhoto(lightbox)} style={{ background: themeColor, border: "none", color: "#111", cursor: "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", padding: "0.75rem 1rem", textTransform: "uppercase" }}>
              Download
            </button>
            <button type="button" onClick={() => setSlideshowPlaying((playing) => !playing)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", cursor: "pointer", fontFamily: shellFont, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", padding: "0.75rem 1rem", textTransform: "uppercase" }}>
              {slideshowPlaying ? "Pause" : "Play"}
            </button>
          </div>
        </div>
      )}

      <footer style={{ borderTop: "1px solid rgba(0,0,0,0.08)", padding: "2.5rem 1rem", textAlign: "center" }}>
        <a
          href="/"
          style={{
            color: "#777",
            fontFamily: shellFont,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          {BRAND_NAME}
        </a>
      </footer>
    </div>
  );
}
