# Model A runtime assets

This folder contains only Model A runtime binaries:

- `face_detection_yunet_2023mar.onnx`
- `mobilenetv3_stunting_v2.onnx`
- `mobilenetv3_stunting_v2.onnx.data`

Install them with:

```powershell
.\scripts\model-a\install.ps1 -ArtifactZip ".\stuntspecula_model_a_v2_artifacts.zip"
```

The classifier uses external ONNX weights, so the `.onnx.data` file must stay next to the classifier `.onnx`.

See [docs/MODEL_A.md](../docs/MODEL_A.md) for runtime and verification instructions.
