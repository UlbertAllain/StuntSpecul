# Deployment

## Vercel

Project menggunakan Next.js dan satu Python Function untuk Model A.

Konfigurasi:

- Framework: Next.js
- Build command: `npm run build`
- Output: `.next`
- Node.js: 22.x
- Python Model A: dideklarasikan melalui `pyproject.toml`

Environment produksi:

```dotenv
APP_ORIGIN=https://stuntspecula.vercel.app
DATABASE_URL=libsql://DATABASE-ANDA.turso.io
DATABASE_AUTH_TOKEN=TOKEN_DATABASE
GEMINI_API_KEY=
GEMINI_MODEL=
```

Gunakan database libSQL remote untuk produksi. File SQLite lokal hanya untuk development.

## Database

Jalankan migration terhadap database target sebelum aplikasi digunakan:

```powershell
npm run db:migrate
```

Migration bersifat incremental dan dicatat pada tabel `app_migrations`. File migration yang sudah diterapkan tidak boleh diedit atau diganti nama.

## Model A

Production membutuhkan:

```text
models/
├─ face_detection_yunet_2023mar.onnx
├─ mobilenetv3_stunting_v2.onnx
└─ mobilenetv3_stunting_v2.onnx.data
```

Endpoint production:

```text
GET  /api/model-a-screening
POST /api/model-a-screening
```

Sebelum deploy, pastikan ketiga runtime asset tersebut memang ikut dalam branch yang akan dideploy.

## Smoke check

Setelah deploy:

1. `GET /api/health` harus memberi `ready: true`, `databaseReady: true`, dan `modelASchemaReady: true`.
2. `GET /api/config` harus berhasil.
3. `GET /api/model-a-screening` harus memberi `ready: true`.
4. Login `/petugas`.
5. Mulai pemeriksaan dan buka `/alat`.
6. Selesaikan tinggi → berat → wajah.
7. Pastikan hasil WHO tersimpan dan hasil wajah tampil sebagai data pendukung.
8. Pastikan portal `/ortu` dapat membaca riwayat yang sama.

Jika endpoint Model A menunjukkan `dependenciesReady: true` tetapi `filesReady: false`, runtime Python sudah tersedia tetapi tiga asset di folder `models/` belum ikut ke deployment. Jalankan installer Model A, commit ketiga asset runtime, lalu deploy ulang.

Jika terjadi error, cek DevTools Network dan Vercel Logs. Jangan menyalin password, cookie, token database, atau API key ke log publik.
