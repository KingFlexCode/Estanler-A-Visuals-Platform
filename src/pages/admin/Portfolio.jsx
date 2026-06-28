import { useCallback, useEffect, useMemo, useState } from "react";
import exifr from "exifr";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../../components/UI";
import { BASE, CATEGORY_LABELS, COLORS } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { AdminNav } from "./Dashboard";

const PORTFOLIO_BUCKET = "Portfolio";

const STORAGE_CATEGORY_MAP = {
  birthday: "birthdays",
  engagement: "engagements",
  landscape: "landscapes",
  lifestyle: "lifestyle",
  portrait: "portraits",
  things: "things",
  wedding: "weddings",
};

const DEFAULT_CATEGORY = "portrait";

function buildPublicUrl(path) {
  if (!path) return "";
  return `${BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function titleFromFileName(name = "") {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFileName(name = "") {
  const baseName = name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return baseName || `portfolio-image-${Date.now()}`;
}

function getFileExtension(fileName = "", fallback = "jpg") {
  return fileName.split(".").pop()?.toLowerCase() || fallback;
}

function formatBytes(bytes) {
  if (!bytes) return "Unknown";

  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

function getStorageFolder(category) {
  return (
    STORAGE_CATEGORY_MAP[category] || STORAGE_CATEGORY_MAP[DEFAULT_CATEGORY]
  );
}

function exifDateToIso(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractGpsValue(value) {
  if (typeof value === "number") return value;
  if (Array.isArray(value) && typeof value[0] === "number") return value[0];
  return null;
}

function formatDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildUploadName(file, index, options) {
  if (options.renameMode === "original") {
    return sanitizeFileName(file.name);
  }

  const dateStamp = formatDateStamp();
  const number = String(options.startingNumber + index).padStart(
    options.numberPadding,
    "0",
  );

  const parts = [];

  if (options.includeDate && options.datePosition === "prefix") {
    parts.push(dateStamp);
  }

  parts.push(sanitizeFileName(options.batchBase || "portfolio"));
  parts.push(number);

  if (options.includeDate && options.datePosition === "suffix") {
    parts.push(dateStamp);
  }

  return parts.filter(Boolean).join(options.separator || "-");
}

function getImageDimensionsFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = reject;
    image.src = url;
  });
}

async function resizeImage(file, maxSize, quality = 0.82) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = objectUrl;
    });

    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;

    const scale = Math.min(
      1,
      maxSize / Math.max(originalWidth, originalHeight),
    );

    const targetWidth = Math.round(originalWidth * scale);
    const targetHeight = Math.round(originalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });

    if (!blob) {
      throw new Error("Could not create optimized image.");
    }

    return {
      blob,
      width: targetWidth,
      height: targetHeight,
      size: blob.size,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function readExif(file) {
  try {
    const data = await exifr.parse(file, {
      tiff: true,
      ifd0: true,
      exif: true,
      gps: true,
      xmp: true,
      icc: false,
      iptc: true,
      jfif: true,
    });

    if (!data) return {};

    return {
      camera_make: data.Make || null,
      camera_model: data.Model || null,
      lens_model: data.LensModel || data.Lens || null,
      focal_length: data.FocalLength ? `${data.FocalLength}mm` : null,
      aperture: data.FNumber ? `f/${data.FNumber}` : null,
      shutter_speed: data.ExposureTime ? `${data.ExposureTime}s` : null,
      iso: data.ISO || null,
      taken_at: exifDateToIso(data.DateTimeOriginal || data.CreateDate),
      gps_latitude: extractGpsValue(data.latitude),
      gps_longitude: extractGpsValue(data.longitude),
      exif_raw: data,
    };
  } catch (error) {
    console.warn("Could not read EXIF metadata:", error);
    return {};
  }
}

function FieldLabel({ children }) {
  return (
    <span
      style={{
        display: "block",
        marginBottom: 6,
        fontFamily: "var(--font-body)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
        color: COLORS.muted,
      }}
    >
      {children}
    </span>
  );
}

function TextInput({ label, value, onChange, type = "text", min, max, step }) {
  return (
    <label style={{ display: "block" }}>
      <FieldLabel>{label}</FieldLabel>

      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            type === "number" || type === "range"
              ? Number(event.target.value)
              : event.target.value,
          )
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: COLORS.surfaceDark,
          color: COLORS.text,
          border: `1px solid ${COLORS.border}`,
          padding: type === "range" ? "8px 0" : "10px 12px",
          outline: "none",
          fontFamily: "var(--font-body)",
          fontSize: 13,
        }}
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, children }) {
  return (
    <label style={{ display: "block" }}>
      <FieldLabel>{label}</FieldLabel>

      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: COLORS.surfaceDark,
          color: COLORS.text,
          border: `1px solid ${COLORS.border}`,
          padding: "10px 12px",
          outline: "none",
          fontFamily: "var(--font-body)",
          fontSize: 13,
        }}
      >
        {children}
      </select>
    </label>
  );
}

function ToggleButton({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        border: `1px solid ${checked ? COLORS.gold : COLORS.border}`,
        background: checked ? COLORS.gold : "transparent",
        color: checked ? COLORS.abyssalBlue || COLORS.bgDark : COLORS.muted,
        padding: "10px 12px",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {checked ? "✓ " : ""}
      {label}
    </button>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: 8,
        }}
      >
        <FieldLabel>{label}</FieldLabel>

        <span
          style={{
            color: COLORS.gold,
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          {displayValue ?? value}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          width: "100%",
          accentColor: COLORS.gold,
          cursor: "pointer",
        }}
      />
    </div>
  );
}

function UploadModal({ open, onClose, onUploaded }) {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [queue, setQueue] = useState([]);

  const [renameMode, setRenameMode] = useState("original");
  const [batchBase, setBatchBase] = useState("estanler-visuals");
  const [includeDate, setIncludeDate] = useState(false);
  const [datePosition, setDatePosition] = useState("prefix");
  const [startingNumber, setStartingNumber] = useState(1);
  const [numberPadding, setNumberPadding] = useState(3);
  const [separator, setSeparator] = useState("-");

  if (!open) return null;

  function handleFileSelection(nextFiles) {
    const imageFiles = Array.from(nextFiles).filter((file) =>
      file.type.startsWith("image/"),
    );

    setFiles(imageFiles);
    setStatus(
      imageFiles.length
        ? `${imageFiles.length} image${
            imageFiles.length === 1 ? "" : "s"
          } ready.`
        : "Choose at least one image file.",
    );
    setQueue([]);
  }

  async function uploadOneFile(file, selectedCategory, index) {
    const folder = getStorageFolder(selectedCategory);

    const uploadBaseName = buildUploadName(file, index, {
      renameMode,
      batchBase,
      includeDate,
      datePosition,
      startingNumber,
      numberPadding,
      separator,
    });

    const extension = getFileExtension(file.name);
    const uniqueName = `${Date.now()}-${index}-${uploadBaseName}`;

    const originalPath = `${folder}/originals/${uniqueName}.${extension}`;
    const displayPath = `${folder}/display/${uniqueName}.webp`;
    const thumbnailPath = `${folder}/thumbnails/${uniqueName}.webp`;

    const originalUrl = URL.createObjectURL(file);

    try {
      const originalDimensions = await getImageDimensionsFromUrl(originalUrl);

      const [exif, displayImage, thumbnailImage] = await Promise.all([
        readExif(file),
        resizeImage(file, 2200, 0.84),
        resizeImage(file, 720, 0.78),
      ]);

      const originalUpload = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .upload(originalPath, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type,
        });

      if (originalUpload.error) throw originalUpload.error;

      const displayUpload = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .upload(displayPath, displayImage.blob, {
          cacheControl: "31536000",
          upsert: false,
          contentType: "image/webp",
        });

      if (displayUpload.error) throw displayUpload.error;

      const thumbnailUpload = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .upload(thumbnailPath, thumbnailImage.blob, {
          cacheControl: "31536000",
          upsert: false,
          contentType: "image/webp",
        });

      if (thumbnailUpload.error) throw thumbnailUpload.error;

      const title =
        renameMode === "original"
          ? titleFromFileName(file.name)
          : titleFromFileName(uploadBaseName);

      const { error: insertError } = await supabase
        .from("portfolio_images")
        .insert({
          category: selectedCategory,
          file_name: file.name,
          original_path: originalPath,
          display_path: displayPath,
          thumbnail_path: thumbnailPath,
          title,
          alt_text: title,
          aspect_ratio: selectedCategory === "landscape" ? "16 / 9" : "4 / 5",
          object_position_x: 50,
          object_position_y: 50,
          zoom: 1,
          featured: false,
          is_visible: true,
          display_order: 0,
          original_size_bytes: file.size,
          display_size_bytes: displayImage.size,
          thumbnail_size_bytes: thumbnailImage.size,
          original_width: originalDimensions.width,
          original_height: originalDimensions.height,
          display_width: displayImage.width,
          display_height: displayImage.height,
          thumbnail_width: thumbnailImage.width,
          thumbnail_height: thumbnailImage.height,
          mime_type: file.type,
          ...exif,
        });

      if (insertError) throw insertError;

      return {
        name: file.name,
        status: "done",
        message: "Uploaded",
      };
    } finally {
      URL.revokeObjectURL(originalUrl);
    }
  }

  async function startUpload() {
    if (files.length === 0) {
      setStatus("Choose at least one image file.");
      return;
    }

    setUploading(true);
    setStatus(
      `Uploading ${files.length} image${files.length === 1 ? "" : "s"}...`,
    );

    setQueue(
      files.map((file) => ({
        name: file.name,
        status: "waiting",
        message: "Waiting",
      })),
    );

    const results = [];

    for (const [index, file] of files.entries()) {
      setQueue((previousQueue) =>
        previousQueue.map((item, itemIndex) =>
          itemIndex === index
            ? { ...item, status: "uploading", message: "Processing" }
            : item,
        ),
      );

      try {
        const result = await uploadOneFile(file, category, index);
        results.push(result);

        setQueue((previousQueue) =>
          previousQueue.map((item, itemIndex) =>
            itemIndex === index ? result : item,
          ),
        );
      } catch (error) {
        console.error(error);

        const failedResult = {
          name: file.name,
          status: "failed",
          message: error.message || "Upload failed",
        };

        results.push(failedResult);

        setQueue((previousQueue) =>
          previousQueue.map((item, itemIndex) =>
            itemIndex === index ? failedResult : item,
          ),
        );
      }
    }

    const successful = results.filter((item) => item.status === "done").length;
    const failed = results.filter((item) => item.status === "failed").length;

    setStatus(`Uploaded ${successful}. Failed ${failed}.`);
    setUploading(false);

    if (successful > 0) {
      await onUploaded();
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(17, 26, 36, 0.86)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "min(880px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: COLORS.surfaceDark,
            borderBottom: `1px solid ${COLORS.border}`,
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                color: COLORS.text,
                margin: 0,
                fontSize: "1.4rem",
              }}
            >
              Upload Portfolio Images
            </h2>

            <p
              style={{
                margin: "0.35rem 0 0",
                color: COLORS.muted,
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              Create originals, display images, thumbnails, and metadata.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
              cursor: uploading ? "not-allowed" : "pointer",
              padding: "8px 12px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
          <SelectInput
            label="Upload Category"
            value={category}
            onChange={setCategory}
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectInput>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 140,
              border: `1px dashed ${COLORS.border}`,
              background: COLORS.surface,
              color: COLORS.muted,
              cursor: uploading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              textAlign: "center",
              padding: "1rem",
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!uploading) handleFileSelection(event.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(event) => handleFileSelection(event.target.files)}
              style={{ display: "none" }}
            />

            {files.length
              ? `${files.length} image${files.length === 1 ? "" : "s"} selected`
              : "Drop images here or click to choose files"}
          </label>

          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.borderDark}`,
              padding: "1rem",
              display: "grid",
              gap: "1rem",
            }}
          >
            <FieldLabel>Rename Options</FieldLabel>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <ToggleButton
                label="Keep Original Names"
                checked={renameMode === "original"}
                onChange={() => setRenameMode("original")}
              />

              <ToggleButton
                label="Batch Rename"
                checked={renameMode === "batch"}
                onChange={() => setRenameMode("batch")}
              />
            </div>

            {renameMode === "batch" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "1rem",
                }}
              >
                <TextInput
                  label="Batch Name"
                  value={batchBase}
                  onChange={setBatchBase}
                />

                <TextInput
                  label="Starting Number"
                  type="number"
                  min={1}
                  value={startingNumber}
                  onChange={setStartingNumber}
                />

                <TextInput
                  label="Number Padding"
                  type="number"
                  min={1}
                  max={6}
                  value={numberPadding}
                  onChange={setNumberPadding}
                />

                <TextInput
                  label="Separator"
                  value={separator}
                  onChange={setSeparator}
                />

                <SelectInput
                  label="Date Position"
                  value={datePosition}
                  onChange={setDatePosition}
                >
                  <option value="prefix">Date Prefix</option>
                  <option value="suffix">Date Suffix</option>
                </SelectInput>

                <div style={{ display: "flex", alignItems: "end" }}>
                  <ToggleButton
                    label="Include Date"
                    checked={includeDate}
                    onChange={setIncludeDate}
                  />
                </div>
              </div>
            )}
          </div>

          {status && (
            <div
              style={{
                color: COLORS.gold,
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              {status}
            </div>
          )}

          {queue.length > 0 && (
            <div style={{ display: "grid", gap: "6px" }}>
              {queue.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "1rem",
                    color:
                      item.status === "failed" ? COLORS.danger : COLORS.muted,
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    borderTop: `1px solid ${COLORS.borderDark}`,
                    paddingTop: "6px",
                  }}
                >
                  <span>{item.name}</span>
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              borderTop: `1px solid ${COLORS.border}`,
              paddingTop: "1rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={startUpload}
              disabled={uploading || files.length === 0}
              className="btn-primary"
              style={{
                opacity: uploading || files.length === 0 ? 0.65 : 1,
                cursor:
                  uploading || files.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Start Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioGallery({
  images,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          style={{
            border: `1px solid ${
              filter === "all" ? COLORS.gold : COLORS.border
            }`,
            background: filter === "all" ? COLORS.gold : "transparent",
            color: filter === "all" ? COLORS.bgDark : COLORS.muted,
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          All
        </button>

        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            style={{
              border: `1px solid ${
                filter === key ? COLORS.gold : COLORS.border
              }`,
              background: filter === key ? COLORS.gold : "transparent",
              color: filter === key ? COLORS.bgDark : COLORS.muted,
              padding: "8px 12px",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {images.length === 0 ? (
        <div
          style={{
            padding: "4rem 1rem",
            textAlign: "center",
            color: COLORS.muted,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            border: `1px dashed ${COLORS.border}`,
          }}
        >
          No images found in this filter.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))",
            gap: "10px",
          }}
        >
          {images.map((image) => {
            const isSelected = image.id === selectedId;

            const previewUrl = buildPublicUrl(
              image.thumbnail_path || image.display_path || image.original_path,
            );

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelect(image)}
                style={{
                  display: "block",
                  padding: 0,
                  border: `2px solid ${
                    isSelected ? COLORS.gold : "transparent"
                  }`,
                  background: COLORS.surfaceDark,
                  cursor: "pointer",
                  textAlign: "left",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    aspectRatio: "4 / 5",
                    background: COLORS.surface,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt={image.alt_text || image.title || image.file_name}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: `${image.object_position_x ?? 50}% ${
                        image.object_position_y ?? 50
                      }%`,
                      transform: `scale(${Number(image.zoom || 1)})`,
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: "8px",
                    color: COLORS.muted,
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    lineHeight: 1.4,
                  }}
                >
                  <div
                    style={{
                      color: COLORS.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {image.title || image.file_name}
                  </div>

                  <div>{CATEGORY_LABELS[image.category] || image.category}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetadataRow({ label, value }) {
  if (!value) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: "0.75rem",
        padding: "7px 0",
        borderBottom: `1px solid ${COLORS.borderDark}`,
        fontFamily: "var(--font-body)",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <div style={{ color: COLORS.muted }}>{label}</div>
      <div style={{ color: COLORS.text }}>{value}</div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <aside
      className="portfolio-inspector"
      style={{
        position: "sticky",
        top: "calc(var(--nav-height) + 1rem)",
        alignSelf: "start",
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        padding: "1rem",
        minHeight: 420,
      }}
    >
      <div
        style={{
          color: COLORS.muted,
          fontFamily: "var(--font-body)",
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        Select an image from the gallery to edit its crop, category, featured
        status, and metadata.
      </div>
    </aside>
  );
}

function InspectorSidebar({ image, onChange, onSave, saving }) {
  if (!image) {
    return <EmptyInspector />;
  }

  const previewUrl = buildPublicUrl(
    image.display_path || image.thumbnail_path || image.original_path,
  );

  const set = (key, value) => onChange({ ...image, [key]: value });

  const x = image.object_position_x ?? 50;
  const y = image.object_position_y ?? 50;
  const zoom = Number(image.zoom || 1);
  const aspectRatio = image.aspect_ratio || "4 / 5";

  function resetCropControls() {
    onChange({
      ...image,
      object_position_x: 50,
      object_position_y: 50,
      zoom: 1,
    });
  }

  return (
    <aside
      className="portfolio-inspector"
      style={{
        position: "sticky",
        top: "calc(var(--nav-height) + 1rem)",
        alignSelf: "start",
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        height: "calc(100vh - var(--nav-height) - 2rem)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: "1rem",
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.surfaceDark,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <div
              style={{
                color: COLORS.gold,
                fontFamily: "var(--font-body)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Live Preview
            </div>

            <div
              style={{
                color: COLORS.text,
                fontFamily: "var(--font-heading)",
                fontSize: "1.05rem",
                lineHeight: 1.2,
              }}
            >
              {image.title || image.file_name}
            </div>
          </div>

          <div
            style={{
              color: image.is_visible ? COLORS.gold : COLORS.muted,
              border: `1px solid ${
                image.is_visible ? COLORS.gold : COLORS.border
              }`,
              padding: "5px 8px",
              fontFamily: "var(--font-body)",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {image.is_visible ? "Visible" : "Hidden"}
          </div>
        </div>

        <div
          style={{
            height: "clamp(190px, 24vh, 260px)",
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={previewUrl}
            alt={image.alt_text || image.title || image.file_name}
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${x}% ${y}%`,
              transform: `scale(${zoom})`,
              transition: "object-position 0.15s, transform 0.15s",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "0.65rem",
            color: COLORS.muted,
            fontFamily: "var(--font-body)",
            fontSize: 10,
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {image.original_path}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "1rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.borderDark}`,
              padding: "1rem",
              display: "grid",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-heading)",
                  color: COLORS.text,
                  fontSize: "1rem",
                  margin: 0,
                }}
              >
                Crop Controls
              </h3>

              <button
                type="button"
                onClick={resetCropControls}
                style={{
                  background: "transparent",
                  color: COLORS.muted,
                  border: `1px solid ${COLORS.border}`,
                  padding: "7px 10px",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Reset
              </button>
            </div>

            <RangeControl
              label="Zoom"
              min={1}
              max={2}
              step={0.01}
              value={zoom}
              displayValue={`${zoom.toFixed(2)}x`}
              onChange={(value) => set("zoom", value)}
            />

            <RangeControl
              label="Position X"
              min={0}
              max={100}
              step={1}
              value={x}
              displayValue={`${x}%`}
              onChange={(value) => set("object_position_x", value)}
            />

            <RangeControl
              label="Position Y"
              min={0}
              max={100}
              step={1}
              value={y}
              displayValue={`${y}%`}
              onChange={(value) => set("object_position_y", value)}
            />

            <div>
              <FieldLabel>Aspect Ratio</FieldLabel>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                }}
              >
                {[
                  ["1 / 1", "Square"],
                  ["3 / 4", "Portrait 3:4"],
                  ["4 / 5", "Portrait 4:5"],
                  ["16 / 9", "Wide"],
                ].map(([value, label]) => {
                  const active = aspectRatio === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("aspect_ratio", value)}
                      style={{
                        border: `1px solid ${
                          active ? COLORS.gold : COLORS.border
                        }`,
                        background: active ? COLORS.gold : "transparent",
                        color: active ? COLORS.bgDark : COLORS.muted,
                        padding: "9px 10px",
                        cursor: "pointer",
                        fontFamily: "var(--font-body)",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.borderDark}`,
              padding: "1rem",
              display: "grid",
              gap: "1rem",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                color: COLORS.text,
                fontSize: "1rem",
                margin: 0,
              }}
            >
              Image Details
            </h3>

            <TextInput
              label="Title"
              value={image.title || ""}
              onChange={(value) => set("title", value)}
            />

            <TextInput
              label="Alt Text"
              value={image.alt_text || ""}
              onChange={(value) => set("alt_text", value)}
            />

            <SelectInput
              label="Category"
              value={image.category}
              onChange={(value) => set("category", value)}
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </SelectInput>

            <TextInput
              label="Display Order"
              type="number"
              value={image.display_order || 0}
              onChange={(value) => set("display_order", value)}
            />

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <ToggleButton
                label="Visible"
                checked={!!image.is_visible}
                onChange={(value) => set("is_visible", value)}
              />

              <ToggleButton
                label="Featured"
                checked={!!image.featured}
                onChange={(value) => set("featured", value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSave(image)}
            disabled={saving}
            className="btn-primary"
            style={{
              width: "100%",
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Image Settings"}
          </button>

          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.borderDark}`,
              padding: "1rem",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1rem",
                color: COLORS.text,
                margin: "0 0 0.75rem",
              }}
            >
              Camera Metadata
            </h3>

            <MetadataRow label="Camera" value={image.camera_model} />
            <MetadataRow label="Make" value={image.camera_make} />
            <MetadataRow label="Lens" value={image.lens_model} />
            <MetadataRow label="Focal Length" value={image.focal_length} />
            <MetadataRow label="Aperture" value={image.aperture} />
            <MetadataRow label="Shutter" value={image.shutter_speed} />
            <MetadataRow label="ISO" value={image.iso} />
            <MetadataRow
              label="Taken"
              value={
                image.taken_at
                  ? new Date(image.taken_at).toLocaleString()
                  : null
              }
            />
            <MetadataRow
              label="GPS"
              value={
                image.gps_latitude && image.gps_longitude
                  ? `${image.gps_latitude}, ${image.gps_longitude}`
                  : null
              }
            />
          </div>

          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.borderDark}`,
              padding: "1rem",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1rem",
                color: COLORS.text,
                margin: "0 0 0.75rem",
              }}
            >
              File Info
            </h3>

            <MetadataRow
              label="Original"
              value={formatBytes(image.original_size_bytes)}
            />
            <MetadataRow
              label="Display"
              value={formatBytes(image.display_size_bytes)}
            />
            <MetadataRow
              label="Thumbnail"
              value={formatBytes(image.thumbnail_size_bytes)}
            />
            <MetadataRow label="Mime" value={image.mime_type} />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function PortfolioAdmin() {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [status, setStatus] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const filteredImages = useMemo(() => {
    if (filter === "all") return images;
    return images.filter((image) => image.category === filter);
  }, [filter, images]);

  const fetchImages = useCallback(async () => {
    const { data, error } = await supabase
      .from("portfolio_images")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setStatus(`Error loading portfolio: ${error.message}`);
      setImages([]);
      setLoading(false);
      return;
    }

    const nextImages = data || [];

    setImages(nextImages);
    setSelectedImage((current) => {
      if (!current) return nextImages[0] || null;
      return (
        nextImages.find((image) => image.id === current.id) ||
        nextImages[0] ||
        null
      );
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  function handleSelect(image) {
    setSelectedImage(image);
  }

  function handleLocalChange(nextImage) {
    setSelectedImage(nextImage);
    setImages((previousImages) =>
      previousImages.map((image) =>
        image.id === nextImage.id ? nextImage : image,
      ),
    );
  }

  async function saveImage(image) {
    setSavingId(image.id);
    setStatus("");

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

    const { error } = await supabase
      .from("portfolio_images")
      .update(payload)
      .eq("id", image.id);

    setSavingId(null);

    if (error) {
      setStatus(`Save error: ${error.message}`);
      return;
    }

    setStatus(`Saved ${image.title || image.file_name}.`);
    await fetchImages();
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <AdminNav onSignOut={handleSignOut} />

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={fetchImages}
      />

      <main style={{ padding: "2rem var(--page-x)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "2rem",
                color: COLORS.text,
                margin: 0,
              }}
            >
              Portfolio Manager
            </h1>

            <p
              style={{
                fontFamily: "var(--font-body)",
                color: COLORS.muted,
                fontSize: "0.9rem",
                lineHeight: 1.7,
                maxWidth: 680,
                margin: "0.6rem 0 0",
              }}
            >
              Upload originals, generate optimized display images and
              thumbnails, then manage crop, visibility, featured status, and
              camera metadata.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="btn-primary"
            >
              Upload Images
            </button>

            <button
              type="button"
              onClick={fetchImages}
              className="btn-secondary"
            >
              Refresh
            </button>
          </div>
        </div>

        {status && (
          <div
            style={{
              marginBottom: "1rem",
              color: status.toLowerCase().includes("error")
                ? COLORS.danger
                : COLORS.gold,
              fontFamily: "var(--font-body)",
              fontSize: 13,
            }}
          >
            {status}
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : (
          <div
            className="portfolio-manager-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(380px, 460px)",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            <section
              style={{
                background: COLORS.surfaceDark,
                border: `1px solid ${COLORS.border}`,
                padding: "1rem",
                minHeight: 540,
              }}
            >
              <PortfolioGallery
                images={filteredImages}
                selectedId={selectedImage?.id}
                onSelect={handleSelect}
                filter={filter}
                onFilterChange={setFilter}
              />
            </section>

            <InspectorSidebar
              image={selectedImage}
              onChange={handleLocalChange}
              onSave={saveImage}
              saving={savingId === selectedImage?.id}
            />
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 980px) {
          .portfolio-manager-layout {
            grid-template-columns: 1fr !important;
          }

          .portfolio-inspector {
            position: static !important;
            height: auto !important;
            max-height: none !important;
          }
        }

        @media (max-width: 720px) {
          .portfolio-manager-layout {
            gap: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}
