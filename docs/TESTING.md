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
- tests/iot-auth.test.mjs — ESP32 Bearer authentication.
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
8. Height dan weight hanya lanjut setelah measurement IoT diterima.
9. Kamera/Gemini visual analysis sampai result.
10. Gemini failure tidak menggagalkan WHO result.
11. Parent melihat riwayat dan observasi visual.
12. Staff melihat monitoring.
13. Admin melihat device dan staff.
14. Logout tiap role.

## Visual analysis smoke

Pada sesi aktif dengan kamera, POST /api/visual-analysis harus menghasilkan structured visual observation. Failure Gemini harus tetap membiarkan WHO screening selesai.

## Model A legacy smoke

GET/POST /api/model-a-screening hanya perlu diuji jika runtime legacy masih dipertahankan untuk rollback.

## Regression principle

Bug fix harus menguji root cause, bukan hanya membuat snapshot output yang kebetulan lolos.
