# Phillip WA Gateway — Technical Documentation

**Version:** 1.0.0  
**Prepared for:** Phillip Securities HK Limited  
**Date:** May 2026  
**Classification:** Internal — Implementation Proposal  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Application Overview](#2-application-overview)
3. [System Architecture](#3-system-architecture)
4. [Component Breakdown](#4-component-breakdown)
5. [API Reference](#5-api-reference)
6. [Security Model](#6-security-model)
7. [Data Model](#7-data-model)
8. [Deployment Guide](#8-deployment-guide)
9. [Technology Stack](#9-technology-stack)
10. [Operational Features](#10-operational-features)

---

## 1. Executive Summary

**Phillip WA Gateway** is a self-hosted WhatsApp messaging gateway designed to integrate internal monitoring and alerting systems (such as SolarWinds, PRTG, or any HTTP-capable tool) with WhatsApp — without relying on third-party cloud services or paid WhatsApp Business APIs.

The system enables automated delivery of operational alerts, notifications, and broadcasts to WhatsApp individuals or groups, with a full web-based administration dashboard for management, audit trails, and access control.

**Key Capabilities:**
- Send WhatsApp messages via HTTP REST API
- Multi-instance WhatsApp session management
- Role-based admin dashboard
- Two-factor authentication (TOTP / Google Authenticator)
- Full audit logging of all administrative actions
- API key management with SHA-256 hashing (plaintext never stored)
- IP whitelist for trusted sender systems
- Message queue with automatic retry (BullMQ + Redis)
- 90-day message log retention with automatic cleanup

---

## 2. Application Overview

### Use Case

Internal systems (network monitoring tools, alerting platforms, or custom scripts) send HTTP POST requests to the gateway. The gateway authenticates the request, validates and normalizes the destination, routes the message to the appropriate WhatsApp instance, and delivers it to the target phone number or group.

### Primary Integration Flow

```
SolarWinds / PRTG / Custom Script
        │
        │  POST /send-message
        │  Authorization: Bearer <api-key>
        │  { "id": "628xxx", "message": "Alert: ..." }
        ▼
  WA Gateway (Express REST API)
        │
        ├─ Auth Middleware (API key or IP whitelist)
        ├─ Request body validation
        ├─ JID normalization (phone number → WhatsApp format)
        ├─ WhatsApp number existence check
        ├─ Message queue (BullMQ + Redis, 3 retries)
        ▼
  Baileys WhatsApp Client (per instance)
        │
        ▼
  WhatsApp Recipient / Group
```

### Admin Dashboard

A React-based admin dashboard (accessible via browser) allows administrators to:
- Scan QR codes to link WhatsApp accounts (instances)
- Monitor all instance connection statuses in real-time via WebSocket
- View and filter message delivery logs with statistics
- Manage API keys, admin users, IP whitelist, and group aliases
- Review the full admin action audit trail
- Read interactive inline API documentation

---

## 3. System Architecture

### Container Architecture

The application is fully containerized using Docker Compose with 4 services on an isolated internal Docker network:

```
┌─────────────────────────────────────────────────────────────┐
│                  Docker Network: wa-network                  │
│                                                             │
│  ┌────────────────┐    ┌────────────────┐                   │
│  │   Frontend     │    │   Backend      │                   │
│  │  React + Nginx │───▶│  Node.js 20    │                   │
│  │  Port: 3001    │    │  Port: 3000    │                   │
│  └────────────────┘    └───────┬────────┘                   │
│                                │                            │
│                   ┌────────────┴──────────┐                 │
│                   │                       │                 │
│            ┌──────▼──────┐      ┌─────────▼──────┐         │
│            │    Redis    │      │   SQLite Web   │         │
│            │  (internal) │      │  localhost:3002 │         │
│            └─────────────┘      └────────────────┘         │
│                                                             │
│  Named Volumes: wa-redis-data, wa-db-data                   │
│  Bind Mounts:   ./sessions, ./logs                          │
└─────────────────────────────────────────────────────────────┘
```

| Service | Image | Host Port | Purpose |
|---|---|---|---|
| `wa-frontend` | nginx:alpine | 3001 | React SPA + Nginx reverse proxy |
| `wa-backend` | node:20-alpine | 3000 | REST API + WebSocket + WhatsApp engine |
| `wa-redis` | redis:7-alpine | internal only | BullMQ message queue broker |
| `wa-sqliteweb` | coleifer/sqlite-web | 127.0.0.1:3002 | Database browser (local access only) |

### Nginx Reverse Proxy Routing

The Nginx container in the frontend service proxies requests to the backend:

| Path | Destination | Notes |
|---|---|---|
| `/api/*` | `http://backend:3000/` | Strips `/api` prefix |
| `/socket.io/*` | `http://backend:3000/socket.io/` | WebSocket upgrade enabled |
| All other paths | `index.html` | SPA fallback for React Router |
| Static assets (`*.js`, `*.css`) | Cached 1 year | Immutable cache headers |

---

## 4. Component Breakdown

### 4.1 Backend (`/backend/src/`)

#### Entry Point — `server.js`

- Initializes Express HTTP + Socket.IO on the same port
- Applies global rate limiting (100 req/min per IP)
- Sets `trust proxy = 1` for correct IP extraction behind Nginx
- Triggers WhatsApp instance reconnections on startup
- Schedules log cleanup every 24 hours

#### API Routes — `routes/index.js`

Three distinct authentication zones:

| Zone | Auth Method | Endpoints |
|---|---|---|
| Public | None | `GET /health`, `POST /auth/login`, `GET /status` |
| External API | API key or IP whitelist | `POST /send-message` |
| Dashboard | JWT Bearer token (8h) | All `/instances/*`, `/admin/*`, `/logs`, `/audit` |

#### Controllers

| File | Responsibility |
|---|---|
| `auth.controller.js` | Login flow: password verify, TOTP check, JWT issuance |
| `message.controller.js` | Validate, normalize, number-check, enqueue messages |
| `instance.controller.js` | CRUD for instances, QR retrieval, group listing |
| `settings.controller.js` | User CRUD, 2FA setup/verify/disable, API key CRUD |
| `groupAlias.controller.js` | Friendly name → WhatsApp group JID mapping |
| `allowedIp.controller.js` | IP whitelist CRUD |
| `log.controller.js` | Paginated message delivery log |
| `audit.controller.js` | Paginated admin action audit log |
| `status.controller.js` | Legacy single-instance status endpoint |

#### Services

| File | Responsibility |
|---|---|
| `waManager.js` | Multi-instance Baileys connection pool; QR, reconnect, contacts cache |
| `queue.service.js` | BullMQ queue + Redis; graceful fallback to direct in-process send |
| `db.js` | SQLite schema creation, idempotent migrations, default admin seeding |
| `user.service.js` | User CRUD, bcrypt hashing, 2FA enable/disable |
| `apikey.service.js` | Key generation (SHA-256), validation, revocation |
| `allowedIp.service.js` | Whitelist with exact, wildcard (`*`), and CIDR matching |
| `audit.service.js` | Write and query admin audit log |
| `log.service.js` | Write and query message delivery log; auto-cleanup after 90 days |
| `groupAlias.service.js` | Alias resolution for message routing |

#### Middlewares

| File | Responsibility |
|---|---|
| `auth.middleware.js` | API key validation (Bearer / `x-api-key` header / body field / IP whitelist) |
| `jwt.middleware.js` | JWT verification; validates user still exists in DB on every request |
| `rateLimit.middleware.js` | 100 requests/minute per IP; `/health` excluded |

#### Utilities

| File | Responsibility |
|---|---|
| `idNormalizer.js` | Converts phone numbers and aliases to WhatsApp JID format |
| `request.utils.js` | Extracts real client IP (respects `X-Forwarded-For`) |

---

### 4.2 Frontend (`/frontend/src/`)

Built with **React 18 + Vite + TailwindCSS**, compiled to a static bundle served by Nginx.

#### Pages

| Page | Route | Description |
|---|---|---|
| `Login.jsx` | `/login` | Username/password + optional TOTP 2FA step |
| `Dashboard.jsx` | `/` | Instance status overview, live WebSocket updates |
| `Instances.jsx` | `/instances` | Add/remove/reset instances, QR code scanner |
| `Groups.jsx` | `/groups` | Browse WhatsApp groups per instance |
| `Logs.jsx` | `/logs` | Filterable delivery log with success/fail stats |
| `AuditLogs.jsx` | `/audit` | Admin action audit trail with cursor pagination |
| `Settings.jsx` | `/settings` | Users, 2FA, API keys, IP whitelist, group aliases |
| `Docs.jsx` | `/docs` | Interactive inline API documentation |

#### Components

| Component | Description |
|---|---|
| `Layout.jsx` | Main shell: sidebar navigation, header, WebSocket status indicator |
| `ForcePasswordChangeModal.jsx` | Blocks all navigation until first-login password change is complete |
| `Pagination.jsx` | Cursor-based pagination control |
| `StatusBadge.jsx` | Color-coded connected/disconnected/connecting status badge |

#### State Management

- **`AuthContext.jsx`** — React Context providing login/logout state, JWT token, and user profile (persisted to `localStorage`)
- Real-time instance state managed in `App.jsx` via Socket.IO events: `instances_init`, `instance_status`, `instance_added`, `instance_removed`

---

### 4.3 WhatsApp Engine — Baileys

The backend uses **`@whiskeysockets/baileys`** (v7), a well-known open-source WhatsApp Web protocol client.

**Instance Lifecycle:**

1. Instance created → session directory provisioned → Baileys socket initialized
2. QR code generated → pushed to all dashboard clients via Socket.IO
3. Admin scans QR with phone → session authenticated → status: `connected`
4. On unexpected disconnect → auto-reconnect in 5 seconds
5. On intentional logout → reconnection skipped; QR flow restarts
6. Session credentials persisted to disk at `/sessions/<instanceId>/`

**Multi-instance:** Each instance runs an independent Baileys WebSocket in the same Node.js process, tracked by an in-memory `Map`. A per-instance contacts cache is maintained for recipient name resolution.

---

### 4.4 Message Queue — BullMQ + Redis

| Property | Value |
|---|---|
| Queue name | `wa-messages` |
| Concurrency | Configurable via `QUEUE_CONCURRENCY` (default: 2) |
| Retry attempts | 3 |
| Retry strategy | Exponential backoff starting at 2 seconds |
| Completed job retention | Last 100 |
| Failed job retention | Last 200 |
| Fallback (no Redis) | Direct in-process send with 3-retry loop |

If Redis is unavailable at startup, the system logs a warning and falls back to a direct send mode — ensuring the service remains functional without Redis.

---

## 5. API Reference

### POST `/auth/login`

Issues a JWT valid for 8 hours.

**Request body:**
```json
{
  "username": "admin",
  "password": "yourpassword",
  "totpCode": "123456"
}
```

**Responses:**

| Scenario | Status | Body |
|---|---|---|
| Success (no 2FA) | 200 | `{ "token": "...", "user": { ... } }` |
| 2FA required | 200 | `{ "requires2FA": true }` |
| Wrong credentials | 401 | `{ "error": "Invalid username or password" }` |
| Wrong TOTP | 401 | `{ "error": "Invalid 2FA code" }` |

---

### POST `/send-message`

**Auth:** API key (`Authorization: Bearer <key>`, `x-api-key` header, or `apikey` body field) or source IP whitelist.

**Request body:**
```json
{
  "id": "628123456789",
  "message": "🚨 Alert: Core Switch DOWN",
  "from": "wa1"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Destination — phone number, group JID, or group alias |
| `message` | string | ✅ | Text message content |
| `from` | string | ❌ | Instance ID (defaults to first connected instance) |

**Accepted `id` formats:**
- `628123456789` — plain phone number
- `628123456789@c.us` — legacy format (auto-converted)
- `628123456789@s.whatsapp.net` — standard JID
- `120363xxxxxx@g.us` — WhatsApp group JID
- `my-alias` — friendly alias defined in group alias settings

**Success Response (202):**
```json
{
  "success": true,
  "jobId": "42",
  "message": "Message queued successfully",
  "destination": "628123456789@s.whatsapp.net",
  "type": "personal",
  "sentFrom": "wa1",
  "sentFromName": "Main Instance"
}
```

---

### Dashboard Routes (JWT required)

| Method | Path | Description |
|---|---|---|
| GET | `/instances` | List all instances with status |
| POST | `/instances` | Create new instance |
| GET | `/instances/:id/status` | Get instance status |
| GET | `/instances/:id/qr` | Get current QR code (base64) |
| POST | `/instances/:id/reset` | Reset (clear session, re-scan QR) |
| DELETE | `/instances/:id` | Remove instance permanently |
| GET | `/instances/:id/groups` | List WhatsApp groups for instance |
| GET | `/logs` | Message delivery logs (paginated, filterable) |
| GET | `/admin/audit-logs` | Admin audit logs (paginated, filterable) |
| GET | `/admin/users` | List admin users |
| POST | `/admin/users` | Create user |
| PUT | `/admin/users/:id/password` | Change user password |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/users/:id/2fa/setup` | Generate 2FA secret + QR code |
| POST | `/admin/users/:id/2fa/verify` | Verify TOTP code and activate 2FA |
| DELETE | `/admin/users/:id/2fa` | Disable 2FA for user |
| GET | `/admin/apikeys` | List API keys (masked display) |
| POST | `/admin/apikeys` | Create new API key |
| DELETE | `/admin/apikeys/:id` | Revoke API key |
| GET | `/admin/group-aliases` | List group aliases |
| POST | `/admin/group-aliases` | Create/update alias |
| DELETE | `/admin/group-aliases/:alias` | Delete alias |
| GET | `/admin/allowed-ips` | List IP whitelist entries |
| POST | `/admin/allowed-ips` | Add IP to whitelist |
| DELETE | `/admin/allowed-ips/:ip` | Remove IP from whitelist |

---

## 6. Security Model

### 6.1 Authentication Layers

The system implements two independent authentication paths:

**Path A — Admin Dashboard:**
```
Username + Password (bcrypt, cost factor 10)
    └─ Optional TOTP 2FA (RFC 6238 — Google Authenticator compatible)
            └─ JWT issued (HS256, 8h expiry, minimum 32-char secret enforced)
                    └─ All dashboard API calls verified per-request via JWT
                            └─ User existence re-validated on every request
```

**Path B — External Integrations (API):**
```
API Key (SHA-256 hash compared; plaintext never stored after creation)
    OR
Source IP in whitelist (exact / wildcard / CIDR)
    └─ Authorized to call POST /send-message
```

---

### 6.2 Password Security

| Control | Implementation |
|---|---|
| Hashing algorithm | bcrypt (cost factor 10) |
| Minimum length | 6 characters (API enforced) |
| First-login enforcement | `must_change_password` flag; UI blocks all navigation until changed |
| Self-deletion protection | Users cannot delete their own account |
| Last-user protection | Cannot delete the last remaining user |

---

### 6.3 API Key Security

| Property | Detail |
|---|---|
| Format | `wag_` + 48 random hex chars (192-bit entropy) |
| Storage | SHA-256 hash only — plaintext shown **once** at creation, never stored |
| Identification | `key_prefix` (first 8 chars) shown in dashboard for identification |
| Usage tracking | `last_used` timestamp updated on every successful authentication |
| Revocation | Immediate — delete from DB; all requests with that key fail instantly |
| Legacy support | Static `API_KEY` environment variable accepted for backward compatibility |

---

### 6.4 Two-Factor Authentication

| Property | Detail |
|---|---|
| Standard | RFC 6238 TOTP (Time-based One-Time Password) |
| Compatible apps | Google Authenticator, Authy, Microsoft Authenticator |
| Library | otplib v11 |
| Setup flow | Generate secret → QR code → admin verifies code → 2FA activated |
| Secret storage | Stored in DB; never returned to frontend after setup |
| Login flow | Password verified first → if 2FA enabled → TOTP required |

---

### 6.5 JWT Configuration

| Property | Value |
|---|---|
| Algorithm | HS256 |
| Expiry | 8 hours |
| Minimum secret length | 32 characters (process exits if shorter) |
| Payload | `id`, `username`, `role` |
| Per-request validation | User existence re-checked in DB on every protected request |

---

### 6.6 Rate Limiting

- **100 requests per minute per IP** applied globally via `express-rate-limit`
- Standard `RateLimit-*` response headers included
- `/health` endpoint excluded for container health checks
- Exceeding the limit returns HTTP 429

---

### 6.7 IP Whitelist

Supports three matching modes:

| Mode | Example | Behavior |
|---|---|---|
| Exact | `192.168.1.100` | Exact IP match |
| Wildcard | `192.168.1.*` | Match any host in subnet |
| CIDR | `10.0.0.0/8` | Full CIDR range matching |

- IPv6-mapped IPv4 addresses (`::ffff:x.x.x.x`) are normalized automatically
- Whitelisted IPs completely bypass API key verification

---

### 6.8 Input Validation

- Request body size capped at **1 MB**
- JID normalization rejects malformed destination IDs before any network call
- Personal number existence verified with WhatsApp before sending (prevents delivery to non-WhatsApp numbers)
- All authentication failures are recorded in the message log for operator visibility

---

### 6.9 Container Security

- Backend runs as **non-root user** (`appuser:appgroup`) inside the container
- Build tools (`python3`, `gcc`, `make`) present only in builder stage — not in production image
- SQLite Web browser bound to `127.0.0.1:3002` — not accessible from outside the host
- Redis has no host port binding — accessible only within the Docker network

---

### 6.10 Audit Logging

Every significant administrative action is written to the `audit_logs` table with:

| Field | Description |
|---|---|
| `timestamp` | ISO 8601 UTC timestamp |
| `actor` | Username of the operator |
| `actor_id` | User ID |
| `action` | Action code (see table below) |
| `details` | JSON with context-specific data |
| `ip` | Source IP address of the request |

**Tracked action codes:**

| Code | Trigger |
|---|---|
| `login.success` | Successful login |
| `login.failure` | Wrong username or password |
| `login.2fa.failure` | Wrong TOTP code |
| `user.create` | New admin user created |
| `user.delete` | Admin user deleted |
| `user.password_change` | Password changed |
| `user.2fa.enable` | 2FA activated |
| `user.2fa.disable` | 2FA deactivated |
| `apikey.create` | New API key generated |
| `apikey.revoke` | API key revoked |

---

## 7. Data Model

Database: **SQLite** with WAL journal mode and foreign keys enabled.  
Persisted in Docker named volume `wa-db-data`.

### Table: `users`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Random 8-byte hex |
| `username` | TEXT UNIQUE | Login identifier |
| `password` | TEXT | bcrypt hash |
| `role` | TEXT | Default: `admin` |
| `must_change_password` | INTEGER | 1 = forced change on next login |
| `two_factor_secret` | TEXT | TOTP secret (nullable) |
| `two_factor_enabled` | INTEGER | 1 = 2FA active |
| `created_at` | TEXT | ISO 8601 |

### Table: `api_keys`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Random 8-byte hex |
| `name` | TEXT | Display label |
| `key_hash` | TEXT UNIQUE | SHA-256 hash of raw key |
| `key_prefix` | TEXT | First 8 chars for identification |
| `created_at` | TEXT | ISO 8601 |
| `last_used` | TEXT | ISO 8601 (nullable) |

### Table: `instances`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Alphanumeric identifier |
| `name` | TEXT | Display name |

### Table: `group_aliases`

| Column | Type | Notes |
|---|---|---|
| `alias` | TEXT PK | Friendly name (e.g., `it-alerts`) |
| `jid` | TEXT | WhatsApp group JID |
| `label` | TEXT | Optional description |
| `created_at` | TEXT | ISO 8601 |

### Table: `allowed_ips`

| Column | Type | Notes |
|---|---|---|
| `ip` | TEXT PK | IP, wildcard, or CIDR |
| `label` | TEXT | Optional description |
| `created_at` | TEXT | ISO 8601 |

### Table: `message_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `timestamp` | TEXT | ISO 8601 |
| `source_ip` | TEXT | Sender's IP address |
| `instance_id` | TEXT | WhatsApp instance used |
| `instance_phone` | TEXT | Instance phone number |
| `recipient_id` | TEXT | Target JID |
| `recipient_name` | TEXT | Resolved display name |
| `message` | TEXT | Message content |
| `status` | TEXT | `success` or `failed` |
| `error` | TEXT | Error detail (nullable) |

Indexed on `timestamp` and `status` for efficient filtering.

### Table: `audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `timestamp` | TEXT | ISO 8601 |
| `actor` | TEXT | Username |
| `actor_id` | TEXT | User ID |
| `action` | TEXT | Action code |
| `details` | TEXT | JSON string |
| `ip` | TEXT | Source IP |

---

## 8. Deployment Guide

### Prerequisites

- Docker Engine 24+ and Docker Compose v2
- Server with outbound internet access (for WhatsApp connectivity)
- A static IP or domain name for accessing the dashboard

### Deployment Steps

```bash
# 1. Obtain the source code
git clone <repository-url> && cd WA-Gateway

# 2. Create environment file
cp .env.example .env

# 3. Generate required secrets
#    JWT_SECRET (minimum 32 characters):
openssl rand -hex 32

#    SQLITE_WEB_PASSWORD:
openssl rand -base64 16

# 4. Edit .env and fill in the generated values
nano .env

# 5. Start all services
docker compose up -d --build

# 6. Verify all services are healthy
docker compose ps
```

### Access Points

| Service | URL | Notes |
|---|---|---|
| Admin Dashboard | `http://<host>:3001` | Default: admin / admin123 (forced change on first login) |
| Backend API | `http://<host>:3000` | Direct API access |
| SQLite Browser | `http://localhost:3002` | Local access only |

### Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | Min 32-char string for JWT signing |
| `SQLITE_WEB_PASSWORD` | ✅ | — | DB browser password |
| `PORT` | ❌ | `3000` | Backend listening port |
| `QUEUE_CONCURRENCY` | ❌ | `2` | Parallel message workers |
| `REDIS_HOST` | ❌ | `redis` | Redis hostname |
| `REDIS_PORT` | ❌ | `6379` | Redis port |
| `DB_PATH` | ❌ | `/app/data/gateway.db` | SQLite file path |
| `SESSION_DIR` | ❌ | `./sessions` | WhatsApp session files |
| `API_KEY` | ❌ | — | Legacy static API key |

### Persisted Data

| Location | Type | Contents |
|---|---|---|
| `wa-db-data` (volume) | SQLite | Users, keys, instances, logs, aliases |
| `wa-redis-data` (volume) | Redis | BullMQ queue data |
| `./sessions` (bind mount) | Files | WhatsApp session credentials per instance |

---

## 9. Technology Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime environment |
| Express | ^4.19 | HTTP server framework |
| @whiskeysockets/baileys | ^7.0.0-rc.9 | WhatsApp Web protocol client |
| better-sqlite3 | ^9.6 | SQLite database driver |
| bullmq | ^5.76 | Redis-backed message queue |
| ioredis | ^5.3 | Redis client |
| jsonwebtoken | ^9.0 | JWT signing and verification |
| bcryptjs | ^2.4 | Password hashing |
| otplib | ^11.0 | TOTP 2FA (RFC 6238) |
| socket.io | ^4.8 | WebSocket server |
| express-rate-limit | ^7.3 | Request rate limiting |
| pino | ^9.1 | Structured JSON logging |
| qrcode | ^1.5 | QR code image generation |

### Frontend

| Package | Version | Purpose |
|---|---|---|
| React | ^18.3 | UI component framework |
| Vite | ^6.4 | Build tool and dev server |
| React Router DOM | ^6.23 | Client-side routing |
| Axios | ^1.16 | HTTP client |
| Socket.IO Client | ^4.8 | WebSocket client |
| TailwindCSS | ^3.4 | Utility-first CSS framework |
| Lucide React | ^0.395 | Icon library |

### Infrastructure

| Component | Technology |
|---|---|
| Containerization | Docker + Docker Compose v2 |
| Frontend serving | Nginx Alpine |
| API/WebSocket proxy | Nginx reverse proxy |
| Database | SQLite (WAL mode) |
| Queue broker | Redis 7 Alpine |
| DB browser | SQLite Web (password protected) |

---

## 10. Operational Features

### Real-Time Dashboard

The dashboard maintains a persistent WebSocket (Socket.IO) connection to the backend. Instance status changes — connected, disconnected, QR code generated — are pushed to all connected dashboard clients instantly without polling.

### Multi-Instance Support

Multiple WhatsApp numbers (instances) can be registered and managed simultaneously. When sending messages, callers specify the `from` instance ID. If omitted, the system automatically selects the first connected instance.

### Group Aliases

Administrators map friendly short names to WhatsApp group JIDs:

```
"it-alerts" → "120363xxxxxx@g.us"
```

External systems send to `"it-alerts"` instead of the full JID, decoupling integration configuration from group management. If a group changes, only the alias mapping needs updating — not every external system.

### Message Log Retention

- All outbound messages (success and failure) are logged automatically
- Logs retained for **90 days**
- Automatic cleanup runs at server startup and every 24 hours
- Log entries include: timestamp, source IP, instance used, recipient name, message content, status, and error details

### Automatic Legacy Data Migration

On first startup after an upgrade from a legacy JSON-file-based version, all existing data (users, API keys, instances, group aliases, allowed IPs, message logs) is automatically migrated into SQLite. Original JSON files are renamed to `.migrated` after successful import.

### Graceful Reconnection

If a WhatsApp instance loses connection unexpectedly, the system automatically retries after 5 seconds. If the disconnection reason is `loggedOut` (user removed the session remotely), reconnection is not attempted and a fresh QR code scan is required.

### Fallback Mode

If Redis is unreachable at startup, the gateway continues to operate in direct-send mode with built-in 3-attempt retry logic. This ensures the system remains functional even without the queue infrastructure.

---

*This document was generated from a full source code audit of the `WA-Gateway` repository.*  
*For technical questions regarding integration or deployment, please contact the system administrator.*
