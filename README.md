# SF 2L Abogados · web

Web estática de una página (HTML + CSS + JS, sin build) para SF 2L Abogados, despacho de Derecho Civil y Penal en C/ Monte Carmelo 32, Local 1B, Sevilla. Referencia de estilo y animaciones: ario.law. Textos base sacados de la web anterior (`research/web-anterior.html`).

Ver en local: `python3 -m http.server 8771` y abrir http://localhost:8771

## Estructura

- `index.html` · loader, hero, el despacho, áreas (cubo 3D), el local (galería horizontal), equipo, cómo trabajamos, opiniones, contacto/pie
- `aviso-legal.html`, `privacidad.html` (noindex) · **tienen campos `[pendiente]` marcados en rojo**
- `assets/img/` WebP en 3 tamaños, generados desde `source-assets/fotos/` (fotos de José) con `exif_transpose`. `source-assets/` no se sube al repo (público): originales del iPhone con EXIF. **Si se cambia una foto, guardarla con otro nombre** (caché de 7 días)
- `assets/fonts/` TeX Gyre Heros 400/700 (clon libre de Helvetica, licencia GUST; ario usa Helvetica)
- `assets/vendor/lenis-1.1.13.min.js` scroll suave (MIT), solo escritorio con ratón y sin "reducir movimiento"
- `assets/logo-sf2l-abogados.svg` logo vectorizado con potrace desde `source-assets/fotos/IMG_4286.jpeg`. En el HTML cada pieza es un símbolo (`#g-S`, `#g-F`, `#g-2`, `#g-L`, `#g-barTop`, `#g-barBot`, `#g-abogados`) y se reutiliza con `<use>` en cabecera, hero, equipo y pie
- favicon, iconos, `og-sf2l-abogados.jpg` generados desde el logo

## Animaciones (equivalentes a ario.law)

- **Loader**: fondo granate con grano; las piezas del logo aparecen dispersas y gigantes, cuenta 0→100 y vuelan (FLIP) a su sitio en la marca grande del hero mientras el fondo sube. Sale en cada carga o recarga de la página; nunca con "reducir movimiento"
- **Logo del hero**: si no hay loader, las piezas suben escalonadas al cargar; al bajar se separan a distintas velocidades (barras se encogen hacia fuera) y en escritorio siguen un poco al ratón (`--mx`, `--my`)
- **Hero**: titular por palabras; la foto arranca en una caja en la columna derecha y crece a pantalla completa con el scroll (`paintReel()` en `app.js`, la caja inicial/final se define con `--t0…--l1` en `.hero` del CSS). Pase de 3 fotos con rótulo grande al llegar a pantalla completa. Cada foto tiene punto focal (`data-focal`, `data-focal-m` en móvil)
- **Texto que se rellena** (`data-fill`): las letras pasan de gris a blanco con el scroll; con `data-fill="lines"` va por líneas (lista de equipo)
- **Tarjetas blancas** limpias (sin cruz arriba, a petición), contadores (`data-count`), parallax por velocidad (`data-speed`), tarjeta "Cuéntanos tu caso" que entra girando en 3D
- **Áreas**: dos cubos 3D pegados (tarjeta + foto) que giran en sentidos opuestos con el scroll, con pausa en cada cara
- **El local**: galería horizontal fijada con el scroll en escritorio; en móvil, carrusel nativo con snap. Fotos a color con zoom suave al pasar el ratón
- **Cómo trabajamos**: al bajar, la fila que llega al 72 % de la pantalla se pone en blanco (una cada vez y como mínimo 0,42 s entre una y otra aunque se baje rápido, `STEP_GAP` en `app.js`; si la lista no está en pantalla se salta directo); línea superior que se dibuja
- **Opiniones**: tarjetas apiladas (sticky) que se encogen y oscurecen al taparse
- **Pie**: degradado granate (como el azul de ario) y marca SF 2L gigante que sube letra a letra
- Enlaces con efecto "roll" (texto que sube y se repite), cursor con etiqueta en elementos con `data-cursor`, cabecera que se esconde al bajar y aparece al subir, menú a pantalla completa en tablet/móvil, barra fija Llamar / WhatsApp en móvil

## Contacto

- Formulario sin backend: valida y abre el correo del usuario (`mailto:` a sf2labogados@gmail.com) con el mensaje preparado
- Mapa de Google solo bajo demanda (botón "Ver mapa"), así no hay cookies de terceros hasta que se pulsa → no hace falta banner de cookies

## Datos a confirmar con José antes de publicar

- [x] La foto de la sala es José (confirmado)
- [ ] Que **2L = Lara Luna** (la sección de equipo dice "SF de Sánchez Fernández y 2L de Lara Luna")
- [x] Cargos: los dos "Abogado y socio fundador" (decidido)
- [ ] 5,0 en Google y 3 sedes (Sevilla, Algeciras, Melilla): vienen de la web anterior
- [ ] Horario (no aparece en ningún sitio; la web anterior solo decía "cierre 14:00")
- [ ] Titular, NIF, colegio y n.º de colegiado para aviso legal y privacidad
- [ ] Dominio: cuando exista, añadir `<link rel="canonical">`, `og:url`, URL absoluta en `og:image` y `sitemap.xml`
- [ ] Enlace exacto de su ficha de Google (ahora es una búsqueda)

## Despliegue

Pensado para Vercel (estático). `vercel.json`: URLs limpias y caché (1 año fuentes y vendor, 7 días fotos). `.vercelignore` deja fuera `source-assets/`, `research/` y este README.

## Preferencias de texto

- Sin dos puntos en los textos de la web (decisión del cliente)
- CSS y JS llevan `?v=N` en el HTML: subir el número al cambiarlos para que el navegador no use la versión en caché
- Pie: fila legal con © + aviso + privacidad a la izquierda, "Made by Terron Studio" (terron-studio.com, como en La Marmota y Doble M) centrado y "Volver arriba" a la derecha; en móvil el crédito baja a su propia línea centrada
- **Transiciones entre páginas** (`assets/pages.js`, cargado en las 3 páginas): al pulsar un enlace interno a otra página sube una cortina granate (`.pt`) y luego navega; las páginas legales entran con la cortina saliendo hacia arriba y el contenido subiendo escalonado; al volver a la home la cortina enlaza con el loader. Las legales tienen también scroll suave (Lenis) y efecto roll en "Volver a la web"
- Separador de la recepción: toda la foto es el enlace "Cómo llegar" (cursor con círculo en toda la imagen)
