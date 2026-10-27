const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crystalium', {
  layout: rect => ipcRenderer.invoke('browser:layout', rect),
  newTab: url => ipcRenderer.invoke('browser:new-tab', url),
  activateTab: id => ipcRenderer.invoke('browser:activate', id),
  closeTab: id => ipcRenderer.invoke('browser:close-tab', id),
  navigate: url => ipcRenderer.invoke('browser:navigate', url),
  back: () => ipcRenderer.invoke('browser:back'),
  forward: () => ipcRenderer.invoke('browser:forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  openExternal: url => ipcRenderer.invoke('browser:external', url),
  getState: () => ipcRenderer.invoke('browser:state'),
  onState: callback => ipcRenderer.on('browser:state', (_event, state) => callback(state)),
  onError: callback => ipcRenderer.on('browser:error', (_event, message) => callback(message))
});