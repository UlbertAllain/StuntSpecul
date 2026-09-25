# Project Structure

Dokumen ini menjadi acuan penempatan file StuntSpecula.

## Prinsip

Struktur memakai pembagian sederhana berdasarkan tanggung jawab. Folder baru hanya dibuat jika ada domain yang jelas, beberapa file yang saling terkait, atau kebutuhan reuse/testing.

Tidak digunakan repository/service/controller wrapper tambahan hanya untuk memenuhi pola arsitektur. Abstraksi ditambahkan ketika ada manfaat nyata.

## Root

```text
api/
docs/
models/
public/
scripts/
src/
tests/
```

### `api/`

Endpoint Python yang harus menjadi Vercel Function terpisah dari Next.js. Saat ini hanya Model A.

### `docs/`

Dokumentasi project. Perubahan business flow atau deployment harus disertai update dokumen terkait.

### `models/`

Runtime asset ONNX. Jangan menaruh dataset training atau file eksperimen di sini.

### `public/`

Asset yang boleh disajikan browser: gambar, favicon, audio Mimo.

### `scripts/`

Operational/development scripts. Script sekali pakai yang sudah tidak relevan harus dihapus, bukan disimpan permanen.

### `tests/`

Automated tests lintas domain dan deployment smoke test.

## `src/app`

Hanya route entrypoint Next.js dan route handler.

Page sebaiknya tipis:

```text
page.tsx
→ import feature/component
→ render
```

Business logic tidak ditempatkan di page.

## `src/components`

```text
components/
├─ auth/
├─ landing/
├─ portal/
│  ├─ admin/
│  ├─ parent/
│  ├─ shared/
│  ├─ staff/
│  └─ portal.css
├─ screening/
└─ ui/
```

### `auth/`

UI login, registrasi password, registrasi Google, dan onboarding auth.

### `landing/`

Landing page publik beserta styling khusus landing.

### `portal/parent/`

UI yang hanya dimiliki parent:

- portal orchestration
- home + daftar riwayat pemeriksaan
- detail riwayat pemeriksaan
- blog edukasi
- insight pertumbuhan
- asisten
- profil

### `portal/staff/`

UI petugas:

- dashboard
- monitoring pemeriksaan
- data anak
- riwayat
- insight

### `portal/admin/`

UI khusus admin:

- dashboard admin
- monitoring perangkat
- pengelolaan petugas

### `portal/shared/`

Kode yang benar-benar dipakai lebih dari satu role portal, misalnya shell dan staff/admin session hook.

### `screening/`

Semua tampilan yang berjalan di alat: idle, assignment, prepare, tinggi, berat, kamera, processing, hasil.

### `ui/`

Primitive UI generik yang tidak mengetahui business domain.

## `src/hooks`

Hook browser yang reusable dan punya lifecycle sendiri:

- camera
- countdown
- audio
- screening session

Jangan memindahkan pure calculation ke hook.

## `src/lib`

Pure/domain utility dan client adapter kecil:

- `growth.ts`: WHO height-for-age
- `screening.ts`: domain screening
- `session.ts`: state machine pemeriksaan
- `model-a.ts`: Model A client contract
- `camera.ts`: browser camera utility
- `api-client.ts`: HTTP client browser
- `cloudinary.ts`: upload client
- `portal.ts`: shared portal types
- `report.ts`: report helper

Aturan: `lib` tidak boleh mengakses Firestore credential atau server-only secret.

## `src/server`

Server-only code:

- `router.ts`: dispatcher HTTP
- `firestore-app.ts`: application/business flow dan authorization
- `firestore.ts`: Firestore REST adapter
- `security.ts`: password, token, request identity
- `iot-auth.ts`: Bearer authentication khusus ESP32
- `http.ts`: response/error/request parsing
- `gemini.ts`: Gemini adapter
- `env.ts`: environment contract
- `runtime-config.ts`: validation konfigurasi runtime
- `runtime.ts`: dependency initialization

`firestore-app.ts` tetap menjadi application service tunggal untuk saat ini karena transaksi session/examination/station memakai helper yang sama. Jangan memecahnya menjadi banyak wrapper tipis. Jika domain backend bertambah signifikan, split berdasarkan domain nyata: auth, parent, staff, station.

## Naming

- React component: PascalCase
- function/variable: camelCase
- file: kebab-case
- boolean: gunakan prefix `is`, `has`, `can`, atau nama state yang jelas
- API path mengikuti resource
- collection Firestore memakai plural noun bila berupa collection

## Dependency direction

```text
app
→ components
→ hooks / lib
→ API

API route
→ server/router
→ server application
→ Firestore/integration adapter
```

Client component tidak boleh import file dari `src/server`.

## Kapan membuat file baru

Buat file baru jika minimal satu kondisi terpenuhi:

1. tanggung jawab berbeda jelas;
2. file sudah sulit dipahami karena beberapa concern;
3. kode digunakan ulang;
4. bagian perlu diuji independen;
5. ada security boundary.

Jangan split function kecil hanya agar folder terlihat kompleks.

## Education/blog domain

- `src/components/portal/parent/blog.tsx`: daftar artikel untuk orang tua.
- `src/components/portal/parent/blog-detail-page.tsx`: detail artikel.
- `src/components/portal/staff/blogs.tsx`: CRUD artikel petugas.
- `src/lib/growth-recommendations.ts`: aturan rekomendasi nutrisi dan tindak lanjut berdasarkan status WHO + tren TB/U pemeriksaan sebelumnya.
- Firestore collection: `blogs`.
