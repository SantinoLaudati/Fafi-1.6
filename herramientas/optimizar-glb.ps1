# Reduce el tamaño de las texturas incrustadas de un .glb (sin Node ni Python).
# Uso:  powershell -ExecutionPolicy Bypass -File optimizar-glb.ps1 -In mapa.glb -Out mapa_2k.glb -MaxSize 2048
# Los mapas "with_real_light" traen texturas de 8192x8192 (Italy) y 4096x4096 (Office): decodificadas
# en la GPU ocupan GB y cuelgan el navegador. Con 2048 o 1024 cargan en segundos y se ven casi igual.
param(
  [Parameter(Mandatory=$true)][string]$In,
  [Parameter(Mandatory=$true)][string]$Out,
  [int]$MaxSize = 2048,
  [int]$Quality = 85
)
Add-Type -AssemblyName System.Drawing

function Get-Encoder([string]$mime) {
  [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq $mime } | Select-Object -First 1
}

$b = [IO.File]::ReadAllBytes($In)
if ([BitConverter]::ToUInt32($b, 0) -ne 0x46546C67) { throw "No es un .glb valido: $In" }
$jsonLen = [int][BitConverter]::ToUInt32($b, 12)
$j = [Text.Encoding]::UTF8.GetString($b, 20, $jsonLen) | ConvertFrom-Json
$binHeader = 20 + $jsonLen
$binLen = [int][BitConverter]::ToUInt32($b, $binHeader)
$binStart = $binHeader + 8

# bufferViews que son imagenes -> bytes nuevos
$replace = @{}
$origTotal = 0; $newTotal = 0
for ($i = 0; $i -lt @($j.images).Count; $i++) {
  $im = $j.images[$i]
  if ($null -eq $im.bufferView) { continue }
  $bv = $j.bufferViews[[int]$im.bufferView]
  $data = New-Object byte[] ([int]$bv.byteLength)
  [Array]::Copy($b, $binStart + [int]$bv.byteOffset, $data, 0, $data.Length)
  $origTotal += $data.Length
  $ms = New-Object IO.MemoryStream(, $data)
  $img = [Drawing.Image]::FromStream($ms)
  $w = $img.Width; $h = $img.Height
  if ([Math]::Max($w, $h) -le $MaxSize) { $img.Dispose(); $replace[[int]$im.bufferView] = $data; $newTotal += $data.Length; continue }
  $s = $MaxSize / [double][Math]::Max($w, $h)
  $nw = [Math]::Max(1, [int]($w * $s)); $nh = [Math]::Max(1, [int]($h * $s))
  $bmp = New-Object Drawing.Bitmap($nw, $nh)
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $nw, $nh)
  $g.Dispose(); $img.Dispose()
  $ostream = New-Object IO.MemoryStream
  if ($im.mimeType -eq 'image/png') {
    $bmp.Save($ostream, [Drawing.Imaging.ImageFormat]::Png)
  } else {
    $ep = New-Object Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]$Quality)
    $bmp.Save($ostream, (Get-Encoder 'image/jpeg'), $ep)
  }
  $bmp.Dispose()
  $replace[[int]$im.bufferView] = $ostream.ToArray()
  $newTotal += $ostream.Length
  Write-Host ("  imagen {0}: {1}x{2} -> {3}x{4}  {5:N1} MB -> {6:N2} MB" -f $i, $w, $h, $nw, $nh, ($data.Length/1MB), ($ostream.Length/1MB))
  $ostream.Dispose(); $ms.Dispose()
  [GC]::Collect()
}

# reconstruir el buffer binario
$bin = New-Object IO.MemoryStream
for ($k = 0; $k -lt @($j.bufferViews).Count; $k++) {
  $bv = $j.bufferViews[$k]
  if ($replace.ContainsKey($k)) { $d = $replace[$k] }
  else {
    $d = New-Object byte[] ([int]$bv.byteLength)
    [Array]::Copy($b, $binStart + [int]$bv.byteOffset, $d, 0, $d.Length)
  }
  while (($bin.Length % 4) -ne 0) { $bin.WriteByte(0) }
  $bv | Add-Member -NotePropertyName byteOffset -NotePropertyValue ([int]$bin.Length) -Force
  $bv | Add-Member -NotePropertyName byteLength -NotePropertyValue ([int]$d.Length) -Force
  $bin.Write($d, 0, $d.Length)
}
while (($bin.Length % 4) -ne 0) { $bin.WriteByte(0) }
$j.buffers[0].byteLength = [int]$bin.Length
if ($j.buffers[0].PSObject.Properties.Name -contains 'uri') { $j.buffers[0].PSObject.Properties.Remove('uri') }

$jsonText = $j | ConvertTo-Json -Depth 100 -Compress
$jb = [Text.Encoding]::UTF8.GetBytes($jsonText)
$jpad = (4 - ($jb.Length % 4)) % 4
$total = 12 + 8 + $jb.Length + $jpad + 8 + [int]$bin.Length
$fs = [IO.File]::Create($Out)
$bw = New-Object IO.BinaryWriter($fs)
$bw.Write([uint32]0x46546C67); $bw.Write([uint32]2); $bw.Write([uint32]$total)
$bw.Write([uint32]($jb.Length + $jpad)); $bw.Write([uint32]0x4E4F534A); $bw.Write($jb)
for ($p = 0; $p -lt $jpad; $p++) { $bw.Write([byte]0x20) }
$bw.Write([uint32]$bin.Length); $bw.Write([uint32]0x004E4942); $bw.Write($bin.ToArray())
$bw.Close(); $fs.Close()
Write-Host ("Listo: {0}  ({1:N1} MB -> {2:N1} MB, texturas {3:N1} MB -> {4:N1} MB)" -f $Out, ((Get-Item $In).Length/1MB), ((Get-Item $Out).Length/1MB), ($origTotal/1MB), ($newTotal/1MB))
