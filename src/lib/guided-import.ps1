#Requires -Version 5.1
# Go Desktop guided import. Review before running; no keys are embedded.
# Uses an installed v0.32.0 copy or a checksum-verified official download.
$ErrorActionPreference = 'Stop'
# @CONFIG@
$Work = $null
$ExitCode = 1
function Confirm-Exact([string]$Prompt, [string]$Expected) {
    return ((Read-Host $Prompt) -ceq $Expected)
}
function Read-Key([string]$Label) {
    $Secure = Read-Host "$Label API key (input hidden)" -AsSecureString
    $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try { $Plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer); $Secure.Dispose() }
    if ([string]::IsNullOrWhiteSpace($Plain) -or $Plain -match '[\s\x00-\x1f\x7f]') {
        throw 'Paste an API key without spaces or line breaks.'
    }
    return $Plain
}
function Check-Server([string]$Address, [string]$Label) {
    if ($Address.StartsWith('http://', [StringComparison]::OrdinalIgnoreCase)) {
        if (-not (Confirm-Exact "$Label uses HTTP, which sends the key without encryption. Type HTTP to continue" 'HTTP')) {
            throw 'Stopped before sending the key. Use HTTPS in the app if available.'
        }
    }
    for ($Attempt = 0; $Attempt -lt 3; $Attempt++) {
        try { $Key = Read-Key $Label } catch { Write-Host 'Paste a key without spaces or line breaks.'; continue }
        try {
            $Reply = Invoke-WebRequest -UseBasicParsing -Uri ($Address.TrimEnd('/') + '/api/server/about') -Headers @{'x-api-key'=$Key} -MaximumRedirection 0 -TimeoutSec 15
            if ([int]$Reply.StatusCode -ne 200) { throw 'Unexpected response' }
            $About = $Reply.Content | ConvertFrom-Json
            if ($About.version -isnot [string] -or -not $About.version) { throw 'Not an Immich response' }
            return $Key
        } catch {
            $Status = 0
            if ($_.Exception.Response) { $Status = [int]$_.Exception.Response.StatusCode }
            if ($Status -eq 401 -or $Status -eq 403) {
                Write-Host "$Label rejected the key or server.about permission. Check the key and try again."
                continue
            }
            throw "$Label check failed. Check its final base address, network access, HTTPS certificate, and Immich version response. Redirects are not followed. Regenerate the script if the address needs changing."
        }
    }
    throw "$Label access could not be confirmed. Review the key and permissions."
}
function Show-Summary([string]$Log) {
    $Section = ''; $Found = $false; $Errors = $null; $Pending = $null
    $Total = $null; $Processed = $null; $Discarded = $null; $Uploaded = $null; $Messages = 0; $Warnings = 0; $Closed=$false; $EventErrors=0
    foreach ($Line in [IO.File]::ReadLines($Log)) {
        if ($Line -match ' (ERR|ERROR) ') { $Messages++ }
        if ($Line -match ' (WRN|WARN) ') { $Warnings++ }
        $Message = $Line -replace '^.* (INF|INFO) ', ''
        if ($Message -eq 'Asset Tracking Report:') {
            $Found=$true; $Section='tracking'; $Errors=$null; $Pending=$null; $Total=$null; $Processed=$null; $Discarded=$null; $Uploaded=$null; $Closed=$false; $EventErrors=0
        }
        if ($Message -eq 'Event Report:') { $Section='events' }
        if ($Section -eq 'tracking' -and $Message -match '^(Total Assets|Processed|Errors|Pending|Discarded): ([0-9]+)$') {
            $Number = [long]$Matches[2]
            switch ($Matches[1]) { 'Total Assets' {$Total=$Number} 'Processed' {$Processed=$Number} 'Errors' {$Errors=$Number} 'Pending' {$Pending=$Number} 'Discarded' {$Discarded=$Number} }
        }
        if ($Section -eq 'events' -and $Message -match '^uploaded successfully: ([0-9]+)$') { $Uploaded=[long]$Matches[1] }
        if ($Section -eq 'events' -and $Message -match '^(upload failed|server error|file access error|incomplete processing): ([0-9]+)$') { $EventErrors += [long]$Matches[2] }
        if ($Message.StartsWith('Check the log file:')) { $Closed=$true }
    }
    $Counts = @($Uploaded,$Discarded,$Errors,$Pending) | ForEach-Object { if ($null -eq $_) {'Unknown'} else {$_} }
    Write-Host "Reported uploads: $($Counts[0]) | Skipped/discarded: $($Counts[1]) | Asset errors: $($Counts[2]) | Pending: $($Counts[3])"
    Write-Host "Error messages: $Messages | Warnings: $Warnings"
    Write-Host 'Reported counts do not verify that your Immich library is complete.'
    return ($Found -and $Closed -and $null -ne $Total -and $Total -gt 0 -and $null -ne $Processed -and $null -ne $Discarded -and $null -ne $Errors -and $null -ne $Pending -and ($Processed+$Discarded+$Errors+$Pending) -eq $Total -and $Errors -eq 0 -and $Pending -eq 0 -and $Messages -eq 0 -and $EventErrors -eq 0)
}
function Run-Import([string]$Stage, [string]$DryRun) {
    $Log = Join-Path $RunDir "$Stage.log"
    $CliArgs = @('upload', $Command) + $ImportFlags + @("--server=$Destination", "--api-key=$DestinationKey", "--config=$ConfigPath", '--no-ui', '--log-type=text', "--log-file=$Log", "--dry-run=$DryRun")
    if ($Source -eq 'immich') { $CliArgs += @("--from-server=$SourceServer", "--from-api-key=$SourceKey") }
    $CliArgs += @('--') + $Paths
    Write-Host "`n$Stage starting. Do not close this terminal; Ctrl+C stops the process."
    # Quote native argv using Windows CRT rules, including embedded quotes and
    # trailing backslashes. PS 5.1's legacy native invocation can lose quotes.
    $QuotedArgs = $CliArgs | ForEach-Object {
        '"' + ([regex]::Replace($_, '(\\*)"', '$1$1\"') -replace '(\\+)$', '$1$1') + '"'
    }
    $Process = New-Object Diagnostics.Process
    $Process.StartInfo.FileName = $Binary
    $Process.StartInfo.Arguments = $QuotedArgs -join ' '
    $Process.StartInfo.UseShellExecute = $false
    $Process.StartInfo.WorkingDirectory = $Work
    $Started = $false
    try {
        $Started = $Process.Start()
        if (-not $Started) { throw 'immich-go could not start.' }
        $Process.WaitForExit()
        $Code = $Process.ExitCode
    } finally {
        if ($Started -and -not $Process.HasExited) { $Process.Kill(); $Process.WaitForExit() }
        $Process.Dispose()
    }
    Write-Host "`n$Stage log: $Log"
    $SummaryOk = $false
    if (Test-Path -LiteralPath $Log -PathType Leaf) { $SummaryOk = Show-Summary $Log }
    else { Write-Host 'No readable log summary was produced. Review the terminal output.' }
    if ($Code -ne 0) { throw "immich-go stopped with exit code $Code. The result may be partial. Review the saved log before retrying." }
    if (-not $SummaryOk) { throw 'The summary is missing, incomplete, or reports issues. Review the saved log before another attempt.' }
}
try {
    if ($env:OS -ne 'Windows_NT') { throw 'This script is for Windows. Download the .sh script for macOS or Linux.' }
    Write-Host "`nGo Desktop - guided import`nAlways tests first. Uploading requires typing UPLOAD."
    $Paths = @()
    if ($Source -ne 'immich') {
        for ($Attempt=0; $Attempt -lt 4; $Attempt++) {
            $Items = @()
            if ($PhotoPath -and $PhotoPath -notmatch '^[\-]|[\x00-\x1f\x7f]') {
                if (Test-Path -LiteralPath $PhotoPath) { $Items = @(Get-Item -LiteralPath $PhotoPath -Force) }
                elseif ($Source -eq 'takeout') { $Items = @(Get-Item -Path $PhotoPath -Force -ErrorAction SilentlyContinue) }
            }
            $Readable = $Items.Count -gt 0
            foreach ($Item in $Items) {
                try {
                    if ($Item.PSProvider.Name -ne 'FileSystem') { throw 'Not a filesystem path' }
                    if ($Item.PSIsContainer) { Get-ChildItem -LiteralPath $Item.FullName -Force -ErrorAction Stop | Select-Object -First 1 | Out-Null }
                    else {
                        $Stream = [IO.File]::Open($Item.FullName, 'Open', 'Read', 'ReadWrite'); $Stream.Dispose()
                        if ($Item.Extension -ieq '.zip') {
                            Add-Type -AssemblyName System.IO.Compression.FileSystem
                            $Zip = [IO.Compression.ZipFile]::OpenRead($Item.FullName); $Zip.Dispose()
                        }
                    }
                } catch { $Readable=$false }
            }
            if ($Readable) { $Paths=@($Items | ForEach-Object {$_.FullName}); break }
            if ($Attempt -eq 3) { throw 'The photo path is still missing, inaccessible, or an unreadable ZIP. Correct it in the app and download again.' }
            $PhotoPath = Read-Host 'Photo path not found, inaccessible, or unreadable. Paste a corrected path (Enter stops)'
            if (-not $PhotoPath) { exit 0 }
        }
        Write-Host 'Photo path checked. Individual files will be checked by the test run.'
    }
    $Work = Join-Path ([IO.Path]::GetTempPath()) ('go-desktop-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $Work | Out-Null
    $Binary = $null
    $Installed = Get-Command immich-go -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($Installed) {
        $Version = & $Installed.Source version 2>$null
        if ($LASTEXITCODE -eq 0 -and $Version -match '^immich-go version:0\.32\.0,') { $Binary = $Installed.Source }
    }
    if (-not $Binary) {
        $Arch = $env:PROCESSOR_ARCHITECTURE
        if ($env:PROCESSOR_ARCHITEW6432) { $Arch=$env:PROCESSOR_ARCHITEW6432 }
        switch ($Arch.ToUpperInvariant()) {
            'ARM64' { $Asset='immich-go_Windows_arm64.zip'; $Expected='@Windows_arm64@' }
            'AMD64' { $Asset='immich-go_Windows_x86_64.zip'; $Expected='@Windows_x86_64@' }
            default { throw 'Automatic setup supports Windows ARM64 and x86-64. Use the manual installation guide for this computer.' }
        }
        $Cache = Join-Path $env:LOCALAPPDATA 'Go Desktop\immich-go\v0.32.0'
        New-Item -ItemType Directory -Path $Cache -Force | Out-Null
        $Archive = Join-Path $Cache $Asset
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        if (-not (Test-Path -LiteralPath $Archive -PathType Leaf)) {
            Write-Host 'Downloading official immich-go v0.32.0 (no system installation changes)...'
            $Download = Join-Path $Work 'download.zip'
            try { Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/simulot/immich-go/releases/download/v0.32.0/$Asset" -OutFile $Download -TimeoutSec 300 }
            catch { throw 'Download failed. Check internet access to GitHub and try again.' }
            if ((Get-FileHash -LiteralPath $Download -Algorithm SHA256).Hash -ine $Expected) { throw 'Download checksum did not match. Nothing was installed or run.' }
            Move-Item -LiteralPath $Download -Destination $Archive -Force
        }
        if ((Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash -ine $Expected) { throw "Cached download checksum did not match. Nothing was run. Remove this archive and retry: $Archive" }
        Expand-Archive -LiteralPath $Archive -DestinationPath $Work
        $Binary = Join-Path $Work 'immich-go.exe'
        $Version = & $Binary version
        if ($LASTEXITCODE -ne 0 -or $Version -notmatch '^immich-go version:0\.32\.0,') { throw 'Downloaded binary did not report the expected version.' }
    }
    Write-Host 'Using immich-go v0.32.0.'
    $DestinationKey = Check-Server $Destination 'Destination'
    $SourceKey = ''
    if ($Source -eq 'immich') { $SourceKey = Check-Server $SourceServer 'Source' }
    Write-Host 'Server information checks passed. Import permissions are checked by immich-go as operations run.'
    $LogRoot = Join-Path $env:LOCALAPPDATA 'Go Desktop\imports'
    $RunDir = Join-Path $LogRoot ('run-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $RunDir -Force | Out-Null
    Write-Host "Logs are in your user profile but can contain keys, filenames, and server details.`nLog folder: $RunDir"
    $Command = switch ($Source) { 'folder' {'from-folder'} 'takeout' {'from-google-photos'} 'icloud' {'from-icloud'} 'immich' {'from-immich'} }
    $ConfigPath = Join-Path $Work 'config.yaml'
    [IO.File]::WriteAllText($ConfigPath, "{}`n")
    Run-Import 'test' 'true'
    Write-Host "`nTest finished. Its counts do not mean photos were uploaded. Review warnings above."
    if (Confirm-Exact 'Upload using these settings now? Type UPLOAD to start; Enter stops' 'UPLOAD') {
        Run-Import 'upload' 'false'
        Write-Host 'Upload process finished without detected summary errors. Check your Immich library and review warnings.'
    } else { Write-Host 'Finished the test only. No live upload was started.' }
    Write-Host "Logs: $RunDir`nUse Settings > Help > Reading import results in Go Desktop to review the .log file."
    $ExitCode=0
} catch {
    Write-Host "`nStopped: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'No further stage was started. If an upload was interrupted, some photos may already have uploaded.'
} finally {
    $DestinationKey=$null; $SourceKey=$null
    if ($Work -and (Test-Path -LiteralPath $Work)) { Remove-Item -LiteralPath $Work -Recurse -Force }
}
exit $ExitCode
