/* Indice

    0. Imports
    1. Utilidades
    2. Tarjeta de detalle
    3. Filtros y líneas
    4. Mapa base (OpenStreetMap)
    5. Marcadores
    6. Inicio

*/

// 0. Imports -----------------
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { TIPOS, FILTROS, LUGARES, LINEAS, REVISADO } from './recursos.js'

// 1. Utilidades -----------------
// Crea un elemento: h('a', { href, class: 'x' }, 'texto', otroElemento)
const h = (etiqueta, atributos = {}, ...hijos) => {
    const el = document.createElement(etiqueta)
    Object.entries(atributos).forEach(([k, v]) => { if (v != null && v !== false) el.setAttribute(k, v === true ? '' : v) })
    hijos.flat().forEach(c => c != null && el.append(c))
    return el
}
const enlaceTel = ([texto, numero]) => numero.startsWith('http')
    ? h('a', { href: numero, target: '_blank', rel: 'noopener noreferrer' }, texto)
    : h('a', { href: 'tel:' + numero }, texto)
const externo = (href, texto, clase) => h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: clase }, texto)
const comoLlegar = (r) => `https://www.openstreetmap.org/directions?to=${r.lat},${r.lng}#map=17/${r.lat}/${r.lng}`
const pendiente = (texto) => h('span', { class: 'mapa-ficha-pendiente' }, texto)

// 2. Tarjeta de detalle: flota sobre el mapa -----------------
function crearFicha(contenedor) {
    const ficha = h('aside', { class: 'mapa-ficha', hidden: true, 'aria-live': 'polite', 'aria-label': 'Detalle del lugar' })
    contenedor.append(ficha)
    let alCerrar = null

    const cerrar = () => { if (ficha.hidden) return; ficha.hidden = true; const fn = alCerrar; alCerrar = null; fn?.() }
    const abrir = (r, onClose) => {
        const anterior = alCerrar; alCerrar = null; anterior?.(false)
        alCerrar = onClose
        const tipo = TIPOS[r.tipo]
        const fila = (titulo, ...contenido) => h('div', { class: 'mapa-ficha-fila' }, h('dt', {}, titulo), h('dd', {}, ...contenido))
        const titulo = h('h3', { class: 'mapa-ficha-nombre', tabindex: '-1' }, r.nombre)
        ficha.replaceChildren(
            h('button', { type: 'button', class: 'mapa-ficha-cerrar', 'aria-label': 'Cerrar' }, '×'),
            h('p', { class: 'mapa-ficha-tipo', 'data-tipo': r.tipo }, h('span', { 'aria-hidden': 'true' }, tipo.icono), ' ', tipo.nombre),
            titulo,
            r.aviso ? h('p', { class: 'mapa-ficha-aviso', role: 'note' }, r.aviso) : null,
            r.nota ? h('p', { class: 'mapa-ficha-nota' }, r.nota) : null,
            h('dl', {},
                fila('Dirección', r.direccion, r.aprox ? [h('br'), pendiente('El punto en el mapa es aproximado.')] : null),
                fila('Teléfono', r.telefonos.length ? r.telefonos.flatMap((t, i) => i ? [h('br'), enlaceTel(t)] : [enlaceTel(t)]) : pendiente('No pudimos confirmarlo.')),
                fila('Horario', r.horario || pendiente('No pudimos confirmarlo: llama antes de ir.'))
            ),
            h('div', { class: 'mapa-ficha-acciones' },
                externo(comoLlegar(r), 'Cómo llegar', 'mapa-ficha-boton'),
                r.web ? externo(r.web, 'Sitio web', 'mapa-ficha-boton mapa-ficha-boton--claro') : null
            ),
            h('p', { class: 'mapa-ficha-fuente' }, 'Fuente: ', externo(r.fuente[1], r.fuente[0]), ` · revisado el ${REVISADO}`)
        )
        ficha.querySelector('.mapa-ficha-cerrar').addEventListener('click', cerrar)
        ficha.hidden = false
        titulo.focus({ preventScroll: true })
    }
    ficha.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar() })
    return { abrir, cerrar }
}

// 3. Filtros y líneas -----------------
function crearFiltros(barra, alCambiar) {
    const botones = FILTROS.map(f => {
        const b = h('button', { type: 'button', class: 'mapa-filtro', 'aria-pressed': f.id === 'todos' ? 'true' : 'false', 'data-filtro': f.id }, f.nombre)
        b.addEventListener('click', () => {
            botones.forEach(x => x.setAttribute('aria-pressed', String(x === b)))
            alCambiar(new Set(f.tipos))
        })
        return b
    })
    barra.replaceChildren(...botones)
}

function pintarLineas(lista) {
    lista.replaceChildren(...LINEAS.map(l => h('li', { class: 'mapa-linea', 'data-tipo': l.tipo, 'data-franja': l.franja },
        h('a', { class: 'mapa-linea-numero', href: 'tel:' + l.marcar, 'aria-label': `Llamar a ${l.nombre}: ${l.numero}` }, l.numero),
        h('p', { class: 'mapa-linea-nombre' }, h('span', { 'aria-hidden': 'true' }, TIPOS[l.tipo].icono + ' '), l.nombre),
        h('p', {}, l.texto, l.extra ? [' ', externo(l.extra[1], l.extra[0])] : null)
    )))
}
const filtrarLineas = (lista, tipos) => {
    let hay = false
    lista.querySelectorAll('.mapa-linea').forEach(li => { li.hidden = !tipos.has(li.dataset.tipo); hay ||= !li.hidden })
    lista.hidden = !hay; lista.previousElementSibling.hidden = !hay // sin líneas de esa categoría, también se oculta el título
}

// 4. Mapa base: OpenStreetMap (gratis, sin clave); el CSS le baja la saturación y lo entibia con los colores del proyecto
const CALI = [3.4372, -76.5225]
const LIMITES = L.latLngBounds([3.28, -76.68], [3.62, -76.42]) // no deja alejarse de Cali
function crearMapa(lienzo) {
    const map = L.map(lienzo, {
        center: CALI, zoom: 12, minZoom: 11, maxZoom: 18,
        maxBounds: LIMITES, maxBoundsViscosity: 0.8,
        scrollWheelZoom: false, // la rueda baja por la página; se activa al hacer clic en el mapa
        zoomControl: false
    })
    L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map)
    map.attributionControl.setPrefix(false)

    // Rueda del mouse: solo después de elegir el mapa (así no te atrapa al bajar por la página)
    map.on('click', () => map.scrollWheelZoom.enable())
    lienzo.addEventListener('mouseleave', () => map.scrollWheelZoom.disable())
    return map
}

// 5. Marcadores: un círculo con el ícono de la categoría (Leaflet los hace accesibles con teclado: Tab y Enter)
function crearMarcadores(map, ficha) {
    const capa = L.layerGroup().addTo(map)
    const marcadores = LUGARES.map(r => {
        const icono = L.divIcon({
            className: 'mapa-pin', iconSize: [42, 42], iconAnchor: [21, 21],
            html: `<span class="mapa-marcador" data-tipo="${r.tipo}" aria-hidden="true">${TIPOS[r.tipo].icono}</span>`
        })
        const m = L.marker([r.lat, r.lng], { icon: icono, title: r.nombre, alt: `${r.nombre} (${TIPOS[r.tipo].nombre})`, keyboard: true, riseOnHover: true })
        m.r = r
        m.on('click', () => {
            marcadores.forEach(x => x.getElement()?.classList.toggle('mapa-pin--activo', x === m))
            map.panTo(m.getLatLng())
            ficha.abrir(r, (devolverFoco = true) => {
                m.getElement()?.classList.remove('mapa-pin--activo')
                if (devolverFoco) m.getElement()?.focus({ preventScroll: true })
            })
        })
        m.addTo(capa)
        return m
    })
    return { capa, marcadores }
}

// 6. Inicio -----------------
export function iniciarMapaApoyo() {
    const seccion = document.getElementById('mapa-apoyo')
    if (!seccion) return
    const contenedor = seccion.querySelector('.mapa-contenedor'), lienzo = seccion.querySelector('.mapa-lienzo')
    const barra = seccion.querySelector('.mapa-filtros'), lineas = seccion.querySelector('.mapa-lineas')
    seccion.querySelector('.mapa-revisado').textContent = REVISADO

    pintarLineas(lineas)
    const ficha = crearFicha(contenedor)
    const map = crearMapa(lienzo)
    const { capa, marcadores } = crearMarcadores(map, ficha)
    map.fitBounds(L.latLngBounds(LUGARES.map(r => [r.lat, r.lng])), { padding: [40, 40] }) // arranca mostrando todos los lugares
    map.on('click', ficha.cerrar)

    crearFiltros(barra, (tipos) => {
        filtrarLineas(lineas, tipos)
        ficha.cerrar()
        const visibles = marcadores.filter(m => { const ver = tipos.has(m.r.tipo); ver ? capa.addLayer(m) : capa.removeLayer(m); return ver })
        if (visibles.length > 1) map.flyToBounds(L.latLngBounds(visibles.map(m => m.getLatLng())), { padding: [50, 50], maxZoom: 15, duration: 0.8 })
        else if (visibles.length) map.flyTo(visibles[0].getLatLng(), 15, { duration: 0.8 })
    })

    // Si el mapa se crea antes de que la sección tenga su tamaño final, se recalcula
    new ResizeObserver(() => map.invalidateSize()).observe(lienzo)
}
