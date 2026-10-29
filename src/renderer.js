const api = window.crystalium;
const $ = id => document.getElementById(id);
const strip = $('tabStrip');
const address = $('address');
const startPage = $('startPage');
const pageBounds = $('pageBounds');
const sidePanel = $('sidePanel');
let state = { tabs: [], activeId: null };
let toastTimer;
let updateStatusLine = null;
let updateActionButton = null;
let latestUpdateStatus = { status:'idle', message:'Updates have not been checked yet.', supported:false };
function paintUpdateControls(status) {
  latestUpdateStatus = status || latestUpdateStatus;
  if (updateStatusLine) updateStatusLine.textContent = latestUpdateStatus.message || 'Update status unavailable.';
  if (updateActionButton) {
    updateActionButton.disabled = ['checking','downloading'].includes(latestUpdateStatus.status);
    updateActionButton.textContent = latestUpdateStatus.status === 'downloaded' ? 'Restart and install update' : latestUpdateStatus.status === 'downloading' ? 'Downloading… ' + (latestUpdateStatus.percent || 0) + '%' : latestUpdateStatus.status === 'checking' ? 'Checking…' : 'Check for updates';
  }
}
const load = (k,d) => { try { const raw=localStorage.getItem('crystalium.'+k); return raw===null?d:JSON.parse(raw); } catch { return d; } };
const save = (k,v) => { try { localStorage.setItem('crystalium.'+k,JSON.stringify(v)); return true; } catch { return false; } };
const hasLocal = k => { try { return localStorage.getItem('crystalium.'+k)!==null; } catch { return false; } };
function persistSaved(patch){ return api.updateSaved(patch).catch(()=>{toast('Saved on this device; backup sync failed.');return null;}); }
const bookmarks = load('bookmarks', []);
const historyItems = load('history', []);
const settings = { blockTrackers:true, warnInsecure:true, restoreTabs:true, reduceMotion:false, showShortcuts:true, showMusicControls:true, confirmCloseTabs:false, treeEggEnabled:true, showTabDots:true, compactTabs:false, showAddressIcon:true, gameEggs:true, showFeatureCards:true, ...load('settings', {}), ...(load('treeEggEnabled', null) === null ? {} : {treeEggEnabled:load('treeEggEnabled', true)}) };
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

const themePresets = {midnight:{bg:'#060d19',side:'#081629',panel:'#0b1a2c',line:'#1c3652',accent:'#54bdff',text:'#edf5ff'},ocean:{bg:'#061820',side:'#082530',panel:'#0b2b39',line:'#1c5263',accent:'#42e0d0',text:'#e7fffb'},violet:{bg:'#100b20',side:'#17102b',panel:'#201638',line:'#453269',accent:'#bd9aff',text:'#f5efff'},ember:{bg:'#1a100d',side:'#241510',panel:'#321d16',line:'#63402c',accent:'#ffb36b',text:'#fff4e8'},xp:{bg:'#e8f0fa',side:'#c7d9f0',panel:'#f4f8ff',line:'#7e9ec7',accent:'#1768cf',text:'#172b48'},forest:{bg:'#07170f',side:'#0b2116',panel:'#102b1b',line:'#2c5739',accent:'#8ce6a1',text:'#edfff0'},rose:{bg:'#1b0c17',side:'#291022',panel:'#35162c',line:'#663653',accent:'#ff9fce',text:'#fff0f8'},mono:{bg:'#111111',side:'#191919',panel:'#242424',line:'#454545',accent:'#e2e2e2',text:'#f7f7f7'},
ps2:{bg:'#090a18',side:'#15172d',panel:'#222440',line:'#464b80',accent:'#77baff',text:'#e9edff',skin:'ps2'},
ps3:{bg:'#070b12',side:'#101a27',panel:'#17283a',line:'#31516e',accent:'#52d6ff',text:'#edf9ff',skin:'ps3'},
minecraft:{bg:'#18251a',side:'#263d25',panel:'#344d2d',line:'#6c8b4e',accent:'#8ad64f',text:'#f0f5df',skin:'minecraft'},
dmc:{bg:'#100b13',side:'#20121d',panel:'#2b1827',line:'#69344d',accent:'#e34464',text:'#fff0f3',skin:'dmc'},
cyberpunk:{bg:'#100e1d',side:'#20172f',panel:'#2a2040',line:'#8b4f9f',accent:'#f7ec54',text:'#f8f5ff',skin:'cyberpunk'},
retro:{bg:'#101018',side:'#1a1a29',panel:'#27273a',line:'#565679',accent:'#b9b8ff',text:'#f5f4ff',skin:'retro'},
gameboy:{bg:'#9bbc0f',side:'#8bac0f',panel:'#306230',line:'#0f380f',accent:'#0f380f',text:'#0f380f',skin:'gameboy'},
lofi:{bg:'#111827',side:'#1f2937',panel:'#273449',line:'#475569',accent:'#a7f3d0',text:'#ecfdf5'},
solar:{bg:'#21140b',side:'#39210e',panel:'#4b2c12',line:'#92551c',accent:'#ffd166',text:'#fff5dc'},
 arctic:{bg:'#eaf5fb',side:'#c9e5f3',panel:'#f8fcff',line:'#8abbd2',accent:'#087ca7',text:'#17384b'},
 sakura:{bg:'#241321',side:'#3b1e32',panel:'#512944',line:'#8f4d73',accent:'#ffb7d5',text:'#fff0f7'},
 matrix:{bg:'#020b05',side:'#06170b',panel:'#0b2411',line:'#1c6530',accent:'#39ff75',text:'#d7ffe1'},
 vapor:{bg:'#180d2e',side:'#261343',panel:'#34205b',line:'#704eaa',accent:'#ff76df',text:'#f9eaff'},
 copper:{bg:'#211813',side:'#38251b',panel:'#4a3023',line:'#8a5a3d',accent:'#e6a477',text:'#fff0e4'},
 terminal:{bg:'#050805',side:'#0c120b',panel:'#111a0f',line:'#35512d',accent:'#a8ff60',text:'#d8f7c5'},
 lavender:{bg:'#f1edff',side:'#ded5ff',panel:'#faf8ff',line:'#b0a0e8',accent:'#7053c8',text:'#292044'},
 crimson:{bg:'#18090c',side:'#2b0e15',panel:'#3c111c',line:'#7c2535',accent:'#ff5269',text:'#fff0f1'},
 synthwave:{bg:'#100b28',side:'#211346',panel:'#30185b',line:'#8a2fba',accent:'#28f0ff',text:'#fff0ff'},
 paper:{bg:'#f3efe5',side:'#e5ddca',panel:'#fffaf0',line:'#b9ad93',accent:'#8b5e34',text:'#33291f'},
 aurora:{bg:'#071a22',side:'#0b2b32',panel:'#103a40',line:'#2a6a6b',accent:'#7fffd4',text:'#e8fffa'},
 sunset:{bg:'#24101d',side:'#3b1b2c',panel:'#51253a',line:'#a94c5b',accent:'#ffb36b',text:'#fff2e8'},
 slate:{bg:'#171c24',side:'#222b37',panel:'#2b3644',line:'#526273',accent:'#b8c8d9',text:'#f2f6fa'},
 sakuraLite:{bg:'#fff1f6',side:'#f8dce8',panel:'#fff8fb',line:'#e5abc5',accent:'#b72f72',text:'#54203b'},
 amber:{bg:'#211b0b',side:'#33280d',panel:'#463713',line:'#80641b',accent:'#ffd84d',text:'#fff8d7'},
 oceanic:{bg:'#061d2c',side:'#0b3144',panel:'#104158',line:'#2d7088',accent:'#53c8ff',text:'#eaf8ff'},
deltarune:{bg:'#090b1b',side:'#11152d',panel:'#1a2040',line:'#394a8c',accent:'#5c7cff',text:'#f0f2ff'},
cardCastle:{bg:'#1c1018',side:'#2c1722',panel:'#402231',line:'#81506a',accent:'#f2c35e',text:'#fff4dc'},
cyberCity:{bg:'#080d22',side:'#101832',panel:'#1a2545',line:'#4354a2',accent:'#48f0e7',text:'#effcff'},
blackKnight:{bg:'#09090d',side:'#15151c',panel:'#20202b',line:'#444451',accent:'#d7d9e2',text:'#f4f5fa'},
roaringKnight:{bg:'#10070d',side:'#210b17',panel:'#321021',line:'#6c183b',accent:'#ff315d',text:'#fff0f4'},
titan:{bg:'#050509',side:'#101015',panel:'#191920',line:'#41414a',accent:'#f5f5f7',text:'#f7f7fa'},
gerson:{bg:'#102019',side:'#1b3026',panel:'#294437',line:'#54745d',accent:'#e5c36a',text:'#f2f8e9'},
darkFountain:{bg:'#090514',side:'#170b27',panel:'#24113a',line:'#54276f',accent:'#b94cff',text:'#f7eaff'},
queenCyber:{bg:'#071a24',side:'#0d2b3b',panel:'#143c50',line:'#277d98',accent:'#ff4fd8',text:'#edfbff'},
undertale:{bg:'#080d16',side:'#111b2b',panel:'#19283a',line:'#47617a',accent:'#e8f0ff',text:'#f4f6ff',skin:'undertale'},
hollowKnight:{bg:'#080e1b',side:'#101b30',panel:'#182742',line:'#354f7a',accent:'#8fc8ff',text:'#edf5ff',skin:'hollow-knight'},
zelda:{bg:'#102017',side:'#193326',panel:'#234634',line:'#4e7d5d',accent:'#d8c36b',text:'#f2f5df',skin:'zelda'},
sonic:{bg:'#071a37',side:'#0d2a52',panel:'#14396a',line:'#2f68a5',accent:'#4bb7ff',text:'#eff8ff',skin:'sonic'},
pokemon:{bg:'#211414',side:'#321d1d',panel:'#472929',line:'#8a4a43',accent:'#ffcb62',text:'#fff5e8',skin:'pokemon'},
stardew:{bg:'#252018',side:'#373024',panel:'#49402f',line:'#8b7650',accent:'#e8c879',text:'#fff5df',skin:'stardew'},
terraria:{bg:'#0c1d22',side:'#163039',panel:'#20434a',line:'#3d7d76',accent:'#8fe3a0',text:'#ecfff5',skin:'terraria'},
celeste:{bg:'#151b3c',side:'#202d5a',panel:'#2d4074',line:'#5e79bb',accent:'#ff9cbe',text:'#f4f5ff',skin:'celeste'},
portal:{bg:'#121923',side:'#1c2938',panel:'#263747',line:'#4e687d',accent:'#ff9b5e',text:'#f1f6fa',skin:'portal'},
skyrim:{bg:'#171b1b',side:'#242b2a',panel:'#303a37',line:'#59665e',accent:'#c6c5a2',text:'#f1f0e5',skin:'skyrim'}};
/* Expanded theme registry: warm, low-glare light palettes and dedicated visual themes. */
Object.assign(themePresets,{
 system:{bg:'#101722',side:'#192330',panel:'#222d3a',line:'#46576b',accent:'#70c9ef',text:'#e6e2da'},
 crystaliumDark:{bg:'#060d19',side:'#081629',panel:'#0b1a2c',line:'#1c3652',accent:'#54bdff',text:'#edf5ff'},
 crystaliumLight:{bg:'#f5efe6',side:'#e9dfd2',panel:'#e3d8c9',line:'#c5b8a5',accent:'#527b99',text:'#2d3748',skin:'light'},
 majora:{bg:'#100f25',side:'#19172f',panel:'#24213d',line:'#51456c',accent:'#c17cff',text:'#f0eaff',skin:'majora'},
 kingdomHearts:{bg:'#06182f',side:'#0a2545',panel:'#102f52',line:'#2c5c83',accent:'#79caff',text:'#eaf6ff',skin:'kingdom-hearts'},
 gamecube:{bg:'#241a40',side:'#302253',panel:'#3b2b61',line:'#66508e',accent:'#a98bff',text:'#f2ecff',skin:'gamecube'},
 ps5:{bg:'#090d17',side:'#111a2a',panel:'#172337',line:'#2c4d77',accent:'#67baff',text:'#eaf3ff',skin:'ps5'},
 xbox360:{bg:'#10160f',side:'#1b2519',panel:'#252f22',line:'#3d5938',accent:'#83df5b',text:'#f0f8eb',skin:'xbox360'},
 mgrr:{bg:'#100609',side:'#1e0b12',panel:'#2a111b',line:'#6c183b',accent:'#ff315d',text:'#fff0f4',skin:'mgrr'},
 neonCyber:{bg:'#100923',side:'#1b1034',panel:'#281648',line:'#6b3b9c',accent:'#ff76df',text:'#f9eaff',skin:'neon-cyber'},
 sakuraDay:{bg:'#fbf0f2',side:'#f3e3e6',panel:'#ead9de',line:'#d7b9c2',accent:'#b65e82',text:'#49343d',skin:'sakura-day'},
 warmPaper:{bg:'#f5efe6',side:'#e9dfd0',panel:'#e2d5c3',line:'#c6b39c',accent:'#8c6d58',text:'#493b31',skin:'warm-paper'},
 lavenderSoft:{bg:'#f0edf9',side:'#e4def1',panel:'#dcd5eb',line:'#c1b6dc',accent:'#7462a8',text:'#39324d',skin:'lavender-light'},
 arcticSoft:{bg:'#e5e9f0',side:'#d8dfe8',panel:'#cfd8e3',line:'#aebbc9',accent:'#4d7898',text:'#344252',skin:'arctic-light'},
 slateStudio:{bg:'#d8dee9',side:'#cbd3df',panel:'#c0cad7',line:'#a5b1c1',accent:'#536b86',text:'#303b4a',skin:'slate-studio'},
 amberGlow:{bg:'#f2e5c6',side:'#e8d8b2',panel:'#decca0',line:'#c3ad77',accent:'#94702e',text:'#4b3c24',skin:'amber-light'}
});
Object.assign(themePresets,{
  minecraftNight:{bg:'#101a2a',side:'#18283a',panel:'#24384a',line:'#4c7182',accent:'#74c7df',text:'#edfaff',skin:'minecraft-night'},
  undertaleGold:{bg:'#1c1608',side:'#30240d',panel:'#423314',line:'#84652b',accent:'#ffd45f',text:'#fff6d9',skin:'undertale-gold'},
  ps2Silver:{bg:'#171925',side:'#242a3b',panel:'#30384b',line:'#56647d',accent:'#c2d0e7',text:'#f4f7ff',skin:'ps2'},
  ps3Violet:{bg:'#100b20',side:'#17102b',panel:'#201638',line:'#453269',accent:'#bd9aff',text:'#f5efff',skin:'ps3'},
  dreamcast:{bg:'#20120d',side:'#2d1c14',panel:'#41281c',line:'#7a5136',accent:'#ff9a52',text:'#fff1e4',skin:'dreamcast'},
  gba:{bg:'#17201b',side:'#222e27',panel:'#303f35',line:'#5a7663',accent:'#b7d6b7',text:'#f1fff1',skin:'gameboy'},
  n64:{bg:'#101b32',side:'#18294a',panel:'#24385e',line:'#4c6d9d',accent:'#ffcc65',text:'#eff5ff',skin:'retro'},
  metroid:{bg:'#071c1c',side:'#0c2e2c',panel:'#13413e',line:'#2e8179',accent:'#ff8c54',text:'#eafffc',skin:'metroid'},
  firewatch:{bg:'#2b1714',side:'#44231b',panel:'#593025',line:'#a85a3b',accent:'#ffbd70',text:'#fff0db',skin:'firewatch'},
  nightCity:{bg:'#0b0d1c',side:'#15182b',panel:'#202440',line:'#5552a0',accent:'#ff65c3',text:'#f9f1ff',skin:'neon-cyber'}
});
const themeCatalog=[
['system','System Default','System'],['crystaliumDark','Crystalium Dark','System'],['crystaliumLight','Crystalium Light','Light'],['minecraftNight','Minecraft · Moonlit Overworld','Gaming'],['undertaleGold','Undertale · Golden Soul','Gaming'],['ps2Silver','PlayStation 2 · Silver Orb','Gaming'],['ps3Violet','PlayStation 3 · Violet Wave','Gaming'],['dreamcast','Dreamcast · Orange Swirl','Retro'],['gba','Game Boy Advance','Retro'],['n64','Nintendo 64','Retro'],['metroid','Metroid · Phazon Depths','Gaming'],['firewatch','Firewatch · Painted Sunset','Aesthetic'],['nightCity','Night City · Neon Rain','Sci-Fi'],
['majora','Majora’s Mask · Dawn of the Final Day','Gaming'],
['undertale','Undertale · Soul of Determination','Gaming'],['hollowKnight','Hollow Knight · Hallownest','Gaming'],['zelda','The Legend of Zelda · Hyrule','Gaming'],['sonic','Sonic · Blue Blur','Gaming'],['pokemon','Pokémon · Kanto','Gaming'],['stardew','Stardew Valley · Pelican Town','Gaming'],['terraria','Terraria · World of Wonder','Gaming'],['celeste','Celeste · Mountain Lights','Gaming'],['portal','Portal · Aperture Science','Gaming'],['skyrim','Skyrim · Nordic Ruins','Gaming'],['kingdomHearts','Kingdom Hearts II · Dearly Beloved','Gaming'],['gamecube','Nintendo GameCube','Gaming'],['ps5','PlayStation 5 · DualSense Glass','Gaming'],['xbox360','Xbox 360 · Blades','Gaming'],['ps2','PlayStation 2','Gaming'],['ps3','PlayStation 3','Gaming'],['minecraft','Never Dig Straight Down · Minecraft','Gaming'],['gameboy','Handheld Pixel','Gaming'],['retro','Retro Arcade','Gaming'],['mgrr','Rules of Nature · Metal Gear Rising','Gaming'],
['deltarune','DELTARUNE: Dark World','Lore'],['cardCastle','Card Castle','Lore'],['cyberCity','Cyber City','Lore'],['roaringKnight','Black Knight · Roaring Knight','Lore'],['titan','Titan · Chapter 4','Lore'],['gerson','Gerson · Hammer of Justice','Lore'],['darkFountain','Dark Fountain','Lore'],['queenCyber','Queen’s Cyber World','Lore'],
['cyberpunk','Cyberpunk','Sci-Fi'],['matrix','Matrix Green','Sci-Fi'],['neonCyber','Neon Cyber','Sci-Fi'],['terminal','Terminal Green','Sci-Fi'],['vapor','Vaporwave','Sci-Fi'],['synthwave','Synthwave','Sci-Fi'],['solar','Solar Flare','Sci-Fi'],
['lofi','Lo-fi Mint','Aesthetic'],['sakura','Sakura Night','Aesthetic'],['aurora','Aurora Borealis','Aesthetic'],['sunset','Sunset Lounge','Aesthetic'],['oceanic','Deep Ocean','Aesthetic'],['copper','Copper Atelier','Aesthetic'],
['sakuraDay','Sakura Day','Light'],['warmPaper','Warm Paper','Light'],['lavenderSoft','Lavender Light','Light'],['arcticSoft','Arctic Glass','Light'],['slateStudio','Slate Studio','Light'],['amberGlow','Amber Glow','Light'],
['xp','Windows XP','Retro'],['forest','Forest','Aesthetic'],['rose','Rose','Aesthetic'],['violet','Violet','Aesthetic'],['ember','Ember','Aesthetic'],['mono','Monochrome','Retro'],['ocean','Ocean','Aesthetic'],['crimson','Crimson Night','Lore'],['paper','Parchment','Light'],['arctic','Arctic Glass · Classic','Light'],['lavender','Lavender Light · Classic','Light'],['sakuraLite','Sakura Day · Classic','Light'],['amber','Amber Glow · Classic','Light']
];

function applyTheme(next){
 const root=document.documentElement;const systemMode=next.preset==='system';
 if(systemMode){const dark=window.matchMedia?.('(prefers-color-scheme: dark)').matches??true;next={...next,preset:dark?'crystaliumDark':'crystaliumLight'};root.dataset.systemTheme=dark?'dark':'light';}else delete root.dataset.systemTheme;
 const p=themePresets[next.preset]||themePresets.midnight;
 const themeArt={
  minecraft:'https://techraptor.net/sites/default/files/2022-12/Minecraft%20End%20Poem%20Public%20Domain%20Main.jpg',
  minecraftNight:'https://techraptor.net/sites/default/files/2022-12/Minecraft%20End%20Poem%20Public%20Domain%20Main.jpg',
  undertale:'https://storymuseum.s3-assets.com/_1023x682_crop_center-center_80_none/1001_Undertale.png',
  undertaleGold:'https://storymuseum.s3-assets.com/_1023x682_crop_center-center_80_none/1001_Undertale.png',
  majora:'https://www.zeldadungeon.net/wp-content/uploads/2025/02/majoras-mask-original-art-crop.png',
  zelda:'https://www.zeldadungeon.net/wp-content/uploads/2025/02/majoras-mask-original-art-crop.png',
  ps2:'https://www.copetti.org/images/consoles/ps2/bios/game_splash.f251c2bbc47957aaa37328f26590eee36c7cc48aca5f484b712aee77bf2bbfad.jpg',
  ps2Silver:'https://www.copetti.org/images/consoles/ps2/bios/game_splash.f251c2bbc47957aaa37328f26590eee36c7cc48aca5f484b712aee77bf2bbfad.jpg',
  ps3:'https://wallpaperset.com/w/full/5/8/c/73320.jpg',
  ps3Violet:'https://wallpaperset.com/w/full/5/8/c/73320.jpg',
  hollowKnight:'https://www.nintendo.com/eu/media/images/10_share_images/games_15/wiiu_download_software_5/H2x1_WiiUDS_HollowKnight_image1600w.jpg',
  stardew:'https://media.springernature.com/lw1200/springer-static/image/art%3A10.1007%2Fs10460-020-10121-w/MediaObjects/10460_2020_10121_Fig1_HTML.jpg'
 };
 const defaultArt=themeArt[next.preset] || ({
   dreamcast:themeArt.ps2,gamecube:themeArt.ps2,n64:themeArt.ps2,ps5:themeArt.ps3,xbox360:themeArt.ps3,
   gameboy:themeArt.minecraft,gba:themeArt.minecraft,retro:themeArt.minecraft,sonic:themeArt.minecraft,pokemon:themeArt.minecraft,terraria:themeArt.minecraft,
   deltarune:themeArt.undertale,cardCastle:themeArt.undertale,cyberCity:themeArt.ps3,roaringKnight:themeArt.majora,titan:themeArt.majora,gerson:themeArt.majora,darkFountain:themeArt.undertale,queenCyber:themeArt.ps3,
   metroid:themeArt.hollowKnight,celeste:themeArt.hollowKnight,portal:themeArt.ps3,kingdomHearts:themeArt.majora,skyrim:themeArt.majora,mgrr:themeArt.ps3,
   cyberpunk:themeArt.ps3,matrix:themeArt.ps3,neonCyber:themeArt.ps3,terminal:themeArt.ps3,vapor:themeArt.ps3,synthwave:themeArt.ps3,solar:themeArt.ps3,nightCity:themeArt.ps3,
   lofi:themeArt.stardew,sakura:themeArt.stardew,aurora:themeArt.stardew,sunset:themeArt.stardew,oceanic:themeArt.stardew,copper:themeArt.stardew,firewatch:themeArt.stardew,
   sakuraDay:themeArt.stardew,warmPaper:themeArt.stardew,lavenderSoft:themeArt.stardew,arcticSoft:themeArt.ps3,slateStudio:themeArt.ps3,amberGlow:themeArt.stardew,
   forest:themeArt.stardew,rose:themeArt.stardew,violet:themeArt.ps3,ember:themeArt.majora,mono:themeArt.ps2,ocean:themeArt.stardew,crimson:themeArt.undertale,paper:themeArt.stardew,arctic:themeArt.ps3,lavender:themeArt.stardew,sakuraLite:themeArt.stardew,amber:themeArt.stardew,xp:themeArt.ps2
 })[next.preset];
 const customArtwork=load('themeArtwork',{});
 const art=customArtwork[next.preset] || defaultArt;
 root.style.setProperty('--theme-art',art?'url("'+String(art).replace(/["\\]/g,'\\$&')+'")':'none');
 for(const [key,value] of Object.entries({ '--bg':p.bg,'--side':p.side,'--panel':p.panel,'--line':p.line,'--blue':next.accent||p.accent,'--cyan':next.accent||p.accent,'--text':p.text,'--accent':next.accent||p.accent,'--muted':p.text+'aa','--panel-soft':p.panel,'--theme-border':p.line,'--theme-bg':p.bg})) root.style.setProperty(key,value);
 root.classList.remove(...Array.from(root.classList).filter(c=>c.startsWith('theme-')||c.startsWith('skin-')));
 root.classList.add('theme-'+next.preset); if(p.skin)root.classList.add('skin-'+p.skin);
 const custom=load('themeCustomization',{})[next.preset]||{};
 const customVars={bg:'--bg',side:'--side',panel:'--panel',line:'--line',text:'--text',accent:'--accent',muted:'--muted'};
 for(const [key,variable] of Object.entries(customVars))root.style.setProperty(variable,custom[key]||({bg:p.bg,side:p.side,panel:p.panel,line:p.line,text:p.text,accent:next.accent||p.accent,muted:p.text+'aa'})[key]);
 root.style.setProperty('--blue',custom.accent||next.accent||p.accent);root.style.setProperty('--cyan',custom.accent||next.accent||p.accent);root.style.setProperty('--panel-soft',custom.panel||p.panel);root.style.setProperty('--theme-border',custom.line||p.line);root.style.setProperty('--theme-bg',custom.bg||p.bg);
 const startPage=document.querySelector('.start-page');
 if(startPage){
  if(custom.gradientEnabled){const gradient='linear-gradient('+Number(custom.gradientAngle||135)+'deg, '+(custom.gradientA||custom.bg||p.bg)+' 0%, '+(custom.gradientB||p.side)+' 100%)';startPage.style.setProperty('background',gradient,'important');startPage.style.setProperty('background-size',custom.gradientMotion==='slow'?'300% 300%':'100% 100%');startPage.style.setProperty('animation',custom.gradientMotion==='slow'?'crystaliumCustomGradient '+Math.max(4,Number(custom.gradientSpeed)||18)+'s ease infinite':custom.gradientMotion==='sudden'?'crystaliumCustomSudden 1.1s steps(1,end) infinite':'none');}
  else {startPage.style.removeProperty('animation');startPage.style.removeProperty('background-size');if(startPage.style.getPropertyPriority('background')==='important')startPage.style.removeProperty('background');}
 }
 if(systemMode&&!window.__crystaliumSystemThemeListener){window.__crystaliumSystemThemeListener=true;window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(theme.preset==='system')applyTheme(theme);});}
 const fonts={ps2:'Tahoma, Verdana, sans-serif',ps3:'Arial, Helvetica, sans-serif',minecraft:'Verdana, Geneva, sans-serif',dmc:'Georgia, serif',gameboy:'monospace',retro:'monospace',cyberpunk:'Orbitron, sans-serif',deltarune:'Georgia, serif',cardCastle:'Georgia, serif',cyberCity:'Arial, sans-serif',blackKnight:'Georgia, serif',roaringKnight:'Georgia, serif',titan:'Arial, sans-serif',gerson:'Georgia, serif',metalGear:'Arial, sans-serif',mgrr:'Impact, sans-serif',terminal:'monospace',matrix:'monospace',paper:'Georgia, serif',xp:'Tahoma, Verdana, sans-serif',synthwave:'Arial, sans-serif'};
 const font=fonts[next.preset]||"'DM Sans',sans-serif";root.style.setProperty('--font-ui',font);root.style.setProperty('--font-display',fonts[next.preset]||"'Manrope',sans-serif");
}
applyTheme(theme);
document.documentElement.classList.toggle('reduce-motion',!!settings.reduceMotion);
document.documentElement.classList.toggle('hide-shortcuts',settings.showShortcuts===false);
if(settings.showMusicControls===false)$('musicToggle').style.display='none';
function showTreeEgg(){
  if(document.getElementById('treeEggOverlay'))return;
  if(window.__crystaliumTreeEggTimer)clearTimeout(window.__crystaliumTreeEggTimer);
  const overlay=document.createElement('div');overlay.id='treeEggOverlay';overlay.className='tree-egg-overlay';
  overlay.innerHTML='<button class="tree-egg-close" aria-label="Close">×</button><div class="tree-egg-art"><svg viewBox="0 0 240 240" role="img" aria-label="Mysterious pixel-art tree"><rect width="240" height="240" fill="#000"/><path fill="#542b58" d="M35 92H78V64H103V51H129V42H154V35H181V53H205V75H215V178H180V207H151V231H93V207H65V178H35Z"/><path fill="#ec174c" d="M102 51H130V43H155V35H181V53H205V74H192V87H174V97H150V111H131V126H116V111H101V98H78V79H96V64H102Z"/><path fill="#c90080" d="M78 64H102V79H124V91H151V102H180V91H201V105H178V117H148V126H130V112H105V99H78Z"/><path fill="#ff3155" d="M133 43H155V35H181V53H205V70H184V64H162V76H142V64H119V52H133Z"/><path d="M122 160l8-20 13-5 6-10m-27 35-15 5-8 10m28-12 10 12 17-3m-34-9-3 20-12 4m18-22 15-7 12-8" stroke="#e30088" stroke-width="3" fill="none"/></svg></div><p>A man is behind the tree</p><small>…</small>';
  overlay.querySelector('button').onclick=()=>{overlay.remove();clearTimeout(window.__crystaliumTreeEggTimer);window.__crystaliumTreeEggTimer=null;};
  document.body.append(overlay);
  window.__crystaliumTreeEggTimer=setTimeout(()=>{overlay.remove();window.__crystaliumTreeEggTimer=null;},7000);
}
function showGameEgg(){
  if(document.getElementById('gameEggOverlay'))return;
  const overlay=document.createElement('div');overlay.id='gameEggOverlay';overlay.className='tree-egg-overlay game-egg-overlay';
  overlay.innerHTML='<button class="tree-egg-close" aria-label="Close">×</button><div class="game-egg-art" aria-hidden="true"><svg viewBox="0 0 160 160"><rect width="160" height="160" fill="#101810"/><g fill="#58a64a"><rect x="32" y="16" width="96" height="24"/><rect x="16" y="40" width="128" height="64"/><rect x="32" y="104" width="96" height="24"/><rect x="48" y="128" width="64" height="16"/></g><g fill="#101810"><rect x="40" y="48" width="24" height="24"/><rect x="96" y="48" width="24" height="24"/><rect x="64" y="72" width="32" height="16"/><rect x="56" y="88" width="48" height="24"/><rect x="48" y="112" width="16" height="16"/><rect x="96" y="112" width="16" height="16"/></g></svg></div><p>Secret found: green things go hiss.</p><small>A tiny block-world easter egg.</small>';
  overlay.querySelector('button').onclick=()=>overlay.remove();document.body.append(overlay);setTimeout(()=>overlay.remove(),5000);
}

function toast(message) {
  const node = $('toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
}
function currentTab() { return state.tabs.find(t => t.id === state.activeId); }
function isHome() { const t = currentTab(); return !t || !t.url; }
function updateLayout() {
  // WebContentsView is a native layer above the renderer. Keep it strictly inside
  // the page viewport and fully collapsed whenever the home screen is visible.
  const art = startPage.querySelector('.theme-art');
  if (art) art.className = 'theme-art';
  const home = isHome();
  const rect = pageBounds.getBoundingClientRect();
  if (home || pageBounds.style.display === 'none' || rect.width <= 0 || rect.height <= 0) {
    api.layout({ x: 0, y: 0, width: 0, height: 0 });
    return;
  }
  const panelOpen = !sidePanel.classList.contains('hidden');
  const panelWidth = panelOpen ? Math.min(sidePanel.getBoundingClientRect().width, rect.width * 0.8) : 0;
  api.layout({
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(0, Math.round(rect.width - panelWidth)),
    height: Math.max(0, Math.round(rect.height))
  });
}
const themeArt = document.createElement('div'); themeArt.className = 'theme-art'; themeArt.setAttribute('aria-hidden','true');
const themeCanvas=document.createElement('canvas');themeCanvas.className='theme-canvas';themeCanvas.setAttribute('aria-hidden','true');themeArt.append(themeCanvas);startPage.prepend(themeArt);
let themeFrame=0,themeLast=0,themeParticles=[],themeCtx=themeCanvas.getContext('2d');
function resizeThemeCanvas(){const dpr=Math.min(window.devicePixelRatio||1,1.5),r=startPage.getBoundingClientRect();themeCanvas.width=Math.max(1,Math.floor(r.width*dpr));themeCanvas.height=Math.max(1,Math.floor(r.height*dpr));themeCanvas.style.width=r.width+'px';themeCanvas.style.height=r.height+'px';themeCtx?.setTransform(dpr,0,0,dpr,0,0);themeParticles=[];}
function paletteForTheme(id){
 const palettes={matrix:['#39ff75','#8cffad'],sakura:['#ff9fc8','#ffc5df'],sakuraDay:['#ba6689','#e0a0b6'],majora:['#e9a85f','#c17cff'],kingdomHearts:['#b5e5ff','#7ebeff'],gamecube:['#a98bff','#7657c5'],ps5:['#67baff','#b4ddff'],xbox360:['#83df5b','#b5f58a'],darkFountain:['#b94cff','#6f6cff'],solar:['#ffb04d','#ff6a3d'],oceanic:['#53c8ff','#9eeaff'],aurora:['#7fffd4','#a58cff'],vapor:['#ff76df','#28f0ff'],synthwave:['#ffb36b','#28f0ff'],ps2:['#77baff','#9d8cff'],ps3:['#52d6ff','#b69aff'],undertale:['#e8f0ff','#ff405c'],hollowKnight:['#8fc8ff','#c6d8ff'],zelda:['#d8c36b','#8fe3a0'],sonic:['#4bb7ff','#ffdf55'],pokemon:['#ffcb62','#ff6b6b'],stardew:['#e8c879','#8fcf8b'],terraria:['#8fe3a0','#54c8ff'],celeste:['#ff9cbe','#8edcff'],portal:['#ff9b5e','#65cfff'],skyrim:['#c6c5a2','#8fa8a5']};
 return palettes[id]||(['crystaliumLight','sakuraDay','warmPaper','lavenderSoft','arcticSoft','slateStudio','amberGlow','xp','paper','arctic','lavender','sakuraLite'].includes(id)?['#788ca4','#b09aaa']:['#54bdff','#9ce8ff']);
}

/* Original generated theme ambience. It never plays on top of a website. */
let homeMusicContext=null,homeMusicTimer=0,homeMusicOn=false,homeMusicStep=0,homeMusicNodes=[];
const homeMusicButton=document.createElement('button');
homeMusicButton.id='homeThemeMusic';homeMusicButton.className='home-theme-music';homeMusicButton.type='button';
homeMusicButton.innerHTML='<span aria-hidden="true">♫</span> Play home ambience';
homeMusicButton.title='Play original generated ambience for this theme';
startPage.append(homeMusicButton);
function homeMusicPattern(){
 const id=theme.preset;
 const patterns={
  minecraft:{notes:[0,7,12,19,16,12,7,4],base:130.81,wave:'sine',duration:2.1},
  undertale:{notes:[0,7,10,14,12,10,7,3],base:196,wave:'triangle',duration:1.05},
  deltarune:{notes:[0,3,7,12,10,7,5,2],base:174.61,wave:'triangle',duration:1.15},
  ps2:{notes:[0,5,12,17,12,7,2,5],base:146.83,wave:'sine',duration:1.8},
  ps3:{notes:[0,7,14,19,14,9,12,5],base:220,wave:'sine',duration:1.45},
  ps5:{notes:[0,7,12,19,24,19,14,7],base:246.94,wave:'sine',duration:1.5},
  majora:{notes:[0,3,7,10,7,3,12,10],base:164.81,wave:'triangle',duration:1.2},
  zelda:{notes:[0,7,12,7,4,9,12,16],base:196,wave:'triangle',duration:1.3},
  stardew:{notes:[0,4,7,11,7,4,2,7],base:196,wave:'sine',duration:1.65},
  terraria:{notes:[0,7,9,12,7,4,9,2],base:185,wave:'triangle',duration:1.2},
  hollowKnight:{notes:[0,5,9,12,7,5,2,9],base:146.83,wave:'sine',duration:1.9},
  celeste:{notes:[0,7,12,16,14,9,7,4],base:220,wave:'sine',duration:1.1},
  portal:{notes:[0,2,7,9,12,9,7,2],base:164.81,wave:'sine',duration:1.7},
  sonic:{notes:[0,7,12,16,19,16,12,7],base:246.94,wave:'square',duration:.62},
  pokemon:{notes:[0,4,7,12,7,4,2,7],base:220,wave:'triangle',duration:1.0},
  mgrr:{notes:[0,7,3,10,12,10,3,7],base:110,wave:'sawtooth',duration:.7},
  sakura:{notes:[0,4,7,11,7,4,2,7],base:196,wave:'sine',duration:1.65},
  gamecube:{notes:[0,7,12,19,14,7,12,5],base:220,wave:'sine',duration:1.45},
  kingdomHearts:{notes:[0,5,9,12,16,12,9,5],base:196,wave:'sine',duration:1.6},
  minecraftNight:{notes:[0,7,12,16,12,7,4,2],base:110,wave:'sine',duration:2.35},
  undertaleGold:{notes:[0,3,7,10,14,10,7,5],base:207.65,wave:'triangle',duration:1.15},
  ps2Silver:{notes:[0,5,12,17,19,12,7,2],base:130.81,wave:'sine',duration:2.0},
  ps3Violet:{notes:[0,7,14,19,21,14,9,5],base:233.08,wave:'sine',duration:1.55},
  dreamcast:{notes:[0,4,7,12,16,12,7,4],base:164.81,wave:'sine',duration:1.5},
  gba:{notes:[0,7,12,7,4,9,12,4],base:220,wave:'square',duration:.8},
  n64:{notes:[0,5,12,17,12,9,5,2],base:174.61,wave:'triangle',duration:1.35},
  metroid:{notes:[0,2,7,9,12,9,7,2],base:110,wave:'sine',duration:2.0},
  firewatch:{notes:[0,4,7,11,9,7,4,2],base:146.83,wave:'triangle',duration:1.8},
  nightCity:{notes:[0,3,7,10,15,10,7,3],base:138.59,wave:'sawtooth',duration:1.0},
  hollowKnight:{notes:[0,5,9,12,16,12,9,5],base:130.81,wave:'sine',duration:2.0},
  ps2Silver:{notes:[0,5,12,17,12,7,2,5],base:130.81,wave:'sine',duration:2.0},
  ps3Violet:{notes:[0,7,14,19,14,9,12,5],base:220,wave:'sine',duration:1.55}
 };
 return patterns[id]||{notes:[0,5,9,12,9,5,7,2],base:174.61,wave:'triangle',duration:1.35};
}
function stopHomeMusic(){
 homeMusicOn=false;if(homeMusicTimer){clearTimeout(homeMusicTimer);homeMusicTimer=0;}
 for(const node of homeMusicNodes){try{node.stop?.();node.disconnect?.();}catch{}}
 homeMusicNodes=[];
 if(homeMusicContext){homeMusicContext.close().catch(()=>{});homeMusicContext=null;}
 homeMusicButton.innerHTML='<span aria-hidden="true">♫</span> Play home ambience';
 homeMusicButton.classList.remove('playing');
}
function scheduleHomeMusic(){
 if(!homeMusicOn||!homeMusicContext||!isHome())return;
 const p=homeMusicPattern(),now=homeMusicContext.currentTime,semi=p.notes[homeMusicStep%p.notes.length];
 const osc=homeMusicContext.createOscillator(),gain=homeMusicContext.createGain(),filter=homeMusicContext.createBiquadFilter();
 osc.type=p.wave;osc.frequency.value=p.base*Math.pow(2,semi/12);filter.type='lowpass';filter.frequency.value=850;
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.026,now+.06);gain.gain.exponentialRampToValueAtTime(.0001,now+p.duration*.88);
 osc.connect(filter);filter.connect(gain);gain.connect(homeMusicContext.destination);osc.start(now);osc.stop(now+p.duration);
 homeMusicNodes.push(osc);osc.onended=()=>{try{osc.disconnect();filter.disconnect();gain.disconnect();}catch{}homeMusicNodes=homeMusicNodes.filter(n=>n!==osc);};
 if(homeMusicStep%4===0){const pad=homeMusicContext.createOscillator(),pg=homeMusicContext.createGain();pad.type='sine';pad.frequency.value=p.base/2*Math.pow(2,semi/12);pg.gain.setValueAtTime(.0001,now);pg.gain.exponentialRampToValueAtTime(.009,now+.22);pg.gain.exponentialRampToValueAtTime(.0001,now+p.duration*1.6);pad.connect(pg);pg.connect(homeMusicContext.destination);pad.start(now);pad.stop(now+p.duration*1.65);homeMusicNodes.push(pad);pad.onended=()=>{try{pad.disconnect();pg.disconnect();}catch{}homeMusicNodes=homeMusicNodes.filter(n=>n!==pad);};}
 homeMusicStep++;homeMusicTimer=setTimeout(scheduleHomeMusic,p.duration*1000);
}
homeMusicButton.addEventListener('click',async()=>{
 if(homeMusicOn){stopHomeMusic();return;}
 if(!isHome()){toast('Theme ambience only plays on the home page.');return;}
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass){toast('Audio is not supported in this window.');return;}
 try{homeMusicContext=new AudioContextClass();await homeMusicContext.resume();homeMusicOn=true;homeMusicStep=0;homeMusicButton.innerHTML='<span aria-hidden="true">Ⅱ</span> Stop home ambience';homeMusicButton.classList.add('playing');scheduleHomeMusic();}
 catch{stopHomeMusic();toast('Could not start theme ambience.');}
});
function drawThemeFrame(now){
 if(document.hidden||!document.documentElement.isConnected){themeFrame=0;return;}
 if(now-themeLast<32){themeFrame=requestAnimationFrame(drawThemeFrame);return;}themeLast=now;
 const rect=startPage.getBoundingClientRect(),w=rect.width,h=rect.height;
 if(!themeCtx||w<1||h<1){themeFrame=requestAnimationFrame(drawThemeFrame);return;}
 const id=theme.preset==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'crystaliumDark':'crystaliumLight'):theme.preset;
 const light=['crystaliumLight','sakuraDay','warmPaper','lavenderSoft','arcticSoft','slateStudio','amberGlow','xp','paper','arctic','lavender','sakuraLite'].includes(id);
 const palettes={
  undertale:['#e8f0ff','#ff405c'],hollowKnight:['#8fc8ff','#c6d8ff'],zelda:['#d8c36b','#8fe3a0'],sonic:['#4bb7ff','#ffdf55'],pokemon:['#ffcb62','#ff6b6b'],stardew:['#e8c879','#8fcf8b'],terraria:['#8fe3a0','#54c8ff'],celeste:['#ff9cbe','#8edcff'],portal:['#ff9b5e','#65cfff'],skyrim:['#c6c5a2','#8fa8a5'],
  matrix:['#39ff75','#8cffad'],sakura:['#ff9fc8','#ffc5df'],sakuraDay:['#ba6689','#e0a0b6'],majora:['#e9a85f','#c17cff'],kingdomHearts:['#b5e5ff','#7ebeff'],gamecube:['#a98bff','#7657c5'],ps5:['#67baff','#b4ddff'],xbox360:['#83df5b','#b5f58a'],darkFountain:['#b94cff','#6f6cff'],solar:['#ffb04d','#ff6a3d'],oceanic:['#53c8ff','#9eeaff'],aurora:['#7fffd4','#a58cff'],vapor:['#ff76df','#28f0ff'],synthwave:['#ffb36b','#28f0ff'],ps2:['#77baff','#9d8cff'],ps3:['#52d6ff','#b69aff']
 };
 const colors=palettes[id]||(light?['#8c9bad','#b5a9a0']:paletteForTheme(id));
 themeCtx.clearRect(0,0,w,h);
 // Theme-specific motion, not a generic ring overlay.
 themeCtx.save();
 const glow=themeCtx.createRadialGradient(w*.72,h*.24,1,w*.72,h*.24,Math.max(80,Math.min(w,h)*.55));
 glow.addColorStop(0,colors[0]+(light?'20':'32'));glow.addColorStop(1,colors[0]+'00');
 themeCtx.fillStyle=glow;themeCtx.fillRect(0,0,w,h);
 if(['sonic','cyberpunk','cyberCity','mgrr'].includes(id)){
   themeCtx.globalAlpha=.3;themeCtx.lineWidth=2;
   for(let i=0;i<24;i++){const y=((i*47+now*.12)%(h+100))-50;themeCtx.strokeStyle=i%3?colors[0]:colors[1];themeCtx.beginPath();themeCtx.moveTo((Math.sin(i*7)*.5+.5)*w,y);themeCtx.lineTo(Math.min(w,(Math.sin(i*7)*.5+.5)*w+45+(i%5)*24),y-3);themeCtx.stroke();}
 } else if(['celeste','hollowKnight','skyrim','arctic','arcticSoft'].includes(id)){
   // Slow drifting snow and distant mountain silhouettes.
   themeCtx.globalAlpha=light ? 0.10 : 0.24;themeCtx.fillStyle=colors[0];
   themeCtx.beginPath();themeCtx.moveTo(0,h*.68);for(let x=0;x<=w+40;x+=40)themeCtx.lineTo(x,h*(.52+Math.abs(Math.sin(x*.011+(id==='celeste'?0:2)))*.19));themeCtx.lineTo(w,h);themeCtx.lineTo(0,h);themeCtx.closePath();themeCtx.fill();
   themeCtx.globalAlpha=.65;themeCtx.fillStyle=colors[1];
   for(let i=0;i<36;i++){const x=((i*83+Math.sin(now*.0002+i)*24)%w+w)%w;const y=((i*61+now*(.012+i%3*.006))%(h+12));themeCtx.beginPath();themeCtx.arc(x,y,1+(i%3)*.55,0,Math.PI*2);themeCtx.fill();}
 } else if(['minecraft','terraria','gameboy','retro'].includes(id)){
   const cell=id==='gameboy'?22:30;themeCtx.globalAlpha=.14;
   for(let y=0;y<h;y+=cell){for(let x=0;x<w;x+=cell){const wave=Math.sin(x*.018+now*.00035)+Math.cos(y*.02-now*.0002);if(wave>.65){themeCtx.fillStyle=((x/cell+y/cell)%2)?colors[0]:colors[1];themeCtx.fillRect(x,y,cell-2,cell-2);}}}
 } else if(id==='ps2'){
   // PS2: slow violet orbit rings and a shifting silver-blue startup orb.
   const cx=w*.72,cy=h*.48,pulse=.5+.5*Math.sin(now*.0011);
   const orb=themeCtx.createRadialGradient(cx-w*.018,cy-h*.02,2,cx,cy,Math.min(w,h)*.19);
   orb.addColorStop(0,'#f0f2ff');orb.addColorStop(.18,colors[0]);orb.addColorStop(.7,colors[1]+'88');orb.addColorStop(1,colors[1]+'00');
   themeCtx.globalAlpha=.65;themeCtx.fillStyle=orb;themeCtx.beginPath();themeCtx.arc(cx,cy,Math.min(w,h)*(.11+.012*pulse),0,Math.PI*2);themeCtx.fill();
   themeCtx.globalAlpha=.28;themeCtx.lineWidth=2;
   for(let i=0;i<7;i++){themeCtx.beginPath();themeCtx.ellipse(cx,cy,35+i*23,18+i*15,now*.00012*(i%2?1:-1),0,Math.PI*2);themeCtx.strokeStyle=i%2?colors[0]:colors[1];themeCtx.stroke();}
 } else if(['portal','gamecube'].includes(id)){
   themeCtx.globalAlpha=.28;themeCtx.lineWidth=3;
   for(let i=0;i<4;i++){const rx=45+i*34+Math.sin(now*.0006+i)*8;themeCtx.beginPath();themeCtx.ellipse(w*.78,h*.55,rx,rx*1.45,now*.00012*(i%2?1:-1),0,Math.PI*2);themeCtx.strokeStyle=i%2?colors[0]:colors[1];themeCtx.stroke();}
 } else if(['zelda','stardew','pokemon','undertale','deltarune','kingdomHearts','majora'].includes(id)){
   // Floating magical motes and constellation links.
   const points=[];for(let i=0;i<12;i++){const x=w*(.12+((i*37)%83)/100)+Math.sin(now*.0003+i)*12;const y=h*(.14+((i*29)%72)/100)+Math.cos(now*.00025+i*1.7)*10;points.push([x,y]);}
   themeCtx.globalAlpha=.18;themeCtx.strokeStyle=colors[0];themeCtx.lineWidth=1;
   for(let i=0;i<points.length-1;i+=2){themeCtx.beginPath();themeCtx.moveTo(...points[i]);themeCtx.lineTo(...points[i+1]);themeCtx.stroke();}
   themeCtx.globalAlpha=.72;
   for(let i=0;i<points.length;i++){const [x,y]=points[i],radius=2.2+1.5*(.5+.5*Math.sin(now*.002+i));themeCtx.fillStyle=i%3===0?colors[1]:colors[0];themeCtx.beginPath();themeCtx.arc(x,y,radius,0,Math.PI*2);themeCtx.fill();if(id==='undertale'&&i===0){themeCtx.fillStyle='#ff405c';themeCtx.fillRect(x-3,y-5,6,10);themeCtx.fillRect(x-5,y-3,10,6);}}
 } else if(['sakura','sakuraDay'].includes(id)){
   themeCtx.globalAlpha=.22;themeCtx.fillStyle=colors[0];for(let i=0;i<18;i++){const x=(i*97+Math.sin(now*.0002+i)*35)%w,y=(i*67+now*.018)%(h+30);themeCtx.save();themeCtx.translate(x,y);themeCtx.rotate(now*.0003+i);themeCtx.beginPath();themeCtx.ellipse(0,0,4,2,0,0,Math.PI*2);themeCtx.fill();themeCtx.restore();}
 } else {
   // Aurora-like ribbons for all remaining palettes.
   themeCtx.globalAlpha=light ? 0.12 : 0.20;themeCtx.lineWidth=1.5;
   for(let ribbon=0;ribbon<6;ribbon++){themeCtx.beginPath();for(let x=0;x<=w;x+=10){const y=h*(.22+ribbon*.105)+Math.sin(x*.006+now*.00035+ribbon)*18+Math.sin(x*.002-now*.0002)*15;if(x===0)themeCtx.moveTo(x,y);else themeCtx.lineTo(x,y);}themeCtx.strokeStyle=ribbon%2?colors[0]:colors[1];themeCtx.stroke();}
 }
 themeCtx.restore();
 const count=id==='matrix'?70:['sakura','sakuraDay'].includes(id)?42:['pokemon','zelda','stardew','undertale'].includes(id)?32:24;
 if(themeParticles.length!==count)themeParticles=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,r:1+Math.random()*2.4,v:.18+Math.random()*.7,phase:Math.random()*Math.PI*2,kind:Math.random()}));

 // Distinct animated scenes for game presets (not just a shared ring overlay).
 themeCtx.save();


 if(id==='ps3'){
   // Original XMB-inspired blue wave ribbons and floating glass bubbles.
   for(let band=0;band<7;band++){themeCtx.globalAlpha=.12+(band%3)*.035;themeCtx.strokeStyle=band%2?'#5bd5ff':'#d5f6ff';themeCtx.lineWidth=2+(band%2);themeCtx.beginPath();for(let x=-20;x<=w+20;x+=8){const y=h*(.22+band*.085)+Math.sin(x*.004+now*.00032+band*.72)*h*.035+Math.sin(x*.009-now*.0002)*12;if(x===-20)themeCtx.moveTo(x,y);else themeCtx.lineTo(x,y);}themeCtx.stroke();}
   for(let i=0;i<18;i++){const x=(i*113+now*.012*(i%3+1))%(w+60)-30,y=h*(.18+(i*31%65)/100)+Math.sin(now*.0005+i)*14,r=5+(i%4)*4;themeCtx.globalAlpha=.12+(i%3)*.04;themeCtx.fillStyle=i%2?'#b6f1ff':'#368dff';themeCtx.beginPath();themeCtx.arc(x,y,r,0,Math.PI*2);themeCtx.fill();themeCtx.strokeStyle='#e4faff';themeCtx.lineWidth=1;themeCtx.stroke();}
 } else if(id==='majora'){
   // A stylized original horned mask silhouette, slowly rotating in twilight.
   const cx=w*.75,cy=h*.39,rot=Math.sin(now*.00042)*.16;
   themeCtx.save();themeCtx.translate(cx,cy);themeCtx.rotate(rot);const sc=Math.min(w,h)/470;themeCtx.scale(sc,sc);
   const aura=themeCtx.createRadialGradient(0,0,20,0,0,180);aura.addColorStop(0,'#c17cff33');aura.addColorStop(1,'#c17cff00');themeCtx.fillStyle=aura;themeCtx.fillRect(-190,-190,380,380);
   themeCtx.fillStyle='#30233f';themeCtx.strokeStyle='#e9a85f';themeCtx.lineWidth=4;themeCtx.beginPath();themeCtx.moveTo(-65,-35);themeCtx.lineTo(-112,-126);themeCtx.lineTo(-42,-83);themeCtx.lineTo(-12,-105);themeCtx.lineTo(0,-78);themeCtx.lineTo(25,-106);themeCtx.lineTo(52,-82);themeCtx.lineTo(113,-127);themeCtx.lineTo(73,-28);themeCtx.lineTo(65,50);themeCtx.lineTo(25,98);themeCtx.lineTo(0,112);themeCtx.lineTo(-28,94);themeCtx.lineTo(-64,48);themeCtx.closePath();themeCtx.fill();themeCtx.stroke();
   for(let i=0;i<9;i++){const a=i*Math.PI*2/9+now*.0008;themeCtx.globalAlpha=.8;themeCtx.fillStyle=i%2?'#ff6d8b':'#ffd36c';themeCtx.beginPath();themeCtx.arc(Math.cos(a)*80,Math.sin(a)*62,3.5,0,Math.PI*2);themeCtx.fill();}
   themeCtx.fillStyle='#ff6b83';themeCtx.beginPath();themeCtx.ellipse(-28,4,15,8,-.18,0,Math.PI*2);themeCtx.ellipse(28,4,15,8,.18,0,Math.PI*2);themeCtx.fill();themeCtx.fillStyle='#fff0b8';themeCtx.beginPath();themeCtx.arc(-28,4,3,0,Math.PI*2);themeCtx.arc(28,4,3,0,Math.PI*2);themeCtx.fill();themeCtx.restore();
 } else if(id==='mgrr'||id==='metalGearRising'){
   // Stylized high-frequency blade silhouette, wrapped in a pulsing red energy aura.
   const cx=w*.73,cy=h*.43,angle=-.56+Math.sin(now*.0012)*.025;
   themeCtx.save();themeCtx.translate(cx,cy);themeCtx.rotate(angle);
   const pulse=.7+.3*(.5+.5*Math.sin(now*.008));
   themeCtx.globalAlpha=.12*pulse;themeCtx.fillStyle='#ff153d';themeCtx.beginPath();themeCtx.ellipse(0,0,34,Math.min(w,h)*.34,0,0,Math.PI*2);themeCtx.fill();
   themeCtx.globalAlpha=.26*pulse;themeCtx.strokeStyle='#ff2148';themeCtx.lineWidth=12;themeCtx.beginPath();themeCtx.moveTo(0,-Math.min(w,h)*.31);themeCtx.lineTo(0,Math.min(w,h)*.22);themeCtx.stroke();
   themeCtx.globalAlpha=.95;themeCtx.fillStyle='#dce9f5';themeCtx.beginPath();themeCtx.moveTo(-4,-Math.min(w,h)*.34);themeCtx.lineTo(4,-Math.min(w,h)*.34);themeCtx.lineTo(2,Math.min(w,h)*.18);themeCtx.lineTo(0,Math.min(w,h)*.24);themeCtx.lineTo(-2,Math.min(w,h)*.18);themeCtx.closePath();themeCtx.fill();
   themeCtx.fillStyle='#ff274b';themeCtx.fillRect(-10,Math.min(w,h)*.17,20,5);themeCtx.fillStyle='#252c38';themeCtx.fillRect(-3,Math.min(w,h)*.21,6,Math.min(w,h)*.08);
   themeCtx.globalAlpha=.65;themeCtx.strokeStyle='#ff2148';themeCtx.lineWidth=1.2;
   for(let i=0;i<16;i++){const y=((i*37+now*.12)%(Math.min(w,h)*.7))-Math.min(w,h)*.35;themeCtx.beginPath();themeCtx.moveTo(-20+(i%4)*9,y);themeCtx.lineTo(12+(i%3)*8,y-5);themeCtx.stroke();}
   themeCtx.restore();
 } else if(id==='sakura'||id==='sakuraDay'){
   // A large flowering sakura tree; night mode has a small grove of extra trees.
   const night=id==='sakura';
   function blossomTree(x,base,scale,phase){
     themeCtx.save();themeCtx.translate(x,base);themeCtx.scale(scale,scale);
     themeCtx.strokeStyle=night?'#33283b':'#79565b';themeCtx.lineCap='round';themeCtx.lineWidth=12;
     themeCtx.beginPath();themeCtx.moveTo(0,0);themeCtx.bezierCurveTo(-8,-35,10,-62,0,-108);themeCtx.stroke();
     themeCtx.lineWidth=6;
     [[0,-72,-34,-100], [0,-83,34,-111],[-2,-55,-42,-72],[1,-61,42,-82],[-1,-92,-17,-123],[0,-96,22,-128]].forEach(([x1,y1,x2,y2])=>{themeCtx.beginPath();themeCtx.moveTo(x1,y1);themeCtx.quadraticCurveTo(x1+(x2-x1)*.65,y1-8,x2,y2);themeCtx.stroke();});
     const clusters=[[-36,-103,24],[-14,-126,26],[20,-129,27],[43,-102,24],[-43,-75,20],[40,-81,22],[0,-93,31]];
     clusters.forEach(([bx,by,rad],i)=>{const sway=Math.sin(now*.0007+phase+i)*3;const grad=themeCtx.createRadialGradient(bx+sway,by,1,bx+sway,by,rad);grad.addColorStop(0,night?'#ffd7f0':'#fff0f5');grad.addColorStop(.55,night?'#e987bd':'#f5a9c8');grad.addColorStop(1,night?'#a94c88':'#db729f');themeCtx.globalAlpha=.88;themeCtx.fillStyle=grad;themeCtx.beginPath();themeCtx.arc(bx+sway,by,rad,0,Math.PI*2);themeCtx.fill();});
     themeCtx.restore();
   }
   const base=h*.94;
   if(night){blossomTree(w*.22,base,.9,1);blossomTree(w*.53,base+12,.62,3);blossomTree(w*.86,base+8,.78,5);}
   else blossomTree(w*.76,base,1.18,2);
   // Falling petals drift across the whole scene.
   for(let i=0;i<42;i++){const x=(i*79+Math.sin(now*.0007+i)*35+now*.012*(i%3+1))%w;const y=(i*43+now*(.018+(i%4)*.004))%h;themeCtx.save();themeCtx.translate(x,y);themeCtx.rotate(now*.0005+i);themeCtx.globalAlpha=.45;themeCtx.fillStyle=night?'#ffb8df':'#f4a4c3';themeCtx.beginPath();themeCtx.ellipse(0,0,3,1.7,0,0,Math.PI*2);themeCtx.fill();themeCtx.restore();}
 } else if(id==='undertale'){
   themeCtx.globalAlpha=.45;
   for(let i=0;i<70;i++){const x=((i*97.13)%w),y=((i*53.7)%Math.max(1,h));const tw=.35+.65*(.5+.5*Math.sin(now*.002+i));themeCtx.globalAlpha=tw*.55;themeCtx.fillStyle=i%7===0?'#ff405c':'#e8f0ff';themeCtx.fillRect(x,y,i%7===0?2.5:1.3,i%7===0?2.5:1.3);}
   const hx=w*.76,hy=h*(.22+Math.sin(now*.001)*.018),hs=7+Math.sin(now*.004)*1.8;themeCtx.globalAlpha=.82;themeCtx.fillStyle='#ff405c';themeCtx.beginPath();themeCtx.moveTo(hx,hy+hs);themeCtx.bezierCurveTo(hx-hs*2,hy-hs*.2,hx-hs,hy-hs*1.7,hx,hy-hs*.55);themeCtx.bezierCurveTo(hx+hs,hy-hs*1.7,hx+hs*2,hy-hs*.2,hx,hy+hs);themeCtx.fill();
 } else if(id==='hollowKnight'){
   themeCtx.globalAlpha=.15;themeCtx.fillStyle='#8fc8ff';for(let i=0;i<9;i++){const x=(i/8)*w+Math.sin(now*.0002+i)*24;themeCtx.beginPath();themeCtx.moveTo(x-18,0);themeCtx.lineTo(x+12,0);themeCtx.lineTo(x+Math.sin(now*.0004+i)*34,h*.72);themeCtx.lineTo(x-35,h*.72);themeCtx.closePath();themeCtx.fill();}
   themeCtx.globalAlpha=.65;for(let i=0;i<22;i++){const x=(i*137.7+Math.sin(now*.0004+i)*28)%w,y=(h-((now*.018+i*43)%(h+20)));themeCtx.beginPath();themeCtx.arc(x,y,1.2+(i%3),0,Math.PI*2);themeCtx.fillStyle=i%2?'#c6d8ff':'#8fc8ff';themeCtx.fill();}
 } else if(id==='skyrim'){
   themeCtx.globalAlpha=.6;themeCtx.fillStyle='#e6f0f1';for(let i=0;i<110;i++){const x=(i*71.9+Math.sin(now*.0005+i)*22+now*.012*(i%3+1))%w;const y=(i*47.3+now*(.012+(i%5)*.006))%h;themeCtx.beginPath();themeCtx.arc(x,y,.7+(i%3)*.45,0,Math.PI*2);themeCtx.fill();}
   themeCtx.globalAlpha=.12;themeCtx.strokeStyle='#c6c5a2';themeCtx.lineWidth=1;for(let i=0;i<5;i++){const y=h*.28+i*18+Math.sin(now*.0003+i)*5;themeCtx.beginPath();themeCtx.moveTo(0,y);themeCtx.lineTo(w*.42,y+18);themeCtx.lineTo(w*.8,y-12);themeCtx.lineTo(w,y+4);themeCtx.stroke();}
 } else if(id==='minecraft'||id==='terraria'){
   const block=24;themeCtx.globalAlpha=.24;for(let i=0;i<48;i++){const x=((i*83+now*(i%3+1)*.008)%(w+block))-block;const y=(i*61)%(h*.88);const sz=8+(i%3)*5;themeCtx.fillStyle=['#8ad64f','#4f9b58','#b6d77c','#54c8ff'][i%4];themeCtx.fillRect(x,y,sz,sz);themeCtx.globalAlpha=.4;themeCtx.fillRect(x,y,sz,2);themeCtx.globalAlpha=.24;}
 } else if(id==='zelda'){
   themeCtx.globalAlpha=.24;for(let i=0;i<15;i++){const x=(i*109+Math.sin(now*.0003+i)*20)%w,y=(i*73+Math.cos(now*.0004+i)*15)%h;const s=4+(i%3)*2;themeCtx.strokeStyle=i%2?'#d8c36b':'#8fe3a0';themeCtx.beginPath();themeCtx.moveTo(x,y-s);themeCtx.lineTo(x+s,y+s);themeCtx.lineTo(x-s,y+s);themeCtx.closePath();themeCtx.stroke();}
   const gx=((now*.035)%(w+240))-120;const grad=themeCtx.createLinearGradient(gx,0,gx+180,h);grad.addColorStop(0,'#d8c36b00');grad.addColorStop(.5,'#d8c36b12');grad.addColorStop(1,'#d8c36b00');themeCtx.fillStyle=grad;themeCtx.fillRect(0,0,w,h);
 } else if(id==='sonic'){
   themeCtx.globalAlpha=.28;themeCtx.lineWidth=2;for(let i=0;i<24;i++){const y=(i*37+now*.11)%(h+40)-20;const x=(i*131+now*.22)%(w+180)-180;themeCtx.strokeStyle=i%4===0?'#ffdf55':'#4bb7ff';themeCtx.beginPath();themeCtx.moveTo(x,y);themeCtx.lineTo(x+38+(i%5)*15,y-5);themeCtx.stroke();}
 } else if(id==='pokemon'){
   themeCtx.globalAlpha=.27;for(let i=0;i<7;i++){const x=w*(.18+i*.105),y=h*(.2+(i%3)*.19),rad=7+(i%3)*3;themeCtx.strokeStyle=i%2?'#ffcb62':'#ff6b6b';themeCtx.lineWidth=1.4;themeCtx.beginPath();themeCtx.arc(x+Math.sin(now*.0005+i)*12,y+Math.cos(now*.0007+i)*10,rad,0,Math.PI*2);themeCtx.moveTo(x-rad,y);themeCtx.lineTo(x+rad,y);themeCtx.stroke();themeCtx.beginPath();themeCtx.arc(x,y,2,0,Math.PI*2);themeCtx.fillStyle='#ffcb62';themeCtx.fill();}
 } else if(id==='stardew'){
   for(let i=0;i<28;i++){const x=(i*89+Math.sin(now*.00025+i)*25)%w,y=h*.25+(i*47)%(h*.65)+Math.sin(now*.001+i)*6;const a=.3+.7*(.5+.5*Math.sin(now*.002+i));themeCtx.globalAlpha=a*.5;themeCtx.fillStyle=i%2?'#e8c879':'#8fcf8b';themeCtx.beginPath();themeCtx.arc(x,y,1.5+(i%3),0,Math.PI*2);themeCtx.fill();}
 } else if(id==='celeste'){
   themeCtx.globalAlpha=.25;themeCtx.strokeStyle='#8edcff';themeCtx.lineWidth=2;themeCtx.beginPath();for(let x=0;x<=w;x+=8){const y=h*.68-Math.abs(Math.sin(x*.006+now*.00018))*h*.27+Math.sin(x*.017)*9;if(x===0)themeCtx.moveTo(x,y);else themeCtx.lineTo(x,y);}themeCtx.stroke();for(let i=0;i<18;i++){const x=(i*97+now*.014)%w,y=h*.15+(i*59)%(h*.5);themeCtx.fillStyle=i%2?'#ff9cbe':'#8edcff';themeCtx.globalAlpha=.25+.3*(.5+.5*Math.sin(now*.002+i));themeCtx.fillRect(x,y,2,2);}
 } else if(id==='portal'){
   themeCtx.globalAlpha=.45;for(let i=0;i<2;i++){const x=w*(i?.78:.22),y=h*(.33+Math.sin(now*.0006+i)*.025),rx=30+Math.sin(now*.001+i)*4;themeCtx.strokeStyle=i?'#ff9b5e':'#65cfff';themeCtx.lineWidth=3;themeCtx.beginPath();themeCtx.ellipse(x,y,rx,rx*1.55,Math.sin(now*.0003+i)*.12,0,Math.PI*2);themeCtx.stroke();themeCtx.globalAlpha=.12;themeCtx.beginPath();themeCtx.ellipse(x,y,rx*1.35,rx*1.9,0,0,Math.PI*2);themeCtx.stroke();themeCtx.globalAlpha=.45;}
 }
 themeCtx.restore();
 for(const p of themeParticles){
   const falling=['sakura','sakuraDay','celeste','hollowKnight','skyrim'].includes(id);
   p.y+=(id==='matrix'?p.v*2:falling?p.v*.75:p.v*.18);p.x+=Math.sin(now*.0003+p.phase)*(falling ? 0.6 : 0.25);
   if(p.y>h+8){p.y=-8;p.x=Math.random()*w;}if(p.x>w+8)p.x=-8;
   themeCtx.globalAlpha=.22+p.kind*.5;themeCtx.fillStyle=colors[p.kind>.5?1:0];
   if(id==='matrix'){themeCtx.font='12px monospace';themeCtx.fillText(['ｱ','ﾊ','ﾐ','0','1','∑'][Math.floor(p.phase*10)%6],p.x,p.y);}
   else if(falling){themeCtx.save();themeCtx.translate(p.x,p.y);themeCtx.rotate(now*.0003+p.phase);themeCtx.fillRect(-p.r,-p.r/2,p.r*2,p.r);themeCtx.restore();}
   else{themeCtx.beginPath();themeCtx.arc(p.x,p.y,p.r,0,Math.PI*2);themeCtx.fill();}
 }
 themeCtx.globalAlpha=1;themeFrame=requestAnimationFrame(drawThemeFrame);
}
function startThemeAnimation(){if(themeFrame||document.hidden||settings.reduceMotion)return;resizeThemeCanvas();themeLast=0;themeFrame=requestAnimationFrame(drawThemeFrame);}
function stopThemeAnimation(){if(themeFrame)cancelAnimationFrame(themeFrame);themeFrame=0;}
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopThemeAnimation();document.querySelectorAll('video').forEach(v=>{if(!v.paused)v.pause();});}else startThemeAnimation();});
window.addEventListener('resize',resizeThemeCanvas);

function render(next) {
  state = next;
  if(!isHome()&&homeMusicOn)stopHomeMusic();

  strip.replaceChildren();
  for (const tab of state.tabs) {
    const node = document.createElement('div');
    node.className = 'tab' + (tab.id === state.activeId ? ' active' : '');
    const dot = document.createElement('span'); dot.className = 'tab-dot';
    const title = document.createElement('button'); title.className = 'tab-title'; title.textContent = (!tab.url || tab.url === 'about:blank') ? 'Home' : (tab.title || tab.url || 'Home'); title.title = tab.url || 'Home'; title.onclick = () => api.activateTab(tab.id); if(tab.incognito){node.classList.add('incognito-tab');title.textContent='◉ '+title.textContent;title.title='Private tab · '+(tab.url||'Home');}
    const close = document.createElement('button'); close.className = 'tab-close'; close.textContent = '×'; close.title = 'Close tab'; close.onclick = e => { e.stopPropagation(); api.closeTab(tab.id); };
    node.append(dot, title, close); strip.append(node);
  }
  const previousActiveId = window.__crystaliumLastActiveId;
  const tab = currentTab();
  if (tab && previousActiveId !== undefined && previousActiveId !== state.activeId) { if(load('treeEggEnabled',true) && Math.random()<0.10) showTreeEgg(); else if(settings.gameEggs && Math.random()<0.025) showGameEgg(); }
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
// Rehydrate preferences from the durable main-process state file as well as localStorage.
api.getSavedState().then(saved => {
  if (saved?.settings && typeof saved.settings === 'object') {
    Object.assign(settings, saved.settings);
    if (hasLocal('settings')) Object.assign(settings, load('settings', {}));
    save('settings', settings);
  }
  if (saved?.theme && !hasLocal('theme') && typeof saved.theme === 'object' && themePresets[saved.theme.preset]) {
    Object.assign(theme, saved.theme); save('theme', theme); applyTheme(theme);
  }
  if (saved?.themeCategory && !hasLocal('themeCategory')) save('themeCategory', saved.themeCategory);
  applySettings();
  persistSaved({settings,theme,themeCategory:load('themeCategory','All')});
}).catch(() => {});
applyLanguage(uiLanguage);
applySettings();
const languageObserver=new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))applyLanguage(uiLanguage);});
languageObserver.observe(document.body,{childList:true,subtree:true});
api.onNotice(message => toast(message));
api.onUpdateStatus(status => paintUpdateControls(status));
window.addEventListener('resize', updateLayout);
function syncFullscreenChrome(active) {
  window.__crystaliumFullscreen = !!active;
  document.documentElement.classList.toggle('hide-chrome', !!active);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    updateLayout();
    // Re-measure once the chrome visibility change has been painted.
    requestAnimationFrame(updateLayout);
  }));
}
api.onFullscreen(syncFullscreenChrome);
window.addEventListener('focus', () => api.windowAction('sync-fullscreen'));
document.addEventListener('visibilitychange', () => { if (!document.hidden) api.windowAction('sync-fullscreen'); });
$('newTab').onclick = () => api.newTab();
$('pictureInPicture').onclick = async () => {
  const result = await api.pictureInPicture();
  if (result?.ok) toast('Picture-in-Picture opened. It can stay above other windows.');
  else if (result?.message) toast(result.message);
};
$('back').onclick = () => api.back();
$('forward').onclick = () => api.forward();
$('reload').onclick = () => api.reload();
$('addressForm').addEventListener('submit', e => { e.preventDefault(); api.navigate(address.value); });
$('startSearch').addEventListener('submit', e => { e.preventDefault(); const q=$('searchInput').value.trim(); if(settings.gameEggs && /^(\/)?(creeper|minecraft|block world)(\s*)$/i.test(q)){showGameEgg();return;} if(/^(\/)?(tree|man behind the tree)(\s*)$/i.test(q)){showTreeEgg();return;} api.navigate(q); });
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
  const titleMap = {music:'Music player',bookmarks:'Bookmarks',history:'Recent history',settings:'Browser settings',home:'Your space',tools:'Browser tools'};
  $('panelTitle').textContent = titleMap[name] || 'Browser tools';
  $('panelEyebrow').textContent = name === 'music' ? 'YOUR SOUNDTRACK' : 'CRYSTALIUM TOOLS';
  if (name === 'music') renderMusic();
  else if (name === 'tools') {
    addPanelText('Quick controls for the active page. Keyboard shortcuts also work while browsing.');
    addPanelCard('Toggle fullscreen (F11)','Hide or restore the browser bars. Press Escape to leave fullscreen.',()=>api.windowAction('toggle-fullscreen'));
    addPanelCard('Developer tools (F12)','Inspect the active page and diagnose site issues.',()=>api.windowAction('devtools'));
    addPanelCard('Zoom in (Ctrl + +)','Make the active website easier to read.',()=>api.windowAction('zoom-in'));
    addPanelCard('Zoom out (Ctrl + −)','Fit more of the active website on screen.',()=>api.windowAction('zoom-out'));
    addPanelCard('Reset zoom (Ctrl + 0)','Return the active website to 100%.',()=>api.windowAction('zoom-reset'));
    addPanelCard('Reload page (F5)','Reload the current tab.',()=>api.reload());
    addPanelCard('Picture-in-Picture','Pop supported video into a floating mini-player.',async()=>{const result=await api.pictureInPicture();if(result?.ok)toast('Picture-in-Picture opened.');else toast(result?.message||'This page has no video available for Picture-in-Picture.');});
  }
  else if (name === 'bookmarks') {
    addPanelText('Bookmarks are saved on this device.');
    const current=currentTab();
    if(current?.url && /^https?:/i.test(current.url)) {
      addPanelCard('＋ Save current page',current.title||current.url,()=>{if(!bookmarks.some(b=>b.url===current.url)){bookmarks.push({title:current.title,url:current.url});save('bookmarks',bookmarks);toast('Bookmark saved.');showPanel('bookmarks');}else toast('Already bookmarked.');});
      addPanelCard('＋ Pin current website to Home',current.title||current.url,()=>{if(addHomeShortcut(current.url,current.title)){showPanel('bookmarks');}});
    }
    if (!bookmarks.length) addPanelCard('No bookmarks yet','Open Settings and use the bookmarks panel to save pages.');
    bookmarks.forEach((b,i) => addPanelCard(b.title, b.url, () => { sidePanel.classList.add('hidden'); api.navigate(b.url); }));
  } else if (name === 'history') {
    addPanelText('Recent pages are saved on this device.');
    if (!historyItems.length) addPanelCard('Nothing here yet','Start browsing to see recent pages.');
    [...historyItems].reverse().slice(0,30).forEach(h => addPanelCard(h.title, h.url, () => { sidePanel.classList.add('hidden'); api.navigate(h.url); }));
  } else if (name === 'settings') {
    addPanelText('Make Crystalium feel like yours. Your choices are saved on this device.');
    const section=(label)=>{const h=document.createElement('h3');h.className='settings-section';h.textContent=label;$('panelBody').append(h);};
    section('Updates');
    const updateBox=document.createElement('div');updateBox.className='panel-card update-controls';
    const updateHeading=document.createElement('strong');updateHeading.textContent='Crystalium updater';
    updateStatusLine=document.createElement('p');updateStatusLine.className='panel-copy';updateStatusLine.textContent=latestUpdateStatus.message||'Checking update status…';
    updateActionButton=document.createElement('button');updateActionButton.className='panel-card';updateActionButton.style.width='100%';
    updateActionButton.onclick=async()=>{updateActionButton.disabled=true;try{if(latestUpdateStatus.status==='downloaded'){await api.installUpdate();}else{const result=await api.checkForUpdates();paintUpdateControls(result);if(result.status==='unsupported')toast('Updater is available in installed release builds.');}}catch{toast('Could not check for updates.');}finally{if(updateActionButton&&latestUpdateStatus.status!=='checking'&&latestUpdateStatus.status!=='downloading')updateActionButton.disabled=false;}};
    updateBox.append(updateHeading,updateStatusLine,updateActionButton);$('panelBody').append(updateBox);paintUpdateControls(latestUpdateStatus);api.getUpdateStatus().then(paintUpdateControls).catch(()=>{});
    section('Chrome Transfer');
    addPanelText('Import Chrome bookmarks and compatible Netscape-format cookies from files you select. Crystalium cannot directly decrypt Chrome’s protected cookie database or import saved passwords automatically.');
    const transfer=document.createElement('button');transfer.className='panel-card';transfer.style.width='100%';transfer.textContent='Import Chrome data…';transfer.onclick=async()=>{transfer.disabled=true;transfer.textContent='Choose Chrome data files…';try{const result=await api.chromeTransfer();if(result?.canceled){toast('Import cancelled.');return;}if(!result?.ok){toast('Could not import those files.');return;}let added=0;for(const b of result.bookmarks||[]){if(!bookmarks.some(old=>old.url===b.url)){bookmarks.push(b);added++;}}save('bookmarks',bookmarks);persistSaved({bookmarks});toast('Imported '+added+' bookmarks and '+(result.cookies||0)+' cookies.');}catch{toast('Chrome import failed.');}finally{transfer.disabled=false;transfer.textContent='Import Chrome data…';}};$('panelBody').append(transfer);
    section('Appearance');
    const importBox=document.createElement('div');importBox.className='panel-card';const importLabel=document.createElement('label');importLabel.textContent='Import a downloaded theme (.json)';importLabel.className='file-button';const importInput=document.createElement('input');importInput.type='file';importInput.accept='.json,application/json';importInput.hidden=true;importInput.onchange=async()=>{try{const parsed=JSON.parse(await importInput.files[0].text());if(!parsed||!themePresets[parsed.preset]|| (parsed.accent&&!/^#[0-9a-f]{6}$/i.test(parsed.accent)))throw new Error('Invalid theme');theme.preset=parsed.preset;theme.accent=parsed.accent||themePresets[parsed.preset].accent;save('theme',theme);persistSaved({theme});applyTheme(theme);showPanel('settings');toast('Theme imported.');}catch{toast('That theme file is not valid.');}};importLabel.append(importInput);importBox.append(importLabel);$('panelBody').append(importBox);
    const presets=[...new Map(themeCatalog.map(([id,label,category])=>[id,[id,label,category]])).values()];
    const categorySelect=document.createElement('select');categorySelect.className='style-select';categorySelect.setAttribute('aria-label','Theme category');
    [['All','All themes'],...['System','Gaming','Lore','Sci-Fi','Aesthetic','Light','Retro'].map(c=>[c,c])].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;categorySelect.append(o);});
    categorySelect.value=load('themeCategory','All');categorySelect.onchange=()=>{save('themeCategory',categorySelect.value);persistSaved({themeCategory:categorySelect.value});showPanel('settings');};$('panelBody').append(categorySelect);
    presets.filter(([id,label,category])=>categorySelect.value==='All'||categorySelect.value===category).forEach(([id,label,category])=>{const b=document.createElement('button');b.className='theme-option'+(theme.preset===id?' selected':'');b.title=label;const swatch=document.createElement('span');swatch.className='theme-swatch';swatch.style.background='linear-gradient(135deg,'+(themePresets[id]?.bg||'#060d19')+','+(themePresets[id]?.accent||'#54bdff')+')';const details=document.createElement('span');details.className='theme-option-details';const name=document.createElement('strong');name.textContent=label;const desc=document.createElement('small');desc.textContent=category+' · animated background';details.append(name,desc);const active=document.createElement('small');active.textContent=theme.preset===id?'✓ Active':'Preview';b.append(swatch,details,active);b.onclick=()=>{theme.preset=id;theme.accent=themePresets[id]?.accent||'#54bdff';save('theme',theme);persistSaved({theme});applyTheme(theme);showPanel('settings');toast(label+' theme applied.');};$('panelBody').append(b);});
    const colorBox=document.createElement('div');colorBox.className='panel-card';
    const colorLabel=document.createElement('label');colorLabel.className='color-setting';colorLabel.textContent='UI accent color';
    const color=document.createElement('input');color.type='color';color.value=theme.accent||themePresets[theme.preset]?.accent||'#54bdff';color.oninput=()=>{theme.accent=color.value;save('theme',theme);persistSaved({theme});applyTheme(theme);};colorLabel.append(color);colorBox.append(colorLabel);$('panelBody').append(colorBox);
    const download=document.createElement('button');download.className='panel-card';download.style.width='100%';download.textContent='Download theme settings (.json)';download.onclick=()=>{const blob=new Blob([JSON.stringify(theme,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='crystalium-theme.json';a.click();URL.revokeObjectURL(url);};$('panelBody').append(download);
    section('Website translation');
    addPanelText('Choose a target language, then open Google Translate’s website-translation view in a new tab. Some sites block proxy translation; if that happens, use the translation page to paste text instead.');
    const targetLanguage=document.createElement('select');targetLanguage.className='style-select';targetLanguage.setAttribute('aria-label','Website translation language');
    [['de','German'],['en','English'],['es','Spanish'],['fr','French'],['it','Italian'],['ja','Japanese'],['pt','Portuguese'],['uk','Ukrainian']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;targetLanguage.append(o);});
    targetLanguage.value=load('translationLanguage','de');
    targetLanguage.onchange=()=>save('translationLanguage',targetLanguage.value);
    $('panelBody').append(targetLanguage);
    addPanelCard('Translate active website','Open Google Translate for the current site in a new tab.',()=>{const t=currentTab();if(!t?.url||!/^https?:/i.test(t.url)){toast('Open a website first.');return;}save('translationLanguage',targetLanguage.value);const translated='https://translate.google.com/translate?sl=auto&tl='+encodeURIComponent(targetLanguage.value)+'&u='+encodeURIComponent(t.url);api.newTab(translated);});
    addPanelCard('Open Google Translate','Use text, documents, or a website link if automatic site translation is blocked.',()=>api.newTab('https://translate.google.com/?sl=auto&tl='+encodeURIComponent(targetLanguage.value)));
    section('Interface language');
    const language=document.createElement('select');language.className='style-select';language.setAttribute('aria-label','Interface language');
    [['en','English'],['pirate','Pirate / treasure speak'],['shakespeare','Shakespearean English']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;language.append(o);});language.value=uiLanguage;language.onchange=()=>{applyLanguage(language.value);showPanel('settings');toast('Interface language changed.');};$('panelBody').append(language);
    section('Speaking style');
    const treeToggleBox=document.createElement('div');treeToggleBox.className='panel-card';const treeToggleLabel=document.createElement('label');treeToggleLabel.className='color-setting';treeToggleLabel.textContent='Mysterious tree easter egg (10% chance on tab switch)';const treeToggle=document.createElement('input');treeToggle.type='checkbox';treeToggle.checked=load('treeEggEnabled',true);treeToggle.onchange=()=>{save('treeEggEnabled',treeToggle.checked);toast(treeToggle.checked?'The tree may appear…':'Tree easter egg disabled.');};treeToggleLabel.append(treeToggle);treeToggleBox.append(treeToggleLabel);$('panelBody').append(treeToggleBox);
    const style=document.createElement('select');style.className='style-select';[['normal','Standard'],['pirate','Pirate / treasure speak'],['shakespeare','Shakespearean']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;style.append(o);});style.value=voiceStyle;style.onchange=()=>{localStorage.setItem('crystalium.voiceStyle',style.value);toast(({normal:'Standard style selected.',pirate:'Arrr! Pirate speak be selected.',shakespeare:'A Shakespearean tongue, most noble.',tree:'The old tree whispers in riddles…'})[style.value]);};$('panelBody').append(style);
    const preview=document.createElement('button');preview.className='panel-card';preview.style.width='100%';preview.textContent='Preview speaking style';preview.onclick=()=>{const s=style.value;toast(({normal:'Settings saved.',pirate:'Arrr, treasure ahoy! Fair winds to yer browsing!',shakespeare:'Good morrow! May thy browsing be swift and fortunes bright.',tree:'Roots remember what the branches forget… seek the quiet path.'})[s]);};$('panelBody').append(preview);
    section('Browser');
    addToggle('Block common ad/tracker domains','blockTrackers','Best-effort filtering; some ads and trackers will still get through.');
    addToggle('Warn about insecure HTTP pages','warnInsecure','Preference saved; navigation warning enforcement is not yet implemented.');
    addToggle('Restore tabs when Crystalium starts','restoreTabs','Save and restore the last browsing session where supported.');
    addToggle('Reduce motion','reduceMotion','Use fewer interface animations.');
    addToggle('Show home-page shortcuts','showShortcuts','Show your pinned sites on the start page.');
    addToggle('Show music controls','showMusicControls','Keep website audio controls available in the music panel.');
    
    addToggle('Enable mysterious tree encounter','treeEggEnabled','A rare 10% chance when switching tabs.');
    section('More controls');
    addToggle('Show tab activity dots','showTabDots','Show small activity indicators on tabs.');
    addToggle('Compact tab bar','compactTabs','Use a tighter tab strip.');
    addToggle('Show address-bar diamond','showAddressIcon','Show the decorative address-bar icon.');
    addToggle('Enable game easter eggs','gameEggs','Allow rare Minecraft-inspired and retro game surprises.');
    addToggle('Show home-page feature cards','showFeatureCards','Show the feature cards below quick access.');
    addPanelCard('Clear browsing history','Remove Crystalium history stored on this device.',()=>{historyItems.splice(0,historyItems.length);save('history',historyItems);persistSaved({history:historyItems});showPanel('settings');toast('Browsing history cleared.');});
    addPanelCard('Reset all settings','Restore default browser preferences and the Midnight theme.',()=>{Object.assign(settings,{blockTrackers:true,warnInsecure:true,restoreTabs:true,reduceMotion:false,showShortcuts:true,showMusicControls:true,confirmCloseTabs:false,treeEggEnabled:true,showTabDots:true,compactTabs:false,showAddressIcon:true,gameEggs:true,showFeatureCards:true});save('settings',settings);persistSaved({settings});theme.preset='midnight';theme.accent=themePresets.midnight.accent;save('theme',theme);save('themeCategory','All');persistSaved({settings,theme,themeCategory:'All'});applyTheme(theme);applySettings();showPanel('settings');toast('Settings reset to defaults.');});
    addPanelCard('Privacy note','Theme files contain appearance settings only; they do not install code or extensions.');
    applySettings();
  } else addPanelText('Your browser workspace.');
}
function applySettings(){
  document.documentElement.classList.toggle('reduce-motion',!!settings.reduceMotion);
  if(settings.reduceMotion)stopThemeAnimation();else startThemeAnimation();
  document.documentElement.classList.toggle('hide-shortcuts',settings.showShortcuts===false);
  document.documentElement.classList.toggle('hide-features',settings.showFeatureCards===false);
  document.documentElement.classList.toggle('compact-tabs',!!settings.compactTabs);
  document.documentElement.classList.toggle('hide-tab-dots',settings.showTabDots===false);
  document.documentElement.classList.toggle('hide-address-icon',settings.showAddressIcon===false);
  $('musicToggle').style.display=settings.showMusicControls===false?'none':'';
  document.documentElement.classList.toggle('hide-chrome', !!window.__crystaliumFullscreen);
}
function addToggle(label,key,description) {
  const box=document.createElement('div'); box.className='panel-card';
  const row=document.createElement('label'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.gap='8px';
  const name=document.createElement('strong'); name.textContent=label;
  const input=document.createElement('input'); input.type='checkbox'; input.checked=!!settings[key];
  input.onchange=async()=>{
    settings[key]=input.checked;
    save('settings',settings);
    if(key==='treeEggEnabled') save('treeEggEnabled',input.checked);
    if(key==='reduceMotion') document.documentElement.classList.toggle('reduce-motion',input.checked);
    if(key==='showShortcuts') document.documentElement.classList.toggle('hide-shortcuts',!input.checked);
    applySettings();
    try { const synced=await persistSaved({settings}); toast(synced?'Setting saved.':'Saved locally; device sync failed.'); }
    catch { toast('Saved locally; device sync failed.'); }
  };
  row.append(name,input);
  const small=document.createElement('small'); small.textContent=description;
  box.append(row,small); $('panelBody').append(box);
}
function addPanelText(text) { const p = document.createElement('p'); p.className = 'panel-copy'; p.textContent = text; $('panelBody').append(p); }
function addPanelCard(title, subtitle, action) {
  const card = document.createElement('button'); card.className = 'panel-card'; card.style.width = '100%'; card.style.textAlign = 'left';
  const strong = document.createElement('strong'); strong.textContent = title;
  const small = document.createElement('small'); small.textContent = subtitle;
  card.append(strong, small); if (action) card.onclick = action; $('panelBody').append(card);
}
function renderMusic() {
  const soundtrackThemes={minecraft:'Minecraft soundtrack',minecraftNight:'Minecraft ambient music',undertale:'Undertale official soundtrack',undertaleGold:'Undertale soundtrack',deltarune:'DELTARUNE soundtrack',ps2:'PlayStation 2 startup and menu music',ps2Silver:'PlayStation 2 startup ambience',ps3:'PlayStation 3 XMB music',ps3Violet:'PlayStation 3 menu ambience',majora:'The Legend of Zelda Majora’s Mask soundtrack',zelda:'The Legend of Zelda soundtrack',sonic:'Sonic the Hedgehog soundtrack',pokemon:'Pokémon game soundtrack',stardew:'Stardew Valley soundtrack',terraria:'Terraria soundtrack',hollowKnight:'Hollow Knight soundtrack',celeste:'Celeste soundtrack',portal:'Portal soundtrack',kingdomHearts:'Kingdom Hearts soundtrack',mgrr:'Metal Gear Rising soundtrack',gamecube:'Nintendo GameCube menu music',dreamcast:'Sega Dreamcast startup music',metroid:'Metroid ambient soundtrack',firewatch:'Firewatch soundtrack',nightCity:'Cyberpunk neon ambient music',gba:'Game Boy Advance game music',n64:'Nintendo 64 menu music'};
  const catalogEntry=themeCatalog.find(item=>item[0]===theme.preset);
  const soundtrackQuery=soundtrackThemes[theme.preset] || ((catalogEntry?.[1]||theme.preset).replace(/[·:]/g,' ').trim()+' theme ambience soundtrack');
  if(soundtrackQuery){addPanelText('Soundtrack and ambience for '+(catalogEntry?.[1]||theme.preset)+':');addPanelCard('Search YouTube · '+soundtrackQuery,'Browse results, then paste a video URL into the player below. Each theme has its own search query.',()=>api.newTab('https://www.youtube.com/results?search_query='+encodeURIComponent(soundtrackQuery+' official ambience')));}
  const ytWrap=document.createElement('div');ytWrap.className='youtube-ambience';
  const customMusic=load('themeMusic',{});const savedVideo=customMusic[theme.preset]||'';
  const ytLabel=document.createElement('label');ytLabel.textContent='YouTube music / ambience for this theme';
  const ytRow=document.createElement('div');ytRow.className='youtube-ambience-row';
  const ytInput=document.createElement('input');ytInput.type='url';ytInput.placeholder='Paste YouTube video URL';ytInput.value=savedVideo;ytInput.setAttribute('aria-label','YouTube video URL');
  const ytButton=document.createElement('button');ytButton.textContent='Save & play';
  const ytFrame=document.createElement('iframe');ytFrame.title='YouTube ambience player';ytFrame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';ytFrame.allowFullscreen=true;ytFrame.referrerPolicy='strict-origin-when-cross-origin';ytFrame.hidden=true;
  const loadYoutube=()=>{let videoId='',playlistId='';try{const u=new URL(ytInput.value.trim());if(u.hostname==='youtu.be')videoId=u.pathname.split('/').filter(Boolean)[0]||'';else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(u.hostname)){videoId=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).reduce((found,part,index,parts)=>found||(['embed','shorts','live'].includes(part)?parts[index+1]||'':''),'');playlistId=u.searchParams.get('list')||'';}}catch{}if(!/^[a-zA-Z0-9_-]{11}$/.test(videoId)&&!/^[a-zA-Z0-9_-]{10,}$/.test(playlistId)){toast('Paste a YouTube video or playlist URL.');return;}const saved=load('themeMusic',{});saved[theme.preset]=ytInput.value.trim();save('themeMusic',saved);ytFrame.src=videoId?'https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=1&playsinline=1'+(playlistId?'&list='+encodeURIComponent(playlistId):''):'https://www.youtube-nocookie.com/embed/videoseries?list='+encodeURIComponent(playlistId)+'&autoplay=1';ytFrame.hidden=false;toast('Saved music for this theme.');};
  const curatedAmbience={minecraft:'Dg0IjOzopYU',minecraftNight:'Dg0IjOzopYU',undertale:'1HIKNbnV8nw',undertaleGold:'1HIKNbnV8nw',ps2:'Ta7MT_4lSLI',ps2Silver:'Ta7MT_4lSLI'};
  if(savedVideo)loadYoutube();else if(curatedAmbience[theme.preset]){ytInput.value='https://www.youtube.com/watch?v='+curatedAmbience[theme.preset];loadYoutube();}
  ytButton.onclick=loadYoutube;ytInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadYoutube();}});
  const clearMusic=document.createElement('button');clearMusic.textContent='Clear saved music';clearMusic.onclick=()=>{const saved=load('themeMusic',{});delete saved[theme.preset];save('themeMusic',saved);ytInput.value='';ytFrame.removeAttribute('src');ytFrame.hidden=true;toast('Saved music cleared for this theme.');};
  ytRow.append(ytInput,ytButton,clearMusic);ytWrap.append(ytLabel,ytRow,ytFrame);
  const artWrap=document.createElement('div');artWrap.className='youtube-ambience theme-art-editor';
  const artLabel=document.createElement('label');artLabel.textContent='Theme background image / GIF URL';
  const artRow=document.createElement('div');artRow.className='youtube-ambience-row';
  const artInput=document.createElement('input');artInput.type='url';artInput.placeholder='Paste direct image or .gif URL';artInput.setAttribute('aria-label','Theme background image or GIF URL');artInput.value=load('themeArtwork',{})[theme.preset]||'';
  const artSave=document.createElement('button');artSave.textContent='Save background';
  const artClear=document.createElement('button');artClear.textContent='Use default';
  const artPreview=document.createElement('img');artPreview.className='theme-art-preview';artPreview.alt='Custom theme background preview';artPreview.hidden=true;
  const updateArtPreview=()=>{const url=artInput.value.trim();artPreview.hidden=!url;if(url)artPreview.src=url;};
  updateArtPreview();
  artSave.onclick=()=>{const url=artInput.value.trim();if(url){try{const parsed=new URL(url);if(!['http:','https:','file:','data:'].includes(parsed.protocol))throw new Error();}catch{toast('Paste a valid image URL.');return;}}const saved=load('themeArtwork',{});if(url)saved[theme.preset]=url;else delete saved[theme.preset];save('themeArtwork',saved);applyTheme(theme);updateArtPreview();toast('Background saved for this theme.');};
  artClear.onclick=()=>{const saved=load('themeArtwork',{});delete saved[theme.preset];save('themeArtwork',saved);artInput.value='';artPreview.removeAttribute('src');artPreview.hidden=true;applyTheme(theme);toast('Default background restored.');};
  artInput.addEventListener('input',updateArtPreview);
  artRow.append(artInput,artSave,artClear);artWrap.append(artLabel,artRow,artPreview);
  const customWrap=document.createElement('div');customWrap.className='youtube-ambience theme-customizer';
  const customTitle=document.createElement('h3');customTitle.textContent='Theme design studio · '+(catalogEntry?.[1]||theme.preset);customWrap.append(customTitle);
  const customization=load('themeCustomization',{});const currentCustom=customization[theme.preset]||{};
  const colorFields=[['bg','Main background',themePresets[theme.preset]?.bg||'#060d19'],['side','Side / toolbar',themePresets[theme.preset]?.side||'#081629'],['panel','Panels and cards',themePresets[theme.preset]?.panel||'#0b1a2c'],['line','Borders',themePresets[theme.preset]?.line||'#1c3652'],['text','Text',themePresets[theme.preset]?.text||'#edf5ff'],['accent','Accent / buttons / glow',themePresets[theme.preset]?.accent||'#54bdff'],['muted','Secondary text',currentCustom.muted||'#86a2bf']];
  const colorGrid=document.createElement('div');colorGrid.className='theme-color-grid';
  const updateCustomization=(key,value)=>{const all=load('themeCustomization',{});all[theme.preset]={...(all[theme.preset]||{}),[key]:value};save('themeCustomization',all);applyTheme(theme);};
  colorFields.forEach(([key,label,defaultColor])=>{const wrap=document.createElement('label');wrap.className='theme-color-field';const span=document.createElement('span');span.textContent=label;const input=document.createElement('input');input.type='color';input.value=/^#[0-9a-f]{6}$/i.test(currentCustom[key]||'')?currentCustom[key]:defaultColor;input.addEventListener('input',()=>updateCustomization(key,input.value));wrap.append(span,input);colorGrid.append(wrap);});
  customWrap.append(colorGrid);
  const gradientTitle=document.createElement('h4');gradientTitle.textContent='Background gradient';customWrap.append(gradientTitle);
  const gradientToggleLabel=document.createElement('label');gradientToggleLabel.className='theme-gradient-toggle';const gradientToggle=document.createElement('input');gradientToggle.type='checkbox';gradientToggle.checked=!!currentCustom.gradientEnabled;const gradientToggleText=document.createElement('span');gradientToggleText.textContent='Override theme background with my gradient';gradientToggleLabel.append(gradientToggle,gradientToggleText);customWrap.append(gradientToggleLabel);
  const gradientGrid=document.createElement('div');gradientGrid.className='theme-gradient-grid';
  const gradientA=document.createElement('label');gradientA.textContent='Gradient color 1';const gradientAInput=document.createElement('input');gradientAInput.type='color';gradientAInput.value=currentCustom.gradientA||currentCustom.bg||'#10182b';gradientA.append(gradientAInput);
  const gradientB=document.createElement('label');gradientB.textContent='Gradient color 2';const gradientBInput=document.createElement('input');gradientBInput.type='color';gradientBInput.value=currentCustom.gradientB||currentCustom.side||'#24517a';gradientB.append(gradientBInput);
  const angleLabel=document.createElement('label');angleLabel.textContent='Gradient angle';const angleInput=document.createElement('input');angleInput.type='range';angleInput.min='0';angleInput.max='360';angleInput.value=String(currentCustom.gradientAngle??135);const angleValue=document.createElement('span');angleValue.textContent=angleInput.value+'°';angleLabel.append(angleInput,angleValue);
  const motionLabel=document.createElement('label');motionLabel.textContent='Gradient movement';const motionSelect=document.createElement('select');[['static','Static'],['sudden','Sudden color shift'],['slow','Slow flowing gradient']].forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;motionSelect.append(option);});motionSelect.value=currentCustom.gradientMotion||'static';motionLabel.append(motionSelect);
  const speedLabel=document.createElement('label');speedLabel.textContent='Slow gradient speed (seconds)';const speedInput=document.createElement('input');speedInput.type='range';speedInput.min='4';speedInput.max='60';speedInput.value=String(currentCustom.gradientSpeed||18);const speedValue=document.createElement('span');speedValue.textContent=speedInput.value+'s';speedLabel.append(speedInput,speedValue);
  gradientGrid.append(gradientA,gradientB,angleLabel,motionLabel,speedLabel);customWrap.append(gradientGrid);
  const saveGradient=()=>{const all=load('themeCustomization',{});all[theme.preset]={...(all[theme.preset]||{}),gradientEnabled:gradientToggle.checked,gradientA:gradientAInput.value,gradientB:gradientBInput.value,gradientAngle:Number(angleInput.value),gradientMotion:motionSelect.value,gradientSpeed:Number(speedInput.value)};save('themeCustomization',all);applyTheme(theme);};
  gradientToggle.addEventListener('change',saveGradient);gradientAInput.addEventListener('input',saveGradient);gradientBInput.addEventListener('input',saveGradient);angleInput.addEventListener('input',()=>{angleValue.textContent=angleInput.value+'°';saveGradient();});motionSelect.addEventListener('change',saveGradient);speedInput.addEventListener('input',()=>{speedValue.textContent=speedInput.value+'s';saveGradient();});
  const resetCustom=document.createElement('button');resetCustom.textContent='Reset all custom colors and gradients';resetCustom.onclick=()=>{const all=load('themeCustomization',{});delete all[theme.preset];save('themeCustomization',all);applyTheme(theme);showPanel('music');toast('Custom colors and gradient reset.');};customWrap.append(resetCustom);
  const uploadLabel=document.createElement('label');uploadLabel.className='theme-upload-label';uploadLabel.textContent='Or choose an image / GIF from your device';
  const uploadInput=document.createElement('input');uploadInput.type='file';uploadInput.accept='image/*,.gif';uploadInput.addEventListener('change',()=>{const file=uploadInput.files?.[0];if(!file)return;if(file.size>2500000){toast('Choose an image/GIF under 2.5 MB. For larger files, paste a direct URL above.');uploadInput.value='';return;}const reader=new FileReader();reader.onload=()=>{const all=load('themeArtwork',{});all[theme.preset]=String(reader.result);save('themeArtwork',all);applyTheme(theme);artInput.value='';artInput.placeholder='Local image saved — or paste a URL';updateArtPreview();toast('Local image/GIF saved for this theme.');};reader.readAsDataURL(file);});uploadLabel.append(uploadInput);customWrap.append(uploadLabel);
  $('panelBody').append(ytWrap,artWrap,customWrap);
  addPanelText('Music source hub: save music websites here, open them in tabs, and control audio on the active tab. Crystalium does not copy or extract protected streams; playback depends on each site’s own player and permissions.');
  const active=currentTab();
  if(active?.url && /^https?:/i.test(active.url)) addPanelCard('＋ Save active website as a music source',active.title||active.url,()=>{
    const sources=load('musicSources',[]);
    if(sources.some(s=>s.url===active.url)){toast('That music source is already saved.');return;}
    sources.push({title:active.title||new URL(active.url).hostname,url:active.url});save('musicSources',sources);showPanel('music');toast('Music source saved.');
  });
  const sources=load('musicSources',[]);
  addPanelText('Saved music websites ('+sources.length+')');
  sources.forEach((source,i)=>addPanelCard(source.title,source.url,()=>api.newTab(source.url)));
  if(sources.length) addPanelCard('Clear saved music sources','Remove the saved website list from this device.',()=>{save('musicSources',[]);showPanel('music');toast('Music source list cleared.');});
  addPanelCard('Open YouTube Music in a separate tab','Browse and play music without embedding the player in this panel.',()=>api.newTab('https://music.youtube.com'));
  addPanelCard('Open Bandcamp in a separate tab','Discover and stream music from artists.',()=>api.newTab('https://bandcamp.com'));
  
  const webControls=document.createElement('div');webControls.className='music-controls';
  [['play','▶ Play website audio'],['pause','Ⅱ Pause website audio'],['mute','Mute website audio'],['unmute','Unmute website audio']].forEach(([action,label])=>{const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{const result=await api.mediaControl(action);if(result?.ok===false)toast('Could not control website audio.');else toast(label+' command sent.');};webControls.append(b);});$('panelBody').append(webControls);
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
$('incognitoToggle').onclick = () => { api.newIncognitoTab(); toast('Opened a private tab. Its URL will not be saved to Crystalium history or session restore.'); };
$('privateToolbar').onclick = () => { api.newIncognitoTab(); toast('Private tab opened. It will not be saved to history or session restore.'); };
$('menuToggle').onclick = () => togglePanel('settings');
$('panelClose').onclick = hidePanel;
document.querySelectorAll('.rail-button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.rail-button').forEach(b => b.classList.remove('selected')); button.classList.add('selected');
  togglePanel(button.dataset.panel);
}));
function addHomeShortcut(rawUrl, customTitle) {
  let parsed;
  try {
    const value=String(rawUrl||'').trim();
    if(!value) return false;
    parsed=new URL(/^https?:\/\//i.test(value)?value:'https://'+value);
    if(!['http:','https:'].includes(parsed.protocol)) throw new Error('Only web addresses are supported.');
  } catch { toast('Enter a valid website address, like example.com.'); return false; }
  const url=parsed.href;
  if(shortcuts.some(item=>item.url===url)){toast('That website is already on Home.');return false;}
  const title=String(customTitle||parsed.hostname).trim().slice(0,80)||parsed.hostname;
  shortcuts.push({title,url});save('shortcuts',shortcuts);persistSaved({shortcuts});
  const btn=document.createElement('button');btn.className='shortcut';btn.dataset.url=url;
  const icon=document.createElement('span');icon.className='shortcut-icon blue';icon.textContent='↗';
  const details=document.createElement('span');const name=document.createElement('b');name.textContent=title;const small=document.createElement('small');small.textContent=url;details.append(name,small);
  const arrow=document.createElement('span');arrow.className='shortcut-arrow';arrow.textContent='↗';btn.append(icon,details,arrow);btn.onclick=()=>api.navigate(url);$('shortcuts').append(btn);
  toast('Added to Home.');return true;
}
$('addShortcut').onclick = () => {
  const value=prompt('Website address to pin on Home (example.com):');
  if(!value)return;
  const title=prompt('Name for this shortcut (optional):','');
  addHomeShortcut(value,title);
};
$('minimize').onclick = () => api.windowAction('minimize');
$('maximize').onclick = () => api.windowAction('maximize');
$('close').onclick = () => api.windowAction('close');
document.querySelectorAll('.window-actions button').forEach(button => {
  button.addEventListener('dblclick', e => e.preventDefault());
});
api.onNotice(message => toast(message));
api.onState(next => {
  // Tab switches can race fullscreen exit events; reconcile the chrome with Electron's live state.
  api.windowAction('sync-fullscreen');
  localStorage.setItem('crystalium.openTabs', JSON.stringify(next.tabs.filter(t=>!t.incognito).map(t=>t.url).filter(Boolean)));
  const t = next.tabs.find(x => x.id === next.activeId);
  if (t && !t.incognito && t.url && /^https?:/i.test(t.url) && !historyItems.some(h => h.url === t.url)) { historyItems.push({ title: t.title, url: t.url }); save('history',historyItems); persistSaved({history:historyItems}); }
  persistSaved({bookmarks,history:historyItems,shortcuts,settings});
});
document.addEventListener('keydown', e => {
  const key=e.key.toLowerCase();
  if (e.key==='F11') { e.preventDefault(); api.windowAction('toggle-fullscreen'); return; }
  if (e.key==='F12') { e.preventDefault(); api.windowAction('devtools'); return; }
  if (e.key==='Escape' && window.__crystaliumFullscreen) { e.preventDefault(); api.windowAction('exit-fullscreen'); return; }
  if ((e.ctrlKey||e.metaKey)&&key==='l') { e.preventDefault(); address.focus(); address.select(); }
  if ((e.ctrlKey||e.metaKey)&&key==='t') { e.preventDefault(); api.newTab(); }
  if ((e.ctrlKey||e.metaKey)&&e.shiftKey&&key==='n') { e.preventDefault(); api.newIncognitoTab(); }
  if ((e.ctrlKey||e.metaKey)&&key==='w') { e.preventDefault(); if(state.activeId)api.closeTab(state.activeId); }
  if ((e.ctrlKey||e.metaKey)&&['+','=','-','0'].includes(key)) { e.preventDefault(); api.windowAction(key==='0'?'zoom-reset':key==='-'?'zoom-out':'zoom-in'); }
  if (e.key==='F5') { e.preventDefault(); api.reload(); }
});