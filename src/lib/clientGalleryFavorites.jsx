import { zipSync } from "fflate";
import { supabase } from "./supabase";

export const FAVORITES_TABLE = "client_gallery_favorites";
export const VISITOR_KEY = "client-gallery-visitor-id";
export const FAVORITES_STORAGE_PREFIX = "client-gallery-favorites:";

const CLIENT_GALLERY_BUCKET = "client-galleries";
const ADMIN_TAB_TITLES = new Set(["Photos", "Design", "Settings", "Activity"]);
const ADMIN_SUMMARY_PANEL_ID = "est81-client-favorites-summary-panel";
const ADMIN_DASHBOARD_ID = "est81-client-favorites-dashboard";
const LEGACY_PANEL_IDS = ["est74-admin-favorites-panel", "est81-admin-client-favorites-panel"];
const DOWNLOAD_LOG_PREFIX = "client-gallery-favorite-download-log:";
const VIEW_MODE_KEY = "client-gallery-favorite-selection-view-mode";

export function createGalleryVisitorId() {
  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getGalleryVisitorId() {
  if (typeof window === "undefined") return "server-visitor";
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const next = createGalleryVisitorId();
  window.localStorage.setItem(VISITOR_KEY, next);
  return next;
}

export async function loadGalleryFavorites(galleryId, visitorId = getGalleryVisitorId()) {
  if (!galleryId || !visitorId) return new Set();
  const { data, error } = await supabase
    .from(FAVORITES_TABLE)
    .select("image_id")
    .eq("gallery_id", galleryId)
    .eq("visitor_id", visitorId);
  if (error) throw error;
  return new Set((data || []).map((row) => row.image_id));
}

export async function saveGalleryFavorite(galleryId, imageId, visitorId = getGalleryVisitorId()) {
  if (!galleryId || !imageId || !visitorId) return;
  const { error } = await supabase
    .from(FAVORITES_TABLE)
    .upsert(
      { gallery_id: galleryId, image_id: imageId, visitor_id: visitorId },
      { onConflict: "gallery_id,image_id,visitor_id" },
    );
  if (error) throw error;
}

export async function removeGalleryFavorite(galleryId, imageId, visitorId = getGalleryVisitorId()) {
  if (!galleryId || !imageId || !visitorId) return;
  const query = supabase.from(FAVORITES_TABLE);
  const { error } = await query["delete"]()
    .eq("gallery_id", galleryId)
    .eq("image_id", imageId)
    .eq("visitor_id", visitorId);
  if (error) throw error;
}

export async function loadGalleryFavoriteSummary(galleryId) {
  if (!galleryId) return [];
  const { data, error } = await supabase
    .from("client_gallery_favorite_summary")
    .select("image_id,favorite_count,last_favorited_at")
    .eq("gallery_id", galleryId);
  if (error) throw error;
  return data || [];
}

function parseFavoriteIds(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function syncFavoriteIds(galleryId, previousIds, nextIds) {
  const visitorId = getGalleryVisitorId();
  const previous = new Set(previousIds);
  const next = new Set(nextIds);
  await Promise.all([...next].map((imageId) => saveGalleryFavorite(galleryId, imageId, visitorId)));
  await Promise.all([...previous].filter((imageId) => !next.has(imageId)).map((imageId) => removeGalleryFavorite(galleryId, imageId, visitorId)));
}

function adminGalleryId() {
  if (typeof window === "undefined") return "";
  const match = window.location.pathname.match(/^\/admin\/galleries\/([^/]+)/);
  return match?.[1] || "";
}

function galleryPublicUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(CLIENT_GALLERY_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function selectedImagePath(image) {
  return image?.original_path || image?.display_path || image?.thumbnail_path || "";
}

function previewImagePath(image) {
  return image?.thumbnail_path || image?.display_path || image?.original_path || "";
}

function safeFileName(value = "gallery-photo") {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "gallery-photo";
}

function getSelectionViewMode() {
  if (typeof window === "undefined") return "grid";
  const saved = window.localStorage.getItem(VIEW_MODE_KEY);
  return saved === "list" ? "list" : "grid";
}

function setSelectionViewMode(mode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIEW_MODE_KEY, mode === "list" ? "list" : "grid");
}

function downloadLogKey(galleryId) {
  return `${DOWNLOAD_LOG_PREFIX}${galleryId}`;
}

function loadDownloadLog(galleryId) {
  if (typeof window === "undefined" || !galleryId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(downloadLogKey(galleryId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordDownload(galleryId, entry) {
  if (typeof window === "undefined" || !galleryId) return;
  const nextLog = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, at: new Date().toISOString(), ...entry }, ...loadDownloadLog(galleryId)].slice(0, 40);
  window.localStorage.setItem(downloadLogKey(galleryId), JSON.stringify(nextLog));
}

function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function saveSelectedImage(row, galleryId) {
  const image = row.image;
  const url = galleryPublicUrl(selectedImagePath(image));
  const fileName = safeFileName(image.file_name || image.title || image.id);
  if (!url) throw new Error("Selected image is missing a file path.");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Selected image could not be prepared.");
  const blob = await response.blob();
  saveBlob(blob, fileName);
  recordDownload(galleryId, { type: "single", count: 1, label: fileName });
}

async function saveSelectedZip(rows, button, galleryId) {
  if (!rows.length) {
    button.textContent = "No Favorites";
    window.setTimeout(() => { button.textContent = "Download Favorites ZIP"; }, 1600);
    return;
  }

  const originalLabel = button.textContent;
  const files = {};
  button.disabled = true;

  try {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const image = row.image;
      const url = galleryPublicUrl(selectedImagePath(image));
      if (!url) continue;
      button.textContent = `Preparing ${index + 1}/${rows.length}`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const fileName = safeFileName(image.file_name || image.title || `selected-photo-${index + 1}.jpg`);
      files[`${String(index + 1).padStart(3, "0")}-${fileName}`] = new Uint8Array(buffer);
    }

    if (!Object.keys(files).length) throw new Error("No selected files could be prepared.");
    button.textContent = "Packaging ZIP";
    const zipBytes = zipSync(files, { level: 0 });
    const zipName = `client-favorites-${new Date().toISOString().slice(0, 10)}.zip`;
    saveBlob(new Blob([zipBytes], { type: "application/zip" }), zipName);
    recordDownload(galleryId, { type: "zip", count: Object.keys(files).length, label: zipName });
    button.textContent = "ZIP Started";
  } catch {
    button.textContent = "ZIP Failed";
  } finally {
    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = originalLabel;
      renderActivityWorkspace(true);
    }, 1800);
  }
}

async function loadAdminFavoriteRows(galleryId) {
  const summary = await loadGalleryFavoriteSummary(galleryId);
  const ids = summary.map((item) => item.image_id).filter(Boolean);
  if (!ids.length) return [];
  const { data: images, error } = await supabase
    .from("client_gallery_images")
    .select("id,file_name,title,section_id,display_order,original_path,display_path,thumbnail_path")
    .in("id", ids);
  if (error) throw error;
  const imageMap = new Map((images || []).map((image) => [image.id, image]));
  return summary
    .map((item) => ({ ...item, image: imageMap.get(item.image_id) }))
    .filter((item) => item.image)
    .sort((a, b) => Number(a.image.display_order || 0) - Number(b.image.display_order || 0));
}

function buttonStyle(kind = "light") {
  const dark = kind === "dark";
  return `background:${dark ? "#111" : "transparent"};border:1px solid ${dark ? "#111" : "#ddd"};color:${dark ? "#fff" : "#111"};cursor:pointer;font-size:10px;font-weight:800;letter-spacing:.12em;padding:10px 12px;text-transform:uppercase;`;
}

function viewButtonStyle(active) {
  return `background:${active ? "#111" : "transparent"};border:1px solid ${active ? "#111" : "#ddd"};color:${active ? "#fff" : "#111"};cursor:pointer;font-size:10px;font-weight:900;letter-spacing:.1em;padding:8px 10px;text-transform:uppercase;`;
}

function metric(label, value) {
  const card = document.createElement("div");
  card.style.cssText = "border:1px solid #e5e5e5;background:#fff;padding:1rem;";
  const number = document.createElement("div");
  number.textContent = value;
  number.style.cssText = "color:#111;font-size:1.85rem;font-weight:900;line-height:1;";
  const text = document.createElement("div");
  text.textContent = label;
  text.style.cssText = "color:#777;font-size:10px;font-weight:900;letter-spacing:.14em;margin-top:.5rem;text-transform:uppercase;";
  card.append(number, text);
  return card;
}

function removeElementsById(ids) {
  ids.forEach((id) => document.querySelectorAll(`#${id}`).forEach((element) => element.remove()));
}

function removeActivityWorkspace() {
  removeElementsById([ADMIN_SUMMARY_PANEL_ID, ADMIN_DASHBOARD_ID, ...LEGACY_PANEL_IDS]);
  document.querySelectorAll("[data-est81-main-hidden='true']").forEach((element) => {
    element.style.display = element.dataset.est81OriginalDisplay || "";
    delete element.dataset.est81MainHidden;
    delete element.dataset.est81OriginalDisplay;
  });
}

function galleryTabButtons() {
  return [...document.querySelectorAll("button[title]")].filter((button) => ADMIN_TAB_TITLES.has(button.title));
}

function isActivityTabActive() {
  const tabs = galleryTabButtons();
  const activityButton = tabs.find((button) => button.title === "Activity");
  if (!activityButton || tabs.length < 2) return false;

  const activityColor = window.getComputedStyle(activityButton).color;
  const sameColorCount = tabs.filter((button) => window.getComputedStyle(button).color === activityColor).length;
  return sameColorCount === 1;
}

function activeSidebarPanelContainer() {
  const activityButton = galleryTabButtons().find((button) => button.title === "Activity");
  const aside = activityButton?.closest("aside");
  if (!aside) return null;
  const containers = [...aside.querySelectorAll("div")];
  return containers.find((container) => {
    const style = window.getComputedStyle(container);
    return style.overflowY === "auto" && style.overflowX === "hidden";
  }) || null;
}

function activityMainElement() {
  const main = document.querySelector("main");
  if (!main) return null;
  return main;
}

function buildSidebarSummary(rows, galleryId, loading = false) {
  const log = loadDownloadLog(galleryId);
  const totalSelections = rows.reduce((total, row) => total + Number(row.favorite_count || 0), 0);
  const summary = document.createElement("section");
  summary.id = ADMIN_SUMMARY_PANEL_ID;
  summary.style.cssText = "border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.035);color:#fff;margin:0 0 1rem;padding:1rem;font-family:'Inter',sans-serif;";

  const label = document.createElement("div");
  label.textContent = "Client Favorite Selections";
  label.style.cssText = "color:#c8a96a;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;";
  const body = document.createElement("p");
  body.textContent = loading ? "Loading client selections..." : `${rows.length} selected photos · ${totalSelections} favorite clicks · ${log.length} download actions`;
  body.style.cssText = "color:#cfcfcf;font-size:12px;line-height:1.55;margin:.65rem 0 0;";
  summary.append(label, body);
  return summary;
}

function selectedImageName(row) {
  return row.image.file_name || row.image.title || row.image.id;
}

function renderSelectedGrid(rows, galleryId) {
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:1rem;max-height:680px;overflow:auto;padding-right:.25rem;";

  rows.forEach((row) => {
    const image = row.image;
    const card = document.createElement("article");
    card.style.cssText = "border:1px solid #e7e7e7;background:#fff;display:flex;flex-direction:column;min-width:0;overflow:hidden;";

    const preview = document.createElement("button");
    preview.type = "button";
    preview.style.cssText = "aspect-ratio:4/3;background:#f2f2f2;border:none;cursor:pointer;display:block;overflow:hidden;padding:0;width:100%;";
    preview.title = "Download selected image";

    const img = document.createElement("img");
    img.src = galleryPublicUrl(previewImagePath(image));
    img.alt = selectedImageName(row);
    img.loading = "lazy";
    img.style.cssText = "display:block;height:100%;object-fit:cover;width:100%;";
    preview.append(img);

    const body = document.createElement("div");
    body.style.cssText = "display:grid;gap:.55rem;padding:.75rem;";

    const name = document.createElement("button");
    name.type = "button";
    name.textContent = selectedImageName(row);
    name.style.cssText = "background:transparent;border:none;color:#111;cursor:pointer;font-size:12px;font-weight:800;line-height:1.35;overflow:hidden;padding:0;text-align:left;text-decoration:underline;text-overflow:ellipsis;text-underline-offset:3px;white-space:nowrap;";

    const meta = document.createElement("div");
    meta.style.cssText = "align-items:center;display:flex;justify-content:space-between;gap:.75rem;";
    const count = document.createElement("strong");
    count.textContent = `♥ ${row.favorite_count}`;
    count.style.cssText = "color:#00b894;font-size:12px;";
    const action = document.createElement("button");
    action.type = "button";
    action.textContent = "Download";
    action.style.cssText = "background:transparent;border:1px solid #ddd;color:#111;cursor:pointer;font-size:9px;font-weight:900;letter-spacing:.1em;padding:6px 8px;text-transform:uppercase;";
    meta.append(count, action);

    const downloadOne = async (target) => {
      const original = target.textContent;
      target.textContent = "Preparing...";
      try {
        await saveSelectedImage(row, galleryId);
        target.textContent = "Started";
      } catch {
        target.textContent = "Failed";
      } finally {
        window.setTimeout(() => {
          target.textContent = original;
          renderActivityWorkspace(true);
        }, 1500);
      }
    };

    preview.onclick = () => downloadOne(action);
    name.onclick = () => downloadOne(name);
    action.onclick = () => downloadOne(action);

    body.append(name, meta);
    card.append(preview, body);
    grid.append(card);
  });

  return grid;
}

function renderSelectedList(rows, galleryId) {
  const table = document.createElement("div");
  table.style.cssText = "display:grid;gap:0;max-height:620px;overflow:auto;border-top:1px solid #eee;";
  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.style.cssText = "display:grid;grid-template-columns:52px 74px minmax(0,1fr) 92px;gap:1rem;align-items:center;border-bottom:1px solid #eee;padding:.7rem 0;";
    const number = document.createElement("div");
    number.textContent = String(index + 1).padStart(2, "0");
    number.style.cssText = "color:#aaa;font-size:12px;font-weight:900;";

    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.style.cssText = "aspect-ratio:1/1;background:#f2f2f2;border:none;cursor:pointer;overflow:hidden;padding:0;width:74px;";
    const img = document.createElement("img");
    img.src = galleryPublicUrl(previewImagePath(row.image));
    img.alt = selectedImageName(row);
    img.loading = "lazy";
    img.style.cssText = "display:block;height:100%;object-fit:cover;width:100%;";
    thumb.append(img);

    const name = document.createElement("button");
    name.type = "button";
    name.textContent = selectedImageName(row);
    name.style.cssText = "background:transparent;border:none;color:#111;cursor:pointer;font:inherit;font-size:14px;padding:0;text-align:left;text-decoration:underline;text-underline-offset:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

    const count = document.createElement("strong");
    count.textContent = `♥ ${row.favorite_count}`;
    count.style.cssText = "color:#00b894;font-size:13px;text-align:right;";

    const downloadOne = async (target) => {
      const original = target.textContent;
      target.textContent = "Preparing image...";
      try {
        await saveSelectedImage(row, galleryId);
        target.textContent = "Download started";
      } catch {
        target.textContent = "Download failed";
      } finally {
        window.setTimeout(() => {
          target.textContent = original;
          renderActivityWorkspace(true);
        }, 1600);
      }
    };

    thumb.onclick = () => downloadOne(name);
    name.onclick = () => downloadOne(name);
    item.append(number, thumb, name, count);
    table.append(item);
  });
  return table;
}

function buildActivityDashboard(rows, galleryId, loading = false) {
  const log = loadDownloadLog(galleryId);
  const totalSelections = rows.reduce((total, row) => total + Number(row.favorite_count || 0), 0);
  const viewMode = getSelectionViewMode();
  const dashboard = document.createElement("section");
  dashboard.id = ADMIN_DASHBOARD_ID;
  dashboard.style.cssText = "width:min(1180px,100%);margin:0 auto;font-family:'Inter',sans-serif;color:#111;";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem;";
  const heading = document.createElement("div");
  heading.innerHTML = "<div style='color:#777;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;margin-bottom:.35rem;'>Activity</div><h2 style='font-size:2rem;line-height:1.05;margin:0;'>Client Favorite Selections</h2><p style='color:#777;font-size:13px;line-height:1.6;margin:.65rem 0 0;max-width:620px;'>Review the photos your client selected, download one file at a time, or export the full selection as a ZIP folder for editing.</p>";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";

  const zipButton = document.createElement("button");
  zipButton.type = "button";
  zipButton.textContent = "Download Favorites ZIP";
  zipButton.style.cssText = buttonStyle("dark");
  zipButton.onclick = () => saveSelectedZip(rows, zipButton, galleryId);

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy Favorite Names";
  copyButton.style.cssText = buttonStyle();
  copyButton.onclick = async () => {
    const names = rows.map((row) => selectedImageName(row)).join("\n");
    await navigator.clipboard.writeText(names || "No favorite selections yet.");
    copyButton.textContent = "Copied";
    window.setTimeout(() => { copyButton.textContent = "Copy Favorite Names"; }, 1600);
  };

  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.textContent = "Refresh";
  refreshButton.style.cssText = buttonStyle();
  refreshButton.onclick = () => renderActivityWorkspace(true);

  actions.append(zipButton, copyButton, refreshButton);
  header.append(heading, actions);
  dashboard.append(header);

  const metrics = document.createElement("div");
  metrics.style.cssText = "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-bottom:1.25rem;";
  metrics.append(metric("Selected Photos", loading ? "..." : rows.length), metric("Favorite Clicks", loading ? "..." : totalSelections), metric("Download Actions", log.length));
  dashboard.append(metrics);

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:minmax(0,2fr) minmax(300px,1fr);gap:1rem;align-items:start;";

  const listCard = document.createElement("section");
  listCard.style.cssText = "background:#fff;border:1px solid #e5e5e5;padding:1rem;";

  const listHeader = document.createElement("div");
  listHeader.style.cssText = "align-items:flex-start;display:flex;gap:1rem;justify-content:space-between;margin-bottom:.35rem;";
  const listTitle = document.createElement("div");
  listTitle.innerHTML = "<h3 style='font-size:1rem;margin:0 0 .25rem;'>Selected Image Files</h3><p style='color:#777;font-size:12px;line-height:1.5;margin:0;'>Use grid view to see selected photos, or list view for fast filename scanning.</p>";

  const viewActions = document.createElement("div");
  viewActions.style.cssText = "display:flex;gap:6px;flex:0 0 auto;";
  const gridButton = document.createElement("button");
  gridButton.type = "button";
  gridButton.textContent = "Grid";
  gridButton.style.cssText = viewButtonStyle(viewMode === "grid");
  gridButton.onclick = () => {
    setSelectionViewMode("grid");
    renderActivityWorkspace(true);
  };
  const listButton = document.createElement("button");
  listButton.type = "button";
  listButton.textContent = "List";
  listButton.style.cssText = viewButtonStyle(viewMode === "list");
  listButton.onclick = () => {
    setSelectionViewMode("list");
    renderActivityWorkspace(true);
  };
  viewActions.append(gridButton, listButton);
  listHeader.append(listTitle, viewActions);
  listCard.append(listHeader);

  if (loading) {
    const loadingText = document.createElement("p");
    loadingText.textContent = "Loading client favorite selections...";
    loadingText.style.cssText = "color:#777;font-size:13px;";
    listCard.append(loadingText);
  } else if (!rows.length) {
    const empty = document.createElement("p");
    empty.textContent = "No client favorites have been saved for this gallery yet.";
    empty.style.cssText = "color:#777;font-size:13px;";
    listCard.append(empty);
  } else {
    listCard.append(viewMode === "list" ? renderSelectedList(rows, galleryId) : renderSelectedGrid(rows, galleryId));
  }

  const logCard = document.createElement("section");
  logCard.style.cssText = "background:#fff;border:1px solid #e5e5e5;padding:1rem;";
  logCard.innerHTML = "<h3 style='font-size:1rem;margin:0 0 .25rem;'>Download Log</h3><p style='color:#777;font-size:12px;line-height:1.5;margin:0 0 1rem;'>Tracks downloads from this browser while EST-81 is being tested.</p>";
  if (!log.length) {
    const emptyLog = document.createElement("p");
    emptyLog.textContent = "No downloads logged yet.";
    emptyLog.style.cssText = "color:#777;font-size:13px;";
    logCard.append(emptyLog);
  } else {
    log.slice(0, 12).forEach((entry) => {
      const row = document.createElement("div");
      row.style.cssText = "border-top:1px solid #eee;padding:.65rem 0;";
      const label = document.createElement("strong");
      label.textContent = entry.type === "zip" ? `${entry.count} images ZIP` : entry.label;
      label.style.cssText = "display:block;font-size:12px;overflow-wrap:anywhere;";
      const time = document.createElement("span");
      time.textContent = new Date(entry.at).toLocaleString();
      time.style.cssText = "color:#777;font-size:11px;";
      row.append(label, time);
      logCard.append(row);
    });
  }

  grid.append(listCard, logCard);
  dashboard.append(grid);
  return dashboard;
}

function installSidebarSummary(summary) {
  const target = activeSidebarPanelContainer();
  if (!target) return;
  removeElementsById([ADMIN_SUMMARY_PANEL_ID, ...LEGACY_PANEL_IDS]);
  target.prepend(summary);
}

function installMainDashboard(dashboard) {
  const main = activityMainElement();
  if (!main) return;
  removeElementsById([ADMIN_DASHBOARD_ID]);
  [...main.children].forEach((child) => {
    if (child.id === ADMIN_DASHBOARD_ID) return;
    if (!child.dataset.est81MainHidden) {
      child.dataset.est81OriginalDisplay = child.style.display || "";
      child.dataset.est81MainHidden = "true";
    }
    child.style.display = "none";
  });
  main.prepend(dashboard);
}

async function renderActivityWorkspace(force = false) {
  const galleryId = adminGalleryId();
  if (!galleryId || !isActivityTabActive()) {
    removeActivityWorkspace();
    return;
  }

  const hasDashboard = Boolean(document.getElementById(ADMIN_DASHBOARD_ID));
  if (hasDashboard && !force) return;

  installSidebarSummary(buildSidebarSummary([], galleryId, true));
  installMainDashboard(buildActivityDashboard([], galleryId, true));

  try {
    const rows = await loadAdminFavoriteRows(galleryId);
    if (!isActivityTabActive()) return;
    installSidebarSummary(buildSidebarSummary(rows, galleryId, false));
    installMainDashboard(buildActivityDashboard(rows, galleryId, false));
  } catch {
    // Keep the gallery workspace stable if favorites are not ready yet.
  }
}

function syncActivityWorkspace(force = false) {
  if (!adminGalleryId() || !isActivityTabActive()) {
    removeActivityWorkspace();
    return;
  }
  renderActivityWorkspace(force);
}

function installAdminFavoritePanel() {
  if (typeof window === "undefined" || window.__est81AdminFavoritesInstalled) return;
  window.__est81AdminFavoritesInstalled = true;

  document.addEventListener("click", (event) => {
    const tabButton = event.target?.closest?.("button[title]");
    if (!tabButton || !ADMIN_TAB_TITLES.has(tabButton.title)) return;
    if (tabButton.title !== "Activity") removeActivityWorkspace();
    window.setTimeout(() => syncActivityWorkspace(tabButton.title === "Activity"), 90);
  });

  window.setInterval(() => syncActivityWorkspace(false), 700);
}

export function installGalleryFavoriteSync() {
  if (typeof window === "undefined" || window.__galleryFavoriteSyncInstalled) return;
  window.__galleryFavoriteSyncInstalled = true;
  const installedAt = Date.now();

  const nativeSetItem = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (key, value) => {
    const normalizedKey = String(key);
    const previousValue = normalizedKey.startsWith(FAVORITES_STORAGE_PREFIX) ? window.localStorage.getItem(normalizedKey) : null;
    const isInitialEmptyOverwrite = Date.now() - installedAt < 3000 && previousValue && previousValue !== "[]" && value === "[]";
    nativeSetItem(key, isInitialEmptyOverwrite ? previousValue : value);
    if (!normalizedKey.startsWith(FAVORITES_STORAGE_PREFIX) || isInitialEmptyOverwrite) return;
    const galleryId = normalizedKey.slice(FAVORITES_STORAGE_PREFIX.length);
    syncFavoriteIds(galleryId, parseFavoriteIds(previousValue), parseFavoriteIds(value)).catch(() => undefined);
  };

  installAdminFavoritePanel();
}

export function emptyFavoriteSet() {
  return new Set();
}

export { supabase };
