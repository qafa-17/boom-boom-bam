# boom-boom-bam

A to-do list you can type into the way you'd text yourself. It tidies each line into an item, a due date and a category, then sorts everything for you. It syncs between an iPhone, a Windows laptop and a home-screen widget.

```
Career Mentorship sign up -- nov 21      ->  Career Mentorship Sign-up     Due Sat, Nov 21
SS trading cards need to make nov 27     ->  Need to make trading cards    Due Fri, Nov 27   Category SS
```

## Features

- **Type loosely.** Dates (`nov 27`, `12/5`, `fri`, `tmrw`, `in 2 weeks`, `this weekend`) and times (`3pm`) are found anywhere in a line. ALL CAPS at the start (or end) becomes the category: short codes stay as typed (`SS`), words become `Chem`. Wording gets tidied: `trading cards need to make` becomes `Need to make trading cards`.
- **Side panel for adding.** Press **+ Add** (or **N** on a keyboard) to slide out the note, type or paste one item per line, and see what each line becomes before you add it. It tucks away again when you're done, so the list stays in the middle of the page.
- **Lists:** Grocery, Finals study, Home, School, plus your own. Swipe or click between them, or use **Combined** to see several lists together. Any list can be deleted in Settings (with Undo), and the default ones can be brought back.
- **ASAP.** Write `asap` anywhere in a line (`LI - do the SpaceApps post asap`) and the item jumps to the top of its list with a red ASAP tag. Editing an item has an ASAP tick box, and Filter can show only ASAP items.
- **One list, sorted by due date.** Each item's category is a coloured highlight next to its due date, not a separate heading. **Filter** lets you sort by category instead, or show only some categories or due dates (overdue, next 7 days, this month, no due date).
- **Due dates** are highlighted in their month's colour (peridot for November, ice blue for December, and so on). Late items get a red outline.
- **Monthly look:** cream paper with a dimmed blue-tile pattern, red lanterns and plum blossom in January, yellow flowers in December. The accent colour changes on the 1st too. Settings can switch to tiles only or plain paper.
- **Progress bar** per list, colour adjustable in Settings.
- **Boom, Boom, Bam.** A ticked item slides off to the left and *Boom!*, *Boom!*, *Bam!* (in that order) appears in its place and fades, then the item drops to Done at the bottom. The count starts over each time you open the app.
- Finished items go grey with a line through them and move to the bottom.

## What's in here

```
docs/index.html                   the app (hosted on GitHub Pages)
docs/parse.js                     turns a loosely typed line into an item
docs/art/                         paper texture, tile pattern, January and December art
apps-script/Code.gs               sync backend: a Google Sheet holds your list
widget/boom-boom-bam-widget.js    iPhone widget (Scriptable app)
desktop/                          Windows window that stays on top of everything
```

## Setup

### 1. Host the app (once)

Repo **Settings > Pages**: Source **Deploy from a branch**, Branch **main**, folder **/docs**, Save.
After a minute the app is at **https://qafa-17.github.io/boom-boom-bam/**. It works right away on one device; the next step makes it sync.

### 2. Sync with a Google Sheet (once)

1. Make a new Google Sheet (name it anything, e.g. *Boom Boom Bam*).
2. **Extensions > Apps Script**. Delete what's there, paste in `apps-script/Code.gs`, save.
3. Pick **getMyKey** in the function menu and press **Run**. Allow access. Copy the key from the **Execution log**.
4. **Deploy > New deployment**, type **Web app**, Execute as **Me**, Who has access **Anyone**. Deploy and copy the **Web app URL**.
5. Open the app, **Settings > Sync between devices**, paste the URL and key, **Connect**. Anything already on that device is uploaded.
6. **Copy private link** and open it on your other devices. It works like a password: don't share it or put it in the repo.

After changing `Code.gs` later, use **Deploy > Manage deployments > Edit > New version** so the URL stays the same.

### 3. iPhone

- **Full-screen app:** open your private link in Safari, **Share > Add to Home Screen**. It opens full screen like an app.
- **Widget:** install **Scriptable** (free) from the App Store. New script, paste in `widget/boom-boom-bam-widget.js`, fill in the three values at the top (or just run it and it asks), run it once to check. The values are remembered on the phone, so a newer version of the script can be pasted in without filling them in again.
  Then long-press the home screen, **+**, Scriptable, choose the **Large** size, add it, long-press it, **Edit Widget**, Script: this one.
  By default the widget shows only your **ASAP** items, from every list. Optional **Parameter**: `all` shows everything, or list names like `school,finals` show just those lists.

iPhone widgets top out at the Large size (about half the screen, around 11 items), and they can't take taps on individual items, so tapping opens the full app.

### 4. Windows

Needs [Node.js](https://nodejs.org) (LTS).

```
cd desktop
npm install
npm start          # try it
npm run dist       # builds an installer and a portable .exe into desktop/dist/
```

The window stays on top of Chrome and everything else. Minimize it to tuck it into the taskbar. Press **Alt** for the Window menu: **Keep on top** (Ctrl+Shift+P) turns floating off and on. The first time, open Settings in the window and paste your private link (or the URL and key) into Sync, then Connect. It stays connected after that.

## Notes

- Without sync connected, the app saves to that browser only.
- The parser is rule-based. It handles the usual ways of writing dates and categories, and you can always fix an item with **Edit**.
