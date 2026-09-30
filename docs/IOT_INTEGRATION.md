# IoT Integration

Dokumen ini adalah contract firmware ESP32 untuk StuntSpecula.

## Base URL

Production:

    https://stuntspecula.vercel.app

Semua endpoint IoT berada di:

    /api/iot/*

## Authentication

Setiap request ESP32 wajib mengirim:

    Authorization: Bearer <IOT_API_KEY>

Key yang sama disimpan di Vercel sebagai:

    IOT_API_KEY=<random-secret>

Generate 32-byte key dari PowerShell:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Jangan commit key production ke repository firmware publik.

## Endpoint

### GET /api/iot/session

Dipanggil ESP32 secara berkala untuk mengecek apakah parent sudah memulai pemeriksaan. Request ini juga memperbarui lastSeen perangkat.

Contoh response tanpa sesi:

    {
      "success": true,
      "data": {
        "active": null,
        "serverTime": 1789999999999
      }
    }

Contoh response dengan sesi:

    {
      "success": true,
      "data": {
        "active": {
          "examinationId": "uuid",
          "status": "queued",
          "ageMonths": 39,
          "sex": "male",
          "cameraEnabled": true,
          "heightCm": null,
          "weightKg": null
        },
        "serverTime": 1789999999999
      }
    }

Recommended polling interval firmware: 2 detik ketika alat idle. Web station memakai interval lebih rapat agar sesi baru dan measurement yang sudah tersimpan lebih cepat terlihat di layar.

### POST /api/iot/session/claim

Menandai examination aktif menjadi running.

Body:

    {}

Response:

    {
      "success": true,
      "data": {
        "examinationId": "uuid",
        "status": "running",
        "ageMonths": 39,
        "sex": "male",
        "cameraEnabled": true
      }
    }

Claim bersifat idempotent untuk examination yang sudah running.

### POST /api/iot/measurements

Mengirim hasil sensor. Tinggi dan berat boleh dikirim bersamaan atau terpisah.

Tinggi:

    {
      "heightCm": 93.5
    }

Berat:

    {
      "weightKg": 18.9
    }

Atau keduanya:

    {
      "heightCm": 93.5,
      "weightKg": 18.9
    }

Validation:

- heightCm: 30–200 cm
- weightKg: 1–100 kg
- minimal satu field harus ada
- examination harus berstatus running

Data IoT yang sudah tersimpan diprioritaskan backend ketika web alat menyelesaikan pemeriksaan. Tidak ada lagi generator TB/BB dummy pada flow aktif.

Response sukses measurement:

    {
      "success": true,
      "data": {
        "saved": true,
        "ack": "measurement_saved",
        "examinationId": "uuid",
        "accepted": {
          "heightCm": true,
          "weightKg": true
        },
        "heightCm": 93.5,
        "weightKg": 18.9,
        "source": "iot",
        "measurementUpdatedAt": 1790524800000,
        "serverTime": 1790524800000
      }
    }

Firmware boleh menganggap measurement berhasil diterima backend hanya jika HTTP status 200 dan `data.saved === true` / `data.ack === "measurement_saved"`.

### POST /api/iot/heartbeat

Mengirim kondisi perangkat.

Body contoh:

    {
      "firmwareVersion": "1.0.0",
      "heightSensor": "ok",
      "weightSensor": "ok"
    }

Nilai sensor:

    ok
    error
    unknown

Recommended interval: 5–10 detik.

GET /api/iot/session juga memperbarui lastSeen, jadi heartbeat khusus terutama dipakai untuk mengirim status sensor dan firmware.

### POST /api/iot/session/cancel

Membatalkan examination aktif yang masih queued/running.

Body:

    {}

Gunakan hanya ketika firmware benar-benar perlu membatalkan sesi. Normal completion tetap dilakukan web alat setelah kamera/Model A selesai.

## Firmware flow

    WiFi connect
    ↓
    GET /api/iot/session
    ↓
    active == null
      └─ tunggu 2 detik → poll lagi

    active != null
    ↓
    POST /api/iot/session/claim
    ↓
    ukur tinggi
    ↓
    POST /api/iot/measurements
    { heightCm }
    ↓
    ukur berat
    ↓
    POST /api/iot/measurements
    { weightKg }
    ↓
    tetap kirim heartbeat/session polling
    ↓
    web /alat menangani kamera
    ↓
    Gemini menganalisis kualitas/visibilitas wajah sebagai pendukung
    ↓
    backend menggabungkan hasil sensor + observasi visual
    ↓
    WHO TB/U dihitung dari tinggi, umur, dan jenis kelamin
    ↓
    WHO tetap menentukan hasil stunting utama

## ESP32 example

Simpan secret di file yang tidak di-commit, misalnya secrets.h:

    #pragma once
    #define WIFI_SSID "..."
    #define WIFI_PASSWORD "..."
    #define IOT_API_KEY "..."

Contoh helper HTTP:

    #include <HTTPClient.h>
    #include <WiFiClientSecure.h>
    #include "secrets.h"

    const char* BASE_URL = "https://stuntspecula.vercel.app";

    int postJson(const String& path, const String& json) {
      WiFiClientSecure client;
      client.setInsecure(); // prototype only; pin CA certificate for production

      HTTPClient http;
      http.begin(client, String(BASE_URL) + path);
      http.addHeader("Content-Type", "application/json");
      http.addHeader(
        "Authorization",
        String("Bearer ") + IOT_API_KEY
      );

      int status = http.POST(json);
      http.end();
      return status;
    }

Contoh kirim measurement:

    int status = postJson(
      "/api/iot/measurements",
      "{\"heightCm\":93.5,\"weightKg\":18.9}"
    );

    if (status == 200) {
      Serial.println("Measurement diterima server");
    } else {
      Serial.printf("Measurement gagal, HTTP %d\\n", status);
    }

Untuk production, firmware sebaiknya juga membaca JSON response dan memastikan `saved=true` atau `ack=measurement_saved`, bukan hanya HTTP 200.

Catatan: client.setInsecure() hanya sesuai prototype. Firmware production sebaiknya memverifikasi sertifikat TLS/CA.

## Cara memastikan data sensor benar-benar sampai

Gunakan tiga lapis pengecekan:

1. **ESP32 Serial Monitor** — pastikan POST mendapat HTTP 200 dan JSON response memiliki `saved=true` / `ack=measurement_saved`.
2. **GET /api/iot/session** — response sesi aktif menampilkan `heightCm`, `weightKg`, `measurementUpdatedAt`, dan `measurementSource`.
3. **Admin → Monitoring alat** — tampil status koneksi/sensor, firmware, nilai tinggi/berat terakhir, dan waktu measurement terakhir. Halaman `/alat` hanya menampilkan instruksi ramah anak, bukan informasi debugging.

Dengan begitu keberhasilan tidak dinilai dari angka yang muncul di sensor saja; harus ada acknowledgement dari server. Informasi teknis dipusatkan di halaman admin.

## Measurement plausibility

Backend memvalidasi kombinasi usia, jenis kelamin, tinggi, dan berat sebelum menerima hasil sebagai measurement valid.

Jika TB/U atau BB/U melewati WHO plausibility flag, endpoint `POST /api/iot/measurements` mengembalikan HTTP 422 dengan code:

    measurement_recheck_required

Nilai ekstrem tersebut tidak disimpan sebagai tinggi/berat terbaru. Backend hanya menyimpan `measurementIssue` agar halaman `/alat` dan Monitoring Admin dapat menampilkan pesan **pengukuran perlu diulang**. Setelah ESP32 mengirim hasil valid berikutnya, issue dibersihkan otomatis.

## HTTP status penting

- 200: request berhasil
- 401 iot_unauthorized: key salah/tidak ada
- 409: state examination tidak sesuai atau terjadi conflict
- 413: body terlalu besar
- 415: Content-Type bukan application/json
- 422: payload sensor tidak valid
- 503 iot_not_configured: IOT_API_KEY belum ada di server

## Retry

Untuk network timeout/5xx:

- retry dengan backoff;
- jangan mengubah measurement sebelum retry;
- aman mengirim measurement terbaru kembali.

Untuk 409, ambil ulang GET /api/iot/session sebelum menentukan aksi berikutnya.

## Responsibility boundary

ESP32:

- tinggi
- berat
- heartbeat/status sensor

Web alat:

- UI pemeriksaan
- kamera
- menampilkan status sensor/measurement yang sudah diterima

Backend:

- session coordination
- validation
- persistence
- ACK measurement
- menggabungkan sensor + observasi visual Gemini
- WHO TB/U

ESP32 tidak perlu menghitung WHO dan tidak perlu menjalankan AI wajah.
