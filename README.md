# Estanler A Visuals Platform

Estanler A Visuals Platform is a modern photography and film business platform built for managing a public brand website, portfolio gallery, client galleries, proofing-style image selections, downloads, and admin workflows in one place.

The project started as a portfolio and booking website for Estanler A Visuals, but it is growing into a full creative business operating system for photographers, filmmakers, and visual studios that need a polished public presence and a private gallery delivery workflow.

## Purpose

This platform is designed to support the full client experience from first impression to final gallery delivery.

Visitors can explore the brand, view portfolio work, learn about services, and submit booking inquiries. Admin users can manage portfolio images, create client galleries, organize gallery sections, control gallery access, track favorites, and review selected client images from the admin workspace.

## Core Features

### Public Website

- Cinematic homepage hero with rotating featured portfolio images.
- Public portfolio gallery at `/gallery`.
- Category-based portfolio filtering.
- Service, about, shop, and booking pages.
- Responsive navigation for desktop and mobile.
- Premium visual styling built around the Estanler A Visuals brand.

### Portfolio Management

- Admin portfolio workspace.
- Upload and organize portfolio images.
- Mark images as featured.
- Control image visibility.
- Hide unlisted images from the public gallery.
- Manage image ordering, display paths, thumbnails, and original assets.

### Client Gallery System

- Admin client gallery workspace.
- Create client galleries with custom titles, slugs, event dates, and client names.
- Organize galleries into sections and image sets.
- Upload client gallery images.
- Set gallery covers and cover focal points.
- Support public, hidden, and password-protected gallery access.
- Support gallery expiration controls.
- Enable or disable downloads, favorites, and sharing per gallery.

### Public Client Gallery Viewer

- Public client gallery route at `/gallery/:slug`.
- Custom cover layouts and gallery presentation styles.
- Section navigation for gallery image sets.
- Image lightbox and slideshow behavior.
- Individual photo downloads when enabled.
- Full gallery ZIP downloads when enabled.
- Favorite image selection when enabled.
- Share tools when enabled.

### Client Favorites and Selections

- Visitors can favorite images inside a client gallery.
- Favorites are saved per gallery visitor session.
- Admin Activity area can show favorite selections.
- Admin can view selected client images in grid or list mode.
- Admin can download selected favorites as a ZIP.
- Admin can copy favorite image names for editing and delivery workflows.

### Admin Workflows

- Protected admin login.
- Admin dashboard.
- Client gallery list and editor.
- Portfolio manager.
- Inquiry management.
- Gallery settings and activity tools.

## Current Routes

| Route | Purpose |
| --- | --- |
| `/` | Public homepage |
| `/gallery` | Public portfolio gallery |
| `/gallery/:slug` | Public client gallery viewer |
| `/services` | Services page |
| `/about` | About page |
| `/book` | Booking inquiry page |
| `/shop` | Shop page |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard |
| `/admin/galleries` | Client gallery admin workspace |
| `/admin/galleries/:galleryId` | Client gallery editor |
| `/admin/portfolio` | Portfolio manager |
| `/admin/inquiries` | Inquiry management |

## Tech Stack

- React
- Vite
- React Router
- Supabase
- Supabase Auth
- Supabase Database
- Supabase Storage
- fflate for browser ZIP packaging
- exifr for image metadata support
- Netlify deployment workflow

## Project Structure

```txt
src/
  components/         Shared UI and navigation components
  lib/                Supabase client, constants, and gallery helpers
  pages/              Public website pages and client gallery viewer
  pages/admin/        Protected admin pages and workspaces
  assets/             Static project assets
```

Important page files:

```txt
src/pages/Home.jsx                  Public homepage
src/pages/Gallery.jsx               Public portfolio gallery
src/pages/ClientGalleryViewer.jsx   Public client gallery viewer
src/pages/admin/Galleries.jsx       Client gallery list workspace
src/pages/admin/GalleryEditor.jsx   Client gallery editor workspace
src/pages/admin/Portfolio.jsx       Portfolio manager
```

## Environment Variables

The app expects Supabase environment variables to be configured through Vite.

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

## Development Notes

- The public portfolio gallery lives at `/gallery`.
- Client galleries live at `/gallery/:slug`.
- The old `/work` route redirects to `/gallery` for backwards compatibility.
- Admin routes are protected and should remain separate from public routes.
- Main should only receive reviewed and approved changes through pull requests.

## Roadmap Direction

Planned future improvements include stronger visitor identity tracking, database-backed download activity, proofing workflows, private photo controls, gallery analytics, client communication tools, and a more complete creative business dashboard.

## Brand

Estanler A Visuals focuses on photography, film, and visual storytelling for weddings, quinceañeras, portraits, music artists, lifestyle work, and commercial projects.
