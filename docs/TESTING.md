# Testing

## Quality gate

Perintah utama:

    npm run check
    npm run build
    node tests/deployment-smoke.mjs

## Commands

### TypeScript

    npm run typecheck

Menjalankan Next.js type generation dan TypeScript no-emit check.

### Lint

    npm run lint

Scope: src, tests, dan scripts.

### Unit tests

    npm test

### Format

    npm run format:check

Auto-format:

    npm run format

### AI quality helper

    npm run ai:check

## Current test files

- tests/camera.test.mjs — camera/image behavior.
- tests/screening.test.mjs — screening calculation dan contract.
- tests/session.test.mjs — screening state machine.
- tests/security.test.mjs — password/auth validation.
- tests/vercel.test.mjs — Vercel/runtime config.
- tests/deployment-smoke.mjs — repository/deployment smoke checks.

## Manual smoke test

Sesudah perubahan flow utama:

1. Landing page mobile.
2. Password login parent.
3. Password login staff/admin.
4. Google login existing account.
5. Google registration parent.
6. Parent mulai examination.
7. Halaman alat auto-claim tanpa tombol manual.
8. Height, weight, camera sampai result.
9. Model A failure tidak menggagalkan WHO result.
10. Parent melihat riwayat.
11. Staff melihat monitoring.
12. Admin melihat device dan staff.
13. Logout tiap role.

## Model A smoke

GET /api/model-a-screening harus mengembalikan filesReady, dependenciesReady, runtimeReady, dan ready bernilai true.

POST harus menghasilkan status ok atau rejection reason yang valid, bukan HTTP 500.

## Regression principle

Bug fix harus menguji root cause, bukan hanya membuat snapshot output yang kebetulan lolos.
