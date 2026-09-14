# Audit dan perapian NutriMirror

> Catatan historis audit frontend sebelum penambahan backend. Arsitektur dan dependensi saat ini mengikuti README.md; auth, database dan Worker yang kini tersedia digunakan untuk history/QR/chat.

## Hasil audit

| Temuan                                                                               | Perbaikan                                                                                                                         |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Dua jalur runtime Next.js dan Vinext, dengan script Bash                             | Satu jalur Next.js. `npm run dev` langsung menjalankan aplikasi di Windows maupun Linux.                                          |
| 41 dependency langsung, banyak yang tidak digunakan                                  | Menjadi 19 dependency langsung: 9 runtime dan 10 development, termasuk formatter. Lockfile diperbarui dan instalasi bersih diuji. |
| Puluhan komponen UI bawaan tidak dipakai                                             | Menyisakan alert-dialog, button, checkbox, progress, radio-group, dan switch.                                                     |
| Contoh database, auth, Worker, konfigurasi Vite/Drizzle dan vendor CSS tidak dipakai | Dihapus. Tidak ada data database yang dimigrasikan atau dihapus.                                                                  |
| Lima aset karakter, tiga tidak dipakai                                               | Menyisakan dua PNG Mimo yang digunakan desain final.                                                                              |
| State sesi, suara, fokus, dan kamera bercampur                                       | State machine terpisah dari UI; hooks fokus pada sesi, countdown, kamera, dan suara.                                              |
| Callback tahap lama berpotensi memindahkan sesi yang sudah berubah                   | Reducer memvalidasi asal tahap sebelum menerima perpindahan.                                                                      |
| Izin kamera terlambat, gagal, atau terputus                                          | Pembatalan menutup stream terlambat; timeout 15 detik; error dan retry; cleanup listener/stream.                                  |
| Foto tersimpan sebagai string base64                                                 | Menggunakan Blob sementara; laporan hanya membawa status pengambilan, tidak foto.                                                 |
| Countdown memakai sinkronisasi state/ref dan reset melalui effect                    | Countdown per tahap, callback terbaru dengan React Effect Event, satu interval dengan cleanup.                                    |
| Angka ukur dan klasifikasi hasil diisi tetap                                         | Dihapus. Data hilang tetap null, ditampilkan sebagai `—`/`Belum tersedia`.                                                        |
| Copy demo, contoh, dan simulasi tersebar di layar                                    | Dihapus dari antarmuka dan laporan.                                                                                               |
| CSS fitur bercampur dengan tema global                                               | Reset/token global di `app/globals.css`; stylesheet screening berada bersama komponennya.                                         |
| JSX/CSS padat dalam baris panjang                                                    | Source diformat konsisten, dilengkapi perintah formatter dan pemeriksaan format.                                                  |

## Ruang lingkup yang dipertahankan

Layout portrait, palet utama, bentuk tombol, dua pose Mimo, panduan suara, urutan tinggi → berat → wajah, ringkasan/detail, dan unduh laporan tetap tersedia. Panel status yang belum memiliki hasil memakai warna netral agar tidak mengesankan hasil sehat.

## Batas hasil audit

- Sensor fisik, model AI, dan penilaian WHO belum diintegrasikan; audit ini tidak menyatakan sistem sudah siap mengambil keputusan klinis.
- Kamera masih membutuhkan bantuan pendamping untuk framing. Belum ada validasi wajah/landmark otomatis.
- Pemeriksaan otomatis mencakup build, tipe, lint, format, validasi domain, transisi sesi, dan pembatalan izin kamera.
- Pengujian browser dengan perangkat kamera, layar mirror fisik, dan sensor belum dilakukan.
