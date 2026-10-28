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
const settings = { blockTrackers:true, warnInsecure:true, restoreTabs:true, reduceMotion:false, showShortcuts:true, showMusicControls:true, confirmCloseTabs:true, treeEggEnabled:true, ...load('settings', {}) };
const shortcuts = load('shortcuts', []);
const theme = load('theme', {accent:'#54bdff', preset:'midnight'});
const voiceStyle = load('voiceStyle','normal');
let uiLanguage = load('uiLanguage','en');
const uiWords = {
en:{'Home':'Home','History':'History','Bookmarks':'Bookmarks','Music player':'Music player','Browser settings':'Settings','Your space':'Your space','Back':'Back','Forward':'Forward','Reload':'Reload','New tab':'New tab','Close tab':'Close tab','Search or enter a website address':'Search or enter a website address','Search the web or enter an address':'Search the web or enter an address','Go':'Go','Add':'Add','Quick access':'QUICK ACCESS','A quieter corner of the internet':'A QUIETER CORNER OF THE INTERNET','Browse beyond':'Browse beyond','the ordinary.':'the ordinary.','Focus-first design':'Focus-first design','Resource mindful':'Resource mindful','Your music':'Your music','Settings':'Settings','Appearance':'Appearance','Speaking style':'Speaking style','Browser':'Browser','Chrome Transfer':'Chrome Transfer','Import Chrome data…':'Import Chrome data…','UI accent color':'UI accent color','Download theme settings (.json)':'Download theme settings (.json)','Preview speaking style':'Preview speaking style','Block common ad/tracker domains':'Block common ad/tracker domains','Warn about insecure HTTP pages':'Warn about insecure HTTP pages'},
pirate:{'Home':'Home Port','History':'Ship’s Log','Bookmarks':'Treasures','Music player':'Shanty Player','Browser settings':'Captain’s Settings','Your space':'Yer Deck','Back':'Back aboard','Forward':'Sail onward','Reload':'Reload the sails','New tab':'New voyage','Close tab':'Close voyage','Search or enter a website address':'Seek a port or enter a web address','Search the web or enter an address':'Search the seven seas','Go':'Sail!','Add':'Add loot','QUICK ACCESS':'QUICK PORTS','A QUIETER CORNER OF THE INTERNET':'A CALMER COVE OF THE INTERNET','Browse beyond':'Sail beyond','the ordinary.':'the ordinary, arrr.','Focus-first design':'Eyes on the horizon','Resource mindful':'Save yer supplies','Your music':'Yer shanties','Settings':'Captain’s Settings','Appearance':'Ship’s appearance','Speaking style':'Speaking tongue','Browser':'Ship controls','Chrome Transfer':'Chrome cargo transfer','Import Chrome data…':'Load Chrome cargo…','UI accent color':'Choose yer flag color','Download theme settings (.json)':'Bottle this theme (.json)','Preview speaking style':'Hear the captain','Block common ad/tracker domains':'Block known ad scallywags','Warn about insecure HTTP pages':'Warn of unsecure waters'},
shakespeare:{'Home':'Home','History':'Chronicle','Bookmarks':'Favourites','Music player':'Player of Melodies','Browser settings':'Settings of the Realm','Your space':'Thy Domain','Back':'Return','Forward':'Proceed','Reload':'Refresh','New tab':'New Folio','Close tab':'Close Folio','Search or enter a website address':'Seek a site or enter its address','Search the web or enter an address':'Seek knowledge across the web','Go':'Proceed','Add':'Add','QUICK ACCESS':'FAVOURED PLACES','A QUIETER CORNER OF THE INTERNET':'A MORE SERENE CORNER OF THE INTERNET','Browse beyond':'Explore beyond','the ordinary.':'the ordinary.','Focus-first design':'Design for contemplation','Resource mindful':'Frugal with resources','Your music':'Thy melodies','Settings':'Settings of the Realm','Appearance':'Appearance of the Realm','Speaking style':'Manner of speech','Browser':'Browser','Chrome Transfer':'Chrome Transfer','Import Chrome data…':'Import Chrome data…','UI accent color':'Hue of the interface','Download theme settings (.json)':'Save thy theme (.json)','Preview speaking style':'Hear the manner of speech','Block common ad/tracker domains':'Bar known trackers','Warn about insecure HTTP pages':'Warn of insecure pages'}
};
function applyLanguage(lang){
  uiLanguage=uiWords[lang]?lang:'en';save('uiLanguage',uiLanguage);
  const words=uiWords[uiLanguage]||uiWords.en;
  const translateRoot=root=>{if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);const reverse={};for(const dict of Object.values(uiWords))for(const [english,translated] of Object.entries(dict))reverse[translated]=english;
    for(const n of nodes){const raw=n.nodeValue;const trimmed=raw.trim();const english=reverse[trimmed]||trimmed;if(words[english])n.nodeValue=raw.replace(trimmed,words[english]);}
    root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el=>{for(const attr of ['title','placeholder','aria-label']){const v=el.getAttribute(attr);if(v){const english=reverse[v]||v;if(words[english])el.setAttribute(attr,words[english]);}}});
  };
  translateRoot(document.body);
}

const themePresets = {midnight:{bg:'#060d19',side:'#081629',panel:'#0b1a2c',line:'#1c3652',accent:'#54bdff',text:'#edf5ff'},ocean:{bg:'#061820',side:'#082530',panel:'#0b2b39',line:'#1c5263',accent:'#42e0d0',text:'#e7fffb'},violet:{bg:'#100b20',side:'#17102b',panel:'#201638',line:'#453269',accent:'#bd9aff',text:'#f5efff'},ember:{bg:'#1a100d',side:'#241510',panel:'#321d16',line:'#63402c',accent:'#ffb36b',text:'#fff4e8'},xp:{bg:'#e8f0fa',side:'#c7d9f0',panel:'#f4f8ff',line:'#7e9ec7',accent:'#1768cf',text:'#172b48'},forest:{bg:'#07170f',side:'#0b2116',panel:'#102b1b',line:'#2c5739',accent:'#8ce6a1',text:'#edfff0'},rose:{bg:'#1b0c17',side:'#291022',panel:'#35162c',line:'#663653',accent:'#ff9fce',text:'#fff0f8'},mono:{bg:'#111111',side:'#191919',panel:'#242424',line:'#454545',accent:'#e2e2e2',text:'#f7f7f7'}};
function applyTheme(next){ const root=document.documentElement; const p=themePresets[next.preset]||themePresets.midnight; root.style.setProperty('--bg',p.bg);root.style.setProperty('--side',p.side);root.style.setProperty('--panel',p.panel);root.style.setProperty('--line',p.line);root.style.setProperty('--blue',next.accent||p.accent);root.style.setProperty('--cyan',next.accent||p.accent);root.style.setProperty('--text',p.text);root.style.setProperty('--accent',next.accent||p.accent);root.style.setProperty('--muted',p.text+'aa');root.style.setProperty('--panel-soft',p.panel);root.style.setProperty('--theme-border',p.line);root.style.setProperty('--theme-bg',p.bg);}
applyTheme(theme);
document.documentElement.classList.toggle('reduce-motion',!!settings.reduceMotion);
document.documentElement.classList.toggle('hide-shortcuts',settings.showShortcuts===false);
if(settings.showMusicControls===false)$('musicToggle').style.display='none';
function showTreeEgg(){
  if(document.getElementById('treeEggOverlay'))return;
  const overlay=document.createElement('div');overlay.id='treeEggOverlay';overlay.className='tree-egg-overlay';
  overlay.innerHTML='<button class="tree-egg-close" aria-label="Close">×</button><div class="tree-egg-art"><svg viewBox="0 0 240 260" role="img" aria-label="Mysterious dark pixel-art tree"><rect width="240" height="260" fill="#05070b"/><g fill="#11151b" stroke="#46505b" stroke-width="3" stroke-linejoin="round"><path d="M112 245L119 187L102 161L118 140L107 110L124 87L117 51L132 32L146 49L145 82L166 104L155 130L175 158L154 184L163 245Z"/><path d="M123 103L91 84L73 93L53 72L65 49L91 55L108 35L130 47L151 26L175 48L198 43L214 64L199 87L178 82L155 113Z"/><path d="M123 147L87 130L69 141L53 122L66 105L92 112L112 127Z"/><path d="M151 147L179 126L197 136L211 119L199 103L178 111L159 128Z"/></g><g fill="#cbd3dc"><rect x="91" y="66" width="6" height="6"/><rect x="157" y="59" width="6" height="6"/><rect x="182" y="68" width="5" height="5"/></g><path d="M122 243L91 255M157 243L190 255M133 221L115 256" stroke="#46505b" stroke-width="4" fill="none"/></svg></div><p>A man is behind the tree</p><small>Something familiar stands between the branches.</small>';
  overlay.querySelector('button').onclick=()=>overlay.remove();document.body.append(overlay);setTimeout(()=>overlay.remove(),7000);
}
function toast(message) {
  const node = $('toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
}
function currentTab() { return state.tabs.find(t => t.id === state.activeId); }
function isHome() { const t = currentTab(); return !t || !t.url; }
function updateLayout() {
  const rect = pageBounds.getBoundingClientRect();
  // Electron's native WebContentsView sits above renderer HTML. Shrink it when the side panel is open so panel controls remain clickable.
  const panelOpen = !sidePanel.classList.contains('hidden');
  const panelWidth = panelOpen ? Math.min(sidePanel.getBoundingClientRect().width, rect.width * 0.8) : 0;
  api.layout({ x: Math.round(rect.left), y: Math.round(rect.top), width: Math.max(0, Math.round(rect.width - panelWidth)), height: Math.round(rect.height) });
}
function render(next) {
  state = next;
  strip.replaceChildren();
  for (const tab of state.tabs) {
    const node = document.createElement('div');
    node.className = 'tab' + (tab.id === state.activeId ? ' active' : '');
    const dot = document.createElement('span'); dot.className = 'tab-dot';
    const title = document.createElement('button'); title.className = 'tab-title'; title.textContent = (!tab.url || tab.url === 'about:blank') ? 'Home' : (tab.title || tab.url || 'Home'); title.title = tab.url || 'Home'; title.onclick = () => api.activateTab(tab.id);
    const close = document.createElement('button'); close.className = 'tab-close'; close.textContent = '×'; close.title = 'Close tab'; close.onclick = e => { e.stopPropagation(); if(settings.confirmCloseTabs && state.tabs.length>1 && !confirm('Close this tab?')) return; api.closeTab(tab.id); };
    node.append(dot, title, close); strip.append(node);
  }
  const previousActiveId = window.__crystaliumLastActiveId;
  const tab = currentTab();
  if (tab && previousActiveId !== undefined && previousActiveId !== state.activeId && load('treeEggEnabled',true) && Math.random() < 0.10) showTreeEgg();
  window.__crystaliumLastActiveId = state.activeId;
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
applyLanguage(uiLanguage);
const languageObserver=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))applyLanguage(uiLanguage);});
languageObserver.observe(document.body,{childList:true,subtree:true});
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

let openPanelName = null;
function hidePanel() {
  sidePanel.classList.add('hidden');
  openPanelName = null;
  document.querySelectorAll('.rail-button').forEach(b=>b.classList.remove('selected'));
  requestAnimationFrame(updateLayout);
}
function togglePanel(name) {
  if (!sidePanel.classList.contains('hidden') && openPanelName === name) { hidePanel(); return; }
  showPanel(name);
}
function showPanel(name) {
  openPanelName = name;
  sidePanel.classList.remove('hidden');
  document.querySelectorAll('.rail-button').forEach(b=>b.classList.toggle('selected',b.dataset.panel===name));
  requestAnimationFrame(updateLayout);
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
    section('Chrome Transfer');
    addPanelText('Import Chrome bookmarks and compatible Netscape-format cookies from files you select. Crystalium cannot directly decrypt Chrome’s protected cookie database or import saved passwords automatically.');
    const transfer=document.createElement('button');transfer.className='panel-card';transfer.style.width='100%';transfer.textContent='Import Chrome data…';transfer.onclick=async()=>{transfer.disabled=true;transfer.textContent='Choose Chrome data files…';try{const result=await api.chromeTransfer();if(result?.canceled){toast('Import cancelled.');return;}if(!result?.ok){toast('Could not import those files.');return;}let added=0;for(const b of result.bookmarks||[]){if(!bookmarks.some(old=>old.url===b.url)){bookmarks.push(b);added++;}}save('bookmarks',bookmarks);api.updateSaved({bookmarks});toast('Imported '+added+' bookmarks and '+(result.cookies||0)+' cookies.');}catch{toast('Chrome import failed.');}finally{transfer.disabled=false;transfer.textContent='Import Chrome data…';}};$('panelBody').append(transfer);
    section('Appearance');
    const importBox=document.createElement('div');importBox.className='panel-card';const importLabel=document.createElement('label');importLabel.textContent='Import a downloaded theme (.json)';importLabel.className='file-button';const importInput=document.createElement('input');importInput.type='file';importInput.accept='.json,application/json';importInput.hidden=true;importInput.onchange=async()=>{try{const parsed=JSON.parse(await importInput.files[0].text());if(!parsed||!themePresets[parsed.preset]|| (parsed.accent&&!/^#[0-9a-f]{6}$/i.test(parsed.accent)))throw new Error('Invalid theme');theme.preset=parsed.preset;theme.accent=parsed.accent||themePresets[parsed.preset].accent;save('theme',theme);applyTheme(theme);showPanel('settings');toast('Theme imported.');}catch{toast('That theme file is not valid.');}};importLabel.append(importInput);importBox.append(importLabel);$('panelBody').append(importBox);
    const presets=[['midnight','Midnight'],['ocean','Ocean'],['violet','Violet'],['ember','Ember'],['xp','Windows XP'],['forest','Forest'],['rose','Rose'],['mono','Monochrome']];
    presets.forEach(([id,label])=>{const b=document.createElement('button');b.className='theme-option';b.innerHTML='<span class="theme-swatch '+id+'"></span><span>'+label+'</span><small>Free built-in theme</small>';b.onclick=()=>{theme.preset=id;theme.accent=themePresets[id].accent;save('theme',theme);applyTheme(theme);showPanel('settings');toast(label+' theme applied.');};$('panelBody').append(b);});
    const colorBox=document.createElement('div');colorBox.className='panel-card';
    const colorLabel=document.createElement('label');colorLabel.className='color-setting';colorLabel.textContent='UI accent color';
    const color=document.createElement('input');color.type='color';color.value=theme.accent||themePresets[theme.preset]?.accent||'#54bdff';color.oninput=()=>{theme.accent=color.value;save('theme',theme);applyTheme(theme);};colorLabel.append(color);colorBox.append(colorLabel);$('panelBody').append(colorBox);
    const download=document.createElement('button');download.className='panel-card';download.style.width='100%';download.textContent='Download theme settings (.json)';download.onclick=()=>{const blob=new Blob([JSON.stringify(theme,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='crystalium-theme.json';a.click();URL.revokeObjectURL(url);};$('panelBody').append(download);
    section('Website translation');
    addPanelText('Try translating the active website in a separate tab. Translation availability depends on Google Translate and the website.');
    const targetLanguage=document.createElement('select');targetLanguage.className='style-select';targetLanguage.setAttribute('aria-label','Website translation language');
    [['de','German'],['en','English'],['es','Spanish'],['fr','French'],['it','Italian'],['ja','Japanese'],['pt','Portuguese'],['uk','Ukrainian']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;targetLanguage.append(o);});
    targetLanguage.value=load('translationLanguage','de');
    targetLanguage.onchange=()=>save('translationLanguage',targetLanguage.value);
    $('panelBody').append(targetLanguage);
    addPanelCard('Translate active website','Open the translated page in a new tab.',()=>{const t=currentTab();if(!t?.url||!/^https?:/i.test(t.url)){toast('Open a website first.');return;}save('translationLanguage',targetLanguage.value);api.newTab('https://translate.google.com/translate?sl=auto&tl='+encodeURIComponent(targetLanguage.value)+'&u='+encodeURIComponent(t.url));});
    section('Interface language');
    const language=document.createElement('select');language.className='style-select';language.setAttribute('aria-label','Interface language');
    [['en','English'],['pirate','Pirate / treasure speak'],['shakespeare','Shakespearean English']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;language.append(o);});language.value=uiLanguage;language.onchange=()=>{applyLanguage(language.value);showPanel('settings');toast('Interface language changed.');};$('panelBody').append(language);
    section('Speaking style');
    const treeToggleBox=document.createElement('div');treeToggleBox.className='panel-card';const treeToggleLabel=document.createElement('label');treeToggleLabel.className='color-setting';treeToggleLabel.textContent='Mysterious tree easter egg (10% chance on tab switch)';const treeToggle=document.createElement('input');treeToggle.type='checkbox';treeToggle.checked=load('treeEggEnabled',true);treeToggle.onchange=()=>{save('treeEggEnabled',treeToggle.checked);toast(treeToggle.checked?'The tree may appear…':'Tree easter egg disabled.');};treeToggleLabel.append(treeToggle);treeToggleBox.append(treeToggleLabel);$('panelBody').append(treeToggleBox);
    const style=document.createElement('select');style.className='style-select';[['normal','Standard'],['pirate','Pirate / treasure speak'],['shakespeare','Shakespearean']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;style.append(o);});style.value=voiceStyle;style.onchange=()=>{localStorage.setItem('crystalium.voiceStyle',style.value);toast(({normal:'Standard style selected.',pirate:'Arrr! Pirate speak be selected.',shakespeare:'A Shakespearean tongue, most noble.',tree:'The old tree whispers in riddles…'})[style.value]);};$('panelBody').append(style);
    const preview=document.createElement('button');preview.className='panel-card';preview.style.width='100%';preview.textContent='Preview speaking style';preview.onclick=()=>{const s=style.value;toast(({normal:'Settings saved.',pirate:'Arrr, treasure ahoy! Fair winds to yer browsing!',shakespeare:'Good morrow! May thy browsing be swift and fortunes bright.',tree:'Roots remember what the branches forget… seek the quiet path.'})[s]);};$('panelBody').append(preview);
    section('Browser');
    addToggle('Block common ad/tracker domains','blockTrackers','Best-effort filtering; some ads and trackers will still get through.');
    addToggle('Warn about insecure HTTP pages','warnInsecure','Show a warning before navigating to plain HTTP sites.');
    addToggle('Restore tabs when Crystalium starts','restoreTabs','Save and restore the last browsing session where supported.');
    addToggle('Reduce motion','reduceMotion','Use fewer interface animations.');
    addToggle('Show home-page shortcuts','showShortcuts','Show your pinned sites on the start page.');
    addToggle('Show music controls','showMusicControls','Keep website audio controls available in the music panel.');
    addToggle('Ask before closing tabs','confirmCloseTabs','Ask before closing a tab when multiple tabs are open.');
    addToggle('Enable mysterious tree encounter','treeEggEnabled','A rare 10% chance when switching tabs.');
    addPanelCard('Privacy note','Theme files contain appearance settings only; they do not install code or extensions.');
    if(settings.reduceMotion) document.documentElement.classList.add('reduce-motion'); else document.documentElement.classList.remove('reduce-motion');
    document.documentElement.classList.toggle('hide-shortcuts',settings.showShortcuts===false);
  } else addPanelText('Your browser workspace.');
}
function addToggle(label,key,description) { const box=document.createElement('div'); box.className='panel-card'; const row=document.createElement('label'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.gap='8px'; const name=document.createElement('strong'); name.textContent=label; const input=document.createElement('input'); input.type='checkbox'; input.checked=!!settings[key]; input.onchange=()=>{settings[key]=input.checked;save('settings',settings);api.updateSaved({settings});if(key==='reduceMotion')document.documentElement.classList.toggle('reduce-motion',input.checked);if(key==='showShortcuts')document.documentElement.classList.toggle('hide-shortcuts',!input.checked);if(key==='showMusicControls')$('musicToggle').style.display=input.checked?'':'none';toast('Setting saved.');}; row.append(name,input); const small=document.createElement('small'); small.textContent=description; box.append(row,small); $('panelBody').append(box); }
function addPanelText(text) { const p = document.createElement('p'); p.className = 'panel-copy'; p.textContent = text; $('panelBody').append(p); }
function addPanelCard(title, subtitle, action) {
  const card = document.createElement('button'); card.className = 'panel-card'; card.style.width = '100%'; card.style.textAlign = 'left';
  const strong = document.createElement('strong'); strong.textContent = title;
  const small = document.createElement('small'); small.textContent = subtitle;
  card.append(strong, small); if (action) card.onclick = action; $('panelBody').append(card);
}
function renderMusic() {
  addPanelText('Play local audio files here, or open a music website in its own browser tab. Website audio controls only work with the active tab.');
  addPanelCard('Open YouTube Music in a separate tab','Browse and play music without embedding the player in this panel.',()=>api.newTab('https://music.youtube.com'));
  addPanelCard('Open Bandcamp in a separate tab','Discover and stream music from artists.',()=>api.newTab('https://bandcamp.com'));
  
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
$('menuToggle').onclick = () => togglePanel('settings');
$('panelClose').onclick = hidePanel;
document.querySelectorAll('.rail-button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.rail-button').forEach(b => b.classList.remove('selected')); button.classList.add('selected');
  togglePanel(button.dataset.panel);
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