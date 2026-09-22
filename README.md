# Drive Video Viewer

Pixel-perfect **Google Drive file viewer** clone — but **no Google account required**. Click link → video plays instantly. Works great for old people / anyone who struggles with Drive permission screens.

Live viewer mimics Drive exactly: white header (Drive logo + filename + owner), black theatre stage, centered video, Drive spinner, slide-down & fade-scale animations, custom controls (play / seek / volume / speed / PiP / fullscreen), Download, Share/Copy link, Details drawer.

## ✨ Features
- **Instant open** — no sign-in, no “Request access” wall
- **Exact Drive design + animations** — header slideDown (360ms), video fade-scale, spinner, auto-hide controls
- **Direct link → video** — supports `?v=` or `?id=` or `config`
- **All options like Drive:** Download, Share/Copy link, Info/Details, Print, Fullscreen, PiP, Speed, Keyboard shortcuts
- **Big friendly controls** — large tap targets for elderly
- **Works offline too** — pick local file if no URL
- **Static site** — host on GitHub Pages / Netlify / any static host

## 🚀 Quick start
1. Put your video in `videos/` (e.g. `videos/my-video.mp4`)
   - or host anywhere (S3, Cloudflare R2, your site) and get a direct `https://.../video.mp4` URL
2. Open `index.html` — or set link:
   ```
   index.html?v=videos/my-video.mp4
   index.html?v=https://example.com/video.mp4
   index.html?id=DRIVE_FILE_ID&title=My%20Trip.mp4
   index.html?v=https://drive.google.com/file/d/1AbC.../view
   ```
3. Share that link. Recipients open and video plays — no account.

### Easy config (no URL params)
Edit `js/app.js` top:
```js
window.VIDEO_URL = "videos/my-video.mp4"; // or https://...
window.VIDEO_TITLE = "Trip to Salzburg 2026.mp4";
```
Commit → push → link is just `https://your-site/` and opens directly.

### Google Drive source?
If your video is still on Drive as “Anyone with the link”:
- Copy share link `https://drive.google.com/file/d/FILE_ID/view`
- Paste as `?v=` — viewer auto-converts to `https://drive.google.com/uc?export=download&id=FILE_ID`
- **Better:** download from Drive and re-host in `videos/` or R2 — more reliable for old devices, no Drive quirks.

## 🔧 Options
- **Download** — top-right blue button + drawer + `D` key. Works cross-origin (falls back to opening in new tab if browser blocks download).
- **Share** — copies current page link (with `?v=`).
- **Details drawer** — ℹ️ button shows Type / Access / Size / Duration.
- **Keyboard:** `Space`/`K` play/pause, `M` mute, `F` fullscreen, `D` download, `←`/`→` seek 5s, `Home`/`End`.
- **Poster:** `?poster=https://.../thumb.jpg`

## 📱 For old people — why this helps
- No “Sign in to Google” interstitial
- No “You need permission” screen
- One tap → video + big play button
- Large Download button always visible

## 🌐 Deploy (GitHub Pages)
This repo is ready for Pages:
```bash
git add .
git commit -m "feat: drive video viewer"
git push origin main
# then in GitHub: Settings → Pages → Source: main / root
```
Your link becomes `https://<user>.github.io/<repo>/?v=videos/...`

## 📦 300MB+ File? Fix (GitHub blocks >100MB)
GitHub rejects files >100MB (`videos/*.mp4` is gitignored for this reason). Use one of these:

**Option A — GitHub Releases (recommended, 2GB limit, no new account):**
```bash
# in Video Viewer folder
gh release create v1.0 --title "Video v1.0" --notes "300MB video"
gh release upload v1.0 "C:\path\to\your-video.mp4" --clobber
# Direct URL becomes:
# https://github.com/shineministry/drive-video-viewer/releases/download/v1.0/your-video.mp4
```
Then set in `js/app.js:6`:
```js
window.VIDEO_URL = "https://github.com/shineministry/drive-video-viewer/releases/download/v1.0/your-video.mp4";
```
Push → link works instantly. This is best for your 300MB file.

**Option B — Compress to ~60-80MB (keeps on Pages, faster for old phones):**
Install HandBrake (GUI, easiest) or ffmpeg and run:
```bash
ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset slow -vf scale=-2:720 -acodec aac -b:a 96k output.mp4
```
`crf 28` + 720p shrinks 300MB → ~70MB with almost no visible loss. Then put in `videos/` and allow push: remove `videos/*.mp4` from `.gitignore` or host the compressed file on Releases.

**Option C — Free external host (no compression):**
Upload to Cloudflare R2 / Backblaze B2 / archive.org / catbox.moe and use `?v=https://.../video.mp4`.

> Tip: Your `Trip to Morocco.mp4` (359MB) → use Option A now, compress later if load is slow for old devices.

## 📂 Structure
```
index.html      # viewer
css/style.css   # Drive exact styles + animations
js/app.js       # logic (query, drive-id conversion, controls)
videos/         # put .mp4 here (ignored except .gitkeep) — use Releases for >100MB
assets/         # optional thumbs
```

## 📄 License
MIT — use freely. Drive is a trademark of Google LLC. This is an independent viewer, not affiliated with Google.

---
Made for Shine Ministry — to make video sharing effortless.
