# Deployment

Production berjalan di Vercel.

## Runtime

- Next.js: Node.js 22.x
- Model A: Python serverless function
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

Jika tidak diisi, fitur asisten tidak tersedia tetapi screening tetap berjalan.

### Google OAuth

    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=

Authorized JavaScript origin:

    https://stuntspecula.vercel.app

Authorized redirect URI:

    https://stuntspecula.vercel.app/api/auth/google/callback

Provider Google pada Firebase Authentication boleh aktif, tetapi aplikasi saat ini menggunakan OAuth server-side dan StuntSpecula session.

## Model A production files

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

Model A:

    GET /api/model-a-screening

Expected: ready, filesReady, dependenciesReady, dan runtimeReady true.

Functional smoke:

1. Login parent.
2. Mulai examination.
3. Buka /alat.
4. Station auto-claim.
5. Selesaikan screening.
6. Hasil muncul di parent.
7. Monitoring petugas berubah.
8. Admin functions bekerja.

## Rollback

Jika deployment terbaru gagal secara fungsional, identifikasi commit terakhir yang valid, revert satu perubahan, perbaiki dalam satu batch baru, lalu jalankan quality gate sebelum deploy kembali.

## Secrets

Jangan expose secret sebagai NEXT_PUBLIC_*.
