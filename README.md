# Poker Advisor (Educational Texas Hold'em)

Educational Texas Hold'em assistant with:

- Python backend API (`/health`, `/advice`)
- React/Vite frontend using manual input only
- CLI mode for local hand analysis

## Safety

- Learning and offline analysis only.
- No poker site integration.
- No overlays, scraping, or automation.
- Manual user input only.

## Backend API

Backend entrypoint: `poker_advisor/api.py`

Routes:

- `GET /health` -> `{ "status": "ok" }`
- `POST /advice` -> advice JSON

## One-command dev startup (backend + frontend)

From repo root:

```bash
npm install
pip install -r requirements-dev.txt
npm run dev
```

This starts:

- Backend at `http://127.0.0.1:8000`
- Frontend at `http://localhost:5173`
- Wait check that prints: `Backend ready: http://127.0.0.1:8000/health`

### Windows PowerShell

```powershell
cd C:\Users\yifei\Poker_prediction
npm install
python -m pip install -r requirements-dev.txt
npm run dev
```

## Frontend API behavior (fixed)

- Frontend defaults to `/api` (proxy mode) in dev.
- Vite proxy forwards `/api/*` to backend origin (default `http://localhost:8000`).
- If `VITE_API_BASE_URL` is accidentally set to frontend origin (for example `http://localhost:5173`), UI warns and auto-falls back to `/api`.

## Frontend env

Create `poker_advisor_ui/.env` (or copy `.env.example`):

```bash
VITE_BACKEND_ORIGIN=http://localhost:8000
# Optional: leave unset in dev
# VITE_API_BASE_URL=
```

## Health checks

- Browser UI runs health check on load and on Retry.
- Manual check:

```bash
curl http://127.0.0.1:8000/health
```

Expected:

```json
{"status":"ok"}
```

## CLI usage

```bash
python -m poker_advisor.cli
```

## Tests

Backend tests:

```bash
python -m pytest -q
```

Frontend tests:

```bash
npm --prefix poker_advisor_ui run test
```

Frontend build:

```bash
npm --prefix poker_advisor_ui run build
```
