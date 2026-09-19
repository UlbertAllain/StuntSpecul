param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VenvDir = Join-Path $ProjectRoot ".venv-model-a"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$Requirements = Join-Path $ProjectRoot "requirements.txt"
$LocalServer = Join-Path $ProjectRoot "scripts\model-a-local.py"

Set-Location $ProjectRoot

function Resolve-Python {
    $Candidates = @(
        @("py", "-3.12"),
        @("py", "-3.11"),
        @("py", "-3.10"),
        @("python", "")
    )

    foreach ($Candidate in $Candidates) {
        $Command = $Candidate[0]
        $VersionArg = $Candidate[1]

        try {
            if ($VersionArg) {
                & $Command $VersionArg -c "import sys; print(sys.executable)" *> $null
            } else {
                & $Command -c "import sys; print(sys.executable)" *> $null
            }

            if ($LASTEXITCODE -eq 0) {
                return $Candidate
            }
        } catch {
        }
    }

    throw "Python 3.10+ tidak ditemukan."
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "[1/4] Menyiapkan Python environment..."
    $Python = Resolve-Python

    if ($Python[1]) {
        & $Python[0] $Python[1] -m venv $VenvDir
    } else {
        & $Python[0] -m venv $VenvDir
    }
}

if (-not $SkipInstall) {
    Write-Host "[2/4] Memastikan dependency Model A..."
    & $VenvPython -m pip install --disable-pip-version-check -r $Requirements

    if ($LASTEXITCODE -ne 0) {
        throw "Dependency Model A gagal dipasang."
    }
} else {
    Write-Host "[2/4] Dependency install dilewati."
}

Write-Host "[3/4] Menjalankan Model A lokal..."
$ModelProcess = Start-Process -FilePath $VenvPython -ArgumentList @($LocalServer) -WorkingDirectory $ProjectRoot -PassThru -NoNewWindow

Start-Sleep -Seconds 2

try {
    $Health = Invoke-RestMethod "http://127.0.0.1:8787"

    if (-not $Health.ready) {
        Write-Host "Model A belum siap:"
        $Health | Format-List
        throw "Model A local runtime belum ready."
    }

    Write-Host "Model A READY"
    $Health | Format-List

    Write-Host "[4/4] Menjalankan Next.js..."
    Write-Host "Website : http://localhost:3000"
    Write-Host "Model A : http://127.0.0.1:8787"

    $env:NEXT_PUBLIC_MODEL_A_ENDPOINT = "http://127.0.0.1:8787"

    npm run dev
} finally {
    if ($ModelProcess -and -not $ModelProcess.HasExited) {
        Stop-Process -Id $ModelProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
