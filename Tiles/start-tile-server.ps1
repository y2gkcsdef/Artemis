$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NginxPrefix = Join-Path $env:TEMP "artemis-tiles-nginx"
$PidFile = Join-Path $NginxPrefix "nginx.pid"
$ConfigFile = Join-Path $NginxPrefix "nginx.conf"
$TemplateFile = Join-Path $ScriptDir "nginx.conf.template"
$NginxPrefixPath = $NginxPrefix -replace "\\", "/"
$ConfigPath = $ConfigFile -replace "\\", "/"

New-Item -ItemType Directory -Force -Path (Join-Path $NginxPrefix "logs") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $NginxPrefix "client_body_temp") | Out-Null

$TilesRoot = (Resolve-Path $ScriptDir).Path -replace "\\", "/"
(Get-Content $TemplateFile -Raw).Replace("__TILES_ROOT__", $TilesRoot) |
  Set-Content -NoNewline -Encoding ascii $ConfigFile

if (Test-Path $PidFile) {
  nginx -s quit -c $ConfigPath -p $NginxPrefixPath

  for ($i = 0; $i -lt 25; $i++) {
    if (-not (Test-Path $PidFile)) {
      break
    }

    Start-Sleep -Milliseconds 100
  }
}

nginx -c $ConfigPath -p $NginxPrefixPath
