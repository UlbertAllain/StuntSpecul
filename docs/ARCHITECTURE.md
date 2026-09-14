# Arsitektur StuntSpecula

## Runtime

Browser → Next.js Route Handler → router → modul bisnis → adapter database → libSQL.

Frontend dan API di-deploy bersama di Vercel. Tidak ada Worker terpisah, static export, atau proxy localhost produksi. Handler API tipis: membuat environment server, meneruskan request, dan memetakan error. Runtime configuration divalidasi saat request, sehingga build tidak membutuhkan akses database/credential.

## Modul

- `auth`: login, sesi, setup pertama, pengelola/petugas.
- `children`: profil dan pencarian.
- `screenings`: satu pemeriksaan aktif, claim, complete, cancel, riwayat.
- `access`: QR satu kali, sesi orang tua, pembacaan satu hasil.
- `ai`: otorisasi chat, persetujuan, rate limit, penyimpanan percakapan.
- `gemini`: prompt hasil dan komunikasi provider.
- `database`: kontrak prepare/bind/first/all/run/batch yang dipakai modul; implementasi SDK libSQL.
- `runtime-config`: origin aplikasi dan validasi koneksi.
- `http/security`: validasi request, cookie, hashing, response, rate limit.

SQL dan business rules lama dipertahankan. Adapter menggunakan SDK resmi agar transport dan transaksi tidak diimplementasikan sendiri. Setiap batch bersifat atomic, termasuk setup admin, klaim QR, serta pasangan pesan chat.

## Penyimpanan

Skema SQLite pada `db/schema.ts`; migrasi tersimpan di `drizzle`. Data produksi memakai libSQL remote. SQLite lokal hanya untuk development. `app_migrations` mencatat checksum dan waktu migrasi, di luar entitas bisnis.

Tabel devices dipertahankan untuk foreign key data lama. Record alat internal tetap dibuat otomatis. Tidak ada pengelolaan/pairing perangkat pada UI/API.

## Akses

Pengelola menambah petugas. Setup pengelola pertama hanya boleh dari development localhost; runtime produksi tidak mempercayai header pemilik dari platform sebelumnya. Buat akun pertama melalui lokal dengan database remote fasilitas.

Staff menggunakan cookie HttpOnly SameSite=Strict; HTTPS menghasilkan Secure. Origin penulisan wajib sesuai APP_ORIGIN. Parent hanya mengakses hasil yang terkait sesi QR miliknya. Hasil/API tidak boleh masuk shared cache. Rahasia tidak dikirim ke browser.

## Batas integrasi

Gemini menjelaskan satu hasil server, tidak menentukan status pertumbuhan. Sensor, perhitungan WHO, dan model facial belum dihubungkan. Nilai yang tidak tersedia tetap kosong/unavailable.
