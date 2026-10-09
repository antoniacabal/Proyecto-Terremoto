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
const HOLD = 'Mantén el clic (o la barra espaciadora) al inhalar y sostener; suéltalo al exhalar y en la pausa. El reloj cuenta los segundos de cada fase: cambia justo cuando llega a 0.'
export const TECHS = [
    { id: 'box', name: 'Respiración en caja (4-4-4-4)', page: 'respiracion-consciente.html#respira', help: HOLD + ' (4 s · 4 s · 4 s · 4 s)', segs: [S('Inhala', 4, 0, 1), S('Sostén el aire', 4, 1, 1), S('Exhala', 4, 1, 0), S('Pausa con los pulmones vacíos', 4, 0, 0)] },
    { id: 'exhale', name: 'Exhalación prolongada', page: 'respiracion-consciente.html#respira', help: HOLD,
        build: () => { const ex = Math.random() < 0.5 ? 6 : 8; return { name: `Exhalación prolongada (4-${ex})`, help: HOLD + ` (4 s · ${ex} s)`, segs: [S('Inhala por la nariz', 4, 0, 1), S('Exhala despacio por la boca', ex, 1, 0)] } } }, // sale 4-6 o 4-8 al azar
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
        last = i; picked = TECHS[i].build ? { ...TECHS[i], ...TECHS[i].build() } : TECHS[i]; runtime.techId = picked.id; return picked // build: la exhalación elige 4-6 o 4-8 cada vez
    },
    prepare() { return picked || this.pick(runtime.space) }, // la técnica que toca (se elige si aún no hay una)
    start() {
        tech = picked || this.pick(runtime.space); picked = null; active = true; si = 0; st = 0; L = 0; good = total = 0
        Object.assign(runtime, { techName: tech.name, techHelp: tech.help, techId: tech.id, level: 0, target: 0, stepFill: 0, breathProgress: 0, prompt: '', action: '', label: '', timeLeft: tech.segs ? tech.segs[0].d : CONFIG.earth.timeout })
        if (tech.game) GAMES[tech.game].start()
    },
    stop() { active = false; runtime.phase = ''; runtime.action = ''; runtime.label = ''; if (tech?.game) GAMES[tech.game].stop() },
    get active() { return active },
    update(dt) {
        if (!active) return
        const B = CONFIG.breathing
        if (tech.game) { // minijuegos
            const r = GAMES[tech.game].update(dt)
            Object.assign(runtime, { prompt: r.prompt, label: r.label || '', stepFill: r.fill, target: -1, breathProgress: r.fill, action: '', timeLeft: r.timeLeft })
            if (r.done !== undefined) finish(r.done)
            return
        }
        const seg = tech.segs[si]; st += dt
        const target = seg.f + (seg.t - seg.f) * Math.min(st / seg.d, 1)
        // la barra sube mientras mantienes y baja al soltar, a la misma velocidad que la aguja en ese tramo
        const slope = (seg.t - seg.f) / seg.d, upV = slope > 0 ? slope : B.rate, downV = slope < 0 ? -slope : B.rate
        L = Math.min(1, Math.max(0, L + (holding ? upV : -downV) * dt))
        // se califica el timing: mantener al inhalar y sostener, soltar al exhalar y en la pausa (al empezar cada fase hay un margen de B.grace s)
        total += dt; if (st < B.grace || holding === (actionOf(seg) === 'hold')) good += dt
        Object.assign(runtime, { level: L, target, prompt: seg.l, label: labelOf(seg), action: actionOf(seg), breathProgress: L, timeLeft: Math.max(0, seg.d - st) }) // el reloj cuenta los segundos de la fase (4, 6 u 8)
        if (st >= seg.d) { si++; st = 0; hooks.onPhase?.(si); if (si >= tech.segs.length) finish(good / total >= B.pass) }
    }
}