// Indice
    // 0. Imports
    // 1. Constantes y estado
    // 2. Rutina del día
    // 3. Cambio de espacio
    // 4. Vestirse y desayuno con mamá
    // 5. El MIO
    // 6. Interacción
    // 7. Explicación de los minijuegos
    // 8. Máquina de estados
    // 9. Eventos de respiración
    // 10. Modo ?debug (sin narrativa)
    // 11. Bucle principal
    // 12. Inicio

// 0. Imports
import gsap from 'gsap'
import * as THREE from 'three'
import { CONFIG, runtime } from './config.js'
import { sm } from './stateMachine.js'
import { renderer, scene, canvas, renderSharp } from './scene.js'
import { camera, updateCamera } from './camera.js'
import { updateEnvironment, props, uniBus, resetProps, marker, setSpace, SEATS, SEGS, atUniversity, nearUniversity, endless, HOME_DOOR, STREET_X0, ROUTE_LEN, routePoint, nearestSeg, scareBuilding } from './environment.js'
import { player } from './player.js'
import { breathing } from './breathing.js'
import { updateAnxiety } from './anxiety.js'
import { audio } from './audio.js'
import { ui } from './ui.js'
import { initDebug } from './debug.js'
import { updateNpcs, npcState, mom } from './npcs.js'
import { haptics } from './haptics.js'
import './touch.js'

// 1. Constantes y estado
document.documentElement.classList.add('sin-scroll')
const W = CONFIG.world, C = CONFIG.crisis, B = CONFIG.bus, HX = W.homeX
const auto = () => !runtime.sandbox // false en ?debug: la historia no avanza sola
const initAudio = () => audio.init() // el audio arranca con el primer gesto del usuario (el navegador no permite sonido antes)

// 2. Rutina del día: se repite antes y después del sismo
// Orden: levantarse → vestirse (armario) → recoger celular y maleta (en el orden que quieras) → bajar → mamá (saludo) → desayunar
//        → mamá se despide (después del sismo te consuela) → salir por la puerta principal → (antes del sismo) subir al MIO
const ITEMS = ['celular', 'maleta'], NAMES = { celular: 'el celular', maleta: 'la maleta' }
// Lo que toca hacer no se dice con texto (rompía la inmersión): el objetivo brilla y una flecha guía hacia él (sección 11)
const TASK_SPACE = { cama: 'HOUSE', armario: 'HOUSE', items: 'HOUSE', puerta: 'HOUSE', mama: 'HOME', desayuno: 'HOME', salida: 'HOME', bus: 'STREET' }
let up = false, dressed = false, down = false, momDone = false, ate = false, out = false, got = new Set(), busy = false, arrived = false, busAsked = false
const rand = (a, b) => a + Math.random() * (b - a)
const dist = (id) => { // distancia del personaje al objeto (el MIO se mide contra su huella en planta)
    const p = props[id], r = p.rect
    if (r) return Math.hypot(Math.max(r[0] - player.x, 0, player.x - r[1]), Math.max(r[2] - player.z, 0, player.z - r[3]))
    return Math.hypot(player.x - p.pos.x, player.z - p.pos.z)
}
const nearBus = (r = CONFIG.player.reach) => runtime.space === 'STREET' && dist('bus') < r
const pending = () => ITEMS.filter(i => !got.has(i))
const current = () => !up ? 'cama' : !dressed ? 'armario' : pending().length ? 'items' : !down ? 'puerta' : !momDone ? 'mama' : !ate ? 'desayuno' : !out ? 'salida' : !runtime.postQuake ? 'bus' : null

function startRoutine(post) {
    resetProps(); resetBreakfast()
    up = dressed = down = momDone = ate = out = arrived = busy = busAsked = braked = busDone = false; got.clear(); resetScare(); player.setBackpack(false)
    introEarth = false; runtime.postQuake = post; runtime.healed = false; runtime.envProgress = post ? 0 : 1; runtime.anxiety = post ? 0.08 : 0; runtime.stress = 0
    houseCrisis = ['armario', ...ITEMS][Math.floor(Math.random() * 3)]; earthRun = 0
    setSpace('HOUSE'); runtime.nextCrisis = C.first; player.lieDown(); CONFIG.camera.x = W.houseCenterX; CONFIG.camera.z = 0
}

// 3. Cambio de espacio: cuarto, planta baja, calle e interior del MIO con un fundido
const streetCam = (x, z) => { // la cámara mira hacia donde avanza el tramo de la calle y se centra un poco sobre ella
    const L = CONFIG.camera.lead, s = nearestSeg(x, z)
    return s.axis === 'x' ? [x + L * s.dir, s.z0 + (z - s.z0) * 0.4] : [s.x0 + (x - s.x0) * 0.4, z + L * s.dir]
}
function goTo(space, x, z, camX, camZ = 0) { player.unsit(); setSpace(space); runtime.busMoving = false; player.x = x; player.z = z; CONFIG.camera.x = camX; CONFIG.camera.z = camZ } // el MIO no arranca hasta que te sientes
const goStreet = (x, z) => goTo('STREET', x, z, ...streetCam(x, z))
function transition(fn) {
    busy = true; player.setMode('stop')
    ui.fade(1, 0.5, () => { fn(); ui.fade(0, 0.6, () => { busy = false; if (runtime.state === 'EXPLORATION') player.setMode('free') }) })
}
// apareces en el caminito, frente a la puerta de la casa. Después del sismo, la primera crisis en la calle llega enseguida y siempre es
// el Earthing (presenta la mecánica); de ahí en adelante los minijuegos salen al azar
let introEarth = false
const exitHouse = () => transition(() => { out = true; goStreet(HOME_DOOR.x, HOME_DOOR.z + 2); if (runtime.postQuake) { introEarth = true; runtime.nextCrisis = 3 } })
const goDown = () => transition(() => { down = true; runtime.nextCrisis = rand(C.min, C.max); goTo('HOME', HX + 0.4, -0.3, HX) })  // bajas las escaleras: cocina, comedor y sala
// Cámara enfocada: se acerca a un punto (al despertar después del sismo) o al personaje (antes de los finales)
let focus = null
const focusOn = (x, z, zoom) => { focus = { x, z }; CONFIG.camera.x = x; CONFIG.camera.z = z; CONFIG.camera.zoom = zoom }
const zoomToPlayer = (cb) => { focus = 'player'; gsap.to(CONFIG.camera, { zoom: 2.5, duration: 2.6, ease: 'power2.inOut', onComplete: cb }) }
const resetFocus = () => { focus = null; gsap.killTweensOf(CONFIG.camera); CONFIG.camera.zoom = 1 }

// Susto en la calle (después del sismo): un edificio cercano empieza a temblar y a inclinarse, y eso dispara la crisis
let scared = null, scareCalm = false, lastScare = -999 // lastScare: cuándo fue el último susto (hay un mínimo de tiempo entre uno y otro)
function scare(t) {
    if (t - lastScare < CONFIG.street.scareGap) return false
    const e = scareBuilding(player.x, player.z); if (!e) return false
    scared = e; lastScare = t; busy = true; player.setMode('stop'); faceTo(e.x, e.g.position.z); ui.say('Ese edificio... ¿se está moviendo?') // se voltea a mirarlo
    gsap.to(e, { sh: 0.45, duration: 0.5 }); gsap.to(e, { tilt: 0.07, sink: 0.12, duration: 2.2, delay: 0.5, ease: 'power2.in' }) // sutil: tiembla y se ladea apenas
    haptics.buzz([120, 80, 120, 80, 200, 60, 300])
    gsap.to({}, { duration: 0.22, repeat: 8, onRepeat: () => !runtime.paused && audio.blip(40 + Math.random() * 25, 0.25, 0.07, 'sawtooth') })
    gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, 0.55), duration: 2 })
    gsap.delayedCall(2.8, () => { busy = false; if (runtime.state === 'EXPLORATION') sm.go('ANXIETY') })
    return true
}
function settleScare(ok) { // después de la crisis, el edificio vuelve despacio a su lugar (nunca se cayó)
    if (!scared) return
    gsap.to(scared, { sh: 0, tilt: 0, sink: 0, duration: 2.5, ease: 'power2.out' }); scared = null; scareCalm = ok
}
const resetScare = () => { if (scared) { gsap.killTweensOf(scared); Object.assign(scared, { sh: 0, tilt: 0, sink: 0 }); scared = null } scareCalm = false }

function getUp() { player.standUp(props.cama.pos.x, props.cama.pos.z); up = true }
// Levantarse es una escena, no una interacción: Gabriela se queda un rato acostada y se para sola (después del sismo le cuesta más)
function wakeUp(delay) {
    busy = true; player.setMode('stop')
    gsap.delayedCall(delay, () => {
        if (!runtime.postQuake) { busy = false; getUp(); return player.setMode('free') }
        ui.say('Tardas más en levantarte...'); gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, 0.15), duration: 2 })
        gsap.delayedCall(1.6, () => { busy = false; getUp(); if (runtime.state === 'EXPLORATION') player.setMode('free') })
    })
}
// Después del sismo, la primera crisis en el cuarto llega al hacer una de estas tres cosas (al azar): vestirse, coger el celular o la maleta
let houseCrisis = null
function maybeHouseCrisis(id) {
    if (!runtime.postQuake || !auto() || houseCrisis !== id) return
    houseCrisis = null; gsap.delayedCall(0.9, () => { if (runtime.state === 'EXPLORATION') sm.go('ANXIETY') })
}

// 4. Vestirse y desayuno con mamá
function dress() { // la acción no se ve: la pantalla funde a negro mientras te cambias
    busy = true; player.setMode('stop')
    ui.fade(1, 0.5, () => {
        ui.say(runtime.postQuake ? 'Te cuesta decidir qué ponerte...' : 'Te vistes para ir a la universidad.')
        gsap.delayedCall(runtime.postQuake ? 1.8 : 0.9, () => ui.fade(0, 0.5, () => { busy = false; dressed = true; if (runtime.state === 'EXPLORATION') player.setMode('free'); maybeHouseCrisis('armario') }))
    })
}
// Frases: un texto lo dice mamá; [quién, texto] lo dice otra persona. hello = al llegar a la cocina · bye = después de desayunar
const ME = 'Tú'
const MOM_LINES = {
    pre: {
        hello: ['¡Buenos días, mi amor! ¿Dormiste bien?', 'Te preparé el desayuno: arepa con huevito y chocolate. Está ahí en la isla, cómetelo antes de irte.'],
        bye: ['¡Eso, te lo comiste todito!', 'Que te vaya muy bien hoy. ¡Mucha suerte en la universidad!']
    },
    post: {
        hello: ['Buenos días, hija... ¿Pudiste dormir algo anoche?', [ME, 'Casi nada...'], 'Te dejé el desayuno listo en la isla. Come aunque sea un poquito, ¿sí?'],
        bye: [ // después del sismo mamá intenta que te sientas mejor y que quieras salir
            [ME, 'No quiero salir, mamá. ¿Y si vuelve a temblar?'],
            'Lo sé, mi amor. A mí también me cuesta. Si se te acelera el pecho, respira despacito.',
            [ME, '...Bueno. Lo voy a intentar.'],
            'Y si se pone difícil, me llamas y voy por ti.'
        ]
    }
}
const momLines = () => runtime.postQuake ? MOM_LINES.post : MOM_LINES.pre
const freeAgain = () => { busy = false; if (runtime.state === 'EXPLORATION') player.setMode('free') }
// Gabriela gira hacia un punto (por el lado más corto): hacia mamá cuando hablan y hacia el edificio que parece moverse
function faceTo(x, z) {
    const r = player.group.rotation, want = Math.atan2(x - player.x, z - player.z)
    gsap.to(r, { y: r.y + Math.atan2(Math.sin(want - r.y), Math.cos(want - r.y)), duration: 0.4, ease: 'power2.out' })
}
const faceMom = () => faceTo(mom.g.position.x, mom.g.position.z)
function talkToMom() {
    busy = true; player.setMode('stop'); ui.say(''); mom.setTalking(true); faceMom()
    ui.talk('Mamá', momLines().hello, { onEnd: () => { mom.setTalking(false); momDone = true; freeAgain() } })
}
const FOOD = () => props.desayuno.mesh.children.slice(1, 3) // arepa y huevo (el plato y la taza se quedan)
function resetBreakfast() { FOOD().forEach(m => m.scale.setScalar(1)) }
function eat() { // se ve cómo el desayuno va desapareciendo a mordiscos; después del sismo solo comes un poco
    busy = true; player.setMode('stop')
    const post = runtime.postQuake, left = post ? 0.55 : 0.001, p = props.desayuno.pos, [arepa, egg] = FOOD()
    player.group.rotation.y = Math.atan2(p.x - player.x, p.z - player.z)
    ui.say(post ? 'Te cuesta tragar... comes despacio.' : 'Comes tu desayuno.')
    gsap.timeline({ onComplete: () => { ate = true; ui.say(post ? 'Solo logras comer un poco.' : 'Te comiste todo el desayuno.'); gsap.delayedCall(1.2, momBye) } })
        .to(arepa.scale, { x: left, y: left, z: left, duration: post ? 2.6 : 1.8, ease: 'steps(4)' })
        .to(egg.scale, { x: left, y: left, z: left, duration: post ? 1.4 : 0.9, ease: 'steps(2)' }, '+=0.3')
}
function momBye() {
    const post = runtime.postQuake; mom.setTalking(true); ui.say(''); faceMom() // después de comer se voltea de nuevo hacia ella
    if (post) gsap.to(runtime, { anxiety: C.baseline, stress: 0, duration: 12 }) // mientras mamá te habla, la ansiedad baja poco a poco
    ui.talk('Mamá', momLines().bye, { onEnd: () => { mom.setTalking(false); if (post) runtime.nextCrisis = C.first; freeAgain() } })
}

// 5. El MIO: antes del sismo es el viaje normal (el sismo llega durante el trayecto).
//    Después es opcional y es un atajo: un frenón te devuelve a ese día y después llegan más crisis. Si pierdes un minijuego
//    te bajas y sigues a pie; si aguantas todo el viaje, el MIO te deja frente a la universidad
let busRide = 0, busTraumaAt = 0, braked = false, busDone = false, earthRun = 0 // earthRun: Earthings seguidos (nunca más de dos)
const askBus = () => { busAsked = true; sm.go('CHOICE') }
function boardBus() {
    ui.hideChoice(); if (runtime.state === 'CHOICE') sm.go('EXPLORATION')
    const post = runtime.postQuake
    const board = () => transition(() => {
        runtime.rideLeft = post ? B.time : B.calmRide; runtime.nextCrisis = rand(B.crisisMin, B.crisisMax); busRide = 0; braked = false; busTraumaAt = rand(B.traumaMin, B.traumaMax)
        if (post) runtime.anxiety = Math.max(runtime.anxiety, B.startAnxiety)
        goTo('BUS', W.busStartX, 0, W.busInteriorX)
    })
    if (!post) return board()
    busy = true; player.setMode('stop'); ui.say('Te tiemblan las piernas frente a la puerta del MIO...') // la aprehensión antes de subir
    gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, B.startAnxiety), duration: 1.6 })
    gsap.delayedCall(2, board)
}
function declineBus() { ui.hideChoice(); sm.go('EXPLORATION'); ui.say('Sigues a pie.') }
function busTrauma() { // el MIO frena de golpe y todo vibra: el cuerpo lo vive como el sismo
    busy = true; braked = true; player.setMode('stop'); ui.say('El MIO frena de golpe... todo vibra como ese día.') // sigue sentada: del MIO solo se baja eligiendo hacerlo
    haptics.buzz([350, 60, 250, 60, 250, 60, 400])
    const shake = gsap.timeline().to(runtime, { quake: 0.45, duration: 0.25 }).to(runtime, { quake: 0.15, duration: 0.35, yoyo: true, repeat: 3 }).to(runtime, { quake: 0, duration: 0.5 })
    gsap.to({}, { duration: 0.2, repeat: 8, onRepeat: () => !runtime.paused && audio.blip(45 + Math.random() * 20, 0.25, 0.14, 'sawtooth') })
    gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, 0.7), duration: 1.5 })
    shake.eventCallback('onComplete', () => { busy = false; sm.go('ANXIETY') })
}
function busLostChoice() { // perdiste un minijuego dentro del MIO: puedes bajarte o intentar seguir hasta la universidad
    player.setMode('stop')
    ui.choice('Perdiste el ritmo', 'El MIO sigue avanzando. Puedes bajarte aquí y seguir a pie, o quedarte e intentar llegar hasta la universidad.', [
        { label: 'Quedarme', dir: 'left', fn: () => { ui.hideChoice(); runtime.nextCrisis = rand(B.crisisMin, B.crisisMax); sm.go('EXPLORATION') } },
        { label: 'Bajarme', dir: 'right', fn: () => { ui.hideChoice(); busDone = true; sm.go('EXPLORATION'); transition(() => { leaveBus(); ui.say('Te bajas del MIO y sigues a pie.') }) } }])
}
// Earthing dentro del MIO: tú decides si bajarte a buscar pasto o quedarte (y entonces la ansiedad sube un nivel)
function busEarthChoice() {
    player.setMode('stop')
    ui.choice('Necesitas aire', 'El cuerpo te pide bajar a pisar el pasto. Si te quedas en el MIO, la ansiedad va a subir.', [
        { label: 'Quedarme', dir: 'left', fn: () => {
            ui.hideChoice(); gsap.to(runtime, { anxiety: Math.min(1, runtime.anxiety + B.stayAnxiety), duration: 1.2 })
            runtime.nextCrisis = rand(B.crisisMin, B.crisisMax); ui.say('Te quedas. El pecho se aprieta más...'); sm.go('EXPLORATION')
        } },
        { label: 'Bajarme', dir: 'right', fn: () => {
            ui.hideChoice(); busDone = true; busy = true
            ui.say('Bajas del MIO a buscar pasto.'); ui.fade(1, 0.4, () => { leaveBus(); ui.fade(0, 0.5, () => { busy = false; sm.go('BREATHING') }) })
        } }])
}
// Bajarse del MIO: aparece en la calle a la altura del trayecto recorrido (a la derecha de la calle, en el tramo que toque)
const leaveBus = () => {
    const p = Math.min(1, Math.max(0, 1 - runtime.rideLeft / B.time)), d0 = W.busX + 3 - STREET_X0
    const [x, z, s] = routePoint(d0 + p * (ROUTE_LEN - d0 - 10))
    s.axis === 'x' ? goStreet(x, z + 1.5) : goStreet(x + 1.5, z)
}
const rideEnd = () => transition(() => { // aguantaste el viaje: el MIO te deja frente a la universidad (y ya no está en el paradero de la casa)
    busDone = true; props.bus.mesh.visible = false; uniBus.visible = true
    goStreet(W.uniX - 1, W.uniGateZ + 4); ui.say('El MIO te deja frente a la universidad.')
})
function startRide() { if (runtime.busMoving) return; runtime.busMoving = true; haptics.buzz(120) } // el MIO arranca cuando te sientas por primera vez

// 6. Interacción: tecla E o clic
function interact() {
    if (runtime.paused || runtime.state !== 'EXPLORATION' || busy) return
    if (runtime.space === 'BUS') { // sentarse / levantarse en las bancas del MIO
        if (player.sitting) return // sentada no se para: solo se baja cuando el juego le da la opción (al perder un minijuego o en el Earthing)
        const s = SEATS.filter(s => !s.taken).sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0]
        if (s && Math.hypot(s.x - player.x, s.z - player.z) < 2.2) { player.sit(s, true); return startRide() }
    }
    if (runtime.postQuake && !current() && nearBus()) return busDone ? ui.say('No te sientes capaz de volver a subir al MIO. Sigues a pie.') : askBus() // pulsar E junto al MIO vuelve a abrir la opción
    const c = current(); if (!c || c === 'cama' || TASK_SPACE[c] !== runtime.space) return // la cama no se usa: levantarse es una escena (wakeUp)
    if (c === 'items') { // cualquier objeto pendiente, en el orden que quieras: se recoge el más cercano
        const [id, d] = pending().map(i => [i, dist(i)]).sort((x, y) => x[1] - y[1])[0]
        if (d > CONFIG.player.reach) return
        props[id].mesh.visible = false; got.add(id); if (id === 'maleta') player.setBackpack(true) // la maleta pasa a la espalda
        return maybeHouseCrisis(id)
    }
    if (dist(c) > (c === 'mama' ? 2.4 : c === 'desayuno' ? 1.0 : CONFIG.player.reach)) return // lejos: no pasa nada (el desayuno pide estar junto a la isla)
    if (c === 'armario') return dress()
    if (c === 'puerta') return goDown()
    if (c === 'mama') return talkToMom()
    if (c === 'desayuno') return eat()
    if (c === 'salida') return exitHouse()
    if (c === 'bus') return boardBus()
}
let rumble = 0, doorMsgT = -9, endlessSaid = false
addEventListener('keydown', (e) => e.code === 'KeyE' && !e.repeat && interact()); canvas.addEventListener('pointerdown', interact)

// 7. Explicación de los minijuegos: sale la primera vez que aparece cada tipo (se reinicia al recargar la página)
const seenTutorials = new Set()
const TUTORIALS = {
    hold: [ // explica todos los ejercicios de respiración (no una técnica en particular)
        'Antes de empezar hay una cuenta: 3, 2, 1. Cada vez sale una técnica distinta, con sus propios tiempos.',
        'El aro brillante marca el ritmo y el círculo claro de adentro es tu respiración.',
        'Inhalar y Sostener: mantén el clic o la barra espaciadora (en pantalla táctil, el botón Interactuar). Exhalar y Pausa: suelta.',
        'Tu círculo tiene que seguir al aro, dentro de la franja gris clara. Si sueltas antes de tiempo y te sales, la crisis no pasa.',
        'El reloj cuenta los segundos de cada fase. En las técnicas que se repiten, el aro brilla amarillo dos veces antes de volver a inhalar.'],
    earth: ['Camina (WASD, flechas o el joystick) hasta uno de los parches de pasto verde junto a la calle. La flecha dorada te indica hacia dónde.', 'Quédate sobre el parche verde respirando lento.', 'Solo ahí baja tu ansiedad: si sales, lo avanzado se va perdiendo.', 'Tienes un tiempo límite: mira el reloj junto al medidor. Si se acaba antes de llenar la barra, no lo lograste.']
}

// 8. Máquina de estados
sm.on('INTRO', () => {
    startRoutine(false); player.setMode('stop'); ui.card('10 de agosto', '6:00 a. m.')
    gsap.delayedCall(3, () => { ui.card(); ui.fade(0, 1.5, () => ui.controls(() => { sm.go('EXPLORATION'); wakeUp(0.6) })) }) // antes de poder moverte: pop-up con los controles; después Gabriela se levanta sola
})
sm.on('EXPLORATION', () => { player.setMode('free') })
sm.on('QUAKE', () => {
    player.setMode('stop'); ui.say(''); ui.card('07:34 a. m.')
    gsap.delayedCall(2.5, () => {
        ui.card(); clearInterval(rumble)
        rumble = setInterval(() => { if (runtime.paused) return; audio.blip(40 + Math.random() * 25, 0.25, 0.15, 'sawtooth'); haptics.buzz(Math.round(60 + 160 * runtime.quake)) }, 220) // la vibración crece con el sismo
        gsap.to(runtime, { quake: 1, anxiety: 0.8, duration: 5, ease: 'power1.in', onComplete: () => {
            clearInterval(rumble)
            if (runtime.sandbox) return void gsap.to(runtime, { quake: 0, anxiety: 0.1, duration: 1.5, onComplete: () => sm.go('EXPLORATION') }) // debug: el sismo se puede repetir sin seguir la historia
            // el golpe: destello blanco, corte a negro, silencio con pitido en los oídos y frases sueltas
            ui.flash(); audio.ring(5); runtime.quake = 0; haptics.buzz(500)
            gsap.delayedCall(1.8, () => ui.whisper(['Todo se movió.', 'Y después... silencio.'], () => sm.go('ANNOUNCEMENT')))
        } })
    })
})
sm.on('ANNOUNCEMENT', () => {
    ui.card('Sismo en Colombia', 'Durante la mañana del 10 de agosto, un fuerte sismo sacudió diferentes zonas del país. El movimiento provocó alteraciones en la rutina de miles de personas y dejó a muchas comunidades enfrentando sus consecuencias. Aunque el movimiento terminó, sus efectos no necesariamente desaparecen cuando la tierra deja de temblar.', { type: true, onContinue: () => {
        ui.card('Una semana después', '6:00 a. m.')
        gsap.delayedCall(3, () => { // la casa aparece despacio, con la cámara cerca de la cama, y se va abriendo
            ui.card(); runtime.quake = 0; startRoutine(true)
            focusOn(-1.5, -2.2, 1.9); ui.fade(0, 3) // la cámara empieza cerca de la cama...
            const tl = gsap.timeline({ delay: 1.2, onComplete: () => { focus = null; wakeUp(0.3) } }) // ...y vuelve en un solo movimiento a la cámara normal del cuarto (zoom y posición a la vez)
            tl.to(CONFIG.camera, { zoom: 1, duration: 4.5, ease: 'power2.inOut' }, 0).to(focus, { x: W.houseCenterX, z: 0, duration: 4.5, ease: 'power2.inOut' }, 0)
            sm.go('EXPLORATION'); busy = true; player.setMode('stop') // sigue acostada mientras la cámara se abre
        })
    } })
})
sm.on('CHOICE', () => {
    player.setMode('stop')
    ui.choice('Llegó el MIO', 'Puedes subirte o seguir caminando hasta la universidad. Tú decides. Los espacios cerrados y llenos pueden sentirse más intensos.', [
        { label: 'Subir al MIO', dir: 'right', fn: boardBus }, { label: 'Seguir caminando', dir: 'left', fn: declineBus }])
})
sm.on('ANXIETY', () => {
    if (introEarth && runtime.space === 'STREET') { introEarth = false; breathing.force('earth') } // primera crisis en la calle: Earthing
    player.setMode('stop'); ui.say('Algo dentro no se calma...'); breathing.pick(runtime.space, earthRun >= 2) // el Earthing nunca sale más de dos veces seguidas
    earthRun = runtime.techId === 'earth' ? earthRun + 1 : 0
    gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, C.startAnxiety), duration: 1 })
    if (runtime.techId === 'earth' && runtime.space === 'BUS') return void gsap.delayedCall(1.2, () => runtime.state === 'ANXIETY' && sm.go('BUS_EARTH')) // en el MIO: ¿bajarse o quedarse?
    gsap.delayedCall(1.5, () => runtime.state === 'ANXIETY' && sm.go('BREATHING'))
})
sm.on('BUS_EARTH', busEarthChoice)
sm.on('BUS_LOST', busLostChoice)
sm.on('BREATHING', () => {
    player.setMode('guided')
    const tech = breathing.prepare(), mech = tech.game || 'hold' // box y body se juegan igual (mantener y soltar)
    ui.say(`Autorregulación: ${tech.name}`)
    const begin = () => { breathing.start(); ui.showBreath(true); if (tech.game === 'earth') player.setMode('free') }
    if (seenTutorials.has(mech)) return begin()
    seenTutorials.add(mech); ui.tutorial({ sub: mech === 'hold' ? 'Ejercicios de respiración' : tech.name, steps: TUTORIALS[mech], page: tech.page }, begin) // primera vez: explica cómo se juega y espera
})
sm.on('CALM', () => { // transitorio: la crisis pasó y la rutina continúa
    player.setMode('calm'); ui.say(scareCalm ? 'El edificio sigue en su lugar. Estás aquí. Ahora.' : 'Estás aquí. Ahora.'); scareCalm = false
    gsap.delayedCall(2.5, () => { if (runtime.state === 'CALM') sm.go('EXPLORATION') })
})
// Finales: antes de la escena final la cámara se acerca despacio a Gabriela
sm.on('FAILURE', () => {
    breathing.stop(); ui.showBreath(false); player.setMode('agitated'); ui.say('Todo se desborda...')
    gsap.to(runtime, { anxiety: 1, duration: 2 }); zoomToPlayer(() => gsap.delayedCall(0.8, () => sm.go('ENDING_BAD')))
})
sm.on('ARRIVAL', () => {
    arrived = true; runtime.healed = true; player.setMode('calm'); breathing.stop(); // healed: el mundo vuelve al nivel -1 (colores normales, sin blur)
    ui.showBreath(false); ui.say('Llegaste a la universidad.')
    gsap.to(runtime, { anxiety: 0, envProgress: 1, duration: 4 }); zoomToPlayer(() => gsap.delayedCall(1, () => sm.go('ENDING_GOOD')))
})
sm.on('ENDING_GOOD', () => ui.ending('Final positivo', 'El miedo no desapareció de un momento a otro. Pero aprendiste a volver al presente. [PLACEHOLDER]'))
sm.on('ENDING_BAD', () => ui.ending('Final negativo', 'A veces volver a sentirse seguro toma tiempo. Pedir ayuda también puede ser parte del proceso. [PLACEHOLDER]'))

// 9. Eventos de respiración: cada evento es UN solo ciclo
breathing.init({
    onPhase: (p) => audio.breathCue(p),
    onCycle: (ok) => {
        const bus = runtime.space === 'BUS'
        runtime.stress = 0 // los choques de antes de la crisis ya no cuentan para la siguiente
        ui.showBreath(false); audio.result(ok); runtime.nextCrisis = bus ? rand(B.crisisMin, B.crisisMax) : rand(C.min, C.max)
        settleScare(ok) // el edificio del susto vuelve a su lugar
        if (runtime.sandbox) { // debug: el resultado no cuenta para la historia (ni fallos ni final negativo)
            ui.say(ok ? 'Minijuego superado (debug).' : 'Minijuego no superado (debug).')
            gsap.to(runtime, { anxiety: bus ? B.baseline : C.baseline, duration: 1.5 })
            return void gsap.delayedCall(2, () => { if (runtime.state === 'BREATHING') sm.go('EXPLORATION') })
        }
        if (ok) {
            // Niveles de ansiedad (failStreak = glitch): -1 antes del sismo y tras el final bueno · 0 después del sismo · 1 alucinaciones (edificios que caen, cosas que no existen)
            // · 2 personas fantasma · 3 final negativo. Perder sube un nivel; ganar baja SOLO uno (si ibas en 2, quedas en 1, no en 0)
            runtime.successful++; runtime.failStreak = Math.max(0, (runtime.failStreak || 0) - 1); runtime.glitch = runtime.failStreak
            gsap.to(runtime, { anxiety: (bus ? B.baseline : C.baseline) + 0.2 * runtime.failStreak, duration: 1.5 }) // con nivel 1 o 2 la ansiedad no vuelve del todo a la calma
            gsap.to(runtime, { envProgress: Math.min(1, runtime.envProgress + CONFIG.env.successGain), duration: 3 })
            return sm.go('CALM')
        }
        runtime.failures++; runtime.failStreak = (runtime.failStreak || 0) + 1; runtime.glitch = runtime.failStreak; runtime.anxiety = Math.min(1, runtime.anxiety + CONFIG.anxiety.failPenalty); ui.say('Perdiste el ritmo. Sigue, sin prisa.')
        if (runtime.failStreak >= CONFIG.maxFailures) return sm.go('FAILURE')
        if (bus && runtime.postQuake) return void gsap.delayedCall(1.6, () => { if (runtime.state === 'BREATHING') sm.go('BUS_LOST') }) // en el MIO: ¿bajarse o seguir?
        gsap.delayedCall(2, () => { if (runtime.state === 'BREATHING') sm.go('EXPLORATION') })
    }
})

// 10. Modo ?debug (sin narrativa): saltar directo a cada mapa con todo lo anterior ya hecho
function jumpTo(map) {
    gsap.globalTimeline.clear(); ui.say(''); clearInterval(rumble); breathing.stop(); ui.showBreath(false); ui.hideChoice(); ui.hideEnding(); ui.card(); ui.closeTalk(); mom.setTalking(false); resetFocus(); resetScare()
    runtime.quake = 0; runtime.failures = 0; runtime.failStreak = 0; runtime.successful = 0; runtime.glitch = 0
    if (map === 'ANNOUNCEMENT') return sm.go('ANNOUNCEMENT')
    if (map === 'ENDING_GOOD' || map === 'ENDING_BAD') return sm.go(map)
    const post = map.endsWith('_POST') || map === 'UNIVERSIDAD'
    startRoutine(post); sm.go('EXPLORATION'); ui.fade(0, 0.3)
    if (map.startsWith('HOUSE')) return wakeUp(0.6)
    // los demás mapas empiezan de pie, vestido y con las cosas recogidas
    skipRoom(); player.standUp(0, 0)
    if (map.startsWith('HOME')) { down = true; return goTo('HOME', HX + 0.4, -0.3, HX) }
    down = momDone = ate = out = true; props.desayuno.mesh.visible = false
    if (map.startsWith('STREET')) goStreet(HOME_DOOR.x, HOME_DOOR.z + 2)
    else if (map === 'UNIVERSIDAD') { busAsked = true; goStreet(W.uniX, W.uniGateZ + 12) }
    else { // dentro del MIO (y el terremoto, que en la historia pasa durante el viaje)
        runtime.rideLeft = post ? B.time : B.calmRide; runtime.nextCrisis = rand(3, 5); busRide = 0; busTraumaAt = rand(B.traumaMin, B.traumaMax)
        if (post) runtime.anxiety = Math.max(runtime.anxiety, B.startAnxiety)
        goTo('BUS', W.busStartX, 0, W.busInteriorX); runtime.busMoving = true // en modo debug el MIO ya va en marcha
        if (map === 'TERREMOTO') sm.go('QUAKE')
    }
}
function playGame(id) { jumpTo('STREET_POST'); breathing.force(id); sm.go('ANXIETY') } // jugar un minijuego concreto (en la calle, para que también sirva el Earthing)
function forceCrisis() { if (runtime.state === 'EXPLORATION') sm.go('ANXIETY') }
initDebug({ jumpTo, playGame, forceCrisis, resetTutorials: () => seenTutorials.clear() })

// 11. Bucle principal
const clock = new THREE.Clock()
// Más gente cerca, más ansiedad y choques con NPCs = más probabilidad de crisis (el temporizador corre más rápido)
let lastBumps = 0, crowdSaid = -99, crowdHits = 0 // crowdHits: choques con gente desde el último "nivel" de ansiedad
const fragile = () => (runtime.failStreak || 0) >= 2 // con dos minijuegos perdidos seguidos, chocar con alguien basta para una crisis
const crisisMult = () => Math.min(2.5, 1 + npcState.near * 0.35 + runtime.anxiety * 1.5 + (fragile() ? runtime.stress * 2 : 0)) // con tope: si no, rodeada de gente las crisis se encadenaban sin pausa · los choques solo aceleran la crisis si estás frágil
let lastState = '', stateT = 0, breathIdle = 0 // breathIdle: segundos en BREATHING con el minijuego ya terminado (no desde que empezó)
const blockMsg = (t, text) => { if (t - doorMsgT > 2.5) { doorMsgT = t; ui.say(text) } }
function skipRoom() { // ?debug: lo que faltaba en el cuarto se da por hecho
    up = dressed = true; ITEMS.forEach(i => { got.add(i); props[i].mesh.visible = false }); player.setBackpack(true)
}
function doors(t) { // puertas: cruzar el marco cambia de espacio si ya hiciste lo necesario; si no, no te deja pasar (en ?debug siempre se puede)
    if (runtime.space === 'HOUSE' && up && player.z > 3.2 && Math.abs(player.x + 5) < 0.95) {
        if (current() === 'puerta') goDown()
        else if (runtime.sandbox) { skipRoom(); goDown() }
        else { player.z = 3.0; blockMsg(t, !dressed ? 'Todavía estás en pijama.' : `Te falta ${pending().map(i => NAMES[i]).join(' y ')}.`) } // lo que piensa Gabriela, no una orden
    }
    if (runtime.space === 'HOME' && player.x > HX + 6.3) {
        if (current() === 'salida') exitHouse()
        else if (runtime.sandbox) { momDone = ate = true; props.desayuno.mesh.visible = false; exitHouse() }
        else { player.x = HX + 6.1; blockMsg(t, !momDone ? 'Mamá te está esperando en la cocina.' : !ate ? 'No has desayunado.' : 'No te has despedido de mamá.') }
    }
}
function street(t, dt) {
    const k = endless() // calle eterna
    if (k > 0.6 && !endlessSaid) { endlessSaid = true; ui.say('La calle parece no terminar nunca...') } else if (k < 0.3) endlessSaid = false
    if (!runtime.postQuake) { if (!busy && auto() && current() === 'bus' && nearBus(0.9)) boardBus(); return }
    if (!auto()) { if (atUniversity(player.x, player.z)) blockMsg(t, 'Llegaste a la universidad (modo debug: el final no se activa).'); return }
    if (runtime.anxiety < C.driftMax) runtime.anxiety += C.drift * dt // incomodidad que va creciendo
    if (!busy && !nearUniversity(player.x, player.z) && (runtime.nextCrisis -= dt * crisisMult()) <= 0) { // crisis esporádicas: a veces empiezan con un edificio que parece moverse
        if (Math.random() < CONFIG.street.scareChance && scare(t)) return
        return sm.go('ANXIETY')
    }
    if (!arrived && atUniversity(player.x, player.z)) return sm.go('ARRIVAL')
    if (!busy && !current() && !busAsked && !busDone && !arrived && nearBus(0.9)) askBus()
}
// Flecha guía: una punta dorada que flota a la altura del pecho de Gabriela y señala hacia el objetivo (en la calle, hacia la universidad).
// Reemplaza los textos de "ve a...": solo aparece cuando el objetivo está lejos. Antes iba pegada al piso y parecía hundirse en el pasto
const guide = new THREE.Group(), guideTip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 12), new THREE.MeshBasicMaterial({ color: 0xf2c063, transparent: true }))
guideTip.rotation.x = Math.PI / 2; guideTip.position.set(0, 1.0, 1.0); guide.add(guideTip); guide.visible = false; scene.add(guide)
function routeAhead(x, z, ahead) { // el punto del recorrido que está "ahead" metros por delante de la posición del personaje
    let acc = 0, best = Infinity, d = 0
    SEGS.forEach(s => {
        const k = Math.min(s.len, Math.max(0, s.axis === 'x' ? (x - s.x0) * s.dir : (z - s.z0) * s.dir))
        const px = s.axis === 'x' ? s.x0 + k * s.dir : s.x0, pz = s.axis === 'x' ? s.z0 : s.z0 + k * s.dir, e = Math.hypot(x - px, z - pz)
        if (e < best) { best = e; d = acc + k }
        acc += s.len
    })
    return d + ahead >= ROUTE_LEN ? [W.uniX, W.uniGateZ - 10] : routePoint(d + ahead)
}
function guideTarget(c) { // solo en la calle: dentro de la casa bastan la flecha sobre el objetivo y los brillos
    if (runtime.space !== 'STREET') return null
    if (c && c !== 'items' && runtime.space === TASK_SPACE[c]) { const p = props[c], m = p.mark || p.pos; return [m.x, m.z] }
    if (!c && runtime.space === 'STREET' && runtime.postQuake && !arrived) return routeAhead(player.x, player.z, 7)
    return null
}
function updateGuide(c, canAct) {
    const tg = canAct && !player.lying && !player.sitting ? guideTarget(c) : null
    const far = tg && Math.hypot(tg[0] - player.x, tg[1] - player.z) > 3.2
    guide.visible = !!far
    if (!far) return
    guide.position.set(player.x, 0, player.z); guide.rotation.y = Math.atan2(tg[0] - player.x, tg[1] - player.z)
    guideTip.position.z = 1.0 + 0.12 * Math.sin(clock.elapsedTime * 4) // se mueve un poco hacia adelante, como empujando
    guideTip.material.opacity = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 4)
}

const tick = () => {
    requestAnimationFrame(tick) // se agenda primero: un error en un cuadro ya no congela el juego
    try { frame() } catch (e) { console.error(e) }
}
const frame = () => {
    const dt = runtime.paused ? 0 : Math.min(clock.getDelta(), 0.1); if (runtime.paused) clock.getDelta()
    const t = clock.elapsedTime, sp = runtime.space, explore = dt > 0 && runtime.state === 'EXPLORATION'
    // Gente cerca (después del sismo): la ansiedad sube mientras estés rodeada y cada choque la dispara y sacude la cámara
    const crowd = runtime.postQuake && auto() && explore && !busy && (sp === 'STREET' || sp === 'BUS')
    if (npcState.bumps !== lastBumps) {
        lastBumps = npcState.bumps
        if (crowd) {
            runtime.stress = Math.min(1, runtime.stress + 0.5); runtime.anxiety = Math.min(1, runtime.anxiety + 0.08); audio.blip(90, 0.2, 0.12, 'square'); haptics.buzz(60)
            if (fragile() && !busy && stateT > 6) sm.go('ANXIETY') // frágil (2 perdidos seguidos): el choque dispara la crisis en el acto
            else if (++crowdHits >= 5) { // cinco choques: sube un nivel de ansiedad, como al perder un minijuego (pero no cuenta para el final negativo)
                crowdHits = 0; if (runtime.failStreak < 2) { runtime.failStreak++; runtime.glitch = runtime.failStreak } // sube un nivel, pero los choques nunca llevan al final negativo
                runtime.anxiety = Math.min(1, runtime.anxiety + CONFIG.anxiety.failPenalty); haptics.buzz([120, 60, 200])
                ui.say('Demasiados golpes... el cuerpo se pone en alerta.')
            }
        }
    }
    if (crowd && npcState.near >= 2) {
        runtime.anxiety = Math.min(0.9, runtime.anxiety + 0.02 * npcState.near * dt)
        if (npcState.near >= 3 && t - crowdSaid > 14) { crowdSaid = t; ui.say('Hay demasiada gente cerca... se te acelera el pecho.') }
    }
    runtime.stress = Math.max(0, runtime.stress - 0.08 * dt)
    if (explore && !busy) doors(t)
    if (explore && runtime.space === sp) {
        if (sp === 'BUS') {
            if (!busy) {
                if (!runtime.postQuake) { if (auto() && runtime.busMoving && (runtime.rideLeft -= dt) <= 0) sm.go('QUAKE') } // viaje normal: el sismo llega durante el trayecto
                else if (player.z > 1.6 && Math.abs(Math.abs(player.x - W.busInteriorX) - 4.6) < 0.9) { busDone = true; transition(leaveBus) } // bajarse por una de las puertas laterales
                else if (runtime.busMoving && auto()) { // viaje con ansiedad: primero el frenón y después crisis seguidas hasta llegar (o hasta perder una)
                    if (runtime.anxiety < B.driftMax) runtime.anxiety += B.drift * dt
                    runtime.rideLeft -= dt
                    if (!braked) { if ((busRide += dt) >= busTraumaAt) busTrauma() }
                    else if (runtime.rideLeft <= 0) rideEnd()
                    else if ((runtime.nextCrisis -= dt * Math.min(2.2, crisisMult() * B.closed)) <= 0) sm.go('ANXIETY')
                }
            }
        } else if (sp === 'HOUSE' || sp === 'HOME') { // en el cuarto la crisis la dispara una acción al azar (maybeHouseCrisis); en la planta baja, el tiempo
            if (runtime.postQuake && up && !busy && auto()) { if (runtime.anxiety < C.driftMax) runtime.anxiety += C.drift * dt; if (sp === 'HOME' && (runtime.nextCrisis -= dt * crisisMult()) <= 0) sm.go('ANXIETY') }
        } else if (sp === 'STREET') street(t, dt)
    }
    // Objetivo: brilla, tiene el marcador encima y la flecha guía apunta hacia él
    const c = current(), target = c && c !== 'items' && c !== 'cama' ? props[c] : null, canAct = runtime.state === 'EXPLORATION' && !busy
    marker.visible = canAct && !!target && runtime.space === TASK_SPACE[c]
    if (target) { const m = target.mark || { x: target.pos.x, y: 2.6, z: target.pos.z }; marker.position.set(m.x, m.y + Math.sin(t * 4) * 0.15, m.z) }
    const glowing = (id) => canAct && (c === id ? runtime.space === TASK_SPACE[c] : c === 'items' && runtime.space === 'HOUSE' && pending().includes(id))
    for (const id in props) if (props[id].glow) props[id].glow.visible = glowing(id)
    // después del sismo el MIO brilla suave cuando pasas cerca (es opcional: puedes subirte)
    if (runtime.postQuake && !current()) props.bus.glow.visible = canAct && runtime.space === 'STREET' && !busDone && props.bus.mesh.visible && dist('bus') < 5
    SEATS.forEach(s => { s.glow.visible = canAct && runtime.space === 'BUS' && !player.sitting && !s.taken }) // bancas libres: te puedes sentar
    updateGuide(c, canAct)
    if (runtime.space === 'BUS' && !runtime.busMoving && !player.sitting && runtime.state === 'EXPLORATION' && !busy) { // guía: la banca libre más cercana
        const s = SEATS.filter(s => !s.taken).sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0]
        if (s) { marker.visible = true; marker.position.set(s.x, 2.1 + Math.sin(t * 4) * 0.15, s.z) }
    }
    breathing.update(dt); player.update(dt, t); updateNpcs(dt, t); updateAnxiety(dt); updateEnvironment(dt)
    // Cámara: fija dentro de la casa y del MIO; en la calle sigue al personaje (también cuando la calle gira)
    const s2 = runtime.space
    if (focus === 'player') updateCamera(t, dt, player.x, player.z)
    else if (focus) updateCamera(t, dt, focus.x, focus.z)
    else if (s2 === 'STREET' && breathing.active && runtime.techId === 'earth') updateCamera(t, dt, player.x + 1.8, player.z + 1.8) // Earthing: Gabriela queda arriba del medidor y nunca la tapa
    else if (s2 === 'HOUSE') updateCamera(t, dt, W.houseCenterX, 0)
    else if (s2 === 'HOME') updateCamera(t, dt, HX, 0)
    else if (s2 === 'BUS') updateCamera(t, dt, W.busInteriorX, 0)
    else updateCamera(t, dt, ...streetCam(player.x, player.z))
    ui.updateBreath(); ui.updateOverlay(); audio.update(dt, runtime.anxiety)
    renderer.render(scene, camera); renderSharp(camera, runtime.sharpPlayer)
    // Seguro anti-trabas: si un estado transitorio se queda pegado, se recupera solo
    if (runtime.state !== lastState) { lastState = runtime.state; stateT = 0 } else stateT += dt
    breathIdle = runtime.state === 'BREATHING' && !breathing.active ? breathIdle + dt : 0
    if (breathIdle > 4) sm.go('EXPLORATION')
    if (runtime.state === 'ANXIETY' && stateT > 4) sm.go(runtime.techId === 'earth' && runtime.space === 'BUS' ? 'BUS_EARTH' : 'BREATHING')
    if (runtime.state === 'CALM' && stateT > 5) sm.go('EXPLORATION')
    if (runtime.state === 'FAILURE' && stateT > 6) sm.go('ENDING_BAD')
}

// 12. Inicio: con ?debug se entra directo al cuarto sin la historia; si no, empieza la narrativa
addEventListener('pointerdown', initAudio, { once: true }); addEventListener('keydown', initAudio, { once: true })
if (runtime.sandbox) jumpTo('HOUSE_PRE'); else sm.go('INTRO')
tick()