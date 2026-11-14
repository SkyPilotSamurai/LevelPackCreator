/* Firebase transport, isolated from the MegaSpeedruns application. */
window.PackCloud = (() => {
  const config = {apiKey:'AIzaSyC2pHhSThFkKhN-c1sdhUATt1-zmNLV9sw',authDomain:'megaspeedrunsdatabase.firebaseapp.com',databaseURL:'https://megaspeedrunsdatabase-default-rtdb.firebaseio.com',projectId:'megaspeedrunsdatabase',storageBucket:'megaspeedrunsdatabase.firebasestorage.app',messagingSenderId:'545413984550',appId:'1:545413984550:web:79c899026a21f6343091e7'};
  let ready;
  async function sdk(){
    if(!ready)ready=(async()=>{
      const base='https://www.gstatic.com/firebasejs/12.19.0/';
      const [app,auth,db,storage]=await Promise.all(['app','auth','database','storage'].map(n=>import(base+'firebase-'+n+'.js')));
      const project=app.getApps().length?app.getApp():app.initializeApp(config);
      return {auth,userAuth:auth.getAuth(project),db,storage,database:db.getDatabase(project),bucket:storage.getStorage(project)};
    })().catch(e=>{ready=null;throw e});
    return ready;
  }
  const ADMIN_UID='rVntW7XRN3Xtud9v6xMEFeWTKDh2';
  async function account(){const s=await sdk();await s.userAuth.authStateReady();return s.userAuth.currentUser;}
  async function permissions(slug){if(location.protocol==='file:'&&window.localPackUser?.name)return {edit:true,admin:false};const user=await account();if(!user||user.isAnonymous)return {edit:false,admin:false};const s=await sdk();const record=slug?(await s.db.get(s.db.ref(s.database,'levelPackCreator/packs/'+slug))).val():null;return {edit:!slug||record?.owner===user.uid||user.uid===ADMIN_UID||user.uid===ADMIN_UID,admin:user.uid===ADMIN_UID};}
  async function creatorName(uid){if(!uid)return 'Unassigned';const s=await sdk();const profile=(await s.db.get(s.db.ref(s.database,'users/'+uid))).val();return profile?.username||'Unknown creator';}
  async function likes(){
    const s=await sdk(),user=await account();
    const snapshot=await s.db.get(s.db.ref(s.database,'levelPackCreatorLikes'));
    return Object.fromEntries(Object.entries(snapshot.val()||{}).map(([slug,votes])=>[slug,{count:Object.values(votes||{}).filter(v=>v===true).length,liked:!!user&&votes?.[user.uid]===true}]));
  }
  async function like(slug,liked=true){
    const user=await account();if(!user||user.isAnonymous)throw Error('Sign in to like packs.');
    const s=await sdk(),ref=s.db.ref(s.database,'levelPackCreatorLikes/'+slug+'/'+user.uid);
    await s.db.set(ref,liked?true:null);
    const snapshot=await s.db.get(s.db.ref(s.database,'levelPackCreatorLikes/'+slug));
    return {count:Object.values(snapshot.val()||{}).filter(v=>v===true).length,liked:!!liked};
  }
  async function users(){const user=await account();if(user?.uid!==ADMIN_UID)throw Error('Not allowed');const s=await sdk();const data=(await s.db.get(s.db.ref(s.database,'users'))).val()||{};return Object.entries(data).map(([uid,p])=>({uid,name:p.username||uid})).sort((a,b)=>a.name.localeCompare(b.name));}
  async function assign(slug,uid){if(!(await permissions(slug)).admin)throw Error('Not allowed');const s=await sdk();await s.db.update(s.db.ref(s.database,'levelPackCreator/packs/'+slug),{owner:uid});}
  const slugify=name=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
  function canDelete(slug){try{return JSON.parse(localStorage.getItem('created-level-packs')||'[]').includes(slug);}catch{return false;}}
  function rememberCreated(slug){try{const own=JSON.parse(localStorage.getItem('created-level-packs')||'[]');localStorage.setItem('created-level-packs',JSON.stringify([...new Set([...own,slug])]));}catch{}}
  async function list(){const s=await sdk();const snap=await s.db.get(s.db.ref(s.database,'levelPackCreator/packs'));return Object.entries(snap.val()||{}).filter(([,p])=>p.manifestPath).map(([slug,p])=>({...p,slug})).sort((a,b)=>b.updatedAt-a.updatedAt);}
  async function load(slug){
    const s=await sdk();const record=(await s.db.get(s.db.ref(s.database,'levelPackCreator/packs/'+slug))).val();
    if(!record?.manifestPath)throw Error('Pack not found.');
    const visibility=record.visibility==='private'?'private':'public';
    if(visibility==='private'&&!(location.protocol==='file:'&&window.localPackUser?.name)){
      const viewer=await account();
      if(!viewer||viewer.isAnonymous||(viewer.uid!==record.owner&&viewer.uid!==ADMIN_UID))throw Error('This pack is private.');
    }
    const url=await s.storage.getDownloadURL(s.storage.ref(s.bucket,record.manifestPath));
    const response=await fetch(url);if(!response.ok)throw Error('Pack could not be loaded.');
    const pack=await response.json();if(!Array.isArray(pack.levels))throw Error('Invalid pack.');
    return {...pack,cloudSlug:slug,cloudName:record.name,cloudRevision:record.updatedAt,cloudOwner:record.owner||null,visibility,cloudVisibility:visibility};
  }
  const nameKey=name=>String(name||'').normalize('NFKC').trim().toLowerCase();
  async function olderVersions(){const groups=new Map();for(const p of await list()){const key=nameKey(p.name);if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}return [...groups.values()].flatMap(group=>group.slice(1));}
  async function publish(pack,name,progress){
    const s=await sdk();
    const user=await account();if(!user||user.isAnonymous)throw Error('Login required');
    const baseSlug=slugify(name);
    if(!baseSlug||['index','404'].includes(baseSlug))throw Error('Choose another pack name.');
    const matches=(await list()).filter(p=>nameKey(p.name)===nameKey(name));
    const slug=pack.cloudSlug||matches[0]?.slug||baseSlug;
    const previous=(await s.db.get(s.db.ref(s.database,'levelPackCreator/packs/'+slug))).val();
    if(previous&&nameKey(previous.name)!==nameKey(name))throw Error('That URL is used by a different pack name. Choose another name.');
    if(previous&&previous.owner!==user.uid&&user.uid!==ADMIN_UID)throw Error('Only the creator can edit this pack');
    const owner=previous?.owner||user.uid;
    const visibility=pack.visibility==='private'?'private':'public';
    const builtins=new Set(await (await fetch(new URL('builtin-assets.json',document.baseURI))).json());
    const builtinHashes=await (await fetch(new URL('builtin-asset-hashes.json',document.baseURI))).json();
    const root='levelPackCreatorOwned/'+user.uid+'/'+slug+'/'+crypto.randomUUID()+'/';
    async function upload(blob,extension){
      if(blob.size>100*1024*1024)throw Error('A file exceeds the 100 MB upload limit.');
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
      if(extension!=='mmlv'&&builtinHashes[hash])return builtinHashes[hash];
      const ref=s.storage.ref(s.bucket,root+'assets/'+hash+'.'+extension);
      try{return await s.storage.getDownloadURL(ref);}catch(e){if(e.code!=='storage/object-not-found')throw e;}
      await s.storage.uploadBytes(ref,blob,{contentType:blob.type||'application/octet-stream'});return s.storage.getDownloadURL(ref);
    }
    async function asset(path){
      if(!path)return '';
      const legacyAssets={
        'images/TitleScreen':'images/title-screens/MM2-TitleScreen.png',
        'images/LevelSelect':'images/stage-select/MM2-StageSelect.png',
        'images/WilyStages':'images/wily-castles/MMM-WilyCastle.png'
      };
      const relative=path.replace(/^\.\//,'').replace(/^images\/wilyicons\/[^/]+ Plates\/([^/]+)$/,'images/wilyicons/$1');
      const legacy=legacyAssets[relative.replace(/\.png$/i,'')];
      if(legacy&&builtins.has(legacy))return legacy;
      if(builtins.has(relative)||[...builtins].some(f=>f.replace(/\.[^.]+$/,'')===relative))return relative;
      if(/^https:\/\/firebasestorage\.googleapis\.com\//.test(path))return path;
      if(!/^(data:|blob:|https?:)/.test(path)&&!relative.startsWith('images/')&&!relative.startsWith('music/')&&!relative.startsWith('sounds/'))throw Error('Choose the custom asset with Pick File before saving.');
      const response=await fetch(path);if(!response.ok)throw Error('A custom asset could not be read. Select it using Pick File.');
      const blob=await response.blob();const ext=({'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','audio/mpeg':'mp3','audio/wav':'wav','audio/ogg':'ogg'})[blob.type]||'bin';return upload(blob,ext);
    }
    const result=structuredClone(pack);
    for(const key of ['wily2Icon','wily2Background','packThumbnail','customBorderDefault','customBorderActive','titleBackground','selectBackground','wilyBackground','victoryBackground','wilyIcon']){progress('Uploading assets…');result[key]=await asset(result[key]);}
    for(const key of Object.keys(result.music||{}))result.music[key]=await asset(result.music[key]);
    for(const level of result.levels){
      if(level.customMugshot)level.image=await asset(level.image);
      if(level.localLevelData){progress('Uploading level files…');level.localLevelUrl=await upload(new Blob([level.localLevelData],{type:'text/plain'}),'mmlv');delete level.localLevelData;}
    }
    result.cloudSlug=slug;result.cloudName=name;result.cloudOwner=owner;result.visibility=visibility;result.cloudVisibility=visibility;
    const manifestPath=root+'packs/'+crypto.randomUUID()+'.json';
    progress('Saving pack…');await s.storage.uploadBytes(s.storage.ref(s.bucket,manifestPath),new Blob([JSON.stringify(result)],{type:'application/json'}));
    const updatedAt=Date.now();
    const recordRef=s.db.ref(s.database,'levelPackCreator/packs/'+slug);
    const replaced=(await s.db.get(recordRef)).val();
    // Publish only after the new manifest is fully uploaded. Last completed save wins.
    await s.db.set(recordRef,{name,manifestPath,updatedAt,owner,visibility});
    if(!previous)rememberCreated(slug);
    if(replaced){try{await remove(slug,replaced);}catch{progress('Pack saved; old files can be cleaned up later.');}}
    return {...result,cloudRevision:updatedAt};
  }
  let spacingUpdateRunning=false;
  async function updateDefaultSpacing(progress=()=>{}){
    const user=await account();
    if(!user||user.isAnonymous||user.uid!==ADMIN_UID)throw Error('Sign in as SkyPilotSamurai to update online packs.');
    if(spacingUpdateRunning)throw Error('Spacing update already running.');
    spacingUpdateRunning=true;
    const summary={updated:[],skipped:[],failed:[]};
    try{
      const s=await sdk();
      for(const record of await list()){
        progress('Checking '+record.name+'…');
        try{
          const url=await s.storage.getDownloadURL(s.storage.ref(s.bucket,record.manifestPath));
          const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Cannot read pack');
          const pack=await response.json();
          if(pack.stageSpacingX!==80||pack.stageSpacingY!==90||pack.stageOffsetY!==10){summary.skipped.push(record.name);continue;}
          Object.assign(pack,{stageSpacingX:80,stageSpacingY:96,stageOffsetY:-10});
          const manifestPath='levelPackCreatorOwned/'+user.uid+'/'+record.slug+'/'+crypto.randomUUID()+'/packs/spacing-update.json';
          await s.storage.uploadBytes(s.storage.ref(s.bucket,manifestPath),new Blob([JSON.stringify(pack)],{type:'application/json'}));
          const result=await s.db.runTransaction(s.db.ref(s.database,'levelPackCreator/packs/'+record.slug),current=>{
            if(!current)return current;
            if(current.manifestPath!==record.manifestPath||current.updatedAt!==record.updatedAt)return;
            return {...current,manifestPath,updatedAt:Date.now()};
          },{applyLocally:false});
          if(!result.committed||result.snapshot?.val()===null)throw Error('Pack changed during update; left untouched');
          summary.updated.push(record.name);
        }catch(e){summary.failed.push(record.name);console.error('Spacing update failed:',record.slug,e);}
      }
      return summary;
    }finally{spacingUpdateRunning=false;}
  }
  async function remove(slug,obsolete=null){
    if(!/^[a-z0-9][a-z0-9-]{0,69}$/.test(slug))throw Error('Invalid pack.');
    const user=await account();if(!user||user.isAnonymous)throw Error('Login required');
    const s=await sdk();
    const records=(await s.db.get(s.db.ref(s.database,'levelPackCreator/packs'))).val()||{};
    if(!records[slug])return;
    if(!obsolete&&records[slug].owner!==user.uid&&user.uid!==ADMIN_UID)throw Error('Only the creator can delete this pack');
    const targetKey=obsolete?'__obsolete__':slug;
    if(obsolete)records[targetKey]=obsolete;
    const referenced=new Set(),candidates=new Set();
    function collect(value,set){
      if(typeof value==='string'){
        try{const url=new URL(value);if(url.hostname==='firebasestorage.googleapis.com'){
          const match=url.pathname.match(/\/b\/([^/]+)\/o\/(.+)/);
          if(match&&match[1]===config.storageBucket){const path=decodeURIComponent(match[2]);if(path.startsWith('levelPackCreator/')||path.startsWith('levelPackCreatorOwned/'))set.add(path);}
        }}catch{}
      }else if(value&&typeof value==='object')Object.values(value).forEach(v=>collect(v,set));
    }
    // Read every published manifest before deleting anything, to protect shared assets.
    for(const [key,record] of Object.entries(records)){
      if(!record.manifestPath)continue;
      const target=key===targetKey?candidates:referenced;
      target.add(record.manifestPath);
      try{
        const url=await s.storage.getDownloadURL(s.storage.ref(s.bucket,record.manifestPath));
        const response=await fetch(url);
        if(response.status===404)continue;
        if(!response.ok)throw Error('Could not check shared files. Please try again.');
        collect(await response.json(),target);
      }catch(e){if(e.code!=='storage/object-not-found')throw e;}
    }
    async function gather(path){const result=await s.storage.listAll(s.storage.ref(s.bucket,path));result.items.forEach(item=>candidates.add(item.fullPath));for(const prefix of result.prefixes)await gather(prefix.fullPath);}
    await gather('levelPackCreator/'+slug);
    await gather('levelPackCreatorOwned/'+user.uid+'/'+slug);
    for(const path of [...candidates].sort((a,b)=>Number(a===records[targetKey].manifestPath)-Number(b===records[slug].manifestPath))){
      if(referenced.has(path))continue;
      try{await s.storage.deleteObject(s.storage.ref(s.bucket,path));}catch(e){if(e.code!=='storage/object-not-found'&&e.code!=='storage/unauthorized')throw e;}
    }
    if(!obsolete)await s.db.remove(s.db.ref(s.database,'levelPackCreator/packs/'+slug));
  }
  return {updateDefaultSpacing,likes,like,list,load,publish,slugify,remove,olderVersions,canDelete,account,permissions,users,assign,creatorName};
})();
