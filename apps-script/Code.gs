/**
 * Boom Boom Bam: sync backend.
 *
 * Lives inside a Google Sheet (Extensions > Apps Script). Every to-do is one row
 * on the "Items" tab, so you can also open the sheet and read your list there.
 *
 * The web app, the desktop window and the iPhone widget all talk to this script.
 * Nothing gets in without your key (run getMyKey once to make it).
 */

const SHEET = 'Items';
const COLS = ['id', 'text', 'cat', 'due', 'time', 'list', 'done', 'doneAt', 'created', 'notes', 'updated'];
const HEADERS = ['id', 'Item', 'Category', 'Due', 'Time', 'List', 'Done', 'Done at', 'Created', 'Notes', 'Updated'];

/** Run this once from the editor, then copy the key from the Execution log. */
function getMyKey() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    props.setProperty('KEY', key);
  }
  Logger.log('Your key: ' + key);
  sheet_();                                   // makes the Items tab on first run
  return key;
}

/** If the key ever leaks, run this, then reconnect each device with the new key. */
function resetKey() {
  PropertiesService.getScriptProperties().deleteProperty('KEY');
  return getMyKey();
}

// ---------- web entry points ----------

// Web app and desktop: POST {key, fn, args}
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Bad request' }); }
  return call_(body.key, body.fn, body.args || [], ['load', 'put', 'del', 'setSettings']);
}

// iPhone widget: GET ?key=...&fn=load  (read-only)
function doGet(e) {
  const p = (e && e.parameter) || {};
  return call_(p.key, p.fn || 'load', [], ['load']);
}

function call_(key, fn, args, allowed) {
  const real = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!real || key !== real) return out_({ ok: false, error: 'Wrong key' });
  if (allowed.indexOf(fn) === -1) return out_({ ok: false, error: 'Unknown action' });
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const api = { load: load, put: put, del: del, setSettings: setSettings };
    return out_({ ok: true, result: api[fn].apply(null, args) });
  } catch (err) {
    return out_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- storage ----------

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:K').setNumberFormat('@');   // keep "2026-11-27" as text, not a Sheets date
    sh.hideColumns(1);                         // the id column is for the app, not for you
  }
  return sh;
}

function rowToItem_(r) {
  const o = {};
  COLS.forEach(function (c, i) { o[c] = r[i] === null || r[i] === undefined ? '' : String(r[i]); });
  o.done = o.done === 'true' || o.done === 'TRUE';
  o.doneAt = Number(o.doneAt) || 0;
  o.created = Number(o.created) || 0;
  return o;
}

function itemToRow_(it) {
  return COLS.map(function (c) {
    if (c === 'updated') return new Date().toISOString();
    const v = it[c];
    if (c === 'done') return v ? 'true' : 'false';
    return v === undefined || v === null ? '' : String(v);
  });
}

function findRow_(sh, id) {
  if (!id) return -1;
  const hit = sh.getRange('A:A').createTextFinder(String(id)).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : -1;
}

function load() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  const rows = n > 0 ? sh.getRange(2, 1, n, COLS.length).getValues() : [];
  const items = rows.filter(function (r) { return r[0]; }).map(rowToItem_);
  const raw = PropertiesService.getScriptProperties().getProperty('SETTINGS');
  return { items: items, settings: raw ? JSON.parse(raw) : null };
}

function put(item) {
  if (!item || !item.id) throw new Error('Missing item');
  const sh = sheet_();
  const row = itemToRow_(item);
  const at = findRow_(sh, item.id);
  if (at > 0) sh.getRange(at, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
  return true;
}

function del(id) {
  const sh = sheet_();
  const at = findRow_(sh, id);
  if (at > 1) sh.deleteRow(at);
  return true;
}

function setSettings(s) {
  PropertiesService.getScriptProperties().setProperty('SETTINGS', JSON.stringify(s || {}));
  return true;
}
