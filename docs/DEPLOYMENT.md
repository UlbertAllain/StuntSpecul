# Deployment

Production berjalan di Vercel.

## Runtime

- Next.js: Node.js 22.x
- Gemini visual/result assistant: external Google API via server-side secret
- Model A Python function: legacy compatibility only
- Database: Firebase Firestore
- Build command: npm run build:vercel

## Environment variables

### Firestore

    FIREBASE_PROJECT_ID=
    FIREBASE_CLIENT_EMAIL=
    FIREBASE_PRIVATE_KEY=

### Application origin

    APP_ORIGIN=https://stuntspecula.vercel.app

APP_ORIGIN optional. Jika tidak diisi, production menggunakan HTTPS request origin.

### Cloudinary

    CLOUDINARY_CLOUD_NAME=
    CLOUDINARY_API_KEY=
    CLOUDINARY_API_SECRET=

Diperlukan untuk upload foto profil.

### Gemini

    GEMINI_API_KEY=
    GEMINI_MODEL=

Jika tidak diisi, asisten dan analisis visual tidak tersedia; WHO screening tetap harus berjalan.

### Google OAuth

    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=

Authorized JavaScript origin:

    https://stuntspecula.vercel.app

Authorized redirect URI:

    https://stuntspecula.vercel.app/api/auth/google/callback

Provider Google pada Firebase Authentication boleh aktif, tetapi aplikasi saat ini menggunakan OAuth server-side dan StuntSpecula session.

### IoT

    IOT_API_KEY=

Gunakan random key minimal 32 byte. Generate contoh:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Key yang sama dipasang pada firmware ESP32. Jangan memakai prefix NEXT*PUBLIC*.

## Model A legacy production files

    models/
    ├─ face_detection_yunet_2023mar.onnx
    ├─ mobilenetv3_stunting_v2.onnx
    └─ mobilenetv3_stunting_v2.onnx.data

Python dependency:

- numpy 2.1.3
- opencv-python-headless 4.10.0.84
- onnxruntime 1.20.1

## Pre-deploy

    npm ci
    npm run check
    npm run build
    node tests/deployment-smoke.mjs

## Deploy strategy

Untuk menghindari Vercel build-rate limit:

1. Kumpulkan perubahan dalam satu batch.
2. Verifikasi sebelum update main.
3. Lakukan satu update ke main.
4. Tunggu deployment selesai.
5. Jangan spam manual Redeploy.

## Production smoke check

Application:

    GET /api/health

Expected: ready true, databaseReady true, databaseProvider firestore.

Visual analysis:

    POST /api/visual-analysis

Expected pada pemeriksaan dengan kamera: response visual terstruktur atau failure yang tidak menggagalkan WHO result.

Model A legacy boleh dicek terpisah melalui GET /api/model-a-screening jika compatibility runtime masih dipertahankan.

Functional smoke:

1. Login parent.
2. Mulai examination.
3. Buka /alat.
4. Station auto-claim.
5. Pastikan TB/BB dari ESP32 mendapat ACK server.
6. Selesaikan kamera/Gemini visual analysis.
7. Hasil WHO muncul di parent dan tidak bergantung pada AI visual.
8. Monitoring petugas berubah.
9. Admin functions bekerja.
10. GET /api/iot/session tanpa Bearer token menghasilkan 401 jika IOT_API_KEY terkonfigurasi.
11. ESP32 heartbeat membuat status alat online di halaman admin.

## Rollback

Jika deployment terbaru gagal secara fungsional, identifikasi commit terakhir yang valid, revert satu perubahan, perbaiki dalam satu batch baru, lalu jalankan quality gate sebelum deploy kembali.

## Secrets

Jangan expose secret sebagai NEXT*PUBLIC*\*.
