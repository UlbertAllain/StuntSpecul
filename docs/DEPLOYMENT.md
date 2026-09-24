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

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

`APP_ORIGIN` opsional. Jika tidak diisi, production menggunakan origin request HTTPS.

## Firestore

Gunakan Firestore database default dalam Native mode. Tidak ada SQL migration yang perlu dijalankan.

Admin pertama dibuat dari localhost saat Firestore masih kosong. Setelah itu admin membuat akun petugas, sedangkan orang tua mendaftar dari form login yang sama.

## Login Google

OAuth Google bersifat opsional. Jika diaktifkan, buat OAuth 2.0 Web Client di Google Cloud Console lalu tambahkan redirect URI production:

```text
https://stuntspecula.vercel.app/api/auth/google/callback
```

Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di environment production. Provider Google boleh tetap diaktifkan di Firebase Authentication, tetapi aplikasi menggunakan callback server-side agar tetap kompatibel dengan session StuntSpecula yang ada.

- Login Google akan masuk ke akun parent/staff/admin jika email sudah terdaftar.
- Registrasi Google tersedia untuk akun orang tua baru. Setelah OAuth berhasil, pengguna hanya melengkapi profil anak.
- Staff dan admin tetap dibuat melalui alur administrasi yang ada; setelah emailnya terdaftar, akun tersebut dapat masuk dengan Google.

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
