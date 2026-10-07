<#
.SYNOPSIS
  백엔드 전체 검증: restore, 형식 검사, build, 테스트. 첫 실패에서 멈춘다.
.DESCRIPTION
  SQL Server가 필요한 테스트(Category=SqlIntegration)는 MES_TEST_CONNECTION_STRING이 명시적으로 주어질 때만 실행한다.
  운영 DB를 가리키는 연결 문자열은 거부한다. CI는 연결 문자열 없이 실행하며 SQL 통합 테스트는 "실행하지 않음"으로 보고한다.
#>
param(
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Invoke-Step {
    param([string]$Name, [scriptblock]$Command)
    Write-Host "==> $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

$connection = $env:MES_TEST_CONNECTION_STRING
$productionPatterns = @('prod', '.msmes.', '10.0.0.')
if ($connection) {
    foreach ($pattern in $productionPatterns) {
        if ($connection.IndexOf($pattern, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            throw "MES_TEST_CONNECTION_STRING contains the production pattern '$pattern'. Tests must never connect to a production database."
        }
    }
}

Invoke-Step 'restore' { dotnet restore MesPlatform.sln }
Invoke-Step 'format verification' { dotnet format MesPlatform.sln --verify-no-changes --no-restore }
Invoke-Step "build ($Configuration)" { dotnet build MesPlatform.sln -c $Configuration --no-restore }

if ($connection) {
    Invoke-Step "test ($Configuration, including SQL integration)" {
        dotnet test MesPlatform.sln -c $Configuration --no-build
    }
}
else {
    Invoke-Step "test ($Configuration)" {
        dotnet test MesPlatform.sln -c $Configuration --no-build --filter 'Category!=SqlIntegration'
    }
    Write-Host 'SQL integration tests were NOT run (MES_TEST_CONNECTION_STRING is not set).'
}

Write-Host 'Verification passed.'
