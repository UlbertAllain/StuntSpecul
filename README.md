# StuntSpecula

StuntSpecula adalah sistem skrining pertumbuhan anak usia 24–59 bulan. Orang tua memulai pemeriksaan dari HP, alat menjalankan alur pengukuran, petugas memonitor proses, dan admin mengelola perangkat serta akun petugas.

Status pertumbuhan utama menggunakan **TB/U WHO**. Model A V2.1 hanya menghasilkan analisis wajah pendukung dan tidak boleh mengganti keputusan antropometri WHO.

## Stack

- Next.js 16.2.6 + React 19 + TypeScript
- Tailwind CSS 4
- Firebase Firestore sebagai persistence
- bcrypt untuk password hashing
- Google OAuth untuk login dan registrasi parent
- Cloudinary untuk foto profil
- Gemini untuk asisten penjelasan hasil
- Python + OpenCV YuNet + ONNX Runtime untuk Model A
- Vercel untuk deployment

## Quick start

Persyaratan:

- Node.js 22.x
- Python 3.12 untuk Model A lokal
- Firestore project dan service-account credential

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`npm run dev` menjalankan web Next.js dan runtime Model A lokal. Jika hanya mengembangkan web:

```powershell
npm run dev:web
```

## Route aplikasi

| Route | Pengguna | Fungsi |
| --- | --- | --- |
| `/` | Publik | Landing page |
| `/login` | Semua role | Login dan registrasi parent |
| `/ortu` | Parent | Profil anak, mulai pemeriksaan, hasil, riwayat |
| `/petugas` | Staff | Monitoring, data anak, riwayat, insight |
| `/admin` | Admin | Monitoring alat dan kelola petugas |
| `/alat` | Perangkat | Layar pemeriksaan StuntSpecula |

## Struktur

```text
StuntSpecula/
├─ api/                       # Python serverless endpoint Model A
├─ docs/                      # dokumentasi teknis
├─ models/                    # asset ONNX runtime
├─ public/                    # image dan audio statis
├─ scripts/                   # launcher, install, build helper
├─ src/
│  ├─ app/                    # Next.js route entrypoints
│  ├─ components/
│  │  ├─ auth/               # login dan registrasi
│  │  ├─ landing/            # landing publik
│  │  ├─ portal/
│  │  │  ├─ admin/           # UI admin
│  │  │  ├─ parent/          # UI parent
│  │  │  ├─ shared/          # shell/session role portal
│  │  │  ├─ staff/           # UI petugas
│  │  │  └─ portal.css
│  │  ├─ screening/          # UI alat dan pemeriksaan
│  │  └─ ui/                 # primitive UI generik
│  ├─ hooks/                  # hooks kamera/audio/session
│  ├─ lib/                    # pure domain + client utilities
│  └─ server/                 # API, auth, Firestore, integrations
└─ tests/                     # automated tests
```

Detail ownership folder ada di [Project Structure](docs/PROJECT_STRUCTURE.md).

## Quality gate

Sebelum commit atau deployment:

```powershell
npm run check
npm run build
node tests/deployment-smoke.mjs
```

`npm run check` menjalankan TypeScript check, ESLint, unit tests, dan Prettier check.

## Dokumentasi

- [Getting Started](docs/GETTING_STARTED.md)
- [Project Structure](docs/PROJECT_STRUCTURE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Authentication](docs/AUTHENTICATION.md)
- [Screening Flow](docs/SCREENING_FLOW.md)
- [Data Model](docs/DATA_MODEL.md)
- [API](docs/API.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Model A](docs/MODEL_A.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Prinsip penting

1. WHO TB/U adalah sumber hasil pertumbuhan utama.
2. Model A hanya supporting signal.
3. Raw photo pemeriksaan diproses sementara dan tidak menjadi bagian laporan.
4. Client input selalu divalidasi kembali di server.
5. Controller/route tetap tipis; business flow berada di server application layer.
6. Jangan menaruh credential di source code.
7. Hindari menambah layer/folder baru tanpa ownership atau tanggung jawab yang jelas.
