# Poker Advisor UI

Modern frontend for the educational Texas Holdem advice workflow.

## Scope

- Educational and offline analysis only.
- Manual input only.
- No poker site integration or automation.

## API contract

Frontend expects backend routes:

- `GET /health`
- `POST /advice`

## Dev API routing (recommended)

By default, frontend calls relative `/api/*` routes.
Vite proxy forwards these to your backend origin.

- Frontend URL: `http://localhost:5173`
- Proxy path: `/api`
- Backend default: `http://localhost:8000`

## Environment

Copy `.env.example` to `.env`:

```bash
VITE_BACKEND_ORIGIN=http://localhost:8000
# Optional absolute override (usually leave unset in dev)
# VITE_API_BASE_URL=
```

If `VITE_API_BASE_URL` is set to frontend origin (for example `http://localhost:5173`), UI warns and falls back to `/api`.

## Run standalone frontend

```bash
npm install
npm run dev
```

## Run with backend from repo root (recommended)

```bash
npm run dev
```

## Test and build

```bash
npm run test
npm run build
```

## Notes

- Advice panel performs health checks on page load and on Retry.
- On API failure, no fake recommendation is shown.
- Advanced details panel shows URL, payload, response/error, and health diagnostics.
