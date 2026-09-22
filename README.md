# StuntSpecula

StuntSpecula adalah sistem skrining pertumbuhan anak usia **24–59 bulan** yang dirancang untuk membantu orang tua dan petugas melihat kondisi pertumbuhan anak dengan alur pemeriksaan yang sederhana.

Sistem menggabungkan pengukuran tinggi badan, berat badan, dan foto wajah. Status pertumbuhan utama tetap mengacu pada **standar WHO tinggi badan menurut umur (TB/U)**. Analisis wajah hanya digunakan sebagai informasi pendukung dan tidak menentukan apakah anak mengalami stunting.

> StuntSpecula adalah alat skrining awal, bukan pengganti diagnosis tenaga kesehatan.

## Cara Kerja StuntSpecula

Alur pemeriksaan dibuat sesederhana mungkin:

```text
Orang tua masuk ke akun
        ↓
Pilih anak
        ↓
Mulai pemeriksaan dari HP
        ↓
Anak menuju alat StuntSpecula
        ↓
Pengukuran tinggi badan
        ↓
Pengukuran berat badan
        ↓
Pengambilan foto wajah
        ↓
Data diproses
        ↓
Hasil pertumbuhan ditampilkan
        ↓
Hasil tersimpan di akun orang tua
        ↓
Orang tua menyelesaikan sesi
        ↓
Alat siap untuk anak berikutnya
```

## Cara Menggunakan

### 1. Orang Tua

Orang tua menggunakan halaman **Portal Orang Tua**.

Yang dilakukan:

1. Daftar atau masuk ke akun.
2. Pastikan profil anak sudah tersedia.
3. Tekan **Mulai Pemeriksaan**.
4. Pilih anak yang akan diperiksa.
5. Arahkan anak menuju alat StuntSpecula.
6. Tunggu sampai seluruh pemeriksaan selesai.
7. Hasil akan masuk otomatis ke akun orang tua.
8. Setelah selesai, tutup sesi agar alat siap digunakan kembali.

Di portal orang tua tersedia:

- hasil pemeriksaan terbaru;
- riwayat pemeriksaan;
- perkembangan tinggi dan berat badan;
- informasi status pertumbuhan;
- penjelasan hasil dalam bahasa yang lebih mudah dipahami.

### 2. Anak di Alat StuntSpecula

Saat sesi sudah dimulai, anak cukup mengikuti petunjuk pada layar alat.

Urutannya:

```text
Bersiap
→ Ukur tinggi
→ Ukur berat
→ Lihat ke kamera
→ Tunggu hasil diproses
→ Selesai
```

Tampilan alat dibuat sederhana dan ramah anak agar pemeriksaan tidak terasa rumit.

### 3. Petugas

Petugas menggunakan **Portal Petugas** untuk membantu operasional pemeriksaan.

Petugas dapat memantau kondisi sistem dan memastikan alat siap digunakan. Pemeriksaan tidak perlu dimulai dari dashboard petugas karena sesi utama dimulai langsung oleh orang tua dari HP.

## Bagaimana Hasil Ditentukan?

StuntSpecula menggunakan beberapa data pemeriksaan:

- usia anak;
- jenis kelamin;
- tinggi badan;
- berat badan;
- foto wajah.

### Hasil utama: pertumbuhan WHO

Penilaian utama menggunakan **tinggi badan menurut umur (TB/U)** berdasarkan standar WHO.

Artinya, tinggi badan anak dibandingkan dengan acuan pertumbuhan sesuai usia dan jenis kelaminnya.

Hasil yang ditampilkan dapat berupa kondisi pertumbuhan normal, pendek, atau sangat pendek sesuai hasil perhitungan TB/U.

### Berat badan

Berat badan disimpan sebagai bagian dari data pertumbuhan dan membantu orang tua melihat perubahan kondisi anak dari waktu ke waktu.

### Analisis wajah

Foto wajah digunakan untuk menghasilkan informasi pendukung dari Model A.

Analisis wajah:

- bukan pengenal identitas anak;
- bukan penentu utama status stunting;
- tidak menggantikan hasil WHO;
- digunakan sebagai informasi tambahan dalam laporan.

## Privasi Data

Foto wajah digunakan saat proses pemeriksaan dan tidak disimpan sebagai foto pada laporan hasil.

Data pemeriksaan yang diperlukan disimpan agar orang tua dapat melihat hasil dan riwayat pertumbuhan anak.

## Halaman Utama Sistem

| Halaman | Digunakan untuk |
| --- | --- |
| `/` | Informasi umum StuntSpecula |
| `/ortu` | Akun orang tua, mulai pemeriksaan, hasil, dan riwayat |
| `/alat` | Layar utama alat StuntSpecula |
| `/petugas` | Monitoring dan operasional petugas |

## Ringkasan Peran

```text
ORANG TUA
Memulai pemeriksaan
Melihat hasil
Melihat riwayat dan perkembangan
Menyelesaikan sesi

ALAT STUNTSPECULA
Menjalankan pemeriksaan
Mengukur tinggi dan berat
Mengambil foto wajah
Menampilkan proses pemeriksaan

PETUGAS
Membantu operasional
Memastikan alat siap digunakan
Memantau proses pemeriksaan
```

---

# Informasi untuk Developer

Bagian berikut ditujukan untuk pengembangan dan pemeliharaan sistem.

## Teknologi

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- libSQL / SQLite + Drizzle
- Gemini untuk asisten penjelasan hasil
- Python + OpenCV YuNet + ONNX Runtime untuk Model A

## Menjalankan Project Secara Lokal

Kebutuhan utama:

- Node.js 22
- Python 3.12 untuk runtime Model A

Setup:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

Website berjalan di:

```text
http://localhost:3000
```

Model A lokal berjalan di:

```text
http://127.0.0.1:8787
```

## Struktur Project

```text
StuntSpecula/
├─ api/                    # API Model A untuk deployment
├─ db/                     # schema database
├─ drizzle/                # migration database
├─ models/                 # file runtime Model A
├─ public/                 # gambar, audio, dan aset publik
├─ scripts/
│  └─ model-a/             # setup dan runtime Model A lokal
├─ src/
│  ├─ app/                 # halaman aplikasi
│  ├─ components/
│  │  ├─ landing/
│  │  ├─ portal/
│  │  ├─ screening/
│  │  ├─ legacy/
│  │  └─ ui/
│  ├─ hooks/
│  ├─ lib/
│  └─ server/
├─ tests/
└─ docs/
```

File penting:

- `src/components/screening/station-display.tsx` — layar alat;
- `src/components/portal/parent-portal.tsx` — portal orang tua;
- `src/components/portal/dashboard.tsx` — portal petugas;
- `src/lib/growth.ts` — perhitungan WHO TB/U;
- `api/model-a-screening.py` — inference Model A;
- `src/server/station.ts` — alur sesi alat;
- `src/server/screenings.ts` — penyimpanan hasil;
- `db/schema.ts` dan `drizzle/` — database.

## Environment

```dotenv
APP_ORIGIN=http://localhost:3000
DATABASE_URL=file:./stuntspecula.db
DATABASE_AUTH_TOKEN=
GEMINI_API_KEY=
GEMINI_MODEL=
```

Credential dan file environment tidak boleh dimasukkan ke repository.

## Verifikasi Sebelum Deploy

```powershell
npm run check
npm run build
npm run db:migrate
```

Migration yang sudah digunakan pada database tidak boleh diubah atau diganti nama.

Dokumentasi teknis lanjutan:

- [Arsitektur](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Model A](docs/MODEL_A.md)
