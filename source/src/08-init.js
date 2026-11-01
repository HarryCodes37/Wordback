/* ===== Events, bindings, boot ===== */
SHEETS.confirm = s => sheetHd(s.title) + '<p>' + s.body + '</p><div class="stack" style="margin-top:12px">' + btn(esc(s.yes), 'confirmYes', 'big ' + s.cls) + (s.alt ? btn(esc(s.alt.label), 'confirmAlt', 'big') : '') + btn('Cancel', 'closeSheet', 'big ghost') + '</div>';

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  if (el.dataset.a !== 'sheetBg') e.preventDefault();
  try { fn(el.dataset, el, e); } catch (err) { console.error(err); toast('Something went wrong: ' + err.message); }
});
function patchSheetLive() {
  // re-render the sheet off-screen and patch only live parts so the focused input keeps focus
  if (!S.sheet) return; const def = SHEETS[S.sheet.type]; if (!def) return;
  const tmp = document.createElement('div'); tmp.innerHTML = typeof def === 'function' ? def(S.sheet) : def.html(S.sheet);
  ['scr', 'addlist'].forEach(id => { const a = tmp.querySelector('#' + id), b = document.getElementById(id); if (a && b && a.innerHTML !== b.innerHTML) b.innerHTML = a.innerHTML; });
}
document.addEventListener('input', e => {
  const el = e.target; const ds = el.dataset; const v = el.value;
  if (el.id === 'pager') { if (S.wiz) S.wiz.raw = v; return; }
  if (ds.bind && S.cur) { setPath(S.cur, ds.bind, v); saveSoon(); patchSheetLive(); return; }
  if (ds.sbind && S.sheet) { setPath(S.sheet, ds.sbind, v); patchSheetLive(); return; }
  if (ds.hbind && S.cur && S.cur.hoDraft) { S.cur.hoDraft[ds.hbind] = v; saveSoon(); return; }
  if (ds.setbind) { S.settings[ds.setbind] = v; saveSettings(); return; }
  if (ds.setnum) { const n = Number(v); if (n > 0) { S.settings[ds.setnum] = n; saveSettings(); } return; }
  if (ds.setcsv) { S.settings[ds.setcsv] = v.split(',').map(x => x.trim()).filter(Boolean); saveSettings(); return; }
  if (ds.setlist) { S.settings[ds.setlist] = v.split('\n').map(x => x.trim()).filter(Boolean); saveSettings(); return; }
  if (ds.setdir) { S.settings.directory = v.split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0]).map(p => ({ callsign: p[0], code: (p[1] || '').toUpperCase(), brigade: p[2] || '' })); saveSettings(); return; }
  if (ds.setbrig) { S.settings.brigades = v.split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0] && p[1]).map(p => ({ name: p[0], code: p[1].toUpperCase(), control: p[2] || p[0] + ' Control' })); saveSettings(); return; }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'pageTime') { const t = new Date(el.value).getTime(); if (!isNaN(t)) { S.cur.pageTime = t; saveInc(); } return; }
  if (el.id === 'restoreFile') { restoreFrom(el.files[0]); el.value = ''; return; }
  if (el.dataset.bind && S.cur) { setPath(S.cur, el.dataset.bind, el.value); if (el.dataset.bind === 'p.code') S.cur.kind = pickKind(el.value, S.cur.p.details || ''); saveInc(); if (el.dataset.rerender) render(); }
  if (el.dataset.setlist || el.dataset.setcsv) render();
});
async function restoreFrom(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'wordback' || !Array.isArray(data.incidents)) throw new Error('Not a Wordback backup');
    askConfirm('Restore backup?', 'Adds ' + data.incidents.length + ' incident(s) from ' + esc(data.exported || 'the file') + '. Incidents already on this device with the same ID are replaced. Settings are replaced too.', 'Restore', async () => {
      for (const inc of data.incidents) { await DB.put('incidents', inc); const i = S.incidents.findIndex(x => x.id === inc.id); if (i >= 0) S.incidents[i] = inc; else S.incidents.push(inc); }
      if (data.settings) { S.settings = Object.assign(clone(DEFAULT_SETTINGS), data.settings); saveSettings(); applySettings(); }
      closeSheet(); go('home'); toast('Restored');
    }, 'go');
  } catch (err) { toast('Could not read that file: ' + err.message); }
}
function applySettings() {
  const r = document.documentElement; r.classList.remove('ts-large', 'ts-huge'); if (S.settings.textSize !== 'normal') r.classList.add('ts-' + S.settings.textSize);
  wakeLock();
}
let wl = null;
async function wakeLock() {
  try {
    const want = S.settings.keepAwake && (S.screen === 'inc' || S.screen === 'handover') && document.visibilityState === 'visible';
    if (want && !wl && navigator.wakeLock) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    if (!want && wl) { await wl.release(); wl = null; }
  } catch (e) { wl = null; }
}
document.addEventListener('visibilitychange', () => { wakeLock(); if (document.visibilityState === 'visible') tick(); });

async function boot() {
  await DB.open();
  const kv = await DB.all('kv'); const st = kv.find(x => x.k === 'settings');
  if (st && st.v) S.settings = Object.assign(clone(DEFAULT_SETTINGS), st.v);
  S.incidents = await DB.all('incidents');
  applySettings();
  // resume: if exactly one active job, go straight back into it
  const act = S.incidents.filter(i => i.status === 'active' && !i.wizStep).sort((a, b) => b.updated - a.updated);
  if (act.length && act[0].endStep == null && now() - act[0].updated < 12 * 3600000) { S.cur = act[0]; S.screen = 'inc'; }
  render();
  setInterval(tick, 1000);
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude\.ai|claudeusercontent/.test(location.host)) { navigator.serviceWorker.register('sw.js').catch(() => {}); }
  // persist storage so iOS is less likely to evict it
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}
boot();
