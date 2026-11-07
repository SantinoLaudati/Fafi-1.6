param([int]$Port = 5173, [switch]$NoBrowser)

# Servidor estatico minimo para game-client (sin Python ni Node). Solo para probar el juego en local.
$Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'game-client'))
if (-not (Test-Path $Root)) { Write-Host "No existe la carpeta $Root"; Read-Host 'Enter para salir'; exit 1 }

$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.glb'='model/gltf-binary'; '.gltf'='model/gltf+json'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.webp'='image/webp'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'
  '.mp3'='audio/mpeg'; '.wav'='audio/wav'; '.ogg'='audio/ogg'; '.tsv'='text/tab-separated-values; charset=utf-8'; '.txt'='text/plain; charset=utf-8'
}

# Si el puerto esta ocupado prueba con los siguientes
$listener = $null
for ($p = $Port; $p -lt $Port + 10; $p++) {
  $l = New-Object System.Net.HttpListener
  $l.Prefixes.Add("http://localhost:$p/")
  try { $l.Start(); $listener = $l; $Port = $p; break } catch { $l.Close() }
}
if (-not $listener) { Write-Host "No se pudo abrir ningun puerto entre $Port y $($Port + 9). Cierra otros servidores e intenta de nuevo."; Read-Host 'Enter para salir'; exit 1 }

Write-Host "FAFI 1.6 corriendo en http://localhost:$Port/"
Write-Host "Cierra esta ventana (o Ctrl+C) para detener el servidor."
if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $Root ($path.TrimStart('/') -replace '/', '\')))
    if ($file.StartsWith($Root) -and (Test-Path $file -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $ctx.Response.Headers.Add('Cache-Control', $(if ($ext -match '.(glb|png|jpg|jpeg|webp|ogg|wav|mp3|svg)$') { 'public, max-age=1800' } else { 'no-cache' }))
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch { try { $ctx.Response.StatusCode = 500 } catch {} }
  try { $ctx.Response.Close() } catch {}
}
