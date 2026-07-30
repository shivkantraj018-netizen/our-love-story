const { createClient } = supabase; const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY); const $=s=>document.querySelector(s);
let galleryItems=[],spotlightTimer=null,countdownTimer=null,gameTimer=null,gamePlaying=false,gameScore=0,gameSeconds=20;

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
async function loadAll(){const [{data:settings},{data:chapters},{data:gallery},{data:reasons}]=await Promise.all([db.from("site_settings").select("*"),db.from("chapters").select("*").eq("visible",true).order("sort_order"),db.from("gallery_items").select("*").eq("visible",true).order("sort_order"),db.from("love_reasons").select("*").eq("visible",true).order("sort_order")]);const m=Object.fromEntries((settings||[]).map(x=>[x.key,x.value]));
["heroTitle","heroHeadline","heroSubline","finalTitle","finalText","loveLetterTitle","giftTitle","giftHint","secretTitle","commentTitle","gameTitle","gameIntro","countdownTitle","musicTitle","musicNote"].forEach(id=>{const el=$("#"+id);if(el)el.textContent=m[id]||el.textContent});$("#loveLetterBody").textContent=m.loveLetterBody||"Write something only she could understand.";$("#secretMessage").textContent=m.secretMessage||"No matter how far away you are, a piece of my heart is always with you.";renderGift(m.giftImageUrl,m.giftPoem);const audio=$("#music");if(m.musicUrl){audio.src=m.musicUrl;audio.style.display="block";audio.load()}else{audio.removeAttribute("src");audio.style.display="none"}startCountdown(m.countdownAt);renderNav(chapters||[]);renderChapters(chapters||[]);galleryItems=gallery||[];renderGallery(galleryItems);renderReasons(reasons||[])}
function renderNav(cs){const n=$("#chapterNav");n.innerHTML="";cs.forEach(c=>{const b=document.createElement("button");b.className="nav-btn";b.textContent=c.eyebrow||c.title;b.onclick=()=>document.getElementById(`chapter-${c.id}`)?.scrollIntoView({behavior:"smooth",block:"center"});n.appendChild(b)})}
function renderChapters(cs){const w=$("#chapters");w.innerHTML="";cs.forEach(c=>{const s=document.createElement("section");s.className="special-section";s.id=`chapter-${c.id}`;const card=document.createElement("article");card.className="chapter-card glass";const e=document.createElement("div");e.className="eyebrow";e.textContent=c.eyebrow||"CHAPTER";const h=document.createElement("h3");h.textContent=c.title||"";const p=document.createElement("p");p.textContent=c.content||"";card.append(e,h,p);s.appendChild(card);w.appendChild(s)})}
function renderGallery(items){const w=$("#gallery");w.innerHTML="";if(!items.length){w.innerHTML='<div class="reason" style="grid-column:1/-1">Your photos will appear here after you upload them.</div>';$("#spotlightWrap").hidden=true;return}items.forEach((x,i)=>{const d=document.createElement("figure");d.className="gallery-item";const img=document.createElement("img");img.loading="lazy";img.src=x.public_url;img.alt=x.caption||"A memory";const cap=document.createElement("figcaption");cap.textContent=x.caption||"";d.append(img,cap);d.onclick=()=>showSpotlight(i);w.appendChild(d)});$("#spotlightWrap").hidden=true}
function showSpotlight(i){if(!galleryItems.length)return;const x=galleryItems[i%galleryItems.length],w=$("#spotlightWrap"),im=$("#spotlightImage"),cap=$("#spotlightCaption");w.hidden=false;im.src=x.public_url;im.alt=x.caption||"A memory";cap.textContent=x.caption||"";clearInterval(spotlightTimer);if(galleryItems.length>1){let j=(i+1)%galleryItems.length;spotlightTimer=setInterval(()=>{const n=galleryItems[j%galleryItems.length];im.classList.remove("spotlight-fade");void im.offsetWidth;im.classList.add("spotlight-fade");im.src=n.public_url;cap.textContent=n.caption||"";j++},7000)}}
$("#spotlightClose").addEventListener("click",()=>{$("#spotlightWrap").hidden=true;clearInterval(spotlightTimer)});
function renderReasons(items){
  const wrap=$("#reasons"); wrap.innerHTML="";
  items.forEach((x,i)=>{
    const button=document.createElement("button");
    button.type="button"; button.className="envelope-card";
    button.setAttribute("aria-label",`Open reason ${i+1}`);
    button.innerHTML=`
      <span class="envelope-flap"></span>
      <span class="envelope-number-big">${i+1}</span>
      <span class="envelope-front-title">Reason</span>
      <span class="envelope-seal">♥</span>
      <span class="envelope-reveal">
        <span class="envelope-scroll-text"></span>
        <span class="envelope-close">×</span>
      </span>`;
    button.querySelector(".envelope-scroll-text").textContent=x.reason||"";
    const close=button.querySelector(".envelope-close");
    button.addEventListener("click",e=>{
      if(e.target===close){button.classList.remove("open");return;}
      document.querySelectorAll(".envelope-card.open").forEach(el=>el.classList.remove("open"));
      button.classList.add("open");
      heartBurst(5);
    });
    close.addEventListener("click",e=>{e.stopPropagation();button.classList.remove("open");});
    wrap.appendChild(button);
  });
}

function renderGift(imgUrl,poem){const box=$("#giftBox"),rev=$("#giftReveal"),im=$("#giftImage");box.classList.remove("opened");rev.hidden=true;if(imgUrl){im.hidden=false;im.src=imgUrl}else{im.hidden=true;im.removeAttribute("src")}$("#giftPoem").textContent=poem||""}
function openGift(){const b=$("#giftBox"),r=$("#giftReveal");if(b.classList.contains("opened"))return;b.classList.add("opened");setTimeout(()=>{r.hidden=false;heartBurst(24);confetti(28)},500)}
function heartBurst(n=12){const w=$("#heartBurst");for(let i=0;i<n;i++){const h=document.createElement("span");h.className="burst-heart";h.textContent="♥";h.style.left=`${45+Math.random()*10}%`;h.style.top=`${48+Math.random()*8}%`;h.style.setProperty("--dx",`${(Math.random()-.5)*260}px`);h.style.setProperty("--dy",`${(Math.random()-.85)*260}px`);w.appendChild(h);setTimeout(()=>h.remove(),1800)}}
function confetti(n=24){const w=$("#giftConfetti");for(let i=0;i<n;i++){const c=document.createElement("span");c.className="confetti";c.style.left=`${10+Math.random()*80}%`;c.style.setProperty("--dx",`${(Math.random()-.5)*240}px`);c.style.setProperty("--rot",`${Math.random()*360}deg`);w.appendChild(c);setTimeout(()=>c.remove(),1700)}}

async function toggleBackgroundMusic(){
  const audio=$("#music"); if(!audio.src)return;
  if(audio.paused){
    try{await audio.play(); $("#musicFabIcon").textContent="🔊"; $("#musicFabText").textContent="Music on"; backgroundMusicStarted=true;}
    catch{ $("#musicFabIcon").textContent="🔇"; $("#musicFabText").textContent="Music off"; }
  } else {
    audio.pause(); $("#musicFabIcon").textContent="🔇"; $("#musicFabText").textContent="Music off";
  }
}
$("#musicFab").addEventListener("click",toggleBackgroundMusic);
async function tryStartMusic(){
  const audio=$("#music");
  if(!audio.src||backgroundMusicStarted)return;
  try{audio.volume=.28;await audio.play();backgroundMusicStarted=true;$("#musicFabIcon").textContent="🔊";$("#musicFabText").textContent="Music on";}
  catch{}
}
["click","touchstart","keydown"].forEach(evt=>window.addEventListener(evt,tryStartMusic,{once:true,passive:true}));

function startCountdown(iso){clearInterval(countdownTimer);if(!iso){$("#countdownSection").style.display="none";return}$("#countdownSection").style.display="";const t=()=>{const ms=new Date(iso).getTime()-Date.now();if(ms<=0){["d","h","m","s"].forEach(id=>$("#"+id).textContent="0");return}$("#d").textContent=Math.floor(ms/86400000);$("#h").textContent=Math.floor(ms%86400000/3600000);$("#m").textContent=Math.floor(ms%3600000/60000);$("#s").textContent=Math.floor(ms%60000/1000)};t();countdownTimer=setInterval(t,1000)}
function placeGameHeart(){const h=$("#gameHeart"),b=$("#gameBoard"),x=Math.max(8,b.clientWidth-h.offsetWidth-8),y=Math.max(8,b.clientHeight-h.offsetHeight-8);h.style.left=`${8+Math.random()*x}px`;h.style.top=`${8+Math.random()*y}px`}
function endGame(){gamePlaying=false;clearInterval(gameTimer);$("#gameMessage").textContent=`You caught ${gameScore} heart${gameScore===1?"":"s"} 💗`;$("#startGameBtn").textContent="Play Again";$("#gameHeart").style.display="none";heartBurst(Math.min(18,Math.max(6,gameScore)))}
function startGame(){gamePlaying=true;gameScore=0;gameSeconds=20;$("#gameScore").textContent="0";$("#gameTime").textContent="20";$("#gameMessage").textContent="Catch me! 💕";$("#startGameBtn").textContent="Restart";$("#gameHeart").style.display="block";placeGameHeart();clearInterval(gameTimer);gameTimer=setInterval(()=>{gameSeconds--;$("#gameTime").textContent=gameSeconds;if(gameSeconds<=0)endGame()},1000)}
$("#gameHeart").onclick=()=>{if(!gamePlaying)return;gameScore++;$("#gameScore").textContent=gameScore;placeGameHeart();heartBurst(2)};$("#startGameBtn").onclick=startGame;window.addEventListener("resize",()=>{if(gamePlaying)placeGameHeart()});
$("#beginBtn").onclick=()=>document.querySelector(".section-intro")?.scrollIntoView({behavior:"smooth"});$("#brandButton").onclick=()=>window.scrollTo({top:0,behavior:"smooth"});$("#giftBox").onclick=openGift;$("#secretHeart").onclick=()=>{const m=$("#secretMessage");m.hidden=false;m.classList.add("secret-reveal");heartBurst(16)};$("#finalHeart").onclick=()=>{heartBurst(30);confetti(18)};
$("#commentForm").addEventListener("submit",async e=>{e.preventDefault();const btn=$("#commentSubmit"),st=$("#commentStatus");btn.disabled=true;btn.textContent="Sending…";const name=$("#commentName").value.trim()||"Anonymous",message=$("#commentText").value.trim();if(!message){st.textContent="Please write a little message.";btn.disabled=false;btn.textContent="Send your thoughts ❤️";return}const {error}=await db.from("comments").insert({name,message});if(error){st.textContent="Something went wrong. Please try again.";btn.disabled=false;btn.textContent="Send your thoughts ❤️";return}e.target.reset();st.textContent="❤️ Your message was sent.";btn.disabled=false;btn.textContent="Send your thoughts ❤️";setTimeout(()=>st.textContent="",3500)});
loadAll().catch(console.error);
db.channel("public-live-updates").on("postgres_changes",{event:"*",schema:"public",table:"site_settings"},loadAll).on("postgres_changes",{event:"*",schema:"public",table:"chapters"},loadAll).on("postgres_changes",{event:"*",schema:"public",table:"gallery_items"},loadAll).on("postgres_changes",{event:"*",schema:"public",table:"love_reasons"},loadAll).subscribe();
