# Model A V2.1

Model A adalah analisis wajah pendukung, bukan penentu status stunting. WHO TB/U tetap menjadi sumber hasil pertumbuhan utama.

## Pipeline

    JPEG camera
    → decode
    → YuNet face detection
    → face quality gate
    → inner-face crop
    → grayscale/preprocessing
    → MobileNetV3-Small ONNX
    → sigmoid probability
    → threshold
    → supporting indication

Classifier threshold saat ini: 0.40.

## Runtime assets

    models/
    ├─ face_detection_yunet_2023mar.onnx
    ├─ mobilenetv3_stunting_v2.onnx
    └─ mobilenetv3_stunting_v2.onnx.data

## Dependency

- numpy == 2.1.3
- opencv-python-headless == 4.10.0.84
- onnxruntime == 1.20.1

## Local development

Install artifact bila diperlukan:

    .\scripts\model-a\install.ps1 -ArtifactZip ".\stuntspecula_model_a_v2_artifacts.zip"

Run:

    npm run dev

Launcher menjalankan Model A lokal di 127.0.0.1:8787 dan Next.js.

## Production

Endpoints:

    GET  /api/model-a-screening
    POST /api/model-a-screening

GET health check melakukan file check, dependency import, YuNet load, ONNX load, dan dummy inference/warmup. Karena itu ready true berarti runtime berhasil diload.

## Failure behavior

Jika Model A gagal, facialStatus menjadi unavailable dan screening antropometri tetap harus dapat diselesaikan.

## Data persisted

Hanya supporting result:

- facialStatus
- facialProbability
- facialReason
- facialModelVersion

Raw screening photo tidak disimpan pada examination.

## Validation limitation

Model A V2.1 masih harus diperlakukan sebagai model eksperimental/supporting. Internal accuracy tidak sama dengan validitas klinis atau generalisasi real-world.

Known risks:

- weak-label public dataset;
- source/domain bias;
- device/lighting shift;
- demographic distribution shift.

Jangan menulis copy yang menyatakan Model A mendiagnosis stunting.

## External validation

Validasi yang benar membutuhkan subjek independen dengan age, sex, measured height, WHO Height-for-Age ground truth, serta foto dari kondisi capture yang bervariasi.

Split harus subject-wise, bukan image-wise.
