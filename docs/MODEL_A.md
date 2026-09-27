# Model A V2.1 — Legacy

Model A V2.1 adalah pipeline wajah lama StuntSpecula. Sejak migrasi ke Gemini visual analysis, Model A **tidak lagi dipanggil oleh flow screening aktif**.

WHO TB/U tetap menjadi sumber hasil pertumbuhan utama baik pada flow lama maupun baru.

## Status saat ini

Active:

```text
camera
→ /api/visual-analysis
→ Gemini
→ kualitas foto + visibilitas area wajah
```

Legacy:

```text
camera
→ /api/model-a-screening
→ YuNet
→ MobileNetV3-Small ONNX
→ supporting facial indication
```

Model A dipertahankan sementara untuk:

- rollback;
- audit hasil lama;
- compatibility endpoint;
- referensi eksperimen/model validation.

Jangan menambahkan kembali Model A sebagai penentu status stunting tanpa validasi klinis yang memadai.

## Legacy runtime assets

```text
models/
├─ face_detection_yunet_2023mar.onnx
├─ mobilenetv3_stunting_v2.onnx
└─ mobilenetv3_stunting_v2.onnx.data
```

Dependency legacy:

- numpy == 2.1.3
- opencv-python-headless == 4.10.0.84
- onnxruntime == 1.20.1

## Legacy local development

Flow aplikasi normal:

```powershell
npm run dev
```

Jika perlu menjalankan Model A lama:

```powershell
npm run dev:model-a
```

## Legacy production endpoints

```text
GET  /api/model-a-screening
POST /api/model-a-screening
```

Endpoint di atas tidak dipanggil oleh UI screening aktif.

## Historical data

Examination lama dapat memiliki:

- facialStatus
- facialProbability
- facialReason
- facialModelVersion

UI tetap membaca field tersebut sebagai fallback untuk riwayat lama yang belum memiliki `visualAnalysis`.

Examination baru memakai `visualAnalysis` Gemini dan tidak menghasilkan probabilitas stunting dari wajah.

## Validation limitation

Model A V2.1 tetap dianggap eksperimental/supporting karena memiliki risiko:

- weak-label public dataset;
- source/domain bias;
- device/lighting shift;
- demographic distribution shift.

Internal accuracy tidak sama dengan validitas klinis atau generalisasi real-world.

Untuk flow baru lihat [Visual Analysis](VISUAL_ANALYSIS.md).
