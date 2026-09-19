# Architecture

## Runtime

StuntSpecula memiliki dua runtime yang jelas:

```text
Browser
├─ Next.js /api/* → TypeScript business modules → libSQL/SQLite
└─ Model A request → Python endpoint → YuNet + ONNX Runtime
```

Next.js menangani UI, autentikasi, examination, WHO growth assessment, portal, dan persistence. Python hanya menangani inference Model A.

## Frontend boundaries

```text
src/app/                 route entrypoints
src/components/landing/  public landing
src/components/portal/   petugas + orang tua
src/components/screening/layar alat
src/components/ui/       primitive UI yang benar-benar dipakai
src/hooks/               browser/session hooks
src/lib/                 domain types + client utilities
```

Route utama:

- `/` landing
- `/ortu` portal akun orang tua
- `/petugas` dashboard petugas
- `/alat` station display

`/mulai` dan `/hasil` dipertahankan untuk compatibility flow QR lama.

## Backend boundaries

```text
src/server/router.ts          endpoint dispatcher
src/server/auth.ts            staff auth
src/server/parent-account.ts  parent account auth/history/chat
src/server/children.ts        child profiles
src/server/screenings.ts      examination lifecycle/history
src/server/station.ts         single-station flow
src/server/monitoring.ts      dashboard metrics
src/server/access.ts          result-link compatibility
src/server/guest-screening.ts guest/QR compatibility flow
src/server/ai.ts              legacy result-chat orchestration
src/server/gemini.ts          Gemini provider
src/server/database.ts        libSQL adapter contract
src/server/runtime*.ts        runtime/env validation
```

## Screening result

WHO height-for-age is authoritative for the stunting screening result:

```text
age + sex + height
→ WHO TB/U
→ z-score
→ growth status
```

Weight is additional growth data.

Model A is independent:

```text
face photo
→ YuNet
→ quality gate
→ MobileNetV3
→ supporting facial indicator
```

A Model A failure must not block completion of the WHO screening.

## Persistence

- Schema source: `db/schema.ts`
- Immutable migrations: `drizzle/*.sql`
- Migration runner: `scripts/migrate.mjs`
- Production database: libSQL
- Local database: SQLite file or libSQL

Applied migration names and checksums are tracked in `app_migrations`.

## Deployment

Next.js and the Python function deploy in the same Vercel project. Runtime model assets live in `models/`.

See [DEPLOYMENT.md](DEPLOYMENT.md) and [MODEL_A.md](MODEL_A.md).
