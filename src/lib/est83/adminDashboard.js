import {
  ACTIVITY_PANEL_ID,
  ADMIN_CACHE_MS,
  SIDEBAR_PANEL_ID,
  adminGalleryId,
  createButton,
  createMetric,
  createSection,
  displayVisitor,
  downloadTypeLabel,
  formatDateTime,
  normalizeRpcObject,
  state,
  supabase,
} from "./shared.js";
async function loadAdminActivity(galleryId, force = false) {
  if (!galleryId) return null;
  if (!force && state.adminActivity && state.adminGalleryId === galleryId && Date.now() - state.adminActivityLoadedAt < ADMIN_CACHE_MS) return state.adminActivity;
  if (state.adminActivityLoading) return state.adminActivity;

  state.adminActivityLoading = true;
  try {
    const { data, error } = await supabase.rpc("get_client_gallery_activity", { p_gallery_id: galleryId });
    if (error) throw error;
    state.adminGalleryId = galleryId;
    state.adminActivity = normalizeRpcObject(data) || {};
    state.adminActivityLoadedAt = Date.now();
    return state.adminActivity;
  } finally {
    state.adminActivityLoading = false;
  }
}

function addTimelineRows(section, rows, render) {
  if (!rows?.length) {
    const empty = document.createElement("p");
    empty.textContent = "No activity recorded yet.";
    empty.style.cssText = "color:#777;font-size:12px;margin:.8rem 0 0;";
    section.append(empty);
    return;
  }
  const list = document.createElement("div");
  list.style.cssText = "display:grid;gap:0;max-height:330px;overflow:auto;";
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.style.cssText = "border-top:1px solid #eee;padding:.7rem 0;min-width:0;";
    render(item, row);
    list.append(item);
  });
  section.append(list);
}

function appendPrimaryLine(item, text) {
  const line = document.createElement("strong");
  line.textContent = text;
  line.style.cssText = "display:block;font-size:12px;overflow-wrap:anywhere;";
  item.append(line);
}

function appendSecondaryLine(item, text, subdued = false) {
  const line = document.createElement("span");
  line.textContent = text;
  line.style.cssText = `display:block;color:${subdued ? "#999" : "#777"};font-size:${subdued ? "10px" : "11px"};line-height:1.45;margin-top:4px;overflow-wrap:anywhere;`;
  item.append(line);
}

function buildActivityPanel(activity, galleryId) {
  const summary = activity?.summary || {};
  const panel = document.createElement("section");
  panel.id = ACTIVITY_PANEL_ID;
  panel.style.cssText = "font-family:'Inter',sans-serif;color:#111;margin:0 0 1.25rem;";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;";
  const title = document.createElement("div");
  const eyebrow = document.createElement("div");
  eyebrow.textContent = "EST-83 Activity";
  eyebrow.style.cssText = "color:#777;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;margin-bottom:.35rem;";
  const heading = document.createElement("h2");
  heading.textContent = "Visitor & Download Activity";
  heading.style.cssText = "font-size:1.75rem;line-height:1.05;margin:0;";
  const description = document.createElement("p");
  description.textContent = "See who visited, what they downloaded, and which images receive the most download activity.";
  description.style.cssText = "color:#777;font-size:13px;line-height:1.6;margin:.6rem 0 0;max-width:700px;";
  title.append(eyebrow, heading, description);

  const refresh = createButton("Refresh Activity");
  refresh.addEventListener("click", async () => {
    refresh.disabled = true;
    refresh.textContent = "Refreshing...";
    try {
      const next = await loadAdminActivity(galleryId, true);
      document.getElementById(ACTIVITY_PANEL_ID)?.replaceWith(buildActivityPanel(next, galleryId));
      syncAdminSidebar(next);
    } catch {
      refresh.textContent = "Refresh Failed";
    }
  });
  header.append(title, refresh);
  panel.append(header);

  const metrics = document.createElement("div");
  metrics.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:1rem;";
  metrics.append(
    createMetric("Visitors", summary.total_visitors || 0),
    createMetric("Gallery Visits", summary.total_visits || 0),
    createMetric("Download Events", summary.total_downloads || 0),
    createMetric("Images Downloaded", summary.total_downloaded_images || 0),
  );
  panel.append(metrics);

  const topGrid = document.createElement("div");
  topGrid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;align-items:start;margin-bottom:1rem;";

  const visitsSection = createSection("Recent Visits", "Each successful gallery view is tied to a visitor identity when available.");
  addTimelineRows(visitsSection, activity?.visits, (item, visit) => {
    appendPrimaryLine(item, displayVisitor(visit));
    appendSecondaryLine(item, formatDateTime(visit.visited_at));
  });

  const downloadsSection = createSection("Recent Downloads", "Individual images, full-gallery ZIPs, and favorite-selection ZIPs.");
  addTimelineRows(downloadsSection, activity?.downloads, (item, download) => {
    const names = (download.images || []).map((image) => image.file_name || image.title).filter(Boolean);
    const count = Number(download.item_count || names.length || 0);
    appendPrimaryLine(item, `${displayVisitor(download)} · ${downloadTypeLabel(download.download_type)}`);
    appendSecondaryLine(item, `${formatDateTime(download.downloaded_at)} · ${count} image${count === 1 ? "" : "s"}`);
    if (names.length) appendSecondaryLine(item, names.join(", "));
  });

  const visitorsSection = createSection("Visitor Activity", "Totals for each identified or anonymous gallery visitor.");
  addTimelineRows(visitorsSection, activity?.visitors, (item, visitor) => {
    appendPrimaryLine(item, displayVisitor(visitor));
    appendSecondaryLine(item, `${visitor.visit_count || 0} visits · ${visitor.download_events || 0} downloads · ${visitor.favorite_count || 0} favorites`);
    appendSecondaryLine(item, `Last active ${formatDateTime(visitor.last_seen_at)}`, true);
  });

  topGrid.append(visitsSection, downloadsSection, visitorsSection);
  panel.append(topGrid);

  const bottomGrid = document.createElement("div");
  bottomGrid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;align-items:start;";

  const imageSection = createSection("Downloads by Image", "Total downloads and unique visitors for each gallery image.");
  addTimelineRows(imageSection, activity?.image_totals, (item, image) => {
    appendPrimaryLine(item, image.file_name || image.title || image.image_id);
    appendSecondaryLine(item, `${image.download_count || 0} downloads · ${image.visitor_count || 0} visitor${Number(image.visitor_count || 0) === 1 ? "" : "s"}`);
  });

  const favoriteSection = createSection("Favorites by Visitor", "EST-74 selections remain connected to each browser visitor and identified email.");
  addTimelineRows(favoriteSection, activity?.favorite_visitors, (item, visitor) => {
    const names = (visitor.images || []).map((image) => image.file_name || image.title).filter(Boolean);
    appendPrimaryLine(item, `${displayVisitor(visitor)} · ${visitor.favorite_count || names.length} favorites`);
    if (names.length) appendSecondaryLine(item, names.join(", "));
  });

  bottomGrid.append(imageSection, favoriteSection);
  panel.append(bottomGrid);
  return panel;
}

function syncAdminSidebar(activity) {
  const favoriteSummary = document.getElementById("est81-client-favorites-summary-panel");
  if (!favoriteSummary) return;
  document.getElementById(SIDEBAR_PANEL_ID)?.remove();
  const summary = activity?.summary || {};
  const panel = document.createElement("div");
  panel.id = SIDEBAR_PANEL_ID;
  panel.style.cssText = "border-top:1px solid rgba(255,255,255,.12);color:#cfcfcf;font:400 11px/1.55 'Inter',sans-serif;margin-top:.8rem;padding-top:.8rem;";
  const label = document.createElement("strong");
  label.textContent = "Visitor Tracking";
  label.style.cssText = "display:block;color:#c8a96a;font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px;";
  const totals = document.createTextNode(`${summary.total_visitors || 0} visitors · ${summary.total_visits || 0} visits · ${summary.total_downloads || 0} downloads`);
  panel.append(label, totals);
  favoriteSummary.append(panel);
}

export async function syncAdminActivityPanel() {
  const galleryId = adminGalleryId();
  const dashboard = document.getElementById("est81-client-favorites-dashboard");
  if (!galleryId || !dashboard) {
    document.getElementById(ACTIVITY_PANEL_ID)?.remove();
    document.getElementById(SIDEBAR_PANEL_ID)?.remove();
    return;
  }
  if (document.getElementById(ACTIVITY_PANEL_ID)) return;

  try {
    const activity = await loadAdminActivity(galleryId, false);
    dashboard.prepend(buildActivityPanel(activity, galleryId));
    syncAdminSidebar(activity);
  } catch {
    const panel = createSection("Visitor & Download Activity", "Run the EST-83 Supabase SQL migration to enable database-backed visitor and download reporting.");
    panel.id = ACTIVITY_PANEL_ID;
    panel.style.marginBottom = "1rem";
    dashboard.prepend(panel);
  }
}

export function resetAdminActivityCache() {
  state.adminActivityLoadedAt = 0;
}

export function syncAdminTracking() {
  syncAdminSettingsPanel();
  syncAdminActivityPanel();
}
