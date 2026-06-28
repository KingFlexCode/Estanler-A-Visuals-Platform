import { useCallback, useEffect, useMemo, useState } from "react";
import exifr from "exifr";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../../components/UI";
import { BASE, CATEGORY_LABELS, COLORS } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { AdminNav } from "./Dashboard";

const PORTFOLIO_BUCKET = "Portfolio";

const ADMIN_CATEGORY_LABELS = {
  ...CATEGORY_LABELS,
  unlisted: "Unlisted",
};

const STORAGE_CATEGORY_MAP = {
  birthday: "birthdays",
  engagement: "engagements",
  landscape: "landscapes",
  lifestyle: "lifestyle",
  portrait: "portraits",
  things: "things",
  wedding: "weddings",
  unlisted: "unlisted",
};

const DEFAULT_CATEGORY = "portrait";

const ASPECT_RATIO_OPTIONS = [
  ["1 / 1", "Square"],
  ["3 / 4", "Portrait 3:4"],
  ["4 / 5", "Portrait 4:5"],
  ["16 / 9", "Wide"],
];

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

function getFileNameFromPath(path, fallback = "download") {
  if (!path) return fallback;

  const fileName = path.split("/").pop() || fallback;

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
}

function getDownloadFileName(image, version, path) {
  const pathFileName = getFileNameFromPath(path, "");

  if (version === "display") {
    return `${sanitizeFileName(image.title || image.file_name || "portfolio-image")}-display.webp`;
  }

  return (
    pathFileName ||
    image.file_name ||
    `${sanitizeFileName(image.title || "portfolio-image")}-original.jpg`
  );
}

async function downloadStorageFile(path, fileName) {
  const url = buildPublicUrl(path);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName || getFileNameFromPath(path);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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

function sanitizeJsonForPostgres(value, depth = 0) {
  if (depth > 5) return null;
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return value
      .replace(/\u0000/g, "")
      .replace(/\uD800[\s\S]?|[\uDC00-\uDFFF]/g, "")
      .trim();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") return value;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeJsonForPostgres(item, depth + 1))
      .filter((item) => item !== null && item !== undefined);
  }

  if (typeof value === "object") {
    const clean = {};

    for (const [key, item] of Object.entries(value)) {
      const cleanKey = String(key).replace(/\u0000/g, "");
      const cleanValue = sanitizeJsonForPostgres(item, depth + 1);

      if (cleanKey && cleanValue !== null && cleanValue !== undefined) {
        clean[cleanKey] = cleanValue;
      }
    }

    return clean;
  }

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

async function getFileSha256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
      exif_raw: sanitizeJsonForPostgres(data),
    };
  } catch (error) {
    console.warn("Could not read EXIF metadata:", error);
    return {};
  }
}

function getPreviewUrl(image) {
  return buildPublicUrl(
    image?.display_path || image?.thumbnail_path || image?.original_path,
  );
}

function FieldLabel({ children }) {
  return (
    <span
      style={{
        display: "block",
        marginBottom: 6,
        fontFamily: "var(--font-body)",
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
            type === "number" ? Number(event.target.value) : event.target.value,
          )
        }
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
        fontWeight: 800,
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
            fontWeight: 800,
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

function PanelCard({ title, children }) {
  return (
    <section
      style={{
        background: COLORS.bg,
        border: `1px solid ${COLORS.borderDark}`,
        padding: "1rem",
        display: "grid",
        gap: "1rem",
      }}
    >
      {title && (
        <h3
          style={{
            fontFamily: "var(--font-heading)",
            color: COLORS.text,
            fontSize: "1rem",
            margin: 0,
          }}
        >
          {title}
        </h3>
      )}

      {children}
    </section>
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

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function isFinalUploadStatus(status) {
  return status === "done" || status === "skipped" || status === "failed";
}

function UploadModal({ open, onClose, onUploaded }) {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [status, setStatus] = useState("");
  const [queue, setQueue] = useState([]);
  const [uploadStartedAt, setUploadStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [renameMode, setRenameMode] = useState("original");
  const [batchBase, setBatchBase] = useState("estanler-visuals");
  const [includeDate, setIncludeDate] = useState(false);
  const [datePosition, setDatePosition] = useState("prefix");
  const [startingNumber, setStartingNumber] = useState(1);
  const [numberPadding, setNumberPadding] = useState(3);
  const [separator, setSeparator] = useState("-");

  useEffect(() => {
    if (!open) return;

    setFiles([]);
    setUploading(false);
    setUploadComplete(false);
    setStatus("");
    setQueue([]);
    setUploadStartedAt(null);
    setElapsedSeconds(0);
  }, [open]);

  useEffect(() => {
    if (!uploading || !uploadStartedAt) return undefined;

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - uploadStartedAt) / 1000));
    }, 500);

    return () => window.clearInterval(timer);
  }, [uploading, uploadStartedAt]);

  const totalProgress = queue.length
    ? Math.round(
        queue.reduce((total, item) => total + (item.progress || 0), 0) /
          queue.length,
      )
    : 0;
  const completedCount = queue.filter((item) =>
    isFinalUploadStatus(item.status),
  ).length;
  const activeQueueItem =
    queue.find(
      (item) =>
        uploading &&
        !isFinalUploadStatus(item.status) &&
        item.status !== "ready",
    ) || null;
  const estimatedRemainingSeconds =
    uploading && totalProgress > 5
      ? Math.max(
          0,
          Math.round((elapsedSeconds * (100 - totalProgress)) / totalProgress),
        )
      : null;

  if (!open) return null;

  function updateQueueItem(index, patch) {
    setQueue((previousQueue) =>
      previousQueue.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function handleFileSelection(nextFiles) {
    const imageFiles = Array.from(nextFiles).filter((file) =>
      file.type.startsWith("image/"),
    );

    setFiles(imageFiles);
    setUploadComplete(false);
    setStatus(
      imageFiles.length
        ? `${imageFiles.length} image${
            imageFiles.length === 1 ? "" : "s"
          } ready.`
        : "Choose at least one image file.",
    );

    setQueue(
      imageFiles.map((file) => ({
        name: file.name,
        status: "ready",
        message: "Ready",
        progress: 0,
      })),
    );
  }

  async function checkDuplicate(fileSha) {
    const { data, error } = await supabase
      .from("portfolio_images")
      .select("id, title, file_name")
      .eq("original_sha256", fileSha)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function uploadOneFile(file, selectedCategory, index) {
    updateQueueItem(index, {
      status: "hashing",
      message: "Checking duplicate",
      progress: 6,
    });
    const originalSha256 = await getFileSha256(file);
    const duplicate = await checkDuplicate(originalSha256);

    if (duplicate) {
      return {
        name: file.name,
        status: "skipped",
        message: `Duplicate skipped: ${duplicate.title || duplicate.file_name}`,
        progress: 100,
      };
    }

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
      updateQueueItem(index, {
        status: "processing",
        message: "Reading image",
        progress: 15,
      });

      const originalDimensions = await getImageDimensionsFromUrl(originalUrl);

      updateQueueItem(index, {
        status: "processing",
        message: "Creating display + thumbnail",
        progress: 28,
      });

      const [exif, displayImage, thumbnailImage] = await Promise.all([
        readExif(file),
        resizeImage(file, 2200, 0.84),
        resizeImage(file, 720, 0.78),
      ]);

      updateQueueItem(index, {
        status: "uploading",
        message: "Uploading original",
        progress: 42,
      });

      const originalUpload = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .upload(originalPath, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type,
        });

      if (originalUpload.error) throw originalUpload.error;

      updateQueueItem(index, {
        status: "uploading",
        message: "Uploading display",
        progress: 60,
      });

      const displayUpload = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .upload(displayPath, displayImage.blob, {
          cacheControl: "31536000",
          upsert: false,
          contentType: "image/webp",
        });

      if (displayUpload.error) throw displayUpload.error;

      updateQueueItem(index, {
        status: "uploading",
        message: "Uploading thumbnail",
        progress: 76,
      });

      const thumbnailUpload = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .upload(thumbnailPath, thumbnailImage.blob, {
          cacheControl: "31536000",
          upsert: false,
          contentType: "image/webp",
        });

      if (thumbnailUpload.error) throw thumbnailUpload.error;

      updateQueueItem(index, {
        status: "saving",
        message: "Saving metadata",
        progress: 92,
      });

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
          original_sha256: originalSha256,
          title,
          alt_text: title,
          aspect_ratio: selectedCategory === "landscape" ? "16 / 9" : "4 / 5",
          object_position_x: 50,
          object_position_y: 15,
          zoom: 1,
          featured: false,
          is_visible: selectedCategory !== "unlisted",
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
        progress: 100,
      };
    } finally {
      URL.revokeObjectURL(originalUrl);
    }
  }

  async function startUpload() {
    if (uploading || uploadComplete) return;

    if (files.length === 0) {
      setStatus("Choose at least one image file.");
      return;
    }

    const startedAt = Date.now();

    setUploading(true);
    setUploadStartedAt(startedAt);
    setElapsedSeconds(0);
    setStatus(
      `Uploading ${files.length} image${files.length === 1 ? "" : "s"}...`,
    );

    const results = [];

    for (const [index, file] of files.entries()) {
      updateQueueItem(index, {
        status: "uploading",
        message: "Starting",
        progress: 2,
      });

      try {
        const result = await uploadOneFile(file, category, index);
        results.push(result);
        updateQueueItem(index, result);
      } catch (error) {
        console.error(error);

        const failedResult = {
          name: file.name,
          status: "failed",
          message: error.message || "Upload failed",
          progress: 100,
        };

        results.push(failedResult);
        updateQueueItem(index, failedResult);
      }
    }

    const successful = results.filter((item) => item.status === "done").length;
    const skipped = results.filter((item) => item.status === "skipped").length;
    const failed = results.filter((item) => item.status === "failed").length;

    setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    setUploadStartedAt(null);
    setUploading(false);
    setUploadComplete(failed === 0);
    setFiles([]);

    if (failed === 0) {
      setStatus(
        `Done. Uploaded ${successful}. Skipped duplicates ${skipped}. Closing...`,
      );
      await onUploaded();

      window.setTimeout(() => {
        onClose();
      }, 900);

      return;
    }

    setStatus(
      `Uploaded ${successful}. Skipped ${skipped}. Failed ${failed}. Close and reopen Upload Images to start a fresh upload.`,
    );
    await onUploaded();
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
          width: "min(900px, 100%)",
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
              Create originals, display images, thumbnails, duplicate checks,
              and metadata.
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
            {Object.entries(ADMIN_CATEGORY_LABELS).map(([key, label]) => (
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

          <PanelCard title="Rename Options">
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
          </PanelCard>

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
            <div
              style={{
                border: `1px solid ${COLORS.border}`,
                background: COLORS.surface,
                padding: "1rem",
                display: "grid",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                  fontFamily: "var(--font-body)",
                }}
              >
                <div>
                  <div
                    style={{
                      color: COLORS.text,
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Upload Progress
                  </div>
                  <div
                    style={{
                      color: COLORS.muted,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {completedCount} of {queue.length} complete
                    {activeQueueItem
                      ? ` · Current: ${activeQueueItem.name} — ${activeQueueItem.message}`
                      : ""}
                  </div>
                </div>

                <div
                  style={{
                    color: COLORS.gold,
                    fontSize: 18,
                    fontWeight: 800,
                    minWidth: 70,
                    textAlign: "right",
                  }}
                >
                  {totalProgress}%
                </div>
              </div>

              <div
                style={{
                  height: 12,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.bg,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${totalProgress}%`,
                    height: "100%",
                    background: COLORS.gold,
                    transition: "width 260ms ease",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                  color: COLORS.muted,
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                }}
              >
                <span>Elapsed: {formatDuration(elapsedSeconds)}</span>
                <span>
                  Estimated remaining:{" "}
                  {estimatedRemainingSeconds === null
                    ? uploading
                      ? "calculating..."
                      : "0s"
                    : formatDuration(estimatedRemainingSeconds)}
                </span>
              </div>

              <div style={{ display: "grid", gap: "6px" }}>
                {queue.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr minmax(90px, auto)",
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
                    <span style={{ textAlign: "right" }}>{item.message}</span>
                  </div>
                ))}
              </div>
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
              disabled={uploading || uploadComplete || files.length === 0}
              className="btn-primary"
              style={{
                opacity:
                  uploading || uploadComplete || files.length === 0 ? 0.65 : 1,
                cursor:
                  uploading || uploadComplete || files.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {uploading
                ? "Uploading..."
                : uploadComplete
                  ? "Done"
                  : "Start Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlPanel({ image, onChange, onSave, onDelete, saving, deleting }) {
  if (!image) {
    return (
      <aside
        className="portfolio-left-panel"
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
          Select an image to edit settings, crop, visibility, category, and
          metadata.
        </div>
      </aside>
    );
  }

  const set = (key, value) => onChange({ ...image, [key]: value });

  const x = image.object_position_x ?? 50;
  const y = image.object_position_y ?? 15;
  const zoom = Number(image.zoom || 1);
  const aspectRatio = image.aspect_ratio || "4 / 5";

  function resetCropControls() {
    onChange({
      ...image,
      object_position_x: 50,
      object_position_y: 15,
      zoom: 1,
    });
  }

  return (
    <aside
      className="portfolio-left-panel"
      style={{
        position: "sticky",
        top: "calc(var(--nav-height) + 1rem)",
        alignSelf: "start",
        height: "calc(100vh - var(--nav-height) - 2rem)",
        overflowY: "auto",
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        padding: "1rem",
      }}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <PanelCard title="Crop Controls">
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
              {ASPECT_RATIO_OPTIONS.map(([value, label]) => {
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

          <button
            type="button"
            onClick={resetCropControls}
            className="btn-secondary"
            style={{ width: "100%" }}
          >
            Reset Crop
          </button>
        </PanelCard>

        <PanelCard title="Image Details">
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
            {Object.entries(ADMIN_CATEGORY_LABELS).map(([key, label]) => (
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
        </PanelCard>

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

        <button
          type="button"
          onClick={() => onDelete(image)}
          disabled={deleting}
          style={{
            width: "100%",
            background: "transparent",
            color: COLORS.danger,
            border: `1px solid ${COLORS.danger}`,
            padding: "13px 18px",
            cursor: deleting ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: deleting ? 0.7 : 1,
          }}
        >
          {deleting ? "Deleting..." : "Delete Image"}
        </button>
      </div>
    </aside>
  );
}

function PreviewPanel({ image }) {
  if (!image) {
    return (
      <aside
        className="portfolio-preview-panel"
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
          Select an image to preview crop changes and review camera metadata.
        </div>
      </aside>
    );
  }

  const previewUrl = getPreviewUrl(image);
  const x = image.object_position_x ?? 50;
  const y = image.object_position_y ?? 15;
  const zoom = Number(image.zoom || 1);

  return (
    <aside
      className="portfolio-preview-panel"
      style={{
        position: "sticky",
        top: "calc(var(--nav-height) + 1rem)",
        alignSelf: "start",
        height: "calc(100vh - var(--nav-height) - 2rem)",
        overflowY: "auto",
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        padding: "1rem",
      }}
    >
      <div
        style={{
          color: COLORS.gold,
          fontFamily: "var(--font-body)",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Live Preview
      </div>

      <h3
        style={{
          color: COLORS.text,
          fontFamily: "var(--font-heading)",
          fontSize: "1.1rem",
          lineHeight: 1.25,
          margin: "0 0 1rem",
        }}
      >
        {image.title || image.file_name}
      </h3>

      <div
        style={{
          aspectRatio: image.aspect_ratio || "4 / 5",
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          overflow: "hidden",
          marginBottom: "0.75rem",
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
          color: COLORS.muted,
          fontFamily: "var(--font-body)",
          fontSize: 11,
          lineHeight: 1.4,
          wordBreak: "break-word",
          marginBottom: "1rem",
        }}
      >
        {image.original_path}
      </div>

      <PanelCard title="Camera Metadata">
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
            image.taken_at ? new Date(image.taken_at).toLocaleString() : null
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
      </PanelCard>

      <div style={{ height: "1rem" }} />

      <PanelCard title="File Info">
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
        <MetadataRow label="SHA-256" value={image.original_sha256} />
      </PanelCard>
    </aside>
  );
}

function PortfolioGallery({
  images,
  selectedId,
  selectedIds,
  onSelect,
  onToggleSelected,
  onSelectAllVisible,
  onClearSelection,
  onBulkDelete,
  onContextMenuImage,
  filter,
  onFilterChange,
  bulkDeleting,
}) {
  const selectedCount = selectedIds.size;

  return (
    <section
      style={{
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        padding: "1rem",
        minHeight: 540,
      }}
    >
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
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          All
        </button>

        {Object.entries(ADMIN_CATEGORY_LABELS).map(([key, label]) => (
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
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
          padding: "0.75rem",
          border: `1px solid ${COLORS.borderDark}`,
          background: COLORS.bg,
        }}
      >
        <div
          style={{
            color: selectedCount ? COLORS.gold : COLORS.muted,
            fontFamily: "var(--font-body)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {selectedCount
            ? `${selectedCount} selected`
            : "Select images for bulk actions"}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onSelectAllVisible}
            disabled={images.length === 0}
            className="btn-secondary"
            style={{
              opacity: images.length === 0 ? 0.55 : 1,
              cursor: images.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Select Visible
          </button>

          <button
            type="button"
            onClick={onClearSelection}
            disabled={selectedCount === 0}
            className="btn-secondary"
            style={{
              opacity: selectedCount === 0 ? 0.55 : 1,
              cursor: selectedCount === 0 ? "not-allowed" : "pointer",
            }}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={onBulkDelete}
            disabled={selectedCount === 0 || bulkDeleting}
            style={{
              background: "transparent",
              color: COLORS.danger,
              border: `1px solid ${COLORS.danger}`,
              padding: "11px 14px",
              cursor:
                selectedCount === 0 || bulkDeleting ? "not-allowed" : "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: selectedCount === 0 || bulkDeleting ? 0.55 : 1,
            }}
          >
            {bulkDeleting ? "Deleting..." : "Delete Selected"}
          </button>
        </div>
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
          {images.map((image, index) => {
            const isActive = image.id === selectedId;
            const isChecked = selectedIds.has(image.id);
            const previewUrl = buildPublicUrl(
              image.thumbnail_path || image.display_path || image.original_path,
            );

            return (
              <button
                key={image.id}
                type="button"
                onClick={(event) => onSelect(image, event, index)}
                onContextMenu={(event) => onContextMenuImage(event, image)}
                style={{
                  display: "block",
                  position: "relative",
                  padding: 0,
                  border: `2px solid ${
                    isChecked || isActive ? COLORS.gold : "transparent"
                  }`,
                  background: COLORS.surfaceDark,
                  cursor: "pointer",
                  textAlign: "left",
                  overflow: "hidden",
                  boxShadow: isChecked
                    ? "0 0 0 2px rgba(255,177,98,0.18)"
                    : "none",
                }}
              >
                <label
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: 7,
                    left: 7,
                    zIndex: 2,
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(17,26,36,0.86)",
                    border: `1px solid ${isChecked ? COLORS.gold : COLORS.border}`,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) => onToggleSelected(image.id, event)}
                    style={{ accentColor: COLORS.gold, cursor: "pointer" }}
                  />
                </label>

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
                        image.object_position_y ?? 15
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

                  <div>
                    {ADMIN_CATEGORY_LABELS[image.category] || image.category}
                  </div>

                  {image.category === "unlisted" && (
                    <div style={{ color: COLORS.gold, marginTop: 3 }}>
                      Admin only
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RenameModal({ image, saving, onClose, onSave }) {
  const [title, setTitle] = useState(image?.title || image?.file_name || "");

  useEffect(() => {
    setTitle(image?.title || image?.file_name || "");
  }, [image]);

  if (!image) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
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
          width: "min(520px, 100%)",
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: COLORS.text,
              fontFamily: "var(--font-heading)",
              fontSize: "1.25rem",
            }}
          >
            Rename Image
          </h2>

          <p
            style={{
              margin: "0.45rem 0 0",
              color: COLORS.muted,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            This changes the image title in the database. It does not rename the
            storage files.
          </p>
        </div>

        <div style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <label style={{ display: "block" }}>
            <FieldLabel>Image Title</FieldLabel>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSave(image, title);
                if (event.key === "Escape") onClose();
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: COLORS.bg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                padding: "12px",
                outline: "none",
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            />
          </label>

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
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onSave(image, title)}
              disabled={saving}
              className="btn-primary"
              style={{
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Save Rename"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ images, deleting, onClose, onConfirm }) {
  if (!images?.length) return null;

  const count = images.length;
  const firstImage = images[0];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(17, 26, 36, 0.88)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.danger}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.42)",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: COLORS.danger,
              fontFamily: "var(--font-heading)",
              fontSize: "1.25rem",
            }}
          >
            {count === 1 ? "Delete Image?" : `Delete ${count} Images?`}
          </h2>

          <p
            style={{
              margin: "0.45rem 0 0",
              color: COLORS.muted,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            This permanently removes the original file, display file, thumbnail
            file, and metadata row. This cannot be undone.
          </p>
        </div>

        <div style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div
            style={{
              background: COLORS.bg,
              border: `1px solid ${COLORS.borderDark}`,
              padding: "1rem",
              color: COLORS.text,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {count === 1 ? (
              <strong>{firstImage.title || firstImage.file_name}</strong>
            ) : (
              <>
                <strong>{count} selected images</strong>
                <div style={{ marginTop: "0.75rem", color: COLORS.muted }}>
                  {images.slice(0, 5).map((image) => (
                    <div key={image.id}>• {image.title || image.file_name}</div>
                  ))}
                  {count > 5 && <div>• and {count - 5} more...</div>}
                </div>
              </>
            )}
          </div>

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
              disabled={deleting}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onConfirm(images)}
              disabled={deleting}
              style={{
                background: COLORS.danger,
                color: COLORS.text,
                border: `1px solid ${COLORS.danger}`,
                padding: "13px 18px",
                cursor: deleting ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting
                ? "Deleting..."
                : count === 1
                  ? "Delete Image"
                  : "Delete Selected"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchCategoryModal({ images, saving, onClose, onSave }) {
  const [category, setCategory] = useState(
    images?.[0]?.category || DEFAULT_CATEGORY,
  );

  useEffect(() => {
    setCategory(images?.[0]?.category || DEFAULT_CATEGORY);
  }, [images]);

  if (!images?.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
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
          width: "min(520px, 100%)",
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: COLORS.text,
              fontFamily: "var(--font-heading)",
              fontSize: "1.25rem",
            }}
          >
            Change Category
          </h2>
          <p
            style={{
              margin: "0.45rem 0 0",
              color: COLORS.muted,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            This will update {images.length} selected image
            {images.length === 1 ? "" : "s"} at once.
          </p>
        </div>

        <div style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div>
            <FieldLabel>New Category</FieldLabel>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: COLORS.bg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                padding: "12px",
                outline: "none",
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              {Object.entries(ADMIN_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

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
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(images, category)}
              disabled={saving}
              className="btn-primary"
              style={{
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Apply Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchAspectRatioModal({ images, saving, onClose, onSave }) {
  const [aspectRatio, setAspectRatio] = useState(
    images?.[0]?.aspect_ratio || "4 / 5",
  );

  useEffect(() => {
    setAspectRatio(images?.[0]?.aspect_ratio || "4 / 5");
  }, [images]);

  if (!images?.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
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
          width: "min(560px, 100%)",
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: COLORS.text,
              fontFamily: "var(--font-heading)",
              fontSize: "1.25rem",
            }}
          >
            Change Aspect Ratio
          </h2>
          <p
            style={{
              margin: "0.45rem 0 0",
              color: COLORS.muted,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            This changes the crop frame for {images.length} selected image
            {images.length === 1 ? "" : "s"}. It does not alter the stored
            files.
          </p>
        </div>

        <div style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
            }}
          >
            {ASPECT_RATIO_OPTIONS.map(([value, label]) => {
              const active = aspectRatio === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAspectRatio(value)}
                  style={{
                    border: `1px solid ${active ? COLORS.gold : COLORS.border}`,
                    background: active ? COLORS.gold : "transparent",
                    color: active ? COLORS.bgDark : COLORS.muted,
                    padding: "11px 12px",
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
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(images, aspectRatio)}
              disabled={saving}
              className="btn-primary"
              style={{
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Apply Aspect Ratio"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchRenameModal({ images, saving, onClose, onSave }) {
  const [baseTitle, setBaseTitle] = useState("Portfolio Image");
  const [startNumber, setStartNumber] = useState(1);
  const [padding, setPadding] = useState(3);
  const [separator, setSeparator] = useState("_");

  useEffect(() => {
    setBaseTitle("Portfolio Image");
    setStartNumber(1);
    setPadding(3);
    setSeparator("_");
  }, [images]);

  if (!images?.length) return null;

  const previewNumber = String(Number(startNumber) || 1).padStart(
    Number(padding) || 3,
    "0",
  );
  const previewTitle = `${baseTitle.trim() || "Portfolio Image"}${separator || "_"}${previewNumber}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
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
          width: "min(620px, 100%)",
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: COLORS.text,
              fontFamily: "var(--font-heading)",
              fontSize: "1.25rem",
            }}
          >
            Batch Rename Titles
          </h2>
          <p
            style={{
              margin: "0.45rem 0 0",
              color: COLORS.muted,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            This updates database titles for {images.length} selected image
            {images.length === 1 ? "" : "s"}. Storage file names stay the same.
          </p>
        </div>

        <div style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <label style={{ display: "block" }}>
            <FieldLabel>Base Title</FieldLabel>
            <input
              autoFocus
              value={baseTitle}
              onChange={(event) => setBaseTitle(event.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: COLORS.bg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                padding: "12px",
                outline: "none",
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            />
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.75rem",
            }}
          >
            <label style={{ display: "block" }}>
              <FieldLabel>Start Number</FieldLabel>
              <input
                type="number"
                min="1"
                value={startNumber}
                onChange={(event) => setStartNumber(event.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: COLORS.bg,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  padding: "12px",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                }}
              />
            </label>

            <label style={{ display: "block" }}>
              <FieldLabel>Padding</FieldLabel>
              <input
                type="number"
                min="1"
                max="6"
                value={padding}
                onChange={(event) => setPadding(event.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: COLORS.bg,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  padding: "12px",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                }}
              />
            </label>

            <label style={{ display: "block" }}>
              <FieldLabel>Separator</FieldLabel>
              <input
                value={separator}
                onChange={(event) => setSeparator(event.target.value)}
                maxLength={4}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: COLORS.bg,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  padding: "12px",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                }}
              />
            </label>
          </div>

          <div
            style={{
              color: COLORS.gold,
              fontFamily: "var(--font-body)",
              fontSize: 12,
            }}
          >
            Preview: {previewTitle}
          </div>

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
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                onSave(images, {
                  baseTitle,
                  startNumber: Number(startNumber) || 1,
                  padding: Number(padding) || 3,
                  separator: separator || "_",
                })
              }
              disabled={saving}
              className="btn-primary"
              style={{
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Renaming..." : "Apply Rename"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextMenu({
  menu,
  selectedIds,
  onClose,
  onToggleSelected,
  onRename,
  onBatchRename,
  onDownload,
  onBatchDownload,
  onChangeCategory,
  onChangeAspectRatio,
  onDelete,
}) {
  useEffect(() => {
    function close() {
      onClose();
    }

    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [onClose]);

  if (!menu?.image) return null;

  const targetImages = menu.images?.length ? menu.images : [menu.image];
  const isBatch = targetImages.length > 1;
  const isSelected = selectedIds.has(menu.image.id);

  const itemStyle = {
    width: "100%",
    background: "transparent",
    border: "none",
    color: COLORS.text,
    padding: "10px 12px",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    fontSize: 12,
  };

  const label = isBatch
    ? `${targetImages.length} selected images`
    : menu.image.title || menu.image.file_name || "Selected image";

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        left: menu.x,
        top: menu.y,
        zIndex: 500,
        width: isBatch ? 250 : 230,
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 18px 50px rgba(0,0,0,0.34)",
        padding: "0.35rem",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          color: COLORS.gold,
          fontFamily: "var(--font-body)",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          borderBottom: `1px solid ${COLORS.border}`,
          marginBottom: "0.25rem",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>

      {!isBatch && (
        <button
          type="button"
          style={itemStyle}
          onClick={() => onToggleSelected(menu.image.id)}
        >
          {isSelected ? "Deselect image" : "Select image"}
        </button>
      )}

      <button
        type="button"
        style={itemStyle}
        onClick={() =>
          isBatch ? onBatchRename(targetImages) : onRename(menu.image)
        }
      >
        {isBatch ? "Batch rename titles" : "Rename title"}
      </button>

      <button
        type="button"
        style={itemStyle}
        onClick={() => onChangeCategory(targetImages)}
      >
        Change category
      </button>

      <button
        type="button"
        style={itemStyle}
        onClick={() => onChangeAspectRatio(targetImages)}
      >
        Change aspect ratio
      </button>

      <div
        style={{ height: 1, background: COLORS.border, margin: "0.25rem 0" }}
      />

      <button
        type="button"
        style={itemStyle}
        onClick={() =>
          isBatch
            ? onBatchDownload(targetImages, "display")
            : onDownload(menu.image, "display")
        }
      >
        {isBatch ? "Download display files" : "Download display image"}
      </button>

      <button
        type="button"
        style={itemStyle}
        onClick={() =>
          isBatch
            ? onBatchDownload(targetImages, "original")
            : onDownload(menu.image, "original")
        }
      >
        {isBatch ? "Download original files" : "Download original image"}
      </button>

      <div
        style={{ height: 1, background: COLORS.border, margin: "0.25rem 0" }}
      />

      <button
        type="button"
        style={{ ...itemStyle, color: COLORS.danger }}
        onClick={() => onDelete(targetImages)}
      >
        {isBatch ? "Delete selected images" : "Delete image"}
      </button>
    </div>
  );
}

function FeaturedArrangerModal({ open, images, onClose, onSaved }) {
  const [ordered, setOrdered] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const sorted = [...images].sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.featured_order))
        ? Number(a.featured_order)
        : Number(a.display_order || 0);
      const bOrder = Number.isFinite(Number(b.featured_order))
        ? Number(b.featured_order)
        : Number(b.display_order || 0);

      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    setOrdered(sorted);
    setDraggedId(null);
    setError("");
  }, [open, images]);

  if (!open) return null;

  function moveItem(targetId) {
    if (!draggedId || draggedId === targetId) return;

    setOrdered((current) => {
      const fromIndex = current.findIndex((image) => image.id === draggedId);
      const toIndex = current.findIndex((image) => image.id === targetId);

      if (fromIndex === -1 || toIndex === -1) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function saveFeaturedOrder() {
    setSaving(true);
    setError("");

    try {
      for (let index = 0; index < ordered.length; index += 1) {
        const image = ordered[index];
        const { error: updateError } = await supabase
          .from("portfolio_images")
          .update({ featured_order: index })
          .eq("id", image.id);

        if (updateError) throw updateError;
      }

      setSaving(false);
      onSaved?.(
        `Featured Work order saved for ${ordered.length} image${ordered.length === 1 ? "" : "s"}.`,
      );
      onClose();
    } catch (saveError) {
      console.error(saveError);
      setSaving(false);
      setError(saveError.message || "Could not save Featured Work order.");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 360,
        background: "rgba(17, 26, 36, 0.9)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "min(1080px, 100%)",
          maxHeight: "90vh",
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-heading)",
                fontSize: "1.45rem",
                color: COLORS.text,
              }}
            >
              Featured Work Arranger
            </h2>

            <p
              style={{
                margin: "0.45rem 0 0",
                maxWidth: 720,
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: COLORS.muted,
                lineHeight: 1.6,
              }}
            >
              Drag and drop the images into the exact row order used on the Home
              page. The order reads left to right, then continues on the next
              row. Only images marked Featured are shown here.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
              cursor: saving ? "not-allowed" : "pointer",
              padding: "8px 12px",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.9rem 1.25rem 0",
              color: COLORS.danger,
              fontFamily: "var(--font-body)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            padding: "1.25rem",
            overflowY: "auto",
          }}
        >
          {ordered.length === 0 ? (
            <div
              style={{
                border: `1px dashed ${COLORS.border}`,
                color: COLORS.muted,
                fontFamily: "var(--font-body)",
                fontSize: 13,
                padding: "3rem 1rem",
                textAlign: "center",
              }}
            >
              No Featured images yet. Mark images as Featured in the Portfolio
              Manager first.
            </div>
          ) : (
            <div
              className="featured-arranger-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 0,
              }}
            >
              {ordered.map((image, index) => {
                const dragging = draggedId === image.id;

                return (
                  <article
                    key={image.id}
                    draggable={!saving}
                    onDragStart={() => setDraggedId(image.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      moveItem(image.id);
                    }}
                    style={{
                      border: `1px solid ${dragging ? COLORS.gold : COLORS.border}`,
                      background: COLORS.bg,
                      opacity: dragging ? 0.45 : 1,
                      cursor: saving ? "not-allowed" : "grab",
                      overflow: "hidden",
                      transition: "border-color 0.2s ease, opacity 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: image.aspect_ratio || "4 / 5",
                        background: COLORS.surface,
                      }}
                    >
                      <img
                        src={getPreviewUrl(image)}
                        alt={image.alt_text || image.title || image.file_name}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: `${image.object_position_x ?? 50}% ${image.object_position_y ?? 15}%`,
                          transform: `scale(${Number(image.zoom || 1)})`,
                          display: "block",
                          pointerEvents: "none",
                        }}
                      />
                    </div>

                    <div style={{ padding: "0.7rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          alignItems: "center",
                          marginBottom: "0.35rem",
                        }}
                      >
                        <span
                          style={{
                            color: COLORS.gold,
                            fontFamily: "var(--font-body)",
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: "0.13em",
                            textTransform: "uppercase",
                          }}
                        >
                          #{index + 1}
                        </span>

                        <span
                          aria-hidden="true"
                          style={{ color: COLORS.muted, fontSize: 14 }}
                        >
                          ☰
                        </span>
                      </div>

                      <div
                        style={{
                          color: COLORS.text,
                          fontFamily: "var(--font-body)",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {image.title || image.file_name}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={saveFeaturedOrder}
            disabled={saving || ordered.length === 0}
            className="btn-primary"
            style={{
              opacity: saving || ordered.length === 0 ? 0.65 : 1,
              cursor:
                saving || ordered.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving Order..." : "Save Featured Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PortfolioAdmin() {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [batchRenameTargetImages, setBatchRenameTargetImages] = useState([]);
  const [categoryTargetImages, setCategoryTargetImages] = useState([]);
  const [aspectTargetImages, setAspectTargetImages] = useState([]);
  const [renamingId, setRenamingId] = useState(null);
  const [batchActionSaving, setBatchActionSaving] = useState(false);
  const [deleteTargetImages, setDeleteTargetImages] = useState([]);
  const [status, setStatus] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [featuredArrangerOpen, setFeaturedArrangerOpen] = useState(false);

  const filteredImages = useMemo(() => {
    if (filter === "all") return images;
    return images.filter((image) => image.category === filter);
  }, [filter, images]);

  const selectedImages = useMemo(
    () => images.filter((image) => selectedIds.has(image.id)),
    [images, selectedIds],
  );

  const fetchImages = useCallback(async () => {
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

  function selectImageRange(imageId) {
    const currentIndex = filteredImages.findIndex(
      (image) => image.id === imageId,
    );
    const anchorIndex = filteredImages.findIndex(
      (image) => image.id === lastSelectedId,
    );

    if (currentIndex === -1 || anchorIndex === -1) {
      setSelectedIds((current) => new Set([...current, imageId]));
      setLastSelectedId(imageId);
      return;
    }

    const start = Math.min(currentIndex, anchorIndex);
    const end = Math.max(currentIndex, anchorIndex);
    const rangeIds = filteredImages
      .slice(start, end + 1)
      .map((image) => image.id);

    setSelectedIds((current) => new Set([...current, ...rangeIds]));
    setLastSelectedId(imageId);
  }

  function handleSelect(image, event) {
    setSelectedImage(image);

    if (event?.shiftKey) {
      selectImageRange(image.id);
    } else {
      setLastSelectedId(image.id);
    }
  }

  function toggleSelectedImage(imageId, event) {
    if (event?.shiftKey || event?.nativeEvent?.shiftKey) {
      selectImageRange(imageId);
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }

      return next;
    });
    setLastSelectedId(imageId);
  }

  function selectAllVisibleImages() {
    setSelectedIds(new Set(filteredImages.map((image) => image.id)));
    setLastSelectedId(filteredImages[0]?.id || null);
  }

  function clearSelectedImages() {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }

  function openImageContextMenu(event, image) {
    event.preventDefault();
    event.stopPropagation();

    const clickedSelected = selectedIds.has(image.id);
    const targetImages =
      clickedSelected && selectedImages.length > 1 ? selectedImages : [image];

    setSelectedImage(image);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      image,
      images: targetImages,
    });
  }

  function renameImage(image) {
    setContextMenu(null);
    setRenameTarget(image);
  }

  async function confirmRenameImage(image, nextTitle) {
    const cleanTitle = nextTitle.trim();

    if (!cleanTitle) {
      setStatus("Rename cancelled. Title cannot be empty.");
      return;
    }

    setRenamingId(image.id);
    setStatus("");

    const { error } = await supabase
      .from("portfolio_images")
      .update({ title: cleanTitle })
      .eq("id", image.id);

    setRenamingId(null);

    if (error) {
      setStatus(`Rename error: ${error.message}`);
      return;
    }

    setRenameTarget(null);
    setStatus(`Renamed ${image.title || image.file_name} to ${cleanTitle}.`);
    await fetchImages();
  }

  function batchRenameImages(imagesToRename) {
    setContextMenu(null);
    setBatchRenameTargetImages(imagesToRename || []);
  }

  async function confirmBatchRenameImages(imagesToRename, options) {
    if (!imagesToRename?.length) return;

    const baseTitle =
      (options.baseTitle || "Portfolio Image").trim() || "Portfolio Image";
    const startNumber = Number(options.startNumber) || 1;
    const padding = Number(options.padding) || 3;
    const separator = options.separator || "_";

    setBatchActionSaving(true);
    setStatus("");

    try {
      for (let index = 0; index < imagesToRename.length; index += 1) {
        const image = imagesToRename[index];
        const number = String(startNumber + index).padStart(padding, "0");
        const title = `${baseTitle}${separator}${number}`;

        const { error } = await supabase
          .from("portfolio_images")
          .update({ title })
          .eq("id", image.id);

        if (error) throw error;
      }

      setBatchRenameTargetImages([]);
      setStatus(
        `Renamed ${imagesToRename.length} image title${imagesToRename.length === 1 ? "" : "s"}.`,
      );
      await fetchImages();
    } catch (error) {
      console.error(error);
      setStatus(`Batch rename error: ${error.message}`);
    } finally {
      setBatchActionSaving(false);
    }
  }

  async function downloadImage(image, version = "original") {
    setContextMenu(null);
    setStatus("");

    const path =
      version === "display" ? image.display_path : image.original_path;

    if (!path) {
      setStatus(
        version === "display"
          ? "This image does not have a display file yet. Re-upload it through the new pipeline to generate one."
          : "This image does not have an original file path.",
      );
      return;
    }

    try {
      const fileName = getDownloadFileName(image, version, path);
      await downloadStorageFile(path, fileName);
      setStatus(
        `Downloaded ${version === "display" ? "display" : "original"} file: ${fileName}`,
      );
    } catch (error) {
      console.error(error);
      setStatus(`Download error: ${error.message}`);
    }
  }

  async function downloadImages(imagesToDownload, version = "original") {
    setContextMenu(null);
    setStatus("");

    if (!imagesToDownload?.length) return;

    const missing = imagesToDownload.filter((image) =>
      version === "display" ? !image.display_path : !image.original_path,
    );
    const downloadable = imagesToDownload.filter((image) =>
      version === "display" ? image.display_path : image.original_path,
    );

    if (downloadable.length === 0) {
      setStatus(
        version === "display"
          ? "None of the selected images have display files yet. Re-upload them through the new pipeline."
          : "None of the selected images have original file paths.",
      );
      return;
    }

    try {
      setStatus(
        `Starting ${downloadable.length} ${version} download${downloadable.length === 1 ? "" : "s"}...`,
      );

      for (let index = 0; index < downloadable.length; index += 1) {
        const image = downloadable[index];
        const path =
          version === "display" ? image.display_path : image.original_path;
        const fileName = getDownloadFileName(image, version, path);

        await downloadStorageFile(path, fileName);
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }

      setStatus(
        `Downloaded ${downloadable.length} ${version} file${downloadable.length === 1 ? "" : "s"}${
          missing.length
            ? `. Skipped ${missing.length} missing file${missing.length === 1 ? "" : "s"}.`
            : "."
        }`,
      );
    } catch (error) {
      console.error(error);
      setStatus(`Batch download error: ${error.message}`);
    }
  }

  function changeCategoryForImages(imagesToUpdate) {
    setContextMenu(null);
    setCategoryTargetImages(imagesToUpdate || []);
  }

  async function confirmChangeCategory(imagesToUpdate, category) {
    if (!imagesToUpdate?.length || !category) return;

    setBatchActionSaving(true);
    setStatus("");

    const payload = {
      category,
      is_visible: category !== "unlisted",
    };

    const { error } = await supabase
      .from("portfolio_images")
      .update(payload)
      .in(
        "id",
        imagesToUpdate.map((image) => image.id),
      );

    setBatchActionSaving(false);

    if (error) {
      setStatus(`Category update error: ${error.message}`);
      return;
    }

    setCategoryTargetImages([]);
    setStatus(
      `Updated ${imagesToUpdate.length} image${imagesToUpdate.length === 1 ? "" : "s"} to ${ADMIN_CATEGORY_LABELS[category] || category}.`,
    );
    await fetchImages();
  }

  function changeAspectRatioForImages(imagesToUpdate) {
    setContextMenu(null);
    setAspectTargetImages(imagesToUpdate || []);
  }

  async function confirmChangeAspectRatio(imagesToUpdate, aspectRatio) {
    if (!imagesToUpdate?.length || !aspectRatio) return;

    setBatchActionSaving(true);
    setStatus("");

    const { error } = await supabase
      .from("portfolio_images")
      .update({ aspect_ratio: aspectRatio })
      .in(
        "id",
        imagesToUpdate.map((image) => image.id),
      );

    setBatchActionSaving(false);

    if (error) {
      setStatus(`Aspect ratio update error: ${error.message}`);
      return;
    }

    setAspectTargetImages([]);
    setStatus(
      `Updated aspect ratio for ${imagesToUpdate.length} image${imagesToUpdate.length === 1 ? "" : "s"}.`,
    );
    await fetchImages();
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
      object_position_y: image.object_position_y ?? 15,
      zoom: Number(image.zoom || 1),
      featured: !!image.featured,
      is_visible: image.category === "unlisted" ? false : !!image.is_visible,
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

  function chunkArray(items, size = 80) {
    const chunks = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }

  async function deleteImageRows(imagesToDelete) {
    const paths = [
      ...new Set(
        imagesToDelete
          .flatMap((image) => [
            image.original_path,
            image.display_path,
            image.thumbnail_path,
          ])
          .filter(Boolean),
      ),
    ];

    for (const chunk of chunkArray(paths, 80)) {
      const { error: storageError } = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .remove(chunk);

      if (storageError) throw storageError;
    }

    for (const chunk of chunkArray(
      imagesToDelete.map((image) => image.id),
      80,
    )) {
      const { error: deleteError } = await supabase
        .from("portfolio_images")
        .delete()
        .in("id", chunk);

      if (deleteError) throw deleteError;
    }
  }

  function bulkDeleteSelectedImages() {
    const imagesToDelete = images.filter((image) => selectedIds.has(image.id));

    if (imagesToDelete.length === 0) return;

    setDeleteTargetImages(imagesToDelete);
  }

  function deleteImage(imageOrImages) {
    setContextMenu(null);
    const imagesToDelete = Array.isArray(imageOrImages)
      ? imageOrImages
      : [imageOrImages];
    setDeleteTargetImages(imagesToDelete.filter(Boolean));
  }

  async function confirmDeleteImages(imagesToDelete) {
    if (!imagesToDelete?.length) return;

    const deletedIds = new Set(imagesToDelete.map((image) => image.id));
    const isBulkDelete = imagesToDelete.length > 1;

    if (isBulkDelete) {
      setBulkDeleting(true);
    } else {
      setDeletingId(imagesToDelete[0].id);
    }

    setStatus("");

    try {
      await deleteImageRows(imagesToDelete);
      setStatus(
        `Deleted ${imagesToDelete.length} image${
          imagesToDelete.length === 1 ? "" : "s"
        }.`,
      );
      setSelectedIds((current) => {
        const next = new Set(current);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });

      if (selectedImage && deletedIds.has(selectedImage.id)) {
        setSelectedImage(null);
      }

      setDeleteTargetImages([]);
      await fetchImages();
    } catch (error) {
      console.error(error);
      setStatus(`Delete error: ${error.message}`);
    } finally {
      setBulkDeleting(false);
      setDeletingId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <AdminNav onSignOut={handleSignOut} />

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={fetchImages}
      />

      <FeaturedArrangerModal
        open={featuredArrangerOpen}
        images={images.filter(
          (image) =>
            image.featured && image.is_visible && image.category !== "unlisted",
        )}
        onClose={() => setFeaturedArrangerOpen(false)}
        onSaved={async (message) => {
          setStatus(message);
          await fetchImages();
        }}
      />

      <ContextMenu
        menu={contextMenu}
        selectedIds={selectedIds}
        onClose={() => setContextMenu(null)}
        onToggleSelected={toggleSelectedImage}
        onRename={renameImage}
        onBatchRename={batchRenameImages}
        onDownload={downloadImage}
        onBatchDownload={downloadImages}
        onChangeCategory={changeCategoryForImages}
        onChangeAspectRatio={changeAspectRatioForImages}
        onDelete={deleteImage}
      />

      <RenameModal
        image={renameTarget}
        saving={renamingId === renameTarget?.id}
        onClose={() => setRenameTarget(null)}
        onSave={confirmRenameImage}
      />

      <BatchRenameModal
        images={batchRenameTargetImages}
        saving={batchActionSaving}
        onClose={() => setBatchRenameTargetImages([])}
        onSave={confirmBatchRenameImages}
      />

      <BatchCategoryModal
        images={categoryTargetImages}
        saving={batchActionSaving}
        onClose={() => setCategoryTargetImages([])}
        onSave={confirmChangeCategory}
      />

      <BatchAspectRatioModal
        images={aspectTargetImages}
        saving={batchActionSaving}
        onClose={() => setAspectTargetImages([])}
        onSave={confirmChangeAspectRatio}
      />

      <DeleteConfirmModal
        images={deleteTargetImages}
        deleting={bulkDeleting || !!deletingId}
        onClose={() => setDeleteTargetImages([])}
        onConfirm={confirmDeleteImages}
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
                maxWidth: 760,
                margin: "0.6rem 0 0",
              }}
            >
              Upload originals, generate optimized display images and
              thumbnails, prevent duplicates, manage publishing, and preview
              crop changes live.
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
              onClick={() => setFeaturedArrangerOpen(true)}
              className="btn-secondary"
            >
              Arrange Featured
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
              gridTemplateColumns:
                "minmax(280px, 340px) minmax(0, 1fr) minmax(320px, 420px)",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            <ControlPanel
              image={selectedImage}
              onChange={handleLocalChange}
              onSave={saveImage}
              onDelete={deleteImage}
              saving={savingId === selectedImage?.id}
              deleting={deletingId === selectedImage?.id}
            />

            <PortfolioGallery
              images={filteredImages}
              selectedId={selectedImage?.id}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onToggleSelected={toggleSelectedImage}
              onSelectAllVisible={selectAllVisibleImages}
              onClearSelection={clearSelectedImages}
              onBulkDelete={bulkDeleteSelectedImages}
              onContextMenuImage={openImageContextMenu}
              filter={filter}
              onFilterChange={setFilter}
              bulkDeleting={bulkDeleting}
            />

            <PreviewPanel image={selectedImage} />
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 1200px) {
          .portfolio-manager-layout {
            grid-template-columns: minmax(280px, 360px) minmax(0, 1fr) !important;
          }

          .portfolio-preview-panel {
            position: static !important;
            grid-column: 1 / -1;
            height: auto !important;
            max-height: none !important;
          }
        }

        @media (max-width: 900px) {
          .portfolio-manager-layout {
            grid-template-columns: 1fr !important;
          }

          .portfolio-left-panel,
          .portfolio-preview-panel {
            position: static !important;
            height: auto !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}
