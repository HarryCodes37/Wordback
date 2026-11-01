/* ===== Pager decoding ===== */
const ROAD_SFX = /^(RD|ROAD|HWY|HIGHWAY|ST|STREET|LANE|LN|AVE|AV|AVENUE|CT|COURT|DR|DRIVE|TRK|TRACK|TCE|PDE|CRES|CR|PL|WAY|BVD|BLVD|TRL|GR|GROVE|CL|CLOSE|FWY|PKWY|RISE|SQ|CIRC|ESP|GAP)$/;
function parsePager(raw) {
  const out = { raw: raw.trim(), type: '', area: '', areaCode: '', resp: '', code: '', codeRaw: '', details: '', address: '', cross: [], suburb: '', map: '', grid: '', services: 'F', paged: [], incNo: '', ok: false };
  let txt = raw.replace(/\s+/g, ' ').trim().toUpperCase();
  if (!txt) return out;
  // incident number at end
  let m = txt.match(/\s([A-Z]\d{8,10})\s*$/); if (m) { out.incNo = m[1]; txt = txt.slice(0, m.index); }
  const tk = txt.split(' ');
  let i = 0;
  if (/^(ALERT|NON-?EMERG|NONEMERG|ADMIN|EMERG)/.test(tk[0])) { out.type = tk[0]; i = 1; }
  m = (tk[i] || '').match(/^([A-Z]{3,5})(\d)$/); if (m) { out.areaCode = m[1]; out.area = tk[i]; i++; }
  m = (tk[i] || '').match(/^([A-Z&]+?)([13])$/); if (m) { out.code = m[1]; out.resp = m[2]; out.codeRaw = tk[i]; i++; }
  // map book: SVNE etc, then page, grid square, (grid)
  let mb = -1; for (let j = i; j < tk.length; j++) { if (/^(SV[A-Z]{1,3}|MEL|VCMB)$/.test(tk[j]) && /^\d{3,4}[A-Z]?$/.test(tk[j + 1] || '')) { mb = j; break; } }
  let body = tk.slice(i, mb < 0 ? tk.length : mb);
  let rest = mb < 0 ? [] : tk.slice(mb);
  if (mb >= 0) {
    out.map = rest.slice(0, 3).join(' '); let k = 3;
    if (/^\(\d{6}\)$/.test(rest[3] || '')) { out.grid = rest[3].slice(1, -1); k = 4; }
    rest = rest.slice(k);
    if (rest[0] && /^[FPAR]{1,4}$/.test(rest[0])) { out.services = rest[0]; rest = rest.slice(1); }
    out.paged = rest.filter(Boolean);
  }
  // split details / address
  let a = -1;
  for (let j = 0; j < body.length; j++) { if (/^(\d+[A-Z]?(-\d+)?|CNR|LOT|OPP|NEAR|CORNER)$/.test(body[j]) && j > 0) { a = j; break; } }
  if (a < 0) { for (let j = 0; j < body.length; j++) { if (ROAD_SFX.test(body[j])) { a = Math.max(0, j - 2); break; } } }
  if (a < 0) a = body.length;
  out.details = body.slice(0, a).join(' ').replace(/\s*-\s*$/, '');
  const addr = body.slice(a).join(' ');
  const parts = addr.split(/\s*\/\/?\s*/).map(s => s.trim()).filter(Boolean);
  out.address = parts[0] || '';
  if (/^CNR\s/.test(out.address)) { out.cross = parts.slice(1); }
  else out.cross = parts.slice(1);
  // suburb = words after first road suffix in main address
  const at = out.address.split(' ');
  for (let j = 0; j < at.length; j++) if (ROAD_SFX.test(at[j])) { out.suburb = at.slice(j + 1).join(' '); break; }
  out.ok = !!(out.code || out.details);
  return out;
}
function brigadeByCode(code) { return S.settings.brigades.find(b => b.code === code); }
function dirByCode(code) { return S.settings.directory.find(d => d.code && d.code === code); }
// turn paged tokens into appliance entries
function pagedToAppliances(p, mine) {
  const list = [];
  for (const t of p.paged) {
    if (t === S.settings.homeCode) continue; // my brigade: my appliance added separately
    const d = dirByCode(t);
    if (d) { if (d.callsign !== mine) list.push({ callsign: d.callsign, code: t }); continue; }
    if (/^P\d{2}[A-Z]?$/.test(t)) { list.push({ callsign: 'FRV ' + t, code: t, frv: true }); continue; }
    if (/^C[A-Z]{4}$/.test(t)) continue; // brigade turnout, not an appliance
    const am = t.match(/^([A-Z]{4})([TPU]\w*)$/); if (am) { const b = brigadeByCode(am[1]); list.push({ callsign: b ? b.name + ' ' + (am[2][0] === 'T' ? 'Tanker ' : am[2][0] === 'P' ? 'Pumper ' : 'Ultralight ') + am[2].slice(1) : t, code: t }); continue; }
    list.push({ callsign: t, code: t });
  }
  return list;
}
function pickKind(code, details) {
  const list = KINDS[code]; if (!list) return '';
  for (const [k, re] of list) if (re && re.test(details)) return k;
  return 'Other';
}
function niceName(p, kind) {
  const ct = CALL_TYPES[p.code] || CALL_TYPES.INCIC;
  const det = (kind && kind !== 'Other') ? kind.split(' / ')[0].replace(/\s*\(.*\)/, '') : ct.label;
  const road = roadName(p);
  return det + (road ? ', ' + titleCase(road) : '');
}
function roadName(p) {
  const a = (p.address || '').replace(/^(CNR|LOT\s+\d+|\d+[A-Z]?(-\d+)?)\s+/, '');
  const w = a.split(' '); for (let j = 0; j < w.length; j++) if (ROAD_SFX.test(w[j])) return w.slice(0, j + 1).join(' ');
  return a;
}
