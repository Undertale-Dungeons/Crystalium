const { app, BrowserWindow, WebContentsView, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
let savedTabs = []; let savedActiveIndex = 0; let blockTrackers = true;
function loadSession() { try { const d=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'crystalium-state.json'),'utf8')); savedTabs=d.settings?.restoreTabs === false ? [] : (Array.isArray(d.tabs)?d.tabs:[]); savedActiveIndex=d.activeIndex||0; blockTrackers=d.settings?.blockTrackers !== false; } catch {} }
function saveSession() { try { const file=path.join(app.getPath('userData'),'crystalium-state.json'); fs.mkdirSync(path.dirname(file),{recursive:true}); let data={}; try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch{} data.tabs=tabs.map(t=>t.view.webContents.getURL()).filter(u=>/^https?:/i.test(u)); data.activeIndex=Math.max(0,tabs.findIndex(t=>t.id===activeId)); fs.writeFileSync(file,JSON.stringify(data,null,2)); } catch {} }

let win;
let tabs = [];
let activeId = null;
let nextId = 1;
let bounds = { x: 0, y: 118, width: 1000, height: 600 };

function safeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return 'https://www.google.com';
  if (/^(javascript|file|data|vbscript):/i.test(value)) throw new Error('That address scheme is not allowed.');
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#].*)?$/i.test(value) || /^[\w.-]+\.[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(value)) return 'https://' + value;
  return 'https://www.google.com/search?q=' + encodeURIComponent(value);
}
function publicTab(tab) {
  return { id: tab.id, title: tab.view.webContents.getTitle() || 'Home', url: tab.view.webContents.getURL() || '', loading: tab.view.webContents.isLoading(), canGoBack: tab.view.webContents.canGoBack(), canGoForward: tab.view.webContents.canGoForward() };
}
function sendState() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('browser:state', { tabs: tabs.map(publicTab), activeId });
}
function activeTab() { return tabs.find(t => t.id === activeId); }
function layoutViews() {
  const pageVisible = bounds.width > 0 && bounds.height > 0;
  for (const tab of tabs) {
    if (tab.id === activeId && pageVisible) {
      tab.view.setBounds(bounds);
      tab.view.setVisible(true);
    } else {
      // Native WebContentsViews sit above all HTML. Hide them entirely on the
      // home page; zero-sized bounds alone are not reliable across platforms.
      tab.view.setVisible(false);
    }
  }
}
function addTab(url = '') {
  const id = nextId++;
  const view = new WebContentsView({ webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    backgroundThrottling: true,
    spellcheck: true
  }});
  const tab = { id, view };
  tabs.push(tab);
  win.contentView.addChildView(view);
  view.setBounds(bounds);
  view.webContents.setWindowOpenHandler(({ url }) => {
    try { addTab(safeUrl(url)); } catch { /* reject unsafe schemes */ }
    return { action: 'deny' };
  });
  view.webContents.on('enter-html-full-screen', () => {
    if (win && !win.isDestroyed()) {
      // Native video/player fullscreen should also remove Crystalium's own chrome.
      win.setFullScreen(true);
      win.webContents.send('browser:fullscreen', true);
    }
  });
  view.webContents.on('leave-html-full-screen', () => {
    if (win && !win.isDestroyed()) {
      win.setFullScreen(false);
      win.webContents.send('browser:fullscreen', false);
    }
  });
  view.webContents.on('page-title-updated', () => { saveSession(); sendState(); });
  view.webContents.on('did-navigate', () => { saveSession(); sendState(); });
  view.webContents.on('did-navigate-in-page', () => { saveSession(); sendState(); });
  view.webContents.on('did-start-loading', sendState);
  view.webContents.on('did-stop-loading', sendState);
  view.webContents.on('render-process-gone', () => {
    if (win && !win.isDestroyed()) win.webContents.send('browser:error', 'A page stopped responding. You can reload this tab.');
  });
  activeId = id;
  layoutViews();
  if (url) view.webContents.loadURL(safeUrl(url)).catch(() => {});
  saveSession();
  sendState();
  return id;
}
function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index < 0) return;
  const [tab] = tabs.splice(index, 1);
  tab.view.webContents.close();
  win.contentView.removeChildView(tab.view);
  if (activeId === id) {
    activeId = tabs[Math.max(0, index - 1)]?.id ?? null;
    if (!activeId) addTab();
  }
  layoutViews();
  saveSession();
  sendState();
}
function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 620,
    backgroundColor: '#060d19', title: 'Crystalium', frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  const notifyFullscreen = active => {
    if (win && !win.isDestroyed()) win.webContents.send('browser:fullscreen', !!active);
    if (win && !win.isDestroyed()) setTimeout(() => { layoutViews(); win.webContents.send('browser:fullscreen', !!active); }, 80);
  };
  win.on('enter-full-screen', () => notifyFullscreen(true));
  win.on('leave-full-screen', () => notifyFullscreen(false));
  win.on('resize', () => { layoutViews(); });
  win.on('closed', () => { tabs = []; win = null; });
  win.webContents.on('did-finish-load', () => { if (!tabs.length) { if (savedTabs.length) { savedTabs.forEach(u => addTab(u)); activeId = tabs[Math.min(savedActiveIndex, tabs.length-1)]?.id ?? activeId; layoutViews(); sendState(); } else addTab(''); } });
}
ipcMain.handle('browser:layout', (_e, rect) => {
  if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) return;
  bounds = { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.max(0, Math.round(rect.width)), height: Math.max(0, Math.round(rect.height)) };
  layoutViews();
});
ipcMain.handle('browser:new-tab', (_e, url) => addTab(url || ''));
ipcMain.handle('browser:activate', (_e, id) => {
  if (tabs.some(t => t.id === id)) { activeId = id; layoutViews(); saveSession(); sendState(); }
});
ipcMain.handle('browser:close-tab', (_e, id) => closeTab(id));
ipcMain.handle('browser:navigate', async (_e, raw) => {
  const tab = activeTab(); if (!tab) return;
  try { await tab.view.webContents.loadURL(safeUrl(raw)); }
  catch (e) { win.webContents.send('browser:error', e.message || 'Could not open that address.'); }
});
ipcMain.handle('browser:back', () => { const t = activeTab(); if (t?.view.webContents.canGoBack()) t.view.webContents.goBack(); });
ipcMain.handle('browser:forward', () => { const t = activeTab(); if (t?.view.webContents.canGoForward()) t.view.webContents.goForward(); });
ipcMain.handle('browser:reload', () => { const t = activeTab(); if (t) t.view.webContents.reload(); });
ipcMain.handle('browser:media-control', async (_e, action) => {
  const t = activeTab(); if (!t) return {ok:false};
  try {
    const script = action === 'pause'
      ? 'document.querySelectorAll("audio,video").forEach(m=>m.pause());'
      : action === 'play'
      ? 'Promise.all([...document.querySelectorAll("audio,video")].map(m=>m.play().catch(()=>{})));'
      : action === 'mute'
      ? 'document.querySelectorAll("audio,video").forEach(m=>m.muted=true);'
      : action === 'unmute'
      ? 'document.querySelectorAll("audio,video").forEach(m=>m.muted=false);'
      : '({count:document.querySelectorAll("audio,video").length, paused:[...document.querySelectorAll("audio,video")].every(m=>m.paused)})';
    return await t.view.webContents.executeJavaScript(script, true);
  } catch { return {ok:false}; }
});
ipcMain.handle('browser:external', (_e, url) => {
  try { const parsed = new URL(url); if (['https:', 'http:'].includes(parsed.protocol)) shell.openExternal(parsed.toString()); } catch {}
});

ipcMain.handle('browser:chrome-transfer', async () => {
  if (!win) return { ok:false, error:'Browser window is unavailable.' };
  const picked = await dialog.showOpenDialog(win, {
    title: 'Choose Chrome data files to import',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Chrome bookmarks or exported cookies', extensions: ['json', 'html', 'txt', 'cookies'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });
  if (picked.canceled || !picked.filePaths.length) return { canceled:true, bookmarks:[], cookies:0 };
  const importedBookmarks = [];
  let cookieCount = 0;
  function walk(nodes) {
    for (const node of nodes || []) {
      if (node.type === 'url' && node.url && /^https?:/i.test(node.url)) importedBookmarks.push({title:node.name || node.url,url:node.url});
      if (node.children) walk(node.children);
    }
  }
  for (const file of picked.filePaths) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      if (/\.html?$/i.test(file)) {
        const re = /<A\b[^>]*HREF=["'](https?:[^"']+)["'][^>]*>([\s\S]*?)<\/A>/gi;
        let m; while ((m = re.exec(raw))) importedBookmarks.push({title:m[2].replace(/<[^>]*>/g,'').trim() || m[1],url:m[1]});
      } else if (/\.json$/i.test(file)) {
        const data = JSON.parse(raw);
        walk(data.roots ? Object.values(data.roots) : data);
      } else if (/\.(txt|cookies)$/i.test(file)) {
        for (const line of raw.split(/\r?\n/)) {
          if (!line || line.startsWith('#') && !line.startsWith('#HttpOnly_')) continue;
          const cols = line.replace(/^#HttpOnly_/, '').split('\t');
          if (cols.length < 7) continue;
          const domain = cols[0].startsWith('.') ? cols[0].slice(1) : cols[0];
          const pathValue = cols[2] || '/';
          const secure = cols[3] === 'TRUE';
          const expires = Number(cols[4]);
          const name = cols[5], value = cols.slice(6).join('\t');
          if (!domain || !name) continue;
          try {
            await require('electron').session.defaultSession.cookies.set({
              url: (secure ? 'https://' : 'http://') + domain + pathValue,
              name, value, domain: cols[0], path: pathValue, secure,
              httpOnly: line.startsWith('#HttpOnly_'),
              ...(expires > 0 ? { expirationDate: expires } : {})
            });
            cookieCount++;
          } catch {}
        }
      }
    } catch {}
  }
  const unique = [...new Map(importedBookmarks.map(b => [b.url,b])).values()];
  return { ok:true, bookmarks:unique, cookies:cookieCount, files:picked.filePaths.length };
});

ipcMain.handle('browser:state', () => ({ tabs: tabs.map(publicTab), activeId }));
ipcMain.handle('browser:saved-state', () => {
  try {
    const file = path.join(app.getPath('userData'), 'crystalium-state.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { settings: data.settings && typeof data.settings === 'object' ? data.settings : {} };
  } catch { return { settings: {} }; }
});
ipcMain.handle('browser:window', (_e, action) => {
  if (!win) return;
  if (action === 'minimize') win.minimize();
  if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
  if (action === 'close') win.close();
});
ipcMain.handle('browser:saved-update', (_e, patch) => {
  const fs = require('node:fs');
  const file = path.join(app.getPath('userData'), 'crystalium-state.json');
  let data = {};
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  for (const key of ['tabs', 'bookmarks', 'history', 'shortcuts', 'settings', 'theme', 'themeCategory']) if (patch && patch[key] !== undefined) data[key] = patch[key];
  if (patch?.settings && typeof patch.settings.blockTrackers === 'boolean') blockTrackers = patch.settings.blockTrackers;
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch {}
  return data;
});
app.whenReady().then(() => {
  // Lightweight built-in ad/tracker filtering. This is best-effort, not a full ad blocker.
  const filter = /(^|\.)((doubleclick\.net)|(googlesyndication\.com)|(adservice\.google\.com)|(adnxs\.com)|(ad\.yahoo\.com)|(adsystem\.com)|(taboola\.com)|(outbrain\.com)|(scorecardresearch\.com)|(analytics\.google\.com))$/i;
  const ses = require('electron').session.defaultSession;
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    try {
      const host = new URL(details.url).hostname;
      callback({ cancel: blockTrackers && filter.test(host) });
    } catch { callback({ cancel: false }); }
  });
  loadSession();
  app.setAppUserModelId('dev.crystalium.browser');
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', event => event.preventDefault());
  contents.setWindowOpenHandler?.(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });
});