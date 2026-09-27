# Getting Started

## Prerequisites

- Node.js 22.x
- npm
- Firebase project dengan Firestore Native mode
- Gemini API key/model untuk analisis visual dan asisten
- Windows PowerShell hanya diperlukan jika menjalankan Model A legacy

## 1. Install dependency

```powershell
npm ci
```

Gunakan `npm ci` untuk environment yang reproducible dari `package-lock.json`.

## 2. Environment

```powershell
Copy-Item .env.example .env.local
```

Isi minimal:

```dotenv
APP_ORIGIN=http://localhost:3000

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Optional integration:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GEMINI_API_KEY=
GEMINI_MODEL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 3. Jalankan

Flow aktif:

```powershell
npm run dev
```

Alias web-only tetap tersedia:

```powershell
npm run dev:web
```

Model A legacy hanya dijalankan bila dibutuhkan untuk audit/rollback:

```powershell
npm run dev:model-a
```

## 4. Visual analysis

Isi `GEMINI_API_KEY` dan `GEMINI_MODEL`. Kamera mengirim foto ke `/api/visual-analysis`; API key tetap server-side.

Default web URL:

```text
http://127.0.0.1:3000
```

## 5. Admin pertama

Admin pertama hanya dapat dibuat melalui localhost ketika Firestore belum memiliki akun admin. Setelah setup:

- admin membuat akun petugas;
- parent melakukan registrasi sendiri;
- admin/petugas tidak memiliki public registration.

## 6. Verifikasi

```powershell
npm run check
npm run build
```

Health endpoint:

```text
GET /api/health

Flow kamera aktif diverifikasi dari POST /api/visual-analysis saat pemeriksaan. GET /api/model-a-screening hanya legacy.
```

## Development workflow

Urutan perubahan yang disarankan:

```text
requirement
→ business rule
→ data impact
→ backend
→ validation/security
→ tests
→ UI
→ integration
→ build
```

Hindari mengubah UI, API contract, dan schema sekaligus tanpa kebutuhan.
