# Deployment Guide

The application deploys as a React frontend and Express API in one Vercel project, using MongoDB Atlas. Payments are simulated; no gateway account, credentials, or webhook is needed. Every completed payment is labeled as a demo and does not transfer money.

Use Node.js 20 or later. Vercel's [Express runtime](https://vercel.com/docs/frameworks/backend/express) supports the API, and Vercel serves the Vite build from its static `public/` output. The API uses the same `/api` origin as the frontend.

## 1. Prepare production configuration

1. Use a MongoDB Atlas database user scoped to the application's database.
2. Ensure Atlas Network Access permits Vercel's serverless connections. If the current allowlist only contains a developer's IP, the deployment cannot connect.
3. Generate a unique `JWT_SECRET` of at least 32 characters.
4. Provision an administrator using `scripts/provision-admin.js` with a strong password. Do not use demo seed credentials publicly.
5. Keep all secrets in Vercel Project Settings, never in source control.

Atlas replica-set deployments support the transactions used by the booking and simulated-payment flow. Production startup does not seed demo users or trains. Existing database records are not deleted or migrated automatically.

## 2. Import and configure the Vercel project

Import `MPriyadharshini-alt/Railway-Passenger-Management-System` from GitHub and use these project settings:

| Setting | Value |
| --- | --- |
| Framework preset | Express (auto-detected from the root `server.js`) |
| Root directory | `.` (repository root) |
| Install command | `npm ci && npm ci --prefix server && npm ci --prefix client` |
| Build command | `npm run build:vercel` |
| Output directory | Leave the default; Vercel serves the generated root `public/` directory |

Add these Production environment variables in Vercel. Enter secret values directly in Vercel; do not share them in chat or commit them:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | The Atlas connection string for the application database |
| `JWT_SECRET` | A unique random value of at least 32 characters |

Do not set `VITE_API_BASE_URL`; the frontend defaults to the same-origin `/api` endpoint. `CORS_ORIGINS` is optional: same-origin requests work without it, and cross-origin requests are denied unless exact origins are explicitly allowlisted.

The repository-root `server.js` exports the existing Express app as Vercel's documented Express entrypoint. The root `vercel.json` excludes `/api/*` from the SPA fallback and sends frontend routes to `index.html`. The existing `client/vercel.json` is for a standalone client deployment and is not used by the combined root project.

After deployment, verify `https://<your-vercel-domain>/api/health`. It returns HTTP 503 if MongoDB is unavailable. Vercel serverless instances reuse MongoDB connections, and expired seat holds are swept during API traffic rather than by a persistent process timer.

For local development, leave `VITE_API_BASE_URL` unset; Vite proxies `/api` to the local backend.

## 4. Payment behavior

Checkout offers UPI / Google Pay, debit card, and credit card as demo-only selections. No card numbers, CVVs, UPI PINs, or banking credentials are requested or stored. The backend recalculates fare, temporarily holds seats, and creates the confirmed booking and simulated payment record in one transaction only after the passenger confirms the demo payment. Failed, cancelled, and expired attempts release held seats. Cancellation releases confirmed seats; demo payments are not real transactions and do not produce refunds.

Admin metrics separate demo payment totals from real revenue, which remains zero. Historical payment and booking records are retained and are not changed by deployment.

## 5. Operations

Notifications appear in the authenticated in-app notification center only. No email, SMS, or push provider is configured. Payment seat holds expire after 10 minutes. The built-in rate limiter is process-local; for multiple backend instances, configure a shared rate-limit store before relying on limits across instances. Configure hosting logs/alerts for API errors and monitor `/api/health`.
