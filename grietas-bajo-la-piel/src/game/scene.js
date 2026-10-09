import * as THREE from 'three'
export const canvas = document.querySelector('canvas.webgl')
export const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1620)
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
export const ambient = new THREE.AmbientLight(0x8899bb, 0.7)
export const sun = new THREE.DirectionalLight(0xaab4d0, 1)
sun.position.set(8, 14, 6)
scene.add(ambient, sun)
addEventListener('resize', () => { renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight) }) // la resolución también se actualiza: con zoom del navegador u otra pantalla ya no queda pixelado