// Rebuildable metadata only. Cached values never grant access to an audio file.
import {openMemoraDatabase} from './database.js';
import {createReproducibleRecordingIdentityResolver} from './reproducibleRecordingIdentity.js';
const STORE='audioFolderCatalogues',VERSION=1,MAX_FOLDERS=16;
const key=value=>String(value).normalize('NFC').toLowerCase();
const abort=signal=>{if(signal?.aborted)throw new DOMException('Audio inspection cancelled.','AbortError');};
export function createAudioFolderCacheStore({openDatabase=openMemoraDatabase}={}){
 async function transaction(mode,work){const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);let result,failure;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(failure||tx.error||Error('Audio metadata cache unavailable.'));try{work(tx.objectStore(STORE),value=>{result=value;},error=>{failure=error;tx.abort();});}catch(error){failure=error;tx.abort();}});}finally{db.close();}}
 return {
  list:()=>transaction('readonly',(store,set)=>{const r=store.getAll();r.onsuccess=()=>set(r.result);}),
  put:(entry,expectedRevision=null,obsolete=[])=>transaction('readwrite',(store,set,fail)=>{const r=store.get(entry.id);r.onsuccess=()=>{
   if((r.result?.revision||null)!==expectedRevision)return fail(Error('Audio metadata was refreshed elsewhere. The newer cache was kept.'));
   for(const old of obsolete){const check=store.get(old.id);check.onsuccess=()=>{if(check.result&&check.result.revision!==old.revision)return fail(Error('Audio metadata changed while replacing duplicate snapshots.'));if(check.result)store.delete(old.id);};}
   store.put(entry);const all=store.getAll();all.onsuccess=()=>{for(const old of all.result.sort((a,b)=>b.updatedAt-a.updatedAt).slice(MAX_FOLDERS))store.delete(old.id);set(entry);};
  };}),
  remove:entries=>transaction('readwrite',(store,set,fail)=>{for(const entry of entries){const r=store.get(entry.id);r.onsuccess=()=>{if(r.result&&r.result.revision!==entry.revision)return fail(Error('Audio metadata changed. Refresh before deleting.'));if(r.result)store.delete(entry.id);};}set(true);})
 };
}
export const listAudioFolderCache=()=>createAudioFolderCacheStore().list();
export const removeAudioFolderCache=entries=>createAudioFolderCacheStore().remove(entries);
const valid=row=>row?.version===VERSION&&Array.isArray(row.records)&&row.records.every(r=>r.status==='ready'&&typeof r.recordingId==='string');
const sameFile=(record,file)=>record&&record.size===file.size&&record.lastModified===file.lastModified&&record.inspectionVersion===VERSION;
export async function openAudioFolderInventory(source,files,options={}){
 const run=()=>buildAudioFolderInventory(source,files,options);
 return globalThis.navigator?.locks? navigator.locks.request('memora-audio-metadata',{...(options.signal?{signal:options.signal}:{})},run):run();
}
async function buildAudioFolderInventory(source,files,{store=createAudioFolderCacheStore(),signal,onProgress=(_message)=>{}}={}){
 abort(signal);let saved=[],cacheError=null;
 try{saved=(await store.list()).filter(valid);}catch(error){cacheError=error.message;}
 const native=source.kind==='directory',complete=native||source.selectionScope==='folder';
 let previous=null,obsolete=[];
 if(native){const matches=[];for(const entry of saved)if(entry.directoryHandle){try{if(await source.isSameEntry(entry.directoryHandle))matches.push(entry);}catch{/* Unproved access association: inspect again. */}}matches.sort((a,b)=>b.updatedAt-a.updatedAt);previous=matches[0]||null;obsolete=matches.slice(1);}
 const oldByPath=new Map((previous?.records||[]).map(record=>[key(record.audioRelativePath),record]));
 const resolver=createReproducibleRecordingIdentityResolver(),records=[],issues=[],paths=new Set();let reused=0,inspected=0;
 for(const [index,file]of files.entries()){
  abort(signal);onProgress(`Checking audio: ${index+1} of ${files.length} — ${file.name}`);
  if(!file.name||/[\\/\x00-\x1f]/.test(file.name)||paths.has(key(file.name))){issues.push(`Ambiguous audio filename: ${file.name}`);continue;}paths.add(key(file.name));
  const known=oldByPath.get(key(file.name));let record;
  if(sameFile(known,file)){record={...known,audioRelativePath:file.name};reused++;}
  else{
   const identity=await resolver.resolve(file,{signal});inspected++;
   if(identity.status!=='ready'){issues.push(`${file.name}: ${identity.issues?.[0]?.message||identity.code||'Recording ID unavailable'}`);continue;}
   record={audioRelativePath:file.name,size:file.size,lastModified:file.lastModified,status:'ready',inspectionVersion:VERSION,
    recordingId:identity.recordingId,method:identity.method,identityOrigins:[...(identity.identityOrigins||[])],...(identity.fingerprint?{sampledIdentity:{...identity.fingerprint}}:{})};
  }
  records.push(record);if(index%16===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 abort(signal);
 const ids=new Map();for(const record of records){const id=key(record.recordingId);if(ids.has(id))issues.push(`Duplicate Recording ID: ${ids.get(id)} and ${record.audioRelativePath}. Choose one audio copy before reopening this folder.`);else ids.set(id,record.audioRelativePath);}
 if(issues.length)throw Error(issues.join('\n'));
 // iPhone must inspect the current Files snapshots before associating a local
 // logical inventory. Names/size/time alone never establish this association.
 // Exact copies with identical labels/IDs share rebuildable inventory metadata,
 // never file access. Ambiguous overlapping inventories remain separate.
 if(!native&&complete){const candidates=saved.filter(entry=>!entry.directoryHandle&&key(entry.folderName)===key(source.name)&&entry.records.some(r=>ids.has(key(r.recordingId))));const exact=candidates.filter(entry=>entry.records.length===ids.size&&entry.records.every(record=>ids.has(key(record.recordingId)))).sort((a,b)=>b.updatedAt-a.updatedAt);if(exact.length){previous=exact[0];obsolete=exact.slice(1);}else if(candidates.length===1)previous=candidates[0];}
 if(!native&&previous){const old=new Map(previous.records.map(r=>[key(r.recordingId),r]));for(const record of records){const prior=old.get(key(record.recordingId));if(prior?.metadata&&sameFile(prior,{size:record.size,lastModified:record.lastModified}))record.metadata=prior.metadata;}}
 const inventory={id:previous?.id||crypto.randomUUID(),version:VERSION,revision:crypto.randomUUID(),folderName:source.name,updatedAt:Date.now(),records,...(native?{directoryHandle:source}:{})};
 let revision=previous?.revision||null;
 async function save(){
  if(!complete)return false;
  const next={...inventory,revision:crypto.randomUUID(),updatedAt:Date.now()};
  try{await store.put(next,revision,obsolete);obsolete=[];Object.assign(inventory,next);revision=next.revision;cacheError=null;return true;}catch(error){cacheError=error.message;return false;}
 }
 await save();
 const byPath=new Map(records.map(record=>[key(record.audioRelativePath),record]));
 const identityFor=record=>({recordingId:record.recordingId,identityOrigins:record.identityOrigins});
 let metadataChanged=false;
 return {
  getInventory:()=>inventory,
  getSummary:()=>({checked:records.length,reused,inspected,cacheError}),
  async getRecordingMetadata(file,readMetadata){const record=byPath.get(key(file.name));if(!record)throw Error('Reopen the audio folder before reading this recording.');if(record.metadata&&sameFile(record,file))return record.metadata;const metadata=await readMetadata(file,identityFor(record));record.metadata=metadata;metadataChanged=true;return metadata;},
  async saveMetadata(){if(metadataChanged){metadataChanged=false;await save();}},
  async prepare(file){
   const expected=byPath.get(key(file.name));if(!expected)throw Error('Reopen the audio folder before transcribing this recording.');
   const current=native?await(await source.getFileHandle(file.name)).getFile():file;
   const actual=await resolver.resolve(current,{signal});
   if(actual.status!=='ready'||key(actual.recordingId)!==key(expected.recordingId))throw Error(`“${file.name}” no longer matches its Recording ID. Clear this folder’s metadata cache and reopen the audio source.`);
   return {file:current,recordingId:actual.recordingId,recordingIdentityMethod:actual.fingerprint?.method||null,
    identityOrigin:actual.method==='embedded'?actual.identityOrigins[0]:'memora-assigned',embedded:{recordingId:actual.recordingId,identityOrigins:actual.identityOrigins||[]},...(actual.fingerprint?{fingerprint:actual.fingerprint}:{})};
  }
 };
}
