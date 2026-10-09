/* Indice

    0. Imports
    1. Menu desplegable (y desplazamiento suave a las secciones)
    2. Ventana de advertencia (index.html)
    3. Muestra 3D del juego (index.html)
        3.1 Canvas
        3.2 Escena
        3.3 Luces
        3.4 Objetos
        3.5 Tamaños
        3.6 Camara
        3.7 Controles
        3.8 Render
        3.9 Animacion
    4. Color del scroll (todas las paginas)
    5. Juego (narrativa.html)
    6. Mapa de apoyo (index.html)
    7. Inicio

*/

// 0. Imports -----------------
import './style.css'


// 1. Menu desplegable -----------------
function iniciarMenu() {
    var boton = document.querySelector('.menu-boton');
    var panel = document.getElementById('menu-panel');
    if (!boton || !panel) return;

    function abrir(valor) {
        panel.hidden = !valor;
        boton.setAttribute('aria-expanded', String(valor));
        boton.classList.toggle('menu-boton--abierto', valor);
    }

    boton.addEventListener('click', function () {
        abrir(panel.hidden);
    });

    // Cerrar al hacer clic fuera del menú
    document.addEventListener('click', function (e) {
        if (!panel.hidden && !e.target.closest('.menu')) abrir(false);
    });

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !panel.hidden) {
            abrir(false);
            boton.focus();
        }
    });

    // Cerrar al elegir un enlace
    panel.addEventListener('click', function (e) {
        if (e.target.closest('a')) abrir(false);
    });
}

// Desplazamiento suave hacia las secciones de la misma página (antes era scroll-behavior: smooth en el CSS,
// pero junto con overscroll-behavior en html la rueda del mouse dejaba de bajar la página en Chrome)
function iniciarDesplazamientoSuave() {
    var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.addEventListener('click', function (e) {
        var enlace = e.target.closest('a[href*="#"]');
        if (!enlace || enlace.target === '_blank') return;
        var url = new URL(enlace.href, location.href);
        if (url.pathname !== location.pathname || !url.hash) return; // solo enlaces a esta misma página
        var destino = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!destino) return;
        e.preventDefault();
        destino.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth' });
        history.pushState(null, '', url.hash);
    });
}

// 2. Ventana de advertencia -----------------
    // (index.html)
function iniciarAdvertencia() {
    const dialogo = document.getElementById('advertencia')
    const botonIniciar = document.getElementById('boton-iniciar')

    if (dialogo && botonIniciar) {
        const botonVolver = dialogo.querySelector('[data-volver]')
        const animacionesAviso = ['advertencia-sacudida', 'advertencia-destello']

        // Sacude la caja para recordar que hay que elegir una opción
        const sacudir = () => {
            dialogo.classList.remove('sacudir')
            void dialogo.offsetWidth
            dialogo.classList.add('sacudir')
        }

        dialogo.addEventListener('animationend', (evento) => {
            if (animacionesAviso.includes(evento.animationName)) {
                dialogo.classList.remove('sacudir')
            }
        })

        botonIniciar.addEventListener('click', () => {
            dialogo.classList.remove('sacudir')
            dialogo.showModal()
            document.documentElement.classList.add('modal-abierto')
        })

        // Volver
        botonVolver.addEventListener('click', () => dialogo.close())

        // No cierra y se sacude
        dialogo.addEventListener('pointerdown', (evento) => {
            if (evento.target === dialogo) sacudir()
        })

        // Tecla Esc: tampoco cierra
        dialogo.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape') {
                evento.preventDefault()
                sacudir()
            }
        })

        dialogo.addEventListener('cancel', (evento) => {
            evento.preventDefault()
            sacudir()
        })

        // Se dispara al cerrar
        dialogo.addEventListener('close', () => {
            document.documentElement.classList.remove('modal-abierto')
        })
    }
}

// 3. Muestra 3D del juego -----------------
    //  (index.html)
async function iniciarMuestra() {
    const canvas = document.querySelector('.escena-canvas canvas.webgl')
    if (!canvas) return

    const THREE = await import('three')
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')

    // 3.1 Canvas -----------------
    const contenedor = canvas.parentElement

    // 3.2 Escena -----------------
    const scene = new THREE.Scene()

    // 3.3 Luces -----------------
    const luzAmbiente = new THREE.AmbientLight(0x8890b0, 0.9)
    scene.add(luzAmbiente)

    const luzSol = new THREE.DirectionalLight(0xffffff, 0.9)
    luzSol.position.set(5, 10, 4)
    scene.add(luzSol)

    // Luz roja que pulsa: la tensión del personaje
    const luzTension = new THREE.PointLight(0xff5a4a, 0, 12)
    luzTension.position.set(0, 3, 0)
    scene.add(luzTension)

    // 3.4 Objetos -----------------
        // TEMP: formas simples, reemplazar por los assets finales
        const material = (color) => new THREE.MeshStandardMaterial({ color })

        // Cuarto
        const cuarto = new THREE.Group()
        scene.add(cuarto)

        const agregar = (ancho, alto, fondo, x, y, z, color) =>
        {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), material(color))
            mesh.position.set(x, y, z)
            cuarto.add(mesh)
            return mesh
        }

        agregar(5, 0.3, 5, 0, -0.15, 0, 0x4a4552)
        agregar(1.8, 0.5, 1, -1.3, 0.25, -1.8, 0x8a5a5a)  
        agregar(1.2, 0.8, 0.6, 1.4, 0.4, -2, 0x5a4a3a)  
        agregar(0.4, 0.4, 0.4, 0.9, 0.2, -0.5, 0x44404c) 
        agregar(0.4, 0.2, 0.6, -0.8, 0.1, 1.2, 0x44404c)

        // Personaje
        const personaje = new THREE.Group()
        personaje.position.set(0.3, 0, 0.6)
        cuarto.add(personaje)

        const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.2, 12), material(0x6aa4c8))
        cuerpo.position.y = 0.6

        const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), material(0xf0c8a0))
        cabeza.position.y = 1.5

        personaje.add(cuerpo, cabeza)

    // 3.5 Tamaños -----------------
    const sizes = {
        width: contenedor.clientWidth,
        height: contenedor.clientHeight
    }

    // 3.6 Cámara -----------------
        const radioCuarto = 3.8
        const margen = 1.2
        const anchoMinimo = radioCuarto * 2 * margen   // ancho visible necesario (~9.1)
        const altoMinimo = 7                           // alto visible necesario

        const calcularVista = (relacion) => Math.max(altoMinimo, anchoMinimo / relacion)

        let aspecto = sizes.width / sizes.height
        let vista = calcularVista(aspecto)
        const camera = new THREE.OrthographicCamera(-vista * aspecto / 2, vista * aspecto / 2, vista / 2, -vista / 2, -50, 100)
        scene.add(camera)

        camera.position.set(10, 8.2, 10)
        camera.lookAt(0, 0.6, 0)

    // 3.7 Controles -----------------
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const controls = new OrbitControls(camera, canvas)
    controls.target.set(0, 0.6, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = false
    controls.minZoom = 0.8
    controls.maxZoom = 1.1
    controls.minPolarAngle = Math.PI * 0.1
    controls.maxPolarAngle = Math.PI / 2

    controls.autoRotate = !sinMovimiento
    controls.autoRotateSpeed = 2

    let temporizadorGiro = null

    controls.addEventListener('start', () =>
    {
        clearTimeout(temporizadorGiro)
        controls.autoRotate = false
        canvas.style.cursor = 'grabbing'
    })

    controls.addEventListener('end', () =>
    {
        canvas.style.cursor = 'grab'
        if (sinMovimiento) return
        temporizadorGiro = setTimeout(() => { controls.autoRotate = true }, 2000)
    })

    canvas.style.cursor = 'grab'

    // Pistas de giro y zoom: aparecen después de un rato con la muestra a la vista y, cuando
    // el usuario usa ese control, se van y no vuelven (se recuerda en el navegador)
    const pistas = contenedor.querySelector('.muestra-pistas')
    const leer = (clave) => { try { return localStorage.getItem('grietas-pista-' + clave) === 'usada' } catch (e) { return false } }
    const guardar = (clave) => { try { localStorage.setItem('grietas-pista-' + clave, 'usada') } catch (e) {} }
    if (new URLSearchParams(location.search).has('pistas')) { try { localStorage.removeItem('grietas-pista-giro'); localStorage.removeItem('grietas-pista-zoom') } catch (e) {} } // index.html?pistas: las pistas vuelven a salir (para probar o presentar)
    const usadas = { giro: leer('giro'), zoom: leer('zoom') }
    let pistasVisibles = false

    const actualizarPistas = () =>
    {
        if (!pistas) return
        pistas.classList.toggle('mostrar-giro', pistasVisibles && !usadas.giro)
        pistas.classList.toggle('mostrar-zoom', pistasVisibles && !usadas.zoom)
    }

    const usar = (clave) =>
    {
        if (usadas[clave]) return
        usadas[clave] = true
        guardar(clave)
        actualizarPistas()
    }

    if (pistas && !(usadas.giro && usadas.zoom))
    {
        const aLaVista = () => { const caja = contenedor.getBoundingClientRect(); return caja.bottom > window.innerHeight * 0.3 && caja.top < window.innerHeight * 0.7 }
        const mostrar = () =>
        {
            if (!aLaVista()) return
            pistasVisibles = true
            actualizarPistas()
            window.removeEventListener('scroll', mostrar)
        }
        setTimeout(() => { mostrar(); if (!pistasVisibles) window.addEventListener('scroll', mostrar, { passive: true }) }, 4000) // si la muestra no está a la vista, espera a que vuelvan a ella
    }

    // Giro: el ángulo cambió entre que se agarró y se soltó la muestra
    let anguloInicial = null
    controls.addEventListener('start', () => { anguloInicial = [controls.getAzimuthalAngle(), controls.getPolarAngle()] })
    controls.addEventListener('end', () =>
    {
        if (!anguloInicial) return
        const giro = Math.abs(controls.getAzimuthalAngle() - anguloInicial[0]) + Math.abs(controls.getPolarAngle() - anguloInicial[1])
        if (giro > 0.08) usar('giro')
        anguloInicial = null
    })

    // Zoom: rueda del mouse o pellizco con dos dedos (cuenta aunque ya esté en el límite del zoom)
    const dedos = new Set()
    canvas.addEventListener('wheel', () => usar('zoom'), { passive: true })
    canvas.addEventListener('pointerdown', (e) => { dedos.add(e.pointerId); if (dedos.size >= 2) usar('zoom') })
    ;['pointerup', 'pointercancel'].forEach(tipo => canvas.addEventListener(tipo, (e) => dedos.delete(e.pointerId)))

    // 3.8 Render -----------------
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(sizes.width, sizes.height, false)

    const resizeObserver = new ResizeObserver(() =>
    {
        sizes.width = contenedor.clientWidth
        sizes.height = contenedor.clientHeight

        if (sizes.width === 0 || sizes.height === 0) return

        // Actualizar Camara
        aspecto = sizes.width / sizes.height
        vista = calcularVista(aspecto)
        camera.left = -vista * aspecto / 2
        camera.right = vista * aspecto / 2
        camera.top = vista / 2
        camera.bottom = -vista / 2
        camera.updateProjectionMatrix()

        // Actualizar renderizador (también la resolución: si cambia el zoom del navegador o la pantalla, no queda pixelado)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(sizes.width, sizes.height, false)
    })
    resizeObserver.observe(contenedor)
    window.addEventListener('resize', () => renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))) // el zoom del navegador puede no cambiar el tamaño del contenedor

    // 3.9 Animación -----------------
    const clock = new THREE.Clock()

    const tick = () =>
    {
        const tiempo = clock.getElapsedTime()

        // Estrés del personaje (se desactiva si el usuario prefiere menos movimiento)
        if (!sinMovimiento)
        {
            personaje.position.x = 0.3 + Math.sin(tiempo * 40) * 0.015  // temblor
            personaje.scale.setScalar(1 + Math.sin(tiempo * 14) * 0.03) // respiración agitada
            cabeza.rotation.z = Math.sin(tiempo * 25) * 0.12
            luzTension.intensity = 1.2 + Math.sin(tiempo * 6) * 1.2     // pulso de tensión
        }

        controls.update()

        renderer.render(scene, camera)

        window.requestAnimationFrame(tick)
    }
    tick()
}

// 4. Color del scroll -----------------
function iniciarScroll() {
    const oscuras = document.querySelectorAll('.escena, .footer')
    if (!oscuras.length) return

    let pendiente = false

    const revisar = () => {
        pendiente = false
        const alto = window.innerHeight
        let cubierto = 0

        oscuras.forEach((zona) => {
            const caja = zona.getBoundingClientRect()
            cubierto += Math.max(0, Math.min(caja.bottom, alto) - Math.max(caja.top, 0))
        })

        document.documentElement.classList.toggle('scroll-oscuro', cubierto > alto / 2)
    }

    const pedirRevision = () => {
        if (pendiente) return
        pendiente = true
        window.requestAnimationFrame(revisar)
    }

    window.addEventListener('scroll', pedirRevision, { passive: true })
    window.addEventListener('resize', pedirRevision)
    revisar()
}

// 5. Juego -----------------
    // (narrativa.html)
async function iniciarJuego() {
    if (!document.querySelector('canvas.webgl--narrativa')) return

    await import('./game/game.css')
    await import('./game/main.js')
}

// 6. Mapa de apoyo -----------------
    // (index.html) Google Maps con marcadores, filtros y tarjetas propias: ver src/mapa/
async function iniciarMapa() {
    if (!document.getElementById('mapa-apoyo')) return

    const { iniciarMapaApoyo } = await import('./mapa/mapa.js')
    iniciarMapaApoyo()
}

// 7. Inicio -----------------
iniciarMenu()
iniciarDesplazamientoSuave()
iniciarMapa()
iniciarAdvertencia()
iniciarScroll()
iniciarMuestra()
iniciarJuego()