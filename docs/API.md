# API Reference

Semua endpoint Next.js berada di `/api/*` dan mengembalikan JSON kecuali OAuth redirect.

Format sukses umum:

```json
{
  "success": true,
  "data": {}
}
```

Format error:

```json
{
  "success": false,
  "message": "...",
  "code": "..."
}
```

## System

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Firestore/application health |
| GET | `/api/config` | public | login/setup config |

## Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/setup` | create first admin, localhost only |
| POST | `/api/auth/login` | staff login legacy/direct |
| POST | `/api/auth/unified-login` | unified password login |
| GET | `/api/auth/google/start` | start Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/google/pending` | pending Google registration profile |
| POST | `/api/auth/logout` | staff/admin logout |
| GET | `/api/auth/me` | current staff/admin |

## Parent

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/parent-account/register` | password registration |
| POST | `/api/parent-account/register-google` | finish Google registration |
| POST | `/api/parent-account/login` | direct parent login |
| POST | `/api/parent-account/logout` | parent logout |
| GET | `/api/parent-account/me` | parent dashboard data |
| PATCH | `/api/parent-account/profile` | update parent profile |
| POST | `/api/parent-account/examinations` | start examination |
| POST | `/api/parent-account/examinations/:id/finalize` | finalize owned examination |
| POST | `/api/parent-account/examinations/:id/cancel` | cancel owned examination |
| GET | `/api/parent-account/messages` | chat history |
| POST | `/api/parent-account/chat` | ask result assistant |
| POST | `/api/uploads/profile-photo` | signed/profile upload flow |

## Staff/admin

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/staff` | list staff, admin only |
| POST | `/api/staff` | create staff, admin only |
| PATCH | `/api/staff/:id` | change staff active state |
| GET | `/api/children` | staff child list |
| POST | `/api/children` | create child where allowed |
| GET | `/api/examinations` | staff examination list |
| GET | `/api/examinations/:id` | examination detail |
| POST | `/api/examinations/:id/finalize` | finalize examination |
| DELETE | `/api/examinations/:id` | cancel examination |
| GET | `/api/monitoring` | staff monitoring |
| GET | `/api/device-monitoring` | admin device monitoring |
| GET | `/api/insights` | aggregate insight |

## Station

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/station/active` | current station assignment state |
| POST | `/api/station/claim` | claim active examination |
| POST | `/api/station/complete` | save station result |
| POST | `/api/station/cancel` | cancel station session |
| GET | `/api/mirror/assignment` | assignment compatibility endpoint |

Legacy mirror examination action endpoints masih tersedia untuk compatibility internal tetapi tidak menjadi flow utama.

## Model A

Python function:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/model-a-screening` | runtime health + warmup |
| POST | `/api/model-a-screening` | facial inference |

Detail ada di [MODEL_A.md](MODEL_A.md).

## HTTP rules

- Mutating Next.js API request harus same-origin.
- JSON body dibatasi ukuran.
- Validation menggunakan Zod.
- Auth/role diverifikasi server-side.
- Endpoint sensitif memiliki rate limit.
