/* ===== 1.0.3 ===== */
/* ---------- directory, settings migration, theme ---------- */
const V3_DIR = [
  ['Bogong Group FCV 1', 'BGFCV1', 'Bogong Group', 'other'],
  ['Wodonga BA Support', 'WODOSU', 'Wodonga Urban Fire Brigade', 'other'],
  ['District 24 Rehab', 'D24RHB', 'D24 Headquarters', 'other'],
  ['Helitak 348', '', 'Mansfield (fire bombing helicopter, 3800 L)', 'aircraft'],
  ['Firebird 328', '', 'Benalla (fire bombing helicopter, 1050 L)', 'aircraft'],
  ['Firebird 326', '', 'Ovens HVP (fire bombing helicopter, 545 L)', 'aircraft'],
  ['Firebird 327', '', 'Shepparton (fire bombing helicopter, 1400 L)', 'aircraft'],
  ['Bomber 360', '', 'Albury (Fireboss scooper, 3200 L)', 'aircraft'],
  ['Bomber 358', '', 'Mansfield (fire bombing aeroplane, 3200 L)', 'aircraft'],
  ['Bomber 363', '', 'Benambra (fire bombing aeroplane, 3000 L)', 'aircraft'],
  ['Bomber 359', '', 'Benambra (fire bombing aircraft, 3000 L)', 'aircraft'],
  ['Bomber 390', '', 'Avalon / Albury (Large Air Tanker, 10,000 L)', 'aircraft'],
  ['Bomber 391', '', 'Avalon / Albury (Large Air Tanker, 10,000 L)', 'aircraft'],
  ['Bird Dog 375', '', 'Albury (air attack supervisor)', 'aircraft'],
  ['Birddog 376', '', 'LAT air attack supervisor', 'aircraft'],
  ['Firebird 311', '', 'Mansfield (recon / air attack supervisor helicopter)', 'aircraft'],
  ['FLIR', '', 'State resource (infrared recon helicopter)', 'aircraft']
];
DEFAULT_SETTINGS.directory = DEFAULT_SETTINGS.directory.filter(d => !V3_DIR.some(v => v[0] === d.callsign)).concat(V3_DIR.map(([callsign, code, brigade, cat]) => ({ callsign, code, brigade, cat })));
Object.assign(DEFAULT_SETTINGS, { theme: 'dark', nearestFcv: 'BGFCV1', spanActive: 5, spanUC: 7 });
function appCat(d) {
  if (d.cat) return d.cat;
  const n = d.callsign || '';
  if (/Helitak|Firebird|Bomber|Bird ?dog|FLIR|aircraft/i.test(n)) return 'aircraft';
  if (/Ultralight|\bULT\b/i.test(n)) return 'ult';
  if (/Tanker/i.test(n) && !/Pumper/i.test(n)) return 'tanker';
  return 'other';
}
function v3Boot() {
  const s = S.settings;
  V3_DIR.forEach(([callsign, code, brigade, cat]) => { const d = s.directory.find(x => x.callsign === callsign); if (!d) s.directory.push({ callsign, code, brigade, cat }); else { if (!d.code && code) d.code = code; if (!d.cat) d.cat = cat; } });
  ['theme', 'nearestFcv', 'spanActive', 'spanUC'].forEach(k => { if (s[k] == null) s[k] = DEFAULT_SETTINGS[k]; });
  saveSettings(); applyTheme();
}
function applyTheme() { document.documentElement.classList.toggle('light', S.settings.theme === 'light'); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = S.settings.theme === 'light' ? '#ffffff' : '#0b0c0e'; }

/* ---------- pager kinds and names ---------- */
KINDS.STRUC = [['House', /\b(HOUSE|HOME|DWELLING|RESIDENCE|RESIDENTIAL)\b/], ['Shed / outbuilding', /\b(SHED|GARAGE|OUTBUILDING|BARN)\b/], ['Commercial / industrial', /\b(SHOP|FACTORY|COMMERCIAL|INDUSTRIAL|WAREHOUSE|BUSINESS|SCHOOL)\b/], ['Farm building', /\b(HAYSHED|HAY|FARM|WOOLSHED|DAIRY|STABLE)\b/], ['Other', null]];
const _niceName = niceName;
niceName = function (p, kind) {
  if (p.code === 'STRUC' && kind && kind !== 'Other') { const r = roadName(p); return kind.split(' / ')[0] + ' fire' + (r ? ', ' + titleCase(r) : ''); }
  return _niceName(p, kind);
};
const _wizDecode = A.wizDecode;
A.wizDecode = function () { _wizDecode.apply(A, arguments); if (S.cur) { S.cur.apps.forEach(a => { a.fromPager = true; }); saveInc(); } };

/* ---------- setup quick look ---------- */
const _wiz = SCREENS.wiz;
SCREENS.wiz = () => {
  if (S.wiz.step !== 3 || S.wiz.edit) return _wiz();
  const inc = S.cur, p = inc.p; const ab = areaBrigade(inc);
  let h = '<div class="wrap" style="padding-top:calc(12px + env(safe-area-inset-top,0px))"><div class="row" style="justify-content:space-between">' + btn('Cancel', 'wizCancel', 'sm ghost') + '<span class="muted">Step 3 of 5</span></div>';
  h += '<div class="steps">' + [1, 2, 3, 4, 5].map(n => '<i class="' + (n <= 3 ? 'on' : '') + '"></i>').join('') + '</div>';
  h += '<h1>Quick look</h1><div class="card"><dl class="kv">';
  h += '<dt>Job</dt><dd><b>' + esc((CALL_TYPES[p.code] || {}).label || p.code || '') + '</b> · code ' + esc(p.resp || '3') + '</dd>';
  if (p.details) h += '<dt>Details</dt><dd>' + esc(titleCase(p.details)) + '</dd>';
  h += '<dt>Address</dt><dd>' + esc(titleCase(p.address || '')) + (p.cross && p.cross.length ? '<br><span class="muted">x ' + esc(p.cross.map(titleCase).join(' / ')) + '</span>' : '') + '</dd>';
  h += '<dt>Area</dt><dd>' + esc(ab ? ab.name : (p.areaCode || 'Unknown')) + '</dd>';
  if (p.map) h += '<dt>Map</dt><dd>' + esc(p.map) + (p.grid ? ' (' + esc(p.grid) + ')' : '') + '</dd>';
  h += '<dt>Paged</dt><dd>' + esc(inc.apps.map(a => a.callsign + (a.mine ? ' (you)' : '')).join(', ')) + '</dd>';
  h += '<dt>Page time</dt><dd><b class="num">' + fmtTS(inc.pageTime) + '</b></dd></dl>';
  h += '<div class="row" style="margin-top:8px">' + btn('-1 min', 'pageAdj', 'sm', { v: -1 }) + btn('-2 min', 'pageAdj', 'sm', { v: -2 }) + btn('-5 min', 'pageAdj', 'sm', { v: -5 }) + '</div></div>';
  h += '<div class="stack" style="margin-top:14px">' + btn('Confirm', 'wizNext', 'big go') + btn('Edit details', 'wizEdit', 'big') + btn('Back', 'wizBack', 'ghost') + '</div>';
  return h + '</div>';
};
A.wizEdit = () => { S.wiz.edit = true; render(); };
const _wizNext = A.wizNext; A.wizNext = function () { S.wiz.edit = false; return _wizNext.apply(A, arguments); };

/* ---------- on scene: dynamic CP default, channel list, confirm ---------- */
A.myOnScene = function () {
  const inc = S.cur;
  if (inc.mode !== 'control') { const m = myApp(inc); setAppStatus(inc, m, 'onscene'); if (!inc.onSceneAt) inc.onSceneAt = now(); commit(); return; }
  const hasCp = !!inc.cp.loc;
  openSheet({ type: 'onscene', d: { control: inc.controlName || defaultControl(inc), fgState: inc.fg.state || 'confirmed', ch: inc.fg.ch || S.settings.defaultFg, cpType: hasCp ? inc.cp.type : 'dynamic', cpLoc: hasCp ? inc.cp.loc : inc.myApp } });
};
SHEETS.onscene = s => {
  const inc = curInc(); const d = s.d;
  if (d.confirm) {
    return sheetHd('Confirm') + '<div class="card"><dl class="kv"><dt>Control name</dt><dd><b>' + esc(d.control) + '</b></dd><dt>Fireground</dt><dd><b>' + (d.fgState === 'confirmed' ? 'Channel ' + esc(d.ch) : d.fgState === 'na' ? 'Not available' : 'Not needed') + '</b></dd><dt>Control point</dt><dd>' + esc(d.cpType) + (d.cpLoc ? ': ' + esc(d.cpLoc) : '') + '</dd></dl></div>' +
      '<div class="stack" style="margin-top:12px">' + btn('Confirmed, log it', 'osSent', 'big go') + btn('Back', 'osUnconfirm', 'ghost') + '</div>';
  }
  let h = sheetHd('On scene');
  h += '<label class="f">Control name</label><div class="chips">';
  [defaultControl(inc), roadControl(inc), S.settings.brigade + ' Control'].filter((v, i, a) => v && a.indexOf(v) === i).forEach(o => { h += chip(o, d.control === o, 'osCtl', { v: o }); });
  h += '</div><input type="text" id="os_ctl" data-sbind="d.control" value="' + esc(d.control) + '" placeholder="Custom control name" style="margin-top:6px">';
  h += '<label class="f">Fireground channel</label><div class="chips">' + S.settings.fgList.map(c => chip(c, d.fgState === 'confirmed' && d.ch === c, 'osChan', { v: c })).join('') + '</div>';
  h += '<div class="row small" style="margin-top:6px">' + chip('Not needed', d.fgState === 'notneeded', 'osFg', { v: 'notneeded' }) + chip('Not available', d.fgState === 'na', 'osFg', { v: 'na' }) + '</div>';
  h += '<label class="f">Control point</label><div class="chips">' + chip('Dynamic', d.cpType === 'dynamic', 'osCp', { v: 'dynamic' }) + chip('Static', d.cpType === 'static', 'osCp', { v: 'static' }) + '</div>';
  h += '<input type="text" id="os_loc" data-sbind="d.cpLoc" value="' + esc(d.cpLoc) + '" placeholder="' + (d.cpType === 'dynamic' ? 'Truck the IC is on' : 'Location, e.g. front gate') + '" style="margin-top:6px">';
  const tmp = Object.assign({}, inc, { controlName: d.control, fg: { state: d.fgState, ch: d.ch } });
  h += '<h3>Script</h3>' + script(onSceneScript(tmp));
  h += '<div class="stack" style="margin-top:12px">' + btn('Sent', 'osSent', 'big go') + btn('Cancel', 'closeSheet', 'ghost') + '</div>';
  return h;
};
A.osChan = d => { S.sheet.d.fgState = 'confirmed'; S.sheet.d.ch = d.v; renderSheet(); };
A.osUnconfirm = () => { S.sheet.d.confirm = false; renderSheet(); };
A.osCp = d => { const x = S.sheet.d; x.cpType = d.v; if (d.v === 'dynamic' && !x.cpLoc) x.cpLoc = S.cur.myApp; if (d.v === 'static' && x.cpLoc === S.cur.myApp) x.cpLoc = ''; renderSheet(); };
const _osSent = A.osSent;
A.osSent = function () { if (!S.sheet.d.confirm) { S.sheet.d.confirm = true; renderSheet(); return; } return _osSent.apply(A, arguments); };

/* ---------- wordback ---------- */
WB_STATUS.falsealarm.label = 'False alarm stop';
const WB_ORDER = ['nyuc', 'uc', 'stop', 'falsealarm', 'investigating'];
RES.length = 0;
[
  { k: 'tankers', label: 'Make tankers #', fire: true },
  { k: 'ba', label: 'BA support', radio: 'BA support', plain: 'BA support', fire: true },
  { k: 'rehab', label: 'Rehab', radio: 'rehab', plain: 'rehab', fire: true },
  { k: 'air', label: 'Aircraft', radio: 'aircraft', plain: 'aircraft', fire: true },
  { k: 'frv', label: 'FRV', radio: 'FRV', plain: 'FRV', fire: true },
  { k: 'rescue', label: 'Rescue', radio: 'rescue', plain: 'rescue', fire: true },
  { k: 'police', label: 'Police (5-6)', radio: '5-6', plain: 'police (non-urgent)', agency: 'Police' },
  { k: 'police40', label: 'Police URGENT (4-0)', radio: '4-0', plain: 'police URGENT', agency: 'Police' },
  { k: 'av', label: 'Ambulance', radio: 'ambulance', plain: 'ambulance', agency: 'Ambulance (AV)' },
  { k: 'pa', label: 'Check P and A notified', radio: 'confirm police and ambulance notified', plain: 'confirm police and ambulance notified' },
  { k: 'power', label: 'Power company', radio: 'power company', plain: 'power company', agency: 'Power company' },
  { k: 'contractor', label: 'Contractor / machinery', radio: 'contractor', plain: 'contractor', contractor: true }
].forEach(r => RES.push(r));
function tankPhrase(d) { return 'make ' + (d.tType === 'ult' ? 'ultralights ' : 'tankers ') + (d.tankers || 2) + (d.tReason ? ' for ' + d.tReason.replace(/^[A-Z][a-z]/, m => m.toLowerCase()) : ''); }
function resPhrase(k, d, radio) {
  const r = RES.find(x => x.k === k); if (!r) return '';
  if (k === 'tankers') return tankPhrase(d);
  if (k === 'contractor') return 'contractor' + (d.contractorType ? ' (' + d.contractorType.toLowerCase() + ')' : '');
  return radio ? r.radio : r.plain;
}
wbScript = function (inc, d) {
  const st = WB_STATUS[d.status] || {};
  let s = 'FireCom, wordback from ' + radioFrom() + ', ' + (d.status === 'falsealarm' ? 'false alarm' : sitrepSubject(inc, {})) + ', ' + (st.radio || '') + '.';
  const req = (d.res || []).map(k => resPhrase(k, d, true)).filter(Boolean);
  if (req.length) s += ' Request ' + req.join(', ') + '.';
  if (d.extra) s += ' ' + d.extra.trim();
  return s;
};
SHEETS.wordback = s => {
  const inc = curInc(); const d = s.d;
  let h = sheetHd('Wordback');
  h += '<label class="f">Status</label><div class="chips">' + WB_ORDER.map(k => chip(WB_STATUS[k].label, d.status === k, 'wbSt', { v: k }, k === 'nyuc' ? 'red' : k === 'uc' ? 'green' : '')).join('') + '</div>';
  const frvPaged = inc.apps.some(a => a.frv);
  const ch = r => { let lab = r.label; if (r.k === 'tankers' && (d.res || []).includes('tankers')) lab = tankPhrase(d).replace(/^make/, 'Make'); if (r.k === 'frv' && frvPaged) lab += ' (already paged)'; return chip(lab, (d.res || []).includes(r.k), r.k === 'tankers' ? 'wbTankOpen' : 'wbRes', { v: r.k }); };
  h += '<label class="f">Fire resources</label><div class="chips">' + RES.filter(r => r.fire).map(ch).join('') + '</div>';
  h += '<label class="f">Other resources</label><div class="chips">' + RES.filter(r => !r.fire).map(ch).join('') + '</div>';
  if ((d.res || []).includes('contractor')) h += '<label class="f">Machine type</label><div class="chips">' + CON_TYPES.map(x => chip(x, d.contractorType === x, 'wbCon', { v: x })).join('') + '</div>';
  h += '<label class="f">Anything else (optional)</label><input type="text" id="wb_extra" data-sbind="d.extra" value="' + esc(d.extra || '') + '" placeholder="Extra words for the radio">';
  if (d.status) h += '<h3>Script</h3>' + script(wbScript(inc, d));
  h += '<div class="stack" style="margin-top:12px">' + btn('Sent', 'wbSent', 'big go' + (d.status ? '' : '" disabled="disabled')) + btn('Cancel', 'closeSheet', 'ghost') + '</div>';
  if (inc.wordbacks.length) h += '<h3>Previous</h3><div class="log">' + inc.wordbacks.map(w => '<div class="e"><span class="tm">' + fmtT(w.t) + '</span><span>' + esc(w.plain) + '</span></div>').join('') + '</div>';
  return h;
};
SHEETS.mtank = () => {
  const par = S.sheetStack[S.sheetStack.length - 1]; const d = par && par.d; if (!d) return sheetHd('Make tankers', true);
  let h = sheetHd('Make tankers', true);
  h += '<label class="f">How many</label><div class="chips">' + [2, 5, 10, 15, 20].map(n => chip(String(n), d.tankers === n, 'mtN', { v: n })).join('') + '</div>';
  h += '<label class="f">Type</label><div class="chips">' + chip('Tankers', d.tType !== 'ult', 'mtType', { v: 'tank' }) + chip('Ultralights', d.tType === 'ult', 'mtType', { v: 'ult' }) + '</div>';
  h += '<label class="f">Why (optional, leave blank for extra trucks)</label><div class="chips">' + ['Water supply', 'BA operators', 'Asset protection', 'Relief crews', 'Fire spread'].map(x => chip(x, d.tReason === x, 'mtWhy', { v: x })).join('') + '</div>';
  if (d.tankers >= 5 && d.tType !== 'ult') h += '<p class="small muted">Make tankers 5 or more also puts District 24 Rehab and ' + esc((dirByCode(S.settings.nearestFcv) || {}).callsign || 'your FCV') + ' on the board as paged.</p>';
  h += '<div class="stack" style="margin-top:12px">' + btn('Done', 'sheetBack', 'big go') + btn('Remove make tankers', 'mtRemove', 'ghost') + '</div>';
  return h;
};
A.wbTankOpen = () => { const d = S.sheet.d; if (!d.res.includes('tankers')) { d.res.push('tankers'); d.tankers = d.tankers || 2; } openSheet({ type: 'mtank' }, true); };
A.mtN = d => { S.sheetStack[S.sheetStack.length - 1].d.tankers = Number(d.v); renderSheet(); };
A.mtType = d => { S.sheetStack[S.sheetStack.length - 1].d.tType = d.v; renderSheet(); };
A.mtWhy = d => { const p = S.sheetStack[S.sheetStack.length - 1].d; p.tReason = p.tReason === d.v ? '' : d.v; renderSheet(); };
A.mtRemove = () => { const p = S.sheetStack[S.sheetStack.length - 1].d; p.res = p.res.filter(x => x !== 'tankers'); A.sheetBack(); };
A.wbSent = function () {
  const inc = S.cur, d = S.sheet.d, t = now(); if (!d.status) return;
  const st = WB_STATUS[d.status];
  const req = d.res.map(k => resPhrase(k, d, false)).filter(Boolean);
  const plain = st.plain + (req.length ? '. Requested: ' + req.join(', ') : '');
  inc.wordbacks.push({ t, status: d.status, res: d.res.slice(), plain, script: wbScript(inc, d) });
  logE('Wordback: ' + plain);
  if (!inc.sitreps.length) inc.sitrepDue = t + S.settings.sitrepFirst * 60000;
  d.res.forEach(k => { const r = RES.find(x => x.k === k); if (r && r.agency) ensureAgency(inc, r.agency, 'requested'); if (r && r.contractor) addContractor(inc, d.contractorType || 'Other', 'requested'); });
  if (d.res.includes('tankers')) {
    if (d.tType !== 'ult') inc.makeTankers = Math.max(inc.makeTankers || 0, d.tankers || 0);
    if (d.tType !== 'ult' && d.tankers >= 5) autoPage(inc, ['D24RHB', S.settings.nearestFcv]);
  }
  if (d.status === 'uc' && !inc.underControlAt) inc.underControlAt = t;
  if (['stop', 'falsealarm', 'noaction'].includes(d.status)) {
    if (!inc.stopAt) { inc.stopAt = t; inc.stopVariant = st.label; }
    inc.apps.forEach(a => { if (!a.mine && (a.status === 'enroute' || a.status === 'paged')) setAppStatus(inc, a, 'cancelled'); });
  }
  closeSheet(); commit();
};
function autoPage(inc, codes) {
  codes.forEach(code => {
    if (!code) return; const dd = dirByCode(code); const cs = dd ? dd.callsign : code;
    if (inc.apps.some(a => a.code === code || a.callsign === cs)) return;
    const a = addApp(inc, { callsign: cs, code }, 'paged'); a.auto = true; a.cat = dd ? appCat(dd) : 'other';
    logE(cs + ' paged (auto, make tankers 5+)');
  });
}
SHEETS.stopvar = () => sheetHd('Stop') + '<p class="muted">Sends a Stop wordback. Anything still en route gets marked "Cancelled en route".</p><div class="stack">' + btn('Stop', 'quickWb', 'big warn', { v: 'stop' }) + btn('False alarm stop', 'quickWb', 'big', { v: 'falsealarm' }) + '</div>';

/* ---------- sitrep: short default, building type ---------- */
const an = w => /^[aeiou]/i.test(w) ? 'an ' + w : 'a ' + w;
function sitrepSubject(inc, d) {
  if (d.f && d.f.btype) return d.f.btype.toLowerCase() + ' fire';
  if (inc.p.code === 'STRUC' && inc.kind && inc.kind !== 'Other') return inc.kind.split(' / ')[0].toLowerCase() + ' fire';
  if (d.f && d.f.vtype && famOf(inc) !== 'mva') return d.f.vtype.toLowerCase() + ' fire';
  return wbType(inc).toLowerCase();
}
sitrepText = function (inc, d) {
  const picks = SITREP_PICKS[famOf(inc)] || [];
  const parts = []; picks.forEach(([k]) => { if (d.f[k] && k !== 'btype' && k !== 'vtype') parts.push(srPhrase(k, d.f[k])); });
  let s = 'FireCom, sitrep from ' + radioFrom() + ' of ' + an(sitrepSubject(inc, d)) + '. ';
  if (parts.length) s += titleFirst(parts.join(', ')) + '. ';
  if (d.tac && d.tac.length) s += 'Tactics: ' + d.tac.join(', ').toLowerCase() + '. ';
  if (d.threat && d.threat.length) s += 'Threatening: ' + d.threat.join(', ').toLowerCase() + '. ';
  if (d.potential) s += d.potential.trim().replace(/\.?$/, '. ');
  if (d.eta) s += 'Expect under control ' + d.eta + '. ';
  if (d.useTasks) { const t = taskSummary(inc); if (t.length) s += t.join('; ') + '. '; }
  if (d.useChanges) { const c = changesSince(inc).filter(x => !(d.useTasks && / tasked: /.test(x)) && !/^(Pager|Incident started|Message to FireCom)/.test(x)); if (c.length) s += 'Since last: ' + c.slice(-6).join('; ') + '. '; }
  if (d.extra) s += d.extra.trim();
  return s.trim();
};
const _openSitrep = A.openSitrep;
A.openSitrep = function () { _openSitrep.apply(A, arguments); if (S.sheet && S.sheet.d) { S.sheet.d.useTasks = false; S.sheet.d.useChanges = false; renderSheet(); } };
// export and smeacs strip both sitrep prefixes
const SITREP_PREFIX = /^FireCom, sitrep from [^.]*\.\s*/;

/* ---------- add appliance by category ---------- */
const CATS = [['tanker', 'Tanker'], ['ult', 'Ultralight'], ['aircraft', 'Aircraft'], ['other', 'Other']];
SHEETS.addApp = s => {
  const cat = s.cat || 'tanker';
  const q = (s.q || '').trim().toLowerCase();
  const inc = curInc(); const have = new Set(inc.apps.map(a => a.callsign));
  let list = S.settings.directory.filter(d => !have.has(d.callsign) && (q ? true : appCat(d) === cat));
  if (q) list = list.filter(d => (d.callsign + ' ' + d.code + ' ' + d.brigade).toLowerCase().includes(q));
  let h = sheetHd('Add ' + (q ? 'appliance' : CATS.find(c => c[0] === cat)[1].toLowerCase()), s.back);
  h += '<div class="chips">' + CATS.map(([k, l]) => chip(l, cat === k && !q, 'addCat', { v: k })).join('') + '</div>';
  h += '<input type="text" id="addq" data-sbind="q" data-live="1" value="' + esc(s.q || '') + '" placeholder="Or type callsign / pager code, e.g. KIEWT2" autocomplete="off" style="margin-top:8px">';
  h += '<div class="chips" style="margin-top:8px">' + chip('Add as paged', s.st === 'paged', 'addSt', { v: 'paged' }) + chip('En route', s.st === 'enroute', 'addSt', { v: 'enroute' }) + chip('On scene', s.st === 'onscene', 'addSt', { v: 'onscene' }) + '</div>';
  h += '<div id="addlist">' + (list.length ? '' : '<p class="dim">Nothing in this list yet. Type a callsign to add one, or manage the list in Settings.</p>') + list.slice(0, 40).map(d => '<div class="app-row" data-a="addPick" data-cs="' + esc(d.callsign) + '" data-code="' + esc(d.code) + '"><div class="nm">' + esc(d.callsign) + '<div class="sub">' + esc([d.code, d.brigade].filter(Boolean).join(' · ')) + '</div></div><span class="chip">Add</span></div>').join('') + (q ? '<div style="margin-top:8px">' + btn('Add "' + esc(s.q) + '" as custom ' + CATS.find(c => c[0] === cat)[1].toLowerCase(), 'addCustom', 'full') + '</div>' : '') + '</div>';
  return h;
};
A.addCat = d => { S.sheet.cat = d.v; S.sheet.q = ''; renderSheet(); };
const _addPick = A.addPick; A.addPick = function (d) { _addPick.apply(A, arguments); const a = S.cur.apps[S.cur.apps.length - 1]; const dd = S.settings.directory.find(x => x.callsign === a.callsign); a.cat = dd ? appCat(dd) : (S.sheet.cat || 'other'); saveInc(); };
const _addCustom = A.addCustom; A.addCustom = function () { const cat = S.sheet.cat || 'tanker'; _addCustom.apply(A, arguments); const a = S.cur.apps[S.cur.apps.length - 1]; if (a && !a.cat) { a.cat = cat; saveInc(); } };
function isAircraft(a) { return a.cat === 'aircraft' || appCat({ callsign: a.callsign }) === 'aircraft'; }

/* ---------- next status on appliance rows ---------- */
const NEXT = { paged: 'enroute', enroute: 'onscene', water: 'onscene', rehab: 'onscene' };
const NEXT_LABEL = { paged: 'En route', enroute: 'On scene', water: 'Back on scene', rehab: 'Back from rehab' };
A.appNext = d => { const a = findApp(d.id); const n = NEXT[a.status]; if (n) A.appSt({ id: a.id, v: n }); };

/* ---------- BA: forced pressure check at entry minus 100 bar ---------- */
function baNeedsCheck(t) { if (teamState(t) !== 'inside' || t.checkDone) return false; return baEst(t).bar <= (t.bar || 300) - 100; }
SHEETS.bacheck = s => {
  const inc = curInc(); const t = inc.ba.teams.find(x => x.id === s.id); if (!t) return sheetHd('Pressure check');
  const e = baEst(t);
  let h = s.forced ? '<div class="hd"><h2 style="margin:0">PRESSURE CHECK: ' + esc(t.name) + '</h2></div>' : sheetHd('Pressure check: ' + t.name, !!S.sheetStack.length);
  if (s.forced) h += '<div class="banner amber">' + esc(t.name) + ' should be about 100 bar down from entry (' + (t.bar || 300) + ' bar). Get a reading now.</div>';
  h += script(t.name + ', ' + (inc.ba.control ? 'BA control' : 'Incident Control') + ', pressure check, over.');
  h += '<p class="muted">Estimate now ~' + e.bar + ' bar. Enter what they report:</p><div class="chips">' + [280, 260, 240, 220, 200, 180, 160, 140, 120, 100, 80].map(n => chip(String(n), false, 'baCheck', { id: t.id, v: n })).join('') + '</div>';
  h += '<div class="row" style="margin-top:8px"><div class="grow"><input type="text" inputmode="numeric" id="bc_bar" data-sbind="bar" value="' + esc(s.bar || '') + '" placeholder="Other bar reading"></div>' + btn('Log', 'baCheck', 'sm go', { id: t.id }) + '</div>';
  h += '<div style="margin-top:10px">' + btn('No response', 'baNoResp', 'full warn', { id: t.id }) + '</div>';
  return h;
};
SHEETS.bacheck.full = true;
A.baNoResp = d => { const t = S.cur.ba.teams.find(x => x.id === d.id); t.noResp = now(); t.checkDone = true; logE('BA ' + teamLabel(t) + ': NO RESPONSE to pressure check'); S.sheet = S.sheetStack.pop() || null; commit(); };
const _baCheck = A.baCheck; A.baCheck = function (d) { const t = S.cur.ba.teams.find(x => x.id === d.id); const before = t.checks ? t.checks.length : 0; _baCheck.apply(A, arguments); if ((t.checks || []).length > before) { t.noResp = null; saveInc(); } };
const _baIn = A.baIn; A.baIn = function (d) { const t = S.cur.ba.teams.find(x => x.id === d.id); if (t) { t.noResp = null; t.checkPrompted = false; } return _baIn.apply(A, arguments); };
A.sheetBg = (d, el, e) => { if (e.target === el && !(S.sheet && S.sheet.forced)) closeSheet(); };

/* ---------- red flag / hydration / span / level triggers ---------- */
function directReports(inc) { return inc.apps.filter(a => !a.mine && !a.brigadeOnly && !isAircraft(a) && ['onscene', 'water', 'rehab'].includes(a.status)).length; }
function spanLimit(inc) { return inc.underControlAt ? (S.settings.spanUC || 7) : (S.settings.spanActive || 5); }
function crewOnScene(inc) { return inc.apps.filter(a => ['onscene', 'water'].includes(a.status)).reduce((n, a) => n + (Number(a.crew) || (a.brigadeOnly ? 0 : 4)), 0); }
const AIIMS_MANUAL = [['agencies', 'Several agencies involved'], ['duration', 'Expected to run into a second shift'], ['boundaries', 'Boundaries crossed (brigade, group, border)'], ['impacts', 'Significant potential impacts'], ['media', 'Media or political interest'], ['relief', 'Relief or recovery needs']];
const ROLES = ['Operations', 'Safety Officer', 'Deputy IC', 'Planning', 'Logistics', 'Public Information', 'Liaison', 'Staging', 'Plant operations', 'Water supply', 'Traffic'];
function aiimsTriggers(inc) {
  const roles = (inc.roles || []).map(r => r.role);
  const t = [];
  const beyond = inc.apps.some(a => !a.mine && !a.fromPager && !a.auto && !isAircraft(a)) || (inc.makeTankers || 0) > 0;
  t.push({ k: 'beyond', label: 'Resources beyond the initial response', on: beyond, lvl: 2 });
  const fnDel = roles.some(r => ['Operations', 'Safety Officer', 'Planning', 'Logistics', 'Public Information'].includes(r));
  t.push({ k: 'delegated', label: 'A function delegated (Operations, Safety, Planning, Logistics, PIO)', on: fnDel, lvl: 2 });
  t.push({ k: 'time', label: 'On scene 30+ min and not under control', on: !!(inc.onSceneAt && !inc.underControlAt && !inc.stopAt && now() - inc.onSceneAt > 30 * 60000), lvl: 2 });
  t.push({ k: 'span', label: 'Span of control exceeded (' + directReports(inc) + ' reporting to you, limit ' + spanLimit(inc) + ')', on: directReports(inc) > spanLimit(inc), lvl: 2 });
  t.push({ k: 'trucks', label: '5+ truck level (R&R escalation guide)', on: truckCount(inc) >= 5, lvl: 2 });
  t.push({ k: 'l3', label: 'Operations, Planning and Logistics all delegated', on: ['Operations', 'Planning', 'Logistics'].every(r => roles.includes(r)), lvl: 3 });
  return t;
}
truckCount = function (inc) { const n = inc.apps.filter(a => !a.brigadeOnly && !isAircraft(a) && !a.auto && ['onscene', 'enroute', 'water', 'rehab'].includes(a.status)).length; return Math.max(n, inc.makeTankers || 0); };
levelAlert = function (inc) { const lvl = inc.level || 1; const ack = inc.aiimsAck || {}; return aiimsTriggers(inc).filter(x => x.on && x.lvl > lvl && !ack[x.k]).length; };
SHEETS.level = s => {
  const inc = curInc(); const n = truckCount(inc); const th = levelThreshold(inc);
  let h = sheetHd('Incident level');
  h += '<label class="f">Incident level</label><div class="chips">' + [1, 2, 3].map(l => chip('Level ' + l, (inc.level || 1) === l, 'lvlSet', { v: l }, l > 1 ? 'amber' : '')).join('') + '</div>';
  h += '<p class="small muted">AIIMS: Level 1 is handled by the initial response. Level 2 is any of: resources beyond the initial response, sectors, or functions delegated. Level 3 adds divisions and a larger structure. The DDO makes the call with you.</p>';
  h += '<h3>Triggers the app can see</h3>';
  aiimsTriggers(inc).forEach(x => { h += '<div class="check' + (x.on ? ' done' : '') + '" style="cursor:default"><span class="bx">' + (x.on ? '✓' : '') + '</span><div>' + esc(x.label) + ' <span class="badge ' + (x.lvl === 3 ? 'red' : 'amber') + '">L' + x.lvl + '</span></div></div>'; });
  h += '<h3>Your call</h3>';
  const man = inc.aiimsManual || {};
  AIIMS_MANUAL.forEach(([k, l]) => { h += '<div class="check' + (man[k] ? ' done' : '') + '" data-a="aiimsTick" data-v="' + k + '"><span class="bx">' + (man[k] ? '✓' : '') + '</span><div>' + esc(l) + (k === 'agencies' ? ' <span class="muted small">(' + inc.agencies.filter(a => a.status !== 'left').length + ' active)</span>' : '') + '</div></div>'; });
  if (levelAlert(inc)) h += '<div style="margin-top:12px">' + btn('Acknowledge', 'lvlAck', 'big warn') + '</div>';
  if (th) {
    h += '<h3>R&amp;R ' + th + ' truck checklist (p85-86) · ' + n + ' trucks</h3>';
    [5, 10, 15].filter(k => k <= th).forEach(k => LEVEL_CHECKS[k].forEach(it => { const key = k + ':' + it; const d = (inc.levelChecks || {})[key]; h += '<div class="check' + (d ? ' done' : '') + '" data-a="lvlTick" data-v="' + esc(key) + '"><span class="bx">' + (d ? '✓' : '') + '</span><div>' + esc(it) + '</div></div>'; }));
  }
  return h;
};
A.aiimsTick = d => { const inc = S.cur; inc.aiimsManual = inc.aiimsManual || {}; if (inc.aiimsManual[d.v]) delete inc.aiimsManual[d.v]; else { inc.aiimsManual[d.v] = now(); logE('Level consideration: ' + AIIMS_MANUAL.find(x => x[0] === d.v)[1]); } commit(); };
A.lvlAck = () => { const inc = S.cur; inc.aiimsAck = inc.aiimsAck || {}; const on = aiimsTriggers(inc).filter(x => x.on && x.lvl > (inc.level || 1)); on.forEach(x => { inc.aiimsAck[x.k] = now(); }); logE('Escalation triggers acknowledged: ' + on.map(x => x.label).join('; ')); commit(); };
const _lvlSet = A.lvlSet; A.lvlSet = function (d) { const inc = S.cur; const on = aiimsTriggers(inc).filter(x => x.on).map(x => x.label); _lvlSet.apply(A, arguments); if (on.length) { logE('Level ' + d.v + ' reasons: ' + on.join('; ')); saveInc(); } };

extraReminders = function (inc, r) {
  const t0 = now();
  inc.ba.teams.forEach(t => {
    const st = teamState(t);
    if (st === 'inside' && t.noResp) r.unshift({ k: 'bacheck', id: t.id, text: t.name + ': no response to pressure check', cls: 'red' });
    if (fatigued(t) && st !== 'inside' && st !== 'rehab') r.push({ k: 'fatigue', id: t.id, text: t.name + ': ' + t.cyl + ' cylinders, fatigue', cls: 'amber' });
  });
  const rf = rfActive(inc); if (rf) { const p = rfProgress(inc, rf); if (p.done < p.total) r.unshift({ k: 'redflag', text: 'Red flag: ' + (p.total - p.done) + ' not confirmed', cls: 'red' }); }
  if (inc.mode !== 'control' || inc.timersStopped) return;
  const dr = directReports(inc); if (dr > spanLimit(inc) && !(inc.spanAck >= dr)) r.push({ k: 'span', text: dr + ' crews reporting to you. Sectorise or delegate?', cls: 'amber' });
  const unb = inc.apps.filter(a => !a.mine && a.status === 'onscene' && a.task && !a.briefed && !isAircraft(a)).length; if (unb) r.push({ k: 'brief', text: unb + ' crew' + (unb > 1 ? 's' : '') + ' tasked, not briefed', cls: 'amber' });
  if (inc.onSceneAt && t0 - (inc.drinksAt || inc.onSceneAt) > 60 * 60000) { const c = crewOnScene(inc); r.push({ k: 'drinks', text: 'Drinks check: ~' + c + ' L per hour', cls: 'amber' }); }
};
const _remTap3 = A.remTap;
A.remTap = function (d) {
  if (d.k === 'span') { S.cur.spanAck = directReports(S.cur); saveInc(); openSheet({ type: 'level' }); return; }
  if (d.k === 'brief') { const a = S.cur.apps.find(x => !x.mine && x.status === 'onscene' && x.task && !x.briefed); if (a) openSheet({ type: 'app', id: a.id }); return; }
  if (d.k === 'drinks') { A.drinksDone(); return; }
  return _remTap3.call(A, d);
};
A.drinksDone = () => { const inc = S.cur; inc.drinksAt = now(); logE('Drinks / hydration check done (~' + crewOnScene(inc) + ' crew, 1 L per person per hour)'); commit(); };

tickExtra = function (inc) {
  const bp = $('#bapanel');
  if (bp) {
    let html = '';
    inc.ba.teams.filter(t => teamState(t) === 'inside').forEach(t => {
      const e = baEst(t); const toDec = e.dec - now(), toWh = e.whistle - now();
      html += '<div class="timerbar ' + (e.state === 'red' ? 'over' : e.state === 'amber' ? 'soon' : '') + '" data-a="sheet" data-t="ba"><div><div class="lab">BA ' + esc(t.name) + ' · ' + esc(t.mode || '') + ' · cyl ' + t.cyl + (fatigued(t) ? ' <span class="amber">fatigue</span>' : '') + '</div><div class="small muted">~' + e.bar + ' bar (approx) · in ' + fmtDur(now() - t.in) + '</div></div><div style="text-align:right"><div class="cd num mono" style="font-size:1.25em">' + (toWh <= 0 ? 'WHISTLE' : toDec <= 0 ? 'EXIT ' + fmtDur(toWh) : fmtDur(toDec)) + '</div><div class="small muted">' + (toWh <= 0 ? 'out of time' : toDec <= 0 ? 'to whistle' : 'to decision point') + '</div></div></div>';
      const lvl = toWh <= 0 ? 'w' : toDec <= 0 ? 'd' : '';
      if (lvl && t.alerted !== lvl) { t.alerted = lvl; saveSoon(); alertBuzz(); }
      if (baNeedsCheck(t) && !t.checkPrompted && !(S.sheet && S.sheet.type === 'bacheck')) { t.checkPrompted = true; saveSoon(); alertBuzz(); openSheet({ type: 'bacheck', id: t.id, forced: true }, !!S.sheet); }
    });
    if (bp._h !== html) { bp.innerHTML = html; bp._h = html; }
  }
  const lb = $('#lvlbadge');
  if (lb) { const al = levelAlert(inc); const txt = 'L' + (inc.level || 1) + (al ? ' · check level' : ''); if (lb.textContent !== txt) lb.textContent = txt; lb.classList.toggle('flash', !!al); }
  if (S.sheet && S.sheet.type === 'mudmap') initMapCanvas();
};

/* ---------- briefing & safety (SMEACS-Q card) ---------- */
const OBJ_WHAT = { gs: ['Contain', 'Extinguish', 'Protect assets', 'Black out edge'], struc: ['Extinguish', 'Protect exposures', 'Search and rescue', 'Make safe'], veh: ['Extinguish', 'Make safe', 'Contain spill', 'Clear road'], mva: ['Make safe', 'Contain spill', 'Assist rescue / AV', 'Clear road'], other: ['Make safe', 'Protect', 'Contain', 'Clear road'] };
const AT_RISK = ['People', 'Homes', 'Stock', 'Crops / pasture', 'Sheds / machinery', 'Power / infrastructure', 'Environment', 'Road users'];
const SAFE_FIELDS = [['esc1', 'Escape route 1'], ['esc2', 'Escape route 2'], ['safe', 'Safe area'], ['anchor', 'Anchor point'], ['lookout', 'Lookout']];
const SAFETY_TYPES = ['Injury', 'Near miss', 'Vehicle / equipment breakdown', 'Other'];
function briefSummary(inc) {
  const p = [];
  const o = (inc.objectives || []).length; if (o) p.push(o + ' objective' + (o > 1 ? 's' : ''));
  const sf = inc.safety || {}; if (sf.esc1 || sf.safe) p.push('escape route set'); else if (isFire(inc)) p.push('no escape route yet');
  if ((inc.safetyEvents || []).length) p.push(inc.safetyEvents.length + ' safety event' + (inc.safetyEvents.length > 1 ? 's' : ''));
  return p.join(' · ') || 'Objectives, safety, weather';
}
SHEETS.brief = s => {
  const inc = curInc(); const fam = famOf(inc); const sf = inc.safety = inc.safety || {}; const sit = inc.sit = inc.sit || {};
  let h = sheetHd('Briefing & safety', s.back);
  // objectives
  h += '<h3>Objectives (what, where, by when)</h3><p class="small muted">Think: firefighter safety, people, property, environment, community.</p>';
  (inc.objectives || []).forEach(o => { h += '<div class="card" style="margin-top:6px"><b>' + esc(o.what) + '</b>' + (o.where ? ' ' + esc(o.where) : '') + (o.by ? ' by ' + fmtT(o.by) : '') + '<div class="chips" style="margin-top:6px">' + chip('Achieved', o.status === 'done', 'objSt', { id: o.id, v: 'done' }, o.status === 'done' ? 'green' : '') + chip('Not achievable', o.status === 'no', 'objSt', { id: o.id, v: 'no' }, o.status === 'no' ? 'red' : '') + '</div></div>'; });
  if ((inc.objectives || []).length < 3) {
    h += '<div class="card" style="margin-top:6px"><div class="chips">' + (OBJ_WHAT[fam] || OBJ_WHAT.other).map(x => chip(x, s.ow === x, 'objWhat', { v: x })).join('') + '</div><input type="text" id="obj_where" data-sbind="owhere" value="' + esc(s.owhere || '') + '" placeholder="Where, e.g. within Mahers Rd and Newnan Lane" style="margin-top:6px"><div class="chips" style="margin-top:6px">' + [15, 30, 60, 120].map(m => chip('+' + (m < 60 ? m + ' min' : m / 60 + ' hr'), s.oby === m, 'objBy', { v: m })).join('') + '</div><div style="margin-top:6px">' + btn('Add objective', 'objAdd', 'sm go') + '</div></div>';
  }
  // safety
  h += '<h3>Fireground safety</h3>';
  SAFE_FIELDS.forEach(([k, l]) => { h += '<label class="f">' + l + '</label><input type="text" id="sf_' + k + '" data-bind="safety.' + k + '" value="' + esc(sf[k] || '') + '" placeholder="' + (k === 'safe' ? 'e.g. burnt ground behind KT1' : k === 'lookout' ? 'Who is watching' : 'Where') + '">'; });
  // situation
  h += '<h3>Situation</h3>';
  if (isFire(inc)) h += '<label class="f">Point of origin</label><input type="text" id="sit_origin" data-bind="origin" value="' + esc(inc.origin || '') + '" placeholder="e.g. base of tree near gate">';
  h += '<label class="f">Cause (if known)</label><input type="text" id="sit_cause" data-bind="sit.cause" value="' + esc(sit.cause || '') + '" placeholder="e.g. slasher, powerline, unknown">';
  h += '<label class="f">At risk</label><div class="chips">' + AT_RISK.map(x => chip(x, (sit.risk || []).includes(x), 'riskTog', { v: x })).join('') + '</div>';
  h += '<h3>Weather</h3>' + condForm(inc) + '<label class="f">Expected change</label><input type="text" id="sit_chg" data-bind="sit.change" value="' + esc(sit.change || '') + '" placeholder="e.g. SW change about 1600">';
  h += '<h3>Admin</h3><label class="f">Water / refill point</label><input type="text" id="sit_wp" data-bind="sit.water" value="' + esc(sit.water || '') + '" placeholder="e.g. hydrant at Kiewa Valley Hwy, dam on property">';
  h += '<label class="f">First aid / food and drinks</label><input type="text" id="sit_fa" data-bind="sit.firstaid" value="' + esc(sit.firstaid || '') + '" placeholder="e.g. first aid kit on KT1, water on KT2">';
  // hydration
  const c = crewOnScene(inc);
  h += '<div class="card" style="margin-top:8px"><b>Hydration:</b> ~' + c + ' crew on scene, about ' + c + ' L of water per hour. ' + (inc.drinksAt ? '<span class="muted small">Last check ' + fmtT(inc.drinksAt) + '</span>' : '') + '<div style="margin-top:6px">' + btn('Drinks checked', 'drinksDone', 'sm') + '</div></div>';
  // roles
  h += '<h3>Who is doing what</h3>';
  (inc.roles || []).forEach(r => { h += '<div class="small">' + fmtT(r.t) + ' <b>' + esc(r.role) + '</b>: ' + esc(r.who || '') + '</div>'; });
  h += '<div class="chips" style="margin-top:6px">' + ROLES.map(x => chip(x, s.role === x, 'roleTog', { v: x })).join('') + '</div>';
  if (s.role) h += '<div class="row" style="margin-top:6px"><div class="grow"><input type="text" id="role_who" data-sbind="rwho" value="' + esc(s.rwho || '') + '" placeholder="Name / appliance"></div>' + btn('Log', 'roleAdd', 'sm go') + '</div>';
  // safety events
  h += '<h3>Safety events</h3>';
  (inc.safetyEvents || []).forEach(e => { h += '<div class="small">' + fmtT(e.t) + ' <b class="' + (e.type === 'Injury' ? 'red' : 'amber') + '">' + esc(e.type) + '</b>: ' + esc([e.who, e.what].filter(Boolean).join(', ')) + (e.to ? ' (reported to ' + esc(e.to) + ')' : '') + '</div>'; });
  h += '<div class="chips" style="margin-top:6px">' + SAFETY_TYPES.map(x => chip(x, s.et === x, 'evType', { v: x })).join('') + '</div>';
  if (s.et) h += '<input type="text" id="ev_who" data-sbind="ewho" value="' + esc(s.ewho || '') + '" placeholder="Who / which appliance" style="margin-top:6px"><input type="text" id="ev_what" data-sbind="ewhat" value="' + esc(s.ewhat || '') + '" placeholder="What happened" style="margin-top:6px"><input type="text" id="ev_to" data-sbind="eto" value="' + esc(s.eto || '') + '" placeholder="Reported to (e.g. DDO)" style="margin-top:6px"><div style="margin-top:6px">' + btn('Log safety event', 'evAdd', 'sm warn') + '</div>';
  // SMEACS-Q
  h += '<h3>SMEACS-Q</h3>';
  smeacs(inc).forEach(([l, n, items]) => { h += '<div class="card" style="margin-top:6px"><b>' + l + ' · ' + n + '</b><div class="small">' + items.map(esc).join('<br>') + '</div></div>'; });
  h += '<div class="check' + (inc.questionsAt ? ' done' : '') + '" data-a="qTick" style="margin-top:8px"><span class="bx">' + (inc.questionsAt ? '✓' : '') + '</span><div>Questions asked and understood' + (inc.questionsAt ? '<div class="small muted">' + fmtT(inc.questionsAt) + '</div>' : '') + '</div></div>';
  return h;
};
SHEETS.smeacs = s => SHEETS.brief(s);
smeacs = function (inc) {
  const ag = inc.agencies.filter(a => a.status === 'onscene').map(a => a.name);
  const lw = inc.wordbacks[inc.wordbacks.length - 1]; const ls = inc.sitreps[inc.sitreps.length - 1];
  const haz = inc.hazards.filter(x => x.status !== 'removed').map(x => x.name + (x.status === 'managed' ? ' (managed)' : ''));
  const sf = inc.safety || {}, sit = inc.sit || {}, cd = inc.conditions || {};
  const objs = (inc.objectives || []).map(o => o.what + (o.where ? ' ' + o.where : '') + (o.by ? ' by ' + fmtT(o.by) : '') + (o.status === 'done' ? ' (achieved)' : o.status === 'no' ? ' (not achievable)' : ''));
  const wx = [cd.temp && cd.temp + 'C', cd.wind && cd.wind + ' km/h', cd.dir && 'from ' + cd.dir, cd.rh && cd.rh + '% RH'].filter(Boolean).join(', ');
  return [
    ['S', 'Situation', [wbType(inc) + (inc.kind ? ' (' + inc.kind + ')' : '') + ' at ' + titleCase(inc.p.address || ''), lw ? 'Status: ' + WB_STATUS[lw.status].plain + ' (' + fmtT(lw.t) + ')' : 'No wordback yet', ls ? 'Last sitrep: ' + ls.text.replace(SITREP_PREFIX, '') : '', inc.origin ? 'Origin: ' + inc.origin : '', sit.cause ? 'Cause: ' + sit.cause : '', (sit.risk || []).length ? 'At risk: ' + sit.risk.join(', ') : '', wx ? 'Weather: ' + wx : '', sit.change ? 'Expected change: ' + sit.change : ''].filter(Boolean)],
    ['M', 'Mission', objs.length ? objs : ['No objectives written yet']],
    ['E', 'Execution', (taskSummary(inc).length ? taskSummary(inc) : ['No taskings logged']).concat(sf.esc1 ? ['Escape route: ' + sf.esc1 + (sf.esc2 ? ' / ' + sf.esc2 : '')] : [], sf.safe ? ['Safe area: ' + sf.safe] : [])],
    ['A', 'Administration', [countsText(inc), sit.water ? 'Water: ' + sit.water : '', sit.firstaid ? 'First aid / food: ' + sit.firstaid : '', inc.contractors.length ? 'Contractors: ' + inc.contractors.map(c => c.type + ' (' + CON_ST[c.status] + ')').join(', ') : '', inc.roads.filter(r => !r.open).length ? 'Roads closed: ' + inc.roads.filter(r => !r.open).map(r => r.road).join(', ') : ''].filter(Boolean)],
    ['C', 'Command', [controlLabel(inc) + ', IC ' + radioFrom() + ' on ' + inc.myApp, 'Control point: ' + inc.cp.type + (inc.cp.loc ? ', ' + inc.cp.loc : '')].concat((inc.roles || []).map(r => r.role + ': ' + r.who), ag.length ? ['Agencies on scene: ' + ag.join(', ')] : [])],
    ['C', 'Communications', ['FireCom 524', 'Fireground ' + (inc.fg.state === 'confirmed' ? inc.fg.ch : inc.fg.state === 'na' ? 'not available' : 'not used'), inc.ba.control && inc.ba.ch ? 'BA ' + inc.ba.ch : ''].filter(Boolean)],
    ['S', 'Safety', (haz.length ? haz : ['No hazards logged']).concat(sf.esc1 ? ['Escape routes: ' + [sf.esc1, sf.esc2].filter(Boolean).join(' / ')] : isFire(inc) ? ['No escape routes logged'] : [], sf.anchor ? ['Anchor point: ' + sf.anchor] : [], sf.lookout ? ['Lookout: ' + sf.lookout] : [], ['Hydration: about 1 L per person per hour'], baInside(inc).length ? ['BA teams inside: ' + baInside(inc).length] : [])],
    ['Q', 'Questions', [inc.questionsAt ? 'Questions asked ' + fmtT(inc.questionsAt) : 'Any questions?']]
  ];
};
A.objWhat = d => { S.sheet.ow = d.v; renderSheet(); };
A.objBy = d => { S.sheet.oby = S.sheet.oby === Number(d.v) ? 0 : Number(d.v); renderSheet(); };
A.objAdd = () => { const s = S.sheet; if (!s.ow) { toast('Pick what first'); return; } const inc = S.cur; inc.objectives = inc.objectives || []; const o = { id: uid(), what: s.ow, where: (s.owhere || '').trim(), by: s.oby ? now() + s.oby * 60000 : null, t: now(), status: '' }; inc.objectives.push(o); logE('Objective: ' + o.what + (o.where ? ' ' + o.where : '') + (o.by ? ' by ' + fmtT(o.by) : '')); s.ow = ''; s.owhere = ''; s.oby = 0; commit(); };
A.objSt = d => { const o = S.cur.objectives.find(x => x.id === d.id); o.status = o.status === d.v ? '' : d.v; if (o.status) logE('Objective ' + (o.status === 'done' ? 'achieved' : 'not achievable') + ': ' + o.what); commit(); };
A.riskTog = d => { const sit = S.cur.sit = S.cur.sit || {}; const r = sit.risk = sit.risk || []; const i = r.indexOf(d.v); if (i >= 0) r.splice(i, 1); else r.push(d.v); commit(); };
A.roleTog = d => { S.sheet.role = S.sheet.role === d.v ? '' : d.v; renderSheet(); };
A.roleAdd = () => { const s = S.sheet; const inc = S.cur; inc.roles = inc.roles || []; inc.roles.push({ role: s.role, who: (s.rwho || '').trim(), t: now() }); logE('Delegated ' + s.role + ' to ' + ((s.rwho || '').trim() || '?')); s.role = ''; s.rwho = ''; commit(); };
A.evType = d => { S.sheet.et = S.sheet.et === d.v ? '' : d.v; renderSheet(); };
A.evAdd = () => { const s = S.sheet, inc = S.cur; inc.safetyEvents = inc.safetyEvents || []; const e = { t: now(), type: s.et, who: (s.ewho || '').trim(), what: (s.ewhat || '').trim(), to: (s.eto || '').trim() }; inc.safetyEvents.push(e); logE('SAFETY EVENT (' + e.type + '): ' + [e.who, e.what].filter(Boolean).join(', ') + (e.to ? ', reported to ' + e.to : '')); inc.reportTodo = true; if (e.type === 'Injury') { const cur = inc.summary.injuries; inc.summary.injuries = (!cur || cur === 'None') ? [e.who, e.what].filter(Boolean).join(': ') : cur + '; ' + [e.who, e.what].filter(Boolean).join(': '); } s.et = ''; s.ewho = ''; s.ewhat = ''; s.eto = ''; commit(); };
A.qTick = () => { const inc = S.cur; inc.questionsAt = inc.questionsAt ? null : now(); if (inc.questionsAt) logE('Briefing: questions asked and understood'); commit(); };

/* crew briefed on appliance sheet */
const _appSheet = SHEETS.app;
SHEETS.app = s => {
  let h = _appSheet(s); const inc = curInc(); const a = findApp(s.id); if (!a || a.mine) return h;
  const sf = inc.safety || {};
  const card = '<h3>Crew brief</h3><div class="card small">Task: ' + esc(a.task ? taskText(a.task) : 'not set') + '<br>Channel: ' + (inc.fg.state === 'confirmed' ? 'fireground ' + esc(inc.fg.ch) : 'FireCom 524') + '<br>Hazards: ' + esc(inc.hazards.filter(x => x.status !== 'removed').map(x => x.name).join(', ') || 'none logged') + '<br>Escape route: ' + esc(sf.esc1 || 'not set') + ' · Safe area: ' + esc(sf.safe || 'not set') + '<br>Questions?</div>' +
    '<div class="check' + (a.briefed ? ' done' : '') + '" data-a="appBrief" data-id="' + a.id + '"><span class="bx">' + (a.briefed ? '✓' : '') + '</span><div>Crew briefed' + (a.briefed ? '<div class="small muted">' + fmtT(a.briefed) + '</div>' : '') + '</div></div>';
  return h.replace('<h3>Crew</h3>', card + '<h3>Crew</h3>');
};
A.appBrief = d => { const a = findApp(d.id); a.briefed = a.briefed ? null : now(); if (a.briefed) logE(a.callsign + ' crew briefed'); saveInc(); renderSheet(); render(); };

/* ---------- comms plan ---------- */
const COMMS_GROUPS = [['Bogong (Kiewa)', '353', '352, 354', '471'], ['Ovens Valley', '354', '352, 353', '471'], ['Corryong', '353', '352, 354', '470'], ['Tallangatta', '352', '353, 354', '469'], ['Rutherglen', '352', '353, 354', '470'], ['Wodonga', '354', '352, 353', '470']];
SHEETS.comms = s => {
  const inc = curInc();
  let h = sheetHd('Comms plan');
  h += '<div class="card"><dl class="kv"><dt>FireCom</dt><dd><b>524</b></dd><dt>This job</dt><dd>Fireground <b>' + (inc.fg.state === 'confirmed' ? esc(inc.fg.ch) : inc.fg.state === 'na' ? 'not available' : 'not used') + '</b>' + (inc.ba.ch ? ' · BA <b>' + esc(inc.ba.ch) + '</b>' : '') + '</dd></dl></div>';
  h += '<h3>Bogong Group default plan (R&amp;R p64)</h3><div class="card"><dl class="kv"><dt>L1 fireground</dt><dd>353 (352 or 354 with DDO approval)</dd><dt>L2 sectors</dt><dd>352 and 354; 308 and 312 with DDO approval</dd><dt>Aircraft</dt><dd>357 (aircraft despatch on FireCom, then move to the fireground channel you nominate)</dd><dt>RMR</dt><dd>471</dd><dt>Plant / machinery</dt><dd>UHF 24</dd><dt>Local travel</dt><dd>360</dd><dt>Statewide travel</dt><dd>RMR 486</dd><dt>FFMVic fireground</dt><dd>670, 671</dd><dt>FFMVic incident</dt><dd>751 Mt Stanley, 745 Mt Wills, 748 Big Hill, 750 Hotham Fire Tower</dd><dt>Multi-agency</dt><dd>Request through FireCom; FSCC allocates, VicPol nominates the channel</dd></dl></div>';
  h += '<h3>Neighbouring groups</h3><div style="overflow-x:auto"><table class="small" style="border-collapse:collapse;width:100%"><tr><th align="left">Group</th><th align="left">L1 FG</th><th align="left">Alt</th><th align="left">RMR</th></tr>' + COMMS_GROUPS.map(g => '<tr><td>' + g.map(esc).join('</td><td>') + '</td></tr>').join('') + '</table></div>';
  h += '<h3>Phones</h3><div class="card small">Kiewa LCF (02) 6027 3209<br>Bogong Group (02) 6027 3468<br>D24 DCC (02) 6043 4400</div>';
  h += '<h3>Radio signals</h3><div class="stack">' + SIGNALS.map(([c, m]) => '<button class="btn" data-a="sigTap" data-v="' + c + '" style="text-align:left"><b>' + c + '</b> <span class="small" style="font-weight:500">' + esc(m) + '</span></button>').join('') + '</div>';
  return h;
};

/* ---------- hazards: roads collapsed ---------- */
const _hazSheet = SHEETS.hazards;
SHEETS.hazards = s => {
  const full = _hazSheet(s);
  const i = full.indexOf('<h3>Road closures</h3>'), j = full.indexOf('<h3>Hazards</h3>');
  if (i < 0 || j < 0) return full;
  const head = full.slice(0, i), roads = full.slice(i, j), haz = full.slice(j);
  const inc = curInc();
  let r = '';
  if (inc.roads.length || s.roadForm) r = roads; else r = '<h3>Road closures</h3>';
  if (!s.roadForm) { r = r.replace(/<div class="card" style="margin-top:8px"><input type="text" id="rd_name"[\s\S]*$/, ''); r += '<div style="margin-top:8px">' + btn('Road closed…', 'roadForm', 'warn') + '</div>'; }
  return head + haz + r;
};
A.roadForm = () => { S.sheet.roadForm = true; renderSheet(); };
const _roadClose = A.roadClose; A.roadClose = function () { _roadClose.apply(A, arguments); if (S.sheet) { S.sheet.roadForm = false; renderSheet(); } };

/* ---------- notes with photos ---------- */
const PHOTO_TAGS = ['Suspected ignition point', 'Point of origin', 'Damage', 'Hazard', 'Scene overview', 'Vehicle', 'Other'];
const _notesSheet = SHEETS.notes;
SHEETS.notes = s => {
  const inc = curInc(); let h = _notesSheet(s);
  let ph = '<h3>Photos</h3><p class="small muted">Saved on this phone only, shrunk to save space. They go in the PDF and backups.</p>';
  ph += '<div class="chips">' + PHOTO_TAGS.map(t => chip(t, s.ptag === t, 'photoTag', { v: t })).join('') + '</div>';
  ph += '<label class="btn full" for="photoIn" style="display:block;margin-top:8px">Take / add photo' + (s.ptag ? ' (' + esc(s.ptag) + ')' : '') + '</label><input type="file" id="photoIn" accept="image/*" capture="environment" hidden>';
  if ((inc.photos || []).length) {
    ph += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px">' + inc.photos.map(p => '<button class="chip" data-a="photoView" data-id="' + p.id + '" style="padding:0;border-radius:8px;overflow:hidden;display:block;min-height:0"><img src="' + p.data + '" alt="' + esc(p.tag) + '" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block"><span class="small" style="display:block;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.tag) + '</span></button>').join('') + '</div>';
  }
  return h.replace('<h3>Log a phone call</h3>', ph + '<h3>Log a phone call</h3>');
};
SHEETS.photo = s => { const p = (curInc().photos || []).find(x => x.id === s.id); if (!p) return sheetHd('Photo', true); return sheetHd(p.tag + ' · ' + fmtT(p.t), true) + '<img src="' + p.data + '" alt="' + esc(p.tag) + '" style="width:100%;border-radius:10px"><div class="chips" style="margin-top:8px">' + PHOTO_TAGS.map(t => chip(t, p.tag === t, 'photoRetag', { id: p.id, v: t })).join('') + '</div><div style="margin-top:10px">' + btn('Delete photo', 'photoDel', 'full danger', { id: p.id }) + '</div>'; };
A.photoTag = d => { S.sheet.ptag = S.sheet.ptag === d.v ? '' : d.v; renderSheet(); };
A.photoView = d => openSheet({ type: 'photo', id: d.id }, true);
A.photoRetag = d => { const p = S.cur.photos.find(x => x.id === d.id); p.tag = d.v; logE('Photo retagged: ' + d.v); saveInc(); renderSheet(); };
A.photoDel = d => { const inc = S.cur; askConfirm('Delete this photo?', 'It is removed from this job.', 'Delete', () => { inc.photos = inc.photos.filter(x => x.id !== d.id); logE('Photo deleted'); saveInc(); openSheet({ type: 'notes' }); }); };
function shrinkImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { const max = 1280; let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url); res({ data: c.toDataURL('image/jpeg', 0.7), w, h }); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image')); };
    img.src = url;
  });
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'photoIn' || !e.target.files[0] || !S.cur) return;
  try { const r = await shrinkImage(e.target.files[0]); const inc = S.cur; inc.photos = inc.photos || []; const tag = (S.sheet && S.sheet.ptag) || 'Other'; inc.photos.push({ id: uid(), t: now(), tag, data: r.data, w: r.w, h: r.h }); logE('Photo taken: ' + tag); saveInc(); renderSheet(); toast('Photo saved'); }
  catch (err) { toast(err.message); }
  e.target.value = '';
});

/* ---------- mud map: drag and drop, more stamps, zoom ---------- */
const MAP_TOOLS = [['pen', 'Draw'], ['road', 'Road'], ['truck', 'Truck'], ['arrow', 'Wind'], ['origin', 'Origin'], ['hazard', 'Hazard'], ['cp', 'CP'], ['wp', 'Water point'], ['gas', 'Gas iso'], ['elec', 'Elec iso'], ['pv', 'PV iso'], ['entry', 'Entry point'], ['text', 'Label'], ['pan', 'Move map']];
const _drawMap = drawMap;
drawMap = function (ctx, w, h, ops, print) {
  _drawMap(ctx, w, h, (ops || []).filter(o => o.k !== 'road' && !(o.k === 'stamp' && ['wp', 'gas', 'elec', 'pv', 'entry'].includes(o.s))), print);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fs = Math.max(12, w / 40), r = w / 45;
  (ops || []).forEach(o => {
    if (o.k === 'road') { ctx.strokeStyle = print ? '#888' : '#6b747d'; ctx.lineWidth = Math.max(8, w / 45); ctx.beginPath(); o.pts.forEach((p, i) => i ? ctx.lineTo(p[0] * w, p[1] * h) : ctx.moveTo(p[0] * w, p[1] * h)); ctx.stroke(); ctx.strokeStyle = print ? '#fff' : '#d8dde2'; ctx.lineWidth = Math.max(1, w / 400); ctx.setLineDash([w / 60, w / 60]); ctx.stroke(); ctx.setLineDash([]); if (o.label) { const p = o.pts[Math.floor(o.pts.length / 2)]; ctx.font = 'bold ' + fs + 'px sans-serif'; ctx.fillStyle = print ? '#111' : '#f4f6f7'; ctx.fillText(o.label, p[0] * w + 6, p[1] * h - 10); } }
  });
  (ops || []).forEach(o => {
    if (o.k !== 'stamp' || !['wp', 'gas', 'elec', 'pv', 'entry'].includes(o.s)) return;
    const x = o.x * w, y = o.y * h; ctx.font = 'bold ' + fs * .85 + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const badge = (bg, fg, txt, round) => { ctx.fillStyle = bg; ctx.beginPath(); if (round) ctx.arc(x, y, r * 1.2, 0, Math.PI * 2); else ctx.rect(x - r * 1.3, y - r * .9, r * 2.6, r * 1.8); ctx.fill(); ctx.fillStyle = fg; ctx.fillText(txt, x, y); };
    if (o.s === 'wp') badge('#1d63c9', '#fff', 'WP', true);
    if (o.s === 'gas') badge('#ffb21e', '#000', 'GAS', false);
    if (o.s === 'elec') badge('#ffd400', '#000', 'ELEC', false);
    if (o.s === 'pv') badge('#7c3aed', '#fff', 'PV', false);
    if (o.s === 'entry') { ctx.fillStyle = '#2fd36f'; ctx.beginPath(); ctx.moveTo(x - r * 1.4, y - r); ctx.lineTo(x + r * .4, y - r); ctx.lineTo(x + r * .4, y - r * 1.6); ctx.lineTo(x + r * 1.6, y); ctx.lineTo(x + r * .4, y + r * 1.6); ctx.lineTo(x + r * .4, y + r); ctx.lineTo(x - r * 1.4, y + r); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillText('EP', x - r * .3, y); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (o.label) { ctx.fillStyle = print ? '#111' : '#f4f6f7'; ctx.font = 'bold ' + fs * .85 + 'px sans-serif'; ctx.fillText(o.label, x + r * 1.8, y + 4); }
  });
};
SHEETS.mudmap = s => {
  const inc = curInc(); inc.map = inc.map || { ops: [] };
  const tool = s.tool || 'pen', z = s.zoom || 1;
  let h = '<div class="hd"><h2 style="margin:0">Mud map</h2><div class="row">' + btn('Undo', 'mapUndo', 'sm') + btn('Done', 'closeSheet', 'sm go') + '</div></div>';
  h += '<div class="chips" style="margin-bottom:6px">' + MAP_TOOLS.map(([k, l]) => chip(l, tool === k, 'mapTool', { v: k })).join('') + '</div>';
  if (tool === 'pen') h += '<div class="chips" style="margin-bottom:6px">' + MAP_COLORS.map(c => '<button class="chip' + ((s.color || MAP_COLORS[0]) === c ? ' on' : '') + '" data-a="mapColor" data-v="' + c + '" aria-label="colour"><span class="dot" style="color:' + c + '"></span></button>').join('') + '</div>';
  if (tool === 'truck') h += '<div class="chips" style="margin-bottom:6px">' + inc.apps.filter(a => !['released', 'cancelled'].includes(a.status)).map(a => chip(a.callsign, s.truck === a.callsign, 'mapTruck', { v: a.callsign })).join('') + '</div>';
  if (['text', 'hazard', 'road', 'wp', 'entry'].includes(tool)) h += '<input type="text" id="map_lbl" data-sbind="label" value="' + esc(s.label || '') + '" placeholder="' + ({ text: 'Label text, e.g. dam, gate, house', hazard: 'Hazard, e.g. power lines', road: 'Road name (optional)', wp: 'e.g. hydrant, dam (optional)', entry: 'e.g. front door (optional)' }[tool]) + '" style="margin-bottom:6px">';
  h += '<div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="small muted">' + (tool === 'pan' ? 'Drag to move around the map.' : tool === 'pen' || tool === 'road' ? 'Draw with your finger.' : tool === 'arrow' ? 'Drag the way the wind is blowing.' : 'Tap to place. Drag any symbol to move it.') + '</span><span class="chips">' + [1, 1.5, 2].map(v => chip('x' + v, z === v, 'mapZoom', { v })).join('') + '</span></div>';
  h += '<div id="mapwrap" style="overflow:auto;border:2px solid var(--line);border-radius:10px;max-width:100%;-webkit-overflow-scrolling:touch"><canvas id="mudmap" style="width:' + (z * 100) + '%;aspect-ratio:1/1;display:block;touch-action:' + (tool === 'pan' ? 'pan-x pan-y' : 'none') + '"></canvas></div>';
  h += '<div style="margin-top:8px">' + btn('Clear map', 'mapClear', 'sm ghost') + '</div>';
  return h;
};
A.mapZoom = d => { S.sheet.zoom = Number(d.v); renderSheet(); };
initMapCanvas = function () {
  const cv = document.getElementById('mudmap'); if (!cv || cv._init) return; cv._init = true;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const redraw = extra => drawMap(cv.getContext('2d'), cv.width, cv.height, S.cur.map.ops.concat(extra ? [extra] : []), false);
  const r0 = cv.getBoundingClientRect(); cv.width = r0.width * dpr; cv.height = r0.height * dpr; redraw();
  let cur = null, drag = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  const hit = p => { const ops = S.cur.map.ops; const rad = 0.045 / (S.sheet.zoom || 1); for (let i = ops.length - 1; i >= 0; i--) { const o = ops[i]; if (o.k === 'stamp' && Math.hypot(o.x - p[0], o.y - p[1]) < rad) return o; } return null; };
  cv.addEventListener('pointerdown', e => {
    const s = S.sheet, tool = s.tool || 'pen'; if (tool === 'pan') return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId); const p = pos(e);
    if (tool === 'pen') { cur = { k: 'line', c: s.color || MAP_COLORS[0], pts: [p] }; return; }
    if (tool === 'road') { cur = { k: 'road', pts: [p], label: (s.label || '').trim() }; return; }
    if (tool === 'arrow') { cur = { k: 'arrow', x1: p[0], y1: p[1], x2: p[0], y2: p[1] }; return; }
    const hitO = hit(p); if (hitO) { drag = { o: hitO, moved: false }; return; }
    const o = { k: 'stamp', s: tool, x: p[0], y: p[1] };
    if (tool === 'truck') { if (!s.truck) { toast('Pick a truck first'); return; } o.label = s.truck; o.short = s.truck.replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'T'; }
    if (tool === 'text') { if (!(s.label || '').trim()) { toast('Type the label first'); return; } o.label = s.label.trim(); }
    if (['hazard', 'wp', 'entry'].includes(tool)) o.label = (s.label || '').trim();
    S.cur.map.ops.push(o); saveInc(); redraw();
  });
  cv.addEventListener('pointermove', e => {
    if (drag) { const p = pos(e); drag.o.x = p[0]; drag.o.y = p[1]; drag.moved = true; redraw(); return; }
    if (!cur) return; const p = pos(e); if (cur.pts) cur.pts.push(p); else { cur.x2 = p[0]; cur.y2 = p[1]; } redraw(cur);
  });
  const end = () => {
    if (drag) { if (drag.moved) saveInc(); drag = null; redraw(); return; }
    if (!cur) return;
    const ok = cur.pts ? cur.pts.length > 1 : Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) > .03;
    if (ok) { if (cur.pts) cur.pts = cur.pts.map(p => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000]); S.cur.map.ops.push(cur); saveInc(); }
    cur = null; redraw();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
};

/* ---------- handover: stay as Sector Commander ---------- */
const _hoScreen = SCREENS.handover;
SCREENS.handover = () => {
  const h = _hoScreen(); if (S.cur.hoDraft.step !== 5) return h;
  return h.replace(btn('End tracking', 'hoFinish', 'big go', { v: 'end' }), btn('Stay as Sector Commander', 'hoFinish', 'big', { v: 'sector' }) + '<p class="small muted">Keep running your own crews as a sector under the new IC. Your BA timers and log carry on.</p>' + btn('End tracking', 'hoFinish', 'big go', { v: 'end' }));
};
const _hoFinish = A.hoFinish;
A.hoFinish = function (d) {
  if (d.v === 'sector') { const inc = S.cur; inc.hoDraft.done = true; inc.mode = 'logonly'; inc.sectorCmd = true; logE('Staying as Sector Commander under ' + ((inc.handover && (inc.handover.name || inc.handover.to)) || 'new IC')); go('inc'); saveInc(); return; }
  return _hoFinish.apply(A, arguments);
};
const _resume = A.resumeControl; A.resumeControl = function () { S.cur.sectorCmd = false; return _resume.apply(A, arguments); };

/* ---------- end of job: hot debrief, report to-do ---------- */
const _wrapItems = wrapItems;
wrapItems = function (inc) {
  const L = _wrapItems(inc); const s = inc.summary || {};
  L.push({ label: 'Hot debrief held', auto: !!(s.dbSafety || s.dbWelfare || s.dbPlan), block: false });
  if ((inc.safetyEvents || []).length) L.push({ label: 'Safety event reported', auto: false, block: false });
  return L;
};
const _endjob = SCREENS.endjob;
SCREENS.endjob = () => {
  const h = _endjob(); const inc = S.cur; if ((inc.endStep || 1) !== 2) return h; const s = inc.summary;
  const db = '<h3>Hot debrief</h3><label class="f">Safety issues</label>' + inp('summary.dbSafety', s.dbSafety || '', 'Anything unsafe or close calls') + '<label class="f">Welfare</label>' + inp('summary.dbWelfare', s.dbWelfare || '', 'Crew welfare, peer support (2-7) needed?') + '<label class="f">How did it compare to the plan, and why?</label>' + inp('summary.dbPlan', s.dbPlan || '', 'What went well, what to improve');
  return h.replace('<label class="f">Notes</label>', db + '<label class="f">Notes</label>');
};
A.reportTap = () => { const inc = S.cur; inc.reportTodo = !inc.reportTodo; commit(); };
const _expButtons = exportButtons;
exportButtons = function (inc) { const h = _expButtons(inc); if (!(inc.safetyEvents || []).length) return h; return h.replace(/<\/div>$/, '<div class="check' + (inc.reportTodo ? ' miss' : ' done') + '" data-a="reportTap"><span class="bx">' + (inc.reportTodo ? '' : '✓') + '</span><div>' + (inc.reportTodo ? 'To do: report safety event' : 'Safety event reported') + '</div></div></div>'); };

/* ---------- export + PDF additions ---------- */
const _exportText = exportText;
exportText = function (inc) {
  let t = _exportText(inc).replace(/FireCom, sitrep from [^.]*\.\s*/g, '');
  const L = [], hr = '----------------------------------------', sf = inc.safety || {}, sit = inc.sit || {}, s = inc.summary || {};
  if ((inc.objectives || []).length) { L.push('OBJECTIVES'); L.push(hr); inc.objectives.forEach(o => L.push(fmtT(o.t) + ' ' + o.what + (o.where ? ' ' + o.where : '') + (o.by ? ' by ' + fmtT(o.by) : '') + (o.status === 'done' ? ' (achieved)' : o.status === 'no' ? ' (not achievable)' : ''))); L.push(''); }
  const safe = SAFE_FIELDS.filter(([k]) => sf[k]).map(([k, l]) => l + ': ' + sf[k]);
  if (safe.length || sit.cause || (sit.risk || []).length || sit.water) { L.push('BRIEFING'); L.push(hr); safe.forEach(x => L.push(x)); if (sit.cause) L.push('Cause: ' + sit.cause); if ((sit.risk || []).length) L.push('At risk: ' + sit.risk.join(', ')); if (sit.change) L.push('Expected weather change: ' + sit.change); if (sit.water) L.push('Water / refill: ' + sit.water); L.push(''); }
  if ((inc.roles || []).length) { L.push('ROLES DELEGATED'); L.push(hr); inc.roles.forEach(r => L.push(fmtT(r.t) + ' ' + r.role + ': ' + r.who)); L.push(''); }
  const br = inc.apps.filter(a => a.briefed); if (br.length) { L.push('CREWS BRIEFED: ' + br.map(a => a.callsign + ' ' + fmtT(a.briefed)).join(', ')); L.push(''); }
  if ((inc.safetyEvents || []).length) { L.push('SAFETY EVENTS' + (inc.reportTodo ? ' (TO DO: REPORT)' : '')); L.push(hr); inc.safetyEvents.forEach(e => L.push(fmtT(e.t) + ' ' + e.type + ': ' + [e.who, e.what].filter(Boolean).join(', ') + (e.to ? ' (reported to ' + e.to + ')' : ''))); L.push(''); }
  if (s.dbSafety || s.dbWelfare || s.dbPlan) { L.push('HOT DEBRIEF'); L.push(hr); if (s.dbSafety) L.push('Safety: ' + s.dbSafety); if (s.dbWelfare) L.push('Welfare: ' + s.dbWelfare); if (s.dbPlan) L.push('Compared to plan: ' + s.dbPlan); L.push(''); }
  if ((inc.photos || []).length) { L.push('PHOTOS: ' + inc.photos.map(p => p.tag + ' ' + fmtT(p.t)).join(', ') + ' (in PDF)'); L.push(''); }
  if (!L.length) return t;
  const k = t.indexOf('END OF JOB'); return k < 0 ? t + '\n' + L.join('\n') : t.slice(0, k) + L.join('\n') + '\n' + t.slice(k);
};
makePdf = async function (inc) {
  const lib = await loadJsPDF(); const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' });
  const text = exportText(inc).split('\n'); let y = 16; const left = 14, maxW = 182;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('Wordback: ' + (inc.name || 'Incident'), left, y); y += 8;
  doc.setFontSize(9);
  text.forEach(line => { const head = /^[A-Z][A-Z \/()&:-]+$/.test(line.trim()) && line.trim().length > 2; doc.setFont('courier', head ? 'bold' : 'normal'); doc.splitTextToSize(line || ' ', maxW).forEach(l => { if (y > 284) { doc.addPage(); y = 14; } doc.text(l, left, y); y += 4.2; }); });
  if (inc.map && inc.map.ops.length) { doc.addPage(); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Mud map', 14, 16); doc.addImage(mapPng(inc), 'JPEG', 14, 22, 182, 182); }
  (inc.photos || []).forEach((p, i) => {
    if (i % 2 === 0) { doc.addPage(); y = 14; }
    const w = 182, h = Math.min(125, w * (p.h || 3) / (p.w || 4)); const ww = h < 125 ? w : 125 * (p.w || 4) / (p.h || 3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(p.tag + ' · ' + fmtT(p.t), 14, y + 4); doc.addImage(p.data, 'JPEG', 14, y + 7, ww, h); y += h + 16;
  });
  return doc.output('blob');
};

/* ---------- settings additions ---------- */
const _settings = SCREENS.settings;
SCREENS.settings = () => {
  const s = S.settings; const fcvs = s.directory.filter(d => /FCV/i.test(d.callsign));
  const extra = '<h3>Make tankers 5+</h3><label class="f">Nearest FCV (paged with District 24 Rehab)</label><div class="chips">' + fcvs.map(d => chip(d.callsign, s.nearestFcv === (d.code || d.callsign), 'setVal', { k: 'nearestFcv', v: d.code || d.callsign })).join('') + '</div>' +
    '<h3>Span of control</h3><div class="row">' + numSet('Crews per IC while active', 'spanActive') + numSet('Crews per IC once under control', 'spanUC') + '</div>' +
    '<h3>Theme</h3><div class="chips">' + chip('Dark', s.theme !== 'light', 'setVal', { k: 'theme', v: 'dark' }) + chip('Light', s.theme === 'light', 'setVal', { k: 'theme', v: 'light' }) + '</div>';
  return _settings().replace('<h3>Alerts and screen</h3>', extra + '<h3>Alerts and screen</h3>').replace('Format: Callsign | CODE | Brigade</p>', 'Format: Callsign | CODE | Brigade | type (tanker, ult, aircraft, other)</p>').replace(/(<textarea id="s_dir"[^>]*>)([\s\S]*?)(<\/textarea>)/, (m, a, b, c) => a + esc(s.directory.map(d => d.callsign + ' | ' + d.code + ' | ' + d.brigade + ' | ' + appCat(d)).join('\n')) + c);
};
const _setVal = A.setVal; A.setVal = function (d) { _setVal.apply(A, arguments); if (d.k === 'theme') applyTheme(); };
A.themeTog = () => { S.settings.theme = S.settings.theme === 'light' ? 'dark' : 'light'; saveSettings(); applyTheme(); render(); };
document.addEventListener('input', e => {
  if (e.target.dataset.setdir) { S.settings.directory = e.target.value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0]).map(p => ({ callsign: p[0], code: (p[1] || '').toUpperCase(), brigade: p[2] || '', cat: ['tanker', 'ult', 'aircraft', 'other'].includes((p[3] || '').toLowerCase()) ? p[3].toLowerCase() : '' })); saveSettings(); }
});

/* ---------- dashboard ---------- */
SCREENS.inc = () => {
  const inc = S.cur; if (!inc) return SCREENS.home();
  const my = myApp(inc);
  const ctl = inc.mode === 'control' ? controlLabel(inc) : inc.mode === 'logonly' ? (inc.sectorCmd ? 'Sector Commander' : 'Log only') : 'Support' + (inc.supportOf ? ': ' + inc.supportOf : '');
  let h = '<div class="top"><div class="wrap">';
  h += '<div class="t1"><button class="btn sm ghost" data-a="goHome" style="min-height:36px;padding:2px 8px" aria-label="Home">‹</button><div class="name grow" style="flex:1">' + esc(ctl) + '</div><div class="clock num mono" id="clock">' + fmtTS(now()) + '</div></div>';
  h += '<div class="t1" style="align-items:center"><div class="row" style="gap:10px"><div class="event num mono" id="event">T+ 00:00</div><button class="lvlbadge" id="lvlbadge" data-a="sheet" data-t="level">L' + (inc.level || 1) + '</button></div><div style="text-align:right" class="small"><div class="muted">Paged ' + fmtTS(inc.pageTime) + '</div><div class="muted">' + esc(inc.p.incNo || inc.p.codeRaw || '') + '</div><button class="themetog" data-a="themeTog" aria-label="Switch theme">' + (S.settings.theme === 'light' ? '☾ Dark' : '☀ Light') + '</button></div></div>';
  h += '<div class="t2"><span>FireCom <b>524</b></span><span>Fireground <b>' + (inc.fg.state === 'confirmed' ? esc(inc.fg.ch) : inc.fg.state === 'na' ? 'n/a' : '-') + '</b></span>' + (inc.ba.control && inc.ba.ch && inc.ba.ch !== inc.fg.ch ? '<span>BA <b>' + esc(inc.ba.ch) + '</b></span>' : '') + '<span><b>' + esc(inc.name || '') + '</b></span>' + (inc.cp.loc ? '<span>CP ' + esc(inc.cp.type) + ': <b>' + esc(inc.cp.loc) + '</b></span>' : '') + '</div>';
  h += '</div></div><div class="wrap">';
  if (inc.training) h += '<div class="banner amber" style="text-align:center;font-weight:900;letter-spacing:.2em">TRAINING</div>';
  const rfa = rfActive(inc); if (rfa) h += '<div class="banner red" data-a="sheet" data-t="redflag" style="cursor:pointer">RED FLAG: ' + esc(rfa.text) + ' · ' + rfProgress(inc, rfa).done + ' of ' + rfProgress(inc, rfa).total + ' confirmed</div>';
  if (noRitDanger(inc)) h += '<div class="banner red" data-a="sheet" data-t="ba" style="cursor:pointer">INTERNAL BA WITH NO RIT. HIGH RISK.</div>';
  if (inc.locked) h += '<div class="lockbar">Exported and locked ' + fmtDT(inc.exportedAt) + '. New entries are flagged as late notes.</div>';
  if (inc.status === 'continue') h += '<div class="banner amber">Not closed out. Timers are off. ' + btn('Close out incident', 'closeOut', 'sm go') + '</div>';
  if (inc.mode === 'support') h += '<div class="banner">Support mode: not in control. Timers off. ' + btn('Take control', 'takeControl', 'sm go') + '</div>';
  if (inc.mode === 'logonly') h += '<div class="banner">' + (inc.sectorCmd ? 'Sector Commander under ' : 'Log only: control handed to ') + esc(inc.handover ? (inc.handover.name ? inc.handover.name + ', ' : '') + inc.handover.to : '') + '. ' + btn('Resume control', 'resumeControl', 'sm') + '</div>';
  if (my && (my.status === 'paged' || my.status === 'enroute') && inc.status === 'active') h += '<div style="margin-top:8px">' + btn(my.status === 'paged' ? 'Turning out' : 'ON SCENE', my.status === 'paged' ? 'myEnroute' : 'myOnScene', 'big ' + (my.status === 'paged' ? 'warn' : 'go')) + '</div>';
  h += '<div id="timerbar"></div><div id="bapanel" class="stack" style="gap:6px;margin-top:6px"></div><div class="rems" id="rems"></div>';
  if (isFire(inc) && !inc.origin) h += '<div class="pinned" data-a="sheet" data-t="origin" style="cursor:pointer"><span class="small muted">POINT OF ORIGIN</span> <b><span class="amber">Tap to record</span></b></div>';
  h += '<div class="tiles">' + tiles(inc) + '</div></div>';
  h += '<div class="actions"><div class="wrap">' + btn('Under control', 'quickWb', 'go', { v: 'uc' }) + btn('Stop', 'sheet', 'warn', { t: 'stopvar' }) + btn('Hand over', 'startHandover', '') + btn('End incident', 'endIncident', 'danger') + '</div></div>';
  return h;
};
function tile(t, title, line, cls, extra) { return '<div class="tile' + (cls ? ' ' + cls : '') + '" data-a="sheet" data-t="' + t + '"' + (extra || '') + '><div class="tt">' + title + '</div><div class="ts">' + line + '</div></div>'; }
tiles = function (inc) {
  let h = '';
  const avail = inc.apps.filter(a => a.status === 'onscene' && !a.task && !a.mine && !isAircraft(a)).length;
  h += '<div class="tile wide xwide" data-a="sheet" data-t="apps"><div class="tt"><span>Appliances</span><span class="muted small">' + esc(countsText(inc)) + (avail ? ' · ' + avail + ' available' : '') + '</span></div>';
  inc.apps.filter(a => !['released', 'cancelled'].includes(a.status)).forEach(a => {
    const nx = NEXT[a.status];
    h += '<div class="app-row" data-a="sheet" data-t="app" data-id="' + a.id + '"><span class="dot s-' + a.status + '"></span><div class="nm">' + esc(a.callsign) + (a.mine ? ' <span class="badge blue">You</span>' : '') + (a.auto ? ' <span class="badge">auto</span>' : '') + '<div class="sub">' + esc(ST_LABEL[a.status]) + (a.crew ? ' · ' + esc(a.crew) + ' crew' : '') + (a.task ? ' · ' + esc(taskText(a.task)) : '') + (a.briefed ? ' · briefed' : '') + '</div></div>' + (nx && !(a.mine && a.status === 'paged') ? '<button class="chip nextst" data-a="appNext" data-id="' + a.id + '">' + NEXT_LABEL[a.status] + ' ›</button>' : '<span class="small muted num">' + (a.onSince && a.status !== 'returning' ? fmtT(a.onSince) : '') + '</span>') + '</div>';
  });
  const gone = inc.apps.filter(a => ['released', 'cancelled'].includes(a.status)).length;
  h += '<div class="row" style="margin-top:8px">' + btn('+ Add appliance', 'sheet', 'sm', { t: 'addApp' }) + (gone ? '<span class="muted small">' + gone + ' released / cancelled</span>' : '') + '</div></div>';
  const lw = inc.wordbacks[inc.wordbacks.length - 1];
  h += '<div class="tile' + (!lw && inc.onSceneAt && inc.mode === 'control' ? ' alert' : '') + '" data-a="openWb"><div class="tt">Wordback</div><div class="ts">' + (lw ? '<b class="' + (lw.status === 'nyuc' ? 'red' : lw.status === 'uc' ? 'green' : '') + '">' + esc(WB_STATUS[lw.status].label) + '</b> ' + fmtT(lw.t) : 'Not sent') + '</div></div>';
  const ls = inc.sitreps[inc.sitreps.length - 1];
  h += '<div class="tile" data-a="openSitrep"><div class="tt">Sitrep</div><div class="ts">' + (ls ? 'Last ' + fmtT(ls.t) + ' (' + inc.sitreps.length + ')' : 'None yet') + '</div></div>';
  const rf = rfActive(inc);
  h += tile('redflag', 'Red flag', rf ? '<b class="red">ACTIVE</b> ' + rfProgress(inc, rf).done + '/' + rfProgress(inc, rf).total + ' confirmed' : 'None active', rf ? 'bad' : '');
  const inside = baInside(inc).length;
  h += tile('ba', 'BA', inc.ba.teams.length ? inside + ' inside' + (noRitDanger(inc) ? ' · <b class="red">NO RIT</b>' : inc.ba.rit === 'ready' ? ' · RIT ready' : '') : 'Not in use', noRitDanger(inc) ? 'bad' : inside ? 'alert' : '');
  const rc = inc.roads.filter(r => !r.open).length; const hz = inc.hazards.filter(x => x.status !== 'removed');
  h += tile('hazards', 'Hazards &amp; roads', (rc ? '<b class="amber">' + rc + ' road closed</b> · ' : '') + (hz.length ? esc(hz.map(x => x.name).join(', ')) : 'None logged'), rc ? 'alert' : '');
  h += tile('agencies', 'Agencies', inc.agencies.length ? inc.agencies.map(a => '<span class="s-' + a.status + '">' + esc(a.short || a.name) + '</span>').join(', ') : 'Police, AV, power co.');
  const tl = TACTICS[famOf(inc)] || TACTICS.inc;
  h += tile('tactics', 'Tactics / actions', inc.tactics.length + ' of ' + tl.length + ' done');
  h += tile('brief', 'Briefing &amp; safety', esc(briefSummary(inc)), isFire(inc) && inc.onSceneAt && !(inc.safety || {}).esc1 ? 'alert' : '');
  h += tile('notes', 'Notes &amp; photos', ((inc.photos || []).length ? inc.photos.length + ' photo' + (inc.photos.length > 1 ? 's' : '') + ' · ' : '') + (inc.calls.length ? inc.calls.length + ' call' + (inc.calls.length > 1 ? 's' : '') + ' · ' : '') + (inc.notes ? esc(inc.notes.slice(0, 40)) : 'Notes, calls, photos'));
  h += tile('comms', 'Comms plan', 'FireCom 524 · FG ' + (inc.fg.state === 'confirmed' ? esc(inc.fg.ch) : '-') + ' · signals');
  h += tile('mudmap', 'Mud map', inc.map && inc.map.ops.length ? inc.map.ops.length + ' items' : 'Sketch the fireground');
  if (inc.contractors.length || famOf(inc) === 'gs') h += tile('contractors', 'Contractors', inc.contractors.length ? inc.contractors.map(x => esc(x.type) + ' ' + esc(CON_ST[x.status].toLowerCase())).join(', ') : 'None', contractorsOpen(inc).length ? 'alert' : '');
  h += '<div class="tile wide xwide" data-a="sheet" data-t="log"><div class="tt"><span>Log</span><span class="muted small">' + inc.log.length + ' entries</span></div><div class="log">' + inc.log.slice(-4).reverse().map(e => '<div class="e' + (e.late ? ' late' : '') + '"><span class="tm num">' + fmtT(e.t) + '</span><span>' + esc(e.text) + '</span></div>').join('') + '</div></div>';
  return h;
};
// contractors reachable from agencies when the tile is hidden
const _agSheet = SHEETS.agencies;
SHEETS.agencies = s => _agSheet(s) + (curInc().contractors.length || famOf(curInc()) === 'gs' ? '' : '<div style="margin-top:10px">' + btn('Contractors / machinery', 'sheet', 'full', { t: 'contractors' }) + '</div>');
