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

Open the Vite URL shown in the terminal. The client proxies `/api` requests to the backend on port 4000. From the homepage sign-in screen, choose **Admin? Sign in with username** to enter the admin workspace without changing the URL. The admin workspace is also available from its query-string route, so it works on static hosting without a rewrite rule.

## Deploying the frontend

The production client reads its API base URL from `client/.env.production` (`VITE_API_BASE_URL`). Vite requires the `VITE_` prefix to expose environment variables to frontend code. The current value is `https://portfoliobackend-toht.onrender.com`. Local development can use `VITE_API_BASE_URL` or the Vite proxy to `http://localhost:4000`.

On the backend host, set `FRONTEND_ORIGINS` to the exact frontend origin (or a comma-separated list of origins), with no trailing slash, so the browser can access the API and send admin cookies. Production defaults admin cookies to `SameSite=None` and marks them `Secure` for separately hosted frontend and API services. Set `ADMIN_COOKIE_SAME_SITE` only if you need to override that behavior.

Use [`backend/.env.example`](./backend/.env.example) for local development. For Render, use [`backend/.env.render.example`](./backend/.env.render.example) as the complete production variable list: replace every placeholder and add the values in the backend service's **Environment** settings. Render does not load the file automatically. Keep real credentials out of source control and do not set `PORT`; the host assigns it.

Visitors register with a username, email address, and password; a phone number can optionally be saved to the account. Registration verification, email-code sign-in, and password recovery send a generated six-digit code through the configured email provider. Codes expire after 10 minutes, are stored as purpose-bound hashes, and can be used once. Passwords and codes are not stored in plaintext.

For production, use Resend's HTTPS API rather than SMTP, which some backend hosts block. Verify a sending domain in Resend, create an API key, then set these variables in the backend host's environment:

| Variable | Value |
|---|---|
| `EMAIL_PROVIDER` | Set to `resend` |
| `RESEND_API_KEY` | Resend API key; keep it private |
| `EMAIL_FROM` | Sender using the verified domain, such as `Ezra Nzioki <no-reply@example.com>` |

For local development, add these to `backend/.env`:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=Ezra Nzioki <no-reply@example.com>
```

The sender domain in `EMAIL_FROM` must be verified with Resend. For local testing, Resend's test sender can only deliver to the account owner's email; verify your own domain to send to other recipients. To keep using SMTP instead, set `EMAIL_PROVIDER=smtp`, `EMAIL_USER`, and `EMAIL_PASS`. For a custom SMTP provider, also set its connection details:

```env
EMAIL_PROVIDER=smtp
EMAIL_USER=your-smtp-username
EMAIL_PASS=your-smtp-password
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_FROM=your-verified-sender@example.com
```

Keep all email credentials on the backend only; never put them in the client environment. With `MONGODB_URI` configured, accounts are stored in `emailaccounts`; without MongoDB, account data is temporary and is lost when the backend restarts. Usernames, email addresses, optional phone numbers, IP addresses, and approximate locations are retained until an admin deletes the account.

If delivery fails in production, check the backend host's environment settings (the ignored local `backend/.env` is not deployed), confirm that `EMAIL_FROM` is on a verified Resend domain, then redeploy the latest backend source.

## MongoDB persistence

Set `MONGODB_URI` in `backend/.env` to a MongoDB connection string. The API connects to the `portfolio` database before accepting requests. Add the development machine's outbound IP to Atlas Network Access; this workspace currently exits as `4.240.18.224/32` (the address may change). If Atlas is unavailable, `/api/health` reports `storage: unavailable` and database-backed reads and writes return an error instead of appearing to save. Without `MONGODB_URI`, local preview uses in-memory storage.

Admin sign-in requires MongoDB. To create the initial admin account, set `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (or `ADMIN_PASSWORD`) in the backend environment before starting the API. If the `adminaccounts` collection is empty, the API creates one admin record using those values; the password is stored as a bcrypt hash. Once an admin record exists, login checks the database, and changing the bootstrap environment values will not change that account's credentials. The API does not fall back to environment credentials if MongoDB is unavailable. Also set a persistent random `JWT_SECRET` for deployments. Generate a password hash with:

```bash
node -e "console.log(require('./backend/node_modules/bcryptjs').hashSync('your-password', 12))"
```

Build the client with `npm run build --prefix client`; then start the API with `npm start --prefix backend`. Express serves the built client from `client/dist`.

Hero and project cover images can be uploaded from the admin workspace as JPEG, PNG, WebP, or GIF files up to 5 MB. A PDF CV up to 10 MB can also be uploaded; the public portfolio shows a download button when one is saved. Uploads are stored in Cloudinary, and their secure URLs are saved in MongoDB. In the Cloudinary dashboard, find the cloud name and API key under **Settings → API Keys**, then set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend service environment. Keep these credentials on the backend only; never add them to the frontend environment. Existing image paths from local storage must be re-uploaded from Admin.

The Admin **Analytics** tab tracks page and section views, refreshes every five seconds, and includes a seven-day chart, most-viewed section, and recent visitor details. Visitors must opt in using the on-site analytics notice; declining disables this additional analytics tracking. For visitors who opt in, the backend stores their IP address, approximate GeoIP location, and a random browser ID for up to 90 days. The local GeoIP database does not send visitor IP addresses to a lookup service. Visitor accounts store the username, email, optional phone number, and latest IP/location in MongoDB until an admin deletes the account. Analytics persist in MongoDB when configured and otherwise remain in memory until the backend restarts.

The starter project entries are sample content. Update the profile and projects in the admin workspace before publishing.

## Performance and motion

The portfolio uses a static background image rather than autoplaying video to reduce network use and decoding work. Scroll-triggered movement respects the reduced-motion preference. The hero image is resized and compressed at its image host, and project cover images load as needed while scrolling.

The visual palette uses midnight navy (`#0b132b`), teal (`#5BC0BE`), orange (`#F96900`), and deep plum (`#171123`).

Manrope and DM Mono are bundled with the client and served locally, so the interface typography does not depend on browser-installed fonts or a third-party font service. Licensed font files and their SIL Open Font Licenses are in `client/public/fonts`.

Quick navigation is available from the header or with `Ctrl+K` / `Command+K`; search sections, projects, and actions, then use the arrow keys and Enter to navigate. A thin reading-progress indicator tracks the page as you scroll.

The contact section is followed by Circuit Break, a three-sector tactical maze. Collect every data shard, avoid the moving security patrol, and reach the exit. Use WASD, arrow keys, or the on-screen directional pad.
