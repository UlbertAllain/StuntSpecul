# API Reference

Semua endpoint Next.js berada di /api/\* dan mengembalikan JSON kecuali OAuth redirect.

Format sukses umum:

    {
      "success": true,
      "data": {}
    }

Format error:

    {
      "success": false,
      "message": "...",
      "code": "..."
    }

## System

- GET /api/health — public application/Firestore health.
- GET /api/config — public auth/setup configuration.

## Authentication

- POST /api/auth/setup — create first admin, localhost only.
- POST /api/auth/login — direct staff login.
- POST /api/auth/unified-login — unified password login.
- GET /api/auth/google/start — start Google OAuth.
- GET /api/auth/google/callback — Google OAuth callback.
- GET /api/auth/google/pending — read pending Google registration profile.
- POST /api/auth/logout — staff/admin logout.
- GET /api/auth/me — current staff/admin session.

## Parent

- POST /api/parent-account/register — password registration.
- POST /api/parent-account/register-google — finish Google registration.
- POST /api/parent-account/login — direct parent login.
- POST /api/parent-account/logout — parent logout.
- GET /api/parent-account/me — parent dashboard data.
- POST /api/parent-account/children — tambah profil anak milik parent.
- PATCH /api/parent-account/profile — update parent profile.
- POST /api/parent-account/examinations — start pemeriksaan otomatis usia 24–59 bulan.
- POST /api/parent-account/examinations/manual-infant — simpan pemeriksaan manual bayi usia 0–23 bulan dengan `lengthCm` + `weightKg`; umur/jenis kelamin diambil dari profil.
- POST /api/parent-account/examinations/:id/finalize — finalize owned examination.
- POST /api/parent-account/examinations/:id/cancel — cancel owned examination.
- GET /api/parent-account/messages — chat history.
- POST /api/parent-account/chat — ask result assistant.
- POST /api/uploads/profile-photo — profile upload flow.

## Blog

Parent-authenticated:

- GET /api/blogs — daftar artikel published.
- GET /api/blogs/:id — detail artikel published.

Staff-authenticated:

- GET /api/staff/blogs — daftar semua artikel termasuk draft.
- POST /api/staff/blogs — buat artikel.
- GET /api/staff/blogs/:id — detail artikel untuk editor.
- PATCH /api/staff/blogs/:id — ubah konten/status artikel.
- DELETE /api/staff/blogs/:id — hapus artikel.

## Staff and admin

- GET /api/staff — list staff, admin only.
- POST /api/staff — create staff, admin only.
- PATCH /api/staff/:id — change staff active state.
- GET /api/children — staff child list.
- POST /api/children — create child where allowed.
- GET /api/examinations — staff examination list.
- GET /api/examinations/:id — examination detail.
- POST /api/examinations/:id/finalize — finalize examination.
- DELETE /api/examinations/:id — cancel examination.
- GET /api/monitoring — staff monitoring.
- POST /api/device/reset-session — petugas/admin menjalankan **Refresh alat** tanpa menghapus riwayat completed. Jika ada sesi queued/running, nilai pengukuran sementara dan error sementara dibersihkan, claim IoT dilepas, lalu resetToken baru diterbitkan agar /alat dan firmware dapat memulai ulang state pemeriksaan.
- GET /api/device-monitoring — admin device monitoring.
- GET /api/insights — aggregate insight.

## Station

- GET /api/station/active — current station assignment state, termasuk `examinationId` untuk isolasi state frontend.
- POST /api/station/claim — claim active examination.
- POST /api/station/complete — save station result.
- POST /api/station/cancel — cancel station session.
- POST /api/station/face-photo — simpan/replace foto wajah terbaru child untuk sesi aktif.
- GET /api/mirror/assignment — assignment compatibility endpoint.

Legacy mirror examination action endpoints masih tersedia untuk compatibility internal tetapi bukan flow utama.

## IoT

Semua endpoint berikut menggunakan header:

    Authorization: Bearer <IOT_API_KEY>

- GET /api/iot/session — poll active examination dan update device lastSeen.
- POST /api/iot/session/claim — claim examination menjadi running dan bind perangkat ke `examinationId`; firmware harus reset buffer bila ID berubah.
- POST /api/iot/measurements — kirim `examinationId` + tinggi dan/atau berat; response mengembalikan `saved`, `ack=measurement_saved`, field yang diterima, nilai terakhir, dan `measurementUpdatedAt`. Measurement dari sesi lama ditolak dengan `iot_stale_session`; measurement yang terkena plausibility flag ditolak dengan `measurement_recheck_required`.
- POST /api/iot/heartbeat — kirim firmware/sensor health.
- POST /api/iot/session/cancel — cancel active queued/running session.

IoT request tidak menggunakan browser same-origin guard karena diautentikasi dengan Bearer key. Detail payload ada di IOT_INTEGRATION.md.

## Visual analysis

Active screening:

- POST /api/visual-analysis — menerima image JPEG/PNG/WebP + header konteks age/sex, lalu meminta Gemini menghasilkan observasi visual terstruktur.

Response visual tidak mengandung diagnosis atau probabilitas stunting. Webcam berjalan sebelum TB/BB; antropometri divalidasi secara terpisah pada jalur measurement/completion. Detail ada di VISUAL_ANALYSIS.md.

## Model A legacy

Python compatibility function:

- GET /api/model-a-screening — runtime health/warmup legacy.
- POST /api/model-a-screening — inference Model A legacy.

Endpoint ini tidak dipakai oleh flow screening aktif. Detail ada di MODEL_A.md.

## HTTP rules

- Mutating browser API request harus same-origin.
- /api/iot/\* menggunakan Bearer IOT_API_KEY sebagai device authentication.
- JSON body dibatasi ukuran.
- Validation menggunakan Zod.
- Auth/role diverifikasi server-side.
- Endpoint sensitif memiliki rate limit.
