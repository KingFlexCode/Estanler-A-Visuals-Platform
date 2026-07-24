import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CLIENT_GALLERY_BUCKET = "client-galleries";

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

function normalizeDuplicateValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getSectionIdFromOriginalPath(path = "") {
  const parts = String(path || "").split("/");
  if (parts.length < 3 || parts[2] !== "originals") return "";
  return parts[1] || "";
}

async function isDuplicateClientGalleryOriginalUpload(path, file, options = {}) {
  const sectionId = getSectionIdFromOriginalPath(path);
  const fileName = normalizeDuplicateValue(file?.name);
  const fileSize = Number(file?.size);
  const mimeType = normalizeDuplicateValue(options?.contentType || file?.type);

  if (!sectionId || !fileName || !Number.isFinite(fileSize) || !mimeType) return false;

  const { data: section, error: sectionError } = await supabaseClient
    .from("client_gallery_sections")
    .select("gallery_id")
    .eq("id", sectionId)
    .maybeSingle();

  if (sectionError || !section?.gallery_id) return false;

  const { data: existingPhotos, error: photoError } = await supabaseClient
    .from("client_gallery_images")
    .select("id,file_name,original_size_bytes,mime_type")
    .eq("gallery_id", section.gallery_id)
    .eq("original_size_bytes", fileSize);

  if (photoError || !Array.isArray(existingPhotos)) return false;

  return existingPhotos.some((photo) => (
    normalizeDuplicateValue(photo.file_name) === fileName
    && Number(photo.original_size_bytes) === fileSize
    && normalizeDuplicateValue(photo.mime_type) === mimeType
  ));
}

function createDuplicateUploadError() {
  return {
    name: "DuplicateGalleryImageError",
    code: "DUPLICATE_GALLERY_IMAGE",
    message: "Skipped duplicate gallery image.",
  };
}

function wrapClientGalleryBucket(bucket) {
  return new Proxy(bucket, {
    get(target, property) {
      if (property === "upload") {
        return async (path, file, options = {}) => {
          if (await isDuplicateClientGalleryOriginalUpload(path, file, options)) {
            return { data: null, error: createDuplicateUploadError() };
          }

          return target.upload(path, file, options);
        };
      }

      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function wrapStorage(storage) {
  return new Proxy(storage, {
    get(target, property) {
      if (property === "from") {
        return (bucketName) => {
          const bucket = target.from(bucketName);
          return bucketName === CLIENT_GALLERY_BUCKET ? wrapClientGalleryBucket(bucket) : bucket;
        };
      }

      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export const supabase = new Proxy(supabaseClient, {
  get(target, property) {
    if (property === "storage") return wrapStorage(target.storage);

    const value = target[property];
    return typeof value === "function" ? value.bind(target) : value;
  },
});
