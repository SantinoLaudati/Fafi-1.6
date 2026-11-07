#!/bin/bash
# Genera los sonidos de las armas que no tienen grabación propia a partir de las dos grabaciones reales (AK-47 y Vandal):
# cambia el tono, filtra y agrega cuerpo/eco para que cada arma suene distinta. Cada archivo contiene UN solo disparo,
# empieza exactamente en el golpe (sin silencio previo) y termina con un fundido corto.
# Requiere ffmpeg. Uso: bash herramientas/derivar-sonidos_2_0_0v.sh  (desde la raíz del repo, con ak_N.ogg y vandal_N.ogg en game-client/assets/audio/armas)
cd "$(dirname "$0")/../game-client/assets/audio/armas" || exit 1
AK=(ak_1.ogg ak_2.ogg ak_3.ogg); VA=(vandal_1.ogg vandal_3.ogg vandal_1.ogg)
r(){ echo "asetrate=44100*$1,aresample=44100"; }
# mk nombre N entrada "filtros" duración_máx
mk(){ out=$1_$2.ogg; in=$3; filt=$4; dur=$5; ffmpeg -hide_banner -nostats -v error -y -i "$in" -af "silenceremove=start_periods=1:start_threshold=-36dB:start_silence=0.002,$filt,atrim=0:$dur,afade=t=out:st=$(awk -v d=$dur 'BEGIN{printf "%.3f", d-0.06}'):d=0.06,alimiter=limit=0.9" -ac 1 -ar 44100 -c:a libvorbis -q:a 5 "$out"; }
# mezcla de dos capas: mk2 nombre N entradaA filtrosA entradaB filtrosB duración
mk2(){ out=$1_$2.ogg; ffmpeg -hide_banner -nostats -v error -y -i "$3" -i "$5" -filter_complex "[0:a]$4[a];[1:a]$6[b];[a][b]amix=inputs=2:normalize=0,silenceremove=start_periods=1:start_threshold=-36dB:start_silence=0.002,atrim=0:$7,afade=t=out:st=$(awk -v d=$7 'BEGIN{printf "%.3f", d-0.08}'):d=0.08,alimiter=limit=0.9" -ac 1 -ar 44100 -c:a libvorbis -q:a 5 "$out"; }
for n in 1 2 3; do
  i=$((n-1)); a=${AK[$i]}; v=${VA[$i]}; j=$(awk -v n=$n 'BEGIN{print 1+(n-2)*0.02}')   # pequeña variación de tono entre variantes
  mk m4      $n $a "$(r $(awk -v j=$j 'BEGIN{print 1.08*j}')),equalizer=f=2500:t=q:w=1:g=-2,equalizer=f=120:t=q:w=1:g=2" 0.42
  mk p90     $n $a "$(r $(awk -v j=$j 'BEGIN{print 1.38*j}')),highpass=f=250,equalizer=f=4000:t=q:w=1:g=3" 0.30
  mk negev   $n $a "$(r $(awk -v j=$j 'BEGIN{print 0.86*j}')),equalizer=f=100:t=q:w=1:g=4" 0.42
  mk awp     $n $a "$(r $(awk -v j=$j 'BEGIN{print 0.6*j}')),equalizer=f=90:t=q:w=1:g=7,aecho=0.8:0.6:90|210:0.35|0.18" 1.1
  mk shotgun $n $a "$(r $(awk -v j=$j 'BEGIN{print 0.72*j}')),equalizer=f=140:t=q:w=1:g=5,aecho=0.8:0.5:60:0.3" 0.55
  mk deagle  $n $v "$(r $(awk -v j=$j 'BEGIN{print 0.8*j}')),equalizer=f=130:t=q:w=1:g=6,aecho=0.8:0.5:70|150:0.3|0.15" 0.60
  mk five    $n $v "$(r $(awk -v j=$j 'BEGIN{print 1.5*j}')),highpass=f=200" 0.32
  mk smg     $n $v "$(r $(awk -v j=$j 'BEGIN{print 1.22*j}')),lowpass=f=5200,volume=0.8" 0.30
  mk m4b     $n $v "$(r $(awk -v j=$j 'BEGIN{print 1.3*j}')),lowpass=f=3600,highpass=f=300,volume=0.9" 0.26
  mk vss     $n $v "$(r $(awk -v j=$j 'BEGIN{print 1.12*j}')),lowpass=f=3000,highpass=f=250,volume=1.0,aecho=0.8:0.4:45:0.25" 0.34
  mk2 shorty $n $v "$(r $(awk -v j=$j 'BEGIN{print 0.66*j}')),equalizer=f=110:t=q:w=1:g=5" $a "$(r $(awk -v j=$j 'BEGIN{print 0.5*j}')),volume=0.9" 0.6
done
ls *.ogg | wc -l
