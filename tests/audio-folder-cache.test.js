import {openAudioFolderInventory as open,createAudioFolderCacheStore,listAudioFolderCache,removeAudioFolderCache} from '../js/audioFolderCache.js';
import {openMemoraDatabase,createDatabaseManager,DATABASE_VERSION} from './source-database-adapter.js';
import {createTranscriptionIdentity} from '../js/transcriptionIdentity.js';
import * as f from './recording-identity-fixtures.js';
const lines=[],failed=[],assert=(v,m='Assertion failed')=>{if(!v)throw Error(m);};
async function test(name,work){try{await work();lines.push('PASS '+name);}catch(e){failed.push(name);lines.push('FAIL '+name+': '+e.stack);}document.getElementById('results').textContent=lines.join('\n');}
const file=(name='memo.wav',id=f.ID,time=1)=>new File([f.wav([f.wavChunk('imID',f.payload(id))])],name,{lastModified:time});
const phone=(name='Audio')=>({kind:'file-input',selectionScope:'folder',name});
const memStore=()=>{const rows=new Map();return {rows,async list(){return [...rows.values()];},async put(row,revision,obsolete=[]){if((rows.get(row.id)?.revision||null)!==revision)throw Error('Newer snapshot retained');for(const old of obsolete){if(rows.get(old.id)?.revision!==old.revision)throw Error('Changed');rows.delete(old.id);}rows.set(row.id,structuredClone({...row,directoryHandle:undefined}));},async remove(entries){for(const entry of entries)rows.delete(entry.id);}};};
async function clear(){await removeAudioFolderCache(await listAudioFolderCache());}
async function rejects(work){let failed=false;try{await work();}catch{failed=true;}assert(failed,'Expected rejection');}
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
await test('Phone reconstruction and repeat selection keep one latest snapshot with embedded IDs',async()=>{await clear();const a=await open(phone(),[file()]);const first=a.getInventory();const b=await open(phone(),[file()]);const rows=await listAudioFolderCache();assert(rows.length===1&&rows[0].id===first.id&&rows[0].revision!==first.revision&&b.getSummary().inspected===1);assert(b.getInventory().records[0].recordingId===f.ID);});
await test('Native real directory handles reuse metadata after browser-confirmed folder association',async()=>{
 await clear();const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('native-cache-'+crypto.randomUUID(),{create:true});
 const write=async(name,id)=>{const w=await(await root.getFileHandle(name,{create:true})).createWritable();await w.write(file(name,id));await w.close();};await write('memo.wav',f.ID);
 const first=await open(root,[await(await root.getFileHandle('memo.wav')).getFile()]);assert(first.getSummary().inspected===1&&!first.getSummary().cacheError);
 let reads=0;const reader=async()=>{reads++;return {duration:1,recordingDate:new Date(123)};};await first.getRecordingMetadata(await(await root.getFileHandle('memo.wav')).getFile(),reader);await first.saveMetadata();
 const second=await open(root,[await(await root.getFileHandle('memo.wav')).getFile()]);assert(second.getSummary().reused===1&&second.getSummary().inspected===0);const meta=await second.getRecordingMetadata(await(await root.getFileHandle('memo.wav')).getFile(),reader);assert(reads===1&&meta.recordingDate.getTime()===123);
 const current=await(await root.getFileHandle('memo.wav')).getFile();const renamedCase=await open(root,[new File([current],'MEMO.WAV',{lastModified:current.lastModified})]);assert(renamedCase.getInventory().records[0].audioRelativePath==='MEMO.WAV','Cached path did not follow current filename spelling');
 await write('memo.wav',f.OTHER);await rejects(()=>second.prepare(file()));
 const third=await open(root,[await(await root.getFileHandle('memo.wav')).getFile()]);assert(third.getSummary().inspected===1&&third.getInventory().records[0].recordingId===f.OTHER);assert((await listAudioFolderCache()).length===1);
});
await test('Added, removed and renamed phone members update the latest known logical inventory',async()=>{
 await clear();await open(phone(),[file('a.wav'),file('b.wav',f.OTHER)]);const before=(await listAudioFolderCache())[0];const a=await open(phone(),[file('renamed.wav')]);assert(a.getInventory().id===before.id&&(await listAudioFolderCache()).length===1&&a.getInventory().records.length===1&&a.getInventory().records[0].audioRelativePath==='renamed.wav');await open(phone(),[file('renamed.wav'),file('new.wav',f.OTHER)]);assert((await listAudioFolderCache()).length===1&&(await listAudioFolderCache())[0].records.length===2);
});
await test('Equal folder/file names with different Recording IDs stay separate',async()=>{await clear();await open(phone(),[file()]);await open(phone(),[file('memo.wav',f.OTHER)]);assert((await listAudioFolderCache()).length===2);});
await test('Equal recordings in differently named parent folders stay separate',async()=>{await clear();await open(phone('A'),[file()]);await open(phone('B'),[file()]);assert((await listAudioFolderCache()).length===2);});
await test('Partial and failed reads preserve the last complete snapshot',async()=>{
 await clear();await open(phone(),[file(),file('b.wav',f.OTHER)]);const before=(await listAudioFolderCache())[0];await open({...phone(),selectionScope:'selection'},[file()]);assert((await listAudioFolderCache())[0].revision===before.revision);await rejects(()=>open(phone(),[file(),new File(['bad'],'broken.mp3')]));assert((await listAudioFolderCache())[0].revision===before.revision);
});
await test('Duplicate actual audio IDs are rejected without choosing a newer copy or changing cache',async()=>{await clear();await open(phone(),[file()]);const before=(await listAudioFolderCache())[0];await rejects(()=>open(phone(),[file(),file('copy.wav',f.ID,999)]));assert((await listAudioFolderCache())[0].revision===before.revision);});
await test('Fallback recording IDs survive cache deletion and fresh reconstruction',async()=>{await clear();const make=()=>new File([f.wav()],'stripped.wav');const a=await open(phone(),[make()]);const id=a.getInventory().records[0].recordingId;await clear();const b=await open(phone(),[make()]);assert(b.getInventory().records[0].recordingId===id&&b.getInventory().records[0].sampledIdentity.method==='memora-recording-prefix-v1');});
await test('Phone cached display metadata requires actual identity plus unchanged size/time',async()=>{
 await clear();const a=await open(phone(),[file()]);let reads=0;const reader=async()=>{reads++;return {duration:3};};await a.getRecordingMetadata(file(),reader);await a.saveMetadata();const b=await open(phone(),[file()]);await b.getRecordingMetadata(file(),reader);assert(reads===1);const c=await open(phone(),[file('memo.wav',f.ID,2)]);await c.getRecordingMetadata(file('memo.wav',f.ID,2),reader);assert(reads===2);
});
await test('Unavailable local cache permits session inventory and verified transcription without JSON',async()=>{
 const store={async list(){throw Error('Unavailable');},async put(){throw Error('Unavailable');}};const a=await open(phone(),[file()],{store});assert(a.getSummary().cacheError&&((await a.prepare(file())).recordingId===f.ID));
});
await test('Stale concurrent session cannot overwrite a newer cache snapshot',async()=>{
 await clear();const a=await open(phone(),[file()]);const b=await open(phone(),[file()]);const before=(await listAudioFolderCache())[0].revision;await a.getRecordingMetadata(file(),async()=>({duration:999}));await a.saveMetadata();assert(a.getSummary().cacheError&&(await listAudioFolderCache())[0].revision===before);assert(b.getInventory().revision===before);
});
await test('Newer duplicate cache snapshot prevails; older copies are removed atomically',async()=>{
 await clear();await open(phone(),[file()]);const store=createAudioFolderCacheStore(),old=(await listAudioFolderCache())[0];await store.put({...old,id:crypto.randomUUID(),revision:crypto.randomUUID(),updatedAt:old.updatedAt+100,records:old.records.map(r=>({...r,metadata:{duration:5}}))});const a=await open(phone(),[file()]);assert((await listAudioFolderCache()).length===1&&a.getInventory().records[0].metadata.duration===5);
});
await test('Production identity workflow works without audio JSON and writes the original IDs to TXT metadata',async()=>{
 const workflow=createTranscriptionIdentity(),source=phone();await workflow.prepareSource(source,[file()]);await workflow.begin(source,{kind:'file-input',name:'Empty',files:[]});const identity=await workflow.prepare(file());assert(identity.recordingId===f.ID&&identity.archiveUuid&&!('sourceId'in identity));
});
await test('Parallel native opens keep one latest snapshot rather than racing duplicate scopes',async()=>{
 await clear();const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('parallel-'+crypto.randomUUID(),{create:true}),writer=await(await root.getFileHandle('memo.wav',{create:true})).createWritable();await writer.write(file());await writer.close();
 await Promise.all([open(root,[await(await root.getFileHandle('memo.wav')).getFile()]),open(root,[await(await root.getFileHandle('memo.wav')).getFile()])]);assert((await listAudioFolderCache()).length===1);
});
await test('Deleting an active cache preserves usable in-memory identity and cannot resurrect the removed snapshot',async()=>{
 await clear();const a=await open(phone(),[file()]);await clear();assert((await a.prepare(file())).recordingId===f.ID);await a.getRecordingMetadata(file(),async()=>({duration:3}));await a.saveMetadata();assert(!(await listAudioFolderCache()).length&&a.getSummary().cacheError);
});
await test('Schema 8 upgrade preserves current data and removes retired audio recovery',async()=>{
 const name='Memora-audio-upgrade-'+crypto.randomUUID(),r=indexedDB.open(name,8);r.onupgradeneeded=()=>{const db=r.result;db.createObjectStore('transcriptCatalogues',{keyPath:'id'}).put({id:'keep',records:[]});const transcripts=db.createObjectStore('transcripts',{keyPath:'id'});transcripts.createIndex('filenameKey','filenameKey');transcripts.createIndex('archiveFilename','archiveFilename');transcripts.put({id:'text',transcript:'Preserve full text'});const semantic=db.createObjectStore('semanticEntries',{keyPath:'id'});semantic.createIndex('representationKey','representationKey');semantic.createIndex('sourceKey','sourceKey');semantic.put({id:'embedding',embedding:new Uint8Array([1,2,3]).buffer});db.createObjectStore('semanticMetadata',{keyPath:'key'});db.createObjectStore('modelRegistry',{keyPath:'id'}).put({id:'model',proof:1});db.createObjectStore('audioSourceRecovery',{keyPath:'audioSourceId'}).put({audioSourceId:f.ID,proof:'legacy'});};(await request(r)).close();const db=await createDatabaseManager({name}).open();assert(db.version===DATABASE_VERSION&&db.objectStoreNames.contains('audioFolderCatalogues'));assert(!db.objectStoreNames.contains('audioSourceRecovery'));for(const [store,id,field,value]of [['transcripts','text','transcript','Preserve full text'],['modelRegistry','model','proof',1]])assert((await request(db.transaction(store).objectStore(store).get(id)))[field]===value);assert(new Uint8Array((await request(db.transaction('semanticEntries').objectStore('semanticEntries').get('embedding'))).embedding)[2]===3);db.close();await request(indexedDB.deleteDatabase(name));
});
await test('Canceling a rebuild keeps the current successful snapshot',async()=>{await clear();await open(phone(),[file()]);const before=(await listAudioFolderCache())[0].revision,c=new AbortController();await rejects(()=>open(phone(),[file()],{signal:c.signal,onProgress:()=>c.abort()}));assert((await listAudioFolderCache())[0].revision===before);});
async function schema9Fixture(name,incompatible=false){
 const r=indexedDB.open(name,9);r.onupgradeneeded=()=>{
  const db=r.result;db.createObjectStore('audioFolderCatalogues',{keyPath:'id'}).put({id:'audio',version:1,revision:'keep',folderName:'Audio',records:[{recordingId:f.ID}]});
  db.createObjectStore('transcriptCatalogues',{keyPath:'id'}).put({id:'metadata',records:[{recordingId:f.ID,archiveUuid:f.OTHER}]});
  const text=db.createObjectStore('transcripts',{keyPath:'id'});text.createIndex('filenameKey','filenameKey');text.createIndex('archiveFilename','archiveFilename');text.put({id:'text',transcript:'Keep complete text',savedAt:new Date(123)});
  const semantic=db.createObjectStore('semanticEntries',{keyPath:'id'});semantic.createIndex('representationKey','representationKey');semantic.createIndex('sourceKey','sourceKey',{unique:incompatible});semantic.put({id:'vector',embedding:new Uint8Array([1,2,3]).buffer});
  db.createObjectStore('semanticMetadata',{keyPath:'key'}).put({key:'keep',value:42});db.createObjectStore('modelRegistry',{keyPath:'id'}).put({id:'model',validation:{status:'passed'}});
  db.createObjectStore('audioSourceRecovery',{keyPath:'audioSourceId'}).put({audioSourceId:f.ID,proof:'remove only this store'});
  db.createObjectStore('unrelated',{keyPath:'id'}).put({id:'unknown',proof:'preserve'});
 };return request(r);
}
const normalize=value=>JSON.stringify(value,(_,v)=>v instanceof ArrayBuffer?Array.from(new Uint8Array(v)):v);
async function databaseSnapshot(db){const result={};for(const name of db.objectStoreNames)result[name]=normalize(await request(db.transaction(name).objectStore(name).getAll()));return result;}
await test('Schema 9 to 10 removes only legacy audio recovery and preserves every other store exactly',async()=>{
 const name='Memora-retirement-'+crypto.randomUUID();let db=await schema9Fixture(name);const before=await databaseSnapshot(db);db.close();db=await createDatabaseManager({name}).open();
 try{assert(db.version===DATABASE_VERSION&&!db.objectStoreNames.contains('audioSourceRecovery'));const after=await databaseSnapshot(db);delete before.audioSourceRecovery;assert(normalize(after)===normalize(before),'Current cache/text/embeddings/model/unknown data changed');}finally{db.close();await request(indexedDB.deleteDatabase(name));}
});
await test('A failed schema upgrade rolls back the retired-store deletion along with all other data',async()=>{
 const name='Memora-retirement-rollback-'+crypto.randomUUID();let db=await schema9Fixture(name,true);const before=await databaseSnapshot(db);db.close();await rejects(()=>createDatabaseManager({name}).open());db=await request(indexedDB.open(name,9));
 try{assert(db.version===9&&db.objectStoreNames.contains('audioSourceRecovery'));assert(normalize(await databaseSnapshot(db))===normalize(before),'Failed upgrade changed previous data');}finally{db.close();await request(indexedDB.deleteDatabase(name));}
});
const result={passed:lines.length-failed.length,failed,output:lines.join('\n')};if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify(result)});
