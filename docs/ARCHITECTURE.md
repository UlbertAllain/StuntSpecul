# Architecture

## Runtime

```text
Browser
└─ Next.js
   ├─ UI portal + layar alat
   ├─ /api/* → Firestore REST
   ├─ Cloudinary signed upload
   └─ Model A request → Python endpoint → YuNet + ONNX Runtime
```

Next.js menangani autentikasi, role, profil anak, examination, WHO TB/U, riwayat, monitoring, dan persistence. Python hanya menangani inference Model A.

## Frontend

```text
src/app/                  route entrypoints
src/components/landing/   landing publik
src/components/portal/    parent + petugas + admin
src/components/screening/ layar alat
src/components/ui/        primitive UI
src/hooks/                browser/session hooks
src/lib/                  domain + client utilities
```

Role:

- parent → `/ortu`
- staff → `/petugas`
- admin → `/admin`

Admin hanya mengakses Monitoring Alat dan Kelola Petugas.

## Backend

```text
src/server/router.ts          dispatcher API
src/server/firestore-app.ts   business flow + authorization
src/server/firestore.ts       Firestore REST adapter
src/server/security.ts        password/hash/token helpers
src/server/gemini.ts          Gemini adapter
src/server/runtime.ts         runtime initialization
src/server/runtime-config.ts  application environment
```

Tidak ada SQL migration layer. Firestore adalah satu-satunya persistence layer.

## Screening result

```text
age + sex + height
→ WHO TB/U
→ z-score
→ growth status
```

Berat menjadi data tambahan. Model A tetap independen dan tidak boleh mengubah hasil WHO.

Raw photo pemeriksaan tidak disimpan ke laporan.
