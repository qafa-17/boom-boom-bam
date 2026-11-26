// =====================================================================
// Turns a loosely typed line into a tidy to-do item.
//
//   "Career Mentorship sign up -- nov 21"
//      -> { text: "Career Mentorship Sign-up", due: "2026-11-21" }
//   "SS trading cards need to make nov 27"
//      -> { text: "Need to make trading cards", cat: "SS", due: "2026-11-27" }
//
// Works in the browser (window.BBB.parseItem) and in Node (module.exports).
// =====================================================================
(function (root) {
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const WEEKDAY = '(?:sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)';

  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  let NOW = null;                                   // tests can pin "today"
  function today() { const d = NOW ? new Date(NOW) : new Date(); d.setHours(0, 0, 0, 0); return d; }
  function shift(n) { const d = today(); d.setDate(d.getDate() + n); return ymd(d); }

  // A to-do date a few weeks back is just overdue. Only a date long gone
  // ("jan 5" typed in November) means next year.
  function makeDate(y, m, d, yearGiven) {
    const t = today();
    if (y == null) y = t.getFullYear(); else if (y < 100) y += 2000;
    let dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    if (!yearGiven && (t - dt) / 864e5 > 60) dt = new Date(y + 1, m - 1, d);
    return ymd(dt);
  }

  function monthIndex(s) {
    s = s.replace(/\.$/, '');
    if (s.length < 3) return null;
    const full = MONTH_NAMES.findIndex(n => n.startsWith(s));
    if (full !== -1) return full + 1;
    const abbr = MONTHS.indexOf(s.slice(0, 3));
    return abbr !== -1 && s.length <= 10 ? abbr + 1 : null;
  }

  function parseDate(input) {
    const hadOrdinal = /\d(st|nd|rd|th)\b/i.test(input);
    let s = input.trim().toLowerCase()
      .replace(/[(),]/g, ' ')
      .replace(/(\d)(st|nd|rd|th)\b/g, '$1')
      .replace(/\b(on|due|by|the|of|this|before)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
    let m;
    if (!s) return null;
    if (/^(today|tonight|tdy|tod|eod)$/.test(s)) return shift(0);
    if (/^(tomorrow|tmrw|tmr|tmrrw|tomorow|tommorow|tommorrow)( night| morning)?$/.test(s)) return shift(1);
    if (/^(day after tomorrow|overmorrow)$/.test(s)) return shift(2);
    if (s === 'next week') return shift(7);
    if (/^(weekend|wknd)$/.test(s)) return shift((6 - today().getDay() + 7) % 7);
    if (s === 'end of week' || s === 'eow') return shift((5 - today().getDay() + 7) % 7);
    if ((m = s.match(/^in (\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten) (day|week|month)s?$/))) {
      const n = /^\d/.test(m[1]) ? +m[1] : WORDNUM[m[1]];
      if (m[2] === 'month') { const d = today(); d.setMonth(d.getMonth() + n); return ymd(d); }
      return shift(n * (m[2] === 'week' ? 7 : 1));
    }
    if ((m = s.match(new RegExp('^(next )?(' + WEEKDAY + ')$')))) {
      const want = DAYS.indexOf(m[2].slice(0, 3));
      let add = (want - today().getDay() + 7) % 7;
      if (m[1] && add === 0) add = 7;
      return shift(add);
    }
    const bare = s.replace(new RegExp('\\b' + WEEKDAY + '\\b', 'g'), ' ').replace(/\s+/g, ' ').trim();
    if (bare && bare !== s) return parseDate(bare);
    if ((m = s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/))) return makeDate(+m[1], +m[2], +m[3], true);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2}|\d{4}))?$/))) {
      let mo = +m[1], d = +m[2];
      if (mo > 12 && d <= 12) [mo, d] = [d, mo];
      return makeDate(m[3] ? +m[3] : null, mo, d, !!m[3]);
    }
    if ((m = s.match(/^([a-z]+\.?) (\d{1,2})(?: (\d{4}))?$/)) && monthIndex(m[1]))
      return makeDate(m[3] ? +m[3] : null, monthIndex(m[1]), +m[2], !!m[3]);
    if ((m = s.match(/^(\d{1,2}) ([a-z]+\.?)(?: (\d{4}))?$/)) && monthIndex(m[2]))
      return makeDate(m[3] ? +m[3] : null, monthIndex(m[2]), +m[1], !!m[3]);
    if (hadOrdinal && (m = s.match(/^(\d{1,2})$/))) {
      const t = today(), day = +m[1];
      for (let i = 0; i < 3; i++) {
        const d = new Date(t.getFullYear(), t.getMonth() + i, day);
        if (d.getDate() === day && d >= t) return ymd(d);
      }
    }
    return null;
  }

  // "3pm", "3:30 pm", "15:00", "noon", "at 9am"  ->  "15:00"
  function parseTime(input) {
    const s = input.trim().toLowerCase().replace(/^(at|@)\s*/, '').replace(/\./g, '');
    if (s === 'noon') return '12:00';
    if (s === 'midnight') return '00:00';
    const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
    if (!m || (!m[2] && !m[3])) return null;                  // a bare "3" is too vague
    let h = +m[1]; const min = m[2] ? +m[2] : 0;
    if (h > 23 || min > 59) return null;
    if (m[3]) { if (m[3][0] === 'p' && h < 12) h += 12; if (m[3][0] === 'a' && h === 12) h = 0; }
    return pad(h) + ':' + pad(min);
  }

  // ---------- categories ----------
  const strip = t => t.replace(/[:;,.!?]+$/, '');
  function isCaps(t) {
    const s = strip(t), L = s.replace(/[^A-Za-z]/g, '');
    if (L.length < 2 || L !== L.toUpperCase() || !/^[A-Z0-9&+'.\/-]+$/.test(s)) return false;
    if (/^\d{1,2}(:\d{2})?(AM|PM)$/.test(s) || /^(AM|PM)$/.test(s)) return false;   // 3PM is a time
    return true;
  }
  // Short codes stay as typed (SS, CS, HR). Words become Firstcap: CHEM -> Chem, LINEAR ALGEBRA -> Linear algebra.
  function prettyCat(c) {
    if (!c) return '';
    if (c.replace(/[^A-Za-z]/g, '').length <= 3 && !c.includes(' ')) return c;
    return c.charAt(0) + c.slice(1).toLowerCase();
  }

  // ---------- tidying the wording ----------
  const MINOR = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'of', 'on', 'in', 'at', 'to', 'by', 'up', 'with', 'from', 'as', 'via', 'vs']);
  // phrasal verb at the end of a noun phrase -> the noun form
  const NOUNS = { 'sign up': 'sign-up', 'check in': 'check-in', 'follow up': 'follow-up', 'set up': 'setup', 'pick up': 'pickup',
    'drop off': 'drop-off', 'check up': 'checkup', 'clean up': 'cleanup', 'work out': 'workout', 'log in': 'login', 'hand in': 'hand-in', 'meet up': 'meetup' };
  const VERBS = new Set(['make', 'do', 'buy', 'get', 'finish', 'start', 'send', 'email', 'call', 'text', 'print', 'submit', 'book', 'pay', 'return',
    'review', 'read', 'study', 'write', 'fix', 'clean', 'cancel', 'renew', 'schedule', 'sign', 'order', 'file', 'wash', 'practice', 'practise', 'prep',
    'prepare', 'update', 'apply', 'edit', 'draft', 'plan', 'design', 'reply', 'answer', 'check', 'pack', 'mail', 'post', 'upload', 'download', 'record',
    'grade', 'mark', 'organize', 'organise', 'sort', 'cook', 'bake', 'water', 'iron', 'fold', 'vacuum', 'mop', 'dust', 'feed', 'walk', 'refill', 'return']);
  const AUX = /^(.+?)\s+(need to|needs to|have to|has to|gotta|got to|must|should)\s+(\S+(?:\s+(?:up|out|off|in|on|back|over|down))?)$/i;

  function tidy(text) {
    let t = text.replace(/\s+/g, ' ').replace(/^[\s\-–—:|,;]+|[\s\-–—:|,;]+$/g, '');
    if (!t) return t;
    // "trading cards need to make" -> "need to make trading cards"
    let m = t.match(AUX);
    if (m && !/\b(i|we|you|he|she|they|it)$/i.test(m[1])) {
      let aux = m[2].toLowerCase();
      if (aux === 'needs to') aux = 'need to'; if (aux === 'has to') aux = 'have to'; if (aux === 'gotta' || aux === 'got to') aux = 'have to';
      t = aux + ' ' + m[3] + ' ' + m[1];
    } else if ((m = t.match(/^(.+?)\s+to\s+(\S+)$/i)) && VERBS.has(m[2].toLowerCase()) && m[1].split(' ').length <= 6) {
      // "trading cards to make" -> "make trading cards"
      t = m[2] + ' ' + m[1];
    }
    // "Mentorship sign up" -> "Mentorship sign-up" (only when it ends a noun phrase, not "need to sign up")
    for (const [verb, noun] of Object.entries(NOUNS)) {
      const re = new RegExp('(\\S+)\\s+' + verb.replace(' ', '\\s+') + '$', 'i');
      const mm = t.match(re);
      if (mm && !/^(to|will|must|should|please|and|then|gotta)$/i.test(mm[1])) {
        const typed = t.slice(t.length - mm[0].length + mm[1].length).trim();
        t = t.slice(0, t.length - typed.length) + (typed[0] === typed[0].toUpperCase() && /[A-Z]/.test(typed[0]) ? noun[0].toUpperCase() + noun.slice(1) : noun);
        break;
      }
    }
    // Mostly Capitalized Already? Finish the job. Otherwise just a capital first letter.
    const words = t.split(' ');
    // Count ordinary words only: names like SpaceApps or LinkedIn and acronyms don't make it a title.
    const plain = w => !/[a-z][A-Z]/.test(w) && !/^[A-Z0-9&]{2,}$/.test(w);
    const rest = words.slice(1).filter(w => !MINOR.has(w.toLowerCase()) && plain(w));
    const capped = rest.filter(w => /^[A-Z]/.test(w)).length;
    if (/^[A-Z]/.test(words[0]) && rest.length >= 1 && capped >= 1 && capped >= Math.ceil(rest.length / 2)) {
      t = words.map((w, i) => {
        if (/[A-Z].*[A-Z]/.test(w) || /\d/.test(w)) return w;                 // leave acronyms, codes
        if (i > 0 && MINOR.has(w.toLowerCase())) return w.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join(' ');
    }
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ---------- finding a date/time inside free text ----------
  const LEAD = /^(due|by|on|before|for|at|until|till)$/i;
  function takeFromWords(words, opts) {
    // Try the end of the line first (most common), then right after a "due/by/on" word, then the start.
    const tries = [];
    for (let n = Math.min(4, words.length); n >= 1; n--) tries.push([words.length - n, words.length]);
    for (let i = 0; i < words.length; i++) if (LEAD.test(words[i])) for (let n = 4; n >= 1; n--) if (i + 1 + n <= words.length) tries.push([i + 1, i + 1 + n]);
    if (!opts.strict) for (let n = Math.min(3, words.length - 1); n >= 1; n--) tries.push([0, n]);
    for (const [a, b] of tries) {
      if (b - a >= words.length) continue;                              // never eat the whole title
      const chunk = words.slice(a, b).join(' ');
      if (opts.strict && /^\d/.test(chunk) && !(a > 0 && LEAD.test(words[a - 1]))) continue;   // "3/4 cup flour"
      const v = opts.fn(chunk);
      if (v) {
        let start = a;
        if (start > 0 && LEAD.test(words[start - 1])) start--;
        return { value: v, words: words.slice(0, start).concat(words.slice(b)) };
      }
    }
    return null;
  }

  function parseItem(raw, opts) {
    opts = opts || {};
    let line = String(raw).replace(/^\s*(?:[*•·\-–—]|\d+[.)]|\[\s?\])\s+/, '').trim();
    if (!line) return null;
    // "asap" anywhere (any case, with or without "due"/"by") makes the deadline ASAP
    let asap = false;
    const ASAP_RE = /(^|\s|[-–—|,:;(])(?:(?:due|by)\s+)?a\.?s\.?a\.?p\.?!*(?=$|\s|[-–—|,:;)])/i;
    if (ASAP_RE.test(line)) {
      asap = true;
      line = line.replace(ASAP_RE, '$1').replace(/\s+(?:-{1,3}|[–—|])\s*(?=(?:-{1,3}|[–—|])|$)/g, ' ').replace(/\s{2,}/g, ' ').replace(/[\s\-–—|,:;]+$/, '').replace(/^[\s\-–—|,:;]+/, '').trim();
      if (!line) return null;
    }
    const parts = line.split(/\s+(?:-{1,3}|[–—|])\s+|\s*\|\s*|\s+--?\s*$/).map(p => p.trim()).filter(Boolean);
    let due = '', time = '';
    const keep = [];
    parts.forEach((p, i) => {
      if (i > 0 || parts.length > 1) {
        let v;
        if (!due && (v = parseDate(p))) { due = v; return; }
        if (!time && (v = parseTime(p))) { time = v; return; }
        // "nov 27 3pm" in one part
        const w = p.split(/\s+/);
        for (let k = 1; k < w.length && !due; k++) {
          const d = parseDate(w.slice(0, k).join(' ')), t = parseTime(w.slice(k).join(' '));
          if (d && t) { due = d; time = t; return; }
        }
      }
      keep.push(p);
    });
    if (!keep.length) return null;
    let words = keep.shift().split(/\s+/);
    // "LI - do the SpaceApps post": a part that is only CAPS is the category, the next part is the item
    let lead = '';
    if (keep.length && words.every(isCaps)) { lead = words.map(strip).join(' '); words = keep.shift().split(/\s+/); }
    const notes = keep.join(' - ');
    const strict = opts.list === 'grocery';
    // category first: a run of CAPS at the start (or the very end) of the line
    let cat = lead;
    if (!cat) {
      let i = 0;
      while (i < words.length && isCaps(words[i])) i++;
      if (i > 0 && i < words.length) {
        let j = i;
        while (j < words.length && /^\d{3,5}$/.test(strip(words[j])) && j + 1 < words.length) j++;   // "COMP 2631 ..."
        cat = words.slice(0, j).map(strip).join(' ');
        words = words.slice(j);
      } else {
        let k = words.length;
        while (k > 0 && isCaps(words[k - 1])) k--;
        if (k > 0 && k < words.length) { cat = words.slice(k).map(strip).join(' '); words = words.slice(0, k); }
      }
    }
    // then a time ("3pm"), then a date, from inside the text
    let r;
    if (!time && (r = takeFromWords(words, { fn: parseTime, strict: false }))) { time = r.value; words = r.words; }
    if (!due && (r = takeFromWords(words, { fn: parseDate, strict }))) { due = r.value; words = r.words; }
    if (!due && time) due = shift(0);
    let text = tidy(words.join(' '));
    if (!text) { text = tidy(cat ? prettyCat(cat) : line); cat = ''; }
    if (asap) due = 'ASAP';
    return { text, cat, due, time, notes };
  }

  const api = { parseItem, parseDate, parseTime, prettyCat, tidy, setNow: d => { NOW = d; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BBB = api;
})(typeof window !== 'undefined' ? window : this);
