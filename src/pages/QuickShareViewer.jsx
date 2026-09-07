import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { zipSync } from "fflate";
import { Spinner } from "../components/UI";
import { COLORS } from "../lib/constants";
import {
  publicStorageUrl,
  readIdentity,
  registerVisitor,
  safeFileName,
  supabase,
} from "../lib/est83/shared.js";

const BRAND_NAME = "Estanler Aleman Photography";
const shellFont = "'Inter', sans-serif";
const displayFont = "'Playfair Display', Georgia, serif";

function passwordStorageKey(token = "") {
  return token ? `client-gallery-quick-share-unlock:${token}` : "";
}

function displayPhotoUrl(photo) {
  return publicStorageUrl(photo?.display_path || photo?.thumbnail_path || photo?.original_path);
}

function originalPhotoUrl(photo) {
  return publicStorageUrl(photo?.original_path || photo?.display_path || photo?.thumbnail_path);
}

function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function AccessState({ title, message, children }) {
  return (
    <main
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
      <section style={{ maxWidth: 520, width: "100%" }}>
        <div
          style={{
            color: COLORS.gold,
            fontFamily: shellFont,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.18em",
            marginBottom: "1rem",
            textTransform: "uppercase",
          }}
        >
          {BRAND_NAME}
        </div>
        <h1
          style={{
            fontFamily: displayFont,
            fontSize: "clamp(2.2rem, 7vw, 4.2rem)",
            lineHeight: 1,
            margin: "0 0 1rem",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            color: COLORS.muted,
            fontFamily: shellFont,
            lineHeight: 1.7,
            margin: "0 auto 1.5rem",
            maxWidth: 430,
          }}
        >
          {message}
        </p>
        {children}
      </section>
    </main>
  );
}

export default function QuickShareViewer() {
  const { token } = useParams();
  const visitLoggedRef = useRef(false);
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [identityRequired, setIdentityRequired] = useState(false);
  const [identityEmail, setIdentityEmail] = useState("");
  const [identityName, setIdentityName] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [notice, setNotice] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [zipBusy, setZipBusy] = useState(false);

  const gallery = payload?.gallery || null;
  const quickShare = payload?.quick_share || null;
  const photos = useMemo(() => (Array.isArray(payload?.photos) ? payload.photos : []), [payload?.photos]);
  const downloadsEnabled = quickShare?.allow_downloads === true;
  const lightboxIndex = lightbox ? photos.findIndex((photo) => photo.id === lightbox.id) : -1;

  const savedPassword = useCallback(() => {
    if (typeof window === "undefined" || !token) return "";
    return window.sessionStorage.getItem(passwordStorageKey(token)) || "";
  }, [token]);

  const loadSelection = useCallback(
    async (candidatePassword = "", showUnlockError = false) => {
      setError("");
      const { data, error: rpcError } = await supabase.rpc(
        "get_client_gallery_quick_share_public_payload",
        {
          p_token: token,
          p_password: candidatePassword || null,
        },
      );

      if (rpcError) {
        setError(rpcError.message || "This selected-photo link could not load.");
        setStatus("error");
        return false;
      }

      const nextState = data?.state || "unavailable";
      setPayload(data || null);
      setStatus(nextState === "available" ? "view" : nextState);

      if (nextState === "available") {
        if (candidatePassword && typeof window !== "undefined") {
          window.sessionStorage.setItem(passwordStorageKey(token), candidatePassword);
        }
        setPassword("");
        setPasswordError("");
        return true;
      }

      if (nextState === "locked") {
        if (showUnlockError) setPasswordError("That password did not work. Please try again.");
        return false;
      }

      if (typeof window !== "undefined" && token) {
        window.sessionStorage.removeItem(passwordStorageKey(token));
      }
      return false;
    },
    [token],
  );

  useEffect(() => {
    visitLoggedRef.current = false;
    setIdentity(null);
    setIdentityRequired(false);
    setStatus("loading");
    loadSelection(savedPassword(), false);
  }, [loadSelection, savedPassword, token]);

  useEffect(() => {
    if (status !== "view" || !gallery?.id) return;
    const existing = readIdentity(gallery.id);
    setIdentity(existing);
    if (gallery.require_visitor_identity && !existing) {
      setIdentityRequired(true);
      return;
    }
    setIdentityRequired(false);
    if (!existing) {
      registerVisitor(
        {
          gallery_id: gallery.id,
          require_visitor_identity: false,
          collect_visitor_name: gallery.collect_visitor_name === true,
        },
        null,
        null,
      )
        .then((visitor) => setIdentity(visitor))
        .catch(() => undefined);
    }
  }, [gallery?.collect_visitor_name, gallery?.id, gallery?.require_visitor_identity, status]);

  const logPublicEvent = useCallback(
    async (eventType, imageIds = [], metadata = {}) => {
      if (!token) return;
      const { error: eventError } = await supabase.rpc(
        "log_client_gallery_quick_share_public_event",
        {
          p_token: token,
          p_event_type: eventType,
          p_password: savedPassword() || null,
          p_visitor_id: identity?.id || null,
          p_image_ids: imageIds,
          p_metadata: metadata,
        },
      );
      if (eventError) throw eventError;
    },
    [identity?.id, savedPassword, token],
  );

  useEffect(() => {
    if (status !== "view" || identityRequired || visitLoggedRef.current) return;
    visitLoggedRef.current = true;
    logPublicEvent("visit", [], {
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent || null : null,
    }).catch(() => {
      visitLoggedRef.current = false;
    });
  }, [identityRequired, logPublicEvent, status]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowLeft" && lightboxIndex > 0) setLightbox(photos[lightboxIndex - 1]);
      if (event.key === "ArrowRight" && lightboxIndex < photos.length - 1) setLightbox(photos[lightboxIndex + 1]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox, lightboxIndex, photos]);

  async function submitPassword(event) {
    event.preventDefault();
    if (!password.trim()) {
      setPasswordError("Enter the gallery password.");
      return;
    }
    setUnlocking(true);
    await loadSelection(password.trim(), true);
    setUnlocking(false);
  }

  async function submitIdentity(event) {
    event.preventDefault();
    const email = identityEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setIdentityError("Enter a valid email address.");
      return;
    }
    setSavingIdentity(true);
    setIdentityError("");
    try {
      const visitor = await registerVisitor(
        {
          gallery_id: gallery.id,
          require_visitor_identity: true,
          collect_visitor_name: gallery.collect_visitor_name === true,
        },
        email,
        identityName.trim() || null,
      );
      setIdentity(visitor);
      setIdentityRequired(false);
    } catch (submitError) {
      setIdentityError(submitError.message || "Your information could not be saved.");
    } finally {
      setSavingIdentity(false);
    }
  }

  async function downloadPhoto(photo) {
    if (!downloadsEnabled) {
      setNotice("Downloads are turned off for this selected-photo link.");
      return;
    }
    const url = originalPhotoUrl(photo);
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed.");
      const blob = await response.blob();
      const fileName = safeFileName(photo.file_name || photo.title || "selected-photo.jpg");
      saveBlob(blob, fileName);
      await logPublicEvent("download", [photo.id], {
        type: "photo",
        file_name: fileName,
      });
      setNotice("Photo download started.");
    } catch {
      setNotice("Photo download could not start. Please try again.");
    }
  }

  async function downloadSelectionZip() {
    if (!downloadsEnabled || zipBusy || !photos.length) return;
    setZipBusy(true);
    const files = {};
    try {
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        const url = originalPhotoUrl(photo);
        if (!url) continue;
        setNotice(`Preparing ${index + 1} / ${photos.length}...`);
        const response = await fetch(url);
        if (!response.ok) throw new Error("A selected photo could not be prepared.");
        const fileName = safeFileName(photo.file_name || photo.title || `selected-photo-${index + 1}.jpg`);
        files[`${String(index + 1).padStart(3, "0")}-${fileName}`] = new Uint8Array(await response.arrayBuffer());
      }
      if (!Object.keys(files).length) throw new Error("No selected photos could be prepared.");
      const zipBytes = zipSync(files, { level: 0 });
      const zipName = `${safeFileName(gallery?.title || "selected-photos")}-selection.zip`;
      saveBlob(new Blob([zipBytes], { type: "application/zip" }), zipName);
      await logPublicEvent(
        "download",
        photos.map((photo) => photo.id),
        { type: "selection_zip", file_name: zipName },
      );
      setNotice("Selection ZIP download started.");
    } catch {
      setNotice("The selection ZIP could not be prepared. Please try again.");
    } finally {
      setZipBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "grid", placeItems: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (status === "locked") {
    return (
      <AccessState
        title={payload?.gallery?.title || "Protected Selection"}
        message="This selected-photo link follows the gallery password. Enter the gallery password to continue."
      >
        <form onSubmit={submitPassword} style={{ display: "grid", gap: "0.85rem", margin: "0 auto", maxWidth: 360 }}>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
              }}
              placeholder="Gallery password"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${COLORS.border}`,
                color: COLORS.white,
                fontFamily: shellFont,
                fontSize: 14,
                outline: "none",
                padding: "0.95rem 3rem 0.95rem 1rem",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: COLORS.gold,
                cursor: "pointer",
                fontSize: 18,
                height: 34,
                width: 34,
              }}
            >
              {showPassword ? "◉" : "◌"}
            </button>
          </div>
          {passwordError && <div style={{ color: "#ff8b8b", fontFamily: shellFont, fontSize: 12 }}>{passwordError}</div>}
          <button
            type="submit"
            disabled={unlocking}
            style={{
              background: COLORS.gold,
              border: "none",
              color: COLORS.bg,
              cursor: unlocking ? "not-allowed" : "pointer",
              fontFamily: shellFont,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.16em",
              opacity: unlocking ? 0.6 : 1,
              padding: "1rem 1.2rem",
              textTransform: "uppercase",
            }}
          >
            {unlocking ? "Checking..." : "Open Selection"}
          </button>
        </form>
      </AccessState>
    );
  }

  if (status === "disabled") {
    return <AccessState title="Link Disabled" message="This selected-photo link has been disabled by the photographer." />;
  }
  if (status === "expired") {
    return <AccessState title="Gallery Expired" message="The gallery connected to this selected-photo link has expired." />;
  }
  if (status === "unavailable" || status === "error") {
    return <AccessState title="Selection Not Available" message={error || "This selected-photo link is not currently available."} />;
  }

  if (identityRequired) {
    return (
      <AccessState
        title={gallery?.title || "Selected Photos"}
        message="Enter your email to continue to this selected-photo link."
      >
        <form onSubmit={submitIdentity} style={{ display: "grid", gap: "0.85rem", margin: "0 auto", maxWidth: 380 }}>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            value={identityEmail}
            onChange={(event) => setIdentityEmail(event.target.value)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.white,
              fontFamily: shellFont,
              fontSize: 14,
              outline: "none",
              padding: "1rem",
            }}
          />
          {gallery?.collect_visitor_name && (
            <input
              type="text"
              autoComplete="name"
              placeholder="Name (optional)"
              value={identityName}
              onChange={(event) => setIdentityName(event.target.value)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${COLORS.border}`,
                color: COLORS.white,
                fontFamily: shellFont,
                fontSize: 14,
                outline: "none",
                padding: "1rem",
              }}
            />
          )}
          {identityError && <div style={{ color: "#ff8b8b", fontFamily: shellFont, fontSize: 12 }}>{identityError}</div>}
          <button
            type="submit"
            disabled={savingIdentity}
            style={{
              background: COLORS.gold,
              border: "none",
              color: COLORS.bg,
              cursor: savingIdentity ? "not-allowed" : "pointer",
              fontFamily: shellFont,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.16em",
              opacity: savingIdentity ? 0.6 : 1,
              padding: "1rem 1.2rem",
              textTransform: "uppercase",
            }}
          >
            {savingIdentity ? "Saving..." : "Continue to Selection"}
          </button>
        </form>
      </AccessState>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f6f4ef", color: "#111" }}>
      <header
        style={{
          background: COLORS.bg,
          color: COLORS.white,
          padding: "clamp(3rem, 8vw, 6rem) clamp(1.25rem, 5vw, 5rem)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: COLORS.gold,
            fontFamily: shellFont,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.2em",
            marginBottom: "1rem",
            textTransform: "uppercase",
          }}
        >
          Selected Photo Collection
        </div>
        <h1
          style={{
            fontFamily: displayFont,
            fontSize: "clamp(2.6rem, 8vw, 6rem)",
            fontWeight: 600,
            lineHeight: 0.98,
            margin: 0,
          }}
        >
          {gallery?.title || "Selected Photos"}
        </h1>
        {gallery?.client_name && (
          <div
            style={{
              color: COLORS.muted,
              fontFamily: shellFont,
              fontSize: 11,
              letterSpacing: "0.16em",
              marginTop: "1.1rem",
              textTransform: "uppercase",
            }}
          >
            {gallery.client_name}
          </div>
        )}
        <p
          style={{
            color: COLORS.muted,
            fontFamily: shellFont,
            fontSize: 13,
            lineHeight: 1.7,
            margin: "1.2rem auto 0",
            maxWidth: 620,
          }}
        >
          {photos.length} selected photo{photos.length === 1 ? "" : "s"} shared from this gallery.
        </p>
        {downloadsEnabled && photos.length > 0 && (
          <button
            type="button"
            onClick={downloadSelectionZip}
            disabled={zipBusy}
            style={{
              background: COLORS.gold,
              border: "none",
              color: COLORS.bg,
              cursor: zipBusy ? "wait" : "pointer",
              fontFamily: shellFont,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.15em",
              marginTop: "1.6rem",
              opacity: zipBusy ? 0.6 : 1,
              padding: "0.95rem 1.3rem",
              textTransform: "uppercase",
            }}
          >
            {zipBusy ? "Preparing Selection..." : "Download Selection ZIP"}
          </button>
        )}
      </header>

      {notice && (
        <div
          role="status"
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 3000,
            background: "#111",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#fff",
            fontFamily: shellFont,
            fontSize: 12,
            padding: "0.85rem 1rem",
            boxShadow: "0 18px 55px rgba(0,0,0,0.28)",
            maxWidth: 320,
          }}
        >
          {notice}
        </div>
      )}

      <section style={{ padding: "clamp(1rem, 3vw, 2.5rem)", maxWidth: 1500, margin: "0 auto" }}>
        {photos.length === 0 ? (
          <div style={{ color: "#777", fontFamily: shellFont, padding: "5rem 1rem", textAlign: "center" }}>
            No selected photos are currently available in this link.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))",
              gap: "clamp(0.75rem, 2vw, 1.25rem)",
            }}
          >
            {photos.map((photo) => (
              <article key={photo.id} style={{ background: "#fff", border: "1px solid #e7e3da", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setLightbox(photo)}
                  style={{
                    display: "block",
                    border: "none",
                    background: "#ebe8e0",
                    cursor: "zoom-in",
                    padding: 0,
                    width: "100%",
                    aspectRatio: "4 / 3",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={displayPhotoUrl(photo)}
                    alt={photo.alt_text || photo.title || photo.file_name || "Selected gallery photo"}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
                  />
                </button>
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "space-between",
                    padding: "0.8rem 0.9rem",
                  }}
                >
                  <span
                    title={photo.file_name || photo.title || "Selected photo"}
                    style={{
                      fontFamily: shellFont,
                      fontSize: 11,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {photo.file_name || photo.title || "Selected photo"}
                  </span>
                  {downloadsEnabled && (
                    <button
                      type="button"
                      onClick={() => downloadPhoto(photo)}
                      style={{
                        background: "transparent",
                        border: "1px solid #d7d2c8",
                        color: "#111",
                        cursor: "pointer",
                        flex: "0 0 auto",
                        fontFamily: shellFont,
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: "0.1em",
                        padding: "0.55rem 0.65rem",
                        textTransform: "uppercase",
                      }}
                    >
                      Download
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer
        style={{
          color: "#777",
          fontFamily: shellFont,
          fontSize: 10,
          letterSpacing: "0.12em",
          padding: "2.5rem 1rem 3rem",
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {BRAND_NAME}
      </footer>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Selected photo viewer"
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "rgba(0,0,0,0.96)",
            display: "grid",
            placeItems: "center",
            padding: "clamp(1rem, 4vw, 3rem)",
          }}
        >
          <img
            src={displayPhotoUrl(lightbox)}
            alt={lightbox.alt_text || lightbox.title || lightbox.file_name || "Selected photo"}
            onClick={(event) => event.stopPropagation()}
            style={{ maxHeight: "86vh", maxWidth: "92vw", objectFit: "contain" }}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close photo viewer"
            style={{ position: "absolute", right: 18, top: 18, background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 28 }}
          >
            ×
          </button>
          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setLightbox(photos[lightboxIndex - 1]);
              }}
              aria-label="Previous photo"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer", fontSize: 30, height: 52, width: 52 }}
            >
              ‹
            </button>
          )}
          {lightboxIndex >= 0 && lightboxIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setLightbox(photos[lightboxIndex + 1]);
              }}
              aria-label="Next photo"
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.28)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer", fontSize: 30, height: 52, width: 52 }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </main>
  );
}
