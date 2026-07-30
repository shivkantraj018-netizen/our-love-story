
const { createClient } = supabase;
const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const esc = (v) => v ?? "";

function seedStars() {
  const wrap = $("#stars");
  if (!wrap || wrap.dataset.ready) return;
  wrap.dataset.ready = "1";
  for (let i=0;i<95;i++){
    const el=document.createElement("span");
    el.className="star";
    const size=Math.random()*2.8+1;
    el.style.width=`${size}px`;el.style.height=`${size}px`;
    el.style.left=`${Math.random()*100}%`;el.style.top=`${Math.random()*100}%`;
    el.style.animationDelay=`${Math.random()*4}s`;
    wrap.appendChild(el);
  }
  const petals=$("#petals");
  for (let i=0;i<18;i++){
    const p=document.createElement("span");p.className="petal";
    p.style.left=`${Math.random()*100}%`;p.style.animationDuration=`${12+Math.random()*12}s`;
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
  if (settings) {
    const map = Object.fromEntries(settings.map(x=>[x.key,x.value]));
    $("#heroTitle").textContent = map.heroTitle || "Our Love Story ♥";
    $("#heroHeadline").textContent = map.heroHeadline || "Some people spend their whole life searching for someone who makes their heart feel at home.";
    $("#heroSubline").textContent = map.heroSubline || "I found mine.";
    $("#finalTitle").textContent = map.finalTitle || "In every lifetime, I would still choose you. ❤️";
    $("#finalText").textContent = map.finalText || "Thank you for being my favorite chapter of life.";
    $("#countdownTitle").textContent = map.countdownTitle || "Our next little forever";
    $("#musicTitle").textContent = map.musicTitle || "A song for us";
    $("#musicNote").textContent = map.musicNote || "";
    const audio=$("#music");
    if(map.musicUrl){
      audio.src=map.musicUrl;
      audio.style.display="block";
      audio.load();
    } else {
      audio.removeAttribute("src");
      audio.style.display="none";
    }
    startCountdown(map.countdownAt);
  }
  renderNav(chapters || []);
  renderChapters(chapters || []);
  renderGallery(gallery || []);
  renderReasons(reasons || []);
  return {settings,chapters,gallery,reasons};
}

function renderNav(chapters){
  const nav=$("#chapterNav");nav.innerHTML="";
  chapters.forEach(c=>{
    const b=document.createElement("button");b.className="nav-btn";b.textContent=c.eyebrow||c.title;
    b.onclick=()=>document.getElementById(`chapter-${c.id}`)?.scrollIntoView({behavior:"smooth",block:"center"});
    nav.appendChild(b);
  });
}

function renderChapters(chapters){
  const wrap=$("#chapters");wrap.innerHTML="";
  chapters.forEach(c=>{
    const s=document.createElement("section");s.className="special-section";s.id=`chapter-${c.id}`;
    s.innerHTML=`<article class="chapter-card glass">
      <div class="eyebrow"></div><h3></h3><p></p>
    </article>`;
    s.querySelector(".eyebrow").textContent=esc(c.eyebrow);
    s.querySelector("h3").textContent=esc(c.title);
    s.querySelector("p").textContent=esc(c.content);
    wrap.appendChild(s);
  });
}

function renderGallery(items){
  const wrap=$("#gallery");wrap.innerHTML="";
  if(!items.length){wrap.innerHTML='<div class="reason" style="grid-column:1/-1">Your photos will appear here after you upload them from the private admin panel.</div>';return}
  items.forEach(x=>{
    const d=document.createElement("figure");d.className="gallery-item";
    d.innerHTML=`<img loading="lazy" alt="">`;
    d.querySelector("img").src=x.public_url; d.querySelector("img").alt=x.caption||"A memory";
    wrap.appendChild(d);
  });
}

function renderReasons(items){
  const wrap=$("#reasons");wrap.innerHTML="";
  items.forEach((x,i)=>{
    const d=document.createElement("div");d.className="reason";d.textContent=`${i+1}. ${x.reason}`;wrap.appendChild(d);
  });
}

function startCountdown(iso){
  if(!iso){$("#countdownSection").style.display="none";return}
  $("#countdownSection").style.display="";
  const tick=()=>{
    const ms=new Date(iso).getTime()-Date.now();
    if(ms<=0){["d","h","m","s"].forEach(id=>$("#"+id).textContent="0");return}
    const days=Math.floor(ms/86400000),hours=Math.floor(ms%86400000/3600000),mins=Math.floor(ms%3600000/60000),secs=Math.floor(ms%60000/1000);
    $("#d").textContent=days;$("#h").textContent=hours;$("#m").textContent=mins;$("#s").textContent=secs;
  };
  tick();clearInterval(window._countdown);window._countdown=setInterval(tick,1000)
}

$("#beginBtn").addEventListener("click",()=>document.querySelector(".section-intro")?.scrollIntoView({behavior:"smooth"}));
$("#brandButton").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));

loadAll().catch(console.error);

db.channel("public-live-updates")
  .on("postgres_changes",{event:"*",schema:"public",table:"site_settings"},loadAll)
  .on("postgres_changes",{event:"*",schema:"public",table:"chapters"},loadAll)
  .on("postgres_changes",{event:"*",schema:"public",table:"gallery_items"},loadAll)
  .on("postgres_changes",{event:"*",schema:"public",table:"love_reasons"},loadAll)
  .subscribe();
