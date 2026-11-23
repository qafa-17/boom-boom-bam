# boom-boom-bam

A cozy to-do list app that sorts itself by category and due date, with a new theme every month.

## Features

- **Categories from ALL CAPS:** start an item with a word in capitals (`CHEM finish lab report`) and it's grouped under **Chem**.
- **Due dates** (optional), highlighted in the colour of their month: peridot for November, ice blue for December, and so on.
- **Lists:** Grocery, Finals study, Home, School, plus your own. Swipe or click between them.
- **Mix lists:** view several lists together, sorted by subject.
- **Sort and filter** by category or due date (overdue, next 7 days, this month, no due date).
- **Progress bar** per list, in a colour you choose.
- **Monthly theme:** colour, stripes or checks, and hand-drawn doodles that change on the 1st.
- **Finished items** go grey with a line through them and move to the bottom, with quick confetti.
- **Paste several lines** to add them all at once.

## Structure

```
web/index.html   the app: one self-contained page (HTML, CSS, SVG doodles, JS)
```

Planned:

```
desktop/         always-on-top desktop window
mobile/          phone app with a home-screen widget
```

## Running it

Open `web/index.html` in a browser. On its own it saves to that browser only (localStorage).
Syncing across devices currently runs through the hosted version's database; the desktop and
phone apps will move sync to a shared backend.
