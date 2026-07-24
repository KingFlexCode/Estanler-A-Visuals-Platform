import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CLIENT_GALLERY_BUCKET = "client-galleries";
const DUPLICATE_NOTICE_ID = "client-gallery-duplicate-notice";
const DUPLICATE_INLINE_NOTICE_ID = "client-gallery-duplicate-inline-notice";

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

function normalizeDuplicateValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getDuplicateMessage(fileName = "") {
  const displayName = String(fileName || "This image").trim() || "This image";
  return `“${displayName}” is already in this client gallery. The second copy was not added.`;
}

function findTextElement(predicate) {
  if (typeof document === "undefined") return null;

  return Array.from(document.querySelectorAll("div, span, strong, p")).find((element) => {
    if (element.children.length > 0) return false;
    return predicate((element.textContent || "").trim());
  }) || null;
}

function setElementText(element, value) {
  if (element && element.textContent !== value) element.textContent = value;
}

function findUploadProgressPanel(startElement) {
  let element = startElement;

  while (element && element !== document.body) {
    const text = element.textContent || "";
    if (text.includes("Upload Progress") && text.includes("Uploaded:") && text.includes("Skipped:") && text.includes("Failed:")) {
      return element;
    }
    element = element.parentElement;
  }

  return null;
}

function syncDuplicateUploadProgress(fileName = "") {
  if (typeof document === "undefined") return;

  const duplicateMessage = getDuplicateMessage(fileName);

  const applyUpdate = () => {
    const summary = findTextElement((text) => /^Upload finished with \d+ failed image/.test(text));
    setElementText(summary, `Duplicate detected: ${duplicateMessage}`);

    const progressTitle = findTextElement((text) => text === "Upload complete");
    setElementText(progressTitle, "Duplicate detected");

    const skipped = findTextElement((text) => /^Skipped:\s*\d+$/.test(text));
    const failed = findTextElement((text) => /^Failed:\s*\d+$/.test(text));
    setElementText(skipped, "Skipped: 1");
    setElementText(failed, "Failed: 0");

    const progressPanel = findUploadProgressPanel(skipped || failed || progressTitle);
    if (progressPanel && !document.getElementById(DUPLICATE_INLINE_NOTICE_ID)) {
      const inlineNotice = document.createElement("div");
      inlineNotice.id = DUPLICATE_INLINE_NOTICE_ID;
      inlineNotice.setAttribute("role", "status");
      inlineNotice.style.marginTop = "12px";
      inlineNotice.style.border = "1px solid rgba(255, 183, 94, 0.58)";
      inlineNotice.style.background = "rgba(255, 183, 94, 0.09)";
      inlineNotice.style.color = "#ffcf9a";
      inlineNotice.style.fontFamily = "'Inter', sans-serif";
      inlineNotice.style.fontSize = "13px";
      inlineNotice.style.lineHeight = "1.55";
      inlineNotice.style.padding = "12px 14px";
      inlineNotice.textContent = `Duplicate detected. ${duplicateMessage}`;
      progressPanel.appendChild(inlineNotice);
    }
  };

  applyUpdate();

  const observer = new MutationObserver(applyUpdate);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  [50, 150, 350, 700, 1200, 2000].forEach((delay) => {
    window.setTimeout(applyUpdate, delay);
  });

  window.setTimeout(() => observer.disconnect(), 3000);
}

function showDuplicateUploadNotice(fileName = "") {
  if (typeof document === "undefined") return;

  const duplicateMessage = getDuplicateMessage(fileName);
  const existingNotice = document.getElementById(DUPLICATE_NOTICE_ID);
  if (existingNotice) existingNotice.remove();

  const notice = document.createElement("div");
  notice.id = DUPLICATE_NOTICE_ID;
  notice.setAttribute("role", "alert");
  notice.setAttribute("aria-live", "assertive");
  notice.style.position = "fixed";
  notice.style.right = "24px";
  notice.style.bottom = "24px";
  notice.style.zIndex = "9999";
  notice.style.width = "min(440px, calc(100vw - 48px))";
  notice.style.boxSizing = "border-box";
  notice.style.background = "#17232f";
  notice.style.border = "1px solid rgba(255, 183, 94, 0.78)";
  notice.style.boxShadow = "0 18px 50px rgba(0, 0, 0, 0.4)";
  notice.style.padding = "18px 20px";
  notice.style.color = "#f7f3ed";
  notice.style.fontFamily = "'Inter', sans-serif";
  notice.style.lineHeight = "1.55";

  const title = document.createElement("strong");
  title.textContent = "Duplicate detected";
  title.style.display = "block";
  title.style.color = "#ffb75e";
  title.style.fontSize = "14px";
  title.style.letterSpacing = "0.08em";
  title.style.marginBottom = "6px";
  title.style.textTransform = "uppercase";

  const message = document.createElement("span");
  message.textContent = duplicateMessage;
  message.style.display = "block";
  message.style.fontSize = "14px";

  notice.append(title, message);
  document.body.appendChild(notice);
  syncDuplicateUploadProgress(fileName);

  window.setTimeout(() => {
    if (notice.isConnected) notice.remove();
  }, 12000);
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

function createDuplicateUploadError(fileName = "") {
  return {
    name: "DuplicateGalleryImageError",
    code: "DUPLICATE_GALLERY_IMAGE",
    statusCode: 409,
    message: `Duplicate detected: ${getDuplicateMessage(fileName)}`,
  };
}

function wrapClientGalleryBucket(bucket) {
  return new Proxy(bucket, {
    get(target, property) {
      if (property === "upload") {
        return async (path, file, options = {}) => {
          if (await isDuplicateClientGalleryOriginalUpload(path, file, options)) {
            showDuplicateUploadNotice(file?.name);
            return { data: null, error: createDuplicateUploadError(file?.name) };
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
