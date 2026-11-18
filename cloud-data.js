(function(){
  const config=window.BALLOON_CLOUD_CONFIG;
  let version=null, token=null, busy=false, pending=false, pendingNote='', lastSynced='', flushPromise=Promise.resolve(), lastFlushError=null;
  const message=t=>{const el=document.getElementById('syncStatus');if(el)el.title=t};
  async function api(path,options={}){
    const res=await fetch(config.url+path,{...options,headers:{apikey:config.publishableKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json',...options.headers}});
    const body=await res.json().catch(()=>null);
    if(!res.ok)throw Error(body?.message||body?.error||`HTTP ${res.status}`);
    return body;
  }
  function useData(data){for(const key of ['cylinders','batches','issues','organizations'])state[key]=Array.isArray(data[key])?data[key]:[];renderNav();render();applyRoleControls()}
  async function load(){
    const rows=await api('/rest/v1/registry_state?select=data,version&id=eq.1');
    if(!rows.length)throw Error('Серверное хранилище не настроено');
    version=rows[0].version;useData(rows[0].data);lastSynced=JSON.stringify(rows[0].data);document.getElementById('cloudUnavailable')?.remove();message(`Облачные данные загружены, версия ${version}`);document.body.classList.remove('auth-pending');
  }
  async function flush(){
    if(busy||version===null)return;
    busy=true;
    lastFlushError=null;
    try{
      do{
        pending=false;
        const note=pendingNote;pendingNote='';
        const snapshot=JSON.stringify({cylinders:state.cylinders,batches:state.batches,issues:state.issues,organizations:state.organizations});
        if(snapshot===lastSynced)continue;
        version=await api('/rest/v1/rpc/save_registry_state_v2',{method:'POST',body:JSON.stringify({expected_version:version,new_data:JSON.parse(snapshot),audit_note:note||'Обновление реестра'})});
        lastSynced=snapshot;message(`Изменения сохранены в облаке, версия ${version}`);
      }while(pending);
    }catch(e){lastFlushError=e;pending=false;pendingNote='';message(`Ошибка сохранения: ${e.message}`);if(lastSynced)useData(JSON.parse(lastSynced));alert(`Изменение не сохранено: ${e.message}. На экране восстановлены последние данные с сервера.`)}
    finally{busy=false}
  }
  window.addEventListener('balloon:save',event=>{pending=true;pendingNote=event.detail?.note||pendingNote;if(!busy)flushPromise=flush()});
  window.BALLOON_CLOUD_SYNC={whenSaved:async()=>{await flushPromise;if(lastFlushError)throw lastFlushError}};
  window.BALLOON_AUDIT_API={list:()=>api('/rest/v1/rpc/list_registry_audit',{method:'POST',body:'{}'})};
  window.BALLOON_BACKUP_API={
    async download(){
      if(!token)throw Error('Сначала войдите в приложение.');
      const rows=await api('/rest/v1/registry_state?select=data,version&id=eq.1');
      if(rows.length!==1)throw Error('Не удалось прочитать реестр с сервера.');
      const paths=new Map();
      for(const batch of rows[0].data.batches||[]){
        if(batch.certificatePath)paths.set(batch.certificatePath,batch.certificateName||'certificate');
        if(batch.permitDocumentPath)paths.set(batch.permitDocumentPath,batch.permitDocumentName||'permit');
      }
      const documents=[];
      for(const [path,name] of paths){
        const blob=await window.BALLOON_DOCUMENTS_API.read(path);
        const encoded=await new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result).split(',')[1]);
          reader.onerror=()=>reject(Error(`Не удалось прочитать документ ${name}`));
          reader.readAsDataURL(blob);
        });
        documents.push({path,name,type:blob.type,base64:encoded});
      }
      const createdAt=new Date().toISOString();
      const payload={format:'balloon-backup-v1',createdAt,registryVersion:rows[0].version,registry:rows[0].data,documents};
      const source=new Blob([JSON.stringify(payload)],{type:'application/json'});
      const compressed=typeof CompressionStream==='function';
      const output=compressed?await new Response(source.stream().pipeThrough(new CompressionStream('gzip'))).blob():source;
      const name=`balloon-backup-${createdAt.slice(0,10)}-v${rows[0].version}.json${compressed?'.gz':''}`;
      const url=URL.createObjectURL(output),link=document.createElement('a');
      link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      return name;
    }
  };
  window.addEventListener('balloon:profile',async()=>{
    const saved=JSON.parse(sessionStorage.getItem('balloon-cloud-session')||'null');token=saved?.token;
    if(!token)return;
    try{await load()}catch(e){message(e.message);const gate=document.createElement('div');gate.id='cloudUnavailable';gate.className='modal-backdrop';gate.innerHTML='<div class="modal"><h2>Нет связи с сервером</h2><p id="cloudError"></p><p>Обновите страницу после восстановления соединения. Операции учёта пока недоступны.</p></div>';document.body.append(gate);document.getElementById('cloudError').textContent=e.message}
  });
})();

