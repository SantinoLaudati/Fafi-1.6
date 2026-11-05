// ZONAS DEL MODO DEFUSE (por mapa). Coordenadas del mundo del juego (x, z), radio r en metros.
//   t  = zona de aparición de los terroristas (también su zona de compra)
//   ct = zona de aparición de los antiterroristas (zona de compra CT)
//   A / B = sitios de la bomba (se puede plantar/desactivar dentro del círculo)
//
// Origen de los datos: los archivos de overview oficiales de Counter-Strike (CTSpawn/TSpawn/bombA/bombB/Hostage*
// y las zonas de compra de los radares). Se pasaron de coordenadas de radar a las del modelo ajustando cada GLB
// sobre su radar (escala y desplazamiento), y se comprobó superponiéndolos. Ver CREDITS.md.
//  - Dust II (de_dust2): spawn T abajo-centro, spawn CT arriba entre B y A, sitio A arriba-derecha y B arriba-izquierda.
//  - Italy y Office son mapas de rehenes (no existen sitios de bomba originales): T = spawn de los terroristas
//    (junto a los rehenes), CT = spawn de los antiterroristas, y los sitios A/B se ponen en los cruces principales
//    del mapa (el rehén original está pegado al spawn T, así que se eligieron puntos a distancias parecidas para ambos bandos).
// Si un mapa está en `null`, las zonas se calculan solas (extremos del mapa + las dos áreas más abiertas).
// Para ajustarlas: en partida pulsa F8 parado en el punto que quieras: copia "{ x:.., z:.., y:.., r:5 }".
export const ZONAS = {
  dust2: {   // Dust 2 (assets/Mapas para tt vs ct/de_dust2_-_cs_map.glb), normalizado a 64 m
    t:  { x:  -5.0, y:  0.2, z:  24.2, r: 5.0 },     // T spawn (sur, junto a la zona de compra T del radar)
    ct: { x:   7.6, y: -2.9, z: -14.8, r: 4.5 },     // CT spawn (norte, planta baja techada bajo la plataforma, a la derecha de B y a la izquierda de A)
    A:  { x:  17.9, y: -0.2, z: -16.9, r: 4.5 },     // sitio A (noreste, plataforma al final de Long A / Catwalk)
    B:  { x: -15.1, y: -1.3, z: -19.4, r: 4.5 }      // sitio B (noroeste, tras los túneles)
  },
  italy: {   // cs_italy (radar orientado norte arriba): CT entra por el sur, T está al norte junto a los rehenes
    t:  { x:   7.0, y: -1.9, z: -30.0, r: 4.0 },     // T spawn (norte, esquina noreste)
    ct: { x:  -7.5, y: -5.4, z:  30.5, r: 4.0 },     // CT spawn (sur, final del embudo en V; ahí está la zona de rescate)
    A:  { x:  -4.3, y: -4.1, z: -17.7, r: 4.5 },     // sitio A: casa de los rehenes (Hostage1/2 del overview)
    B:  { x:  12.7, y: -4.2, z:   9.9, r: 5.0 }      // sitio B: plaza del mercado (cruce central)
  },
  office: {  // cs_office: T dentro del edificio (noreste), CT fuera en el aparcamiento (suroeste)
    t:  { x:  20.4, y:  2.4, z: -16.7, r: 4.5 },     // T spawn (interior noreste)
    ct: { x: -18.0, y: -0.1, z:  22.2, r: 5.0 },     // CT spawn (patio / aparcamiento suroeste)
    A:  { x:   3.5, y:  2.4, z:   3.7, r: 4.5 },     // sitio A: cruce central de pasillos (a ~31 m del spawn T y ~38 m del CT)
    B:  { x:  -6.0, y:  2.4, z:  -5.8, r: 4.5 }      // sitio B: oficinas del ala oeste (a ~35 m del T y ~53 m del CT)
  }
};
