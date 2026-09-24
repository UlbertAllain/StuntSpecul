# Getting Started

## Prerequisites

- Node.js 22.x
- npm
- Python 3.12 untuk Model A lokal
- Firebase project dengan Firestore Native mode
- Windows PowerShell untuk launcher `npm run dev`

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

## 3. Model A local

Pastikan file berikut tersedia:

```text
models/
├─ face_detection_yunet_2023mar.onnx
├─ mobilenetv3_stunting_v2.onnx
└─ mobilenetv3_stunting_v2.onnx.data
```

Jika menggunakan artifact ZIP:

```powershell
.\scripts\model-a\install.ps1 -ArtifactZip ".\stuntspecula_model_a_v2_artifacts.zip"
```

## 4. Jalankan

Full stack lokal:

```powershell
npm run dev
```

Web saja:

```powershell
npm run dev:web
```

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
GET /api/model-a-screening
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
