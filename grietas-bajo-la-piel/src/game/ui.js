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
import { haptics } from './haptics.js'
import gsap from 'gsap'
const CHL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 L5 12 L12 19 M20 5 L13 12 L20 19"/></svg>'
const CHR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 L19 12 L12 19 M4 5 L11 12 L4 19"/></svg>'
const btn = (label, dir) => `<button type="button" class="gx-act">${dir === 'left' ? CHL : ''}<span>${label}</span>${dir === 'right' ? CHR : ''}</button>` // solo para los botones que cambian (pop-up de opciones)

// 1. Elementos del juego: toda la estructura (pop-ups, tarjetas, medidor) está escrita en narrativa.html
const root = document.querySelector('.gx')
if (!root) throw new Error('Falta la estructura .gx del juego en narrativa.html')
const $ = (s) => root.querySelector(s)
const timerEl = $('.gx-timer'), whisperEl = $('.gx-whisper'), msg = $('.gx-msg'), needle = $('.gx-needle'), fadeEl = $('.gx-fade'), card = $('.gx-card'), label = $('.gx-label'), hint = $('.gx-breath-hint'), fillPath = $('.gx-fill'), zonePath = $('.gx-zone')
const isTouch = () => document.body.classList.contains('gx-touch-on')
// 2. Medidor de respiración: un círculo que respira. El de adentro es TU respiración (crece mientras mantienes); el aro claro marca el ritmo
//    a seguir y la franja gris clara alrededor del aro es la zona correcta
const breathEl = $('.gx-breath'), barFill = $('.gx-bar-fill'), orbEdge = $('.gx-orb-borde'), countEl = $('.gx-orb-count')
const RAD = (f) => 38 + 102 * Math.min(1, Math.max(0, f)) // radio del círculo para un nivel de 0 a 1
let lastFill = -1, lastPrompt = '', lastHint = null

// 3. Música, pantalla completa, vibración y salida rápida: los botones de arriba siguen activos sobre los pop-ups y en los finales
let musicOn = true
const musicBtn = $('[data-a="music"]'), vibraBtn = $('[data-a="vibra"]'), fullBtn = $('.gx-full')
musicBtn.addEventListener('click', () => {
    musicOn = !musicOn; musicBtn.textContent = `Música: ${musicOn ? 'ON' : 'OFF'}`
    audio.setMusic(musicOn); audio.setFx(musicOn) // silenciar también apaga los efectos
})
// Vibración: solo en celulares que la permiten (touch.js marca el body con gx-touch-on; en iPhone no existe y el botón no sale)
document.body.classList.toggle('gx-vibra-ok', haptics.supported)
vibraBtn.addEventListener('click', () => { haptics.set(!haptics.on); vibraBtn.textContent = `Vibración: ${haptics.on ? 'ON' : 'OFF'}`; if (haptics.on) haptics.buzz(60) })
// Pantalla completa (también funciona F11, pero esa la maneja el navegador)
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement
const fsOk = document.fullscreenEnabled || document.webkitFullscreenEnabled
fullBtn.hidden = !fsOk; document.body.classList.toggle('gx-full-ok', !!fsOk) // iPhone no permite pantalla completa en páginas
fullBtn.addEventListener('click', () => {
    const d = document, el = d.documentElement
    try {
        const r = fsEl() ? (d.exitFullscreen || d.webkitExitFullscreen).call(d) : (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' })
        r?.catch?.(() => {})
    } catch { /* el navegador no la dejó */ }
})
const syncFull = () => { const on = !!fsEl(); fullBtn.classList.toggle('gx-full--on', on); fullBtn.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa'); fullBtn.title = fullBtn.getAttribute('aria-label') }
document.addEventListener('fullscreenchange', syncFull); document.addEventListener('webkitfullscreenchange', syncFull); syncFull()
const goHome = () => { audio.setMusic(false); audio.setFx(false); haptics.stop(); document.documentElement.classList.remove('sin-scroll'); location.href = CONFIG.exitUrl }
let pauseOn = false, holdOn = false // pauseOn: salida rápida · holdOn: pop-up de controles o de "cómo se juega" abierto
const syncPause = () => { runtime.paused = pauseOn || holdOn; runtime.paused ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume() }
const setPaused = (v) => { pauseOn = v; $('.gx-pause').hidden = !v; audio.setPaused(v); if (v) haptics.stop(); syncPause() }
const inGame = () => runtime.state === 'BREATHING' // durante los minijuegos no se puede abrir la salida rápida (ni con Esc)
$('.gx-exit').addEventListener('click', () => { if (!inGame()) setPaused(true) })
$('.gx-pause [data-act="go"]').addEventListener('click', () => setPaused(false))
$('.gx-pause [data-act="stop"]').addEventListener('click', goHome)
$('.gx-ending [data-act="restart"]').addEventListener('click', () => location.reload())
$('.gx-ending [data-act="home"]').addEventListener('click', goHome)

// 4. Pop-ups: como en la advertencia del index, ninguno se cierra por fuera de sus botones; clic afuera sacude la caja. Esc abre la salida rápida.
const shake = (d) => { d.classList.remove('sacudir'); void d.offsetWidth; d.classList.add('sacudir') }
root.querySelectorAll('.gx-dialog').forEach(d => d.addEventListener('animationend', () => d.classList.remove('sacudir')))
root.querySelectorAll('.gx-modal').forEach(m => m.addEventListener('pointerdown', (e) => { if (e.target === m) shake(m.querySelector('.gx-dialog')) }))
const dlg = $('.gx-pause .gx-dialog')
addEventListener('keydown', (e) => { if (e.code === 'Escape' && !inGame()) pauseOn ? shake(dlg) : setPaused(true) })
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
        write(text, type, done) { // done: se llama cuando el texto terminó de escribirse solo
            tw?.kill(); tw = null; full = text
            if (!type || !text) { p.textContent = text; return }
            p.innerHTML = '<span></span><span style="visibility:hidden"></span>'
            const shown = p.firstChild, rest = p.lastChild, n = { c: 0 }
            rest.textContent = text
            tw = gsap.to(n, { c: text.length, duration: text.length / 45, ease: 'none',
                onUpdate: () => { const i = Math.floor(n.c); shown.textContent = text.slice(0, i); rest.textContent = text.slice(i) },
                onComplete: () => { tw = null; p.textContent = text; done?.() } })
        },
        finish() { if (!tw) return false; tw.kill(); tw = null; p.textContent = full; return true }, // true si todavía se estaba escribiendo
        stop() { tw?.kill(); tw = null }
    }
}
// Tarjetas de narrativa: aparecen y se van con un fundido. Primero entra el título, después el texto (letra por letra si type)
// y el botón "Continuar" aparece un rato después, también con fundido. Enter, clic o toque lo adelantan todo de una vez
const cardH = card.querySelector('h2'), cardP = card.querySelector('p'), cardActions = card.querySelector('.gx-card-actions'), cardNext = cardActions.querySelector('button'), cardT = typer(cardP)
let onCardNext = null, cardTl = null, cardReady = false, cardFilled = false, cardText = '' // cardReady: el botón "Continuar" ya está a la vista
const showCardNext = (wait) => {
    if (!onCardNext || cardReady) return
    cardTl?.kill(); cardTl = gsap.timeline({ delay: wait }).call(() => { cardReady = true; cardActions.style.visibility = ''; cardNext.focus({ preventScroll: true }) }).fromTo(cardActions, { opacity: 0 }, { opacity: 1, duration: wait ? 0.8 : 0.3 })
}
const skipCard = () => { // completa el título y el texto y muestra el botón ya
    if (card.hidden || !onCardNext || !cardFilled) return
    if (cardReady) return onCardNext()
    cardTl?.kill(); gsap.killTweensOf([cardH, cardP]); gsap.set([card, cardH, cardP], { opacity: 1 }); cardT.stop(); cardP.textContent = cardText; showCardNext(0)
}
cardNext.addEventListener('click', (e) => { e.stopPropagation(); skipCard() })
card.addEventListener('click', skipCard)
addEventListener('keydown', (e) => { if (e.code === 'Enter' && !card.hidden && onCardNext) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) skipCard() } })

// 6. Diálogos con personajes: E, Enter o "Continuar" avanzan (si el texto se está escribiendo, primero lo completan)
const talkEl = $('.gx-talk'), talkName = $('.gx-talk-name'), talkNext = $('.gx-talk [data-act="talk-next"]'), talkT = typer($('.gx-talk-text'))
let lines = [], li = 0, onLine = null, onEnd = null, talker = '', talkSince = 0 // talkSince: cuándo se abrió (el mismo clic que abre el diálogo no lo adelanta)
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
// Clic (o toque) en cualquier parte mientras alguien habla: acelera el texto y, si ya terminó, pasa a la siguiente frase
addEventListener('pointerdown', (e) => { if (!talkEl.hidden && e.button === 0 && e.timeStamp > talkSince && !e.target.closest('button, .gx-modal, .gx-touch')) advance() })
addEventListener('keydown', (e) => { // se registra antes que la interacción del juego: la tecla que avanza el diálogo no interactúa con nada más
    if (talkEl.hidden || e.repeat || (e.code !== 'KeyE' && e.code !== 'Enter')) return
    e.preventDefault(); e.stopImmediatePropagation(); advance()
})

// 7. API pública (ui)
let sayTimer = null, touchHidden = null, whispering = false, topHidden = null
const modals = [...root.querySelectorAll('.gx-modal')]
export const ui = {
    vignette: $('.gx-vignette'),
    say(t) { // los mensajes se van solos después de unos segundos (los de la respiración los pone updateBreath)
        msg.textContent = t; sayTimer?.kill()
        sayTimer = t ? gsap.delayedCall(Math.min(7, 2.8 + t.length * 0.05), () => { if (msg.textContent === t) msg.textContent = '' }) : null
    },
    updateOverlay() { // los controles táctiles no se ven encima de las tarjetas, los pop-ups ni la pantalla en negro; los botones de arriba, no en las tarjetas
        const hide = !card.hidden || modals.some(m => !m.hidden) || gsap.getProperty(fadeEl, 'opacity') > 0.35
        if (hide !== touchHidden) { touchHidden = hide; document.body.classList.toggle('gx-touch-oculto', hide); if (hide) { runtime.joyX = runtime.joyY = 0 } }
        const top = this.blackout && !pauseOn
        if (top !== topHidden) { topHidden = top; document.body.classList.toggle('gx-tarjeta', top) }
        document.body.classList.toggle('gx-minijuego', inGame())
    },
    showBreath(v) { $('.gx-breath').hidden = !v },
    updateBreath() {
        const step = runtime.target < 0, f = step ? runtime.stepFill : runtime.level // Earthing: el arco muestra el tiempo sobre el pasto
        breathEl.classList.toggle('gx-breath--barra', step) // Earthing: una barra que se llena con el tiempo sobre el pasto (no el círculo)
        orbEdge.classList.toggle('gx-orb-borde--aviso', !!runtime.cue) // el círculo grande de afuera brilla amarillo antes de repetir
        const cnt = runtime.count ? String(runtime.count) : ''; if (countEl.textContent !== cnt) countEl.textContent = cnt // cuenta 3, 2, 1 en el centro
        if (!step) {
            const r = RAD(runtime.target).toFixed(1), w = (2 * CONFIG.breathing.tol * 102).toFixed(1)
            needle.setAttribute('r', r); zonePath.setAttribute('r', r); zonePath.setAttribute('stroke-width', w)
        }
        const k = Math.round(f * 300)
        if (k !== lastFill) { lastFill = k; fillPath.setAttribute('r', RAD(f).toFixed(1)); barFill.style.width = (Math.min(1, f) * 100).toFixed(1) + '%' }
        const s = Math.ceil(runtime.timeLeft || 0), tt = `⏱ ${s} s` // reloj del minijuego: se pone rojo y late en los últimos 5 s
        if (timerEl.textContent !== tt) { timerEl.textContent = tt; timerEl.classList.toggle('gx-timer--poco', s <= 5) }
        const p = runtime.prompt || '', long = p.length > 16 // el rótulo dice qué hacer (Inhalar / Sostener / Exhalar); la frase completa va en el mensaje de arriba
        label.textContent = runtime.label || (long || !p ? 'Respirar' : p)
        if ((long || runtime.label) && p && p !== lastPrompt) msg.textContent = p
        lastPrompt = p
        // qué hacer con el clic en este momento: mantener (inhalar / retener) o soltar (exhalar / pausa)
        const h = step || !runtime.action ? '' : runtime.action === 'hold'
            ? (isTouch() ? 'Mantén presionado Interactuar' : 'Mantén el clic o la barra espaciadora')
            : (isTouch() ? 'Suelta el botón Interactuar' : 'Suelta el clic')
        if (h !== lastHint) { lastHint = h; hint.textContent = h; hint.dataset.action = runtime.action }
    },
    fade(o, d = 1, cb) { gsap.to(fadeEl, { opacity: o, duration: d, onComplete: cb }) },
    flash(cb) { // destello blanco que se apaga a negro (el golpe del sismo)
        gsap.killTweensOf(fadeEl); gsap.set(fadeEl, { opacity: 1, backgroundColor: '#e4ffff' })
        gsap.to(fadeEl, { backgroundColor: '#000000', duration: 1.4, ease: 'power2.in', onComplete: cb })
    },
    whisper(lines, cb) { // frases sueltas sobre la pantalla negra, una tras otra
        whispering = true
        const tl = gsap.timeline({ onComplete: () => { whisperEl.textContent = ''; whispering = false; cb?.() } })
        lines.forEach(l => tl.call(() => { whisperEl.textContent = l }).to(whisperEl, { opacity: 1, duration: 1.1 }).to(whisperEl, { opacity: 0, duration: 1.1 }, '+=1.4'))
    },
    // opts: { type: true → el texto se escribe letra por letra · onContinue → muestra el botón "Continuar" }
    card(title, text = '', opts = {}) {
        cardT.stop(); cardTl?.kill(); gsap.killTweensOf([card, cardH, cardP, cardActions]); onCardNext = null; cardReady = false; cardFilled = false
        if (!title) { if (!card.hidden) gsap.to(card, { opacity: 0, duration: 0.7, onComplete: () => { card.hidden = true } }); return } // se va con un fundido
        const wasHidden = card.hidden
        const fill = () => { // el texto completo se pone invisible desde el principio: así la tarjeta ya tiene su alto y el título no se mueve cuando el texto aparece
            cardH.textContent = title; cardText = text; cardP.innerHTML = ''; const ghost = document.createElement('span'); ghost.style.visibility = 'hidden'; ghost.textContent = text; cardP.append(ghost)
            gsap.set([cardH, cardP], { opacity: 0 }); onCardNext = opts.onContinue || null; cardFilled = true
            cardActions.hidden = !onCardNext; cardActions.style.visibility = 'hidden' // el botón ocupa su lugar desde el principio, pero aparece después
        }
        card.hidden = false
        cardTl = gsap.timeline()
        if (wasHidden) { fill(); cardTl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.8 }) }
        else cardTl.to(card, { opacity: 1, duration: 0.2 }).to([cardH, cardP, cardActions], { opacity: 0, duration: 0.5 }, 0).call(fill) // de una tarjeta a otra: lo de antes se desvanece primero
        cardTl.to(cardH, { opacity: 1, duration: 0.9, ease: 'power1.out' }, '+=0.1')
            .call(() => {
                gsap.set(cardP, { opacity: 1 })
                if (opts.type) cardT.write(text, true, () => showCardNext(1.2))
                else { cardT.write(text); gsap.fromTo(cardP, { opacity: 0 }, { opacity: 1, duration: 0.8 }); showCardNext(1.6) }
            })
    },
    get blackout() { return !card.hidden || whispering }, // tarjeta o frases sobre negro: los botones de arriba se esconden
    controls(onClose) { openHold($('.gx-controls'), onClose) }, // pop-up de controles del inicio
    tutorial(info, onClose) { // pop-up "Cómo se juega". info: { sub, steps: [], page → enlace a la página que explica la técnica }
        const m = $('.gx-tutorial'), list = m.querySelector('.gx-list'), more = m.querySelector('.gx-more')
        m.querySelector('.gx-sub').textContent = info.sub
        more.hidden = !info.page; if (info.page) more.href = info.page
        list.innerHTML = ''; info.steps.forEach(s => { const el = document.createElement('li'); el.textContent = s; list.appendChild(el) })
        openHold(m, onClose)
    },
    // diálogo con un personaje. opts: { onLine(i) → al mostrar cada frase · onEnd → al cerrar }
    talk(name, ls, opts = {}) { talker = name; lines = ls; li = 0; onLine = opts.onLine || null; onEnd = opts.onEnd || null; talkEl.hidden = false; talkSince = performance.now(); showLine(); talkNext.focus({ preventScroll: true }) },
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