// Pruebas de punta a punta de Mi día con el runtime simulado.
// Uso: node mi-dia/test/flows.mjs   (SHOTS=carpeta para guardar capturas)
import { open, tab, shot, store } from './harness.mjs';
import { makeSeed } from './seed.mjs';

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
  const tiles = await page.$$eval('.kt', (t) => t.map((x) => x.innerText.replace(/\n/g, ' ')));
  ok(tiles.length === 3 && /Hábitos 1 de 3/.test(tiles[0]) && /Sueño — .*Toca para anotar/.test(tiles[1]) && /^Para hoy/.test(tiles[2]), 'fila «Tu día» con hábitos, sueño y dinero', tiles);
  ok(/^Para gastar hoy: /.test(await page.$eval('.kt:nth-child(3)', (e) => e.getAttribute('aria-label'))), 'el lector de pantalla oye la etiqueta completa');
  ok(/Buenos días, Alex/.test(await page.$eval('.vh p', (e) => e.textContent)), 'saludo con tu nombre');
  ok(await page.$eval('#tabbar [data-tab="entregas"] .tbb', (e) => e.textContent).catch(() => '') === '2', 'insignia con 2 entregas urgentes');
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
  ok(/6h 35m/.test(await page.$eval('.kt:nth-child(2)', (e) => e.innerText)), 'el medidor de sueño muestra la noche');
  // marcar entregada desde Para ahora y deshacer
  await page.click('.focus [data-act="tcheck"][data-id="t1"]'); await wait(page, 300);
  ok((await store(page, 'tareas/t1')).estado === 'entregada', 'entrega marcada desde Para ahora');
  ok(await page.$eval('#tabbar [data-tab="entregas"] .tbb', (e) => e.textContent).catch(() => '') === '1', 'la insignia baja a 1');
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

await run('Hábito que ya pasó (vie 20:30)', { time: '2026-10-30T20:30:00-06:00' }, async ({ page }) => {
  if (await page.$('.focus [data-act="focusAll"]')) { await page.click('.focus [data-act="focusAll"]'); await wait(page); }
  const f = await page.$eval('.focus', (e) => e.innerText).catch(() => '');
  ok(/Tocaba de 19:00 a 20:00\. ¿Lo hiciste\?/.test(f), 'pregunta por el hábito cuyo horario ya pasó', f);
  await page.click('.focus [data-act="hab"][data-id="tareas"]'); await wait(page, 300);
  ok((await store(page, 'dias/2026-10-30')).habits.tareas === true, 'se marca de un toque');
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

await run('Libros: registro y plan conectados', { time: '2026-10-30T18:00:00-06:00' }, async ({ page }) => {
  await wait(page, 1500);
  let l = await store(page, 'lectura/1984');
  ok(l.estado === 'terminado' && l.fin === '2026-10-19' && l.calif === 4.5, '1984 terminado en el registro → terminado en el plan', l);
  ok(!(await store(page, 'extras/plan-1984')), 'no lo duplica en el registro');
  await tab(page, 'extras');
  await page.click('[data-act="xsub"][data-v="plan"]'); await wait(page);
  ok(/Rebelión en la granja/.test(await page.$eval('.now', (e) => e.innerText)), 'el plan sigue con el siguiente libro');
  await page.click('[data-act="libStart"]'); await wait(page, 1500);
  const rb = await store(page, 'extras/plan-rebelion-en-la-granja');
  ok(rb && rb.estado === 'curso' && rb.tipo === 'libro', 'empezar un libro del plan lo agrega al registro', rb);
  await page.click('[data-act="xsub"][data-v="reg"]'); await wait(page);
  await page.click('#fab'); await wait(page, 300);
  await page.click('#xTipo [data-v="libro"]');
  await page.fill('#xTitulo', 'fahrenheit 451'); await page.dispatchEvent('#xTitulo', 'input'); await wait(page);
  ok(await visible(page, '#xPlan') && await page.$eval('#xDet', (e) => e.value) === 'Ray Bradbury', 'reconoce el libro del plan y pone el autor');
  await page.click('#xEstado [data-v="terminado"]'); await page.click('#xStars [data-n="4"]');
  await page.click('#xGuardar'); await wait(page, 1500);
  l = await store(page, 'lectura/fahrenheit-451');
  ok(l && l.estado === 'terminado' && l.calif === 4, 'terminarlo en el registro lo marca en el plan', l);
  const lead = (await page.$eval('#view', (e) => e.innerText)).match(/En 2026[^\n]*/)?.[0] || '';
  ok(/1 película y 3 libros/.test(lead), 'el conteo del año no cuenta doble', lead);
  await page.click('[data-act="xsub"][data-v="plan"]'); await wait(page);
  const plan = await page.$eval('#view', (e) => e.innerText);
  ok(/Fuera del plan[\s\S]*Hábitos atómicos/.test(plan), 'el plan muestra los libros que leíste fuera de él');
  ok(/Un libro cada ~9 días/.test(plan) && /Esta semana leíste 1 h 15 min/.test(plan), 'calcula tu ritmo y lo que leíste esta semana', plan.match(/Un libro[^\n]*/)?.[0]);
  await page.click('[data-act="addBook"]'); await wait(page, 300);
  await page.fill('#xTitulo', 'El extranjero de Albert Camus'); await page.dispatchEvent('#xTitulo', 'input'); await wait(page);
  ok(await visible(page, '#xPlan'), 'reconoce el título aunque traiga el autor');
  await page.click('#xEstado [data-v="curso"]'); await page.click('#xGuardar'); await wait(page, 1500);
  const ex = await store(page, 'lectura/el-extranjero');
  ok(ex && ex.estado === 'leyendo', 'registrarlo como en curso lo pone «leyendo» en el plan', ex);
  await page.click('[data-act="xsub"][data-v="reg"]'); await wait(page);
  await page.click('[data-act="xOpen"][data-id="b1984"]'); await wait(page, 300);
  await page.click('#xEliminar'); await wait(page);
  ok(/plan de lectura/.test(await page.$eval('#askT', (e) => e.textContent)), 'al borrar avisa que está en el plan');
  await page.click('#askYes'); await wait(page, 1500);
  l = await store(page, 'lectura/1984');
  ok(l.estado === 'pendiente' && !(await store(page, 'extras/b1984')) && !(await store(page, 'extras/plan-1984')), 'se quita del registro, vuelve a pendiente y no reaparece', l);
});

// --- cambio de mes, festejo, deslizar entregas, captura y sueño con un toque ---
await run('Último día del mes (sáb 31 oct 9:00)', { time: '2026-10-31T09:00:00-06:00' }, async ({ page }) => {
  ok(await page.$eval('.capsend', (b) => b.disabled), 'el botón de anotar espera a que escribas');
  await page.fill('#capIn', 'Uber 120');
  ok(!(await page.$eval('.capsend', (b) => b.disabled)), 'al escribir se activa');
  await page.fill('#capIn', '');
  await tab(page, 'dinero'); await wait(page, 300);
  const all = await page.$eval('#view', (e) => e.innerText);
  const wk = (all.match(/Próximos 7 días([\s\S]*?)Del dinero que entró/) || [])[1] || '';
  ok(/Renta[\s\S]*Pago de noviembre/.test(wk) && /Papá[\s\S]*Llega en noviembre/.test(wk), 'el 31 ya avisa lo que toca pagar y recibir el 1', wk);
  ok((wk.match(/Pago de noviembre/g) || []).length === 3 && (wk.match(/Llega en noviembre/g) || []).length === 1 && /Tocaba el 28/.test(wk), 'solo lo de esos días, sin repetir lo atrasado', wk);
});

await run('Primer día del mes (dom 1 nov 9:00)', { time: '2026-11-01T09:00:00-06:00' }, async ({ page }) => {
  const rc = await page.$eval('.recap', (e) => e.innerText).catch(() => '');
  ok(/Así cerró octubre/.test(rc) && /Gastaste \$[\d,]+/.test(rc) && /Lo que más pesó/.test(rc) && /Cumpliste el \d+%/.test(rc), 'resumen de octubre en Hoy', rc);
  await shot(page, 'p9-recap.png');
  await page.click('[data-act="recapGo"]'); await wait(page, 300);
  ok(/Octubre 2026/.test(await page.$eval('#view', (e) => e.innerText)), 'te lleva a octubre en Dinero');
  await tab(page, 'hoy'); await page.click('[data-act="recapHide"]'); await wait(page);
  ok(!(await page.$('.recap')), 'se puede ocultar');
});

await run('Noche del viernes (vie 20:30)', { time: '2026-10-30T20:30:00-06:00' }, async ({ page }) => {
  await tab(page, 'entregas'); await wait(page, 300);
  ok(!!(await page.$('.swhint')), 'explica que se puede deslizar');
  const swipe = async (dist) => {
    let bb = null;
    for (let k = 0; k < 4 && !bb; k++) { try { const li = await page.$('li.task:not(.done)'); await li.scrollIntoViewIfNeeded(); bb = await li.boundingBox(); } catch { await wait(page, 120); } }
    const y = bb.y + bb.height / 2;
    await page.mouse.move(bb.x + 60, y); await page.mouse.down();
    for (let k = 1; k <= 8; k++) await page.mouse.move(bb.x + 60 + (dist * k) / 8, y + 1);
    await page.mouse.up();
  };
  const id0 = await page.$eval('li.task:not(.done) .tchk', (b) => b.dataset.id);
  await swipe(40); await wait(page, 500);
  ok(((await store(page, 'tareas/' + id0)).estado || 'pendiente') !== 'entregada' && !(await page.$('.sheet.open')), 'un deslizamiento corto no hace nada');
  await swipe(170); await wait(page, 900);
  ok((await store(page, 'tareas/' + id0)).estado === 'entregada', 'deslizar a la derecha la marca como entregada');
  ok(!(await page.$('.sheet.open')) && /Entregada/.test(await page.$eval('#toast', (e) => e.textContent)), 'sin abrir la entrega y con deshacer');
  ok(!(await page.$('.swhint')), 'la explicación ya no se repite');
  await tab(page, 'habitos'); await wait(page, 300);
  for (let i = 0; i < 10; i++) {
    const b = await page.$('.hrow .chk[data-act="hab"][aria-pressed="false"]:not([data-st="opcional"]):not([data-st="exc"]):not([disabled])');
    if (!b) break; await b.click(); await wait(page, 120);
  }
  ok(/Día completo/.test(await page.$eval('#toast', (e) => e.textContent)), 'festeja cuando completas el día', await page.$eval('#toast', (e) => e.textContent));
  ok(!!(await page.$('.burst i')), 'con una pequeña explosión de color');
});

await run('Mañana sin sueño (sáb 31 oct 8:10)', { time: '2026-10-31T08:10:00-06:00' }, async ({ page, today }) => {
  await page.click('.kt[data-act="goSleep"]'); await wait(page, 500);
  ok(await page.evaluate(() => { const r = document.getElementById('fzBed').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'la tarjeta de sueño te lleva a anotarlo');
  await tab(page, 'habitos'); await wait(page, 300);
  const g = await page.$eval('.sguess', (e) => e.innerText).catch(() => '');
  ok(/Como casi siempre/.test(g), 'Hábitos propone tu noche típica', g);
  await page.click('[data-act="sleepUse"]'); await wait(page, 300);
  const d = await store(page, 'dias/' + today);
  ok(d && d.durmio && d.wake && /Dormiste/.test(await page.$eval('#toast', (e) => e.textContent)), 'con un toque queda guardada', d);
  ok(!(await page.$('.sguess')), 'y la propuesta desaparece');
});

await run('Brightspace detenido (sáb 31 oct 13:00)', { time: '2026-10-31T13:00:00-06:00', seed: (() => { const sd = makeSeed('2026-10-31'); sd['config/brightspace'].ultimaRevision = '2026-10-27T12:00:00.000Z'; return sd; })() }, async ({ page }) => {
  await tab(page, 'entregas'); await wait(page, 300);
  ok(/Lleva 4 días sin revisar/.test(await page.$eval('#view', (e) => e.innerText)), 'avisa si la sincronización con Brightspace se detuvo');
  await tab(page, 'comida'); await wait(page, 300);
  const hs = await page.$$eval('.wd h3', (x) => x.map((e) => e.textContent));
  ok(/^Sábado \(hoy\)/.test(hs[0]) && /^Domingo \(mañana\)/.test(hs[1]) && /^Viernes/.test(hs[6]), 'el menú de la semana empieza hoy', hs);
});

await run('Teléfono chico en modo oscuro (320 px)', { time: '2026-10-31T13:15:00-06:00', width: 320, scheme: 'dark' }, async ({ page }) => {
  const bad = [];
  for (const t of ['hoy', 'habitos', 'entregas', 'dinero', 'comida', 'ejercicio', 'armario', 'extras']) {
    await tab(page, t); await wait(page, 200);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ov > 0) bad.push(t + ' +' + ov + 'px');
  }
  ok(!bad.length, 'ninguna pantalla se sale de lado', bad);
});

// --- el dolor que anotas cambia el consejo de ejercicio; de noche, «Mañana» ---
const conDolor = (today, ayer, nota) => { const sd = makeSeed(today); sd['dias/' + ayer] = Object.assign({}, sd['dias/' + ayer], { note: nota }); return sd; };
await run('Noche con dolor (sáb 31 oct 21:30)', { time: '2026-10-31T21:30:00-06:00', seed: conDolor('2026-10-31', '2026-10-31', 'Corrí 15 km con mi papá, me duelen las rodillas y la cadera. Fuera de eso, buen día.') }, async ({ page }) => {
  const now = await page.$eval('.now', (e) => e.innerText);
  ok(/Buenas noches/.test(now) && /Mañana despiertas a las 7:00/.test(now), 'de noche, el día flexible habla de dormir', now);
  const mc = await page.$eval('.manana', (e) => e.innerText).catch(() => '');
  ok(/Mañana, domingo 1/.test(mc) && /Día flexible/.test(mc) && /Ejercicio\s+Superior B \(ojo con el dolor\)/.test(mc), 'tarjeta «Mañana» con agenda, hábitos y ejercicio', mc);
});
await run('Domingo después del dolor (dom 1 nov 8:00)', { time: '2026-11-01T08:00:00-06:00', seed: conDolor('2026-11-01', '2026-10-31', 'Corrí 15 km con mi papá, me duelen las rodillas y la cadera. Fuera de eso, buen día.') }, async ({ page }) => {
  ok(!(await page.$('.manana')), 'en la mañana no aparece «Mañana»');
  await page.click('[data-act="focusAll"]').catch(() => {}); await wait(page);
  const f = await page.$eval('.focus', (e) => e.innerText);
  ok(/Ojo con el dolor de ayer/.test(f) && /Superior B: puedes entrenar/.test(f), 'Para ahora avisa del dolor y adapta la rutina', f.match(/Ojo con[^\n]*\n[^\n]*/)?.[0]);
  const pn = await page.$eval('.pain', (e) => e.innerText).catch(() => '');
  ok(/Anotaste dolor ayer/.test(pn) && /me duelen las rodillas y la cadera/.test(pn) && /médico o fisio/.test(pn), 'la tarjeta de ejercicio cita lo que anotaste', pn);
});
await run('Día de pierna con dolor (mar 3 nov 7:00)', { time: '2026-11-03T07:00:00-06:00', seed: conDolor('2026-11-03', '2026-11-02', 'Me duele la rodilla derecha desde el fútbol') }, async ({ page }) => {
  const pn = await page.$eval('.pain', (e) => e.innerText).catch(() => '');
  ok(/Hoy toca Inferior A: no la fuerces/.test(pn), 'en día de pierna sugiere no forzar', pn);
});
await run('Sin dolor anotado (dom 1 nov 8:00)', { time: '2026-11-01T08:00:00-06:00' }, async ({ page }) => {
  ok(!(await page.$('.pain')) && !/Ojo con el dolor/.test(await page.$eval('#view', (e) => e.innerText)), 'sin notas de dolor no dice nada');
});

await run('Sin base de datos', { noDb: true }, async ({ page }) => {
  ok(/Abre esta app desde Claude/.test(await page.$eval('#view', (e) => e.innerText)), 'avisa que hay que abrirla desde Claude');
});

console.log(`\n${passes} bien, ${fails} mal`);
process.exit(fails ? 1 : 0);
