# StuntSpecula

StuntSpecula adalah sistem skrining pertumbuhan anak usia 24–59 bulan. Orang tua memulai pemeriksaan dari HP, alat menjalankan alur pengukuran, petugas memonitor proses, dan admin mengelola perangkat serta akun petugas.

Status pertumbuhan utama menggunakan **TB/U WHO**. Gemini dipakai untuk analisis visual pendukung (kualitas foto dan bagian wajah yang terlihat) dan tidak boleh menentukan atau mengganti status stunting WHO.

## Stack

- Next.js 16.2.6 + React 19 + TypeScript
- Tailwind CSS 4
- Firebase Firestore sebagai persistence
- bcrypt untuk password hashing
- Google OAuth untuk login dan registrasi parent
- Cloudinary untuk foto profil
- Gemini untuk asisten penjelasan hasil dan analisis visual pendukung
- Python/OpenCV/ONNX Model A hanya legacy/rollback, bukan jalur aktif screening
- Vercel untuk deployment

## Quick start

Persyaratan:

- Node.js 22.x
- Firestore project dan service-account credential
- Gemini API key/model untuk analisis visual dan asisten

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`npm run dev` menjalankan Next.js. Model A legacy tidak diperlukan untuk flow screening aktif.

Jika perlu menjalankan runtime Model A lama untuk audit/rollback:

```powershell
npm run dev:model-a
```

## Route aplikasi

- `/` — landing page publik.
- `/login` — login semua role dan registrasi parent.
- `/ortu` — portal parent.
- `/petugas` — dashboard staff.
- `/admin` — dashboard admin.
- `/alat` — layar pemeriksaan StuntSpecula.

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
- [IoT Integration](docs/IOT_INTEGRATION.md)
- [Screening Flow](docs/SCREENING_FLOW.md)
- [Data Model](docs/DATA_MODEL.md)
- [API](docs/API.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Visual Analysis](docs/VISUAL_ANALYSIS.md)
- [Model A Legacy](docs/MODEL_A.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Prinsip penting

1. WHO TB/U adalah sumber hasil pertumbuhan utama.
2. Gemini visual hanya menilai kualitas foto/visibilitas area wajah dan tidak menentukan stunting.
3. Raw photo pemeriksaan diproses sementara dan tidak menjadi bagian laporan atau Firestore.
4. Client input selalu divalidasi kembali di server.
5. Controller/route tetap tipis; business flow berada di server application layer.
6. Jangan menaruh credential di source code.
7. Hindari menambah layer/folder baru tanpa ownership atau tanggung jawab yang jelas.
