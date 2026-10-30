# Mi día

Código del artefacto «Mi día» (una sola página, `index.html`). La publicación en claude.ai agrega el esqueleto `<html>/<head>/<body>`, así que la página empieza directo con su `<title>` y su `<style>`.

## Datos

Todo vive en la base de datos del artefacto (capacidad `db`), nunca en el código:

| Ruta | Qué guarda |
| --- | --- |
| `config/perfil` | Quién eres, para los prompts de la IA: `nombre`, `edad`, `ocupacion`, `ciudad`, `fisico` |
| `config/plan` | Hábitos (`days`, `optDays`, `dayHist`, metas medibles) |
| `config/agenda` | Horario por día (`bloques` o `items` si el día es flexible); cada bloque de un hábito lleva `hab` |
| `config/presupuesto`, `config/reglas` | Categorías e ingresos; reglas de comercio → categoría |
| `config/materias`, `config/menu`, `config/recetas`, `config/ejercicio` | Lo demás de configuración |
| `dias/AAAA-MM-DD` | Hábitos, sueño, energía, comidas y diario del día |
| `semanas/<lunes>` | Metas y reflexión de la semana |
| `meses/AAAA-MM` | Movimientos de dinero (`tx`) |
| `tareas/*`, `extras/*`, `lectura/*`, `armario/*` | Entregas, registro de películas/libros, plan de lectura y armario |

## Pruebas

Con el Chromium y Playwright preinstalados:

```sh
node mi-dia/test/flows.mjs
```

`test/mock-runtime.js` simula `window.claude` (db y sample) y `test/seed.mjs` arma datos inventados con la misma forma que los reales. Para guardar capturas: `SHOTS=/ruta node mi-dia/test/flows.mjs`.
