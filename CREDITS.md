# Créditos y licencias

## Modo historia (`game-client/assets/WW2`)
Modelos y fotografías aportados por el equipo: lancha Higgins LCVP, acorazado Bismarck, bombardero, soldado alemán, MP-40 en primera persona y las tres fotos
de contexto. Se usan tal cual en la cinemática (las versiones `optimizados/` solo reducen la resolución de las texturas). Revisa la licencia de cada modelo
en su página de origen antes de publicar el juego.

## Locución (`game-client/assets/historia/audio/cN_M.wav`)
Voz neuronal `es_MX-claude-high` de [Piper](https://github.com/rhasspy/piper) (MIT; modelo Apache-2.0, https://huggingface.co/rhasspy/piper-voices),
generada sin conexión a partir de `assets/historia/guion.json`. Es voz sintética; para una voz humana usa `herramientas/grabar-locucion.html`.

## Efectos de sonido
- Disparos (`assets/audio/armas`): grabaciones reales de OpenGameArt. `pistola_cz.wav`, `fusil_mosin.wav`, `fusil_sks.wav` y `escopeta.wav` de Vincent Sevedge
  (CC-BY 3.0, https://opengameart.org/content/gunshot-sounds); `ak47.ogg` de The Free Firearm Sound Library (CC0, https://opengameart.org/content/the-free-firearm-sound-library).
- Resto (`assets/audio/sfx`): [Mixkit](https://mixkit.co/free-sound-effects/) (licencia Mixkit: uso libre, sin atribución obligatoria; no se pueden redistribuir como archivos sueltos).

## Música
La música orquestal de las cinemáticas se genera en tiempo real con WebAudio (`js/historia.js`).

## Mapas, armas, cuchillo, personajes, granadas y caja
Archivos `.glb` aportados por el equipo en `game-client/assets` (ver README.md).
