import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spinner } from '../../components/UI';
import { BASE, COLORS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { AdminNav } from './Dashboard';

const statuses = ['draft', 'published', 'archived'];
const page = { minHeight: '100vh', background: COLORS.bg, color: COLORS.white };
const panel = { background: COLORS.surfaceDark || '#060606', border: `1px solid ${COLORS.border}`, padding: '1rem' };
const input = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.035)', border: `1px solid ${COLORS.border}`, color: COLORS.white, padding: '10px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13 };
const btn = { background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.white, cursor: 'pointer', padding: '8px 10px', fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' };
const gold = { ...btn, background: COLORS.gold, border: 'none', color: COLORS.bg };

function url(path) { return path ? `${BASE}/${path.split('/').map(encodeURIComponent).join('/')}` : ''; }
function img(row) { return url(row?.thumbnail_path || row?.display_path || row?.original_path); }
function slugify(value = '') { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function sort(items) { return [...items].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0)); }
function Label({ children }) { return <span style={{ display: 'block', marginBottom: 6, color: COLORS.muted, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase' }}>{children}</span>; }
function Field({ label, value, onChange, type = 'text' }) { return <label><Label>{label}</Label><input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} style={input} /></label>; }

function StatusBadge({ status }) {
  const color = status === 'published' ? '#4ade80' : status === 'archived' ? COLORS.muted : COLORS.gold;
  return <span style={{ border: `1px solid ${color}`, borderRadius: 999, color, padding: '5px 10px', fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>{status || 'draft'}</span>;
}

export default function GalleryEditor() {
  const { galleryId } = useParams();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState(null);
  const [sections, setSections] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newSection, setNewSection] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [targetImage, setTargetImage] = useState('');

  const portfolioMap = useMemo(() => portfolioImages.reduce((map, image) => ({ ...map, [image.id]: image }), {}), [portfolioImages]);
  const coverImage = gallery?.cover_image_id ? portfolioMap[gallery.cover_image_id] : null;

  useEffect(() => { loadWorkspace(); }, [galleryId]);

  async function loadWorkspace() {
    setLoading(true); setError('');
    const [g, s, gi, p] = await Promise.all([
      supabase.from('client_galleries').select('*').eq('id', galleryId).single(),
      supabase.from('client_gallery_sections').select('*').eq('gallery_id', galleryId).order('display_order', { ascending: true }),
      supabase.from('client_gallery_images').select('*').eq('gallery_id', galleryId).order('display_order', { ascending: true }),
      supabase.from('portfolio_images').select('*').order('created_at', { ascending: false }).limit(300),
    ]);
    if (g.error) setError(g.error.message); else setGallery(g.data);
    if (s.error) setError(s.error.message); else setSections(s.data || []);
    if (gi.error) setError(gi.error.message); else setGalleryImages(gi.data || []);
    if (p.error) setError(p.error.message); else setPortfolioImages(p.data || []);
    setLoading(false);
  }

  const signOut = async () => { await supabase.auth.signOut(); navigate('/admin/login'); };
  const setField = (key, value) => setGallery((current) => ({ ...current, [key]: value }));
  const flash = (message) => { setNotice(message); setError(''); };

  async function saveGallery() {
    if (!gallery?.title?.trim()) { setError('Gallery title is required.'); return; }
    setSaving(true);
    const payload = { title: gallery.title.trim(), slug: slugify(gallery.slug || gallery.title), client_name: gallery.client_name || null, client_email: gallery.client_email || null, event_date: gallery.event_date || null, description: gallery.description || null, status: gallery.status || 'draft', cover_image_id: gallery.cover_image_id || null };
    const { data, error: err } = await supabase.from('client_galleries').update(payload).eq('id', gallery.id).select('*').single();
    setSaving(false);
    if (err) setError(err.message); else { setGallery(data); flash('Gallery details saved.'); }
  }

  async function addSection() {
    const title = newSection.trim(); if (!title) return;
    const display_order = sections.length ? Math.max(...sections.map((s) => s.display_order || 0)) + 1 : 0;
    const { data, error: err } = await supabase.from('client_gallery_sections').insert({ gallery_id: galleryId, title, display_order, is_visible: true }).select('*').single();
    if (err) setError(err.message); else { setSections((items) => sort([...items, data])); setNewSection(''); flash('Section added.'); }
  }

  async function saveSection(section, updates = {}) {
    const { data, error: err } = await supabase.from('client_gallery_sections').update({ title: section.title || 'Untitled Section', is_visible: section.is_visible !== false, ...updates }).eq('id', section.id).select('*').single();
    if (err) setError(err.message); else { setSections((items) => items.map((item) => item.id === section.id ? data : item)); flash('Section saved.'); }
  }

  async function addImageToSection() {
    if (!targetSection || !targetImage) return;
    const sectionImages = galleryImages.filter((item) => item.section_id === targetSection);
    if (sectionImages.some((item) => item.portfolio_image_id === targetImage)) { flash('Image is already in this section.'); return; }
    const row = { gallery_id: galleryId, section_id: targetSection, portfolio_image_id: targetImage, display_order: sectionImages.length };
    const { data, error: err } = await supabase.from('client_gallery_images').insert(row).select('*').single();
    if (err) setError(err.message); else { setGalleryImages((items) => sort([...items, data])); setTargetImage(''); flash('Image added to section.'); }
  }

  async function removeImage(id) {
    const { error: err } = await supabase.from('client_gallery_images').delete().eq('id', id);
    if (err) setError(err.message); else { setGalleryImages((items) => items.filter((item) => item.id !== id)); flash('Image removed from gallery. Portfolio image was not deleted.'); }
  }

  async function setCover(portfolioImageId) {
    const { data, error: err } = await supabase.from('client_galleries').update({ cover_image_id: portfolioImageId }).eq('id', galleryId).select('*').single();
    if (err) setError(err.message); else { setGallery(data); flash('Cover image updated.'); }
  }

  async function moveImage(relation, direction) {
    const items = sort(galleryImages.filter((item) => item.section_id === relation.section_id));
    const index = items.findIndex((item) => item.id === relation.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= items.length) return;
    const a = items[index], b = items[swapIndex], aOrder = a.display_order ?? index, bOrder = b.display_order ?? swapIndex;
    const [ar, br] = await Promise.all([
      supabase.from('client_gallery_images').update({ display_order: bOrder }).eq('id', a.id).select('*').single(),
      supabase.from('client_gallery_images').update({ display_order: aOrder }).eq('id', b.id).select('*').single(),
    ]);
    if (ar.error || br.error) setError(ar.error?.message || br.error?.message || 'Could not reorder images.');
    else setGalleryImages((items) => sort(items.map((item) => item.id === ar.data.id ? ar.data : item.id === br.data.id ? br.data : item)));
  }

  if (loading) return <div style={page}><AdminNav onSignOut={signOut} /><div style={{ padding: '3rem' }}><Spinner /></div></div>;
  if (!gallery) return <div style={page}><AdminNav onSignOut={signOut} /><div style={{ padding: '3rem' }}>Gallery not found.</div></div>;

  return <div style={page}><AdminNav onSignOut={signOut} /><main style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}><button onClick={() => navigate('/admin/galleries')} style={btn}>← Galleries</button><div style={{ display: 'flex', gap: '.65rem' }}><button disabled style={{ ...btn, opacity: .45, cursor: 'not-allowed' }}>Preview Later</button><button disabled style={{ ...btn, opacity: .45, cursor: 'not-allowed' }}>Share Later</button><button onClick={saveGallery} disabled={saving} style={gold}>{saving ? 'Saving...' : 'Save Gallery'}</button></div></div>
    {error && <div style={{ border: '1px solid rgba(224,92,92,.35)', color: '#ff8b8b', padding: '12px 14px', marginBottom: '1rem', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>{error}</div>}
    {notice && <div style={{ border: '1px solid rgba(74,222,128,.28)', color: '#9af0b8', padding: '12px 14px', marginBottom: '1rem', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>{notice}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '1.25rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <section style={{ ...panel, padding: 0, overflow: 'hidden' }}><div style={{ aspectRatio: '16 / 9', background: img(coverImage) ? `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.55)), url(${img(coverImage)}) center/cover` : 'linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.015))', display: 'flex', alignItems: 'flex-end', padding: '1.25rem' }}><div><StatusBadge status={gallery.status} /><h1 style={{ margin: '.85rem 0 .35rem', fontFamily: 'Playfair Display, serif', fontSize: '2.25rem', lineHeight: 1 }}>{gallery.title || 'Untitled Gallery'}</h1><p style={{ margin: 0, color: 'rgba(255,255,255,.76)', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>{gallery.client_name || 'No client'}</p></div></div><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', color: COLORS.muted, fontFamily: 'Inter, sans-serif', fontSize: 12 }}><span>Cover references an existing portfolio image. No upload or optimization runs here.</span></div></section>
        <section style={panel}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '1rem' }}><div><Label>Collection Workspace</Label><h2 style={{ margin: 0, fontFamily: 'Playfair Display, serif' }}>Gallery Sections</h2></div><div style={{ display: 'flex', gap: '.5rem' }}><input value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder='New section' style={{ ...input, minWidth: 220 }} /><button onClick={addSection} style={gold}>Add Section</button></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '.5rem', margin: '1rem 0' }}><select value={targetSection} onChange={(event) => setTargetSection(event.target.value)} style={input}><option value=''>Choose section</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select><select value={targetImage} onChange={(event) => setTargetImage(event.target.value)} style={input}><option value=''>Choose portfolio image</option>{portfolioImages.map((image) => <option key={image.id} value={image.id}>{image.title || image.alt_text || image.file_name || image.id}</option>)}</select><button onClick={addImageToSection} style={gold}>Add Image</button></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>{sections.length === 0 && <div style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.muted, padding: '3rem', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>No sections yet. Creating a gallery should add Highlights automatically.</div>}{sort(sections).map((section) => { const images = sort(galleryImages.filter((item) => item.section_id === section.id)); return <section key={section.id} style={{ border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,.015)', padding: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}><div style={{ flex: 1 }}><input value={section.title || ''} onChange={(event) => setSections((items) => items.map((item) => item.id === section.id ? { ...item, title: event.target.value } : item))} style={{ ...input, border: 'none', background: 'transparent', padding: 0, fontFamily: 'Playfair Display, serif', fontSize: '1.25rem' }} /><div style={{ color: COLORS.muted, fontFamily: 'Inter, sans-serif', fontSize: 11, marginTop: 5 }}>{images.length} images · {section.is_visible === false ? 'Hidden' : 'Visible'}</div></div><div style={{ display: 'flex', gap: '.5rem' }}><button onClick={() => saveSection(section)} style={btn}>Save</button><button onClick={() => saveSection(section, { is_visible: section.is_visible === false })} style={btn}>{section.is_visible === false ? 'Show' : 'Hide'}</button></div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '.75rem' }}>{images.map((relation) => { const image = portfolioMap[relation.portfolio_image_id], cover = gallery.cover_image_id === relation.portfolio_image_id; return <article key={relation.id} style={{ border: `1px solid ${cover ? COLORS.gold : COLORS.border}`, background: 'rgba(255,255,255,.025)', overflow: 'hidden' }}><div style={{ aspectRatio: image?.aspect_ratio || '4 / 5', background: img(image) ? `url(${img(image)}) center/cover` : 'rgba(255,255,255,.06)' }} /><div style={{ padding: '.6rem' }}><div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{image?.title || image?.alt_text || 'Portfolio image'}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: '.6rem' }}><button onClick={() => moveImage(relation, 'up')} style={btn}>↑</button><button onClick={() => moveImage(relation, 'down')} style={btn}>↓</button><button onClick={() => setCover(relation.portfolio_image_id)} style={{ ...btn, color: COLORS.gold }}>Cover</button><button onClick={() => removeImage(relation.id)} style={{ ...btn, color: '#ff8b8b' }}>Remove</button></div></div></article>; })}</div></section>; })}</div></section>
      </div>
      <aside style={{ ...panel, position: 'sticky', top: 74 }}><Label>Details Panel</Label><h2 style={{ marginTop: 0, fontFamily: 'Playfair Display, serif' }}>Gallery Settings</h2><div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}><Field label='Gallery Title' value={gallery.title} onChange={(v) => setField('title', v)} /><Field label='URL Slug' value={gallery.slug} onChange={(v) => setField('slug', slugify(v))} /><label><Label>Status</Label><select value={gallery.status || 'draft'} onChange={(event) => setField('status', event.target.value)} style={input}>{statuses.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></label><Field label='Client Name' value={gallery.client_name} onChange={(v) => setField('client_name', v)} /><Field label='Client Email' value={gallery.client_email} onChange={(v) => setField('client_email', v)} type='email' /><Field label='Event Date' value={gallery.event_date} onChange={(v) => setField('event_date', v)} type='date' /><label><Label>Description</Label><textarea value={gallery.description || ''} onChange={(event) => setField('description', event.target.value)} rows={5} style={{ ...input, resize: 'vertical' }} /></label><div style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted, padding: '1rem', fontFamily: 'Inter, sans-serif', fontSize: 12, lineHeight: 1.6 }}><strong style={{ color: COLORS.white }}>Source of truth:</strong> client_galleries, client_gallery_sections, and client_gallery_images. Portfolio assets stay in /admin/portfolio.</div></div></aside>
    </div>
  </main></div>;
}
