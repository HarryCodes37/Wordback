/* ===== Rendering: screens ===== */
function render() {
  const app = $('#app');
  const fn = SCREENS[S.screen] || SCREENS.home;
  app.innerHTML = fn();
  renderSheet();
  tick(true);
}
function renderSheet() {
  let host = $('#sheet');
  if (!S.sheet) { host.innerHTML = ''; document.body.style.overflow = ''; return; }
  const def = SHEETS[S.sheet.type];
  if (!def) { S.sheet = null; host.innerHTML = ''; return; }
  const keep = host.querySelector('.pane'); const st = keep && host.dataset.type === S.sheet.type ? keep.scrollTop : 0;
  host.dataset.type = S.sheet.type;
  host.innerHTML = '<div class="sheet' + (def.full ? ' full' : '') + '" data-a="sheetBg"><div class="pane" role="dialog" aria-modal="true">' + (typeof def === 'function' ? def(S.sheet) : def.html(S.sheet)) + '</div></div>';
  const p = host.querySelector('.pane'); if (p) p.scrollTop = st;
  document.body.style.overflow = 'hidden';
}
function sheetHd(title, back) {
  return '<div class="hd"><h2 style="margin:0">' + esc(title) + '</h2><button class="btn sm ghost" data-a="' + (back ? 'sheetBack' : 'closeSheet') + '">' + (back ? 'Back' : 'Close') + '</button></div>';
}
function chip(label, on, act, data, cls) {
  let d = ''; for (const k in (data || {})) d += ' data-' + k + '="' + esc(data[k]) + '"';
  return '<button class="chip' + (on ? ' on' : '') + (cls ? ' ' + cls : '') + '" data-a="' + act + '"' + d + '>' + esc(label) + '</button>';
}
function btn(label, act, cls, data) {
  let d = ''; for (const k in (data || {})) d += ' data-' + k + '="' + esc(data[k]) + '"';
  return '<button class="btn ' + (cls || '') + '" data-a="' + act + '"' + d + '>' + label + '</button>';
}
function inp(bind, val, ph, type, extra) { return '<input ' + (type ? 'type="' + type + '" ' : 'type="text" ') + 'id="f_' + esc(bind.replace(/[^\w]/g, '_')) + '" data-bind="' + esc(bind) + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '" ' + (extra || '') + '>'; }
function ta(bind, val, ph) { return '<textarea id="f_' + esc(bind.replace(/[^\w]/g, '_')) + '" data-bind="' + esc(bind) + '" placeholder="' + esc(ph || '') + '">' + esc(val) + '</textarea>'; }
function script(text) { return '<div class="script" id="scr">' + esc(text) + '</div>'; }

const SCREENS = {};
/* ---------- Home ---------- */
SCREENS.home = () => {
  const act = S.incidents.filter(i => i.status === 'active').sort((a, b) => b.updated - a.updated);
  const cont = S.incidents.filter(i => i.status === 'continue');
  const past = S.incidents.filter(i => i.status === 'closed').sort((a, b) => b.created - a.created);
  let h = '<div class="wrap" style="padding-top:calc(10px + env(safe-area-inset-top,0px))">';
  h += '<div class="splash"><div class="logo">Word<span>back</span></div><div class="muted">Incident Management Dashboard</div></div>';
  if (act.length) {
    h += '<h3>Active</h3><div class="stack">';
    act.forEach(i => { h += '<button class="btn big go" data-a="openInc" data-id="' + i.id + '" style="text-align:left">Resume: ' + esc(i.name || 'Untitled incident') + '<div class="small" style="font-weight:500">' + esc(controlLabel(i)) + ' · paged ' + fmtDT(i.pageTime) + '</div></button>'; });
    h += '</div>';
  }
  if (cont.length) { h += '<h3>Not closed out</h3><div class="chips">'; cont.forEach(i => { h += chip('Not closed out: ' + (i.name || 'Incident'), false, 'openInc', { id: i.id }, 'amber'); }); h += '</div>'; }
  h += '<div style="margin-top:16px">' + btn('+ New incident', 'newInc', 'big pri') + '</div>';
  h += '<h3>Past incidents</h3>';
  if (!past.length) h += '<p class="dim">Closed jobs land here so you can do FIRS later.</p>';
  past.slice(0, 40).forEach(i => {
    h += '<div class="app-row" data-a="openPast" data-id="' + i.id + '"><div class="nm">' + esc(i.name || 'Incident') + '<div class="sub">' + fmtDT(i.pageTime) + ' · ' + esc(i.p.incNo || '') + '</div></div>' + (i.firsDone ? '<span class="badge green">FIRS done</span>' : '<span class="badge amber">To do: FIRS</span>') + '</div>';
  });
  h += '<div class="row" style="margin-top:18px">' + btn('Settings', 'goSettings', 'grow') + btn('Back up all jobs', 'backupAll', 'grow') + '</div>';
  h += '<p class="dim small" style="margin-top:14px">Wordback v' + APP_VERSION + ' · data saved on this device only · ' + (DB.mode === 'idb' ? 'autosave on' : 'autosave (fallback storage)') + '</p>';
  return h + '</div>';
};

/* ---------- New incident wizard ---------- */
SCREENS.wiz = () => {
  const w = S.wiz, inc = S.cur, st = w.step;
  const needKind = !!KINDS[inc.p.code];
  const total = 5;
  let h = '<div class="wrap" style="padding-top:calc(12px + env(safe-area-inset-top,0px))"><div class="row" style="justify-content:space-between">' + btn('Cancel', 'wizCancel', 'sm ghost') + '<span class="muted">Step ' + st + ' of ' + total + '</span></div>';
  h += '<div class="steps">' + [1, 2, 3, 4, 5].map(n => '<i class="' + (n <= st ? 'on' : '') + '"></i>').join('') + '</div>';
  if (st === 1) {
    h += '<h1>Which appliance are you on?</h1><div class="stack">';
    S.settings.myAppliances.forEach(a => { h += '<button class="btn big ' + (inc.myApp === a ? 'pri' : '') + '" data-a="wizApp" data-v="' + esc(a) + '">' + esc(a) + '</button>'; });
    h += '</div><label class="f">Other</label>' + inp('myApp', inc.myApp, 'Callsign');
    h += '<div style="margin-top:16px">' + btn('Next', 'wizNext', 'big go') + '</div>';
  } else if (st === 2) {
    h += '<h1>Paste the pager message</h1><p class="muted">Long-press in the box and Paste, or tap the paste button.</p>';
    h += '<textarea id="pager" class="mono" style="min-height:150px" placeholder="ALERT BONA3 G&amp;SC1 TREE FIRE SPREADING ...">' + esc(w.raw || '') + '</textarea>';
    h += '<div class="row" style="margin-top:10px">' + btn('Paste from clipboard', 'wizPaste', 'grow') + btn('Decode', 'wizDecode', 'grow go') + '</div>';
    h += '<div style="margin-top:12px">' + btn('No pager message, enter by hand', 'wizSkipPager', 'full ghost') + '</div>';
  } else if (st === 3) {
    const p = inc.p;
    h += '<h1>Check the details</h1><p class="muted">The split between job details and address is a guess. Fix anything that looks off.</p>';
    h += '<label class="f">Page time</label><input type="datetime-local" step="1" id="pageTime" data-a2="pageTime" value="' + toLocalInput(inc.pageTime) + '">';
    h += '<div class="row" style="margin-top:6px">' + btn('-1 min', 'pageAdj', 'sm', { v: -1 }) + btn('-2 min', 'pageAdj', 'sm', { v: -2 }) + btn('-5 min', 'pageAdj', 'sm', { v: -5 }) + '<span class="muted small">Pre-filled with paste time</span></div>';
    h += '<label class="f">Incident name</label>' + inp('name', inc.name, 'e.g. Tree fire, Mahers Rd');
    h += '<label class="f">Call type</label><select id="f_code" data-bind="p.code" data-rerender="1">' + Object.keys(CALL_TYPES).map(k => '<option value="' + esc(k) + '"' + (p.code === k ? ' selected' : '') + '>' + esc(k + ' · ' + CALL_TYPES[k].label) + '</option>').join('') + '</select>';
    h += '<div class="row"><div class="grow"><label class="f">Response code</label><select id="f_resp" data-bind="p.resp"><option value="1"' + (p.resp === '1' ? ' selected' : '') + '>1 · lights and sirens</option><option value="3"' + (p.resp !== '1' ? ' selected' : '') + '>3 · normal road</option></select></div>';
    h += '<div class="grow"><label class="f">Area brigade</label><select id="f_area" data-bind="p.areaCode" data-rerender="1"><option value="">Unknown</option>' + S.settings.brigades.map(b => '<option value="' + b.code + '"' + (p.areaCode === b.code ? ' selected' : '') + '>' + esc(b.name) + ' (' + b.code + ')</option>').join('') + '</select></div></div>';
    h += '<label class="f">Job details</label>' + inp('p.details', p.details, 'TREE FIRE SPREADING');
    h += '<label class="f">Address</label>' + inp('p.address', p.address, '1314 MAHERS RD BONEGILLA');
    h += '<label class="f">Cross roads</label>' + inp('p.crossText', (p.cross || []).join(' / '), 'Murray Valley Hwy / Newnan Lane');
    h += '<div class="row"><div class="grow"><label class="f">Map ref</label>' + inp('p.map', p.map, 'SVNE 5625 A1') + '</div><div class="grow"><label class="f">Grid</label>' + inp('p.grid', p.grid, '005995') + '</div></div>';
    h += '<div class="row"><div class="grow"><label class="f">Services notified</label>' + inp('p.services', p.services, 'F') + '</div><div class="grow"><label class="f">Incident number</label>' + inp('p.incNo', p.incNo, 'F26...') + '</div></div>';
    h += '<h3>Paged (pre-filled as paged)</h3>';
    inc.apps.forEach(a => { h += '<div class="app-row"><span class="dot s-' + a.status + '"></span><div class="nm">' + esc(a.callsign) + (a.mine ? ' <span class="badge blue">You</span>' : '') + '<div class="sub">' + esc(a.code) + ' · ' + ST_LABEL[a.status] + '</div></div>' + (a.mine ? '' : btn('Remove', 'wizRmApp', 'sm ghost', { id: a.id })) + '</div>'; });
    h += '<h3>Conditions (optional)</h3>' + condForm(inc);
    h += '<div style="margin-top:16px">' + btn('Next', 'wizNext', 'big go') + '</div>';
  } else if (st === 4) {
    if (!needKind) { h += '<h1>' + esc((CALL_TYPES[inc.p.code] || {}).label || 'Incident') + '</h1><p class="muted">No sub-type needed for this call.</p>'; }
    else {
      h += '<h1>What kind?</h1><p class="muted">Picked from the pager words. Change it if wrong.</p><div class="stack">';
      KINDS[inc.p.code].forEach(([k]) => { h += '<button class="btn big ' + (inc.kind === k ? 'pri' : '') + '" data-a="wizKind" data-v="' + esc(k) + '">' + esc(k) + '</button>'; });
      h += '</div>';
    }
    h += '<div style="margin-top:16px">' + btn('Next', 'wizNext', 'big go') + '</div>';
  } else if (st === 5) {
    h += '<h1>En route or on scene?</h1><div class="stack">';
    h += btn('En route', 'wizStart', 'big warn', { v: 'enroute' }) + btn('On scene', 'wizStart', 'big go', { v: 'onscene' }) + btn('Support only (someone else in control)', 'wizStart', 'big', { v: 'support' });
    h += '</div>';
  }
  if (st > 1) h += '<div style="margin-top:12px">' + btn('Back', 'wizBack', 'full ghost') + '</div>';
  return h + '</div>';
};
function condForm(inc) {
  const c = inc.conditions || {};
  return '<div class="row"><div class="grow"><label class="f">Temp °C</label>' + inp('conditions.temp', c.temp, '32', 'text', 'inputmode="decimal"') + '</div><div class="grow"><label class="f">Wind km/h</label>' + inp('conditions.wind', c.wind, '20', 'text', 'inputmode="decimal"') + '</div></div>' +
    '<div class="row"><div class="grow"><label class="f">Wind from</label>' + inp('conditions.dir', c.dir, 'NW') + '</div><div class="grow"><label class="f">RH %</label>' + inp('conditions.rh', c.rh, '15', 'text', 'inputmode="decimal"') + '</div></div>' +
    '<label class="f">Notes (FDR, cloud, rain)</label>' + inp('conditions.notes', c.notes, 'Extreme FDR, gusty');
}

/* ---------- Incident dashboard ---------- */
SCREENS.inc = () => {
  const inc = S.cur; if (!inc) return SCREENS.home();
  const my = myApp(inc);
  let h = '<div class="top"><div class="wrap">';
  h += '<div class="t1"><button class="btn sm ghost" data-a="goHome" style="min-height:36px;padding:2px 8px" aria-label="Home">‹</button><div class="name grow" style="flex:1">' + esc(inc.name || 'Incident') + '</div><div class="clock num mono" id="clock">' + fmtTS(now()) + '</div></div>';
  h += '<div class="t1" style="align-items:center"><div class="event num mono" id="event">T+ 00:00</div><div style="text-align:right" class="small"><div class="muted">Paged ' + fmtTS(inc.pageTime) + '</div><div class="muted">' + esc(inc.p.codeRaw || inc.p.code || '') + (inc.p.incNo ? ' · ' + esc(inc.p.incNo) : '') + '</div></div></div>';
  h += '<div class="t2"><span>FireCom <b>524</b></span><span>Fireground <b>' + (inc.fg.state === 'confirmed' ? esc(inc.fg.ch) : inc.fg.state === 'na' ? 'n/a' : '-') + '</b></span>' + (inc.ba.control && inc.ba.ch && inc.ba.ch !== inc.fg.ch ? '<span>BA <b>' + esc(inc.ba.ch) + '</b></span>' : '') + '<span><b>' + esc(inc.mode === 'control' ? controlLabel(inc) : inc.mode === 'logonly' ? 'Log only' : 'Support' + (inc.supportOf ? ': ' + inc.supportOf : '')) + '</b></span>' + (inc.cp.loc ? '<span>CP ' + (inc.cp.type === 'dynamic' ? 'dynamic' : 'static') + ': <b>' + esc(inc.cp.loc) + '</b></span>' : '') + '</div>';
  h += '</div></div><div class="wrap">';
  if (inc.locked) h += '<div class="lockbar">Exported and locked ' + fmtDT(inc.exportedAt) + '. New entries are flagged as late notes.</div>';
  if (inc.status === 'continue') h += '<div class="banner amber">Not closed out. Timers are off. ' + btn('Close out incident', 'closeOut', 'sm go') + '</div>';
  if (inc.mode === 'support') h += '<div class="banner">Support mode: not in control' + (inc.supportOf ? ' (' + esc(inc.supportOf) + ')' : '') + '. Timers off. ' + btn('Take control', 'takeControl', 'sm go') + '</div>';
  if (inc.mode === 'logonly') h += '<div class="banner">Log only: control handed to ' + esc(inc.handover ? inc.handover.to : '') + '. Timers off. ' + btn('Resume control', 'resumeControl', 'sm') + '</div>';
  if (my && (my.status === 'paged' || my.status === 'enroute') && inc.status === 'active') h += '<div style="margin-top:8px">' + btn(my.status === 'paged' ? 'Turning out' : 'ON SCENE', my.status === 'paged' ? 'myEnroute' : 'myOnScene', 'big ' + (my.status === 'paged' ? 'warn' : 'go')) + '</div>';
  if (noRitDanger(inc)) h += '<div class="banner red" data-a="sheet" data-t="ba" style="cursor:pointer">INTERNAL BA WITH NO RIT. HIGH RISK.</div>';
  h += '<div id="timerbar"></div><div class="rems" id="rems"></div>';
  if (isFire(inc) && !inc.origin) h += '<div class="pinned" data-a="sheet" data-t="origin" style="cursor:pointer"><span class="small muted">POINT OF ORIGIN</span> <b><span class="amber">Tap to record</span></b></div>';
  h += '<div class="tiles">' + tiles(inc) + '</div>';
  h += '</div>';
  h += '<div class="actions"><div class="wrap">' + btn('Under control', 'quickWb', 'go', { v: 'uc' }) + btn('Stop', 'sheet', 'warn', { t: 'stopvar' }) + btn('Hand over', 'startHandover', '') + btn('End incident', 'endIncident', 'danger') + '</div></div>';
  return h;
};
function tiles(inc) {
  const c = counts(inc); let h = '';
  // appliances
  h += '<div class="tile wide xwide" data-a="sheet" data-t="apps"><div class="tt"><span>Appliances</span><span class="muted small">' + esc(countsText(inc)) + '</span></div>';
  inc.apps.filter(a => !['released', 'cancelled'].includes(a.status)).forEach(a => {
    h += '<div class="app-row" data-a="sheet" data-t="app" data-id="' + a.id + '"><span class="dot s-' + a.status + '"></span><div class="nm">' + esc(a.callsign) + (a.mine ? ' <span class="badge blue">You</span>' : '') + '<div class="sub">' + esc(ST_LABEL[a.status]) + (a.crew ? ' · ' + esc(a.crew) + ' crew' : '') + (a.oic ? ' · OIC ' + esc(a.oic) : '') + (a.task ? ' · ' + esc(taskText(a.task)) : '') + '</div></div><span class="small muted num">' + (a.onSince && a.status !== 'returning' ? fmtT(a.onSince) : '') + '</span></div>';
  });
  const gone = inc.apps.filter(a => ['released', 'cancelled'].includes(a.status)).length;
  h += '<div class="row" style="margin-top:8px">' + btn('+ Add appliance', 'sheet', 'sm', { t: 'addApp' }) + (gone ? '<span class="muted small">' + gone + ' released / cancelled</span>' : '') + '</div></div>';
  // wordback
  const lw = inc.wordbacks[inc.wordbacks.length - 1];
  h += '<div class="tile' + (!lw && inc.onSceneAt && inc.mode === 'control' ? ' alert' : '') + '" data-a="openWb"><div class="tt">Wordback</div><div class="ts">' + (lw ? '<b class="' + (lw.status === 'nyuc' ? 'red' : lw.status === 'uc' ? 'green' : '') + '">' + esc(WB_STATUS[lw.status].label) + '</b><br>sent ' + fmtT(lw.t) : 'Not sent') + '</div></div>';
  // sitrep
  const ls = inc.sitreps[inc.sitreps.length - 1];
  h += '<div class="tile" data-a="openSitrep"><div class="tt">Sitrep / message</div><div class="ts">' + (ls ? 'Last ' + fmtT(ls.t) + ' (' + inc.sitreps.length + ')' : 'None yet') + (inc.messages.length ? '<br>' + inc.messages.length + ' message' + (inc.messages.length > 1 ? 's' : '') : '') + '</div></div>';
  // agencies
  const ag = inc.agencies.filter(a => a.status !== 'left');
  h += '<div class="tile" data-a="sheet" data-t="agencies"><div class="tt">Agencies</div><div class="ts">' + (inc.agencies.length ? inc.agencies.map(a => '<span class="s-' + a.status + '">' + esc(a.short || a.name) + ' ' + esc(AG_ST[a.status].toLowerCase()) + '</span>').join('<br>') : 'Police, AV, power co.') + '</div></div>';
  // BA
  const inside = baInside(inc).length;
  h += '<div class="tile' + (noRitDanger(inc) ? ' bad' : inside ? ' alert' : '') + '" data-a="sheet" data-t="ba"><div class="tt">BA</div><div class="ts">' + (inc.ba.teams.length ? inside + ' team' + (inside === 1 ? '' : 's') + ' inside' + (noRitDanger(inc) ? '<br><b class="red">NO RIT</b>' : inc.ba.rit === 'ready' ? '<br><span class="green">RIT ready</span>' : '') : (inc.ba.control ? 'BA control set' : 'Not in use')) + '</div></div>';
  // tactics
  const tl = TACTICS[famOf(inc)] || TACTICS.inc;
  const done = inc.tactics.length;
  h += '<div class="tile" data-a="sheet" data-t="tactics"><div class="tt">Tactics / actions</div><div class="ts">' + done + ' of ' + tl.length + ' done' + (inc.tactics.length ? '<br>Last: ' + esc(inc.tactics[inc.tactics.length - 1].item) : '') + '</div></div>';
  // contractors
  const co = inc.contractors;
  h += '<div class="tile' + (contractorsOpen(inc).length ? ' alert' : '') + '" data-a="sheet" data-t="contractors"><div class="tt">Contractors</div><div class="ts">' + (co.length ? co.map(x => '<span class="s-' + x.status + '">' + esc(x.type) + ' ' + esc(CON_ST[x.status].toLowerCase()) + '</span>').join('<br>') : 'None') + '</div></div>';
  // hazards & roads
  const rc = inc.roads.filter(r => !r.open).length;
  const hz = inc.hazards.filter(x => x.status !== 'removed');
  h += '<div class="tile' + (rc ? ' alert' : '') + '" data-a="sheet" data-t="hazards"><div class="tt">Hazards &amp; roads</div><div class="ts">' + (rc ? '<b class="amber">' + rc + ' road closed</b><br>' : '') + (hz.length ? hz.map(x => '<span class="' + (x.status === 'managed' ? 'amber' : 'red') + '">' + esc(x.name) + '</span>').join(', ') : 'None logged') + '</div></div>';
  // radio signals
  h += '<div class="tile" data-a="sheet" data-t="signals"><div class="tt">Radio signals</div><div class="ts">5-5 · 4-0 · 5-6 · 8-3 · 2-7</div></div>';
  // calls/notes
  h += '<div class="tile" data-a="sheet" data-t="notes"><div class="tt">Notes &amp; calls</div><div class="ts">' + (inc.calls.length ? inc.calls.length + ' phone call' + (inc.calls.length > 1 ? 's' : '') + '<br>' : '') + (inc.notes ? esc(inc.notes.slice(0, 60)) : 'Free text, phone calls') + '</div></div>';
  // conditions
  const cd = inc.conditions || {};
  h += '<div class="tile" data-a="sheet" data-t="conditions"><div class="tt">Conditions</div><div class="ts">' + ([cd.temp && cd.temp + '°C', cd.wind && cd.wind + ' km/h', cd.dir, cd.rh && cd.rh + '% RH'].filter(Boolean).join(' · ') || 'Optional') + '</div></div>';
  if (isFire(inc) && inc.origin) h += '<div class="tile" data-a="sheet" data-t="origin"><div class="tt">Point of origin</div><div class="ts">' + esc(inc.origin) + '</div></div>';
  // log
  h += '<div class="tile wide xwide" data-a="sheet" data-t="log"><div class="tt"><span>Log</span><span class="muted small">' + inc.log.length + ' entries</span></div><div class="log">' + inc.log.slice(-5).reverse().map(e => '<div class="e' + (e.late ? ' late' : '') + '"><span class="tm num">' + fmtT(e.t) + '</span><span>' + esc(e.text) + '</span></div>').join('') + '</div></div>';
  return h;
}

/* ---------- live tick ---------- */
let lastAlertKey = '';
function tick(force) {
  const c = $('#clock'); if (c) c.textContent = fmtTS(now());
  const inc = S.cur;
  if (S.screen !== 'inc' || !inc) { document.body.className = ''; return; }
  const ev = $('#event'); if (ev) ev.textContent = 'T+ ' + fmtDur(now() - inc.pageTime);
  const di = dueInfo(inc);
  const tb = $('#timerbar');
  let cls = '';
  if (di) {
    const rem = di.due - now();
    const state = rem <= 0 ? 'over' : rem <= 90000 ? 'soon' : 'ok';
    cls = 'tb-' + state + (inc.ack === di.due ? ' acked' : '');
    if (tb) tb.innerHTML = '<div class="timerbar ' + state + '" data-a="timerTap"><div><div class="lab">' + esc(di.label) + (state === 'over' ? ' OVERDUE' : '') + '</div><div class="small muted">' + (di.kind === 'wordback' ? 'due ' + fmtT(di.due) + ' · tap to build' : 'due ' + fmtT(di.due) + ' · tap to build') + '</div></div><div class="cd num mono">' + fmtDur(Math.abs(rem)) + '</div></div>';
    if (state === 'over') { const k = inc.id + di.kind + di.due; if (lastAlertKey !== k && inc.ack !== di.due) { lastAlertKey = k; alertBuzz(); } }
  } else if (tb) {
    tb.innerHTML = inc.timersStopped ? '<div class="small muted" style="margin-top:8px">Timers stopped ' + (inc.timersStoppedAt ? fmtT(inc.timersStoppedAt) : '') + '</div>' : '';
  }
  document.body.className = cls;
  const rm = $('#rems');
  if (rm) { const r = reminders(inc); const html = r.map(x => chip(x.text, false, 'remTap', { k: x.k, id: x.id || '' }, x.cls)).join(''); if (rm._h !== html) { rm.innerHTML = html; rm._h = html; } }
}
let audioCtx = null;
function alertBuzz() {
  if (S.settings.sound) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime;
      [0, .25, .5].forEach(d => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'square'; o.frequency.value = 960; g.gain.setValueAtTime(.0001, t0 + d); g.gain.exponentialRampToValueAtTime(.4, t0 + d + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + d + .18); o.connect(g); g.connect(audioCtx.destination); o.start(t0 + d); o.stop(t0 + d + .2); });
    } catch (e) {}
  }
  if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate([300, 150, 300]); } catch (e) {} }
}
