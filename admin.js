const { createClient } = supabase;
const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
let currentUser = null;
let cache = { settings:{}, chapters:[], reasons:[], gallery:[] };

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
}

function fillAdminFields(){
  $("#heroTitleInput").value=cache.settings.heroTitle||"";
  $("#heroHeadlineInput").value=cache.settings.heroHeadline||"";
  $("#heroSublineInput").value=cache.settings.heroSubline||"";
  $("#finalTitleInput").value=cache.settings.finalTitle||"";
  $("#finalTextInput").value=cache.settings.finalText||"";
  $("#countdownTitleInput").value=cache.settings.countdownTitle||"";
  const dt=cache.settings.countdownAt;
  $("#countdownAtInput").value=dt?new Date(dt).toISOString().slice(0,16):"";

  $("#loveLetterTitleInput").value=cache.settings.loveLetterTitle||"A Love Letter";
  $("#loveLetterBodyInput").value=cache.settings.loveLetterBody||"";

  $("#giftTitleInput").value=cache.settings.giftTitle||"A Gift For You 🎁";
  $("#giftHintInput").value=cache.settings.giftHint||"There is something inside. Tap the gift when you are ready.";
  $("#giftPoemInput").value=cache.settings.giftPoem||"";

  $("#secretTitleInput").value=cache.settings.secretTitle||"Tap my heart when you miss me.";
  $("#secretMessageInput").value=cache.settings.secretMessage||"No matter how far away you are, a piece of my heart is always with you.";

  $("#musicTitleInput").value=cache.settings.musicTitle||"A song for us";
  $("#musicNoteInput").value=cache.settings.musicNote||"";

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
      :"Save song text";
  }
}

$("#saveSettingsBtn").addEventListener("click",()=>saveSettingsGroup({
  heroTitle:$("#heroTitleInput").value.trim(),
  heroHeadline:$("#heroHeadlineInput").value.trim(),
  heroSubline:$("#heroSublineInput").value.trim(),
  finalTitle:$("#finalTitleInput").value.trim(),
  finalText:$("#finalTextInput").value.trim(),
  countdownTitle:$("#countdownTitleInput").value.trim(),
  countdownAt:$("#countdownAtInput").value?new Date($("#countdownAtInput").value).toISOString():null
},"saveSettingsBtn","settingsSaved","Hero and final settings saved."));

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

checkSession();
