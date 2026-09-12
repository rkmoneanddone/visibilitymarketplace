param(
    [switch]$SkipSecrets
)

$ErrorActionPreference = "Stop"

$expectedProject = "visibilitymarketplace"
$expectedBranch = "chatgpt-dev"

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
    }
}

Write-Host "== ViewBid Firebase Deployment ==" -ForegroundColor Cyan

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path ".firebaserc")) {
    throw "Run this script from the ViewBid repository. .firebaserc was not found."
}

$firebaseRc = Get-Content ".firebaserc" -Raw | ConvertFrom-Json
$configuredProject = $firebaseRc.projects.default

if ($configuredProject -ne $expectedProject) {
    throw "Safety stop: expected Firebase project '$expectedProject' but .firebaserc points to '$configuredProject'."
}

$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne $expectedBranch) {
    throw "Safety stop: expected Git branch '$expectedBranch' but current branch is '$currentBranch'."
}

$status = git status --porcelain
if ($status) {
    throw "Safety stop: working tree is not clean. Commit or stash changes before deployment."
}

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    throw "Firebase CLI is not installed or not on PATH."
}

Write-Host "[OK] Repository: ViewBid" -ForegroundColor Green
Write-Host "[OK] Branch: $currentBranch" -ForegroundColor Green
Write-Host "[OK] Firebase project: $configuredProject" -ForegroundColor Green

$functionsEnv = Join-Path $repoRoot "functions\.env.visibilitymarketplace"
@"
DODO_ENVIRONMENT=test_mode
DODO_PRODUCT_ID=pdt_0NnQUn7YwN7JhAgOyPXCr
DODO_API_BASE_URL=
VIEWBID_PUBLIC_URL=https://visibilitymarketplace.web.app
"@ | Set-Content -Path $functionsEnv -Encoding UTF8

Write-Host "[OK] Wrote non-secret Firebase Functions configuration." -ForegroundColor Green
Invoke-CheckedCommand firebase use $expectedProject

if (-not $SkipSecrets) {
    Write-Host "Firebase will now securely prompt for the Dodo API key." -ForegroundColor Yellow
    Invoke-CheckedCommand firebase functions:secrets:set DODO_API_KEY

    Write-Host "Firebase will now securely prompt for the Dodo webhook signing key." -ForegroundColor Yellow
    Invoke-CheckedCommand firebase functions:secrets:set DODO_WEBHOOK_KEY
} else {
    Write-Host "[OK] Reusing existing Firebase secret versions for DODO_API_KEY and DODO_WEBHOOK_KEY." -ForegroundColor Green
}

Write-Host "Building frontend..." -ForegroundColor Cyan
Invoke-CheckedCommand npm run build

Write-Host "Building Firebase Functions..." -ForegroundColor Cyan
Invoke-CheckedCommand npm --prefix functions run build

Write-Host "Deploying ViewBid Hosting, Functions, Firestore rules/indexes and Storage rules..." -ForegroundColor Cyan
Invoke-CheckedCommand firebase deploy --only "hosting,functions,firestore:rules,firestore:indexes,storage"

Write-Host ""
Write-Host "ViewBid Firebase deployment complete." -ForegroundColor Green
Write-Host "Hosting: https://visibilitymarketplace.web.app" -ForegroundColor Green
Write-Host "Dodo review page: https://visibilitymarketplace.web.app/dodo-review.html" -ForegroundColor Green
Write-Host "Webhook: https://asia-south1-visibilitymarketplace.cloudfunctions.net/dodoWebhook" -ForegroundColor Green
