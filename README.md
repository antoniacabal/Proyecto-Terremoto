# Grietas bajo la piel

Experiencia web interactiva sobre las huellas emocionales que deja un sismo. El proyecto vive en `grietas-bajo-la-piel/` (Vite + Three.js).

## Trabajar en el proyecto

```bash
npm install
npm run dev
```

Los dos comandos funcionan desde la raíz del repo o desde `grietas-bajo-la-piel/`.

## Publicar en GitHub Pages

La página se publica sola con el workflow `.github/workflows/publicar-pagina.yml`: cada vez que algo llega a `main`, GitHub instala las librerías, compila con Vite y publica la carpeta `dist/`. No hay que subir `dist/` a mano.

Configuración (una sola vez): en el repo, **Settings → Pages → Build and deployment → Source: GitHub Actions**.

La dirección queda así: `https://<usuario>.github.io/Proyecto-Terremoto/`.

Para generar el `dist/` en tu computador (por ejemplo, para subirlo a otro servidor):

```bash
npm run build
```
