# StuntSpecula V1 — fasilitas dan portal hasil

## Objective dan scope

Satu instalasi melayani satu posyandu/RS. Dua role petugas: `admin` (pengelola) dan `staff` (petugas). Anak dan orang tua tidak membuat akun. Tidak ada public registration. Login petugas memakai email/password milik aplikasi; akses platform hosting merupakan lapisan tambahan yang terpisah.

## Business flow

Pengelola melakukan setup awal → menambahkan petugas → petugas membuat/memilih profil anak → memulai pemeriksaan → browser yang sama membuka mirror dengan sesi login petugas → hasil disimpan secara idempotent → petugas menerbitkan QR → orang tua menukar QR sekali pakai → membaca satu hasil dan bertanya melalui Gemini.

History petugas terikat ke ID profil anak. QR tidak memberikan akses seluruh history. Profil menyimpan nama panggilan, tanggal lahir, jenis kelamin, nama pendamping, dan kode lokal unik; tidak membutuhkan NIK/foto permanen. Usia dihitung ulang server ketika pemeriksaan dibuat.

## Data dan aturan

- `staff`: email unik, password hash, role, status aktif.
- `children`: kode lokal unik, identitas dasar, tanggal lahir, timestamp.
- `devices`: relasi historis yang dipertahankan; satu record internal otomatis untuk alat tunggal, tanpa endpoint pengelolaan perangkat.
- `examinations`: profil anak, snapshot usia/jenis kelamin, petugas, perangkat, status, data hasil, timestamp. Maksimal satu sesi aktif per fasilitas, diperiksa atomik saat INSERT.
- `sessions`: token hash sesi petugas atau orang tua, expiry dan relasi pemilik.
- `result_links`: token QR hash, satu hasil, expiry, status penukaran/pencabutan.
- `chat_messages`: percakapan per sesi orang tua, hanya hasil yang diizinkan.
- `rate_limits`: kuota atomik untuk login, penukaran QR, dan chat.
- `facility`: satu record konfigurasi nama fasilitas.

Foreign keys, unique/partial indexes, prepared statements, dan batch transaction menjaga integritas. Migrasi Drizzle mengelola schema; tidak ada DDL saat request.

## Modul dan file

- CREATE `db/schema.ts`, `drizzle/`: schema/migrasi SQLite/D1.
- CREATE `src/server/{http,security,auth,children,screenings,access,ai,gemini,router,worker}.ts`: backend REST dan domain per tanggung jawab.
- CREATE `src/lib/portal.ts`, `src/lib/api-client.ts`: kontrak dan client API.
- CREATE `src/components/portal/`: UI petugas, hasil, dan chat.
- CREATE `src/app/{petugas,hasil}/page.tsx`: halaman aplikasi.
- UPDATE `src/components/screening/`, `src/hooks/use-screening-session.ts`: menghubungkan sesi mirror ke backend.
- CREATE `scripts/{dev,build-worker}.mjs`, `wrangler.jsonc`: satu perintah development, Worker backend.

Next.js tetap merender frontend; Worker ESM melayani API dan aset hasil ekspor Next.js pada origin yang sama. Ini menghindari runtime Next.js kedua di hosting dan mempertahankan komponen UI yang sudah disetujui.

## Security dan edge cases

Password di-hash bcrypt; cookie HttpOnly/SameSite/Secure pada HTTPS; CSRF same-origin; body limit; server validation; role dicek pada setiap endpoint. Hash token disimpan, bukan token mentah. QR 10 menit, sekali ditukar secara atomik, sesi orang tua 2 jam; pencabutan memutus akses hasil/chat. Mirror memakai sesi petugas pembuat pemeriksaan; cookie pairing lama tidak berlaku. Tidak ada hasil medis buatan ketika integrasi belum tersedia. Pembatalan/submit ulang tidak menulis sesi anak lain. Chat hanya menerima konteks hasil dari server, tanpa nama, foto, tanggal lahir, atau akses query database; maksimal 20 pesan orang tua per sesi dengan batas harian fasilitas. API key Gemini dan model di environment server, tidak masuk ZIP/client. Prompt injection diperlakukan sebagai input, bukan instruksi untuk mengambil data lain.

## Batas operasional

Sensor, facial model, dan penilaian WHO tetap titik integrasi terpisah. Chat menggunakan model siap pakai, tidak melatih model. Data/foto tidak otomatis dikirim ke chatbot. Live provider memerlukan konfigurasi key/model. Portal QR anonim membutuhkan hosting yang dapat dijangkau orang tua; proteksi platform private tetap berlaku sampai pemilik membuka audience atau memakai hosting sendiri.
