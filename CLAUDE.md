# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WoL PWA is a Wake-on-LAN Progressive Web App running on a Raspberry Pi. Users authenticate with a PIN via a mobile-installable PWA, then remotely wake a PC and monitor its status. Traffic flows: Phone → Cloudflare Tunnel → Nginx (port 80) → Express.js (port 3000) → `execFile(wakepc)`.

## Commands

```bash
# Install dependencies
npm install

# Start the server (runs on port 3000)
npm start

# Generate a bcrypt PIN hash for .env
node scripts/generate-pin-hash.js

# Generate PWA icons from SVG
node scripts/generate-icons.js
```

There is no build step, test suite, or linter configured. The frontend is vanilla JS served as static files.

## Architecture

**Backend** (`server/index.js` — single file, ~550 lines): Express.js server handling all API routes, PIN authentication with bcrypt, session management (24h max / 15min inactivity timeout), rate limiting (per-endpoint), brute force detection (per-IP), and command execution via `execFile()` (not `exec()` — no shell injection). Allowed commands are whitelisted.

**Frontend** (`public/`): Vanilla JS PWA with no framework or build tooling.
- `app.js` — Main controller; manages auth state, dashboard rendering, wake/status actions
- `auth.js` — Authentication (login/logout), device detection, session tracking
- `components/StatusCard.js` — PC status display (online/offline/waking/error)
- `components/LoginMonitor.js` — Recent login history with IP masking
- `components/LoginHistoryModal.js` — Full login history modal
- `utils/storage.js` — LocalStorage wrapper for login history, suspicious attempts, timestamps
- `sw.js` — Service Worker: network-first for API, cache-first for static assets

**API Endpoints** (all under `/api/`):
- `POST /auth/login` — PIN authentication
- `POST /auth/logout` — Session destroy
- `GET /auth/status` — Check if authenticated
- `GET /auth/sessions` — Login history (auth required)
- `POST /wake` — Execute wake command (auth required)
- `GET /status` — Ping PC for online status (auth required)
- `GET /health` — Public health check

**Infrastructure** (`systemd/`, `nginx/`):
- `systemd/wol.service` — Node.js auto-restart service
- `systemd/cloudflared.service` — Cloudflare Tunnel service
- `nginx/wol.conf` — Reverse proxy to port 3000, static file serving with 7-day cache, SPA fallback

## Configuration

Environment variables in `.env` (see `.env.example`):
- `PIN_HASH` — bcrypt hash of the 4-6 digit PIN (required)
- `SESSION_SECRET` — base64 session key (required)
- `WAKE_CMD` — command to execute (default: `wakepc`)
- `PC_IP` — target PC IP for status checks
- `ALLOWED_ORIGINS` — CORS whitelist (comma-separated)
- `PORT` — server port (default: 3000)

## Security Notes

- Command execution uses `execFile()` with a whitelist — never use `exec()` or pass unsanitized input
- PIN hash and session secret live in `.env` which is gitignored
- Cookies are httpOnly + sameSite strict
- Rate limits: auth 5/15min, wake 5/min, status 30/min
- Brute force lockout: 3 failed attempts in 5 minutes per IP
