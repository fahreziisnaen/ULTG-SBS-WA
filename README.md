# WA Gateway — PLN Proteksi ULTG SBS

WhatsApp Gateway middleware untuk **PLN Proteksi ULTG SBS** — memungkinkan sistem eksternal (monitoring, platform alert, skrip otomasi) mengirim pesan WhatsApp melalui HTTP API yang sederhana.

**Stack:** Node.js · Baileys · Express · BullMQ · Redis · SQLite · React · Vite · TailwindCSS · nginx · Docker

---

## Arsitektur

```
Sistem Eksternal (SolarWinds, PRTG, dll.)
      │  POST /send-message
      │  Authorization: Bearer <api-key>
      ▼
  wa-backend :3000 (Express)
      │  Auth middleware  → validasi API key / whitelist IP
      │  ID normalizer   → konversi ke WhatsApp JID
      │  getRecipientName → resolusi nama tampilan
      ▼
  Queue Service (BullMQ + Redis)
      │  3 percobaan, exponential backoff (2s → 4s → 8s)
      │  fallback ke in-process direct send jika Redis tidak tersedia
      ▼
  Baileys (WhatsApp Web)
      │  sesi multi-device per instance
      ▼
  Grup / Pribadi WhatsApp

  ─────────────────────────────────────────────────────
  SQLite Database (gateway.db)
      │  users, API keys, instances, alias grup,
      │  IP diizinkan, log pesan
      └  disimpan via Docker named volume (db_data)

  ─────────────────────────────────────────────────────
  wa-frontend :3001 (React + nginx)
      │  nginx proxy /api/*      → wa-backend:3000
      │  nginx proxy /socket.io/ → wa-backend:3000 (WebSocket)
      └  status real-time via Socket.IO events

  ─────────────────────────────────────────────────────
  wa-sqliteweb :3002 (coleifer/sqlite-web)
      └  browser UI baca/tulis untuk gateway.db (dilindungi kata sandi)
```

---

## Quick Start (Docker)

### 1. Buat file `.env`

```bash
cp .env.example .env
```

Buka `.env` dan isi dua nilai rahasia yang diperlukan:

```bash
# JWT_SECRET — menandatangani semua token sesi admin
openssl rand -hex 32

# SQLITE_WEB_PASSWORD — kata sandi login untuk browser database di :3002
openssl rand -base64 16
```

Contoh `.env` yang sudah terisi:

```env
JWT_SECRET=a3f8d2e1c7b94f0e2d6a1b8c4e3f5a7d9e2b1c4f6a8d3e5f7b2c9a1d4f6e8b3
SQLITE_WEB_PASSWORD=Xk9mP2rLqN4wT7vA
```

### 2. Jalankan semua service

```bash
docker compose up -d --build
```

### 3. Periksa startup

```bash
docker compose logs -f wa-backend
```

| Service | URL | Keterangan |
|---------|-----|------------|
| Dasbor admin | http://localhost:3001 | Login: `admin` / `admin123` |
| Backend API | http://localhost:3000 | Endpoint API eksternal |
| Browser database | http://localhost:3002 | Login dengan `SQLITE_WEB_PASSWORD` |

> **Catatan:** Saat login pertama kali, Anda akan diwajibkan mengganti kata sandi default demi keamanan.

---

## Setup Awal

1. Login di **http://localhost:3001** (`admin` / `admin123`)
2. Anda akan diminta mengganti kata sandi segera.
3. Pergi ke **Pengaturan → Pengguna** untuk mengelola pengguna atau mengonfigurasi **Autentikasi Dua Faktor (2FA)** dengan mengklik tombol 2FA di samping nama Anda dan memindai QR Code menggunakan Google Authenticator.
4. Pergi ke **Instances** → klik **Tambah Instance**
5. Pindai kode QR dengan WhatsApp (Pengaturan → Perangkat Tertaut → Hubungkan Perangkat)
6. Setelah terhubung, pergi ke **Grup** untuk menemukan Group ID atau mengatur Alias
7. Pergi ke **Pengaturan → API Keys** → buat kunci untuk setiap sistem eksternal

---

## Referensi API

Autentikasi untuk `POST /send-message` dicek dengan urutan berikut:

1. **Whitelist IP** — tidak perlu API key jika IP pengirim ada di whitelist (mendukung IP tunggal, CIDR, wildcard). Dikelola di Pengaturan → IP Diizinkan.
2. **Header HTTP** — `Authorization: Bearer <key>`
3. **Header HTTP** — `x-api-key: <key>`
4. **Field Body** — `apikey=<key>` (untuk `application/x-www-form-urlencoded` atau sistem yang tidak bisa mengatur header kustom)

> API key dibuat dari Pengaturan → API Keys di dasbor admin.

> **Rate limiting:** 100 permintaan per menit per IP.

---

### `POST /send-message`

Menerima `application/json` maupun `application/x-www-form-urlencoded`.

**Request (JSON) — teks saja:**
```json
{
  "message": "🚨 *Peringatan Perangkat Mati*\n\n*Perangkat:* Core-Switch-01\n*IP:* 10.10.10.1\n*Status:* DOWN",
  "id": "alert-proteksi",
  "from": "wa1"
}
```

**Request (JSON) — gambar + caption:**
```json
{
  "message": "🚨 Grafik beban trafo jam 14:00",
  "image": "https://example.com/grafik-trafo.png",
  "id": "alert-proteksi",
  "from": "wa1"
}
```

**Request (Form URL-Encoded):**
```
id=alert-proteksi&message=Halo%20Dunia&apikey=API_KEY_ANDA
```

| Field | Wajib | Keterangan |
|-------|-------|------------|
| `message` | Ya* | Teks yang akan dikirim. Mendukung markdown WhatsApp: `*bold*`, `_italic_`, `~strikethrough~`. *Opsional jika `image` diisi (menjadi caption). |
| `id` | Ya | Penerima — lihat format yang diterima di bawah |
| `image` | Tidak | URL gambar (https://...) untuk dikirim bersama `message` sebagai satu pesan gambar + caption. |
| `from` | Tidak | ID instance untuk mengirim (mis. `wa1`). Default ke instance pertama yang terhubung. |
| `apikey` | Tidak | API key sebagai field body, alternatif dari header. |

**Format `id` yang diterima:**

| Format | Tipe | Contoh |
|--------|------|--------|
| Nomor biasa | Pribadi | `628123456789` |
| Suffix `@c.us` | Pribadi (lama) | `628123456789@c.us` |
| Suffix `@s.whatsapp.net` | Pribadi | `628123456789@s.whatsapp.net` |
| Suffix `@g.us` | Grup | `120363025600132873@g.us` |
| Alias Grup | Grup | `alert-proteksi` (dikonfigurasi di Pengaturan → Alias Grup) |

**Response (202 Accepted):**
```json
{
  "success": true,
  "jobId": "42",
  "message": "Pesan berhasil diproses",
  "destination": "120363025600132873@g.us",
  "type": "group",
  "sentFrom": "wa1",
  "sentFromName": "WhatsApp SBS"
}
```

**Respons error:**

| Kode | Penyebab |
|------|----------|
| 400 | `message` atau `id` kosong/tidak valid |
| 401 | API key tidak ada atau tidak valid |
| 404 | Instance yang ditentukan di `from` tidak ditemukan |
| 422 | Nomor pribadi tidak terdaftar di WhatsApp |
| 503 | Tidak ada instance WhatsApp yang terhubung |

---

### `GET /health`

Health check — tidak memerlukan autentikasi.

```json
{ "ok": true, "ts": 1712345678901 }
```

---

### `GET /status`

Mengembalikan status semua instance. Tidak memerlukan autentikasi.

```json
{
  "status": "connected",
  "phone": "628111000111",
  "name": "Nama Anda",
  "instances": [
    { "id": "wa1", "name": "WhatsApp SBS", "status": "connected", "phone": "628111000111", "waName": "Nama Anda" }
  ]
}
```

---

## Contoh cURL

```bash
# Kirim ke grup via alias
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer API_KEY_ANDA" \
  -d '{"message": "🚨 *Peringatan:* Router01 MATI", "id": "alert-proteksi"}'

# Kirim ke nomor pribadi via instance tertentu
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY_ANDA" \
  -d '{"message": "Pesan tes", "id": "628123456789", "from": "wa1"}'

# Kirim via form-urlencoded (tanpa header kustom — untuk sistem lama)
curl -X POST http://localhost:3000/send-message \
  -d "apikey=API_KEY_ANDA&id=alert-proteksi&message=Halo"
```

---

## Integrasi Sistem

Sistem apa pun yang dapat melakukan HTTP POST request dapat mengirim pesan melalui gateway ini.

**Endpoint:** `http://<server-ip>:3000/send-message`

**Diperlukan:**
- `Content-Type: application/json`
- API key via `Authorization: Bearer <key>`, `x-api-key: <key>`, atau field body `apikey`

**Request body minimal:**
```json
{
  "message": "Pesan Anda di sini",
  "id": "120363025600132873@g.us"
}
```

**Dengan instance dan alias:**
```json
{
  "message": "🚨 *Peringatan:* Perangkat mati",
  "id": "alert-proteksi",
  "from": "wa1"
}
```

> Salin Group ID dari halaman **Grup**. Alias pendek dapat diatur via **Pengaturan → Alias Grup** dan digunakan langsung sebagai nilai `id`.

**Tips per sistem:**
- **SolarWinds / PRTG** — gunakan aksi HTTP POST / HTTP Push, atur header Auth Token, gunakan placeholder variabel sistem di dalam `message`
- **Grafana** — gunakan Webhook notification channel, petakan field alert ke dalam JSON body
- **Skrip / cron jobs** — gunakan `curl` atau library HTTP client; form-urlencoded juga diterima jika JSON tidak praktis

---

## Dasbor Admin

| Halaman | Keterangan |
|---------|------------|
| Dasbor | Ringkasan semua instance — status, nomor, nama WhatsApp |
| Instances | Tambah/hapus instance, pindai QR (real-time), reset sesi |
| Grup | Telusuri Group ID per instance, atur/edit Alias |
| Log | Riwayat pesan — status, IP sumber, instance, penerima, pratinjau pesan |
| Dokumentasi | Dokumentasi API dan contoh permintaan |
| Pengaturan | API Keys, Alias Grup, IP Diizinkan (whitelist), Pengguna |

---

## Multi-Instance

Beberapa akun WhatsApp berjalan secara bersamaan. Setiap instance memiliki sesi Baileys sendiri di `sessions/<id>/`.

- Tambah instance dari halaman **Instances** — berikan ID (mis. `wa2`) dan nama tampilan
- ID instance selalu diubah ke huruf kecil secara otomatis
- Gunakan `"from": "<instance-id>"` di body API untuk mengirim melalui akun tertentu
- Jika `from` tidak diisi, instance pertama yang terhubung akan digunakan

---

## Penyimpanan Data

Semua data aplikasi disimpan di **database SQLite** (`gateway.db`) via Docker named volume `db_data`.

| Tabel | Data |
|-------|------|
| `users` | Akun dasbor admin (kata sandi di-hash dengan bcrypt) |
| `api_keys` | API key bernama untuk integrasi eksternal |
| `instances` | Metadata instance WhatsApp yang terdaftar |
| `group_aliases` | Pemetaan nama pendek → Group JID |
| `allowed_ips` | Whitelist IP (IP tunggal, CIDR, wildcard) |
| `message_logs` | Semua percobaan pengiriman beserta status (retensi 90 hari) |

Kredensial sesi WhatsApp disimpan terpisah di `sessions/<id>/` dan disimpan via bind mount.

**Browser database** tersedia di **http://localhost:3002** (login dengan `SQLITE_WEB_PASSWORD`).

---

## Perilaku Queue

| Mode | Kondisi | Perilaku |
|------|---------|----------|
| BullMQ + Redis | Redis dapat dijangkau | Job di-queue, 3 percobaan, exponential backoff (2s → 4s → 8s) |
| Direct (fallback) | Redis tidak tersedia | Kirim langsung in-process, retry 3 percobaan yang sama |

---

## Catatan Keamanan

- Atur nilai kuat untuk `JWT_SECRET` dan `SQLITE_WEB_PASSWORD` sebelum deploy — gunakan `openssl rand`
- **Wajib Ganti Kata Sandi**: Sistem memaksa pengguna mengganti kata sandi default sebelum mengakses dasbor.
- **Autentikasi Dua Faktor (2FA)**: TOTP (Time-based One-Time Password) didukung dan direkomendasikan untuk semua akun admin. Kompatibel dengan Google Authenticator, Authy, dll.
- Kata sandi di-hash dengan bcrypt (cost 10), tidak pernah disimpan dalam plaintext
- Sesi JWT kedaluwarsa setelah 8 jam. Pengguna otomatis logout jika sesi diinvalidasi dari database.
- Rate limiting: 100 permintaan/menit/IP pada semua endpoint non-health
- `sessions/` di-git-ignore — jangan pernah commit file sesi
- Di produksi: firewall port `3001` (UI admin) dan `3002` (browser database) ke jaringan internal saja

---

## Lisensi

MIT

---

## Kredit

Dibangun oleh **Fahrezi Isnaen Fauzan** dengan bantuan [Claude](https://claude.ai) dari Anthropic.
