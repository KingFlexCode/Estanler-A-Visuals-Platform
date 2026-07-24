const fs = require("fs");

const filePath = "src/pages/admin/GalleryEditor.jsx";
let content = fs.readFileSync(filePath, "utf8");

const helperAnchor = `function sanitizeFileName(name = "") {
  return (
    name
      .replace(/\\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || \`client-gallery-photo-\${Date.now()}\`
  );
}
`;

const duplicateHelpers = `${helperAnchor}
function normalizeDuplicateFileName(fileName = "") {
  return String(fileName).trim().toLowerCase();
}

function fallbackDuplicateSignature({ file_name, original_size_bytes, mime_type } = {}) {
  if (!file_name || !Number.isFinite(Number(original_size_bytes)) || !mime_type) return "";
  return `${normalizeDuplicateFileName(file_name)}::${Number(original_size_bytes)}::${mime_type}`;
}

function fallbackDuplicateSignatureFromFile(file) {
  return fallbackDuplicateSignature({ file_name: file?.name, original_size_bytes: file?.size, mime_type: file?.type });
}

async function hashFileSha256(file) {
  if (!file?.arrayBuffer || !globalThis.crypto?.subtle) return "";
  const buffer = await file.arrayBuffer();
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
`;

if (!content.includes("async function hashFileSha256")) {
  if (!content.includes(helperAnchor)) {
    throw new Error("Could not find sanitizeFileName helper block.");
  }

  content = content.replace(helperAnchor, duplicateHelpers);
}

const start = content.indexOf("  async function uploadSelectedFiles(fileList) {");
const end = content.indexOf("\n  async function removePhoto(photoId)", start);

if (start === -1 || end === -1) {
  throw new Error("Could not find uploadSelectedFiles function boundaries.");
}

const replacement = `  async function uploadSelectedFiles(fileList) {
    const selectedFiles = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!selectedFiles.length) return;

    const sectionId = targetSection || sections[0]?.id;
    if (!sectionId) {
      setError("Create a photo set before uploading images.");
      return;
    }

    const startedAt = Date.now();
    const existingSectionPhotos = photos.filter((photo) => photo.section_id === sectionId);
    const existingHashKeys = new Set(photos.map((photo) => photo.original_sha256).filter(Boolean));
    const existingFallbackKeys = new Set(photos.map(fallbackDuplicateSignature).filter(Boolean));
    const pendingHashKeys = new Set();
    const pendingFallbackKeys = new Set();
    const skippedIndexes = new Set();
    const fileHashes = new Map();

    setError("");
    setNotice("Checking for duplicate images...");

    for (const [index, file] of selectedFiles.entries()) {
      const fileHash = await hashFileSha256(file);
      const fallbackKey = fallbackDuplicateSignatureFromFile(file);

      if (fileHash) fileHashes.set(index, fileHash);

      const hashDuplicate = Boolean(fileHash && (existingHashKeys.has(fileHash) || pendingHashKeys.has(fileHash)));
      const fallbackDuplicate = Boolean(fallbackKey && (existingFallbackKeys.has(fallbackKey) || pendingFallbackKeys.has(fallbackKey)));

      if (hashDuplicate || fallbackDuplicate) {
        skippedIndexes.add(index);
        continue;
      }

      if (fileHash) pendingHashKeys.add(fileHash);
      if (fallbackKey) pendingFallbackKeys.add(fallbackKey);
    }

    const skippedCount = skippedIndexes.size;
    const uploadableCount = selectedFiles.length - skippedCount;
    const safeGallerySlug = slugify(gallery.slug || gallery.title || gallery.id);
    const insertedPhotos = [];
    const failedUploads = [];
    let firstCoverId = gallery.cover_image_id || null;

    const nextQueue = selectedFiles.map((file, index) => (
      skippedIndexes.has(index)
        ? { name: file.name, status: "skipped", message: "Skipped duplicate", progress: 100 }
        : { name: file.name, status: "ready", message: "Ready", progress: 0 }
    ));

    setUploadQueue(nextQueue);

    if (uploadableCount === 0) {
      setUploading(false);
      setUploadStartedAt(null);
      setElapsedSeconds(0);
      setNotice(`Skipped ${skippedCount} duplicate image${skippedCount === 1 ? "" : "s"}.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadStartedAt(startedAt);
    setElapsedSeconds(0);
    setNotice(
      skippedCount > 0
        ? `Uploading ${uploadableCount} new image${uploadableCount === 1 ? "" : "s"} and skipping ${skippedCount} duplicate image${skippedCount === 1 ? "" : "s"}.`
        : `Uploading ${selectedFiles.length} image${selectedFiles.length === 1 ? "" : "s"}...`
    );

    for (const [index, file] of selectedFiles.entries()) {
      if (skippedIndexes.has(index)) continue;

      const cleanName = sanitizeFileName(file.name);
      const extension = getFileExtension(file.name);
      const uniqueName = `${Date.now()}-${index}-${cleanName}`;
      const basePath = `${safeGallerySlug}/${sectionId}`;
      const originalPath = `${basePath}/originals/${uniqueName}.${extension}`;
      const displayPath = `${basePath}/display/${uniqueName}.webp`;
      const thumbnailPath = `${basePath}/thumbnails/${uniqueName}.webp`;

      try {
        updateQueueItem(index, { status: "processing", message: "Creating display + thumbnail", progress: 12 });

        const [displayImage, thumbnailImage] = await Promise.all([
          resizeImage(file, 2200, 0.84),
          resizeImage(file, 720, 0.78),
        ]);

        updateQueueItem(index, { status: "uploading", message: "Uploading original", progress: 34 });
        const originalUpload = await supabase.storage.from(CLIENT_GALLERY_BUCKET).upload(originalPath, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
        if (originalUpload.error) throw originalUpload.error;

        updateQueueItem(index, { status: "uploading", message: "Uploading display image", progress: 58 });
        const displayUpload = await supabase.storage.from(CLIENT_GALLERY_BUCKET).upload(displayPath, displayImage.blob, { cacheControl: "31536000", upsert: false, contentType: "image/webp" });
        if (displayUpload.error) throw displayUpload.error;

        updateQueueItem(index, { status: "uploading", message: "Uploading thumbnail", progress: 76 });
        const thumbnailUpload = await supabase.storage.from(CLIENT_GALLERY_BUCKET).upload(thumbnailPath, thumbnailImage.blob, { cacheControl: "31536000", upsert: false, contentType: "image/webp" });
        if (thumbnailUpload.error) throw thumbnailUpload.error;

        updateQueueItem(index, { status: "saving", message: "Saving gallery photo", progress: 92 });
        const title = cleanName.replace(/-/g, " ");
        const { data: insertedPhoto, error: insertError } = await supabase.from("client_gallery_images").insert({
          gallery_id: galleryId,
          section_id: sectionId,
          file_name: file.name,
          title,
          alt_text: title,
          original_path: originalPath,
          display_path: displayPath,
          thumbnail_path: thumbnailPath,
          display_order: existingSectionPhotos.length + insertedPhotos.length,
          original_size_bytes: file.size,
          original_sha256: fileHashes.get(index) || null,
          display_size_bytes: displayImage.size,
          thumbnail_size_bytes: thumbnailImage.size,
          display_width: displayImage.width,
          display_height: displayImage.height,
          thumbnail_width: thumbnailImage.width,
          thumbnail_height: thumbnailImage.height,
          mime_type: file.type,
          focal_x: 50,
          focal_y: 50,
        }).select("*").single();

        if (insertError) throw insertError;

        insertedPhotos.push(insertedPhoto);
        setPhotos((current) => sortByOrder([...current, insertedPhoto]));

        if (!firstCoverId) {
          firstCoverId = insertedPhoto.id;
          await setCoverImage(insertedPhoto.id, false);
        }

        updateQueueItem(index, { status: "done", message: "Uploaded", progress: 100 });
      } catch (uploadError) {
        console.error(uploadError);
        failedUploads.push(file.name);
        updateQueueItem(index, { status: "failed", message: uploadError.message || "Upload failed", progress: 100 });
        setNotice("");
        setError(uploadError.message || "One image failed to upload.");
      }
    }

    setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    setUploadStartedAt(null);
    setUploading(false);

    const skippedMessage = skippedCount > 0 ? ` Skipped ${skippedCount} duplicate image${skippedCount === 1 ? "" : "s"}.` : "";
    flash(
      failedUploads.length > 0
        ? `Upload finished with ${failedUploads.length} failed image${failedUploads.length === 1 ? "" : "s"}.${skippedMessage}`
        : `Done. Uploaded ${insertedPhotos.length} image${insertedPhotos.length === 1 ? "" : "s"}.${skippedMessage}`
    );

    if (fileInputRef.current) fileInputRef.current.value = "";
  }`;

content = `${content.slice(0, start)}${replacement}${content.slice(end)}`;
fs.writeFileSync(filePath, content);
console.log("EST-69 duplicate detection patch applied or refreshed in GalleryEditor.jsx.");
