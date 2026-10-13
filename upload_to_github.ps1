[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   DoseWise Academy - أداة الرفع التلقائي إلى GitHub" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Git
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "[خطأ] برنامج Git غير مثبت على جهازك!" -ForegroundColor Red
    Write-Host "يرجى تثبيت Git من الرابط: https://git-scm.com" -ForegroundColor Yellow
    Read-Host "اضغط Enter للخروج..."
    exit
}

# 2. Git Init
if (-not (Test-Path ".git")) {
    Write-Host "[*] تهيئة مستودع Git محلي..." -ForegroundColor Green
    git init
    git branch -M main
}

# 3. Add and commit files
Write-Host "[*] تجهيز ملفات المشروع..." -ForegroundColor Green
git add .
$status = git status --porcelain
if ($status) {
    git commit -m "DoseWise Academy Production Deployment"
} else {
    Write-Host "[*] كافة ملفات المشروع محفوظة وجاهزة للرفع." -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "يرجى نسخ ولصق رابط المستودع الجديد من حسابك على GitHub:" -ForegroundColor White
Write-Host "مثال: https://github.com/YourUsername/dosewise-academy.git" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$repoUrl = Read-Host "الصق رابط المستودع هنا واضغط Enter"
$repoUrl = $repoUrl.Trim()

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "[خطأ] لم يتم إدخال أي رابط!" -ForegroundColor Red
    Read-Host "اضغط Enter للخروج..."
    exit
}

# 4. Set remote and push
git remote remove origin 2>$null
git remote add origin $repoUrl

Write-Host ""
Write-Host "[*] جاري رفع الملفات إلى GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " [نجاح!] تم رفع المشروع بالكامل إلى GitHub بنجاح!       " -ForegroundColor Green
    Write-Host " يمكنك الآن الذهاب إلى Render.com وربطه بضغطة زر واحدة  " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[تنبيه] إذا طلب منك GitHub تسجيل الدخول، يرجى إدخال اسم المستخدم و Personal Access Token." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "اضغط Enter لإغلاق النافذة..."
