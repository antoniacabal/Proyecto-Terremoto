import * as THREE from 'three'
import { CONFIG, runtime } from './config.js'
export const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200)
const target = new THREE.Vector3()
export function resizeCamera() {
    const a = innerWidth / innerHeight, v = CONFIG.camera.view * Math.max(1, 1.4 / a) // pantallas angostas (móvil / ventana estrecha): se aleja para que quepa el mismo ancho que en escritorio
    camera.left = -v * a / 2; camera.right = v * a / 2; camera.top = v / 2; camera.bottom = -v / 2
    camera.zoom = CONFIG.camera.zoom; camera.updateProjectionMatrix()
}
// desiredX / desiredZ: dentro de la casa y del MIO es fijo; en la calle sigue al personaje (también cuando la calle gira)
export function updateCamera(t, dt, desiredX, desiredZ = 0) {
    const c = CONFIG.camera, az = THREE.MathUtils.degToRad(c.azimuth), el = THREE.MathUtils.degToRad(c.elevation), k = Math.min(1, dt * c.follow)
    c.x += (desiredX - c.x) * k; c.z += (desiredZ - c.z) * k
    const s = CONFIG.anxiety.shakeMax * runtime.anxiety ** 2 + runtime.quake * 0.5 + runtime.stress * 0.12 // ansiedad + sismo + choques con gente
    target.set(c.x + (Math.sin(t * 41) + Math.sin(t * 23)) * s, c.y + Math.sin(t * 37) * s, c.z + Math.cos(t * 29) * s)
    camera.position.set(target.x + c.distance * Math.cos(el) * Math.sin(az), target.y + c.distance * Math.sin(el), target.z + c.distance * Math.cos(el) * Math.cos(az))
    camera.lookAt(target)
    if (camera.zoom !== c.zoom) { camera.zoom = c.zoom; camera.updateProjectionMatrix() }
}
addEventListener('resize', resizeCamera); resizeCamera()