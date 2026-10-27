const api = window.crystalium;
const $ = id => document.getElementById(id);
const strip = $('tabStrip');
const address = $('address');
const startPage = $('startPage');
const pageBounds = $('pageBounds');
const sidePanel = $('sidePanel');
let state = { tabs: [], activeId: null };
let toastTimer;
const bookmarks = [];
const historyItems = [];
function toast(message) {
  const node = $('toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
}
function currentTab() { return state.tabs.find(t => t.id === state.activeId); }
function isHome() { const t = currentTab(); return !t || !t.url; }
function updateLayout() {
  const rect = pageBounds.getBoundingClientRect();
  api.layout({ x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) });
}
function render(next) {
  state = next;
  strip.replaceChildren();
  for (const tab of state.tabs) {
    const node = document.createElement('div');
    node.className = 'tab' + (tab.id === state.activeId ? ' active' : '');
    const dot = document.createElement('span'); dot.className = 'tab-dot';
    const title = document.createElement('button'); title.className = 'tab-title'; title.textContent = tab.title || 'New tab'; title.title = tab.url || tab.title; title.onclick = () => api.activateTab(tab.id);
    const close = document.createElement('button'); close.className = 'tab-close'; close.textContent = '×'; close.title = 'Close tab'; close.onclick = e => { e.stopPropagation(); api.closeTab(tab.id); };
    node.append(dot, title, close); strip.append(node);
  }
  const tab = currentTab();
  const home = !tab || !tab.url || tab.url === 'about:blank';
  startPage.style.display = home ? 'block' : 'none';
  pageBounds.style.display = home ? 'none' : 'block';
  if (tab && tab.url && !tab.url.startsWith('about:')) address.value = tab.url;
  else address.value = '';
  $('back').disabled = !tab?.canGoBack;
  $('forward').disabled = !tab?.canGoForward;
  requestAnimationFrame(updateLayout);
}
api.onState(render);
api.onError(message => toast(message));
api.getState().then(render);
window.addEventListener('resize', updateLayout);
$('newTab').onclick = () => api.newTab();
$('back').onclick = () => api.back();
$('forward').onclick = () => api.forward();
$('reload').onclick = () => api.reload();
$('addressForm').addEventListener('submit', e => { e.preventDefault(); api.navigate(address.value); });
$('startSearch').addEventListener('submit', e => { e.preventDefault(); api.navigate($('searchInput').value); });
document.querySelectorAll('.shortcut').forEach(button => button.addEventListener('click', () => api.navigate(button.dataset.url)));
$('bookmark').onclick = () => {
  const tab = currentTab();
  if (!tab?.url) return toast('Open a page first to bookmark it.');
  if (bookmarks.some(b => b.url === tab.url)) return toast('Already bookmarked.');
  bookmarks.push({ title: tab.title, url: tab.url }); toast('Bookmark saved for this session.');
};
function showPanel(name) {
  sidePanel.classList.remove('hidden');
  $('panelBody').replaceChildren();
  const titleMap = {music:'Music player',bookmarks:'Bookmarks',history:'Recent history',settings:'Browser settings',home:'Your space'};
  $('panelTitle').textContent = titleMap[name] || 'Browser tools';
  $('panelEyebrow').textContent = name === 'music' ? 'YOUR SOUNDTRACK' : 'CRYSTALIUM TOOLS';
  if (name === 'music') renderMusic();
  else if (name === 'bookmarks') {
    addPanelText('Saved bookmarks are kept in memory in this preview. Persistent storage is planned.');
    if (!bookmarks.length) addPanelCard('No bookmarks yet','Use the ☆ button while viewing a website.');
    bookmarks.forEach(b => addPanelCard(b.title, b.url, () => { sidePanel.classList.add('hidden'); api.navigate(b.url); }));
  } else if (name === 'history') {
    addPanelText('Pages visited in this session.');
    if (!historyItems.length) addPanelCard('Nothing here yet','Start browsing to see recent pages.');
    [...historyItems].reverse().slice(0,30).forEach(h => addPanelCard(h.title, h.url, () => { sidePanel.classList.add('hidden'); api.navigate(h.url); }));
  } else if (name === 'settings') {
    addPanelCard('Resource-conscious defaults','Background throttling is enabled. This prototype does not claim a fixed RAM reduction.');
    addPanelCard('Security','Web content runs with Node integration disabled, context isolation and sandboxing enabled.');
    addPanelCard('Coming soon','Sleeping tabs, persistent bookmarks, extension support and detailed resource diagnostics.');
  } else addPanelText('Your browser workspace.');
}
function addPanelText(text) { const p = document.createElement('p'); p.className = 'panel-copy'; p.textContent = text; $('panelBody').append(p); }
function addPanelCard(title, subtitle, action) {
  const card = document.createElement('button'); card.className = 'panel-card'; card.style.width = '100%'; card.style.textAlign = 'left';
  const strong = document.createElement('strong'); strong.textContent = title;
  const small = document.createElement('small'); small.textContent = subtitle;
  card.append(strong, small); if (action) card.onclick = action; $('panelBody').append(card);
}
function renderMusic() {
  addPanelText('Play audio files from your device. Audio stays local; Crystalium does not upload your tracks.');
  const pick = document.createElement('label'); pick.className = 'file-button'; pick.textContent = 'Choose audio files';
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'audio/*'; input.multiple = true; input.hidden = true; pick.append(input); $('panelBody').append(pick);
  const list = document.createElement('div'); $('panelBody').append(list);
  const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'metadata'; $('panelBody').append(audio);
  const now = document.createElement('p'); now.className = 'song-title'; now.textContent = 'Nothing playing'; $('panelBody').append(now);
  let tracks = [], index = 0, objectUrl;
  function playTrack(i) {
    if (!tracks.length) return;
    index = (i + tracks.length) % tracks.length;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(tracks[index]);
    audio.src = objectUrl; now.textContent = tracks[index].name; audio.play().catch(() => {});
    [...list.children].forEach((el, j) => el.classList.toggle('active', j === index));
  }
  input.addEventListener('change', () => {
    tracks = [...input.files]; list.replaceChildren();
    tracks.forEach((file, i) => {
      const button = document.createElement('button'); button.className = 'panel-card'; button.style.width = '100%'; button.style.textAlign = 'left';
      button.textContent = file.name; button.onclick = () => playTrack(i); list.append(button);
    });
    if (tracks.length) playTrack(0);
  });
  audio.addEventListener('ended', () => playTrack(index + 1));
  const controls = document.createElement('div'); controls.className = 'music-controls';
  const previous = document.createElement('button'); previous.textContent = '◀'; previous.title = 'Previous track'; previous.onclick = () => playTrack(index - 1);
  const next = document.createElement('button'); next.textContent = '▶|'; next.title = 'Next track'; next.onclick = () => playTrack(index + 1);
  controls.append(previous, next); $('panelBody').insertBefore(controls, audio);
}
$('musicToggle').onclick = () => showPanel('music');
$('menuToggle').onclick = () => showPanel('settings');
$('panelClose').onclick = () => sidePanel.classList.add('hidden');
document.querySelectorAll('.rail-button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.rail-button').forEach(b => b.classList.remove('selected')); button.classList.add('selected');
  showPanel(button.dataset.panel);
}));
$('addShortcut').onclick = () => {
  const value = prompt('Website address for your shortcut:');
  if (!value) return;
  const url = /^https?:\/\//i.test(value) ? value : 'https://' + value;
  const btn = document.createElement('button'); btn.className = 'shortcut'; btn.dataset.url = url;
  const icon = document.createElement('span'); icon.className = 'shortcut-icon blue'; icon.textContent = '↗';
  const details = document.createElement('span'); const name = document.createElement('b'); name.textContent = new URL(url).hostname; const small = document.createElement('small'); small.textContent = url; details.append(name, small);
  const arrow = document.createElement('span'); arrow.className = 'shortcut-arrow'; arrow.textContent = '↗'; btn.append(icon, details, arrow); btn.onclick = () => api.navigate(url); $('shortcuts').append(btn);
};
$('minimize').onclick = () => toast('Use the window controls to minimize this preview.');
$('maximize').onclick = () => toast('Window maximize is handled by your operating system.');
$('close').onclick = () => toast('Close Crystalium using the window close control.');
api.onState(next => {
  const t = next.tabs.find(x => x.id === next.activeId);
  if (t?.url && /^https?:/i.test(t.url) && !historyItems.some(h => h.url === t.url)) historyItems.push({ title: t.title, url: t.url });
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); address.focus(); address.select(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') { e.preventDefault(); api.newTab(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') { e.preventDefault(); if (state.activeId) api.closeTab(state.activeId); }
  if (e.key === 'F5') { e.preventDefault(); api.reload(); }
});