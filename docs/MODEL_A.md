# Model A V2.1

Model A adalah analisis wajah pendukung. Hasilnya tidak menentukan atau mengganti status stunting WHO.

## Pipeline

```text
foto kamera
→ YuNet face detection
→ quality gate
→ inner-face preprocessing
→ MobileNetV3-Small ONNX
→ indikator wajah pendukung
```

Threshold classifier: `0.40`.

## Runtime assets

```text
models/
├─ face_detection_yunet_2023mar.onnx
├─ mobilenetv3_stunting_v2.onnx
└─ mobilenetv3_stunting_v2.onnx.data
```

Install dari artifact:

```powershell
.\scripts\model-a\install.ps1 -ArtifactZip ".\stuntspecula_model_a_v2_artifacts.zip"
```

## Dependency files

- `pyproject.toml` mendeskripsikan runtime Python untuk deployment.
- `requirements.txt` mem-pin dependency yang dipakai launcher lokal agar reproduktif.

## Local development

Gunakan launcher:

```powershell
.\scripts\model-a\dev.ps1
```

Launcher menyiapkan virtualenv `.venv-model-a`, menjalankan Model A pada `127.0.0.1:8787`, mengatur `NEXT_PUBLIC_MODEL_A_ENDPOINT`, lalu menjalankan Next.js.

Setelah dependency sudah ada:

```powershell
.\scripts\model-a\dev.ps1 -SkipInstall
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8787 | Format-List
```

Target:

```text
ready             : True
filesReady        : True
dependenciesReady : True
```

## Production

Vercel menggunakan `api/model-a-screening.py`. Browser default memanggil `/api/model-a-screening`; override `NEXT_PUBLIC_MODEL_A_ENDPOINT` hanya dipakai launcher lokal.

Foto diproses in-memory dan tidak disimpan sebagai bagian laporan. Field hasil yang disimpan:

- `facial_status`
- `facial_probability`
- `facial_reason`
- `facial_model_version`

Jika Model A tidak tersedia, pemeriksaan antropometri tetap harus selesai. WHO TB/U tetap menjadi hasil utama.
