# Production QA and Release Checklist

Use this checklist before calling a phase stable, merging a release branch into `main`, or promoting a Netlify deploy to production.

A release is **not complete** until every required item is checked, every blocker is resolved, and the final production smoke test passes.

---

## Release Record

- [ ] Release / phase name:
- [ ] Linear issue or milestone:
- [ ] Release branch:
- [ ] Pull request:
- [ ] Commit SHA tested:
- [ ] QA date:
- [ ] Tested by:
- [ ] Netlify deploy URL:
- [ ] Production URL:
- [ ] Supabase project:

## Release Blockers

Do not release when any of the following are true:

- [ ] `npm run build` fails.
- [ ] A required Supabase migration has not been run.
- [ ] A required table, column, RPC, policy, or storage bucket is missing.
- [ ] A public route returns a blank page, unhandled error, or broken asset.
- [ ] An admin route bypasses authentication or cannot load after login.
- [ ] Portfolio or client gallery uploads fail to create all required image versions.
- [ ] A password-protected, hidden, expired, or unpublished gallery ignores its access rules.
- [ ] Netlify production deploy fails or deep links return a 404.
- [ ] A critical browser console error occurs during the release smoke test.
- [ ] Existing approved behavior regresses.

---

## 1. Source Control and Build Checks

### Branch and working tree

- [ ] Confirm the intended release branch is checked out.
- [ ] Confirm the branch is based on the latest approved `main`.
- [ ] Confirm unrelated files are not included in the diff.
- [ ] Confirm the pull request title and description match the completed scope.
- [ ] Confirm no secrets, local environment files, generated uploads, or debug files are committed.

Recommended commands:

```bash
git status -sb
git fetch origin
git log --oneline --decorate -5
git diff --stat origin/main...HEAD
```

### Dependencies and static checks

- [ ] Run a clean dependency install when validating a release candidate.

```bash
npm ci
```

- [ ] Run linting and review every error.

```bash
npm run lint
```

- [ ] Run the production build.

```bash
npm run build
```

- [ ] Confirm Vite reports a successful build.
- [ ] Confirm `dist/index.html` exists.
- [ ] Confirm generated CSS and JavaScript assets exist in `dist/assets`.
- [ ] Review bundle-size warnings. Record them as follow-up work when they do not block the current release.

### Local production preview

- [ ] Start the production preview.

```bash
npm run preview
```

- [ ] Open the preview URL in a normal browser window.
- [ ] Open the preview URL in a private/incognito window.
- [ ] Confirm there are no blank screens or fatal console errors.
- [ ] Confirm desktop and mobile-width layouts remain usable.

---

## 2. Environment and Supabase Configuration

### Environment variables

- [ ] `VITE_SUPABASE_URL` is configured locally and in Netlify.
- [ ] `VITE_SUPABASE_ANON_KEY` is configured locally and in Netlify.
- [ ] Production values point to the intended Supabase project.
- [ ] No service-role key is exposed to the browser or committed to the repository.

### Required storage buckets

- [ ] `Portfolio` bucket exists.
- [ ] `client-galleries` bucket exists.
- [ ] Public-read behavior matches the app design.
- [ ] Authenticated admin upload/delete policies work.
- [ ] Portfolio folders can store `originals`, `display`, and `thumbnails`.
- [ ] Client gallery folders can store `originals`, `display`, and `thumbnails`.

### Required tables and views

Confirm these current source-of-truth tables exist:

- [ ] `portfolio_images`
- [ ] `inquiries`
- [ ] `client_galleries`
- [ ] `client_gallery_sections`
- [ ] `client_gallery_images`
- [ ] `client_gallery_favorites`
- [ ] `client_gallery_visitors`
- [ ] `client_gallery_visitor_tokens`
- [ ] `client_gallery_visits`
- [ ] `client_gallery_downloads`
- [ ] `client_gallery_download_items`
- [ ] `client_gallery_favorite_summary` view

The deprecated gallery tables `galleries`, `gallery_photos`, and `gallery_access` are not the source of truth for current client gallery workflows.

Use this inspection query in the Supabase SQL Editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Check views separately:

```sql
select table_name
from information_schema.views
where table_schema = 'public'
order by table_name;
```

### Release-critical columns

#### `portfolio_images`

- [ ] `id`
- [ ] `category`
- [ ] `file_name`
- [ ] `title`
- [ ] `alt_text`
- [ ] `original_path`
- [ ] `display_path`
- [ ] `thumbnail_path`
- [ ] `original_sha256`
- [ ] `aspect_ratio`
- [ ] `object_position_x`
- [ ] `object_position_y`
- [ ] `zoom`
- [ ] `featured`
- [ ] `is_visible`
- [ ] `display_order`
- [ ] Original, display, and thumbnail size/dimension columns
- [ ] `mime_type`
- [ ] EXIF metadata columns used by the Portfolio Manager

#### `client_galleries`

- [ ] `id`
- [ ] `title`
- [ ] `slug`
- [ ] `status`
- [ ] `access_mode`
- [ ] `access_password_hash`
- [ ] `expires_at`
- [ ] `allow_downloads`
- [ ] `allow_favorites`
- [ ] `allow_sharing`
- [ ] `require_visitor_identity`
- [ ] `collect_visitor_name`
- [ ] Cover, typography, color, and grid design fields used by the gallery editor

#### `client_gallery_sections`

- [ ] `id`
- [ ] `gallery_id`
- [ ] `title`
- [ ] `slug`
- [ ] `display_order`
- [ ] `is_visible`

#### `client_gallery_images`

- [ ] `id`
- [ ] `gallery_id`
- [ ] `section_id`
- [ ] `file_name`
- [ ] `title`
- [ ] `original_path`
- [ ] `display_path`
- [ ] `thumbnail_path`
- [ ] `original_sha256`
- [ ] `original_size_bytes`
- [ ] `mime_type`
- [ ] `display_order`

#### Visitor, favorite, and activity tables

- [ ] Favorite rows connect the correct gallery, image, and browser visitor ID.
- [ ] Visitor rows store gallery-scoped email/name identity.
- [ ] Browser-token rows connect returning browsers to the correct visitor.
- [ ] Visit rows record visitor, gallery, and timestamp.
- [ ] Download rows record visitor, gallery, type, item count, filename, metadata, and timestamp.
- [ ] Download-item rows connect each tracked image to its download event.

Inspect required columns with:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'portfolio_images',
    'client_galleries',
    'client_gallery_sections',
    'client_gallery_images',
    'client_gallery_favorites',
    'client_gallery_visitors',
    'client_gallery_visitor_tokens',
    'client_gallery_visits',
    'client_gallery_downloads',
    'client_gallery_download_items'
  )
order by table_name, ordinal_position;
```

### Required RPC and security checks

- [ ] `get_client_gallery_public_payload` exists and does not expose password hashes.
- [ ] `set_client_gallery_password` exists and requires an authenticated admin.
- [ ] `get_client_gallery_identity_requirements` exists.
- [ ] `register_client_gallery_visitor` exists.
- [ ] `log_client_gallery_visit` exists.
- [ ] `log_client_gallery_download` exists.
- [ ] `get_client_gallery_activity` exists and requires authentication.
- [ ] Row-level security is enabled on client-facing activity and favorite tables.
- [ ] Anonymous users cannot read admin-only visitor/activity reports directly.
- [ ] Authenticated admin users can read and manage required records.

---

## 3. Public Route Checks

Test every route by direct navigation and browser refresh.

### Homepage — `/`

- [ ] Page loads without a blank screen.
- [ ] Navigation is visible and links work.
- [ ] Homepage hero image loads.
- [ ] Featured portfolio rotation/fallback behaves correctly.
- [ ] Hero text remains readable over the image.
- [ ] Primary calls to action route correctly.
- [ ] Mobile navigation opens, closes, and remains usable.
- [ ] No hidden or unlisted portfolio image appears in public homepage content.

### Public portfolio / Work page — `/gallery`

- [ ] Portfolio images load from Supabase.
- [ ] Category navigation works.
- [ ] Active category styling is correct.
- [ ] Masonry/grid layout renders without broken gaps.
- [ ] Lightbox opens the selected image.
- [ ] Lightbox next/previous navigation works.
- [ ] Hidden images do not appear.
- [ ] Unlisted images do not appear.
- [ ] Featured and ordering behavior matches the admin configuration.
- [ ] Display images are used instead of unnecessarily loading originals.

### Backward-compatible Work route — `/work`

- [ ] Direct navigation redirects to `/gallery`.
- [ ] Browser refresh does not return a Netlify 404.

### Public client gallery — `/gallery/:slug`

- [ ] A published public gallery loads.
- [ ] Cover design, focal position, typography, colors, and grid render correctly.
- [ ] Section navigation works.
- [ ] Grid and lightbox work.
- [ ] Slideshow starts, advances, and stops correctly.
- [ ] Sharing works when enabled.
- [ ] Individual photo download works when enabled.
- [ ] Full gallery ZIP download works when enabled.
- [ ] Favorites can be added and removed when enabled.
- [ ] Favorite selections persist for the same browser visitor.
- [ ] Favorites ZIP download works.
- [ ] Visitor email gate appears when required.
- [ ] Optional visitor name field appears only when enabled.
- [ ] Returning visitor identity works without freezing.
- [ ] Gallery visits and downloads are recorded in Activity.

### Client gallery access-state tests

- [ ] Password-protected gallery rejects an incorrect password.
- [ ] Correct password unlocks the gallery.
- [ ] Password and visitor identity work together.
- [ ] Hidden gallery is unavailable publicly.
- [ ] Expired gallery shows the correct expired/unavailable state.
- [ ] Draft gallery is unavailable publicly.
- [ ] Archived gallery is unavailable publicly.
- [ ] Disabled downloads remove or block download actions.
- [ ] Disabled favorites remove or block favorite actions.
- [ ] Disabled sharing removes or blocks share actions.

### Other public routes

- [ ] `/services`
- [ ] `/about`
- [ ] `/book`
- [ ] `/shop`
- [ ] Unknown routes show the expected Page Not Found state.

---

## 4. Admin Route Checks

### Authentication

- [ ] `/admin/login` loads.
- [ ] Valid credentials sign in.
- [ ] Invalid credentials show a clear error.
- [ ] Protected admin routes redirect unauthenticated visitors to login.
- [ ] Refreshing a protected route preserves a valid session.
- [ ] Sign out clears the session and protects admin routes again.

### Dashboard — `/admin`

- [ ] Dashboard loads after authentication.
- [ ] Portfolio image count loads.
- [ ] Featured image count loads.
- [ ] Client gallery count loads from `client_galleries`.
- [ ] New inquiry count loads.
- [ ] Quick actions route correctly.
- [ ] Admin navigation active state is correct.

### Portfolio Manager — `/admin/portfolio`

- [ ] Existing images load.
- [ ] Category filters work.
- [ ] Grid/list controls remain usable where available.
- [ ] Featured status can be changed and is reflected publicly.
- [ ] Visibility can be changed and is reflected publicly.
- [ ] Unlisted items remain hidden publicly.
- [ ] Ordering changes persist.
- [ ] Title, alt text, crop position, zoom, aspect ratio, and metadata edits persist.
- [ ] Original and display download actions work.
- [ ] Delete removes the database row and intended storage objects.
- [ ] Duplicate upload detection reports skipped duplicates clearly.

### Client gallery list — `/admin/galleries`

- [ ] Gallery list loads.
- [ ] New gallery creation works.
- [ ] Existing gallery opens.
- [ ] View public gallery action opens the correct slug.
- [ ] Copy link uses the saved slug.
- [ ] Delete confirmation prevents accidental deletion.

### Client gallery editor — `/admin/galleries/:galleryId`

- [ ] Photos tab loads images and sections.
- [ ] New section/photo set can be created.
- [ ] Section rename works.
- [ ] Section delete works with the expected confirmation.
- [ ] Gallery upload works.
- [ ] Duplicate gallery upload is skipped, not duplicated.
- [ ] Multi-select and batch actions work.
- [ ] Move-to-section works.
- [ ] Drag-and-drop ordering persists.
- [ ] Cover image selection persists.
- [ ] Cover focal-point controls persist.
- [ ] Design tab controls persist and match public preview.
- [ ] Settings tab saves gallery details and delivery controls.
- [ ] Password can be set, replaced, and cleared securely.
- [ ] Expiration and access mode changes work.
- [ ] Visitor identity controls save correctly.
- [ ] Share modal preview, copy link, email, and QR actions work.
- [ ] QR refresh creates a visibly different valid code for the same URL.
- [ ] Activity tab shows favorites, visitors, visits, downloads, per-visitor totals, and per-image totals.
- [ ] Selected favorites can be viewed in grid and list modes.
- [ ] Selected favorites can be downloaded individually and as a ZIP.

### Inquiries — `/admin/inquiries`

- [ ] Inquiry list loads.
- [ ] Existing inquiry data displays correctly.
- [ ] New booking inquiry appears after a public form submission.

### Admin settings — `/admin/settings`

- [ ] Current admin email displays.
- [ ] Change Email flow works with Supabase confirmation requirements.
- [ ] Password reset email action works.
- [ ] Change Password requires the current password.
- [ ] Wrong current password is rejected.
- [ ] Correct current password allows a new password.
- [ ] Updated credentials work after signing out and signing back in.

---

## 5. Manual Portfolio Image Upload Test

Use at least one normal JPEG and one larger high-resolution image.

### Before upload

- [ ] Record the test filename, size, dimensions, and category.
- [ ] Confirm the file is not already uploaded unless testing duplicate detection.
- [ ] Open `/admin/portfolio` and choose **Upload Images**.

### Upload behavior

- [ ] Single-image selection works.
- [ ] Multi-image selection works.
- [ ] Non-image files are ignored or rejected.
- [ ] Category selection is respected.
- [ ] Original-name mode works.
- [ ] Batch rename mode works.
- [ ] Date, separator, numbering, and padding options generate expected names.
- [ ] Progress changes through hashing, processing, upload, and metadata save states.
- [ ] Success, skipped, and failed counts are accurate.
- [ ] Duplicate image is reported as skipped.
- [ ] Duplicate image does not create a second database row.

### Storage and database verification

- [ ] Original file exists under the correct category `originals` folder in `Portfolio`.
- [ ] Display WebP exists under the correct `display` folder.
- [ ] Thumbnail WebP exists under the correct `thumbnails` folder.
- [ ] `portfolio_images` row contains all three paths.
- [ ] `original_sha256` is populated.
- [ ] File size and image dimension fields are populated.
- [ ] MIME type is populated.
- [ ] EXIF values are stored when present.
- [ ] Missing EXIF data does not cause upload failure.
- [ ] Uploaded image appears in the admin workspace.
- [ ] Uploaded image appears publicly only when visible and not unlisted.
- [ ] Featured image can appear in the homepage hero.

### Cleanup

- [ ] Delete the test image from the Portfolio Manager.
- [ ] Confirm the database row is removed.
- [ ] Confirm intended original/display/thumbnail storage objects are removed.
- [ ] Confirm public pages no longer display the deleted image.

---

## 6. Manual Client Gallery Image Upload Test

- [ ] Create or open a dedicated QA client gallery.
- [ ] Create at least two photo sets/sections.
- [ ] Upload one image into the first set.
- [ ] Upload multiple images into the second set.
- [ ] Confirm original, display, and thumbnail objects exist in `client-galleries` storage.
- [ ] Confirm each image row has gallery ID, section ID, paths, size/type fields, and display order.
- [ ] Upload the same file again.
- [ ] Confirm the duplicate is skipped and a clear duplicate message appears.
- [ ] Confirm the skipped duplicate does not create another row or storage object.
- [ ] Move an image between sections.
- [ ] Reorder images and refresh the page to confirm persistence.
- [ ] Set a cover image and focal point.
- [ ] Publish the gallery and confirm the public viewer uses the uploaded display images.
- [ ] Download one image and one ZIP.
- [ ] Favorite images and download the favorites ZIP.
- [ ] Confirm Activity records the correct visitor, event type, image details, and timestamp.
- [ ] Delete the QA gallery and confirm related sections, images, favorites, visitor activity, and storage files are handled as expected.

---

## 7. Netlify Deployment Check

### Deploy configuration

- [ ] Netlify is connected to the correct GitHub repository.
- [ ] Production deploy branch is `main`.
- [ ] Build command is `npm run build`.
- [ ] Publish directory is `dist`.
- [ ] Required Vite/Supabase environment variables exist in Netlify.
- [ ] SPA routing fallback is configured so React Router deep links load `index.html`.

### Deploy preview

- [ ] Pull request/branch deploy completes successfully.
- [ ] Deploy log contains no failed build step.
- [ ] Preview uses the expected commit SHA.
- [ ] Preview homepage loads.
- [ ] Preview `/gallery` loads.
- [ ] Preview `/work` redirects correctly.
- [ ] Preview `/gallery/:slug` loads after direct navigation and refresh.
- [ ] Preview `/admin/login` loads after direct navigation and refresh.
- [ ] Preview protected admin routes behave correctly.
- [ ] Images load from both Supabase storage buckets.
- [ ] Upload, favorite, visit, and download writes reach the intended Supabase project.

### Production deployment

- [ ] Approved PR is merged into `main` using the intended merge method.
- [ ] Netlify starts a production deploy from the merge commit.
- [ ] Production deploy completes successfully.
- [ ] Production deploy is marked published/current.
- [ ] Custom domain resolves to the new deploy.
- [ ] HTTPS certificate is valid.
- [ ] No mixed-content warnings appear.
- [ ] Browser hard refresh loads the latest assets.

---

## 8. Post-Release Production Smoke Test

Run immediately after the Netlify production deployment.

- [ ] Open `/`.
- [ ] Open `/gallery`.
- [ ] Confirm `/work` redirects.
- [ ] Open one published public client gallery.
- [ ] Test one password-protected gallery.
- [ ] Sign in at `/admin/login`.
- [ ] Open `/admin`.
- [ ] Open `/admin/portfolio`.
- [ ] Open `/admin/galleries` and one gallery editor.
- [ ] Open `/admin/inquiries`.
- [ ] Open `/admin/settings`.
- [ ] Perform one small Portfolio upload and remove it.
- [ ] Perform one small client gallery upload and remove it.
- [ ] Confirm no new fatal browser console errors.
- [ ] Confirm Supabase logs do not show unexpected authorization or RPC failures.
- [ ] Confirm Netlify function/build/deploy logs show no release-related failure.

---

## 9. Release Sign-Off

### Required approvals

- [ ] Build passed.
- [ ] Supabase schema passed.
- [ ] Storage passed.
- [ ] Public routes passed.
- [ ] Admin routes passed.
- [ ] Portfolio Manager passed.
- [ ] Home and Work/Portfolio pages passed.
- [ ] Client Galleries passed.
- [ ] Manual image uploads passed.
- [ ] Netlify preview passed.
- [ ] Netlify production deploy passed.
- [ ] Production smoke test passed.

### Final decision

- [ ] **Release approved**
- [ ] **Release blocked**

Blocked items / follow-up issues:

- 

Rollback plan or previous known-good deploy:

- 

Final production commit SHA:

- 

Release approved by:

- 
