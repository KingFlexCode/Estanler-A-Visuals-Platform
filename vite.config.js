import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const PUBLIC_GALLERY_VIEWER_SUFFIX = "/src/pages/PublicGalleryViewer.jsx";

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`EST-114 transform could not find: ${label}`);
  }
  return source.replace(from, to);
}

function stabilizePublicGalleryPhotoCards() {
  return {
    name: "est-114-stabilize-public-gallery-photo-cards",
    enforce: "pre",
    transform(source, id) {
      const normalizedId = id.split("?")[0].replaceAll("\\", "/");
      if (!normalizedId.endsWith(PUBLIC_GALLERY_VIEWER_SUFFIX)) return null;

      let code = source;
      code = replaceRequired(
        code,
        '  const [hoveredPhotoId, setHoveredPhotoId] = useState(null);\n',
        "",
        "hover state declaration",
      );
      code = replaceRequired(
        code,
        '  const PhotoCard = ({ photo, mode = "masonry", index = 0 }) => {',
        '  const renderPhotoCard = (photo, mode = "masonry", index = 0) => {',
        "PhotoCard declaration",
      );
      code = replaceRequired(
        code,
        '    const hovered = hoveredPhotoId === photo.id;\n',
        "",
        "hovered photo calculation",
      );
      code = replaceRequired(
        code,
        '    return <article onClick={() => setLightbox(photo)} onMouseEnter={() => setHoveredPhotoId(photo.id)} onMouseLeave={() => setHoveredPhotoId(null)} style={{',
        '    return <article key={photo.id} onClick={() => setLightbox(photo)} style={{',
        "photo article hover handlers",
      );
      code = replaceRequired(
        code,
        "opacity: hovered ? 1 : 0,",
        "opacity: 0,",
        "photo action opacity",
      );
      code = replaceRequired(
        code,
        'items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="square" index={index} />)',
        'items.map((photo, index) => renderPhotoCard(photo, "square", index))',
        "square photo cards",
      );
      code = replaceRequired(
        code,
        'items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="horizontal" index={index} />)',
        'items.map((photo, index) => renderPhotoCard(photo, "horizontal", index))',
        "horizontal photo cards",
      );
      code = replaceRequired(
        code,
        'items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode="mosaic" index={index} />)',
        'items.map((photo, index) => renderPhotoCard(photo, "mosaic", index))',
        "mosaic photo cards",
      );
      code = replaceRequired(
        code,
        '<PhotoCard photo={photo} mode="filmstrip" index={index} />',
        '{renderPhotoCard(photo, "filmstrip", index)}',
        "filmstrip photo cards",
      );
      code = replaceRequired(
        code,
        'items.map((photo, index) => <PhotoCard key={photo.id} photo={photo} mode={gridStyle} index={index} />)',
        'items.map((photo, index) => renderPhotoCard(photo, gridStyle, index))',
        "column photo cards",
      );

      return { code, map: null };
    },
  };
}

export default defineConfig({
  plugins: [stabilizePublicGalleryPhotoCards(), react()],
});
