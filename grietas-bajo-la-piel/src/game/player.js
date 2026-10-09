// Indice
    // 0. Imports
    // 1. Modelo del personaje
    // 2. Poses
    // 3. Controles
    // 4. API pública (player)

// 0. Imports
import * as THREE from 'three'
import { scene } from './scene.js'
import { CONFIG, runtime } from './config.js'
import { walkable, pullBack, endless } from './environment.js'

// 1. Modelo del personaje: TEMP_CHARACTER: sustituir por el sprite sheet definitivo
const group = new THREE.Group()
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8296b7 }) // la ropa no cambia de color al vestirse
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.2, 12), bodyMat)
const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe3d0b5 }))
body.position.y = 0.6; head.position.y = 1.5
// Maleta a la espalda: aparece cuando la recoges en el cuarto (el frente del personaje es su +z, la espalda su -z)
const backpack = new THREE.Group(), bagMat = new THREE.MeshStandardMaterial({ color: 0x799180 })
{
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.24), bagMat); b.position.set(0, 0.82, -0.44)
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.08), bagMat); pocket.position.set(0, 0.66, -0.58)
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x4f5f54 }) // correas sobre los hombros
    ;[-0.16, 0.16].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.62), strapMat); s.position.set(x, 1.12, -0.06); backpack.add(s) })
    backpack.add(b, pocket); backpack.visible = false
}
group.add(body, head, backpack); scene.add(group)
group.position.set(CONFIG.player.startX, 0, CONFIG.player.startZ)

// 2. Poses: acostado sobre la cama (la cama está contra la pared del fondo; la cabeza va hacia la almohada)
const LIE = { x: -1.5, y: 1.0, z: -1.2 }

// 3. Controles: WASD o flechas
const keys = new Set()
addEventListener('keydown', (e) => keys.add(e.code)); addEventListener('keyup', (e) => keys.delete(e.code)); addEventListener('blur', () => keys.clear())
const down = (...c) => c.some(k => keys.has(k))

// 4. API pública (player)
let mode = 'free' // free | stop | agitated | guided | calm
let lying = false, sitting = false, seatLocked = false // seatLocked: antes del sismo, una vez sentada en el MIO no se levanta
export const player = {
    group,
    setMode(m) { mode = m },
    setBackpack(v) { backpack.visible = v }, // maleta a la espalda
    lieDown() { lying = true; sitting = false; group.rotation.set(-Math.PI / 2, 0, 0); group.position.set(LIE.x, LIE.y, LIE.z) },
    sit(s, lock = false) { sitting = true; seatLocked = lock; group.rotation.set(0, s.face, 0); group.position.set(s.x, 0.45, s.z) },
    unsit() { if (!sitting) return; sitting = false; seatLocked = false; group.position.set(group.position.x, 0, 0) },
    get sitting() { return sitting },
    standUp(x, z) { lying = false; group.rotation.set(0, 0, 0); group.position.set(x, 0, z) },
    get lying() { return lying },
    get x() { return group.position.x }, set x(v) { group.position.x = v },
    get z() { return group.position.z }, set z(v) { group.position.z = v },
    update(dt, t) {
        let s = 1, bob = 0
        const ix = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0)
        const iy = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0)
        if (sitting && !seatLocked && (ix || iy)) this.unsit() // al moverte te levantas (salvo en el viaje de antes del sismo)
        if (mode === 'free' && !lying && !sitting) {
            if (ix || iy) {
                const n = Math.hypot(ix, iy), a = THREE.MathUtils.degToRad(CONFIG.camera.azimuth)
                // movimiento relativo a la pantalla (W = hacia arriba en pantalla)
                const vx = CONFIG.player.screenRelative ? (ix * Math.cos(a) - iy * Math.sin(a)) / n : ix / n
                const vz = CONFIG.player.screenRelative ? (-ix * Math.sin(a) - iy * Math.cos(a)) / n : -iy / n
                // calle eterna: con mucha ansiedad caminas igual, pero avanzas menos
                const slow = runtime.space === 'STREET' ? 1 - CONFIG.street.slow * endless() : 1
                const sp = CONFIG.player.speed * slow * dt, p = group.position
                if (walkable(p.x + vx * sp, p.z + vz * sp)) { p.x += vx * sp; p.z += vz * sp }
                else if (walkable(p.x + vx * sp, p.z)) p.x += vx * sp
                else if (walkable(p.x, p.z + vz * sp)) p.z += vz * sp
                group.rotation.y = Math.atan2(vx, vz)
                bob = Math.abs(Math.sin(t * 9)) * 0.12
            }
        }
        if (!lying && !sitting) {
            const q = group.position, f = pullBack(q.x, q.z)
            if (f) { const dx = f.x - q.x, dz = f.z - q.z, d = Math.hypot(dx, dz), st = Math.min(d, 4 * dt); if (d > 1e-6) { q.x += dx / d * st; q.z += dz / d * st } }
        }
        if (mode === 'agitated' || (mode !== 'calm' && runtime.anxiety > 0.75)) s = 1 + Math.sin(t * 22) * 0.05
        else if (mode === 'guided') s = 1 + runtime.breathProgress * 0.15
        else if (mode === 'calm') s = 1 + Math.sin(t * 1.5) * 0.02
        group.scale.setScalar(s); if (sitting) group.scale.y = s * 0.85
        if (lying) group.position.set(LIE.x, LIE.y + Math.sin(t * 1.5) * 0.01, LIE.z)
        else if (sitting) group.position.y = 0.45
        else group.position.y = bob
    }
}