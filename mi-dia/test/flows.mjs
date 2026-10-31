// Pruebas de punta a punta de Mi día con el runtime simulado.
// Uso: node mi-dia/test/flows.mjs   (SHOTS=carpeta para guardar capturas)
import { open, tab, shot, store } from './harness.mjs';

let fails = 0, passes = 0;
const ok = (cond, name, extra) => {
  if (cond) { passes++; console.log('  ✓ ' + name); }
  else { fails++; console.log('  ✗ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};
const wait = (page, ms = 150) => page.waitForTimeout(ms);
const sampleCalls = (page, needle) => page.evaluate((n) => window.__sampleLog.filter((t) => t.includes(n)).length, needle);
const visible = (page, sel) => page.$eval(sel, (el) => !el.hidden && getComputedStyle(el).display !== 'none').catch(() => false);
const txOf = async (page, ym) => ((await store(page, 'meses/' + ym)) || { tx: [] }).tx;
const run = async (name, opts, fn) => {
  console.log('\n' + name);
  const env = await open(opts);
  try { await fn(env); } catch (e) { fails++; console.log('  ✗ excepción: ' + (e && e.stack || e)); }
  ok(env.errors.length === 0, 'sin errores en consola', env.errors);
  await env.browser.close();
};

// --- mañana: Hoy, Para ahora, sueño, entregas con deshacer, confirmaciones ---
await run('Mañana (vie 7:40)', { time: '2026-10-30T07:40:00-06:00' }, async ({ page }) => {
  await shot(page, 'm-hoy.png');
  ok(await page.$$eval('#tabbar button', (b) => b.length) === 5, 'barra con 5 pestañas');
  const focus = await page.$eval('.focus', (el) => el.innerText).catch(() => '');
  ok(/Para ahora/.test(focus), 'aparece «Para ahora»');
  ok(/Reporte de laboratorio 4/.test(focus) && /¿Cómo dormiste\?/.test(focus), 'entrega vencida y sueño en Para ahora', focus.slice(0, 200));
  ok(/Tu iPhone no ha mandado la noche de hoy/.test(focus), 'avisa que el iPhone no mandó el sueño');
  // guardar sueño
  await page.fill('#fzBed', '00:30'); await page.fill('#fzWake', '07:05');
  await page.click('[data-act="sleepSave"]'); await wait(page, 300);
  const d = await store(page, 'dias/2026-10-30');
  ok(d && d.durmio === '00:30' && d.wake === '07:05', 'sueño guardado en el día', d);
  ok(!(await page.$('#fzBed')), 'la tarjeta de sueño desaparece al guardar');
  // marcar entregada desde Para ahora y deshacer
  await page.click('.focus [data-act="tcheck"][data-id="t1"]'); await wait(page, 300);
  ok((await store(page, 'tareas/t1')).estado === 'entregada', 'entrega marcada desde Para ahora');
  await page.click('#toast button'); await wait(page, 300);
  ok((await store(page, 'tareas/t1')).estado === 'pendiente', 'Deshacer la regresa a pendiente');
  // borrar entrega: confirmación dentro de la página
  await tab(page, 'entregas');
  await page.click('[data-act="tarea"][data-id="t5"]'); await wait(page, 300);
  await page.click('#tEliminar'); await wait(page);
  ok(await visible(page, '#ask'), 'aparece la confirmación propia');
  await page.click('#askNo'); await wait(page, 250);
  ok(!!(await store(page, 'tareas/t5')), 'Cancelar no borra');
  await page.click('#tEliminar'); await wait(page);
  await page.click('#askYes'); await wait(page, 400);
  ok(!(await store(page, 'tareas/t5')), 'Eliminar sí borra (antes confirm() lo impedía)');
  // menú Más
  await page.click('#tabbar button[data-tab="mas"]'); await wait(page, 300);
  const mas = await page.$eval('#masBody', (el) => el.innerText);
  ok(/Comida/.test(mas) && /Armario/.test(mas) && /Hoy: saca pollo del sábado/.test(mas), 'Más muestra secciones con resumen de hoy', mas);
  await page.click('#masBody [data-go="ejercicio"]'); await wait(page);
  ok(await page.$eval('#view h1', (h) => h.textContent) === 'Ejercicio', 'Más abre la sección');
  ok(await page.$eval('#tabbar [data-tab="mas"]', (b) => b.getAttribute('aria-current')) === 'page', 'la pestaña Más queda marcada');
});

// --- dinero: categoría aprendida, monto usual, frecuentes de un toque, tope semanal ---
await run('Dinero inteligente (jue 14:10)', { time: '2026-10-29T14:10:00-06:00' }, async ({ page }) => {
  if (await page.$('.focus [data-act="focusAll"]')) { await page.click('.focus [data-act="focusAll"]'); await wait(page); }
  const focus = await page.$eval('.focus', (el) => el.innerText).catch(() => '');
  ok(/Comidas en prácticas · \$70/.test(focus), 'sugiere el gasto de rutina del día', focus);
  ok(/Ocio: casi en tu tope/.test(focus), 'avisa del tope de ocio de la semana', focus);
  ok(/YouTube/.test(focus), 'avisa del pago que el mes pasado ya estaba hecho', focus);
  await page.click('.focus [data-act="rspend"]'); await wait(page, 300);
  let tx = await txOf(page, '2026-10');
  ok(tx.some((t) => t.d === '2026-10-29' && t.cat === 'comidas' && t.amt === 70), 'gasto de rutina registrado de un toque');
  await tab(page, 'dinero');
  await page.click('#fab'); await wait(page, 300);
  ok(await visible(page, '#vFreq'), 'aparecen tus gastos frecuentes');
  const cls0 = await sampleCalls(page, 'Clasificas los gastos');
  await page.fill('#vDesc', 'Uber'); await page.dispatchEvent('#vDesc', 'input'); await wait(page);
  const hint = await page.$eval('#vHint', (e) => e.textContent);
  ok(/Gasolina/.test(hint), 'la categoría se aprende de tus movimientos', hint);
  ok(await page.$eval('#vMonto', (e) => e.value) === '210', 'el monto usual se llena solo');
  for (const [d, c] of [['Barbero', 'Cuidado personal'], ['Cine con amigos', 'Ocio'], ['Super de la semana', 'Súper']]) {
    await page.fill('#vDesc', d); await page.dispatchEvent('#vDesc', 'input'); await wait(page, 60);
    const hh = await page.$eval('#vHint', (e) => e.textContent);
    ok(hh.includes(c), `«${d}» → ${c}`, hh);
  }
  await page.fill('#vDesc', 'Uber'); await page.dispatchEvent('#vDesc', 'input'); await wait(page, 60);
  await page.click('#vGuardar'); await wait(page, 300);
  tx = await txOf(page, '2026-10');
  ok(tx.some((t) => t.d === '2026-10-29' && t.cat === 'gasolina' && t.amt === 210 && t.note === 'Uber'), 'gasto guardado con lo aprendido');
  ok(await sampleCalls(page, 'Clasificas los gastos') === cls0, 'no gastó una consulta a Claude');
  await page.click('#fab'); await wait(page, 300);
  await page.fill('#vDesc', 'Tacos 95'); await page.dispatchEvent('#vDesc', 'input'); await wait(page);
  ok(await page.$eval('#vMonto', (e) => e.value) === '95', 'toma el monto escrito en la descripción');
  await page.click('#vGuardar'); await wait(page, 400);
  tx = await txOf(page, '2026-10');
  ok(tx.some((t) => t.note === 'Tacos' && t.amt === 95), 'la nota se guarda sin el monto', tx.slice(-2));
  await page.click('#fab'); await wait(page, 300);
  const before = (await txOf(page, '2026-10')).length;
  await page.click('#vFreq button'); await wait(page, 300);
  ok((await txOf(page, '2026-10')).length === before + 1, 'un toque en un frecuente lo guarda');
  await tab(page, 'habitos');
  await page.click('[data-act="hview"][data-v="semana"]'); await wait(page);
  const sem = await page.$eval('#view', (e) => e.innerText);
  const ocio = (await txOf(page, '2026-10')).filter((t) => t.t === 'gasto' && t.cat === 'ocio' && t.d >= '2026-10-26').reduce((a, t) => a + t.amt, 0);
  const shown = (sem.match(/Ocio máximo \$750 esta semana\n\$([\d,]+) de \$750/) || [])[1];
  ok(shown && Number(shown.replace(/,/g, '')) === ocio, 'la meta libre de tope se mide sola con tus movimientos', { shown, ocio });
  await shot(page, 'd-semana.png');
});

// --- entregas en lenguaje natural ---
await run('Entrega escrita como se dice', { time: '2026-10-30T10:00:00-06:00' }, async ({ page }) => {
  await tab(page, 'entregas');
  await page.click('#fab'); await wait(page, 300);
  await page.fill('#tTitulo', 'Examen de hidráulica el jueves a las 10'); await page.dispatchEvent('#tTitulo', 'input'); await wait(page);
  ok(await page.$eval('#tFecha', (e) => e.value) === '2026-11-05', 'fecha: el jueves que viene');
  ok(await page.$eval('#tHora', (e) => e.value) === '10:00', 'hora: 10:00');
  ok(await page.$eval('#tMateria', (e) => e.value) === 'hidraulica', 'materia reconocida');
  ok(/Entendí/.test(await page.$eval('#tHint', (e) => e.textContent)), 'explica lo que entendió');
  await page.click('#tGuardar'); await wait(page, 400);
  const all = await page.evaluate(() => [...window.__store.entries()].filter(([k]) => k.startsWith('tareas/')).map(([, v]) => v));
  ok(all.some((t) => t.titulo === 'Examen de hidráulica' && t.fecha === '2026-11-05' && t.hora === '10:00' && t.materiaId === 'hidraulica'), 'se guarda con el título limpio');
  await page.click('#fab'); await wait(page, 300);
  await page.fill('#tTitulo', 'Lesson 14 para el 15 de nov'); await page.dispatchEvent('#tTitulo', 'input'); await wait(page);
  ok(await page.$eval('#tFecha', (e) => e.value) === '2026-11-15', '«15 de nov»');
  ok(await page.$eval('#tMateria', (e) => e.value) === 'puertos', 'materia por tus entregas anteriores («Lesson» → Puertos)');
});

// --- captura rápida sin gastar Claude ---
await run('Captura rápida', { time: '2026-10-30T12:30:00-06:00' }, async ({ page }) => {
  await page.fill('#capIn', 'Uber 120, hice ejercicio');
  await page.click('[data-act="capGo"]'); await wait(page, 300);
  const res = await page.$eval('.cap', (e) => e.innerText);
  ok(/Gasto de \$120 en Gasolina/.test(res) && /Ejercicio: hecho/.test(res), 'entiende frases simples al instante', res);
  ok(await sampleCalls(page, 'asistente de la app') === 0, 'sin consulta a Claude');
  await page.click('[data-act="capApply"]'); await wait(page, 400);
  const d = await store(page, 'dias/2026-10-30');
  ok(d.habits.ejercicio === true, 'hábito marcado');
  ok((await txOf(page, '2026-10')).some((t) => t.amt === 120 && t.cat === 'gasolina'), 'gasto guardado');
  await page.fill('#capIn', 'Ayer fui al cine con Ana y la pasamos increíble');
  await page.click('[data-act="capGo"]'); await wait(page, 500);
  ok(await sampleCalls(page, 'asistente de la app') === 1, 'lo complejo sí se lo pregunta a Claude');
});

// --- agenda que se ajusta sola + editor de hábitos ---
await run('Agenda y hábitos', { time: '2026-10-30T09:30:00-06:00' }, async ({ page }) => {
  await tab(page, 'habitos');
  ok(!!(await page.$('[data-act="agFix"]')), 'ofrece ajustar la agenda');
  await page.click('[data-act="agFix"]'); await wait(page, 300);
  let ag = await store(page, 'config/agenda');
  ok(ag.dias['2'].bloques.some((b) => b.hab === 'enlinea'), 'martes recibe su bloque de «Materias en línea»', ag.dias['2'].bloques.filter((b) => b.hab === 'enlinea'));
  ok(!ag.dias['4'].bloques.some((b) => b.hab === 'enlinea'), 'jueves libera el bloque que sobraba');
  const tue = ag.dias['2'].bloques.map((b) => [b.ini, b.fin]);
  ok(tue.every((x, i) => i === 0 || x[0] >= tue[i - 1][1]), 'sin choques de horario', tue);
  ok(!(await page.$('[data-act="agFix"]')), 'el aviso desaparece');
  await page.click('#toast button'); await wait(page, 300);
  ag = await store(page, 'config/agenda');
  ok(ag.dias['4'].bloques.some((b) => b.hab === 'enlinea'), 'Deshacer restaura la agenda');
  // editor: lo esencial primero
  await page.click('[data-act="planEdit"]'); await wait(page, 300);
  ok(!(await page.$('#pm0')), 'las opciones avanzadas empiezan ocultas');
  await page.click('[data-pmore="duolingo"]'); await wait(page);
  ok(!!(await page.$('#pm0')), '«Meta, mínimo…» las muestra');
  await page.click('#pAdd'); await wait(page);
  const n = await page.$$eval('#pBody .hed', (x) => x.length);
  await page.fill(`#pn${n - 1}`, 'Meditar'); await page.dispatchEvent(`#pn${n - 1}`, 'input');
  await page.click('#pGuardar'); await wait(page, 400);
  ag = await store(page, 'config/agenda');
  const med = [1, 2, 3, 4, 5].map((w) => ag.dias[String(w)].bloques.find((b) => b.t === 'Meditar'));
  ok(med.every(Boolean), 'el hábito nuevo recibe horario de lunes a viernes', med);
  ok(/Agenda ajustada/.test(await page.$eval('#toast', (e) => e.textContent)), 'avisa qué cambió en la agenda');
  // quitar hábito con confirmación propia
  await page.click('[data-act="planEdit"]'); await wait(page, 300);
  await page.click('[data-prm="0"]'); await wait(page);
  ok(await visible(page, '#ask'), 'quitar hábito pide confirmación');
  await page.click('#askYes'); await wait(page);
  ok(!(await page.$$eval('#pBody input[data-pf="name"]', (x) => x.map((i) => i.value))).includes('Duolingo'), 'el hábito se quita del borrador');
});

// --- tarjeta Ahora: marcar el hábito del bloque actual ---
await run('Tarde (vie 19:10)', { time: '2026-10-30T19:10:00-06:00' }, async ({ page }) => {
  const now = await page.$eval('.now', (e) => e.innerText);
  ok(/Tareas y estudio/.test(now), 'tarjeta Ahora con el bloque actual', now);
  await page.click('.now [data-act="hab"]'); await wait(page, 300);
  ok((await store(page, 'dias/2026-10-30')).habits.tareas === true, '«Marcar hecho» desde la tarjeta Ahora');
  ok(/✓ Tareas y estudio/.test(await page.$eval('.now', (e) => e.innerText)), 'la tarjeta muestra que ya está');
  await page.click('.now [data-act="agenda"]'); await wait(page);
  ok(!!(await page.$('#agendaCard')), 'la agenda se abre desde la tarjeta Ahora');
});

await run('Noche (vie 21:40)', { time: '2026-10-30T21:40:00-06:00', scheme: 'dark' }, async ({ page }) => {
  const top4 = await page.$eval('.focus', (e) => e.innerText).catch(() => '');
  ok(/¿Cómo te sentiste hoy\?/.test(top4), 'de noche, la energía sube entre lo primero', top4);
  if (await page.$('.focus [data-act="focusAll"]')) { await page.click('.focus [data-act="focusAll"]'); await wait(page); }
  const focus = await page.$eval('.focus', (e) => e.innerText).catch(() => '');
  ok(/¿Cómo te sentiste hoy\?/.test(focus) && /diario/.test(focus), 'cierre del día: energía y diario', focus);
  await page.click('.focus [data-act="energyT"][data-n="4"]'); await wait(page, 300);
  ok((await store(page, 'dias/2026-10-30')).energy === 4, 'energía de un toque');
  await shot(page, 'n-hoy-dark.png');
  await page.click('.focus [data-act="jgo"]'); await wait(page, 300);
  ok(await page.$eval('#view h1', (h) => h.textContent) === 'Hábitos' && !!(await page.$('#hNote')), '«Escribir» abre tu diario de hoy');
});

await run('Domingo sin Claude', { time: '2026-11-01T11:00:00-06:00', noSample: true }, async ({ page }) => {
  ok(!!(await page.$('#capIn')), 'la captura funciona sin Claude');
  await page.fill('#capIn', 'super 640');
  await page.click('[data-act="capGo"]'); await wait(page, 300);
  ok(/Súper/.test(await page.$eval('.cap', (e) => e.innerText)), 'clasifica sin Claude');
  await tab(page, 'dinero'); await page.click('#fab'); await wait(page, 300);
  await page.fill('#vDesc', 'algo raro'); await page.dispatchEvent('#vDesc', 'input'); await wait(page);
  ok(/elige la categoría/.test(await page.$eval('#vHint', (e) => e.textContent)), 'pide elegir categoría cuando no la reconoce');
});

await run('Sin base de datos', { noDb: true }, async ({ page }) => {
  ok(/Abre esta app desde Claude/.test(await page.$eval('#view', (e) => e.innerText)), 'avisa que hay que abrirla desde Claude');
});

console.log(`\n${passes} bien, ${fails} mal`);
process.exit(fails ? 1 : 0);
