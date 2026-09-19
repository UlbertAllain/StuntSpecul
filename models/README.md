# Model A V2.1 deployment assets

This directory must contain exactly these runtime assets:

- `face_detection_yunet_2023mar.onnx`
- `mobilenetv3_stunting_v2.onnx`
- `mobilenetv3_stunting_v2.onnx.data`

Use:

```powershell
.\scripts\install-model-a.ps1 -ArtifactZip ".\stuntspecula_model_a_v2_artifacts.zip"
```

The classifier ONNX uses external weights, so the `.onnx.data` file must remain next to the `.onnx` file.

These files are runtime model artifacts, not user uploads.
