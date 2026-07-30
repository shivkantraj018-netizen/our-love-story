const { createClient } = supabase;
const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
let galleryItems = [];
let spotlightTimer = null;
let countdownTimer = null;

function seedStars(){
  const wrap = $("#stars");
  if(!wrap || wrap.dataset.ready) return;
  wrap.dataset.ready = "1";

  for(let i=0;i<100;i++){
    const el=document.createElement("span");
    el.className="star";
    const size=Math.random()*2.8+1;
    el.style.width=`${size}px`;
    el.style.height=`${size}px`;
    el.style.left=`${Math.random()*100}%`;
    el.style.top=`${Math.random()*100}%`;
    el.style.animationDelay=`${Math.random()*4}s`;
    wrap.appendChild(el);
  }

  const petals=$("#petals");
  for(let i=0;i<18;i++){
    const p=document.createElement("span");
    p.className="petal";
    p.style.left=`${Math.random()*100}%`;
    p.style.animationDuration=`${12+Math.random()*12}s`;
    p.style.animationDelay=`-${Math.random()*18}s`;
    p.style.transform=`rotate(${Math.random()*180}deg)`;
    petals.appendChild(p);
  }
}
seedStars();

async function loadAll(){
  const [{data:settings},{data:chapters},{data:gallery},{data:reasons}] = await Promise.all([
    db.from("site_settings").select("*"),
    db.from("chapters").select("*").eq("visible",true).order("sort_order"),
    db.from("gallery_items").select("*").eq("visible",true).order("sort_order"),
    db.from("love_reasons").select("*").eq("visible",true).order("sort_order")
  ]);

  const map = Object.fromEntries((settings||[]).map(x=>[x.key,x.value]));

  $("#heroTitle").textContent = map.heroTitle || "Our Love Story ♥";
  $("#heroHeadline").textContent = map.heroHeadline || "Some people spend their whole life searching for someone who makes their heart feel at home.";
  $("#heroSubline").textContent = map.heroSubline || "I found mine.";
  $("#finalTitle").textContent = map.finalTitle || "In every lifetime, I would still choose you. ❤️";
  $("#finalText").textContent = map.finalText || "Thank you for being my favorite chapter of life.";

  $("#loveLetterTitle").textContent = map.loveLetterTitle || "A Love Letter";
  $("#loveLetterBody").textContent = map.loveLetterBody || "Write something only she could understand. Something that sounds like you, and only you.";

  $("#giftTitle").textContent = map.giftTitle || "A Gift For You 🎁";
  $("#giftHint").textContent = map.giftHint || "There is something inside. Tap the gift when you are ready.";
  renderGift(map.giftImageUrl, map.giftPoem);

  $("#secretTitle").textContent = map.secretTitle || "Tap my heart when you miss me.";
  const secret = $("#secretMessage");
  secret.textContent = map.secretMessage || "No matter how far away you are, a piece of my heart is always with you.";
  secret.hidden = true;

  $("#countdownTitle").textContent = map.countdownTitle || "Our next little forever";

  $("#musicTitle").textContent = map.musicTitle || "A song for us";
  $("#musicNote").textContent = map.musicNote || "";
  const audio=$("#music");
  if(map.musicUrl){
    audio.src=map.musicUrl;
    audio.style.display="block";
    audio.load();
  }else{
    audio.removeAttribute("src");
    audio.style.display="none";
  }

  startCountdown(map.countdownAt);
  renderNav(chapters||[]);
  renderChapters(chapters||[]);
  galleryItems = gallery||[];
  renderGallery(galleryItems);
  renderReasons(reasons||[]);
}

function renderNav(chapters){
  const nav=$("#chapterNav");
  nav.innerHTML="";
  chapters.forEach(c=>{
    const b=document.createElement("button");
    b.className="nav-btn";
    b.textContent=c.eyebrow||c.title;
    b.onclick=()=>document.getElementById(`chapter-${c.id}`)?.scrollIntoView({behavior:"smooth",block:"center"});
    nav.appendChild(b);
  });
}

function renderChapters(chapters){
  const wrap=$("#chapters");
  wrap.innerHTML="";
  chapters.forEach(c=>{
    const s=document.createElement("section");
    s.className="special-section";
    s.id=`chapter-${c.id}`;
    const card=document.createElement("article");
    card.className="chapter-card glass";

    const eyebrow=document.createElement("div");
    eyebrow.className="eyebrow";
    eyebrow.textContent=c.eyebrow||"CHAPTER";

    const title=document.createElement("h3");
    title.textContent=c.title||"";

    const body=document.createElement("p");
    body.textContent=c.content||"";

    card.append(eyebrow,title,body);
    s.appendChild(card);
    wrap.appendChild(s);
  });
}

function renderGallery(items){
  const wrap=$("#gallery");
  wrap.innerHTML="";
  if(!items.length){
    wrap.innerHTML='<div class="reason" style="grid-column:1/-1">Your photos will appear here after you upload them from the private admin panel.</div>';
    $("#spotlightWrap").hidden = true;
    return;
  }

  items.forEach((x,index)=>{
    const d=document.createElement("figure");
    d.className="gallery-item";
    d.tabIndex=0;
    const img=document.createElement("img");
    img.loading="lazy";
    img.src=x.public_url;
    img.alt=x.caption||"A memory";
    const cap=document.createElement("figcaption");
    cap.textContent=x.caption||"";
    d.append(img,cap);
    d.addEventListener("click",()=>showSpotlight(index));
    wrap.appendChild(d);
  });

  showSpotlight(0);
}

function showSpotlight(index){
  if(!galleryItems.length) return;
  const item=galleryItems[index%galleryItems.length];
  const wrap=$("#spotlightWrap");
  const img=$("#spotlightImage");
  const cap=$("#spotlightCaption");
  wrap.hidden=false;
  img.src=item.public_url;
  img.alt=item.caption||"A memory";
  cap.textContent=item.caption||"";
  if(spotlightTimer) clearInterval(spotlightTimer);
  if(galleryItems.length>1){
    let i=(index+1)%galleryItems.length;
    spotlightTimer=setInterval(()=>{
      const next=galleryItems[i%galleryItems.length];
      img.classList.remove("spotlight-fade");
      void img.offsetWidth;
      img.classList.add("spotlight-fade");
      img.src=next.public_url;
      img.alt=next.caption||"A memory";
      cap.textContent=next.caption||"";
      i++;
    },7000);
  }
}

function renderReasons(items){
  const wrap=$("#reasons");
  wrap.innerHTML="";
  items.forEach((x,i)=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="envelope-card";
    button.setAttribute("aria-expanded","false");

    const seal=document.createElement("span");
    seal.className="envelope-seal";
    seal.textContent="♥";

    const front=document.createElement("span");
    front.className="envelope-front";
    front.innerHTML=`<span class="envelope-number">#${i+1}</span><span class="envelope-label">Open me</span>`;

    const reveal=document.createElement("span");
    reveal.className="envelope-reveal";
    reveal.textContent=x.reason||"";

    button.append(seal,front,reveal);

    button.addEventListener("click",()=>{
      const open=button.classList.toggle("open");
      button.setAttribute("aria-expanded",String(open));
      if(open) heartBurst(5);
    });

    wrap.appendChild(button);
  });
}

function renderGift(imageUrl, poem){
  const box=$("#giftBox");
  const reveal=$("#giftReveal");
  const img=$("#giftImage");
  const body=$("#giftPoem");

  box.classList.remove("opened");
  reveal.hidden=true;

  if(imageUrl){
    img.hidden=false;
    img.src=imageUrl;
  }else{
    img.hidden=true;
    img.removeAttribute("src");
  }
  body.textContent=poem||"";
}

function openGift(){
  const box=$("#giftBox");
  const reveal=$("#giftReveal");
  if(box.classList.contains("opened")) return;
  box.classList.add("opened");
  setTimeout(()=>{reveal.hidden=false; heartBurst(24); confetti(28)},500);
}

function heartBurst(count=12){
  const wrap=$("#heartBurst");
  for(let i=0;i<count;i++){
    const h=document.createElement("span");
    h.className="burst-heart";
    h.textContent="♥";
    h.style.left=`${45+Math.random()*10}%`;
    h.style.top=`${48+Math.random()*8}%`;
    h.style.setProperty("--dx",`${(Math.random()-.5)*260}px`);
    h.style.setProperty("--dy",`${(Math.random()-.85)*260}px`);
    h.style.animationDelay=`${Math.random()*.12}s`;
    wrap.appendChild(h);
    setTimeout(()=>h.remove(),1800);
  }
}

function confetti(count=24){
  const wrap=$("#giftConfetti");
  for(let i=0;i<count;i++){
    const c=document.createElement("span");
    c.className="confetti";
    c.style.left=`${10+Math.random()*80}%`;
    c.style.setProperty("--dx",`${(Math.random()-.5)*240}px`);
    c.style.setProperty("--rot",`${Math.random()*360}deg`);
    c.style.animationDelay=`${Math.random()*.25}s`;
    wrap.appendChild(c);
    setTimeout(()=>c.remove(),1700);
  }
}

function startCountdown(iso){
  clearInterval(countdownTimer);
  if(!iso){
    $("#countdownSection").style.display="none";
    return;
  }
  $("#countdownSection").style.display="";
  const tick=()=>{
    const ms=new Date(iso).getTime()-Date.now();
    if(ms<=0){
      ["d","h","m","s"].forEach(id=>$("#"+id).textContent="0");
      return;
    }
    $("#d").textContent=Math.floor(ms/86400000);
    $("#h").textContent=Math.floor(ms%86400000/3600000);
    $("#m").textContent=Math.floor(ms%3600000/60000);
    $("#s").textContent=Math.floor(ms%60000/1000);
  };
  tick();
  countdownTimer=setInterval(tick,1000);
}

$("#beginBtn").addEventListener("click",()=>document.querySelector(".section-intro")?.scrollIntoView({behavior:"smooth"}));
$("#brandButton").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
$("#giftBox").addEventListener("click",openGift);
$("#secretHeart").addEventListener("click",()=>{
  const msg=$("#secretMessage");
  msg.hidden=false;
  msg.classList.add("secret-reveal");
  heartBurst(16);
});
$("#finalHeart").addEventListener("click",()=>{heartBurst(30);confetti(18)});

loadAll().catch(console.error);

db.channel("public-live-updates")
  .on("postgres_changes",{event:"*",schema:"public",table:"site_settings"},loadAll)
  .on("postgres_changes",{event:"*",schema:"public",table:"chapters"},loadAll)
  .on("postgres_changes",{event:"*",schema:"public",table:"gallery_items"},loadAll)
  .on("postgres_changes",{event:"*",schema:"public",table:"love_reasons"},loadAll)
  .subscribe();
