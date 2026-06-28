import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../../components/UI";
import { COLORS } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { AdminNav } from "./Dashboard";

const STATUS_OPTIONS = ["draft", "published", "archived"];

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value) {
  if (!value) return "No event date";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const normalized = status || "draft";
  const color =
    normalized === "published"
      ? "#4ade80"
      : normalized === "archived"
        ? COLORS.muted
        : COLORS.gold;

  return (
    <span
      style={{
        border: `1px solid ${color}`,
        color,
        borderRadius: 999,
        padding: "4px 10px",
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {normalized}
    </span>
  );
}

function FieldLabel({ children }) {
  return (
    <span
      style={{
        display: "block",
        marginBottom: 6,
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
        color: COLORS.muted,
      }}
    >
      {children}
    </span>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.white,
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  padding: "12px 14px",
  outline: "none",
};

const secondaryButton = {
  background: "transparent",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.white,
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  padding: "10px 14px",
  textTransform: "uppercase",
};

const primaryButton = {
  ...secondaryButton,
  background: COLORS.gold,
  border: "none",
  color: COLORS.bg,
};

function CreateGalleryModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    slug: "",
    client_name: "",
    client_email: "",
    event_date: "",
    description: "",
    status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const canCreate = useMemo(
    () => Boolean(form.title.trim() && form.slug.trim()),
    [form.slug, form.title],
  );

  async function handleCreate() {
    if (!canCreate) {
      setError("Gallery title and URL slug are required.");
      return;
    }

    setSaving(true);
    setError("");

    const { data: gallery, error: galleryError } = await supabase
      .from("client_galleries")
      .insert({
        title: form.title.trim(),
        slug: form.slug.trim(),
        client_name: form.client_name.trim() || null,
        client_email: form.client_email.trim() || null,
        event_date: form.event_date || null,
        description: form.description.trim() || null,
        status: form.status,
      })
      .select("*")
      .single();

    if (galleryError) {
      setSaving(false);
      setError(galleryError.message);
      return;
    }

    const { error: sectionError } = await supabase
      .from("client_gallery_sections")
      .insert({
        gallery_id: gallery.id,
        title: "Highlights",
        display_order: 0,
        is_visible: true,
      });

    setSaving(false);

    if (sectionError) {
      setError(
        `Gallery was created, but the default Highlights section failed: ${sectionError.message}`,
      );
      return;
    }

    onCreated(gallery);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflowY: "auto",
          background: COLORS.surfaceDark || "#060606",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${COLORS.border}`,
            padding: "1.25rem 1.5rem",
          }}
        >
          <div>
            <div
              style={{
                color: COLORS.gold,
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              New Collection
            </div>
            <h2
              style={{
                color: COLORS.white,
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.55rem",
                margin: "4px 0 0",
              }}
            >
              Create client gallery
            </h2>
          </div>
          <button onClick={onClose} style={secondaryButton}>
            Close
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
            padding: "1.5rem",
          }}
        >
          <label>
            <FieldLabel>Gallery Title *</FieldLabel>
            <input
              value={form.title}
              onChange={(event) => {
                const title = event.target.value;
                setForm((current) => ({
                  ...current,
                  title,
                  slug: current.slug === slugify(current.title) ? slugify(title) : current.slug,
                }));
              }}
              placeholder="Martinez Wedding"
              style={inputStyle}
            />
          </label>

          <label>
            <FieldLabel>URL Slug *</FieldLabel>
            <input
              value={form.slug}
              onChange={(event) => set("slug", slugify(event.target.value))}
              placeholder="martinez-wedding"
              style={inputStyle}
            />
          </label>

          <label>
            <FieldLabel>Client Name</FieldLabel>
            <input
              value={form.client_name}
              onChange={(event) => set("client_name", event.target.value)}
              placeholder="Sofia Martinez"
              style={inputStyle}
            />
          </label>

          <label>
            <FieldLabel>Client Email</FieldLabel>
            <input
              type="email"
              value={form.client_email}
              onChange={(event) => set("client_email", event.target.value)}
              placeholder="client@email.com"
              style={inputStyle}
            />
          </label>

          <label>
            <FieldLabel>Event Date</FieldLabel>
            <input
              type="date"
              value={form.event_date}
              onChange={(event) => set("event_date", event.target.value)}
              style={inputStyle}
            />
          </label>

          <label>
            <FieldLabel>Status</FieldLabel>
            <select
              value={form.status}
              onChange={(event) => set("status", event.target.value)}
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="Private client collection notes, event context, or gallery intro."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>
        </div>

        {error && (
          <div
            style={{
              margin: "0 1.5rem 1rem",
              border: "1px solid rgba(224,92,92,0.35)",
              color: "#ff8b8b",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              padding: "12px 14px",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            borderTop: `1px solid ${COLORS.border}`,
            padding: "1.25rem 1.5rem",
          }}
        >
          <button onClick={onClose} style={secondaryButton}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !canCreate}
            style={{
              ...primaryButton,
              cursor: saving || !canCreate ? "not-allowed" : "pointer",
              opacity: saving || !canCreate ? 0.55 : 1,
            }}
          >
            {saving ? "Creating..." : "Create Gallery"}
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
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchGalleries();
  }, []);

  async function fetchGalleries() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("client_galleries")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setGalleries([]);
    } else {
      setGalleries(data || []);
    }

    setLoading(false);
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  function openGallery(galleryId) {
    navigate(`/admin/galleries/${galleryId}`);
  }

  function copyPreviewPath(slug) {
    if (!slug) return;
    navigator.clipboard?.writeText(`${window.location.origin}/gallery/${slug}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <AdminNav onSignOut={handleSignOut} />

      <main style={{ padding: "2.5rem 2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div>
            <div
              style={{
                color: COLORS.gold,
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.16em",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Client Collections
            </div>
            <h1
              style={{
                color: COLORS.white,
                fontFamily: "'Playfair Display', serif",
                fontSize: "2rem",
                fontWeight: 700,
                margin: 0,
              }}
            >
              Galleries
            </h1>
            <p
              style={{
                color: COLORS.muted,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                lineHeight: 1.7,
                margin: "0.65rem 0 0",
                maxWidth: 620,
              }}
            >
              Create Pixieset-style client collections from the existing portfolio image library. Uploading and asset optimization stay in Portfolio Manager.
            </p>
          </div>

          <button onClick={() => setShowCreate(true)} style={primaryButton}>
            + New Gallery
          </button>
        </div>

        {error && (
          <div
            style={{
              border: "1px solid rgba(224,92,92,0.35)",
              color: "#ff8b8b",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              marginBottom: "1.5rem",
              padding: "12px 14px",
            }}
          >
            {error}
          </div>
        )}

        {loading && <Spinner />}

        {!loading && !galleries.length && (
          <div
            style={{
              border: `1px dashed ${COLORS.border}`,
              color: COLORS.muted,
              fontFamily: "'Inter', sans-serif",
              padding: "4rem 2rem",
              textAlign: "center",
            }}
          >
            No client galleries yet. Create one to start building a collection workspace.
          </div>
        )}

        {!loading && galleries.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {galleries.map((gallery) => (
              <article
                key={gallery.id}
                style={{
                  background: COLORS.surfaceDark || "#060606",
                  border: `1px solid ${COLORS.border}`,
                  minHeight: 260,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <button
                  onClick={() => openGallery(gallery.id)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    padding: "1.4rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "1rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <StatusBadge status={gallery.status} />
                    <span
                      style={{
                        color: COLORS.muted,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 11,
                      }}
                    >
                      {formatDate(gallery.event_date)}
                    </span>
                  </div>

                  <h2
                    style={{
                      color: COLORS.white,
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.35rem",
                      lineHeight: 1.15,
                      margin: "0 0 0.75rem",
                    }}
                  >
                    {gallery.title || "Untitled Gallery"}
                  </h2>

                  <div
                    style={{
                      color: COLORS.muted,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    <div>{gallery.client_name || "No client name"}</div>
                    <div>{gallery.client_email || "No client email"}</div>
                    <div style={{ marginTop: 12, color: COLORS.gold }}>
                      /gallery/{gallery.slug || "draft-link"}
                    </div>
                  </div>
                </button>

                <div
                  style={{
                    borderTop: `1px solid ${COLORS.border}`,
                    display: "flex",
                    gap: "0.5rem",
                    padding: "0.9rem 1rem",
                  }}
                >
                  <button
                    onClick={() => openGallery(gallery.id)}
                    style={{ ...secondaryButton, flex: 1 }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => copyPreviewPath(gallery.slug)}
                    style={{ ...secondaryButton, flex: 1, color: COLORS.gold }}
                  >
                    Copy Link
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateGalleryModal
          onClose={() => setShowCreate(false)}
          onCreated={(gallery) => {
            setShowCreate(false);
            navigate(`/admin/galleries/${gallery.id}`);
          }}
        />
      )}
    </div>
  );
}
