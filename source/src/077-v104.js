/* ===== 1.0.4: paged brigades' appliances in Add appliance ===== */
// Neighbour brigades mostly have no appliances in the directory (the R&R doesn't list them),
// so a brigade turnout like CBONA used to leave nothing to pick. Now: suggest that brigade's
// likely appliances, let you pick any brigade, and remember whatever you add.
const BRIG_GENERIC = [['Tanker 1', 'tanker'], ['Tanker 2', 'tanker'], ['Ultralight', 'ult'], ['Pumper', 'other']];
function pagedBrigades(inc) {
  const p = (inc && inc.p) || {}; const home = (S.settings.homeCode || '').replace(/^C/, '');
  const codes = [];
  if (p.areaCode) codes.push(p.areaCode);
  (p.paged || []).forEach(t => { const m = String(t).match(/^C([A-Z]{4})$/); if (m) codes.push(m[1]); });
  const out = [];
  codes.forEach(c => { if (c === home || out.some(b => b.code === c)) return; out.push(brigadeByCode(c) || { name: c, code: c }); });
  return out;
}
function brigadeSuggestions(b, have) {
  const dir = S.settings.directory;
  const own = dir.filter(d => d.brigade && d.brigade.toLowerCase() === b.name.toLowerCase());
  const list = own.map(d => ({ callsign: d.callsign, code: d.code, brigade: d.brigade, cat: appCat(d) }));
  BRIG_GENERIC.forEach(([type, cat]) => {
    // skip generic names only when the brigade has real (non-generic) callsigns of this type
    if (own.some(d => appCat(d) === cat && !BRIG_GENERIC.some(g => d.callsign === b.name + ' ' + g[0]))) return;
    const cs = b.name + ' ' + type;
    if (!list.some(x => x.callsign === cs) && !dir.some(d => d.callsign === cs)) list.push({ callsign: cs, code: '', brigade: b.name, cat, guess: true });
  });
  return list.filter(x => !have.has(x.callsign));
}
function addRow(d) {
  return '<div class="app-row" data-a="addPick" data-cs="' + esc(d.callsign) + '" data-code="' + esc(d.code || '') + '" data-brig="' + esc(d.brigade || '') + '" data-cat="' + esc(d.cat || appCat(d)) + '"><div class="nm">' + esc(d.callsign) + '<div class="sub">' + esc([d.code, d.brigade, d.guess ? 'not in your list yet' : ''].filter(Boolean).join(' · ')) + '</div></div><span class="chip">Add</span></div>';
}
const CATS4 = CATS.concat([['brigade', 'Any brigade']]);
SHEETS.addApp = s => {
  const cat = s.cat || 'tanker';
  const q = (s.q || '').trim().toLowerCase();
  const inc = curInc(); const have = new Set(inc.apps.map(a => a.callsign));
  const paged = pagedBrigades(inc);
  const shown = new Set(); const rows = list => list.filter(d => !shown.has(d.callsign) && shown.add(d.callsign)).map(addRow).join('');
  let h = sheetHd('Add ' + (q ? 'appliance' : cat === 'brigade' ? 'from any brigade' : CATS4.find(c => c[0] === cat)[1].toLowerCase()), s.back);
  h += '<div class="chips">' + CATS4.map(([k, l]) => chip(l, cat === k && !q, 'addCat', { v: k })).join('') + '</div>';
  if (cat === 'brigade' && !q) {
    const sel = s.brig || (paged[0] && paged[0].code) || '';
    h += '<select id="addbrig" style="margin-top:8px"><option value="">Pick a brigade…</option>' + S.settings.brigades.map(b => '<option value="' + esc(b.code) + '"' + (b.code === sel ? ' selected' : '') + '>' + esc(b.name) + ' (' + esc(b.code) + ')</option>').join('') + '</select>';
  }
  h += '<input type="text" id="addq" data-sbind="q" data-live="1" value="' + esc(s.q || '') + '" placeholder="Type callsign, brigade or pager code" autocomplete="off" style="margin-top:8px">';
  h += '<div class="chips" style="margin-top:8px">' + chip('Add as paged', s.st === 'paged', 'addSt', { v: 'paged' }) + chip('En route', s.st === 'enroute', 'addSt', { v: 'enroute' }) + chip('On scene', s.st === 'onscene', 'addSt', { v: 'onscene' }) + '</div>';
  h += '<div id="addlist">';
  if (q) {
    const brigs = S.settings.brigades.filter(b => b.name.toLowerCase().includes(q) || b.code.toLowerCase() === q || ('c' + b.code).toLowerCase() === q);
    const dir = S.settings.directory.filter(d => !have.has(d.callsign) && (d.callsign + ' ' + d.code + ' ' + d.brigade).toLowerCase().includes(q));
    h += rows(dir.slice(0, 40)) + rows([].concat(...brigs.slice(0, 4).map(b => brigadeSuggestions(b, have))));
    h += '<div style="margin-top:8px">' + btn('Add "' + esc(s.q) + '" as custom ' + (cat === 'brigade' ? 'appliance' : CATS4.find(c => c[0] === cat)[1].toLowerCase()), 'addCustom', 'full') + '</div>';
  } else if (cat === 'brigade') {
    const b = S.settings.brigades.find(x => x.code === (s.brig || (paged[0] && paged[0].code))) || paged[0];
    h += b ? rows(brigadeSuggestions(b, have)) + '<p class="small muted" style="margin-top:8px">Not listed? Type the callsign above, e.g. "' + esc(b.name) + ' Tanker 3".</p>' : '<p class="dim">Pick a brigade to see its appliances.</p>';
  } else {
    if (paged.length && cat !== 'aircraft') {
      const pl = [].concat(...paged.map(b => brigadeSuggestions(b, have))).filter(d => d.cat === cat);
      if (pl.length) h += '<h3>Paged on this job: ' + esc(paged.map(b => b.name).join(', ')) + '</h3>' + rows(pl) + '<h3>Everyone else</h3>';
    }
    const list = S.settings.directory.filter(d => !have.has(d.callsign) && appCat(d) === cat);
    const r = rows(list.slice(0, 40));
    h += r || '<p class="dim">Nothing else in this list. Try Any brigade, or type a callsign to add one.</p>';
  }
  return h + '</div>';
};
A.addCat = d => { S.sheet.cat = d.v; S.sheet.q = ''; renderSheet(); };
document.addEventListener('change', e => { if (e.target.id === 'addbrig' && S.sheet) { S.sheet.brig = e.target.value; renderSheet(); } });
// remember anything picked that isn't in the directory yet, so it's there next time and in Settings
const _addPick4 = A.addPick;
A.addPick = function (d) {
  const dir = S.settings.directory;
  if (d.cs && !dir.some(x => x.callsign === d.cs)) { dir.push({ callsign: d.cs, code: d.code || '', brigade: d.brig || '', cat: d.cat || '' }); saveSettings(); }
  _addPick4.apply(A, arguments);
  const a = S.cur.apps[S.cur.apps.length - 1]; if (a && d.cat && ['tanker', 'ult', 'aircraft', 'other'].includes(d.cat)) { a.cat = d.cat; saveInc(); }
};
const _addCustom4 = A.addCustom;
A.addCustom = function () { if (S.sheet && S.sheet.cat === 'brigade') S.sheet.cat = appCat({ callsign: S.sheet.q || '' }); _addCustom4.apply(A, arguments); };
