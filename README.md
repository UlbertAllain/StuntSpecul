# StuntSpecula

Smart mirror untuk screening pertumbuhan anak di satu fasilitas dengan satu alat. Next.js App Router, Tailwind, API Next.js, SQLite/libSQL, dan asisten hasil Gemini.

## Jalankan lokal

Gunakan Node.js 22.13 atau lebih baru (Node 22 LTS direkomendasikan).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

Buka http://localhost:3000/petugas. Buat pengelola pertama sekali, lalu tambahkan petugas melalui Pengaturan. Konfigurasi contoh menggunakan database lokal; data lokal tidak otomatis ikut ke Vercel.

## Deploy di Vercel

Ikuti [panduan langkah demi langkah](docs/VERCEL.md). Untuk akun dan riwayat yang tersimpan, siapkan database **libSQL di Turso**. API dan Gemini berjalan di Next.js Route Handler, tanpa Worker atau Wrangler.

| Environment variable | Fungsi                                                           |
| -------------------- | ---------------------------------------------------------------- |
| APP_ORIGIN           | Origin website lengkap, misalnya https://stuntspecula.vercel.app |
| DATABASE_URL         | URL database libSQL; file SQLite hanya untuk lokal               |
| DATABASE_AUTH_TOKEN  | Token database remote, hanya di server                           |
| GEMINI_API_KEY       | API key Gemini, opsional                                         |
| GEMINI_MODEL         | ID model yang tersedia pada akun Gemini, opsional                |

Simpan konfigurasi lokal di `.env.local`, konfigurasi produksi di Vercel Environment Variables. Tidak ada variabel rahasia dengan prefix `NEXT_PUBLIC_`. Setelah mengubah konfigurasi Vercel, redeploy.

## Alur

1. Petugas masuk dan memilih/membuat profil anak.
2. Petugas memastikan anak dapat berdiri, memilih penggunaan kamera, lalu memulai pemeriksaan.
3. Pada mirror, anak menekan tombol siap. Tinggi, berat, kamera, dan pemrosesan berjalan berurutan.
4. Hasil tersimpan pada pemeriksaan. Petugas melihat riwayat dan membuat QR.
5. Orang tua memindai QR untuk melihat satu hasil dan berbicara dengan asisten hasil.
6. QR berlaku 10 menit dan hanya bisa dipakai sekali. Sesi orang tua berlaku 2 jam dan dapat dicabut petugas.

Satu pemeriksaan aktif untuk satu alat. Tidak ada pairing perangkat. Kamera digunakan untuk analisis visual, bukan pengenalan identitas.

## Integrasi yang tersedia

- Login: password bcrypt, sesi cookie HttpOnly, role pengelola/petugas.
- Riwayat, QR, percakapan: database permanen.
- Gemini: API server dengan persetujuan pengguna, batas permintaan, konteks hasil, dan error provider yang dibedakan. Menambahkan key/model mengaktifkan koneksi; koneksi nyata perlu diuji pada akun Anda.
- Sensor, standar WHO, dan model facial: **belum terhubung**. Nilai yang belum tersedia tidak diubah menjadi hasil normal. Integrasi chatbot tidak mengaktifkan sensor atau penilaian WHO.

Foto kamera tidak dikirim otomatis ke Gemini. Nama, kode anak, dan identitas profil tidak disertakan otomatis dalam konteks chatbot. Pesan yang diketik orang tua tetap dikirim ke provider.

## Verifikasi

```powershell
npm run check
npm run build
npm start
```

`npm run ai:check` mengirim satu pertanyaan tanpa data pasien untuk memeriksa koneksi Gemini, menggunakan kuota provider. Jalankan setelah mengisi key dan model di `.env.local`. Jangan membagikan key atau file konfigurasi rahasia.

`npm run db:migrate` menjalankan migrasi yang belum tercatat. Migrasi dan catatannya disimpan dalam satu transaksi. File migrasi yang sudah diterapkan tidak boleh diedit.

## Struktur

- `src/app/api/[...path]/route.ts`: adapter HTTP Next.js.
- `src/server/router.ts`: pemetaan endpoint, pemeriksaan origin.
- `src/server/auth.ts`, `children.ts`, `screenings.ts`, `access.ts`, `ai.ts`: modul bisnis.
- `src/server/database.ts`: adapter query dan transaksi SDK libSQL.
- `src/server/runtime-config.ts`, `runtime.ts`: validasi konfigurasi dan koneksi server.
- `src/server/gemini.ts`: provider asisten hasil.
- `src/components/screening`: antarmuka mirror.
- `src/components/portal`: petugas dan orang tua.
- `db/schema.ts`, `drizzle`: skema dan migrasi.
- `tests`: aturan bisnis, otorisasi, sesi, kamera, database, konfigurasi deployment.

[Arah arsitektur](docs/ARCHITECTURE.md) · [Catatan cleanup](docs/CLEANUP.md)
