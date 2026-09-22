# StuntSpecula

StuntSpecula adalah sistem skrining pertumbuhan anak usia 24–59 bulan dengan tiga peran: orang tua, petugas, dan admin. Hasil pertumbuhan utama menggunakan TB/U WHO, sedangkan Model A hanya menjadi analisis wajah pendukung.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Firebase Firestore
- Cloudinary untuk foto profil
- Gemini untuk asisten penjelasan hasil
- Python + OpenCV YuNet + ONNX Runtime untuk Model A

## Jalankan lokal

Persyaratan:

- Node.js 22.x
- Python 3.12 untuk Model A lokal

Setup:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Rute utama:

- `/` — landing page
- `/login` — satu form login untuk semua role
- `/ortu` — portal orang tua
- `/petugas` — dashboard petugas
- `/admin` — monitoring alat dan kelola petugas
- `/alat` — layar pemeriksaan

## Struktur project

```text
StuntSpecula/
├─ api/                    # Python endpoint Model A
├─ docs/                   # dokumentasi teknis
├─ models/                 # model ONNX runtime
├─ public/                 # gambar dan audio
├─ scripts/
│  ├─ model-a/             # runtime Model A lokal
│  ├─ check-ai.mjs
│  ├─ server-module.mjs
│  └─ vercel-build.mjs
├─ src/
│  ├─ app/                 # route Next.js
│  ├─ components/
│  │  ├─ landing/
│  │  ├─ portal/
│  │  ├─ screening/
│  │  └─ ui/
│  ├─ hooks/
│  ├─ lib/                 # domain/client utilities
│  └─ server/              # Firestore API + auth + integrations
└─ tests/
```

Entry point utama:

- `src/components/screening/station-display.tsx`
- `src/components/portal/dashboard.tsx`
- `src/components/portal/parent-portal.tsx`
- `src/server/firestore-app.ts`
- `src/server/firestore.ts`
- `src/lib/growth.ts`
- `api/model-a-screening.py`

## Environment

Lihat `.env.example`. Production membutuhkan Firebase service account dan Cloudinary server credentials. Jangan commit file environment atau private key.

## Verifikasi

```powershell
npm run check
npm run build
```

Dokumentasi lanjutan:

- [Arsitektur](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Model A](docs/MODEL_A.md)
