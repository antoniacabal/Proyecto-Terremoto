// Parámetros centralizados (lil-gui los modifica en tiempo real)
const DEBUG = new URLSearchParams(location.search).has('debug') // ?debug: modo de pruebas (sin narrativa automática)
export const CONFIG = {
    maxFailures: 4, // dificultad fija (antes "casual")
    breathing: { rate: 0.25, tol: 0.2, pass: 0.55 }, // rate: velocidad de la barra en las retenciones (al inhalar/exhalar va al ritmo de la aguja)
    crisis: { first: 8, min: 8, max: 18, startAnxiety: 0.55, baseline: 0.1, drift: 0.007, driftMax: 0.25 }, // segundos / ansiedad
    anxiety: { failPenalty: 0.1, shakeMax: 0.12, blurMax: 3, satMin: 0.5, postQuakeSat: 0.85, vignetteMax: 0.85, distort: 1 }, // distort: cuánto se deforma la ciudad con la ansiedad (0 = nada)
    camera: { azimuth: 45, elevation: 35.264, distance: 24, zoom: 1, view: 12, x: -4, y: 1, z: 0, follow: 3, lead: 3 }, // follow: suavidad · lead: cuánto mira por delante del personaje en la calle
    env: { light: 1, successGain: 0.15 },
    senses: { time: 20 }, earth: { patches: 3, need: 5, timeout: 35, relief: 0.08 }, npcs: { street: 9, bus: 3 }, // minijuegos y NPCs
    player: { speed: 3.5, startX: -1.6, startZ: 0, reach: 1.8, screenRelative: true },
    bus: { calmRide: 7, time: 32, crisisMin: 7, crisisMax: 12, startAnxiety: 0.4, baseline: 0.25, drift: 0.014, driftMax: 0.7 }, // viaje en el MIO: mucha más ansiedad
    street: { endless: 28, from: 0.45, full: 0.85, slow: 0.55 }, // calle eterna: cuánto se aleja la universidad, desde/hasta qué ansiedad y cuánto se frena el paso
    world: { houseCenterX: -4.2, homeX: -30, busX: 20, uniX: 43, uniGateZ: -38, busInteriorX: 106, busStartX: 101.4 },
    exitUrl: 'index.html'
}
export const STATES = ['INTRO', 'EXPLORATION', 'QUAKE', 'ANNOUNCEMENT', 'ANXIETY', 'CHOICE', 'BREATHING', 'CALM', 'FAILURE', 'ARRIVAL', 'ENDING_GOOD', 'ENDING_BAD']
export const runtime = { state: 'INTRO', sandbox: DEBUG, anxiety: 0, envProgress: 1, quake: 0, postQuake: false, taskIndex: 0, nextCrisis: 0, successful: 0, failures: 0, breathProgress: 0, stress: 0, techIndex: 0, techId: '', techName: '', techHelp: '', prompt: '', action: '', level: 0, target: 0, stepFill: 0, phase: '', space: 'HOUSE', rideLeft: 0, paused: false, busMoving: false, grassGreen: false }