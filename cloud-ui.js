(() => {
  const style=document.createElement('style');style.textContent=`
  #owner-edit-reminder{position:absolute;left:12px;bottom:8px;z-index:5;pointer-events:none;color:#fff;font-size:clamp(7px,1.1vw,11px);line-height:1.5;text-shadow:-2px -2px 0 #000,-2px -1px 0 #000,-2px 0px 0 #000,-2px 1px 0 #000,-2px 2px 0 #000,-1px -2px 0 #000,-1px -1px 0 #000,-1px 0px 0 #000,-1px 1px 0 #000,-1px 2px 0 #000,0px -2px 0 #000,0px -1px 0 #000,0px 1px 0 #000,0px 2px 0 #000,1px -2px 0 #000,1px -1px 0 #000,1px 0px 0 #000,1px 1px 0 #000,1px 2px 0 #000,2px -2px 0 #000,2px -1px 0 #000,2px 0px 0 #000,2px 1px 0 #000,2px 2px 0 #000;}
  body.editing #owner-edit-reminder{display:none;}
  #browse-cloud-packs{position:absolute;bottom:7%;font-size:12px;}
  .hide-creator-assignment .creator-assignment,.hide-creator-assignment .admin-pack-delete{display:none;}
  .pack-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:16px;}
  .pack-grid .cloud-pack{word-break:break-word;box-sizing:border-box;}
  .pack-shell{border:2px solid #468;background:#183060;padding:10px;}
  .pack-grid .pack-card{display:flex;flex-direction:column;margin-top:0;padding:0;width:100%;border:0;background:transparent;}
  .pack-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px;margin-top:6px;}
  .pack-like{display:flex;align-items:center;justify-content:flex-start;gap:8px;background:transparent;border:0;padding:0;color:#fff;}
  .pack-like img{width:24px;height:24px;object-fit:contain;image-rendering:pixelated;}
  .pack-like[aria-pressed="true"]{color:#ffd850;border-color:#a4e4fc;}
  .pack-clear-star{color:#071328;font-size:28px;line-height:1;vertical-align:middle;}
  .pack-clear-star.cleared{color:#ffd850;}
  .pack-private{display:block;font-size:9px;line-height:1.4;color:#ffd850;}
  .pack-name{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:11px;line-height:1.5;height:3em;flex-shrink:0;}
  .pack-creator{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;height:2.8em;flex-shrink:0;}
  .pack-grid .pack-thumbnail{flex-shrink:0;height:auto;}
  .pack-thumbnail{display:block;width:100%;aspect-ratio:8/7;object-fit:cover;background:#000;margin-bottom:8px;image-rendering:pixelated;}
  .cloud-dialog{position:fixed;inset:0;z-index:100;background:#000c;display:flex;align-items:center;justify-content:center;}
  .cloud-box{position:relative;width:min(600px,92vw);max-height:85vh;overflow:auto;padding:38px 24px 24px;border:4px solid #a4e4fc;background:#071328;color:#fff;font-size:12px;line-height:1.8;}
  .cloud-box button{font:inherit;cursor:pointer;}.cloud-close{position:absolute;right:8px;top:6px;background:none;border:0;color:#fff;font-size:24px!important;}
  .cloud-pack{display:block;width:100%;margin-top:12px;padding:12px;background:#183060;border:2px solid #468;color:#fff;text-align:left;}
  .cloud-box a{color:#a4e4fc;overflow-wrap:anywhere;} .cloud-box input{width:100%;margin:12px 0;padding:10px;}
  body.pack-locked #browse-cloud-packs,body.pack-locked #ps-load-pack,body.pack-locked #ps-default-pack{display:none!important;}
  `;document.head.append(style);
  const login=document.createElement('a');login.href='Login.html';login.textContent='Must be logged in to create pack';login.hidden=true;login.style.cssText='position:absolute;bottom:2%;color:#a4e4fc;font-size:10px;';document.querySelector('.title-inner').append(login);
  window.showCreateLoginMessage=()=>{login.hidden=false;};

  document.addEventListener('keydown',e=>{
    if(!e.shiftKey||e.key.toLowerCase()!=='e'||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.isComposing)return;
    if(e.target.closest('input,textarea,select,[contenteditable]'))return;
    const dialogs=document.querySelectorAll('.cloud-dialog');if(!dialogs.length)return;
    e.preventDefault();e.stopImmediatePropagation();
    const box=dialogs[dialogs.length-1].querySelector('.cloud-box');
    if(box?.dataset.creatorAdmin==='true')box.classList.toggle('hide-creator-assignment');
  },true);
  let busy=false;
  function dialog(title,closable=true){const overlay=document.createElement('div');overlay.className='cloud-dialog';const box=document.createElement('div');box.className='cloud-box';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');const heading=document.createElement('h2');heading.textContent=title;heading.style.fontSize='14px';box.append(heading);overlay.append(box);document.body.append(overlay);if(closable){const close=document.createElement('button');close.className='cloud-close';close.textContent='×';close.setAttribute('aria-label','Close');close.onclick=()=>overlay.remove();box.append(close);}return {overlay,box};}
  document.getElementById('main-options').onclick=()=>{
    sfx();const {overlay,box}=dialog('OPTIONS');
    const tabs=document.createElement('div');tabs.className='settings-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Options');
    const panels=document.createElement('div');panels.style.cssText='display:grid;min-height:240px;';
    const sections=['audio','display'].map(name=>{const tab=document.createElement('button');tab.type='button';tab.id='main-options-tab-'+name;tab.textContent=name.toUpperCase();tab.setAttribute('role','tab');tab.setAttribute('aria-controls','main-options-panel-'+name);const panel=document.createElement('section');panel.id='main-options-panel-'+name;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.style.gridArea='1 / 1';tabs.append(tab);panels.append(panel);return {tab,panel};});
    const selectTab=index=>sections.forEach(({tab,panel},i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panel.style.visibility=i===index?'visible':'hidden';panel.inert=i!==index;panel.setAttribute('aria-hidden',String(i!==index));});
    sections.forEach(({tab},index)=>{tab.onclick=()=>{sfx();selectTab(index);};tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-index;selectTab(next);sections[next].tab.focus();};});selectTab(0);
    box.append(tabs,panels);const audioPanel=sections[0].panel,displayPanel=sections[1].panel;
    const update=()=>{applyMusicVolume();switchMusic(document.querySelector('.screen.active').id);};
    for(const [key,label,get] of [['music','MUSIC',optMusic],['sounds','SOUND EFFECTS',optSounds]]){
      const button=document.createElement('button');button.type='button';button.className='cloud-pack';
      const refresh=()=>{button.textContent=label+': '+(get()?'ON':'OFF');button.setAttribute('aria-pressed',String(!!get()));};
      button.onclick=()=>{playerAudio[key]=!get();savePlayerAudio();refresh();if(key==='music')update();};refresh();audioPanel.append(button);
    }
    const label=document.createElement('label');label.htmlFor='main-audio-volume';label.textContent='MUSIC & SFX VOLUME';
    const volume=document.createElement('input');volume.id=label.htmlFor;volume.type='range';volume.min=0;volume.max=100;volume.step=1;volume.value=optVolume();
    const value=document.createElement('output');value.htmlFor=volume.id;value.textContent=volume.value+'%';
    volume.oninput=()=>{playerAudio.volume=Number(volume.value);savePlayerAudio();value.textContent=volume.value+'%';update();};
    audioPanel.append(label,volume,value);
    const flash=document.createElement('button');flash.type='button';flash.id='main-flashing-border';flash.className='cloud-pack';
    const refreshFlash=()=>{const on=playerDisplay.flashingBorders!==false;flash.textContent='FLASHING BORDER: '+(on?'ON':'OFF');flash.setAttribute('aria-pressed',String(on));};
    flash.onclick=()=>{playerDisplay.flashingBorders=!(playerDisplay.flashingBorders!==false);savePlayerDisplay();document.body.classList.toggle('flashing-borders',playerDisplay.flashingBorders);refreshFlash();};refreshFlash();displayPanel.append(flash);box.querySelector('.cloud-close').focus();
    (async()=>{
      const localAdmin=location.protocol==='file:'&&window.localPackUser?.name==='SkyPilotSamurai';
      const admin=localAdmin||(await PackCloud.permissions()).admin;
      if(!admin||!overlay.isConnected)return;
      const row=document.createElement('div');row.className='opt-row';
      const label=document.createElement('label');label.htmlFor='main-border-flash-frames';label.textContent='BORDER FLASH INTERVAL (FRAMES)';
      const input=document.createElement('input');input.id=label.htmlFor;input.className='num';input.type='number';input.min=1;input.max=120;input.step=1;input.value=borderFlashFrames();input.style.width='80px';
      const note=document.createElement('p');note.style.fontSize='9px';
      const describe=()=>{note.textContent=borderFlashFrames()+' frames on / '+borderFlashFrames()+' frames off (60 FPS). Default: 8. Lower is faster.';};
      input.oninput=()=>{if(!input.value||!input.validity.valid)return;playerDisplay.borderFlashFrames=Number(input.value);savePlayerDisplay();applyBorderFlashRate();describe();};
      input.onchange=()=>{input.value=borderFlashFrames();};describe();row.append(label,input);displayPanel.append(row,note);
    })().catch(e=>console.error('Unable to check display admin access',e));
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();overlay.remove();document.getElementById('main-options').focus();}});
  };
  function status(box,text){let p=box.querySelector('.cloud-status');if(!p){p=document.createElement('p');p.className='cloud-status';p.setAttribute('role','status');box.append(p);}p.textContent=text;}
  function friendly(error){if(/permission|unauthorized/i.test(error.code||error.message))return 'Firebase access is not enabled yet. Apply the Level Pack Creator rules.';return error.message||'Unable to connect to Firebase. Please try again.';}
  function valid(pack){
    if(!pack||!Array.isArray(pack.levels)||pack.levels.length>100)throw Error('Invalid pack.');
    const assets=[pack.wily2Icon,pack.wily2Background,pack.packThumbnail,pack.customBorderDefault,pack.customBorderActive,pack.titleBackground,pack.selectBackground,pack.wilyBackground,pack.victoryBackground,pack.wilyIcon,...Object.values(pack.music||{}),...pack.levels.flatMap(l=>[l.image,l.localLevelUrl])];
    if(assets.some(v=>v&&(typeof v!=='string'||/["'<>\r\n]/.test(v)||(!/^(https:\/\/|data:(image|audio)\/|images\/|music\/|sounds\/|border\/)/.test(v)))))throw Error('Pack contains an unsupported asset path.');
    return pack;
  }
  const ownerReminder=document.createElement('div');ownerReminder.id='owner-edit-reminder';ownerReminder.textContent='SHIFT + E TO EDIT';ownerReminder.hidden=true;document.getElementById('screen-select').append(ownerReminder);
  let ownerReminderRequest=0;
  function refreshOwnerReminder(pack){
    const request=++ownerReminderRequest;ownerReminder.hidden=true;
    if(!pack.cloudSlug||!pack.cloudOwner)return;
    PackCloud.account().then(user=>{if(request!==ownerReminderRequest||CONFIG.cloudSlug!==pack.cloudSlug)return;ownerReminder.hidden=!(user&&!user.isAnonymous&&user.uid===pack.cloudOwner);}).catch(()=>{});
  }
  function install(pack){
    valid(pack);
    refreshOwnerReminder(pack);
    playPackMusicEnabled=true;
    CONFIG=Object.assign({},DEFAULTS,window.LEVEL_PACK||{},pack);
    CONFIG.music=Object.assign({},DEFAULTS.music,pack.music||{});
    CONFIG.levels=structuredClone(pack.levels);
    CONFIG.levelCount=Number(pack.levelCount??8);CONFIG.wilyStageCount=Number(pack.wilyStageCount??4);
    ensureLevelSlots();ensureSpecialStages();
    CONFIG.weapons=Array.from({length:12},(_,i)=>Object.assign({icon:i+1,levels:[],defaultWeapon:i===0},pack.weapons?.[i]));
    CONFIG.tankLevels=pack.tankLevels||{};
    state={beaten:{},weapons:{},tanks:{e:0,m:0},border:null,names:null,music:null,musicVolume:10,sounds:null};
    editMode=false;dirty=false;musicFadedForPlay=false;
    document.body.classList.remove('dirty');
    if(pack.cloudSlug&&location.protocol!=='file:'){
      history.replaceState(null,'',new URL('packcreator.html?pack='+encodeURIComponent(pack.cloudSlug),document.baseURI));
      window.directPack=pack.cloudSlug;document.body.classList.add('pack-locked');
    }
    document.querySelectorAll('.cloud-dialog').forEach(el=>el.remove());
    document.getElementById('pack-modal').classList.remove('open');
    document.getElementById('game-choice').hidden=true;document.getElementById('btn-start').hidden=false;
    showScreen('screen-title');applyConfig();
  }
  window.browseCloudPacks=async()=>{
    if(window.directPack)return;
    let clearedPacks={};try{clearedPacks=JSON.parse(localStorage.getItem('level-pack-cleared-v1')||'{}')||{};}catch{}
    const {box,overlay}=dialog('PLAY PACK');
    box.style.width='min(960px,92vw)';status(box,'Loading packs…');const grid=document.createElement('div');grid.className='pack-grid';box.append(grid);
    const likeButtons=new Map();
    const likesReady=PackCloud.likes?PackCloud.likes().then(data=>({data})).catch(()=>({error:true})):Promise.resolve({error:true});
    box.classList.add('hide-creator-assignment');
    try{box.dataset.creatorAdmin=String((await PackCloud.permissions()).admin);}catch{}

    try{const allPacks=await PackCloud.list();
    let viewer=null;try{viewer=await PackCloud.account();}catch{}
    const canSeePrivate=pack=>box.dataset.creatorAdmin==='true'||(location.protocol==='file:'&&!!window.localPackUser?.name)||!!(viewer&&!viewer.isAnonymous&&viewer.uid===pack.owner);
    const packs=allPacks.filter(pack=>pack.visibility!=='private'||canSeePrivate(pack));
    status(box,packs.length?'Choose a pack.':'No packs published yet.');for(const pack of packs){const button=document.createElement('button');button.className='cloud-pack pack-card';const name=document.createElement('span');name.className='pack-name';name.textContent=pack.name;name.title=pack.name;{const cleared=clearedPacks[pack.slug]===true;const star=document.createElement('span');star.className='pack-clear-star'+(cleared?' cleared':'');star.textContent='★';star.setAttribute('role','img');star.setAttribute('aria-label',cleared?'Pack cleared':'Pack not cleared');button._clearStar=star;}button.append(name);if(pack.visibility==='private'){const tag=document.createElement('span');tag.className='pack-private';tag.textContent='PRIVATE — NOT LISTED';button.append(tag);}const thumbnail=document.createElement('img');thumbnail.className='pack-thumbnail';thumbnail.alt='';button.prepend(thumbnail);PackCloud.load(pack.slug).then(data=>{valid(data);const paths=[data.packThumbnail,data.titleBackground].filter(Boolean).flatMap(p=>/^(data:|https:)/.test(p)||/\.[a-z0-9]+$/i.test(p)?[p]:[p+'.png',p+'.jpg',p+'.gif',p+'.webp']);let i=0;thumbnail.onerror=()=>{if(i<paths.length)thumbnail.src=paths[i++];else thumbnail.removeAttribute('src');};if(paths.length)thumbnail.src=paths[i++];}).catch(()=>{});button.onclick=async()=>{sfx();button.disabled=true;status(box,'Loading pack…');try{install(await PackCloud.load(pack.slug));}catch(e){button.disabled=false;status(box,friendly(e));}};const row=document.createElement('div');row.style.position='relative';const shell=document.createElement('div');shell.className='pack-shell';shell.append(button);row.append(shell);const creator=document.createElement('div');creator.className='pack-creator';creator.style.cssText='font-size:9px;line-height:1.4;margin-top:4px;overflow-wrap:anywhere;color:#a4e4fc;';creator.textContent=pack.owner?'Creator: …':'Creator: Unassigned';button.append(creator);if(pack.owner)PackCloud.creatorName(pack.owner).then(name=>{creator.textContent='Creator: '+name;}).catch(()=>{creator.textContent='Creator: Unknown';});
      const like=document.createElement('button');like.type='button';like.className='pack-like';like.disabled=true;
      const likeImage=document.createElement('img');likeImage.src='images/Like.png';likeImage.alt='';
      const likeCount=document.createElement('span');likeCount.textContent='…';like.append(likeImage,likeCount);const footer=document.createElement('div');footer.className='pack-footer';footer.append(like);if(button._clearStar){footer.append(button._clearStar);delete button._clearStar;}shell.append(footer);
      const updateLike=entry=>{likeCount.textContent=String(entry.count);like.setAttribute('aria-pressed',String(entry.liked));like.setAttribute('aria-label',(entry.liked?'Unlike ':'Like ')+pack.name+' ('+entry.count+' likes)');like.disabled=false;};
      likeButtons.set(pack.slug,updateLike);
      like.onclick=async()=>{const liked=like.getAttribute("aria-pressed")!=="true";like.disabled=true;sfx();try{updateLike(await PackCloud.like(pack.slug,liked));}catch(e){like.disabled=false;status(box,e.message==='Sign in to like packs.'?(location.protocol==='file:'?'Likes need your real online login. The local user file only enables editing.':e.message):(/permission|denied/i.test(e.code||e.message)?'Likes are blocked by the database rules. Publish the updated Realtime Database rules.':typeof PackCloud.like!=='function'?'Update cloud-service.js and refresh the page.':'Unable to save like. Please try again.'));}};
      const access=await PackCloud.permissions(pack.slug);
      if(access.edit||access.admin){
        const remove=document.createElement('button');remove.textContent='×';if(access.admin&&pack.owner!==(await PackCloud.account())?.uid)remove.classList.add('admin-pack-delete');remove.setAttribute('aria-label','Delete '+pack.name);remove.style.cssText='position:absolute;right:8px;top:8px;background:none;border:0;color:white;font-size:24px;cursor:pointer;';
        remove.onclick=()=>{
          const confirmation=dialog('Are you sure you want to delete '+pack.name+'?');
          const yes=document.createElement('button');yes.className='cloud-pack';yes.textContent='DELETE PACK';
          const cancel=document.createElement('button');cancel.className='cloud-pack';cancel.textContent='CANCEL';cancel.onclick=()=>confirmation.overlay.remove();
          yes.onclick=async()=>{yes.disabled=true;remove.disabled=true;button.disabled=true;try{await PackCloud.remove(pack.slug);row.remove();confirmation.overlay.remove();status(box,box.querySelector('.cloud-pack')?'Choose a pack.':'No packs published yet.');}catch(e){yes.disabled=false;remove.disabled=false;button.disabled=false;status(confirmation.box,friendly(e));}};
          confirmation.box.append(yes,cancel);
        };row.append(remove);
      }
      if(access.admin){const assign=document.createElement('button');assign.className='cloud-pack creator-assignment';assign.textContent='ASSIGN CREATOR';assign.onclick=async()=>{const d=dialog('ASSIGN CREATOR');try{const select=document.createElement('select');select.style.maxWidth='100%';for(const person of await PackCloud.users()){const option=document.createElement('option');option.value=person.uid;option.textContent=person.name;option.selected=person.uid===pack.owner;select.append(option);}const apply=document.createElement('button');apply.className='cloud-pack';apply.textContent='SAVE CREATOR';apply.onclick=async()=>{try{await PackCloud.assign(pack.slug,select.value);d.overlay.remove();}catch(e){status(d.box,friendly(e));}};d.box.append(select,apply);}catch(e){status(d.box,friendly(e));}};row.append(assign);}
      grid.append(row);}
      likesReady.then(result=>{if(!overlay.isConnected)return;if(result.error){for(const button of grid.querySelectorAll(".pack-like")){button.querySelector("span").textContent="—";button.title="Click to retry liking this pack";button.disabled=false;button.setAttribute("aria-label","Like pack");}return;}for(const [slug,update] of likeButtons)update(result.data[slug]||{count:0,liked:false});});}
    catch(e){status(box,friendly(e));}
  };

  window.saveCloudPack=async()=>{
    if(busy||(window.directPack&&!editMode))return;
    let name=CONFIG.cloudName;if(!name){name=prompt('Pack name for publishing:',CONFIG.packName||'');if(!name?.trim())return;name=name.trim();}
    busy=true;const {box,overlay}=dialog('SAVE PACK',false);status(box,'Connecting…');
    try{
      const pack=JSON.parse(serializePack().replace(/^window\.LEVEL_PACK\s*=\s*/,'').replace(/;\s*$/,''));
      const saved=await PackCloud.publish(pack,name,text=>status(box,text));
      // Keep local edits in memory; subsequent saves reuse uploaded URLs from the snapshot.
      Object.assign(CONFIG,saved);
      dirty=false;document.body.classList.remove('dirty');status(box,saved.visibility==='private'?'Pack saved as PRIVATE. It is not listed and only you can open it:':'Pack saved and live. Share this link:');
      const link=document.createElement('a');link.href=new URL('packcreator.html?pack='+encodeURIComponent(saved.cloudSlug),document.baseURI).href;link.textContent=link.href;box.append(link);
    }catch(e){console.error('Pack save failed',{code:e.code||'',message:e.message||'',slug:CONFIG.cloudSlug||'',name});status(box,'Error saving pack');}
    finally{busy=false;const close=document.createElement('button');close.className='cloud-pack';close.textContent='CLOSE';close.onclick=()=>overlay.remove();box.append(close);}
  };
  if(window.directPack){
    document.body.classList.add('pack-locked');
    const {box,overlay}=dialog('LOADING PACK',false);
    if(!/^[a-z0-9][a-z0-9-]{0,69}$/.test(window.directPack)){status(box,'Pack not found.');return;}
    PackCloud.load(window.directPack).then(pack=>{
      valid(pack);
      if(CONFIG.cloudSlug!==pack.cloudSlug||CONFIG.cloudRevision!==pack.cloudRevision)install(pack);
      else overlay.remove();
    }).catch(e=>status(box,friendly(e)));
  }
})();
