# Créditos y licencias

## Modo historia (`game-client/assets/WW2`)
Modelos y fotografías aportados por el equipo: lancha Higgins LCVP, acorazado Bismarck, bombardero, soldado alemán, MP-40 en primera persona y las tres fotos
de contexto. Se usan tal cual en la cinemática (las versiones `optimizados/` solo reducen la resolución de las texturas). Revisa la licencia de cada modelo
en su página de origen antes de publicar el juego.

## Locución (`game-client/assets/historia/audio/cN_M.wav`)
Voz neuronal `es_MX-claude-high` de [Piper](https://github.com/rhasspy/piper) (MIT; modelo Apache-2.0, https://huggingface.co/rhasspy/piper-voices),
generada sin conexión a partir de `assets/historia/guion.json`. Es voz sintética; para una voz humana usa `herramientas/grabar-locucion_2_0_0v.html`.

## Sonido
El juego no reproduce ningún sonido (efectos, ambiente ni música); se eliminaron todos los archivos de audio. La locución de la campaña (`assets/historia/audio`) se conserva solo para marcar la duración de cada plano y va silenciada.

## Mapas, armas, cuchillo, personajes, granadas y caja
Archivos `.glb` aportados por el equipo en `game-client/assets` (ver README.md).

## Decoración del desembarco (`game-client/assets/WW2/Decoraciones`)
- `erizo_checo.glb` («Normandy landings obstruction») y `caja_municion.glb` («WW2 Ammo box») de Carwyn Pelley, CC-BY 3.0, vía Poly Pizza.
- `sacos_arena.glb` («Sack Trench») de Quaternius, dominio público, vía Poly Pizza.

## Spawns y sitios (`game-client/js/zonas_2_0_0v.js`)
Las posiciones de spawn T/CT, los sitios A/B de Dust II y las zonas de rehenes de Italy y Office salen de los archivos de overview oficiales de
Counter-Strike (`CTSpawn`, `TSpawn`, `bombA`, `bombB`, `Hostage*`) y de los radares de [MurkyYT/cs2-map-icons](https://github.com/MurkyYT/cs2-map-icons).
Cada modelo `.glb` se ajustó sobre su radar (escala y desplazamiento) para convertir esas coordenadas al mundo del juego. Los radares no se incluyen en el repositorio.

- Mirage (cs_mirage_opt.glb, game-client/js/mirage_2_0_0v.js): modelo original del usuario (mirage_cs2_fps.glb, sin texturas), fusionado en 86 bloques con herramientas/preparar-mirage_2_0_0v.html; los detalles de revoque, piedra, baldosas, tejas y madera los genera el shader del juego.
