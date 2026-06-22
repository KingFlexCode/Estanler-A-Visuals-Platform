import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { COLORS, BASE, FOLDER_CATEGORY_MAP, ASPECT_MAP, CATEGORY_LABELS } from "../../lib/constants";
import { AdminNav } from "./Dashboard";
import { Spinner } from "../../components/UI";

function buildPublicUrl(path) {
  if (!path) return "";
  return `${BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function titleFromFileName(name = "") {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}

function getThumbPath(originalPath) {
  if (!originalPath) return null;
  return originalPath.replace("/originals/", "/thumbnails/");
}

function Input({ label, value, onChange, type = "text", min, max, step }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{
        display: "block", marginBottom: 6,
        fontFamily: "'Inter', sans-serif", fontSize: 10,
        letterSpacing: "0.13em", textTransform: "uppercase", color: COLORS.mutedDark,
      }}>{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={e => onChange(type === "number" || type === "range" ? Number(e.target.value) : e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "#0a0a0a", color: COLORS.white,
          border: `1px solid ${COLORS.borderDark || COLORS.border}`,
          padding: type === "range" ? "8px 0" : "10px 12px",
          outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13,
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{
        display: "block", marginBottom: 6,
        fontFamily: "'Inter', sans-serif", fontSize: 10,
        letterSpacing: "0.13em", textTransform: "uppercase", color: COLORS.mutedDark,
      }}>{label}</span>
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "#0a0a0a", color: COLORS.white,
          border: `1px solid ${COLORS.borderDark || COLORS.border}`,
          padding: "10px 12px", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 13,
        }}
      >
        {children}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        border: `1px solid ${checked ? COLORS.gold : COLORS.borderDark || COLORS.border}`,
        background: checked ? COLORS.gold : "transparent",
        color: checked ? COLORS.bgDark || "#0A0A0A" : COLORS.mutedDark,
        padding: "10px 12px", cursor: "pointer",
        fontFamily: "'Inter', sans-serif", fontSize: 11,
        letterSpacing: "0.12em", textTransform: "uppercase",
      }}
    >
      {checked ? "✓ " : ""}{label}
    </button>
  );
}

function PortfolioCard({ image, onChange, onSave, saving }) {
  const previewUrl = buildPublicUrl(image.thumbnail_path || image.original_path);
  const x = image.object_position_x ?? 50;
  const y = image.object_position_y ?? 50;
  const zoom = Number(image.zoom || 1);

  const set = (key, value) => onChange({ ...image, [key]: value });

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(240px, 360px) 1fr", gap: "1.5rem",
      background: "#060606", border: `1px solid ${COLORS.borderDark || COLORS.border}`,
      padding: "1rem",
    }}>
      <div>
        <div style={{
          aspectRatio: image.aspect_ratio || "4 / 5",
          background: "#111", overflow: "hidden", marginBottom: "0.75rem",
          border: `1px solid ${COLORS.borderDark || COLORS.border}`,
        }}>
          <img
            src={previewUrl}
            alt={image.alt_text || image.title || image.file_name}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`,
              transition: "object-position 0.15s, transform 0.15s",
            }}
          />
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 11,
          color: COLORS.mutedDark, lineHeight: 1.5, wordBreak: "break-word",
        }}>
          {image.original_path}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Input label="Title" value={image.title || ""} onChange={v => set("title", v)} />
          <Select label="Category" value={image.category} onChange={v => set("category", v)}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
        </div>

        <Input label="Alt Text" value={image.alt_text || ""} onChange={v => set("alt_text", v)} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <Select label="Aspect Ratio" value={image.aspect_ratio || "4 / 5"} onChange={v => set("aspect_ratio", v)}>
            <option value="1 / 1">Square 1:1</option>
            <option value="3 / 4">Portrait 3:4</option>
            <option value="4 / 5">Portrait 4:5</option>
            <option value="16 / 9">Wide 16:9</option>
          </Select>
          <Input label="Display Order" type="number" value={image.display_order || 0} onChange={v => set("display_order", v)} />
          <Input label="Zoom" type="number" min={1} max={2} step={0.01} value={zoom} onChange={v => set("zoom", v)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Input label={`Position X: ${x}%`} type="range" min={0} max={100} value={x} onChange={v => set("object_position_x", v)} />
          <Input label={`Position Y: ${y}%`} type="range" min={0} max={100} value={y} onChange={v => set("object_position_y", v)} />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <Toggle label="Visible" checked={!!image.is_visible} onChange={v => set("is_visible", v)} />
          <Toggle label="Featured" checked={!!image.featured} onChange={v => set("featured", v)} />
          <button
            onClick={() => onSave(image)}
            disabled={saving}
            style={{
              marginLeft: "auto", border: "none", cursor: saving ? "not-allowed" : "pointer",
              background: saving ? "#806b40" : COLORS.gold, color: COLORS.bgDark || "#0A0A0A",
              padding: "11px 22px", fontFamily: "'Inter', sans-serif", fontSize: 11,
              letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
            }}
          >
            {saving ? "Saving..." : "Save Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioAdmin() {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("");

  const filteredImages = useMemo(() => {
    return filter === "all" ? images : images.filter(img => img.category === filter);
  }, [images, filter]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  async function fetchImages() {
    setLoading(true);
    const { data, error } = await supabase
      .from("portfolio_images")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setStatus(`Error loading portfolio: ${error.message}`);
      setImages([]);
    } else {
      setImages(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchImages(); }, []);

  async function syncFromStorage() {
    setSyncing(true);
    setStatus("Scanning Portfolio bucket...");

    const { data: existing } = await supabase
      .from("portfolio_images")
      .select("original_path");

    const existingPaths = new Set((existing || []).map(row => row.original_path));
    const inserts = [];

    for (const [folder, category] of Object.entries(FOLDER_CATEGORY_MAP)) {
      const { data, error } = await supabase.storage
        .from("Portfolio")
        .list(folder, { limit: 300, sortBy: { column: "name", order: "asc" } });

      if (error || !data) continue;

      for (const file of data) {
        if (!file.name?.match(/\.(jpg|jpeg|png|webp|gif)$/i)) continue;
        const originalPath = `${folder}/${file.name}`;
        if (existingPaths.has(originalPath)) continue;

        inserts.push({
          category,
          file_name: file.name,
          original_path: originalPath,
          thumbnail_path: getThumbPath(originalPath),
          title: titleFromFileName(file.name),
          alt_text: titleFromFileName(file.name),
          aspect_ratio: ASPECT_MAP[folder] || "4 / 5",
          object_position_x: 50,
          object_position_y: 50,
          zoom: 1,
          featured: false,
          is_visible: true,
          display_order: images.length + inserts.length,
        });
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from("portfolio_images").insert(inserts);
      if (error) setStatus(`Sync error: ${error.message}`);
      else setStatus(`Synced ${inserts.length} new portfolio image${inserts.length === 1 ? "" : "s"}.`);
    } else {
      setStatus("No new images found. Portfolio table is already synced.");
    }

    setSyncing(false);
    fetchImages();
  }

  function updateLocalImage(next) {
    setImages(prev => prev.map(img => img.id === next.id ? next : img));
  }

  async function saveImage(image) {
    setSavingId(image.id);
    const payload = {
      category: image.category,
      title: image.title,
      alt_text: image.alt_text,
      aspect_ratio: image.aspect_ratio,
      object_position_x: image.object_position_x ?? 50,
      object_position_y: image.object_position_y ?? 50,
      zoom: Number(image.zoom || 1),
      featured: !!image.featured,
      is_visible: !!image.is_visible,
      display_order: Number(image.display_order || 0),
    };

    const { error } = await supabase.from("portfolio_images").update(payload).eq("id", image.id);
    setSavingId(null);
    if (error) setStatus(`Save error: ${error.message}`);
    else setStatus(`Saved ${image.title || image.file_name}.`);
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bgDark || "#0A0A0A" }}>
      <AdminNav onSignOut={handleSignOut} />
      <div style={{ padding: "2.5rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif", fontWeight: 700,
              fontSize: "1.8rem", color: COLORS.white, margin: 0,
            }}>Portfolio Manager</h1>
            <p style={{
              fontFamily: "'Inter', sans-serif", color: COLORS.mutedDark,
              fontSize: "0.86rem", lineHeight: 1.7, maxWidth: 620,
            }}>
              Sync your Portfolio bucket into the database, then adjust each public thumbnail crop using position and zoom controls.
            </p>
          </div>

          <button onClick={syncFromStorage} disabled={syncing} style={{
            fontFamily: "'Inter', sans-serif", fontSize: "11px",
            letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
            color: COLORS.bgDark || "#0A0A0A", background: syncing ? "#806b40" : COLORS.gold,
            border: "none", padding: "12px 22px", cursor: syncing ? "not-allowed" : "pointer",
          }}>{syncing ? "Syncing..." : "Sync From Bucket"}</button>
        </div>

        {status && (
          <div style={{
            marginBottom: "1.25rem", border: `1px solid ${COLORS.borderDark || COLORS.border}`,
            padding: "0.85rem 1rem", color: COLORS.mutedDark,
            fontFamily: "'Inter', sans-serif", fontSize: "0.82rem",
          }}>{status}</div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {["all", ...Object.keys(CATEGORY_LABELS)].map(key => (
            <button key={key} onClick={() => setFilter(key)} style={{
              border: `1px solid ${filter === key ? COLORS.gold : COLORS.borderDark || COLORS.border}`,
              background: filter === key ? COLORS.gold : "transparent",
              color: filter === key ? COLORS.bgDark || "#0A0A0A" : COLORS.mutedDark,
              padding: "8px 14px", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 11,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              {key === "all" ? "All" : CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        {loading && <Spinner />}

        {!loading && filteredImages.length === 0 && (
          <div style={{
            border: `1px dashed ${COLORS.borderDark || COLORS.border}`,
            padding: "4rem 2rem", textAlign: "center",
            fontFamily: "'Inter', sans-serif", color: COLORS.mutedDark,
          }}>
            No portfolio images found. Click “Sync From Bucket” to import your existing storage files into the metadata table.
          </div>
        )}

        {!loading && filteredImages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filteredImages.map(image => (
              <PortfolioCard
                key={image.id}
                image={image}
                onChange={updateLocalImage}
                onSave={saveImage}
                saving={savingId === image.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
