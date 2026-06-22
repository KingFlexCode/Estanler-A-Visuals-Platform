import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { COLORS, BASE, FOLDER_CATEGORY_MAP, ASPECT_MAP } from "../lib/constants";
import { Tag, GoldLine, Reveal, Spinner } from "../components/UI";
import Footer from "../components/Footer";

const FILTERS = ["All", "Portrait", "Engagement", "Birthday", "Wedding"];

export default function Work() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    async function fetchAll() {
      const folders = Object.keys(FOLDER_CATEGORY_MAP);
      const results = [];
      let id = 1;
      for (const folder of folders) {
        const { data } = await supabase.storage
          .from("Portfolio")
          .list(`${folder}/originals`, { limit: 200, sortBy: { column: "name", order: "asc" } });
        if (!data) continue;
        for (const file of data) {
          if (!file.name?.match(/\.(jpg|jpeg|png|webp)$/i)) continue;
          if (file.metadata?.size > 15 * 1024 * 1024) continue;
          results.push({
            id: id++,
            category: FOLDER_CATEGORY_MAP[folder],
            aspect: ASPECT_MAP[folder],
            label: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            img: `${BASE}/${folder}/originals/${encodeURIComponent(file.name)}`,
          });
        }
      }
      setItems(results);
      setLoading(false);
    }
    fetchAll();
  }, []);

  const filtered = filter === "All"
    ? items
    : items.filter(w => w.category === filter.toLowerCase());

  // Lightbox keyboard nav
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox(p => filtered[Math.min(p.index + 1, filtered.length - 1)]);
      if (e.key === "ArrowLeft") setLightbox(p => filtered[Math.max(p.index - 1, 0)]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, filtered]);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", paddingTop: "64px" }}>
      <div style={{ padding: "4rem clamp(1.5rem, 5vw, 4rem)" }}>
        <Reveal>
          <Tag>Portfolio</Tag>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 700,
            fontSize: "clamp(2.5rem, 5vw, 4rem)", color: COLORS.white, margin: "0.75rem 0",
          }}>Selected Work</h1>
          <GoldLine mb="2.5rem" />
        </Reveal>

        {/* Filters */}
        <Reveal delay={0.1}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "3rem" }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontFamily: "'Inter', sans-serif", fontSize: "10px",
                letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 400,
                color: filter === f ? COLORS.bg : COLORS.muted,
                background: filter === f ? COLORS.gold : "transparent",
                border: `1px solid ${filter === f ? COLORS.gold : COLORS.border}`,
                padding: "7px 18px", cursor: "pointer", transition: "all 0.2s",
              }}>{f}</button>
            ))}
          </div>
        </Reveal>

        {loading && <Spinner />}

        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: "center", padding: "4rem 0",
            fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: COLORS.muted,
          }}>No photos in this category yet.</div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ columns: "3 240px", columnGap: "10px" }}>
            {filtered.map((item, i) => (
              <div key={item.id} onClick={() => setLightbox({ ...item, index: i })} style={{
                breakInside: "avoid", marginBottom: "10px",
                aspectRatio: item.aspect, background: "#111",
                position: "relative", overflow: "hidden", cursor: "pointer",
              }}
                onMouseEnter={e => {
                  e.currentTarget.querySelector(".ov").style.opacity = "1";
                  e.currentTarget.querySelector(".gi").style.transform = "scale(1.05)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.querySelector(".ov").style.opacity = "0";
                  e.currentTarget.querySelector(".gi").style.transform = "scale(1)";
                }}
              >
                <img className="gi" src={item.img} alt={item.label} loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.5s ease" }}
                  onError={e => { e.currentTarget.parentElement.style.display = "none"; }}
                />
                <div className="ov" style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 60%)",
                  display: "flex", alignItems: "flex-end", padding: "1rem",
                  opacity: 0, transition: "opacity 0.3s ease",
                }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: COLORS.white, marginBottom: "3px" }}>{item.label}</div>
                    <Tag>{item.category}</Tag>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.95)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <button onClick={e => { e.stopPropagation(); setLightbox(null); }} style={{
            position: "absolute", top: "1.5rem", right: "1.5rem",
            background: "none", border: "none", color: COLORS.white,
            fontSize: "1.5rem", cursor: "pointer", zIndex: 201,
          }}>✕</button>
          <button onClick={e => { e.stopPropagation(); setLightbox(filtered[Math.max(lightbox.index - 1, 0)]); }} style={{
            position: "absolute", left: "1.5rem",
            background: "none", border: "none", color: COLORS.white,
            fontSize: "2rem", cursor: "pointer", zIndex: 201, opacity: lightbox.index === 0 ? 0.2 : 1,
          }}>‹</button>
          <img src={lightbox.img} alt={lightbox.label} onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }}
          />
          <button onClick={e => { e.stopPropagation(); setLightbox(filtered[Math.min(lightbox.index + 1, filtered.length - 1)]); }} style={{
            position: "absolute", right: "1.5rem",
            background: "none", border: "none", color: COLORS.white,
            fontSize: "2rem", cursor: "pointer", zIndex: 201, opacity: lightbox.index === filtered.length - 1 ? 0.2 : 1,
          }}>›</button>
          <div style={{
            position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)",
            textAlign: "center",
          }}>
            <div style={{ fontFamily: "'Playfair Display', serif", color: COLORS.white, fontSize: "1rem", marginBottom: "4px" }}>{lightbox.label}</div>
            <Tag>{lightbox.category}</Tag>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
