/* ===== Handover, end of job, export, settings ===== */
SCREENS.handover = () => {
  const inc = S.cur; const d = inc.hoDraft; const st = d.step;
  let h = '<div class="wrap" style="padding-top:calc(12px + env(safe-area-inset-top,0px))"><div class="row" style="justify-content:space-between">' + btn('Cancel', 'hoCancel', 'sm ghost') + '<span class="muted">Hand over control · ' + st + ' of 5</span></div>';
  h += '<div class="steps">' + [1, 2, 3, 4, 5].map(n => '<i class="' + (n <= st ? 'on' : '') + '"></i>').join('') + '</div>';
  if (st === 1) {
    h += '<h1>Who to?</h1><label class="f">Taking control</label><div class="chips">';
    const ab = areaBrigade(inc); const opts = [];
    if (ab && ab.name !== S.settings.brigade) opts.push(ab.name); ['FRV', 'VicPol', 'SES', 'FFMVic', 'Ambulance Victoria'].forEach(x => opts.push(x));
    opts.forEach(o => { h += chip(o, d.to === o, 'hoTo', { v: o }); });
    h += '</div><input type="text" id="ho_to" data-hbind="to" value="' + esc(d.to || '') + '" placeholder="Brigade or agency" style="margin-top:6px">';
    h += '<label class="f">Incoming IC name</label><input type="text" id="ho_name" data-hbind="name" value="' + esc(d.name || '') + '" placeholder="Name">';
    h += '<label class="f">Their appliance</label><div class="chips">' + inc.apps.filter(a => a.status === 'onscene' && !a.mine).map(a => chip(a.callsign, d.app === a.callsign, 'hoApp', { v: a.callsign })).join('') + '</div><input type="text" id="ho_app" data-hbind="app" value="' + esc(d.app || '') + '" placeholder="Appliance" style="margin-top:6px">';
    h += '<label class="f">New control name (if it changes)</label><input type="text" id="ho_ctl" data-hbind="control" value="' + esc(d.control || controlLabel(inc)) + '">';
  } else if (st === 2) {
    h += '<h1>Brief</h1><p class="muted">Built from the log. Talk them through it.</p>';
    smeacs(inc).forEach(([l, n, items]) => { h += '<div class="card" style="margin-top:6px"><b>' + l + ' · ' + n + '</b><div class="small">' + items.map(esc).join('<br>') + '</div></div>'; });
    h += '<div class="check' + (d.briefed ? ' done' : '') + '" data-a="hoBriefed" style="margin-top:10px"><span class="bx">' + (d.briefed ? '✓' : '') + '</span><div><b>Briefed</b>' + (d.briefed ? '<div class="small muted">' + fmtT(d.briefed) + '</div>' : '') + '</div></div>';
  } else if (st === 3) {
    h += '<h1>Open items</h1><p class="muted">Tick each one as handed over.</p>';
    const items = openItems(inc);
    if (!items.length) h += '<p class="dim">Nothing open. Nice and tidy.</p>';
    items.forEach(it => { const ok = d.items[it]; h += '<div class="check' + (ok ? ' done' : '') + '" data-a="hoItem" data-v="' + esc(it) + '"><span class="bx">' + (ok ? '✓' : '') + '</span><div>' + esc(it) + (ok ? '<div class="small muted">Handed over ' + fmtT(ok) + '</div>' : '') + '</div></div>'; });
  } else if (st === 4) {
    const txt = 'FireCom, ' + (d.control || controlLabel(inc)) + ', control handed to ' + (d.name || '[name]') + ', ' + (d.app || d.to || '[appliance]') + '.';
    h += '<h1>Tell FireCom</h1>' + script(txt);
    h += '<div style="margin-top:12px">' + (d.sent ? '<p class="green"><b>Sent ' + fmtT(d.sent) + '</b></p>' : btn('Sent', 'hoSent', 'big go')) + '</div>';
  } else if (st === 5) {
    h += '<h1>What now for you?</h1><div class="stack">' + btn('Stay as log only', 'hoFinish', 'big', { v: 'logonly' }) + '<p class="small muted">Banner shows you are not in control, timers off, keep logging. "Resume control" if it comes back.</p>' + btn('End tracking', 'hoFinish', 'big go', { v: 'end' }) + '<p class="small muted">Goes to the end-of-job screens. The summary covers up to the handover.</p></div>';
  }
  h += '<div class="row" style="margin-top:16px">' + (st > 1 ? btn('Back', 'hoStep', 'grow ghost', { v: -1 }) : '') + (st < 5 ? btn('Next', 'hoStep', 'grow go', { v: 1 }) : '') + '</div>';
  return h + '</div>';
};
function openItems(inc) {
  const o = [];
  contractorsOpen(inc).forEach(c => o.push('Contractor: ' + c.type + (c.company ? ' (' + c.company + ')' : '') + ' on scene'));
  inc.agencies.filter(a => a.status !== 'left').forEach(a => o.push('Agency: ' + a.name + ' ' + AG_ST[a.status].toLowerCase()));
  inc.roads.filter(r => !r.open).forEach(r => o.push('Road closed: ' + r.road));
  baInside(inc).forEach(t => o.push('BA team inside: ' + t.name));
  inc.hazards.filter(x => x.status !== 'removed').forEach(x => o.push('Hazard: ' + x.name + ' (' + x.status + ')'));
  if (/VicEmergency/i.test(inc.notes)) o.push('VicEmergency 24 hr request');
  if (/owner to call back/i.test(inc.notes)) o.push('Owner callback');
  inc.apps.filter(a => !a.mine && ['onscene', 'enroute', 'water', 'rehab'].includes(a.status)).forEach(a => o.push('Appliance: ' + a.callsign + ' ' + ST_LABEL[a.status].toLowerCase()));
  return o;
}

/* ---------- End of job ---------- */
function wrapItems(inc) {
  const fam = famOf(inc); const L = [];
  const add = (label, auto, block) => L.push({ label, auto: !!auto, block: !!block });
  const cOpen = inc.contractors.filter(c => c.status !== 'left');
  if (inc.contractors.length) add('Contractor departure times logged', !cOpen.length, true);
  if (inc.contractors.some(c => (c.runs || []).some(r => !r.end))) add('Contractor machines stopped', false, true);
  add('All appliances accounted for', inc.apps.every(a => ['released', 'cancelled', 'returning'].includes(a.status) || a.brigadeOnly || a.mine));
  if (inc.roads.length) add('Roads reopened', inc.roads.every(r => r.open));
  if (inc.agencies.length) add('Agencies left scene', inc.agencies.every(a => a.status === 'left'));
  if (inc.ba.teams.length) add('All BA teams out', !baInside(inc).length, true);
  if (inc.hazards.some(x => x.name === 'Power lines')) add('Power company notified', inc.agencies.some(a => a.name === 'Power company'));
  if (isFire(inc)) add('Point of origin recorded', !!inc.origin);
  if (fam === 'gs') { add('Edge blacked out / left in black', inc.tactics.some(t => /black/i.test(t.item)) || /black/i.test(inc.notes)); add('Landholder contacted', inc.tactics.some(t => /Landholder/.test(t.item))); }
  if (fam === 'struc') { add('Power and gas isolated', ['Power isolated', 'Gas isolated'].every(x => inc.tactics.some(t => t.item === x))); add('Search complete / no one inside', inc.tactics.some(t => /search|No one/i.test(t.item))); add('Owner / occupier details', !!inc.summary.owner); }
  if (fam === 'veh' || fam === 'mva') { add('Fuel / run-off dealt with', inc.tactics.some(t => /Fuel|Run-off/i.test(t.item))); add('Vehicle handed to police / tow', false); }
  if (fam === 'alarm') add('Alarm reset / keyholder contacted', inc.tactics.some(t => /reset|keyholder/i.test(t.item)));
  if (fam === 'hazmat') add('EPA / authority notified', inc.tactics.some(t => /EPA/.test(t.item)));
  add('Crews rehabbed / welfare checked', false);
  add('Equipment accounted for', false);
  return L;
}
SCREENS.endjob = () => {
  const inc = S.cur; const st = inc.endStep || 1;
  let h = '<div class="wrap" style="padding-top:calc(12px + env(safe-area-inset-top,0px))"><div class="row" style="justify-content:space-between">' + btn('Back to incident', 'endBackInc', 'sm ghost') + '<span class="muted">End of job · ' + st + ' of 3</span></div>';
  h += '<div class="steps">' + [1, 2, 3].map(n => '<i class="' + (n <= st ? 'on' : '') + '"></i>').join('') + '</div>';
  if (st === 1) {
    h += '<h1>Wrap-up checklist</h1><p class="muted">Amber = not done yet. Red = must be done before you can finish.</p>';
    wrapItems(inc).forEach(it => {
      const ok = it.auto || inc.wrap[it.label];
      h += '<div class="check' + (ok ? ' done' : it.block ? ' block' : ' miss') + '" data-a="' + (it.block && !it.auto ? 'wrapBlocked' : 'wrapTap') + '" data-v="' + esc(it.label) + '"><span class="bx">' + (ok ? '✓' : '') + '</span><div>' + esc(it.label) + (it.auto ? '<div class="small muted">From the log</div>' : '') + '</div></div>';
    });
  } else if (st === 2) {
    const s = inc.summary;
    h += '<h1>Summary</h1><div class="card"><dl class="kv"><dt>What</dt><dd>' + esc(wbType(inc) + (inc.kind ? ' · ' + inc.kind : '')) + '</dd><dt>Where</dt><dd>' + esc(titleCase(inc.p.address)) + '</dd><dt>Control</dt><dd>' + esc(controlLabel(inc)) + '</dd><dt>Paged</dt><dd>' + fmtTS(inc.pageTime) + '</dd><dt>On scene</dt><dd>' + fmtTS(inc.onSceneAt) + '</dd>' + (inc.underControlAt ? '<dt>Under control</dt><dd>' + fmtTS(inc.underControlAt) + '</dd>' : '') + (inc.stopAt ? '<dt>Stop</dt><dd>' + fmtTS(inc.stopAt) + '</dd>' : '') + '<dt>Appliances</dt><dd>' + inc.apps.length + '</dd></dl></div>';
    h += '<label class="f">Property / land use</label><div class="chips">' + ['Residential', 'Farm / rural', 'Grazing', 'Cropping', 'Roadside', 'Commercial', 'Public land', 'Plantation'].map(x => chip(x, s.land === x, 'sumLand', { v: x })).join('') + '</div>';
    h += '<label class="f">Extinguishing medium</label><div class="chips">' + ['Water', 'Foam', 'Wetting agent', 'Dry chem', 'CO2', 'Earth / machinery', 'Rake hoe', 'None'].map(x => chip(x, (s.medium || []).includes(x), 'sumMed', { v: x })).join('') + '</div>';
    h += '<label class="f">Hazmat</label>' + inp('summary.hazmat', s.hazmat || '', 'None');
    h += '<label class="f">Injuries</label>' + inp('summary.injuries', s.injuries, 'None');
    h += '<label class="f">Owner / occupier</label>' + inp('summary.owner', s.owner || '', 'Name, phone, relationship');
    h += '<label class="f">Area burnt / damage</label>' + inp('summary.damage', s.damage || '', 'e.g. 2 ha grass, 50 m fence');
    if (inc.contractors.length) h += '<label class="f">Contractor hours</label><div class="card small">' + inc.contractors.map(c => esc(c.type + (c.company ? ' (' + c.company + ')' : '') + ': on scene ' + fmtT(tOf(c, 'onscene')) + ', left ' + fmtT(tOf(c, 'left')) + ', machine ' + fmtHrs(machineMs(c)))).join('<br>') + '</div>';
    h += '<label class="f">Notes</label>' + ta('notes', inc.notes, '');
    if (inc.handover && inc.handover.doneAt) h += '<label class="f">After handover (kept separate)</label>' + ta('afterNotes', inc.afterNotes, 'What happened after you handed over');
  } else if (st === 3) {
    h += '<h1>Review and export</h1>';
    h += exportButtons(inc);
    h += '<pre class="out" id="exportText">' + esc(exportText(inc)) + '</pre>';
  }
  const blocked = st === 1 && wrapItems(inc).some(it => it.block && !it.auto);
  h += '<div class="row" style="margin-top:16px">' + (st > 1 ? btn('Back', 'endStep', 'grow ghost', { v: -1 }) : '') + (st < 3 ? btn(blocked ? 'Fix red items first' : 'Next', 'endStep', 'grow go', { v: 1 }) : '') + '</div>';
  return h + '</div>';
};
function tOf(x, s) { const e = (x.hist || []).filter(h => h.s === s).pop(); return e ? e.t : null; }
function exportButtons(inc) {
  let h = '<div class="stack">';
  if (!inc.locked) h += btn('Finish and lock', 'lockInc', 'big go');
  else h += '<div class="lockbar">Locked ' + fmtDT(inc.exportedAt) + '. Late notes get flagged.</div>';
  h += '<div class="row">' + btn('Copy text (FIRS)', 'expCopy', 'grow') + btn('Share .txt', 'expTxt', 'grow') + btn('PDF', 'expPdf', 'grow') + '</div>';
  h += '<div class="check' + (inc.firsDone ? ' done' : ' miss') + '" data-a="firsTap"><span class="bx">' + (inc.firsDone ? '✓' : '') + '</span><div>' + (inc.firsDone ? 'FIRS done' : 'To do: FIRS') + '</div></div>';
  return h + '</div>';
}
SCREENS.review = () => {
  const inc = S.cur;
  let h = '<div class="wrap" style="padding-top:calc(12px + env(safe-area-inset-top,0px))"><div class="row" style="justify-content:space-between">' + btn('Home', 'goHome', 'sm ghost') + btn('Open dashboard', 'reopenInc', 'sm') + '</div>';
  h += '<h1>' + esc(inc.name || 'Incident') + '</h1><p class="muted">' + fmtDT(inc.pageTime) + '</p>' + exportButtons(inc);
  h += '<label class="f">Add a late note</label><div class="row"><div class="grow"><input type="text" id="late_note" data-sbind="late" placeholder="Flagged as a late note"></div>' + btn('Add', 'lateNote', 'sm') + '</div>';
  h += '<pre class="out" id="exportText">' + esc(exportText(inc)) + '</pre>';
  h += '<div style="margin-top:16px">' + btn('Delete this incident', 'delInc', 'full danger') + '</div>';
  return h + '</div>';
};

/* ---------- Export text ---------- */
function exportText(inc) {
  const L = []; const hr = '----------------------------------------';
  const cut = inc.handover && inc.handover.doneAt ? inc.handover.doneAt : Infinity;
  L.push(inc.training ? 'WORDBACK TRAINING EXERCISE (NOT A REAL INCIDENT)' : 'WORDBACK INCIDENT SUMMARY'); L.push(hr);
  L.push('Incident: ' + (inc.name || '')); L.push('Incident no: ' + (inc.p.incNo || '')); L.push('Date: ' + fmtD(inc.pageTime));
  L.push('Call type: ' + (inc.p.codeRaw || inc.p.code || '') + ' ' + wbType(inc) + (inc.kind ? ' / ' + inc.kind : ''));
  L.push('Address: ' + titleCase(inc.p.address || '') + (inc.p.cross && inc.p.cross.length ? ' (x ' + inc.p.cross.map(titleCase).join(' / ') + ')' : ''));
  if (inc.p.map) L.push('Map: ' + inc.p.map + (inc.p.grid ? ' (' + inc.p.grid + ')' : ''));
  L.push('Area brigade: ' + (areaBrigade(inc) ? areaBrigade(inc).name : (inc.p.areaCode || '')));
  L.push('Control: ' + controlLabel(inc) + ' · CP ' + inc.cp.type + (inc.cp.loc ? ': ' + inc.cp.loc : ''));
  L.push('Incident level: ' + (inc.level || 1) + (truckCount(inc) ? ' (' + truckCount(inc) + ' trucks)' : ''));
  L.push('Fireground: ' + (inc.fg.state === 'confirmed' ? inc.fg.ch : inc.fg.state === 'na' ? 'not available' : 'not needed'));
  L.push('Prepared by: ' + [S.settings.rank, S.settings.name].filter(Boolean).join(' ') + (S.settings.brigade ? ', ' + S.settings.brigade : '') + ' (' + inc.myApp + ')');
  if (inc.handover && inc.handover.doneAt) L.push('NOTE: summary covers up to handover at ' + fmtT(inc.handover.doneAt) + '.');
  L.push(''); L.push('KEY TIMES'); L.push(hr);
  const kt = [['Paged', inc.pageTime], ['Turning out', tOf(myApp(inc) || {}, 'enroute')], ['On scene', inc.onSceneAt], ['First wordback', inc.wordbacks[0] && inc.wordbacks[0].t], ['Under control', inc.underControlAt], ['Stop', inc.stopAt], ['Handover', inc.handover && inc.handover.doneAt], ['Returning', tOf(myApp(inc) || {}, 'returning')]];
  kt.forEach(([k, t]) => { if (t) L.push(k.padEnd(16) + fmtTS(t)); });
  if (inc.conditions && Object.values(inc.conditions).some(Boolean)) { const c = inc.conditions; L.push(''); L.push('Conditions: ' + [c.temp && c.temp + 'C', c.wind && c.wind + ' km/h', c.dir && 'from ' + c.dir, c.rh && c.rh + '% RH', c.notes].filter(Boolean).join(', ')); }
  if (inc.origin) L.push('Point of origin: ' + inc.origin);
  L.push(''); L.push('WORDBACKS AND SITREPS'); L.push(hr);
  [].concat(inc.wordbacks.map(w => [w.t, 'Wordback: ' + w.plain]), inc.sitreps.map(x => [x.t, 'Sitrep: ' + x.text.replace(/^FireCom, sitrep from [^.]*\.\s*/, '')]), inc.messages.map(m => [m.t, 'Message: ' + m.text])).sort((a, b) => a[0] - b[0]).forEach(([t, x]) => L.push(fmtT(t) + ' ' + x));
  L.push(''); L.push('APPLIANCES'); L.push(hr);
  inc.apps.forEach(a => { L.push(a.callsign + (a.code ? ' (' + a.code + ')' : '') + (a.crew ? ', crew ' + a.crew : '') + (a.oic ? ', OIC ' + a.oic : '')); L.push('   ' + a.hist.filter(x => x.t <= cut).map(x => ST_LABEL[x.s] + ' ' + fmtT(x.t)).join(', ')); if (a.tasks.length) L.push('   Taskings: ' + a.tasks.map(t => fmtT(t.t) + ' ' + taskText(t)).join('; ')); });
  if (inc.agencies.length) { L.push(''); L.push('AGENCIES'); L.push(hr); inc.agencies.forEach(a => L.push(a.name + (a.note ? ' (' + a.note + ')' : '') + ': ' + a.hist.map(x => AG_ST[x.s] + ' ' + fmtT(x.t)).join(', '))); }
  if (inc.contractors.length) { L.push(''); L.push('CONTRACTORS'); L.push(hr); inc.contractors.forEach(c => { L.push(c.type + ': ' + [c.company, c.operator, c.machine].filter(Boolean).join(', ')); L.push('   ' + c.hist.map(x => CON_ST[x.s] + ' ' + fmtT(x.t)).join(', ')); L.push('   Machine hours: ' + fmtHrs(machineMs(c)) + ((c.runs || []).length ? ' (' + c.runs.map(r => fmtT(r.start) + '-' + fmtT(r.end)).join(', ') + ')' : '')); }); }
  if (inc.roads.length) { L.push(''); L.push('ROAD CLOSURES'); L.push(hr); inc.roads.forEach(r => L.push(r.road + ': closed ' + fmtT(r.closed) + (r.reason ? ' (' + r.reason + ')' : '') + (r.by ? ' by ' + r.by : '') + ', ' + (r.open ? 'reopened ' + fmtT(r.open) + (r.reopenReason ? ' (' + r.reopenReason + ')' : '') : 'NOT REOPENED'))); }
  if (inc.hazards.length) { L.push(''); L.push('HAZARDS: ' + inc.hazards.map(x => x.name + ' (' + x.status + ')').join(', ')); }
  if (inc.tactics.length) { L.push(''); L.push('ACTIONS'); L.push(hr); inc.tactics.forEach(t => L.push(fmtT(t.t) + ' ' + t.item + (t.note ? ' (' + t.note + ')' : ''))); }
  const baAll = inc.ba.teams.concat(inc.ba.cleared || []);
  if (baAll.length) { L.push(''); L.push('BA'); L.push(hr); L.push('BA control: ' + (inc.ba.control ? (inc.ba.who || 'yes') : 'not established (IC monitored)') + ', channel ' + (inc.ba.ch || '-') + ', RIT ' + (inc.ba.rit === 'ready' ? 'ready' : inc.ba.rit === 'none' ? 'NONE' : '-')); baAll.forEach(t => { L.push(t.name + (t.names ? ' (' + t.names + ')' : '') + ': ' + (t.cyl || 0) + ' cylinder' + (t.cyl === 1 ? '' : 's') + (fatigued(t) ? ' (fatigue flag)' : '')); (t.entries || []).forEach(e => L.push('   Cyl ' + e.cyl + ' ' + e.mode + (e.pattern ? ', ' + e.pattern.toLowerCase() + ' search' : '') + ': in ' + fmtT(e.in) + ' at ' + e.bar + ' bar, out ' + fmtT(e.out) + (e.estBar != null ? ' (~' + e.estBar + ' bar est)' : ''))); (t.checks || []).forEach(c => L.push('   Pressure check ' + fmtT(c.t) + ': ' + c.bar + ' bar')); }); }
  (inc.redflags || []).forEach(r => { L.push(''); L.push('RED FLAG: ' + r.text + ' (' + fmtT(r.t) + (r.ended ? ' to ' + fmtT(r.ended) : ', still active') + ')'); Object.keys(r.apps).forEach(id => { const a = inc.apps.find(x => x.id === id) || inc.contractors.find(x => x.id === id); const st = r.apps[id]; L.push('   ' + (a ? (a.callsign || 'Contractor ' + a.type) : id) + ': notified ' + fmtT(st.notified) + ', crew confirmed ' + fmtT(st.confirmed)); }); });
  if (inc.map && inc.map.ops.length) { L.push(''); L.push('Mud map: drawn (' + inc.map.ops.length + ' items), see PDF.'); }
  if (inc.calls.length) { L.push(''); L.push('PHONE CALLS'); L.push(hr); inc.calls.forEach(c => L.push(fmtT(c.t) + ' ' + c.who + ': ' + c.what)); }
  const s = inc.summary || {};
  L.push(''); L.push('END OF JOB'); L.push(hr);
  L.push('Property / land use: ' + (s.land || '')); L.push('Extinguishing medium: ' + ((s.medium || []).join(', ') || '')); L.push('Hazmat: ' + (s.hazmat || 'None')); L.push('Injuries: ' + (s.injuries || 'None')); L.push('Owner / occupier: ' + (s.owner || '')); if (s.damage) L.push('Area / damage: ' + s.damage);
  if (inc.notes) { L.push(''); L.push('NOTES'); L.push(hr); L.push(inc.notes); }
  if (inc.handover && inc.handover.doneAt) { const ho = inc.handover; L.push(''); L.push('HANDOVER'); L.push(hr); L.push('Control handed to ' + ho.name + ' (' + ho.to + (ho.app ? ', ' + ho.app : '') + ') at ' + fmtT(ho.doneAt) + '. Briefed ' + fmtT(ho.briefed) + '.'); Object.keys(ho.items || {}).forEach(k => L.push('   Handed over: ' + k)); }
  L.push(''); L.push('LOG'); L.push(hr);
  inc.log.filter(e => !e.post).forEach(e => L.push(fmtTS(e.t) + '  ' + e.text + (e.late ? '  [LATE NOTE ' + fmtDT(e.t) + ']' : '')));
  const post = inc.log.filter(e => e.post);
  if (post.length || inc.afterNotes) { L.push(''); L.push('AFTER HANDOVER (separate)'); L.push(hr); post.forEach(e => L.push(fmtTS(e.t) + '  ' + e.text)); if (inc.afterNotes) L.push(inc.afterNotes); }
  L.push(''); L.push('Exported ' + fmtDT(inc.exportedAt || now()) + ' from Wordback v' + APP_VERSION);
  return L.join('\n');
}
function fileStem(inc) { return 'wordback-' + (inc.p.incNo || fmtD(inc.pageTime).replace(/\//g, '-')) + '-' + (inc.name || 'incident').replace(/[^\w]+/g, '-').slice(0, 30).toLowerCase(); }
async function shareOrDownload(blob, filename, title) {
  try {
    const f = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return true; }
  try {
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000); return true;
  } catch (e) { toast('Could not save the file here'); return false; }
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copied'); return; } catch (e) {}
  const x = document.createElement('textarea'); x.value = t; x.style.position = 'fixed'; x.style.opacity = '0'; document.body.appendChild(x); x.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} x.remove();
  if (ok) toast('Copied'); else { const pre = $('#exportText'); if (pre) { const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } toast('Text selected. Tap Copy.'); }
}
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => window.jspdf ? res(window.jspdf) : rej(new Error('PDF tool missing')); s.onerror = () => rej(new Error('PDF tool not available offline yet')); document.head.appendChild(s); });
  return load('jspdf.umd.min.js').catch(() => load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'));
}
async function makePdf(inc) {
  const lib = await loadJsPDF(); const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' });
  const text = exportText(inc).split('\n'); let y = 16; const left = 14, maxW = 182;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('Wordback: ' + (inc.name || 'Incident'), left, y); y += 8;
  doc.setFont('courier', 'normal'); doc.setFontSize(9);
  text.forEach(line => {
    const isHead = /^[A-Z][A-Z \/()]+$/.test(line.trim()) && line.trim().length > 2;
    doc.setFont('courier', isHead ? 'bold' : 'normal');
    doc.splitTextToSize(line || ' ', maxW).forEach(l => { if (y > 284) { doc.addPage(); y = 14; } doc.text(l, left, y); y += 4.2; });
  });
  if (inc.map && inc.map.ops.length) { doc.addPage(); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Mud map', 14, 16); doc.addImage(mapPng(inc), 'JPEG', 14, 22, 182, 182); }
  return doc.output('blob');
}
async function backupAll() {
  const data = { app: 'wordback', version: APP_VERSION, exported: new Date().toISOString(), settings: S.settings, incidents: S.incidents };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const ok = await shareOrDownload(blob, 'wordback-backup-' + new Date().toISOString().slice(0, 10) + '.json', 'Wordback backup');
  if (ok) { S.settings.lastBackup = now(); saveSettings(); }
}

/* ---------- Settings ---------- */
SCREENS.settings = () => {
  const s = S.settings;
  let h = '<div class="wrap" style="padding-top:calc(12px + env(safe-area-inset-top,0px))"><div class="row" style="justify-content:space-between">' + btn('Done', 'goHome', 'sm') + '<b>Settings</b><span></span></div>';
  h += '<h3>You</h3><div class="row"><div class="grow"><label class="f">Name</label><input type="text" id="s_name" data-setbind="name" value="' + esc(s.name) + '" placeholder="Your name"></div><div class="grow"><label class="f">Rank</label><input type="text" id="s_rank" data-setbind="rank" value="' + esc(s.rank) + '"></div></div>';
  h += '<div class="row"><div class="grow"><label class="f">Brigade</label><input type="text" id="s_brig" data-setbind="brigade" value="' + esc(s.brigade) + '"></div><div class="grow"><label class="f">Home pager code</label><input type="text" id="s_home" data-setbind="homeCode" value="' + esc(s.homeCode) + '"></div></div>';
  h += '<h3>Appliances</h3><label class="f">My brigade appliances (one per line)</label><textarea id="s_myapps" data-setlist="myAppliances">' + esc(s.myAppliances.join('\n')) + '</textarea>';
  h += '<label class="f">Default appliance</label><div class="chips">' + s.myAppliances.map(a => chip(a, s.defaultAppliance === a, 'setVal', { k: 'defaultAppliance', v: a })).join('') + '</div>';
  h += '<h3>Channels</h3><label class="f">Default fireground channel</label><div class="chips">' + s.fgList.map(c => chip(c, s.defaultFg === c, 'setVal', { k: 'defaultFg', v: c })).join('') + '</div>';
  h += '<label class="f">Fireground channel picker (comma separated)</label><input type="text" id="s_fgl" data-setcsv="fgList" value="' + esc(s.fgList.join(', ')) + '">';
  h += '<h3>Timers</h3><div class="row">' + numSet('Wordback (min after on scene)', 'wbMin') + numSet('First sitrep (min after wordback)', 'sitrepFirst') + numSet('Repeat sitrep (min)', 'sitrepRepeat') + '</div>';
  h += '<div class="row">' + numSet('BA fatigue flag at cylinder', 'baFatigue') + '</div>';
  h += '<div class="row">' + numSet('Rehab prompt after (min on scene)', 'rehabWork') + numSet('Rehab (min)', 'rehabLen') + numSet('Rest after rehab (min)', 'rehabRest') + '</div>';
  h += '<h3>Alerts and screen</h3><div class="chips">' + chip('Alert sound ' + (s.sound ? 'on' : 'off'), s.sound, 'setTog', { k: 'sound' }) + chip('Vibration (Android) ' + (s.vibrate ? 'on' : 'off'), s.vibrate, 'setTog', { k: 'vibrate' }) + chip('Keep screen awake ' + (s.keepAwake ? 'on' : 'off'), s.keepAwake, 'setTog', { k: 'keepAwake' }) + chip('Test alert', false, 'testAlert') + '</div>';
  h += '<label class="f">Text size</label><div class="chips">' + ['normal', 'large', 'huge'].map(x => chip(titleFirst(x), s.textSize === x, 'setVal', { k: 'textSize', v: x })).join('') + '</div>';
  h += '<h3>Appliance directory</h3><p class="small muted">Callsign and pager code for type-ahead and pager decoding. Format: Callsign | CODE | Brigade</p><textarea id="s_dir" class="mono small" style="min-height:220px" data-setdir="1">' + esc(s.directory.map(d => d.callsign + ' | ' + d.code + ' | ' + d.brigade).join('\n')) + '</textarea>';
  h += '<h3>Area brigades and control names</h3><p class="small muted">Format: Brigade | CODE | Control name</p><textarea id="s_brigs" class="mono small" style="min-height:220px" data-setbrig="1">' + esc(s.brigades.map(b => b.name + ' | ' + b.code + ' | ' + b.control).join('\n')) + '</textarea>';
  h += '<h3>Data</h3><div class="stack">' + btn('Back up all jobs', 'backupAll', '') + '<label class="btn" for="restoreFile" style="display:block">Restore from backup file</label><input type="file" id="restoreFile" accept=".json,application/json" hidden>' + (s.lastBackup ? '<p class="small muted">Last backup ' + fmtDT(s.lastBackup) + '</p>' : '') + btn('Clear all data', 'clearAll', 'danger') + '</div>';
  h += '<p class="dim small" style="margin-top:16px">Wordback: Incident Management Dashboard · v' + APP_VERSION + ' · updated ' + APP_UPDATED + '</p>';
  return h + '</div>';
};
function numSet(label, k) { return '<div class="grow"><label class="f">' + esc(label) + '</label><input type="number" inputmode="numeric" id="s_' + k + '" data-setnum="' + k + '" value="' + esc(S.settings[k]) + '" min="1"></div>'; }
