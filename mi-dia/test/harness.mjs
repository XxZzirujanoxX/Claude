// Abre Mi día en Chromium con el runtime simulado y datos de ejemplo.
// Envuelve la página con el mismo esqueleto que agrega la publicación.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSeed } from './seed.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// Playwright viene preinstalado de forma global; createRequire respeta NODE_PATH
const { chromium } = createRequire(import.meta.url)('playwright');
const SKELETON = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';

// Respuestas simuladas de Claude según el tipo de prompt
const SAMPLE_HANDLER = `window.__sampleHandler = async (text) => {
  await new Promise(r => setTimeout(r, 30));
  if (window.__sampleFail) return { __error: { code: window.__sampleFail } };
  if (text.includes('Clasificas los gastos')) return { cat: 'ocio', porque: 'Es un gusto personal' };
  if (text.includes('asistente de la app «Mi día»')) return window.__capNext || { respuesta: 'Entendí un gasto.', acciones: [{ tipo: 'gasto', monto: 120, cat: 'gasolina', nota: 'Uber', fecha: '' }] };
  if (text.includes('recomendador de cine')) return window.__recoNext || { peliculas: [{ titulo: 'Perfect Days', anio: 2023, director: 'Wim Wenders', porque: 'Si te gustó Arrival, esta calma te va a llegar.' }, { titulo: 'El viaje de Chihiro', anio: 2001, porque: 'repetida' }, { titulo: 'Past Lives', anio: 2023, director: 'Celine Song', porque: 'Íntima como tus favoritas.' }], series: [{ titulo: 'Severance', plataforma: 'Apple TV+', porque: 'Misterio con ideas, como Arrival.' }], libro: { id: 'un-mundo-feliz', porque: 'Sigue la línea de 1984.' } };
  if (text.includes('coach de vida')) return { good: 'Constancia en Duolingo.', bad: 'Dormiste tarde.', change: '- Acuéstate antes\\n- Prepara la mochila', ajuste: 'Acuéstate a las 22:30.', porArea: { habitos: 'Vas al 60%.', sueno: '6 h en promedio.' } };
  return { respuesta: 'ok' };
};`;

export async function open(o = {}) {
  const time = o.time || '2026-10-30T07:40:00-06:00';
  const today = time.slice(0, 10);
  const seed = o.seed || makeSeed(today, o.seedOpts);
  const html = SKELETON + fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8') + '</body></html>';
  const browser = o.browser || await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: o.width || 390, height: o.height || 844 },
    deviceScaleFactor: o.dpr || 2,
    colorScheme: o.scheme || 'light',
    timezoneId: 'America/Merida',
    locale: 'es-MX',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('https://midia.test/')) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
    if (u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return route.fulfill({ contentType: 'text/css', body: '' });
    return route.abort();
  });
  await page.clock.setFixedTime(new Date(time));
  const flags = [o.noSample ? 'window.__NOSAMPLE=true;' : '', o.noDb ? 'window.__NODB=true;' : ''].join('');
  await page.addInitScript({ content: 'window.__SEED=' + JSON.stringify(seed) + ';' + flags + SAMPLE_HANDLER + fs.readFileSync(path.join(here, 'mock-runtime.js'), 'utf8') });
  if (o.beforeGoto) await o.beforeGoto(page, ctx);
  await page.goto('https://midia.test/');
  await page.waitForTimeout(o.settle || 400);
  return { browser, ctx, page, errors, today };
}

// Toca una pestaña de la barra inferior (o una sección del menú «Más»)
export async function tab(page, name) {
  const direct = await page.$(`#tabbar button[data-tab="${name}"]`);
  if (direct) { await direct.click(); }
  else { await page.click('#tabbar button[data-tab="mas"]'); await page.click(`#masBody [data-go="${name}"]`); }
  await page.waitForTimeout(150);
}

export async function shot(page, file) {
  const dir = process.env.SHOTS || path.join(here, 'shots');
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, file), fullPage: true });
}

export const store = (page, p) => page.evaluate((p) => (window.__store.get(p) ? JSON.parse(JSON.stringify(window.__store.get(p))) : null), p);
