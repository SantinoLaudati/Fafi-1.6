# Créditos y licencias

## Modelos 3D del modo historia (`game-client/assets/historia/`)
Descargados de [Poly Pizza](https://poly.pizza). Las licencias CC-BY exigen mencionar al autor.

| Archivo | Modelo | Autor | Licencia | Origen |
|---|---|---|---|---|
| `soldado_swat.glb` | SWAT (teñido en verde oliva en código) | Quaternius | CC0 / dominio público | https://poly.pizza/m/Btfn3G5Xv4 |
| `sacos_arena.glb` | Sack Trench Small | Quaternius | CC0 / dominio público | https://poly.pizza/m/iHyRewQQcN |
| `fusil_cerrojo.glb` | Rifle | joney_lol | CC-BY 3.0 | https://poly.pizza/m/b9m2lLcLV5 |
| `destructor.glb` | low poly battleship | angelo raffaele Catalano | CC-BY 3.0 | https://poly.pizza/m/cqV6mUkn7Ow |
| `acorazado.glb` | Simple Battleship | Thomas de Rivaz | CC-BY 3.0 | https://poly.pizza/m/aYAmfkUYZjg |
| `carguero.glb` | Container Ship | Alex Safayan | CC-BY 3.0 | https://poly.pizza/m/3AmDGcCu6Ll |
| `avion.glb` | Aeroplane | Gilang Romadhan | CC-BY 3.0 | https://poly.pizza/m/9VeIc0cybp4 |

Los colores se modifican en código (`js/modelos.js`) para dar un aspecto militar de 1944. Las lanchas LCVP, erizos checos, búnkeres y
carros destruidos de la cinemática son geometría propia hecha en código.

## Disparos de armas (`game-client/assets/audio/armas/`)
Grabaciones reales de tiro al blanco de OpenGameArt: `pistola_cz.wav`, `fusil_mosin.wav`, `fusil_sks.wav`, `escopeta.wav` de Vincent Sevedge
(CC-BY 3.0, https://opengameart.org/content/gunshot-sounds) y `ak47.ogg` de The Free Firearm Sound Library (CC0, https://opengameart.org/content/the-free-firearm-sound-library).
Cada disparo se recorta de la grabación (ver `clips` en `js/sfx.js`).

## Efectos de sonido (`game-client/assets/audio/sfx/`)
Grabaciones de [Mixkit](https://mixkit.co/free-sound-effects/) (licencia Mixkit: uso libre, incluido comercial, sin atribución obligatoria;
no se pueden redistribuir como archivos sueltos). Se reproducen con `js/sfx.js`.

## Narrador (`game-client/assets/historia/audio/narr_NN.wav`)
Locución masculina en español generada sin conexión con la voz neuronal `es_MX-claude-high` de [Piper](https://github.com/rhasspy/piper) (MIT; modelo Apache-2.0,
https://huggingface.co/rhasspy/piper-voices). Textos en `assets/historia/narracion.tsv` (`herramientas/generar-voz.ps1` generaba la versión anterior con «Microsoft Pablo»). Es voz sintética: si quieres un locutor humano,
graba las 13 frases y sustituye los `.wav` conservando los nombres; el juego no necesita más cambios.

## Música
La música orquestal de la cinemática se genera en tiempo real con WebAudio (`js/historia.js`); no usa grabaciones.

## Mapas, armas, cuchillo, personajes y granadas
Archivos `.glb` aportados por el equipo en `game-client/assets` (ver README.md).
