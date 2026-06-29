import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Spinner } from "../../components/UI";
import { COLORS } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { AdminNav } from "./Dashboard";

const CLIENT_GALLERY_BUCKET = "client-galleries";
const STATUS_OPTIONS = ["draft", "published", "archived"];
const SIDEBAR_TABS = [
  { id: "photos", label: "Photos", icon: "▦" },
  { id: "design", label: "Design", icon: "◈" },
  { id: "settings", label: "Settings", icon: "⚙" },
  { id: "activity", label: "Activity", icon: "◷" },
];
const COVER_STYLES = [
  { id: "center", label: "Center", description: "Full-width cover with centered title." },
  { id: "left", label: "Left", description: "Title aligned to the left edge." },
  { id: "frame", label: "Frame", description: "Inset frame with clean border treatment." },
  { id: "stripe", label: "Stripe", description: "Minimal editorial stripe overlay." },
];
const GRID_STYLES = ["masonry", "square", "editorial"];
const TYPOGRAPHY_STYLES = ["classic", "modern", "editorial"];

const pageStyle = { minHeight: "100vh", background: COLORS.bg, color: COLORS.white };
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.035)",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.white,
  padding: "10px 12px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  outline: "none",
};
const buttonStyle = {
  background: "transparent",
  border: `1px solid ${COLORS.border}`,
  color: COLORS.white,
  cursor: "pointer",
  padding: "9px 11px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};
const primaryButtonStyle = { ...buttonStyle, background: COLORS.gold, border: "none", color: COLORS.bg };
const whiteMenuButton = {
  display: "block",
  width: "100%",
  background: "transparent",
  border: "none",
  color: "#222",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  padding: "0.85rem 1rem",
  textAlign: "left",
};

function slugify(value = "") {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function formatDate(value) {
  if (!value) return "No event date";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes <= 0 ? `${remainingSeconds}s` : `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}
function getFileExtension(fileName = "", fallback = "jpg") {
  return fileName.split(".").pop()?.toLowerCase() || fallback;
}
function sanitizeFileName(name = "") {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `client-gallery-photo-${Date.now()}`
  );
}
function getGalleryPhotoUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(CLIENT_GALLERY_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}
function getPhotoPreviewUrl(photo) {
  return getGalleryPhotoUrl(photo?.thumbnail_path || photo?.display_path || photo?.original_path);
}
function getCoverUrl(photo) {
  return getGalleryPhotoUrl(photo?.display_path || photo?.thumbnail_path || photo?.original_path);
}
function sortByOrder(items) {
  return [...items].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
}
function isFinalUploadStatus(status) {
  return status === "done" || status === "failed" || status === "skipped";
}
function photoName(photo) {
  return (photo?.file_name || photo?.title || photo?.id || "").toString();
}
function photoUploadTime(photo) {
  return new Date(photo?.uploaded_at || photo?.created_at || 0).getTime() || 0;
}
function samePhotoOrder(a, b) {
  return a.length === b.length && a.every((photo, index) => photo.id === b[index]?.id);
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
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(image, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) throw new Error("Could not create optimized gallery image.");
    return { blob, width, height, size: blob.size };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function FieldLabel({ children }) {
  return <span style={{ display: "block", marginBottom: 6, color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase" }}>{children}</span>;
}
function TextField({ label, value, onChange, type = "text", placeholder = "" }) {
  return <label><FieldLabel>{label}</FieldLabel><input type={type} value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={inputStyle} /></label>;
}
function StatusPill({ status, onClick }) {
  const published = status === "published";
  const color = published ? "#4ade80" : status === "archived" ? COLORS.muted : COLORS.gold;
  return <button type="button" onClick={onClick} style={{ ...buttonStyle, borderRadius: 999, borderColor: color, color, padding: "5px 10px" }} title="Click to toggle Published / Hidden">{published ? "Published" : "Hidden"}</button>;
}
function EmptyState({ children }) {
  return <div style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.6, padding: "2.25rem 1rem", textAlign: "center" }}>{children}</div>;
}
function SettingCard({ active, title, description, onClick }) {
  return <button type="button" onClick={onClick} style={{ textAlign: "left", background: active ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.025)", border: `1px solid ${active ? COLORS.gold : COLORS.border}`, color: COLORS.white, cursor: "pointer", padding: "0.85rem" }}><div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</div>{description && <div style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>{description}</div>}</button>;
}
function UploadProgressPanel({ queue, uploading, elapsedSeconds }) {
  if (!queue.length) return null;
  const completedCount = queue.filter((item) => isFinalUploadStatus(item.status)).length;
  const successfulCount = queue.filter((item) => item.status === "done").length;
  const failedCount = queue.filter((item) => item.status === "failed").length;
  const skippedCount = queue.filter((item) => item.status === "skipped").length;
  const totalProgress = Math.round(queue.reduce((total, item) => total + Number(item.progress || 0), 0) / queue.length);
  const activeItem = queue.find((item) => uploading && !isFinalUploadStatus(item.status) && item.status !== "ready") || null;
  const remaining = uploading && totalProgress > 5 ? Math.max(0, Math.round((elapsedSeconds * (100 - totalProgress)) / totalProgress)) : null;
  return <div style={{ border: `1px solid ${COLORS.border}`, background: "rgba(255,255,255,0.025)", padding: "0.85rem" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: 8 }}><div><FieldLabel>Upload Progress</FieldLabel><div style={{ color: COLORS.white, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 800 }}>{uploading ? "Uploading gallery photos" : "Upload complete"}</div>{activeItem && <div style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 11, marginTop: 4 }}>Current: {activeItem.name}</div>}</div><div style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 11, textAlign: "right" }}><div>{completedCount}/{queue.length}</div><div>{formatDuration(elapsedSeconds)}</div>{remaining !== null && <div>~{formatDuration(remaining)} left</div>}</div></div><div style={{ height: 8, border: `1px solid ${COLORS.border}`, background: "rgba(255,255,255,0.04)", overflow: "hidden", marginBottom: 8 }}><div style={{ width: `${Math.max(0, Math.min(100, totalProgress))}%`, height: "100%", background: COLORS.gold, transition: "width 0.2s ease" }} /></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 11 }}><div>Uploaded: {successfulCount}</div><div>Skipped: {skippedCount}</div><div>Failed: {failedCount}</div></div></div>;
}

function GalleryPreview({ gallery, sections, photos, coverPhoto, previewMode }) {
  const visibleSections = sortByOrder(sections).filter((section) => section.is_visible !== false);
  const themeColor = gallery.theme_color || COLORS.gold;
  const coverStyle = gallery.cover_style || "center";
  const gridStyle = gallery.grid_style || "masonry";
  const typography = gallery.typography_style || "classic";
  const coverUrl = getCoverUrl(coverPhoto);
  const objectPosition = `${gallery.cover_focal_x ?? 50}% ${gallery.cover_focal_y ?? 50}%`;
  const isMobile = previewMode === "mobile";
  const headingFont = typography === "modern" ? "'Inter', sans-serif" : "'Playfair Display', serif";
  const titleAlign = coverStyle === "left" ? "left" : "center";

  const renderSectionPhotos = (sectionPhotos) => {
    if (gridStyle === "square") {
      return <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, minmax(0, 1fr))`, gap: 8, overflow: "hidden" }}>{sectionPhotos.map((photo) => <div key={photo.id} style={{ aspectRatio: "1 / 1", background: "#f2f2f2", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}><img src={getPhotoPreviewUrl(photo)} alt={photo.alt_text || photo.title || "Gallery photo"} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /></div>)}</div>;
    }
    return <div style={{ columnCount: isMobile ? 2 : 3, columnGap: gridStyle === "editorial" ? 14 : 8, width: "100%", overflow: "hidden" }}>{sectionPhotos.map((photo) => <img key={photo.id} src={getPhotoPreviewUrl(photo)} alt={photo.alt_text || photo.title || "Gallery photo"} style={{ width: "100%", height: "auto", display: "block", breakInside: "avoid", marginBottom: gridStyle === "editorial" ? 14 : 8 }} />)}</div>;
  };

  return <div style={{ width: "100%", maxWidth: isMobile ? 390 : 980, margin: "0 auto", background: "#fff", color: "#111", boxShadow: "0 28px 90px rgba(0,0,0,0.35)", overflow: "hidden", transition: "max-width 0.25s ease" }}><section style={{ minHeight: isMobile ? 330 : 420, background: coverUrl ? `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.48)), url(${coverUrl}) ${objectPosition} / cover` : "linear-gradient(135deg, #1c1c1c, #3b3b3b)", display: "flex", alignItems: coverStyle === "stripe" ? "center" : "flex-end", justifyContent: coverStyle === "left" ? "flex-start" : "center", padding: isMobile ? "2rem" : "3.5rem", boxSizing: "border-box", border: coverStyle === "frame" ? "18px solid #fff" : "none", position: "relative" }}>{coverStyle === "stripe" && <span style={{ position: "absolute", left: "12%", right: "12%", top: "50%", height: 1, background: "rgba(255,255,255,0.75)" }} />}<div style={{ textAlign: titleAlign, color: "#fff", maxWidth: 760 }}><div style={{ color: themeColor, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", marginBottom: "0.75rem", textTransform: "uppercase" }}>{formatDate(gallery.event_date)}</div><h1 style={{ fontFamily: headingFont, fontSize: isMobile ? "2rem" : "3.1rem", fontWeight: typography === "modern" ? 700 : 600, letterSpacing: typography === "editorial" ? "0.18em" : "0.02em", lineHeight: 1, margin: 0, textTransform: typography === "editorial" ? "uppercase" : "none" }}>{gallery.title || "Untitled Gallery"}</h1>{gallery.client_name && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, letterSpacing: "0.08em", margin: "1rem 0 0", textTransform: "uppercase" }}>{gallery.client_name}</p>}</div></section><section style={{ padding: isMobile ? "1.25rem" : "2rem", overflow: "hidden" }}>{visibleSections.length === 0 && <div style={{ color: "#777", fontFamily: "'Inter', sans-serif", textAlign: "center" }}>No visible photo sets yet.</div>}{visibleSections.map((section) => { const sectionPhotos = sortByOrder(photos).filter((photo) => photo.section_id === section.id); return <div key={section.id} style={{ marginBottom: isMobile ? "1.75rem" : "2.75rem", overflow: "hidden" }}><h2 style={{ color: "#111", fontFamily: headingFont, fontSize: isMobile ? "1.15rem" : "1.45rem", fontWeight: 600, margin: "0 0 1rem" }}>{section.title}</h2>{renderSectionPhotos(sectionPhotos)}</div>; })}</section></div>;
}

export default function GalleryEditor() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [gallery, setGallery] = useState(null);
  const [sections, setSections] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadStartedAt, setUploadStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("photos");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [newSection, setNewSection] = useState("");
  const [targetSection, setTargetSection] = useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [moveTargetSectionId, setMoveTargetSectionId] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const [workspaceGridSize, setWorkspaceGridSize] = useState("large");
  const [showFilenames, setShowFilenames] = useState(true);
  const [workspaceViewMode, setWorkspaceViewMode] = useState("grid");

  const coverPhoto = useMemo(() => photos.find((photo) => photo.id === gallery?.cover_image_id) || photos[0] || null, [gallery?.cover_image_id, photos]);
  const activeSection = useMemo(() => sections.find((section) => section.id === targetSection) || sections[0] || null, [sections, targetSection]);
  const activeSectionPhotos = useMemo(() => sortByOrder(photos.filter((photo) => photo.section_id === activeSection?.id)), [activeSection?.id, photos]);
  const selectedPhotos = useMemo(() => photos.filter((photo) => selectedPhotoIds.includes(photo.id)), [photos, selectedPhotoIds]);
  const contextPhoto = contextMenu?.photoId ? photos.find((photo) => photo.id === contextMenu.photoId) : null;

  useEffect(() => { loadWorkspace(); }, [galleryId]);
  useEffect(() => {
    if (!uploading || !uploadStartedAt) return undefined;
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - uploadStartedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [uploading, uploadStartedAt]);
  useEffect(() => { setMoveTargetSectionId(activeSection?.id || ""); }, [activeSection?.id]);

  async function loadWorkspace() {
    setLoading(true); setError("");
    const [galleryResult, sectionResult, photoResult] = await Promise.all([
      supabase.from("client_galleries").select("*").eq("id", galleryId).single(),
      supabase.from("client_gallery_sections").select("*").eq("gallery_id", galleryId).order("display_order", { ascending: true }),
      supabase.from("client_gallery_images").select("*").eq("gallery_id", galleryId).order("display_order", { ascending: true }),
    ]);
    if (galleryResult.error) { setError(galleryResult.error.message); setGallery(null); } else setGallery(galleryResult.data);
    if (sectionResult.error) { setError(sectionResult.error.message); setSections([]); } else { const nextSections = sectionResult.data || []; setSections(nextSections); setTargetSection((current) => current || nextSections[0]?.id || ""); }
    if (photoResult.error) { setError(photoResult.error.message); setPhotos([]); } else setPhotos(photoResult.data || []);
    setLoading(false);
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate("/admin/login"); };
  const flash = (message) => { setNotice(message); setError(""); };
  const setGalleryField = (key, value) => setGallery((current) => ({ ...current, [key]: value }));
  const updateQueueItem = (index, patch) => setUploadQueue((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));

  function closeWorkspaceMenus() {
    setContextMenu(null);
    setActionMenuOpen(false);
    setSortMenuOpen(false);
    setGridMenuOpen(false);
  }

  function applyLocalPhotoOrder(orderedPhotos) {
    const orderedById = orderedPhotos.reduce((map, photo, index) => ({ ...map, [photo.id]: { ...photo, display_order: index } }), {});
    setPhotos((current) => sortByOrder(current.map((photo) => orderedById[photo.id] || photo)));
  }

  function getDropPlacement(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (workspaceViewMode === "list") {
      return event.clientY >= rect.top + rect.height * 0.35 ? "after" : "before";
    }
    return event.clientX >= rect.left + rect.width * 0.35 ? "after" : "before";
  }

  function getDraggedOrder(dropTargetId, sourceOrder = activeSectionPhotos, placement = "before") {
    if (!draggedPhotoId || !activeSection) return null;
    const draggedIsSelected = selectedPhotoIds.includes(draggedPhotoId);
    const movingIds = draggedIsSelected && selectedPhotoIds.length > 1 ? selectedPhotoIds : [draggedPhotoId];
    const movingSet = new Set(movingIds);
    if (movingSet.has(dropTargetId)) return null;
    const movingPhotos = sourceOrder.filter((photo) => movingSet.has(photo.id));
    const remainingPhotos = sourceOrder.filter((photo) => !movingSet.has(photo.id));
    const dropIndex = remainingPhotos.findIndex((photo) => photo.id === dropTargetId);
    if (dropIndex < 0 || movingPhotos.length === 0) return null;
    const insertIndex = placement === "after" ? dropIndex + 1 : dropIndex;
    return [...remainingPhotos.slice(0, insertIndex), ...movingPhotos, ...remainingPhotos.slice(insertIndex)];
  }

  function previewDraggedPhoto(event, dropTargetId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const placement = getDropPlacement(event);
    setDragOverPhotoId(dropTargetId);
    const nextOrder = getDraggedOrder(dropTargetId, activeSectionPhotos, placement);
    if (!nextOrder || samePhotoOrder(nextOrder, activeSectionPhotos)) return;
    applyLocalPhotoOrder(nextOrder);
  }

  function togglePhotoSelection(photoId, event) {
    closeWorkspaceMenus();
    if (event?.shiftKey && selectionAnchorId) {
      const anchorIndex = activeSectionPhotos.findIndex((photo) => photo.id === selectionAnchorId);
      const currentIndex = activeSectionPhotos.findIndex((photo) => photo.id === photoId);
      if (anchorIndex >= 0 && currentIndex >= 0) {
        const [start, end] = [Math.min(anchorIndex, currentIndex), Math.max(anchorIndex, currentIndex)];
        setSelectedPhotoIds(activeSectionPhotos.slice(start, end + 1).map((photo) => photo.id));
        return;
      }
    }
    if (event?.metaKey || event?.ctrlKey) {
      setSelectedPhotoIds((current) => current.includes(photoId) ? current.filter((id) => id !== photoId) : [...current, photoId]);
      setSelectionAnchorId(photoId);
      return;
    }
    setSelectedPhotoIds((current) => (current.length === 1 && current[0] === photoId ? [] : [photoId]));
    setSelectionAnchorId(photoId);
  }

  async function persistPhotoOrder(orderedPhotos, { optimistic = true } = {}) {
    const normalizedOrder = orderedPhotos.map((photo, index) => ({ ...photo, display_order: index }));
    if (optimistic) applyLocalPhotoOrder(normalizedOrder);
    const results = await Promise.all(normalizedOrder.map((photo, index) => supabase.from("client_gallery_images").update({ display_order: index }).eq("id", photo.id).select("*").single()));
    const failed = results.find((result) => result.error);
    if (failed) { setError(failed.error.message); loadWorkspace(); return false; }
    const updatedById = results.reduce((map, result) => ({ ...map, [result.data.id]: result.data }), {});
    setPhotos((current) => sortByOrder(current.map((photo) => updatedById[photo.id] || photo)));
    return true;
  }

  async function sortActiveSet(mode) {
    if (!activeSectionPhotos.length) return;
    let nextOrder = [...activeSectionPhotos];
    if (mode === "uploaded-desc") nextOrder.sort((a, b) => photoUploadTime(b) - photoUploadTime(a));
    if (mode === "uploaded-asc") nextOrder.sort((a, b) => photoUploadTime(a) - photoUploadTime(b));
    if (mode === "name-asc") nextOrder.sort((a, b) => photoName(a).localeCompare(photoName(b)));
    if (mode === "name-desc") nextOrder.sort((a, b) => photoName(b).localeCompare(photoName(a)));
    if (mode === "random") nextOrder.sort(() => Math.random() - 0.5);
    if (await persistPhotoOrder(nextOrder)) flash("Photo set sorted.");
    setSortMenuOpen(false);
  }

  async function reorderDraggedPhoto(event, dropTargetId) {
    event.preventDefault();
    const placement = getDropPlacement(event);
    const nextOrder = getDraggedOrder(dropTargetId, activeSectionPhotos, placement) || activeSectionPhotos;
    const movingCount = selectedPhotoIds.includes(draggedPhotoId) ? selectedPhotoIds.length : 1;
    setDraggedPhotoId(null);
    setDragOverPhotoId(null);
    if (!nextOrder.length) return;
    if (await persistPhotoOrder(nextOrder, { optimistic: false })) {
      flash(movingCount > 1 ? "Selected photos moved." : "Photo order updated.");
    }
  }

  async function movePhotoIdsByStep(photoIds, direction) {
    const cleanIds = photoIds.filter(Boolean);
    if (!cleanIds.length || !activeSection) return;
    const selectedSet = new Set(cleanIds);
    const selectedIndexes = activeSectionPhotos.map((photo, index) => selectedSet.has(photo.id) ? index : -1).filter((index) => index >= 0);
    if (!selectedIndexes.length) return;
    const selected = activeSectionPhotos.filter((photo) => selectedSet.has(photo.id));
    const remaining = activeSectionPhotos.filter((photo) => !selectedSet.has(photo.id));
    const firstSelectedIndex = Math.min(...selectedIndexes);
    const insertIndex = direction === "up" ? Math.max(0, firstSelectedIndex - 1) : Math.min(remaining.length, firstSelectedIndex + 1);
    const nextOrder = [...remaining.slice(0, insertIndex), ...selected, ...remaining.slice(insertIndex)];
    if (samePhotoOrder(nextOrder, activeSectionPhotos)) return;
    if (await persistPhotoOrder(nextOrder)) flash(direction === "up" ? "Moved selected photos up." : "Moved selected photos down.");
    setActionMenuOpen(false);
  }

  async function moveSelectedByStep(direction) {
    await movePhotoIdsByStep(selectedPhotoIds, direction);
  }

  async function saveGallery() {
    if (!gallery?.title?.trim()) { setError("Gallery title is required."); return; }
    setSaving(true);
    const payload = { title: gallery.title.trim(), slug: slugify(gallery.slug || gallery.title), client_name: gallery.client_name || null, client_email: gallery.client_email || null, event_date: gallery.event_date || null, description: gallery.description || null, status: gallery.status || "draft", cover_image_id: gallery.cover_image_id || null, cover_style: gallery.cover_style || "center", theme_color: gallery.theme_color || "#C8A96A", grid_style: gallery.grid_style || "masonry", typography_style: gallery.typography_style || "classic", cover_focal_x: Number(gallery.cover_focal_x ?? 50), cover_focal_y: Number(gallery.cover_focal_y ?? 50) };
    const { data, error: updateError } = await supabase.from("client_galleries").update(payload).eq("id", gallery.id).select("*").single();
    setSaving(false);
    if (updateError) setError(updateError.message); else { setGallery(data); flash("Gallery workspace saved."); }
  }
  async function toggleGalleryVisibility() {
    const nextStatus = gallery.status === "published" ? "draft" : "published";
    const { data, error: updateError } = await supabase.from("client_galleries").update({ status: nextStatus }).eq("id", gallery.id).select("*").single();
    if (updateError) setError(updateError.message); else { setGallery(data); flash(nextStatus === "published" ? "Gallery is now published." : "Gallery is now hidden."); }
  }
  async function deleteGallery() {
    const title = gallery.title || "Untitled Gallery";
    const confirmed = window.prompt(`Delete "${title}"? This will remove the gallery, photo sets, and gallery photo records. Type DELETE to continue.`);
    if (confirmed !== "DELETE") return;
    const { error: deleteError } = await supabase.from("client_galleries").delete().eq("id", gallery.id);
    if (deleteError) setError(deleteError.message); else navigate("/admin/galleries");
  }
  async function addSection() {
    const title = newSection.trim(); if (!title) return;
    const displayOrder = sections.length ? Math.max(...sections.map((section) => section.display_order || 0)) + 1 : 0;
    const { data, error: insertError } = await supabase.from("client_gallery_sections").insert({ gallery_id: galleryId, title, display_order: displayOrder, is_visible: true }).select("*").single();
    if (insertError) { setError(insertError.message); return; }
    setSections((current) => sortByOrder([...current, data])); setTargetSection(data.id); setMoveTargetSectionId(data.id); setNewSection(""); setSelectedPhotoIds([]); setSelectionAnchorId(null); flash("Photo set added.");
  }
  async function saveSection(section, updates = {}) {
    const { data, error: updateError } = await supabase.from("client_gallery_sections").update({ title: section.title || "Untitled Set", is_visible: section.is_visible !== false, ...updates }).eq("id", section.id).select("*").single();
    if (updateError) setError(updateError.message); else { setSections((current) => current.map((item) => (item.id === section.id ? data : item))); flash("Photo set saved."); }
  }

  async function uploadSelectedFiles(fileList) {
    const selectedFiles = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!selectedFiles.length) return;
    const sectionId = targetSection || sections[0]?.id;
    if (!sectionId) { setError("Create a photo set before uploading images."); return; }
    const startedAt = Date.now();
    const existingSectionPhotos = photos.filter((photo) => photo.section_id === sectionId);
    const safeGallerySlug = slugify(gallery.slug || gallery.title || gallery.id);
    const insertedPhotos = [];
    const failedUploads = [];
    let firstCoverId = gallery.cover_image_id || null;
    setUploading(true); setUploadStartedAt(startedAt); setElapsedSeconds(0); setError(""); setNotice(`Uploading ${selectedFiles.length} image${selectedFiles.length === 1 ? "" : "s"}...`);
    setUploadQueue(selectedFiles.map((file) => ({ name: file.name, status: "ready", message: "Ready", progress: 0 })));
    for (const [index, file] of selectedFiles.entries()) {
      const cleanName = sanitizeFileName(file.name);
      const extension = getFileExtension(file.name);
      const uniqueName = `${Date.now()}-${index}-${cleanName}`;
      const basePath = `${safeGallerySlug}/${sectionId}`;
      const originalPath = `${basePath}/originals/${uniqueName}.${extension}`;
      const displayPath = `${basePath}/display/${uniqueName}.webp`;
      const thumbnailPath = `${basePath}/thumbnails/${uniqueName}.webp`;
      try {
        updateQueueItem(index, { status: "processing", message: "Creating display + thumbnail", progress: 12 });
        const [displayImage, thumbnailImage] = await Promise.all([resizeImage(file, 2200, 0.84), resizeImage(file, 720, 0.78)]);
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
        const { data: insertedPhoto, error: insertError } = await supabase.from("client_gallery_images").insert({ gallery_id: galleryId, section_id: sectionId, file_name: file.name, title, alt_text: title, original_path: originalPath, display_path: displayPath, thumbnail_path: thumbnailPath, display_order: existingSectionPhotos.length + insertedPhotos.length, original_size_bytes: file.size, display_size_bytes: displayImage.size, thumbnail_size_bytes: thumbnailImage.size, display_width: displayImage.width, display_height: displayImage.height, thumbnail_width: thumbnailImage.width, thumbnail_height: thumbnailImage.height, mime_type: file.type, focal_x: 50, focal_y: 50 }).select("*").single();
        if (insertError) throw insertError;
        insertedPhotos.push(insertedPhoto); setPhotos((current) => sortByOrder([...current, insertedPhoto]));
        if (!firstCoverId) { firstCoverId = insertedPhoto.id; await setCoverImage(insertedPhoto.id, false); }
        updateQueueItem(index, { status: "done", message: "Uploaded", progress: 100 });
      } catch (uploadError) {
        console.error(uploadError); failedUploads.push(file.name); updateQueueItem(index, { status: "failed", message: uploadError.message || "Upload failed", progress: 100 }); setError(uploadError.message || "One image failed to upload.");
      }
    }
    setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000))); setUploadStartedAt(null); setUploading(false);
    flash(failedUploads.length > 0 ? `Upload finished with ${failedUploads.length} failed image${failedUploads.length === 1 ? "" : "s"}.` : `Done. Uploaded ${insertedPhotos.length} image${insertedPhotos.length === 1 ? "" : "s"}.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function removePhoto(photoId) {
    const { error: deleteError } = await supabase.from("client_gallery_images").delete().eq("id", photoId);
    if (deleteError) { setError(deleteError.message); return; }
    setPhotos((current) => current.filter((photo) => photo.id !== photoId)); setSelectedPhotoIds((current) => current.filter((id) => id !== photoId)); if (gallery.cover_image_id === photoId) setGalleryField("cover_image_id", null); flash("Photo removed from this client gallery.");
  }
  async function deleteSelectedPhotos() {
    if (!selectedPhotoIds.length) return;
    const ok = window.confirm(`Delete ${selectedPhotoIds.length} selected photo${selectedPhotoIds.length === 1 ? "" : "s"} from this gallery?`);
    if (!ok) return;
    const { error: deleteError } = await supabase.from("client_gallery_images").delete().in("id", selectedPhotoIds);
    if (deleteError) { setError(deleteError.message); return; }
    setPhotos((current) => current.filter((photo) => !selectedPhotoIds.includes(photo.id))); if (selectedPhotoIds.includes(gallery.cover_image_id)) setGalleryField("cover_image_id", null); setSelectedPhotoIds([]); setSelectionAnchorId(null); setActionMenuOpen(false); flash("Selected photos removed from this gallery.");
  }
  async function moveSelectedToSection(sectionId) {
    if (!selectedPhotoIds.length || !sectionId) return;
    const destinationPhotos = photos.filter((photo) => photo.section_id === sectionId && !selectedPhotoIds.includes(photo.id));
    const results = await Promise.all(selectedPhotoIds.map((photoId, index) => supabase.from("client_gallery_images").update({ section_id: sectionId, display_order: destinationPhotos.length + index }).eq("id", photoId).select("*").single()));
    const failed = results.find((result) => result.error);
    if (failed) { setError(failed.error.message); return; }
    const updatedById = results.reduce((map, result) => ({ ...map, [result.data.id]: result.data }), {});
    setPhotos((current) => current.map((photo) => updatedById[photo.id] || photo)); setTargetSection(sectionId); setSelectedPhotoIds([]); setSelectionAnchorId(null); setContextMenu(null); setActionMenuOpen(false); flash("Selected photos moved to another set.");
  }
  async function setCoverImage(photoId, showNotice = true) {
    const { data, error: updateError } = await supabase.from("client_galleries").update({ cover_image_id: photoId }).eq("id", galleryId).select("*").single();
    if (updateError) setError(updateError.message); else { setGallery(data); if (showNotice) flash("Cover photo updated."); }
    setActionMenuOpen(false);
  }
  function openPreview() { if (gallery?.slug) window.open(`/gallery/${gallery.slug}`, "_blank", "noopener,noreferrer"); }
  function openPhoto(photo) { const imageUrl = getGalleryPhotoUrl(photo?.display_path || photo?.original_path || photo?.thumbnail_path); if (imageUrl) window.open(imageUrl, "_blank", "noopener,noreferrer"); }
  async function copyFilenames(photosToCopy = selectedPhotos) { const filenames = photosToCopy.map((photo) => photo.file_name || photo.title || photo.id).join("\n"); if (filenames) { await navigator.clipboard?.writeText(filenames); flash("Filenames copied."); } setContextMenu(null); setActionMenuOpen(false); }
  function showLaterNotice(feature) { flash(`${feature} belongs to a later client gallery issue.`); setContextMenu(null); setActionMenuOpen(false); }

  function renderPhotosPanel() {
    return <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}><div><FieldLabel>Upload Gallery Photos</FieldLabel><input ref={fileInputRef} type="file" multiple accept="image/*" onChange={(event) => uploadSelectedFiles(event.target.files)} style={{ display: "none" }} /><button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || !activeSection} style={{ ...primaryButtonStyle, width: "100%", opacity: uploading || !activeSection ? 0.55 : 1, cursor: uploading || !activeSection ? "not-allowed" : "pointer" }}>{uploading ? "Uploading..." : "+ Upload Photos"}</button><p style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.6, margin: "0.65rem 0 0" }}>Uploads go into the selected photo set and belong only to this client gallery.</p></div><UploadProgressPanel queue={uploadQueue} uploading={uploading} elapsedSeconds={elapsedSeconds} /><label><FieldLabel>Upload Into Photo Set</FieldLabel><select value={targetSection} onChange={(event) => setTargetSection(event.target.value)} style={inputStyle}>{sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label><div><FieldLabel>Create Photo Set</FieldLabel><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><input value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder="Reception, Ceremony, Portraits..." style={inputStyle} /><button type="button" onClick={addSection} style={buttonStyle}>Add</button></div></div><div><FieldLabel>Photo Sets</FieldLabel><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{sections.length === 0 && <EmptyState>Create a photo set before uploading images.</EmptyState>}{sortByOrder(sections).map((section) => { const count = photos.filter((photo) => photo.section_id === section.id).length; const active = activeSection?.id === section.id; return <button type="button" key={section.id} onClick={() => { setTargetSection(section.id); setSelectedPhotoIds([]); setSelectionAnchorId(null); setContextMenu(null); }} style={{ ...buttonStyle, background: active ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.025)", borderColor: active ? COLORS.gold : COLORS.border, color: active ? COLORS.white : COLORS.muted, display: "flex", justifyContent: "space-between", textAlign: "left" }}><span>{section.title || "Untitled Set"}</span><span>{count}</span></button>; })}</div></div>{activeSection && <section style={{ border: `1px solid ${COLORS.border}`, padding: "0.85rem" }}><FieldLabel>Selected Set</FieldLabel><input value={activeSection.title || ""} onChange={(event) => setSections((current) => current.map((item) => item.id === activeSection.id ? { ...item, title: event.target.value } : item))} style={{ ...inputStyle, marginBottom: 8 }} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><button type="button" onClick={() => saveSection(activeSection)} style={buttonStyle}>Save Set</button><button type="button" onClick={() => saveSection(activeSection, { is_visible: activeSection.is_visible === false })} style={buttonStyle}>{activeSection.is_visible === false ? "Show" : "Hide"}</button></div></section>}</div>;
  }
  function renderDesignPanel() {
    return <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "2rem" }}><div><FieldLabel>Device Preview</FieldLabel><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><button type="button" onClick={() => setPreviewMode("desktop")} style={{ ...buttonStyle, color: previewMode === "desktop" ? COLORS.gold : COLORS.white }}>Desktop</button><button type="button" onClick={() => setPreviewMode("mobile")} style={{ ...buttonStyle, color: previewMode === "mobile" ? COLORS.gold : COLORS.white }}>Mobile</button></div></div><div><FieldLabel>Cover Style</FieldLabel><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{COVER_STYLES.map((style) => <SettingCard key={style.id} active={(gallery.cover_style || "center") === style.id} title={style.label} description={style.description} onClick={() => setGalleryField("cover_style", style.id)} />)}</div></div><label><FieldLabel>Gallery Color</FieldLabel><input type="color" value={gallery.theme_color || "#c8a96a"} onChange={(event) => setGalleryField("theme_color", event.target.value)} style={{ ...inputStyle, minHeight: 44, padding: 6 }} /></label><div><FieldLabel>Grid Style</FieldLabel><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>{GRID_STYLES.map((style) => <button key={style} type="button" onClick={() => setGalleryField("grid_style", style)} style={{ ...buttonStyle, color: (gallery.grid_style || "masonry") === style ? COLORS.gold : COLORS.white }}>{style}</button>)}</div></div><div><FieldLabel>Typography</FieldLabel><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>{TYPOGRAPHY_STYLES.map((style) => <button key={style} type="button" onClick={() => setGalleryField("typography_style", style)} style={{ ...buttonStyle, color: (gallery.typography_style || "classic") === style ? COLORS.gold : COLORS.white }}>{style}</button>)}</div></div><div><FieldLabel>Cover Focal Point</FieldLabel><label style={{ display: "block", marginBottom: 10 }}><span style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 11 }}>Horizontal</span><input type="range" min="0" max="100" value={gallery.cover_focal_x ?? 50} onChange={(event) => setGalleryField("cover_focal_x", Number(event.target.value))} style={{ width: "100%" }} /></label><label style={{ display: "block" }}><span style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 11 }}>Vertical</span><input type="range" min="0" max="100" value={gallery.cover_focal_y ?? 50} onChange={(event) => setGalleryField("cover_focal_y", Number(event.target.value))} style={{ width: "100%" }} /></label></div></div>;
  }
  function renderSettingsPanel() {
    return <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "2rem" }}><TextField label="Gallery Title" value={gallery.title} onChange={(value) => setGalleryField("title", value)} /><TextField label="URL Slug" value={gallery.slug} onChange={(value) => setGalleryField("slug", slugify(value))} /><label><FieldLabel>Status</FieldLabel><select value={gallery.status || "draft"} onChange={(event) => setGalleryField("status", event.target.value)} style={inputStyle}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></label><button type="button" onClick={toggleGalleryVisibility} style={gallery.status === "published" ? buttonStyle : primaryButtonStyle}>{gallery.status === "published" ? "Hide Gallery" : "Publish Gallery"}</button><TextField label="Client Name" value={gallery.client_name} onChange={(value) => setGalleryField("client_name", value)} /><TextField label="Client Email" type="email" value={gallery.client_email} onChange={(value) => setGalleryField("client_email", value)} /><TextField label="Event Date" type="date" value={gallery.event_date} onChange={(value) => setGalleryField("event_date", value)} /><label><FieldLabel>Description</FieldLabel><textarea value={gallery.description || ""} onChange={(event) => setGalleryField("description", event.target.value)} rows={5} style={{ ...inputStyle, resize: "vertical" }} /></label>{["Privacy", "Download", "Favorites"].map((setting) => <div key={setting} style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.6, padding: "0.85rem" }}><strong style={{ color: COLORS.white }}>{setting}</strong><br />Coming in the related access, download, and favorites issues.</div>)}<button type="button" onClick={deleteGallery} style={{ ...buttonStyle, color: "#ff8b8b", borderColor: "rgba(255,139,139,0.45)" }}>Delete Gallery</button></div>;
  }
  function renderActivityPanel() {
    return <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "2rem" }}><div style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.6, padding: "0.85rem" }}><strong style={{ color: COLORS.white }}>Workspace Activity</strong><br />Activity logging can be connected later. For EST-71, this panel reserves the workspace area.</div><div style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 12 }}>Created: {gallery.created_at ? new Date(gallery.created_at).toLocaleString() : "Unknown"}</div><div style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 12 }}>Updated: {gallery.updated_at ? new Date(gallery.updated_at).toLocaleString() : "Unknown"}</div></div>;
  }
  function renderActivePanel() { if (activeTab === "design") return renderDesignPanel(); if (activeTab === "settings") return renderSettingsPanel(); if (activeTab === "activity") return renderActivityPanel(); return renderPhotosPanel(); }

  function renderWorkspaceToolbar() {
    return <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}><button type="button" onClick={() => setWorkspaceViewMode("grid")} style={{ ...buttonStyle, color: workspaceViewMode === "grid" ? "#00b894" : "#555", borderColor: workspaceViewMode === "grid" ? "#00b894" : "transparent", fontSize: 12, padding: "8px 10px" }}>Grid</button><button type="button" onClick={() => setWorkspaceViewMode("list")} style={{ ...buttonStyle, color: workspaceViewMode === "list" ? "#00b894" : "#555", borderColor: workspaceViewMode === "list" ? "#00b894" : "transparent", fontSize: 12, padding: "8px 10px" }}>List</button><div style={{ position: "relative" }}><button type="button" onClick={(event) => { event.stopPropagation(); setSortMenuOpen((open) => !open); setGridMenuOpen(false); }} style={{ ...buttonStyle, color: "#555", borderColor: "transparent", fontSize: 18, padding: "8px 10px" }}>⇅</button>{sortMenuOpen && <div onClick={(event) => event.stopPropagation()} style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", zIndex: 80, width: 290, background: "#fff", boxShadow: "0 24px 70px rgba(0,0,0,0.16)", border: "1px solid #eee", padding: "1rem 0" }}><div style={{ color: "#999", fontFamily: "'Inter', sans-serif", fontSize: 13, padding: "0.65rem 1rem" }}>Sort by</div><button type="button" onClick={() => sortActiveSet("uploaded-desc")} style={whiteMenuButton}>Uploaded: New → Old</button><button type="button" onClick={() => sortActiveSet("uploaded-asc")} style={whiteMenuButton}>Uploaded: Old → New</button><button type="button" onClick={() => sortActiveSet("name-asc")} style={whiteMenuButton}>Name: A-Z</button><button type="button" onClick={() => sortActiveSet("name-desc")} style={whiteMenuButton}>Name: Z-A</button><button type="button" onClick={() => sortActiveSet("random")} style={whiteMenuButton}>Random</button></div>}</div><div style={{ position: "relative" }}><button type="button" onClick={(event) => { event.stopPropagation(); setGridMenuOpen((open) => !open); setSortMenuOpen(false); }} style={{ ...buttonStyle, color: "#555", borderColor: "transparent", fontSize: 18, padding: "8px 10px" }}>▦</button>{gridMenuOpen && <div onClick={(event) => event.stopPropagation()} style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", zIndex: 80, width: 290, background: "#fff", boxShadow: "0 24px 70px rgba(0,0,0,0.16)", border: "1px solid #eee", padding: "1rem 0" }}><div style={{ color: "#999", fontFamily: "'Inter', sans-serif", fontSize: 13, padding: "0.65rem 1rem" }}>Grid Size</div><button type="button" onClick={() => setWorkspaceGridSize("small")} style={{ ...whiteMenuButton, display: "flex", justifyContent: "space-between" }}><span>Small</span><span>{workspaceGridSize === "small" ? "✓" : ""}</span></button><button type="button" onClick={() => setWorkspaceGridSize("large")} style={{ ...whiteMenuButton, display: "flex", justifyContent: "space-between" }}><span>Large</span><span>{workspaceGridSize === "large" ? "✓" : ""}</span></button><div style={{ borderTop: "1px solid #eee", margin: "0.75rem 0" }} /><div style={{ color: "#999", fontFamily: "'Inter', sans-serif", fontSize: 13, padding: "0.65rem 1rem" }}>Show</div><button type="button" onClick={() => setShowFilenames((show) => !show)} style={{ ...whiteMenuButton, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span>Filename</span><span style={{ width: 56, height: 30, borderRadius: 999, background: showFilenames ? "#00b894" : "#ddd", display: "inline-flex", alignItems: "center", justifyContent: showFilenames ? "flex-end" : "flex-start", padding: 3, boxSizing: "border-box" }}><span style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "block" }} /></span></button></div>}</div><span style={{ width: 1, height: 28, background: "#ddd" }} /><button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...buttonStyle, color: "#00b894", borderColor: "transparent", fontSize: 14 }}>⊕ Add Media</button></div>;
  }

  function renderListWorkspace() {
    return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{activeSectionPhotos.map((photo, index) => { const selected = selectedPhotoIds.includes(photo.id); const isCover = gallery.cover_image_id === photo.id; const isDragTarget = dragOverPhotoId === photo.id && draggedPhotoId && draggedPhotoId !== photo.id; return <article key={photo.id} draggable onDragStart={() => setDraggedPhotoId(photo.id)} onDragEnd={() => { setDraggedPhotoId(null); setDragOverPhotoId(null); }} onDragOver={(event) => previewDraggedPhoto(event, photo.id)} onDrop={(event) => reorderDraggedPhoto(event, photo.id)} onClick={(event) => togglePhotoSelection(photo.id, event)} onContextMenu={(event) => { event.preventDefault(); setContextMenu({ photoId: photo.id, x: event.clientX, y: event.clientY }); if (!selectedPhotoIds.includes(photo.id)) { setSelectedPhotoIds([photo.id]); setSelectionAnchorId(photo.id); } }} style={{ display: "grid", gridTemplateColumns: "56px 86px minmax(0, 1fr) 130px 160px", alignItems: "center", gap: 14, background: selected ? "rgba(0,184,148,0.08)" : "#fff", border: `2px solid ${selected ? "#00b894" : isCover ? COLORS.gold : isDragTarget ? "#00b894" : "#eee"}`, padding: "0.6rem", cursor: "grab", userSelect: "none", opacity: draggedPhotoId === photo.id ? 0.68 : 1, boxShadow: isDragTarget ? "0 0 0 4px rgba(0,184,148,0.14)" : "none", transition: "border-color 0.1s ease, box-shadow 0.1s ease, opacity 0.1s ease, transform 0.1s ease" }}><div style={{ color: "#999", fontFamily: "'Inter', sans-serif", fontSize: 12, textAlign: "center" }}>#{index + 1}</div><div style={{ width: 76, height: 54, background: "#f2f2f2", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><img src={getPhotoPreviewUrl(photo)} alt={photo.alt_text || photo.title || "Gallery photo"} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /></div><div style={{ minWidth: 0 }}><div style={{ color: "#222", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.file_name || photo.title || photo.id}</div><div style={{ color: "#999", fontFamily: "'Inter', sans-serif", fontSize: 11, marginTop: 4 }}>{photo.mime_type || "image"}</div></div><div style={{ color: isCover ? COLORS.gold : "#aaa", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{isCover ? "Cover" : "Gallery Photo"}</div><div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedPhotoIds([photo.id]); setSelectionAnchorId(photo.id); setCoverImage(photo.id); }} style={{ ...buttonStyle, color: "#111", borderColor: "#ddd", padding: "7px 8px" }}>Cover</button><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedPhotoIds([photo.id]); setSelectionAnchorId(photo.id); movePhotoIdsByStep([photo.id], "up"); }} style={{ ...buttonStyle, color: "#111", borderColor: "#ddd", padding: "7px 8px" }}>↑</button><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedPhotoIds([photo.id]); setSelectionAnchorId(photo.id); movePhotoIdsByStep([photo.id], "down"); }} style={{ ...buttonStyle, color: "#111", borderColor: "#ddd", padding: "7px 8px" }}>↓</button></div></article>; })}</div>;
  }

  function renderPhotosWorkspace() {
    if (!activeSection) return <main style={{ background: "#f4f4f4", height: "calc(100vh - 124px)", padding: "3rem 2rem", overflowY: "auto" }}><EmptyState>Create a photo set to start managing gallery photos.</EmptyState></main>;
    const gridMinWidth = workspaceGridSize === "small" ? 150 : 240;
    const gridMaxWidth = workspaceGridSize === "small" ? 220 : 340;
    return <main onClick={closeWorkspaceMenus} style={{ background: "#f4f4f4", color: "#111", height: "calc(100vh - 124px)", overflowY: "auto", overflowX: "hidden", padding: "2rem", position: "relative", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}><div><h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.7rem", margin: 0 }}>{activeSection.title || "Untitled Set"}</h2><p style={{ color: "#777", fontFamily: "'Inter', sans-serif", fontSize: 13, margin: "0.4rem 0 0" }}>{activeSectionPhotos.length} photo{activeSectionPhotos.length === 1 ? "" : "s"} · Select images, then drag one selected image to move the group</p></div>{renderWorkspaceToolbar()}</div>
      {activeSectionPhotos.length === 0 && <div style={{ border: "1px dashed #ccc", color: "#777", fontFamily: "'Inter', sans-serif", padding: "4rem 2rem", textAlign: "center" }}>No photos in this set yet. Use Add Media or the Photos panel to upload images.</div>}
      {workspaceViewMode === "list" ? renderListWorkspace() : <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}px, ${gridMaxWidth}px))`, gap: workspaceGridSize === "small" ? "1rem" : "1.75rem", justifyContent: "start" }}>{activeSectionPhotos.map((photo) => { const selected = selectedPhotoIds.includes(photo.id); const isCover = gallery.cover_image_id === photo.id; const isDragTarget = dragOverPhotoId === photo.id && draggedPhotoId && draggedPhotoId !== photo.id; return <article key={photo.id} draggable onDragStart={() => setDraggedPhotoId(photo.id)} onDragEnd={() => { setDraggedPhotoId(null); setDragOverPhotoId(null); }} onDragOver={(event) => previewDraggedPhoto(event, photo.id)} onDrop={(event) => reorderDraggedPhoto(event, photo.id)} onClick={(event) => togglePhotoSelection(photo.id, event)} onContextMenu={(event) => { event.preventDefault(); setContextMenu({ photoId: photo.id, x: event.clientX, y: event.clientY }); if (!selectedPhotoIds.includes(photo.id)) { setSelectedPhotoIds([photo.id]); setSelectionAnchorId(photo.id); } }} style={{ background: "#fff", border: `2px solid ${selected ? "#00b894" : isCover ? COLORS.gold : isDragTarget ? "#00b894" : "transparent"}`, boxShadow: selected ? "0 0 0 3px rgba(0,184,148,0.16)" : isDragTarget ? "0 0 0 5px rgba(0,184,148,0.12)" : "none", cursor: "grab", padding: workspaceGridSize === "small" ? "0.5rem" : "0.75rem", position: "relative", userSelect: "none", opacity: draggedPhotoId === photo.id ? 0.68 : 1, transform: draggedPhotoId === photo.id ? "scale(0.985)" : "scale(1)", transition: "border-color 0.1s ease, box-shadow 0.1s ease, opacity 0.1s ease, transform 0.1s ease" }}>{isCover && <span style={{ position: "absolute", left: 10, top: 10, background: COLORS.gold, color: COLORS.bg, fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", padding: "4px 6px", textTransform: "uppercase", zIndex: 2 }}>Cover</span>}<div style={{ height: workspaceGridSize === "small" ? 110 : 185, background: "#f2f2f2", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><img src={getPhotoPreviewUrl(photo)} alt={photo.alt_text || photo.title || "Gallery photo"} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /></div>{showFilenames && <div style={{ color: "#777", fontFamily: "'Inter', sans-serif", fontSize: 12, marginTop: 10, overflow: "hidden", textOverflow: "ellipsis", textAlign: "center", whiteSpace: "nowrap" }}>{photo.file_name || photo.title || photo.id}</div>}</article>; })}</div>}
      {contextMenu && contextPhoto && <div onClick={(event) => event.stopPropagation()} style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 150, minWidth: 220, background: "#fff", border: "1px solid #ddd", boxShadow: "0 18px 55px rgba(0,0,0,0.18)", padding: "0.5rem" }}>{[["Open", () => openPhoto(contextPhoto)], ["Set as cover", () => setCoverImage(contextPhoto.id)], ["Copy filename", () => copyFilenames([contextPhoto])], ["Move up", () => moveSelectedByStep("up")], ["Move down", () => moveSelectedByStep("down")], ["Watermark later", () => showLaterNotice("Watermark")], ["Create mobile app later", () => showLaterNotice("Mobile app")], ["Delete", () => removePhoto(contextPhoto.id)]].map(([label, action]) => <button type="button" key={label} onClick={action} style={{ ...whiteMenuButton, color: label === "Delete" ? "#c0392b" : "#222" }}>{label}</button>)}</div>}
      {selectedPhotoIds.length > 0 && <div onClick={(event) => event.stopPropagation()} style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 120, width: "min(92vw, 760px)", background: "#171717", color: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "0.8rem 1rem", boxSizing: "border-box" }}><button type="button" onClick={() => { setSelectedPhotoIds([]); setSelectionAnchorId(null); }} style={{ ...buttonStyle, border: "none", padding: "6px 8px" }}>✕</button><strong style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, marginRight: "auto" }}>{selectedPhotoIds.length} selected</strong><button type="button" onClick={() => showLaterNotice("Favorites")} style={buttonStyle}>☆ Favorite</button><button type="button" onClick={() => showLaterNotice("Quick share")} style={buttonStyle}>🔗 Share</button><button type="button" onClick={deleteSelectedPhotos} style={{ ...buttonStyle, color: "#ff8b8b" }}>Delete</button><div style={{ position: "relative", marginLeft: "auto" }}><button type="button" onClick={() => setActionMenuOpen((open) => !open)} style={{ ...buttonStyle, minWidth: 44 }}>...</button>{actionMenuOpen && <div style={{ position: "absolute", right: 0, bottom: "calc(100% + 10px)", minWidth: 240, background: "#fff", color: "#111", border: "1px solid #ddd", boxShadow: "0 18px 55px rgba(0,0,0,0.2)", padding: "0.5rem" }}><button type="button" onClick={() => selectedPhotoIds[0] && setCoverImage(selectedPhotoIds[0])} style={whiteMenuButton}>Set first selected as cover</button><button type="button" onClick={() => moveSelectedByStep("up")} style={whiteMenuButton}>Move up</button><button type="button" onClick={() => moveSelectedByStep("down")} style={whiteMenuButton}>Move down</button><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, padding: "0.45rem" }}><select value={moveTargetSectionId} onChange={(event) => setMoveTargetSectionId(event.target.value)} style={{ color: "#111", border: "1px solid #ddd", padding: "8px" }}>{sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select><button type="button" onClick={() => moveSelectedToSection(moveTargetSectionId)} style={{ color: "#111", border: "1px solid #ddd", background: "#fff", cursor: "pointer", padding: "8px" }}>Move</button></div><button type="button" onClick={() => copyFilenames()} style={whiteMenuButton}>Copy Names</button></div>}</div></div>}
    </main>;
  }

  if (loading) return <div style={pageStyle}><AdminNav onSignOut={handleSignOut} /><div style={{ padding: "3rem" }}><Spinner /></div></div>;
  if (!gallery) return <div style={pageStyle}><AdminNav onSignOut={handleSignOut} /><div style={{ padding: "3rem", color: COLORS.white }}>Gallery not found.</div></div>;

  return <div style={{ ...pageStyle, height: "100vh", overflow: "hidden" }}><AdminNav onSignOut={handleSignOut} /><header style={{ height: 68, borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surfaceDark || "#060606", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0 1.5rem", position: "sticky", top: 56, zIndex: 40 }}><div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}><button type="button" onClick={() => navigate("/admin/galleries")} style={buttonStyle}>← Galleries</button><div style={{ minWidth: 0 }}><h1 style={{ color: COLORS.white, fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gallery.title || "Untitled Gallery"}</h1><div style={{ color: COLORS.muted, fontFamily: "'Inter', sans-serif", fontSize: 12 }}>{formatDate(gallery.event_date)} · {photos.length} photo{photos.length === 1 ? "" : "s"}</div></div><StatusPill status={gallery.status} onClick={toggleGalleryVisibility} /></div><div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}><button type="button" onClick={openPreview} style={buttonStyle}>Preview</button><button type="button" disabled style={{ ...buttonStyle, opacity: 0.45, cursor: "not-allowed" }}>Share Later</button><button type="button" onClick={saveGallery} disabled={saving} style={primaryButtonStyle}>{saving ? "Saving..." : "Save Gallery"}</button><button type="button" onClick={deleteGallery} style={{ ...buttonStyle, color: "#ff8b8b", borderColor: "rgba(255,139,139,0.45)" }}>Delete Gallery</button></div></header><div style={{ display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", height: "calc(100vh - 124px)", overflow: "hidden" }}><aside style={{ borderRight: `1px solid ${COLORS.border}`, background: COLORS.surfaceDark || "#060606", height: "calc(100vh - 124px)", overflow: "hidden", display: "flex", flexDirection: "column" }} onWheel={(event) => event.stopPropagation()}><button type="button" aria-label="Open cover design controls" onClick={() => setActiveTab("design")} style={{ aspectRatio: "16 / 9", width: "100%", backgroundColor: "rgba(255,255,255,0.035)", backgroundImage: getCoverUrl(coverPhoto) ? `url(${getCoverUrl(coverPhoto)})` : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))", backgroundPosition: `${gallery.cover_focal_x ?? 50}% ${gallery.cover_focal_y ?? 50}%`, backgroundSize: getCoverUrl(coverPhoto) ? "contain" : "cover", backgroundRepeat: "no-repeat", border: "none", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", flexShrink: 0 }} /><div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>{SIDEBAR_TABS.map((tab) => <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); closeWorkspaceMenus(); }} style={{ background: activeTab === tab.id ? "rgba(255,255,255,0.07)" : "transparent", border: "none", borderRight: `1px solid ${COLORS.border}`, color: activeTab === tab.id ? COLORS.gold : COLORS.muted, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", padding: "0.75rem 0.35rem", textTransform: "uppercase" }} title={tab.label}><div style={{ fontSize: 16, marginBottom: 4 }}>{tab.icon}</div>{tab.label}</button>)}</div><div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "1rem" }} onWheel={(event) => event.stopPropagation()}>{error && <div style={{ border: "1px solid rgba(224,92,92,0.35)", color: "#ff8b8b", fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.5, marginBottom: "1rem", padding: "0.75rem" }}>{error}</div>}{notice && <div style={{ border: "1px solid rgba(74,222,128,0.28)", color: "#9af0b8", fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.5, marginBottom: "1rem", padding: "0.75rem" }}>{notice}</div>}{renderActivePanel()}</div></aside>{activeTab === "photos" ? renderPhotosWorkspace() : <main style={{ background: "#f4f4f4", height: "calc(100vh - 124px)", overflowY: "auto", overflowX: "hidden", padding: "3rem 2rem", boxSizing: "border-box" }}><GalleryPreview gallery={gallery} sections={sections} photos={photos} coverPhoto={coverPhoto} previewMode={previewMode} /></main>}</div></div>;
}
