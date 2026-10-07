import { CONFIG, runtime } from './config.js'
import { canvas } from './scene.js'
import { ui } from './ui.js'
import { audio } from './audio.js'
// anxiety: 0 calma · .25 leve · .5 media · .75 alta · 1 pánico
export function updateAnxiety() {
    const a = Math.min(1, Math.max(0, runtime.anxiety)), C = CONFIG.anxiety
    runtime.anxiety = a
    canvas.style.filter = `saturate(${((runtime.postQuake ? C.postQuakeSat : 1) * (1 - (1 - C.satMin) * a)).toFixed(3)}) blur(${(C.blurMax * a * a).toFixed(2)}px)`
    ui.vignette.style.opacity = (C.vignetteMax * a).toFixed(3)
    audio.setIntensity(a)
}