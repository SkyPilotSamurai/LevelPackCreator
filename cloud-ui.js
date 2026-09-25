(() => {
  const style=document.createElement('style');style.textContent=`
  #browse-cloud-packs{position:absolute;bottom:7%;font-size:12px;}
  .cloud-dialog{position:fixed;inset:0;z-index:100;background:#000c;display:flex;align-items:center;justify-content:center;}
  .cloud-box{position:relative;width:min(600px,92vw);max-height:85vh;overflow:auto;padding:38px 24px 24px;border:4px solid #a4e4fc;background:#071328;color:#fff;font-size:12px;line-height:1.8;}
  .cloud-box button{font:inherit;cursor:pointer;}.cloud-close{position:absolute;right:8px;top:6px;background:none;border:0;color:#fff;font-size:24px!important;}
  .cloud-pack{display:block;width:100%;margin-top:12px;padding:12px;background:#183060;border:2px solid #468;color:#fff;text-align:left;}
  .cloud-box a{color:#a4e4fc;overflow-wrap:anywhere;} .cloud-box input{width:100%;margin:12px 0;padding:10px;}
  body.pack-locked #browse-cloud-packs,body.pack-locked #ps-load-pack,body.pack-locked #ps-default-pack{display:none!important;}
  `;document.head.append(style);
  let busy=false;
  function dialog(title,closable=true){const overlay=document.createElement('div');overlay.className='cloud-dialog';const box=document.createElement('div');box.className='cloud-box';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');const heading=document.createElement('h2');heading.textContent=title;heading.style.fontSize='14px';box.append(heading);overlay.append(box);document.body.append(overlay);if(closable){const close=document.createElement('button');close.className='cloud-close';close.textContent='×';close.setAttribute('aria-label','Close');close.onclick=()=>overlay.remove();box.append(close);}return {overlay,box};}
  function status(box,text){let p=box.querySelector('.cloud-status');if(!p){p=document.createElement('p');p.className='cloud-status';p.setAttribute('role','status');box.append(p);}p.textContent=text;}
  function friendly(error){if(/permission|unauthorized/i.test(error.code||error.message))return 'Firebase access is not enabled yet. Apply the Level Pack Creator rules.';return error.message||'Unable to connect to Firebase. Please try again.';}
  function valid(pack){
    if(!pack||!Array.isArray(pack.levels)||pack.levels.length>100)throw Error('Invalid pack.');
    const assets=[pack.customBorderDefault,pack.customBorderActive,pack.titleBackground,pack.selectBackground,pack.wilyBackground,pack.victoryBackground,pack.wilyIcon,...Object.values(pack.music||{}),...pack.levels.flatMap(l=>[l.image,l.localLevelUrl])];
    if(assets.some(v=>v&&(typeof v!=='string'||/["'<>\r\n]/.test(v)||(!/^(https:\/\/|data:(image|audio)\/|images\/|music\/|sounds\/|border\/)/.test(v)))))throw Error('Pack contains an unsupported asset path.');
    return pack;
  }
  function install(pack){
    valid(pack);
    CONFIG=Object.assign({},DEFAULTS,window.LEVEL_PACK||{},pack);
    CONFIG.music=Object.assign({},DEFAULTS.music,pack.music||{});
    CONFIG.levels=structuredClone(pack.levels);
    CONFIG.levelCount=Number(pack.levelCount??8);CONFIG.wilyStageCount=Number(pack.wilyStageCount??4);
    ensureLevelSlots();
    CONFIG.weapons=Array.from({length:12},(_,i)=>Object.assign({icon:i+1,levels:[]},pack.weapons?.[i]));
    CONFIG.tankLevels=pack.tankLevels||{};
    state={beaten:{},weapons:{},tanks:{e:0,m:0},border:null,names:null,music:null,musicVolume:10,sounds:null};
    editMode=false;dirty=false;musicFadedForPlay=false;
    document.body.classList.remove('dirty');
    if(pack.cloudSlug&&location.protocol!=='file:'){
      history.replaceState(null,'',new URL(encodeURIComponent(pack.cloudSlug),document.baseURI));
      window.directPack=pack.cloudSlug;document.body.classList.add('pack-locked');
    }
    document.querySelectorAll('.cloud-dialog').forEach(el=>el.remove());
    document.getElementById('pack-modal').classList.remove('open');
    showScreen('screen-title');applyConfig();
  }
  window.browseCloudPacks=async()=>{
    if(window.directPack)return;
    const {box}=dialog('LOAD PACK');status(box,'Loading packs…');
    try{const packs=await PackCloud.list();status(box,packs.length?'Choose a pack.':'No packs published yet.');for(const pack of packs){const button=document.createElement('button');button.className='cloud-pack';button.textContent=pack.name;button.onclick=async()=>{button.disabled=true;status(box,'Loading pack…');try{install(await PackCloud.load(pack.slug));}catch(e){button.disabled=false;status(box,friendly(e));}};const row=document.createElement('div');row.style.position='relative';row.append(button);
      {
        button.style.paddingRight='48px';const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Delete '+pack.name);remove.style.cssText='position:absolute;right:8px;top:8px;background:none;border:0;color:white;font-size:24px;cursor:pointer;';
        remove.onclick=()=>{
          const confirmation=dialog('Are you sure you want to delete '+pack.name+'?');
          const yes=document.createElement('button');yes.className='cloud-pack';yes.textContent='DELETE PACK';
          const cancel=document.createElement('button');cancel.className='cloud-pack';cancel.textContent='CANCEL';cancel.onclick=()=>confirmation.overlay.remove();
          yes.onclick=async()=>{yes.disabled=true;remove.disabled=true;button.disabled=true;try{await PackCloud.remove(pack.slug);row.remove();confirmation.overlay.remove();status(box,box.querySelector('.cloud-pack')?'Choose a pack.':'No packs published yet.');}catch(e){yes.disabled=false;remove.disabled=false;button.disabled=false;status(confirmation.box,friendly(e));}};
          confirmation.box.append(yes,cancel);
        };row.append(remove);
      }
      box.append(row);}}
    catch(e){status(box,friendly(e));}
  };
  document.getElementById('browse-cloud-packs').onclick=window.browseCloudPacks;
  window.saveCloudPack=async()=>{
    if(busy||(window.directPack&&!editMode))return;
    let name=CONFIG.cloudName;if(!name){name=prompt('Pack name for publishing:',CONFIG.packName||'');if(!name?.trim())return;name=name.trim();}
    busy=true;const {box,overlay}=dialog('SAVE PACK',false);status(box,'Connecting…');
    try{
      const pack=JSON.parse(serializePack().replace(/^window\.LEVEL_PACK\s*=\s*/,'').replace(/;\s*$/,''));
      const saved=await PackCloud.publish(pack,name,text=>status(box,text));
      // Keep local edits in memory; subsequent saves reuse uploaded URLs from the snapshot.
      Object.assign(CONFIG,saved);
      dirty=false;document.body.classList.remove('dirty');status(box,'Pack saved. Share this link:');
      const link=document.createElement('a');link.href=new URL(encodeURIComponent(saved.cloudSlug),'https://skypilotsamurai.github.io/LevelPackCreator/').href;link.textContent=link.href;box.append(link);
    }catch(e){status(box,friendly(e));}
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
