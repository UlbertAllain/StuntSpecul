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

Setelah TB/U WHO dihitung, backend membuat snapshot rekomendasi edukasi berdasarkan growthStatus dan tren TB/U dibanding examination completed sebelumnya untuk anak yang sama:

- recommendations.nutrition
- recommendations.nextSteps
- recommendations.version
- recommendations.trend
- recommendations.trendDelta
- recommendations.currentHeightForAgeZ
- recommendations.previousHeightForAgeZ

Snapshot disimpan bersama examination supaya riwayat lama tidak berubah ketika aturan rekomendasi versi berikutnya diperbarui. Jika belum ada pemeriksaan sebelumnya, rekomendasi memakai status WHO saat ini tanpa perbandingan tren. Examination legacy yang belum memiliki snapshot tetap mendapatkan fallback rekomendasi saat dibaca.

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
8. foto tangkapan ditampilkan sementara pada layar hasil, tetapi tidak dipersist.

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

`src/lib/growth.ts` menghitung Height-for-Age berdasarkan age, sex, dan height.

Status pertumbuhan menjadi field utama pada report/examination.

## Finalization

Session yang selesai harus difinalisasi agar station kembali bebas untuk examination berikutnya.

## Cancellation

Cancellation tersedia untuk session yang tidak perlu diteruskan. Backend harus melepaskan station hanya jika active examination ID cocok agar tidak membatalkan session lain secara tidak sengaja.

## Data privacy

Raw photo tidak menjadi bagian dari persisted examination report. Foto diproses sementara melalui Gemini dan tidak disimpan di Firestore. Yang dipersist hanya observasi visual terstruktur. Field Model A lama tetap dibaca untuk compatibility riwayat lama.
