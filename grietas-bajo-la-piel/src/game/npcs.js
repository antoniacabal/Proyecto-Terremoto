// Indice
    // 0. Imports
    // 1. Estado y modelo del NPC
    // 2. Creación de NPCs
    // 3. Mamá
    // 4. Movimiento y choques

// 0. Imports
import * as THREE from 'three'
import { spaces, walkableIn, SEATS } from './environment.js'
import { CONFIG, runtime } from './config.js'
import { player } from './player.js'

// 1. Estado y modelo del NPC
export const npcState = { near: 0, bumps: 0 } // near = gente cerca del personaje · bumps = choques acumulados
const black = new THREE.MeshStandardMaterial({ color: 0x0d0d10 }), white = new THREE.MeshBasicMaterial({ color: 0xffffff })
const bodyG = new THREE.ConeGeometry(0.42, 1.3, 12), headG = new THREE.SphereGeometry(0.38, 14, 10), eyeG = new THREE.SphereGeometry(0.075, 8, 6)
const make = () => { // la cabeza y los ojos van en su propio grupo para poder girar la cabeza (sismo)
    const g = new THREE.Group(), b = new THREE.Mesh(bodyG, black), hg = new THREE.Group(), h = new THREE.Mesh(headG, black); b.position.y = 0.65; hg.position.y = 1.5; hg.add(h)
    ;[-0.14, 0.14].forEach(x => { const e = new THREE.Mesh(eyeG, white); e.scale.set(1, 1.4, 0.5); e.position.set(x, 0.05, 0.34); hg.add(e) })
    g.add(b, hg); g.userData.head = hg; return g
}

// 2. Creación de NPCs: peatones (en las dos calles), gente en el paradero, pasajeros sentados y conductor
const r = (a, b) => a + Math.random() * (b - a)
const npcs = [], R = 0.85 // R = distancia mínima entre centros
const add = (o) => { o.g.userData.n = o; o.parent.add(o.g); npcs.push({ vx: 0, vz: 0, cool: 0, t: 0, state: 'walk', ...o }) }
const UX = CONFIG.world.uniX
const ROUTES = [ // axis = eje por el que caminan · lanes = carriles · min/max = tramo que recorren
    { axis: 'x', lanes: [-2.3, -1.2, 1.2, 2.3], min: 3, max: 38.5 },               // calle 1
    { axis: 'z', lanes: [UX - 2.1, UX - 1.1, UX + 1.1, UX + 2.1], min: -35, max: -4 } // calle 2 (hacia la universidad)
]
const BUS_X = CONFIG.world.busX
for (let i = 0; i < CONFIG.npcs.street; i++) {
    let route = ROUTES[i % 3 === 2 ? 1 : 0]
    if (route === ROUTES[0] && route.lanes[i % 4] < 0) route = { ...route, max: BUS_X - 3.5 } // del lado del MIO dan la vuelta antes del paradero: así no te encierran contra el bus
    let x = 0, z = 0
    for (let k = 0; k < 80; k++) { // busca un lugar libre y lejos de los demás, para que dos NPC nunca nazcan fusionados
        const along = r(route.min, route.max), lane = route.lanes[i % 4] + r(-.2, .2)
        ;[x, z] = route.axis === 'x' ? [along, lane] : [lane, along]
        if (walkableIn('STREET', x, z) && npcs.every(n => n.sp !== 'STREET' || Math.hypot(n.g.position.x - x, n.g.position.z - z) > R * 1.8)) break
    }
    const g = make(); g.position.set(x, 0, z)
    add({ g, parent: spaces.STREET, sp: 'STREET', kind: 'walker', route, dir: Math.random() < 0.5 ? 1 : -1, speed: r(0.7, 1.4), ph: r(0, 6) })
}
;[[-2.4, -3.6], [-1.2, -3.75]].forEach(([dx, z]) => { const g = make(); g.position.set(BUS_X + dx, 0, z); add({ g, parent: spaces.STREET, sp: 'STREET', kind: 'idle', ph: r(0, 6), y: 0 }) }) // esperando el MIO bajo el techo del paradero (fuera de la calle, para no bloquear el paso)
const BX = CONFIG.world.busInteriorX
SEATS.sort(() => Math.random() - 0.5).slice(0, CONFIG.npcs.bus).forEach(s => {
    s.taken = true; const g = make(); g.scale.setScalar(0.85); g.position.set(s.x, 0.45, s.z); g.rotation.y = s.face
    add({ g, parent: spaces.BUS, sp: 'BUS', kind: 'seated', ph: r(0, 6), y: 0.45 })
})
{ const g = make(); g.position.set(BX + 5.1, 0, 0); g.rotation.y = Math.PI / 2; add({ g, parent: spaces.BUS, sp: 'BUS', kind: 'driver', ph: 0, y: 0 }) } // conductor

// 3. Mamá: en la cocina, te mira cuando estás cerca y se mueve un poco al hablar (su colisión está en environment.js)
// Es una silueta negra como los demás NPCs (la ansiedad no deja ver a los otros como personas), pero conserva
// lo que la hace reconocible: delantal, moño y pestañas
export const mom = (() => {
    const HX = CONFIG.world.homeX, g = new THREE.Group(), body = new THREE.Group(), hg = new THREE.Group()
    const mesh = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o }
    mesh(bodyG, black, 0, 0.65, 0, body)                                                       // cuerpo (igual que los NPCs)
    // delantal blanco: un trozo de cono pegado al frente del cuerpo (trapecio visto de frente)
    mesh(new THREE.CylinderGeometry(0.245, 0.4, 0.5, 16, 1, true, -0.75, 1.5), white, 0, 0.33, 0, body)
    mesh(headG, black, 0, 0, 0, hg)                                                            // cabeza
    mesh(new THREE.SphereGeometry(0.17, 14, 10), black, 0, 0.3, -0.2, hg)                      // moño (arriba y hacia atrás)
    const eyeR = new THREE.SphereGeometry(0.105, 16, 12), lashG = new THREE.ConeGeometry(0.045, 0.13, 3)
    ;[-0.14, 0.14].forEach(x => {
        const s = Math.sign(x)
        mesh(eyeR, white, x, 0.04, 0.33, hg).scale.set(1, 1, 0.4)                              // ojos redondos y grandes
        const l = mesh(lashG, white, x + s * 0.1, 0.11, 0.3, hg)                               // pestaña: una punta blanca en la esquina de afuera
        l.rotation.set(-0.3, 0, -s * 1.05); l.scale.z = 0.4
    })
    hg.position.y = 1.5; g.add(body, hg); g.position.set(HX - 2, 0, -2.2); spaces.HOME.add(g)
    let talking = false
    return {
        g,
        setTalking(v) { talking = v },
        update(dt, t) {
            if (runtime.space !== 'HOME') return
            const want = Math.atan2(player.x - g.position.x, player.z - g.position.z)
            let d = want - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * Math.min(1, dt * 4)
            hg.rotation.x = talking ? Math.sin(t * 7) * 0.08 : 0
            body.scale.y = 1 + Math.sin(t * 1.6) * 0.015
            g.position.y = talking ? Math.abs(Math.sin(t * 6)) * 0.03 : 0
        }
    }
})()

// 4. Movimiento y choques: se llama en cada cuadro
const free = (n, x, z) => walkableIn(n.sp, x, z)
const shove = (n, dx, dz) => { const p = n.g.position; if (free(n, p.x + dx, p.z + dz)) { p.x += dx; p.z += dz } }
export function updateNpcs(dt, t) {
    mom.update(dt, t)
    const sp = runtime.space, q = runtime.quake; let near = 0
    for (const n of npcs) {
        const p = n.g.position; n.cool = Math.max(0, n.cool - dt); n.stareCool = Math.max(0, (n.stareCool || 0) - dt)
        if (q > 0.001 || n.shaking) { // terremoto: mueven la cabeza de un lado a otro y se sacuden
            const hd = n.g.userData.head, ph = n.ph || 0
            hd.rotation.x = Math.sin(t * 11 + ph) * 0.25 * q; hd.rotation.y = Math.sin(t * 14 + ph) * 0.8 * q; hd.rotation.z = Math.sin(t * 19 + ph * 1.3) * 0.35 * q
            n.g.rotation.z = Math.sin(t * 23 + ph) * 0.06 * q; n.shaking = q > 0.001
        }
        if (n.kind === 'walker') {
            if (n.state === 'stare') { n.t -= dt; n.g.rotation.y = Math.atan2(player.x - p.x, player.z - p.z); if (n.t <= 0) n.state = 'walk' } // se detiene y te mira
            else {
                const ro = n.route, alongX = ro.axis === 'x', v = (alongX ? p.x : p.z) + n.dir * n.speed * dt
                const nx = alongX ? v : p.x, nz = alongX ? p.z : v
                if (free(n, nx, nz) && v > ro.min && v < ro.max) { p.x = nx; p.z = nz } else n.dir *= -1 // el escenario lo frena: da la vuelta
                n.g.rotation.y = alongX ? (n.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (n.dir > 0 ? 0 : Math.PI)
                p.y = Math.abs(Math.sin(t * 7 + n.ph)) * 0.1
            }
            if (n.vx || n.vz) { shove(n, n.vx * dt, n.vz * dt); n.vx *= Math.max(0, 1 - dt * 4); n.vz *= Math.max(0, 1 - dt * 4); if (Math.hypot(n.vx, n.vz) < 0.05) n.vx = n.vz = 0 }
        } else p.y = n.y + (n.kind === 'seated' ? Math.sin(t * 1.5 + n.ph) * 0.015 : 0)
    }
    for (let i = 0; i < npcs.length; i++) for (let j = i + 1; j < npcs.length; j++) { // entre NPCs: no se atraviesan
        const a = npcs[i], b = npcs[j]; if (a.sp !== b.sp) continue
        let dx = b.g.position.x - a.g.position.x, dz = b.g.position.z - a.g.position.z, d = Math.hypot(dx, dz)
        if (d < R) {
            if (d < 1e-3) { const an = Math.random() * 6.28; dx = Math.cos(an); dz = Math.sin(an); d = 1 }
            const o = (R - Math.min(d, R)) / 2 + 0.02, ux = dx / d, uz = dz / d
            const side = Math.abs(dz) < 0.3 ? (i % 2 ? 1 : -1) * o * 0.6 : 0 // de frente por el mismo carril: uno se hace a un lado
            if (a.kind === 'walker') shove(a, -ux * o, -uz * o - side); if (b.kind === 'walker') shove(b, ux * o, uz * o + side)
        }
    }
    for (const n of npcs) { // con el personaje
        if (n.sp !== sp) continue
        const p = n.g.position, dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz)
        if (d < 3.5) near++
        if (d > 0 && d < R) {
            const ux = dx / d, uz = dz / d, o = R - d
            if (n.cool <= 0) { // chocar = parar y mirar (una sola vez cada tanto: si no, al seguir tocándolo se quedaba quieto para siempre y te encerraba)
                n.cool = 2; npcState.bumps++
                if (n.kind === 'walker' && n.state !== 'stare' && !(n.stareCool > 0)) { n.state = 'stare'; n.t = 2.5; n.stareCool = 9 }
            }
            if (n.kind === 'walker') shove(n, ux * o * 0.6, uz * o * 0.6)
            const k = n.kind === 'walker' ? 0.4 : 1, px = player.x - ux * o * k, pz = player.z - uz * o * k
            if (walkableIn(sp, px, pz)) { player.x = px; player.z = pz }
        }
    }
    npcState.near = near
}