# Deployment

## Vercel

Konfigurasi utama:

- Framework: Next.js
- Build command: `npm run build:vercel`
- Node.js: 22.x
- Python runtime mengikuti `pyproject.toml`

Environment production:

```dotenv
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GEMINI_API_KEY=
GEMINI_MODEL=
```

`APP_ORIGIN` opsional. Jika tidak diisi, production menggunakan origin request HTTPS.

## Firestore

Gunakan Firestore database default dalam Native mode. Tidak ada SQL migration yang perlu dijalankan.

Admin pertama dibuat dari localhost saat Firestore masih kosong. Setelah itu admin membuat akun petugas, sedangkan orang tua mendaftar dari form login yang sama.

## Model A

Production membutuhkan:

```text
models/
├─ face_detection_yunet_2023mar.onnx
├─ mobilenetv3_stunting_v2.onnx
└─ mobilenetv3_stunting_v2.onnx.data
```

Endpoint:

```text
GET  /api/model-a-screening
POST /api/model-a-screening
```

## Smoke check

1. `GET /api/health` → `ready: true` dan `databaseProvider: "firestore"`.
2. `GET /api/config` berhasil.
3. `GET /api/model-a-screening` → `ready: true`.
4. Login parent, petugas, dan admin sesuai role.
5. Mulai pemeriksaan dari parent dan jalankan `/alat`.
6. Pastikan WHO tersimpan sebagai hasil utama dan Model A sebagai pendukung.
7. Coba upload foto profil melalui Cloudinary signed upload.

Jangan menaruh Firebase private key atau Cloudinary API secret di source code.
