param([int]$Port = 5173)

# Servidor estatico minimo para game-client (sin Python ni Node).
$Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'game-client'))
if (-not (Test-Path $Root)) { Write-Host "No existe la carpeta $Root"; Read-Host 'Enter para salir'; exit 1 }

$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.glb'='model/gltf-binary'; '.gltf'='model/gltf+json'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() }
catch { Write-Host "No se pudo abrir el puerto $Port (esta en uso?). Cierra el otro servidor e intenta de nuevo."; Read-Host 'Enter para salir'; exit 1 }

Write-Host "FAFI 1.6 corriendo en http://localhost:$Port/  (cierra esta ventana para detenerlo)"
Start-Process "http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $Root ($path.TrimStart('/') -replace '/', '\')))
    if ($file.StartsWith($Root) -and (Test-Path $file -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch { $ctx.Response.StatusCode = 500 }
  $ctx.Response.Close()
}
