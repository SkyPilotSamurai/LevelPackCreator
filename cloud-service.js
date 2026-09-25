/* Firebase transport, isolated from the MegaSpeedruns application. */
window.PackCloud = (() => {
  const config = {apiKey:'AIzaSyC2pHhSThFkKhN-c1sdhUATt1-zmNLV9sw',authDomain:'megaspeedrunsdatabase.firebaseapp.com',databaseURL:'https://megaspeedrunsdatabase-default-rtdb.firebaseio.com',projectId:'megaspeedrunsdatabase',storageBucket:'megaspeedrunsdatabase.firebasestorage.app',messagingSenderId:'545413984550',appId:'1:545413984550:web:79c899026a21f6343091e7'};
  let ready;
  async function sdk(){
    if(!ready)ready=(async()=>{
      const base='https://www.gstatic.com/firebasejs/12.19.0/';
      const [app,db,storage]=await Promise.all(['app','database','storage'].map(n=>import(base+'firebase-'+n+'.js')));
      const project=app.initializeApp(config,'level-pack-creator');
      return {db,storage,database:db.getDatabase(project),bucket:storage.getStorage(project)};
    })().catch(e=>{ready=null;throw e});
    return ready;
  }
  const slugify=name=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
  function canDelete(slug){try{return JSON.parse(localStorage.getItem('created-level-packs')||'[]').includes(slug);}catch{return false;}}
  function rememberCreated(slug){try{const own=JSON.parse(localStorage.getItem('created-level-packs')||'[]');localStorage.setItem('created-level-packs',JSON.stringify([...new Set([...own,slug])]));}catch{}}
  async function list(){const s=await sdk();const snap=await s.db.get(s.db.ref(s.database,'levelPackCreator/packs'));return Object.entries(snap.val()||{}).filter(([,p])=>p.manifestPath).map(([slug,p])=>({...p,slug})).sort((a,b)=>b.updatedAt-a.updatedAt);}
  async function load(slug){
    const s=await sdk();const record=(await s.db.get(s.db.ref(s.database,'levelPackCreator/packs/'+slug))).val();
    if(!record?.manifestPath)throw Error('Pack not found.');
    const url=await s.storage.getDownloadURL(s.storage.ref(s.bucket,record.manifestPath));
    const response=await fetch(url);if(!response.ok)throw Error('Pack could not be loaded.');
    const pack=await response.json();if(!Array.isArray(pack.levels))throw Error('Invalid pack.');
    return {...pack,cloudSlug:slug,cloudName:record.name,cloudRevision:record.updatedAt};
  }
  const nameKey=name=>String(name||'').normalize('NFKC').trim().toLowerCase();
  async function olderVersions(){const groups=new Map();for(const p of await list()){const key=nameKey(p.name);if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}return [...groups.values()].flatMap(group=>group.slice(1));}
  async function publish(pack,name,progress){
    const s=await sdk();
    const baseSlug=slugify(name);
    if(!baseSlug||['index','404'].includes(baseSlug))throw Error('Choose another pack name.');
    const matches=(await list()).filter(p=>nameKey(p.name)===nameKey(name));
    const slug=matches[0]?.slug||baseSlug;
    const previous=(await s.db.get(s.db.ref(s.database,'levelPackCreator/packs/'+slug))).val();
    if(previous&&nameKey(previous.name)!==nameKey(name))throw Error('That URL is used by a different pack name. Choose another name.');
    const builtins=new Set(await (await fetch(new URL('builtin-assets.json',document.baseURI))).json());
    const builtinHashes=await (await fetch(new URL('builtin-asset-hashes.json',document.baseURI))).json();
    const root='levelPackCreator/'+slug+'/'+crypto.randomUUID()+'/';
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
      const relative=path.replace(/^\.\//,'');
      if(builtins.has(relative)||[...builtins].some(f=>f.replace(/\.[^.]+$/,'')===relative))return relative;
      if(/^https:\/\/firebasestorage\.googleapis\.com\//.test(path))return path;
      if(!/^(data:|blob:|https?:)/.test(path)&&!relative.startsWith('images/')&&!relative.startsWith('music/')&&!relative.startsWith('sounds/'))throw Error('Choose the custom asset with Pick File before saving.');
      const response=await fetch(path);if(!response.ok)throw Error('A custom asset could not be read. Select it using Pick File.');
      const blob=await response.blob();const ext=({'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp','audio/mpeg':'mp3','audio/wav':'wav','audio/ogg':'ogg'})[blob.type]||'bin';return upload(blob,ext);
    }
    const result=structuredClone(pack);
    for(const key of ['customBorderDefault','customBorderActive','titleBackground','selectBackground','wilyBackground','victoryBackground','wilyIcon']){progress('Uploading assets…');result[key]=await asset(result[key]);}
    for(const key of Object.keys(result.music||{}))result.music[key]=await asset(result.music[key]);
    for(const level of result.levels){
      if(level.customMugshot)level.image=await asset(level.image);
      if(level.localLevelData){progress('Uploading level files…');level.localLevelUrl=await upload(new Blob([level.localLevelData],{type:'text/plain'}),'mmlv');delete level.localLevelData;}
    }
    result.cloudSlug=slug;result.cloudName=name;delete result.cloudOwner;
    const manifestPath=root+'packs/'+crypto.randomUUID()+'.json';
    progress('Saving pack…');await s.storage.uploadBytes(s.storage.ref(s.bucket,manifestPath),new Blob([JSON.stringify(result)],{type:'application/json'}));
    const updatedAt=Date.now();
    const claim=await s.db.runTransaction(s.db.ref(s.database,'levelPackCreator/packs/'+slug),current=>((current?.manifestPath||null)===(previous?.manifestPath||null))?{name,manifestPath,updatedAt}:undefined);
    if(!claim.committed)throw Error('This pack changed while saving. Reload it before saving again.');
    if(!previous)rememberCreated(slug);
    if(previous){try{await remove(slug,previous);}catch{progress('Pack saved; old files can be cleaned up later.');}}
    return {...result,cloudRevision:updatedAt};
  }
  async function remove(slug,obsolete=null){
    if(!/^[a-z0-9][a-z0-9-]{0,69}$/.test(slug))throw Error('Invalid pack.');
    const s=await sdk();
    const records=(await s.db.get(s.db.ref(s.database,'levelPackCreator/packs'))).val()||{};
    if(!records[slug])return;
    const targetKey=obsolete?'__obsolete__':slug;
    if(obsolete)records[targetKey]=obsolete;
    const referenced=new Set(),candidates=new Set();
    function collect(value,set){
      if(typeof value==='string'){
        try{const url=new URL(value);if(url.hostname==='firebasestorage.googleapis.com'){
          const match=url.pathname.match(/\/b\/([^/]+)\/o\/(.+)/);
          if(match&&match[1]===config.storageBucket){const path=decodeURIComponent(match[2]);if(path.startsWith('levelPackCreator/'))set.add(path);}
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
    for(const path of [...candidates].sort((a,b)=>Number(a===records[targetKey].manifestPath)-Number(b===records[slug].manifestPath))){
      if(referenced.has(path))continue;
      try{await s.storage.deleteObject(s.storage.ref(s.bucket,path));}catch(e){if(e.code!=='storage/object-not-found')throw e;}
    }
    if(!obsolete)await s.db.remove(s.db.ref(s.database,'levelPackCreator/packs/'+slug));
  }
  return {list,load,publish,slugify,remove,olderVersions,canDelete};
})();
