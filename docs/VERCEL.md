# Deployment StuntSpecula di Vercel

## 1. Siapkan database

Buat database **libSQL** di [Turso](https://turso.tech/) dan ambil URL database serta token akses database. SDK proyek menggunakan `@libsql/client`. Pilih database libSQL yang kompatibel, bukan mengganti engine/schema tanpa migrasi.

Akun, pemeriksaan, QR, dan riwayat membutuhkan penyimpanan permanen. Vercel tidak menyediakan file SQLite permanen pada filesystem function. Database lokal `.wrangler` atau `stuntspecula.db` tidak otomatis diunggah.

## 2. Hubungkan lokal ke database tersebut

Tarik branch perbaikan atau unduh ZIP source, lalu jalankan:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Jika `.env.local` sudah ada, edit file tersebut tanpa menimpanya. Isi:

```dotenv
APP_ORIGIN=http://localhost:3000
DATABASE_URL=libsql://DATABASE-ANDA.turso.io
DATABASE_AUTH_TOKEN=TOKEN_DATABASE_ANDA
GEMINI_API_KEY=
GEMINI_MODEL=
```

Jangan commit file ini. Jika sebelumnya memakai `.dev.vars`, pindahkan nilai key/model ke `.env.local`.

```powershell
npm run db:migrate
npm run dev
```

Buka **http://localhost:3000/petugas**, kemudian buat pengelola pertama. Karena lokal memakai database remote yang sama, akun ini bisa langsung dipakai di Vercel. Tidak ada setup key. Setup pertama hanya tersedia pada development localhost; endpoint produksi tidak menerima pendaftaran admin awal maupun header identitas hosting lama.

Database yang sudah berisi skema/data dari instalasi lama memerlukan migrasi data tersendiri. Jangan menjalankan ulang SQL CREATE TABLE pada database tersebut atau menghapus data agar instalasi lolos. Langkah di atas ditujukan untuk database baru.

## 3. Konfigurasi proyek Vercel

Hubungkan repository ini. Pastikan branch deployment berisi perbaikan.

- Framework Preset: **Next.js**.
- Root Directory: root repository.
- Build Command: **npm run build**.
- Output Directory: **.next** (ditetapkan oleh `vercel.json`).
- Node.js: **22.x**.
- Hapus override lama seperti `out`, `dist/client`, dan perintah Wrangler.

Di **Settings → Environment Variables**, isi scope Production:

```dotenv
APP_ORIGIN=https://stuntspecula.vercel.app
DATABASE_URL=libsql://DATABASE-ANDA.turso.io
DATABASE_AUTH_TOKEN=TOKEN_DATABASE_ANDA
GEMINI_API_KEY=KEY_GEMINI_ANDA
GEMINI_MODEL=ID_MODEL_YANG_TERSEDIA
```

Dua variabel Gemini boleh kosong jika belum ingin mengaktifkan chatbot. Jangan gunakan prefix `NEXT_PUBLIC_` untuk token atau key.

APP_ORIGIN harus sama dengan origin yang dibuka pengguna. Untuk custom domain, ubah ke domain tersebut dan redeploy. Preview deployment menggunakan database terpisah serta APP_ORIGIN URL preview yang tepat jika ingin menguji login di preview. Jangan menyalin database pasien produksi ke preview.

Jalankan **Redeploy** setelah menyimpan environment variables. Migrasi database sengaja tidak dijalankan setiap build Vercel, agar preview/build tidak mengubah database produksi.

## 4. Periksa hasil deployment

1. Buka `https://stuntspecula.vercel.app/api/config`. Respons harus JSON `success: true`.
2. Buka `/petugas`, masuk dengan pengelola yang dibuat dari localhost.
3. Buat profil anak dan pemeriksaan, lalu buka mirror pada browser yang sama.
4. Selesaikan alur, buka riwayat, dan buat QR untuk ponsel orang tua.
5. Jika Gemini diaktifkan, buka hasil melalui QR dan kirim pertanyaan setelah persetujuan.

Sensor dan analisis WHO/facial tetap memerlukan integrasi hardware/model. Nilai kosong pada hasil bukan error deployment.

## 5. Jika masih gagal

Lihat request yang gagal di DevTools → Network serta Vercel → Logs. Catat status HTTP dan field `code`, tanpa menyalin password, cookie, token QR, atau API key.

| Kode                              | Tindakan                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| app_origin_invalid                | Periksa APP_ORIGIN dan redeploy                                          |
| database_not_configured           | Isi URL dan token database remote                                        |
| database_url_invalid              | Gunakan URL libSQL/HTTPS; file SQLite tidak didukung di produksi         |
| service_unavailable               | Periksa koneksi database, token, dan apakah migrasi telah diterapkan     |
| origin_rejected                   | Samakan APP_ORIGIN dengan domain yang sedang dibuka                      |
| setup_restricted                  | Buat pengelola pertama dari development localhost yang memakai DB remote |
| ai_not_configured                 | Isi GEMINI_API_KEY dan GEMINI_MODEL                                      |
| ai_key_invalid / ai_access_denied | Periksa key dan izin project Gemini                                      |
| ai_model_unavailable              | Periksa ID model yang tersedia pada akun                                 |
| ai_quota_exceeded                 | Periksa kuota/batas provider                                             |
| ai_network_error / ai_timeout     | Periksa koneksi provider dan log function                                |

Untuk menguji Gemini tanpa alur pemeriksaan:

```powershell
npm run ai:check
```

Ini menggunakan konfigurasi lokal dan mengirim satu pertanyaan sungguhan. Keberhasilan lokal tidak memastikan environment Vercel sudah terisi.

## Referensi

- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [Next.js di Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [SDK libSQL/Turso](https://docs.turso.tech/sdk/ts/reference)
