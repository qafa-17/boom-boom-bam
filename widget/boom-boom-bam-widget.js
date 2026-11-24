// Boom Boom Bam: iPhone home-screen widget, for the free Scriptable app.
//
// Setup (README has the full steps):
//   1. Paste your Apps Script web app URL, key and private link below (or run the script and
//      it will ask). They are remembered, so later versions can be pasted in as-is.
//   2. The private link is in the app: Settings > Sync > Copy private link.
//   3. Add a Scriptable widget to your home screen (Large shows the most),
//      long-press it > Edit Widget > Script: this one.
//   4. Optional, Parameter: which lists to show, e.g.  school,finals   (blank = everything)
//
// Tapping the widget opens the full app. iOS decides when widgets refresh (roughly every 15 minutes).

// Fill these in once. The widget then remembers them on your phone (in Scriptable's Keychain),
// so when you paste in a newer version of this script you can leave them as PASTE_...
const SET_SCRIPT_URL = 'PASTE_WEB_APP_URL_HERE';   // https://script.google.com/macros/s/.../exec
const SET_KEY = 'PASTE_KEY_HERE';
const SET_APP_LINK = 'PASTE_PRIVATE_LINK_HERE';    // https://qafa-17.github.io/boom-boom-bam/#s=...&k=...

async function loadSetup() {
  // Accepts these lines either way: SET_SCRIPT_URL... (this version) or SCRIPT_URL... (older versions)
  const pick = f => { try { const v = f(); return typeof v === 'string' ? v : ''; } catch (e) { return ''; } };
  const typed = {
    SCRIPT_URL: pick(() => SET_SCRIPT_URL) || pick(() => SCRIPT_URL),
    KEY: pick(() => SET_KEY) || pick(() => KEY),
    APP_LINK: pick(() => SET_APP_LINK) || pick(() => APP_LINK),
  };
  const out = {};
  for (const name of Object.keys(typed)) {
    const v = typed[name].trim(), k = 'boom-boom-bam.' + name;
    if (v && !v.startsWith('PASTE_')) { out[name] = v; Keychain.set(k, v); }
    else if (Keychain.contains(k)) out[name] = Keychain.get(k);
    else out[name] = '';
  }
  // Nothing saved yet and you're running it inside Scriptable: ask once.
  if ((!out.SCRIPT_URL || !out.KEY) && !config.runsInWidget) {
    const a = new Alert();
    a.title = 'Connect your list';
    a.message = 'Paste your Web app URL, key and private link. They are saved on this phone only.';
    a.addTextField('Web app URL (ends in /exec)', out.SCRIPT_URL);
    a.addTextField('Key', out.KEY);
    a.addTextField('Private link (optional)', out.APP_LINK);
    a.addAction('Save');
    a.addCancelAction('Cancel');
    if ((await a.presentAlert()) === 0) {
      ['SCRIPT_URL', 'KEY', 'APP_LINK'].forEach((name, i) => {
        const v = a.textFieldValue(i).trim();
        out[name] = v; if (v) Keychain.set('boom-boom-bam.' + name, v);
      });
    }
  }
  return out;
}
const SETUP = await loadSetup();
const API_URL = SETUP.SCRIPT_URL, API_KEY = SETUP.KEY, OPEN_LINK = SETUP.APP_LINK;

const MONTHS = [
  ['January', '#8c2f45', '#f1d3da'], ['February', '#a3476d', '#f4d6e2'], ['March', '#4f7d5c', '#d9eadb'],
  ['April', '#4b5fa6', '#dbe1f6'], ['May', '#6f56a0', '#e5ddf3'], ['June', '#b03a3e', '#f6d6d4'],
  ['July', '#22698c', '#d3e9f2'], ['August', '#8f6b0c', '#f6e6b4'], ['September', '#b25a22', '#f8dfcb'],
  ['October', '#9b4a1c', '#f1d9c6'], ['November', '#5f7a1c', '#e4efbf'], ['December', '#2d7397', '#d8eef8'],
];
const LIST_NAMES = { grocery: 'Grocery', finals: 'Finals study', home: 'Home', school: 'School' };
const ROWS = { small: 3, medium: 4, large: 11, extraLarge: 15 };

const now = new Date();
const [MONTH, ACCENT, TINT] = MONTHS[now.getMonth()];
const C = {
  bg: new Color('#f6f0e3'), card: new Color('#fffdf8'), border: new Color('#e6ddc9'),
  text: new Color('#1d2330'), muted: new Color('#6f6a60'), accent: new Color(ACCENT),
  track: new Color('#e3dac6'), late: new Color('#b42318'), chipText: new Color('#1d2330'),
};
const F = (size, style) => new Font(style === 'b' ? 'Georgia-Bold' : style === 'i' ? 'Georgia-Italic' : 'Georgia', size);

// ---------- data (falls back to the last copy when offline) ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), 'boom-boom-bam-cache.json');
async function getData() {
  try {
    const req = new Request(API_URL + '?fn=load&key=' + encodeURIComponent(API_KEY));
    req.timeoutInterval = 12;
    const res = await req.loadJSON();
    if (!res.ok) throw new Error(res.error);
    fm.writeString(cachePath, JSON.stringify({ at: Date.now(), result: res.result }));
    return { data: res.result, stale: false, at: new Date() };
  } catch (e) {
    if (fm.fileExists(cachePath)) { const c = JSON.parse(fm.readString(cachePath)); return { data: c.result, stale: true, at: new Date(c.at) }; }
    return { data: null, error: String(e.message || e) };
  }
}

// ---------- helpers ----------
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const days = s => Math.round((pd(s) - midnight) / 864e5);
function prettyCat(c) {
  if (!c) return '';
  if (c.replace(/[^A-Za-z]/g, '').length <= 3 && !c.includes(' ')) return c;
  return c.charAt(0) + c.slice(1).toLowerCase();
}
// same category colours as the app
const CAT_TINTS = ['#fbd9b5', '#d7dcfa', '#ead5f3', '#c9ece0', '#fdd3db', '#f2e49c', '#cfe6f3', '#e9dccb', '#f8cfc0', '#f3d4ec', '#c8e3e8'];
function catTint(c) { let h = 0; for (const ch of c.toUpperCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return CAT_TINTS[h % CAT_TINTS.length]; }
function dueLabel(it) {
  const d = pd(it.due), opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}
function bar(width, pct) {
  const dc = new DrawContext();
  dc.size = new Size(width, 6); dc.opaque = false; dc.respectScreenScale = true;
  const track = new Path(); track.addRoundedRect(new Rect(0, 0, width, 6), 3, 3);
  dc.addPath(track); dc.setFillColor(C.track); dc.fillPath();
  if (pct > 0) {
    const fill = new Path(); fill.addRoundedRect(new Rect(0, 0, Math.max(6, width * pct), 6), 3, 3);
    dc.addPath(fill); dc.setFillColor(C.accent); dc.fillPath();
  }
  return dc.getImage();
}

// ---------- pictures drawn in code ----------
function img(w, h, draw) {
  const dc = new DrawContext(); dc.size = new Size(w, h); dc.opaque = false; dc.respectScreenScale = true;
  draw(dc); return dc.getImage();
}
const checkbox = () => img(18, 18, dc => {
  const p = new Path(); p.addRoundedRect(new Rect(1, 1, 16, 16), 4.5, 4.5);
  dc.addPath(p); dc.setFillColor(C.card); dc.fillPath();
  dc.addPath(p); dc.setStrokeColor(C.accent); dc.setLineWidth(1.4); dc.strokePath();
});
const hline = (w, color, h = 1) => img(w, h, dc => { dc.setFillColor(color); dc.fillRect(new Rect(0, 0, w, h)); });

// the paper-and-tiles background, downloaded once a week and kept on the phone
const BG_URL = 'https://raw.githubusercontent.com/qafa-17/boom-boom-bam/main/docs/art/widget-bg.jpg';
async function background() {
  const path = fm.joinPath(fm.documentsDirectory(), 'boom-boom-bam-bg.jpg');
  const fresh = fm.fileExists(path) && (Date.now() - fm.modificationDate(path).getTime()) < 7 * 864e5;
  if (!fresh) {
    try { const im = await new Request(BG_URL).loadImage(); fm.writeImage(path, im); return im; } catch (e) { /* use the old copy */ }
  }
  return fm.fileExists(path) ? fm.readImage(path) : null;
}

function chip(parent, label, tint, opts = {}) {
  const c = parent.addStack(); c.cornerRadius = 4; c.setPadding(1, 6, 1, 6); c.backgroundColor = new Color(tint);
  if (opts.late) { c.borderColor = C.late; c.borderWidth = 1.2; }
  const t = c.addText(label); t.font = F(opts.size || 10, opts.bold ? 'b' : ''); t.textColor = C.chipText; t.lineLimit = 1;
  return c;
}

// ---------- build: laid out like the app ----------
async function build() {
  const family = config.widgetFamily || 'large';
  const big = family === 'large' || family === 'extraLarge';
  const W = family === 'small' ? 140 : 320;                 // usable width in points
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  const bg = await background(); if (bg) w.backgroundImage = bg;
  w.setPadding(14, 14, 10, 14);
  if (OPEN_LINK.startsWith('http')) w.url = OPEN_LINK;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60e3);

  const { data, stale, error, at } = await getData();
  const names = Object.assign({}, LIST_NAMES);
  const hidden = (data && data.settings && data.settings.hiddenLists) || [];
  hidden.forEach(id => delete names[id]);
  ((data && data.settings && data.settings.extraLists) || []).forEach(l => { names[l.id] = l.name; });
  const idFor = x => Object.keys(names).find(id => id.toLowerCase() === x || names[id].toLowerCase() === x) || x;
  const want = (args.widgetParameter || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).map(idFor);
  const all = (data ? data.items : []).filter(i => !want.length || want.includes(i.list));
  for (const i of all) {   // items saved the old way: "LI" as the item, the task as a note
    if (!i.cat && i.notes && /^[A-Z0-9&+'.\/-]+( [A-Z0-9&+'.\/-]+)*$/.test(i.text) && /[A-Z]{2}/.test(i.text)) {
      i.cat = i.text; i.text = i.notes.charAt(0).toUpperCase() + i.notes.slice(1); i.notes = '';
    }
  }
  const open = all.filter(i => !i.done).sort((a, b) =>
    (a.due ? 0 : 1) - (b.due ? 0 : 1) || (a.due || '').localeCompare(b.due || '') ||
    (a.time || '99').localeCompare(b.time || '99') || (a.created || 0) - (b.created || 0));
  const doneN = all.length - open.length;

  // header: title and month on the left, last update on the right (where the app says "Saved")
  const head = w.addStack(); head.layoutHorizontally(); head.bottomAlignContent();
  const ht = head.addStack(); ht.layoutVertically();
  const title = ht.addText('To do'); title.font = F(big ? 22 : 17, 'b'); title.textColor = C.text;
  const month = ht.addText(MONTH); month.font = F(11, 'i'); month.textColor = C.muted;
  head.addSpacer();
  const upd = head.addText(data ? (stale ? 'Offline ' : '') + (at || now).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '');
  upd.font = F(10.5); upd.textColor = C.muted;

  // list names, the one shown underlined (all of them when no Parameter is set)
  if (big) {
    w.addSpacer(8);
    const tabs = w.addStack(); tabs.layoutHorizontally(); tabs.spacing = 12;
    const ids = Object.keys(names);
    const showing = want.length ? want : ids;
    names.__all = 'Combined';
    for (const id of [...ids, '__all']) {
      const on = id === '__all' ? !want.length : (showing.includes(id) && want.length > 0);
      const col = tabs.addStack(); col.layoutVertically(); col.spacing = 3;
      const t = col.addText(names[id]); t.font = F(11.5); t.textColor = on ? C.text : C.muted; t.lineLimit = 1;
      if (on) col.addImage(hline(Math.min(90, names[id].length * 6.2), C.accent, 2));
    }
    tabs.addSpacer();
    w.addSpacer(4);
    w.addImage(hline(W, C.border)).imageSize = new Size(W, 1);
  }

  // progress
  w.addSpacer(big ? 8 : 6);
  if (all.length) {
    const pr = w.addStack(); pr.layoutHorizontally(); pr.centerAlignContent();
    const bw = family === 'small' ? W : W - 80;
    const im = pr.addImage(bar(bw, doneN / all.length)); im.imageSize = new Size(bw, 6);
    if (family !== 'small') { pr.addSpacer(); const pl = pr.addText(`${doneN} of ${all.length} done`); pl.font = F(11); pl.textColor = C.muted; }
    w.addSpacer(big ? 10 : 6);
  }

  if (!data || !open.length) {
    w.addSpacer();
    let msg, hint = '';
    const total = data ? (data.items || []).length : 0;
    if (!data) { msg = API_URL.startsWith('http') ? "Can't reach your list right now." : 'Open Scriptable and run this script once to connect your list.'; hint = error && API_URL.startsWith('http') ? error : ''; }
    else if (all.length) msg = 'All done. Boom!';
    else if (total && want.length) { msg = 'Nothing on ' + want.map(id => names[id] || id).join(', ') + '.'; hint = "Check the widget's Parameter (long-press, Edit Widget), or clear it to show everything."; }
    else { msg = 'Your Google Sheet has no items yet.'; hint = 'Items show up here once the app says "Saved".'; }
    const t = w.addText(msg); t.font = F(15); t.textColor = C.text; t.centerAlignText();
    if (hint) { w.addSpacer(4); const h = w.addText(hint); h.font = F(10.5); h.textColor = C.muted; h.centerAlignText(); }
    w.addSpacer(); return w;
  }

  // the card of items
  const max = { small: 3, medium: 2, large: 6, extraLarge: 9 }[family] || 6;
  const card = w.addStack(); card.layoutVertically();
  card.backgroundColor = C.card; card.cornerRadius = 12; card.borderColor = C.border; card.borderWidth = 1;
  const rows = open.slice(0, max);
  rows.forEach((it, k) => {
    const row = card.addStack(); row.layoutHorizontally(); row.topAlignContent();
    row.setPadding(family === 'small' ? 6 : 8, 10, family === 'small' ? 6 : 8, 10); row.spacing = 9;
    const cb = row.addImage(checkbox()); cb.imageSize = new Size(16, 16);
    const col = row.addStack(); col.layoutVertically(); col.spacing = 3;
    const t = col.addText(it.text); t.font = F(family === "small" ? 12 : 13); t.textColor = C.text; t.lineLimit = 1;
    if (family !== 'small' && (it.cat || it.due)) {
      const meta = col.addStack(); meta.layoutHorizontally(); meta.spacing = 5; meta.centerAlignContent();
      if (it.cat) chip(meta, prettyCat(it.cat), catTint(it.cat), { size: 9 });
      if (it.due) chip(meta, dueLabel(it), MONTHS[pd(it.due).getMonth()][2], { size: 10, late: days(it.due) < 0 });
      if (want.length !== 1 && big) { const l = meta.addText(names[it.list] || ''); l.font = F(9.5); l.textColor = C.muted; l.lineLimit = 1; }
    }
    row.addSpacer();
    if (k < rows.length - 1) card.addImage(hline(W, C.border)).imageSize = new Size(W, 1);
  });
  w.addSpacer();
  if (open.length > max) {
    const more = w.addText(`+${open.length - max} more`); more.font = F(10.5, 'i'); more.textColor = C.muted; more.rightAlignText();
  }
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentLarge();
Script.complete();
