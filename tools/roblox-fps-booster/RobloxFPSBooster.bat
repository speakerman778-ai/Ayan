@echo off
chcp 65001 >nul
title Roblox FPS Booster
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0',[Text.Encoding]::UTF8); $m='#PS_'+'START'; iex $t.Substring($t.IndexOf($m))"
echo.
echo Если окно сразу закрывалось - сфотографируй текст выше и пришли.
pause
exit /b
#PS_START
# Roblox FPS Booster - безопасная оптимизация ПК и настроек Roblox.
# Ничего не внедряет в игру и не трогает её код: только настройки Windows
# и официальный файл ClientAppSettings.json. Всё можно откатить (пункт 7).

$ErrorActionPreference = 'SilentlyContinue'
$Host.UI.RawUI.WindowTitle = 'Roblox FPS Booster'
$BackupDir = Join-Path $env:LOCALAPPDATA 'RobloxFPSBooster'
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Say($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }

function Get-RobloxDirs {
    # Обычный Roblox + Bloxstrap / Fishstrap
    $roots = @(
        (Join-Path $env:LOCALAPPDATA 'Roblox\Versions'),
        (Join-Path ${env:ProgramFiles(x86)} 'Roblox\Versions'),
        (Join-Path $env:LOCALAPPDATA 'Bloxstrap\Versions'),
        (Join-Path $env:LOCALAPPDATA 'Fishstrap\Versions')
    )
    foreach ($r in $roots) {
        if (Test-Path $r) {
            Get-ChildItem $r -Directory | Where-Object {
                Test-Path (Join-Path $_.FullName 'RobloxPlayerBeta.exe')
            }
        }
    }
}

function Set-RobloxFlags {
    param([ValidateSet('low','medium')] [string]$Preset)

    # Только флаги из официального белого списка Roblox (остальные игра игнорирует).
    $flags = [ordered]@{
        'FIntDebugForceMSAASamples'          = 0        # без сглаживания
        'FFlagDebugGraphicsPreferD3D11'      = $true    # стабильный рендер DirectX 11
        'DFFlagDisableDPIScale'              = $true    # без масштабирования на 4K/2K
        'FFlagHandleAltEnterFullscreenManually' = $false # нормальный полный экран по Alt+Enter
        'FIntFRMMinGrassDistance'            = 0
        'FIntFRMMaxGrassDistance'            = 0        # убрать траву
    }
    if ($Preset -eq 'low') {
        $flags['DFFlagTextureQualityOverrideEnabled'] = $true
        $flags['DFIntTextureQualityOverride']         = 0   # низкие текстуры
        $flags['DFIntDebugFRMQualityLevelOverride']   = 1   # минимальная графика
        $flags['FFlagDebugSkyGray']                   = $true
        $flags['DFIntCSGLevelOfDetailSwitchingDistance']    = 0
        $flags['DFIntCSGLevelOfDetailSwitchingDistanceL12'] = 0
        $flags['DFIntCSGLevelOfDetailSwitchingDistanceL23'] = 0
        $flags['DFIntCSGLevelOfDetailSwitchingDistanceL34'] = 0
    }

    $json = $flags | ConvertTo-Json
    $dirs = @(Get-RobloxDirs)
    if ($dirs.Count -eq 0) { Say 'Roblox не найден. Запусти игру хотя бы раз и попробуй снова.' Red; return }

    foreach ($d in $dirs) {
        $cs = Join-Path $d.FullName 'ClientSettings'
        New-Item -ItemType Directory -Force -Path $cs | Out-Null
        $file = Join-Path $cs 'ClientAppSettings.json'
        if ((Test-Path $file) -and -not (Test-Path "$BackupDir\ClientAppSettings.$($d.Name).bak")) {
            Copy-Item $file "$BackupDir\ClientAppSettings.$($d.Name).bak"
        }
        [IO.File]::WriteAllText($file, $json, (New-Object Text.UTF8Encoding $false))
        Say "  OK: $file" Green
    }
    Say '  После обновления Roblox запусти этот пункт ещё раз — обновление стирает настройки.' Yellow
}

function Set-PowerPlan {
    powercfg /getactivescheme | Out-File "$BackupDir\powerplan.txt"
    # Максимальная производительность, если нет — высокая
    $ult = 'e9a42b02-d5df-448d-aa00-03f14749eb61'
    $out = powercfg -duplicatescheme $ult 2>$null
    if ($out -match '([0-9a-f-]{36})') { powercfg /setactive $Matches[1] }
    else { powercfg /setactive SCHEME_MIN }
    Say '  OK: включена схема питания "Высокая производительность".' Green
}

function Set-GpuPreference {
    $key = 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences'
    New-Item -Path $key -Force | Out-Null
    foreach ($d in @(Get-RobloxDirs)) {
        $exe = Join-Path $d.FullName 'RobloxPlayerBeta.exe'
        Set-ItemProperty -Path $key -Name $exe -Value 'GpuPreference=2;'
        Say "  OK: мощная видеокарта для $exe" Green
    }
    # Отключить запись игр Xbox Game Bar в фоне (съедает FPS)
    New-Item 'HKCU:\System\GameConfigStore' -Force | Out-Null
    Set-ItemProperty 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled' -Value 0 -Type DWord
    New-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Force | Out-Null
    Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -Value 0 -Type DWord
    # Игровой режим Windows
    New-Item 'HKCU:\Software\Microsoft\GameBar' -Force | Out-Null
    Set-ItemProperty 'HKCU:\Software\Microsoft\GameBar' -Name 'AutoGameModeEnabled' -Value 1 -Type DWord
    Say '  OK: фоновая запись Game Bar выключена, игровой режим включён.' Green
}

function Clear-Junk {
    if (Get-Process RobloxPlayerBeta) { Say '  Сначала закрой Roblox.' Yellow; return }
    $paths = @(
        (Join-Path $env:TEMP 'Roblox'),
        (Join-Path $env:LOCALAPPDATA 'Roblox\logs'),
        (Join-Path $env:LOCALAPPDATA 'Roblox\Downloads'),
        (Join-Path $env:LOCALAPPDATA 'Temp\*')
    )
    foreach ($p in $paths) { Remove-Item $p -Recurse -Force }
    Say '  OK: кэш Roblox и временные файлы удалены.' Green
}

function Set-HighPriorityWhileRunning {
    $p = Get-Process RobloxPlayerBeta
    if (-not $p) { Say '  Сначала запусти Roblox, потом этот пункт.' Yellow; return }
    $p | ForEach-Object { $_.PriorityClass = 'High' }
    Say '  OK: Roblox получил высокий приоритет (до закрытия игры).' Green
}

function Undo-All {
    foreach ($d in @(Get-RobloxDirs)) {
        $file = Join-Path $d.FullName 'ClientSettings\ClientAppSettings.json'
        $bak = "$BackupDir\ClientAppSettings.$($d.Name).bak"
        if (Test-Path $bak) { Copy-Item $bak $file -Force } else { Remove-Item $file -Force }
    }
    powercfg /setactive SCHEME_BALANCED
    $key = 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences'
    foreach ($d in @(Get-RobloxDirs)) {
        Remove-ItemProperty -Path $key -Name (Join-Path $d.FullName 'RobloxPlayerBeta.exe')
    }
    Set-ItemProperty 'HKCU:\System\GameConfigStore' -Name 'GameDVR_Enabled' -Value 1 -Type DWord
    Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -Value 1 -Type DWord
    Say '  OK: всё вернул как было.' Green
}

while ($true) {
    Clear-Host
    Say '=====================================' Cyan
    Say '        ROBLOX FPS BOOSTER' Cyan
    Say '=====================================' Cyan
    Say ' 1. ВСЁ СРАЗУ (рекомендуется)' White
    Say ' 2. Графика Roblox: минимум (слабый ПК)'
    Say ' 3. Графика Roblox: средне (без лишнего)'
    Say ' 4. Ускорить Windows (питание, видеокарта, Game Bar)'
    Say ' 5. Очистить кэш и временные файлы'
    Say ' 6. Высокий приоритет для запущенного Roblox'
    Say ' 7. Откатить все изменения'
    Say ' 0. Выход'
    Say ''
    $c = Read-Host 'Выбери пункт'
    Say ''
    switch ($c) {
        '1' { Clear-Junk; Set-RobloxFlags -Preset low; Set-PowerPlan; Set-GpuPreference }
        '2' { Set-RobloxFlags -Preset low }
        '3' { Set-RobloxFlags -Preset medium }
        '4' { Set-PowerPlan; Set-GpuPreference }
        '5' { Clear-Junk }
        '6' { Set-HighPriorityWhileRunning }
        '7' { Undo-All }
        '0' { exit }
        default { Say 'Нет такого пункта.' Red }
    }
    Say ''
    Say 'Совет: в игре Esc → Settings → Maximum Frame Rate = максимум, Graphics Quality = вручную 1-3.' Yellow
    Read-Host 'Нажми Enter, чтобы вернуться в меню'
}
