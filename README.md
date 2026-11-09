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

Visitors create an account with their name, email, and a password of at least 6 characters. The backend emails a six-digit verification code that expires after 10 minutes; users must verify their email before signing in. The **Forgot password?** flow sends a separate six-digit reset code to the verified email; it also expires after 10 minutes and can be used once. Passwords and verification codes are not stored in plaintext.

Email verification and password recovery require a backend email provider. **Render Free web services cannot send outbound SMTP on ports 25, 465, or 587.** Therefore, Gmail SMTP will not work on a Render Free backend even with a correct Google App Password. Use the Resend HTTPS API described below, or host the backend somewhere that permits SMTP.

For Render Free, configure Resend SMTP in the backend service's **Environment** settings:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | An API key created in your Resend account |
| `RESEND_FROM` | A sender such as `Portfolio <accounts@your-verified-domain.com>` |

Verify the sender domain in Resend before using it. Add these values to Render's backend service environment (not the frontend and not source control), save, and wait for the backend to redeploy. Nodemailer connects to Resend at `smtp.resend.com` on port `2587` using the API key as its SMTP password. Render Free blocks outbound SMTP on ports 25, 465, and 587, but not 2587 according to its documented restriction. When either Resend setting is present, both are required; otherwise the backend can use the configured SMTP fallback.

On a host that permits SMTP, Gmail can instead be configured in the backend service's **Environment** settings:

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_FROM` | Your Gmail address (for example, `ezranzioki@gmail.com`) |
| `SMTP_USER` | The same Gmail address |
| `SMTP_PASS` | A Google App Password for that account (not your regular Gmail password) |

Create a Google App Password in your Google Account's **Security → 2-Step Verification → App passwords** settings. Keep it secret and enter it only in the hosting provider's Environment settings, never in source control or chat. Save the settings and wait for the backend to redeploy before registering. With `MONGODB_URI` configured, accounts are stored in the `emailaccounts` collection; without MongoDB, account data is temporary and is lost when the backend restarts. The backend rate-limits sign-in, registration, and verification attempts. Account names, email addresses, IP addresses, and approximate locations are retained until an admin deletes them from Admin → Users. Existing Google sign-in records remain in the legacy `users` collection and can be removed from that admin page; Google sign-in is no longer available.

Render documents this restriction in its [Free web services limitations](https://render.com/docs/free#other-limitations).

## MongoDB persistence

Set `MONGODB_URI` in `backend/.env` to a MongoDB connection string. The API connects to the `portfolio` database before accepting requests. Add the development machine's outbound IP to Atlas Network Access; this workspace currently exits as `4.240.18.224/32` (the address may change). If Atlas is unavailable, `/api/health` reports `storage: unavailable` and database-backed reads and writes return an error instead of appearing to save. Without `MONGODB_URI`, local preview uses in-memory storage.

Admin sign-in requires MongoDB. To create the initial admin account, set `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` (or `ADMIN_PASSWORD`) in the backend environment before starting the API. If the `adminaccounts` collection is empty, the API creates one admin record using those values; the password is stored as a bcrypt hash. Once an admin record exists, login checks the database, and changing the bootstrap environment values will not change that account's credentials. The API does not fall back to environment credentials if MongoDB is unavailable. Also set a persistent random `JWT_SECRET` for deployments. Generate a password hash with:

```bash
node -e "console.log(require('./backend/node_modules/bcryptjs').hashSync('your-password', 12))"
```

Build the client with `npm run build --prefix client`; then start the API with `npm start --prefix backend`. Express serves the built client from `client/dist`.

Hero and project cover images can be uploaded from the admin workspace as JPEG, PNG, WebP, or GIF files up to 5 MB. A PDF CV up to 10 MB can also be uploaded; the public portfolio shows a download button when one is saved. Uploads are stored in Cloudinary, and their secure URLs are saved in MongoDB. In the Cloudinary dashboard, find the cloud name and API key under **Settings → API Keys**, then set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend service environment. Keep these credentials on the backend only; never add them to the frontend environment. Existing image paths from local storage must be re-uploaded from Admin.

The Admin **Analytics** tab tracks page and section views, refreshes every five seconds, and includes a seven-day chart, most-viewed section, and recent visitor details. Visitors must opt in using the on-site analytics notice; declining disables this additional analytics tracking. For visitors who opt in, the backend stores their IP address, approximate GeoIP location, and a random browser ID for up to 90 days. The local GeoIP database does not send visitor IP addresses to a lookup service. Email/password accounts separately store the user's name, email, and latest IP/location in MongoDB until an admin deletes the account. Analytics persist in MongoDB when configured and otherwise remain in memory until the backend restarts.

The starter project entries are sample content. Update the profile and projects in the admin workspace before publishing.

## Performance and motion

The portfolio uses a static background image rather than autoplaying video to reduce network use and decoding work. Scroll-triggered movement respects the reduced-motion preference. The hero image is resized and compressed at its image host, and project cover images load as needed while scrolling.

The visual palette uses midnight navy (`#0b132b`), teal (`#5BC0BE`), orange (`#F96900`), and deep plum (`#171123`).

Manrope and DM Mono are bundled with the client and served locally, so the interface typography does not depend on browser-installed fonts or a third-party font service. Licensed font files and their SIL Open Font Licenses are in `client/public/fonts`.

Quick navigation is available from the header or with `Ctrl+K` / `Command+K`; search sections, projects, and actions, then use the arrow keys and Enter to navigate. A thin reading-progress indicator tracks the page as you scroll.

The contact section is followed by Circuit Break, a three-sector tactical maze. Collect every data shard, avoid the moving security patrol, and reach the exit. Use WASD, arrow keys, or the on-screen directional pad.
