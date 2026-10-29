# Railway Passenger Digital Platform

## Live Demo

[Open the deployed application](https://railway-passenger-management-system.onrender.com/)

Existing React, Express, and MongoDB application for passenger train search, ticketing, and railway administration. Checkout uses clearly labeled simulated payment methods only; no real payment gateway is connected. Train-running status is demonstration data, not a live railway or GPS feed.

## Local development

### Requirements

- Node.js 20 or later
- MongoDB running as a replica set (booking, registration, and cancellation use transactions)

### Install and run

```powershell
npm run setup
Copy-Item .env.example server/.env
npm run dev
```

The API runs on port `5000` and the Vite client on port `3000`. The server seeds sample users/trains only when the corresponding MongoDB collections are empty and `NODE_ENV` is not `production`. Existing records are not removed. Sample users are for local development only.

To provision a separate admin instead of using a local demo account:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "YourNewUniquePassword@2026"
node scripts/provision-admin.js
```

The password must be at least eight characters. The script hashes it and does not print it. Do not use sample/demo credentials on a public deployment.

If Node.js reports `querySrv ECONNREFUSED` for an Atlas `mongodb+srv://` URI, set `MONGODB_DNS_SERVERS` to a DNS resolver reachable from your machine before running the script (for example, the DNS server configured for your network). This optional setting affects only the provisioning process; it does not change the Atlas URI or the production server's DNS configuration.

## Production build and start

```powershell
npm run build:client
npm start
```

The server listens on the hosting provider's `PORT`, binds to `0.0.0.0`, and serves `client/dist` if the frontend bundle is present. Production startup does not generate demo users or trains.

## Features

- Passenger registration, login, JWT authentication, and ownership-protected booking/notification APIs.
- Role-protected admin fleet and booking management.
- Train search, schedules, dynamic fare display, and database-backed availability.
- UPI / Google Pay, debit card, and credit card as demo-only checkout options. The UI never requests payment credentials, and simulated transactions never count as real revenue.
- A temporary seat hold expires after ten minutes. Booking and payment confirmation are transactional; a captured payment arriving after the hold expires is not ticketed and triggers a refund request.
- Cancellation restores inventory atomically. Demo payments are not real transactions and do not produce refunds.
- Ticket view supports browser printing / Save to PDF.
- Notifications are in-app only; no email, SMS, or push delivery provider is configured.
- Train status and route progression are demonstration data and must not be represented as live tracking.

## Payments

Checkout offers UPI / Google Pay, debit card, and credit card as simulated choices. The backend recalculates fare and creates the booking only after the user confirms; it records payment as simulated and does not transfer money. Payment entry fields and financial credentials are not used. Failed or cancelled attempts release held seats, and cancelled demo bookings do not trigger refunds.

## Deployment and configuration

The live application is hosted on Render: [Railway Passenger Digital Platform](https://railway-passenger-management-system.onrender.com/). The Render service configuration is in [render.yaml](./render.yaml). Configure the required production environment variables in the Render dashboard.

Important configuration:

- Render: `MONGODB_URI`, `JWT_SECRET` (32+ characters in production), and `NODE_ENV=production`.
- Frontend: leave `VITE_API_BASE_URL` unset; production requests use same-origin `/api`. See [client/.env.example](./client/.env.example).
- Backend example: [.env.example](./.env.example).

Production health/readiness is available at `/api/health`; it returns HTTP 503 if MongoDB is unavailable. Cross-origin requests are denied unless exact origins are explicitly allowlisted.

## Database and sample data

MongoDB Atlas is supported through `MONGODB_URI`. Production never seeds automatically. `npm run seed` is a controlled development seed operation that only inserts into empty collections; it refuses production execution unless `ALLOW_DEMO_SEED=true` is explicitly set. No seed or deployment command deletes existing records. Historical payment and booking records are retained.

## Tests

```powershell
npm test
$env:BASE_URL = "http://localhost:5000"
node test_e2e.js
npm run build:client
```

Unit tests cover simulated payment safeguards and fare calculations. The local API integration script exercises authentication, admin authorization, search, payment success/failure/cancellation/expiry, fare validation, duplicate submission protection, booking cancellation, and seat restoration. It uses local seeded test accounts, then removes only the payment, booking, and notification records it created. Demo payments do not represent real transactions. Passing automated checks does not mean the public deployment has been verified.

## ZIP archive

`npm run zip` remains available for creating a project ZIP. The app UI does not expose a ZIP download link.
