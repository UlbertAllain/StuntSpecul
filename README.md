# StuntSpecula

StuntSpecula adalah platform pemantauan pertumbuhan anak yang menghubungkan perangkat pemeriksaan IoT, dashboard Puskesmas/fasilitas kesehatan, dan portal orang tua. Sistem menggunakan Next.js App Router, Tailwind, API Next.js, SQLite/libSQL, WHO Child Growth Standards untuk tinggi menurut umur, serta Gemini sebagai asisten penjelasan hasil.

## Jalankan lokal

Gunakan Node.js 22.13 atau lebih baru (Node 22 LTS direkomendasikan).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

Rute utama:

- `http://localhost:3000` — portal utama orang tua.
- `http://localhost:3000/ortu` — alias portal monitoring orang tua.
- `http://localhost:3000/petugas` — dashboard Puskesmas/petugas.
- `http://localhost:3000/alat` — layar perangkat/timbangan StuntSpecula dengan layout portrait.

Pada penggunaan lokal pertama, buat akun pengelola dari portal petugas.

## Deploy di Vercel

Ikuti [panduan langkah demi langkah](docs/VERCEL.md). Untuk akun, hubungan orang tua-anak, dan riwayat pemeriksaan yang persisten, gunakan database **libSQL di Turso**. API dan Gemini berjalan melalui Next.js Route Handler.

| Environment variable | Fungsi                                                           |
| -------------------- | ---------------------------------------------------------------- |
| APP_ORIGIN           | Origin website lengkap, misalnya https://stuntspecula.vercel.app |
| DATABASE_URL         | URL database libSQL; file SQLite hanya untuk lokal               |
| DATABASE_AUTH_TOKEN  | Token database remote, hanya di server                           |
| GEMINI_API_KEY       | API key Gemini, opsional                                         |
| GEMINI_MODEL         | ID model yang tersedia pada akun Gemini, opsional                |

Simpan konfigurasi lokal di `.env.local` dan konfigurasi produksi di Vercel Environment Variables. Jangan gunakan prefix `NEXT_PUBLIC_` untuk rahasia server.

## Alur utama

### 1. Orang tua

1. Orang tua membuka aplikasi utama pada `/` atau `/ortu`, kemudian membuat akun atau masuk.
2. Profil anak terhubung dengan akun orang tua.
3. Orang tua hanya memantau data; nilai hasil pemeriksaan tidak dapat diedit dari portal orang tua.
4. Setelah pemeriksaan selesai, hasil terbaru dan riwayat pertumbuhan otomatis tersedia pada akun orang tua.
5. Orang tua dapat membuka detail hasil dan bertanya kepada Asisten Pertumbuhan mengenai hasil yang sudah dihitung server.

### 2. Puskesmas / petugas

1. Petugas masuk melalui `/petugas`.
2. Petugas mencari profil anak pada menu Data Anak.
3. Petugas menekan **Mulai pemeriksaan** untuk mengirim assignment ke perangkat StuntSpecula.
4. Dashboard digunakan untuk memantau pemeriksaan aktif, data anak, dan riwayat hasil.
5. Pengelola dapat mengelola akun petugas.

### 3. Perangkat IoT

1. Layar portrait pada `/alat` menunggu assignment dari dashboard petugas.
2. Setelah petugas memilih anak, layar menunjukkan bahwa data pemeriksaan sudah diterima tanpa menampilkan identitas anak di layar publik.
3. Pengukuran fisik dirancang untuk tinggi badan, berat badan, dan capture kamera.
4. Setelah hardware terhubung, pembacaan sensor akan dikirim ke examination yang sudah dipilih petugas.

Saat ini tampilan dan alur integrasi perangkat sudah disiapkan, tetapi adapter sensor tinggi/berat nyata masih menunggu hardware IoT final. Sistem tidak membuat nilai sensor palsu jika perangkat belum terhubung.

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

## Analisis wajah

Kamera tetap disiapkan untuk analisis indikator visual seperti area mata, kantong mata, dan kondisi bibir. Kamera **bukan** face recognition untuk menentukan identitas anak. Hasil analisis wajah dipisahkan dari WHO growth engine dan tidak menentukan status stunting.

Model analisis wajah belum terhubung pada versi saat ini. Foto kamera juga tidak dikirim otomatis ke Gemini.

## Portal orang tua

Portal utama `/` (dengan alias `/ortu`) menyediakan:

- login dan sesi akun orang tua yang persisten;
- profil anak yang terhubung;
- hasil pemeriksaan terbaru;
- riwayat pertumbuhan longitudinal;
- detail tinggi, berat, TB/U Z-score, dan status skrining;
- tindak lanjut yang sesuai dengan hasil;
- Asisten Pertumbuhan untuk menjelaskan hasil pemeriksaan.

Asisten Gemini hanya menjelaskan hasil yang sudah dihitung server. Gemini tidak menghitung ulang atau mengganti klasifikasi WHO.

## Dashboard Puskesmas

Portal `/petugas` menyediakan:

- monitoring pemeriksaan aktif;
- statistik pemeriksaan;
- pencarian data anak;
- tombol mulai pemeriksaan untuk anak yang dipilih;
- riwayat pemeriksaan dan detail hasil;
- kelola akun petugas untuk role pengelola.

Satu alat menggunakan satu pemeriksaan aktif pada satu waktu.

## Legacy guest flow

Flow QR/link tanpa akun dari versi sebelumnya masih dipertahankan di backend sebagai jalur kompatibilitas/demo, tetapi bukan alur utama produk setelah refactor client tracking.

## Verifikasi

```powershell
npm run check
npm run build
npm start
```

`npm run ai:check` mengirim satu pertanyaan tanpa data pasien untuk memeriksa koneksi Gemini menggunakan kuota provider.

`npm run db:migrate` menjalankan migrasi yang belum tercatat. File migrasi yang sudah diterapkan tidak boleh diedit.

## Struktur penting

- `src/app/page.tsx`: portal utama orang tua.
- `src/app/ortu`: alias portal monitoring orang tua.
- `src/app/petugas`: dashboard Puskesmas/petugas.
- `src/app/alat`: layar portrait perangkat/timbangan.
- `src/server/router.ts`: pemetaan endpoint dan pemeriksaan origin.
- `src/server/parent-account.ts`: akun, sesi, hubungan data orang tua, hasil, dan chat orang tua.
- `src/server/station.ts`: status assignment minimal untuk layar perangkat statis.
- `src/server/screenings.ts`: examination dan hasil pemeriksaan.
- `src/lib/growth.ts`: WHO height-for-age engine dan tindak lanjut.
- `src/server/gemini.ts`: provider asisten penjelasan hasil.
- `src/components/screening`: antarmuka portrait perangkat.
- `src/components/portal`: portal orang tua dan petugas.
- `db/schema.ts`, `drizzle`: skema dan migrasi.
- `tests`: aturan bisnis, isolasi akun orang tua, otorisasi, WHO growth engine, sesi, kamera, database, dan deployment.

[Arah arsitektur](docs/ARCHITECTURE.md) · [Catatan cleanup](docs/CLEANUP.md)
