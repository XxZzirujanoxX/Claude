// Datos de ejemplo (inventados) con la misma forma que los de Mi día.
// makeSeed('2026-10-30') arma un mes de historia alrededor de esa fecha.
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const add = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const wd = (s) => ((parse(s).getDay() + 6) % 7) + 1;
const ALL = [1, 2, 3, 4, 5, 6, 7];

function rng(seed) { let x = seed; return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); }

export function makeSeed(today, opts = {}) {
  const r = rng(7);
  const mon = add(today, 1 - wd(today));
  const ym = today.slice(0, 7);
  const pm = (() => { const d = parse(ym + '-01'); d.setMonth(d.getMonth() - 1); return iso(d).slice(0, 7); })();
  const S = {};

  S['config/perfil'] = { nombre: 'Alex', edad: 22, ocupacion: 'estudiante de ingeniería', ciudad: 'Puebla', fisico: '175 cm, talla M' };
  S['config/plan'] = {
    startDate: add(today, -33),
    targets: { minSleepHours: 7 },
    habits: [
      { id: 'duolingo', name: 'Duolingo', cat: 'rutina', days: ALL, meta: '20 min al despertar', min: '1 lección', nucleo: true },
      { id: 'ejercicio', name: 'Ejercicio', cat: 'ejercicio', days: [1, 2, 3, 7], optDays: [5, 6], meta: 'Rutina del día', metaN: 70, min: '20 min', minN: 20, unidad: 'min', optNota: 'Extra corta o completa' },
      { id: 'tareas', name: 'Tareas y estudio', cat: 'tareas', days: [1, 2, 3, 5, 6, 7], meta: '1 h de estudio', metaN: 60, min: '25 min', minN: 25, unidad: 'min' },
      { id: 'enlinea', name: 'Materias en línea', cat: 'tareas', days: [1, 2, 6], meta: '1 h', metaN: 60, min: '10 min', minN: 10, unidad: 'min' },
      { id: 'planeacion', name: 'Planeación semanal', cat: 'tareas', days: [7], meta: '20 min' },
      { id: 'limpieza', name: 'Limpieza', cat: 'hogar', days: [6], meta: '1 h 30 min' },
      { id: 'lectura', name: 'Lectura', cat: 'lectura', days: ALL, meta: '30 min antes de dormir', metaN: 30, min: '10 min', minN: 10, unidad: 'min', nucleo: true },
    ],
  };
  const B = (ini, fin, t, cat, hab, nota) => Object.assign({ ini, fin, t, cat }, hab ? { hab } : {}, nota ? { nota } : {});
  const weekday = (x) => ({
    despertar: '06:00', dormir: '22:15', bloques: [
      B('06:00', '06:20', 'Duolingo', 'rutina', 'duolingo'),
      ...(x.ej ? [B('06:20', '07:30', x.ej, 'ejercicio', 'ejercicio')] : []),
      B('07:30', '07:50', 'Ducha y arreglarte', 'rutina'),
      B('07:50', '08:30', 'Desayuno', 'comida'),
      B('08:30', '09:00', 'Trayecto', 'trayecto'),
      B('09:00', '13:00', 'Trabajo', 'spi'),
      B('13:00', '14:00', 'Comida comprada', 'comida'),
      B('14:00', '17:30', 'Clases', 'clases', null, 'Concreto y Caminos'),
      B('17:30', '18:00', 'Trayecto a casa', 'trayecto'),
      ...(x.enl ? [B('18:00', '19:00', 'Materia en línea', 'tareas', 'enlinea')] : []),
      ...(x.tar ? [B('19:00', '20:00', 'Tareas y estudio', 'tareas', 'tareas')] : []),
      B('20:00', '20:45', 'Cena', 'comida'),
      B('20:45', '21:30', 'Ocio', 'ocio'),
      B('21:30', '21:45', 'Mochila y ropa', 'rutina'),
      B('21:45', '22:15', 'Lectura', 'lectura', 'lectura'),
    ],
  });
  const I = (t, cat, dur, hab, nota) => Object.assign({ t, cat, dur }, hab ? { hab } : {}, nota ? { nota } : {});
  S['config/agenda'] = {
    dias: {
      // martes sin bloque de «Materias en línea» y jueves con uno que sobra: así hay algo que arreglar
      1: weekday({ ej: 'Ejercicio en casa', enl: true, tar: true }),
      2: weekday({ ej: 'Ejercicio en casa', tar: true }),
      3: weekday({ ej: 'Ejercicio en casa', tar: true }),
      4: weekday({ enl: true }),
      5: weekday({ ej: 'Ejercicio opcional', tar: true }),
      6: { despertar: '07:00', flexible: true, items: [I('Duolingo', 'rutina', '20 min', 'duolingo'), I('Ejercicio opcional', 'ejercicio', '30–55 min', 'ejercicio'), I('Limpieza', 'casa', '1 h 30 min', 'limpieza'), I('Tareas y estudio', 'tareas', '2 h', 'tareas'), I('Materia en línea', 'tareas', '1 h', 'enlinea'), I('Ocio', 'ocio', 'Libre'), I('Lectura', 'lectura', '30 min', 'lectura')] },
      7: { despertar: '07:00', flexible: true, items: [I('Duolingo', 'rutina', '20 min', 'duolingo'), I('Ejercicio en casa', 'ejercicio', '1 h 10 min', 'ejercicio'), I('Planeación semanal', 'tareas', '20 min', 'planeacion'), I('Tareas y estudio', 'tareas', '2 h', 'tareas'), I('Lectura', 'lectura', '30 min', 'lectura')] },
    },
  };
  S['config/presupuesto'] = {
    income: [{ id: 'papa', name: 'Papá', amt: 20000 }, { id: 'mama', name: 'Mamá', amt: 2800, note: '$700 por semana × 4' }, { id: 'practicas', name: 'Prácticas', amt: 3400, note: '$850 por semana × 4' }],
    cats: [
      { id: 'renta', name: 'Renta', g: 'fijos', amt: 6500, quick: true },
      { id: 'luz', name: 'Luz', g: 'fijos', amt: 800, quick: true },
      { id: 'internet', name: 'Internet', g: 'fijos', amt: 375, quick: true },
      { id: 'youtube', name: 'YouTube', g: 'subs', amt: 99, quick: true },
      { id: 'gamepass', name: 'Xbox Game Pass', g: 'subs', amt: 339, quick: true },
      { id: 'super', name: 'Súper', g: 'var', amt: 4000, note: '$1,000 por semana' },
      { id: 'gasolina', name: 'Gasolina', g: 'var', amt: 2500 },
      { id: 'comidas', name: 'Comidas en prácticas', g: 'var', amt: 1120, note: '4 comidas de $70 por semana' },
      { id: 'ocio', name: 'Ocio', g: 'var', amt: 3000 },
      { id: 'personal', name: 'Cuidado personal', g: 'var', amt: 400 },
      { id: 'ahorro', name: 'Ahorro', g: 'ahorro', amt: 2000, quick: true },
    ],
  };
  S['config/materias'] = { lista: [
    { id: 'concreto', nombre: 'Estructuras de concreto', corto: 'Concreto', clave: 'ICV401', color: '#3E7CB1', modalidad: 'presencial' },
    { id: 'hidraulica', nombre: 'Hidráulica básica', corto: 'Hidráulica', clave: 'ICV305', color: '#1F8FA8', modalidad: 'presencial' },
    { id: 'gestion', nombre: 'Gestión de proyectos', corto: 'Gestión', clave: 'ICV412', color: '#2A9D8F', modalidad: 'presencial' },
    { id: 'caminos', nombre: 'Caminos y carreteras', corto: 'Caminos', clave: 'ICV416', color: '#4F8A3B', modalidad: 'presencial' },
    { id: 'puertos', nombre: 'Obras portuarias', corto: 'Puertos', clave: 'ICV413', color: '#5B6C8F', modalidad: 'linea' },
  ] };
  S['config/menu'] = {
    meta: 'Comer con proteína en cada comida',
    finDeSemana: 'Libres.',
    colacionesDia: 1, colaciones: [],
    descongelar: [{ dia: 5, momento: 'mañana', t: 'Pollo del sábado' }, { dia: 4, momento: 'noche', t: 'Carne del viernes' }],
    dias: Object.fromEntries([1, 2, 3, 4, 5].map((d) => [String(d), {
      desayuno: { t: 'Licuado y quesadillas', prot: '~40 g', receta: 'licuado' },
      comida: { t: 'Fuera: arroz con pollo' },
      cena: { t: d === 5 ? 'Pasta boloñesa' : 'Tacos de pollo', prot: '~45 g', receta: 'tacos' },
    }])),
  };
  S['config/recetas'] = { lista: [
    { id: 'licuado', nombre: 'Licuado de proteína', tiempo: '5 min', porciones: 1, ingredientes: [{ items: [{ cant: '300 ml', t: 'Leche' }, { cant: '1', t: 'Plátano' }] }], pasos: ['Licúa todo.'] },
    { id: 'tacos', nombre: 'Tacos de pollo', tiempo: '20 min', porciones: 2, ingredientes: [{ items: [{ cant: '300 g', t: 'Pollo' }, { cant: '6', t: 'Tortillas' }] }], pasos: ['Cocina el pollo.', 'Arma los tacos.'] },
  ] };
  const rut = (id, nombre) => ({ id, nombre, dur: '55 min', bloques: [{ nombre: 'Calentamiento', ejercicios: [{ t: 'Movilidad', dosis: '5 min' }] }, { nombre: 'Bloque A', ejercicios: [{ c: 'A1', t: 'Lagartijas', dosis: '3 × 10', tec: 'lag' }] }] });
  S['config/ejercicio'] = {
    rutinas: [rut('supA', 'Superior A'), rut('infA', 'Inferior A'), rut('supB', 'Superior B'), rut('corta', 'Extra corta')],
    semana: { 1: [{ rutina: 'supA' }], 2: [{ rutina: 'infA' }], 3: [{ rutina: 'supA' }], 7: [{ rutina: 'supB' }] },
    opcional: { 5: { rutinas: ['corta'], nota: 'Extra corta si te sobra tiempo' }, 6: { rutinas: ['corta'], nota: '' } },
    tecnicas: { lag: { p: 'Manos a la altura del pecho', m: 'Baja controlado', c: 'Core firme', e: 'Hundir la cadera' } },
  };
  S['config/sueno'] = { py: '# programa de la rutina (simulado)', sha: '0' };
  S['config/brightspace'] = { ignorados: [], ultimaRevision: add(today, -1) + 'T12:00:00.000Z' };

  // días anteriores: hábitos, sueño, energía y comidas
  const plan = S['config/plan'].habits;
  for (let k = 25; k >= 1; k--) {
    const d = add(today, -k), w = wd(d), habits = {}, hora = {};
    plan.forEach((h) => {
      const on = h.days.includes(w);
      if (!on) return;
      const p = h.id === 'duolingo' ? 0.95 : h.id === 'lectura' ? 0.4 : h.id === 'ejercicio' ? 0.3 : 0.6;
      if (r() < p) { habits[h.id] = true; hora[h.id] = pad(7 + Math.floor(r() * 13)) + ':' + pad(Math.floor(r() * 60)); }
    });
    if (k === 1) delete habits.lectura; // ayer no hubo lectura: hoy toca «no lo sueltes»
    const bed = [22, 23, 23, 0, 1, 1, 2][Math.floor(r() * 7)], wk = 6 + Math.floor(r() * 2);
    const doc = { date: d, habits, hora, durmio: pad(bed) + ':' + pad(Math.floor(r() * 4) * 15), wake: pad(wk) + ':' + pad(Math.floor(r() * 4) * 15), comi: { desayuno: r() < 0.6, comida: r() < 0.8, cena: r() < 0.7 } };
    if (r() < 0.6) doc.energy = 2 + Math.floor(r() * 3);
    if (k === 2) doc.note = 'Día pesado de entregas, pero salió bien la exposición.';
    if (k === 2 || k === 3) doc.cant = { lectura: k === 2 ? 30 : 45 };
    S['dias/' + d] = doc;
  }
  S['dias/' + today] = Object.assign({ date: today, habits: { duolingo: true }, hora: { duolingo: '06:25' } }, opts.todayDay || {});

  S['semanas/' + mon] = { week: mon, metas: [{ tipo: 'libre', texto: 'Ocio máximo $750 esta semana' }, { tipo: 'habitos', pct: 80 }] };

  const T = (id, titulo, materiaId, fecha, extra) => ({ id, body: Object.assign({ titulo, materiaId, fecha, hora: '23:59', estado: 'pendiente', semanal: false, notas: '', creada: add(today, -10) + 'T12:00:00.000Z', entregadaEn: null }, extra || {}) });
  [
    T('t1', 'Reporte de laboratorio 4', 'hidraulica', add(today, -1)),
    T('t2', 'Activity 7: Risk register', 'gestion', today, { url: 'https://example.com/a7', fuente: 'brightspace', bsUid: 'bs-1' }),
    T('t3', 'Lesson 13', 'puertos', add(today, 1)),
    T('t4', 'Quiz semanal de caminos', 'caminos', add(today, 3), { semanal: true }),
    T('t5', 'Proyecto final: avance 2', 'concreto', add(today, 9)),
    T('t6', 'Lesson 12', 'puertos', add(today, -6), { estado: 'entregada', entregadaEn: add(today, -7) + 'T20:00:00.000Z' }),
    T('t7', 'Lesson 11', 'puertos', add(today, -13), { estado: 'entregada', entregadaEn: add(today, -14) + 'T20:00:00.000Z' }),
    T('t8', 'Activity 6: Cost control', 'gestion', add(today, -8), { estado: 'entregada', entregadaEn: add(today, -9) + 'T20:00:00.000Z' }),
  ].forEach((t) => { S['tareas/' + t.id] = t.body; });

  // movimientos del mes y del anterior
  let n = 0;
  const tx = (d, t, cat, amt, note, extra) => Object.assign({ id: 'x' + n++, t, cat, amt, note: note || '', d }, extra || {});
  const cur = [], prev = [];
  const first = ym + '-01', pfirst = pm + '-01';
  prev.push(tx(pfirst, 'ingreso', 'papa', 20000), tx(pfirst, 'gasto', 'renta', 6500), tx(pm + '-01', 'gasto', 'luz', 800), tx(pm + '-14', 'gasto', 'internet', 375), tx(pm + '-28', 'gasto', 'youtube', 99), tx(pm + '-02', 'gasto', 'gamepass', 339));
  cur.push(tx(first, 'ingreso', 'papa', 20000), tx(first, 'gasto', 'renta', 6500), tx(ym + '-01', 'gasto', 'luz', 800), tx(ym + '-14', 'gasto', 'internet', 375), tx(ym + '-02', 'gasto', 'gamepass', 339));
  for (let k = 33; k >= 1; k--) {
    const d = add(today, -k), w = wd(d);
    const arr = d.slice(0, 7) === ym ? cur : d.slice(0, 7) === pm ? prev : null;
    if (!arr) continue;
    if ([1, 3, 4].includes(w)) arr.push(tx(d, 'gasto', 'comidas', 70));
    if (w === 5) arr.push(tx(d, 'ingreso', 'practicas', 850));
    if (w === 6) arr.push(tx(d, 'ingreso', 'mama', 700));
    if (w === 7) arr.push(tx(d, 'gasto', 'super', 600 + Math.round(r() * 300)));
  }
  cur.push(
    tx(add(today, -12), 'gasto', 'gasolina', 210, 'Uber'), tx(add(today, -5), 'gasto', 'gasolina', 210, 'Uber al centro'),
    tx(add(today, -9), 'gasto', 'super', 47, 'Monster'), tx(add(today, -6), 'gasto', 'super', 47, 'Monster'), tx(add(today, -2), 'gasto', 'ocio', 74, 'Monster y chocolate'),
    tx(add(today, -3), 'gasto', 'ocio', 244, 'Sushi para cenar'), tx(mon, 'gasto', 'ocio', 180, 'Cine'), tx(add(mon, 1), 'gasto', 'ocio', 160, 'Bar'),
    tx(add(today, -1), 'gasto', '', 58, 'OXXO SUC CENTRO', { src: 'applepay' }),
  );
  S['meses/' + ym] = { tx: cur.filter((t) => t.d <= today) };
  S['meses/' + pm] = { tx: prev };

  S['extras/e1'] = { tipo: 'pelicula', titulo: 'El viaje de Chihiro', detalle: '2001', estado: 'terminado', calif: 5, fin: add(today, -4), nota: '', creado: add(today, -4) + 'T12:00:00.000Z' };
  S['extras/e2'] = { tipo: 'serie', titulo: 'Una serie larga', detalle: 'Temporada 2', estado: 'curso', calif: null, fin: null, nota: '', creado: add(today, -20) + 'T12:00:00.000Z' };
  S['extras/e3'] = { tipo: 'curso', titulo: 'Curso de Python', detalle: '', estado: 'pendiente', calif: null, fin: null, nota: '', creado: add(today, -2) + 'T12:00:00.000Z' };
  S['lectura/1984'] = { estado: 'leyendo', ini: add(today, -20), fin: null, calif: null, nota: '', upd: add(today, -20) + 'T12:00:00.000Z' };
  // como en los datos reales: 1984 se terminó en el registro pero el plan seguía en «leyendo»
  S['extras/b-atomicos'] = { tipo: 'libro', titulo: 'Hábitos atómicos', detalle: 'James Clear', estado: 'terminado', calif: 4, fin: add(today, -15), nota: '', creado: add(today, -40) + 'T12:00:00.000Z' };
  S['extras/b1984'] = { tipo: 'libro', titulo: '1984', detalle: 'George Orwell', estado: 'terminado', calif: 4.5, fin: add(today, -11), nota: '', creado: add(today, -33) + 'T12:00:00.000Z' };

  const it = (id, name, tipo, corte, color, hex, extra) => Object.assign({ id, name, tipo, corte, color, hex, material: 'Algodón', estado: 'sirve', cond: '', destino: '', combina: '', nota: '', maxUsos: tipo === 'alta' ? 1 : tipo === 'baja' ? 4 : 0, cantidad: 1, usos: 0, total: 3, ultimo: '', override: null }, extra || {});
  S['armario/inv'] = { items: [
    it('p1', 'Playera boxy verde oliva', 'alta', 'Playera boxy', 'Verde oliva', '#5A5E3A'),
    it('p2', 'Polo azul marino', 'alta', 'Polo slim', 'Azul marino', '#1F2A44'),
    it('p3', 'Playera crema', 'alta', 'Playera slim', 'Crema', '#EDE3CC'),
    it('p4', 'Pantalón beige', 'baja', 'Recto afilado', 'Beige', '#CDB892'),
    it('p5', 'Tenis blancos', 'calzado', 'Tenis', 'Blanco', '#F2F2F2'),
    it('p6', 'Calzones negros', 'basico', 'Ropa interior', 'Negro', '#222222', { maxUsos: 1, cantidad: 7 }),
    it('p7', 'Calcetines blancos', 'basico', 'Calcetines largos', 'Blanco', '#FAFAFA', { maxUsos: 1, cantidad: 6 }),
    it('p8', 'Anillo de plata', 'accesorio', 'Anillo', 'Plata', '#C0C0C0', { material: 'Plata' }),
    it('p9', 'Pulsera café', 'accesorio', 'Pulsera', 'Café', '#6B4A2B'),
  ], v: 1 };
  const cyc = add(today, -3);
  S['armario/plan'] = { cycle: { id: 'c1', inicio: cyc, dias: 14, creado: cyc, semanas: [{ chat: [], eventos: [] }, { chat: [], eventos: [] }], outfits: {
    [add(today, -1)]: { items: ['p2', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'], ocasion: 'Trabajo y clases', nota: '', hecho: true, origen: 'local' },
    [today]: { items: ['p1', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'], ocasion: 'Trabajo', nota: 'Fresco para el calor.', hecho: false, origen: 'local' },
  } }, gustos: [] };
  S['armario/cfg'] = { prefs: '- Calor casi todo el año.\n- Paleta cálida.', semana: '' };
  S['armario/shop'] = { items: [] };
  return S;
}
