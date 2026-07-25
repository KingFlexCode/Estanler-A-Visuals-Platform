import {
  ACTIVITY_PANEL_ID,
  ADMIN_CACHE_MS,
  SETTINGS_PANEL_ID,
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

async function updateGalleryIdentitySettings(galleryId, changes) {
  const { data, error } = await supabase
    .from("client_galleries")
    .update(changes)
    .eq("id", galleryId)
    .select("id,require_visitor_identity,collect_visitor_name")
    .single();
  if (error) throw error;
  return data;
}

function createToggleRow(title, description, checked, disabled, onChange) {
  const row = document.createElement("label");
  row.style.cssText = `display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-top:1px solid rgba(255,255,255,.09);padding:.9rem 0;opacity:${disabled ? ".5" : "1"};cursor:${disabled ? "not-allowed" : "pointer"};`;
  const copy = document.createElement("span");
  const strong = document.createElement("strong");
  strong.textContent = title;
  strong.style.cssText = "display:block;color:#fff;font-size:12px;margin-bottom:4px;";
  const detail = document.createElement("span");
  detail.textContent = description;
  detail.style.cssText = "display:block;color:#999;font-size:11px;line-height:1.5;";
  copy.append(strong, detail);

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.disabled = disabled;
  input.style.cssText = "width:19px;height:19px;accent-color:#c8a96a;flex:0 0 auto;";
  input.addEventListener("change", () => onChange(input.checked, input));
  row.append(copy, input);
  return row;
}

async function buildSettingsPanel(galleryId) {
  const panel = document.createElement("section");
  panel.id = SETTINGS_PANEL_ID;
  panel.style.cssText = "border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.025);padding:.9rem;color:#fff;font-family:'Inter',sans-serif;";

  const heading = document.createElement("h3");
  heading.textContent = "Visitor Identity";
  heading.style.cssText = "font-size:15px;margin:0 0 .45rem;";
  const description = document.createElement("p");
  description.textContent = "Collect lightweight visitor details before gallery access. No password or permanent client account is created.";
  description.style.cssText = "color:#999;font-size:12px;line-height:1.6;margin:0 0 .4rem;";
  panel.append(heading, description);

  const status = document.createElement("div");
  status.style.cssText = "color:#c8a96a;font-size:11px;min-height:1.2em;margin-top:.35rem;";

  const { data, error } = await supabase
    .from("client_galleries")
    .select("id,require_visitor_identity,collect_visitor_name")
    .eq("id", galleryId)
    .single();
  if (error) {
    status.textContent = "Run the EST-83 Supabase SQL migration to enable these controls.";
    panel.append(status);
    return panel;
  }

  let current = data;
  const renderRows = () => {
    panel.querySelectorAll("[data-est83-toggle]").forEach((element) => element.remove());

    const identityRow = createToggleRow(
      "Require visitor email",
      "Visitors enter an email before viewing or downloading from this gallery.",
      current.require_visitor_identity === true,
      false,
      async (checked, input) => {
        input.disabled = true;
        status.textContent = "Saving...";
        try {
          current = await updateGalleryIdentitySettings(galleryId, {
            require_visitor_identity: checked,
            collect_visitor_name: checked ? current.collect_visitor_name === true : false,
          });
          status.textContent = "Visitor identity settings saved.";
          renderRows();
        } catch (saveError) {
          input.checked = !checked;
          input.disabled = false;
          status.textContent = saveError.message || "Settings could not be saved.";
        }
      },
    );
    identityRow.dataset.est83Toggle = "true";

    const nameRow = createToggleRow(
      "Collect visitor name",
      "Adds an optional name field after email collection is enabled.",
      current.collect_visitor_name === true,
      current.require_visitor_identity !== true,
      async (checked, input) => {
        input.disabled = true;
        status.textContent = "Saving...";
        try {
          current = await updateGalleryIdentitySettings(galleryId, { collect_visitor_name: checked });
          status.textContent = "Visitor identity settings saved.";
          renderRows();
        } catch (saveError) {
          input.checked = !checked;
          input.disabled = false;
          status.textContent = saveError.message || "Settings could not be saved.";
        }
      },
    );
    nameRow.dataset.est83Toggle = "true";

    panel.insertBefore(identityRow, status);
    panel.insertBefore(nameRow, status);
  };

  panel.append(status);
  renderRows();
  return panel;
}

function findHeading(text) {
  return [...document.querySelectorAll("h1,h2,h3,h4")].find((heading) => heading.textContent.trim() === text) || null;
}

export async function syncAdminSettingsPanel() {
  const galleryId = adminGalleryId();
  if (!galleryId) {
    document.getElementById(SETTINGS_PANEL_ID)?.remove();
    return;
  }
  const deliveryHeading = findHeading("Delivery Controls");
  const deliverySection = deliveryHeading?.closest("section");
  if (!deliverySection || document.getElementById(SETTINGS_PANEL_ID) || state.adminSettingsLoading) return;

  state.adminSettingsLoading = true;
  try {
    const panel = await buildSettingsPanel(galleryId);
    if (!document.getElementById(SETTINGS_PANEL_ID) && deliverySection.isConnected) {
      deliverySection.insertAdjacentElement("afterend", panel);
    }
  } finally {
    state.adminSettingsLoading = false;
  }
}

