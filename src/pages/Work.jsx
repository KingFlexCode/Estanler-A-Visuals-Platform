<<<<<<< HEAD
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BASE, CATEGORY_LABELS, COLORS } from "../lib/constants";
=======
import { useEffect, useMemo, useState } from "react";
>>>>>>> est-71-client-gallery-core-collection-workspace
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
<<<<<<< HEAD
    image.thumbnail_path || image.display_path || image.original_path;

  const lightboxPath =
    image.display_path || image.original_path || image.thumbnail_path;

  return {
    id: image.id,
    category: image.category,
    label: image.title || image.file_name,
    img: buildPublicUrl(gridPath),
    fullImg: buildPublicUrl(lightboxPath),
    originalImg: buildPublicUrl(image.original_path),
=======
    image.display_path || image.original_path || image.thumbnail_path;

  const lightboxPath =
    image.original_path || image.display_path || image.thumbnail_path;

  return {
    id: image.id,
    category: image.category,
    label: image.title || image.file_name || "Portfolio image",
    img: buildPublicUrl(gridPath),
    fullImg: buildPublicUrl(lightboxPath),
>>>>>>> est-71-client-gallery-core-collection-workspace
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
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        overflowX: "auto",
        borderBottom: `1px solid ${COLORS.border}`,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {FILTERS.map((filter) => {
        const isActive = active === filter;
        const categoryKey = Object.keys(CATEGORY_LABELS).find(
          (key) => CATEGORY_LABELS[key] === filter,
        );

        const count =
          filter === "All"
            ? Object.values(counts).reduce((total, value) => total + value, 0)
            : counts[categoryKey] || 0;

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            style={{
              fontFamily: "var(--font-body)",
<<<<<<< HEAD
              fontWeight: isActive ? 700 : 400,
              fontSize: "12px",
              letterSpacing: "0.08em",
=======
              fontWeight: isActive ? 700 : 500,
              fontSize: 12,
              letterSpacing: "0.12em",
>>>>>>> est-71-client-gallery-core-collection-workspace
              color: isActive ? COLORS.text : COLORS.muted,
              background: isActive ? COLORS.surfaceDark : "transparent",
              border: "none",
              borderLeft: isActive ? `1px solid ${COLORS.gold}` : "none",
              borderRight: isActive ? `1px solid ${COLORS.gold}` : "none",
              borderBottom: isActive
                ? `2px solid ${COLORS.gold}`
                : "2px solid transparent",
              padding: "1rem 1.25rem 0.875rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
<<<<<<< HEAD
              transition: "all var(--transition-fast)",
=======
              transition: "all 0.2s ease",
>>>>>>> est-71-client-gallery-core-collection-workspace
              marginBottom: "-1px",
              textTransform: "uppercase",
            }}
          >
            {filter}
            {count > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  color: isActive ? COLORS.gold : COLORS.muted,
<<<<<<< HEAD
                  opacity: 0.72,
=======
                  opacity: 0.85,
>>>>>>> est-71-client-gallery-core-collection-workspace
                }}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}

      <style>{`::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

<<<<<<< HEAD
function chunkItems(items) {
  const groups = [];
  let index = 0;
  let rowIndex = 0;

  while (index < items.length) {
    const pattern = rowIndex % 4;
    let size;

    if (pattern === 0) {
      size = Math.min(3, items.length - index);
    } else if (pattern === 1) {
      size = Math.min(2, items.length - index);
    } else if (pattern === 2) {
      size = Math.min(4, items.length - index);
    } else {
      size = Math.min(2, items.length - index);
    }

    groups.push(items.slice(index, index + size));
    index += size;
    rowIndex += 1;
  }

  return groups;
}

function CollageGrid({ items, onSelect }) {
  if (items.length === 0) return null;

  const groups = chunkItems(items);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {groups.map((group, groupIndex) => (
        <CollageRow
          key={`${groupIndex}-${group.map((item) => item.id).join("-")}`}
          items={group}
          onSelect={onSelect}
          startIndex={groups
            .slice(0, groupIndex)
            .reduce((total, row) => total + row.length, 0)}
        />
      ))}
    </div>
  );
}

function CollageRow({ items, onSelect, startIndex }) {
  const count = items.length;

  if (count === 1) {
    return (
      <div style={{ height: "clamp(280px, 45vw, 560px)" }}>
        <PhotoTile item={items[0]} index={startIndex} onSelect={onSelect} />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
          height: "clamp(220px, 35vw, 440px)",
        }}
      >
        {items.map((item, index) => (
          <PhotoTile
            key={item.id}
            item={item}
            index={startIndex + index}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: "4px",
          height: "clamp(200px, 32vw, 400px)",
        }}
      >
        {items.map((item, index) => (
          <PhotoTile
            key={item.id}
            item={item}
            index={startIndex + index}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  if (count === 4) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "4px",
          height: "clamp(180px, 28vw, 340px)",
        }}
      >
        {items.map((item, index) => (
          <PhotoTile
            key={item.id}
            item={item}
            index={startIndex + index}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

=======
function MasonryGrid({ items, onSelect }) {
  if (items.length === 0) return null;

>>>>>>> est-71-client-gallery-core-collection-workspace
  return (
    <div
      style={{
        columns: "4 280px",
        columnGap: 6,
      }}
    >
<<<<<<< HEAD
      {items.map((item, index) => (
        <PhotoTile
          key={item.id}
          item={item}
          index={startIndex + index}
          onSelect={onSelect}
        />
=======
      {items.map((item) => (
        <PhotoTile key={item.id} item={item} onSelect={onSelect} />
>>>>>>> est-71-client-gallery-core-collection-workspace
      ))}
    </div>
  );
}

function PhotoTile({ item, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
<<<<<<< HEAD
=======
      aria-label={`Open ${item.label || "portfolio image"}`}
>>>>>>> est-71-client-gallery-core-collection-workspace
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
<<<<<<< HEAD
        height: "100%",
        border: "none",
        padding: 0,
        display: "block",
        width: "100%",
=======
        cursor: "pointer",
        overflow: "hidden",
        textAlign: "left",
        transform: hovered ? "translateY(-4px) scale(1.012)" : "none",
        boxShadow: hovered ? "0 18px 40px rgba(0, 0, 0, 0.28)" : "none",
        zIndex: hovered ? 2 : 1,
        transition:
          "transform 0.28s ease, box-shadow 0.28s ease, filter 0.28s ease",
>>>>>>> est-71-client-gallery-core-collection-workspace
      }}
    >
      <img
        src={item.img}
        alt={item.label}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
<<<<<<< HEAD
          height: "100%",
          objectFit: "cover",
          objectPosition: item.objectPosition || "50% 15%",
=======
          height: "auto",
>>>>>>> est-71-client-gallery-core-collection-workspace
          display: "block",
          filter: hovered ? "brightness(1.06) contrast(1.03)" : "none",
          transition: "filter 0.28s ease",
        }}
        onError={(event) => {
          event.currentTarget.parentElement.style.display = "none";
        }}
      />
<<<<<<< HEAD
=======

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
>>>>>>> est-71-client-gallery-core-collection-workspace
    </button>
  );
}

function Lightbox({ item, items, onClose, onNav }) {
  const index = items.findIndex((photo) => photo.id === item.id);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") onClose();
<<<<<<< HEAD
      if (event.key === "ArrowRight" && index < items.length - 1) {
        onNav(items[index + 1]);
      }
=======

      if (event.key === "ArrowRight" && index < items.length - 1) {
        onNav(items[index + 1]);
      }

>>>>>>> est-71-client-gallery-core-collection-workspace
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
        background: "rgba(17, 26, 36, 0.97)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "1.5rem",
<<<<<<< HEAD
          background: "transparent",
          border: `1px solid ${COLORS.border}`,
          color: COLORS.text,
          fontSize: "1.1rem",
          cursor: "pointer",
          zIndex: 201,
          opacity: 0.9,
          width: "42px",
          height: "42px",
=======
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${COLORS.border}`,
          color: COLORS.text,
          fontSize: "1.2rem",
          cursor: "pointer",
          zIndex: 201,
          padding: "0.75rem 1rem",
>>>>>>> est-71-client-gallery-core-collection-workspace
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
          aria-label="Previous image"
          style={{
            position: "absolute",
            left: "1.5rem",
<<<<<<< HEAD
            background: "transparent",
            border: "none",
            color: COLORS.text,
            fontSize: "2.75rem",
            cursor: "pointer",
            zIndex: 201,
            opacity: 0.7,
=======
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${COLORS.border}`,
            color: COLORS.text,
            fontSize: "2rem",
            cursor: "pointer",
            zIndex: 201,
            padding: "0.75rem 1rem",
>>>>>>> est-71-client-gallery-core-collection-workspace
          }}
        >
          ‹
        </button>
      )}

      <img
        src={item.fullImg || item.img}
        alt={item.label}
<<<<<<< HEAD
        decoding="async"
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "88vh",
          objectFit: "contain",
          border: `1px solid ${COLORS.borderDark}`,
=======
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          objectFit: "contain",
>>>>>>> est-71-client-gallery-core-collection-workspace
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
          aria-label="Next image"
          style={{
            position: "absolute",
            right: "1.5rem",
<<<<<<< HEAD
            background: "transparent",
            border: "none",
            color: COLORS.text,
            fontSize: "2.75rem",
            cursor: "pointer",
            zIndex: 201,
            opacity: 0.7,
=======
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${COLORS.border}`,
            color: COLORS.text,
            fontSize: "2rem",
            cursor: "pointer",
            zIndex: 201,
            padding: "0.75rem 1rem",
>>>>>>> est-71-client-gallery-core-collection-workspace
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

<<<<<<< HEAD
  const filtered =
    filter === "All"
      ? allItems
      : allItems.filter((item) => CATEGORY_LABELS[item.category] === filter);
=======
  const filtered = useMemo(() => {
    if (filter === "All") return allItems;

    return allItems.filter((item) => CATEGORY_LABELS[item.category] === filter);
  }, [allItems, filter]);
>>>>>>> est-71-client-gallery-core-collection-workspace

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <div
        style={{
          paddingTop: "88px",
          padding: "88px var(--page-x) 0",
          background: COLORS.bg,
        }}
      >
        <CategoryNav active={filter} onChange={setFilter} counts={counts} />
      </div>

<<<<<<< HEAD
      <div style={{ padding: "4px" }}>
=======
      <div style={{ padding: 6 }}>
>>>>>>> est-71-client-gallery-core-collection-workspace
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
