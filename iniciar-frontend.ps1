param([ValidateRange(1024,65535)][int]$Puerto = 4200, [ValidateRange(1024,65535)][int]$PuertoApi = 8085)
$ErrorActionPreference = 'Stop'
$rebolsysWork = Join-Path $PSScriptRoot '.work'
New-Item -ItemType Directory -Path (Join-Path $rebolsysWork 'tmp') -Force | Out-Null
$env:TEMP = Join-Path $rebolsysWork 'tmp'
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $rebolsysWork 'npm-cache'
$rebolsysProxy = Join-Path $rebolsysWork 'proxy-frontend.json'
@{ '/api' = @{ target = "http://127.0.0.1:$PuertoApi"; secure = $false } } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $rebolsysProxy -Encoding utf8
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        & npm ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    & npm start -- --host 127.0.0.1 --port $Puerto --proxy-config $rebolsysProxy
    $rebolsysExit = $LASTEXITCODE
} finally { Pop-Location }
exit $rebolsysExit
