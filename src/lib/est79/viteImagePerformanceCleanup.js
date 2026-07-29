const HOME_PAGE_SUFFIX = "/src/pages/Home.jsx";
const GALLERY_PAGE_SUFFIX = "/src/pages/Gallery.jsx";

function replaceRequired(source, from, to, label) {
  const found =
    typeof from === "string" ? source.includes(from) : from.test(source);

  if (!found) {
    throw new Error(`EST-79 transform could not find: ${label}`);
  }

  return source.replace(from, to);
}

function normalizeId(id) {
  return id.split("?")[0].replaceAll("\\", "/");
}

function transformHome(source) {
  let code = source;

  code = replaceRequired(
    code,
    'import { useEffect, useState } from "react";',
    'import { useEffect, useMemo, useState } from "react";',
    "Home React imports",
  );

  code = replaceRequired(
    code,
    "image.display_path || image.original_path || image.thumbnail_path",
    "image.display_path || image.thumbnail_path || image.original_path",
    "Home hero optimized path priority",
  );

  code = replaceRequired(
    code,
    "image.display_path || image.original_path || image.thumbnail_path",
    "image.display_path || image.thumbnail_path || image.original_path",
    "Home portfolio optimized path priority",
  );

  code = replaceRequired(
    code,
    `  const previewPath =
    image.original_path || image.display_path || image.thumbnail_path;

`,
    "",
    "Home unused original preview path",
  );

  code = replaceRequired(
    code,
    "    fullImg: buildPublicUrl(previewPath),\n",
    "",
    "Home unused original preview URL",
  );

  code = replaceRequired(
    code,
    "    img: buildPublicUrl(gridPath),\n",
    `    img: buildPublicUrl(gridPath),
    width: image.display_width || image.thumbnail_width || undefined,
    height: image.display_height || image.thumbnail_height || undefined,
`,
    "Home portfolio image dimensions",
  );

  code = replaceRequired(
    code,
    "  const [backgroundIndex, setBackgroundIndex] = useState(0);\n",
    `  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [previousBackgroundIndex, setPreviousBackgroundIndex] = useState(null);
`,
    "Home previous hero state",
  );

  code = replaceRequired(
    code,
    `"id,display_path,original_path,thumbnail_path,object_position_x,object_position_y,zoom,featured,display_order,created_at"`,
    `"id,display_path,thumbnail_path,original_path,object_position_x,object_position_y,zoom,display_order,created_at"`,
    "Home hero query fields",
  );

  code = replaceRequired(
    code,
    `  useEffect(() => {
    if (heroPhotos.length <= 1) return undefined;

    const timer = setInterval(() => {
      setBackgroundIndex(
        (previousIndex) => (previousIndex + 1) % heroPhotos.length,
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [heroPhotos.length]);
`,
    `  useEffect(() => {
    if (heroPhotos.length <= 1) return undefined;

    const timer = setTimeout(() => {
      setPreviousBackgroundIndex(backgroundIndex);
      setBackgroundIndex((backgroundIndex + 1) % heroPhotos.length);
    }, 5000);

    return () => clearTimeout(timer);
  }, [backgroundIndex, heroPhotos.length]);
`,
    "Home hero rotation timer",
  );

  code = replaceRequired(
    code,
    `  useEffect(() => {
    if (backgroundIndex >= heroPhotos.length) {
      setBackgroundIndex(0);
    }
  }, [backgroundIndex, heroPhotos.length]);

  return (
`,
    `  useEffect(() => {
    if (backgroundIndex >= heroPhotos.length) {
      setBackgroundIndex(0);
      setPreviousBackgroundIndex(null);
    }
  }, [backgroundIndex, heroPhotos.length]);

  useEffect(() => {
    if (heroPhotos.length <= 1) return undefined;

    const nextIndex = (backgroundIndex + 1) % heroPhotos.length;
    const nextSource = heroPhotos[nextIndex]?.src;
    if (!nextSource) return undefined;

    const preload = new Image();
    preload.decoding = "async";
    preload.src = nextSource;

    return () => {
      preload.onload = null;
      preload.onerror = null;
    };
  }, [backgroundIndex, heroPhotos]);

  useEffect(() => {
    if (previousBackgroundIndex === null) return undefined;

    const timer = setTimeout(() => {
      setPreviousBackgroundIndex(null);
    }, 1500);

    return () => clearTimeout(timer);
  }, [previousBackgroundIndex]);

  const renderedHeroPhotos = useMemo(() => {
    const visibleIndexes = new Set([backgroundIndex]);
    if (previousBackgroundIndex !== null) {
      visibleIndexes.add(previousBackgroundIndex);
    }

    return heroPhotos
      .map((photo, index) => ({ photo, index }))
      .filter(({ index }) => visibleIndexes.has(index))
      .sort(({ index: firstIndex }, { index: secondIndex }) => {
        if (firstIndex === backgroundIndex) return 1;
        if (secondIndex === backgroundIndex) return -1;
        return 0;
      });
  }, [backgroundIndex, heroPhotos, previousBackgroundIndex]);

  return (
`,
    "Home hero preload and visible slides",
  );

  code = replaceRequired(
    code,
    `      {heroPhotos.map((photo, index) => (
        <img
          key={photo.id}
          src={photo.src}
          alt="Featured portfolio background"
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: photo.objectPosition,
            opacity: backgroundIndex === index ? (loaded ? 1 : 0) : 0,
            transform: \`scale(\${photo.zoom || 1})\`,
            transition: "opacity 1.4s ease",
          }}
        />
      ))}
`,
    `      {renderedHeroPhotos.map(({ photo, index }) => {
        const isActive = index === backgroundIndex;

        return (
          <img
            key={photo.id}
            src={photo.src}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority={isActive ? "high" : "auto"}
            decoding="async"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: photo.objectPosition,
              opacity: isActive ? (loaded ? 1 : 0) : 0,
              transform: \`scale(\${photo.zoom || 1})\`,
              transition: "opacity 1.4s ease",
            }}
          />
        );
      })}
`,
    "Home limited hero image rendering",
  );

  code = replaceRequired(
    code,
    '        .select("*")',
    `        .select(
          "id,category,aspect_ratio,title,file_name,display_path,thumbnail_path,original_path,display_width,display_height,thumbnail_width,thumbnail_height,object_position_x,object_position_y,zoom,featured_order,display_order,created_at",
        )`,
    "Home featured query fields",
  );

  code = replaceRequired(
    code,
    "      setItems((data || []).map(mapPortfolioRow));",
    "      setItems((data || []).map(mapPortfolioRow).filter((item) => item.img));",
    "Home valid featured images",
  );

  code = replaceRequired(
    code,
    `                alt={item.label}
                loading="lazy"
                decoding="async"
                draggable={false}`,
    `                alt={item.label}
                width={item.width}
                height={item.height}
                loading="lazy"
                decoding="async"
                sizes="(max-width: 520px) 100vw, (max-width: 760px) 50vw, (max-width: 1100px) 33vw, 25vw"
                draggable={false}`,
    "Home featured image sizing",
  );

  return code;
}

function transformGallery(source) {
  let code = source;

  code = replaceRequired(
    code,
    "image.display_path || image.original_path || image.thumbnail_path",
    "image.display_path || image.thumbnail_path || image.original_path",
    "Work grid optimized path priority",
  );

  code = replaceRequired(
    code,
    "image.original_path || image.display_path || image.thumbnail_path",
    "image.display_path || image.thumbnail_path || image.original_path",
    "Work lightbox optimized path priority",
  );

  code = replaceRequired(
    code,
    "    fullImg: buildPublicUrl(lightboxPath),\n",
    `    fullImg: buildPublicUrl(lightboxPath),
    width: image.display_width || image.thumbnail_width || undefined,
    height: image.display_height || image.thumbnail_height || undefined,
`,
    "Work image dimensions",
  );

  code = replaceRequired(
    code,
    `        alt={item.label}
        loading="lazy"
        decoding="async"`,
    `        alt={item.label}
        width={item.width}
        height={item.height}
        loading="lazy"
        decoding="async"
        sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, (max-width: 1250px) 33vw, 25vw"`,
    "Work grid image sizing",
  );

  code = replaceRequired(
    code,
    `  }, [index, items, onClose, onNav]);

  return (
`,
    `  }, [index, items, onClose, onNav]);

  useEffect(() => {
    const adjacentSources = [items[index - 1], items[index + 1]]
      .map((photo) => photo?.fullImg || photo?.img)
      .filter(Boolean);

    const preloads = adjacentSources.map((source) => {
      const image = new Image();
      image.decoding = "async";
      image.src = source;
      return image;
    });

    return () => {
      preloads.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [index, items]);

  return (
`,
    "Work adjacent lightbox preload",
  );

  code = replaceRequired(
    code,
    `        src={item.fullImg || item.img}
        alt={item.label}
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          objectFit: "contain",`,
    `        src={item.fullImg || item.img}
        alt={item.label}
        width={item.width}
        height={item.height}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "92vw",
          maxHeight: "88vh",
          width: "auto",
          height: "auto",
          objectFit: "contain",`,
    "Work lightbox optimized image loading",
  );

  code = replaceRequired(
    code,
    '        .select("*")',
    `        .select(
          "id,category,title,file_name,display_path,thumbnail_path,original_path,display_width,display_height,thumbnail_width,thumbnail_height,aspect_ratio,object_position_x,object_position_y,zoom,display_order,created_at",
        )`,
    "Work gallery query fields",
  );

  return code;
}

export function imagePerformanceCleanup() {
  return {
    name: "est-79-image-performance-cleanup",
    enforce: "pre",
    transform(source, id) {
      const normalizedId = normalizeId(id);

      if (normalizedId.endsWith(HOME_PAGE_SUFFIX)) {
        return { code: transformHome(source), map: null };
      }

      if (normalizedId.endsWith(GALLERY_PAGE_SUFFIX)) {
        return { code: transformGallery(source), map: null };
      }

      return null;
    },
  };
}
