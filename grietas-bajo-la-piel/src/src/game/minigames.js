// Indice
    // 0. Imports
    // 1. Utilidades
    // 2. Técnica 5-4-3-2-1
    // 3. Earthing físico
    // 4. Exportación

// 0. Imports
import * as THREE from 'three'
import { camera } from './camera.js'
import { spaces, walkable, setGrass, onGrass, nearestGrass } from './environment.js'
import { player } from './player.js'
import { audio } from './audio.js'
import { scene } from './scene.js'
import { CONFIG, runtime } from './config.js'

// 1. Utilidades
// Minijuegos de las crisis.
const rnd = (a, b) => a + Math.random() * (b - a)
const spot = (r0, r1) => { // punto caminable cerca del personaje
    for (let i = 0; i < 80; i++) { const a = rnd(0, 6.28), r = rnd(r0, r1), x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r; if (walkable(x, z)) return [x, z] }
    return [player.x, player.z]
}

// 2. Técnica 5-4-3-2-1: objetos que solo se alumbran al pasar el mouse; haz clic en los que quieras
const STEPS = [[5, 'cosas que ves'], [4, 'cosas que tocas'], [3, 'cosas que oyes'], [2, 'cosas que hueles'], [1, 'cosa que saboreas']]
const GEO = [new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.SphereGeometry(0.28, 12, 8), new THREE.ConeGeometry(0.3, 0.6, 6), new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8)]
const COL = [0x6b6577, 0x7a8aa0, 0x8a7a68, 0x6f8a78]
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-9, -9), items = []
let sActive = false, si = 0, got = 0, sT = 0, spawnedS = false, hover = null
const hit = () => { ray.setFromCamera(mouse, camera); return ray.intersectObjects(items, false)[0]?.object || null }
const spawnItems = () => {
    items.splice(0).forEach(m => m.parent?.remove(m))
    for (let i = 0; i < STEPS[si][0] + 2; i++) { // 2 objetos de más que los necesarios
        // brillo suave permanente (emisivo + halo) para que se vean aunque el mundo esté oscuro; al pasar el mouse brillan más
        const m = new THREE.Mesh(GEO[i % 4], new THREE.MeshStandardMaterial({ color: COL[i % 4], emissive: 0xf2c063, emissiveIntensity: 0.35 }))
        const halo = new THREE.Mesh(GEO[i % 4], new THREE.MeshBasicMaterial({ color: 0xf2c063, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false }))
        halo.scale.setScalar(1.35); m.add(halo); m.userData.halo = halo
        const [x, z] = spot(1.8, 5); m.position.set(x, 0.3, z); spaces[runtime.space].add(m); items.push(m)
    }
}
addEventListener('pointermove', (e) => mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1))
addEventListener('pointerdown', (e) => {
    if (!sActive || runtime.paused) return
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
    const m = hit(); if (!m) return
    m.parent.remove(m); items.splice(items.indexOf(m), 1); got++; audio.blip(380 + got * 70, 0.12, 0.08)
})
const senses = {
    start() { sActive = true; si = 0; got = 0; sT = 0; spawnedS = false },
    stop() { sActive = false; items.splice(0).forEach(m => m.parent?.remove(m)) },
    update(dt) {
        if (!spawnedS) { spawnItems(); spawnedS = true }
        sT += dt; hover = hit()
        items.forEach((m, i) => {
            const h = m === hover, pulse = 0.5 + 0.5 * Math.sin(sT * 3 + i) // latido suave de cada objeto
            m.material.emissiveIntensity = h ? 1.6 : 0.25 + 0.3 * pulse
            m.userData.halo.material.opacity = h ? 0.45 : 0.12 + 0.12 * pulse
            m.scale.setScalar(h ? 1.3 : 1); m.rotation.y += dt; m.position.y = 0.3 + 0.06 * Math.sin(sT * 2 + i)
        })
        const [n] = STEPS[si]
        if (got >= n) { si++; got = 0; sT = 0; if (si >= STEPS.length) return { prompt: '', fill: 1, done: true }; spawnItems() }
        else if (sT > CONFIG.senses.time) return { prompt: '', fill: 0, done: false }
        const [n2, t2] = STEPS[si]
        return { prompt: `${n2} ${t2} (${got}/${n2}) · pasa el mouse y haz clic`, fill: (si + got / n2) / STEPS.length }
    }
}

// 3. Earthing físico: la ansiedad solo baja mientras pisas el pasto que hay a los lados de la calle
const arrow = new THREE.Group(); { const c = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 8), new THREE.MeshBasicMaterial({ color: 0xf2c063 })); c.rotation.x = Math.PI / 2; c.position.z = 1.3; arrow.add(c); arrow.visible = false; scene.add(arrow) } // flecha que apunta al pasto
let eActive = false, onT = 0, eT = 0
const earth = {
    start() { eActive = true; onT = 0; eT = 0; setGrass(true) },
    stop() { eActive = false; arrow.visible = false; setGrass(false) },
    update(dt) {
        const E = CONFIG.earth
        eT += dt
        const on = onGrass(player.x, player.z)
        arrow.visible = !on
        if (!on) { const [tx, tz] = nearestGrass(player.x, player.z); arrow.position.set(player.x, 2.9, player.z); arrow.rotation.y = Math.atan2(tx - player.x, tz - player.z) } // pasto más cercano (sirve en las dos calles)
        if (on) { onT += dt; runtime.anxiety = Math.max(0, runtime.anxiety - E.relief * dt) } // solo baja sobre el pasto
        if (onT >= E.need) return { prompt: '', fill: 1, done: true }
        if (eT > E.timeout) return { prompt: '', fill: 0, done: false }
        return { prompt: on ? `Respira lento... ${Math.ceil(E.need - onT)} s` : 'Camina hasta el pasto, a un lado de la calle', fill: onT / E.need }
    }
}

// 4. Exportación
export const GAMES = { senses, earth }