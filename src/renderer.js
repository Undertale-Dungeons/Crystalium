const api = window.crystalium;
const $ = id => document.getElementById(id);
const strip = $('tabStrip');
const address = $('address');
const startPage = $('startPage');
const pageBounds = $('pageBounds');
const sidePanel = $('sidePanel');
let state = { tabs: [], activeId: null };
let toastTimer;
const load = (k,d) => { try { return JSON.parse(localStorage.getItem('crystalium.'+k)) || d; } catch { return d; } };
const save = (k,v) => localStorage.setItem('crystalium.'+k,JSON.stringify(v));
const bookmarks = load('bookmarks', []);
const historyItems = load('history', []);
const settings = load('settings', { blockTrackers: true, warnInsecure: true });
const shortcuts = load('shortcuts', []);
const theme = load('theme', {accent:'#54bdff', preset:'midnight'});
const voiceStyle = load('voiceStyle','normal');
const themePresets = {midnight:{bg:'#060d19',side:'#081629',panel:'#0b1a2c',line:'#1c3652',accent:'#54bdff',text:'#edf5ff'},ocean:{bg:'#061820',side:'#082530',panel:'#0b2b39',line:'#1c5263',accent:'#42e0d0',text:'#e7fffb'},violet:{bg:'#100b20',side:'#17102b',panel:'#201638',line:'#453269',accent:'#bd9aff',text:'#f5efff'},ember:{bg:'#1a100d',side:'#241510',panel:'#321d16',line:'#63402c',accent:'#ffb36b',text:'#fff4e8'}};
function applyTheme(next){ const root=document.documentElement; const p=themePresets[next.preset]||themePresets.midnight; root.style.setProperty('--bg',p.bg);root.style.setProperty('--side',p.side);root.style.setProperty('--panel',p.panel);root.style.setProperty('--line',p.line);root.style.setProperty('--blue',next.accent||p.accent);root.style.setProperty('--cyan',next.accent||p.accent);root.style.setProperty('--text',p.text);root.style.setProperty('--accent',next.accent||p.accent); }
applyTheme(theme);
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
api.onNotice(message => toast(message));
window.addEventListener('resize', updateLayout);
$('newTab').onclick = () => api.newTab();
$('back').onclick = () => api.back();
$('forward').onclick = () => api.forward();
$('reload').onclick = () => api.reload();
$('addressForm').addEventListener('submit', e => { e.preventDefault(); api.navigate(address.value); });
$('startSearch').addEventListener('submit', e => { e.preventDefault(); api.navigate($('searchInput').value); });
document.querySelectorAll('.shortcut').forEach(button => button.addEventListener('click', () => api.navigate(button.dataset.url)));
shortcuts.forEach(item=>{if(!item?.url||document.querySelector('.shortcut[data-url="'+CSS.escape(item.url)+'"]'))return;const b=document.createElement('button');b.className='shortcut';b.dataset.url=item.url;b.innerHTML='<span class="shortcut-icon blue">↗</span><span><b></b><small></small></span><span class="shortcut-arrow">↗</span>';b.querySelector('b').textContent=item.title||item.url;b.querySelector('small').textContent=item.url;b.onclick=()=>api.navigate(item.url);$('shortcuts').append(b);});

function showPanel(name) {
  sidePanel.classList.remove('hidden');
  $('panelBody').replaceChildren();
  const titleMap = {music:'Music player',bookmarks:'Bookmarks',history:'Recent history',settings:'Browser settings',home:'Your space'};
  $('panelTitle').textContent = titleMap[name] || 'Browser tools';
  $('panelEyebrow').textContent = name === 'music' ? 'YOUR SOUNDTRACK' : 'CRYSTALIUM TOOLS';
  if (name === 'music') renderMusic();
  else if (name === 'bookmarks') {
    addPanelText('Bookmarks are saved on this device.');
    const current=currentTab();
    if(current?.url && /^https?:/i.test(current.url)) addPanelCard('＋ Save current page',current.title||current.url,()=>{if(!bookmarks.some(b=>b.url===current.url)){bookmarks.push({title:current.title,url:current.url});save('bookmarks',bookmarks);toast('Bookmark saved.');showPanel('bookmarks');}else toast('Already bookmarked.');});
    if (!bookmarks.length) addPanelCard('No bookmarks yet','Open Settings and use the bookmarks panel to save pages.');
    bookmarks.forEach((b,i) => addPanelCard(b.title, b.url, () => { sidePanel.classList.add('hidden'); api.navigate(b.url); }));
  } else if (name === 'history') {
    addPanelText('Recent pages are saved on this device.');
    if (!historyItems.length) addPanelCard('Nothing here yet','Start browsing to see recent pages.');
    [...historyItems].reverse().slice(0,30).forEach(h => addPanelCard(h.title, h.url, () => { sidePanel.classList.add('hidden'); api.navigate(h.url); }));
  } else if (name === 'settings') {
    addPanelText('Make Crystalium feel like yours. Your choices are saved on this device.');
    const section=(label)=>{const h=document.createElement('h3');h.className='settings-section';h.textContent=label;$('panelBody').append(h);};
    section('Appearance');
    const presets=[['midnight','Midnight'],['ocean','Ocean'],['violet','Violet'],['ember','Ember']];
    presets.forEach(([id,label])=>{const b=document.createElement('button');b.className='theme-option';b.innerHTML='<span class="theme-swatch '+id+'"></span><span>'+label+'</span><small>Free built-in theme</small>';b.onclick=()=>{theme.preset=id;theme.accent=themePresets[id].accent;save('theme',theme);applyTheme(theme);showPanel('settings');toast(label+' theme applied.');};$('panelBody').append(b);});
    const colorBox=document.createElement('div');colorBox.className='panel-card';
    const colorLabel=document.createElement('label');colorLabel.className='color-setting';colorLabel.textContent='UI accent color';
    const color=document.createElement('input');color.type='color';color.value=theme.accent||themePresets[theme.preset]?.accent||'#54bdff';color.oninput=()=>{theme.accent=color.value;save('theme',theme);applyTheme(theme);};colorLabel.append(color);colorBox.append(colorLabel);$('panelBody').append(colorBox);
    const download=document.createElement('button');download.className='panel-card';download.style.width='100%';download.textContent='Download theme settings (.json)';download.onclick=()=>{const blob=new Blob([JSON.stringify(theme,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='crystalium-theme.json';a.click();URL.revokeObjectURL(url);};$('panelBody').append(download);
    section('Speaking style');
    const style=document.createElement('select');style.className='style-select';[['normal','Standard'],['pirate','Pirate / treasure speak'],['shakespeare','Shakespearean'],['tree','Mysterious forest oracle']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;style.append(o);});style.value=voiceStyle;style.onchange=()=>{localStorage.setItem('crystalium.voiceStyle',style.value);toast(({normal:'Standard style selected.',pirate:'Arrr! Pirate speak be selected.',shakespeare:'A Shakespearean tongue, most noble.',tree:'The old tree whispers in riddles…'})[style.value]);};$('panelBody').append(style);
    const preview=document.createElement('button');preview.className='panel-card';preview.style.width='100%';preview.textContent='Preview speaking style';preview.onclick=()=>{const s=style.value;toast(({normal:'Settings saved.',pirate:'Arrr, treasure ahoy! Fair winds to yer browsing!',shakespeare:'Good morrow! May thy browsing be swift and fortunes bright.',tree:'Roots remember what the branches forget… seek the quiet path.'})[s]);};$('panelBody').append(preview);
    section('Browser');
    addToggle('Block common ad/tracker domains','blockTrackers','Best-effort filtering; some ads and trackers will still get through.');
    addToggle('Warn about insecure HTTP pages','warnInsecure','Preference saved. Full warning enforcement is not yet implemented.');
    addPanelCard('Privacy note','Theme files contain appearance settings only; they do not install code or extensions.');
  } else addPanelText('Your browser workspace.');
}
function addToggle(label,key,description) { const box=document.createElement('div'); box.className='panel-card'; const row=document.createElement('label'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.gap='8px'; const name=document.createElement('strong'); name.textContent=label; const input=document.createElement('input'); input.type='checkbox'; input.checked=!!settings[key]; input.onchange=()=>{settings[key]=input.checked;save('settings',settings);api.updateSaved({settings});toast('Setting saved.');}; row.append(name,input); const small=document.createElement('small'); small.textContent=description; box.append(row,small); $('panelBody').append(box); }
function addPanelText(text) { const p = document.createElement('p'); p.className = 'panel-copy'; p.textContent = text; $('panelBody').append(p); }
function addPanelCard(title, subtitle, action) {
  const card = document.createElement('button'); card.className = 'panel-card'; card.style.width = '100%'; card.style.textAlign = 'left';
  const strong = document.createElement('strong'); strong.textContent = title;
  const small = document.createElement('small'); small.textContent = subtitle;
  card.append(strong, small); if (action) card.onclick = action; $('panelBody').append(card);
}
function renderMusic() {
  addPanelText('Control music playing in the active website, or play audio files from your device. Website controls depend on the page exposing audio/video elements.');
  const webControls=document.createElement('div');webControls.className='music-controls';
  [['play','▶ Play website audio'],['pause','Ⅱ Pause website audio'],['mute','Mute website audio'],['unmute','Unmute website audio']].forEach(([action,label])=>{const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{await api.mediaControl(action);toast('Sent '+label.toLowerCase()+' command to the active page.');};webControls.append(b);});$('panelBody').append(webControls);
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
$('bookmarksToggle').onclick = () => showPanel('bookmarks');
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
  const title = new URL(url).hostname; shortcuts.push({title,url}); save('shortcuts',shortcuts); api.updateSaved({shortcuts}); const btn = document.createElement('button'); btn.className = 'shortcut'; btn.dataset.url = url;
  const icon = document.createElement('span'); icon.className = 'shortcut-icon blue'; icon.textContent = '↗';
  const details = document.createElement('span'); const name = document.createElement('b'); name.textContent = title; const small = document.createElement('small'); small.textContent = url; details.append(name, small);
  const arrow = document.createElement('span'); arrow.className = 'shortcut-arrow'; arrow.textContent = '↗'; btn.append(icon, details, arrow); btn.onclick = () => api.navigate(url); $('shortcuts').append(btn);
};
$('minimize').onclick = () => api.windowAction('minimize');
$('maximize').onclick = () => api.windowAction('maximize');
$('close').onclick = () => api.windowAction('close');
document.querySelectorAll('.window-actions button').forEach(button => {
  button.addEventListener('dblclick', e => e.preventDefault());
});
api.onNotice(message => toast(message));
api.onState(next => {
  localStorage.setItem('crystalium.openTabs', JSON.stringify(next.tabs.map(t=>t.url).filter(Boolean)));
  const t = next.tabs.find(x => x.id === next.activeId);
  if (t?.url && /^https?:/i.test(t.url) && !historyItems.some(h => h.url === t.url)) { historyItems.push({ title: t.title, url: t.url }); save('history',historyItems); api.updateSaved({history}); }
  api.updateSaved({bookmarks,history:historyItems,shortcuts,settings});
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); address.focus(); address.select(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') { e.preventDefault(); api.newTab(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') { e.preventDefault(); if (state.activeId) api.closeTab(state.activeId); }
  if (e.key === 'F5') { e.preventDefault(); api.reload(); }
});