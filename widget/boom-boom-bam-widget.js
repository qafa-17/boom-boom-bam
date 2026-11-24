// Boom Boom Bam: iPhone home-screen widget, for the free Scriptable app.
//
// Setup (README has the full steps):
//   1. Paste your Apps Script web app URL and key below.
//   2. Paste your private link (Settings > Copy private link in the app) as APP_LINK.
//   3. Add a Scriptable widget to your home screen (Large shows the most),
//      long-press it > Edit Widget > Script: this one.
//   4. Optional, Parameter: which lists to show, e.g.  school,finals   (blank = everything)
//
// Tapping the widget opens the full app. iOS decides when widgets refresh (roughly every 15 minutes).

const SCRIPT_URL = 'PASTE_WEB_APP_URL_HERE';   // https://script.google.com/macros/s/.../exec
const KEY = 'PASTE_KEY_HERE';
const APP_LINK = 'PASTE_PRIVATE_LINK_HERE';    // https://qafa-17.github.io/boom-boom-bam/#s=...&k=...

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
  bg: Color.dynamic(new Color('#f6f0e3'), new Color('#12151c')),
  text: Color.dynamic(new Color('#1d2330'), new Color('#e7eaf0')),
  muted: Color.dynamic(new Color('#6f6a60'), new Color('#98a1b3')),
  accent: new Color(ACCENT),
  track: Color.dynamic(new Color('#e3dac6'), new Color('#2d3442')),
  late: new Color('#b42318'),
};
const F = (size, style) => new Font(style === 'b' ? 'Georgia-Bold' : style === 'i' ? 'Georgia-Italic' : 'Georgia', size);

// ---------- data (falls back to the last copy when offline) ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), 'boom-boom-bam-cache.json');
async function getData() {
  try {
    const req = new Request(SCRIPT_URL + '?fn=load&key=' + encodeURIComponent(KEY));
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
  const n = days(it.due);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tmrw';
  if (n > 1 && n < 7) return pd(it.due).toLocaleDateString(undefined, { weekday: 'short' });
  return pd(it.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

// ---------- build ----------
async function build() {
  const family = config.widgetFamily || 'large';
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(14, 16, 12, 16);
  if (APP_LINK.startsWith('http')) w.url = APP_LINK;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60e3);

  const { data, stale, error, at } = await getData();
  const want = (args.widgetParameter || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const all = (data ? data.items : []).filter(i => !want.length || want.includes(String(i.list).toLowerCase()));
  const open = all.filter(i => !i.done).sort((a, b) =>
    (a.due ? 0 : 1) - (b.due ? 0 : 1) || (a.due || '').localeCompare(b.due || '') ||
    (a.time || '99').localeCompare(b.time || '99') || (a.cat || '~').localeCompare(b.cat || '~') || a.created - b.created);
  const doneN = all.length - open.length;

  // header
  const head = w.addStack(); head.layoutHorizontally(); head.centerAlignContent();
  const title = head.addText(want.length === 1 ? (LIST_NAMES[want[0]] || want[0]) : 'To do');
  title.font = F(family === 'small' ? 15 : 17, 'b'); title.textColor = C.text;
  head.addSpacer(6);
  const month = head.addText(MONTH); month.font = F(12, 'i'); month.textColor = C.muted;
  head.addSpacer();
  const count = head.addText(all.length ? `${doneN}/${all.length}` : ''); count.font = F(12); count.textColor = C.muted;
  w.addSpacer(6);
  if (all.length) { const img = w.addImage(bar(family === 'small' ? 130 : 300, doneN / all.length)); img.imageSize = new Size(family === 'small' ? 130 : 300, 6); w.addSpacer(8); }

  if (!data) {
    const t = w.addText(SCRIPT_URL.startsWith('http') ? "Can't reach your list right now." : 'Open this script in Scriptable and paste your URL, key and link at the top.');
    t.font = F(13); t.textColor = C.muted;
    if (error && SCRIPT_URL.startsWith('http')) { const e = w.addText(error); e.font = F(10); e.textColor = C.muted; }
    w.addSpacer(); return w;
  }
  if (!open.length) {
    w.addSpacer();
    const total = (data.items || []).length;
    let msg, hint = '';
    if (all.length) msg = 'All done. Boom!';
    else if (total && want.length) { msg = 'Nothing on ' + want.join(', ') + '.'; hint = 'Your sheet has ' + total + ' item' + (total === 1 ? '' : 's') + ' on other lists. Check the widget\'s Parameter (long-press, Edit Widget) or clear it to show everything.'; }
    else { msg = 'Your Google Sheet has no items yet.'; hint = 'Items show up here once the app says "Saved" at the top. Things added while it says "This device only" stay on that device.'; }
    const t = w.addText(msg); t.font = F(16, 'b'); t.textColor = C.text; t.centerAlignText();
    if (hint) { w.addSpacer(6); const h = w.addText(hint); h.font = F(11); h.textColor = C.muted; h.centerAlignText(); }
    w.addSpacer(); return w;
  }

  const max = ROWS[family] || 11;
  for (const it of open.slice(0, max)) {
    const row = w.addStack(); row.layoutHorizontally(); row.centerAlignContent(); row.spacing = 8;
    if (family !== 'small') {
      const pill = row.addStack(); pill.size = new Size(52, 18); pill.cornerRadius = 4; pill.centerAlignContent();
      if (it.due) {
        const m = pd(it.due).getMonth();
        pill.backgroundColor = new Color(MONTHS[m][2]);
        if (days(it.due) < 0) { pill.borderColor = C.late; pill.borderWidth = 1.5; }
        const d = pill.addText(dueLabel(it)); d.font = F(11, 'b'); d.textColor = new Color('#1d2330'); d.lineLimit = 1; d.minimumScaleFactor = 0.7;
      }
    }
    const t = row.addText(it.text); t.font = F(family === 'small' ? 13 : 14.5, 'b'); t.textColor = C.text; t.lineLimit = 1; t.minimumScaleFactor = 0.85;
    if (it.cat && family !== 'small') {
      const cp = row.addStack(); cp.cornerRadius = 3; cp.setPadding(1, 5, 1, 5); cp.backgroundColor = new Color(catTint(it.cat));
      const c = cp.addText(prettyCat(it.cat)); c.font = F(9.5); c.textColor = new Color('#1d2330'); c.lineLimit = 1;
    }
    row.addSpacer();
    w.addSpacer(family === 'large' || family === 'extraLarge' ? 5 : 3);
  }
  w.addSpacer();
  const extra = open.length - max;
  const foot = w.addStack(); foot.layoutHorizontally();
  const more = foot.addText(extra > 0 ? `+${extra} more` : ''); more.font = F(11, 'i'); more.textColor = C.muted;
  foot.addSpacer();
  const when = foot.addText((stale ? 'Offline, as of ' : 'Updated ') + (at || now).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
  when.font = F(10); when.textColor = C.muted;
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentLarge();
Script.complete();
