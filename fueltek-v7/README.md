# Fueltek - Orden de Trabajo (v7.0)

Aplicación web offline-first para gestionar órdenes de trabajo (OT).
- Guardado local en IndexedDB
- Export / Import JSON
- Export a Excel (SheetJS, a demanda)
- Impresión PDF en tamaño carta
- PWA básica (manifest + service worker)
- Interfaz modular y profesional

## Cómo usar localmente
1. Coloca la carpeta `fueltek-v7` en tu PC.
2. Abre `index.html` en el navegador (Chrome/Edge/Firefox).
3. Añade tu logo en `assets/logo-fueltek.png`.
4. Crear OT → Guardar → Ver/Imprimir → Exportar/Importar.

## Subir a GitHub + GitHub Pages
1. Crea repo en GitHub y sube los archivos (Upload files).
2. En Settings → Pages, configura `main` branch `/ (root)` y guarda.
3. Accede a `https://<tu-usuario>.github.io/<repo>/`.

## Notas para desarrolladores
- Código modular en `/js`: `db.js`, `ui.js`, `backup.js`, `main.js`.
- IndexedDB: store `orders`, key = `ot`.
- Para export a Excel, se carga SheetJS dinámicamente al presionar el botón.
