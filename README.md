# Ezra Nzioki | Portfolio

A responsive React portfolio backed by an Express API. Portfolio content and contact messages use MongoDB when `MONGODB_URI` is configured; without it, the API runs in memory so the app is easy to preview locally.

## Run locally

```bash
npm install --prefix backend
npm install --prefix client
npm run dev --prefix backend
```

In a second terminal, start the Vite client:

```bash
npm run dev --prefix client
```

Open the Vite URL shown in the terminal. The client proxies `/api` requests to the backend on port 4000. The admin workspace is at `/admin`; local credentials are configured in the ignored `backend/.env` file.

## MongoDB persistence

Set `MONGODB_URI` in `backend/.env` to a MongoDB connection string. The API connects to the `portfolio` database before accepting requests. Add the development machine's outbound IP to Atlas Network Access; this workspace currently exits as `4.240.18.224/32` (the address may change). If Atlas is unavailable, `/api/health` reports `storage: unavailable` and database-backed reads and writes return an error instead of appearing to save. Without `MONGODB_URI`, local preview uses in-memory storage.

For deployment, set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and a persistent random `JWT_SECRET` as environment variables. Generate a password hash with:

```bash
node -e "console.log(require('./backend/node_modules/bcryptjs').hashSync('your-password', 12))"
```

Build the client with `npm run build --prefix client`; then start the API with `npm start --prefix backend`. Express serves the built client from `client/dist`.

Project cover images can be uploaded from the admin workspace as JPEG, PNG, WebP, or GIF files up to 5 MB. Files are stored in `backend/uploads`; production deployments should mount persistent storage there because MongoDB stores the image URL, not the image file itself.

The starter project entries are sample content. Update the profile and projects in the admin workspace before publishing.

## Motion and background video

The portfolio uses subtle scroll-triggered section movement and a muted, looping low-resolution technology video as a fixed background across the entire page. A light overlay keeps text readable. The video is hosted by Pexels and loads only in browsers where reduced motion is not enabled; a static poster is shown otherwise. Replace the video URL and poster in `client/src/App.jsx` with assets you have permission to use. The layout crops the media to fit desktop and mobile screens.

The visual palette uses midnight navy (`#0b132b`), teal (`#5BC0BE`), orange (`#F96900`), and deep plum (`#171123`).

Manrope and DM Mono are bundled with the client and served locally, so the interface typography does not depend on browser-installed fonts or a third-party font service. Licensed font files and their SIL Open Font Licenses are in `client/public/fonts`.

Quick navigation is available from the header or with `Ctrl+K` / `Command+K`; search sections, projects, and actions, then use the arrow keys and Enter to navigate. A thin reading-progress indicator tracks the page as you scroll.

The contact section is followed by Circuit Break, a three-sector tactical maze. Collect every data shard, avoid the moving security patrol, and reach the exit. Use WASD, arrow keys, or the on-screen directional pad.
