#!/bin/bash
# Convierte los sonidos del pack (carpeta con .wav) a .ogg en game-client/assets/audio/pack y genera assets/audio/sonidos.json
# a partir de herramientas/sonidos-mapa_2_0_0v.txt. Uso: bash herramientas/convertir-sonidos_2_0_0v.sh "C:/ruta/sonidos pack 4"
SRC="${1:-/c/Users/Usuario/Desktop/sonidos pack 4}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; OUT="$ROOT/game-client/assets/audio/pack"; MAP="$ROOT/herramientas/sonidos-mapa_2_0_0v.txt"
mkdir -p "$OUT"; json="{"; first=1; missing=0
while IFS='|' read -r name vol files; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  list=""; IFS=',' read -ra arr <<< "$files"
  for f in "${arr[@]}"; do
    src=$(find "$SRC" -maxdepth 1 -iname "$f.wav" | head -1)
    if [ -z "$src" ]; then echo "FALTA: $f"; missing=$((missing+1)); continue; fi
    id=$(echo "$f" | tr 'A-Z' 'a-z' | tr ' ' '_')
    [ -f "$OUT/$id.ogg" ] || ffmpeg -hide_banner -nostats -v error -y -i "$src" -ac 1 -ar 44100 -c:a libvorbis -q:a 4 "$OUT/$id.ogg"
    list="$list\"assets/audio/pack/$id.ogg\","
  done
  [ -z "$list" ] && continue
  [ $first -eq 0 ] && json="$json,"; first=0
  json="$json\"$name\":{\"v\":$vol,\"f\":[${list%,}]}"
done < "$MAP"
echo "$json}" > "$ROOT/game-client/assets/audio/sonidos.json"
echo "listo ($missing faltantes)"; du -sh "$OUT"
