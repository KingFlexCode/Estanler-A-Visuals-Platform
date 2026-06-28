import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../lib/constants";
import { AdminNav } from "./Dashboard";
import { Spinner } from "../../components/UI";

function compressImage(file, maxWidth = 800, quality = 0.78) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        },
        "image/jpeg",
        quality,
      );
    };
    img.src = url;
  });
}

function CreateGalleryModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    slug: "",
    access_type: "password",
    password: "",
    download_pin: "",
    max_downloads: "0",
    resolution: "full",
    format: "original",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const autoSlug = (title) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleCreate = async () => {
    if (!form.title || !form.slug) {
      setError("Title and slug required.");
      return;
    }
    if (form.access_type === "password" && !form.password) {
      setError("Password required for protected galleries.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("galleries")
      .insert([
        {
          title: form.title,
          client_name: form.client_name,
          slug: form.slug,
          access_type: form.access_type,
          password: form.access_type === "password" ? form.password : null,
          download_pin: form.download_pin || null,
          max_downloads: parseInt(form.max_downloads) || 0,
          resolution: form.resolution,
          format: form.format,
        },
      ])
      .select()
      .single();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    onCreated(data);
  };

  const inputStyle = {
    background: "transparent",
    border: `1px solid ${COLORS.border}`,
    padding: "11px 14px",
    color: COLORS.white,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 300,
    fontSize: "0.88rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  const labelStyle = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "9px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: COLORS.muted,
    marginBottom: "5px",
    display: "block",
  };
  const selectStyle = {
    ...inputStyle,
    background: "#0a0a0a",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#0a0a0a",
          border: `1px solid ${COLORS.border}`,
          padding: "2rem",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: "1.3rem",
              color: COLORS.white,
            }}
          >
            New Gallery
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: COLORS.muted,
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Gallery Title *</label>
            <input
              style={inputStyle}
              placeholder="Martinez Wedding 2025"
              value={form.title}
              onChange={(e) => {
                set("title", e.target.value);
                set("slug", autoSlug(e.target.value));
              }}
              onFocus={(e) => (e.target.style.borderColor = COLORS.gold)}
              onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
            />
          </div>
          <div>
            <label style={labelStyle}>Client Name</label>
            <input
              style={inputStyle}
              placeholder="Sofia Martinez"
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = COLORS.gold)}
              onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
            />
          </div>
          <div>
            <label style={labelStyle}>URL Slug * (auto-generated)</label>
            <input
              style={inputStyle}
              placeholder="martinez-wedding-2025"
              value={form.slug}
              onChange={(e) => set("slug", autoSlug(e.target.value))}
              onFocus={(e) => (e.target.style.borderColor = COLORS.gold)}
              onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
            />
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                color: COLORS.muted,
                marginTop: "4px",
              }}
            >
              estanleravisuals.com/gallery/{form.slug || "..."}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Access Type</label>
              <select
                style={selectStyle}
                value={form.access_type}
                onChange={(e) => set("access_type", e.target.value)}
              >
                <option value="public">Public link</option>
                <option value="password">Password protected</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                {form.access_type === "password"
                  ? "Gallery Password *"
                  : "No Password"}
              </label>
              <input
                style={{
                  ...inputStyle,
                  opacity: form.access_type === "public" ? 0.3 : 1,
                }}
                disabled={form.access_type === "public"}
                type="password"
                placeholder="gallery-password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = COLORS.gold)}
                onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Download PIN (optional)</label>
              <input
                style={inputStyle}
                placeholder="1234"
                value={form.download_pin}
                onChange={(e) => set("download_pin", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = COLORS.gold)}
                onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
              />
            </div>
            <div>
              <label style={labelStyle}>Max Downloads (0 = unlimited)</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                placeholder="0"
                value={form.max_downloads}
                onChange={(e) => set("max_downloads", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = COLORS.gold)}
                onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label style={labelStyle}>Download Resolution</label>
              <select
                style={selectStyle}
                value={form.resolution}
                onChange={(e) => set("resolution", e.target.value)}
              >
                <option value="full">Full resolution</option>
                <option value="web">Web size (2048px)</option>
                <option value="small">Small (1200px)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Download Format</label>
              <select
                style={selectStyle}
                value={form.format}
                onChange={(e) => set("format", e.target.value)}
              >
                <option value="original">Original format</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
              </select>
            </div>
          </div>

          {error && (
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.82rem",
                color: "#e05c5c",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                flex: 1,
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: COLORS.bg,
                background: loading ? "#a08040" : COLORS.gold,
                border: "none",
                padding: "13px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating..." : "Create Gallery"}
            </button>
            <button
              onClick={onClose}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: COLORS.muted,
                background: "transparent",
                border: `1px solid ${COLORS.border}`,
                padding: "13px 20px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ gallery, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState([]);
  const inputRef = useRef();

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    setFiles(selected);
    setProgress(selected.map((f) => ({ name: f.name, status: "pending" })));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((p) =>
        p.map((item, idx) =>
          idx === i ? { ...item, status: "uploading" } : item,
        ),
      );

      try {
        // Upload original
        const origPath = `${gallery.slug}/originals/${file.name}`;
        await supabase.storage
          .from("client-galleries")
          .upload(origPath, file, { upsert: true });

        // Compress thumbnail
        const thumb = await compressImage(file, 800, 0.78);
        const thumbPath = `${gallery.slug}/thumbnails/${file.name}`;
        await supabase.storage
          .from("client-galleries")
          .upload(thumbPath, thumb, {
            contentType: "image/jpeg",
            upsert: true,
          });

        // Save to DB
        await supabase.from("gallery_photos").insert([
          {
            gallery_id: gallery.id,
            storage_path: origPath,
            filename: file.name,
            display_order: i,
          },
        ]);

        setProgress((p) =>
          p.map((item, idx) =>
            idx === i ? { ...item, status: "done" } : item,
          ),
        );
      } catch {
        setProgress((p) =>
          p.map((item, idx) =>
            idx === i ? { ...item, status: "error" } : item,
          ),
        );
      }
    }
    setUploading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#0a0a0a",
          border: `1px solid ${COLORS.border}`,
          padding: "2rem",
          width: "100%",
          maxWidth: "500px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.2rem",
              color: COLORS.white,
            }}
          >
            Upload to:{" "}
            <span style={{ color: COLORS.gold }}>{gallery.title}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: COLORS.muted,
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${COLORS.border}`,
            padding: "3rem",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: "1.5rem",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = COLORS.gold)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = COLORS.border)
          }
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📸</div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "0.88rem",
              color: COLORS.muted,
            }}
          >
            {files.length > 0
              ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
              : "Click to select photos"}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFiles}
            style={{ display: "none" }}
          />
        </div>

        {progress.length > 0 && (
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              border: `1px solid ${COLORS.border}`,
              marginBottom: "1.5rem",
            }}
          >
            {progress.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderBottom:
                    i < progress.length - 1
                      ? `1px solid ${COLORS.border}`
                      : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.8rem",
                    color: COLORS.muted,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "10px",
                    color:
                      p.status === "done"
                        ? "#4ade80"
                        : p.status === "error"
                          ? "#e05c5c"
                          : p.status === "uploading"
                            ? COLORS.gold
                            : COLORS.muted,
                    marginLeft: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {p.status === "done"
                    ? "✓ Done"
                    : p.status === "error"
                      ? "✕ Error"
                      : p.status === "uploading"
                        ? "Uploading..."
                        : "Pending"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            style={{
              flex: 1,
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: COLORS.bg,
              background:
                uploading || files.length === 0 ? "#a08040" : COLORS.gold,
              border: "none",
              padding: "13px",
              cursor:
                uploading || files.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Uploading..." : "Upload Photos"}
          </button>
          <button
            onClick={onClose}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: COLORS.muted,
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              padding: "13px 20px",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Galleries() {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [uploadGallery, setUploadGallery] = useState(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  async function fetchGalleries() {
    const { data } = await supabase
      .from("galleries")
      .select("*")
      .order("created_at", { ascending: false });
    setGalleries(data || []);
    setLoading(false);
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete this gallery? This cannot be undone.")) return;
    await supabase.from("galleries").delete().eq("id", id);
    setGalleries((p) => p.filter((g) => g.id !== id));
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(
      `https://estanleravisuals.com/gallery/${slug}`,
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <AdminNav onSignOut={handleSignOut} />
      <div style={{ padding: "2.5rem 2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "1.8rem",
              color: COLORS.white,
            }}
          >
            Galleries
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: COLORS.bg,
              background: COLORS.gold,
              border: "none",
              padding: "11px 22px",
              cursor: "pointer",
            }}
          >
            + New Gallery
          </button>
        </div>

        {loading && <Spinner />}

        {!loading && galleries.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "4rem",
              border: `1px dashed ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.9rem",
                color: COLORS.muted,
              }}
            >
              No galleries yet. Create one to get started.
            </div>
          </div>
        )}

        {!loading && galleries.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1px",
              background: COLORS.border,
            }}
          >
            {galleries.map((g) => (
              <div
                key={g.id}
                style={{
                  background: "#060606",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 600,
                      fontSize: "1rem",
                      color: COLORS.white,
                      marginBottom: "3px",
                    }}
                  >
                    {g.title}
                  </div>
                  <div
                    style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
                  >
                    {g.client_name && (
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "11px",
                          color: COLORS.muted,
                        }}
                      >
                        {g.client_name}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "10px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color:
                          g.access_type === "public" ? "#4ade80" : COLORS.gold,
                      }}
                    >
                      {g.access_type === "public"
                        ? "Public"
                        : "Password Protected"}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "11px",
                        color: COLORS.muted,
                      }}
                    >
                      /gallery/{g.slug}
                    </span>
                  </div>
                </div>
                <div
                  style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
                >
                  <button
                    onClick={() => setUploadGallery(g)}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: COLORS.white,
                      background: "transparent",
                      border: `1px solid ${COLORS.border}`,
                      padding: "7px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Upload Photos
                  </button>
                  <button
                    onClick={() => copyLink(g.slug)}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: COLORS.gold,
                      background: "transparent",
                      border: `1px solid ${COLORS.border}`,
                      padding: "7px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Copy Link
                  </button>
                  <a
                    href={`/gallery/${g.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: COLORS.muted,
                      textDecoration: "none",
                      border: `1px solid ${COLORS.border}`,
                      padding: "7px 14px",
                    }}
                  >
                    Preview ↗
                  </a>
                  <button
                    onClick={() => handleDelete(g.id)}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#e05c5c",
                      background: "transparent",
                      border: `1px solid rgba(224,92,92,0.3)`,
                      padding: "7px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGalleryModal
          onClose={() => setShowCreate(false)}
          onCreated={(g) => {
            setGalleries((p) => [g, ...p]);
            setShowCreate(false);
            setUploadGallery(g);
          }}
        />
      )}
      {uploadGallery && (
        <UploadModal
          gallery={uploadGallery}
          onClose={() => {
            setUploadGallery(null);
            fetchGalleries();
          }}
        />
      )}
    </div>
  );
}
