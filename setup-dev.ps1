# setup-dev.ps1 — run this ONCE (double-click → "Run with PowerShell").
#
# It excludes this project from Windows Defender real-time scanning. Defender
# scanning the Next.js build cache (.next) was corrupting it (random 404s) and
# making compiles extremely slow (heavy report pages took ~60s). After this
# exclusion, dev compiles are fast and the cache stays healthy.

$proj = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

# Re-launch elevated (UAC prompt) if not already running as Administrator.
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "Requesting administrator rights..." -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

try {
  Add-MpPreference -ExclusionPath $proj -ErrorAction Stop
  Write-Host ""
  Write-Host "  Added Windows Defender exclusion for:" -ForegroundColor Green
  Write-Host "    $proj" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Dev compiles will now be fast and the .next cache won't corrupt." -ForegroundColor Green
} catch {
  Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Read-Host "`nPress Enter to close"
