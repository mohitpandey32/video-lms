# Arcwell LMS

Arcwell is split into two independently deployable applications:

```text
frontend/  React + Vite static site
backend/   Express API + MongoDB sessions and data
```

The frontend calls the backend through `VITE_API_URL`. The backend permits the frontend origin through `CLIENT_ORIGIN`. Authentication uses an HTTP-only session cookie, so frontend requests include credentials.

## Local development

Install each application:

```bash
npm install
npm run install:all
```

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Optionally create `frontend/.env` from `frontend/.env.example`. Without it, local development defaults to `http://localhost:4000`.

Import the included seed data once:

```bash
npm run migrate:mongo
```

Start both applications:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

## Sevalla deployment

### Backend — Application Hosting

Create a Sevalla Application with:

```text
Build path: /backend
Start command: npm start
```

Set these runtime environment variables:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
MONGODB_DB=corebase
SESSION_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=https://video-lms-bkyz7.sevalla.app
```

Set this variable for both build and runtime so Sevalla uses a MongoDB-driver-compatible Node release:

```env
NIXPACKS_NODE_VERSION=22
```

Sevalla provides `PORT`; do not set it manually. After the backend is deployed, verify:

```text
https://YOUR-BACKEND-DOMAIN/api/health
```

The response should be `{"status":"ok"}`. Run `npm run migrate:mongo` once from the backend web terminal to import the bundled course and users.

For an existing database, synchronize course title and instructor metadata without replacing modules, users, or progress:

```bash
npm run sync:course-metadata
```

### Frontend — Static Site Hosting

Keep the existing static frontend and configure:

```text
Build path: /frontend
Build command: npm run build
Publish directory: dist
```

Set this build-time environment variable to the backend Application URL:

```env
VITE_API_URL=https://YOUR-BACKEND-DOMAIN
```

Do not include a trailing slash or `/api`. Redeploy the frontend whenever `VITE_API_URL` changes.

## Sign up availability

Sign up is disabled by default: the frontend hides the sign-up tab and the backend rejects `POST /api/auth/signup` with HTTP 403. Existing users can still log in.

To re-enable sign up, set `SIGNUP_ENABLED=true` in the backend environment and `VITE_SIGNUP_ENABLED=true` in the frontend build environment. Restart or redeploy the backend and rebuild or redeploy the frontend. The signup form and account creation logic are preserved.

## Data storage

Runtime data is stored in MongoDB collections:

- `lms_courses`
- `lms_users`
- `lms_progress`
- `lms_sessions`

The JSON files under `backend/server/` are migration seeds only. The running application does not read them directly.
