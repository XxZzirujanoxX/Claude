/* Simula window.claude (db + sample) para probar Mi día fuera de claude.ai.
   Igual que el runtime real: snapshots congelados, update exige que el documento exista,
   y las escrituras se notifican de forma asíncrona. Las semillas vienen de window.__SEED. */
(function () {
  const store = new Map();
  const seed = window.__SEED || {};
  for (const [p, d] of Object.entries(seed)) store.set(p, JSON.parse(JSON.stringify(d)));
  const listeners = new Set();
  const log = (window.__dbLog = []);
  const copy = (o) => JSON.parse(JSON.stringify(o));
  const freeze = (o) => {
    if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(freeze); }
    return o;
  };
  const collOf = (p) => p.split('/').slice(0, -1).join('/');
  const snapDoc = (path) => {
    const d = store.get(path);
    const data = d ? freeze(copy(d)) : undefined;
    return { id: path.split('/').pop(), exists: !!d, data: () => data, metadata: { fromCache: false, hasPendingWrites: false } };
  };
  const ops = {
    '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '<': (a, b) => a < b,
    '==': (a, b) => a === b, '!=': (a, b) => a !== b,
  };
  const snapQuery = (coll, filters) => {
    const docs = [...store.keys()]
      .filter((p) => collOf(p) === coll)
      .sort()
      .filter((p) => filters.every((f) => (ops[f.op] || (() => true))(store.get(p)[f.field], f.value)))
      .map(snapDoc);
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
  };
  const notify = (path) => setTimeout(() => {
    for (const l of listeners) {
      if (l.kind === 'doc' && l.path === path) l.cb(snapDoc(path));
      else if (l.kind === 'query' && l.path === collOf(path)) l.cb(snapQuery(l.path, l.filters));
    }
  }, 5);
  const merge = (a, b) => {
    for (const k in b) {
      const bv = b[k], av = a[k];
      if (bv && typeof bv === 'object' && !Array.isArray(bv) && av && typeof av === 'object' && !Array.isArray(av)) a[k] = merge(av, bv);
      else a[k] = bv;
    }
    return a;
  };
  const rid = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
  const checkBody = (d) => {
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw { code: 'invalid_argument', message: 'body must be an object' };
    if (JSON.stringify(d).length > 256 * 1024) throw { code: 'invalid_argument', message: 'too large' };
  };
  const docRef = (path) => ({
    id: path.split('/').pop(), path,
    get: async () => snapDoc(path),
    set: async (d) => { checkBody(d); store.set(path, copy(d)); log.push({ op: 'set', path, data: copy(d) }); notify(path); },
    update: async (d) => {
      const cur = store.get(path);
      if (!cur) throw { code: 'invalid_argument', message: 'update of missing document ' + path };
      store.set(path, merge(copy(cur), copy(d))); log.push({ op: 'update', path, data: copy(d) }); notify(path);
    },
    delete: async () => { store.delete(path); log.push({ op: 'delete', path }); notify(path); },
    onSnapshot: (cb) => {
      const l = { kind: 'doc', path, cb }; listeners.add(l);
      setTimeout(() => listeners.has(l) && cb(snapDoc(path)), 5);
      return () => listeners.delete(l);
    },
    collection: (sub) => collRef(path + '/' + sub),
  });
  const query = (path, filters) => ({
    where: (f, op, v) => query(path, [...filters, { field: f, op, value: v }]),
    orderBy: () => query(path, filters),
    limit: () => query(path, filters),
    get: async () => snapQuery(path, filters),
    onSnapshot: (cb) => {
      const l = { kind: 'query', path, filters, cb }; listeners.add(l);
      setTimeout(() => listeners.has(l) && cb(snapQuery(path, filters)), 5);
      return () => listeners.delete(l);
    },
  });
  const collRef = (path) => Object.assign(query(path, []), {
    path,
    doc: (id) => docRef(path + '/' + (id || rid())),
    add: async (d) => { const r = docRef(path + '/' + rid()); await r.set(d); return r; },
  });
  const db = { doc: docRef, collection: collRef };

  const sampleLog = (window.__sampleLog = []);
  const textOf = (input) => (typeof input === 'string' ? input : input.map((t) => t.content).join('\n'));
  const sample = async (input) => ({ text: 'ok', truncated: false, modelTierApplied: 'default' });
  sample.json = async (input, opts) => {
    const text = textOf(input);
    sampleLog.push(text);
    const h = window.__sampleHandler;
    if (!h) throw { code: 'upstream_error', message: 'no handler' };
    const r = await h(text, opts || {});
    if (r && r.__error) throw r.__error;
    return r;
  };
  sample.limits = async () => ({ maxPromptBytes: 65536 });

  window.__store = store;
  window.claude = {
    use: async (name) => {
      await new Promise((r) => setTimeout(r, 10));
      if (name === 'db') return window.__NODB ? null : db;
      if (name === 'sample') return window.__NOSAMPLE ? null : sample;
      return null;
    },
  };
})();
