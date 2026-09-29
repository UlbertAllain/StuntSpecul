# Visual Analysis

Analisis visual StuntSpecula menggunakan Gemini sebagai **pendukung kualitas foto dan ciri visual yang tampak pada wajah**. Gemini **tidak menentukan status stunting** dan tidak menghasilkan probabilitas stunting. Kesimpulan stunting yang ditampilkan di bawah bagian visual tetap berasal dari TB/U WHO.

## Decision boundary

Hasil utama tetap:

```text
umur + jenis kelamin + tinggi sensor
→ WHO Height-for-Age (TB/U)
→ z-score
→ growthStatus
```

Gemini menerima foto wajah beserta konteks pemeriksaan yang sudah diketahui:

- usia bulan;
- jenis kelamin;
- tinggi badan sensor;
- berat badan sensor;
- TB/U z-score WHO;
- status WHO.

Konteks WHO hanya dipakai agar laporan tetap konsisten. Gemini tidak boleh menghitung ulang, mengganti, atau menyimpulkan status stunting dari wajah.

## Active pipeline

```text
camera frame
→ resize/compress browser
→ POST /api/visual-analysis
→ Gemini multimodal
→ structured visual observation
→ persisted with examination
```

Output yang disimpan:

- status: ok | rejected | unavailable
- faceDetected
- singleFace
- eyes: visible | partial | not_visible | unclear
- nose: visible | partial | not_visible | unclear
- mouth: visible | partial | not_visible | unclear
- facePosition: frontal | slightly_turned | partial | unclear
- lighting: good | low | bright | uneven | unclear
- observations[] — deskripsi netral; bila dapat dinilai mencakup awalan `Kelopak mata:`, `Raut wajah:`, dan `Bibir:`
- reason
- modelVersion

Tidak ada field "stunting probability" pada analisis visual Gemini.

## Prompt safety

Prompt server-side mewajibkan Gemini:

- tidak menilai stunting dari wajah;
- tidak memberi probabilitas stunting;
- tidak menebak penyakit, kekurangan gizi, etnis, emosi, kecerdasan, atau kondisi medis;
- hanya mendeskripsikan kualitas foto dan area wajah yang terlihat;
- mengembalikan JSON terstruktur.

WHO result dikirim sebagai data konteks, bukan instruksi untuk membuat diagnosis visual.

## Failure behavior

Jika Gemini timeout, quota habis, konfigurasi salah, atau foto tidak dapat dianalisis:

- WHO screening tetap dapat diselesaikan;
- visualAnalysis menjadi unavailable/rejected;
- user tetap melihat hasil antropometri utama;
- kegagalan AI tidak boleh memblokir pemeriksaan.

## Privacy

Raw photo:

- diambil dari kamera browser;
- dikirim sementara ke endpoint server-side visual analysis;
- diteruskan ke Gemini untuk analisis;
- ditampilkan sementara pada layar hasil melalui object URL browser;
- tidak disimpan sebagai field examination di Firestore;
- tidak dimasukkan ke laporan teks.

Yang dipersist hanya hasil observasi terstruktur.

## API

Browser menggunakan:

```text
POST /api/visual-analysis
Content-Type: image/jpeg
X-Age-Months: 39
X-Sex: male
X-Height-Cm: 93.5
X-Weight-Kg: 18.9
```

Endpoint memakai `GEMINI_API_KEY` dan `GEMINI_MODEL` dari server environment. Credential Gemini tidak pernah dikirim ke browser.

## Model A legacy

Model A V2.1 tidak lagi menjadi jalur aktif pemeriksaan. File/runtime lama tetap dapat dipertahankan sementara untuk rollback atau audit, tetapi UI kamera baru memakai Gemini visual analysis.

Lihat `MODEL_A.md` untuk catatan legacy.


## Admin face test

Selama sensor tinggi/berat masih dikalibrasi, admin dapat memakai menu **Pengujian wajah**.

Flow:

    Admin
    -> isi usia, jenis kelamin, tinggi manual, berat manual
    -> mulai kamera
    -> ambil foto
    -> endpoint visual analysis yang sama
    -> Gemini
    -> preview analisis visual + TB/U WHO

Batasan:

- tidak membuat examination;
- tidak menyimpan data ke riwayat orang tua;
- tidak membutuhkan ESP32;
- foto hanya hidup sementara pada browser selama hasil pengujian ditampilkan;
- nilai tinggi/berat manual hanya konteks test dan bukan pengukuran sensor.
