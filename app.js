const { createClient } = supabase; const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY); const $=s=>document.querySelector(s);
let galleryItems=[],spotlightTimer=null,countdownTimer=null,gameTimer=null,gamePlaying=false,gameScore=0,gameSeconds=20,backgroundMusicStarted=false;
let galleryPrivacyTimer=null;
let galleryPrivacy={enabled:false,title:"Our Precious Memories ❤️",description:"Only someone who truly knows our journey can unlock these memories.",question:"What is our special password?",hint:"",answer:"",wrongTitle:"Wrong answer",wrongMessage:"That is not the correct answer. Try again.",maxAttempts:3,cooldownMinutes:15};
let galleryPrivacyState={unlocked:false,attemptsLeft:3,cooldownUntil:0};
let paperAudioCtx=null;

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

function seedStars(){const wrap=$("#stars");if(!wrap||wrap.dataset.ready)return;wrap.dataset.ready="1";for(let i=0;i<100;i++){const e=document.createElement("span");e.className="star";const z=Math.random()*2.8+1;e.style.width=`${z}px`;e.style.height=`${z}px`;e.style.left=`${Math.random()*100}%`;e.style.top=`${Math.random()*100}%`;e.style.animationDelay=`${Math.random()*4}s`;wrap.appendChild(e)}const petals=$("#petals");for(let i=0;i<18;i++){const p=document.createElement("span");p.className="petal";p.style.left=`${Math.random()*100}%`;p.style.animationDuration=`${12+Math.random()*12}s`;p.style.animationDelay=`-${Math.random()*18}s`;petals.appendChild(p)}}seedStars();
initSectionDock();

const GALLERY_STATE_KEY="our-love-story.gallery-privacy-state";
function parseBool(v){return v===true||v==="true"||v===1||v==="1";}
function parseNum(v,def=0){const n=Number.parseInt(v,10);return Number.isFinite(n)?n:def;}
function getGalleryPrivacyFromSettings(m){return {
  enabled:parseBool(m.galleryLockEnabled),
  title:m.galleryLockTitle||"Our Precious Memories ❤️",
  description:m.galleryLockDescription||"Only someone who truly knows our journey can unlock these memories.",
  question:m.galleryLockQuestion||"What is our special password?",
  hint:m.galleryLockHint||"",
  answer:String(m.galleryLockAnswer??""),
  wrongTitle:m.galleryLockWrongTitle||"Wrong answer",
  wrongMessage:m.galleryLockWrongMessage||"That is not the correct answer. Try again.",
  maxAttempts:Math.max(1,parseNum(m.galleryLockMaxAttempts,3)),
  cooldownMinutes:Math.max(0,parseNum(m.galleryLockCooldownMinutes,15))
};}
function readGalleryState(){
  try{const raw=localStorage.getItem(GALLERY_STATE_KEY);return raw?JSON.parse(raw):null;}catch{return null;}
}
function writeGalleryState(state){
  try{localStorage.setItem(GALLERY_STATE_KEY,JSON.stringify(state));}catch{}
}
function normalizedGalleryState(state,privacy){
  const now=Date.now();
  const base={unlocked:false,attemptsLeft:privacy.maxAttempts,cooldownUntil:0};
  if(!privacy.enabled) return {...base,unlocked:true};
  const s=state&&typeof state==="object"?state:{};
  const cooldownUntil=Number(s.cooldownUntil||0);
  if(cooldownUntil && cooldownUntil>now){
    return {unlocked:false,attemptsLeft:0,cooldownUntil};
  }
  const unlocked=!!s.unlocked;
  const attemptsLeft=Math.max(0,parseNum(s.attemptsLeft,privacy.maxAttempts));
  return {unlocked,attemptsLeft: attemptsLeft||privacy.maxAttempts, cooldownUntil:0};
}
function syncGalleryPrivacyUI(){
  const banner=$("#galleryPrivacyBanner");
  const modal=$("#galleryUnlockModal");
  const openBtn=$("#galleryUnlockOpenBtn");
  const locked=galleryPrivacy.enabled && !galleryPrivacyState.unlocked;
  document.body.classList.toggle("gallery-privacy-locked",locked);
  if(banner) banner.hidden=!galleryPrivacy.enabled;
  if(openBtn) openBtn.textContent=locked?"Unlock gallery":"Gallery open";
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
  writeGalleryState(state);
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
  const state={unlocked:true,attemptsLeft:galleryPrivacy.maxAttempts,cooldownUntil:0};
  setGalleryState(state);
  closeGalleryUnlockModal();
}
function submitGalleryUnlock(){
  if(!galleryPrivacy.enabled) return;
  if(galleryPrivacyState.cooldownUntil && galleryPrivacyState.cooldownUntil>Date.now()){
    updateGalleryUnlockModal();
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
    heartBurst(12);
    playPaperSound();
    return;
  }
  const nextLeft=Math.max(0,galleryPrivacyState.attemptsLeft-1);
  if(nextLeft<=0){
    const cooldownUntil=Date.now()+galleryPrivacy.cooldownMinutes*60000;
    setGalleryState({unlocked:false,attemptsLeft:0,cooldownUntil});
    updateGalleryUnlockModal();
    return;
  }
  setGalleryState({unlocked:false,attemptsLeft:nextLeft,cooldownUntil:0});
  const st=$("#galleryUnlockStatus");
  if(st) st.textContent=`${galleryPrivacy.wrongTitle}: ${galleryPrivacy.wrongMessage}`;
  updateGalleryUnlockModal();
}

async function loadAll(){const [{data:settings},{data:chapters},{data:gallery},{data:reasons}]=await Promise.all([db.from("site_settings").select("*"),db.from("chapters").select("*").eq("visible",true).order("sort_order"),db.from("gallery_items").select("*").eq("visible",true).order("sort_order"),db.from("love_reasons").select("*").eq("visible",true).order("sort_order")]);const m=Object.fromEntries((settings||[]).map(x=>[x.key,x.value]));
const TEXT_KEYS=["storyEyebrow","storyTitle","storyIntro","photosEyebrow","photosTitle","letterEyebrow","letterSoundHint","reasonsEyebrow","reasonsTitle","reasonsIntro","giftEyebrow","secretEyebrow","gameEyebrow","commentEyebrow","commentIntro","countdownEyebrow","musicEyebrow","endingEyebrow","footerText","galleryPrivacyEyebrow"];
TEXT_KEYS.forEach(k=>{const el=$("#"+k);if(el&&m[k]!==undefined)el.textContent=m[k];});

["heroTitle","heroHeadline","heroSubline","finalTitle","finalText","loveLetterTitle","giftTitle","giftHint","secretTitle","commentTitle","gameTitle","gameIntro","countdownTitle","musicTitle","musicNote","galleryLockTitle","galleryLockDescription","galleryLockQuestion","galleryLockWrongTitle","galleryLockWrongMessage"].forEach(id=>{const el=$("#"+id);if(el)el.textContent=m[id]||el.textContent});$("#loveLetterBody").textContent=m.loveLetterBody||"Write something only she could understand.";$("#secretMessage").textContent=m.secretMessage||"No matter how far away you are, a piece of my heart is always with you.";renderGift(m.giftImageUrl,m.giftPoem);const audio=$("#music");if(m.musicUrl){audio.src=m.musicUrl;audio.style.display="block";audio.load()}else{audio.removeAttribute("src");audio.style.display="none"}startCountdown(m.countdownAt);galleryPrivacy=getGalleryPrivacyFromSettings(m);const stored=readGalleryState();galleryPrivacyState=normalizedGalleryState(stored,galleryPrivacy);writeGalleryState(galleryPrivacyState);renderNav(chapters||[]);renderChapters(chapters||[]);galleryItems=gallery||[];renderGallery(galleryItems);renderReasons(reasons||[]);syncGalleryPrivacyUI();}
function renderNav(cs){const n=$("#chapterNav");n.innerHTML="";cs.forEach(c=>{const b=document.createElement("button");b.className="nav-btn";b.textContent=c.eyebrow||c.title;b.onclick=()=>document.getElementById(`chapter-${c.id}`)?.scrollIntoView({behavior:"smooth",block:"center"});n.appendChild(b)})}
function renderChapters(cs){const w=$("#chapters");w.innerHTML="";cs.forEach(c=>{const s=document.createElement("section");s.className="special-section";s.id=`chapter-${c.id}`;const card=document.createElement("article");card.className="chapter-card glass";const e=document.createElement("div");e.className="eyebrow";e.textContent=c.eyebrow||"CHAPTER";const h=document.createElement("h3");h.textContent=c.title||"";const p=document.createElement("p");p.textContent=c.content||"";card.append(e,h,p);s.appendChild(card);w.appendChild(s)})}
function renderGallery(items){const w=$("#gallery");w.innerHTML="";const locked=galleryPrivacy.enabled&&!galleryPrivacyState.unlocked;if(!items.length){w.innerHTML='<div class="reason" style="grid-column:1/-1">Your photos will appear here after you upload them.</div>';$("#spotlightWrap").hidden=true;return}items.forEach((x,i)=>{const d=document.createElement("figure");d.className="gallery-item"+(locked?" locked":"");const img=document.createElement("img");img.loading="lazy";img.src=x.public_url;img.alt=x.caption||"A memory";const cap=document.createElement("figcaption");cap.textContent=x.caption||"";d.append(img,cap);d.onclick=()=>locked?openGalleryUnlockModal():showSpotlight(i);w.appendChild(d)});if(locked){const note=document.createElement("div");note.className="gallery-privacy-empty reason";note.style.gridColumn="1/-1";note.textContent="Locked memories — unlock to view the photos.";w.appendChild(note)}$("#spotlightWrap").hidden=true}
function showSpotlight(i){if(galleryPrivacy.enabled&&!galleryPrivacyState.unlocked){openGalleryUnlockModal();return;}if(!galleryItems.length)return;const x=galleryItems[i%galleryItems.length],w=$("#spotlightWrap"),im=$("#spotlightImage"),cap=$("#spotlightCaption");w.hidden=false;im.src=x.public_url;im.alt=x.caption||"A memory";cap.textContent=x.caption||"";clearInterval(spotlightTimer);if(galleryItems.length>1){let j=(i+1)%galleryItems.length;spotlightTimer=setInterval(()=>{const n=galleryItems[j%galleryItems.length];im.classList.remove("spotlight-fade");void im.offsetWidth;im.classList.add("spotlight-fade");im.src=n.public_url;cap.textContent=n.caption||"";j++},7000)}}
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
      if(!was){card.classList.add('open');playPaperSound();heartBurst(7);}
    });
    close.addEventListener('click',e=>{e.stopPropagation();card.classList.remove('open');});
    wrap.appendChild(card);
  });
}

function renderGift(imgUrl,poem){const box=$("#giftBox"),rev=$("#giftReveal"),im=$("#giftImage");box.classList.remove("opened");rev.hidden=true;if(imgUrl){im.hidden=false;im.src=imgUrl}else{im.hidden=true;im.removeAttribute("src")}$("#giftPoem").textContent=poem||""}
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
setInterval(()=>{if(galleryPrivacy.enabled){const state=normalizedGalleryState(readGalleryState(),galleryPrivacy);if(state.cooldownUntil!==galleryPrivacyState.cooldownUntil||state.attemptsLeft!==galleryPrivacyState.attemptsLeft||state.unlocked!==galleryPrivacyState.unlocked){galleryPrivacyState=state;writeGalleryState(state);syncGalleryPrivacyUI();}}},1000);

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
if(document.body.classList.contains("public-page")){
  document.addEventListener("click",e=>{if(!e.target.closest("input,textarea,select,audio"))tinyHeartBurstAt(e.clientX,e.clientY,e.target.closest("button")?10:5);},{passive:true});
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
  card.classList.add("opened");card.classList.remove("opened-final");playPaperSound();heartBurst(12);
  clearTimeout(card._letterTimer);
  card._letterTimer=setTimeout(()=>card.classList.add("opened-final"),760);
}
function closeLoveLetter(){
  const card=$("#loveLetterCard");if(!card)return;
  card.classList.remove("opened","opened-final");
}
$("#loveLetterCard")?.addEventListener("click",()=>openLoveLetter());
$("#loveLetterCard")?.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openLoveLetter();}});
$("#letterSeal")?.addEventListener("click",e=>{e.stopPropagation();openLoveLetter();});

