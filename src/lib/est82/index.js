import { supabase } from "../supabase";

const PANEL_ID = "est82-quick-share-panel";
const FAVORITE_SUMMARY_VIEW = "client_gallery_favorite_summary";
let syncing = false;

function adminGalleryId() {
  if (typeof window === "undefined") return "";
  const match = window.location.pathname.match(/^\/admin\/galleries\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function activityDashboard() {
  return document.getElementById("est81-client-favorites-dashboard");
}

function normalizeRpcObject(data) {
  if (!data) return {};
  return Array.isArray(data) ? data[0] || {} : data;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function publicQuickShareUrl(token = "") {
  if (!token) return "";
  if (typeof window === "undefined") return `/selection/${encodeURIComponent(token)}`;
  return `${window.location.origin}/selection/${encodeURIComponent(token)}`;
}

function buttonStyle(kind = "light") {
  const dark = kind === "dark";
  const danger = kind === "danger";
  return `background:${dark ? "#111" : "transparent"};border:1px solid ${danger ? "#d56f6f" : dark ? "#111" : "#d8d8d8"};color:${danger ? "#a33" : dark ? "#fff" : "#111"};cursor:pointer;font:800 10px 'Inter',sans-serif;letter-spacing:.11em;padding:9px 11px;text-transform:uppercase;`;
}

function createMessage() {
  const message = document.createElement("div");
  message.style.cssText = "color:#777;font:600 11px/1.5 'Inter',sans-serif;min-height:1.4em;margin-top:.65rem;";
  return message;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  }
}

async function loadFavoriteIds(galleryId) {
  const { data, error } = await supabase
    .from(FAVORITE_SUMMARY_VIEW)
    .select("image_id")
    .eq("gallery_id", galleryId);
  if (error) throw error;
  return [...new Set((data || []).map((row) => row.image_id).filter(Boolean))];
}

async function loadQuickShares(galleryId) {
  const { data, error } = await supabase.rpc("get_client_gallery_quick_shares", {
    p_gallery_id: galleryId,
  });
  if (error) throw error;
  return normalizeRpcObject(data);
}

function eventLabel(event) {
  if (event.event_type === "create") return `Created · ${event.item_count || 0} selected photo${Number(event.item_count || 0) === 1 ? "" : "s"}`;
  if (event.event_type === "copy") return "Link copied";
  if (event.event_type === "visit") return "Quick link visited";
  if (event.event_type === "download") return `Download · ${event.item_count || 0} photo${Number(event.item_count || 0) === 1 ? "" : "s"}`;
  if (event.event_type === "disable") return "Link disabled";
  return event.event_type || "Quick link activity";
}

function visitorLabel(event) {
  return event.visitor_name || event.visitor_email || "Anonymous visitor";
}

async function refreshPanel(force = true) {
  await syncQuickSharePanel(force);
}

function buildQuickSharePanel(galleryId, favoriteIds, payload) {
  const links = Array.isArray(payload?.links) ? payload.links : [];
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const panel = document.createElement("section");
  panel.id = PANEL_ID;
  panel.style.cssText = "background:#fff;border:1px solid #e5e5e5;color:#111;font-family:'Inter',sans-serif;margin:0 0 1.25rem;padding:1rem;";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;";
  const heading = document.createElement("div");
  const eyebrow = document.createElement("div");
  eyebrow.textContent = "EST-82 Quick Share";
  eyebrow.style.cssText = "color:#777;font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;margin-bottom:.35rem;";
  const title = document.createElement("h3");
  title.textContent = "Favorite Selection Share Links";
  title.style.cssText = "font-size:1.2rem;line-height:1.1;margin:0;";
  const description = document.createElement("p");
  description.textContent = "Create a frozen public link from all photos currently favorited in this gallery. Later favorite changes do not alter an existing link.";
  description.style.cssText = "color:#777;font-size:12px;line-height:1.55;margin:.5rem 0 0;max-width:720px;";
  heading.append(eyebrow, title, description);

  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.textContent = "Refresh Links";
  refreshButton.style.cssText = buttonStyle();
  refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";
    await refreshPanel(true);
  });
  header.append(heading, refreshButton);
  panel.append(header);

  const createArea = document.createElement("div");
  createArea.style.cssText = "background:#fafafa;border:1px solid #ececec;display:flex;gap:1rem;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:1rem;padding:.9rem;";
  const createMeta = document.createElement("div");
  const favoriteCount = document.createElement("strong");
  favoriteCount.textContent = `${favoriteIds.length} current favorite${favoriteIds.length === 1 ? "" : "s"}`;
  favoriteCount.style.cssText = "display:block;font-size:13px;";
  const snapshotNote = document.createElement("span");
  snapshotNote.textContent = favoriteIds.length ? "A new link will snapshot this current selection." : "Add client favorites before creating a quick share link.";
  snapshotNote.style.cssText = "color:#777;display:block;font-size:11px;margin-top:3px;";
  createMeta.append(favoriteCount, snapshotNote);

  const createActions = document.createElement("div");
  createActions.style.cssText = "display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;";
  const downloadLabel = document.createElement("label");
  downloadLabel.style.cssText = "align-items:center;color:#555;display:flex;font-size:11px;font-weight:700;gap:.45rem;white-space:nowrap;";
  const downloadToggle = document.createElement("input");
  downloadToggle.type = "checkbox";
  downloadToggle.checked = false;
  downloadLabel.append(downloadToggle, document.createTextNode("Allow downloads"));

  const createButton = document.createElement("button");
  createButton.type = "button";
  createButton.textContent = "Create Quick Share Link";
  createButton.disabled = favoriteIds.length === 0;
  createButton.style.cssText = `${buttonStyle("dark")}opacity:${favoriteIds.length ? 1 : 0.45};cursor:${favoriteIds.length ? "pointer" : "not-allowed"};`;
  const createStatus = createMessage();
  createButton.addEventListener("click", async () => {
    createButton.disabled = true;
    createButton.textContent = "Creating...";
    createStatus.textContent = "";
    try {
      const freshFavoriteIds = await loadFavoriteIds(galleryId);
      if (!freshFavoriteIds.length) throw new Error("No current favorites are available to share.");
      const { data, error } = await supabase.rpc("create_client_gallery_quick_share", {
        p_gallery_id: galleryId,
        p_image_ids: freshFavoriteIds,
        p_allow_downloads: downloadToggle.checked,
      });
      if (error) throw error;
      const created = normalizeRpcObject(data);
      createStatus.textContent = `Created ${created.image_count || freshFavoriteIds.length}-photo quick share link.`;
      await refreshPanel(true);
    } catch (createError) {
      createStatus.textContent = createError.message || "Quick share link could not be created.";
      createButton.disabled = favoriteIds.length === 0;
      createButton.textContent = "Create Quick Share Link";
    }
  });

  createActions.append(downloadLabel, createButton);
  createArea.append(createMeta, createActions);
  panel.append(createArea, createStatus);

  const metrics = document.createElement("div");
  metrics.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:.75rem;margin-top:1rem;";
  const activeLinks = links.filter((link) => link.status === "active").length;
  const totalVisits = links.reduce((sum, link) => sum + Number(link.visit_count || 0), 0);
  const totalDownloads = links.reduce((sum, link) => sum + Number(link.download_count || 0), 0);
  const metricValues = [
    ["Quick Links", links.length],
    ["Active", activeLinks],
    ["Visits", totalVisits],
    ["Download Events", totalDownloads],
  ];
  metricValues.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.style.cssText = "border:1px solid #ececec;background:#fff;padding:.8rem;";
    const number = document.createElement("div");
    number.textContent = String(value);
    number.style.cssText = "font-size:1.45rem;font-weight:900;line-height:1;";
    const text = document.createElement("div");
    text.textContent = label;
    text.style.cssText = "color:#777;font-size:9px;font-weight:900;letter-spacing:.12em;margin-top:.4rem;text-transform:uppercase;";
    card.append(number, text);
    metrics.append(card);
  });
  panel.append(metrics);

  const linkSection = document.createElement("div");
  linkSection.style.cssText = "margin-top:1rem;";
  const linkHeading = document.createElement("h4");
  linkHeading.textContent = "Created Quick Links";
  linkHeading.style.cssText = "font-size:.95rem;margin:0 0 .65rem;";
  linkSection.append(linkHeading);

  if (!links.length) {
    const empty = document.createElement("p");
    empty.textContent = "No quick share links have been created for this gallery yet.";
    empty.style.cssText = "color:#777;font-size:12px;margin:.5rem 0;";
    linkSection.append(empty);
  } else {
    const list = document.createElement("div");
    list.style.cssText = "display:grid;gap:.75rem;";
    links.forEach((link, index) => {
      const url = publicQuickShareUrl(link.token);
      const card = document.createElement("article");
      card.style.cssText = `border:1px solid ${link.status === "active" ? "#dedede" : "#ead0d0"};background:${link.status === "active" ? "#fff" : "#fffafa"};padding:.85rem;`;

      const top = document.createElement("div");
      top.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;";
      const info = document.createElement("div");
      info.style.cssText = "min-width:0;flex:1 1 280px;";
      const name = document.createElement("strong");
      name.textContent = `Quick Link ${links.length - index}`;
      name.style.cssText = "display:block;font-size:13px;";
      const state = document.createElement("span");
      state.textContent = link.status === "active" ? "Active" : "Disabled";
      state.style.cssText = `display:inline-block;margin-top:.35rem;border:1px solid ${link.status === "active" ? "#97c9b2" : "#e4aaaa"};color:${link.status === "active" ? "#257a55" : "#a33"};font-size:9px;font-weight:900;letter-spacing:.1em;padding:4px 6px;text-transform:uppercase;`;
      const urlLine = document.createElement("div");
      urlLine.textContent = url;
      urlLine.title = url;
      urlLine.style.cssText = "color:#777;font-size:10px;line-height:1.4;margin-top:.45rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      const date = document.createElement("div");
      date.textContent = `Created ${formatDateTime(link.created_at)} · ${link.image_count || 0} photo${Number(link.image_count || 0) === 1 ? "" : "s"}`;
      date.style.cssText = "color:#888;font-size:10px;margin-top:.3rem;";
      info.append(name, state, urlLine, date);

      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;";
      if (link.status === "active") {
        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.textContent = "Copy Link";
        copyButton.style.cssText = buttonStyle("dark");
        copyButton.addEventListener("click", async () => {
          const original = copyButton.textContent;
          copyButton.disabled = true;
          const copied = await copyText(url);
          if (copied) {
            await supabase.rpc("log_client_gallery_quick_share_copy", {
              p_quick_share_id: link.id,
            });
            copyButton.textContent = "Copied";
          } else {
            copyButton.textContent = "Copy Failed";
          }
          window.setTimeout(() => {
            copyButton.disabled = false;
            copyButton.textContent = original;
            refreshPanel(true);
          }, 1300);
        });

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.textContent = "Open";
        openButton.style.cssText = buttonStyle();
        openButton.addEventListener("click", () => window.open(url, "_blank", "noopener,noreferrer"));

        const disableButton = document.createElement("button");
        disableButton.type = "button";
        disableButton.textContent = "Disable";
        disableButton.style.cssText = buttonStyle("danger");
        disableButton.addEventListener("click", async () => {
          if (!window.confirm("Disable this quick share link? Anyone using it will immediately lose access.")) return;
          disableButton.disabled = true;
          disableButton.textContent = "Disabling...";
          const { error } = await supabase.rpc("disable_client_gallery_quick_share", {
            p_quick_share_id: link.id,
          });
          if (error) {
            disableButton.disabled = false;
            disableButton.textContent = "Disable Failed";
            return;
          }
          await refreshPanel(true);
        });
        actions.append(copyButton, openButton, disableButton);
      }
      top.append(info, actions);
      card.append(top);

      const stats = document.createElement("div");
      stats.style.cssText = "display:flex;gap:.85rem;flex-wrap:wrap;color:#666;font-size:10px;margin-top:.75rem;padding-top:.65rem;border-top:1px solid #eee;";
      stats.append(
        document.createTextNode(`${link.visit_count || 0} visits`),
        document.createTextNode(`${link.copy_count || 0} copies`),
        document.createTextNode(`${link.download_count || 0} download events`),
        document.createTextNode(`${link.downloaded_items || 0} downloaded photos`),
      );
      card.append(stats);

      const permission = document.createElement("label");
      permission.style.cssText = `align-items:center;display:flex;gap:.45rem;color:${link.status === "active" ? "#555" : "#aaa"};font-size:10px;font-weight:700;margin-top:.65rem;`;
      const permissionToggle = document.createElement("input");
      permissionToggle.type = "checkbox";
      permissionToggle.checked = link.allow_downloads === true;
      permissionToggle.disabled = link.status !== "active";
      permissionToggle.addEventListener("change", async () => {
        permissionToggle.disabled = true;
        const { error } = await supabase.rpc("set_client_gallery_quick_share_downloads", {
          p_quick_share_id: link.id,
          p_allow_downloads: permissionToggle.checked,
        });
        if (error) permissionToggle.checked = !permissionToggle.checked;
        await refreshPanel(true);
      });
      permission.append(permissionToggle, document.createTextNode("Allow original photo and ZIP downloads from this link"));
      card.append(permission);
      list.append(card);
    });
    linkSection.append(list);
  }
  panel.append(linkSection);

  const eventSection = document.createElement("div");
  eventSection.style.cssText = "border-top:1px solid #eee;margin-top:1rem;padding-top:1rem;";
  const eventHeading = document.createElement("h4");
  eventHeading.textContent = "Recent Quick Link Activity";
  eventHeading.style.cssText = "font-size:.95rem;margin:0 0 .55rem;";
  eventSection.append(eventHeading);
  if (!events.length) {
    const empty = document.createElement("p");
    empty.textContent = "No quick link activity recorded yet.";
    empty.style.cssText = "color:#777;font-size:12px;margin:.4rem 0;";
    eventSection.append(empty);
  } else {
    const eventList = document.createElement("div");
    eventList.style.cssText = "display:grid;gap:0;max-height:260px;overflow:auto;";
    events.slice(0, 30).forEach((event) => {
      const row = document.createElement("div");
      row.style.cssText = "border-top:1px solid #f0f0f0;padding:.55rem 0;";
      const primary = document.createElement("strong");
      primary.textContent = eventLabel(event);
      primary.style.cssText = "display:block;font-size:11px;";
      const secondary = document.createElement("span");
      secondary.textContent = `${formatDateTime(event.occurred_at)}${event.event_type === "visit" || event.event_type === "download" ? ` · ${visitorLabel(event)}` : ""}`;
      secondary.style.cssText = "color:#888;display:block;font-size:10px;margin-top:2px;";
      row.append(primary, secondary);
      eventList.append(row);
    });
    eventSection.append(eventList);
  }
  panel.append(eventSection);

  return panel;
}

async function syncQuickSharePanel(force = false) {
  const galleryId = adminGalleryId();
  const dashboard = activityDashboard();
  if (!galleryId || !dashboard) {
    document.getElementById(PANEL_ID)?.remove();
    return;
  }
  if (!force && document.getElementById(PANEL_ID)) return;
  if (syncing) return;

  syncing = true;
  try {
    const [favoriteIds, quickSharePayload] = await Promise.all([
      loadFavoriteIds(galleryId),
      loadQuickShares(galleryId),
    ]);
    const nextPanel = buildQuickSharePanel(galleryId, favoriteIds, quickSharePayload);
    const current = document.getElementById(PANEL_ID);
    if (current) current.replaceWith(nextPanel);
    else {
      const insertionPoint = dashboard.children[1] || null;
      dashboard.insertBefore(nextPanel, insertionPoint);
    }
  } catch (error) {
    const current = document.getElementById(PANEL_ID);
    if (!current) {
      const fallback = document.createElement("section");
      fallback.id = PANEL_ID;
      fallback.style.cssText = "background:#fff;border:1px solid #e5e5e5;color:#777;font:400 12px/1.55 'Inter',sans-serif;margin:0 0 1.25rem;padding:1rem;";
      fallback.textContent = error?.message?.includes("function")
        ? "Quick Share Links will appear here after the EST-82 Supabase migration is installed."
        : "Quick Share Links could not be loaded. Refresh the Activity tab to try again.";
      const insertionPoint = dashboard.children[1] || null;
      dashboard.insertBefore(fallback, insertionPoint);
    }
  } finally {
    syncing = false;
  }
}

export function installQuickShareLinks() {
  if (typeof window === "undefined" || window.__est82QuickShareInstalled) return;
  window.__est82QuickShareInstalled = true;

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button[title]");
    if (button?.title === "Activity") {
      window.setTimeout(() => syncQuickSharePanel(true), 180);
    }
  });

  window.setInterval(() => syncQuickSharePanel(false), 900);
  syncQuickSharePanel(false);
}
