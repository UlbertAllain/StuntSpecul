# Architecture

## Overview

StuntSpecula memakai dua runtime:

```text
Browser
│
├─ Next.js application
│  ├─ landing
│  ├─ auth
│  ├─ parent portal
│  ├─ staff/admin portal
│  ├─ station UI
│  └─ /api/* Node.js route
│
└─ /api/model-a-screening
   └─ Python serverless function
      ├─ OpenCV YuNet
      └─ ONNX Runtime
```

Persistence utama adalah Firebase Firestore. Cloudinary hanya untuk foto profil. Gemini hanya untuk penjelasan hasil yang sudah dihitung sistem.

## Frontend boundaries

### Public

`src/components/landing`

Tidak memiliki business authorization dan hanya menampilkan informasi produk.

### Authentication

`src/components/auth`

Menangani login password, registrasi parent, Google OAuth handoff, dan initial admin setup UI.

### Parent portal

`src/components/portal/parent`

Parent memiliki ownership terhadap:

- profil anak;
- memulai examination;
- melihat status examination;
- hasil dan riwayat;
- insight pertumbuhan;
- profil parent;
- asisten penjelasan.

### Staff portal

`src/components/portal/staff`

Staff dapat:

- memonitor sesi;
- melihat data anak;
- melihat riwayat;
- melihat insight agregat;
- melakukan finalization yang diizinkan backend.

### Admin portal

`src/components/portal/admin`

Admin dapat:

- memonitor perangkat;
- membuat/menonaktifkan akun petugas.

### Station

`src/components/screening`

Layar `/alat` bersifat station UI. Parent adalah pihak yang memulai sesi. Station polling active session, auto-claim, lalu menjalankan state machine pemeriksaan.

## Backend flow

```text
Next.js route handler
→ server/router.ts
→ server/firestore-app.ts
→ validation + authorization + business rule
→ server/firestore.ts
→ Firestore REST API
```

Integrasi eksternal dipanggil server-side bila mengandung credential.

## Important modules

- `src/server/router.ts` — HTTP dispatcher dan same-origin guard.
- `src/server/firestore-app.ts` — application flow dan authorization.
- `src/server/firestore.ts` — Firestore REST adapter.
- `src/server/security.ts` — password, token, digest, request key.
- `src/server/http.ts` — JSON parsing, response, API error.
- `src/server/runtime.ts` — runtime dependency initialization.
- `src/server/runtime-config.ts` — environment validation.
- `src/server/gemini.ts` — Gemini adapter.
- `src/lib/growth.ts` — WHO TB/U.
- `src/lib/session.ts` — screening state machine.
- `src/lib/model-a.ts` — Model A browser contract.

## Screening decision

```text
age + sex + measured height
→ WHO Height-for-Age
→ z-score
→ growthStatus
```

Weight disimpan sebagai informasi tambahan.

Model A:

```text
camera frame
→ face detection
→ quality gate
→ classifier
→ supporting facial indication
```

Model A tidak boleh mengubah `growthStatus`.

## State ownership

- Browser menyimpan state UI sementara.
- Firestore menyimpan account, child, examination, session, device, dan message data.
- Raw screening photo tidak menjadi field laporan.
- Python Model A memproses image in-memory.

## Error strategy

Expected business error menggunakan `ApiError` dengan status HTTP dan code stabil. Unexpected error tidak diekspos detail internalnya kepada client dan dicatat di server log.

## Scalability

Arsitektur saat ini sengaja sederhana untuk satu station utama dan traffic aplikasi skrining kecil/menengah. Jangan menambah queue, microservice, atau repository abstraction sampai ada kebutuhan operasional yang nyata.
