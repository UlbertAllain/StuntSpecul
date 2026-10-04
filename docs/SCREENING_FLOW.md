# Screening Flow

## Scope

Standing-height screening ditujukan untuk anak usia 24–59 bulan.

## Main flow

```text
Parent
1. Login
2. Pilih anak
3. Mulai pemeriksaan
        │
        ▼
Firestore examination
status = queued
        │
        ▼
/alat polling active station
        │
        ▼
auto claim
status = running
        │
        ▼
prepare
→ height
→ weight
→ camera
→ analysis
→ result
        │
        ▼
station complete
status = completed
        │
        ▼
Parent/authorized flow finalize
station released
```

Tidak ada tombol manual "Aku siap" pada station setelah parent memulai sesi. Station melakukan claim otomatis.

## State machine

Source: `src/lib/session.ts`.

```text
welcome
→ prepare
→ height
→ weight
→ camera
→ analysis
→ result
```

Jika camera disabled:

```text
weight
→ analysis
```

## Measurements

ESP32 mengirim tinggi/berat melalui /api/iot/measurements. Selama sesi aktif, halaman /alat membaca nilai yang sudah tersimpan melalui station state.

Jika perangkat IoT online, hasil sensor menjadi sumber utama dan backend memprioritaskan nilai IoT saat examination diselesaikan.

Tidak ada generator TB/BB dummy. Tahap tinggi dan berat menunggu nilai sensor IoT yang valid; jika nilai belum diterima, UI tetap berada pada tahap pengukuran dan tidak melanjutkan ke hasil.

Sebelum measurement diterima/finalized, backend menjalankan validation gate WHO:

- TB/U (height-for-age) harus berada dalam flag range WHO -6 sampai +6 SD;
- BB/U (weight-for-age) harus berada dalam flag range WHO -6 sampai +5 SD;
- nilai di luar range dianggap kemungkinan measurement/input error dan menghasilkan `measurement_recheck_required`;
- data tersebut tidak boleh diberi kesimpulan stunting. User diminta mengulang pengukuran.

Stunting tetap ditentukan dari TB/U < -2 SD. BB/U tidak mengubah definisi stunting; BB/U dipakai sebagai indikator tambahan dan validasi plausibility pengukuran.

Setelah TB/U WHO dihitung, backend membuat snapshot rekomendasi edukasi berdasarkan growthStatus dan tren TB/U dibanding examination completed sebelumnya untuk anak yang sama:

- recommendations.nutrition
- recommendations.nextSteps
- recommendations.version
- recommendations.trend
- recommendations.trendDelta
- recommendations.currentHeightForAgeZ
- recommendations.previousHeightForAgeZ

Snapshot disimpan bersama examination supaya riwayat lama tidak berubah ketika aturan rekomendasi versi berikutnya diperbarui. Jika belum ada pemeriksaan sebelumnya, rekomendasi memakai status WHO saat ini tanpa perbandingan tren. Examination legacy yang belum memiliki snapshot tetap mendapatkan fallback rekomendasi saat dibaca.

### Prediksi risiko stunting berbasis tren

Setelah pemeriksaan valid selesai, backend membangun seri TB/U dari maksimal empat pemeriksaan valid sebelumnya ditambah pemeriksaan saat ini. `src/lib/stunting-risk.ts` menjalankan regresi linear sederhana terhadap TB/U berdasarkan waktu dan membuat simulasi tren 90 hari.

Output:

- `insufficient_data`: belum ada minimal dua pengukuran dengan rentang sekurangnya 28 hari;
- `low`: tren tidak memproyeksikan TB/U melewati -2 SD dalam 90 hari;
- `watch`: TB/U menurun lebih dari 0,1 SD per 30 hari tetapi proyeksi 90 hari belum melewati -2 SD;
- `high`: proyeksi tren 90 hari melewati -2 SD;
- `current_stunting`: TB/U saat ini sudah < -2 SD, sehingga status WHO saat ini lebih relevan daripada forecast.

Engine ini tidak menghasilkan probabilitas klinis dan tidak diklaim sebagai model ML tervalidasi. Nilainya adalah early-warning berbasis tren untuk membantu pemantauan; diagnosis dan keputusan klinis tetap dilakukan tenaga kesehatan.

### Localized Nutrition Recommendation Engine

`src/lib/growth-recommendations.ts` menghasilkan rekomendasi edukasi pangan lokal Indonesia untuk usia 24-59 bulan. Engine menyesuaikan fokus berdasarkan status TB/U dan tren, lalu menyediakan:

- contoh sumber protein hewani lokal (telur, lele, kembung, ayam, daging);
- lauk nabati seperti tempe/tahu;
- pilihan makanan pokok, sayur, dan buah yang umum dijumpai;
- contoh susunan menu satu hari tanpa menetapkan porsi medis individual;
- catatan alergi/toleransi dan anjuran konsultasi pada masalah pertumbuhan.

Dasar edukasi:
- Kemenkes RI — Isi Piringku Balita 2-5 Tahun: https://ayosehat.kemkes.go.id/1000-hari-pertama-kehidupan/category/balita
- Kemenkes RI — PMT Berbahan Pangan Lokal bagi Balita: https://ayosehat.kemkes.go.id/pemberian-makanan-tambahan-pada-balita

Detail firmware ada di IOT_INTEGRATION.md.

## Camera

Camera flow:

1. request camera permission;
2. capture frame;
3. resize/compress;
4. kirim ke `POST /api/visual-analysis`;
5. server menghitung konteks WHO dari age/sex/height;
6. Gemini menilai kualitas foto, visibilitas area wajah, serta ciri visual netral seperti kelopak mata, raut yang tampak, dan bibir;
7. hasil visual terstruktur dimasukkan ke screening completion;
8. foto tangkapan ditampilkan sementara pada layar hasil;
9. setelah pemeriksaan valid, satu foto wajah terbaru disimpan per profil anak untuk Beranda orang tua. Foto baru menimpa referensi foto terbaru sebelumnya dan tidak menjadi bagian dari riwayat examination.

Gemini menerima usia, jenis kelamin, TB, BB, TB/U z-score, dan status WHO sebagai konteks. Gemini tidak boleh menentukan, menghitung ulang, atau mengubah status stunting. UI dapat menampilkan kesimpulan stunting di dekat hasil visual, tetapi sumber kesimpulan tersebut tetap TB/U WHO.

Kegagalan Gemini tidak boleh menggagalkan WHO screening.

## Visual analysis outcomes

Status utama visual:

- `ok`
- `rejected`
- `unavailable`

Field pendukung:

- faceDetected
- singleFace
- eyes
- nose
- mouth
- facePosition
- lighting
- observations[]
- reason
- modelVersion

Tidak ada probability atau prediksi stunting dari wajah pada flow aktif. Hasil stunting di layar tetap bersumber dari TB/U WHO.

## WHO outcome

`src/lib/growth.ts` menghitung Height-for-Age berdasarkan age, sex, dan height. `src/lib/anthropometry.ts` menambahkan Weight-for-Age dan measurement plausibility gate.

Aturan utama:

- stunting: TB/U < -2 SD;
- stunting berat: TB/U < -3 SD;
- TB/U antara -2 SD dan batas atas bukan stunting;
- measurement dengan WHO plausibility flag tidak menghasilkan status pertumbuhan dan harus diulang.

Status pertumbuhan menjadi field utama pada report/examination response.

## Finalization

Session yang selesai harus difinalisasi agar station kembali bebas untuk examination berikutnya.

## Cancellation

Cancellation tersedia untuk session yang tidak perlu diteruskan. Backend harus melepaskan station hanya jika active examination ID cocok agar tidak membatalkan session lain secara tidak sengaja.

## Data privacy

Raw photo tidak menjadi bagian dari persisted examination report. Foto diproses melalui Gemini. Sesuai kebutuhan produk, hanya foto wajah terbaru per child yang disimpan di Cloudinary dan URL/metadata terbarunya disimpan pada profil child untuk Beranda orang tua. Foto tidak dimasukkan ke laporan teks atau riwayat examination. Observasi visual terstruktur tetap dipersist pada examination. Field Model A lama tetap dibaca untuk compatibility riwayat lama.
