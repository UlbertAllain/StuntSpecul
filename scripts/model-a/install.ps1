param(
    [string]$ArtifactZip = ".\stuntspecula_model_a_v2_artifacts.zip"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ModelDir = Join-Path $ProjectRoot "models"
$TempDir = Join-Path $env:TEMP ("stuntspecula-model-a-" + [guid]::NewGuid().ToString("N"))

function Test-YuNetFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $false
    }

    $Item = Get-Item $Path
    if ($Item.Length -lt 100000) {
        return $false
    }

    # GitHub LFS pointer files are tiny text files and are not valid ONNX models.
    $HeaderBytes = [System.IO.File]::ReadAllBytes($Path)
    $HeaderLength = [Math]::Min(160, $HeaderBytes.Length)
    $Header = [System.Text.Encoding]::UTF8.GetString($HeaderBytes, 0, $HeaderLength)

    return -not $Header.Contains("git-lfs.github.com/spec")
}

function Download-YuNet {
    param([string]$Destination)

    $Urls = @(
        "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "https://github.com/ShiqiYu/libfacedetection.train/raw/a61a428929148171b488f024b5d6774f93cdbc13/tasks/task1/onnx/yunet.onnx"
    )

    foreach ($Url in $Urls) {
        try {
            Write-Host "  mencoba: $Url"
            Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing

            if (Test-YuNetFile $Destination) {
                return
            }

            Remove-Item $Destination -Force -ErrorAction SilentlyContinue
        } catch {
            Remove-Item $Destination -Force -ErrorAction SilentlyContinue
            Write-Host "  gagal, mencoba sumber berikutnya..."
        }
    }

    throw "YuNet gagal diunduh dari seluruh sumber resmi/fallback."
}

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
    $YuNetPath = Join-Path $ModelDir "face_detection_yunet_2023mar.onnx"

    if (-not (Test-YuNetFile $YuNetPath)) {
        Remove-Item $YuNetPath -Force -ErrorAction SilentlyContinue
        Download-YuNet $YuNetPath
    } else {
        Write-Host "  YuNet valid sudah ada, skip download."
    }

    Write-Host "[4/4] Verification..."
    $Required = @(
        (Join-Path $ModelDir "mobilenetv3_stunting_v2.onnx"),
        (Join-Path $ModelDir "mobilenetv3_stunting_v2.onnx.data"),
        $YuNetPath
    )

    foreach ($File in $Required) {
        if (-not (Test-Path $File)) {
            throw "Runtime asset hilang: $File"
        }
    }

    if (-not (Test-YuNetFile $YuNetPath)) {
        throw "File YuNet masih tidak valid."
    }

    Get-ChildItem $ModelDir |
        Where-Object { $_.Name -match "\.(onnx|data)$" } |
        Select-Object Name, Length |
        Format-Table -AutoSize

    Write-Host ""
    Write-Host "Model A V2.1 siap di folder models/."
    Write-Host "Next:"
    Write-Host "  npm run build"
    Write-Host "  git add models"
    Write-Host "  git commit -m 'chore: add Model A V2.1 runtime assets'"
    Write-Host "  git push origin model-a-v2-1-integration"
} finally {
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
}
