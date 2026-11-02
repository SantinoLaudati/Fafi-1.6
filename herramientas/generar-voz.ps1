# Genera la voz del narrador (locutor masculino en español, "Microsoft Pablo") como archivos WAV para el modo historia.
# Uso:  powershell -ExecutionPolicy Bypass -File herramientas\generar-voz.ps1
# Lee game-client\assets\historia\narracion.tsv  (tiempo<TAB>texto)  y escribe game-client\assets\historia\audio\narr_NN.wav
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'game-client\assets\historia\narracion.tsv'
$outDir = Join-Path $root 'game-client\assets\historia\audio'
New-Item -ItemType Directory -Force $outDir | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.Language -like 'es*' -and $_.Gender -eq 'Male' } | Select-Object -First 1
if (-not $voice) { throw 'No hay ninguna voz masculina en español instalada (Configuración > Hora e idioma > Voz).' }
$synth.Voice = $voice
Write-Host "Voz: $($voice.DisplayName) ($($voice.Language))"
$i = 0
foreach ($line in Get-Content $src -Encoding UTF8) {
  if (-not $line.Trim()) { continue }
  $text = ($line -split "`t", 2)[1]
  $esc = [System.Security.SecurityElement]::Escape($text)
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='$($voice.Language)'><prosody rate='-8%' pitch='-12%' volume='loud'>$esc</prosody></speak>"
  $stream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream)
  [void](Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32]))
  $bytes = New-Object byte[] ($stream.Size)
  $reader.ReadBytes($bytes)
  $file = Join-Path $outDir ('narr_{0:00}.wav' -f $i)
  [System.IO.File]::WriteAllBytes($file, $bytes)
  Write-Host ("{0}  {1} KB  {2}" -f (Split-Path $file -Leaf), [int]($bytes.Length / 1024), $text.Substring(0, [Math]::Min(48, $text.Length)))
  $i++
}
