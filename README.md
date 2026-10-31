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

## Deploying the frontend

The production client always sends API requests to `https://portfoliobackend-toht.onrender.com`, even if `VITE_API_URL` is set in the frontend host's build environment. Local development can use `VITE_API_URL` or the Vite proxy to `http://localhost:4000`.

On the backend host, set `FRONTEND_ORIGINS` to the exact frontend origin (or a comma-separated list of origins), with no trailing slash, so the browser can access the API and send admin cookies. If the frontend and API use different site domains and admin sign-in needs cross-site cookies, set `ADMIN_COOKIE_SAME_SITE=none`; production cookies are marked `Secure`.

## MongoDB persistence

Set `MONGODB_URI` in `backend/.env` to a MongoDB connection string. The API connects to the `portfolio` database before accepting requests. Add the development machine's outbound IP to Atlas Network Access; this workspace currently exits as `4.240.18.224/32` (the address may change). If Atlas is unavailable, `/api/health` reports `storage: unavailable` and database-backed reads and writes return an error instead of appearing to save. Without `MONGODB_URI`, local preview uses in-memory storage.

For deployment, set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and a persistent random `JWT_SECRET` as environment variables. Generate a password hash with:

```bash
node -e "console.log(require('./backend/node_modules/bcryptjs').hashSync('your-password', 12))"
```

Build the client with `npm run build --prefix client`; then start the API with `npm start --prefix backend`. Express serves the built client from `client/dist`.

Project cover images can be uploaded from the admin workspace as JPEG, PNG, WebP, or GIF files up to 5 MB. Files are stored in `backend/uploads`; production deployments should mount persistent storage there because MongoDB stores the image URL, not the image file itself.

The starter project entries are sample content. Update the profile and projects in the admin workspace before publishing.

## Performance and motion

The portfolio uses a static background image rather than autoplaying video to reduce network use and decoding work. Scroll-triggered movement respects the reduced-motion preference. The hero image is resized and compressed at its image host, and project cover images load as needed while scrolling.

The visual palette uses midnight navy (`#0b132b`), teal (`#5BC0BE`), orange (`#F96900`), and deep plum (`#171123`).

Manrope and DM Mono are bundled with the client and served locally, so the interface typography does not depend on browser-installed fonts or a third-party font service. Licensed font files and their SIL Open Font Licenses are in `client/public/fonts`.

Quick navigation is available from the header or with `Ctrl+K` / `Command+K`; search sections, projects, and actions, then use the arrow keys and Enter to navigate. A thin reading-progress indicator tracks the page as you scroll.

The contact section is followed by Circuit Break, a three-sector tactical maze. Collect every data shard, avoid the moving security patrol, and reach the exit. Use WASD, arrow keys, or the on-screen directional pad.
