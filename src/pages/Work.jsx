import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer";
import { BASE, CATEGORY_LABELS, COLORS } from "../lib/constants";
import { supabase } from "../lib/supabase";

const FILTERS = ["All", ...Object.values(CATEGORY_LABELS)];

function buildPublicUrl(path) {
  if (!path) return "";
  return `${BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function mapPortfolioImage(image) {
  const gridPath =
    image.display_path || image.original_path || image.thumbnail_path;

  const lightboxPath =
    image.original_path || image.display_path || image.thumbnail_path;

  return {
    id: image.id,
    category: image.category,
    label: image.title || image.file_name || "Portfolio image",
    img: buildPublicUrl(gridPath),
    fullImg: buildPublicUrl(lightboxPath),
    aspect: image.aspect_ratio || "4 / 5",
    objectPosition: `${image.object_position_x ?? 50}% ${
      image.object_position_y ?? 15
    }%`,
    zoom: Number(image.zoom || 1),
  };
}

function getCategoryCounts(items) {
  return items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
}

function getFilterCount(filter, counts) {
  if (filter === "All") {
    return Object.values(counts).reduce((total, value) => total + value, 0);
  }

  const categoryKey = Object.keys(CATEGORY_LABELS).find(
    (key) => CATEGORY_LABELS[key] === filter,
  );

  return counts[categoryKey] || 0;
}

function Spinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6rem 0",
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          border: `2px solid ${COLORS.border}`,
          borderTop: `2px solid ${COLORS.gold}`,
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CategoryNav({ active, onChange, counts }) {
  const activeCount = getFilterCount(active, counts);

  return (
    <section className="work-category-shell" aria-label="Portfolio categories">
      <div className="work-category-meta">
        <span>Browse Work</span>
        <span>
          {active} · {activeCount} photo{activeCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="work-category-track" role="tablist" aria-label="Filter work by category">
        {FILTERS.map((filter) => {
          const isActive = active === filter;
          const count = getFilterCount(filter, counts);

          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChange(filter)}
              className={`work-category-chip${isActive ? " is-active" : ""}`}
            >
              <span className="work-category-label">{filter}</span>
              {count > 0 && <span className="work-category-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <style>{`
        .work-category-shell {
          border: 1px solid ${COLORS.border};
          border-left: none;
          border-right: none;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.025), rgba(255,255,255,0.055), rgba(255,255,255,0.025)),
            ${COLORS.bg};
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
          padding: 0.85rem 0;
          position: relative;
        }

        .work-category-shell::before,
        .work-category-shell::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: clamp(1rem, 3vw, 2rem);
          pointer-events: none;
          z-index: 2;
        }

        .work-category-shell::before {
          left: 0;
          background: linear-gradient(90deg, ${COLORS.bg}, transparent);
        }

        .work-category-shell::after {
          right: 0;
          background: linear-gradient(270deg, ${COLORS.bg}, transparent);
        }

        .work-category-meta {
          align-items: center;
          color: ${COLORS.muted};
          display: flex;
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 800;
          justify-content: space-between;
          letter-spacing: 0.14em;
          padding: 0 clamp(1rem, 2.4vw, 1.35rem) 0.65rem;
          text-transform: uppercase;
        }

        .work-category-track {
          display: flex;
          gap: 0.55rem;
          overflow-x: auto;
          padding: 0 clamp(1rem, 2.4vw, 1.35rem) 0.15rem;
          scroll-padding-inline: 1rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
          position: relative;
          z-index: 1;
        }

        .work-category-track::-webkit-scrollbar {
          display: none;
        }

        .work-category-chip {
          align-items: center;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.075);
          color: ${COLORS.muted};
          cursor: pointer;
          display: inline-flex;
          flex: 0 0 auto;
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 800;
          gap: 0.48rem;
          justify-content: center;
          letter-spacing: 0.13em;
          min-height: 44px;
          padding: 0.78rem 1rem;
          position: relative;
          text-transform: uppercase;
          transition: background 0.22s ease, border-color 0.22s ease, color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
          white-space: nowrap;
        }

        .work-category-chip::after {
          background: ${COLORS.gold};
          bottom: 5px;
          content: "";
          height: 2px;
          left: 1rem;
          opacity: 0;
          position: absolute;
          right: 1rem;
          transform: scaleX(0.35);
          transition: opacity 0.22s ease, transform 0.22s ease;
        }

        .work-category-chip:hover {
          background: rgba(255, 255, 255, 0.065);
          border-color: rgba(255, 255, 255, 0.16);
          color: ${COLORS.text};
          transform: translateY(-1px);
        }

        .work-category-chip:focus-visible {
          outline: 2px solid ${COLORS.gold};
          outline-offset: 3px;
        }

        .work-category-chip.is-active {
          background:
            linear-gradient(135deg, rgba(255, 180, 96, 0.16), rgba(255, 255, 255, 0.055)),
            ${COLORS.surfaceDark};
          border: 1px solid ${COLORS.gold};
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26), inset 0 0 0 1px rgba(255,255,255,0.045);
          color: ${COLORS.text};
        }

        .work-category-chip.is-active::after {
          opacity: 1;
          transform: scaleX(1);
        }

        .work-category-count {
          color: ${COLORS.muted};
          font-size: 10px;
          letter-spacing: 0.06em;
          opacity: 0.86;
        }

        .work-category-chip.is-active .work-category-count {
          color: ${COLORS.gold};
        }

        @media (max-width: 720px) {
          .work-category-shell {
            margin-left: -0.75rem;
            margin-right: -0.75rem;
          }

          .work-category-meta {
            align-items: flex-start;
            flex-direction: column;
            gap: 0.35rem;
          }

          .work-category-chip {
            font-size: 10px;
            min-height: 41px;
            padding: 0.72rem 0.86rem;
          }
        }
      `}</style>
    </section>
  );
}

function MasonryGrid({ items, onSelect }) {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        columns: "4 280px",
        columnGap: 6,
      }}
    >
      {items.map((item) => (
        <PhotoTile key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}

function PhotoTile({ item, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      aria-label={`Open ${item.label || "portfolio image"}`}
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        breakInside: "avoid",
        margin: "0 0 6px",
        padding: 0,
        border: "none",
        background: COLORS.surface,
        cursor: "pointer",
        overflow: "hidden",
        textAlign: "left",
        transform: hovered ? "translateY(-4px) scale(1.012)" : "none",
        boxShadow: hovered ? "0 18px 40px rgba(0, 0, 0, 0.28)" : "none",
        zIndex: hovered ? 2 : 1,
        transition:
          "transform 0.28s ease, box-shadow 0.28s ease, filter 0.28s ease",
      }}
    >
      <img
        src={item.img}
        alt={item.label}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          filter: hovered ? "brightness(1.06) contrast(1.03)" : "none",
          transition: "filter 0.28s ease",
        }}
        onError={(event) => {
          event.currentTarget.parentElement.style.display = "none";
        }}
      />

      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          border: hovered
            ? `1px solid ${COLORS.gold}`
            : "1px solid transparent",
          boxShadow: hovered
            ? "inset 0 0 0 1px rgba(255, 255, 255, 0.08)"
            : "none",
          opacity: hovered ? 0.9 : 0,
          transition: "opacity 0.28s ease, border-color 0.28s ease",
          pointerEvents: "none",
        }}
      />
    </button>
  );
}

function Lightbox({ item, items, onClose, onNav }) {
  const index = items.findIndex((photo) => photo.id === item.id);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") onClose();

      if (event.key === "ArrowRight" && index < items.length - 1) {
        onNav(items[index + 1]);
      }

      if (event.key === "ArrowLeft" && index > 0) {
        onNav(items[index - 1]);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, items, onClose, onNav]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10,10,10,0.96)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${COLORS.border}`,
          color: COLORS.text,
          fontSize: "1.2rem",
          cursor: "pointer",
          zIndex: 201,
          padding: "0.75rem 1rem",
        }}
      >
        ✕
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNav(items[index - 1]);
          }}
          style={{
            position: "absolute",
            left: "1.5rem",
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${COLORS.border}`,
            color: COLORS.text,
            fontSize: "2rem",
            cursor: "pointer",
            zIndex: 201,
            padding: "0.75rem 1rem",
          }}
        >
          ‹
        </button>
      )}

      <img
        src={item.fullImg || item.img}
        alt={item.label}
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          objectFit: "contain",
          background: COLORS.bg,
        }}
      />

      {index < items.length - 1 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNav(items[index + 1]);
          }}
          style={{
            position: "absolute",
            right: "1.5rem",
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${COLORS.border}`,
            color: COLORS.text,
            fontSize: "2rem",
            cursor: "pointer",
            zIndex: 201,
            padding: "0.75rem 1rem",
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}

export default function Work() {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState(null);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      const { data, error } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("is_visible", true)
        .neq("category", "unlisted")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading portfolio images:", error);
        setAllItems([]);
        setCounts({});
        setLoading(false);
        return;
      }

      const results = (data || [])
        .map(mapPortfolioImage)
        .filter((item) => item.img);
      setAllItems(results);
      setCounts(getCategoryCounts(results));
      setLoading(false);
    }

    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All") return allItems;

    return allItems.filter((item) => CATEGORY_LABELS[item.category] === filter);
  }, [allItems, filter]);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <div
        style={{
          paddingTop: "88px",
          padding: "96px clamp(1rem, 4vw, 3.5rem) 0",
          background: COLORS.bg,
        }}
      >
        <CategoryNav active={filter} onChange={setFilter} counts={counts} />
      </div>

      <div style={{ padding: 6 }}>
        {loading && <Spinner />}

        {!loading && filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "6rem 2rem",
              fontFamily: "var(--font-body)",
              fontWeight: 300,
              fontSize: "0.9rem",
              color: COLORS.muted,
            }}
          >
            No photos in this category yet.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <MasonryGrid items={filtered} onSelect={setLightbox} />
        )}
      </div>

      {lightbox && (
        <Lightbox
          item={lightbox}
          items={filtered}
          onClose={() => setLightbox(null)}
          onNav={setLightbox}
        />
      )}

      <Footer light />
    </div>
  );
}
