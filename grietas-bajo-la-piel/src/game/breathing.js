// Indice
    // 0. Imports
    // 1. Técnicas de autorregulación
    // 2. Estado y controles
    // 3. Bolsa mezclada
    // 4. API pública (breathing)

// 0. Imports
import { CONFIG, runtime } from './config.js'
import { GAMES } from './minigames.js'

// 1. Técnicas de autorregulación (page = sección de respiracion-consciente.html que la explica)
const S = (l, d, f, t) => ({ l, d, f, t })
const HOLD = 'Inhala manteniendo el clic (o la barra espaciadora), retén sin soltar y exhala al soltar. Sigue la aguja roja.'
export const TECHS = [
    { id: 'box', name: 'Respiración en caja', page: 'respiracion-consciente.html#respira', help: HOLD + ' (4 s · 4 s · 4 s · 4 s)', segs: [S('Inhala', 4, 0, 1), S('Retén', 4, 1, 1), S('Exhala', 4, 1, 0), S('Pausa', 4, 0, 0)] },
    { id: 'body', name: 'Escaneo corporal y descarga', page: 'respiracion-consciente.html#respira', help: HOLD, segs: [S('Inhala profundo', 4, 0, 1), S('Retén', 2, 1, 1), S('Exhala: la tensión baja por el torso', 4, 1, 0.5), S('...por las piernas, hacia el suelo', 4, 0.5, 0)] },
    { id: 'earth', name: 'Earthing físico', page: 'respiracion-consciente.html#anclaje', help: 'Camina (WASD o flechas) hasta el pasto, a un lado del camino, y quédate sobre él respirando lento. Solo ahí baja tu ansiedad.', game: 'earth' }
]
const actionOf = (seg) => seg.t > seg.f || (seg.t === seg.f && seg.t > 0.5) ? 'hold' : 'release' // qué debe hacer el jugador en cada tramo
const labelOf = (seg) => seg.t > seg.f ? 'Inhalar' : seg.t < seg.f ? 'Exhalar' : seg.t > 0.5 ? 'Sostener' : 'Pausa' // lo que dice el rótulo del medidor (Pausa = pulmones vacíos)

// 2. Estado y controles: clic o espacio sostenidos (los botones y pop-ups no cuentan como "inhalar")
let forced = null, active = false, tech = null, picked = null, last = -1, bag = [], si = 0, st = 0, L = 0, good = 0, total = 0, holding = false, hooks = {}
const set = (h) => { holding = h }
const ignored = (e) => e.target?.closest?.('button, .gx-modal, .gx-talk, .gx-card')
addEventListener('pointerdown', (e) => { if (!runtime.paused && !ignored(e)) set(true) }); addEventListener('pointerup', () => set(false)); addEventListener('pointercancel', () => set(false)); addEventListener('blur', () => set(false))
addEventListener('keydown', (e) => { if (e.code === 'Space') { if (!runtime.paused) set(true); if (active) e.preventDefault() } })
addEventListener('keyup', (e) => { if (e.code === 'Space') set(false) })
const finish = (ok) => { breathing.stop(); hooks.onCycle?.(ok) }

// 3. Bolsa mezclada: salen todas las técnicas antes de repetir, en un orden distinto cada vuelta (y nunca la misma dos veces seguidas)
const refill = () => {
    bag = TECHS.map((_, i) => i)
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]] }
    if (bag.length > 1 && bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]]
}
const indoors = (space) => space === 'HOUSE' || space === 'HOME' // en la casa no hay pasto

// 4. API pública (breathing)
export const breathing = {
    init(h) { hooks = h },
    force(id) { forced = id }, // la próxima crisis usa esta técnica (debug)
    pick(space) {
        let i; if (forced) { i = Math.max(0, TECHS.findIndex(t => t.id === forced)); forced = null } // modo ?debug: elegir el minijuego
        else if (space === 'STREET' && TECHS[last]?.id !== 'earth' && Math.random() < 0.5) i = TECHS.findIndex(t => t.id === 'earth') // en la calle el Earthing sale más seguido (hay pasto a mano)
        else do { if (!bag.length) refill(); i = bag.pop() } while (indoors(space) && TECHS[i].id === 'earth')
        last = i; picked = TECHS[i]; runtime.techId = picked.id; return picked
    },
    prepare() { return picked || this.pick(runtime.space) }, // la técnica que toca (se elige si aún no hay una)
    start() {
        tech = picked || this.pick(runtime.space); picked = null; active = true; si = 0; st = 0; L = 0; good = total = 0
        Object.assign(runtime, { techName: tech.name, techHelp: tech.help, techId: tech.id, level: 0, target: 0, stepFill: 0, breathProgress: 0, prompt: '', action: '', label: '' })
        if (tech.game) GAMES[tech.game].start()
    },
    stop() { active = false; runtime.phase = ''; runtime.action = ''; runtime.label = ''; if (tech?.game) GAMES[tech.game].stop() },
    get active() { return active },
    update(dt) {
        if (!active) return
        const B = CONFIG.breathing
        if (tech.game) { // minijuegos
            const r = GAMES[tech.game].update(dt)
            Object.assign(runtime, { prompt: r.prompt, label: r.label || '', stepFill: r.fill, target: -1, breathProgress: r.fill, action: '' })
            if (r.done !== undefined) finish(r.done)
            return
        }
        const seg = tech.segs[si]; st += dt
        const target = seg.f + (seg.t - seg.f) * Math.min(st / seg.d, 1)
        // la barra sube mientras mantienes y baja al soltar, a la misma velocidad que la aguja en ese tramo
        const slope = (seg.t - seg.f) / seg.d, upV = slope > 0 ? slope : B.rate, downV = slope < 0 ? -slope : B.rate
        L = Math.min(1, Math.max(0, L + (holding ? upV : -downV) * dt))
        total += dt; if (Math.abs(L - target) <= B.tol) good += dt
        Object.assign(runtime, { level: L, target, prompt: seg.l, label: labelOf(seg), action: actionOf(seg), breathProgress: L })
        if (st >= seg.d) { si++; st = 0; hooks.onPhase?.(si); if (si >= tech.segs.length) finish(good / total >= B.pass) }
    }
}