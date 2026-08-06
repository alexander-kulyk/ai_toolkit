param(
  [ValidateSet("Global", "Project")]
  [string]$Scope = "Global",

  [ValidateSet("Claude", "Codex", "Both")]
  [string]$Agent = "Both",

  [string]$ProjectRoot = (Get-Location).Path,

  [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillRoot = Resolve-Path (Join-Path $ScriptDir "..")

function Install-SkillCopy([string]$Destination) {
  $Parent = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force -Path $Parent | Out-Null
  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -Recurse -Force -LiteralPath $Destination
  }
  Copy-Item -Recurse -Force -LiteralPath $SkillRoot -Destination $Destination
  Write-Host "Installed: $Destination"
}

function Test-SkillDestination([string]$Destination) {
  if ((Test-Path -LiteralPath $Destination) -and -not $Force) {
    throw "Refusing to replace existing skill: $Destination. Re-run with -Force only if overwriting local changes is intentional."
  }
}

if ($Scope -eq "Global") {
  $ClaudeDest = Join-Path $HOME ".claude\skills\nodejs-backend-engineer"
  $CodexDest = Join-Path $HOME ".agents\skills\nodejs-backend-engineer"
} else {
  $ResolvedProject = (Resolve-Path $ProjectRoot).Path
  $ClaudeDest = Join-Path $ResolvedProject ".claude\skills\nodejs-backend-engineer"
  $CodexDest = Join-Path $ResolvedProject ".agents\skills\nodejs-backend-engineer"
}

$Destinations = switch ($Agent) {
  "Claude" { @($ClaudeDest) }
  "Codex" { @($CodexDest) }
  "Both" { @($ClaudeDest, $CodexDest) }
}

foreach ($Destination in $Destinations) {
  Test-SkillDestination $Destination
}

foreach ($Destination in $Destinations) {
  Install-SkillCopy $Destination
}

Write-Host "Done. Restart the agent only if it does not detect the new skill automatically."
