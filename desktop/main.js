// Boom Boom Bam: desktop window for Windows.
// A small window that floats above Chrome and everything else, showing the same synced list.
// Minimize it (the - button) and it waits in the taskbar until you click it again.
//
//   npm install      once
//   npm start        run it
//   npm run dist     build an installer (.exe) into dist/

const { app, BrowserWindow, Menu, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const APP_URL = 'https://qafa-17.github.io/boom-boom-bam/';
const statePath = () => path.join(app.getPath('userData'), 'window.json');

function readState() {
  try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch (e) { return {}; }
}
function writeState(s) {
  try { fs.writeFileSync(statePath(), JSON.stringify(s)); } catch (e) { /* not important */ }
}

let win;
const state = Object.assign({ width: 420, height: 780, onTop: true }, readState());

function setOnTop(on) {
  state.onTop = on;
  win.setAlwaysOnTop(on, 'floating');
  writeState(state);
  buildMenu();
}

function buildMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Window',
      submenu: [
        { label: 'Keep on top', type: 'checkbox', checked: state.onTop, accelerator: 'CmdOrCtrl+Shift+P', click: i => setOnTop(i.checked) },
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { type: 'separator' },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => win.loadURL(APP_URL) },
        { label: 'Zoom in', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Zoom out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Actual size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  win = new BrowserWindow({
    width: state.width, height: state.height, x: state.x, y: state.y,
    minWidth: 320, minHeight: 420,
    title: 'Boom Boom Bam',
    backgroundColor: '#eef0f3',
    autoHideMenuBar: true,               // press Alt to see the Window menu
    alwaysOnTop: state.onTop,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.setAlwaysOnTop(state.onTop, 'floating');
  buildMenu();
  win.loadURL(APP_URL);

  // links to other sites open in your normal browser, not in this little window
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(APP_URL)) { e.preventDefault(); shell.openExternal(url); }
  });
  win.webContents.on('did-fail-load', () => {
    win.loadURL('data:text/html,' + encodeURIComponent(
      '<body style="font:16px Georgia,serif;color:#1d2330;background:#eef0f3;padding:24px">' +
      '<h2>Can\'t reach your list</h2><p>Check your internet connection. Press Ctrl+R to try again.</p></body>'));
  });

  const remember = () => { if (!win.isMinimized() && !win.isMaximized()) Object.assign(state, win.getBounds()); writeState(state); };
  win.on('resize', remember);
  win.on('move', remember);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
