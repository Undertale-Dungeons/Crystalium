const { app, BrowserWindow, WebContentsView, ipcMain, shell } = require('electron');
const path = require('node:path');

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
  return { id: tab.id, title: tab.view.webContents.getTitle() || 'New tab', url: tab.view.webContents.getURL() || '', loading: tab.view.webContents.isLoading(), canGoBack: tab.view.webContents.canGoBack(), canGoForward: tab.view.webContents.canGoForward() };
}
function sendState() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('browser:state', { tabs: tabs.map(publicTab), activeId });
}
function activeTab() { return tabs.find(t => t.id === activeId); }
function layoutViews() {
  for (const tab of tabs) {
    if (tab.id === activeId) {
      tab.view.setBounds(bounds);
      tab.view.setVisible(true);
    } else tab.view.setVisible(false);
  }
}
function addTab(url = 'https://www.google.com') {
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
  view.webContents.on('page-title-updated', sendState);
  view.webContents.on('did-navigate', sendState);
  view.webContents.on('did-navigate-in-page', sendState);
  view.webContents.on('did-start-loading', sendState);
  view.webContents.on('did-stop-loading', sendState);
  view.webContents.on('render-process-gone', () => {
    if (win && !win.isDestroyed()) win.webContents.send('browser:error', 'A page stopped responding. You can reload this tab.');
  });
  activeId = id;
  layoutViews();
  view.webContents.loadURL(safeUrl(url)).catch(() => {});
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
  sendState();
}
function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 620,
    backgroundColor: '#060d19', title: 'Crystalium',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.on('resize', () => { layoutViews(); });
  win.on('closed', () => { tabs = []; win = null; });
  win.webContents.on('did-finish-load', () => { if (!tabs.length) addTab(); });
}
ipcMain.handle('browser:layout', (_e, rect) => {
  if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) return;
  bounds = { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.max(0, Math.round(rect.width)), height: Math.max(0, Math.round(rect.height)) };
  layoutViews();
});
ipcMain.handle('browser:new-tab', (_e, url) => addTab(url || 'https://www.google.com'));
ipcMain.handle('browser:activate', (_e, id) => {
  if (tabs.some(t => t.id === id)) { activeId = id; layoutViews(); sendState(); }
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
ipcMain.handle('browser:external', (_e, url) => {
  try { const parsed = new URL(url); if (['https:', 'http:'].includes(parsed.protocol)) shell.openExternal(parsed.toString()); } catch {}
});
ipcMain.handle('browser:state', () => ({ tabs: tabs.map(publicTab), activeId }));
app.whenReady().then(() => {
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