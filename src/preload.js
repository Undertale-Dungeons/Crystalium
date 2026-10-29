const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crystalium', {
  layout: rect => ipcRenderer.invoke('browser:layout', rect),
  newTab: url => ipcRenderer.invoke('browser:new-tab', url),
  newIncognitoTab: url => ipcRenderer.invoke('browser:new-incognito-tab', url),
  activateTab: id => ipcRenderer.invoke('browser:activate', id),
  closeTab: id => ipcRenderer.invoke('browser:close-tab', id),
  navigate: url => ipcRenderer.invoke('browser:navigate', url),
  back: () => ipcRenderer.invoke('browser:back'),
  forward: () => ipcRenderer.invoke('browser:forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  mediaControl: action => ipcRenderer.invoke('browser:media-control', action),
  pictureInPicture: () => ipcRenderer.invoke('browser:picture-in-picture'),
  chromeTransfer: () => ipcRenderer.invoke('browser:chrome-transfer'),
  openExternal: url => ipcRenderer.invoke('browser:external', url),
  getState: () => ipcRenderer.invoke('browser:state'),
  getSavedState: () => ipcRenderer.invoke('browser:saved-state'),
  windowAction: action => ipcRenderer.invoke('browser:window', action),
  updateSaved: patch => ipcRenderer.invoke('browser:saved-update', patch),
  checkForUpdates: () => ipcRenderer.invoke('browser:check-updates'),
  getUpdateStatus: () => ipcRenderer.invoke('browser:update-status'),
  installUpdate: () => ipcRenderer.invoke('browser:install-update'),
  onUpdateStatus: callback => ipcRenderer.on('browser:update-status', (_event, status) => callback(status)),
  onNotice: callback => ipcRenderer.on('browser:notice', (_event, message) => callback(message)),
  onState: callback => ipcRenderer.on('browser:state', (_event, state) => callback(state)),
  onFullscreen: callback => ipcRenderer.on('browser:fullscreen', (_event, active) => callback(!!active)),
  onError: callback => ipcRenderer.on('browser:error', (_event, message) => callback(message))
});