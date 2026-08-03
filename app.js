const { createClient } = supabase; const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY); const $=s=>document.querySelector(s);
let galleryItems=[],spotlightTimer=null,countdownTimer=null,gameTimer=null,gamePlaying=false,gameScore=0,gameSeconds=20,backgroundMusicStarted=false;
let galleryPrivacyTimer=null;
let galleryPrivacy={enabled:false,title:"Our Precious Memories ❤️",description:"Only someone who truly knows our journey can unlock these memories.",question:"What is our special password?",hint:"",answer:"",wrongTitle:"Oops, cutie",wrongMessage1:"Oops, you missed 💗",wrongMessage2:"Keep going, if you know us you can open it ✨",wrongMessage3:"Try one more time, cutie — last chance 🌷",wrongMessage:"Only someone else can access this.",maxAttempts:3,cooldownMinutes:15};
let galleryPrivacyState={unlocked:false,attemptsLeft:3,cooldownUntil:0};
let paperAudioCtx=null;
let magicState={themeEnabled:true,themePreset:"cherry",heroCinematicEnabled:true,starsEnabled:true,petalsEnabled:true,firefliesEnabled:true,shootingStarsEnabled:true,tapEffectsEnabled:true,journeyRibbonEnabled:true,memorySkyEnabled:true};
let journeyRaf=0;
let magicTimers={shootingStar:null,heroFloat:null};
let currentSettings={playlistTitle:"My playlist",playlistNote:"A small note for the playlist"};
let playlistTracks=[];
let playlistIndex=0;


function syncMemorySky(){
  const mem=$("#memorySky");
  const ending=$("#ending");
  if(!mem || !ending) return;
  const rect=ending.getBoundingClientRect();
  const visible=rect.top < window.innerHeight*0.72 && rect.bottom > window.innerHeight*0.28;
  mem.classList.toggle("visible", visible && magicState.memorySkyEnabled);
}

function initSectionDock(){
  const dock=$("#sectionDock");
  if(!dock)return;
  const buttons=[...dock.querySelectorAll("button[data-section]")];
  buttons.forEach(btn=>btn.addEventListener("click",()=>{
    const target=document.getElementById(btn.dataset.section);
    if(target) target.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    buttons.forEach(b=>b.classList.toggle("active",b.dataset.section===visible.target.id));
  },{threshold:[.25,.55,.8]});
  buttons.map(b=>document.getElementById(b.dataset.section)).filter(Boolean).forEach(el=>observer.observe(el));
}


const THEME_CLASSES=["theme-cherry","theme-rose","theme-blush","theme-snow"];
const THEME_BG = {
  cherry: "radial-gradient(circle at 20% 10%, #5a1c4f 0, #2f143e 40%, #120916 100%)",
  rose: "radial-gradient(circle at 20% 10%, #6b1f34 0, #35111f 40%, #14060d 100%)",
  blush: "radial-gradient(circle at 20% 10%, #6f385a 0, #381928 40%, #14080f 100%)",
  snow: "radial-gradient(circle at 20% 10%, #334164 0, #1b2030 40%, #0d1017 100%)"
};
function getMagicStateFromSettings(m){return {
  themeEnabled: m.siteThemeEnabled===undefined ? true : parseBool(m.siteThemeEnabled),
  themePreset: String(m.siteThemePreset||"cherry").toLowerCase(),
  heroCinematicEnabled: m.heroCinematicEnabled===undefined ? true : parseBool(m.heroCinematicEnabled),
  starsEnabled: m.starsEnabled===undefined ? true : parseBool(m.starsEnabled),
  petalsEnabled: m.petalsEnabled===undefined ? true : parseBool(m.petalsEnabled),
  firefliesEnabled: m.firefliesEnabled===undefined ? true : parseBool(m.firefliesEnabled),
  shootingStarsEnabled: m.shootingStarsEnabled===undefined ? true : parseBool(m.shootingStarsEnabled),
  tapEffectsEnabled: m.tapEffectsEnabled===undefined ? true : parseBool(m.tapEffectsEnabled),
  journeyRibbonEnabled: m.journeyRibbonEnabled===undefined ? true : parseBool(m.journeyRibbonEnabled),
  memorySkyEnabled: m.memorySkyEnabled===undefined ? true : parseBool(m.memorySkyEnabled)
};}
function ensureFireflies(){
  const wrap=$("#fireflies"); if(!wrap||wrap.dataset.ready) return;
  wrap.dataset.ready="1"; wrap.innerHTML="";
  for(let i=0;i<6;i++){const f=document.createElement("span");f.className="firefly";const size=2+Math.random()*2.5;f.style.width=`${size}px`;f.style.height=`${size}px`;f.style.left=`${Math.random()*100}%`;f.style.top=`${Math.random()*100}%`;f.style.animationDuration=`${8+Math.random()*10}s`;f.style.animationDelay=`-${Math.random()*10}s`;wrap.appendChild(f);}
}
function applyMagicState(){
  const body=document.body;
  THEME_CLASSES.forEach(c=>body.classList.remove(c));
  body.classList.toggle("hero-cinematic", !!magicState.heroCinematicEnabled);
  const bg = THEME_BG[magicState.themePreset] || THEME_BG.cherry;
  const themeColor = magicState.themePreset==="snow" ? "#7ea7d8" : magicState.themePreset==="rose" ? "#f08ba7" : magicState.themePreset==="blush" ? "#d48ab7" : "#e28cc2";
  if(magicState.themeEnabled){
    body.classList.add(`theme-${magicState.themePreset}`);
    document.documentElement.style.background = bg;
    document.documentElement.style.backgroundAttachment = "fixed";
    document.documentElement.style.backgroundRepeat = "no-repeat";
    document.documentElement.style.backgroundSize = "cover";
    body.style.background = bg;
    body.style.backgroundAttachment = "fixed";
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundSize = "cover";
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute("content", themeColor);
  } else {
    document.documentElement.style.background = "";
    body.style.background = "";
  }
  const stars=$("#stars"), petals=$("#petals"), fireflies=$("#fireflies"), ribbon=$("#journeyRibbon"), shooting=$("#shootingStars"), mem=$("#memorySky");
  if(stars) stars.style.display=magicState.starsEnabled?"":"none";
  if(petals) petals.style.display=magicState.petalsEnabled?"":"none";
  if(fireflies) fireflies.style.display=magicState.firefliesEnabled?"":"none";
  if(ribbon) ribbon.hidden=!magicState.journeyRibbonEnabled;
  if(shooting) shooting.style.display=magicState.shootingStarsEnabled?"":"none";
  if(mem) mem.style.display=magicState.memorySkyEnabled?"":"none";
  if(magicState.firefliesEnabled) ensureFireflies();
  renderMemorySky();
  manageMagicTimers();
}
function updateJourneyRibbon(){
  const ribbon=$("#journeyRibbon"), fill=$("#journeyFill"), text=$("#journeyRibbonText");
  if(!ribbon||ribbon.hidden) return;
  if(journeyRaf) return;
  journeyRaf=requestAnimationFrame(()=>{
    journeyRaf=0;
    const max=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    const p=Math.min(1,Math.max(0,window.scrollY/max));
    if(fill) fill.style.width=`${Math.max(8,Math.round(p*100))}%`;
    if(text) text.textContent=p<.16?"Our story begins…":p<.34?"Little memories bloom…":p<.58?"Beautiful moments unfold…":p<.83?"Almost there, my love…":"Forever and always ❤️";
  });
}
function spawnShootingStar(){
  if(!magicState.shootingStarsEnabled) return;
  const wrap=$("#shootingStars"); if(!wrap) return;
  const star=document.createElement("span"); star.className="shooting-star"; star.style.top=`${10+Math.random()*60}%`; star.style.left=`${-10+Math.random()*30}%`; star.style.animationDuration=`${1.8+Math.random()*1.3}s`;
  wrap.appendChild(star); setTimeout(()=>star.remove(),3500);
}
function manageMagicTimers(){
  clearInterval(magicTimers.shootingStar); clearInterval(magicTimers.heroFloat);
  magicTimers.shootingStar=null; magicTimers.heroFloat=null;
  if(magicState.shootingStarsEnabled){magicTimers.shootingStar=setInterval(()=>spawnShootingStar(),60000); setTimeout(()=>spawnShootingStar(),2400);}
  
}


function renderMemorySky(){
  const wrap=$("#memorySky");
  if(!wrap || wrap.dataset.ready) return;
  wrap.dataset.ready="1";
  wrap.innerHTML="";
  const pts=[[8,18],[18,10],[28,22],[40,14],[52,26],[64,16],[76,24],[86,12],[20,42],[34,54],[48,42],[62,52],[78,44],[92,56]];
  pts.forEach((p,i)=>{
    const s=document.createElement("span");
    s.className="memory-sky-star";
    s.style.left=`${p[0]}%`;
    s.style.top=`${p[1]}%`;
    s.style.animationDelay=`-${i*0.7}s`;
    wrap.appendChild(s);
  });
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 100 100");
  svg.setAttribute("preserveAspectRatio","none");
  svg.classList.add("memory-sky-lines");
  svg.innerHTML = `
    <line x1="8" y1="18" x2="18" y2="10"></line>
    <line x1="18" y1="10" x2="28" y2="22"></line>
    <line x1="28" y1="22" x2="40" y2="14"></line>
    <line x1="40" y1="14" x2="52" y2="26"></line>
    <line x1="52" y1="26" x2="64" y2="16"></line>
    <line x1="64" y1="16" x2="76" y2="24"></line>
    <line x1="76" y1="24" x2="86" y2="12"></line>
  `;
  wrap.appendChild(svg);
}

function seedStars(){const wrap=$("#stars");if(!wrap||wrap.dataset.ready)return;wrap.dataset.ready="1";for(let i=0;i<100;i++){const e=document.createElement("span");e.className="star";const z=Math.random()*2.8+1;e.style.width=`${z}px`;e.style.height=`${z}px`;e.style.left=`${Math.random()*100}%`;e.style.top=`${Math.random()*100}%`;e.style.animationDelay=`${Math.random()*4}s`;wrap.appendChild(e)}const petals=$("#petals");for(let i=0;i<18;i++){const p=document.createElement("span");p.className="petal";p.style.left=`${Math.random()*100}%`;p.style.animationDuration=`${12+Math.random()*12}s`;p.style.animationDelay=`-${Math.random()*18}s`;petals.appendChild(p)}}seedStars();
initSectionDock();

function tapHeartsAt(x,y,count=7){
  if(!magicState.tapEffectsEnabled) return;
  const wrap=$("#heartBurst"); if(!wrap) return;
  const kinds=["♥","♥","✦","✿"];
  for(let i=0;i<count;i++){
    const h=document.createElement("span");
    h.className="burst-heart tap-heart";
    h.textContent=kinds[Math.floor(Math.random()*kinds.length)];
    h.style.left=`${x}px`; h.style.top=`${y}px`;
    h.style.setProperty("--dx",`${(Math.random()-.5)*140}px`);
    h.style.setProperty("--dy",`${-20-Math.random()*140}px`);
    h.style.animationDelay=`${Math.random()*.05}s`;
    wrap.appendChild(h); setTimeout(()=>h.remove(),1400);
  }
}
if(document.body.classList.contains("public-page")){
  document.addEventListener("pointerdown",(e)=>{ if(e.button!==undefined&&e.button!==0) return; tapHeartsAt(e.clientX||window.innerWidth/2,e.clientY||window.innerHeight/2,e.target?.closest("button")?4:7); },{passive:true});
  ["copy","cut","contextmenu","dragstart"].forEach(evt=>document.addEventListener(evt,e=>e.preventDefault()));
}

function parseBool(v){return v===true||v==="true"||v===1||v==="1";}
function parseNum(v,def=0){const n=Number.parseInt(v,10);return Number.isFinite(n)?n:def;}
function parsePlaylistJson(text){
  try{
    const arr = JSON.parse(text || "[]");
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
function escapeAttr(value){ return escapeHtml(value); }
function showBanner(message, ok=true){
  const el=$("#saveBanner") || document.querySelector("[data-banner]");
  if(!el){
    console[ok ? "log" : "warn"](message);
    return;
  }
  el.textContent = (ok ? "✓ " : "⚠ ") + message;
  el.classList.remove("hidden");
  clearTimeout(window.__bannerTimer);
  window.__bannerTimer = setTimeout(()=>el.classList.add("hidden"), 2600);
}
function applyMusicSource(audio, src){
  if(!audio) return;
  if(src){
    audio.src = src;
    audio.style.display = "block";
    audio.load();
  }else{
    audio.removeAttribute("src");
    audio.style.display = "none";
  }
}
function getGalleryPrivacyFromSettings(m){return {
  enabled:parseBool(m.galleryLockEnabled),
  title:m.galleryLockTitle||"Our Precious Memories ❤️",
  description:m.galleryLockDescription||"Only someone who truly knows our journey can unlock these memories.",
  question:m.galleryLockQuestion||"What is our special password?",
  hint:m.galleryLockHint||"",
  answer:String(m.galleryLockAnswer??""),
  wrongTitle:m.galleryLockWrongTitle||"Oops, cutie",
  wrongMessage1:m.galleryLockWrongMessage1||m.galleryLockWrongMessage||"Oops, you missed 💗",
  wrongMessage2:m.galleryLockWrongMessage2||m.galleryLockWrongMessage||"Keep going, if you know us you can open it ✨",
  wrongMessage3:m.galleryLockWrongMessage3||m.galleryLockWrongMessage||"Try one more time, cutie — last chance 🌷",
  wrongMessage:m.galleryLockWrongMessage||m.galleryLockWrongMessage1||"Oops, you missed 💗",
  maxAttempts:Math.max(1,parseNum(m.galleryLockMaxAttempts,3)),
  cooldownMinutes:Math.max(0,parseNum(m.galleryLockCooldownMinutes,15))
};}
function resetGalleryState(privacy){
  return privacy.enabled
    ? {unlocked:false,attemptsLeft:privacy.maxAttempts,cooldownUntil:0,failCount:0}
    : {unlocked:true,attemptsLeft:privacy.maxAttempts,cooldownUntil:0,failCount:0};
}
function syncGalleryPrivacyUI(){
  const banner=$("#galleryPrivacyBanner");
  const modal=$("#galleryUnlockModal");
  const openBtn=$("#galleryUnlockOpenBtn");
  const locked=galleryPrivacy.enabled && !galleryPrivacyState.unlocked;
  document.body.classList.toggle("gallery-privacy-locked",locked);
  if(banner) banner.hidden=!galleryPrivacy.enabled;
  if(openBtn){
    openBtn.textContent=locked?"Unlock gallery":"Gallery open";
    openBtn.setAttribute("aria-label",locked?"Unlock gallery":"Gallery open");
  }
  if(modal && !modal.hidden) updateGalleryUnlockModal();
  updateGalleryLockMeta();
}
function updateGalleryLockMeta(){
  const meta=$("#galleryUnlockMeta"); if(!meta) return;
  if(!galleryPrivacy.enabled){meta.textContent="Gallery privacy is off.";return;}
  const now=Date.now();
  if(galleryPrivacyState.cooldownUntil && galleryPrivacyState.cooldownUntil>now){
    const ms=galleryPrivacyState.cooldownUntil-now;
    const m=Math.floor(ms/60000), s=Math.ceil((ms%60000)/1000);
    meta.textContent=`Locked for ${m}m ${String(s).padStart(2,"0")}s. Attempts reset after cooldown.`;
  } else {
    meta.textContent=`Attempts left: ${galleryPrivacyState.attemptsLeft} / ${galleryPrivacy.maxAttempts}`;
  }
}
function updateGalleryUnlockModal(){
  const title=$("#galleryUnlockTitle"),desc=$("#galleryUnlockDescription"),question=$("#galleryUnlockQuestion"),hint=$("#galleryUnlockHint"),status=$("#galleryUnlockStatus"),countdown=$("#galleryUnlockCountdown"),input=$("#galleryUnlockAnswer");
  if(title) title.textContent=galleryPrivacy.title;
  if(desc) desc.textContent=galleryPrivacy.description;
  if(question) question.textContent=galleryPrivacy.question;
  if(hint) hint.textContent=galleryPrivacy.hint?`Hint: ${galleryPrivacy.hint}`:"";
  if(status){
    if(galleryPrivacyState.cooldownUntil && galleryPrivacyState.cooldownUntil>Date.now()){
      status.textContent="Cooldown active.";
    } else if(galleryPrivacyState.attemptsLeft<=0){
      status.textContent="Locked. Please wait for the cooldown.";
    } else {
      status.textContent=`${galleryPrivacyState.attemptsLeft} attempt${galleryPrivacyState.attemptsLeft===1?"":"s"} left.`;
    }
  }
  if(countdown){
    if(galleryPrivacyState.cooldownUntil && galleryPrivacyState.cooldownUntil>Date.now()){
      const ms=galleryPrivacyState.cooldownUntil-Date.now();
      const m=Math.floor(ms/60000),s=Math.ceil((ms%60000)/1000);
      countdown.textContent=`Retry in ${m}m ${String(s).padStart(2,"0")}s.`;
    } else {
      countdown.textContent="";
    }
  }
  if(input && !input.value) input.placeholder=galleryPrivacy.answer?"Enter the answer":"Type the answer here";
}
function setGalleryState(state){
  galleryPrivacyState=state;
  syncGalleryPrivacyUI();
  renderGallery(galleryItems);
}
function openGalleryUnlockModal(){
  if(!galleryPrivacy.enabled) return;
  if(galleryPrivacyState.unlocked){closeGalleryUnlockModal();return;}
  const modal=$("#galleryUnlockModal"); if(!modal) return;
  updateGalleryUnlockModal();
  modal.hidden=false;
  $("#galleryUnlockAnswer")?.focus();
}
function closeGalleryUnlockModal(){
  const modal=$("#galleryUnlockModal"); if(modal) modal.hidden=true;
}

function showCuteGalleryPopup(title,message,subtext=""){
  let popup=$("#galleryCutePopup");
  if(!popup){
    popup=document.createElement("div");
    popup.id="galleryCutePopup";
    popup.className="gallery-cute-popup";
    popup.hidden=true;
    popup.innerHTML=`<div class="gallery-cute-card glass">
      <div class="gallery-cute-hearts">♥ ✦ ♥</div>
      <h4></h4>
      <p></p>
      <small></small>
    </div>`;
    document.body.appendChild(popup);
  }
  popup.querySelector("h4").textContent=title||"Oops, cutie";
  popup.querySelector("p").textContent=message||"Only someone else can access this.";
  popup.querySelector("small").textContent=subtext||"";
  popup.hidden=false;
  popup.classList.remove("show");
  void popup.offsetWidth;
  popup.classList.add("show");
  clearTimeout(popup._timer);
  popup._timer=setTimeout(()=>{
    popup.classList.remove("show");
    setTimeout(()=>{popup.hidden=true;},240);
  },2600);
}
function playPaperSound(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C) return;
    paperAudioCtx ||= new C();
    const ctx=paperAudioCtx;
    if(ctx.state==="suspended") ctx.resume().catch(()=>{});
    const duration=0.22;
    const buffer=ctx.createBuffer(1, Math.ceil(ctx.sampleRate*duration), ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,1.5)*0.45;
    const source=ctx.createBufferSource(); source.buffer=buffer;
    const filter=ctx.createBiquadFilter(); filter.type="highpass"; filter.frequency.value=1800;
    const gain=ctx.createGain(); const t=ctx.currentTime; gain.gain.setValueAtTime(0.0001,t); gain.gain.exponentialRampToValueAtTime(0.22,t+.01); gain.gain.exponentialRampToValueAtTime(0.0001,t+duration);
    source.connect(filter).connect(gain).connect(ctx.destination); source.start(); source.stop(t+duration+.05);
  }catch{}
}
function unlockGallery(){
  const state={unlocked:true,attemptsLeft:galleryPrivacy.maxAttempts,cooldownUntil:0,failCount:0};
  setGalleryState(state);
  closeGalleryUnlockModal();
}
function submitGalleryUnlock(){
  if(!galleryPrivacy.enabled) return;
  if(galleryPrivacyState.cooldownUntil && galleryPrivacyState.cooldownUntil>Date.now()){
    updateGalleryUnlockModal();
    showCuteGalleryPopup(
      "Take a tiny break 💗",
      "The photo lock is cooling down right now.",
      "Please wait a little and try again."
    );
    return;
  }
  const input=$("#galleryUnlockAnswer");
  const val=(input?.value||"").trim().toLowerCase();
  const correct=String(galleryPrivacy.answer||"").trim().toLowerCase();
  if(!correct){
    unlockGallery();
    return;
  }
  if(val && val===correct){
    unlockGallery();
    heartBurst(6);
    playPaperSound();
    showCuteGalleryPopup("Unlocked ❤️","Your memory gate opened successfully.","Enjoy the photos.");
    return;
  }
  const failCount=(galleryPrivacyState.failCount||0)+1;
  const wrongMsg=failCount===1 ? galleryPrivacy.wrongMessage1 : failCount===2 ? galleryPrivacy.wrongMessage2 : galleryPrivacy.wrongMessage3;
  const nextLeft=Math.max(0,galleryPrivacyState.attemptsLeft-1);
  const mins=galleryPrivacy.cooldownMinutes||15;
  if(nextLeft<=0){
    const cooldownUntil=Date.now()+mins*60000;
    setGalleryState({unlocked:false,attemptsLeft:0,cooldownUntil,failCount});
    updateGalleryUnlockModal();
    showCuteGalleryPopup(
      galleryPrivacy.wrongTitle||"Oops, cutie",
      wrongMsg || "Try one more time, cutie.",
      `Too many tries. Come back in about ${mins} minute${mins===1?"":"s"}.`
    );
    return;
  }
  setGalleryState({unlocked:false,attemptsLeft:nextLeft,cooldownUntil:0,failCount});
  const st=$("#galleryUnlockStatus");
  if(st) st.textContent=`${galleryPrivacy.wrongTitle}: ${wrongMsg}`;
  showCuteGalleryPopup(
    galleryPrivacy.wrongTitle||"Oops, cutie",
    wrongMsg || "Only someone else can access this.",
    `Attempts left: ${nextLeft}`
  );
  updateGalleryUnlockModal();
}

async function loadAll(){
  try{
    const [{data:settings},{data:chapters},{data:gallery},{data:reasons}]=await Promise.all([
      db.from("site_settings").select("*"),
      db.from("chapters").select("*").order("sort_order"),
      db.from("gallery_items").select("*").order("sort_order"),
      db.from("love_reasons").select("*").order("sort_order")
    ]);
    const m=Object.fromEntries((settings||[]).map(x=>[x.key,x.value]));
    const TEXT_KEYS=["storyEyebrow","storyTitle","storyIntro","photosEyebrow","photosTitle","letterEyebrow","letterSoundHint","reasonsEyebrow","reasonsTitle","reasonsIntro","giftEyebrow","secretEyebrow","gameEyebrow","commentEyebrow","commentIntro","countdownEyebrow","musicEyebrow","endingEyebrow","footerText","galleryPrivacyEyebrow","playlistEyebrow","playlistTitle","playlistIntro"];
    TEXT_KEYS.forEach(k=>{const el=$("#"+k);if(el&&m[k]!==undefined)el.textContent=m[k];});
    ["heroTitle","heroHeadline","heroSubline","finalTitle","finalText","loveLetterTitle","giftTitle","giftHint","secretTitle","commentTitle","gameTitle","gameIntro","countdownTitle","musicTitle","musicNote","galleryLockTitle","galleryLockDescription","galleryLockQuestion","galleryLockWrongTitle"].forEach(id=>{const el=$("#"+id);if(el)el.textContent=m[id]||el.textContent});
    const romanticEl=$("#romanticNote");if(romanticEl)romanticEl.textContent=m.romanticNote||romanticEl.textContent;
    $("#loveLetterBody").textContent=m.loveLetterBody||"Write something only she could understand.";
    $("#secretMessage").textContent=m.secretMessage||"No matter how far away you are, a piece of my heart is always with you.";
    renderGift(m.giftImageUrl,m.giftPoem);
    const audio=$("#music");
    if(m.musicUrl){audio.src=m.musicUrl;audio.style.display="block";audio.load()}else{applyMusicSource(audio,"");}
    currentSettings.playlistTitle=m.playlistTitle||"My playlist";
    currentSettings.playlistNote=m.playlistNote||"A small note for the playlist";
    playlistTracks=parsePlaylistJson(m.musicPlaylist||"[]").map((t,i)=>({
      id:t.id||`track-${i}`,
      title:t.title||`Song ${i+1}`,
      note:t.note||"",
      public_url:t.public_url||t.url||"",
      storage_path:t.storage_path||"",
      is_active:t.is_active!==false
    }));
    try{ renderPlaylistSection(); }catch(err){ console.error("renderPlaylistSection", err); }
    startCountdown(m.countdownAt);
    galleryPrivacy=getGalleryPrivacyFromSettings(m);galleryPrivacyState=resetGalleryState(galleryPrivacy);
    magicState=getMagicStateFromSettings(m);applyMagicState();
    try{ renderNav(chapters||[]); }catch(err){ console.error("renderNav", err); }
    try{ renderChapters(chapters||[]); }catch(err){ console.error("renderChapters", err); }
    try{ galleryItems=gallery||[]; renderGallery(galleryItems); }catch(err){ console.error("renderGallery", err); }
    try{ renderReasons(reasons||[]); }catch(err){ console.error("renderReasons", err); }
    try{ syncGalleryPrivacyUI(); }catch(err){ console.error("syncGalleryPrivacyUI", err); }
    try{ updateJourneyRibbon(); }catch(err){ console.error("updateJourneyRibbon", err); }
    try{ syncMemorySky(); }catch(err){ console.error("syncMemorySky", err); }
  }catch(err){
    console.error("loadAll failed", err);
    showBanner(err.message || String(err), false);
  }
}
function renderNav(cs){
  const n=$("#chapterNav");
  if(!n) return;
  n.innerHTML="";
  (cs||[]).forEach(c=>{
    const b=document.createElement("button");
    b.className="nav-btn";
    b.textContent=c.eyebrow||c.title||"Chapter";
    b.onclick=()=>document.getElementById(`chapter-${c.id}`)?.scrollIntoView({behavior:"smooth",block:"center"});
    n.appendChild(b);
  });
}
function renderChapters(cs){
  const w=$("#chapters");
  if(!w) return;
  w.innerHTML="";
  (cs||[]).forEach(c=>{
    const s=document.createElement("section");
    s.className="special-section";
    s.id=`chapter-${c.id}`;
    const card=document.createElement("article");
    card.className="chapter-card glass";
    const e=document.createElement("div");
    e.className="eyebrow";
    e.textContent=c.eyebrow||"CHAPTER";
    const h=document.createElement("h3");
    h.textContent=c.title||"";
    const p=document.createElement("p");
    p.textContent=c.content||"";
    card.append(e,h,p);
    s.appendChild(card);
    w.appendChild(s);
  });
}
function renderGallery(items){
  const w=$("#gallery");
  if(!w) return;
  w.innerHTML="";
  const locked=galleryPrivacy.enabled&&!galleryPrivacyState.unlocked;
  const list=items||[];
  if(!list.length){
    w.innerHTML='<div class="reason" style="grid-column:1/-1">Your photos will appear here after you upload them.</div>';
    const sw=$("#spotlightWrap"); if(sw) sw.hidden=true;
    return;
  }
  list.forEach((x)=>{
    const d=document.createElement("figure");
    d.className="gallery-item"+(locked?" locked":"");
    const img=document.createElement("img");
    img.loading="lazy";
    img.draggable=false;
    img.src=x.public_url||"";
    img.alt=x.caption||"A memory";
    img.addEventListener("contextmenu",e=>e.preventDefault());
    const cap=document.createElement("figcaption");
    cap.textContent=x.caption||"";
    d.append(img,cap);
    d.addEventListener("contextmenu",e=>e.preventDefault());
    d.addEventListener("click",()=>{ if(locked) openGalleryUnlockModal(); });
    w.appendChild(d);
  });
  if(locked){
    const note=document.createElement("div");
    note.className="gallery-privacy-empty reason";
    note.style.gridColumn="1/-1";
    note.textContent="Locked memories — unlock to view the photos.";
    w.appendChild(note);
  }
  const sw=$("#spotlightWrap"); if(sw) sw.hidden=true;
}
function showSpotlight(i){if(galleryPrivacy.enabled&&!galleryPrivacyState.unlocked){openGalleryUnlockModal();return;}return;}
$("#spotlightClose").addEventListener("click",()=>{$("#spotlightWrap").hidden=true;clearInterval(spotlightTimer)});
function renderReasons(items){
  const wrap=$("#reasons");wrap.innerHTML="";
  items.forEach((x,i)=>{
    const card=document.createElement("button");
    card.type="button";card.className="real-envelope";
    card.setAttribute("aria-label",`Open reason ${i+1}`);
    card.innerHTML=`
      <span class="envelope-paper"><span class="envelope-paper-text"></span><span class="envelope-close" aria-label="Close">×</span></span>
      <span class="envelope-body"></span>
      <span class="envelope-left-fold"></span><span class="envelope-right-fold"></span>
      <span class="envelope-flap"></span>
      <span class="envelope-front"><span class="envelope-number">${i+1}</span><span class="envelope-name">Reason ${i+1}</span></span>
      <span class="envelope-seal">♥</span>`;
    card.querySelector('.envelope-paper-text').textContent=x.reason||"";
    const close=card.querySelector('.envelope-close');
    card.addEventListener('click',e=>{
      if(e.target.closest('.envelope-close')) return;
      const was=card.classList.contains('open');
      document.querySelectorAll('.real-envelope.open').forEach(el=>el.classList.remove('open'));
      document.querySelectorAll('.real-envelope.open-final').forEach(el=>el.classList.remove('open-final'));
      if(!was){
        card.classList.add('open');
        playPaperSound();
        heartBurst(7);
        clearTimeout(card._reasonTimer);
        card._reasonTimer=setTimeout(()=>card.classList.add('open-final'),680);
      }
    });
    close.addEventListener('click',e=>{e.stopPropagation();card.classList.remove('open');});
    wrap.appendChild(card);
  });
}

function renderGift(imgUrl,poem){const box=$("#giftBox"),rev=$("#giftReveal"),im=$("#giftImage");box.classList.remove("opened");rev.hidden=true;if(imgUrl){im.hidden=false;im.src=imgUrl}else{im.hidden=true;im.removeAttribute("src")}$("#giftPoem").textContent=poem||""}

function renderPlaylistSection(){
  const list=$("#playlistList");
  const title=$("#playlistTitle");
  const intro=$("#playlistIntro");
  const audio=$("#playlistAudio");
  const active=(playlistTracks||[]).filter(t=>t && t.is_active!==false && t.public_url);
  if(title) title.textContent=(currentSettings&&currentSettings.playlistTitle)||"Songs I want to keep forever";
  if(intro) intro.textContent=(currentSettings&&currentSettings.playlistNote)||"A small collection of songs with memories attached.";
  if(!list) return;
  list.innerHTML="";
  if(!active.length){
    list.innerHTML='<div class="empty-state">No playlist songs yet. Add them in Admin.</div>';
    applyMusicSource(audio,"");
    renderPlaylistControls();
    return;
  }
  active.forEach((track, idx)=>{
    const item=document.createElement("button");
    item.className="playlist-item";
    item.type="button";
    item.innerHTML=`<div><strong>${escapeHtml(track.title||`Song ${idx+1}`)}</strong><div class="muted">${escapeHtml(track.note||"")}</div></div><span>Play</span>`;
    item.addEventListener("click",()=>{
      playlistIndex=idx;
      applyMusicSource(audio, track.public_url);
      if(audio) audio.play().catch(()=>{});
      renderPlaylistControls();
    });
    list.appendChild(item);
  });
  if(audio && !audio.dataset.playlistBound){
    audio.dataset.playlistBound="1";
    audio.addEventListener("ended",()=>{
      const items=(playlistTracks||[]).filter(t=>t && t.is_active!==false && t.public_url);
      if(items.length>1){
        playlistIndex=(playlistIndex+1)%items.length;
        applyMusicSource(audio, items[playlistIndex].public_url);
        audio.play().catch(()=>{});
        renderPlaylistControls();
      }
    });
  }
  if(audio && !audio.src && active[0]) applyMusicSource(audio, active[0].public_url);
  renderPlaylistControls();
}
function renderPlaylistControls(){
  const tracks=(playlistTracks||[]).filter(t=>t && t.is_active!==false && t.public_url);
  const audio=$("#playlistAudio");
  const prev=$("#playlistPrevBtn"), next=$("#playlistNextBtn"), play=$("#playlistPlayBtn");
  if(prev) prev.disabled = tracks.length<2;
  if(next) next.disabled = tracks.length<2;
  if(play) play.textContent = audio && !audio.paused ? "Pause" : "Play";
}
function playPlaylistTrack(index){
  const tracks=playlistTracks.filter(t=>t && t.is_active!==false && t.public_url);
  const audio=$("#playlistAudio");
  if(!tracks.length || !audio) return;
  playlistIndex=((index%tracks.length)+tracks.length)%tracks.length;
  applyMusicSource(audio, tracks[playlistIndex].public_url);
  audio.play().catch(()=>{});
  renderPlaylistControls();
}
function openGift(){const b=$("#giftBox"),r=$("#giftReveal");if(b.classList.contains("opened"))return;b.classList.add("opened");setTimeout(()=>{r.hidden=false;heartBurst(24);confetti(28)},500)}
function heartBurst(n=12){const w=$("#heartBurst");for(let i=0;i<n;i++){const h=document.createElement("span");h.className="burst-heart";h.textContent="♥";h.style.left=`${45+Math.random()*10}%`;h.style.top=`${48+Math.random()*8}%`;h.style.setProperty("--dx",`${(Math.random()-.5)*260}px`);h.style.setProperty("--dy",`${(Math.random()-.85)*260}px`);w.appendChild(h);setTimeout(()=>h.remove(),1800)}}
function confetti(n=24){const w=$("#giftConfetti");for(let i=0;i<n;i++){const c=document.createElement("span");c.className="confetti";c.style.left=`${10+Math.random()*80}%`;c.style.setProperty("--dx",`${(Math.random()-.5)*240}px`);c.style.setProperty("--rot",`${Math.random()*360}deg`);w.appendChild(c);setTimeout(()=>c.remove(),1700)}}

async function toggleBackgroundMusic(){
  const audio=$("#music"); if(!audio.src)return;
  if(audio.paused){
    try{await audio.play(); const i=$("#musicFabIcon"),t=$("#musicFabText");if(i)i.textContent="🔊";if(t)t.textContent="Music on"; backgroundMusicStarted=true;}
    catch{ $("#musicFabIcon").textContent="🔇"; $("#musicFabText").textContent="Music off"; }
  } else {
    audio.pause(); const i=$("#musicFabIcon"),t=$("#musicFabText");if(i)i.textContent="🔇";if(t)t.textContent="Music off";
  }
}
const musicFab=$("#musicFab"); if(musicFab) musicFab.addEventListener("click",toggleBackgroundMusic);
async function tryStartMusic(){
  const audio=$("#music");
  if(!audio.src||backgroundMusicStarted)return;
  try{audio.volume=.28;await audio.play();backgroundMusicStarted=true;const i=$("#musicFabIcon"),t=$("#musicFabText");if(i)i.textContent="🔊";if(t)t.textContent="Music on";}
  catch{}
}
["click","touchstart","keydown"].forEach(evt=>window.addEventListener(evt,tryStartMusic,{once:true,passive:true}));

function startCountdown(iso){
  clearInterval(countdownTimer);
  if(!iso){$("#countdownSection").style.display="none";return;}
  const target=new Date(iso).getTime();
  if(!Number.isFinite(target)){$("#countdownSection").style.display="none";return;}
  $("#countdownSection").style.display="";
  const tick=()=>{
    const ms=target-Date.now();
    if(ms<=0){["d","h","m","s"].forEach(id=>$("#"+id).textContent="0");clearInterval(countdownTimer);return;}
    $("#d").textContent=Math.floor(ms/86400000);
    $("#h").textContent=String(Math.floor((ms%86400000)/3600000)).padStart(2,"0");
    $("#m").textContent=String(Math.floor((ms%3600000)/60000)).padStart(2,"0");
    $("#s").textContent=String(Math.floor((ms%60000)/1000)).padStart(2,"0");
  };
  tick();countdownTimer=setInterval(tick,1000);
}

function placeGameHeart(){const h=$("#gameHeart"),b=$("#gameBoard"),x=Math.max(8,b.clientWidth-h.offsetWidth-8),y=Math.max(8,b.clientHeight-h.offsetHeight-8);h.style.left=`${8+Math.random()*x}px`;h.style.top=`${8+Math.random()*y}px`}
function endGame(){gamePlaying=false;clearInterval(gameTimer);$("#gameMessage").textContent=`You caught ${gameScore} heart${gameScore===1?"":"s"} 💗`;$("#startGameBtn").textContent="Play Again";$("#gameHeart").style.display="none";heartBurst(Math.min(18,Math.max(6,gameScore)))}
function startGame(){gamePlaying=true;gameScore=0;gameSeconds=20;$("#gameScore").textContent="0";$("#gameTime").textContent="20";$("#gameMessage").textContent="Catch me! 💕";$("#startGameBtn").textContent="Restart";$("#gameHeart").style.display="block";placeGameHeart();clearInterval(gameTimer);gameTimer=setInterval(()=>{gameSeconds--;$("#gameTime").textContent=gameSeconds;if(gameSeconds<=0)endGame()},1000)}
$("#gameHeart").onclick=()=>{if(!gamePlaying)return;gameScore++;$("#gameScore").textContent=gameScore;placeGameHeart();heartBurst(2)};$("#startGameBtn").onclick=startGame;window.addEventListener("resize",()=>{if(gamePlaying)placeGameHeart()});
$("#galleryUnlockOpenBtn")?.addEventListener("click",openGalleryUnlockModal);
$("#galleryUnlockClose")?.addEventListener("click",closeGalleryUnlockModal);
$("#galleryUnlockSubmit")?.addEventListener("click",submitGalleryUnlock);
$("#galleryUnlockAnswer")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();submitGalleryUnlock();}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#galleryUnlockModal")?.hidden) closeGalleryUnlockModal();});
$("#beginBtn").onclick=()=>document.querySelector(".section-intro")?.scrollIntoView({behavior:"smooth"});$("#brandButton").onclick=()=>window.scrollTo({top:0,behavior:"smooth"});$("#giftBox").onclick=openGift;$("#secretHeart").onclick=()=>{const m=$("#secretMessage");m.hidden=false;m.classList.add("secret-reveal");heartBurst(16)};$("#finalHeart").onclick=()=>{heartBurst(30);confetti(18)};
$("#commentForm").addEventListener("submit",async e=>{e.preventDefault();const btn=$("#commentSubmit"),st=$("#commentStatus");btn.disabled=true;btn.textContent="Sending…";const name=$("#commentName").value.trim()||"Anonymous",message=$("#commentText").value.trim();if(!message){st.textContent="Please write a little message.";btn.disabled=false;btn.textContent="Send your thoughts ❤️";return}const {error}=await db.from("comments").insert({name,message});if(error){st.textContent="Something went wrong. Please try again.";btn.disabled=false;btn.textContent="Send your thoughts ❤️";return}e.target.reset();st.textContent="❤️ Your message was sent.";btn.disabled=false;btn.textContent="Send your thoughts ❤️";setTimeout(()=>st.textContent="",3500)});
loadAll().catch(console.error);
db.channel("public-live-updates").on("postgres_changes",{event:"*",schema:"public",table:"site_settings"},loadAll).on("postgres_changes",{event:"*",schema:"public",table:"chapters"},loadAll).on("postgres_changes",{event:"*",schema:"public",table:"gallery_items"},loadAll).on("postgres_changes",{event:"*",schema:"public",table:"love_reasons"},loadAll).subscribe();

function tinyHeartBurstAt(x,y,count=6){
  const wrap=$("#heartBurst");if(!wrap)return;
  for(let i=0;i<count;i++){
    const h=document.createElement("span");h.className="burst-heart tap-heart";h.textContent=i%4===0?"✦":"♥";
    h.style.left=`${x}px`;h.style.top=`${y}px`;
    h.style.setProperty("--dx",`${(Math.random()-.5)*120}px`);
    h.style.setProperty("--dy",`${-20-Math.random()*120}px`);
    h.style.animationDelay=`${Math.random()*.05}s`;
    wrap.appendChild(h);setTimeout(()=>h.remove(),1400);
  }
}
function initHeroRomance(){
  const hero=$("#hero");if(!hero)return;
  for(let i=0;i<14;i++){
    const h=document.createElement("span");h.className="hero-heart";h.textContent=i%5===0?"✦":"♥";
    h.style.left=`${8+Math.random()*84}%`;h.style.top=`${18+Math.random()*62}%`;
    h.style.animationDelay=`${Math.random()*5}s`;h.style.animationDuration=`${6+Math.random()*5}s`;
    hero.appendChild(h);
  }
}
initHeroRomance();
function openLoveLetter(){
  const card=$("#loveLetterCard");if(!card||card.classList.contains("opened")) return;
  card.classList.add("opened");
  card.classList.remove("opened-final");
  playPaperSound();
  heartBurst(12);
  clearTimeout(card._letterTimer);
  card._letterTimer=setTimeout(()=>card.classList.add("opened-final"),740);
}
function closeLoveLetter(){
  const card=$("#loveLetterCard");if(!card)return;
  clearTimeout(card._letterTimer);
  card.classList.remove("opened","opened-final");
}
$("#loveLetterCard")?.addEventListener("click",()=>openLoveLetter());
$("#loveLetterCard")?.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openLoveLetter();}});
$("#letterSeal")?.addEventListener("click",e=>{e.stopPropagation();openLoveLetter();});


window.addEventListener("scroll",updateJourneyRibbon,{passive:true});
window.addEventListener("resize",updateJourneyRibbon,{passive:true});

window.addEventListener("scroll",syncMemorySky,{passive:true});
window.addEventListener("resize",syncMemorySky,{passive:true});

window.addEventListener("load",loadAll);
