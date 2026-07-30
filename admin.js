
const { createClient } = supabase;
const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
let currentUser = null;
let cache = { settings: {}, chapters: [], reasons: [], gallery: [] };

function showBanner(text, ok=true){
  const el=$("#saveBanner");el.textContent=(ok?"✓ ":"⚠ ")+text;el.classList.remove("hidden");
  clearTimeout(window.bannerTimer);window.bannerTimer=setTimeout(()=>el.classList.add("hidden"),3200)
}

async function checkSession(){
  const {data:{session}}=await db.auth.getSession();
  if(session){currentUser=session.user;await verifyAdmin();} else {$("#loginPanel").hidden=false}
}
async function verifyAdmin(){
  const {data,error}=await db.from("admins").select("user_id").eq("user_id",currentUser.id).maybeSingle();
  if(error||!data){await db.auth.signOut();$("#loginPanel").hidden=false;$("#loginMsg").textContent="This account is not an owner/admin account.";return}
  $("#loginPanel").hidden=true;$("#adminPanel").hidden=false;await loadAll()
}

$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#loginMsg").textContent="Signing in…";
  const {data,error}=await db.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});
  if(error){$("#loginMsg").textContent=error.message;return}
  currentUser=data.user;await verifyAdmin()
});
$("#logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();location.reload()});

async function loadAll(){
  const [{data:settings},{data:chapters},{data:reasons},{data:gallery}]=await Promise.all([
    db.from("site_settings").select("*"),
    db.from("chapters").select("*").order("sort_order"),
    db.from("love_reasons").select("*").order("sort_order"),
    db.from("gallery_items").select("*").order("sort_order")
  ]);
  cache.settings=Object.fromEntries((settings||[]).map(x=>[x.key,x.value]));
  cache.chapters=chapters||[];cache.reasons=reasons||[];cache.gallery=gallery||[];
  fillSettings();renderChapterEditors();renderReasonEditors();renderGalleryEditors()
}

function fillSettings(){
  $("#heroTitleInput").value=cache.settings.heroTitle||"";
  $("#heroHeadlineInput").value=cache.settings.heroHeadline||"";
  $("#heroSublineInput").value=cache.settings.heroSubline||"";
  $("#finalTitleInput").value=cache.settings.finalTitle||"";
  $("#finalTextInput").value=cache.settings.finalText||"";
  $("#countdownTitleInput").value=cache.settings.countdownTitle||"";
  const dt=cache.settings.countdownAt;$("#countdownAtInput").value=dt?new Date(dt).toISOString().slice(0,16):"";
  $("#musicTitleInput").value=cache.settings.musicTitle||"";
  $("#musicNoteInput").value=cache.settings.musicNote||"";
  $("#musicUrlInput").value=cache.settings.musicUrl||"";
  $("#settingsSaved").textContent="No unsaved changes";
}

async function upsertSetting(key,value){
  const {error}=await db.from("site_settings").upsert({key,value,updated_at:new Date().toISOString()});
  if(error)throw error
}

$("#saveSettingsBtn").addEventListener("click",async()=>{
  try{
    $("#saveSettingsBtn").disabled=true;$("#saveSettingsBtn").textContent="Saving…";
    const values={
      heroTitle:$("#heroTitleInput").value.trim(),heroHeadline:$("#heroHeadlineInput").value.trim(),heroSubline:$("#heroSublineInput").value.trim(),
      finalTitle:$("#finalTitleInput").value.trim(),finalText:$("#finalTextInput").value.trim(),countdownTitle:$("#countdownTitleInput").value.trim(),
      countdownAt:$("#countdownAtInput").value?new Date($("#countdownAtInput").value).toISOString():null,
      musicTitle:$("#musicTitleInput").value.trim(),musicNote:$("#musicNoteInput").value.trim(),musicUrl:$("#musicUrlInput").value.trim()
    };
    for(const [k,v] of Object.entries(values)) await upsertSetting(k,v);
    $("#settingsSaved").textContent="✓ Saved successfully — just now";showBanner("Settings saved successfully.");
    await loadAll();
  }catch(err){$("#settingsSaved").textContent="⚠ "+err.message;showBanner(err.message,false)}
  finally{$("#saveSettingsBtn").disabled=false;$("#saveSettingsBtn").textContent="Save changes"}
});

function renderChapterEditors(){
  const wrap=$("#chapterEditorList");wrap.innerHTML="";
  cache.chapters.forEach((c,i)=>{
    const row=document.createElement("div");row.className="editor-row";
    row.innerHTML=`<div class="editor-row-head"><div class="editor-row-title">${i+1}. ${escapeHtml(c.title)}</div><div class="editor-actions">
      <button class="mini-btn" data-action="up">↑</button><button class="mini-btn" data-action="down">↓</button><button class="mini-btn" data-action="delete">Delete</button>
    </div></div>
    <div class="chapter-editor">
      <label>Eyebrow<input data-field="eyebrow" value="${escapeAttr(c.eyebrow||"")}"></label>
      <label>Title<input data-field="title" value="${escapeAttr(c.title||"")}"></label>
      <label style="grid-column:1/-1">Content<textarea data-field="content" rows="7">${escapeHtml(c.content||"")}</textarea></label>
    </div>
    <button class="save-btn" data-action="save">Save chapter</button><div class="saved-state" data-status></div>`;
    row.querySelector('[data-action="save"]').onclick=()=>saveChapter(c.id,row);
    row.querySelector('[data-action="delete"]').onclick=()=>deleteChapter(c.id);
    row.querySelector('[data-action="up"]').onclick=()=>moveChapter(c.id,-1);
    row.querySelector('[data-action="down"]').onclick=()=>moveChapter(c.id,1);
    wrap.appendChild(row)
  })
}

async function saveChapter(id,row){
  const payload={eyebrow:row.querySelector('[data-field="eyebrow"]').value.trim(),title:row.querySelector('[data-field="title"]').value.trim(),content:row.querySelector('[data-field="content"]').value};
  const btn = row.querySelector('[data-action="save"]'); const status = row.querySelector("[data-status]");
  btn.disabled=true;btn.textContent="Saving…";
  const {error}=await db.from("chapters").update(payload).eq("id",id);
  btn.disabled=false;btn.textContent="Save chapter";
  if(error){status.textContent="⚠ "+error.message;showBanner(error.message,false);return}
  status.textContent="✓ Saved successfully — just now";showBanner("Chapter saved.")
}

async function deleteChapter(id){
  if(!confirm("Delete this chapter permanently?"))return;
  const {error}=await db.from("chapters").delete().eq("id",id);
  if(error){showBanner(error.message,false);return}
  showBanner("Chapter deleted.");await loadAll()
}
async function moveChapter(id,delta){
  const sorted=[...cache.chapters].sort((a,b)=>a.sort_order-b.sort_order);const idx=sorted.findIndex(x=>x.id===id),j=idx+delta;
  if(j<0||j>=sorted.length)return;
  const a=sorted[idx],b=sorted[j];const temp=a.sort_order;a.sort_order=b.sort_order;b.sort_order=temp;
  const {error}=await Promise.all([db.from("chapters").update({sort_order:a.sort_order}).eq("id",a.id),db.from("chapters").update({sort_order:b.sort_order}).eq("id",b.id)]).then(()=>({error:null})).catch(err=>({error:err}));
  if(error){showBanner(String(error),false);return}await loadAll();showBanner("Chapter order saved.")
}
$("#addChapterBtn").addEventListener("click",async()=>{
  const max=Math.max(-1,...cache.chapters.map(x=>x.sort_order||0));
  const {data,error}=await db.from("chapters").insert({eyebrow:"NEW CHAPTER",title:"New chapter",content:"Write your story here…",sort_order:max+1,visible:true}).select().single();
  if(error){showBanner(error.message,false);return}cache.chapters.push(data);renderChapterEditors();showBanner("New chapter added. Save it when you're done.")
});

function renderReasonEditors(){
  const wrap=$("#reasonEditorList");wrap.innerHTML="";
  cache.reasons.forEach((r,i)=>{
    const row=document.createElement("div");row.className="editor-row";
    row.innerHTML=`<div class="editor-row-head"><div class="editor-row-title">${i+1}. Reason</div><div class="editor-actions">
      <button class="mini-btn" data-action="up">↑</button><button class="mini-btn" data-action="down">↓</button><button class="mini-btn" data-action="delete">Delete</button></div></div>
      <label>Reason<textarea rows="2">${escapeHtml(r.reason||"")}</textarea></label>
      <button class="save-btn" data-action="save">Save reason</button><div class="saved-state" data-status></div>`;
    row.querySelector('[data-action="save"]').onclick=async()=>{
      const btn = row.querySelector('[data-action="save"]'); const status = row.querySelector("[data-status]"); btn.disabled=true; btn.textContent="Saving…";
      const {error}=await db.from("love_reasons").update({reason:row.querySelector("textarea").value}).eq("id",r.id);
      btn.disabled=false;btn.textContent="Save reason";status.textContent=error?"⚠ "+error.message:"✓ Saved successfully — just now";showBanner(error?error.message:"Reason saved!",!error);if(!error)await loadAll()
    };
    row.querySelector('[data-action="delete"]').onclick=async()=>{if(confirm("Delete this reason?")){const {error}=await db.from("love_reasons").delete().eq("id",r.id);if(error)showBanner(error.message,false);else await loadAll()}};
    row.querySelector('[data-action="up"]').onclick=()=>moveReason(r.id,-1);
    row.querySelector('[data-action="down"]').onclick=()=>moveReason(r.id,1);
    wrap.appendChild(row)
  })
}
async function moveReason(id,delta){
  const sorted=[...cache.reasons].sort((a,b)=>a.sort_order-b.sort_order);const idx=sorted.findIndex(x=>x.id===id),j=idx+delta;if(j<0||j>=sorted.length)return;
  const a=sorted[idx],b=sorted[j];const t=a.sort_order;a.sort_order=b.sort_order;b.sort_order=t;
  await db.from("love_reasons").update({sort_order:a.sort_order}).eq("id",a.id);await db.from("love_reasons").update({sort_order:b.sort_order}).eq("id",b.id);await loadAll()
}
$("#addReasonBtn").addEventListener("click",async()=>{
  const max=Math.max(-1,...cache.reasons.map(x=>x.sort_order||0));const {error}=await db.from("love_reasons").insert({reason:"Write your reason here…",sort_order:max+1,visible:true});
  if(error)showBanner(error.message,false);else {await loadAll();showBanner("Reason added.")}
});

async function renderGalleryEditors(){
  const wrap=$("#galleryEditorList");wrap.innerHTML="";
  cache.gallery.forEach((g)=>{
    const card=document.createElement("div");card.className="gallery-admin-card";
    card.innerHTML=`<img src="${escapeAttr(g.public_url)}" alt="">
      <div class="gallery-admin-body"><label>Caption<textarea rows="2">${escapeHtml(g.caption||"")}</textarea></label>
      <div class="editor-actions"><button class="mini-btn" data-save>Save caption</button><button class="mini-btn" data-delete>Delete photo</button></div><div class="saved-state" data-status></div></div>`;
    card.querySelector("[data-save]").onclick=async()=>{const btn=card.querySelector("[data-save]"),status=card.querySelector("[data-status]");btn.disabled=true;const {error}=await db.from("gallery_items").update({caption:card.querySelector("textarea").value}).eq("id",g.id);btn.disabled=false;status.textContent=error?"⚠ "+error.message:"✓ Saved successfully — just now";showBanner(error?error.message:"Caption saved.",!error)};
    card.querySelector("[data-delete]").onclick=async()=>{if(!confirm("Delete this photo?"))return;await db.from("gallery_items").delete().eq("id",g.id);await db.storage.from("site-media").remove([g.storage_path]);await loadAll();showBanner("Photo deleted.")};
    wrap.appendChild(card)
  })
}

$("#photoUpload").addEventListener("change",async e=>{
  const files=[...e.target.files]; if(!files.length)return;
  for(const file of files){
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();const path=`${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from("site-media").upload(path,file,{upsert:false,contentType:file.type});
    if(up.error){showBanner(up.error.message,false);continue}
    const {data:pub}=db.storage.from("site-media").getPublicUrl(path);
    const max=Math.max(-1,...cache.gallery.map(x=>x.sort_order||0));
    const {error}=await db.from("gallery_items").insert({storage_path:path,public_url:pub.publicUrl,caption:file.name.replace(/\.[^.]+$/,""),sort_order:max+1,visible:true});
    if(error){await db.storage.from("site-media").remove([path]);showBanner(error.message,false)}
  }
  e.target.value="";await loadAll();showBanner("Photo upload complete.")
});

$("#passwordForm").addEventListener("submit",async e=>{
  e.preventDefault();const a=$("#newPassword").value,b=$("#confirmPassword").value;if(a!==b){$("#passwordSaved").textContent="⚠ Passwords do not match.";return}
  const {error}=await db.auth.updateUser({password:a});$("#passwordSaved").textContent=error?"⚠ "+error.message:"✓ Password updated successfully.";showBanner(error?error.message:"Password changed.",!error);if(!error)e.target.reset()
});

function escapeHtml(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function escapeAttr(s){return escapeHtml(s).replace(/'/g,"&#39;")}

checkSession();
