/* ===== 1.0.2: BA timers, red flag, training, level badge, mud map ===== */
const BA_RATE = 10; // bar per minute (300 bar = 25 min to whistle at 50 bar)
const BA_DECISION = 100, BA_WHISTLE = 50;
function baEst(t) {
  const lb = t.lastBar || t.bar || 300, lt = t.lastBarT || t.in;
  const bar = Math.max(0, lb - BA_RATE * (now() - lt) / 60000);
  return { bar: Math.round(bar), dec: lt + (lb - BA_DECISION) / BA_RATE * 60000, whistle: lt + (lb - BA_WHISTLE) / BA_RATE * 60000, state: bar <= BA_WHISTLE ? 'red' : bar <= BA_DECISION ? 'amber' : 'ok' };
}
function teamState(t) { return t.state || (t.in && !t.out ? 'inside' : t.out ? 'exited' : 'new'); }
function noRitDanger(inc) { return inc.ba.rit === 'none' && inc.ba.teams.some(t => t.mode === 'internal' && teamState(t) === 'inside'); }
function fatigued(t) { return (t.cyl || 0) >= (S.settings.baFatigue || 3); }
function teamLabel(t) { return t.name + (t.cyl ? ', cyl ' + t.cyl : ''); }

SHEETS.ba = s => {
  const inc = curInc(); const b = inc.ba;
  let h = sheetHd('Breathing apparatus');
  if (noRitDanger(inc)) h += '<div class="banner red">INTERNAL BA WITH NO RIT. HIGH RISK.</div>';
  h += '<div class="chips">' + chip(b.control ? 'BA control established' : 'BA control not set (IC monitors crews)', b.control, 'baCtl') + '</div>';
  h += '<div class="row"><div class="grow"><label class="f">BA control (who)</label><input type="text" id="ba_who" data-bind="ba.who" value="' + esc(b.who) + '" placeholder="Name / appliance"></div><div class="grow"><label class="f">BA channel</label><input type="text" id="ba_ch" data-bind="ba.ch" value="' + esc(b.ch) + '" placeholder="e.g. 353" inputmode="numeric"></div></div>';
  h += '<label class="f">Rapid intervention team</label><div class="chips">' + chip('RIT ready', b.rit === 'ready', 'baRitSet', { v: 'ready' }, b.rit === 'ready' ? 'green' : '') + chip('No RIT', b.rit === 'none', 'baRitSet', { v: 'none' }, b.rit === 'none' ? 'red' : '') + '</div>';
  h += '<p class="small muted">Times are approximate: about 10 bar a minute, decision point at 100 bar, whistle at 50 bar.</p><h3>Teams</h3>';
  b.teams.forEach(t => {
    const st = teamState(t); const inside = st === 'inside';
    h += '<div class="card" style="margin-top:6px' + (inside ? ';border-color:var(--amber)' : '') + '"><div class="row" style="justify-content:space-between"><b>' + esc(t.name) + (t.cyl ? ' · cyl ' + t.cyl : '') + '</b><span class="small">' + ({ new: 'Not entered', inside: 'Inside since ' + fmtT(t.in), exited: 'Exited ' + fmtT(t.out), rehab: 'In rehab since ' + fmtT(t.stateT), ready: 'Ready ' + fmtT(t.stateT) }[st]) + '</span></div>';
    if (fatigued(t)) h += '<div class="small amber" style="margin-top:4px"><b>Fatigue:</b> ' + t.cyl + ' cylinders. Consider rehab or a fresh crew.</div>';
    h += '<div class="chips" style="margin-top:6px">' + chip('External', t.mode === 'external', 'baMode', { id: t.id, v: 'external' }) + chip('Internal', t.mode === 'internal', 'baMode', { id: t.id, v: 'internal' }) + '</div>';
    if (t.mode === 'internal') h += '<div class="chips" style="margin-top:6px">' + chip('Left hand search', t.pattern === 'Left hand', 'baPat', { id: t.id, v: 'Left hand' }) + chip('Right hand search', t.pattern === 'Right hand', 'baPat', { id: t.id, v: 'Right hand' }) + '</div>';
    h += '<input type="text" id="bt_' + t.id + '" data-bind="ba.teams.#' + t.id + '.names" value="' + esc(t.names || '') + '" placeholder="Names or count (optional)" style="margin-top:6px">';
    if (inside) {
      const e = baEst(t);
      h += '<div class="row" style="margin-top:6px"><span class="' + (e.state === 'red' ? 'red' : e.state === 'amber' ? 'amber' : 'green') + '"><b>~' + e.bar + ' bar</b></span><span class="small">Decision ' + fmtT(e.dec) + ' · Whistle ' + fmtT(e.whistle) + '</span></div>';
      h += '<div class="row" style="margin-top:6px">' + btn('Pressure check', 'baCheckOpen', 'sm', { id: t.id }) + btn('Exited', 'baOut', 'sm go', { id: t.id }) + '</div>';
    } else if (st === 'exited') {
      h += '<div class="row" style="margin-top:6px">' + btn('Rehab', 'baState', 'sm', { id: t.id, v: 'rehab' }) + btn('Ready', 'baState', 'sm', { id: t.id, v: 'ready' }) + btn('Re-enter', 'baState', 'sm warn', { id: t.id, v: 'ready' }) + btn('Clear from board', 'baClear', 'sm ghost', { id: t.id }) + '</div>';
    } else {
      const sb = t.startBar || 300;
      h += '<label class="f">Cylinder pressure (bar)</label><div class="chips">' + [300, 280, 260, 240, 220, 200].map(n => chip(String(n), sb === n, 'baBar', { id: t.id, v: n })).join('') + '</div>';
      h += '<div class="row" style="margin-top:6px">' + btn(t.cyl ? 'Re-entered' : 'Entered', 'baIn', 'sm warn', { id: t.id }) + (st === 'rehab' ? btn('Ready', 'baState', 'sm', { id: t.id, v: 'ready' }) : '') + (st === 'new' ? btn('Remove', 'baRm', 'sm ghost', { id: t.id }) : btn('Clear from board', 'baClear', 'sm ghost', { id: t.id })) + '</div>';
    }
    h += '</div>';
  });
  h += '<label class="f">Add team</label><div class="chips">' + [1, 2, 3, 4, 5, 6].map(n => { const nm = 'Team ' + n; const has = b.teams.some(t => t.name === nm); return chip(nm, has, has ? 'noop' : 'baAddN', { v: nm }); }).join('') + '</div>';
  if ((b.cleared || []).length) h += '<p class="small muted" style="margin-top:8px">Cleared from board: ' + b.cleared.map(t => esc(teamLabel(t))).join(', ') + ' (kept in the log and export)</p>';
  return h;
};
SHEETS.bacheck = s => {
  const inc = curInc(); const t = inc.ba.teams.find(x => x.id === s.id); if (!t) return sheetHd('Pressure check');
  const e = baEst(t);
  let h = sheetHd('Pressure check: ' + t.name);
  h += script(t.name + ', ' + (inc.ba.control ? 'BA control' : 'Incident Control') + ', pressure check, over.');
  h += '<p class="muted">Estimate now ~' + e.bar + ' bar. Enter what they report:</p><div class="chips">' + [280, 260, 240, 220, 200, 180, 160, 140, 120, 100, 80].map(n => chip(String(n), false, 'baCheck', { id: t.id, v: n })).join('') + '</div>';
  h += '<div class="row" style="margin-top:8px"><div class="grow"><input type="text" inputmode="numeric" id="bc_bar" data-sbind="bar" value="' + esc(s.bar || '') + '" placeholder="Other bar reading"></div>' + btn('Log', 'baCheck', 'sm go', { id: t.id }) + '</div>';
  h += '<div style="margin-top:10px">' + btn('No response yet (keep reminding me)', 'closeSheet', 'full ghost') + '</div>';
  return h;
};

/* red flag */
function rfActive(inc) { return (inc.redflags || []).find(r => !r.ended); }
function rfTargets(inc) {
  const apps = inc.apps.filter(a => ['onscene', 'water', 'rehab', 'enroute'].includes(a.status)).map(a => ({ id: a.id, name: a.callsign }));
  const cons = inc.contractors.filter(c => c.status === 'onscene').map(c => ({ id: c.id, name: 'Contractor ' + c.type.toLowerCase() + (c.operator ? ' (' + c.operator + ')' : '') }));
  return apps.concat(cons);
}
function rfProgress(inc, r) { const tg = rfTargets(inc); return { total: tg.length, done: tg.filter(x => r.apps[x.id] && r.apps[x.id].confirmed).length }; }
SHEETS.redflag = s => {
  const inc = curInc(); const r = rfActive(inc);
  let h = sheetHd('Red flag warning');
  if (!r) {
    h += '<p class="muted">Declare a red flag to get every truck (and any machinery operator) told, then confirmed that all their crew know.</p>';
    h += '<label class="f">What is the warning?</label><div class="chips">' + ['Wind change', 'Fire behaviour change', 'Spot fires', 'Entrapment risk', 'Falling trees', 'Power lines', 'Withdraw to safe area'].map(x => chip(x, s.text === x, 'rfText', { v: x })).join('') + '</div>';
    h += '<input type="text" id="rf_txt" data-sbind="text" value="' + esc(s.text || '') + '" placeholder="e.g. SW wind change in 15 min" style="margin-top:6px">';
    h += '<div style="margin-top:10px">' + btn('Declare red flag', 'rfStart', 'big danger') + '</div>';
  } else {
    const p = rfProgress(inc, r);
    h += '<div class="banner red">RED FLAG ACTIVE since ' + fmtT(r.t) + ': ' + esc(r.text) + '<br>' + p.done + ' of ' + p.total + ' confirmed</div>';
    h += '<p class="small muted">Anyone who arrives while this is active is added here automatically.</p>';
    rfTargets(inc).forEach(x => {
      const st = r.apps[x.id] || {};
      h += '<div class="card" style="margin-top:6px"><b>' + esc(x.name) + '</b><div class="row" style="margin-top:6px">' +
        '<div class="check' + (st.notified ? ' done' : ' miss') + '" data-a="rfTick" data-id="' + x.id + '" data-v="notified" style="flex:1;margin:0"><span class="bx">' + (st.notified ? '✓' : '') + '</span><div>Notified' + (st.notified ? '<div class="small muted">' + fmtT(st.notified) + '</div>' : '') + '</div></div>' +
        '<div class="check' + (st.confirmed ? ' done' : ' miss') + '" data-a="rfTick" data-id="' + x.id + '" data-v="confirmed" style="flex:1;margin:0"><span class="bx">' + (st.confirmed ? '✓' : '') + '</span><div>All crew told' + (st.confirmed ? '<div class="small muted">' + fmtT(st.confirmed) + '</div>' : '') + '</div></div></div></div>';
    });
    h += '<div style="margin-top:12px">' + btn('Stand down red flag', 'rfEnd', 'full warn') + '</div>';
  }
  return h;
};

/* level badge (R&R p85-86 escalation guide at 5 / 10 / 15 truck level) */
const LEVEL_CHECKS = {
  5: ['4 personnel per truck', '1 command vehicle with 3 personnel', '2 quick fills', 'Control point established and fire named', 'Fireground channel arranged', 'Sectorise', 'Incident management support', 'Aircraft considered', 'Sitrep with potential and prediction', 'Consider: catering, DMO, staging area, heavy machinery, major water supply, EMT, spot weather, DDO, FOV, rehab health monitoring'],
  10: ['3 command vehicles', 'Catering', 'DMOs notified', 'Field Operations Vehicle en route', 'Rehab Health Monitoring Unit en route', 'Staging area personnel notified', 'Major water pumping capacity considered', 'Emergency management personnel to control centre', 'IMT established', 'Aircraft considered', 'Spot weather forecast', 'Ratios: 1 FCV and 2 quick fills per 5 tankers', 'Mobile Amenities Unit', 'Consider: ground observers, SDO / RAC notification, crew changeover transport, staging area, strike teams, community warnings, ultra heavy tanker, bulk water'],
  15: ['Ratios: 1 command vehicle and 2 quick fills per 5 tankers', 'Extra command vehicle per sector', 'Relevant notifications', 'Crew changeovers planned', 'Consider: ground observers, potential escalation to Level 3, IMT expansion, inter-district support, Benalla Big Fill']
};
function truckCount(inc) { const n = inc.apps.filter(a => !a.brigadeOnly && ['onscene', 'enroute', 'water', 'rehab'].includes(a.status)).length; return Math.max(n, inc.makeTankers || 0); }
function levelThreshold(inc) { const n = truckCount(inc); return n >= 15 ? 15 : n >= 10 ? 10 : n >= 5 ? 5 : 0; }
function levelAlert(inc) { const th = levelThreshold(inc); return th && (inc.levelAck || 0) < th ? th : 0; }
SHEETS.level = s => {
  const inc = curInc(); const n = truckCount(inc); const th = levelThreshold(inc);
  let h = sheetHd('Incident level');
  h += '<p>' + n + ' trucks' + (inc.makeTankers ? ' (make tankers ' + inc.makeTankers + ' requested)' : '') + '. The R&amp;R escalation guide kicks in at 5, 10 and 15 trucks. Level classification itself follows the EMV handbook and the DDO.</p>';
  h += '<label class="f">Incident level</label><div class="chips">' + [1, 2, 3].map(l => chip('Level ' + l, (inc.level || 1) === l, 'lvlSet', { v: l }, l > 1 ? 'amber' : '')).join('') + '</div>';
  [5, 10, 15].forEach(k => {
    if (k > th && k !== 5) return;
    h += '<h3>' + k + ' truck level (R&amp;R p85-86)' + (k > th ? ' · not reached yet' : '') + '</h3>';
    LEVEL_CHECKS[k].forEach(it => { const key = k + ':' + it; const d = (inc.levelChecks || {})[key]; h += '<div class="check' + (d ? ' done' : '') + '" data-a="lvlTick" data-v="' + esc(key) + '"><span class="bx">' + (d ? '✓' : '') + '</span><div>' + esc(it) + (d ? '<div class="small muted">' + fmtT(d) + '</div>' : '') + '</div></div>'; });
  });
  if (levelAlert(inc)) h += '<div style="margin-top:12px">' + btn('Acknowledge ' + th + ' truck level', 'lvlAck', 'big warn') + '</div>';
  return h;
};

/* mud map sketch pad */
const MAP_COLORS = ['#f4f6f7', '#ff4b45', '#ffb21e', '#2fd36f', '#5aaeff'];
function drawMap(ctx, w, h, ops, print) {
  ctx.fillStyle = print ? '#ffffff' : '#0d0f11'; ctx.fillRect(0, 0, w, h);
  const ink = c => print && c === '#f4f6f7' ? '#111111' : c;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fs = Math.max(12, w / 40);
  (ops || []).forEach(o => {
    if (o.k === 'line') { ctx.strokeStyle = ink(o.c); ctx.lineWidth = Math.max(2, w / 220); ctx.beginPath(); o.pts.forEach((p, i) => i ? ctx.lineTo(p[0] * w, p[1] * h) : ctx.moveTo(p[0] * w, p[1] * h)); ctx.stroke(); }
    else if (o.k === 'arrow') {
      const x1 = o.x1 * w, y1 = o.y1 * h, x2 = o.x2 * w, y2 = o.y2 * h, a = Math.atan2(y2 - y1, x2 - x1), L = w / 30;
      ctx.strokeStyle = ctx.fillStyle = print ? '#0050b0' : '#5aaeff'; ctx.lineWidth = Math.max(3, w / 160);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - L * Math.cos(a - .45), y2 - L * Math.sin(a - .45)); ctx.lineTo(x2 - L * Math.cos(a + .45), y2 - L * Math.sin(a + .45)); ctx.closePath(); ctx.fill();
      ctx.font = 'bold ' + fs + 'px sans-serif'; ctx.fillText('WIND', x1 + 4, y1 - 6);
    } else if (o.k === 'stamp') {
      const x = o.x * w, y = o.y * h, r = w / 45; ctx.font = 'bold ' + fs + 'px sans-serif'; ctx.textBaseline = 'middle';
      if (o.s === 'truck') { ctx.fillStyle = '#e8362e'; ctx.fillRect(x - r * 1.4, y - r * .8, r * 2.8, r * 1.6); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(o.short || 'T', x, y); ctx.textAlign = 'left'; ctx.fillStyle = print ? '#111' : '#f4f6f7'; if (o.label) ctx.fillText(o.label, x + r * 1.6, y); }
      else if (o.s === 'origin') { ctx.strokeStyle = '#ff4b45'; ctx.lineWidth = Math.max(3, w / 150); ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke(); ctx.fillStyle = '#ff4b45'; ctx.fillText('Origin', x + r * 1.3, y); }
      else if (o.s === 'hazard') { ctx.fillStyle = '#ffb21e'; ctx.beginPath(); ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.2, y + r); ctx.lineTo(x - r * 1.2, y + r); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.fillText('!', x, y + r * .2); ctx.textAlign = 'left'; ctx.fillStyle = print ? '#8a5a00' : '#ffb21e'; if (o.label) ctx.fillText(o.label, x + r * 1.4, y); }
      else if (o.s === 'cp') { ctx.fillStyle = '#2fd36f'; ctx.fillRect(x - r * 1.3, y - r * .8, r * 2.6, r * 1.6); ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.fillText('CP', x, y); ctx.textAlign = 'left'; }
      else if (o.s === 'text') { ctx.fillStyle = print ? '#111' : '#f4f6f7'; ctx.fillText(o.label || '', x, y); }
      ctx.textBaseline = 'alphabetic';
    }
  });
  // north arrow
  ctx.fillStyle = print ? '#111' : '#aab2ba'; ctx.font = 'bold ' + fs + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N ↑', w - fs * 1.6, fs * 1.4); ctx.textAlign = 'left';
}
function mapPng(inc) { const c = document.createElement('canvas'); c.width = 1000; c.height = 1000; drawMap(c.getContext('2d'), 1000, 1000, inc.map.ops, true); return c.toDataURL('image/jpeg', 0.85); }
SHEETS.mudmap = s => {
  const inc = curInc(); const m = inc.map = inc.map || { ops: [] };
  const tool = s.tool || 'pen';
  let h = '<div class="hd"><h2 style="margin:0">Mud map</h2><div class="row">' + btn('Undo', 'mapUndo', 'sm') + btn('Done', 'closeSheet', 'sm go') + '</div></div>';
  h += '<div class="chips" style="margin-bottom:6px">' + [['pen', 'Draw'], ['truck', 'Truck'], ['arrow', 'Wind arrow'], ['origin', 'Origin'], ['hazard', 'Hazard'], ['cp', 'CP'], ['text', 'Label']].map(([k, l]) => chip(l, tool === k, 'mapTool', { v: k })).join('') + '</div>';
  if (tool === 'pen') h += '<div class="chips" style="margin-bottom:6px">' + MAP_COLORS.map(c => '<button class="chip' + ((s.color || MAP_COLORS[0]) === c ? ' on' : '') + '" data-a="mapColor" data-v="' + c + '" aria-label="colour"><span class="dot" style="color:' + c + '"></span></button>').join('') + '</div>';
  if (tool === 'truck') h += '<div class="chips" style="margin-bottom:6px">' + inc.apps.filter(a => !['released', 'cancelled'].includes(a.status)).map(a => chip(a.callsign, s.truck === a.callsign, 'mapTruck', { v: a.callsign })).join('') + '</div>';
  if (tool === 'text' || tool === 'hazard') h += '<input type="text" id="map_lbl" data-sbind="label" value="' + esc(s.label || '') + '" placeholder="' + (tool === 'text' ? 'Label text, e.g. dam, gate, house' : 'Hazard, e.g. power lines') + '" style="margin-bottom:6px">';
  h += '<p class="small muted" style="margin:0 0 6px">' + ({ pen: 'Draw with your finger.', arrow: 'Drag in the direction the wind is blowing.', truck: 'Pick a truck, then tap the map.' }[tool] || 'Tap the map to place it.') + '</p>';
  h += '<canvas id="mudmap" style="width:100%;aspect-ratio:1/1;border:2px solid var(--line);border-radius:10px;touch-action:none;display:block;max-width:100%"></canvas>';
  h += '<div style="margin-top:8px">' + btn('Clear map', 'mapClear', 'sm ghost') + '</div>';
  return h;
};
function initMapCanvas() {
  const cv = document.getElementById('mudmap'); if (!cv || cv._init) return; cv._init = true;
  const dpr = window.devicePixelRatio || 1; const size = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; redraw(); };
  const redraw = (extra) => { const ops = S.cur.map.ops.concat(extra ? [extra] : []); drawMap(cv.getContext('2d'), cv.width, cv.height, ops, false); };
  let cur = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId); const s = S.sheet, p = pos(e), tool = s.tool || 'pen';
    if (tool === 'pen') cur = { k: 'line', c: s.color || MAP_COLORS[0], pts: [p] };
    else if (tool === 'arrow') cur = { k: 'arrow', x1: p[0], y1: p[1], x2: p[0], y2: p[1] };
    else {
      const o = { k: 'stamp', s: tool, x: p[0], y: p[1] };
      if (tool === 'truck') { if (!s.truck) { toast('Pick a truck first'); return; } o.label = s.truck; o.short = s.truck.replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'T'; }
      if (tool === 'text') { if (!(s.label || '').trim()) { toast('Type the label first'); return; } o.label = s.label.trim(); }
      if (tool === 'hazard') o.label = (s.label || '').trim();
      S.cur.map.ops.push(o); saveInc(); redraw();
    }
  });
  cv.addEventListener('pointermove', e => { if (!cur) return; const p = pos(e); if (cur.k === 'line') cur.pts.push(p); else { cur.x2 = p[0]; cur.y2 = p[1]; } redraw(cur); });
  const end = () => { if (!cur) return; if (cur.k === 'line' ? cur.pts.length > 1 : Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) > .03) { cur.pts && (cur.pts = cur.pts.map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000])); S.cur.map.ops.push(cur); saveInc(); } cur = null; redraw(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  size();
}

/* training */
const TRAINING = {
  struc: { label: 'Structure fire', page: 'ALERT KIEW4 STRUC1 HOUSE FIRE POSS PERSONS INSIDE 12 TRAINING ST KIEWA SVNE 8358 C15 (010866) FPA CKIEW CBDUD P76B F260000001' },
  gs: { label: 'Grass and scrub fire', page: 'ALERT KIEW4 G&SC1 GRASS AND SCRUB FIRE - SPREADING CNR KIEWA VALLEY HWY/QUONOEY RD KIEWA SVNE 8358 C14 (008869) F CBDUD CKIEW F260000002' },
  mva: { label: 'MVA', page: 'ALERT KIEW4 INCIC1 MVA CAR VS TREE FUEL LEAK 200 TRAINING RD KIEWA SVNE 8358 C15 (010866) FPA CKIEW F260000003' }
};

Object.assign(A, {
  /* BA */
  baBar(d) { const t = S.cur.ba.teams.find(x => x.id === d.id); t.startBar = Number(d.v); saveInc(); renderSheet(); },
  baIn(d) {
    const t = S.cur.ba.teams.find(x => x.id === d.id); if (!t.mode) { toast('Internal or external?'); return; }
    const tm = now(); t.in = tm; t.out = null; t.state = 'inside'; t.stateT = tm; t.cyl = (t.cyl || 0) + 1; t.bar = t.startBar || 300; t.lastBar = t.bar; t.lastBarT = tm; t.checkDone = false; t.alerted = '';
    (t.entries = t.entries || []).push({ in: tm, bar: t.bar, cyl: t.cyl, mode: t.mode, pattern: t.pattern || '' });
    logE('BA ' + teamLabel(t) + ' entered at ' + t.bar + ' bar (' + t.mode + (t.pattern ? ', ' + t.pattern.toLowerCase() + ' search' : '') + ')' + (t.names ? ': ' + t.names : '') + '. Whistle about ' + fmtT(baEst(t).whistle));
    commit();
  },
  baOut(d) { const t = S.cur.ba.teams.find(x => x.id === d.id); const tm = now(); const e = baEst(t); t.out = tm; t.state = 'exited'; t.stateT = tm; const en = (t.entries || [])[t.entries.length - 1]; if (en) { en.out = tm; en.estBar = e.bar; } logE('BA ' + teamLabel(t) + ' exited after ' + fmtDur(tm - t.in) + ' (~' + e.bar + ' bar)'); commit(); },
  baState(d) { const t = S.cur.ba.teams.find(x => x.id === d.id); t.state = d.v; t.stateT = now(); logE('BA ' + teamLabel(t) + ': ' + (d.v === 'rehab' ? 'to rehab' : 'ready')); commit(); },
  baClear(d) { const b = S.cur.ba; const t = b.teams.find(x => x.id === d.id); b.cleared = b.cleared || []; b.cleared.push(clone(t)); b.teams = b.teams.filter(x => x !== t); logE('BA ' + teamLabel(t) + ' cleared from board'); commit(); },
  baAddN(d) { S.cur.ba.teams.push({ id: uid(), name: d.v, mode: '', pattern: '', names: '', in: null, out: null, state: 'new', cyl: 0, startBar: 300, entries: [] }); logE('BA ' + d.v + ' set up'); commit(); },
  baCheckOpen(d) { openSheet({ type: 'bacheck', id: d.id }, !!S.sheet); },
  baCheck(d) {
    const t = S.cur.ba.teams.find(x => x.id === d.id); const v = Number(d.v || (S.sheet && S.sheet.bar)); if (!v || v < 0 || v > 350) { toast('Enter the bar reading'); return; }
    const tm = now(); t.lastBar = v; t.lastBarT = tm; t.checkDone = true; t.alerted = ''; (t.checks = t.checks || []).push({ t: tm, bar: v });
    logE('BA ' + teamLabel(t) + ' pressure check: ' + v + ' bar. Decision about ' + fmtT(baEst(t).dec) + ', whistle about ' + fmtT(baEst(t).whistle));
    if (S.sheetStack.length) { S.sheet = S.sheetStack.pop(); } else S.sheet = null; commit();
  },
  /* red flag */
  rfText(d) { S.sheet.text = d.v; renderSheet(); },
  rfStart() { const inc = S.cur; const txt = (S.sheet.text || '').trim() || 'Red flag'; inc.redflags = inc.redflags || []; inc.redflags.push({ id: uid(), t: now(), text: txt, apps: {}, ended: null }); logE('RED FLAG declared: ' + txt); commit(); },
  rfTick(d) { const inc = S.cur, r = rfActive(inc); if (!r) return; const st = r.apps[d.id] = r.apps[d.id] || {}; const nm = (rfTargets(inc).find(x => x.id === d.id) || {}).name || ''; if (st[d.v]) { delete st[d.v]; } else { st[d.v] = now(); if (d.v === 'confirmed' && !st.notified) st.notified = st.confirmed; logE('Red flag: ' + nm + (d.v === 'notified' ? ' notified' : ' confirmed all crew told')); } commit(); },
  rfEnd() { const inc = S.cur, r = rfActive(inc); askConfirm('Stand down the red flag?', 'Only once the threat has passed.', 'Stand down', () => { r.ended = now(); logE('Red flag stood down: ' + r.text); openSheet({ type: 'redflag' }); commit(); }, 'warn'); },
  /* level */
  lvlSet(d) { const inc = S.cur; const l = Number(d.v); if ((inc.level || 1) === l) return; inc.level = l; logE('Incident level set to ' + l); commit(); },
  lvlTick(d) { const inc = S.cur; inc.levelChecks = inc.levelChecks || {}; if (inc.levelChecks[d.v]) delete inc.levelChecks[d.v]; else { inc.levelChecks[d.v] = now(); logE('Escalation: ' + d.v.replace(/^\d+:/, '')); } commit(); },
  lvlAck() { const inc = S.cur; inc.levelAck = levelThreshold(inc); logE('Acknowledged ' + inc.levelAck + ' truck level escalation'); commit(); },
  /* mud map */
  mapTool(d) { S.sheet.tool = d.v; renderSheet(); },
  mapColor(d) { S.sheet.color = d.v; renderSheet(); },
  mapTruck(d) { S.sheet.truck = d.v; renderSheet(); },
  mapUndo() { S.cur.map.ops.pop(); saveInc(); renderSheet(); },
  mapClear() { askConfirm('Clear the mud map?', 'Removes everything drawn.', 'Clear', () => { S.cur.map.ops = []; logE('Mud map cleared'); saveInc(); openSheet({ type: 'mudmap' }); }, 'warn'); },
  /* training */
  trainStart(d) {
    const sc = TRAINING[d.v]; const inc = newIncident(S.settings.defaultAppliance); inc.training = true; inc.wizStep = 3;
    addApp(inc, { callsign: inc.myApp, mine: true, code: (S.settings.directory.find(x => x.callsign === inc.myApp) || {}).code }, 'paged');
    S.incidents.push(inc); S.cur = inc; S.wiz = { step: 2, raw: sc.page }; go('wiz');
    const ta = $('#pager'); if (ta) ta.value = sc.page; A.wizDecode(); logE('TRAINING scenario: ' + sc.label);
  },
  trainClear() { askConfirm('Delete all training jobs?', 'Real incidents are not touched.', 'Delete training jobs', () => { S.incidents.filter(i => i.training).forEach(i => DB.del('incidents', i.id)); S.incidents = S.incidents.filter(i => !i.training); closeSheet(); go('home'); }); }
});
SHEETS.training = () => sheetHd('Training') + '<p class="muted">Same app, with a made-up page loaded. Training jobs are marked TRAINING and stay out of Past incidents and FIRS.</p><div class="stack">' + Object.keys(TRAINING).map(k => btn(TRAINING[k].label, 'trainStart', 'big', { v: k })).join('') + '</div>' + (S.incidents.some(i => i.training) ? '<div style="margin-top:12px">' + btn('Delete all training jobs', 'trainClear', 'full ghost') + '</div>' : '');

/* wrap remTap for new reminder kinds */
const _remTap = A.remTap;
A.remTap = function (d) {
  if (d.k === 'bacheck') { openSheet({ type: 'bacheck', id: d.id }); return; }
  if (d.k === 'fatigue' || d.k === 'bawarn') { openSheet({ type: 'ba' }); return; }
  if (d.k === 'redflag') { openSheet({ type: 'redflag' }); return; }
  return _remTap.call(A, d);
};
function extraReminders(inc, r) {
  const t0 = now();
  inc.ba.teams.forEach(t => {
    const st = teamState(t);
    if (st === 'inside' && !t.checkDone && t0 >= t.in + 10 * 60000) r.push({ k: 'bacheck', id: t.id, text: t.name + ' pressure check due', cls: 'amber' });
    if (fatigued(t) && st !== 'inside' && st !== 'rehab') r.push({ k: 'fatigue', id: t.id, text: t.name + ': ' + t.cyl + ' cylinders, fatigue', cls: 'amber' });
  });
  const rf = rfActive(inc); if (rf) { const p = rfProgress(inc, rf); if (p.done < p.total) r.push({ k: 'redflag', text: 'Red flag: ' + (p.total - p.done) + ' not confirmed', cls: 'red' }); }
}
function tickExtra(inc) {
  // BA panel on main page
  const bp = $('#bapanel');
  if (bp) {
    const inside = inc.ba.teams.filter(t => teamState(t) === 'inside');
    let html = '';
    inside.forEach(t => {
      const e = baEst(t); const toDec = e.dec - now(), toWh = e.whistle - now();
      html += '<div class="timerbar ' + (e.state === 'red' ? 'over' : e.state === 'amber' ? 'soon' : '') + '" data-a="sheet" data-t="ba"><div><div class="lab">BA ' + esc(t.name) + ' · ' + esc(t.mode || '') + ' · cyl ' + t.cyl + (fatigued(t) ? ' <span class="amber">fatigue</span>' : '') + '</div><div class="small muted">~' + e.bar + ' bar (approx) · in ' + fmtDur(now() - t.in) + '</div></div><div style="text-align:right"><div class="cd num mono" style="font-size:1.25em">' + (toWh <= 0 ? 'WHISTLE' : toDec <= 0 ? 'EXIT ' + fmtDur(toWh) : fmtDur(toDec)) + '</div><div class="small muted">' + (toWh <= 0 ? 'out of time' : toDec <= 0 ? 'to whistle' : 'to decision point') + '</div></div></div>';
      const lvl = toWh <= 0 ? 'w' : toDec <= 0 ? 'd' : '';
      if (lvl && t.alerted !== lvl) { t.alerted = lvl; saveSoon(); alertBuzz(); }
    });
    if (bp._h !== html) { bp.innerHTML = html; bp._h = html; }
  }
  const lb = $('#lvlbadge');
  if (lb) { const al = levelAlert(inc); const txt = 'L' + (inc.level || 1) + (al ? ' · ' + al + ' trucks' : ''); if (lb.textContent !== txt) lb.textContent = txt; lb.classList.toggle('flash', !!al); }
  if (S.sheet && S.sheet.type === 'mudmap') initMapCanvas();
}
