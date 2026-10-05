# Ringkasan Sistem StuntSpecula untuk Client

Dokumen ini menjelaskan cara kerja StuntSpecula dengan bahasa non-teknis. Detail teknis tetap tersedia di dokumen lain pada folder `docs/`.

## 1. Siapa yang bisa diperiksa?

StuntSpecula mencakup anak usia **0–59 bulan**, tetapi metode pemeriksaannya dibedakan berdasarkan usia.

### Bayi 0–23 bulan

Bayi belum diperiksa dengan mode berdiri pada alat.

Petugas/orang tua memilih profil anak, lalu memasukkan:

- panjang badan (PB) dalam posisi terlentang;
- berat badan (BB).

Umur dan jenis kelamin otomatis diambil dari profil anak, sehingga tidak perlu diketik ulang setiap pemeriksaan.

Hasil utama memakai:

- **PB/U** = panjang badan menurut umur;
- **BB/U** = berat badan menurut umur.

### Anak 24–59 bulan

Pemeriksaan memakai alat StuntSpecula:

1. webcam mengambil foto wajah;
2. sensor membaca tinggi badan;
3. sensor membaca berat badan;
4. sistem memvalidasi hasil pengukuran;
5. sistem menghitung status pertumbuhan;
6. hasil, tren, dan rekomendasi ditampilkan.

Hasil utama memakai:

- **TB/U** = tinggi badan menurut umur;
- **BB/U** = berat badan menurut umur.

## 2. Apa yang menentukan stunting?

Status stunting **tidak ditentukan dari wajah dan tidak ditentukan dari berat badan saja**.

Aturannya:

- **PB/U atau TB/U ≥ -2 SD** → tidak terindikasi stunting;
- **PB/U atau TB/U < -2 SD** → terindikasi stunting;
- **PB/U atau TB/U < -3 SD** → terindikasi stunting berat.

Untuk bayi digunakan PB/U. Untuk anak yang sudah masuk pemeriksaan berdiri digunakan TB/U.

BB/U tetap ditampilkan sebagai informasi tambahan dan juga membantu mendeteksi pengukuran yang sangat tidak masuk akal.

## 3. Bagaimana kalau data pengukuran ekstrem?

Sistem tidak langsung memaksakan hasil stunting jika angkanya terlihat tidak masuk akal.

Contoh:

- usia 4 tahun;
- tinggi 106 cm;
- berat 1,9 kg.

Berat tersebut sangat ekstrem untuk usia tersebut. Sistem akan meminta **pengukuran ulang**, bukan langsung menyimpulkan bahwa anak stunting.

Tujuannya supaya kesalahan sensor, salah input, atau pembacaan yang tidak stabil tidak berubah menjadi kesimpulan yang menyesatkan.

## 4. Apa fungsi webcam dan Gemini?

Webcam dipakai untuk mengambil foto wajah. Gemini kemudian membuat observasi visual netral, misalnya:

- apakah wajah terdeteksi;
- apakah hanya ada satu wajah;
- posisi wajah;
- pencahayaan;
- bagian mata, hidung, dan mulut yang terlihat.

Gemini **tidak mendiagnosis stunting dari wajah** dan tidak menghasilkan persentase stunting.

Status stunting tetap berasal dari PB/U atau TB/U.

## 5. Bagaimana hasil screening ditampilkan?

Hasil pemeriksaan dapat memuat:

- panjang/tinggi badan;
- berat badan;
- Z-score PB/U atau TB/U;
- Z-score BB/U;
- status stunting saat ini;
- valid/tidaknya pengukuran;
- tren pertumbuhan;
- prediksi tren risiko 90 hari bila data cukup;
- rekomendasi nutrisi;
- saran tindak lanjut;
- referensi Kemenkes, Buku KIA, dan WHO.

Istilah hasil dibuat eksplisit. Sistem menghindari label yang samar seperti “dalam rentang pemantauan” tanpa menjelaskan apakah anak terindikasi stunting atau tidak.

## 6. Prediksi risiko stunting itu apa?

Prediksi risiko bukan diagnosis baru dan bukan model AI yang menebak masa depan anak.

Sistem membandingkan beberapa pemeriksaan sebelumnya lalu melihat arah perubahan PB/U atau TB/U.

Jika data mencukupi, sistem membuat proyeksi tren sekitar 90 hari.

Contoh hasil:

- tren tidak mengarah ke stunting;
- indikator menurun tetapi belum diproyeksikan melewati -2 SD;
- tren diproyeksikan melewati -2 SD;
- atau data belum cukup untuk membuat prediksi.

Minimal diperlukan dua pemeriksaan dengan jarak waktu yang cukup agar perubahan jangka sangat pendek tidak dianggap sebagai tren.

## 7. Rekomendasi nutrisi

Rekomendasi dibuat berdasarkan usia dan kondisi pertumbuhan.

### 0–5 bulan

Sistem tidak memberikan menu MP-ASI. Fokusnya pada ASI sesuai anjuran dan konsultasi tenaga kesehatan bila ada kendala pertumbuhan atau menyusu.

### 6–23 bulan

Rekomendasi mengikuti konteks MP-ASI dan memakai contoh bahan yang umum di Indonesia, seperti telur, ikan, ayam, tempe, tahu, nasi, ubi, sayur, dan buah.

### 24–59 bulan

Rekomendasi menggunakan pola makan balita yang beragam, dengan contoh bahan pangan lokal Indonesia.

Rekomendasi ini bersifat edukasi, bukan resep medis atau pengganti ahli gizi/dokter.

## 8. Bagaimana sensor mengambil nilai?

Backend tidak seharusnya memakai pembacaan mentah pertama dari sensor.

Firmware dianjurkan membaca sensor beberapa kali, mencari pembacaan yang stabil, membuang lonjakan/outlier, lalu mengirim **satu nilai final yang sudah stabil** ke web.

Contohnya:

```text
100,0 cm
102,0 cm
101,7 cm
101,8 cm
101,8 cm
101,9 cm
```

Firmware memilih hasil dari bagian yang sudah stabil, bukan sekadar angka pertama atau angka terakhir.

Setiap hasil sensor juga terikat ke `examinationId`, sehingga data anak sebelumnya tidak boleh masuk ke sesi anak berikutnya.

## 9. Tombol “Refresh alat”

Petugas dan admin sekarang memiliki tombol **Refresh alat**.

Lokasi:

- Admin → Monitoring alat;
- Petugas → Monitoring pemeriksaan.

Fungsinya untuk membersihkan state pengukuran sementara ketika alat terlihat stuck, sehingga operator tidak perlu langsung mencabut-colok perangkat.

Jika ada sesi aktif, sistem akan:

1. menghapus hasil tinggi/berat sementara;
2. menghapus pesan error pengukuran sementara;
3. melepas hubungan sesi IoT lama;
4. membuat tanda reset baru;
5. memulai ulang flow pemeriksaan pada layar alat.

Riwayat pemeriksaan yang sudah selesai **tidak dihapus**.

### Catatan firmware

Bagian web/backend sudah menyediakan `resetToken`. Agar tombol ini benar-benar menggantikan power-cycle sampai ke buffer RAM ESP32, firmware perlu membaca perubahan `resetToken`, membersihkan sample lokal, lalu melakukan claim ulang.

Jadi istilah “refresh cache” di UI lebih tepat dipahami sebagai **reset state sesi alat**, bukan menghapus cache browser.

## 10. Referensi yang digunakan

Sistem memisahkan fungsi referensi agar tidak rancu:

- **Kemenkes RI — Permenkes No. 2 Tahun 2020**: acuan nasional standar antropometri anak;
- **WHO Child Growth Standards**: kurva/tabel pertumbuhan dan Z-score;
- **Buku KIA Edisi 2024**: referensi pendamping pemantauan pertumbuhan anak dan edukasi keluarga;
- panduan Kemenkes terkait MP-ASI, Isi Piringku, dan PMT pangan lokal untuk rekomendasi nutrisi.

Buku KIA menjadi referensi pendamping, bukan pengganti perhitungan Z-score.

## 11. Batasan yang perlu dipahami

StuntSpecula adalah **alat screening/pemantauan**, bukan alat diagnosis klinis.

Jika hasil menunjukkan stunting, stunting berat, tren memburuk, atau pengukuran berulang tetap tidak masuk akal, tindak lanjut tetap perlu dilakukan melalui Posyandu, Puskesmas, dokter, atau tenaga kesehatan.

## 12. Status optimasi saat ini

Yang sudah diterapkan:

- pemisahan sesi menggunakan examinationId;
- stale measurement dari sesi lama ditolak;
- polling layar alat dibuat cukup responsif;
- tidak ada data tinggi/berat dummy pada flow aktif;
- pengukuran ekstrem diminta ulang;
- tersedia recovery melalui tombol Refresh alat.

Optimasi berikutnya yang masih dapat dilakukan adalah mengurangi countdown yang bersifat tetap dan membuat perpindahan tahap tinggi/berat lebih bergantung pada **sensor sudah stabil**, bukan sekadar menunggu timer.
