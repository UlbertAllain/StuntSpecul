# StuntSpecula

Smart mirror portrait dan portal pemeriksaan anak untuk satu fasilitas posyandu/RS. Frontend Next.js + React + Tailwind; API Cloudflare Worker; data terstruktur D1/SQLite. Logo dan aset Mimo tersedia di `public/images/`.

## Yang tersedia

- **Mirror (`/`)**: menerima sesi dari petugas, panduan tinggi → berat → kamera, jeda, suara, interaksi Mimo, dan penyimpanan hasil ke pemeriksaan yang sesuai.
- **Petugas (`/petugas`)**: login, profil anak, pemeriksaan baru, history per anak/seluruh fasilitas, dan QR akses hasil.
- **Pengelola**: semua fitur petugas, tambah/nonaktifkan akun staf.
- **Orang tua (`/hasil`)**: hasil satu pemeriksaan dan Asisten Hasil melalui QR. Tidak perlu registrasi akun orang tua.
- **AI**: adapter Gemini API menggunakan model yang tersedia di akun penyedia. Tidak perlu melatih model chatbot.

## Menjalankan lokal

Gunakan Node.js 22.13 atau lebih baru.

```bash
npm ci
```

Salin `.dev.vars.example` menjadi `.dev.vars` untuk konfigurasi Gemini. Pembuatan pengelola pertama pada localhost tidak memerlukan setup key.

Lalu jalankan:

```bash
npm run dev
```

Script menerapkan migrasi D1 lokal lalu menjalankan Next.js di `http://localhost:3000` dan API di port 8787. Berlaku untuk Windows, macOS, dan Linux. Data lokal tersimpan di `.wrangler/` yang tidak masuk Git/ZIP. Hentikan keduanya dengan Ctrl+C.

1. Buka `/petugas`. Buat akun pengelola pertama dengan nama fasilitas, email, password minimal 12 karakter. Pembuatan pengelola awal hanya dapat dilakukan sekali.
2. Petugas login pada browser layar mirror. Pengelola dapat menambahkan akun petugas melalui Pengaturan.
3. Tambah/pilih profil anak, konfirmasi anak sudah bisa berdiri, dan tentukan izin kamera. Tekan Mulai pemeriksaan; halaman langsung beralih ke mirror.
4. Pada mirror, tekan tombol mulai dan ikuti panduan. Hasil disimpan ke profil anak yang dipilih petugas.
5. Di History, buka pemeriksaan selesai lalu buat QR. Berikan langsung kepada pendamping anak.
6. Orang tua memindai QR pada ponsel, menekan Buka hasil pemeriksaan, lalu dapat menggunakan Asisten Hasil jika layanan AI telah dikonfigurasi.

Profil menggunakan tanggal lahir untuk menghitung usia bulan penuh. Cakupan usia saat ini 0–59 bulan, dengan konfirmasi sudah bisa berdiri. Nama/kode anak digunakan petugas untuk mengaitkan history; kamera tidak digunakan untuk mengenali identitas.

## Menghubungkan Gemini

Isi dua nilai server dalam `.dev.vars` untuk lokal atau pengaturan environment hosting untuk produksi:

```dotenv
GEMINI_API_KEY=isi-kunci-api-anda
GEMINI_MODEL=isi-id-model-yang-tersedia-di-akun-anda
```

Pilih model yang mendukung `generateContent` sesuai [dokumentasi Gemini API](https://ai.google.dev/api/generate-content). ID model sengaja tidak dikunci agar dapat mengikuti model yang tersedia pada akun Anda. Jangan memakai awalan `NEXT_PUBLIC_` dan jangan memasukkan API key ke source atau browser. Restart server lokal atau deploy ulang setelah perubahan environment.

Server mengambil konteks pemeriksaan dari database berdasarkan sesi orang tua. Konteks otomatis berisi usia, jenis kelamin, angka ukur, status tersedia/tidak tersedia, dan waktu pemeriksaan. Nama, tanggal lahir, kode anak, ID, dan foto tidak disertakan. Pertanyaan yang diketik orang tua dikirim apa adanya setelah persetujuan di antarmuka. Teks jawaban dirender sebagai teks biasa.

Chatbot menjelaskan hasil yang ada; tidak menghitung atau menggantikan klasifikasi WHO, tidak menyimpulkan kondisi dari data kosong, dan tidak mengolah foto. Adapter dapat diganti melalui kontrak `ResultExplainer` di `src/server/gemini.ts`. Tanpa API key/model, tombol chat tidak aktif dan hasil tetap bisa dibaca. Kegagalan API ditampilkan sebagai pesan yang dapat dicoba ulang.

## Akses dan penyimpanan

- Satu instalasi = satu fasilitas; pengelola dan petugas hanya mengakses database instalasi tersebut.
- Password di-hash bcrypt. Sesi staf memakai cookie HttpOnly, SameSite=Strict, Secure pada HTTPS, kedaluwarsa 8 jam; penonaktifan staf mencabut sesinya.
- Satu alat, tanpa pendaftaran perangkat atau pairing. Operasi mirror menggunakan sesi login petugas pembuat pemeriksaan. Maksimal satu pemeriksaan aktif untuk seluruh fasilitas; batalkan pemeriksaan lama melalui History bila perlu mengganti petugas. Cookie pairing versi lama tidak lagi memberi akses.
- QR hasil berisi token acak pada fragment URL, berlaku 10 menit dan sekali pakai. Database hanya menyimpan hash token.
- Setelah dibuka, cookie orang tua berlaku 2 jam untuk **satu pemeriksaan**. QR baru atau Cabut akses membatalkan akses sebelumnya. Orang tua dapat menutup akses sendiri.
- Chat dibatasi 20 pengiriman per sesi, 4 per menit, dan 500 permintaan per hari per fasilitas. Percobaan yang gagal setelah dialokasikan tetap terhitung. Tidak ada antrean biaya tanpa batas.
- Chat tersimpan per sesi; sesi kedaluwarsa dibersihkan bertahap saat konfigurasi aplikasi diakses, dan pesan terhapus bersama sesinya. History pemeriksaan tetap tersimpan. Belum ada penghapusan otomatis history fasilitas.
- Foto kamera hanya Blob dalam memori selama sesi. Tidak diunggah, tidak menjadi lampiran chat, dan dilepas setelah hasil disusun/keluar.
- Mutasi API memeriksa Origin, identitas, peran, validasi input dan kepemilikan sesi; bukan hanya menyembunyikan tombol.

Tautan hasil memerlukan host yang dapat diakses ponsel orang tua. Hosting Site saat ini tetap privat untuk pemilik; membuka audience harus dilakukan secara eksplisit sebelum QR bisa dipakai orang tua di luar akun pemilik. Hak akses aplikasi tetap berlaku setelah host dibuka.

## Status integrasi perangkat dan klinis

Sensor fisik, perhitungan WHO dan model facial analysis **belum terhubung** pada source ini. `readMeasurements()` di `src/lib/screening.ts` mengembalikan nilai kosong hingga adapter sensor dipasang. Angka kosong ditampilkan `—`; status pertumbuhan/risiko/indikator wajah tetap **Belum tersedia**. Selesai berarti alur pemeriksaan sudah disimpan, bukan data klinis sudah lengkap.

API penyelesaian menerima tinggi, berat, dan status pengambilan foto dari sesi petugas pembuat pemeriksaan. BMI dihitung server jika kedua angka tersedia; klasifikasi pertumbuhan tidak dapat ditulis bebas oleh client. Integrasi WHO/facial berikutnya perlu menyimpan hasil terverifikasi melalui layanan server tersendiri. Countdown memandu layar dan belum menjadi konfirmasi kestabilan sensor.

## Struktur

| Lokasi                      | Tanggung jawab                                            |
| --------------------------- | --------------------------------------------------------- |
| `src/app/`                  | Rute Next.js, metadata, token tema                        |
| `src/components/screening/` | Layar mirror, karakter dan gaya interaksi                 |
| `src/components/portal/`    | Petugas, history, hasil orang tua, chat                   |
| `src/components/ui/`        | Primitif UI yang digunakan                                |
| `src/hooks/`                | Sesi pemeriksaan, kamera, countdown dan suara             |
| `src/lib/`                  | Tipe/validasi bersama, laporan, state machine, API client |
| `src/server/`               | Router Worker, auth, pemeriksaan, akses QR, adapter AI    |
| `db/schema.ts`, `drizzle/`  | Skema, migrasi dan metadata Drizzle                       |
| `scripts/`                  | Development lintas platform dan build Worker              |
| `tests/`                    | Tes domain, sesi, kamera, SQLite/API dan adapter AI       |
| `docs/ARCHITECTURE.md`      | Keputusan arsitektur dan batas akses                      |

## Pemeriksaan dan build

```bash
npm run check
npm run build
```

`check` menjalankan TypeScript, ESLint, tes dan pemeriksaan format. `format` merapikan source. Tes backend menggunakan database SQLite sementara dengan migrasi produksi; tes Gemini menggunakan respons terkontrol, tanpa mengirim data ke API nyata.

Build menghasilkan frontend statis di `out/`, kemudian menyiapkan `dist/client/`, `dist/server/index.js`, dan migrasi `dist/.openai/drizzle/`. API tetap berjalan di Worker; menaruh `out/` di hosting statis saja tidak menyediakan login/history/chat. Development menggunakan rewrite Next.js ke Worker lokal.

## Hosting dan migrasi

Sites menggunakan binding logis `DB` di `.openai/hosting.json` dan menerapkan migrasi saat publikasi. `APP_ORIGIN` produksi harus sesuai URL HTTPS website. Pada Site privat, konfigurasi allowlist pemilik dapat mengizinkan setup awal melalui header identitas yang diverifikasi dispatcher (`SETUP_OWNER_ID` atau `SETUP_OWNER_EMAIL`). Jangan mengonfigurasi allowlist header tersebut pada reverse proxy yang tidak memverifikasi/mengganti header identitas. Untuk self-host, buat admin sebelum membuka layanan untuk umum; endpoint inisialisasi hanya mengizinkan localhost atau identitas pemilik hosting yang terverifikasi.

Untuk Cloudflare milik sendiri: buat D1, ganti `database_id` lokal dalam `wrangler.jsonc`, atur `APP_ORIGIN`, simpan `GEMINI_API_KEY` sebagai secret, atur `GEMINI_MODEL`, terapkan migrasi remote, kemudian build dan deploy Worker. `wrangler.jsonc` bawaan hanya berisi placeholder database lokal; jangan menganggapnya konfigurasi produksi siap pakai. Contoh urutan setelah database/environment disiapkan:

```bash
npx wrangler d1 migrations apply DB --remote
npm run build
npx wrangler deploy
```

Sesudah mengubah skema, jalankan `npm run db:generate`, periksa SQL, dan commit seluruh migrasi/metadatanya. Jangan mengedit migrasi yang sudah diterapkan. API tidak membuat skema saat menerima request.

Belum diuji dengan sensor/mirror fisik atau layanan Gemini nyata. Catatan audit visual sebelumnya ada di [AUDIT.md](AUDIT.md).

## Penyederhanaan satu alat

Endpoint pengelolaan perangkat dan halaman pairing sudah dihapus. Tabel perangkat lama dipertahankan hanya untuk menjaga foreign key dan history yang telah tersimpan; satu record internal dibuat otomatis saat pemeriksaan baru. Tidak ada input nama alat atau credential perangkat. Migrasi yang sudah diterapkan tidak diubah. Penguncian satu pemeriksaan aktif dilakukan atomik pada INSERT, termasuk pemeriksaan dari versi sebelumnya.

## Panduan navigasi backend

- `router.ts`: pemetaan method/path API.
- `auth.ts`: autentikasi, sesi dan pengelolaan petugas.
- `children.ts`: validasi, pencarian dan penyimpanan profil anak.
- `screenings.ts`: urutan pemeriksaan, kepemilikan sesi dan penyimpanan hasil.
- `access.ts`: QR hasil, sesi orang tua dan akses percakapan.
- `ai.ts`: otorisasi chat, kuota dan penyimpanan pesan.
- `gemini.ts`: konteks hasil, prompt dan komunikasi dengan penyedia AI.
- `http.ts`, `security.ts`, `env.ts`: transport HTTP, primitive keamanan dan tipe konfigurasi.
- `worker.ts`: entrypoint API/aset dan header respons.

Pemisahan mengikuti tanggung jawab fitur tanpa menambah layer kosong. SQL menggunakan prepared statement; schema dan migrasi terdahulu tetap dipertahankan.

## Diagnosis koneksi Gemini

Jalankan `npm run ai:check` dari folder project setelah mengisi `.dev.vars`. Perintah menggunakan adapter API yang sama dan mengirim satu pertanyaan tanpa data pasien. Ini merupakan request nyata yang memakai kuota API. Key dan teks jawaban tidak dicetak. Tidak memerlukan login atau database.

Kode hasil: `ai_not_configured` (environment belum lengkap), `ai_key_invalid` (key ditolak/diblokir), `ai_model_invalid` (format model salah), `ai_model_unavailable` (model tidak tersedia), `ai_quota_exceeded` (kuota/rate limit), `ai_access_denied` (izin), `ai_request_rejected` (parameter/project), `ai_network_error` (koneksi), `ai_timeout` (25 detik). Prefix `models/` dan spasi tepi konfigurasi model dinormalisasi otomatis. Tidak ada pergantian model otomatis.

Jika berhasil melalui terminal tetapi gagal lewat website, restart `npm run dev` dan periksa response JSON `/api/parent/chat` pada tab Network browser. Jangan membagikan API key, cookie, token QR atau isi data pasien. `aiAvailable` hanya menandakan konfigurasi terisi, bukan keberhasilan koneksi.

Input dan konfigurasi SETUP_KEY telah dihapus. Akun yang sudah tersimpan tetap menggunakan email/password yang sama. Buat akun pertama melalui `http://localhost:3000/petugas`; pada Site online gunakan akun pemilik hosting. Pembuatan admin awal tetap hanya sekali dan atomik.
