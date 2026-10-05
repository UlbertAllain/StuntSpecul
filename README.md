# StuntSpecula

StuntSpecula adalah sistem skrining pertumbuhan anak usia **0–59 bulan**.

Sistem menyimpan profil anak satu kali dan membuat record pemeriksaan baru setiap screening:

- **0–23 bulan:** pengukuran manual panjang badan (PB) dan berat badan (BB);
- **24–59 bulan:** pemeriksaan otomatis menggunakan webcam, sensor tinggi badan, dan sensor berat badan pada alat;
- **24–59 bulan:** tersedia juga input manual TB + BB sebagai alternatif/fallback tanpa mendaftarkan anak ulang.

Penentuan stunting tetap berdasarkan pertumbuhan linear menurut umur:

- bayi 0–23 bulan memakai **PB/U**;
- anak 24–59 bulan memakai **TB/U**.

**BB/U** digunakan sebagai informasi tambahan dan membantu memeriksa apakah data pengukuran masuk akal. Gemini hanya dipakai untuk observasi visual pendukung dari foto wajah dan **tidak menentukan status stunting**.

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

## Yang sudah tersedia

- satu akun orang tua dapat memiliki beberapa profil anak;
- input manual PB/BB untuk 0–23 bulan dan TB/BB untuk 24–59 bulan;
- pemeriksaan otomatis untuk anak 24–59 bulan;
- validasi data pengukuran ekstrem sebelum hasil ditampilkan;
- status stunting dengan label yang jelas, bukan istilah samar;
- prediksi tren risiko 90 hari jika riwayat pemeriksaan cukup;
- rekomendasi nutrisi lokal berdasarkan usia dan kondisi pertumbuhan;
- referensi Kemenkes, Buku KIA, dan WHO pada hasil;
- foto wajah terbaru anak pada Beranda orang tua;
- menu **Refresh alat** untuk petugas/admin agar state pengukuran dapat di-reset tanpa harus mencabut-colok perangkat.

Penjelasan non-teknis untuk client/pengguna ada di [Ringkasan Sistem untuk Client](docs/CLIENT_OVERVIEW.md).

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

- [Ringkasan Sistem untuk Client](docs/CLIENT_OVERVIEW.md)
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

1. Stunting ditentukan dari PB/U untuk usia 0–23 bulan dan TB/U untuk usia 24–59 bulan.
2. BB/U adalah indikator tambahan, bukan penentu stunting.
3. Gemini visual hanya menilai kualitas foto/visibilitas area wajah dan tidak menentukan stunting.
4. Raw photo pemeriksaan tidak menjadi bagian dari examination report; hanya foto wajah terbaru per anak yang disimpan untuk tampilan Beranda orang tua.
5. Client input selalu divalidasi kembali di server.
6. Controller/route tetap tipis; business flow berada di server application layer.
7. Jangan menaruh credential di source code.
8. Hindari menambah layer/folder baru tanpa ownership atau tanggung jawab yang jelas.
