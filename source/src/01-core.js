'use strict';
/* ===== Wordback core: utils, data, storage ===== */
const APP_VERSION = '1.0.1';
const APP_UPDATED = '1 Nov 2026';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const pad = n => String(n).padStart(2, '0');
const fmtT = t => { if (!t) return '--:--'; const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fmtTS = t => { if (!t) return '--:--:--'; const d = new Date(t); return fmtT(t) + ':' + pad(d.getSeconds()); };
const fmtD = t => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
const fmtDT = t => t ? fmtD(t) + ' ' + fmtT(t) : '';
const fmtDur = ms => { const neg = ms < 0; ms = Math.abs(ms); const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (neg ? '-' : '') + (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(x); };
const fmtHrs = ms => { const m = Math.round(ms / 60000); return Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'; };
const toLocalInput = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
const titleCase = s => String(s || '').toLowerCase().replace(/\b([a-z])/g, (m, c) => c.toUpperCase()).replace(/\bAnd\b/g, 'and').replace(/\bOf\b/g, 'of');
const clone = o => JSON.parse(JSON.stringify(o));

/* ---- Directory seed (D24 R&R 2026-27 + Callum's pager examples) ---- */
const SEED_BRIGADES = [
  ['Kiewa','KIEW','Bogong'],['Allans Flat','AFLT','Bogong'],['Beechworth','BECU','Bogong'],['Beechworth Rural','BECR','Bogong'],
  ['Dederang','DEDE','Bogong'],['Sandy Creek','SCRK','Bogong'],['Stanley','SLEY','Bogong'],['Tawonga','TAWO','Bogong'],
  ['Wooragee','WGEE','Bogong'],['Yackandandah','YACR','Bogong'],
  ['Bonegilla','BONA','Wodonga'],['Baranduda','BDUD','Wodonga'],['Leneva','LEVA','Wodonga'],['Wodonga','WODO','Wodonga'],['Wodonga West','WWST','Wodonga'],
  ['Bethanga','BETH','Tallangatta'],['Eskdale','ESKD','Tallangatta'],['Noorongong','NONG','Tallangatta'],['Old Tallangatta','TALR','Tallangatta'],
  ['Talgarno','TALG','Tallangatta'],['Tallangatta','TALU','Tallangatta'],
  ['Kergunyah','KERG',''],['Gundowring','GUND',''],['Mt Beauty','MBTY',''],
  ['Barnawartha','BAWA',''],['Chiltern','CHIU',''],['Indigo Valley','INDI',''],['Bright','BRIG',''],['Myrtleford','MYRU',''],['Falls Creek','FCRK',''],['Mitta Mitta','MITT',''],['Tallangatta Valley','TVLY',''],['Corryong','CONU',''],['Rutherglen','RUTR',''],['Porepunkah','PORE',''],['Harrietville','HARV',''],['Mudgegona','MUDG',''],['Gapsted','GAPS',''],['Ovens-Eurobin','OEUR',''],['Rosewhite','RWHT',''],['Buffalo River','BUFR',''],['Browns Plains','BPLN',''],['Wahgunyah','WAHG',''],['Carlyle','CYLE',''],['Cornishtown','CORT',''],['Norong','NORO',''],['Dartmouth','DMTH',''],['Granya','GYRA',''],['Bullioh','BIOH',''],['Berringama','BGAM',''],['Cudgewa','CUWA',''],['Walwa','WALW',''],['Tintaldra','TINT',''],['Burrowye','BWYE',''],['Biggara','BIGG',''],['Nariel Valley','NARI',''],['Mt Hotham-Dinner Plain','MHDP','']
].map(([name, code, group]) => ({ name, code, group, control: name + ' Control' }));

const SEED_DIRECTORY = [
  ['Kiewa Tanker 1','KIEWT1','Kiewa'],['Kiewa Tanker 2','KIEWT2','Kiewa'],['Kiewa Ultralight','','Kiewa'],
  ['Bogong Group FCV 1','','Bogong Group'],['Bogong Group FCV 2','','Bogong Group'],
  ['Allans Flat Tanker 1','AFLTT1','Allans Flat'],['Allans Flat Ultralight','','Allans Flat'],
  ['Wodonga Tanker 1','WODOT1','Wodonga'],['Wodonga Group FCV','','Wodonga Group'],
  ['FRV Wodonga Pumper (P76B)','P76B','FRV Station 76'],['FRV Wodonga Pumper (P76A)','P76A','FRV Station 76'],
  ['Beechworth Rural Light Tanker','','Beechworth Rural'],['Dederang Ultralight','','Dederang'],['Sandy Creek Ultralight','','Sandy Creek'],
  ['Stanley Ultralight','','Stanley'],['Tawonga Light Tanker','','Tawonga'],['Wooragee Light Tanker','','Wooragee'],['Wooragee Ultralight','','Wooragee'],
  ['Yackandandah Light Tanker','','Yackandandah'],['Yackandandah Ultralight','','Yackandandah'],['Yackandandah Pumper Tanker','','Yackandandah'],
  ['Baranduda Ultralight','','Baranduda'],['Wodonga West Light Tanker','','Wodonga West'],['Eskdale Ultralight','','Eskdale'],
  ['Old Tallangatta Ultralight','','Old Tallangatta'],['Talgarno Ultralight','','Talgarno'],['Tallangatta Tanker','','Tallangatta'],
  ['Tallangatta Ultralight','','Tallangatta'],['Tallangatta Pumper Tanker','','Tallangatta'],['Tallangatta Group FCV','','Tallangatta Group'],
  ['Kergunyah Tanker','','Kergunyah'],['Gundowring Ultralight','','Gundowring']
].map(([callsign, code, brigade]) => ({ callsign, code, brigade }));

const DEFAULT_SETTINGS = {
  name: '', rank: '2nd Lt', brigade: 'Kiewa', homeCode: 'CKIEW',
  myAppliances: ['Kiewa Tanker 1', 'Kiewa Tanker 2', 'Kiewa Ultralight'], defaultAppliance: 'Kiewa Tanker 1',
  defaultFg: '353', fgList: ['353', '352', '354', '471'],
  directory: SEED_DIRECTORY, brigades: SEED_BRIGADES,
  wbMin: 10, sitrepFirst: 5, sitrepRepeat: 15, rehabWork: 20, rehabLen: 20, rehabRest: 10,
  sound: true, vibrate: true, keepAwake: true, textSize: 'normal'
};

/* ---- Call types ---- */
const CALL_TYPES = {
  'G&SC': { label: 'Grass and scrub fire', wb: 'Grass and scrub fire', fam: 'gs', fire: true },
  'STRUC': { label: 'Structure fire', wb: 'Structure fire', fam: 'struc', fire: true },
  'NOSTC': { label: 'Non-structure fire', wb: 'Non-structure fire', fam: 'nostc', fire: true },
  'RESCC': { label: 'Rescue', wb: 'Incident', fam: 'resc', fire: false },
  'INCIC': { label: 'Incident', wb: 'Incident', fam: 'inc', fire: false }
};
const KINDS = {
  INCIC: [['MVA / car accident', /\b(MVA|RAR|COLLISION|ACCIDENT|CRASH|VEHICLE|CAR)\b/], ['Alarm (AFA / private)', /\b(ALARM|AFA|PRIVATE)\b/], ['Gas leak', /\bGAS\b/], ['Hazmat / fuel spill', /\b(HAZMAT|SPILL|DIESEL|FUEL|PETROL|OIL|CHEMICAL)\b/], ['Tree down / storm', /\b(TREE|STORM|BRANCH)\b/], ['Powerlines down', /\b(POWER|POWERLINE|POWERLINES|WIRES|LINES)\b/], ['Assist agency (AV / police / SES)', /\b(ASSIST|AV|AMBULANCE|POLICE|SES)\b/], ['Smoke investigation', /\bSMOKE\b/], ['Flooding / wash away', /\b(FLOOD|FLOODING|WASHAWAY|WASH)\b/], ['Animal rescue', /\b(ANIMAL|COW|HORSE|DOG|CAT|SHEEP|LIVESTOCK)\b/], ['Other', null]],
  NOSTC: [['Car / vehicle fire', /\b(CAR|VEHICLE|TRUCK|UTE)\b/], ['MVA with fire', /\b(MVA|COLLISION|ACCIDENT)\b/], ['Rubbish / bin fire', /\b(RUBBISH|BIN|SKIP|PILE)\b/], ['Machinery fire', /\b(MACHINERY|TRACTOR|HEADER|HARVESTER|SLASHER)\b/], ['Other', null]],
  RESCC: [['Road accident (RAR)', /\b(RAR|MVA|ROAD|COLLISION|ACCIDENT)\b/], ['Trapped person', /\b(TRAPPED|PERSON|PERSONS)\b/], ['Animal', /\b(ANIMAL|COW|HORSE|DOG|LIVESTOCK)\b/], ['Other', null]]
};
// family drives tactics, sitrep picks, wrap-up
function famOf(inc) {
  const ct = CALL_TYPES[inc.p.code] || CALL_TYPES.INCIC;
  if (/MVA|Road accident/.test(inc.kind || '')) return 'mva';
  if (/vehicle fire|Machinery/i.test(inc.kind || '')) return 'veh';
  if (/Alarm/.test(inc.kind || '')) return 'alarm';
  if (/Hazmat|Gas/.test(inc.kind || '')) return 'hazmat';
  return ct.fam;
}
function isFire(inc) { const ct = CALL_TYPES[inc.p.code]; return !!(ct && ct.fire); }
function wbType(inc) { if (inc.p.code === 'STRUC' && /alarm/i.test(inc.kind || '')) return 'Structure fire'; return (CALL_TYPES[inc.p.code] || CALL_TYPES.INCIC).wb; }

/* ---- Storage: IndexedDB with localStorage fallback ---- */
const DB = {
  db: null, mode: 'idb',
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('wordback', 1);
        r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('incidents')) d.createObjectStore('incidents', { keyPath: 'id' }); if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'k' }); };
        r.onsuccess = () => { this.db = r.result; res(); };
        r.onerror = () => { this.mode = 'ls'; res(); };
      } catch (e) { this.mode = 'ls'; res(); }
    });
  },
  tx(store, mode) { return this.db.transaction(store, mode).objectStore(store); },
  put(store, obj) {
    if (this.mode === 'ls') { try { const all = JSON.parse(localStorage.getItem('wb_' + store) || '{}'); all[obj.id || obj.k] = obj; localStorage.setItem('wb_' + store, JSON.stringify(all)); } catch (e) {} return Promise.resolve(); }
    return new Promise(res => { try { const r = this.tx(store, 'readwrite').put(obj); r.onsuccess = r.onerror = () => res(); } catch (e) { res(); } });
  },
  del(store, id) {
    if (this.mode === 'ls') { try { const all = JSON.parse(localStorage.getItem('wb_' + store) || '{}'); delete all[id]; localStorage.setItem('wb_' + store, JSON.stringify(all)); } catch (e) {} return Promise.resolve(); }
    return new Promise(res => { try { const r = this.tx(store, 'readwrite').delete(id); r.onsuccess = r.onerror = () => res(); } catch (e) { res(); } });
  },
  all(store) {
    if (this.mode === 'ls') { try { return Promise.resolve(Object.values(JSON.parse(localStorage.getItem('wb_' + store) || '{}'))); } catch (e) { return Promise.resolve([]); } }
    return new Promise(res => { try { const r = this.tx(store, 'readonly').getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); } catch (e) { res([]); } });
  },
  clear() {
    if (this.mode === 'ls') { try { localStorage.removeItem('wb_incidents'); localStorage.removeItem('wb_kv'); } catch (e) {} return Promise.resolve(); }
    return Promise.all(['incidents', 'kv'].map(s => new Promise(res => { try { const r = this.tx(s, 'readwrite').clear(); r.onsuccess = r.onerror = () => res(); } catch (e) { res(); } })));
  }
};

/* ---- App state ---- */
const S = { settings: clone(DEFAULT_SETTINGS), incidents: [], cur: null, screen: 'home', sheet: null, sheetStack: [], wiz: null, ui: {} };
let saveTimer = null;
function saveInc(inc) { inc = inc || S.cur; if (!inc) return; inc.updated = now(); DB.put('incidents', clone(inc)); }
function saveSettings() { DB.put('kv', { k: 'settings', v: S.settings }); }
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveInc(); }, 250); }

function logE(text, opts) {
  const inc = S.cur; if (!inc) return;
  const e = { t: (opts && opts.t) || now(), text };
  if (inc.locked) e.late = true;
  if (inc.handover && inc.handover.doneAt && !inc.locked) e.post = true;
  inc.log.push(e);
}
function toast(msg) {
  let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 2200);
}
