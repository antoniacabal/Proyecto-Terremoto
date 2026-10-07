// Indice
    // 0. Condiciones
    // 1. Conexión de los botones
    // 2. Mostrar / ocultar

// Controles táctiles: flechas flotantes a la izquierda y botón de interacción a la derecha (el HTML está en narrativa.html).

// 0. Condiciones: cuándo se muestran los controles táctiles
const narrow = matchMedia('(max-width: 768px)'), coarse = matchMedia('(pointer: coarse)')
const root = document.querySelector('.gx-touch')
let wired = false
const wanted = () => coarse.matches || narrow.matches || ('ontouchstart' in window && innerWidth < 1100)

// 1. Conexión de los botones: cada botón simula la tecla de su data-k
function wire() {
    const key = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }))
    root.querySelectorAll('.gx-key').forEach(b => {
        const code = b.dataset.k, on = code === 'KeyE' ? ['KeyE', 'Space'] : [code] // el botón de interacción también sostiene la respiración
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on'); on.forEach(c => key('keydown', c)) })
        const up = () => { b.classList.remove('on'); on.forEach(c => key('keyup', c)) }
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up)
    })
    document.querySelector('canvas.webgl').style.touchAction = 'none'
    wired = true
}

// 2. Mostrar / ocultar: y escuchar cambios de pantalla
function apply() {
    if (!root) return
    const on = wanted()
    if (on && !wired) wire()
    root.hidden = !on
    document.body.classList.toggle('gx-touch-on', on)
}
narrow.addEventListener('change', apply); coarse.addEventListener('change', apply); addEventListener('resize', apply)
apply()