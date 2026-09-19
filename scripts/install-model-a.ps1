param(
    [string]$ArtifactZip = ".\stuntspecula_model_a_v2_artifacts.zip"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ModelDir = Join-Path $ProjectRoot "models"
$TempDir = Join-Path $env:TEMP ("stuntspecula-model-a-" + [guid]::NewGuid().ToString("N"))

if (-not (Test-Path $ArtifactZip)) {
    throw "Artifact tidak ditemukan: $ArtifactZip"
}

New-Item -ItemType Directory -Force -Path $ModelDir | Out-Null
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

try {
    Write-Host "[1/4] Extract Model A V2 artifact..."
    Expand-Archive -Path $ArtifactZip -DestinationPath $TempDir -Force

    $Onnx = Join-Path $TempDir "mobilenetv3_stunting_v2.onnx"
    $OnnxData = Join-Path $TempDir "mobilenetv3_stunting_v2.onnx.data"

    if (-not (Test-Path $Onnx)) {
        throw "mobilenetv3_stunting_v2.onnx tidak ditemukan di artifact."
    }

    if (-not (Test-Path $OnnxData)) {
        throw "mobilenetv3_stunting_v2.onnx.data tidak ditemukan di artifact."
    }

    Write-Host "[2/4] Copy classifier..."
    Copy-Item $Onnx (Join-Path $ModelDir "mobilenetv3_stunting_v2.onnx") -Force
    Copy-Item $OnnxData (Join-Path $ModelDir "mobilenetv3_stunting_v2.onnx.data") -Force

    Write-Host "[3/4] Download YuNet..."
    $YuNetUrl = "https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
    $YuNetPath = Join-Path $ModelDir "face_detection_yunet_2023mar.onnx"
    Invoke-WebRequest -Uri $YuNetUrl -OutFile $YuNetPath

    if ((Get-Item $YuNetPath).Length -lt 100000) {
        throw "File YuNet tidak valid atau download terpotong."
    }

    Write-Host "[4/4] Verification..."
    Get-ChildItem $ModelDir | Select-Object Name, Length | Format-Table -AutoSize

    Write-Host ""
    Write-Host "Model A V2.1 siap di folder models/."
    Write-Host "Next:"
    Write-Host "  npm run build"
    Write-Host "  git add models pyproject.toml api scripts src db drizzle vercel.json"
    Write-Host "  git commit -m 'feat: integrate Model A V2.1 facial screening'"
} finally {
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
}
