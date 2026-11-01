/* ===== Sheets (pop-ups) ===== */
const SHEETS = {};
const curInc = () => S.cur;
const findApp = id => S.cur.apps.find(a => a.id === id);

/* generic confirm */
let confirmCb = null;
function askConfirm(title, body, yesLabel, cb, cls) { confirmCb = cb; openSheet({ type: 'confirm', title, body, yes: yesLabel, cls: cls || 'danger' }); }
SHEETS.confirm = s => sheetHd(s.title) + '<p>' + s.body + '</p><div class="stack" style="margin-top:12px">' + btn(esc(s.yes), 'confirmYes', 'big ' + s.cls) + btn('Cancel', 'closeSheet', 'big ghost') + '</div>';

/* generic radio script prompt: Sent logs time */
let radioCb = null;
function radioPrompt(o, cb) { radioCb = cb || null; openSheet(Object.assign({ type: 'radio' }, o)); }
SHEETS.radio = s => sheetHd(s.title || 'Radio') + '<p class="muted">Say this on FireCom 524:</p>' + script(s.text) + '<div class="stack" style="margin-top:12px">' + btn('Sent', 'radioSent', 'big go') + (s.later ? btn('Later (leave a reminder)', 'radioLater', 'big') : '') + btn('Cancel', 'closeSheet', 'ghost') + '</div>';

/* ---- On scene ---- */
SHEETS.onscene = s => {
  const inc = curInc(); const d = s.d;
  let h = sheetHd('On scene');
  h += '<label class="f">Control name</label><div class="chips">';
  const opts = [defaultControl(inc), roadControl(inc), S.settings.brigade + ' Control'].filter((v, i, a) => v && a.indexOf(v) === i);
  opts.forEach(o => { h += chip(o, d.control === o, 'osCtl', { v: o }); });
  h += '</div><div style="margin-top:6px">' + '<input type="text" id="os_ctl" data-sbind="d.control" value="' + esc(d.control) + '" placeholder="Custom control name"></div>';
  h += '<label class="f">Fireground channel</label><div class="chips">' + chip('Confirmed', d.fgState === 'confirmed', 'osFg', { v: 'confirmed' }) + chip('Not needed', d.fgState === 'notneeded', 'osFg', { v: 'notneeded' }) + chip('Not available', d.fgState === 'na', 'osFg', { v: 'na' }) + '</div>';
  if (d.fgState === 'confirmed') h += '<div class="chips" style="margin-top:8px">' + S.settings.fgList.map(c => chip(c, d.ch === c, 'osCh', { v: c })).join('') + '</div>';
  h += '<label class="f">Control point</label><div class="chips">' + chip('Static', d.cpType === 'static', 'osCp', { v: 'static' }) + chip('Dynamic', d.cpType === 'dynamic', 'osCp', { v: 'dynamic' }) + '</div>';
  h += '<div style="margin-top:6px"><input type="text" id="os_loc" data-sbind="d.cpLoc" value="' + esc(d.cpLoc) + '" placeholder="' + (d.cpType === 'dynamic' ? 'Truck the IC is on, e.g. Kiewa Tanker 1' : 'Location, e.g. front gate 1314 Mahers Rd') + '"></div>';
  const tmp = Object.assign({}, inc, { controlName: d.control, fg: { state: d.fgState, ch: d.ch } });
  h += '<h3>Script</h3>' + script(onSceneScript(tmp));
  h += '<div class="stack" style="margin-top:12px">' + btn('Sent', 'osSent', 'big go') + btn('Cancel', 'closeSheet', 'ghost') + '</div>';
  return h;
};

/* ---- Appliances list ---- */
SHEETS.apps = () => {
  const inc = curInc(); let h = sheetHd('Appliances') + '<p class="muted">' + esc(countsText(inc)) + '</p>';
  const active = inc.apps.filter(a => !['released', 'cancelled'].includes(a.status));
  active.forEach(a => { h += '<div class="app-row" data-a="sheet" data-t="app" data-id="' + a.id + '"><span class="dot s-' + a.status + '"></span><div class="nm">' + esc(a.callsign) + '<div class="sub">' + esc(ST_LABEL[a.status]) + (a.task ? ' · ' + esc(taskText(a.task)) : '') + '</div></div></div>'; });
  h += '<div style="margin-top:10px">' + btn('+ Add appliance', 'sheet', 'full', { t: 'addApp' }) + '</div>';
  const gone = inc.apps.filter(a => ['released', 'cancelled'].includes(a.status));
  if (gone.length) { h += '<h3>Released / cancelled</h3>'; gone.forEach(a => { h += '<div class="app-row" data-a="sheet" data-t="app" data-id="' + a.id + '"><span class="dot s-' + a.status + '"></span><div class="nm">' + esc(a.callsign) + '<div class="sub">' + esc(ST_LABEL[a.status]) + ' ' + fmtT(a.hist[a.hist.length - 1].t) + '</div></div></div>'; }); }
  return h;
};
SHEETS.addApp = s => {
  const q = (s.q || '').trim().toLowerCase();
  const inc = curInc(); const have = new Set(inc.apps.map(a => a.callsign));
  let list = S.settings.directory.filter(d => !have.has(d.callsign));
  if (q) list = list.filter(d => (d.callsign + ' ' + d.code + ' ' + d.brigade).toLowerCase().includes(q));
  let h = sheetHd('Add appliance', s.back);
  h += '<input type="text" id="addq" data-sbind="q" data-live="1" value="' + esc(s.q || '') + '" placeholder="Type callsign or pager code, e.g. KIEWT2" autocomplete="off">';
  h += '<div class="chips" style="margin-top:8px">' + chip('Add as paged', s.st === 'paged', 'addSt', { v: 'paged' }) + chip('En route', s.st === 'enroute', 'addSt', { v: 'enroute' }) + chip('On scene', s.st === 'onscene', 'addSt', { v: 'onscene' }) + '</div>';
  h += '<div id="addlist">' + list.slice(0, 30).map(d => '<div class="app-row" data-a="addPick" data-cs="' + esc(d.callsign) + '" data-code="' + esc(d.code) + '"><div class="nm">' + esc(d.callsign) + '<div class="sub">' + esc([d.code, d.brigade].filter(Boolean).join(' · ')) + '</div></div><span class="chip">Add</span></div>').join('') + (q ? '<div style="margin-top:8px">' + btn('Add "' + esc(s.q) + '" as custom', 'addCustom', 'full') + '</div>' : '') + '</div>';
  return h;
};
SHEETS.app = s => {
  const inc = curInc(); const a = findApp(s.id); if (!a) return sheetHd('Appliance');
  const fam = famOf(inc);
  let h = '<div class="hd"><h2 style="margin:0">' + esc(a.callsign) + '</h2><div class="row">' + (s.task ? btn('Save and close', 'tkSave', 'sm go', { id: a.id }) : '') + btn(s.back ? 'Back' : 'Close', s.back ? 'sheetBack' : 'closeSheet', 'sm ghost') + '</div></div>';
  h += '<p><span class="badge s-' + a.status + '">' + ST_LABEL[a.status] + '</span> <span class="muted small">' + esc(a.code) + '</span></p>';
  const sts = a.mine ? ['enroute', 'onscene', 'water', 'rehab', 'returning'] : ['paged', 'enroute', 'onscene', 'water', 'rehab', 'released', 'cancelled'];
  h += '<div class="chips">' + sts.map(x => chip(x === 'onscene' && a.status === 'water' ? 'Back on scene' : x === 'onscene' && a.status === 'rehab' ? 'Back from rehab' : ST_LABEL[x], a.status === x, 'appSt', { id: a.id, v: x }, x === 'returning' ? 'red' : '')).join('') + '</div>';
  h += '<h3>Crew</h3><div class="row"><div class="stepper">' + btn('−', 'crewAdj', 'sm', { id: a.id, v: -1 }) + '<span class="v num">' + esc(a.crew || '0') + '</span>' + btn('+', 'crewAdj', 'sm', { id: a.id, v: 1 }) + '</div><div class="grow"><input type="text" id="oic_' + a.id + '" data-bind="apps.#' + a.id + '.oic" value="' + esc(a.oic) + '" placeholder="OIC name (optional)"></div></div>';
  h += '<h3>Tasking</h3>';
  const t = s.task || normTask(a.task ? clone(a.task) : null);
  h += '<p class="small muted">Pick one or more. Tap Save and close at the top.</p><div class="chips">' + Object.keys(TASKS).map(k => chip(TASKS[k], t.types.includes(k), 'tkType', { v: k })).join('') + '</div>';
  if (t.types.includes('attack')) {
    const subs = s.more ? ATTACK_SUB.more : (ATTACK_SUB[fam] || ATTACK_SUB.more);
    h += '<label class="f">Fire attack</label><div class="chips">' + subs.map(x => chip(x, t.sub === x, 'tkSub', { v: x })).join('') + (s.more ? '' : chip('More…', false, 'tkMore')) + '</div>';
    h += '<label class="f">Hose lines (optional)</label><div class="chips">' + [1, 2, 3, 4].map(n => chip(String(n), t.lines === n, 'tkLines', { v: n })).join('') + '</div>';
  }
  if (t.types.length) {
    h += '<label class="f">' + (t.types.includes('standby') || t.types.includes('road') ? 'Location' : 'Location (optional)') + '</label><input type="text" id="tk_loc" data-sbind="task.loc" value="' + esc(t.loc || '') + '" placeholder="e.g. Murray Valley Hwy gate">';
    h += '<label class="f">Target / objective (optional)</label><input type="text" id="tk_tgt" data-sbind="task.target" value="' + esc(t.target || '') + '" placeholder="e.g. hold at Newnan Lane, protect house">';
  }
  if (a.tasks.length) { h += '<h3>Tasking history</h3><div class="log">' + a.tasks.map(x => '<div class="e"><span class="tm">' + fmtT(x.t) + '</span><span>' + esc(taskText(x)) + '</span></div>').join('') + '</div>'; }
  h += '<h3>Status history</h3><div class="log">' + a.hist.map(x => '<div class="e"><span class="tm">' + fmtTS(x.t) + '</span><span>' + ST_LABEL[x.s] + '</span></div>').join('') + '</div>';
  if (!a.mine) h += '<div style="margin-top:12px">' + btn('Remove (added by mistake)', 'appRemove', 'full ghost', { id: a.id }) + '</div>';
  return h;
};

/* ---- Wordback builder ---- */
SHEETS.wordback = s => {
  const inc = curInc(); const d = s.d;
  let h = sheetHd('Wordback');
  h += '<p class="muted">' + esc(wbType(inc)) + (inc.kind ? ' · ' + esc(inc.kind) : '') + '</p>';
  h += '<label class="f">Status</label><div class="chips">' + ['investigating', 'nyuc', 'uc', 'stop', 'falsealarm', 'noaction'].map(k => chip(WB_STATUS[k].label, d.status === k, 'wbSt', { v: k }, k === 'nyuc' ? 'red' : k === 'uc' ? 'green' : '')).join('') + '</div>';
  h += '<label class="f">Short description (optional)</label><input type="text" id="wb_desc" data-sbind="d.desc" value="' + esc(d.desc || '') + '" placeholder="e.g. tree fire spreading into paddock, 1 ha">';
  h += '<label class="f">Request resources</label><div class="chips">';
  const frvPaged = inc.apps.some(a => a.frv);
  RES.forEach(r => { let lab = r.label; if (r.k === 'frv' && frvPaged) lab += ' (already paged)'; h += chip(lab, (d.res || []).includes(r.k), 'wbRes', { v: r.k }); });
  h += '</div>';
  if ((d.res || []).includes('tankers')) h += '<label class="f">Make tankers</label><div class="chips">' + [2, 3, 4, 5, 6, 8, 10].map(n => chip(String(n), d.tankers === n, 'wbTank', { v: n })).join('') + '</div>';
  if ((d.res || []).includes('contractor')) h += '<label class="f">Machine type</label><div class="chips">' + CON_TYPES.map(x => chip(x, d.contractorType === x, 'wbCon', { v: x })).join('') + '</div>';
  h += '<label class="f">Anything else (optional)</label><input type="text" id="wb_extra" data-sbind="d.extra" value="' + esc(d.extra || '') + '" placeholder="Extra words for the radio">';
  if (d.status) h += '<h3>Script</h3>' + script(wbScript(inc, d));
  h += '<div class="stack" style="margin-top:12px">' + btn('Sent', 'wbSent', 'big go' + (d.status ? '' : '" disabled="disabled')) + btn('Cancel', 'closeSheet', 'ghost') + '</div>';
  if (inc.wordbacks.length) h += '<h3>Previous</h3><div class="log">' + inc.wordbacks.map(w => '<div class="e"><span class="tm">' + fmtT(w.t) + '</span><span>' + esc(w.plain) + '</span></div>').join('') + '</div>';
  return h;
};
SHEETS.stopvar = () => sheetHd('Stop') + '<p class="muted">Sends a Stop wordback. Anything still en route gets marked "Cancelled en route".</p><div class="stack">' + btn('Stop', 'quickWb', 'big warn', { v: 'stop' }) + btn('False alarm', 'quickWb', 'big', { v: 'falsealarm' }) + btn('No action required', 'quickWb', 'big', { v: 'noaction' }) + '</div>';

/* ---- Sitrep builder ---- */
const SITREP_PICKS = {
  gs: [['size', 'Size', ['< 0.1 ha', '0.5 ha', '1 ha', '2 ha', '5 ha', '10 ha', '20+ ha']], ['dir', 'Heading', ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']], ['ros', 'Rate of spread', ['Nil', 'Slow', 'Moderate', 'Fast']], ['flame', 'Flame height', ['< 0.5 m', '1 m', '2 m', '3+ m']], ['fuel', 'Fuel', ['Grass', 'Crop', 'Scrub', 'Timber', 'Pine plantation', 'Stubble']]],
  struc: [['btype', 'Building', ['House', 'Shed', 'Garage', 'Commercial', 'Farm building', 'Unit']], ['area', 'Area involved', ['Contents', 'One room', 'Several rooms', 'Roof space', 'Whole building']], ['extent', 'Extent', ['Contained to room of origin', 'Spreading', 'Fully involved', 'Knocked down']], ['smoke', 'Smoke', ['Light', 'Moderate', 'Heavy', 'Nil visible']]],
  veh: [['vtype', 'Vehicle', ['Car', 'Ute / 4WD', 'Truck', 'Tractor / machinery', 'Bus', 'Caravan']], ['extent', 'Extent', ['Engine bay', 'Cabin', 'Fully involved', 'Knocked down']], ['leak', 'Fuel leak', ['None', 'Minor', 'Significant']]]
};
SITREP_PICKS.mva = SITREP_PICKS.veh; SITREP_PICKS.nostc = SITREP_PICKS.veh;
function srPhrase(k, v) {
  const l = v.toLowerCase();
  switch (k) {
    case 'size': return 'approx ' + v;
    case 'dir': return 'heading ' + v;
    case 'ros': return l === 'nil' ? 'no forward spread' : l + ' rate of spread';
    case 'flame': return 'flame height ' + v;
    case 'fuel': return l + ' fuel';
    case 'btype': return l;
    case 'area': return l === 'whole building' ? 'whole building involved' : l + ' involved';
    case 'smoke': return l === 'nil visible' ? 'no smoke visible' : l + ' smoke';
    case 'vtype': return l;
    case 'leak': return l === 'none' ? 'no fuel leak' : l + ' fuel leak';
    default: return l;
  }
}
const SR_TACTICS = {
  gs: ['Direct attack', 'Flank attack', 'Parallel attack', 'Defensive', 'Asset protection', 'Blacking out', 'Patrolling'],
  struc: ['Offensive internal', 'Defensive external', 'Exposure protection', 'Ventilation', 'Search and rescue', 'Overhaul'],
  veh: ['Direct attack', 'Foam', 'Fuel spill control', 'Exposure protection'],
  other: ['Direct attack', 'Defensive', 'Exposure protection', 'Containment', 'Hazard made safe']
};
SR_TACTICS.mva = SR_TACTICS.veh; SR_TACTICS.nostc = SR_TACTICS.veh;
const THREATS = ['Nil', 'Houses', 'Sheds / outbuildings', 'Livestock', 'Fences', 'Crops / pasture', 'Road', 'Power lines', 'Bush / plantation'];
function changesSince(inc) {
  const last = inc.sitreps[inc.sitreps.length - 1]; const since = last ? last.t : (inc.wordbacks[0] ? inc.wordbacks[0].t : 0);
  return inc.log.filter(e => e.t > since && !/^(Sitrep|Wordback|Radio:)/.test(e.text)).map(e => e.text);
}
function taskSummary(inc) { return inc.apps.filter(a => a.status === 'onscene' && a.task).map(a => a.callsign + ': ' + taskText(a.task)); }
function sitrepText(inc, d) {
  const picks = SITREP_PICKS[famOf(inc)] || [];
  const parts = [];
  picks.forEach(([k]) => { if (d.f[k]) parts.push(srPhrase(k, d.f[k])); });
  let s = 'FireCom, sitrep from ' + radioFrom() + ', ' + wbType(inc).toLowerCase() + '. ';
  if (parts.length) s += titleFirst(parts.join(', ')) + '. ';
  if (d.tac && d.tac.length) s += 'Tactics: ' + d.tac.join(', ').toLowerCase() + '. ';
  if (d.threat && d.threat.length) s += 'Threatening: ' + d.threat.join(', ').toLowerCase() + '. ';
  if (d.potential) s += d.potential.trim().replace(/\.?$/, '. ');
  if (d.eta) s += 'Expect under control ' + d.eta + '. ';
  if (d.useTasks) { const t = taskSummary(inc); if (t.length) s += t.join('; ') + '. '; }
  if (d.useChanges) { const c = changesSince(inc).filter(x => !(d.useTasks && / tasked: /.test(x)) && !/^(Pager|Incident started|Message to FireCom)/.test(x)); if (c.length) s += 'Since last: ' + c.slice(-6).join('; ') + '. '; }
  if (d.extra) s += d.extra.trim();
  return s.trim();
}
const titleFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
SHEETS.sitrep = s => {
  const inc = curInc(); const d = s.d; const fam = famOf(inc);
  let h = sheetHd('Sitrep');
  const di = dueInfo(inc);
  if (di && di.kind === 'sitrep' && di.due <= now()) h += '<div class="banner amber">Sitrep due. Update the wordback status or request resources if things have changed. <div class="row" style="margin-top:6px">' + btn('Update wordback', 'openWb', 'sm') + btn('Request resources', 'openWbRes', 'sm') + '</div></div>';
  (SITREP_PICKS[fam] || []).forEach(([k, lab, opts]) => { h += '<label class="f">' + esc(lab) + '</label><div class="chips">' + opts.map(o => chip(o, d.f[k] === o, 'srPick', { k, v: o })).join('') + '</div>'; });
  h += '<label class="f">Tactics in use</label><div class="chips">' + (SR_TACTICS[fam] || SR_TACTICS.other).map(o => chip(o, (d.tac || []).includes(o), 'srTac', { v: o })).join('') + '</div>';
  h += '<label class="f">Threatening</label><div class="chips">' + THREATS.map(o => chip(o, (d.threat || []).includes(o), 'srThreat', { v: o })).join('') + '</div>';
  h += '<label class="f">Potential / prediction</label><input type="text" id="sr_pot" data-sbind="d.potential" value="' + esc(d.potential || '') + '" placeholder="e.g. potential to reach Newnan Lane">';
  h += '<label class="f">Expect under control</label><div class="chips">' + ['in 5 minutes', 'in 15 minutes', 'in 30 minutes', 'in 1 hour', 'in 2+ hours'].map(o => chip(o, d.eta === o, 'srEta', { v: o })).join('') + '</div>';
  h += '<div class="chips" style="margin-top:10px">' + chip('Include taskings', d.useTasks, 'srTog', { v: 'useTasks' }) + chip('Include changes since last', d.useChanges, 'srTog', { v: 'useChanges' }) + chip('SMEACS-Q', false, 'sheet', { t: 'smeacs', back: 1 }) + '</div>';
  const ch = changesSince(inc);
  if (ch.length) h += '<div class="card small" style="margin-top:8px"><b>Changes since last sitrep</b><br>' + ch.slice(-8).map(esc).join('<br>') + '</div>';
  h += '<label class="f">Anything else</label><input type="text" id="sr_extra" data-sbind="d.extra" value="' + esc(d.extra || '') + '">';
  h += '<h3>Script</h3>' + script(sitrepText(inc, d));
  h += '<div class="stack" style="margin-top:12px">' + btn('Sent', 'srSent', 'big go') + btn('Send a message instead', 'openMsg', '') + btn('Cancel', 'closeSheet', 'ghost') + '</div>';
  return h;
};
SHEETS.message = s => {
  const inc = curInc(); const d = s.d;
  let h = sheetHd('Message');
  h += '<p class="muted">For anything outside a wordback or sitrep.</p><input type="text" id="msg_txt" data-sbind="d.text" value="' + esc(d.text || '') + '" placeholder="e.g. 5-6 on scene">';
  h += '<h3>Script</h3>' + script('FireCom, message from ' + radioFrom() + ': ' + (d.text || '...'));
  h += '<div class="stack" style="margin-top:12px">' + btn('Sent', 'msgSent', 'big go') + btn('Cancel', 'closeSheet', 'ghost') + '</div>';
  if (inc.messages.length) h += '<h3>Sent</h3><div class="log">' + inc.messages.map(m => '<div class="e"><span class="tm">' + fmtT(m.t) + '</span><span>' + esc(m.text) + '</span></div>').join('') + '</div>';
  return h;
};
function smeacs(inc) {
  const ag = inc.agencies.filter(a => a.status === 'onscene').map(a => a.name);
  const lw = inc.wordbacks[inc.wordbacks.length - 1];
  const haz = inc.hazards.filter(x => x.status !== 'removed').map(x => x.name + (x.status === 'managed' ? ' (managed)' : ''));
  const ls = inc.sitreps[inc.sitreps.length - 1];
  return [
    ['S', 'Situation', [wbType(inc) + (inc.kind ? ' (' + inc.kind + ')' : '') + ' at ' + titleCase(inc.p.address || ''), lw ? 'Status: ' + WB_STATUS[lw.status].plain + ' (' + fmtT(lw.t) + ')' : 'No wordback yet', ls ? 'Last sitrep: ' + ls.text.replace(/^FireCom, sitrep from [^.]*\.\s*/, '') : '', inc.origin ? 'Origin: ' + inc.origin : ''].filter(Boolean)],
    ['M', 'Mission', [inc.mission || 'Protect life, property and environment; contain and extinguish.']],
    ['E', 'Execution', taskSummary(inc).length ? taskSummary(inc) : ['No taskings logged']],
    ['A', 'Administration', [countsText(inc), inc.contractors.length ? 'Contractors: ' + inc.contractors.map(c => c.type + ' (' + CON_ST[c.status] + ')').join(', ') : '', inc.roads.filter(r => !r.open).length ? 'Roads closed: ' + inc.roads.filter(r => !r.open).map(r => r.road).join(', ') : ''].filter(Boolean)],
    ['C', 'Command', [controlLabel(inc) + ', IC ' + (S.settings.name || 'me') + ' on ' + inc.myApp, 'Control point: ' + (inc.cp.type === 'dynamic' ? 'dynamic' : 'static') + (inc.cp.loc ? ', ' + inc.cp.loc : ''), ag.length ? 'Agencies on scene: ' + ag.join(', ') : ''].filter(Boolean)],
    ['C', 'Communications', ['FireCom 524', 'Fireground ' + (inc.fg.state === 'confirmed' ? inc.fg.ch : inc.fg.state === 'na' ? 'not available' : 'not used'), inc.ba.control && inc.ba.ch ? 'BA ' + inc.ba.ch : ''].filter(Boolean)],
    ['S', 'Safety', haz.length ? haz : ['No hazards logged'], baInside(inc).length ? ['BA teams inside: ' + baInside(inc).length] : []],
    ['Q', 'Questions', ['Any questions?']]
  ].map(r => [r[0], r[1], r[2].concat(r[3] || [])]);
}
SHEETS.smeacs = s => { const inc = curInc(); let h = sheetHd('SMEACS-Q', s.back); h += '<label class="f">Mission (edit)</label><input type="text" id="smq_m" data-bind="mission" value="' + esc(inc.mission || '') + '" placeholder="Protect life, property and environment; contain and extinguish.">'; smeacs(inc).forEach(([l, n, items]) => { h += '<div class="card" style="margin-top:8px"><b>' + l + ' · ' + n + '</b><div class="small">' + items.map(esc).join('<br>') + '</div></div>'; }); return h; };

/* ---- Agencies ---- */
SHEETS.agencies = s => {
  const inc = curInc();
  let h = sheetHd('Agencies') + '<p class="muted">Requested, then on scene, then left scene.</p>';
  inc.agencies.forEach(a => {
    h += '<div class="card" style="margin-top:8px"><div class="row" style="justify-content:space-between"><b>' + esc(a.name) + '</b><span class="badge s-' + a.status + '">' + AG_ST[a.status] + '</span></div>';
    h += '<div class="chips" style="margin-top:6px">' + ['requested', 'onscene', 'left'].map(x => chip(AG_ST[x], a.status === x, 'agSt', { id: a.id, v: x })).join('') + '</div>';
    h += '<input type="text" id="agn_' + a.id + '" data-bind="agencies.#' + a.id + '.note" value="' + esc(a.note || '') + '" placeholder="Name / unit / notes" style="margin-top:6px">';
    h += '<div class="small muted" style="margin-top:4px">' + a.hist.map(x => AG_ST[x.s] + ' ' + fmtT(x.t)).join(' · ') + '</div></div>';
  });
  h += '<h3>Add</h3><div class="chips">' + AGENCIES.map(([n]) => chip(n, false, 'agAdd', { v: n })).join('') + '</div>';
  h += '<div class="row" style="margin-top:8px"><div class="grow"><input type="text" id="ag_custom" data-sbind="custom" value="' + esc(s.custom || '') + '" placeholder="Other agency"></div>' + btn('Add', 'agAddCustom', 'sm') + '</div>';
  return h;
};
/* ---- Hazards and roads ---- */
SHEETS.hazards = s => {
  const inc = curInc();
  let h = sheetHd('Hazards & roads');
  h += '<h3>Road closures</h3>';
  inc.roads.forEach(r => {
    h += '<div class="card" style="margin-top:6px"><div class="row" style="justify-content:space-between"><b>' + esc(r.road) + '</b>' + (r.open ? '<span class="badge green">Reopened ' + fmtT(r.open) + '</span>' : '<span class="badge amber">Closed ' + fmtT(r.closed) + '</span>') + '</div><div class="small muted">' + esc(r.reason || '') + (r.by ? ' · by ' + esc(r.by) : '') + '</div>' + (r.open ? (r.reopenReason ? '<div class="small">Reopened: ' + esc(r.reopenReason) + '</div>' : '') : '<div class="row" style="margin-top:6px"><div class="grow"><input type="text" id="rr_' + r.id + '" data-bind="roads.#' + r.id + '.reopenReason" value="' + esc(r.reopenReason || '') + '" placeholder="Reopen reason (optional)"></div>' + btn('Reopened', 'roadOpen', 'sm go', { id: r.id }) + '</div>') + '</div>';
  });
  const pol = inc.agencies.find(a => a.name === 'Police' && a.status !== 'left');
  h += '<div class="card" style="margin-top:8px"><input type="text" id="rd_name" data-sbind="road" value="' + esc(s.road || titleCase(roadName(inc.p))) + '" placeholder="Road"><div class="chips" style="margin-top:6px">' + ['Fire / smoke', 'Fireground operations', 'Tree down', 'Power lines', 'Crash', 'Hazmat'].map(x => chip(x, s.reason === x, 'rdReason', { v: x })).join('') + '</div><div class="chips" style="margin-top:6px">' + ['Police (5-6)', 'Fire crews', 'Council / DTP'].map(x => chip('Closed by ' + x, s.by === x, 'rdBy', { v: x })).join('') + '</div><div style="margin-top:8px">' + btn('Road closed now', 'roadClose', 'full warn') + '</div>' + (!pol ? '<p class="small amber">Reminder: request 5-6 for traffic control.</p>' : '') + '</div>';
  h += '<h3>Hazards</h3><p class="small muted">Tap to cycle: identified (red), managed (amber), removed.</p><div class="chips">';
  HAZARDS.forEach(n => { const x = inc.hazards.find(z => z.name === n); h += chip(n + (x ? ' · ' + x.status : ''), !!x && x.status !== 'removed', 'hzTap', { v: n }, x ? (x.status === 'managed' ? 'amber' : x.status === 'identified' ? 'red' : '') : ''); });
  inc.hazards.filter(x => !HAZARDS.includes(x.name)).forEach(x => { h += chip(x.name + ' · ' + x.status, x.status !== 'removed', 'hzTap', { v: x.name }, x.status === 'managed' ? 'amber' : x.status === 'identified' ? 'red' : ''); });
  h += '</div><div class="row" style="margin-top:8px"><div class="grow"><input type="text" id="hz_c" data-sbind="hz" value="' + esc(s.hz || '') + '" placeholder="Other hazard"></div>' + btn('Add', 'hzAdd', 'sm') + '</div>';
  return h;
};
/* ---- Tactics ---- */
SHEETS.tactics = s => {
  const inc = curInc(); const fam = famOf(inc); const list = TACTICS[fam] || TACTICS.inc;
  let h = sheetHd('Tactics / actions') + '<p class="muted">Tap when done. Each tick is timestamped.</p>';
  list.forEach(it => {
    const d = inc.tactics.find(x => x.item === it);
    h += '<div class="check' + (d ? ' done' : '') + '" data-a="tacTap" data-v="' + esc(it) + '"><span class="bx">' + (d ? '✓' : '') + '</span><div style="flex:1">' + esc(it) + (d ? '<div class="small muted">' + fmtT(d.t) + (d.note ? ' · ' + esc(d.note) : '') + '</div>' : '') + '</div></div>';
    if (it === 'No one inside' && s.noone) {
      h += '<div class="card" style="margin-top:6px"><div class="chips">' + chip('Confirmed by search', s.noone.how === 'search', 'nooneHow', { v: 'search' }) + chip('Verbal from owner / tenant', s.noone.how === 'verbal', 'nooneHow', { v: 'verbal' }) + '</div>' + (s.noone.how === 'verbal' ? '<input type="text" id="no_n" data-sbind="noone.name" value="' + esc(s.noone.name || '') + '" placeholder="Name" style="margin-top:6px"><input type="text" id="no_r" data-sbind="noone.rel" value="' + esc(s.noone.rel || '') + '" placeholder="Relationship (owner, tenant, neighbour)" style="margin-top:6px">' : '') + '<div style="margin-top:6px">' + btn('Log "No one inside"', 'nooneSave', 'full go') + '</div></div>';
    }
  });
  inc.tactics.filter(x => !list.includes(x.item)).forEach(d => { h += '<div class="check done"><span class="bx">✓</span><div>' + esc(d.item) + '<div class="small muted">' + fmtT(d.t) + '</div></div></div>'; });
  h += '<div class="row" style="margin-top:8px"><div class="grow"><input type="text" id="tac_c" data-sbind="custom" value="' + esc(s.custom || '') + '" placeholder="Other action"></div>' + btn('Log', 'tacCustom', 'sm') + '</div>';
  return h;
};
/* ---- Contractors ---- */
const CON_TYPES = ['Excavator', 'Dozer', 'Grader', 'Water cart', 'Tree feller / arborist', 'Tow truck', 'Skid steer', 'Other'];
SHEETS.contractors = s => {
  const inc = curInc(); let h = sheetHd('Contractors') + '<p class="muted">Requested, DDO approved, on scene, left. Arrival and departure times are logged.</p>';
  inc.contractors.forEach(c => {
    const hrs = machineMs(c);
    h += '<div class="card" style="margin-top:8px"><div class="row" style="justify-content:space-between"><b>' + esc(c.type) + '</b><span class="badge s-' + c.status + '">' + CON_ST[c.status] + '</span></div>';
    h += '<div class="row" style="margin-top:6px"><div class="grow"><input type="text" id="cc_' + c.id + '" data-bind="contractors.#' + c.id + '.company" value="' + esc(c.company) + '" placeholder="Company"></div><div class="grow"><input type="text" id="co_' + c.id + '" data-bind="contractors.#' + c.id + '.operator" value="' + esc(c.operator) + '" placeholder="Operator"></div></div>';
    h += '<input type="text" id="cm_' + c.id + '" data-bind="contractors.#' + c.id + '.machine" value="' + esc(c.machine) + '" placeholder="Machine (make / model / rego)" style="margin-top:6px">';
    h += '<div class="chips" style="margin-top:6px">' + ['requested', 'approved', 'onscene', 'left'].map(x => chip(CON_ST[x], c.status === x, 'conSt', { id: c.id, v: x })).join('') + '</div>';
    const running = (c.runs || []).find(r => !r.end);
    h += '<div class="row" style="margin-top:6px">' + (running ? btn('Machine stop', 'conRun', 'sm warn', { id: c.id }) : btn('Machine start', 'conRun', 'sm go', { id: c.id })) + '<span class="small">Machine hours: <b class="num">' + fmtHrs(hrs) + '</b>' + (running ? ' <span class="green">running</span>' : '') + '</span></div>';
    h += '<div class="small muted" style="margin-top:4px">' + c.hist.map(x => CON_ST[x.s] + ' ' + fmtT(x.t)).join(' · ') + '</div></div>';
  });
  h += '<h3>Add contractor</h3><div class="chips">' + CON_TYPES.map(x => chip(x, false, 'conAdd', { v: x })).join('') + '</div>';
  return h;
};
function machineMs(c) { return (c.runs || []).reduce((s, r) => s + ((r.end || now()) - r.start), 0); }
/* ---- BA ---- */
SHEETS.ba = s => {
  const inc = curInc(); const b = inc.ba;
  let h = sheetHd('Breathing apparatus');
  if (noRitDanger(inc)) h += '<div class="banner red">INTERNAL BA WITH NO RIT. HIGH RISK.</div>';
  h += '<div class="chips">' + chip(b.control ? 'BA control established' : 'BA control not set', b.control, 'baCtl') + '</div>';
  h += '<div class="row"><div class="grow"><label class="f">BA control (who)</label><input type="text" id="ba_who" data-bind="ba.who" value="' + esc(b.who) + '" placeholder="Name / appliance"></div><div class="grow"><label class="f">BA channel</label><input type="text" id="ba_ch" data-bind="ba.ch" value="' + esc(b.ch) + '" placeholder="e.g. 353" inputmode="numeric"></div></div>';
  h += '<label class="f">Rapid intervention team</label><div class="chips">' + chip('RIT ready', b.rit === 'ready', 'baRitSet', { v: 'ready' }, b.rit === 'ready' ? 'green' : '') + chip('No RIT', b.rit === 'none', 'baRitSet', { v: 'none' }, b.rit === 'none' ? 'red' : '') + '</div>';
  h += '<h3>Teams</h3>';
  b.teams.forEach(t => {
    const inside = t.in && !t.out;
    h += '<div class="card" style="margin-top:6px' + (inside ? ';border-color:var(--amber)' : '') + '"><div class="row" style="justify-content:space-between"><b>' + esc(t.name) + '</b><span class="small">' + (t.in ? 'In ' + fmtT(t.in) : '') + (t.out ? ' · Out ' + fmtT(t.out) : '') + (inside ? ' · <b class="amber num">' + fmtDur(now() - t.in) + '</b>' : '') + '</span></div>';
    h += '<div class="chips" style="margin-top:6px">' + chip('External', t.mode === 'external', 'baMode', { id: t.id, v: 'external' }) + chip('Internal', t.mode === 'internal', 'baMode', { id: t.id, v: 'internal' }) + '</div>';
    if (t.mode === 'internal') h += '<div class="chips" style="margin-top:6px">' + chip('Left hand search', t.pattern === 'Left hand', 'baPat', { id: t.id, v: 'Left hand' }) + chip('Right hand search', t.pattern === 'Right hand', 'baPat', { id: t.id, v: 'Right hand' }) + '</div>';
    h += '<input type="text" id="bt_' + t.id + '" data-bind="ba.teams.#' + t.id + '.names" value="' + esc(t.names || '') + '" placeholder="Names or count (optional)" style="margin-top:6px">';
    h += '<div class="row" style="margin-top:6px">' + (!t.in ? btn('Entered', 'baIn', 'sm warn', { id: t.id }) : !t.out ? btn('Exited', 'baOut', 'sm go', { id: t.id }) : '<span class="green small">Out</span>') + (!t.in ? btn('Remove', 'baRm', 'sm ghost', { id: t.id }) : '') + '</div></div>';
  });
  h += '<label class="f">Add team</label><div class="chips">' + [1, 2, 3, 4, 5, 6].map(n => { const nm = 'Team ' + n; const has = b.teams.some(t => t.name === nm); return chip(nm, has, has ? 'noop' : 'baAddN', { v: nm }); }).join('') + '</div>';
  return h;
};
function noRitDanger(inc) { return inc.ba.rit === 'none' && inc.ba.teams.some(t => t.mode === 'internal' && !t.out); }
/* ---- Radio signals ---- */
const SIGNALS = [['5-5', 'Hostile act, significant violence or terrorism', 'Radio signal 5-5: hostile act'], ['4-0', 'Urgent police, crew or public under threat', 'Radio signal 4-0: urgent police attendance requested'], ['5-6', 'Police attendance (non-urgent)', 'Radio signal 5-6: police requested (non-urgent)'], ['8-3', 'Deceased person', 'Radio signal 8-3: deceased person'], ['2-7', 'CIS / peer support required', 'Radio signal 2-7: peer support requested']];
SHEETS.signals = () => sheetHd('Radio signals') + '<div class="stack">' + SIGNALS.map(([c, m]) => '<button class="btn big" data-a="sigTap" data-v="' + c + '" style="text-align:left"><span style="font-size:1.3em">' + c + '</span> <span class="small" style="font-weight:500">' + esc(m) + '</span></button>').join('') + '</div>';
/* ---- Notes & calls ---- */
SHEETS.notes = s => {
  const inc = curInc(); let h = sheetHd('Notes & phone calls');
  h += '<label class="f">Incident notes</label>' + ta('notes', inc.notes, 'Anything worth keeping. Goes in the export.');
  h += '<div class="chips" style="margin-top:6px">' + ['Left in black, patrol advised', 'VicEmergency 24 hr request', 'Owner to call back', 'Owner / occupier details: '].map(x => chip('+ ' + x, false, 'noteIns', { v: x })).join('') + '</div>';
  h += '<h3>Log a phone call</h3><input type="text" id="call_who" data-sbind="who" value="' + esc(s.who || '') + '" placeholder="Who (e.g. DDO, landholder)"><input type="text" id="call_what" data-sbind="what" value="' + esc(s.what || '') + '" placeholder="What was decided" style="margin-top:6px"><div style="margin-top:6px">' + btn('Log call', 'callLog', 'full go') + '</div>';
  if (inc.calls.length) h += '<div class="log" style="margin-top:8px">' + inc.calls.map(c => '<div class="e"><span class="tm">' + fmtT(c.t) + '</span><span><b>' + esc(c.who) + '</b>: ' + esc(c.what) + '</span></div>').join('') + '</div>';
  return h;
};
SHEETS.conditions = () => sheetHd('Conditions') + '<p class="muted">Optional. Skip if you are busy.</p>' + condForm(curInc()) + '<div style="margin-top:10px">' + btn('Log conditions now', 'condLog', 'full') + '</div>';
SHEETS.origin = () => { const inc = curInc(); return sheetHd('Point of origin') + inp('origin', inc.origin, 'e.g. base of tree, 30 m in from Mahers Rd gate') + '<div style="margin-top:10px">' + btn('Save', 'originSave', 'full go') + '</div>'; };
SHEETS.log = s => {
  const inc = curInc(); let h = sheetHd('Log');
  h += '<div class="row"><div class="grow"><input type="text" id="log_add" data-sbind="text" value="' + esc(s.text || '') + '" placeholder="Add a log entry"></div>' + btn('Log', 'logAdd', 'sm go') + '</div>';
  h += '<div class="log" style="margin-top:8px">' + inc.log.slice().reverse().map(e => '<div class="e' + (e.late ? ' late' : '') + '"><span class="tm num">' + fmtTS(e.t) + '</span><span>' + esc(e.text) + (e.late ? ' <b>(late note)</b>' : '') + (e.post ? ' <span class="dim">(after handover)</span>' : '') + '</span></div>').join('') + '</div>';
  return h;
};
/* ---- Returning / close out ---- */
SHEETS.returning = () => {
  const inc = curInc(); const inside = baInside(inc); const others = inc.apps.filter(a => !a.mine && a.status === 'onscene');
  let h = sheetHd('Mark ' + inc.myApp + ' returning?');
  if (inside.length) return h + '<div class="banner amber"><b>Blocked:</b> ' + inside.length + ' BA team(s) still inside. Log them out first.</div>' + btn('Open BA', 'sheet', 'full', { t: 'ba' });
  h += '<p>This stops the timers and leaves the fireground.</p>';
  if (inc.mode === 'control' && others.length && !inc.handover) h += '<div class="banner amber">' + others.length + ' appliance(s) still on scene. Who takes control? ' + btn('Hand over control first', 'startHandover', 'sm') + '</div>';
  h += '<div class="stack" style="margin-top:12px">' + btn('Yes, returning', 'doReturning', 'big danger') + btn('Cancel', 'closeSheet', 'ghost') + '</div>';
  return h;
};
SHEETS.closeout = () => sheetHd('Close out incident?') + '<p>Timers are stopped. Close out now, or keep the job open and come back to it.</p><div class="stack">' + btn('Close out incident', 'closeOut', 'big go') + btn('Continue (not closed out)', 'continueLater', 'big') + '</div>';
