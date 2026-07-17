# Configuração de Encoding para UTF-8 no console do PowerShell
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "Arquivo .env nao encontrado em $envFile! Por favor, crie-o primeiro."
    exit 1
}

# Lendo o arquivo .env
$config = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $key, $value = $line -split '=', 2
        $config[$key.Trim()] = $value.Trim()
    }
}

$ftpHost = $config["FTP_HOST"]
$ftpUser = $config["FTP_USER"]
$ftpPass = $config["FTP_PASS"]
$ftpPort = $config["FTP_PORT"]
if (-not $ftpPort) { $ftpPort = "21" }
$ftpRemotePath = $config["FTP_REMOTE_PATH"]

if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
    Write-Error "FTP_HOST, FTP_USER ou FTP_PASS ausentes no arquivo .env!"
    exit 1
}

# Garante formato correto de FTP_REMOTE_PATH
if ($ftpRemotePath -and -not $ftpRemotePath.StartsWith("/")) {
    $ftpRemotePath = "/" + $ftpRemotePath
}
if ($ftpRemotePath -and $ftpRemotePath.EndsWith("/")) {
    $ftpRemotePath = $ftpRemotePath.Substring(0, $ftpRemotePath.Length - 1)
}

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "Iniciando deploy para ftp://$($ftpHost):$($ftpPort)$($ftpRemotePath)" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

# Cache de diretorios criados para otimizar conexoes
$createdDirs = @{}

function Create-FtpDirectory {
    param (
        [string]$uri,
        [System.Net.NetworkCredential]$credentials
    )
    
    if ($createdDirs.ContainsKey($uri)) {
        return
    }
    
    $uriObj = New-Object System.Uri($uri)
    $segments = $uriObj.AbsolutePath.Split('/') | Where-Object { $_ }
    
    $currentPath = ""
    foreach ($segment in $segments) {
        $currentPath += "/" + $segment
        $segmentUri = "ftp://$($uriObj.Host):$($uriObj.Port)$currentPath"
        
        if (-not $createdDirs.ContainsKey($segmentUri)) {
            $request = [System.Net.FtpWebRequest]::Create($segmentUri)
            $request.Credentials = $credentials
            $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
            $request.UseBinary = $true
            $request.KeepAlive = $false
            
            try {
                $response = $request.GetResponse()
                $response.Close()
                Write-Host "[DIRETORIO] Criado com sucesso: $currentPath" -ForegroundColor Green
            } catch {
                $statusDescription = $_.Exception.Message
                if ($_.Exception.Response) {
                    $statusDescription = [System.Net.FtpWebResponse]($_.Exception.Response).StatusDescription
                }
                
                # Se for erro 550 significa que ja existe ou nao ha permissao
                if ($statusDescription -match "550") {
                    # OK, ja existe
                } else {
                    Write-Warning "Aviso ao criar diretorio $($currentPath): $($statusDescription)"
                }
            }
            $createdDirs[$segmentUri] = $true
        }
    }
}

function Upload-FtpFile {
    param (
        [string]$localPath,
        [string]$remoteUri,
        [System.Net.NetworkCredential]$credentials
    )
    
    $fileName = Split-Path $localPath -Leaf
    Write-Host "[ENVIANDO] $fileName -> $remoteUri..." -ForegroundColor Gray
    
    $request = [System.Net.FtpWebRequest]::Create($remoteUri)
    $request.Credentials = $credentials
    $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $request.UseBinary = $true
    $request.KeepAlive = $false
    
    $fileBytes = [System.IO.File]::ReadAllBytes($localPath)
    $request.ContentLength = $fileBytes.Length
    
    try {
        $requestStream = $request.GetRequestStream()
        $requestStream.Write($fileBytes, 0, $fileBytes.Length)
        $requestStream.Close()
        
        $response = $request.GetResponse()
        $response.Close()
        Write-Host "[SUCESSO] Enviado: $fileName" -ForegroundColor Green
    } catch {
        Write-Error "Erro ao enviar arquivo $($localPath): $_"
        throw $_
    }
}

# Caminho local dos arquivos a subir
$sitePath = Join-Path $PSScriptRoot "site"
if (-not (Test-Path $sitePath)) {
    Write-Error "Pasta 'site' nao encontrada!"
    exit 1
}

$files = Get-ChildItem -Path $sitePath -Recurse -File
$credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)

Write-Host "Total de arquivos encontrados: $($files.Count)" -ForegroundColor Cyan
$successCount = 0
$failCount = 0

foreach ($file in $files) {
    # Caminho relativo em relacao a pasta site (ex: css/layout.css)
    $relative = $file.FullName.Substring($sitePath.Length).Replace("\", "/")
    if ($relative.StartsWith("/")) {
        $relative = $relative.Substring(1)
    }
    
    $remoteFileUri = "ftp://$($ftpHost):$($ftpPort)$($ftpRemotePath)/$($relative)"
    $remoteDirUri = "ftp://$($ftpHost):$($ftpPort)$($ftpRemotePath)"
    
    if ($relative.Contains("/")) {
        $parentDir = $relative.Substring(0, $relative.LastIndexOf("/"))
        $remoteDirUri = "ftp://$($ftpHost):$($ftpPort)$($ftpRemotePath)/$($parentDir)"
    }
    
    try {
        # Garante existencia do diretorio remoto
        Create-FtpDirectory -uri $remoteDirUri -credentials $credentials
        
        # Faz o upload
        Upload-FtpFile -localPath $file.FullName -remoteUri $remoteFileUri -credentials $credentials
        $successCount++
    } catch {
        $failCount++
        Write-Warning "Falha no processamento de: $relative"
    }
}

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
if ($failCount -eq 0) {
    Write-Host "DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "Arquivos transferidos: $successCount" -ForegroundColor Green
} else {
    Write-Host "DEPLOY FINALIZADO COM AVISOS!" -ForegroundColor Yellow
    Write-Host "Sucesso: $successCount, Falhas: $failCount" -ForegroundColor Yellow
}
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
