/* ===== Incident model and logic ===== */
const ST_LABEL = { paged: 'Paged', enroute: 'En route', onscene: 'On scene', water: 'Out for water', released: 'Released', cancelled: 'Cancelled en route', returning: 'Returning', rehab: 'Crew in rehab' };
const AG_ST = { requested: 'Requested', onscene: 'On scene', left: 'Left scene' };
const CON_ST = { requested: 'Requested', approved: 'DDO approved', onscene: 'On scene', left: 'Left scene' };
const AGENCIES = [['Police', '5-6'], ['Ambulance (AV)', ''], ['SES', ''], ['Power company', ''], ['Gas company', ''], ['Council', ''], ['DTP / VicRoads', ''], ['FFMVic', ''], ['EPA', ''], ['Water authority', '']];
const HAZARDS = ['Traffic', 'Tree fall zone', 'Power lines', 'Gas', 'Smoke over road', 'Fuel / chemical spill', 'Asbestos', 'Unstable structure', 'Livestock / animals', 'Steep / uneven ground', 'Hollow trees / falling limbs', 'Water / flooding', 'Sharp edges / glass', 'Airbags / SRS', 'Batteries / EV', 'Members of public'];

function newIncident(myApp) {
  const t = now();
  return {
    id: uid(), created: t, updated: t, status: 'active', mode: 'control', locked: false,
    myApp, pageTime: t, p: {}, kind: '', name: '', controlName: '', cp: { type: 'static', loc: '' },
    fg: { state: 'confirmed', ch: S.settings.defaultFg }, onSceneAt: null,
    apps: [], agencies: [], contractors: [], roads: [], hazards: [], tactics: [], tacticNotes: {},
    ba: { control: false, who: '', ch: '', pattern: '', teams: [], rit: '' },
    wordbacks: [], sitreps: [], messages: [], calls: [], conditions: {}, origin: '', notes: '',
    sitrepDue: null, timersStopped: false, ack: 0, remind: [], unreported: [],
    underControlAt: null, stopAt: null, stopVariant: '', handover: null, afterNotes: '',
    wrap: {}, summary: { injuries: 'None', medium: [] }, exportedAt: null, firsDone: false, log: []
  };
}
function appByName(inc, n) { return inc.apps.find(a => a.callsign === n); }
function myApp(inc) { return inc.apps.find(a => a.mine); }
function addApp(inc, o, status) {
  const a = { id: uid(), callsign: o.callsign, code: o.code || '', frv: !!o.frv || /^P\d/.test(o.code || ''), brigadeOnly: !!o.brigadeOnly, mine: !!o.mine, status: status || 'paged', hist: [{ t: now(), s: status || 'paged' }], crew: '', oic: '', task: null, tasks: [], onSince: null, rehabDue: null };
  inc.apps.push(a); return a;
}
function setAppStatus(inc, a, s, opts) {
  const prev = a.status; if (prev === s) return;
  const t = now(); a.status = s; a.hist.push({ t, s });
  const plain = { paged: 'paged', enroute: 'en route', onscene: 'on scene', water: 'out for water', released: 'released from scene', cancelled: 'cancelled en route', returning: 'returning', rehab: 'crew to rehab' }[s];
  if (s === 'enroute' && a.mine) logE(a.callsign + ' turning out');
  else if (s === 'onscene' && prev === 'water') logE(a.callsign + ' back on scene');
  else if (s === 'onscene' && prev === 'rehab') logE(a.callsign + ' crew back from rehab');
  else logE(a.callsign + ' ' + plain);
  if (s === 'onscene' && prev === 'rehab') { a.rehabDue = t + S.settings.rehabWork * 60000; a.rehabBack = null; }
  if (s === 'onscene' && prev !== 'water' && prev !== 'rehab') { a.onSince = t; a.rehabDue = t + S.settings.rehabWork * 60000; }
  if (s === 'rehab') { a.rehabBack = t + ((S.settings.rehabLen || 20) + S.settings.rehabRest) * 60000; }
  if (s === 'released' || s === 'cancelled' || s === 'returning') { inc.unreported = inc.unreported.filter(x => x !== a.id); }
}
function counts(inc) {
  const c = { onscene: 0, enroute: 0, paged: 0, water: 0 };
  inc.apps.forEach(a => { if (a.status === 'onscene' || a.status === 'rehab') c.onscene++; else if (c[a.status] != null) c[a.status]++; });
  return c;
}
function countsText(inc) { const c = counts(inc); const p = []; if (c.onscene) p.push(c.onscene + ' on scene'); if (c.enroute) p.push(c.enroute + ' en route'); if (c.water) p.push(c.water + ' out for water'); if (c.paged) p.push(c.paged + ' paged'); return p.join(', ') || 'None yet'; }
function controlLabel(inc) { return inc.controlName || (inc.myApp || 'Kiewa Tanker 1'); }
function baInside(inc) { return inc.ba.teams.filter(t => t.in && !t.out); }
function contractorsOpen(inc) { return inc.contractors.filter(c => c.status === 'onscene' || (c.runs || []).some(r => !r.end)); }
function areaBrigade(inc) { return brigadeByCode(inc.p.areaCode || ''); }
function defaultControl(inc) { const b = areaBrigade(inc); return b ? b.control : (S.settings.brigade + ' Control'); }
function roadControl(inc) { const r = roadName(inc.p || {}); const w = titleCase(r).split(' ')[0]; return w ? w + ' Control' : ''; }

/* ---- timers ---- */
function dueInfo(inc) {
  if (!inc || inc.timersStopped || inc.mode !== 'control' || !inc.onSceneAt || inc.status !== 'active') return null;
  if (!inc.wordbacks.length) return { kind: 'wordback', label: 'Wordback due', due: inc.onSceneAt + S.settings.wbMin * 60000 };
  if (inc.sitrepDue) return { kind: 'sitrep', label: inc.sitreps.length ? 'Next sitrep' : 'First sitrep', due: inc.sitrepDue };
  return null;
}
function reminders(inc) {
  const r = [];
  if (!inc || inc.status !== 'active') return r;
  const t = now();
  if (inc.mode === 'control' && !inc.timersStopped) inc.apps.forEach(a => { if ((a.status === 'onscene') && a.rehabDue && t >= a.rehabDue && !a.brigadeOnly) r.push({ k: 'rehab', id: a.id, text: a.callsign + ' crew due rehab', cls: 'amber' }); });
  inc.apps.forEach(a => { if (a.status === 'rehab' && a.rehabBack && t >= a.rehabBack) r.push({ k: 'rehabback', id: a.id, text: a.callsign + ' rehab done?', cls: 'green' }); });
  if (inc.unreported.length && inc.mode === 'control') r.push({ k: 'arrivals', text: inc.unreported.length + ' arrival' + (inc.unreported.length > 1 ? 's' : '') + ' not told to FireCom', cls: 'amber' });
  inc.remind.forEach(x => r.push({ k: 'msg', id: x.id, text: x.text, cls: 'amber' }));
  if (inc.mode === 'control' && inc.ba.teams.some(t => t.mode === 'internal' && !t.out) && !inc.ba.rit) r.push({ k: 'rit', text: 'Internal BA: RIT not set', cls: 'red' });
  const ab = areaBrigade(inc);
  if (inc.mode === 'control' && ab && ab.code !== S.settings.homeCode.replace(/^C/, '') && !inc.handover) {
    const on = inc.apps.find(a => a.status === 'onscene' && (a.callsign.indexOf(ab.name) === 0));
    if (on && !inc.hoDismissed) r.push({ k: 'handover', text: ab.name + ' on scene. Hand over control?', cls: 'green' });
  }
  extraReminders(inc, r);
  return r;
}

/* ---- scripts (radio codes) and plain-English log ---- */
function fgPhrase(inc) {
  if (inc.fg.state === 'notneeded') return '';
  if (inc.fg.state === 'na') return ' Fireground channel not available.';
  return ' Fireground ' + inc.fg.ch + '.';
}
function onSceneScript(inc) { return 'FireCom, ' + inc.myApp + ', on scene, now known as ' + controlLabel(inc) + '.' + fgPhrase(inc); }
const RES = [
  { k: 'police', label: 'Police (5-6)', radio: '5-6', plain: 'police (non-urgent)', agency: 'Police' },
  { k: 'police40', label: 'Police URGENT (4-0)', radio: '4-0', plain: 'police URGENT', agency: 'Police' },
  { k: 'av', label: 'Ambulance', radio: 'Ambulance', plain: 'ambulance', agency: 'Ambulance (AV)' },
  { k: 'rescue', label: 'Rescue', radio: 'Rescue', plain: 'rescue' },
  { k: 'tankers', label: 'Make tankers #', radio: 'make tankers', plain: 'make tankers' },
  { k: 'ba', label: 'BA support', radio: 'BA support', plain: 'BA support' },
  { k: 'air', label: 'Aircraft', radio: 'aircraft', plain: 'aircraft' },
  { k: 'frv', label: 'FRV', radio: 'FRV', plain: 'FRV' },
  { k: 'pa', label: 'Check P and A notified', radio: 'confirm police and ambulance notified', plain: 'confirm police and ambulance notified' },
  { k: 'power', label: 'Power company', radio: 'power company', plain: 'power company', agency: 'Power company' },
  { k: 'contractor', label: 'Contractor / machinery', radio: 'contractor', plain: 'contractor', contractor: true }
];
function radioFrom() {
  const st = S.settings; const rank = (st.rank || '').replace(/^\d+(st|nd|rd|th)\s+/i, '').trim();
  const sur = (st.name || '').trim().split(/\s+/).pop();
  return sur ? (rank ? rank + ' ' : '') + sur : (rank ? rank + ' ' : '') + '[your name]';
}
function wbScript(inc, d) {
  const st = WB_STATUS[d.status] || {};
  let s = 'FireCom, wordback from ' + radioFrom() + ', ' + (d.status === 'falsealarm' ? 'false alarm' : wbType(inc).toLowerCase()) + (d.desc ? ', ' + d.desc : '') + ', ' + (st.radio || '') + '.';
  const req = (d.res || []).map(k => { const r = RES.find(x => x.k === k); if (!r) return ''; if (k === 'tankers') return 'make tankers ' + (d.tankers || 2); if (k === 'contractor') return 'contractor' + (d.contractorType ? ' (' + d.contractorType.toLowerCase() + ')' : ''); return r.radio; }).filter(Boolean);
  if (req.length) s += ' Request ' + req.join(', ') + '.';
  if (d.extra) s += ' ' + d.extra.trim();
  return s;
}
const WB_STATUS = {
  investigating: { label: 'Investigating', radio: 'investigating', plain: 'Investigating' },
  nyuc: { label: 'Not yet under control', radio: 'not yet under control', plain: 'Not yet under control' },
  uc: { label: 'Under control', radio: 'under control', plain: 'Under control' },
  stop: { label: 'Stop', radio: 'stop', plain: 'Stop' },
  falsealarm: { label: 'False alarm (Stop)', radio: 'stop', plain: 'False alarm, stop' },
  noaction: { label: 'No action (Stop)', radio: 'no action required, stop', plain: 'No action required, stop' }
};
function lastWbStatus(inc) { const w = inc.wordbacks[inc.wordbacks.length - 1]; return w ? w.status : ''; }

const TASKS = {
  attack: 'Fire attack', pump: 'Primary pump / water supply', boost: 'Water boosting / hydrant changeover', transport: 'Water transport', ba: 'BA crews',
  standby: 'Standby / post up', asset: 'Asset protection', assetassist: 'Asset protection assist', monitor: 'Monitoring / blacking out', mopup: 'Mop up', rehab: 'Rehab', road: 'Road position', other: 'Other'
};
const ATTACK_SUB = {
  struc: ['Offensive internal', 'Defensive external', 'Exposure protection', 'Ventilation'],
  gs: ['Direct head', 'Flank left', 'Flank right', 'Rear / anchor point', 'Parallel', 'Patrol', 'Defensive'],
  veh: ['Attack', 'Fuel spill / foam'], mva: ['Attack', 'Fuel spill / foam'], nostc: ['Attack', 'Fuel spill / foam', 'Defensive'],
  more: ['Direct attack', 'Indirect attack', 'Defensive', 'Exposure protection', 'Containment', 'Overhaul']
};
function normTask(t) { if (!t) return { types: [] }; if (!t.types) t.types = t.type ? [t.type] : []; return t; }
function taskText(t) { if (!t) return ''; t = normTask(t); let s = t.types.map(k => k === 'attack' && t.sub ? 'Fire attack: ' + t.sub : (TASKS[k] || k)).join(' + '); if (t.loc) s += ' @ ' + t.loc; if (t.target) s += ' [' + t.target + ']'; if (t.lines) s += ' (' + t.lines + ' line' + (t.lines > 1 ? 's' : '') + ')'; return s; }

const TACTICS = {
  struc: ['Size-up / 360 done', 'Power isolated', 'Gas isolated', 'Water supply established', 'External attack', 'Internal attack', 'Primary search', 'Secondary search', 'No one inside', 'Ventilation', 'Exposures protected', 'Salvage / overhaul', 'Atmospheric monitoring'],
  gs: ['Anchor point established', 'Flank left', 'Flank right', 'Direct head attack', 'Parallel attack', 'Defensive / asset protection', 'Edge blacked out', 'Patrol arranged', 'Spot fires checked', 'Landholder contacted'],
  veh: ['Vehicle stabilised', 'Battery isolated', 'Fire knocked down', 'Fuel leak contained', 'Foam applied', 'Occupants accounted for', 'Run-off contained'],
  mva: ['Scene safe / traffic managed', 'Vehicle(s) stabilised', 'Battery isolated', 'Fuel leak contained', 'Patients accounted for', 'Fire protection line', 'Hand over to rescue / AV'],
  alarm: ['Panel checked', 'Zone identified', 'Area searched', 'Cause found', 'Alarm reset', 'Owner / keyholder contacted'],
  hazmat: ['Upwind / uphill approach', 'Exclusion zone set', 'Source identified', 'Leak isolated', 'Spill contained', 'EPA / authority notified', 'Decon set up'],
  resc: ['Scene safe', 'Patient(s) accounted for', 'Stabilisation', 'Access gained', 'Hand over to rescue / AV'],
  inc: ['Scene safe', 'Hazard identified', 'Area cordoned', 'Hazard made safe', 'Relevant authority notified'],
  nostc: ['Scene safe', 'Fire knocked down', 'Exposures protected', 'Run-off contained', 'Overhaul complete']
};
