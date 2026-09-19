# StuntSpecula

StuntSpecula adalah sistem skrining pertumbuhan anak usia 24–59 bulan yang menghubungkan layar alat, dashboard petugas, portal orang tua, standar WHO height-for-age, dan Model A untuk analisis wajah pendukung.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- libSQL / SQLite + Drizzle schema/migrations
- Gemini untuk asisten penjelasan hasil
- Python + OpenCV YuNet + ONNX Runtime untuk Model A

## Prinsip hasil

Status stunting utama berasal dari **TB/U (height-for-age) WHO** berdasarkan usia, jenis kelamin, dan tinggi badan.

Berat badan menjadi data pertumbuhan tambahan. Model A hanya menghasilkan indikator wajah pendukung dan **tidak mengubah hasil WHO**.

## Jalankan lokal

Persyaratan utama:

- Node.js 22.13+
- Python 3.10+ untuk runtime Model A lokal

Setup aplikasi:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

Rute utama:

- `/` — landing page
- `/ortu` — portal akun orang tua
- `/petugas` — dashboard petugas
- `/alat` — layar pemeriksaan
- `/mulai` dan `/hasil` — flow QR kompatibilitas lama

### Jalankan dengan Model A

Pastikan tiga file runtime tersedia di `models/`. Jika belum:

```powershell
.\scripts\model-a\install.ps1 -ArtifactZip ".\stuntspecula_model_a_v2_artifacts.zip"
```

Lalu jalankan web + Model A lokal:

```powershell
.\scripts\model-a\dev.ps1
```

Jika dependency Python sudah pernah terpasang:

```powershell
.\scripts\model-a\dev.ps1 -SkipInstall
```

Website berjalan di `http://localhost:3000`, Model A lokal di `http://127.0.0.1:8787`.

## Struktur project

```text
StuntSpecula/
├─ api/                    # Python function Model A untuk deployment
├─ db/                     # Drizzle schema
├─ drizzle/                # SQL migrations
├─ models/                 # runtime assets Model A
├─ public/                 # aset statis
├─ scripts/
│  ├─ model-a/             # install + local runtime Model A
│  ├─ check-ai.mjs
│  ├─ migrate.mjs
│  └─ server-module.mjs
├─ src/
│  ├─ app/                 # Next.js routes
│  ├─ components/
│  │  ├─ landing/
│  │  ├─ portal/             # flow utama
│  │  ├─ screening/
│  │  ├─ legacy/             # compatibility QR lama
│  │  └─ ui/
│  ├─ hooks/
│  ├─ lib/                 # domain/client utilities
│  └─ server/              # API/business modules
├─ tests/
└─ docs/
```

Entry point penting:

- `src/components/screening/station-display.tsx` — layar alat
- `src/components/portal/dashboard.tsx` — dashboard petugas
- `src/components/portal/parent-portal.tsx` — portal orang tua
- `src/server/router.ts` — routing API
- `src/server/station.ts` — lifecycle alat
- `src/server/screenings.ts` — examination dan penyimpanan hasil
- `src/lib/growth.ts` — engine WHO TB/U
- `api/model-a-screening.py` — inference Model A
- `db/schema.ts` + `drizzle/` — database

## Environment

```dotenv
APP_ORIGIN=http://localhost:3000
DATABASE_URL=file:./stuntspecula.db
DATABASE_AUTH_TOKEN=
GEMINI_API_KEY=
GEMINI_MODEL=
```

Produksi menggunakan database libSQL remote. Jangan commit file environment atau credential.

## Verifikasi sebelum merge

```powershell
npm run check
npm run build
npm run db:migrate
```

Migration yang sudah diterapkan tidak boleh diubah atau diganti nama.

Dokumentasi lanjutan:

- [Arsitektur](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Model A](docs/MODEL_A.md)
