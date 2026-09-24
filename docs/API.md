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
- PATCH /api/parent-account/profile — update parent profile.
- POST /api/parent-account/examinations — start examination.
- POST /api/parent-account/examinations/:id/finalize — finalize owned examination.
- POST /api/parent-account/examinations/:id/cancel — cancel owned examination.
- GET /api/parent-account/messages — chat history.
- POST /api/parent-account/chat — ask result assistant.
- POST /api/uploads/profile-photo — profile upload flow.

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
- GET /api/device-monitoring — admin device monitoring.
- GET /api/insights — aggregate insight.

## Station

- GET /api/station/active — current station assignment state.
- POST /api/station/claim — claim active examination.
- POST /api/station/complete — save station result.
- POST /api/station/cancel — cancel station session.
- GET /api/mirror/assignment — assignment compatibility endpoint.

Legacy mirror examination action endpoints masih tersedia untuk compatibility internal tetapi bukan flow utama.

## IoT

Semua endpoint berikut menggunakan header:

    Authorization: Bearer <IOT_API_KEY>

- GET /api/iot/session — poll active examination dan update device lastSeen.
- POST /api/iot/session/claim — claim examination menjadi running.
- POST /api/iot/measurements — kirim tinggi dan/atau berat.
- POST /api/iot/heartbeat — kirim firmware/sensor health.
- POST /api/iot/session/cancel — cancel active queued/running session.

IoT request tidak menggunakan browser same-origin guard karena diautentikasi dengan Bearer key. Detail payload ada di IOT_INTEGRATION.md.

## Model A

Python function:

- GET /api/model-a-screening — runtime health dan warmup.
- POST /api/model-a-screening — facial inference.

Detail ada di MODEL_A.md.

## HTTP rules

- Mutating browser API request harus same-origin.
- /api/iot/\* menggunakan Bearer IOT_API_KEY sebagai device authentication.
- JSON body dibatasi ukuran.
- Validation menggunakan Zod.
- Auth/role diverifikasi server-side.
- Endpoint sensitif memiliki rate limit.
