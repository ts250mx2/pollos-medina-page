# Fotos del sitio

La página funciona **sin fotos**: si un archivo no existe, la tarjeta muestra un fondo
ilustrado con los colores de la marca. Conforme vayas teniendo fotos, colócalas aquí con
estos nombres exactos y aparecerán solas (no hay que tocar código).

## Marca

| Archivo | Uso | Medida sugerida |
|---|---|---|
| `logo.png` | Logo circular del header (fondo transparente) | 200 × 200 px |
| `og.jpg` | Imagen que se ve al compartir el link en WhatsApp/Facebook | 1200 × 630 px |
| `nosotros.jpg` | Foto de la sección "Nuestra historia" | 1200 × 900 px |

## Hero (collage de portada)

| Archivo | Sugerencia |
|---|---|
| `hero-1.jpg` | Pollo entero al carbón (vertical, es la foto grande) |
| `hero-2.jpg` | Papitas Galeana |
| `hero-3.jpg` | Tacos / cortes |

## Menú

Van en la subcarpeta `menu/`. El nombre de cada archivo está definido en
`js/data/menu.js` (campo `img` de cada producto):

```
menu/combo-pollo-papitas.jpg   menu/pollo-entero.jpg     menu/medio-pollo.jpg
menu/paquete-familiar.jpg      menu/paquete-fiesta.jpg   menu/papitas-galeana.jpg
menu/papas-gajo.jpg            menu/arrachera.jpg        menu/tacos-bistec.jpg
menu/chorizo.jpg               menu/empanadas.jpg        menu/dedos-queso.jpg
menu/nuggets.jpg               menu/frijoles-charros.jpg menu/arroz.jpg
menu/guacamole.jpg             menu/tortillas.jpg        menu/salsas.jpg
menu/refresco.jpg              menu/refresco-2l.jpg      menu/agua-fresca.jpg
```

## Recomendaciones

- **Formato:** `.jpg` para fotos (o `.webp` si puedes; solo cambia la extensión en `menu.js`).
- **Medida:** 800 × 600 px es más que suficiente para las tarjetas del menú.
- **Peso:** comprime a menos de 200 KB por imagen (usa squoosh.app o tinypng.com).
  Fotos pesadas = página lenta = pedidos perdidos.
- **Encuadre:** cuadrado o 4:3, con el platillo centrado y buena luz. Las fotos de tus
  flyers actuales funcionan perfecto si las recortas.
