// Indice
    // 0. Imports y utilidades
    // 1. Elementos del juego (el HTML vive en narrativa.html)
    // 2. Medidor de respiración
    // 3. Música y salida rápida
    // 4. Pop-ups
    // 5. Texto que se escribe letra por letra
    // 6. Diálogos con personajes (mamá)
    // 7. API pública (ui)

// 0. Imports y utilidades
import { CONFIG, runtime } from './config.js'
import { audio } from './audio.js'
import gsap from 'gsap'
const CHL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 L5 12 L12 19 M20 5 L13 12 L20 19"/></svg>'
const CHR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 L19 12 L12 19 M4 5 L11 12 L4 19"/></svg>'
const btn = (label, dir) => `<button type="button" class="gx-act">${dir === 'left' ? CHL : ''}<span>${label}</span>${dir === 'right' ? CHR : ''}</button>` // solo para los botones que cambian (pop-up de opciones)

// 1. Elementos del juego: toda la estructura (pop-ups, tarjetas, medidor) está escrita en narrativa.html
const root = document.querySelector('.gx')
if (!root) throw new Error('Falta la estructura .gx del juego en narrativa.html')
const $ = (s) => root.querySelector(s)
const msg = $('.gx-msg'), needle = $('.gx-needle'), fadeEl = $('.gx-fade'), card = $('.gx-card'), label = $('.gx-label'), hint = $('.gx-breath-hint'), fillPath = $('.gx-fill'), zonePath = $('.gx-zone')
const isTouch = () => document.body.classList.contains('gx-touch-on')

// 2. Medidor de respiración: el arco verde es TU barra; la franja gris clara marca la zona correcta y la aguja roja el ritmo a seguir
const pt = (r, f) => { const a = Math.PI + f * Math.PI; return `${(150 + r * Math.cos(a)).toFixed(1)} ${(150 + r * Math.sin(a)).toFixed(1)}` }
$('.gx-arcs').innerHTML = `<path d="M ${pt(128, 0)} A 128 128 0 0 1 ${pt(128, 1)}" fill="none" stroke="#e4e4e4" stroke-width="40"/><path d="M ${pt(120, 0)} A 120 120 0 0 1 ${pt(120, 1)}" fill="none" stroke="#5c5c5c" stroke-width="24"/>`
let lastFill = -1, lastPrompt = '', lastHint = null

// 3. Música y salida rápida: la salida rápida pausa todo el juego
const toggle = { music: true }
root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.a; toggle[k] = !toggle[k]
    b.textContent = `Música: ${toggle[k] ? 'ON' : 'OFF'}`
    audio.setMusic(toggle[k]); audio.setFx(toggle[k]) // silenciar también apaga los efectos
}))
const goHome = () => { audio.setMusic(false); audio.setFx(false); document.documentElement.classList.remove('sin-scroll'); location.href = CONFIG.exitUrl }
let pauseOn = false, holdOn = false // pauseOn: salida rápida · holdOn: pop-up de controles o de "cómo se juega" abierto
const syncPause = () => { runtime.paused = pauseOn || holdOn; runtime.paused ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume() }
const setPaused = (v) => { pauseOn = v; $('.gx-pause').hidden = !v; audio.setPaused(v); syncPause() }
$('.gx-exit').addEventListener('click', () => setPaused(true))
$('.gx-pause [data-act="go"]').addEventListener('click', () => setPaused(false))
$('.gx-pause [data-act="stop"]').addEventListener('click', goHome)
$('.gx-ending [data-act="restart"]').addEventListener('click', () => location.reload())
$('.gx-ending [data-act="home"]').addEventListener('click', goHome)

// 4. Pop-ups: como en la advertencia del index, ninguno se cierra por fuera de sus botones; clic afuera sacude la caja. Esc abre la salida rápida.
const shake = (d) => { d.classList.remove('sacudir'); void d.offsetWidth; d.classList.add('sacudir') }
root.querySelectorAll('.gx-dialog').forEach(d => d.addEventListener('animationend', () => d.classList.remove('sacudir')))
root.querySelectorAll('.gx-modal').forEach(m => m.addEventListener('pointerdown', (e) => { if (e.target === m) shake(m.querySelector('.gx-dialog')) }))
const dlg = $('.gx-pause .gx-dialog')
addEventListener('keydown', (e) => { if (e.code === 'Escape') pauseOn ? shake(dlg) : setPaused(true) })
const openHold = (m, onClose) => { // abre un pop-up que congela el juego hasta pulsar su botón "Empezar"
    const b = m.querySelector('[data-act="start"]')
    m.hidden = false; holdOn = true; syncPause()
    b.addEventListener('click', () => { m.hidden = true; holdOn = false; syncPause(); onClose?.() }, { once: true })
    b.focus({ preventScroll: true })
}

// 5. Texto que se escribe letra por letra (la caja mantiene su tamaño: lo que falta se reserva invisible)
const typer = (p) => {
    let tw = null, full = ''
    return {
        write(text, type) {
            tw?.kill(); tw = null; full = text
            if (!type || !text) { p.textContent = text; return }
            p.innerHTML = '<span></span><span style="visibility:hidden"></span>'
            const shown = p.firstChild, rest = p.lastChild, n = { c: 0 }
            rest.textContent = text
            tw = gsap.to(n, { c: text.length, duration: text.length / 45, ease: 'none',
                onUpdate: () => { const i = Math.floor(n.c); shown.textContent = text.slice(0, i); rest.textContent = text.slice(i) },
                onComplete: () => { tw = null; p.textContent = text } })
        },
        finish() { if (!tw) return false; tw.kill(); tw = null; p.textContent = full; return true }, // true si todavía se estaba escribiendo
        stop() { tw?.kill(); tw = null }
    }
}
const cardP = card.querySelector('p'), cardActions = card.querySelector('.gx-card-actions'), cardNext = cardActions.querySelector('button'), cardT = typer(cardP)
let onCardNext = null
cardNext.addEventListener('click', () => { if (cardT.finish()) return; onCardNext?.() }) // 1.er clic mientras se escribe: completa el texto · luego: continúa
card.addEventListener('click', (e) => { if (!cardActions.contains(e.target)) cardT.finish() })

// 6. Diálogos con personajes: E, Enter o "Continuar" avanzan (si el texto se está escribiendo, primero lo completan)
const talkEl = $('.gx-talk'), talkName = $('.gx-talk-name'), talkNext = $('.gx-talk [data-act="talk-next"]'), talkT = typer($('.gx-talk-text'))
let lines = [], li = 0, onLine = null, onEnd = null, talker = ''
const showLine = () => { // cada frase puede ser un texto o [quién habla, texto]
    const [who, text] = Array.isArray(lines[li]) ? lines[li] : [talker, lines[li]]
    talkName.textContent = who; talkT.write(text, true); talkNext.querySelector('span').textContent = li < lines.length - 1 ? 'Continuar' : 'Cerrar'; onLine?.(li) }
const closeTalk = () => { talkT.stop(); talkEl.hidden = true; lines = []; onLine = onEnd = null }
const advance = () => {
    if (talkEl.hidden || runtime.paused) return
    if (talkT.finish()) return
    if (++li < lines.length) return showLine()
    const done = onEnd; closeTalk(); done?.()
}
talkNext.addEventListener('click', advance)
talkEl.addEventListener('click', (e) => { if (!talkNext.contains(e.target)) talkT.finish() })
addEventListener('keydown', (e) => { // se registra antes que la interacción del juego: la tecla que avanza el diálogo no interactúa con nada más
    if (talkEl.hidden || e.repeat || (e.code !== 'KeyE' && e.code !== 'Enter')) return
    e.preventDefault(); e.stopImmediatePropagation(); advance()
})

// 7. API pública (ui)
export const ui = {
    vignette: $('.gx-vignette'),
    say(t) { msg.textContent = t },
    showBreath(v) { $('.gx-breath').hidden = !v },
    updateBreath() {
        const step = runtime.target < 0, f = step ? runtime.stepFill : runtime.level // Earthing: el arco muestra el tiempo sobre el pasto
        needle.style.display = step ? 'none' : ''
        if (!step) {
            needle.setAttribute('transform', `rotate(${runtime.target * 180 - 90} 150 150)`)
            const tol = CONFIG.breathing.tol, lo = Math.max(0, runtime.target - tol), hi = Math.min(0.999, runtime.target + tol)
            zonePath.setAttribute('d', `M ${pt(120, lo)} A 120 120 0 0 1 ${pt(120, hi)}`)
        } else zonePath.setAttribute('d', '')
        const k = Math.round(f * 200)
        if (k !== lastFill) { lastFill = k; fillPath.setAttribute('d', f > 0.005 ? `M ${pt(120, 0)} A 120 120 0 0 1 ${pt(120, Math.min(f, 0.999))}` : '') }
        const p = runtime.prompt || '', long = p.length > 16 // frases cortas en el rótulo ("Inhala"); las largas van en el mensaje de arriba
        label.textContent = long || !p ? 'Respirar' : p
        if (long && p !== lastPrompt) msg.textContent = p
        lastPrompt = p
        // qué hacer con el clic en este momento: mantener (inhalar / retener) o soltar (exhalar / pausa)
        const h = step || !runtime.action ? '' : runtime.action === 'hold'
            ? (isTouch() ? 'Mantén presionado E' : 'Mantén el clic o la barra espaciadora')
            : (isTouch() ? 'Suelta el botón E' : 'Suelta el clic')
        if (h !== lastHint) { lastHint = h; hint.textContent = h; hint.dataset.action = runtime.action }
    },
    fade(o, d = 1, cb) { gsap.to(fadeEl, { opacity: o, duration: d, onComplete: cb }) },
    // opts: { type: true → el texto se escribe letra por letra · onContinue → muestra el botón "Continuar" }
    card(title, text = '', opts = {}) {
        cardT.stop()
        if (!title) { card.hidden = true; return }
        card.querySelector('h2').textContent = title
        onCardNext = opts.onContinue || null; cardActions.hidden = !onCardNext
        cardT.write(text, opts.type)
        card.hidden = false
        if (onCardNext) cardNext.focus({ preventScroll: true })
    },
    controls(onClose) { openHold($('.gx-controls'), onClose) }, // pop-up de controles del inicio
    tutorial(info, onClose) { // pop-up "Cómo se juega". info: { sub, steps: [], page → enlace a la página que explica la técnica }
        const m = $('.gx-tutorial'), list = m.querySelector('.gx-list'), more = m.querySelector('.gx-more')
        m.querySelector('.gx-sub').textContent = info.sub
        more.hidden = !info.page; if (info.page) more.href = info.page
        list.innerHTML = ''; info.steps.forEach(s => { const el = document.createElement('li'); el.textContent = s; list.appendChild(el) })
        openHold(m, onClose)
    },
    // diálogo con un personaje. opts: { onLine(i) → al mostrar cada frase · onEnd → al cerrar }
    talk(name, ls, opts = {}) { talker = name; lines = ls; li = 0; onLine = opts.onLine || null; onEnd = opts.onEnd || null; talkEl.hidden = false; showLine(); talkNext.focus({ preventScroll: true }) },
    closeTalk,
    choice(title, text, opts) { // pop-up con opciones: [{ label, dir, fn }]
        const m = $('.gx-choice'), box = m.querySelector('.gx-actions')
        m.querySelector('h2').textContent = title; m.querySelector('p').textContent = text
        box.innerHTML = opts.map(o => btn(o.label, o.dir)).join('')
        box.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', opts[i].fn)); m.hidden = false
    },
    hideChoice() { $('.gx-choice').hidden = true },
    hideEnding() { $('.gx-ending').hidden = true },
    ending(title, text) { $('.gx-ending h2').textContent = title; $('.gx-ending p').textContent = text; $('.gx-ending').hidden = false }
}