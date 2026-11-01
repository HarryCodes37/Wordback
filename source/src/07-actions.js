/* ===== Actions ===== */
function openSheet(o, push) { if (push && S.sheet) S.sheetStack.push(S.sheet); else if (!push) S.sheetStack = []; S.sheet = o; renderSheet(); }
function closeSheet() { S.sheet = null; S.sheetStack = []; renderSheet(); }
function commit(rerender) { if (S.cur) saveInc(); if (rerender !== false) render(); }
function go(screen) { S.screen = screen; S.sheet = null; S.sheetStack = []; window.scrollTo(0, 0); render(); wakeLock(); }
function getPath(obj, path) { const seg = path.split('.'); let o = obj; for (let i = 0; i < seg.length - 1; i++) { const k = seg[i]; o = k[0] === '#' ? o.find(x => x.id === k.slice(1)) : (o[k] == null ? (o[k] = {}) : o[k]); if (!o) return [null]; } return [o, seg[seg.length - 1]]; }
function setPath(obj, path, val) { if (path === 'p.crossText') { obj.p.cross = val.split('/').map(x => x.trim()).filter(Boolean); return; } const [o, k] = getPath(obj, path); if (o) o[k] = val; }

function ensureAgency(inc, name, status) {
  let a = inc.agencies.find(x => x.name === name && x.status !== 'left');
  if (!a) { a = { id: uid(), name, short: name === 'Police' ? '5-6' : name === 'Ambulance (AV)' ? 'AV' : name, status: status || 'requested', hist: [{ t: now(), s: status || 'requested' }], note: '' }; inc.agencies.push(a); logE(name + ' ' + AG_ST[a.status].toLowerCase()); }
  return a;
}
function addContractor(inc, type, status) { const c = { id: uid(), type, company: '', operator: '', machine: '', status: status || 'requested', hist: [{ t: now(), s: status || 'requested' }], runs: [] }; inc.contractors.push(c); logE('Contractor (' + type.toLowerCase() + ') ' + CON_ST[c.status].toLowerCase()); return c; }
function agencyRadioName(a) { return a.name === 'Police' ? '5-6' : a.name === 'Ambulance (AV)' ? 'Ambulance' : a.name; }

const A = {
  sheetBg(d, el, e) { if (e.target === el) closeSheet(); },
  closeSheet() { closeSheet(); },
  sheetBack() { S.sheet = S.sheetStack.pop() || null; renderSheet(); },
  sheet(d) { const o = { type: d.t }; if (d.id) o.id = d.id; if (d.back) o.back = 1; if (d.t === 'addApp') o.st = 'enroute'; openSheet(o, !!d.back || (S.sheet && (d.t === 'app' || d.t === 'addApp' || d.t === 'smeacs'))); if (S.sheet && S.sheetStack.length) S.sheet.back = 1; renderSheet(); },
  goHome() { go('home'); },
  goSettings() { go('settings'); },
  openInc(d) { S.cur = S.incidents.find(i => i.id === d.id); if (!S.cur) return; if (S.cur.wizStep) { S.wiz = { step: S.cur.wizStep, raw: S.cur.p.raw || '' }; go('wiz'); } else go('inc'); },
  openPast(d) { S.cur = S.incidents.find(i => i.id === d.id); go('review'); },
  reopenInc() { go('inc'); },
  newInc() { const inc = newIncident(S.settings.defaultAppliance); inc.wizStep = 1; addApp(inc, { callsign: inc.myApp, mine: true, code: (S.settings.directory.find(x => x.callsign === inc.myApp) || {}).code }, 'paged'); S.incidents.push(inc); S.cur = inc; S.wiz = { step: 1, raw: '' }; saveInc(); go('wiz'); },
  backupAll() { backupAll(); },

  /* wizard */
  wizCancel() { const inc = S.cur; askConfirm('Cancel this new incident?', 'It will be deleted.', 'Delete it', () => { S.incidents = S.incidents.filter(i => i !== inc); DB.del('incidents', inc.id); S.cur = null; go('home'); }); },
  wizApp(d) { S.cur.myApp = d.v; const m = myApp(S.cur); m.callsign = d.v; m.code = (S.settings.directory.find(x => x.callsign === d.v) || {}).code || ''; commit(); },
  wizBack() { S.wiz.step = Math.max(1, S.wiz.step - 1); S.cur.wizStep = S.wiz.step; commit(); },
  wizNext() { const inc = S.cur; if (S.wiz.step === 1) { const m = myApp(inc); m.callsign = inc.myApp; } S.wiz.step++; inc.wizStep = S.wiz.step; window.scrollTo(0, 0); commit(); },
  async wizPaste() { try { const t = await navigator.clipboard.readText(); if (t) { $('#pager').value = t; S.wiz.raw = t; A.wizDecode(); return; } } catch (e) {} toast('Long-press in the box and choose Paste'); $('#pager').focus(); },
  wizDecode() {
    const inc = S.cur; const raw = ($('#pager') || {}).value || S.wiz.raw || '';
    if (!raw.trim()) { toast('Paste the pager message first'); return; }
    const p = parsePager(raw); if (!p.ok) toast('Could not read all of that. Check the details.');
    if (!p.code) p.code = 'INCIC';
    inc.p = p; inc.pageTime = now(); inc.name = niceName(p); inc.kind = pickKind(p.code, p.details);
    inc.apps = inc.apps.filter(a => a.mine);
    pagedToAppliances(p, inc.myApp).forEach(o => addApp(inc, o, 'paged'));
    const m = myApp(inc); if (m.status === 'paged') setAppStatus(inc, m, 'enroute'); // auto-log turning out
    logE('Pager: ' + p.raw);
    S.wiz.step = 3; inc.wizStep = 3; S.wiz.raw = raw; window.scrollTo(0, 0); commit();
  },
  wizSkipPager() { const inc = S.cur; inc.p = Object.assign(parsePager(''), { code: 'INCIC', resp: '3' }); const m = myApp(inc); if (m.status === 'paged') setAppStatus(inc, m, 'enroute'); S.wiz.step = 3; inc.wizStep = 3; commit(); },
  pageAdj(d) { S.cur.pageTime += Number(d.v) * 60000; commit(); },
  wizRmApp(d) { S.cur.apps = S.cur.apps.filter(a => a.id !== d.id); commit(); },
  wizKind(d) { S.cur.kind = d.v; commit(); },
  wizStart(d) {
    const inc = S.cur; delete inc.wizStep; inc.mode = 'control';
    if (!inc.controlName) inc.controlName = defaultControl(inc);
    logE('Incident started: ' + (inc.name || '') + (inc.kind ? ' (' + inc.kind + ')' : ''));
    if (d.v === 'support') { inc.mode = 'support'; inc.supportOf = defaultControl(inc); logE('Support mode, not in control'); }
    go('inc');
    if (d.v === 'onscene') A.myOnScene();
    saveInc();
  },

  /* incident */
  myEnroute() { setAppStatus(S.cur, myApp(S.cur), 'enroute'); commit(); },
  myOnScene() {
    const inc = S.cur;
    if (inc.mode !== 'control') { const m = myApp(inc); setAppStatus(inc, m, 'onscene'); if (!inc.onSceneAt) inc.onSceneAt = now(); commit(); return; }
    openSheet({ type: 'onscene', d: { control: inc.controlName || defaultControl(inc), fgState: inc.fg.state || 'confirmed', ch: inc.fg.ch || S.settings.defaultFg, cpType: inc.cp.type || 'static', cpLoc: inc.cp.loc || '' } });
  },
  osCtl(d) { S.sheet.d.control = d.v; renderSheet(); },
  osFg(d) { S.sheet.d.fgState = d.v; renderSheet(); },
  osCh(d) { S.sheet.d.ch = d.v; renderSheet(); },
  osCp(d) { S.sheet.d.cpType = d.v; if (d.v === 'dynamic' && !S.sheet.d.cpLoc) S.sheet.d.cpLoc = S.cur.myApp; renderSheet(); },
  osSent() {
    const inc = S.cur, d = S.sheet.d, t = now();
    inc.controlName = d.control; inc.fg = { state: d.fgState, ch: d.ch }; inc.cp = { type: d.cpType, loc: d.cpLoc };
    const m = myApp(inc);
    if (!inc.onSceneAt) inc.onSceneAt = t;
    if (m.status !== 'onscene') setAppStatus(inc, m, 'onscene');
    logE('On scene. Now known as ' + d.control + '. ' + (d.fgState === 'confirmed' ? 'Fireground ' + d.ch + '.' : d.fgState === 'na' ? 'Fireground channel not available.' : 'Fireground channel not needed.') + ' Control point ' + d.cpType + (d.cpLoc ? ': ' + d.cpLoc : '') + '.');
    closeSheet(); commit();
  },
  takeControl() { const inc = S.cur; inc.mode = 'control'; logE('Took control'); inc.timersStopped = false; A.myOnScene(); commit(false); },
  resumeControl() { const inc = S.cur; inc.mode = 'control'; inc.timersStopped = false; logE('Resumed control'); commit(); },
  timerTap() { const inc = S.cur; const di = dueInfo(inc); if (!di) return; if (di.due <= now()) { inc.ack = di.due; saveInc(); } if (di.kind === 'wordback') A.openWb(); else A.openSitrep(); },
  remTap(d) {
    const inc = S.cur;
    if (d.k === 'rehab') { const a = findApp(d.id); askConfirm(a.callsign + ' crew due rehab', 'Send the crew to rehab (' + (S.settings.rehabLen || 20) + ' min rehab + ' + S.settings.rehabRest + ' min rest)?', 'Crew to rehab', () => { setAppStatus(inc, a, 'rehab'); closeSheet(); commit(); }, 'go'); S.sheet.alt = { label: 'Remind me in 10 min', id: a.id }; renderSheet(); return; }
    if (d.k === 'rehabback') { const a = findApp(d.id); setAppStatus(inc, a, 'onscene'); commit(); return; }
    if (d.k === 'arrivals') { const names = inc.unreported.map(id => (findApp(id) || {}).callsign).filter(Boolean); radioPrompt({ title: 'Report arrivals', text: 'FireCom, ' + controlLabel(inc) + ', message: ' + names.join(', ') + ' on scene.', later: false }, () => { inc.messages.push({ t: now(), text: names.join(', ') + ' on scene' }); logE('Message to FireCom: ' + names.join(', ') + ' on scene'); inc.unreported = []; }); return; }
    if (d.k === 'msg') { const r = inc.remind.find(x => x.id === d.id); if (!r) return; radioPrompt({ title: 'Message', text: r.script, later: false }, () => { inc.remind = inc.remind.filter(x => x !== r); inc.messages.push({ t: now(), text: r.plain }); logE('Message to FireCom: ' + r.plain); }); return; }
    if (d.k === 'rit') { openSheet({ type: 'ba' }); return; }
    if (d.k === 'handover') { A.startHandover(); return; }
  },
  confirmYes() { const cb = confirmCb; confirmCb = null; if (cb) cb(); else closeSheet(); },
  confirmAlt() { const a = findApp(S.sheet.alt.id); a.rehabDue = now() + 10 * 60000; closeSheet(); commit(); },
  radioSent() { const cb = radioCb; radioCb = null; if (cb) cb(); closeSheet(); commit(); },
  radioLater() { const s = S.sheet; S.cur.remind.push({ id: uid(), text: 'Tell FireCom: ' + s.plain, script: s.text, plain: s.plain }); radioCb = null; closeSheet(); commit(); },

  /* appliances */
  addSt(d) { S.sheet.st = d.v; renderSheet(); },
  addPick(d) { const inc = S.cur; const a = addApp(inc, { callsign: d.cs, code: d.code }, 'paged'); if (S.sheet.st !== 'paged') setAppStatus(inc, a, S.sheet.st); else logE(a.callsign + ' added (paged)'); toast(d.cs + ' added'); S.sheet.q = ''; commit(); },
  addCustom() { const inc = S.cur; const q = (S.sheet.q || '').trim(); if (!q) return; const d = dirByCode(q.toUpperCase()); const a = addApp(inc, d ? { callsign: d.callsign, code: d.code } : { callsign: q, code: /^[A-Z0-9]{3,7}$/.test(q) ? q : '' }, 'paged'); if (S.sheet.st !== 'paged') setAppStatus(inc, a, S.sheet.st); else logE(a.callsign + ' added (paged)'); S.sheet.q = ''; toast(a.callsign + ' added'); commit(); },
  appSt(d) {
    const inc = S.cur, a = findApp(d.id);
    if (a.mine && d.v === 'returning') { openSheet({ type: 'returning' }); return; }
    if (a.mine && d.v === 'onscene' && !inc.onSceneAt) { A.myOnScene(); return; }
    if (d.v === 'released') { askConfirm('Release ' + a.callsign + '?', 'They leave the fireground.', 'Release', () => { setAppStatus(inc, a, 'released'); if (a.task) a.task = null; closeSheet(); commit(); }, 'warn'); return; }
    if (d.v === 'water') {
      const left = inc.apps.filter(x => x !== a && (x.status === 'onscene') && !x.frv && !x.brigadeOnly);
      if (!left.length) { askConfirm('Last tanker on scene', a.callsign + ' is the last tanker on scene. Sending it for water leaves no tanker on the fireground.', 'Send anyway', () => { setAppStatus(inc, a, 'water'); closeSheet(); commit(); }, 'warn'); return; }
    }
    setAppStatus(inc, a, d.v); commit();
  },
  crewAdj(d) { const a = findApp(d.id); a.crew = String(Math.max(0, (Number(a.crew) || 0) + Number(d.v))); if (a.crew === '0') a.crew = ''; saveInc(); renderSheet(); },
  tkType(d) { const s = S.sheet; const a = findApp(s.id); s.task = s.task || (a.task ? clone(a.task) : {}); s.task.type = d.v; if (d.v !== 'attack') { delete s.task.sub; delete s.task.lines; } renderSheet(); },
  tkSub(d) { S.sheet.task.sub = d.v; renderSheet(); },
  tkMore() { S.sheet.more = true; renderSheet(); },
  tkLines(d) { S.sheet.task.lines = S.sheet.task.lines === Number(d.v) ? 0 : Number(d.v); renderSheet(); },
  tkSave(d) { const inc = S.cur, a = findApp(d.id); const t = Object.assign({}, S.sheet.task, { t: now() }); if (!t.type) return; a.task = t; a.tasks.push(t); logE(a.callsign + ' tasked: ' + taskText(t)); S.sheet.task = null; toast('Tasking saved'); commit(); },
  appRemove(d) { const inc = S.cur; const a = findApp(d.id); askConfirm('Remove ' + a.callsign + '?', 'Only for appliances added by mistake. Use Released for trucks leaving.', 'Remove', () => { inc.apps = inc.apps.filter(x => x !== a); logE(a.callsign + ' removed (added in error)'); closeSheet(); commit(); }); },

  /* wordback */
  openWb() { const inc = S.cur; openSheet({ type: 'wordback', d: { status: '', res: [], tankers: 2 } }); },
  openWbRes() { openSheet({ type: 'wordback', d: { status: lastWbStatus(S.cur) || 'nyuc', res: [], tankers: 2 } }); },
  quickWb(d) { openSheet({ type: 'wordback', d: { status: d.v, res: [], tankers: 2 } }); },
  wbSt(d) { S.sheet.d.status = d.v; renderSheet(); },
  wbRes(d) { const r = S.sheet.d.res; const i = r.indexOf(d.v); if (i >= 0) r.splice(i, 1); else r.push(d.v); renderSheet(); },
  wbTank(d) { S.sheet.d.tankers = Number(d.v); renderSheet(); },
  wbCon(d) { S.sheet.d.contractorType = d.v; renderSheet(); },
  wbSent() {
    const inc = S.cur, d = S.sheet.d, t = now(); if (!d.status) return;
    const st = WB_STATUS[d.status];
    const req = d.res.map(k => { const r = RES.find(x => x.k === k); if (k === 'tankers') return 'make tankers ' + d.tankers; if (k === 'contractor') return 'contractor' + (d.contractorType ? ' (' + d.contractorType.toLowerCase() + ')' : ''); return r.plain; });
    const plain = st.plain + (d.desc ? ' (' + d.desc + ')' : '') + (req.length ? '. Requested: ' + req.join(', ') : '');
    inc.wordbacks.push({ t, status: d.status, res: d.res.slice(), plain, script: wbScript(inc, d) });
    logE('Wordback: ' + plain);
    if (!inc.sitreps.length) inc.sitrepDue = t + S.settings.sitrepFirst * 60000;
    d.res.forEach(k => { const r = RES.find(x => x.k === k); if (r.agency) ensureAgency(inc, r.agency, 'requested'); if (r.contractor) addContractor(inc, d.contractorType || 'Other', 'requested'); });
    if (d.status === 'uc' && !inc.underControlAt) inc.underControlAt = t;
    if (['stop', 'falsealarm', 'noaction'].includes(d.status)) {
      if (!inc.stopAt) { inc.stopAt = t; inc.stopVariant = st.label; }
      inc.apps.forEach(a => { if (!a.mine && (a.status === 'enroute' || a.status === 'paged')) setAppStatus(inc, a, 'cancelled'); });
    }
    closeSheet(); commit();
  },
  /* sitrep / message */
  openSitrep() { const inc = S.cur; const prev = inc.sitreps[inc.sitreps.length - 1]; openSheet({ type: 'sitrep', d: { f: prev ? clone(prev.f || {}) : {}, threat: prev ? (prev.threat || []).slice() : [], useTasks: true, useChanges: true, potential: '', eta: '' } }); },
  srPick(d) { const f = S.sheet.d.f; f[d.k] = f[d.k] === d.v ? '' : d.v; renderSheet(); },
  srThreat(d) { const r = S.sheet.d.threat; const i = r.indexOf(d.v); if (i >= 0) r.splice(i, 1); else { if (d.v === 'Nil') r.length = 0; else { const n = r.indexOf('Nil'); if (n >= 0) r.splice(n, 1); } r.push(d.v); } renderSheet(); },
  srEta(d) { S.sheet.d.eta = S.sheet.d.eta === d.v ? '' : d.v; renderSheet(); },
  srTog(d) { S.sheet.d[d.v] = !S.sheet.d[d.v]; renderSheet(); },
  srSent() { const inc = S.cur, d = S.sheet.d, t = now(); const text = sitrepText(inc, d); inc.sitreps.push({ t, text, f: clone(d.f), threat: d.threat.slice() }); logE('Sitrep: ' + text.replace(/^FireCom, [^,]+, sitrep\.\s*/, '')); inc.sitrepDue = t + S.settings.sitrepRepeat * 60000; closeSheet(); commit(); },
  openMsg() { openSheet({ type: 'message', d: { text: '' } }); },
  msgSent() { const inc = S.cur, d = S.sheet.d; if (!d.text) return; inc.messages.push({ t: now(), text: d.text }); logE('Message to FireCom: ' + d.text); closeSheet(); commit(); },

  /* agencies */
  agAdd(d) { ensureAgency(S.cur, d.v, 'requested'); commit(); },
  agAddCustom() { const v = (S.sheet.custom || '').trim(); if (!v) return; ensureAgency(S.cur, v, 'requested'); S.sheet.custom = ''; commit(); },
  agSt(d) {
    const inc = S.cur; const a = inc.agencies.find(x => x.id === d.id); if (a.status === d.v) return;
    a.status = d.v; a.hist.push({ t: now(), s: d.v }); logE(a.name + ' ' + AG_ST[d.v].toLowerCase());
    if (a.name === 'Police' && d.v === 'onscene') inc.hazards.forEach(h => { if (h.name === 'Traffic' && h.status === 'identified') { h.status = 'managed'; logE('Traffic hazard managed (5-6 on scene)'); } });
    commit();
    if (d.v === 'onscene' && inc.mode === 'control') { const nm = agencyRadioName(a); radioPrompt({ title: a.name + ' on scene', text: 'FireCom, ' + controlLabel(inc) + ', message: ' + nm + ' on scene.', plain: a.name + ' on scene', later: true }, () => { inc.messages.push({ t: now(), text: a.name + ' on scene' }); logE('Message to FireCom: ' + a.name + ' on scene'); }); }
    if (d.v === 'left' && a.name === 'Police' && inc.roads.some(r => !r.open)) askConfirm('Road reopened?', '5-6 has left but a road is still logged as closed.', 'Open road closures', () => { openSheet({ type: 'hazards' }); }, 'go');
  },
  /* hazards + roads */
  rdReason(d) { S.sheet.reason = d.v; renderSheet(); },
  rdBy(d) { S.sheet.by = d.v; renderSheet(); },
  roadClose() { const inc = S.cur, s = S.sheet; const road = (s.road || titleCase(roadName(inc.p)) || '').trim(); if (!road) { toast('Which road?'); return; } inc.roads.push({ id: uid(), road, reason: s.reason || '', by: s.by || '', closed: now(), open: null }); logE('Road closed: ' + road + (s.reason ? ' (' + s.reason + ')' : '') + (s.by ? ', by ' + s.by : '')); s.road = ''; s.reason = ''; s.by = ''; if (!inc.agencies.some(a => a.name === 'Police')) toast('Remember to request 5-6 for traffic'); commit(); },
  roadOpen(d) { const r = S.cur.roads.find(x => x.id === d.id); r.open = now(); logE('Road reopened: ' + r.road + (r.reopenReason ? ' (' + r.reopenReason + ')' : '')); commit(); },
  hzTap(d) {
    const inc = S.cur; let h = inc.hazards.find(x => x.name === d.v);
    if (!h) { h = { name: d.v, status: 'identified', t: now() }; inc.hazards.push(h); if (d.v === 'Traffic' && inc.agencies.some(a => a.name === 'Police' && a.status === 'onscene')) h.status = 'managed'; logE('Hazard: ' + d.v + ' (' + h.status + ')'); if (d.v === 'Power lines' && !inc.agencies.some(a => a.name === 'Power company')) { commit(); askConfirm('Power lines', 'Notify the power company? Adds them to Agencies as requested.', 'Request power company', () => { ensureAgency(inc, 'Power company', 'requested'); openSheet({ type: 'hazards' }); commit(); }, 'go'); return; } }
    else { h.status = h.status === 'identified' ? 'managed' : h.status === 'managed' ? 'removed' : 'identified'; logE('Hazard: ' + d.v + ' ' + h.status); }
    commit();
  },
  hzAdd() { const v = (S.sheet.hz || '').trim(); if (!v) return; S.cur.hazards.push({ name: v, status: 'identified', t: now() }); logE('Hazard: ' + v + ' (identified)'); S.sheet.hz = ''; commit(); },
  /* tactics */
  tacTap(d) {
    const inc = S.cur; const i = inc.tactics.findIndex(x => x.item === d.v);
    if (i >= 0) { askConfirm('Untick "' + d.v + '"?', 'Removes it from the actions list. The log keeps a record.', 'Untick', () => { inc.tactics.splice(i, 1); logE('Action unticked: ' + d.v); openSheet({ type: 'tactics' }); commit(); }, 'warn'); return; }
    if (d.v === 'No one inside') { S.sheet.noone = { how: '' }; renderSheet(); return; }
    inc.tactics.push({ item: d.v, t: now() }); logE('Action: ' + d.v); commit();
  },
  nooneHow(d) { S.sheet.noone.how = d.v; renderSheet(); },
  nooneSave() { const n = S.sheet.noone; if (!n.how) { toast('Search or verbal?'); return; } const note = n.how === 'search' ? 'confirmed by search' : 'verbal from ' + (n.name || '?') + ' (' + (n.rel || '?') + ')'; S.cur.tactics.push({ item: 'No one inside', t: now(), note }); logE('No one inside: ' + note); S.sheet.noone = null; commit(); },
  tacCustom() { const v = (S.sheet.custom || '').trim(); if (!v) return; S.cur.tactics.push({ item: v, t: now() }); logE('Action: ' + v); S.sheet.custom = ''; commit(); },
  /* contractors */
  conAdd(d) { addContractor(S.cur, d.v, 'requested'); commit(); },
  conSt(d) {
    const inc = S.cur; const c = inc.contractors.find(x => x.id === d.id); if (c.status === d.v) return;
    if (d.v === 'left' && (c.runs || []).some(r => !r.end)) { const r = c.runs.find(r => !r.end); r.end = now(); logE('Contractor ' + c.type.toLowerCase() + ' machine stopped'); }
    c.status = d.v; c.hist.push({ t: now(), s: d.v }); logE('Contractor ' + c.type.toLowerCase() + (c.company ? ' (' + c.company + ')' : '') + ' ' + CON_ST[d.v].toLowerCase());
    commit();
    if (d.v === 'onscene' && inc.mode === 'control') radioPrompt({ title: 'Contractor on scene', text: 'FireCom, ' + controlLabel(inc) + ', message: contractor ' + c.type.toLowerCase() + ' on scene.', plain: 'contractor ' + c.type.toLowerCase() + ' on scene', later: true }, () => { inc.messages.push({ t: now(), text: 'Contractor ' + c.type.toLowerCase() + ' on scene' }); logE('Message to FireCom: contractor ' + c.type.toLowerCase() + ' on scene'); });
  },
  conRun(d) { const c = S.cur.contractors.find(x => x.id === d.id); c.runs = c.runs || []; const r = c.runs.find(r => !r.end); if (r) { r.end = now(); logE('Contractor ' + c.type.toLowerCase() + ' machine stopped (' + fmtHrs(machineMs(c)) + ' total)'); } else { c.runs.push({ start: now(), end: null }); logE('Contractor ' + c.type.toLowerCase() + ' machine started'); } commit(); },
  /* BA */
  baCtl() { const b = S.cur.ba; b.control = !b.control; logE(b.control ? 'BA control established' + (b.who ? ': ' + b.who : '') : 'BA control stood down'); commit(); },
  baPat(d) { S.cur.ba.pattern = d.v; logE('BA search pattern: ' + d.v.toLowerCase()); commit(); },
  baRit() { const v = (S.sheet.rit || '').trim(); if (!v) { toast('Who is RIT?'); return; } S.cur.ba.rit = v; logE('RIT: ' + v); commit(); },
  baRitNA() { S.cur.ba.rit = 'RIT not available'; logE('RIT not available'); commit(); },
  baRitClear() { S.cur.ba.rit = ''; commit(); },
  baAdd() { const b = S.cur.ba; b.teams.push({ id: uid(), name: 'Team ' + (b.teams.length + 1), names: '', in: null, out: null }); commit(); },
  baIn(d) { const t = S.cur.ba.teams.find(x => x.id === d.id); t.in = now(); logE('BA ' + t.name + ' entered' + (t.names ? ' (' + t.names + ')' : '')); commit(); },
  baOut(d) { const t = S.cur.ba.teams.find(x => x.id === d.id); t.out = now(); logE('BA ' + t.name + ' exited (' + fmtDur(t.out - t.in) + ')'); commit(); },
  /* signals, notes, misc */
  sigTap(d) { const inc = S.cur; const s = SIGNALS.find(x => x[0] === d.v); radioPrompt({ title: 'Radio signal ' + s[0], text: 'FireCom, ' + controlLabel(inc) + ', radio signal ' + s[0] + '.', plain: s[2], later: false }, () => { logE(s[2]); if (s[0] === '5-6' || s[0] === '4-0') ensureAgency(inc, 'Police', 'requested'); }); },
  noteIns(d) { const inc = S.cur; inc.notes = (inc.notes ? inc.notes.replace(/\s*$/, '') + '\n' : '') + d.v; logE('Note: ' + d.v.replace(/:\s*$/, '')); commit(); renderSheet(); const t = $('#f_notes'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } },
  callLog() { const s = S.sheet; if (!s.who && !s.what) return; S.cur.calls.push({ t: now(), who: s.who || '', what: s.what || '' }); logE('Phone call with ' + (s.who || '?') + ': ' + (s.what || '')); s.who = ''; s.what = ''; commit(); },
  condLog() { const c = S.cur.conditions; logE('Conditions: ' + [c.temp && c.temp + 'C', c.wind && c.wind + ' km/h', c.dir && 'from ' + c.dir, c.rh && c.rh + '% RH', c.notes].filter(Boolean).join(', ')); closeSheet(); commit(); },
  originSave() { logE('Point of origin: ' + S.cur.origin); closeSheet(); commit(); },
  logAdd() { const v = (S.sheet.text || '').trim(); if (!v) return; logE(v); S.sheet.text = ''; commit(); },
  /* end */
  endIncident() { const inc = S.cur; if (!inc.timersStopped && myApp(inc) && myApp(inc).status !== 'returning') openSheet({ type: 'returning' }); else openSheet({ type: 'closeout' }); },
  doReturning() { const inc = S.cur; const m = myApp(inc); setAppStatus(inc, m, 'returning'); inc.timersStopped = true; inc.timersStoppedAt = now(); logE('Timers stopped'); saveInc(); render(); openSheet({ type: 'closeout' }); },
  closeOut() { const inc = S.cur; inc.status = 'active'; inc.timersStopped = true; inc.endStep = 1; go('endjob'); saveInc(); },
  continueLater() { const inc = S.cur; inc.status = 'continue'; logE('Left open (not closed out)'); saveInc(); go('home'); },
  endBackInc() { go('inc'); },
  endStep(d) { const inc = S.cur; if (Number(d.v) > 0 && inc.endStep === 1 && wrapItems(inc).some(it => it.block && !it.auto)) { toast('Log contractor departure / BA out first'); return; } inc.endStep = Math.min(3, Math.max(1, (inc.endStep || 1) + Number(d.v))); window.scrollTo(0, 0); commit(); },
  wrapTap(d) { const inc = S.cur; if (inc.wrap[d.v]) delete inc.wrap[d.v]; else inc.wrap[d.v] = now(); commit(); },
  wrapBlocked(d) { go('inc'); openSheet({ type: /BA/.test(d.v) ? 'ba' : 'contractors' }); toast('Log it here, then come back to End incident'); },
  sumLand(d) { S.cur.summary.land = S.cur.summary.land === d.v ? '' : d.v; commit(); },
  sumMed(d) { const m = S.cur.summary.medium = S.cur.summary.medium || []; const i = m.indexOf(d.v); if (i >= 0) m.splice(i, 1); else m.push(d.v); if (!S.cur.summary.mediumLogged) { S.cur.summary.mediumLogged = 1; } commit(); },
  lockInc() { const inc = S.cur; logE('Exported and locked'); inc.locked = true; inc.exportedAt = now(); inc.status = 'closed'; inc.timersStopped = true; commit(); toast('Locked. Now copy, share or PDF it.'); },
  expCopy() { copyText(exportText(S.cur)); },
  expTxt() { const inc = S.cur; shareOrDownload(new Blob([exportText(inc)], { type: 'text/plain' }), fileStem(inc) + '.txt', inc.name); },
  async expPdf() { const inc = S.cur; toast('Building PDF...'); try { const b = await makePdf(inc); shareOrDownload(b, fileStem(inc) + '.pdf', inc.name); } catch (e) { toast('PDF needs the PDF tool loaded once while online'); } },
  firsTap() { const inc = S.cur; inc.firsDone = !inc.firsDone; commit(); },
  lateNote() { const v = (($('#late_note') || {}).value || '').trim(); if (!v) return; logE(v); commit(); toast('Late note added'); },
  delInc() { const inc = S.cur; askConfirm('Delete this incident?', 'This cannot be undone. Back it up first if you might need it.', 'Delete', () => { S.incidents = S.incidents.filter(i => i !== inc); DB.del('incidents', inc.id); S.cur = null; go('home'); }); },
  /* handover */
  startHandover() { const inc = S.cur; const ab = areaBrigade(inc); inc.hoDraft = inc.hoDraft && !inc.hoDraft.done ? inc.hoDraft : { step: 1, to: ab && ab.name !== S.settings.brigade ? ab.name : '', name: '', app: '', control: controlLabel(inc), briefed: null, items: {}, sent: null }; go('handover'); saveInc(); },
  hoCancel() { S.cur.hoDismissed = true; go('inc'); saveInc(); },
  hoTo(d) { S.cur.hoDraft.to = d.v; commit(); },
  hoApp(d) { S.cur.hoDraft.app = d.v; commit(); },
  hoBriefed() { const d = S.cur.hoDraft; d.briefed = d.briefed ? null : now(); if (d.briefed) logE('Handover brief given to ' + (d.name || d.to)); commit(); },
  hoItem(d) { const it = S.cur.hoDraft.items; if (it[d.v]) delete it[d.v]; else it[d.v] = now(); commit(); },
  hoStep(d) { const h = S.cur.hoDraft; if (Number(d.v) > 0 && h.step === 1 && !h.to) { toast('Who is taking control?'); return; } if (Number(d.v) > 0 && h.step === 4 && !h.sent) { toast('Tap Sent once you have told FireCom'); return; } h.step = Math.min(5, Math.max(1, h.step + Number(d.v))); window.scrollTo(0, 0); commit(); },
  hoSent() { const inc = S.cur, d = inc.hoDraft; d.sent = now(); logE('Control handed to ' + (d.name || '?') + ' (' + d.to + (d.app ? ', ' + d.app : '') + ')' + (d.control && d.control !== controlLabel(inc) ? ', now ' + d.control : '')); inc.handover = Object.assign({}, d, { doneAt: d.sent }); if (d.control) inc.controlName = d.control; commit(); },
  hoFinish(d) { const inc = S.cur; inc.hoDraft.done = true; if (d.v === 'logonly') { inc.mode = 'logonly'; logE('Staying as log only'); go('inc'); } else { inc.mode = 'logonly'; inc.timersStopped = true; logE('Stopped tracking after handover'); inc.endStep = 1; go('endjob'); } saveInc(); },
  /* settings */
  setVal(d) { S.settings[d.k] = d.v; saveSettings(); applySettings(); render(); },
  setTog(d) { S.settings[d.k] = !S.settings[d.k]; saveSettings(); applySettings(); render(); },
  testAlert() { alertBuzz(); },
  clearAll() { askConfirm('Clear all data?', 'Deletes every incident and your settings on this device.', 'Yes, continue', () => { askConfirm('Are you really sure?', 'Last chance. Back up first if you need anything.', 'Delete everything', async () => { await DB.clear(); S.incidents = []; S.settings = clone(DEFAULT_SETTINGS); S.cur = null; applySettings(); go('home'); toast('All data cleared'); }); }); }
};
