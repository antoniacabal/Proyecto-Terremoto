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
import { renderer, scene, canvas } from './scene.js'
import { camera, updateCamera } from './camera.js'
import { updateEnvironment, props, resetProps, marker, setSpace, setHighlight, SEATS, atUniversity, nearUniversity, endless, HOME_DOOR, STREET_X0, ROUTE_LEN, routePoint, nearestSeg, scareBuilding } from './environment.js'
import { player } from './player.js'
import { breathing } from './breathing.js'
import { updateAnxiety } from './anxiety.js'
import { audio } from './audio.js'
import { ui } from './ui.js'
import { initDebug } from './debug.js'
import { updateNpcs, npcState, mom } from './npcs.js'
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
const TASK_SPACE = { cama: 'HOUSE', armario: 'HOUSE', items: 'HOUSE', puerta: 'HOUSE', mama: 'HOME', desayuno: 'HOME', salida: 'HOME', bus: 'STREET' }
const TASK_TEXT = {
    cama: 'Levántate (E).', armario: 'Vístete: ve al armario.', puerta: 'Sal del cuarto y baja a la cocina.',
    mama: 'Ve a la cocina: mamá te está esperando.', desayuno: 'Come tu desayuno: está sobre la isla de la cocina (E).',
    salida: 'Sal de casa por la puerta principal.', bus: 'Acércate al MIO para subirte.'
}
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
    resetProps(); resetBreakfast(); setHighlight(false)
    up = dressed = down = momDone = ate = out = arrived = busy = busAsked = busForced = busDone = false; got.clear(); resetScare(); player.setBackpack(false)
    runtime.postQuake = post; runtime.envProgress = post ? 0 : 1; runtime.anxiety = post ? 0.08 : 0; runtime.stress = 0
    setSpace('HOUSE'); runtime.nextCrisis = C.first; player.lieDown(); CONFIG.camera.x = W.houseCenterX; CONFIG.camera.z = 0
    showTask()
}
function showTask() {
    const c = current()
    if (runtime.space === 'BUS') return ui.say(!runtime.busMoving
        ? (runtime.postQuake ? 'Siéntate para que el MIO arranque: pulsa E junto a una banca. Si cambias de opinión, puedes bajar por las puertas laterales.' : 'Siéntate para que el MIO arranque: pulsa E junto a una banca libre.')
        : runtime.postQuake ? 'El MIO avanza. Puedes sentarte (E junto a una banca) o bajar por las puertas laterales.' : 'El MIO avanza por la ciudad...')
    ui.say(c === 'items' ? `Recoge tus cosas (${got.size}/${ITEMS.length}): ${pending().map(i => NAMES[i]).join(', ')}.` : TASK_TEXT[c] || 'Camina hacia la universidad.')
}

// 3. Cambio de espacio: cuarto, planta baja, calle e interior del MIO con un fundido
const streetCam = (x, z) => { // la cámara mira hacia donde avanza el tramo de la calle y se centra un poco sobre ella
    const L = CONFIG.camera.lead, s = nearestSeg(x, z)
    return s.axis === 'x' ? [x + L * s.dir, s.z0 + (z - s.z0) * 0.4] : [s.x0 + (x - s.x0) * 0.4, z + L * s.dir]
}
function goTo(space, x, z, camX, camZ = 0) { player.unsit(); setSpace(space); runtime.busMoving = false; player.x = x; player.z = z; CONFIG.camera.x = camX; CONFIG.camera.z = camZ; showTask() } // el MIO no arranca hasta que te sientes
const goStreet = (x, z) => goTo('STREET', x, z, ...streetCam(x, z))
function transition(fn) {
    busy = true; player.setMode('stop')
    ui.fade(1, 0.5, () => { fn(); ui.fade(0, 0.6, () => { busy = false; if (runtime.state === 'EXPLORATION') player.setMode('free') }) })
}
const exitHouse = () => transition(() => { out = true; goStreet(HOME_DOOR.x, HOME_DOOR.z + 2) }) // apareces en el caminito, frente a la puerta de la casa
const goDown = () => transition(() => { down = true; goTo('HOME', HX + 0.4, -0.3, HX) })  // bajas las escaleras: cocina, comedor y sala
// Cámara enfocada: se acerca a un punto (al despertar después del sismo) o al personaje (antes de los finales)
let focus = null
const focusOn = (x, z, zoom) => { focus = { x, z }; CONFIG.camera.x = x; CONFIG.camera.z = z; CONFIG.camera.zoom = zoom }
const zoomToPlayer = (cb) => { focus = 'player'; gsap.to(CONFIG.camera, { zoom: 2.5, duration: 2.6, ease: 'power2.inOut', onComplete: cb }) }
const resetFocus = () => { focus = null; gsap.killTweensOf(CONFIG.camera); CONFIG.camera.zoom = 1 }

// Susto en la calle (después del sismo): un edificio cercano empieza a temblar y a inclinarse, y eso dispara la crisis
let scared = null, scareCalm = false
function scare() {
    const e = scareBuilding(player.x, player.z); if (!e) return false
    scared = e; busy = true; player.setMode('stop'); ui.say('Ese edificio... ¿se está moviendo?')
    gsap.to(e, { sh: 1, duration: 0.5 }); gsap.to(e, { tilt: 0.2, sink: 0.4, duration: 2.2, delay: 0.5, ease: 'power2.in' })
    gsap.to({}, { duration: 0.22, repeat: 10, onRepeat: () => !runtime.paused && audio.blip(40 + Math.random() * 25, 0.25, 0.12, 'sawtooth') })
    gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, 0.65), duration: 2 })
    gsap.delayedCall(2.8, () => { busy = false; if (runtime.state === 'EXPLORATION') sm.go('ANXIETY') })
    return true
}
function settleScare(ok) { // después de la crisis, el edificio vuelve despacio a su lugar (nunca se cayó)
    if (!scared) return
    gsap.to(scared, { sh: 0, tilt: 0, sink: 0, duration: 2.5, ease: 'power2.out' }); scared = null; scareCalm = ok
}
const resetScare = () => { if (scared) { gsap.killTweensOf(scared); Object.assign(scared, { sh: 0, tilt: 0, sink: 0 }); scared = null } scareCalm = false }

function getUp() { if (runtime.postQuake) runtime.nextCrisis = C.first; setHighlight(true); player.standUp(props.cama.pos.x, props.cama.pos.z); up = true; showTask() }

// 4. Vestirse y desayuno con mamá
function dress() { // la acción no se ve: la pantalla funde a negro mientras te cambias
    busy = true; player.setMode('stop')
    ui.fade(1, 0.5, () => {
        props.armario.mesh.userData.outline.visible = false
        ui.say(runtime.postQuake ? 'Te cuesta decidir qué ponerte...' : 'Te vistes para ir a la universidad.')
        gsap.delayedCall(runtime.postQuake ? 1.8 : 0.9, () => ui.fade(0, 0.5, () => { busy = false; dressed = true; if (runtime.state === 'EXPLORATION') player.setMode('free'); showTask() }))
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
const freeAgain = () => { busy = false; if (runtime.state === 'EXPLORATION') player.setMode('free'); showTask() }
function talkToMom() {
    busy = true; player.setMode('stop'); ui.say(''); mom.setTalking(true)
    ui.talk('Mamá', momLines().hello, { onEnd: () => { mom.setTalking(false); momDone = true; glowBreakfast(true); freeAgain() } })
}
const FOOD = () => props.desayuno.mesh.children.slice(1, 3) // arepa y huevo (el plato y la taza se quedan)
const glowBreakfast = (v) => { props.desayuno.mesh.userData.outline.visible = v } // brilla mientras toca comer
function resetBreakfast() { FOOD().forEach(m => m.scale.setScalar(1)); glowBreakfast(false) }
function eat() { // se ve cómo el desayuno va desapareciendo a mordiscos; después del sismo solo comes un poco
    busy = true; player.setMode('stop'); glowBreakfast(false)
    const post = runtime.postQuake, left = post ? 0.55 : 0.001, p = props.desayuno.pos, [arepa, egg] = FOOD()
    player.group.rotation.y = Math.atan2(p.x - player.x, p.z - player.z)
    ui.say(post ? 'Te cuesta tragar... comes despacio.' : 'Comes tu desayuno.')
    gsap.timeline({ onComplete: () => { ate = true; ui.say(post ? 'Solo logras comer un poco.' : 'Te comiste todo el desayuno.'); gsap.delayedCall(1.2, momBye) } })
        .to(arepa.scale, { x: left, y: left, z: left, duration: post ? 2.6 : 1.8, ease: 'steps(4)' })
        .to(egg.scale, { x: left, y: left, z: left, duration: post ? 1.4 : 0.9, ease: 'steps(2)' }, '+=0.3')
}
function momBye() {
    const post = runtime.postQuake; mom.setTalking(true); ui.say('')
    if (post) gsap.to(runtime, { anxiety: C.baseline, stress: 0, duration: 12 }) // mientras mamá te habla, la ansiedad baja poco a poco
    ui.talk('Mamá', momLines().bye, { onEnd: () => { mom.setTalking(false); if (post) runtime.nextCrisis = C.first; freeAgain() } })
}

// 5. El MIO: antes del sismo es el viaje normal (el sismo llega durante el trayecto).
//    Después es opcional: te subes con miedo y, a mitad del viaje, un frenón te devuelve a ese día y tienes que bajarte
let busRide = 0, busTraumaAt = 0, busForced = false, busDone = false
const askBus = () => { busAsked = true; sm.go('CHOICE') }
function boardBus() {
    ui.hideChoice(); if (runtime.state === 'CHOICE') sm.go('EXPLORATION')
    const post = runtime.postQuake
    const board = () => transition(() => {
        runtime.rideLeft = post ? B.time : B.calmRide; runtime.nextCrisis = rand(3, 5); busRide = 0; busTraumaAt = rand(B.traumaMin, B.traumaMax)
        if (post) runtime.anxiety = Math.max(runtime.anxiety, B.startAnxiety)
        goTo('BUS', W.busStartX, 0, W.busInteriorX)
    })
    if (!post) return board()
    busy = true; player.setMode('stop'); ui.say('Te tiemblan las piernas frente a la puerta del MIO...') // la aprehensión antes de subir
    gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, B.startAnxiety), duration: 1.6 })
    gsap.delayedCall(2, board)
}
function declineBus() { ui.hideChoice(); sm.go('EXPLORATION'); ui.say('Sigues a pie. Si cambias de opinión, pulsa E junto al MIO.') }
function busTrauma() { // el MIO frena de golpe y todo vibra: el cuerpo lo vive como el sismo
    busy = true; busForced = true; player.unsit(); player.setMode('stop'); ui.say('El MIO frena de golpe... todo vibra como ese día.')
    const shake = gsap.timeline().to(runtime, { quake: 0.45, duration: 0.25 }).to(runtime, { quake: 0.15, duration: 0.35, yoyo: true, repeat: 3 }).to(runtime, { quake: 0, duration: 0.5 })
    gsap.to({}, { duration: 0.2, repeat: 8, onRepeat: () => !runtime.paused && audio.blip(45 + Math.random() * 20, 0.25, 0.14, 'sawtooth') })
    gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, 0.7), duration: 1.5 })
    shake.eventCallback('onComplete', () => { busy = false; sm.go('ANXIETY') })
}
function forcedOff() { // después de la crisis en el MIO: no puedes seguir adentro, te bajas y sigues a pie
    if (!busForced || runtime.space !== 'BUS') return
    busForced = false; busDone = true
    gsap.delayedCall(1.6, () => { if (runtime.space === 'BUS' && runtime.state !== 'FAILURE' && !runtime.state.startsWith('ENDING')) transition(() => { leaveBus(); ui.say('Te bajas del MIO. No puedes seguir ahí adentro: sigues a pie.') }) })
}
// Bajarse del MIO: aparece en la calle a la altura del trayecto recorrido (a la derecha de la calle, en el tramo que toque)
const leaveBus = () => {
    const p = Math.min(1, Math.max(0, 1 - runtime.rideLeft / B.time)), d0 = W.busX + 3 - STREET_X0
    const [x, z, s] = routePoint(d0 + p * (ROUTE_LEN - d0 - 10))
    s.axis === 'x' ? goStreet(x, z + 1.5) : goStreet(x + 1.5, z)
}
const rideEnd = () => transition(() => goStreet(W.uniX, W.uniGateZ + 5)) // te deja frente a la universidad
function startRide() { if (runtime.busMoving) return; runtime.busMoving = true; showTask() } // el MIO arranca cuando te sientas por primera vez

// 6. Interacción: tecla E o clic
function interact() {
    if (runtime.paused || runtime.state !== 'EXPLORATION' || busy) return
    if (runtime.space === 'BUS') { // sentarse / levantarse en las bancas del MIO
        if (player.sitting) return player.unsit()
        const s = SEATS.filter(s => !s.taken).sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0]
        if (s && Math.hypot(s.x - player.x, s.z - player.z) < 2.2) { player.sit(s); return startRide() }
    }
    if (runtime.postQuake && !current() && nearBus()) return busDone ? ui.say('No te sientes capaz de volver a subir al MIO. Sigues a pie.') : askBus() // pulsar E junto al MIO vuelve a abrir la opción
    const c = current(); if (!c || TASK_SPACE[c] !== runtime.space) return
    if (c === 'cama') { // la misma acción, pero después del sismo cuesta más
        if (!runtime.postQuake) return getUp()
        busy = true; ui.say('Tardas más en levantarte...'); runtime.anxiety = Math.max(runtime.anxiety, 0.15)
        return void gsap.delayedCall(2.5, () => { busy = false; getUp() })
    }
    if (c === 'items') { // cualquier objeto pendiente, en el orden que quieras: se recoge el más cercano
        const [id, d] = pending().map(i => [i, dist(i)]).sort((x, y) => x[1] - y[1])[0]
        if (d > CONFIG.player.reach) return ui.say('Acércate a uno de tus objetos.')
        props[id].mesh.visible = false; got.add(id); if (id === 'maleta') player.setBackpack(true); return showTask() // la maleta pasa a la espalda
    }
    if (dist(c) > (c === 'mama' ? 2.4 : CONFIG.player.reach)) return ui.say('Acércate un poco más.')
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
    hold: ['Inhalar: mantén el clic (o la barra espaciadora) y tu barra verde se llena. En pantalla táctil, mantén el botón E.', 'Sostener: sigue manteniendo el clic; la barra se queda llena.', 'Exhalar: suelta el clic y la barra se vacía al ritmo de la aguja. En la pausa, déjalo suelto.', 'El rótulo debajo del medidor te dice en todo momento qué hacer. Mantén tu barra dentro de la franja gris clara y la crisis pasa.'],
    earth: ['Camina con WASD o las flechas hasta el pasto que hay a los lados de la calle. La flecha dorada te indica hacia dónde.', 'Quédate sobre el pasto respirando lento.', 'Solo ahí baja tu ansiedad: si sales, deja de bajar.']
}

// 8. Máquina de estados
sm.on('INTRO', () => {
    startRoutine(false); player.setMode('stop'); ui.card('10 de agosto', '6:00 a. m.')
    gsap.delayedCall(3, () => { ui.card(); ui.fade(0, 1.5, () => ui.controls(() => sm.go('EXPLORATION'))) }) // antes de poder moverte: pop-up con los controles
})
sm.on('EXPLORATION', () => { player.setMode('free'); setHighlight(up) }) // los objetos vuelven a brillar si ya te levantaste
sm.on('QUAKE', () => {
    player.setMode('stop'); ui.say(''); ui.card('07:34 a. m.')
    gsap.delayedCall(2.5, () => {
        ui.card(); clearInterval(rumble); rumble = setInterval(() => !runtime.paused && audio.blip(40 + Math.random() * 25, 0.25, 0.15, 'sawtooth'), 220)
        gsap.to(runtime, { quake: 1, anxiety: 0.8, duration: 5, ease: 'power1.in', onComplete: () => {
            clearInterval(rumble)
            if (runtime.sandbox) return void gsap.to(runtime, { quake: 0, anxiety: 0.1, duration: 1.5, onComplete: () => { showTask(); sm.go('EXPLORATION') } }) // debug: el sismo se puede repetir sin seguir la historia
            // el golpe: destello blanco, corte a negro, silencio con pitido en los oídos y frases sueltas
            ui.flash(); audio.ring(5); runtime.quake = 0
            gsap.delayedCall(1.8, () => ui.whisper(['Todo se movió.', 'Y después... silencio.'], () => sm.go('ANNOUNCEMENT')))
        } })
    })
})
sm.on('ANNOUNCEMENT', () => {
    ui.card('Sismo en Colombia', 'Durante la mañana del 10 de agosto, un fuerte sismo sacudió diferentes zonas del país. El movimiento provocó alteraciones en la rutina de miles de personas y dejó a muchas comunidades enfrentando sus consecuencias. Aunque el movimiento terminó, sus efectos no necesariamente desaparecen cuando la tierra deja de temblar.', { type: true, onContinue: () => {
        ui.card('Una semana después', '6:00 a. m.')
        gsap.delayedCall(3, () => { // la casa aparece despacio, con la cámara cerca de la cama, y se va abriendo
            ui.card(); runtime.quake = 0; startRoutine(true)
            focusOn(props.cama.pos.x, props.cama.pos.z - 1.5, 1.9); ui.fade(0, 3)
            gsap.to(CONFIG.camera, { zoom: 1, duration: 4.5, delay: 1.2, ease: 'power2.inOut', onComplete: () => { focus = null } })
            sm.go('EXPLORATION')
        })
    } })
})
sm.on('CHOICE', () => {
    player.setMode('stop')
    ui.choice('Llegó el MIO', 'Puedes subirte o seguir caminando hasta la universidad. Tú decides. Los espacios cerrados y llenos pueden sentirse más intensos.', [
        { label: 'Subir al MIO', dir: 'right', fn: boardBus }, { label: 'Seguir caminando', dir: 'left', fn: declineBus }])
})
sm.on('ANXIETY', () => {
    player.setMode('stop'); ui.say('Algo dentro no se calma...'); breathing.pick(runtime.space)
    if (runtime.techId === 'earth' && runtime.space === 'BUS') { // el Earthing en el MIO: el personaje baja a buscar pasto
        if (busForced) { busForced = false; busDone = true } // ya se bajó: no hay que volver a sacarlo después
        ui.say('Necesitas aire. Bajas del MIO a buscar pasto.'); gsap.delayedCall(0.7, () => ui.fade(1, 0.4, () => { leaveBus(); ui.fade(0, 0.5) }))
    }
    gsap.to(runtime, { anxiety: Math.max(runtime.anxiety, C.startAnxiety), duration: 1 })
    gsap.delayedCall(1.5, () => runtime.state === 'ANXIETY' && sm.go('BREATHING'))
})
sm.on('BREATHING', () => {
    player.setMode('guided')
    const tech = breathing.prepare(), mech = tech.game || 'hold' // box y body se juegan igual (mantener y soltar)
    ui.say(`Autorregulación: ${tech.name}`)
    const begin = () => { breathing.start(); ui.showBreath(true); if (tech.game === 'earth') player.setMode('free') }
    if (seenTutorials.has(mech)) return begin()
    seenTutorials.add(mech); ui.tutorial({ sub: tech.name, steps: TUTORIALS[mech], page: tech.page }, begin) // primera vez: explica cómo se juega y espera
})
sm.on('CALM', () => { // transitorio: la crisis pasó y la rutina continúa
    player.setMode('calm'); ui.say(scareCalm ? 'El edificio sigue en su lugar. Estás aquí. Ahora.' : 'Estás aquí. Ahora.'); scareCalm = false
    gsap.delayedCall(2.5, () => { if (runtime.state === 'CALM') { showTask(); sm.go('EXPLORATION') } })
})
// Finales: antes de la escena final la cámara se acerca despacio a Gabriela
sm.on('FAILURE', () => {
    breathing.stop(); ui.showBreath(false); player.setMode('agitated'); ui.say('Todo se desborda...')
    gsap.to(runtime, { anxiety: 1, duration: 2 }); zoomToPlayer(() => gsap.delayedCall(0.8, () => sm.go('ENDING_BAD')))
})
sm.on('ARRIVAL', () => {
    arrived = true; player.setMode('calm'); breathing.stop(); ui.showBreath(false); ui.say('Llegaste a la universidad.')
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
        ui.showBreath(false); setHighlight(up); audio.result(ok); runtime.nextCrisis = bus ? rand(B.crisisMin, B.crisisMax) : rand(C.min, C.max)
        settleScare(ok); forcedOff() // el edificio del susto vuelve a su lugar · si el frenón del MIO causó la crisis, te bajas
        if (runtime.sandbox) { // debug: el resultado no cuenta para la historia (ni fallos ni final negativo)
            ui.say(ok ? 'Minijuego superado (debug).' : 'Minijuego no superado (debug).')
            gsap.to(runtime, { anxiety: bus ? B.baseline : C.baseline, duration: 1.5 })
            return void gsap.delayedCall(2, () => { if (runtime.state === 'BREATHING') { showTask(); sm.go('EXPLORATION') } })
        }
        if (ok) {
            runtime.successful++; gsap.to(runtime, { anxiety: bus ? B.baseline : C.baseline, duration: 1.5 })
            gsap.to(runtime, { envProgress: Math.min(1, runtime.envProgress + CONFIG.env.successGain), duration: 3 })
            return sm.go('CALM')
        }
        runtime.failures++; runtime.anxiety = Math.min(1, runtime.anxiety + CONFIG.anxiety.failPenalty); ui.say('Perdiste el ritmo. Sigue, sin prisa.')
        if (runtime.failures >= CONFIG.maxFailures) return sm.go('FAILURE')
        gsap.delayedCall(2, () => { if (runtime.state === 'BREATHING') { showTask(); sm.go('EXPLORATION') } })
    }
})

// 10. Modo ?debug (sin narrativa): saltar directo a cada mapa con todo lo anterior ya hecho
function jumpTo(map) {
    gsap.globalTimeline.clear(); clearInterval(rumble); breathing.stop(); ui.showBreath(false); ui.hideChoice(); ui.hideEnding(); ui.card(); ui.closeTalk(); mom.setTalking(false); resetFocus(); resetScare()
    runtime.quake = 0; runtime.failures = 0; runtime.successful = 0
    if (map === 'ANNOUNCEMENT') return sm.go('ANNOUNCEMENT')
    if (map === 'ENDING_GOOD' || map === 'ENDING_BAD') return sm.go(map)
    const post = map.endsWith('_POST') || map === 'UNIVERSIDAD'
    startRoutine(post); sm.go('EXPLORATION'); ui.fade(0, 0.3)
    if (map.startsWith('HOUSE')) return
    // los demás mapas empiezan de pie, vestido y con las cosas recogidas
    skipRoom(); setHighlight(true); player.standUp(0, 0)
    if (map.startsWith('HOME')) { down = true; return goTo('HOME', HX + 0.4, -0.3, HX) }
    down = momDone = ate = out = true; props.desayuno.mesh.visible = false
    if (map.startsWith('STREET')) goStreet(HOME_DOOR.x, HOME_DOOR.z + 2)
    else if (map === 'UNIVERSIDAD') { busAsked = true; goStreet(W.uniX, W.uniGateZ + 12) }
    else { // dentro del MIO (y el terremoto, que en la historia pasa durante el viaje)
        runtime.rideLeft = post ? B.time : B.calmRide; runtime.nextCrisis = rand(3, 5); busRide = 0; busTraumaAt = rand(B.traumaMin, B.traumaMax)
        if (post) runtime.anxiety = Math.max(runtime.anxiety, B.startAnxiety)
        goTo('BUS', W.busStartX, 0, W.busInteriorX); runtime.busMoving = true; showTask() // en modo debug el MIO ya va en marcha
        if (map === 'TERREMOTO') sm.go('QUAKE')
    }
}
function playGame(id) { jumpTo('STREET_POST'); breathing.force(id); sm.go('ANXIETY') } // jugar un minijuego concreto (en la calle, para que también sirva el Earthing)
function forceCrisis() { if (runtime.state === 'EXPLORATION') sm.go('ANXIETY') }
initDebug({ jumpTo, playGame, forceCrisis, resetTutorials: () => seenTutorials.clear() })

// 11. Bucle principal
const clock = new THREE.Clock()
// Más gente cerca, más ansiedad y choques con NPCs = más probabilidad de crisis (el temporizador corre más rápido)
let lastBumps = 0, crowdSaid = -99
const crisisMult = () => Math.min(2.5, 1 + npcState.near * 0.35 + runtime.anxiety * 1.5 + runtime.stress * 2) // con tope: si no, rodeada de gente las crisis se encadenaban sin pausa
let lastState = '', stateT = 0
const blockMsg = (t, text) => { if (t - doorMsgT > 2.5) { doorMsgT = t; ui.say(text) } }
function skipRoom() { // ?debug: lo que faltaba en el cuarto se da por hecho
    up = dressed = true; ITEMS.forEach(i => { got.add(i); props[i].mesh.visible = false }); player.setBackpack(true); props.armario.mesh.userData.outline.visible = false
}
function doors(t) { // puertas: cruzar el marco cambia de espacio si ya hiciste lo necesario; si no, no te deja pasar (en ?debug siempre se puede)
    if (runtime.space === 'HOUSE' && up && player.z > 3.2 && Math.abs(player.x + 5) < 0.95) {
        if (current() === 'puerta') goDown()
        else if (runtime.sandbox) { skipRoom(); goDown() }
        else { player.z = 3.0; blockMsg(t, !dressed ? 'Antes de salir del cuarto, vístete.' : `Antes de salir del cuarto, recoge: ${pending().map(i => NAMES[i]).join(', ')}.`) }
    }
    if (runtime.space === 'HOME' && player.x > HX + 6.3) {
        if (current() === 'salida') exitHouse()
        else if (runtime.sandbox) { momDone = ate = true; props.desayuno.mesh.visible = false; exitHouse() }
        else { player.x = HX + 6.1; blockMsg(t, !momDone ? 'Antes de salir, pasa por la cocina: mamá te está esperando.' : !ate ? 'Antes de salir, come tu desayuno.' : 'Antes de salir, despídete de mamá.') }
    }
}
function street(t, dt) {
    const k = endless() // calle eterna
    if (k > 0.6 && !endlessSaid) { endlessSaid = true; ui.say('La calle parece no terminar nunca...') } else if (k < 0.3) endlessSaid = false
    if (!runtime.postQuake) { if (!busy && auto() && current() === 'bus' && nearBus(0.9)) boardBus(); return }
    if (!auto()) { if (atUniversity(player.x, player.z)) blockMsg(t, 'Llegaste a la universidad (modo debug: el final no se activa).'); return }
    if (runtime.anxiety < C.driftMax) runtime.anxiety += C.drift * dt // incomodidad que va creciendo
    if (!busy && !nearUniversity(player.x, player.z) && (runtime.nextCrisis -= dt * crisisMult()) <= 0) { // crisis esporádicas: a veces empiezan con un edificio que parece moverse
        if (Math.random() < 0.5 && scare()) return
        return sm.go('ANXIETY')
    }
    if (!arrived && atUniversity(player.x, player.z)) return sm.go('ARRIVAL')
    if (!busy && !current() && !busAsked && !busDone && !arrived && nearBus(0.9)) askBus()
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
    if (npcState.bumps !== lastBumps) { lastBumps = npcState.bumps; if (crowd) { runtime.stress = Math.min(1, runtime.stress + 0.5); runtime.anxiety = Math.min(1, runtime.anxiety + 0.08); audio.blip(90, 0.2, 0.12, 'square') } }
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
                else if (player.z > 1.6 && Math.abs(Math.abs(player.x - W.busInteriorX) - 4.6) < 0.9) transition(leaveBus) // bajarse por una de las puertas laterales
                else if (runtime.busMoving && auto()) { // viaje con ansiedad: sube rápido hasta que un frenón te devuelve al sismo y tienes que bajarte
                    if (runtime.anxiety < B.driftMax) runtime.anxiety += B.drift * dt
                    runtime.rideLeft -= dt
                    if (!busDone && (busRide += dt) >= busTraumaAt) busTrauma()
                    else if (runtime.rideLeft <= 0) rideEnd()
                }
            }
        } else if (sp === 'HOUSE' || sp === 'HOME') {
            if (runtime.postQuake && up && !busy && auto()) { if (runtime.anxiety < C.driftMax) runtime.anxiety += C.drift * dt; if ((runtime.nextCrisis -= dt * crisisMult()) <= 0) sm.go('ANXIETY') }
        } else if (sp === 'STREET') street(t, dt)
    }
    // Marcador del objetivo (los objetos recogibles se ven por su delineado amarillo)
    const c = current(), target = c && c !== 'items' ? props[c] : null
    marker.visible = runtime.state === 'EXPLORATION' && !!target && runtime.space === TASK_SPACE[c] && !busy
    if (target) { const m = target.mark || { x: target.pos.x, y: 2.6, z: target.pos.z }; marker.position.set(m.x, m.y + Math.sin(t * 4) * 0.15, m.z) }
    if (runtime.space === 'BUS' && !runtime.busMoving && !player.sitting && runtime.state === 'EXPLORATION' && !busy) { // guía: la banca libre más cercana
        const s = SEATS.filter(s => !s.taken).sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0]
        if (s) { marker.visible = true; marker.position.set(s.x, 2.1 + Math.sin(t * 4) * 0.15, s.z) }
    }
    breathing.update(dt); player.update(dt, t); updateNpcs(dt, t); updateAnxiety(); updateEnvironment(dt)
    // Cámara: fija dentro de la casa y del MIO; en la calle sigue al personaje (también cuando la calle gira)
    const s2 = runtime.space
    if (focus === 'player') updateCamera(t, dt, player.x, player.z)
    else if (focus) updateCamera(t, dt, focus.x, focus.z)
    else if (s2 === 'STREET' && breathing.active && runtime.techId === 'earth') updateCamera(t, dt, player.x + 1.8, player.z + 1.8) // Earthing: Gabriela queda arriba del medidor y nunca la tapa
    else if (s2 === 'HOUSE') updateCamera(t, dt, W.houseCenterX, 0)
    else if (s2 === 'HOME') updateCamera(t, dt, HX, 0)
    else if (s2 === 'BUS') updateCamera(t, dt, W.busInteriorX, 0)
    else updateCamera(t, dt, ...streetCam(player.x, player.z))
    ui.updateBreath(); audio.update(dt, runtime.anxiety)
    renderer.render(scene, camera)
    // Seguro anti-trabas: si un estado transitorio se queda pegado, se recupera solo
    if (runtime.state !== lastState) { lastState = runtime.state; stateT = 0 } else stateT += dt
    if (runtime.state === 'BREATHING' && !breathing.active && stateT > 4) { showTask(); sm.go('EXPLORATION') }
    if (runtime.state === 'ANXIETY' && stateT > 4) sm.go('BREATHING')
    if (runtime.state === 'CALM' && stateT > 5) { showTask(); sm.go('EXPLORATION') }
    if (runtime.state === 'FAILURE' && stateT > 6) sm.go('ENDING_BAD')
}

// 12. Inicio: con ?debug se entra directo al cuarto sin la historia; si no, empieza la narrativa
addEventListener('pointerdown', initAudio, { once: true }); addEventListener('keydown', initAudio, { once: true })
if (runtime.sandbox) jumpTo('HOUSE_PRE'); else sm.go('INTRO')
tick()