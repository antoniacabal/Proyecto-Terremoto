// Indice
    // 0. Imports
    // 1. Paleta y materiales
    // 2. Espacios
    // 3. Colisiones
    // 4. Utilidades de decoración
    // 5. Deformación de la ciudad y pasto
    // 6. Capas de la ciudad
    // 7. Cuarto (segundo piso)
    // 8. Planta baja: cocina, escaleras, comedor y sala
    // 9. Calle (en L: sale de la casa y gira hacia la universidad)
    // 10. Interior del MIO
    // 11. Objetos interactivos
    // 12. Fondo y tema de color
    // 13. Calle eterna
    // 14. Actualización por cuadro

// 0. Imports
import * as THREE from 'three'
import { scene, ambient, sun } from './scene.js'
import { CONFIG, runtime } from './config.js'
const W = CONFIG.world, HX = W.homeX

// 1. Paleta y materiales: cada objeto tiene un color en calma y otro en tensión
const themed = []
const mat = (calm, tense, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: calm, ...o })
    themed.push({ m, a: new THREE.Color(calm), b: new THREE.Color(tense) }); return m
}

// TEMP_*: sustituir cada capa por las ilustraciones/modelos definitivos
const root = new THREE.Group(); scene.add(root)

// 2. Espacios: el cuarto, la planta baja, la calle y el interior del MIO son espacios independientes (setSpace muestra el actual)
const GROUPS = { HOUSE: new THREE.Group(), HOME: new THREE.Group(), STREET: new THREE.Group(), BUS: new THREE.Group() }
root.add(...Object.values(GROUPS))
export const spaces = GROUPS
export const SEATS = [] // asientos del MIO donde se puede sentar el personaje (los NPCs ocupan algunos)
let curName = 'HOUSE', cur = GROUPS.HOUSE
const into = (name) => { curName = name; cur = GROUPS[name] }
export function setSpace(name) { // desde la calle, la casa de Gabriela es una más de la fila (se construye en la sección 9)
    runtime.space = name; Object.entries(GROUPS).forEach(([k, g]) => g.visible = k === name)
}

const box = (w, h, d, x, y, z, calm, tense, parent = cur) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(calm, tense)); m.position.set(x, y, z); parent.add(m); return m }

// 3. Colisiones: por espacio. Cada rectángulo es [x0, x1, z0, z1]
const EXT = [W.uniX - 3, W.uniX + 3, W.uniGateZ, W.uniGateZ] // tramo extra de la calle eterna (crece con la ansiedad)
export const STREET_X0 = -30 // la calle 1 sigue hacia la izquierda de la casa de Gabriela hasta una valla de obra
export const HOME_DOOR = { x: -3.5, z: -8 } // casa de Gabriela en la fila de casas de la calle 1 (su puerta mira a la calle)
const PATH = [HOME_DOOR.x - 0.7, HOME_DOOR.x + 0.7, HOME_DOOR.z + 1.6, -3]  // caminito de la puerta al andén
const RECTS = {
    HOUSE: [[-8.4, -0.15, -3.05, 3.05], [-5.7, -4.3, 2.9, 3.7]],                 // cuarto + hueco de la puerta (pared invisible del frente)
    HOME: [[HX - 6.4, HX + 6.2, -3.9, 3.9], [HX + 6.0, HX + 6.9, -0.85, 0.85]],  // planta baja + puerta principal (pared invisible de la derecha)
    STREET: [[STREET_X0, 46, -3, 3], [W.uniX - 3, W.uniX + 3, W.uniGateZ, 3], EXT, PATH], // calle 1 (hacia la derecha) + calle 2 (gira hacia la universidad) + caminito de la casa
    BUS: [[W.busInteriorX - 5.6, W.busInteriorX + 5.6, -1.9, 1.9]]
}
const PAD = 0.3, SOLIDS = []
const solid = (w, d, x, z, active, space = curName) => SOLIDS.push({ space, x, z, hw: w / 2 + PAD, hd: d / 2 + PAD, active })
const furn = (w, h, d, x, y, z, calm, tense, active) => { solid(w, d, x, z, active); return box(w, h, d, x, y, z, calm, tense) }
// Pasto a los lados de la calle: solo se puede pisar durante el minijuego del Earthing
// (el caminito de la casa de Gabriela parte en dos el pasto de abajo de la calle 1)
const GRASS_STRIPS = [[STREET_X0, PATH[0], -6.3, -3], [PATH[1], 40, -6.3, -3], [STREET_X0, 46, 3, 6.5], [36.8, 40, W.uniGateZ, -3], [46, 49.3, W.uniGateZ, 3]]
const GRASS_TARGETS = [[STREET_X0, PATH[0] - 0.3, -6.3, -3.5], [PATH[1] + 0.3, 40, -6.3, -3.5], [STREET_X0, 46, 3.5, 6.5], [36.8, 39.5, W.uniGateZ, -3.5], [46.5, 49.3, W.uniGateZ, 3]] // un poco hacia adentro del pasto (para la flecha)
let grassWalk = false
const inRect = ([x0, x1, z0, z1], x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1
export const walkableIn = (sp, x, z) => { // se puede preguntar por cualquier espacio (los NPCs lo usan)
    return (RECTS[sp].some(r => inRect(r, x, z)) || (grassWalk && sp === 'STREET' && GRASS_STRIPS.some(r => inRect(r, x, z)))) &&
        !SOLIDS.some(s => s.space === sp && (!s.active || s.active()) && Math.abs(x - s.x) < s.hw && Math.abs(z - s.z) < s.hd)
}
export const walkable = (x, z) => walkableIn(runtime.space, x, z)
// pisando el pasto de los lados de la calle (con un margen: pararse en el borde del andén ya cuenta)
const GRASS_EDGE = 0.45
export const onGrass = (x, z) => runtime.space === 'STREET' && GRASS_STRIPS.some(([x0, x1, z0, z1]) => inRect([x0 - GRASS_EDGE, x1 + GRASS_EDGE, z0 - GRASS_EDGE, z1 + GRASS_EDGE], x, z)) && !inRect(PATH, x, z)
const nearestIn = (rects, x, z) => {
    let best = null, bd = Infinity
    rects.forEach(([x0, x1, z0, z1]) => { const px = Math.min(x1, Math.max(x0, x)), pz = Math.min(z1, Math.max(z0, z)), d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = { x: px, z: pz } } })
    return best
}
const clear = (x, z, tx, tz) => { for (let i = 1; i <= 12; i++) { const k = i / 12; if (!walkable(x + (tx - x) * k, z + (tz - z) * k)) return false } return true } // camino recto sin obstáculos (p. ej. el MIO)
export const nearestGrass = (x, z) => { // el pasto más cercano al que se puede llegar en línea recta; si ninguno, el más cercano
    const opts = GRASS_TARGETS.map(r => nearestIn([r], x, z)).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))
    const p = opts.find(o => clear(x, z, o.x, o.z)) || opts[0]; return [p.x, p.z]
}
export const pullBack = (x, z) => {
    const sp = runtime.space, rects = RECTS[sp].concat(grassWalk && sp === 'STREET' ? GRASS_STRIPS : [])
    if (rects.some(r => inRect(r, x, z))) return null
    return nearestIn(rects, x, z)
}
export function setGrass(v) { grassWalk = v; runtime.grassGreen = v } // Earthing: pinta el pasto de verde y permite caminar sobre él

// 4. Utilidades de decoración: aleatorio con semilla: el mapa es igual en cada carga
const rng = (seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)(7)
const rr = (a, b) => a + rng() * (b - a)
const scatter = (geo, calm, tense, pts, parent = cur) => { // muchas copias de una forma en un solo draw call: [x, y, z, sx, sy, sz, rotY]
    const im = new THREE.InstancedMesh(geo, mat(calm, tense), pts.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
    pts.forEach(([x, y, z, sx = 1, sy = 1, sz = 1, ry = 0], i) => im.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(0, ry, 0)), new THREE.Vector3(sx, sy, sz))))
    im.frustumCulled = false; parent.add(im); return im
}
// Delineado amarillo (--color-principal) de los objetos con los que se interactúa
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0xf2c063, side: THREE.BackSide, transparent: true, visible: false })
export const setHighlight = (v) => { OUTLINE.visible = v } // los objetos solo brillan después de levantarte
const outlined = (mesh, w, h, d, pad = 0.14) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w + pad, h + pad, d + pad), OUTLINE); mesh.add(o); mesh.userData.outline = o; return mesh }
// Árboles (calle) y matas (casa)
const trunkMat = mat('#A16A49', '#201826'), blossomMat = mat('#A6869B', '#790A0E'), leafMat = mat('#799180', '#482642')
const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 2, 6), blobGeo = new THREE.IcosahedronGeometry(1, 0)
const tree = (x, z) => {
    const t = new THREE.Group(), trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 1; t.add(trunk)
    ;[[0, 2.7, 0, 1.2], [0.8, 2.3, 0.2, 0.85], [-0.7, 2.4, -0.3, 0.9]].forEach(([bx, by, bz, r]) => { const b = new THREE.Mesh(blobGeo, blossomMat); b.position.set(bx, by, bz); b.scale.setScalar(r); t.add(b) })
    t.position.set(x, -0.15, z); t.scale.setScalar(rr(0.9, 1.3)); t.rotation.y = rr(0, 6); cur.add(t)
}

// 5. Deformación de la ciudad y pasto: la ciudad se deforma con la ansiedad; el pasto se pinta de verde en el Earthing
const warp = []
const warpable = (g, ph) => { warp.push({ g, x: g.position.x, y: g.position.y, ph }); return g }
const grass = []
const grassOf = (mesh, calm, tense, green) => grass.push({ m: mesh.material, a: new THREE.Color(calm), b: new THREE.Color(tense), g: new THREE.Color(green) })

// 6. Capas de la ciudad: plano medio, infraestructura y elementos frontales (versión destruida / reconstruida)
const RESTORED = [['#F2C063', '#482642'], ['#BF895A', '#580213'], ['#D8C8AE', '#71708A']]
const sets = []
function makeLayer(name, items) {
    const mk = (destroyed) => {
        const g = new THREE.Group(); g.name = name + (destroyed ? '_DESTROYED' : '_RESTORED')
        items.forEach(([x, z, w, h, d], i) => {
            const [c, t] = destroyed ? ['#71708A', '#201826'] : RESTORED[i % 3]
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, t, { transparent: true }))
            m.position.set(x, destroyed ? h * 0.35 : h / 2, z)
            if (destroyed) { m.scale.y = 0.7; m.rotation.z = (i % 2 ? 1 : -1) * 0.1; m.rotation.x = 0.05 * (i % 3) }
            g.add(m)
        }); cur.add(g); return g
    }
    sets.push({ destroyed: mk(true), restored: mk(false) })
}
const row = (n, x0, dx, f) => Array.from({ length: n }, (_, i) => f(x0 + i * dx, i))

// 7. Cuarto (segundo piso), según el plano: armario y escritorio contra la pared izquierda, cama contra la pared del fondo,
//    alfombra al centro y la puerta en la pared invisible del frente (lleva a las escaleras)
into('HOUSE')
box(8.8, 0.3, 6.6, -4.2, -0.15, 0, '#BF895A', '#71708A')       // piso
box(9.0, 0.9, 6.8, -4.2, -0.75, 0, '#A16A49', '#201826')       // base gruesa (borde visible)
for (let i = 0; i < 5; i++) box(8.8, 0.03, 0.05, -4.2, 0.012, -2.5 + i * 1.25, '#A16A49', '#201826') // juntas de tablones
box(3, 0.04, 2.4, -4.4, 0.02, 0.4, '#A6869B', '#482642')       // alfombra
box(8.8, 2.8, 0.2, -4.2, 1.4, -3.3, '#A6869B', '#482642')      // pared fondo
box(0.2, 2.8, 6.6, -8.6, 1.4, 0, '#799180', '#580213')         // pared izquierda
box(9.0, 0.25, 0.4, -4.2, 2.9, -3.3, '#A16A49', '#201826')     // viga superior fondo
box(0.4, 0.25, 6.8, -8.6, 2.9, 0, '#A16A49', '#201826')        // viga superior izquierda
box(0.5, 3.2, 0.5, -8.6, 1.5, -3.3, '#BF895A', '#580213')      // poste esquina
box(0.5, 3.2, 0.5, 0.1, 1.5, -3.3, '#BF895A', '#580213')       // poste derecho del fondo
box(0.5, 3.2, 0.5, -8.6, 1.5, 3.3, '#BF895A', '#580213')       // poste izquierdo frontal
box(1.6, 1.0, 0.06, -4.6, 1.7, -3.18, '#8296B7', '#201826')    // ventana
box(0.3, 2.4, 0.3, -5.9, 1.2, 3.3, '#A16A49', '#201826'); box(0.3, 2.4, 0.3, -4.1, 1.2, 3.3, '#A16A49', '#201826') // puerta del cuarto
box(2.1, 0.3, 0.3, -5, 2.55, 3.3, '#A16A49', '#201826')        // dintel
furn(1.4, 0.6, 2.2, -1.5, 0.3, -2.2, '#BF895A', '#790A0E')     // cama
box(1.5, 1.1, 0.15, -1.5, 0.55, -3.22, '#A16A49', '#201826')   // cabecero
box(1.0, 0.15, 0.5, -1.5, 0.68, -2.85, '#D8C8AE', '#71708A')   // almohada
box(1.44, 0.08, 1.3, -1.5, 0.64, -1.65, '#A6869B', '#482642')  // cobija
furn(0.8, 0.8, 1.8, -7.9, 0.4, -1.6, '#A16A49', '#580213')     // escritorio
box(0.12, 0.5, 0.12, -8.05, 1.05, -2.25, '#D8C8AE', '#71708A'); box(0.35, 0.14, 0.35, -8.0, 1.32, -2.25, '#F2C063', '#580213') // lámpara
furn(0.5, 0.45, 0.5, -6.9, 0.225, -1.6, '#BF895A', '#482642'); box(0.08, 0.6, 0.5, -6.66, 0.75, -1.6, '#BF895A', '#482642') // silla
const wardrobe = outlined(furn(0.9, 2.3, 1.8, -7.95, 1.15, 2.2, '#BF895A', '#580213'), 0.9, 2.3, 1.8) // armario (vestirse)
box(0.03, 2.1, 0.04, -7.49, 1.15, 2.2, '#A16A49', '#201826')   // división de las puertas del armario
box(0.06, 0.3, 0.06, -7.47, 1.2, 1.95, '#F2C063', '#201826'); box(0.06, 0.3, 0.06, -7.47, 1.2, 2.45, '#F2C063', '#201826') // manijas
const phone = outlined(box(0.3, 0.06, 0.5, -7.9, 0.83, -1.2, '#A6869B', '#E4FFFF'), 0.3, 0.06, 0.5)   // celular sobre el escritorio
const bag = outlined(box(0.7, 0.9, 0.4, -3.6, 0.45, -2.95, '#799180', '#8296B7'), 0.7, 0.9, 0.4)     // maleta contra la pared

// 8. Planta baja, según el plano: cocina arriba a la izquierda, escaleras en el medio, comedor abajo a la izquierda,
//    sala con sofá a la derecha y la puerta principal en la pared invisible de la derecha (sale a la calle)
into('HOME')
box(13.2, 0.3, 8.4, HX, -0.15, 0, '#BF895A', '#71708A')        // piso
box(13.4, 0.9, 8.6, HX, -0.75, 0, '#A16A49', '#201826')        // base gruesa
for (let i = 0; i < 6; i++) box(13.2, 0.03, 0.05, HX, 0.012, -3.5 + i * 1.4, '#A16A49', '#201826') // tablones
box(5.6, 0.03, 3.8, HX - 3.8, 0.02, -2.2, '#D8C8AE', '#71708A') // baldosas de la cocina
box(13.2, 2.8, 0.2, HX, 1.4, -4.3, '#799180', '#482642')       // pared fondo
box(0.2, 2.8, 8.4, HX - 6.7, 1.4, 0, '#A6869B', '#580213')     // pared izquierda
box(13.4, 0.25, 0.4, HX, 2.9, -4.3, '#A16A49', '#201826'); box(0.4, 0.25, 8.6, HX - 6.7, 2.9, 0, '#A16A49', '#201826') // vigas
box(0.5, 3.2, 0.5, HX - 6.7, 1.5, -4.3, '#BF895A', '#580213'); box(0.5, 3.2, 0.5, HX + 6.6, 1.5, -4.3, '#BF895A', '#580213'); box(0.5, 3.2, 0.5, HX - 6.7, 1.5, 4.2, '#BF895A', '#580213') // postes
box(0.06, 1.0, 1.6, HX - 6.58, 1.6, 2.3, '#8296B7', '#201826')  // ventana del comedor
// Cocina
furn(4.6, 0.9, 0.8, HX - 4.3, 0.45, -3.75, '#A16A49', '#580213'); box(4.6, 0.06, 0.85, HX - 4.3, 0.93, -3.75, '#D8C8AE', '#71708A') // mesón del fondo
furn(0.8, 0.9, 2.4, HX - 6.15, 0.45, -2.15, '#A16A49', '#580213'); box(0.85, 0.06, 2.4, HX - 6.15, 0.93, -2.15, '#D8C8AE', '#71708A') // mesón lateral
box(4.6, 0.7, 0.4, HX - 4.3, 2.05, -4.0, '#BF895A', '#580213')  // alacenas
box(0.9, 0.04, 0.6, HX - 3.2, 0.97, -3.75, '#201826', '#201826') // estufa
scatter(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 10), '#71708A', '#201826', [[HX - 3.42, 1.0, -3.9], [HX - 2.98, 1.0, -3.9], [HX - 3.42, 1.0, -3.6], [HX - 2.98, 1.0, -3.6]])
furn(0.9, 2.1, 0.8, HX - 1.4, 1.05, -3.75, '#D8C8AE', '#71708A') // nevera
furn(2.4, 0.9, 0.9, HX - 4.2, 0.45, -1.0, '#A16A49', '#580213'); box(2.6, 0.06, 1.0, HX - 4.2, 0.93, -1.0, '#D8C8AE', '#71708A') // isla
const breakfast = new THREE.Group(); breakfast.position.set(HX - 3.4, 0.96, -0.95); cur.add(breakfast) // desayuno sobre la isla (mamá te lo da)
{
    const add = (geo, c, t, x, y, z) => { const m = new THREE.Mesh(geo, mat(c, t)); m.position.set(x, y, z); breakfast.add(m) }
    add(new THREE.CylinderGeometry(0.32, 0.28, 0.04, 16), '#E4FFFF', '#71708A', 0, 0.02, 0)       // plato
    add(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 12), '#D8C8AE', '#71708A', -0.1, 0.06, 0.05) // arepa
    add(new THREE.SphereGeometry(0.07, 8, 6), '#F2C063', '#790A0E', 0.12, 0.07, -0.05)           // huevo
    add(new THREE.CylinderGeometry(0.1, 0.08, 0.22, 10), '#BF4E24', '#580213', 0.48, 0.11, 0.05)  // chocolate
    const o = new THREE.Group(); o.visible = false; breakfast.add(o); breakfast.userData.outline = o // brilla solo cuando toca comer (main.js lo enciende)
    ;[[0.42, 0.38, 0.18, 0, 0.05, 0], [0.17, 0.15, 0.32, 0.48, 0.11, 0.05]].forEach(([rt, rb, h, x, y, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), OUTLINE); m.position.set(x, y, z); o.add(m) })
}
// Escaleras (suben hacia el cuarto) y muro que las separa de la sala
for (let i = 0; i < 8; i++) { const h = 0.3 * (i + 1); box(1.8, h, 0.36, HX + 0.4, h / 2, -1.2 - i * 0.36, '#BF895A', '#580213') }
solid(1.9, 2.9, HX + 0.4, -2.55)
box(0.12, 2.8, 3.1, HX + 1.42, 1.4, -2.65, '#799180', '#482642')
// Comedor
furn(2.4, 0.75, 1.3, HX - 4.2, 0.375, 2.3, '#A16A49', '#580213')
;[[-4.9, 1.3, 0], [-3.5, 1.3, 0], [-4.9, 3.3, 1], [-3.5, 3.3, 1]].forEach(([dx, z, back]) => { furn(0.5, 0.45, 0.5, HX + dx, 0.225, z, '#BF895A', '#482642'); box(0.5, 0.6, 0.08, HX + dx, 0.75, z + (back ? 0.22 : -0.22), '#BF895A', '#482642') })
scatter(new THREE.CylinderGeometry(0.2, 0.18, 0.03, 12), '#E4FFFF', '#71708A', [[HX - 4.9, 0.77, 1.95], [HX - 3.5, 0.77, 1.95], [HX - 4.9, 0.77, 2.65], [HX - 3.5, 0.77, 2.65]])
// Sala
box(4.2, 0.04, 3.2, HX + 4, 0.02, 0.8, '#A6869B', '#482642')    // alfombra
furn(2.8, 0.55, 0.6, HX + 4, 0.275, -3.85, '#A16A49', '#201826'); box(2, 1.1, 0.1, HX + 4, 1.15, -4.05, '#201826', '#201826') // mueble y televisor
furn(1.2, 0.4, 0.7, HX + 4, 0.2, -0.6, '#BF895A', '#580213')    // mesa de centro
furn(3, 0.5, 1.1, HX + 4, 0.25, 2.0, '#799180', '#482642'); box(3, 0.8, 0.3, HX + 4, 0.65, 2.6, '#799180', '#482642') // sofá
box(0.3, 0.7, 1.1, HX + 2.65, 0.35, 2.0, '#799180', '#482642'); box(0.3, 0.7, 1.1, HX + 5.35, 0.35, 2.0, '#799180', '#482642') // brazos del sofá
furn(1.1, 0.5, 1.1, HX + 1.2, 0.25, 2.6, '#BF4E24', '#580213'); box(1.1, 0.7, 0.25, HX + 1.2, 0.6, 3.1, '#BF4E24', '#580213') // sillón
box(0.5, 0.5, 0.5, HX + 6.0, 0.25, 3.4, '#A16A49', '#201826'); { const p = new THREE.Mesh(blobGeo, leafMat); p.position.set(HX + 6.0, 0.95, 3.4); p.scale.setScalar(0.5); cur.add(p) } // matera
// Puerta principal
box(0.3, 2.4, 0.3, HX + 6.6, 1.2, -1.1, '#A16A49', '#201826'); box(0.3, 2.4, 0.3, HX + 6.6, 1.2, 1.1, '#A16A49', '#201826'); box(0.3, 0.3, 2.5, HX + 6.6, 2.55, 0, '#A16A49', '#201826')
box(1, 0.03, 1.6, HX + 5.9, 0.02, 0, '#A16A49', '#201826')      // tapete de la entrada
solid(0.7, 0.7, HX - 2, -2.2)                                      // mamá (el modelo vive en npcs.js)

// 9. Calle: isla flotante con campo. La calle pasa frente a la casa de Gabriela hacia la derecha y luego gira hacia la universidad
into('STREET')
const UX = W.uniX, GATE = W.uniGateZ
const field = box(116, 0.5, 116, 16, -0.4, -36, '#799180', '#482642')    // campo (superficie y = -0.15): llega más allá de la valla para que no se vea el vacío
box(114.6, 0.9, 114.8, 16, -1.1, -36, '#A16A49', '#201826')             // base de tierra flotante
box(46.1 + 42, 0.1, 6, (46.1 - 42) / 2, -0.05, 0, '#D8C8AE', '#71708A')  // calle 1: sigue detrás de la valla hasta el borde y pasa frente a la casa hacia la derecha
box(6, 0.1, 41, UX, -0.045, (GATE + 3) / 2, '#D8C8AE', '#71708A')        // calle 2: gira hacia la universidad
const roadExt = box(6, 0.1, 1, UX, -0.045, GATE, '#D8C8AE', '#71708A'); roadExt.visible = false // tramo de la calle eterna
box(PATH[1] - PATH[0], 0.06, PATH[3] - PATH[2], HOME_DOOR.x, -0.07, (PATH[2] + PATH[3]) / 2, '#D8C8AE', '#71708A') // caminito de la casa de Gabriela

const curbs = []
for (let x = STREET_X0 + 0.4; x < 46; x += 1.3) { if (x < 39.5 && (x < PATH[0] - 0.4 || x > PATH[1] + 0.4)) curbs.push([x, 0.05, -3.15]); curbs.push([x, 0.05, 3.15]) } // el andén se abre frente al caminito
for (let z = -3.6; z > GATE; z -= 1.3) curbs.push([UX - 3.15, 0.05, z, 1, 1, 1, Math.PI / 2])
for (let z = 2.5; z > GATE; z -= 1.3) curbs.push([UX + 3.15, 0.05, z, 1, 1, 1, Math.PI / 2])
scatter(new THREE.BoxGeometry(0.8, 0.16, 0.34), '#A16A49', '#201826', curbs) // andenes
scatter(new THREE.BoxGeometry(0.8, 0.02, 0.5), '#BF895A', '#580213', Array.from({ length: 90 }, () => [rr(STREET_X0 + 1, 45), 0.01, rr(-2.6, 2.6), 1, 1, 1, rr(-.2, .2)])
    .concat(Array.from({ length: 50 }, () => [rr(UX - 2.6, UX + 2.6), 0.01, rr(GATE + 0.5, -3), 1, 1, 1, Math.PI / 2 + rr(-.2, .2)]))) // manchas del camino

// Valla de obra donde se cierra la calle 1 (después del sismo): dos burros con franjas y una señal
{
    const VX = STREET_X0 - 0.3
    ;[-1.5, 1.5].forEach(dz => {
        box(0.12, 1.1, 0.12, VX, 0.45, dz - 1.2, '#A16A49', '#201826'); box(0.12, 1.1, 0.12, VX, 0.45, dz + 1.2, '#A16A49', '#201826') // patas
        for (let k = 0; k < 5; k++) box(0.14, 0.32, 0.5, VX, 0.8, dz - 1 + k * 0.5, k % 2 ? '#E4FFFF' : '#BF4E24', k % 2 ? '#71708A' : '#580213') // tabla con franjas
    })
    box(0.1, 1.9, 0.1, VX - 0.6, 0.8, -2.6, '#71708A', '#201826'); box(0.08, 0.8, 0.8, VX - 0.6, 1.9, -2.6, '#F2C063', '#580213') // señal de "calle cerrada"
}

const DECOR = [[STREET_X0 + 0.5, PATH[0] - 0.3, -6.2, -3.6], [PATH[1] + 0.3, 39.5, -6.2, -3.6], [STREET_X0 + 0.5, 46, 3.6, 9], [36.9, 39.6, GATE + 1, -4], [46.6, 49.2, GATE + 1, 2.5], [-41, STREET_X0 - 1.5, -12, 12]] // zonas de pasto para la vegetación
const pick = () => { const a = DECOR[Math.floor(rng() * DECOR.length)]; return [rr(a[0], a[1]), rr(a[2], a[3])] }
const reeds = []; for (let k = 0; k < 140; k++) { const [x, z] = pick(); for (let j = 0; j < 3; j++) { const sy = rr(0.7, 1.4); reeds.push([x + rr(-.25, .25), -0.15 + 0.45 * sy, z + rr(-.25, .25), 1, sy, 1, 0]) } }
const reedMesh = scatter(new THREE.ConeGeometry(0.12, 0.9, 5), '#D8C8AE', '#71708A', reeds)
grassOf(field, '#799180', '#482642', '#6FA86B'); grassOf(reedMesh, '#D8C8AE', '#71708A', '#8DBE7A') // el pasto se pinta de verde en el Earthing
scatter(new THREE.SphereGeometry(0.09, 6, 4), '#F2C063', '#790A0E', Array.from({ length: 260 }, () => { const [x, z] = pick(); return [x, -0.08, z] }))
;[[9, -5], [16, -5.4], [30, -5.2], [37, -5.6], [38.3, -14], [38.2, -26], [38.4, -35], [-3, 6], [6, 8], [14, 8.5], [33, 8], [54, -12], [54, -24], [54, -33],
  [-9, -5.4], [-21, -5.6], [-27.5, -5.2], [-8, 8], [-15, 7.4], [-22, 8.6], [-28, 7.2],                       // calle 1 hacia la izquierda
  [-34, -4], [-37, 3], [-35, 9], [-39, -9], [-33, -13], [-38, 15], [-29, 14], [-18, 15], [-6, 14], [8, 15], [24, 14], // detrás de la valla y al fondo del campo
  [-14, -15], [-27, -14], [-21, -19], [-7, -16], [62, -5], [64, -20], [61, -40], [24, -50], [10, -36], [-10, -30]].forEach(([x, z]) => tree(x + rr(-.5, .5), z))

// Casas y edificios: cada uno es un grupo con su base en el origen y la puerta en su +z local (rotY la gira hacia la calle)
const HP = [['#D8C8AE', '#71708A'], ['#A6869B', '#482642'], ['#BF895A', '#580213']]
const house = (x, z, h, k, ry = 0, w = rr(5.5, 7)) => { const [c, t] = HP[k % 3], g = new THREE.Group()
    g.position.set(x, -0.15, z); g.rotation.y = ry
    box(w, h, 3, 0, h / 2, 0, c, t, g); box(w + 0.7, 0.3, 3.7, 0, h + 0.15, 0, '#A16A49', '#201826', g); box(w * 0.5, 0.5, 2.2, 0, h + 0.5, 0, '#BF895A', '#580213', g)
    box(1.1, 2, 0.12, 0, 1.0, 1.55, '#A16A49', '#201826', g); box(1.3, 0.9, 0.12, w * 0.28, h * 0.55 + 0.15, 1.55, '#8296B7', '#201826', g)
    cur.add(g); warpable(g, x * 1.7 + z) }
const building = (x, z, h, k, ry = 0) => { const [c, t] = HP[k % 3], g = new THREE.Group(), win = []
    g.position.set(x, -0.15, z); g.rotation.y = ry
    box(5.6, h, 3.4, 0, h / 2, 0, c, t, g); box(6.0, 0.3, 3.8, 0, h + 0.15, 0, '#A16A49', '#201826', g); box(1.2, 2, 0.12, 0, 1.0, 1.72, '#A16A49', '#201826', g)
    for (let f = 0; f < Math.floor((h - 2.5) / 2.2); f++) for (let k2 = -1; k2 <= 1; k2++) win.push([k2 * 1.6, 2.75 + f * 2.2, 1.72])
    if (win.length) scatter(new THREE.BoxGeometry(0.8, 0.9, 0.1), '#8296B7', '#201826', win, g) // ventanas: una malla instanciada por edificio
    cur.add(g); warpable(g, x * 1.7 + z) }
house(HOME_DOOR.x, HOME_DOOR.z, 4.2, 1, 0, 6)                                                                    // casa de Gabriela: la primera de la fila (tamaño fijo: no cambia el resto del mapa)
;[5, 12, 19, 26, 33].forEach((x, i) => i % 2 ? building(x, -8, rr(8, 11), i) : house(x, -8, rr(3.6, 5), i)) // fila de casas sobre la calle 1 (como en el plano)
;[-10.5, -17.5, -24.5].forEach((x, i) => i % 2 ? house(x, -8, rr(3.6, 5), i + 2) : building(x, -8, rr(8, 11), i + 2)) // la fila sigue a la izquierda de la casa de Gabriela
house(-34, -8, rr(3.6, 5), 0); building(-36, -17, rr(8, 11), 2)                                                  // detrás de la valla: la ciudad continúa
building(35, -19, rr(8, 11), 1, Math.PI / 2); house(35, -30, rr(3.6, 5), 2, Math.PI / 2)                       // lado izquierdo de la calle 2
;[-7, -17, -27, -35].forEach((z, i) => house(51.2, z, rr(2.4, 3.2), i, -Math.PI / 2))                           // lado derecho de la calle 2 (bajas para no tapar la calle)

// Paradero del MIO (la marca roja del plano)
box(2.6, 0.12, 1.1, W.busX - 1.8, 2.3, -3.95, '#BF4E24', '#580213'); box(0.12, 2.3, 0.12, W.busX - 3, 1.15, -3.95, '#A16A49', '#201826'); box(0.12, 2.3, 0.12, W.busX - 0.6, 1.15, -3.95, '#A16A49', '#201826')
box(2, 0.12, 0.5, W.busX - 1.8, 0.5, -4.2, '#A16A49', '#201826')

// Universidad al final de la calle 2 (se aleja cuando la calle se vuelve eterna)
const UNI_Z = GATE - 5, uniG = new THREE.Group(); uniG.position.set(UX, -0.15, UNI_Z); cur.add(uniG)
box(14, 7, 8, 0, 3.5, 0, '#799180', '#8296B7', uniG); box(15, 0.4, 9, 0, 7.2, 0, '#A16A49', '#201826', uniG)
box(4, 3, 0.2, 0, 1.5, 4.05, '#A16A49', '#201826', uniG); box(6, 0.8, 0.15, 0, 5.6, 4.1, '#F2C063', '#580213', uniG)
;[-5, -3, 3, 5].forEach(dx => box(0.6, 6.6, 0.6, dx, 3.3, 4.2, '#D8C8AE', '#71708A', uniG))
box(6, 0.3, 1.4, 0, 0.15, 4.75, '#D8C8AE', '#71708A', uniG)
box(0.3, 1.2, 9, -8.5, 0.6, 0, '#A16A49', '#201826', uniG); box(0.3, 1.2, 9, 8.5, 0.6, 0, '#A16A49', '#201826', uniG) // muros del campus
scatter(new THREE.BoxGeometry(0.9, 1, 0.1), '#8296B7', '#201826', [-6, -1.8, 1.8, 6].flatMap(x => [[x, 4.3, 4.05], [x, 6.3, 4.05]]).filter(([x, y]) => Math.abs(x) > 2.1 || y > 5), uniG)

makeLayer('MID', row(4, 4, 8, (x, i) => [x, -15, 6, 7 + (i * 3) % 5, 4]).concat(row(4, -22, -7, (z, i) => [27, z, 4, 7 + (i * 2) % 4, 6]), row(3, -30, 9, (x, i) => [x, -24, 6, 6 + (i * 3) % 5, 4])))
makeLayer('INFRA', [[-26, -3.5], [-14, -3.5], [4, -3.5], [12, -3.5], [28, -3.5], [36, -3.5], [UX - 3.4, -10], [UX - 3.4, -18], [UX - 3.4, -26], [UX - 3.4, -34]].map(([x, z]) => [x, z, 0.3, 3.5, 0.3]))
makeLayer('FRONT', row(10, -27, 7, (x, i) => [x, 6.8, 1.2 + (i % 2) * 0.6, 0.8 + (i % 3) * 0.3, 1]))

// 10. Interior del MIO: otro espacio flotando en el vacío (entras y sales por la puerta)
into('BUS')
const BX = W.busInteriorX
box(150, 0.5, 40, BX, -1.55, 0, '#799180', '#482642')             // campo bajo el MIO (ya no flota en el vacío)
box(150, 0.1, 5.2, BX, -1.27, 0, '#71708A', '#201826')             // calle por la que avanza el MIO
box(12.4, 0.3, 4.4, BX, -0.15, 0, '#D8C8AE', '#71708A')        // piso
box(12.6, 0.9, 4.6, BX, -0.75, 0, '#A16A49', '#201826')        // base gruesa
box(12.4, 0.9, 0.2, BX, 0.45, -2.2, '#2F7DAA', '#482642')      // antepecho de la pared del fondo
;[-6, -3, 0, 3, 6].forEach(dx => box(0.3, 1.5, 0.2, BX + dx, 1.65, -2.2, '#2F7DAA', '#482642')) // pilares entre ventanas (los huecos dejan ver la ciudad)
box(0.2, 2.4, 4.4, BX - 6.2, 1.2, 0, '#2F7DAA', '#482642')     // pared de atrás del MIO (la del frente se quitó: tapaba al conductor)
box(0.06, 0.9, 2.2, BX - 6.08, 1.55, 0, '#D8C8AE', '#71708A')  // ventana trasera
box(12.6, 0.25, 0.4, BX, 2.5, -2.2, '#A16A49', '#201826')      // viga superior fondo
box(0.4, 0.25, 4.6, BX - 6.2, 2.5, 0, '#A16A49', '#201826')    // viga superior trasera
box(0.4, 2.7, 0.4, BX + 6.2, 1.3, -2.2, '#BF895A', '#580213')  // poste esquina
box(0.4, 2.7, 0.4, BX - 6.2, 1.3, -2.2, '#BF895A', '#580213')  // poste de la puerta
;[-4.6, 4.6].forEach(dx => { box(0.25, 2.5, 0.25, BX + dx - 0.8, 1.25, 2.2, '#BF895A', '#580213'); box(0.25, 2.5, 0.25, BX + dx + 0.8, 1.25, 2.2, '#BF895A', '#580213'); box(1.85, 0.25, 0.25, BX + dx, 2.55, 2.2, '#A16A49', '#201826') }) // puertas laterales
solid(0.5, 3.6, BX + 5.8, 0)                                   // cabina: no se puede pasar al puesto del conductor
{ // volante: aro inclinado hacia el conductor, tres rayos y la columna que baja al piso
    const wheel = new THREE.Group(), rim = mat('#D8C8AE', '#71708A'); wheel.position.set(BX + 5.55, 1.0, 0); wheel.rotation.set(0, Math.PI / 2, 0); cur.add(wheel) // claro: se distingue sobre la silueta negra del conductor
    const tilt = new THREE.Group(); tilt.rotation.x = -0.5; wheel.add(tilt) // inclinado como en los buses
    tilt.add(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 24), rim))
    ;[0, 2.1, 4.2].forEach(a => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.04), rim); s.position.set(Math.sin(a) * 0.16, Math.cos(a) * 0.16, 0); s.rotation.z = -a; tilt.add(s) })
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 1.0, 8), mat('#A16A49', '#201826')); col.position.set(BX + 5.77, 0.5, 0); col.rotation.z = 0.35; cur.add(col)
}
;[-3.6, -1.2, 1.2, 3.6].forEach((dx, i) => {                     // bancas: fila del fondo y fila de adelante
    const c = i % 2 ? ['#A6869B', '#482642'] : ['#799180', '#580213']
    furn(2, 0.45, 0.7, BX + dx, 0.225, -1.55, ...c); box(2, 0.7, 0.12, BX + dx, 0.8, -1.95, ...c); SEATS.push({ x: BX + dx, z: -1.55, face: 0, taken: false })
    if (Math.abs(dx) < 3) { furn(2, 0.45, 0.7, BX + dx, 0.225, 1.55, ...c); box(2, 0.55, 0.12, BX + dx, 0.72, 1.95, ...c); SEATS.push({ x: BX + dx, z: 1.55, face: Math.PI, taken: false }) } // sin banca junto a las puertas
})
const poleMat = mat('#D8C8AE', '#71708A'), poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8)
;[-2.4, 0, 2.4].forEach(dx => { const p = new THREE.Mesh(poleGeo, poleMat); p.position.set(BX + dx, 1.15, 0); cur.add(p) })

// Ciudad que se ve por las ventanas del MIO: se desplaza para dar sensación de viaje
const CITY_P = 48, cityG = new THREE.Group(); cur.add(cityG)
box(96, 0.4, 14, BX, -0.35, -10.8, '#799180', '#482642')                 // suelo detrás del MIO
box(96, 0.05, 2.4, BX, -0.12, -4.9, '#D8C8AE', '#71708A')             // calle
const cityMats = [['#A6869B', '#482642'], ['#BF895A', '#580213'], ['#D8C8AE', '#71708A'], ['#799180', '#201826']].map(([c, t]) => mat(c, t))
const cityBlocks = []; let nb = 0; for (let x = 0; x < CITY_P; x += rr(2.4, 3.4)) cityBlocks.push([x, rr(-9, -5.8), rr(2, 3.2), nb++ % 2 ? rr(6, 10) : rr(2.4, 3.6), 2, Math.floor(rr(0, 4))])
;[0, CITY_P].forEach(off => { // dos copias seguidas: al desplazarse nunca quedan huecos
    const g = new THREE.Group(); g.position.x = off
    for (let x = 0; x < CITY_P; x += 6) { const d = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.02, 0.2), cityMats[2]); d.position.set(BX - 28 + x, -1.19, 0); g.add(d) } // rayas de la calle
    cityBlocks.forEach(([x, z, w, h, d, ci]) => {
        const b = new THREE.Group(); b.position.set(BX - 28 + x, -0.15, z)
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cityMats[ci]); m.position.y = h / 2; b.add(m)
        if (h < 4) { const rf = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5), cityMats[1]); rf.position.y = h + 0.15; b.add(rf) }
        g.add(b); warpable(b, x * 1.3 + z)
    })
    cityG.add(g)
})

// 11. Objetos interactivos: pos = donde se para el personaje · mark = dónde flota la flecha del objetivo
const V = (x, z) => new THREE.Vector3(x, 0, z)
const S = GROUPS.STREET
export const props = {
    cama: { pos: V(-1.6, 0.1), mesh: null, mark: { x: -1.5, y: 2.1, z: -2.2 } },
    armario: { pos: V(-6.6, 2.2), mesh: wardrobe, mark: { x: -7.95, y: 3.1, z: 2.2 } },
    celular: { pos: V(-6.1, -0.5), mesh: phone },
    maleta: { pos: V(-3.6, -1.9), mesh: bag },
    puerta: { pos: V(-5, 2.6), mesh: null, mark: { x: -5, y: 3.1, z: 3.3 } },
    mama: { pos: V(HX - 2, -0.5), mesh: null, mark: { x: HX - 2, y: 2.7, z: -2.2 } },
    desayuno: { pos: V(HX - 3.4, -0.5), mesh: breakfast, mark: { x: HX - 3.4, y: 1.9, z: -0.95 } },
    salida: { pos: V(HX + 5.8, 0), mesh: null, mark: { x: HX + 6.6, y: 3.0, z: 0 } },
    // MIO por fuera (temporal). rect = huella en planta (para medir la cercanía)
    bus: { pos: V(W.busX, 1), mesh: box(6, 2, 2.2, W.busX + 4, 1, -1.8, '#2F7DAA', '#482642', S),
        rect: [W.busX + 1, W.busX + 7, -2.9, -0.7], mark: { x: W.busX + 4, y: 3.1, z: -1.8 } }
}
box(5.6, 0.6, 0.05, W.busX + 4, 1.4, -0.68, '#D8C8AE', '#71708A', S) // franja de ventanas del MIO
solid(0.7, 0.4, -3.6, -2.95, () => props.maleta.mesh.visible, 'HOUSE')
solid(6, 2.2, W.busX + 4, -1.8, () => props.bus.mesh.visible, 'STREET')
export function resetProps() { Object.values(props).forEach(p => { if (!p.mesh) return; p.mesh.visible = true; if (p.mesh.userData.outline) p.mesh.userData.outline.visible = true }) }

// Marcador del objetivo actual
export const marker = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xf2c063 }))
marker.rotation.x = Math.PI; root.add(marker)

// 12. Fondo y tema de color: parte del --color-soporte-claro y se oscurece con la ansiedad
const bgClear = new THREE.Color('#8296B7'), bgDark = new THREE.Color('#201826')
const bgPost = new THREE.Color(), hsl = {}
let cssRead = false, lastA = -1
const readCss = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--color-soporte-claro').trim()
    if (v) { bgClear.set(v); cssRead = true }
}
function applyTheme(a) {
    if (!cssRead) readCss()
    themed.forEach(({ m, a: c0, b: c1 }) => m.color.copy(c0).lerp(c1, a))
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color()
    let base = bgClear
    if (runtime.postQuake) { base = bgPost.copy(bgClear).lerp(bgDark, 0.65); base.getHSL(hsl); base.setHSL(hsl.h, hsl.s * 0.3, hsl.l) }
    scene.background.copy(base).lerp(bgDark, a)
}

// 13. Calle eterna: con mucha ansiedad la universidad se aleja, la calle se alarga, la niebla se traga el final y el paso rinde menos
scene.fog = new THREE.Fog(0x201826, 1e4, 2e4)
let endK = 0, ext = 0
export const endless = () => endK // 0 = calle normal · 1 = calle eterna
export const atUniversity = (x, z) => runtime.space === 'STREET' && Math.abs(x - UX) < 3.2 && z < GATE - ext + 1.5
export const nearUniversity = (x, z) => runtime.space === 'STREET' && x > UX - 4 && z < GATE - ext + 8
function updateEndless(dt) {
    const E = CONFIG.street, a = runtime.anxiety
    const k = runtime.space === 'STREET' ? Math.min(1, Math.max(0, (a - E.from) / Math.max(0.01, E.full - E.from))) : 0
    endK += (k - endK) * Math.min(1, dt * 0.8)
    ext = E.endless * endK
    uniG.position.z = UNI_Z - ext
    roadExt.visible = ext > 0.05; roadExt.scale.z = Math.max(0.001, ext); roadExt.position.z = GATE - ext / 2
    EXT[2] = GATE - ext
    if (scene.background instanceof THREE.Color) scene.fog.color.copy(scene.background)
    if (endK > 0.01) { scene.fog.near = 26 + 40 * (1 - endK); scene.fog.far = scene.fog.near + 12 + 40 * (1 - endK) }
    else { scene.fog.near = 1e4; scene.fog.far = 2e4 }
}

// 14. Actualización por cuadro: deformación, pasto, ciudad del MIO, calle eterna y luces
const cold = new THREE.Color(0x8899bb), warm = new THREE.Color(0xffd9a0)
let T = 0, cityOff = 0, grassK = 0, grassWas = false
export function updateEnvironment(dt = 0) {
    const p = runtime.envProgress, a = runtime.anxiety
    T += dt; OUTLINE.opacity = 0.7 + 0.3 * Math.sin(T * 5)
    if (runtime.space === 'BUS') { // el MIO solo avanza cuando te sientas y va frenando mientras el sismo crece
        if (runtime.busMoving) cityOff = (cityOff + dt * (2.5 + a * 3) * (1 - Math.min(1, runtime.quake))) % CITY_P
        cityG.position.x = -cityOff
    }

    const d = a * a * CONFIG.anxiety.distort, q = runtime.quake
    warp.forEach(({ g, x, y, ph }) => {
        g.rotation.z = Math.sin(T * 0.8 + ph) * 0.26 * d + Math.sin(T * 21 + ph) * 0.06 * q
        g.rotation.x = Math.sin(T * 0.6 + ph * 1.7) * 0.12 * d
        g.scale.y = 1 + Math.sin(T * 0.7 + ph * 1.3) * 0.38 * d
        g.scale.x = 1 + Math.sin(T * 0.9 + ph * 0.7) * 0.15 * d
        g.position.x = x + Math.sin(T * 33 + ph) * 0.1 * q
        g.position.y = y + Math.abs(Math.sin(T * 27 + ph)) * 0.06 * q
    })
    sets.forEach(({ destroyed, restored }) => {
        destroyed.children.forEach(m => m.material.opacity = 1 - p); restored.children.forEach(m => m.material.opacity = p)
        destroyed.visible = p < 1; restored.visible = p > 0
        restored.position.y = -(1 - p) * 1.5; destroyed.position.y = -p * 0.8
    })
    const key = a + (runtime.postQuake ? 10 : 0)
    if (Math.abs(key - lastA) > 0.002) { lastA = key; applyTheme(a) }
    updateEndless(dt)

    const gt = runtime.grassGreen ? 1 : 0
    if (grassK !== gt) grassK += Math.sign(gt - grassK) * Math.min(Math.abs(gt - grassK), dt * 1.5)
    if (grassK > 0 || grassWas) { grass.forEach(({ m, a: c0, b: c1, g: cg }) => m.color.copy(c0).lerp(c1, a).lerp(cg, grassK)); grassWas = grassK > 0 }
    ambient.color.copy(cold).lerp(warm, p); sun.color.copy(cold).lerp(warm, p)
    sun.intensity = CONFIG.env.light * (0.8 + 0.5 * p)
}

setSpace('HOUSE')