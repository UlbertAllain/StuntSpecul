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

Fallback measurement generator hanya digunakan ketika hardware belum aktif dan tetap harus dianggap development/demo fallback, bukan pengganti sensor production.

Detail firmware ada di IOT_INTEGRATION.md.

## Camera

Camera flow:

1. request camera permission;
2. capture frame;
3. resize/compress;
4. kirim ke Model A;
5. hasil Model A dimasukkan ke screening completion.

Kegagalan Model A tidak boleh menggagalkan WHO screening.

## Model A outcomes

- `stunting_indication`
- `non_stunting_indication`
- `rejected`
- `unavailable`

Model A adalah pendukung, bukan diagnosis.

## WHO outcome

`src/lib/growth.ts` menghitung Height-for-Age berdasarkan age, sex, dan height.

Status pertumbuhan menjadi field utama pada report/examination.

## Finalization

Session yang selesai harus difinalisasi agar station kembali bebas untuk examination berikutnya.

## Cancellation

Cancellation tersedia untuk session yang tidak perlu diteruskan. Backend harus melepaskan station hanya jika active examination ID cocok agar tidak membatalkan session lain secara tidak sengaja.

## Data privacy

Raw photo tidak menjadi bagian dari persisted examination report. Field persisted hanya status/probability/reason/model version hasil Model A.
