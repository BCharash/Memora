import {fingerprintAudio} from '../js/audioFingerprint.js';
import {openAudioSourceSession,discoverAudioSource} from '../js/audioSourcePersistence.js';
import {createAudioSourceRecoveryStore,matchAudioSourceRecovery,groupAudioSourceRecovery} from '../js/audioSourceRecovery.js';
import {createDatabaseManager,DATABASE_VERSION} from '../js/database.js';
import {AUDIO_SOURCE_FILENAME,shareFile} from '../js/storage.js';
import {parseAudioSourceManifest,AUDIO_SOURCE_LIMITS} from '../js/audioSourceIdentity.js';
import * as f from './recording-identity-fixtures.js';
const SOURCE='15d91f9a-735e-4d73-a6b6-427140869795', OTHER='9599e552-b194-4511-8865-b37a07413a38';
const enc=new TextEncoder(), lines=[],failures=[];
const assert=(value,message='Assertion failed')=>{if(!value)throw Error(message);};
const eq=(a,b,message)=>assert(JSON.stringify(a)===JSON.stringify(b),message||`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
async function rejects(work,code) {try{await work();}catch(error){assert(!code||error.code===code||error.name===code,`Expected ${code}, got ${error.code||error.name}: ${error.message}`);return error;}throw Error('Expected failure');}
async function test(name,work){try{await work();lines.push('PASS '+name);}catch(error){failures.push(name);lines.push(`FAIL ${name}: ${error.stack||error}`);}document.querySelector('#results').textContent=lines.join('\n');}
const manifest=(entries=[])=>({schemaVersion:1,audioSourceId:SOURCE,recordings:entries});
const copy=record=>record?{...record,baseBytes:record.baseBytes?.slice()||null}:null;
function memoryStore(){const records=new Map();let puts=0,failAt=0;
 return {records,get puts(){return puts;},failNext(){failAt=puts+1;},failOnPut(n){failAt=n;},async get(id){return copy(records.get(id.toLowerCase()));},async list(){return [...records.values()].map(copy);},async put(record,revision){puts++;if(puts===failAt)throw Object.assign(Error('Injected quota failure'),{name:'QuotaExceededError'});const key=record.audioSourceId.toLowerCase();assert((records.get(key)?.revision||null)===revision,'recovery-conflict');records.set(key,copy(record));},async remove(id){records.delete(id.toLowerCase());}};
}
function directory(initial={}){const files=new Map(Object.entries(initial).map(([key,value])=>[key,typeof value==='string'?enc.encode(value):value]));
 const state={files,writes:0,aborts:0,failWrite:false,failClose:false,corruptRead:false,denied:false,beforeClose:null};
 const root={kind:'directory',name:'Audio',async isSameEntry(other){return other===root;},async *entries(){for(const name of files.keys())yield [name,await root.getFileHandle(name)];},async getFileHandle(name,{create=false}={}){
  if(state.denied)throw new DOMException('Denied','NotAllowedError');
  if(!files.has(name)&&!create)throw new DOMException('Missing','NotFoundError');
  if(!files.has(name))files.set(name,new Uint8Array());
  return {kind:'file',name,async getFile(){return new File([files.get(name)],name,{lastModified:123});},async createWritable(){let staged;return {async write(value){state.writes++;if(state.failWrite)throw Error('Injected write failure');staged=value.slice();},async close(){if(state.failClose)throw Error('Injected close failure');files.set(name,state.corruptRead?enc.encode('{}'):staged);await state.beforeClose?.();},async abort(){state.aborts++;}};}};
 }};return {root,state};
}
const audioBytes=new Uint8Array(await f.wav().arrayBuffer());
const audio=()=>audioBytes.slice();
const textOf=state=>new TextDecoder().decode(state.files.get(AUDIO_SOURCE_FILENAME));
async function make({store=memoryStore(),json=null,input=false,...options}={}){
 const {root,state}=directory({'memo.wav':audio(),...(json!==null?{[AUDIO_SOURCE_FILENAME]:json}:{})});
 const source=input?{kind:'file-input',name:'Audio',files:[new File([audio()],'memo.wav')]}:root;
 const opened=await openAudioSourceSession({source,recoveryStore:store,action:json===null?'create':null,...options});
 assert(opened.status==='ready',JSON.stringify(opened));return {session:opened.session,source,state,store};
}
const stage=session=>session.stageRecording({audioRelativePath:'memo.wav'});
await test('SHA-256 known empty, abc, padding, Unicode and million-a vectors',async()=>{
 for(const bytes of [new Uint8Array(),enc.encode('abc'),enc.encode('€🎧'),...Array.from({length:7},(_,i)=>new Uint8Array(55+i)),enc.encode('a'.repeat(1000000))]){
  const result=await fingerprintAudio(new Blob([bytes]),{chunkBytes:65531});
  const expected=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  eq(result,{algorithm:'sha256',byteLength:bytes.length,digest:expected});
 }
});
await test('Incremental SHA-256 agrees with Web Crypto across arbitrary chunk boundaries',async()=>{
 const bytes=Uint8Array.from({length:4097},(_,i)=>(i*73+19)%256);
 const expected=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 for(const chunkBytes of [1,7,63,64,65,127,1024])eq((await fingerprintAudio(new Blob([bytes]),{chunkBytes})).digest,expected);
});
await test('8 MiB hash reads bounded chunks, reports progress and never reads whole Blob',async()=>{
 const data=new Blob([Uint8Array.from({length:8*1024*1024+13},(_,i)=>(i*73+19)%256)]);let max=0,reads=0,progress=0;
 const wrapped={size:data.size,slice(a,b){max=Math.max(max,b-a);reads++;return data.slice(a,b);}};
 const fp=await fingerprintAudio(wrapped,{onProgress:()=>progress++});assert(max<=256*1024&&reads===33&&progress===33);eq(fp.digest,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await data.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join(''));
});
await test('Hash cancellation before and during reading, read failure and invalid limits',async()=>{
 const controller=new AbortController();controller.abort();await rejects(()=>fingerprintAudio(new Blob(['abc']),{signal:controller.signal}),'AbortError');
 const next=new AbortController();await rejects(()=>fingerprintAudio(new Blob([new Uint8Array(600000)]),{signal:next.signal,onProgress:()=>next.abort()}),'AbortError');
 await rejects(()=>fingerprintAudio({size:1,slice(){throw Error('read');}}));await rejects(()=>fingerprintAudio(new Blob(),{chunkBytes:2**24}),'RangeError');
});
await test('Discovery distinguishes absent, not included, nested JSON, ambiguous, denied and invalid',async()=>{
 const {root,state}=directory();eq((await discoverAudioSource(root)).status,'absent');
 const nested=new File(['{}'],AUDIO_SOURCE_FILENAME);Object.defineProperty(nested,'webkitRelativePath',{value:`Audio/nested/${AUDIO_SOURCE_FILENAME}`});
 eq((await discoverAudioSource({kind:'file-input',name:'Audio',files:[nested]})).status,'not-included');
 const file=new File(['{}'],AUDIO_SOURCE_FILENAME);
 eq((await discoverAudioSource({kind:'file-input',files:[file,file]})).status,'ambiguous');
 state.denied=true;eq((await discoverAudioSource(root)).status,'permission-denied');state.denied=false;state.files.set(AUDIO_SOURCE_FILENAME,new Uint8Array([255]));
 eq((await discoverAudioSource(root)).validation.status,'invalid');
});
await test('Oversized source JSON rejected before reading',async()=>{
 let reads=0;const file={size:AUDIO_SOURCE_LIMITS.jsonBytes+1,arrayBuffer(){reads++;throw Error('must not read');}};
 eq((await discoverAudioSource(null,{selectedFile:file})).status,'size-limited');eq(reads,0);
});
await test('Opening/listing never assigns IDs; explicit creation and source-ID reuse',async()=>{
 const {root}=directory();let ids=0;const store=memoryStore();
 let opened=await openAudioSourceSession({source:root,recoveryStore:store,randomUUID:()=>{ids++;return SOURCE;}});
 eq(opened.code,'create-source-list');eq(ids,0);eq(store.puts,0);
 opened=await openAudioSourceSession({source:root,recoveryStore:store,action:'create',establishedAudioSourceIds:[SOURCE],randomUUID:()=>{throw Error('Do not replace established ID');}});
 eq(opened.session.sourceId,SOURCE);
});
await test('Staging returns raw snapshot and reserves one ID without file/database writes',async()=>{
 const {session,state,store}=await make();const first=await stage(session), second=await stage(session);
 eq(first.status,'ready');eq(first.recordingId,second.recordingId);eq(first.embedded.status,'absent');eq(state.writes,0);eq(store.puts,0);
 eq(Array.from(new Uint8Array(await first.file.arrayBuffer())),Array.from(audio()));
});
await test('Writable source requires durable recovery, close and exact readback',async()=>{
 const {session,state,store}=await make();const ready=await stage(session);const result=await session.persist();
 eq(result,{status:'verified',sourceVerified:true,transcriptDeliveryAllowed:true});
 eq(parseAudioSourceManifest(textOf(state)).manifest.recordings[0].recordingId,ready.recordingId);eq([...store.records.values()][0].state,'verified');eq(store.puts,2);
});
await test('Quota failure leaves source untouched and retry reuses staged Recording ID',async()=>{
 const {session,state,store}=await make();const ready=await stage(session);store.failNext();await rejects(()=>session.persist(),'QuotaExceededError');eq(state.writes,0);
 await session.persist();eq(parseAudioSourceManifest(textOf(state)).manifest.recordings[0].recordingId,ready.recordingId);
});
await test('Write and close failure retain pending IDs and abort without publishing',async()=>{
 for(const key of ['failWrite','failClose']){const {session,state,store}=await make();const ready=await stage(session);state[key]=true;await rejects(()=>session.persist());eq(state.aborts,1);eq([...store.records.values()][0].state,'pending');state[key]=false;await session.persist();eq(parseAudioSourceManifest(textOf(state)).manifest.recordings[0].recordingId,ready.recordingId);}
});
await test('Final recovery failure after verified source write retries without rotating identity',async()=>{
 const {session,state,store}=await make();const ready=await stage(session);store.failOnPut(2);await rejects(()=>session.persist(),'QuotaExceededError');
 eq(parseAudioSourceManifest(textOf(state)).manifest.recordings[0].recordingId,ready.recordingId);
 eq((await session.persist()).status,'unchanged');eq(parseAudioSourceManifest(textOf(state)).manifest.recordings[0].recordingId,ready.recordingId);
});
await test('Corrupt readback never reports verified persistence',async()=>{
 const {session,state,store}=await make();await stage(session);state.corruptRead=true;await rejects(()=>session.persist(),'readback-failed');eq([...store.records.values()][0].state,'pending');
});
await test('External same-size JSON changes block overwrite even with unchanged timestamp',async()=>{
 const original=JSON.stringify(manifest());const {session,state}=await make({json:original});await stage(session);
 state.files.set(AUDIO_SOURCE_FILENAME,enc.encode(original.replace(SOURCE,OTHER)));await rejects(()=>session.persist(),'source-changed');eq(state.writes,0);
});
await test('Same-size audio changes invalidate staged choice and prevent any source write',async()=>{
 const {session,state}=await make();await stage(session);const bytes=state.files.get('memo.wav').slice();bytes[bytes.length-1]^=1;state.files.set('memo.wav',bytes);
 await rejects(()=>session.persist(),'audio-changed');eq(state.writes,0);
});
await test('Changed-file decisions bind to reviewed bytes; unresolved entries block commit',async()=>{
 const first=await make();await stage(first.session);await first.session.persist();const {session,state}=await make({json:textOf(first.state)});
 const changed=audio().slice();changed[changed.length-1]^=1;state.files.set('memo.wav',changed);
 const prompt=await stage(session);eq(prompt.code,'audio-changed');await rejects(()=>session.persist(),'unresolved-recording');
 const result=await session.stageRecording({audioRelativePath:'memo.wav',choice:'keep-existing'});eq(result.status,'ready');await session.persist();
});
await test('Stale confirmation and invalid paths cannot authorize writes',async()=>{
 const {session,state}=await make();eq((await session.stageRecording({audioRelativePath:'../memo.wav'})).code,'audio-path');
 // A fresh session is needed after an invalid unresolved path; skip clears it.
 await session.stageRecording({audioRelativePath:'../memo.wav',choice:'skip'});
 await stage(session);const bytes=audio().slice();bytes[bytes.length-1]^=1;state.files.set('memo.wav',bytes);
 eq((await session.stageRecording({audioRelativePath:'memo.wav',choice:'keep-existing'})).code,'stale-choice');await rejects(()=>session.persist(),'unresolved-recording');
});
await test('Cancel/skip do not write; skip removes a staged new entry',async()=>{
 const {session,state,store}=await make();await stage(session);eq((await session.stageRecording({audioRelativePath:'memo.wav',choice:'cancel'})).status,'cancelled');eq(store.puts,0);eq(state.writes,0);
 await session.stageRecording({audioRelativePath:'memo.wav',choice:'skip'});eq(session.getManifest().recordings.length,0);
 const original=await make();await stage(original.session);await original.session.persist();
 const list=parseAudioSourceManifest(textOf(original.state)).manifest;
 list.recordings.push({...list.recordings[0],audioRelativePath:'other.wav',recordingId:f.ID});
 const existing=await make({json:JSON.stringify(list)});await stage(existing.session);
 await existing.session.stageRecording({audioRelativePath:'memo.wav',choice:'skip'});eq(existing.session.getManifest(),list,'Skip reordered existing manifest entries');
});
await test('File-input persists recovery before returning a pending JSON artifact',async()=>{
 const {session,state,store}=await make({input:true});const ready=await stage(session), result=await session.persist();
 eq(result.status,'export-pending');assert(!result.sourceVerified&&result.transcriptDeliveryAllowed);eq(state.writes,0);eq([...store.records.values()][0].state,'export-pending');
 eq(parseAudioSourceManifest(await result.file.text()).manifest.recordings[0].recordingId,ready.recordingId);
 assert(!result.guidance.includes('local'));eq((await session.verifySelectedCopy(result.file)).status,'verified-copy');
});
await test('File-input storage failure preserves export and UUID without granting delivery',async()=>{
 const {session,store}=await make({input:true});const first=await stage(session);store.failNext();await rejects(()=>session.persist(),'QuotaExceededError');
 eq(parseAudioSourceManifest(await session.exportPending().text()).manifest.recordings[0].recordingId,first.recordingId);
 eq((await session.persist()).status,'export-pending');
});
await test('Cancelled file sharing retains pending JSON and IDs for the next user action',async()=>{
 const {session,store}=await make({input:true});const ready=await stage(session),pending=await session.persist();
 const share=Object.getOwnPropertyDescriptor(navigator,'share'),canShare=Object.getOwnPropertyDescriptor(navigator,'canShare');
 try{
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
  Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelled','AbortError');}});
  await rejects(()=>shareFile(pending.file),'AbortError');
  eq([...store.records.values()][0].state,'export-pending');eq(parseAudioSourceManifest(await session.exportPending().text()).manifest.recordings[0].recordingId,ready.recordingId);
 }finally{
  if(share)Object.defineProperty(navigator,'share',share);else delete navigator.share;
  if(canShare)Object.defineProperty(navigator,'canShare',canShare);else delete navigator.canShare;
 }
});
await test('Rereading a saved iPhone inventory reuses IDs without asking to export unchanged JSON',async()=>{
 const {session,source,store}=await make({input:true});const first=await stage(session);
 await session.reconcileAvailability({observedPaths:['memo.wav'],verifiedPaths:['memo.wav'],complete:false});
 const exported=await session.persist();eq(exported.status,'export-pending');
 const selected={...source,files:[...source.files,exported.file]};const reopened=await openAudioSourceSession({source:selected,recoveryStore:store});eq(reopened.status,'ready');
 const checked=await stage(reopened.session);eq(checked.recordingId,first.recordingId);
 await reopened.session.reconcileAvailability({observedPaths:['memo.wav'],verifiedPaths:['memo.wav'],complete:false});
 const unchanged=await reopened.session.persist();eq(unchanged.status,'unchanged');assert(!unchanged.file,'Unchanged list requested another export');
});
await test('Production audio membership uses bounded header reads regardless of file size and never rehashes before saving',async()=>{
 const reads=[];
 for(const size of [64,8*1024*1024]){
  const file=new File([f.wav([f.wavChunk('JUNK',new Uint8Array(size))])],'memo.wav');let bytesRead=0;
  const slice=file.slice.bind(file);file.slice=(start,end)=>{assert((end??file.size)-start<=8192,'Payload-sized audio read attempted');bytesRead+=(end??file.size)-start;return slice(start,end);};file.arrayBuffer=()=>{throw Error('Whole-file audio read attempted');};
  const source={kind:'file-input',name:'Audio',files:[file]},store=memoryStore();
  const opened=await openAudioSourceSession({source,recoveryStore:store,action:'create',verifyAudioContents:false});const identity=await stage(opened.session);eq(identity.status,'ready');assert(!('audioFingerprint' in opened.session.getManifest().recordings[0]),'Fake digest stored');
  const headers=bytesRead;await opened.session.persist();eq(bytesRead,headers,'Saving read audio contents again');assert(headers<8192,'Header inspection read too much audio');reads.push(headers);
  file.slice=()=>{throw Error('Known audio headers were reread');};const repeated=await stage(opened.session);eq(repeated.recordingId,identity.recordingId);await opened.session.persist();eq(bytesRead,headers);
 }
 eq(reads[0],reads[1],'Reading cost scaled with audio payload length');
});
await test('Returning embedded audio keeps its ID after complete inventory removal; partial access never prunes',async()=>{
 const file=new File([f.wav([f.wavChunk('imID',f.payload(f.ID))])],'memo.wav'),source={kind:'file-input',name:'Audio',files:[file]},store=memoryStore();
 const opened=await openAudioSourceSession({source,recoveryStore:store,action:'create',verifyAudioContents:false});const session=opened.session;
 eq((await stage(session)).recordingId,f.ID);await session.reconcileAvailability({observedPaths:[],verifiedPaths:[],complete:false});eq(session.getManifest().recordings.length,1);
 await session.reconcileAvailability({observedPaths:[],verifiedPaths:[],complete:true});eq(session.getManifest().recordings.length,0);await session.persist();
 eq((await stage(session)).recordingId,f.ID);
});
await test('Completed sharing releases only matching pending exports and does not reflag the same audio list',async()=>{
 const {session,store}=await make({input:true,verifyAudioContents:false});await stage(session);const pending=await session.persist();
 const archiveA=new File(['archive A'],'memora-transcript-archive.json'),archiveB=new File(['archive B'],'memora-transcript-archive.json');await session.retainTranscriptArchive(archiveA);
 eq(await session.acknowledgeShared('source',pending.file),true);eq((await store.get(session.sourceId)).state,'verified');assert(session.getPendingTranscriptArchive(),'Pending transcript list lost during audio acknowledgement');
 eq(await session.acknowledgeShared('archive',archiveB),false);eq(session.getPendingTranscriptArchive(),'archive A');
 eq(await session.acknowledgeShared('archive',archiveA),true);eq(session.getPendingTranscriptArchive(),null);eq((await session.persist()).status,'unchanged','Shared audio list was reflagged');
 await session.retainTranscriptArchive(archiveB);eq((await store.get(session.sourceId)).state,'verified','Pending transcript changed audio-list save state');eq(await session.acknowledgeShared('archive',archiveA),false);eq(session.getPendingTranscriptArchive(),'archive B');
 store.failNext();await rejects(()=>session.retainTranscriptArchive(archiveA),'QuotaExceededError');const archiveC=new File(['archive C'],'memora-transcript-archive.json');await session.retainTranscriptArchive(archiveC);eq((await store.get(session.sourceId)).pendingTranscriptArchive,'archive C','Retry persisted an older pending export');
});
await test('Fresh valid folder JSON overrides different phone pending data and stale decision actions',async()=>{
 const {session,source,store}=await make({input:true,verifyAudioContents:false});await stage(session);await session.persist();
 const pendingArchive=JSON.stringify({schemaVersion:1,archiveUuid:OTHER,archiveName:'Pending transcripts',recordings:[]});await session.retainTranscriptArchive(new File([pendingArchive],'memora-transcript-archive.json'));
 const disk=session.getManifest();disk.recordings[0].recordingId=OTHER;disk.fromDesktop=true;
 const selected={...source,files:[...source.files,new File([JSON.stringify(disk)],AUDIO_SOURCE_FILENAME)]};
 for(const action of [null,'resume','replace','create']){
  const opened=await openAudioSourceSession({source:selected,recoveryStore:store,verifyAudioContents:false,action});eq(opened.status,'ready');eq(opened.session.getManifest(),disk);eq(opened.session.getPendingTranscriptArchive(),pendingArchive);
 }
 const reopened=await openAudioSourceSession({source:selected,recoveryStore:store,verifyAudioContents:false});eq((await stage(reopened.session)).recordingId,OTHER);eq((await reopened.session.persist()).status,'unchanged');
 eq(JSON.parse((await store.get(session.sourceId)).manifestText),disk);
 const native=directory({'memo.wav':audio(),[AUDIO_SOURCE_FILENAME]:JSON.stringify(disk)}),record=await store.get(session.sourceId);
 await store.put({...record,revision:'stale-native',state:'pending',manifestText:JSON.stringify(session.getManifest()),directoryHandle:native.root},record.revision);
 const desktop=await openAudioSourceSession({source:native.root,recoveryStore:store,verifyAudioContents:false});eq(desktop.status,'ready');eq((await stage(desktop.session)).recordingId,OTHER);eq((await desktop.session.persist()).status,'unchanged');eq(native.state.writes,0);
});
await test('Unchanged desktop and partial iPhone membership cause no JSON rewrite or repeated recovery writes',async()=>{
 const entry={audioRelativePath:'memo.wav',recordingId:SOURCE,identityOrigin:'memora-assigned',sourceAvailability:{status:'unverified',note:'keep'}};
 const json=JSON.stringify({schemaVersion:1,audioSourceId:OTHER,recordings:[entry],extensions:{keep:true}}),{root,state}=directory({'memo.wav':audio(),[AUDIO_SOURCE_FILENAME]:json}),store=memoryStore();
 let opened=await openAudioSourceSession({source:root,recoveryStore:store,verifyAudioContents:false});await stage(opened.session);await opened.session.reconcileAvailability({observedPaths:['memo.wav'],verifiedPaths:['memo.wav'],complete:true});eq((await opened.session.persist()).status,'unchanged');eq(state.writes,0);const puts=store.puts;
 await opened.session.persist();eq(store.puts,puts,'Unchanged persistence rewrote recovery');
 opened=await openAudioSourceSession({source:root,recoveryStore:store,verifyAudioContents:false});await stage(opened.session);await opened.session.reconcileAvailability({observedPaths:['memo.wav'],verifiedPaths:['memo.wav'],complete:true});eq((await opened.session.persist()).status,'unchanged');eq(store.puts,puts);eq(state.writes,0);
 const partial=JSON.parse(json);partial.recordings.push({...entry,audioRelativePath:'not-supplied.wav',recordingId:'99999999-1234-1234-1234-123456789abc',sourceAvailability:{status:'available'}});
 const source={kind:'file-input',name:'Audio',files:[new File([audio()],'memo.wav'),new File([JSON.stringify(partial)],AUDIO_SOURCE_FILENAME)]};
 opened=await openAudioSourceSession({source,recoveryStore:store,verifyAudioContents:false});await stage(opened.session);const counts=await opened.session.reconcileAvailability({observedPaths:['memo.wav'],verifiedPaths:['memo.wav'],complete:false});eq(counts.unverified,1);eq(opened.session.getManifest(),partial);eq((await opened.session.persist()).status,'unchanged');
});
await test('1500 known recordings use indexed lookups without serializing or rereading the full list per file',async()=>{
 const count=1500,entries=Array.from({length:count},(_,i)=>({audioRelativePath:`memo-${i}.wav`,recordingId:`00000000-0000-4000-8000-${(i+1).toString(16).padStart(12,'0')}`,identityOrigin:'memora-assigned'}));
 const files=entries.map(entry=>{const file=new File(['not read'],entry.audioRelativePath);file.slice=()=>{throw Error('Known audio was read');};return file;});
 const source={kind:'file-input',name:'Audio',files:[...files,new File([JSON.stringify({schemaVersion:1,audioSourceId:OTHER,recordings:entries})],AUDIO_SOURCE_FILENAME)]},store=memoryStore();store.list=async()=>{throw Error('Unrelated recovery lists should not load for valid JSON');};
 const opened=await openAudioSourceSession({source,recoveryStore:store,verifyAudioContents:false});eq(opened.status,'ready');assert(!opened.session.recoveryError,'Loaded unrelated backups');
 const original=JSON.stringify;let fullSerializations=0;
 try{JSON.stringify=function(value,...args){if(value?.recordings?.length>=count)fullSerializations++;return original(value,...args);};
  for(let i=count-1;i>=0;i--){const identity=await opened.session.stageRecording({audioRelativePath:entries[i].audioRelativePath});eq(identity.recordingId,entries[i].recordingId);}
 }finally{JSON.stringify=original;}
 eq(fullSerializations,0,'Known-file loop serialized the complete list');eq((await opened.session.persist()).status,'unchanged');
});
await test('Bulk enrollment validates compact new entries and still catches cross-file duplicate IDs',async()=>{
 const count=250,files=Array.from({length:count},(_,i)=>new File([f.wav()],`new-${i}.wav`)),source={kind:'file-input',name:'New audio',files},store=memoryStore();
 const opened=await openAudioSourceSession({source,recoveryStore:store,verifyAudioContents:false,action:'create'});const original=JSON.stringify;let fullSerializations=0;
 try{JSON.stringify=function(value,...args){if(value?.recordings?.length>1)fullSerializations++;return original(value,...args);};for(const file of files)eq((await opened.session.stageRecording({audioRelativePath:file.name})).status,'ready');}finally{JSON.stringify=original;}
 eq(fullSerializations,0,'New-file enrollment repeatedly serialized the complete list');eq(opened.session.getManifest().recordings.length,count);eq((await opened.session.persist()).status,'export-pending');
 const duplicateFiles=['first.wav','copy.wav'].map(name=>new File([f.wav([f.wavChunk('imID',f.payload(f.ID))])],name)),duplicateSource={kind:'file-input',name:'Duplicates',files:duplicateFiles};
 const duplicate=await openAudioSourceSession({source:duplicateSource,recoveryStore:memoryStore(),verifyAudioContents:false,action:'create'});eq((await duplicate.session.stageRecording({audioRelativePath:'first.wav'})).status,'ready');eq((await duplicate.session.stageRecording({audioRelativePath:'copy.wav'})).code,'duplicate-recording-id');
});
await test('Recovery matches browser-confirmed directory or established ID, never folder name',async()=>{
 const {session,source,store}=await make();await stage(session);await session.persist();const records=await store.list();
 eq((await matchAudioSourceRecovery(records,{source})).length,1);
 eq((await matchAudioSourceRecovery(records,{source:directory().root})).length,0);
 eq((await matchAudioSourceRecovery(records,{establishedAudioSourceIds:[session.sourceId]})).length,1);
});
await test('Missing list offers explicit restore; unrelated source gets create choice',async()=>{
 const {session,source,state,store}=await make();const first=await stage(session);await session.persist();state.files.delete(AUDIO_SOURCE_FILENAME);
 eq((await openAudioSourceSession({source,recoveryStore:store})).code,'restore-available');
 const restored=await openAudioSourceSession({source,recoveryStore:store,action:'restore'});eq((await stage(restored.session)).recordingId,first.recordingId);await restored.session.persist();
 eq((await openAudioSourceSession({source:directory().root,recoveryStore:store})).code,'create-source-list');
});
await test('Restore is hidden for an existing list, all-embedded audio, or a missing list with no recoverable current fallback IDs',async()=>{
 const {session,source,state,store}=await make();await stage(session);await session.persist();
 eq((await openAudioSourceSession({source,recoveryStore:store})).status,'ready');eq((await openAudioSourceSession({source,recoveryStore:store,action:'restore'})).code,'restore-not-available');
 state.files.delete(AUDIO_SOURCE_FILENAME);state.files.set('memo.wav',new Uint8Array(await f.wav([f.wavChunk('imID',f.payload(f.ID))]).arrayBuffer()));
 const embedded=await openAudioSourceSession({source,recoveryStore:store});eq(embedded.code,'create-source-list');assert(!embedded.canRestore,'Embedded audio exposed irrelevant fallback recovery');
 state.files.delete('memo.wav');state.files.set('new.wav',audio());const newOnly=await openAudioSourceSession({source,recoveryStore:store});assert(!newOnly.canRestore,'Saved copy had no useful ID for new files');
 state.files.delete('new.wav');assert(!(await openAudioSourceSession({source,recoveryStore:store})).canRestore,'Empty source offered Restore');
});
await test('A same-name unrelated directory and a present invalid JSON never offer Restore',async()=>{
 const {session,source,state,store}=await make();await stage(session);await session.persist();
 const unrelated=directory({'memo.wav':audio()});assert(!(await openAudioSourceSession({source:unrelated.root,recoveryStore:store})).canRestore,'Folder-name matching exposed unrelated recovery');
 state.files.set(AUDIO_SOURCE_FILENAME,enc.encode('{broken'));const invalid=await openAudioSourceSession({source,recoveryStore:store});eq(invalid.code,'unreadable-source-list');assert(!invalid.canRestore,'Unreadable present JSON was called missing');
 eq((await openAudioSourceSession({source,recoveryStore:store,action:'restore'})).code,'restore-not-available');
});
await test('A valid current list is authoritative over older recoveries attached to the same directory',async()=>{
 const {session,source,state,store}=await make();await stage(session);await session.persist();
 state.files.set(AUDIO_SOURCE_FILENAME,enc.encode(JSON.stringify({schemaVersion:1,audioSourceId:OTHER,recordings:[]})));
 const opened=await openAudioSourceSession({source,recoveryStore:store});eq(opened.status,'ready');eq(opened.session.sourceId,OTHER);
 eq((await openAudioSourceSession({source,recoveryStore:store,action:'restore'})).code,'restore-not-available');
});
await test('Deleted list with two same-folder recoveries offers dated recording summaries without changing data',async()=>{
 const {session,source,state,store}=await make();await stage(session);await session.persist();
 const first=(await store.list())[0],other=JSON.parse(first.manifestText);other.audioSourceId=OTHER;other.recordings[0].recordingId=OTHER;
 await store.put({...first,audioSourceId:OTHER,revision:'other-revision',manifestText:JSON.stringify(other),updatedAt:'2026-11-18T10:00:00Z'},null);
 state.files.delete(AUDIO_SOURCE_FILENAME);const puts=store.puts;
 const missing=await openAudioSourceSession({source,recoveryStore:store});eq(missing.code,'restore-available');assert(missing.canRestore,'Restore missing');
 const result=await openAudioSourceSession({source,recoveryStore:store,action:'restore'});eq(result.code,'recovery-association-conflict');eq(result.candidates.length,2);
 eq(result.candidates[0].recordingCount,1);eq(result.candidates[0].recordingExamples,['memo.wav']);eq(result.candidates[1].recordingExamples,['memo.wav']);eq(result.candidates[1].updatedAt,'2026-11-18T10:00:00Z');eq(store.puts,puts);assert(!state.files.has(AUDIO_SOURCE_FILENAME),'Prompt wrote a replacement');
 const restored=await openAudioSourceSession({source,recoveryStore:store,selectedRecoverySourceId:session.sourceId,action:'restore'});eq(restored.session.sourceId,session.sourceId);eq(restored.session.getManifest().recordings[0].recordingId,session.getManifest().recordings[0].recordingId);
});
await test('File-input omission hides Restore even with saved copies, matching names or an established source ID',async()=>{
 const {session,source,store}=await make({input:true});await stage(session);await session.persist();
 store.records.set('invalid',{...(await store.list())[0],audioSourceId:'invalid'});
 const prompt=await openAudioSourceSession({source,recoveryStore:store});eq(prompt.code,'select-existing-or-create');assert(!prompt.canRestore,'Unassociated copies exposed');
 const identified=await openAudioSourceSession({source,recoveryStore:store,establishedAudioSourceIds:[session.sourceId]});assert(!identified.canRestore,'Omission mistaken for confirmed absence');
 eq((await openAudioSourceSession({source,recoveryStore:store,action:'restore',selectedRecoverySourceId:session.sourceId})).code,'restore-not-available');
 let listed=false;store.list=async()=>{listed=true;throw Error('Do not load unrelated recovery archives for unidentified file input');};
 await openAudioSourceSession({source,recoveryStore:store});assert(!listed,'Unidentified file input loaded unrelated backups');
 const created=await openAudioSourceSession({source,recoveryStore:store,action:'create'});eq(created.status,'ready');assert(created.session.sourceId!==session.sourceId,'Create reused an unrelated saved source');
});
await test('Source revalidation catches JSON deletion or external edits before inference',async()=>{
 const {session,state}=await make();await stage(session);await session.persist();await session.revalidateSource();
 const saved=state.files.get(AUDIO_SOURCE_FILENAME);state.files.delete(AUDIO_SOURCE_FILENAME);await rejects(()=>session.revalidateSource(),'source-changed');
 state.files.set(AUDIO_SOURCE_FILENAME,enc.encode('{}'));await rejects(()=>session.revalidateSource(),'source-changed');
 state.files.set(AUDIO_SOURCE_FILENAME,saved);await session.revalidateSource();
});
await test('Recovery cannot silently relabel a conflicting established source association',async()=>{
 const {session,source,state,store}=await make();await stage(session);await session.persist();state.files.delete(AUDIO_SOURCE_FILENAME);
 const conflict=await openAudioSourceSession({source,recoveryStore:store,action:'restore',establishedAudioSourceIds:[OTHER]});eq(conflict.code,'source-id-conflict');
 const restored=await openAudioSourceSession({source,recoveryStore:store,action:'restore',establishedAudioSourceIds:[OTHER],selectedAudioSourceId:session.sourceId});eq(restored.session.sourceId,session.sourceId);
});
await test('A present interrupted-write shell hides Restore; browsing the pending copy preserves IDs',async()=>{
 const {session,source,state,store}=await make();const first=await stage(session);state.failWrite=true;await rejects(()=>session.persist());state.failWrite=false;
 const prompt=await openAudioSourceSession({source,recoveryStore:store});eq(prompt.code,'unreadable-source-list');assert(!prompt.canRestore,'Present unreadable JSON exposed Restore');
 eq((await openAudioSourceSession({source,recoveryStore:store,action:'restore'})).code,'restore-not-available');
 const selectedFile=session.exportPending();eq((await openAudioSourceSession({source,recoveryStore:store,selectedFile})).code,'confirm-replacement');
 const resumed=await openAudioSourceSession({source,recoveryStore:store,selectedFile,replacementConfirmed:true});eq(resumed.status,'ready');eq((await stage(resumed.session)).recordingId,first.recordingId);await resumed.session.persist();
});
await test('Invalid JSON needs separate replacement confirmation; cancel leaves bytes intact',async()=>{
 const {root,state}=directory({[AUDIO_SOURCE_FILENAME]:'{bad'}), store=memoryStore();
 eq((await openAudioSourceSession({source:root,recoveryStore:store})).code,'unreadable-source-list');
 eq((await openAudioSourceSession({source:root,recoveryStore:store,action:'replace'})).code,'confirm-replacement');eq(textOf(state),'{bad');eq(store.puts,0);
 const result=await openAudioSourceSession({source:root,recoveryStore:store,action:'replace',replacementConfirmed:true});eq(result.status,'ready');await result.session.persist();
});
await test('Source-ID conflicts require a known explicit association',async()=>{
 const {root}=directory({[AUDIO_SOURCE_FILENAME]:JSON.stringify(manifest())}),store=memoryStore();
 eq((await openAudioSourceSession({source:root,recoveryStore:store,establishedAudioSourceIds:[OTHER]})).code,'source-id-conflict');
 eq((await openAudioSourceSession({source:root,recoveryStore:store,establishedAudioSourceIds:[OTHER],selectedAudioSourceId:OTHER})).session.sourceId,OTHER);
});
await test('Concurrent sessions cannot overwrite newer source data',async()=>{
 const {root,state}=directory({'memo.wav':audio(),[AUDIO_SOURCE_FILENAME]:JSON.stringify(manifest())}),store=memoryStore();
 const a=(await openAudioSourceSession({source:root,recoveryStore:store})).session,b=(await openAudioSourceSession({source:root,recoveryStore:store})).session;
 await stage(a);await stage(b);await a.persist();const saved=textOf(state);await rejects(()=>b.persist(),'source-changed');eq(textOf(state),saved);
});
await test('Abort before persistence leaves all source/recovery bytes untouched',async()=>{
 const controller=new AbortController(),{session,state,store}=await make({signal:controller.signal});await stage(session);controller.abort();await rejects(()=>session.persist(),'AbortError');eq(state.writes,0);eq(store.puts,0);
});
await test('Valid embedded ID preserved, unknown fields survive source updates',async()=>{
 const bytes=f.mp4([f.imuseBox(f.payload(f.ID))]);const {root,state}=directory({'memo.m4a':bytes,[AUDIO_SOURCE_FILENAME]:JSON.stringify({...manifest(),extensions:{preserve:'yes'}})});
 const opened=await openAudioSourceSession({source:root,recoveryStore:memoryStore()});const ready=await opened.session.stageRecording({audioRelativePath:'memo.m4a'});eq(ready.recordingId,f.ID);await opened.session.persist();eq(parseAudioSourceManifest(textOf(state)).manifest.extensions,{preserve:'yes'});
});

if(globalThis.indexedDB) await test('Real IndexedDB v5 upgrade preserves four stores; recovery CAS and explicit removal',async()=>{
 const name=`Memora-source-persistence-test-${crypto.randomUUID()}`;
 const req=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 const legacy=indexedDB.open(name,5);legacy.onupgradeneeded=()=>{const db=legacy.result;
  db.createObjectStore('transcripts',{keyPath:'filename'}).put({filename:'keep.txt',transcript:'retain'});
  const semantic=db.createObjectStore('semanticEntries',{keyPath:'id'});semantic.createIndex('representationKey','representationKey');semantic.createIndex('sourceKey','sourceKey');semantic.put({id:'keep',embedding:new Float32Array([1,2]).buffer});
  db.createObjectStore('semanticMetadata',{keyPath:'key'}).put({key:'keep',value:123});db.createObjectStore('modelRegistry',{keyPath:'id'}).put({id:'keep',evidence:'retain'});
 };
 (await req(legacy)).close();const manager=createDatabaseManager({name}),store=createAudioSourceRecoveryStore({openDatabase:()=>manager.open()});
 try{
  const db=await manager.open();eq(db.version,DATABASE_VERSION);eq(db.objectStoreNames.length,5);
  const tx=db.transaction(['transcripts','semanticEntries','semanticMetadata','modelRegistry']);const requests=[...tx.objectStoreNames].map(key=>req(tx.objectStore(key).getAll()));const values=await Promise.all(requests);assert(values.every(items=>items.length===1),'legacy records lost');db.close();
  const record={audioSourceId:SOURCE,revision:'first',state:'pending',manifestText:JSON.stringify(manifest()),baseBytes:null};await store.put(record,null);
  await rejects(()=>store.put({...record,revision:'second'},null),'recovery-conflict');eq((await store.get(SOURCE)).revision,'first');
  await store.put({...record,revision:'second'},'first');await rejects(()=>store.remove(SOURCE,'first'),'recovery-conflict');eq((await store.list()).length,1);
  await store.remove(SOURCE,'second');eq(await store.get(SOURCE),null);
 }finally{await req(indexedDB.deleteDatabase(name));}
});
else lines.push('SKIP Real IndexedDB requires the isolated browser harness.');

if(globalThis.indexedDB) await test('Latest-copy grouping, verified cleanup, pending preservation and atomic bulk deletion use proven folder identity',async()=>{
 const root=await navigator.storage.getDirectory(),folderName=`Memora-copy-cleanup-${crypto.randomUUID()}`,otherName=`Memora-copy-other-${crypto.randomUUID()}`;
 const folder=await root.getDirectoryHandle(folderName,{create:true}),other=await root.getDirectoryHandle(otherName,{create:true}),databaseName=`Memora-copy-cleanup-db-${crypto.randomUUID()}`,manager=createDatabaseManager({name:databaseName}),store=createAudioSourceRecoveryStore({openDatabase:()=>manager.open()});
 const ids=Array.from({length:5},()=>crypto.randomUUID()),pendingArchive=JSON.stringify({schemaVersion:1,archiveUuid:SOURCE,archiveName:'Pending',recordings:[]});
 const makeRecord=(index,extra={})=>({audioSourceId:ids[index],revision:`revision-${index}`,state:'verified',manifestText:JSON.stringify({schemaVersion:1,audioSourceId:ids[index],recordings:[]}),baseBytes:null,sourceName:'Same display name',directoryHandle:folder,updatedAt:index===0?'2030-01-01T00:00:00Z':'2020-01-01T00:00:00Z',...extra});
 try{
  for(const record of [makeRecord(0),makeRecord(1),makeRecord(2,{pendingTranscriptArchive:pendingArchive}),makeRecord(3,{state:'export-pending'}),makeRecord(4,{directoryHandle:other})])await store.put(record,null);
  const groups=await groupAudioSourceRecovery(await store.list());eq(groups.length,2,'Names merged unrelated folders');eq(groups.find(group=>group.records.length===4).latest.audioSourceId,ids[0],'Newest copy not selected');
  eq(await store.pruneSuperseded(ids[0],'revision-0'),1);eq(await store.get(ids[1]),null);assert(await store.get(ids[2]),'Pending transcript export was pruned');assert(await store.get(ids[3]),'Pending audio list was pruned');assert(await store.get(ids[4]),'Unrelated same-name source was pruned');
  const before=await store.list();await rejects(()=>store.removeMany([{audioSourceId:ids[0],revision:'stale'},{audioSourceId:ids[4],revision:'revision-4'}]),'recovery-conflict');eq((await store.list()).length,before.length,'Bulk deletion partially committed');
  await store.removeMany([{audioSourceId:ids[0],revision:'revision-0'},{audioSourceId:ids[4],revision:'revision-4'}]);eq((await store.list()).length,2);
 }finally{await root.removeEntry(folderName,{recursive:true});await root.removeEntry(otherName,{recursive:true});await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(databaseName);request.onsuccess=resolve;request.onerror=()=>reject(request.error);});}
});

if(globalThis.indexedDB) await test('Native directory writes, stored handle matching, and transcript cleanup preserve recovery',async()=>{
 const {testRecoveryDatabaseName}=await import('./source-database-adapter.js');
 const cleanup=await import('../js/storageManager.js');
 const root=await navigator.storage.getDirectory(), name=`source-2b-${crypto.randomUUID()}`;
 const directory=await root.getDirectoryHandle(name,{create:true});
 const handle=await directory.getFileHandle('memo.wav',{create:true}), writer=await handle.createWritable();await writer.write(audio());await writer.close();
 const store=createAudioSourceRecoveryStore();
 try{
  const opened=await openAudioSourceSession({source:directory,action:'create',recoveryStore:store});
  const staged=await stage(opened.session);eq(staged.status,'ready');eq((await opened.session.persist()).status,'verified');
  const record=await store.get(opened.session.sourceId);assert(await directory.isSameEntry(record.directoryHandle),'Stored directory handle lost');
  await cleanup.clearAllCachedTranscripts();await cleanup.clearAllSemanticEntries();
  eq((await store.get(opened.session.sourceId)).manifestText,record.manifestText);
  const report=await cleanup.getStorageReport();
  assert(report.indexedDB.otherStores.some(item=>item.name==='audioSourceRecovery'&&item.count===1),'Recovery omitted from storage report');
  const reopened=await openAudioSourceSession({source:directory,recoveryStore:store});eq((await stage(reopened.session)).recordingId,staged.recordingId);
 }finally{
  await root.removeEntry(name,{recursive:true});
  await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(testRecoveryDatabaseName);request.onsuccess=resolve;request.onerror=()=>reject(request.error);});
 }
});

document.body.dataset.testStatus=failures.length?'failed':'passed';
document.querySelector('#results').textContent=lines.join('\n')+`\n${lines.filter(line=>line.startsWith('PASS ')).length}/${lines.filter(line=>!line.startsWith('SKIP ')).length} groups passed`;
globalThis.recordingIdentityTestResult={passed:lines.filter(line=>line.startsWith('PASS ')).length,failed:failures};
if(globalThis.location?.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify({...globalThis.recordingIdentityTestResult,output:document.querySelector('#results').textContent})});
