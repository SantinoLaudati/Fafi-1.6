# Genera la locución del modo historia con Piper (voz neuronal offline).
# Uso: powershell -ExecutionPolicy Bypass -File herramientas\generar-voz-piper_2_0_0v.ps1 -Piper C:\ruta\piper.exe -Model C:\ruta\es_MX-claude-high.onnx
param([Parameter(Mandatory)][string]$Piper, [Parameter(Mandatory)][string]$Model, [double]$Speed = 1.08)
$root = Join-Path $PSScriptRoot '..\game-client\assets\historia'
$g = Get-Content (Join-Path $root 'guion.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$out = Join-Path $root 'audio'; New-Item -ItemType Directory -Force $out | Out-Null
foreach ($c in $g.chapters) {
  $i = 0
  foreach ($t in $c.beats) {
    $f = Join-Path $out ('c{0}_{1}.wav' -f $c.id, $i)
    $t | & $Piper --model $Model --length_scale $Speed --noise_scale 0.55 --noise_w 0.7 --sentence_silence 0.35 --output_file $f | Out-Null
    $i++
  }
}
Write-Host 'Listo.'
