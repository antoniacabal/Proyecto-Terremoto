import restart from 'vite-plugin-restart'
import { fileURLToPath } from 'node:url'

const pagina = (archivo) => fileURLToPath(new URL('./src/' + archivo, import.meta.url))

export default {
    root: 'src/', // Sources files (typically where index.html is)
    publicDir: '../static/', // Path from "root" to static assets (files that are served as they are)
    base: './', // Rutas relativas: la página funciona en cualquier carpeta (por ejemplo usuario.github.io/grietas-bajo-la-piel/)
    server:
    {
        host: true, // Open to local network and display URL
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env) // Open if it's not a CodeSandbox
    },
    build:
    {
        outDir: '../dist', // Output in the dist/ folder
        emptyOutDir: true, // Empty the folder first
        sourcemap: true, // Add sourcemap
        rollupOptions:
        {
            input: // las 4 páginas del sitio (sin esto solo se compilaba index.html)
            {
                index: pagina('index.html'),
                narrativa: pagina('narrativa.html'),
                respiracion: pagina('respiracion-consciente.html'),
                prevencion: pagina('herramientas-prevencion.html')
            }
        }
    },
    plugins:
    [
        restart({ restart: [ '../static/**', ] }) // Restart server on static file change
    ],
}
