// Indice
    // 0. Imports
    // 1. Earthing físico
    // 2. Exportación

// 0. Imports
import * as THREE from 'three'
import { setGrass, onGrass, nearestGrass } from './environment.js'
import { player } from './player.js'
import { scene } from './scene.js'
import { CONFIG, runtime } from './config.js'

// 1. Earthing físico: la ansiedad solo baja mientras pisas el pasto que hay a los lados de la calle
const arrow = new THREE.Group(); { const c = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 8), new THREE.MeshBasicMaterial({ color: 0xf2c063 })); c.rotation.x = Math.PI / 2; c.position.z = 1.3; arrow.add(c); arrow.visible = false; scene.add(arrow) } // flecha que apunta al pasto
let eActive = false, onT = 0, eT = 0
const earth = {
    start() { eActive = true; onT = 0; eT = 0; setGrass(true) },
    stop() { eActive = false; arrow.visible = false; setGrass(false) },
    update(dt) {
        const E = CONFIG.earth
        const on = onGrass(player.x, player.z)
        if (on || onT > 0) eT += dt // el tiempo límite empieza a correr al pisar el pasto por primera vez: caminar hasta él no cuenta
        else eT += dt * 0.25
        arrow.visible = !on
        if (!on) { const [tx, tz] = nearestGrass(player.x, player.z); arrow.position.set(player.x, 2.9, player.z); arrow.rotation.y = Math.atan2(tx - player.x, tz - player.z) } // pasto más cercano (sirve en las dos calles)
        if (on) { onT += dt; runtime.anxiety = Math.max(0, runtime.anxiety - E.relief * dt) } // solo baja sobre el pasto
        if (onT >= E.need) return { prompt: '', fill: 1, done: true }
        if (eT > E.timeout) return { prompt: '', fill: 0, done: false }
        return { prompt: on ? `Respira lento... ${Math.ceil(E.need - onT)} s` : 'Camina hasta el pasto, a un lado de la calle', fill: onT / E.need }
    }
}

// 2. Exportación
export const GAMES = { earth }
