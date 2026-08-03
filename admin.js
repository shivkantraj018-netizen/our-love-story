const { createClient } = supabase;
const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const TEXT_FIELDS=[
["storyEyebrow","Story eyebrow","OUR STORY"],["storyTitle","Story title","Every chapter is ours."],["storyIntro","Story intro","Scroll slowly. Every memory is a little piece of home."],
["photosEyebrow","Photos eyebrow","PHOTOS"],["photosTitle","Photos title","Little pieces of us"],["letterEyebrow","Love Letter eyebrow","A LETTER FOR YOU"],["letterSoundHint","Letter hint","Tap to open ♥"],
["reasonsEyebrow","100 Reasons eyebrow","100 REASONS"],["reasonsTitle","100 Reasons title","Open them one by one."],["reasonsIntro","100 Reasons intro","Every envelope has a little piece of my heart. Tap one to open it. 💌"],
["giftEyebrow","Gift eyebrow","A LITTLE SURPRISE"],["secretEyebrow","Secret eyebrow","A LITTLE SECRET"],["gameEyebrow","Game eyebrow","A LITTLE GAME"],
["commentEyebrow","Comments eyebrow","A LITTLE NOTE FROM YOU"],["commentIntro","Comments intro","Leave me a message. Only I can read what you write. ❤️"],
["countdownEyebrow","Countdown eyebrow","UNTIL NEXT TIME"],["musicEyebrow","Music eyebrow","OUR SONG"],["endingEyebrow","Ending eyebrow","Forever, my love"],["footerText","Footer text","Made with all my love."]
];

let currentUser = null;
let cache = { settings:{}, chapters:[], reasons:[], gallery:[] };
function safeSetValue(sel, value){ const el=$(sel); if(el) el.value=value ?? ""; }
function safeSetChecked(sel, value){ const el=$(sel); if(el) el.checked=!!value; }
const GALLERY_PRIVACY_DEFAULTS = { enabled:false, title:"Our Precious Memories ❤️", description:"Only someone who truly knows our journey can unlock these memories.", question:"What is our special password?", hint:"Use the answer you know from our journey.", answer:"", wrongTitle:"Wrong answer", wrongMessage:"That is not the correct answer. Try again.", maxAttempts:3, cooldownMinutes:15 };

function showBanner(text,ok=true){
  const el=$("#saveBanner");
  el.textContent=(ok?"✓ ":"⚠ ")+text;
  el.classList.remove("hidden");
  clearTimeout(window.bannerTimer);
  window.bannerTimer=setTimeout(()=>el.classList.add("hidden"),3200);
}

async function checkSession(){
  const {data:{session}}=await db.auth.getSession();
  if(session){currentUser=session.user;await verifyAdmin();}
}

async function verifyAdmin(){
  const {data,error}=await db.from("admins").select("user_id").eq("user_id",currentUser.id).maybeSingle();
  if(error||!data){
    await db.auth.signOut();
    $("#loginPanel").hidden=false;
    $("#loginMsg").textContent="This account is not an owner/admin account.";
    return;
  }
  $("#loginPanel").hidden=true;
  $("#adminPanel").hidden=false;
  await loadAll();
}

$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  $("#loginMsg").textContent="Signing in…";
  const {data,error}=await db.auth.signInWithPassword({
    email:$("#email").value.trim(),
    password:$("#password").value
  });
  if(error){$("#loginMsg").textContent=error.message;return;}
  currentUser=data.user;
  await verifyAdmin();
});

$("#logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();location.reload();});

async function loadAll(){
  const [{data:settings},{data:chapters},{data:reasons},{data:gallery}]=await Promise.all([
    db.from("site_settings").select("*"),
    db.from("chapters").select("*").order("sort_order"),
    db.from("love_reasons").select("*").order("sort_order"),
    db.from("gallery_items").select("*").order("sort_order")
  ]);

  cache.settings=Object.fromEntries((settings||[]).map(x=>[x.key,x.value]));
  cache.chapters=chapters||[];
  cache.reasons=reasons||[];
  cache.gallery=gallery||[];

  fillAdminFields();
  renderMusicState();
  renderGiftState();
  renderChapterEditors();
  renderReasonEditors();
  renderGalleryEditors();
  renderTextSettings();
  renderPlaylistNav();
  await loadComments();
}

function formatLocalDateTime(iso){
  if(!iso)return "";
  const d=new Date(iso);if(Number.isNaN(d.getTime()))return "";
  const p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function renderTextSettings(){
  const wrap=$("#textSettingsList");if(!wrap)return;wrap.innerHTML="";
  TEXT_FIELDS.forEach(([key,label,def])=>{
    const row=document.createElement("label");row.className="text-setting-row";
    row.innerHTML=`<span>${escapeHtml(label)}</span><input data-text-key="${escapeAttr(key)}">`;
    row.querySelector("input").value=cache.settings[key]??def;wrap.appendChild(row);
  });
}

function fillAdminFields(){
  $("#heroTitleInput").value=cache.settings.heroTitle||"";
  $("#heroHeadlineInput").value=cache.settings.heroHeadline||"";
  $("#heroSublineInput").value=cache.settings.heroSubline||"";
  $("#romanticNoteInput").value=cache.settings.romanticNote||"Every tap leaves a little heart behind.";
  $("#finalTitleInput").value=cache.settings.finalTitle||"";
  $("#finalTextInput").value=cache.settings.finalText||"";
  $("#countdownTitleInput").value=cache.settings.countdownTitle||"";
  $("#commentTitleInput").value=cache.settings.commentTitle||"Your thoughts";
  $("#reasonsEyebrowInput").value=cache.settings.reasonsEyebrow||"100 REASONS";
  $("#reasonsTitleInput").value=cache.settings.reasonsTitle||"100 Reasons I Love You";
  $("#reasonsIntroInput").value=cache.settings.reasonsIntro||"Tap a number to open it. Long messages can be scrolled inside the envelope. 💌";
  $("#gameTitleInput").value=cache.settings.gameTitle||"Catch My Heart ❤️";
  $("#gameIntroInput").value=cache.settings.gameIntro||"You have 20 seconds. Catch as many hearts as you can.";
  const dt=cache.settings.countdownAt;
  $("#countdownAtInput").value=dt?formatLocalDateTime(dt):"";

  $("#loveLetterTitleInput").value=cache.settings.loveLetterTitle||"A Love Letter";
  $("#loveLetterBodyInput").value=cache.settings.loveLetterBody||"";

  $("#giftTitleInput").value=cache.settings.giftTitle||"A Gift For You 🎁";
  $("#giftHintInput").value=cache.settings.giftHint||"There is something inside. Tap the gift when you are ready.";
  $("#giftPoemInput").value=cache.settings.giftPoem||"";

  $("#secretTitleInput").value=cache.settings.secretTitle||"Tap my heart when you miss me.";
  $("#secretMessageInput").value=cache.settings.secretMessage||"No matter how far away you are, a piece of my heart is always with you.";

  safeSetChecked("#siteThemeEnabledInput", cache.settings.siteThemeEnabled===undefined ? true : (cache.settings.siteThemeEnabled===true || cache.settings.siteThemeEnabled==="true" || cache.settings.siteThemeEnabled===1 || cache.settings.siteThemeEnabled==="1"));
  safeSetValue("#siteThemePresetInput", cache.settings.siteThemePreset||"cherry");
  safeSetChecked("#heroCinematicEnabledInput", cache.settings.heroCinematicEnabled===undefined ? true : (cache.settings.heroCinematicEnabled===true || cache.settings.heroCinematicEnabled==="true" || cache.settings.heroCinematicEnabled===1 || cache.settings.heroCinematicEnabled==="1"));
  safeSetChecked("#starsEnabledInput", cache.settings.starsEnabled===undefined ? true : (cache.settings.starsEnabled===true || cache.settings.starsEnabled==="true" || cache.settings.starsEnabled===1 || cache.settings.starsEnabled==="1"));
  safeSetChecked("#petalsEnabledInput", cache.settings.petalsEnabled===undefined ? true : (cache.settings.petalsEnabled===true || cache.settings.petalsEnabled==="true" || cache.settings.petalsEnabled===1 || cache.settings.petalsEnabled==="1"));
  safeSetChecked("#firefliesEnabledInput", cache.settings.firefliesEnabled===undefined ? true : (cache.settings.firefliesEnabled===true || cache.settings.firefliesEnabled==="true" || cache.settings.firefliesEnabled===1 || cache.settings.firefliesEnabled==="1"));
  safeSetChecked("#shootingStarsEnabledInput", cache.settings.shootingStarsEnabled===undefined ? true : (cache.settings.shootingStarsEnabled===true || cache.settings.shootingStarsEnabled==="true" || cache.settings.shootingStarsEnabled===1 || cache.settings.shootingStarsEnabled==="1"));
  safeSetChecked("#tapEffectsEnabledInput", cache.settings.tapEffectsEnabled===undefined ? true : (cache.settings.tapEffectsEnabled===true || cache.settings.tapEffectsEnabled==="true" || cache.settings.tapEffectsEnabled===1 || cache.settings.tapEffectsEnabled==="1"));
  safeSetChecked("#journeyRibbonEnabledInput", cache.settings.journeyRibbonEnabled===undefined ? true : (cache.settings.journeyRibbonEnabled===true || cache.settings.journeyRibbonEnabled==="true" || cache.settings.journeyRibbonEnabled===1 || cache.settings.journeyRibbonEnabled==="1"));
  safeSetChecked("#memorySkyEnabledInput", cache.settings.memorySkyEnabled===undefined ? true : (cache.settings.memorySkyEnabled===true || cache.settings.memorySkyEnabled==="true" || cache.settings.memorySkyEnabled===1 || cache.settings.memorySkyEnabled==="1"));
  safeSetChecked("#memorySkyEnabledInput", cache.settings.memorySkyEnabled===undefined ? true : (cache.settings.memorySkyEnabled===true || cache.settings.memorySkyEnabled==="true" || cache.settings.memorySkyEnabled===1 || cache.settings.memorySkyEnabled==="1"));

  $("#galleryLockEnabledInput").checked=cache.settings.galleryLockEnabled===true||cache.settings.galleryLockEnabled==="true";
  $("#galleryLockTitleInput").value=cache.settings.galleryLockTitle||GALLERY_PRIVACY_DEFAULTS.title;
  $("#galleryLockDescriptionInput").value=cache.settings.galleryLockDescription||GALLERY_PRIVACY_DEFAULTS.description;
  $("#galleryLockQuestionInput").value=cache.settings.galleryLockQuestion||GALLERY_PRIVACY_DEFAULTS.question;
  $("#galleryLockHintInput").value=cache.settings.galleryLockHint||GALLERY_PRIVACY_DEFAULTS.hint;
  $("#galleryLockAnswerInput").value=cache.settings.galleryLockAnswer||GALLERY_PRIVACY_DEFAULTS.answer;
  $("#galleryLockWrongTitleInput").value=cache.settings.galleryLockWrongTitle||GALLERY_PRIVACY_DEFAULTS.wrongTitle;
  $("#galleryLockWrongMessage1Input").value=cache.settings.galleryLockWrongMessage1||cache.settings.galleryLockWrongMessage||"Oops, you missed 💗";
  $("#galleryLockWrongMessage2Input").value=cache.settings.galleryLockWrongMessage2||cache.settings.galleryLockWrongMessage||"Keep going, if you know us you can open it ✨";
  $("#galleryLockWrongMessage3Input").value=cache.settings.galleryLockWrongMessage3||cache.settings.galleryLockWrongMessage||"Try one more time, cutie — last chance 🌷";
  $("#galleryLockMaxAttemptsInput").value=cache.settings.galleryLockMaxAttempts||GALLERY_PRIVACY_DEFAULTS.maxAttempts;
  $("#galleryLockCooldownInput").value=cache.settings.galleryLockCooldownMinutes||GALLERY_PRIVACY_DEFAULTS.cooldownMinutes;

  $("#musicTitleInput").value=cache.settings.musicTitle||"A song for us";
  $("#musicNoteInput").value=cache.settings.musicNote||"";
  $("#playlistTitleInput").value=cache.settings.playlistTitle||"My playlist";
  $("#playlistNoteInput").value=cache.settings.playlistNote||"A small note for the playlist";
  $("#musicPlaylistInput").value=cache.settings.musicPlaylist||"[]";
  $("#playlistTitleInput").value=cache.settings.playlistTitle||"My playlist";
  $("#playlistNoteInput").value=cache.settings.playlistNote||"";
  $("#musicPlaylistInput").value=cache.settings.musicPlaylist||"[]";

  ["settingsSaved","letterSaved","giftSaved","secretSaved","musicSaved"].forEach(id=>{
    const el=$("#"+id);
    if(el) el.textContent="No unsaved changes";
  });
}

async function upsertSetting(key,value){
  const {error}=await db.from("site_settings").upsert({
    key,
    value,
    updated_at:new Date().toISOString()
  });
  if(error) throw error;
}

async function saveSettingsGroup(values,buttonId,statusId,successMessage){
  const btn=$("#"+buttonId);
  const status=$("#"+statusId);
  try{
    btn.disabled=true;
    btn.textContent="Saving…";
    for(const [k,v] of Object.entries(values)) await upsertSetting(k,v);
    status.textContent="✓ Saved successfully — just now";
    showBanner(successMessage);
    await loadAll();
  }catch(err){
    status.textContent="⚠ "+(err.message||String(err));
    showBanner(err.message||String(err),false);
  }finally{
    btn.disabled=false;
    btn.textContent=buttonId==="saveSettingsBtn"?"Save hero & final"
      :buttonId==="saveLetterBtn"?"Save love letter"
      :buttonId==="saveGiftBtn"?"Save gift"
      :buttonId==="saveSecretBtn"?"Save secret"
      :buttonId==="saveGalleryPrivacyBtn"?"Save gallery privacy"
      :"Save song text";
  }
}

$("#saveSettingsBtn").addEventListener("click",()=>saveSettingsGroup({
  heroTitle:$("#heroTitleInput").value.trim(),
  heroHeadline:$("#heroHeadlineInput").value.trim(),
  heroSubline:$("#heroSublineInput").value.trim(),
  romanticNote:$("#romanticNoteInput").value.trim(),
  finalTitle:$("#finalTitleInput").value.trim(),
  finalText:$("#finalTextInput").value.trim(),
  countdownTitle:$("#countdownTitleInput").value.trim(),
  countdownAt:$("#countdownAtInput").value?new Date($("#countdownAtInput").value).toISOString():null,
  commentTitle:$("#commentTitleInput").value.trim(),
  reasonsEyebrow:$("#reasonsEyebrowInput").value.trim(),
  reasonsTitle:$("#reasonsTitleInput").value.trim(),
  reasonsIntro:$("#reasonsIntroInput").value.trim(),
  gameTitle:$("#gameTitleInput").value.trim(),
  gameIntro:$("#gameIntroInput").value.trim()
},"saveSettingsBtn","settingsSaved","Hero, game and viewer comment settings saved."));

$("#saveLetterBtn").addEventListener("click",()=>saveSettingsGroup({
  loveLetterTitle:$("#loveLetterTitleInput").value.trim(),
  loveLetterBody:$("#loveLetterBodyInput").value
},"saveLetterBtn","letterSaved","Love letter saved."));

$("#saveGiftBtn").addEventListener("click",()=>saveSettingsGroup({
  giftTitle:$("#giftTitleInput").value.trim(),
  giftHint:$("#giftHintInput").value.trim(),
  giftPoem:$("#giftPoemInput").value
},"saveGiftBtn","giftSaved","Gift message saved."));

$("#saveSecretBtn").addEventListener("click",()=>saveSettingsGroup({
  secretTitle:$("#secretTitleInput").value.trim(),
  secretMessage:$("#secretMessageInput").value
},"saveSecretBtn","secretSaved","Secret message saved."));




$("#saveMagicBtn").addEventListener("click",()=>saveSettingsGroup({
  siteThemeEnabled:$("#siteThemeEnabledInput").checked,
  siteThemePreset:$("#siteThemePresetInput").value,
  heroCinematicEnabled:$("#heroCinematicEnabledInput").checked,
  starsEnabled:$("#starsEnabledInput").checked,
  petalsEnabled:$("#petalsEnabledInput").checked,
  firefliesEnabled:$("#firefliesEnabledInput").checked,
  shootingStarsEnabled:$("#shootingStarsEnabledInput").checked,
  tapEffectsEnabled:$("#tapEffectsEnabledInput").checked,
  journeyRibbonEnabled:$("#journeyRibbonEnabledInput").checked,
  memorySkyEnabled:$("#memorySkyEnabledInput").checked
},"saveMagicBtn","magicSaved","Magic settings saved."));
$("#saveGalleryPrivacyBtn").addEventListener("click",()=>saveSettingsGroup({
  galleryLockEnabled:$("#galleryLockEnabledInput").checked,
  galleryLockTitle:$("#galleryLockTitleInput").value.trim(),
  galleryLockDescription:$("#galleryLockDescriptionInput").value.trim(),
  galleryLockQuestion:$("#galleryLockQuestionInput").value.trim(),
  galleryLockHint:$("#galleryLockHintInput").value.trim(),
  galleryLockAnswer:$("#galleryLockAnswerInput").value.trim(),
  galleryLockWrongTitle:$("#galleryLockWrongTitleInput").value.trim(),
  galleryLockWrongMessage1:$("#galleryLockWrongMessage1Input").value.trim(),
  galleryLockWrongMessage2:$("#galleryLockWrongMessage2Input").value.trim(),
  galleryLockWrongMessage3:$("#galleryLockWrongMessage3Input").value.trim(),
  galleryLockWrongMessage:$("#galleryLockWrongMessage1Input").value.trim(),
  galleryLockMaxAttempts:Math.max(1,parseInt($("#galleryLockMaxAttemptsInput").value||"3",10)),
  galleryLockCooldownMinutes:Math.max(0,parseInt($("#galleryLockCooldownInput").value||"15",10))
},"saveGalleryPrivacyBtn","galleryPrivacySaved","Gallery privacy saved."));

$("#saveMusicBtn").addEventListener("click",()=>saveSettingsGroup({
  musicTitle:$("#musicTitleInput").value.trim(),
  musicNote:$("#musicNoteInput").value.trim()
},"saveMusicBtn","musicSaved","Song text saved."));

function renderMusicState(){
  const url=cache.settings.musicUrl||"";
  const name=cache.settings.musicName||"";
  const preview=$("#adminMusicPreview");
  const status=$("#currentMusicStatus");
  const nameEl=$("#currentMusicName");
  if(!preview||!status||!nameEl) return;

  if(url){
    preview.src=url;
    preview.style.display="block";
    preview.load();
    nameEl.textContent=name||"Uploaded song";
    status.textContent="Ready. Replace or delete it anytime.";
  }else{
    preview.removeAttribute("src");
    preview.style.display="none";
    nameEl.textContent="No song uploaded";
    status.textContent="Upload any browser-supported audio file.";
  }
}

$("#musicUpload").addEventListener("change",async e=>{
  const file=e.target.files?.[0];
  if(!file) return;

  try{
    const ext=(file.name.split(".").pop()||"bin").toLowerCase();
    const path=`music/${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from("site-music").upload(path,file,{
      upsert:false,
      contentType:file.type||"application/octet-stream"
    });
    if(up.error) throw up.error;

    const {data:pub}=db.storage.from("site-music").getPublicUrl(path);
    const oldPath=cache.settings.musicStoragePath;
    if(oldPath) await db.storage.from("site-music").remove([oldPath]);

    await upsertSetting("musicStoragePath",path);
    await upsertSetting("musicUrl",pub.publicUrl);
    await upsertSetting("musicName",file.name);

    showBanner("Song uploaded and saved successfully.");
    await loadAll();
  }catch(err){
    showBanner(err.message||String(err),false);
  }finally{
    e.target.value="";
  }
});

$("#deleteMusicBtn").addEventListener("click",async()=>{
  if(!cache.settings.musicUrl){showBanner("There is no uploaded song to delete.",false);return;}
  if(!confirm("Delete the current song?")) return;

  try{
    const oldPath=cache.settings.musicStoragePath;
    if(oldPath) await db.storage.from("site-music").remove([oldPath]);
    await upsertSetting("musicStoragePath","");
    await upsertSetting("musicUrl","");
    await upsertSetting("musicName","");
    showBanner("Song deleted.");
    await loadAll();
  }catch(err){showBanner(err.message||String(err),false);}
});

function renderGiftState(){
  const img=$("#giftAdminPreview");
  const noImg=$("#giftAdminNoImage");
  const url=cache.settings.giftImageUrl||"";
  if(url){
    img.src=url;
    img.hidden=false;
    noImg.hidden=true;
  }else{
    img.hidden=true;
    img.removeAttribute("src");
    noImg.hidden=false;
  }
}

$("#giftPhotoUpload").addEventListener("change",async e=>{
  const file=e.target.files?.[0];
  if(!file) return;
  try{
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=`gift/${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from("site-media").upload(path,file,{
      upsert:false,
      contentType:file.type||"image/*"
    });
    if(up.error) throw up.error;

    const {data:pub}=db.storage.from("site-media").getPublicUrl(path);
    const oldPath=cache.settings.giftImagePath;
    if(oldPath) await db.storage.from("site-media").remove([oldPath]);

    await upsertSetting("giftImagePath",path);
    await upsertSetting("giftImageUrl",pub.publicUrl);
    showBanner("Gift photo uploaded and saved.");
    await loadAll();
  }catch(err){
    showBanner(err.message||String(err),false);
  }finally{
    e.target.value="";
  }
});

$("#deleteGiftPhotoBtn").addEventListener("click",async()=>{
  const oldPath=cache.settings.giftImagePath;
  if(!oldPath){showBanner("There is no gift photo to delete.",false);return;}
  if(!confirm("Delete the gift photo?")) return;

  try{
    await db.storage.from("site-media").remove([oldPath]);
    await upsertSetting("giftImagePath","");
    await upsertSetting("giftImageUrl","");
    showBanner("Gift photo deleted.");
    await loadAll();
  }catch(err){showBanner(err.message||String(err),false);}
});

function renderChapterEditors(){
  const wrap=$("#chapterEditorList");
  wrap.innerHTML="";
  cache.chapters.forEach((c,i)=>{
    const row=document.createElement("div");
    row.className="editor-row";
    row.innerHTML=`
      <div class="editor-row-head">
        <div class="editor-row-title">${i+1}. ${escapeHtml(c.title)}</div>
        <div class="editor-actions">
          <button class="mini-btn" data-action="up" type="button">↑</button>
          <button class="mini-btn" data-action="down" type="button">↓</button>
          <button class="mini-btn" data-action="delete" type="button">Delete</button>
        </div>
      </div>
      <div class="chapter-editor">
        <label>Eyebrow<input data-field="eyebrow" value="${escapeAttr(c.eyebrow||"")}"></label>
        <label>Title<input data-field="title" value="${escapeAttr(c.title||"")}"></label>
        <label style="grid-column:1/-1">Content<textarea data-field="content" rows="8">${escapeHtml(c.content||"")}</textarea></label>
      </div>
      <button class="save-btn" data-action="save" type="button">Save chapter</button>
      <div class="saved-state" data-status>No unsaved changes</div>`;
    row.querySelector('[data-action="save"]').onclick=()=>saveChapter(c.id,row);
    row.querySelector('[data-action="delete"]').onclick=()=>deleteChapter(c.id);
    row.querySelector('[data-action="up"]').onclick=()=>moveChapter(c.id,-1);
    row.querySelector('[data-action="down"]').onclick=()=>moveChapter(c.id,1);
    wrap.appendChild(row);
  });
}

async function saveChapter(id,row){
  const btn=row.querySelector('[data-action="save"]');
  const status=row.querySelector("[data-status]");
  btn.disabled=true;
  btn.textContent="Saving…";

  const payload={
    eyebrow:row.querySelector('[data-field="eyebrow"]').value.trim(),
    title:row.querySelector('[data-field="title"]').value.trim(),
    content:row.querySelector('[data-field="content"]').value
  };

  const {error}=await db.from("chapters").update(payload).eq("id",id);
  btn.disabled=false;
  btn.textContent="Save chapter";

  if(error){
    status.textContent="⚠ "+error.message;
    showBanner(error.message,false);
    return;
  }
  status.textContent="✓ Saved successfully — just now";
  showBanner("Chapter saved.");
  await loadAll();
}

async function deleteChapter(id){
  if(!confirm("Delete this chapter permanently?")) return;
  const {error}=await db.from("chapters").delete().eq("id",id);
  if(error){showBanner(error.message,false);return;}
  showBanner("Chapter deleted.");
  await loadAll();
}

async function moveChapter(id,delta){
  const sorted=[...cache.chapters].sort((a,b)=>a.sort_order-b.sort_order);
  const idx=sorted.findIndex(x=>x.id===id);
  const j=idx+delta;
  if(idx<0||j<0||j>=sorted.length) return;

  const a=sorted[idx],b=sorted[j];
  const aOrder=a.sort_order,bOrder=b.sort_order;
  let r=await db.from("chapters").update({sort_order:bOrder}).eq("id",a.id);
  if(r.error){showBanner(r.error.message,false);return;}
  r=await db.from("chapters").update({sort_order:aOrder}).eq("id",b.id);
  if(r.error){showBanner(r.error.message,false);return;}
  await loadAll();
  showBanner("Chapter order saved.");
}

$("#addChapterBtn").addEventListener("click",async()=>{
  const max=Math.max(-1,...cache.chapters.map(x=>x.sort_order||0));
  const {error}=await db.from("chapters").insert({
    eyebrow:"NEW CHAPTER",
    title:"New chapter",
    content:"Write your story here…",
    sort_order:max+1,
    visible:true
  });
  if(error){showBanner(error.message,false);return;}
  await loadAll();
  showBanner("New chapter added.");
});

function renderReasonEditors(){
  const wrap=$("#reasonEditorList");
  wrap.innerHTML="";
  cache.reasons.forEach((r,i)=>{
    const row=document.createElement("div");
    row.className="editor-row";
    row.innerHTML=`
      <div class="editor-row-head">
        <div class="editor-row-title">Envelope #${i+1}</div>
        <div class="editor-actions">
          <button class="mini-btn" data-action="up" type="button">↑</button>
          <button class="mini-btn" data-action="down" type="button">↓</button>
          <button class="mini-btn" data-action="delete" type="button">Delete</button>
        </div>
      </div>
      <label>Reason<textarea rows="3">${escapeHtml(r.reason||"")}</textarea></label>
      <button class="save-btn" data-action="save" type="button">Save envelope</button>
      <div class="saved-state" data-status>No unsaved changes</div>`;
    row.querySelector('[data-action="save"]').onclick=async()=>{
      const btn=row.querySelector('[data-action="save"]');
      const status=row.querySelector("[data-status]");
      btn.disabled=true;
      btn.textContent="Saving…";
      const {error}=await db.from("love_reasons").update({reason:row.querySelector("textarea").value}).eq("id",r.id);
      btn.disabled=false;
      btn.textContent="Save envelope";
      status.textContent=error?"⚠ "+error.message:"✓ Saved successfully — just now";
      showBanner(error?error.message:"Envelope saved.",!error);
      if(!error) await loadAll();
    };
    row.querySelector('[data-action="delete"]').onclick=async()=>{
      if(!confirm("Delete this envelope?"))return;
      const {error}=await db.from("love_reasons").delete().eq("id",r.id);
      if(error) showBanner(error.message,false);
      else {await loadAll();showBanner("Envelope deleted.");}
    };
    row.querySelector('[data-action="up"]').onclick=()=>moveReason(r.id,-1);
    row.querySelector('[data-action="down"]').onclick=()=>moveReason(r.id,1);
    wrap.appendChild(row);
  });
}

async function moveReason(id,delta){
  const sorted=[...cache.reasons].sort((a,b)=>a.sort_order-b.sort_order);
  const idx=sorted.findIndex(x=>x.id===id);
  const j=idx+delta;
  if(idx<0||j<0||j>=sorted.length) return;
  const a=sorted[idx],b=sorted[j];
  const aOrder=a.sort_order,bOrder=b.sort_order;

  let r=await db.from("love_reasons").update({sort_order:bOrder}).eq("id",a.id);
  if(r.error){showBanner(r.error.message,false);return;}
  r=await db.from("love_reasons").update({sort_order:aOrder}).eq("id",b.id);
  if(r.error){showBanner(r.error.message,false);return;}
  await loadAll();
}

$("#addReasonBtn").addEventListener("click",async()=>{
  const max=Math.max(-1,...cache.reasons.map(x=>x.sort_order||0));
  const {error}=await db.from("love_reasons").insert({
    reason:"Write your reason here…",
    sort_order:max+1,
    visible:true
  });
  if(error) showBanner(error.message,false);
  else {await loadAll();showBanner("New envelope added.");}
});

async function renderGalleryEditors(){
  const wrap=$("#galleryEditorList");
  wrap.innerHTML="";
  cache.gallery.forEach(g=>{
    const card=document.createElement("div");
    card.className="gallery-admin-card";
    card.innerHTML=`
      <img src="${escapeAttr(g.public_url)}" alt="">
      <div class="gallery-admin-body">
        <label>Caption<textarea rows="2">${escapeHtml(g.caption||"")}</textarea></label>
        <div class="editor-actions">
          <button class="mini-btn" data-save type="button">Save caption</button>
          <button class="mini-btn" data-delete type="button">Delete photo</button>
        </div>
        <div class="saved-state" data-status>No unsaved changes</div>
      </div>`;
    card.querySelector("[data-save]").onclick=async()=>{
      const btn=card.querySelector("[data-save]");
      const status=card.querySelector("[data-status]");
      btn.disabled=true;
      btn.textContent="Saving…";
      const {error}=await db.from("gallery_items").update({caption:card.querySelector("textarea").value}).eq("id",g.id);
      btn.disabled=false;
      btn.textContent="Save caption";
      status.textContent=error?"⚠ "+error.message:"✓ Saved successfully — just now";
      showBanner(error?error.message:"Caption saved.",!error);
    };
    card.querySelector("[data-delete]").onclick=async()=>{
      if(!confirm("Delete this photo?"))return;
      const r=await db.from("gallery_items").delete().eq("id",g.id);
      if(r.error){showBanner(r.error.message,false);return;}
      if(g.storage_path) await db.storage.from("site-media").remove([g.storage_path]);
      await loadAll();
      showBanner("Photo deleted.");
    };
    wrap.appendChild(card);
  });
}

$("#photoUpload").addEventListener("change",async e=>{
  const files=[...e.target.files];
  if(!files.length) return;

  for(const file of files){
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=`${crypto.randomUUID()}.${ext}`;

    const up=await db.storage.from("site-media").upload(path,file,{
      upsert:false,
      contentType:file.type||"image/*"
    });
    if(up.error){showBanner(up.error.message,false);continue;}

    const {data:pub}=db.storage.from("site-media").getPublicUrl(path);
    const max=Math.max(-1,...cache.gallery.map(x=>x.sort_order||0));
    const {error}=await db.from("gallery_items").insert({
      storage_path:path,
      public_url:pub.publicUrl,
      caption:file.name.replace(/\.[^.]+$/,""),
      sort_order:max+1,
      visible:true
    });
    if(error){
      await db.storage.from("site-media").remove([path]);
      showBanner(error.message,false);
    }
  }
  e.target.value="";
  await loadAll();
  showBanner("Photo upload complete.");
});

async function loadComments(){
  const wrap=$("#commentAdminList"); if(!wrap)return;
  const {data,error}=await db.from("comments").select("*").order("created_at",{ascending:false});
  if(error){wrap.innerHTML='<div class="muted">Could not load comments.</div>';return;}
  if(!data?.length){wrap.innerHTML='<div class="muted">No viewer messages yet.</div>';return;}
  wrap.innerHTML=""; data.forEach(c=>{
    const card=document.createElement("article"); card.className="comment-admin-card";
    card.innerHTML=`<div class="comment-meta"><strong>${escapeHtml(c.name||"Anonymous")}</strong><span>${escapeHtml(new Date(c.created_at).toLocaleString())}</span></div><p>${escapeHtml(c.message||"")}</p><button class="mini-btn danger" type="button">Delete</button>`;
    card.querySelector("button").onclick=async()=>{if(!confirm("Delete this viewer message?"))return;const {error}=await db.from("comments").delete().eq("id",c.id);if(error){showBanner(error.message,false);return;}showBanner("Viewer message deleted.");await loadComments();}; wrap.appendChild(card);
  });
}
$("#clearAllCommentsBtn").addEventListener("click",async()=>{if(!confirm("Delete ALL viewer messages? This cannot be undone."))return;const {error}=await db.from("comments").delete().neq("id","00000000-0000-0000-0000-000000000000");if(error){showBanner(error.message,false);return;}showBanner("All viewer messages deleted.");await loadComments();});

$("#saveTextBtn").addEventListener("click",async()=>{
  const btn=$("#saveTextBtn"),status=$("#textSaved");
  try{
    btn.disabled=true;btn.textContent="Saving…";
    for(const input of document.querySelectorAll("[data-text-key]")) await upsertSetting(input.dataset.textKey,input.value);
    status.textContent="✓ All website text saved successfully — just now";
    showBanner("All website text saved.");await loadAll();
  }catch(err){status.textContent="⚠ "+(err.message||String(err));showBanner(err.message||String(err),false);}
  finally{btn.disabled=false;btn.textContent="Save all website text";}
});

$("#passwordForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const a=$("#newPassword").value;
  const b=$("#confirmPassword").value;
  if(a!==b){$("#passwordSaved").textContent="⚠ Passwords do not match.";return;}
  const {error}=await db.auth.updateUser({password:a});
  $("#passwordSaved").textContent=error?"⚠ "+error.message:"✓ Password updated successfully.";
  showBanner(error?error.message:"Password changed.",!error);
  if(!error)e.target.reset();
});

function escapeHtml(s){
  return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escapeAttr(s){return escapeHtml(s).replace(/'/g,"&#39;");}

function initAdminDock(){
  const dock=$("#adminDock");if(!dock)return;
  dock.querySelectorAll("[data-admin-section]").forEach(btn=>btn.addEventListener("click",()=>{
    document.getElementById(btn.dataset.adminSection)?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
}
initAdminDock();
checkSession();


function parsePlaylistJson(text){
  try{
    const arr = JSON.parse(text || "[]");
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}

function renderPlaylistPreview(){
  const preview=$("#playlistSaved");
  const list=parsePlaylistJson($("#musicPlaylistInput")?.value||"[]");
  if(preview) preview.textContent = `${list.length} song${list.length===1?"":"s"} in playlist.`;
}

$("#playlistUpload").addEventListener("change",async e=>{
  const files=[...e.target.files||[]];
  if(!files.length) return;
  try{
    const current=parsePlaylistJson($("#musicPlaylistInput").value||"[]");
    for(const file of files){
      const ext=(file.name.split(".").pop()||"bin").toLowerCase();
      const path=`playlist/${crypto.randomUUID()}.${ext}`;
      const up=await db.storage.from("site-music").upload(path,file,{
        upsert:false,
        contentType:file.type||"application/octet-stream"
      });
      if(up.error) throw up.error;
      const {data:pub}=db.storage.from("site-music").getPublicUrl(path);
      current.push({
        title:file.name.replace(/\.[^.]+$/,""),
        note:"",
        storage_path:path,
        public_url:pub.publicUrl
      });
    }
    $("#musicPlaylistInput").value=JSON.stringify(current,null,2);
    renderPlaylistPreview();
    showBanner("Songs uploaded. Save playlist now.");
  }catch(err){
    showBanner(err.message||String(err),false);
  }finally{
    e.target.value="";
  }
});

$("#clearPlaylistBtn").addEventListener("click",()=>{
  $("#musicPlaylistInput").value="[]";
  renderPlaylistPreview();
});

$("#savePlaylistBtn").addEventListener("click",()=>saveSettingsGroup({
  playlistTitle:$("#playlistTitleInput").value.trim(),
  playlistNote:$("#playlistNoteInput").value.trim(),
  musicPlaylist:$("#musicPlaylistInput").value.trim()
},"savePlaylistBtn","playlistSaved","Playlist saved."));

