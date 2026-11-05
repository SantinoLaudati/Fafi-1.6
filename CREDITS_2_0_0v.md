# Créditos y licencias

## Modo historia (`game-client/assets/WW2`)
Modelos y fotografías aportados por el equipo: lancha Higgins LCVP, acorazado Bismarck, bombardero, soldado alemán, MP-40 en primera persona y las tres fotos
de contexto. Se usan tal cual en la cinemática (las versiones `optimizados/` solo reducen la resolución de las texturas). Revisa la licencia de cada modelo
en su página de origen antes de publicar el juego.

## Locución (`game-client/assets/historia/audio/cN_M.wav`)
Voz neuronal `es_MX-claude-high` de [Piper](https://github.com/rhasspy/piper) (MIT; modelo Apache-2.0, https://huggingface.co/rhasspy/piper-voices),
generada sin conexión a partir de `assets/historia/guion.json`. Es voz sintética; para una voz humana usa `herramientas/grabar-locucion_2_0_0v.html`.

## Efectos de sonido
- Disparos (`assets/audio/armas`): grabaciones reales de OpenGameArt. `pistola_cz.wav`, `fusil_mosin.wav`, `fusil_sks.wav` y `escopeta.wav` de Vincent Sevedge
  (CC-BY 3.0, https://opengameart.org/content/gunshot-sounds); `ak47.ogg` de The Free Firearm Sound Library (CC0, https://opengameart.org/content/the-free-firearm-sound-library).
- Impactos, dolor y equipo (`assets/audio/impactos`), todo de OpenGameArt:
  `carne_bala*.wav` y `carne_perfora.wav` de «Fleshy Fight Sounds» (OGA-BY 3.0, https://opengameart.org/content/fleshy-fight-sounds);
  `casco*.ogg` (bala contra el casco) de «100 CC0 metal and wood SFX» (CC0, https://opengameart.org/content/100-cc0-metal-and-wood-sfx);
  `dolor*.wav`, `muerte*.wav`, `chaleco.wav` y `sin_balas.wav` de «FPS Placeholder Sounds» (CC-BY 3.0, https://opengameart.org/content/fps-placeholder-sounds);
  `cerrojo_awp.wav` de «Handling Guns» (CC-BY-SA 3.0, https://opengameart.org/content/handling-guns).
  Los disparos llevan además una reverberación de campo abierto generada en tiempo real (`js/sfx_2_0_0v.js`).
- Resto (`assets/audio/sfx`): [Mixkit](https://mixkit.co/free-sound-effects/) (licencia Mixkit: uso libre, sin atribución obligatoria; no se pueden redistribuir como archivos sueltos).

## Música
La música orquestal de las cinemáticas se genera en tiempo real con WebAudio (`js/historia_2_0_0v.js`).

## Mapas, armas, cuchillo, personajes, granadas y caja
Archivos `.glb` aportados por el equipo en `game-client/assets` (ver README.md).

## Decoración del desembarco (`game-client/assets/WW2/Decoraciones`)
- `erizo_checo.glb` («Normandy landings obstruction») y `caja_municion.glb` («WW2 Ammo box») de Carwyn Pelley, CC-BY 3.0, vía Poly Pizza.
- `sacos_arena.glb` («Sack Trench») de Quaternius, dominio público, vía Poly Pizza.

## Spawns y sitios (`game-client/js/zonas_2_0_0v.js`)
Las posiciones de spawn T/CT, los sitios A/B de Dust II y las zonas de rehenes de Italy y Office salen de los archivos de overview oficiales de
Counter-Strike (`CTSpawn`, `TSpawn`, `bombA`, `bombB`, `Hostage*`) y de los radares de [MurkyYT/cs2-map-icons](https://github.com/MurkyYT/cs2-map-icons).
Cada modelo `.glb` se ajustó sobre su radar (escala y desplazamiento) para convertir esas coordenadas al mundo del juego. Los radares no se incluyen en el repositorio.
