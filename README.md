# StuntSpecula

Smart mirror untuk skrining pertumbuhan anak usia 24–59 bulan yang dapat berdiri sendiri. Aplikasi menggunakan Next.js App Router, Tailwind, API Next.js, SQLite/libSQL, WHO Child Growth Standards untuk tinggi menurut umur, dan Gemini sebagai asisten penjelasan hasil.

## Jalankan lokal

Gunakan Node.js 22.13 atau lebih baru (Node 22 LTS direkomendasikan).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

Buka `http://localhost:3000` untuk layar mirror dan `http://localhost:3000/petugas` untuk portal monitoring. Pada penggunaan lokal pertama, buat akun pengelola dari portal petugas.

## Deploy di Vercel

Ikuti [panduan langkah demi langkah](docs/VERCEL.md). Untuk akun dan riwayat yang tersimpan, gunakan database **libSQL di Turso**. API dan Gemini berjalan di Next.js Route Handler.

| Environment variable | Fungsi                                                           |
| -------------------- | ---------------------------------------------------------------- |
| APP_ORIGIN           | Origin website lengkap, misalnya https://stuntspecula.vercel.app |
| DATABASE_URL         | URL database libSQL; file SQLite hanya untuk lokal               |
| DATABASE_AUTH_TOKEN  | Token database remote, hanya di server                           |
| GEMINI_API_KEY       | API key Gemini, opsional                                         |
| GEMINI_MODEL         | ID model yang tersedia pada akun Gemini, opsional                |

Simpan konfigurasi lokal di `.env.local` dan konfigurasi produksi di Vercel Environment Variables. Jangan gunakan prefix `NEXT_PUBLIC_` untuk rahasia server.

## Alur utama

1. Mirror membuka sesi pemeriksaan dan menampilkan QR/link.
2. Orang tua membuka QR/link dari HP tanpa membuat akun.
3. Orang tua mengisi nama anak, tanggal lahir, jenis kelamin, dan nama wali opsional.
4. Sistem memvalidasi usia 24–59 bulan dan membuat examination yang terikat ke sesi tersebut.
5. Mirror melanjutkan flow pemeriksaan tinggi, berat, kamera, dan pemrosesan.
6. Hasil pemeriksaan tersedia pada mirror dan HP orang tua.
7. Tinggi menurut umur dinilai secara deterministik menggunakan WHO Child Growth Standards.
8. Orang tua mendapat interpretasi skrining, langkah tindak lanjut, dan dapat bertanya kepada asisten hasil Gemini.
9. Petugas/pengelola memantau pemeriksaan, data anak, dan riwayat dari `/petugas`.

Satu pemeriksaan aktif digunakan untuk satu alat. Kamera tidak dipakai untuk mengenali identitas dan tidak menentukan status stunting.

## Skrining pertumbuhan

StuntSpecula menghitung **Height-for-Age Z-score (TB/U)** untuk anak usia 24–59 bulan menggunakan tabel LMS WHO untuk standing height usia 2–5 tahun.

Interpretasi utama:

- Z-score `< -3`: indikasi stunting berat.
- Z-score `< -2`: indikasi stunting.
- Z-score `-2` sampai `< -1`: bukan kategori stunting; aplikasi menandai untuk pemantauan pertumbuhan.
- Z-score `>= -1`: tidak terindikasi stunting dari TB/U pada pemeriksaan ini.
- Nilai biologis yang tidak masuk akal atau pembacaan tinggi yang tidak tersedia tidak diklasifikasikan sebagai normal.

Hasil merupakan **skrining, bukan diagnosis**. Hasil terindikasi perlu dikonfirmasi melalui pengukuran yang benar dan penilaian tenaga kesehatan.

Referensi utama: [WHO Child Growth Standards — Length/height-for-age](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age).

## Integrasi yang tersedia

- Guest screening: QR/link, sesi sementara mirror ↔ HP orang tua, dan akses hasil terisolasi per pemeriksaan.
- Login petugas: password bcrypt, sesi cookie HttpOnly, role pengelola/petugas.
- Monitoring: pemeriksaan aktif, statistik, data anak, riwayat, dan detail hasil.
- WHO growth engine: TB/U z-score dan klasifikasi skrining dihitung dari usia, jenis kelamin, dan tinggi badan.
- Tindak lanjut: rekomendasi berbasis status skrining ditampilkan pada mirror, HP orang tua, dan laporan.
- Gemini: hanya menjelaskan hasil yang sudah dihitung server; tidak menghitung atau mengganti status stunting.
- Kamera: capture flow tersedia, tetapi model analisis wajah belum terhubung.
- Sensor tinggi/berat: adapter hardware nyata belum terhubung; tanpa pembacaan sensor, nilai tetap `null` dan WHO engine tidak mengarang hasil.

Foto kamera tidak dikirim otomatis ke Gemini. Nama, kode anak, dan identitas profil tidak disertakan otomatis dalam konteks chatbot.

## Verifikasi

```powershell
npm run check
npm run build
npm start
```

`npm run ai:check` mengirim satu pertanyaan tanpa data pasien untuk memeriksa koneksi Gemini menggunakan kuota provider.

`npm run db:migrate` menjalankan migrasi yang belum tercatat. File migrasi yang sudah diterapkan tidak boleh diedit.

## Struktur penting

- `src/app/api/[...path]/route.ts`: adapter HTTP Next.js.
- `src/server/router.ts`: pemetaan endpoint dan pemeriksaan origin.
- `src/server/guest-screening.ts`: sesi QR/link dan orkestrasi parent ↔ mirror.
- `src/server/screenings.ts`: examination dan hasil yang dibaca petugas/orang tua.
- `src/lib/growth.ts`: WHO height-for-age engine dan tindak lanjut.
- `src/server/gemini.ts`: provider asisten penjelasan hasil.
- `src/components/screening`: antarmuka mirror.
- `src/components/portal`: portal orang tua dan petugas.
- `db/schema.ts`, `drizzle`: skema dan migrasi.
- `tests`: aturan bisnis, otorisasi, WHO growth engine, sesi, kamera, database, dan deployment.

[Arah arsitektur](docs/ARCHITECTURE.md) · [Catatan cleanup](docs/CLEANUP.md)
