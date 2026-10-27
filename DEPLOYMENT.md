# Deployment Guide

The application deploys as an Express API with a React frontend and MongoDB Atlas. Payments are simulated in the application; there is no payment provider, gateway account, payment credential, or webhook to configure. Every completed payment is labeled as a demo and does not transfer money.

Use Node.js 20 or later.

## 1. Prepare production configuration

1. Create a MongoDB Atlas cluster and a database user with access only to the application's database.
2. Configure Atlas network access for the backend host.
3. Generate a unique `JWT_SECRET` of at least 32 characters.
4. Provision an administrator using `scripts/provision-admin.js` with a strong password. Do not use demo seed credentials publicly.
5. Keep database and hosting secrets out of source control. No payment secrets are needed.

Production startup does not seed demo users or trains. Existing database records are not deleted or migrated automatically. The development seed command only inserts sample records into empty collections; in production it refuses to run unless `ALLOW_DEMO_SEED=true` is explicitly set.

## 2. Deploy the backend

For a host such as Render:

- Build command: `npm ci --prefix server && npm ci --prefix client && npm run build:client`
- Start command: `npm start`
- Health/readiness URL: `https://<backend-domain>/api/health`

The root `render.yaml` defines the backend service, generated JWT secret, and prompts for the Atlas URI and frontend origin. Connect the repository to Render using its Blueprint flow and enter those values.

Required backend environment variables:

| Variable | Required value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Supplied by the host |
| `MONGODB_URI` | Atlas connection string for the application database |
| `JWT_SECRET` | Unique random value, at least 32 characters |
| `CORS_ORIGINS` | Exact public frontend origin(s), comma-separated, no trailing slash |

The MongoDB deployment must support transactions; Atlas replica-set deployments do. `/api/health` returns HTTP 503 while MongoDB is unavailable.

## 3. Deploy the frontend

For a static host such as Vercel:

- Project root: `client`
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://<backend-domain>/api`

`client/vercel.json` rewrites application routes to `index.html`. Add the exact Vercel origin to the backend's `CORS_ORIGINS` and redeploy the backend.

For local development, leave `VITE_API_BASE_URL` unset; Vite proxies `/api` to the local backend.

## 4. Payment behavior

Checkout offers UPI / Google Pay, debit card, and credit card as demo-only selections. No card numbers, CVVs, UPI PINs, or banking credentials are requested or stored. The backend recalculates fare, temporarily holds seats, and creates the confirmed booking and simulated payment record in one transaction only after the passenger confirms the demo payment. Failed, cancelled, and expired attempts release held seats. Cancellation releases confirmed seats; demo payments are not real transactions and do not produce refunds.

Admin metrics separate demo payment totals from real revenue, which remains zero. Historical payment and booking records are retained and are not changed by deployment.

## 5. Operations

Notifications appear in the authenticated in-app notification center only. No email, SMS, or push provider is configured. Payment seat holds expire after 10 minutes. The built-in rate limiter is process-local; for multiple backend instances, configure a shared rate-limit store before relying on limits across instances. Configure hosting logs/alerts for API errors and monitor `/api/health`.
