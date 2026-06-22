import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { COLORS } from "../lib/constants";
import { Spinner } from "../components/UI";

const BASE_GALLERY = "https://kkimcezmyiqtfjdczeii.supabase.co/storage/v1/object/public/client-galleries";

export default function Gallery() {
  const { slug } = useParams();
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [state, setState] = useState("loading"); // loading | password | pin | view | notfound
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [downloadCount, setDownloadCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from("galleries")
        .select("*")
        .eq("slug", slug)
        .single();

      if (err || !data) { setState("notfound"); return; }
      setGallery(data);

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setState("notfound");
        return;
      }

      if (data.access_type === "public") {
        await loadPhotos(data.id);
        setState("view");
      } else {
        setState("password");
      }
    }
    load();
  }, [slug]);

  const handlePassword = async () => {
    if (password === gallery.password) {
      await loadPhotos(gallery.id);
      setState("view");
      setError(null);
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const handlePinSubmit = () => {
    if (pin === gallery.download_pin) {
      setPinError(false);
      triggerDownload(lightbox);
    } else {
      setPinError(true);
    }
  };

  async function loadPhotos(galleryId) {
    const { data } = await supabase
      .from("gallery_photos")
      .select("*")
      .eq("gallery_id", galleryId)
      .order("display_order", { ascending: true });
    setPhotos(data || []);

    // Get download count
    const { count } = await supabase
      .from("gallery_access")
      .select("*", { count: "exact", head: true })
      .eq("gallery_id", galleryId);
    setDownloadCount(count || 0);
  }

  const toggleFavorite = (id) => {
    setFavorites(p => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const canDownload = () => {
    if (gallery.max_downloads === 0) return true;
    return downloadCount < gallery.max_downloads;
  };

  const triggerDownload = async (photo) => {
    if (!canDownload()) { alert("Download limit reached for this gallery."); return; }
    // Track download
    await supabase.from("gallery_access").insert([{ gallery_id: gallery.id, photo_id: photo.id }]);
    setDownloadCount(p => p + 1);
    // Trigger download
    const url = `${BASE_GALLERY}/${photo.storage_path}`;
    const a = document.createElement("a");
    a.href = url; a.download = photo.filename; a.click();
  };

  const handleDownloadClick = (photo) => {
    if (gallery.download_pin) {
      setLightbox({ ...photo, awaitPin: true });
      setPin(""); setPinError(false);
    } else {
      triggerDownload(photo);
    }
  };

  const downloadAll = async () => {
    if (!canDownload()) { alert("Download limit reached for this gallery."); return; }
    for (const photo of photos) await handleDownloadClick(photo);
  };

  // Keyboard nav
  useEffect(() => {
    if (!lightbox || lightbox.awaitPin) return;
    const idx = photos.findIndex(p => p.id === lightbox.id);
    const handler = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight" && idx < photos.length - 1) setLightbox(photos[idx + 1]);
      if (e.key === "ArrowLeft" && idx > 0) setLightbox(photos[idx - 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, photos]);

  // ─── States ──────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (state === "notfound") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: COLORS.white, marginBottom: "1rem" }}>Gallery Not Found</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.9rem", color: COLORS.muted }}>
            This gallery may have expired or the link is incorrect.
          </div>
        </div>
      </div>
    );
  }

  if (state === "password") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "380px", padding: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.5rem", color: COLORS.white, marginBottom: "0.5rem" }}>
              {gallery.title}
            </div>
            {gallery.client_name && (
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.85rem", color: COLORS.muted }}>
                {gallery.client_name}
              </div>
            )}
            <div style={{ width: "40px", height: "1px", background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`, margin: "1rem auto" }} />
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.85rem", color: COLORS.muted }}>
              Enter your gallery password to view your photos.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input type="password" placeholder="Gallery password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePassword()}
              style={{
                background: "transparent", border: `1px solid ${COLORS.border}`,
                padding: "14px 16px", color: COLORS.white,
                fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.9rem",
                outline: "none", width: "100%", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = COLORS.gold}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
            {error && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.82rem", color: "#e05c5c" }}>{error}</div>}
            <button onClick={handlePassword} style={{
              fontFamily: "'Inter', sans-serif", fontSize: "11px",
              letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500,
              color: COLORS.bg, background: COLORS.gold,
              border: "none", padding: "14px", cursor: "pointer", width: "100%",
            }}>View Gallery</button>
          </div>

          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <a href="https://estanleravisuals.com" style={{
              fontFamily: "'Inter', sans-serif", fontSize: "10px",
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: COLORS.muted, textDecoration: "none", opacity: 0.5,
            }}>Estanler A Visuals</a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Gallery view ─────────────────────────────────────────────────────
  const idx = lightbox ? photos.findIndex(p => p.id === lightbox.id) : -1;

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      {/* Gallery header */}
      <div style={{
        background: "rgba(10,10,10,0.95)", borderBottom: `1px solid ${COLORS.border}`,
        padding: "1rem clamp(1.5rem, 5vw, 3rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)",
      }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.1rem", color: COLORS.white }}>
            {gallery.title}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: COLORS.muted, marginTop: "2px" }}>
            {photos.length} photos
            {favorites.size > 0 && ` · ${favorites.size} favorited`}
            {gallery.max_downloads > 0 && ` · ${downloadCount}/${gallery.max_downloads} downloads used`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {favorites.size > 0 && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.gold }}>
              ♥ {favorites.size} favorited
            </div>
          )}
          {canDownload() && (
            <button onClick={downloadAll} style={{
              fontFamily: "'Inter', sans-serif", fontSize: "10px",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: COLORS.bg, background: COLORS.gold,
              border: "none", padding: "8px 16px", cursor: "pointer",
            }}>Download All</button>
          )}
        </div>
      </div>

      {/* Grid */}
      {photos.length === 0 ? (
        <div style={{ padding: "4rem", textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: COLORS.muted }}>
          No photos uploaded yet. Check back soon.
        </div>
      ) : (
        <div style={{ padding: "1.5rem", columns: "3 240px", columnGap: "8px" }}>
          {photos.map(photo => {
            const thumbUrl = `${BASE_GALLERY}/${photo.storage_path.replace("/originals/", "/thumbnails/")}`;
            const isFav = favorites.has(photo.id);
            return (
              <div key={photo.id} style={{
                breakInside: "avoid", marginBottom: "8px",
                position: "relative", overflow: "hidden",
                background: "#111", cursor: "pointer",
              }}
                onMouseEnter={e => {
                  e.currentTarget.querySelector(".gov").style.opacity = "1";
                  e.currentTarget.querySelector(".gimg").style.transform = "scale(1.04)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.querySelector(".gov").style.opacity = "0";
                  e.currentTarget.querySelector(".gimg").style.transform = "scale(1)";
                }}
              >
                <img className="gimg"
                  src={thumbUrl}
                  alt={photo.filename}
                  loading="lazy"
                  onClick={() => setLightbox(photo)}
                  style={{ width: "100%", display: "block", transition: "transform 0.4s ease" }}
                  onError={e => {
                    e.currentTarget.src = `${BASE_GALLERY}/${photo.storage_path}`;
                  }}
                />
                <div className="gov" style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)",
                  opacity: 0, transition: "opacity 0.3s ease",
                  display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                  padding: "0.75rem",
                }}>
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadClick(photo); }} style={{
                    fontFamily: "'Inter', sans-serif", fontSize: "10px",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: COLORS.bg, background: COLORS.gold,
                    border: "none", padding: "6px 12px", cursor: "pointer",
                  }}>Download</button>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "1.4rem", color: isFav ? COLORS.gold : COLORS.white,
                    transition: "color 0.2s", lineHeight: 1,
                  }}>{isFav ? "♥" : "♡"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && !lightbox.awaitPin && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.97)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <button onClick={() => setLightbox(null)} style={{
            position: "absolute", top: "1.5rem", right: "1.5rem",
            background: "none", border: "none", color: COLORS.white,
            fontSize: "1.5rem", cursor: "pointer",
          }}>✕</button>
          {idx > 0 && (
            <button onClick={() => setLightbox(photos[idx - 1])} style={{
              position: "absolute", left: "1.5rem",
              background: "none", border: "none", color: COLORS.white,
              fontSize: "2.5rem", cursor: "pointer",
            }}>‹</button>
          )}
          <img src={`${BASE_GALLERY}/${lightbox.storage_path}`} alt={lightbox.filename}
            style={{ maxWidth: "90vw", maxHeight: "88vh", objectFit: "contain" }}
          />
          {idx < photos.length - 1 && (
            <button onClick={() => setLightbox(photos[idx + 1])} style={{
              position: "absolute", right: "1.5rem",
              background: "none", border: "none", color: COLORS.white,
              fontSize: "2.5rem", cursor: "pointer",
            }}>›</button>
          )}
          <div style={{
            position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: "1rem", alignItems: "center",
          }}>
            <button onClick={() => toggleFavorite(lightbox.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "1.5rem", color: favorites.has(lightbox.id) ? COLORS.gold : COLORS.white,
            }}>{favorites.has(lightbox.id) ? "♥" : "♡"}</button>
            <button onClick={() => handleDownloadClick(lightbox)} style={{
              fontFamily: "'Inter', sans-serif", fontSize: "11px",
              letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
              color: COLORS.bg, background: COLORS.gold,
              border: "none", padding: "10px 24px", cursor: "pointer",
            }}>Download</button>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: COLORS.muted }}>
              {idx + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}

      {/* PIN modal */}
      {lightbox?.awaitPin && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#0a0a0a", border: `1px solid ${COLORS.border}`,
            padding: "2rem", width: "100%", maxWidth: "320px", textAlign: "center",
          }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: COLORS.white, marginBottom: "0.5rem" }}>
              Download PIN
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.85rem", color: COLORS.muted, marginBottom: "1.5rem" }}>
              Enter your download PIN to access this photo.
            </div>
            <input type="password" placeholder="PIN" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
              style={{
                background: "transparent", border: `1px solid ${pinError ? "#e05c5c" : COLORS.border}`,
                padding: "12px 16px", color: COLORS.white,
                fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "1.1rem",
                outline: "none", width: "100%", boxSizing: "border-box",
                textAlign: "center", letterSpacing: "0.3em", marginBottom: "0.75rem",
              }}
            />
            {pinError && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#e05c5c", marginBottom: "0.75rem" }}>Incorrect PIN</div>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={handlePinSubmit} style={{
                flex: 1, fontFamily: "'Inter', sans-serif", fontSize: "11px",
                letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
                color: COLORS.bg, background: COLORS.gold,
                border: "none", padding: "12px", cursor: "pointer",
              }}>Download</button>
              <button onClick={() => setLightbox(null)} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "11px",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: COLORS.muted, background: "transparent",
                border: `1px solid ${COLORS.border}`, padding: "12px 16px", cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Branding footer */}
      <div style={{
        textAlign: "center", padding: "2rem",
        borderTop: `1px solid ${COLORS.border}`,
      }}>
        <a href="https://estanleravisuals.com" style={{
          fontFamily: "'Inter', sans-serif", fontSize: "10px",
          letterSpacing: "0.15em", textTransform: "uppercase",
          color: COLORS.muted, textDecoration: "none", opacity: 0.4,
        }}>Estanler A Visuals</a>
      </div>
    </div>
  );
}
