#!/bin/bash
# Regenera game-client/assets/precarga.json: lista de todos los archivos que el juego usa (modelos, imágenes, audio, historia).
# La precarga de después del login los descarga todos antes de mostrar el menú. Ejecutar desde la raíz del repo (Git Bash).
cd "$(dirname "$0")/../game-client" || exit 1
grep -ho "['\"\`][^'\"\`]*\.\(glb\|png\|jpg\|jpeg\|webp\|json\|svg\)['\"\`]" js/*.js css/*.css index.html 2>/dev/null | sed "s/^['\"\`]//;s/['\"\`]$//" | xargs -I{} basename "{}" | sort -u > /tmp/used_names.txt
find assets -type f \( -name "*.glb" -o -name "*.png" -o -name "*.jpg" -o -name "*.webp" -o -name "*.json" -o -name "*.wav" -o -name "*.ogg" -o -name "*.svg" -o -name "*.tsv" \) | while read f; do
  b=$(basename "$f")
  if [ "$b" != "precarga.json" ] && { grep -qxF "$b" /tmp/used_names.txt || [[ "$f" == assets/historia/* ]] || [[ "$f" == assets/audio/* ]]; }; then echo "$f"; fi
done | sort > /tmp/manifest_files.txt
{ echo "["; sed 's/^/  "/; s/$/",/' /tmp/manifest_files.txt | sed '$ s/,$//'; echo "]"; } > assets/precarga.json
echo "precarga.json: $(wc -l < /tmp/manifest_files.txt) archivos"
