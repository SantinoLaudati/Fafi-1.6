// ZONAS DEL MODO DEFUSE (por mapa). Coordenadas del mundo del juego (x, z), radio r en metros.
//   t  = zona de aparición de los terroristas (también su zona de compra)
//   ct = zona de aparición de los antiterroristas (zona de compra CT)
//   A / B = sitios de la bomba (se puede plantar/desactivar dentro del círculo)
// Si un mapa está en `null`, las zonas se calculan solas (extremos del mapa + las dos áreas más abiertas).
// Para ajustarlas: en partida pulsa F8 parado en el punto que quieras: copia "{ x:.., z:.., y:.., r:5 }".
export const ZONAS = {
  dust2: {   // Dust 2 (assets/Mapas para tt vs ct/de_dust2_-_cs_map.glb), normalizado a 64 m
    t:  { x: -17.0, z: 22.0,  r: 4.5 },     // T spawn (suroeste)
    ct: { x:  -5.0, z: -15.5, r: 4.5 },     // CT spawn (norte-centro, entre A y B; el centro/mid sale por el sur)
    A:  { x:  16.0, z: -15.5, r: 5.5 },     // sitio A (noreste, final de Long A)
    B:  { x: -15.0, z: -18.0, r: 5.5 }      // sitio B (noroeste)
  },
  italy: {   // cs_italy: callejones estrechos; T entra por la calle sur, CT sale del patio norte
    t:  { x:  -7.0, y: -5.4, z:  26.0, r: 4.0 },     // T spawn (calle sur)
    ct: { x:  -6.0, y: -4.1, z: -30.0, r: 4.0 },     // CT spawn (norte)
    A:  { x:   9.0, y: -4.1, z:   5.0, r: 5.5 },     // sitio A (patio de la fuente, este)
    B:  { x: -13.0, y: -4.2, z: -14.0, r: 4.5 }      // sitio B (calle oeste, cruce con la calle del norte)
  },
  office: {  // cs_office: la planta alta (y≈2.4) es el interior; T entra por el patio suroeste
    t:  { x: -16.0, y: -0.1, z:  16.0, r: 4.5 },     // T spawn (patio suroeste, nieve)
    ct: { x:  14.0, y:  2.4, z: -16.3, r: 4.0 },     // CT spawn (interior norte)
    A:  { x:  18.0, y:  2.4, z:  -4.0, r: 5.0 },     // sitio A (ala este del interior)
    B:  { x:  -4.0, y:  2.4, z:  -6.0, r: 5.0 }      // sitio B (ala oeste del interior)
  }
};
