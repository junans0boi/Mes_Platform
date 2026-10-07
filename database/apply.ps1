# database/apply.ps1 — 로컬·테스트 DB에 마이그레이션을 순서대로 적용한다.
# 사용: $env:MES_DB_CONNECTION="Server=...;Database=...;..."; .\database\apply.ps1

param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$conn = $env:MES_DB_CONNECTION
if (-not $conn) {
    Write-Error "MES_DB_CONNECTION 환경 변수가 없습니다."
    exit 1
}

$prodPatterns = @('prod', '.msmes.', '10.0.0.')
foreach ($pat in $prodPatterns) {
    if ($conn -match [regex]::Escape($pat)) {
        Write-Error "연결 문자열에 운영 DB 패턴('$pat')이 포함되어 있습니다. 운영 DB에 자동 적용을 허용하지 않습니다."
        exit 2
    }
}

$migrationsDir = Join-Path $PSScriptRoot 'migrations'
Get-ChildItem -Path $migrationsDir -Filter '[0-9]*.sql' | Sort-Object Name | ForEach-Object {
    Write-Host "Applying: $($_.Name)"
    sqlcmd -C -b -S ($conn -replace '.*Server=([^;]+).*', '$1') `
           -d ($conn -replace '.*Database=([^;]+).*', '$1') `
           -i $_.FullName
}
Write-Host "Done."
