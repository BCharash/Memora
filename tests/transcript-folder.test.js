import { readTranscriptFolder, reconcileTranscriptRecords, createTranscriptFolderSession } from '../js/transcriptFolder.js';
import { readTranscriptFiles, readTranscriptSourceText, parseTranscriptFile } from '../js/combine.js';
import { parseTranscriptArchive } from '../js/transcriptArchive.js';
import { selectFolder } from '../js/storage.js';
const ARCHIVE='9599e552-b194-4511-8865-b37a07413a38',ID='4cd30ed1-dad7-4f9b-876c-0ba7f9d53ed9',OTHER='12345678-1234-4234-8234-123456789abc';
const JSON_NAME='memora-archive.json',encode=value=>new TextEncoder().encode(value);
const body=({id=ID,archive=ARCHIVE,model='tiny',operation='transcribe',text='Current body'}={})=>`memo.wav\n\nWhisper model: ${model}\nOperation: ${operation}\nArchive UUID: ${archive}\nRecording ID: ${id}\n\n--------------------------------------------------\n\n${text}\n`;
const manifest=(refs=[{relativePath:'a.txt',model:'tiny',operation:'transcribe'}])=>({schemaVersion:1,archiveUuid:ARCHIVE,archiveName:'Archive',custom:{retained:true},recordings:[{recordingId:ID,customEntry:'keep',transcripts:refs}]});
const file=(name,text,path=null)=>{const value=new File([text],name);if(path)Object.defineProperty(value,'webkitRelativePath',{value:path});return value;};
const record=(name,options)=>parseTranscriptFile(file(name,body(options)),body(options));
function directory(values){
 const state={files:new Map(Object.entries(values).map(([key,value])=>[key,encode(value)])),enumerations:0,reads:0,writes:0,failWrite:false,failEnumerate:false,failRead:null,badReadback:false,readbackError:false};
 const source={kind:'directory',name:'Transcript test folder',async *entries(){state.enumerations++;for(const name of state.files.keys()){if(state.failEnumerate)throw Error('Interrupted inventory');yield[name,await source.getFileHandle(name)];}},async getFileHandle(name,{create=false}={}){
  if(!state.files.has(name)){if(!create)throw new DOMException('Not found','NotFoundError');state.files.set(name,encode(''));}
  return {kind:'file',name,async getFile(){if(state.failRead===name)throw Error('Unreadable file');if(state.readbackError&&state.writes){state.readbackError=false;throw Error('Readback unavailable');}const value=file(name,state.files.get(name));if(/\.txt$/.test(name)){const text=value.text.bind(value);value.text=()=>{state.reads++;return text();};}return value;},async createWritable(){let pending;return{async write(text){state.writes++;if(state.failWrite){state.failWrite=false;throw Error('Write failed');}pending=encode(state.badReadback?'corrupt':text);},async close(){state.files.set(name,pending);},async abort(){}};}};
 }};return{source,state,text:name=>new TextDecoder().decode(state.files.get(name))};
}
const lines=[],failed=[];const assert=(value,message='Assertion failed')=>{if(!value)throw Error(message);};const eq=(left,right)=>assert(JSON.stringify(left)===JSON.stringify(right),`${JSON.stringify(left)} != ${JSON.stringify(right)}`);
async function rejects(action){try{await action();}catch{return;}throw Error('Expected rejection');}
async function test(name,action){try{await action();lines.push('PASS '+name);}catch(error){failed.push(name);lines.push('FAIL '+name+': '+error.stack);}}
await test('The production folder picker marks folder coverage independently of read-only file-input access',async()=>{
 const input=document.getElementById('folderInput'),picker=Object.getOwnPropertyDescriptor(window,'showDirectoryPicker'),files=Object.getOwnPropertyDescriptor(input,'files'),click=input.click;
 try{
  Object.defineProperty(window,'showDirectoryPicker',{configurable:true,value:undefined});Object.defineProperty(input,'files',{configurable:true,value:[file('a.txt',body(),'Phone/a.txt')]});input.click=()=>input.dispatchEvent(new Event('change'));
  let selected=await selectFolder();eq(selected.kind,'file-input');eq(selected.selectionScope,'folder');eq(selected.name,'Phone');
  input.webkitdirectory=false;selected=await selectFolder();eq(selected.selectionScope,'selection');
 }finally{input.webkitdirectory=true;input.click=click;if(files)Object.defineProperty(input,'files',files);else delete input.files;if(picker)Object.defineProperty(window,'showDirectoryPicker',picker);else delete window.showDirectoryPicker;}
});
await test('One inventory and one text read per transcript serve reconciliation, sorting and source text',async()=>{
 const root=directory({'a.txt':body(),'b.txt':body({model:'base'}),[JSON_NAME]:JSON.stringify(manifest())});const snapshot=await readTranscriptFolder(root.source);
 eq(root.state.enumerations,1);eq(root.state.reads,2);const again=await readTranscriptFiles(snapshot.files);eq(again[0].transcript,snapshot.records[0].transcript);await readTranscriptSourceText(snapshot.files[0]);eq(root.state.reads,2);assert(!snapshot.issues.length&&snapshot.complete);
});
await test('Editing a working record cannot change another consumer of its immutable File snapshot',async()=>{
 const root=directory({'a.txt':body()});const snapshot=await readTranscriptFolder(root.source),working=snapshot.records[0];working.transcript='Unsaved replacement';working.file=file('a.txt',body({text:'Unsaved replacement'}));const again=await readTranscriptFiles(snapshot.files);eq(again[0].transcript,'Current body');eq(root.state.reads,1);eq(await readTranscriptSourceText(snapshot.files[0]),body());
});
await test('An active or pending transcription can defer list updates while keeping parsed transcripts available',async()=>{
 const root=directory({'a.txt':body()});const snapshot=await readTranscriptFolder(root.source),session=createTranscriptFolderSession(snapshot,{updatesAllowed:false});eq(snapshot.records.length,1);eq(session.status,'blocked');assert(!session.file);eq(root.state.writes,0);assert(session.error.message.includes('Finish transcription'));
});
await test('Legacy large model headers and filenames retain their label without becoming large-v3',async()=>{
 const root=directory({'legacy - large.txt':body({model:'large'})});const snapshot=await readTranscriptFolder(root.source);eq(snapshot.records[0].whisperModel,'large');const session=createTranscriptFolderSession(snapshot);await session.save();eq(parseTranscriptArchive(root.text(JSON_NAME)).recordings[0].transcripts[0].model,'large');eq(createTranscriptFolderSession(await readTranscriptFolder(root.source)).status,'unchanged');
 eq(record('legacy - large.txt',{model:''}).whisperModel,'large');eq(record('legacy - large-2.txt',{model:''}).whisperModel,'large');eq(record('modern.txt',{model:'large-v3'}).whisperModel,'large-v3');
});
await test('Missing-field messages identify the field rather than blaming all identity metadata',async()=>{
 try{reconcileTranscriptRecords(manifest(),[{...record('a.txt'),whisperModel:null}]);throw Error('Expected failure');}catch(error){assert(error.message.includes('missing recognized Whisper model'));assert(!error.message.includes('missing Recording ID'));}
});
await test('Complete scan adds, removes and updates references, retaining extension fields and nested references',async()=>{
 const original=manifest([{relativePath:'gone.txt',model:'tiny',operation:'transcribe'},{relativePath:'a.txt',model:'tiny',operation:'transcribe',extension:'keep'},{relativePath:'nested/kept.txt',model:'base',operation:'transcribe'}]);
 const result=reconcileTranscriptRecords(original,[record('a.txt',{model:'base'}),record('new.txt',{operation:'translate'})],{complete:true});assert(result.changed);eq(result.manifest.custom,original.custom);eq(result.manifest.recordings[0].customEntry,'keep');const refs=result.manifest.recordings[0].transcripts;assert(!refs.some(ref=>ref.relativePath==='gone.txt'));eq(refs.find(ref=>ref.relativePath==='a.txt'),{relativePath:'a.txt',model:'base',operation:'transcribe',extension:'keep'});assert(refs.some(ref=>ref.relativePath==='nested/kept.txt'));eq(original.recordings[0].transcripts.length,3);
});
await test('Unchanged membership and body-only edits do not rewrite even differently formatted JSON',async()=>{
 const original=JSON.stringify(manifest());const root=directory({'a.txt':body({text:'Edited body'}),[JSON_NAME]:original});const session=createTranscriptFolderSession(await readTranscriptFolder(root.source));eq(session.status,'unchanged');eq(root.state.writes,0);eq(root.text(JSON_NAME),original);
});
await test('Native saves verify bytes, and re-opening unchanged data requires no save',async()=>{
 const root=directory({'a.txt':body(),'new.txt':body({id:OTHER}),[JSON_NAME]:JSON.stringify(manifest())});let session=createTranscriptFolderSession(await readTranscriptFolder(root.source));eq(session.status,'save-required');await session.save();eq(session.status,'saved');eq(root.state.writes,1);eq(parseTranscriptArchive(root.text(JSON_NAME)).recordings.length,2);session=createTranscriptFolderSession(await readTranscriptFolder(root.source));eq(session.status,'unchanged');eq(root.state.writes,1);
});
await test('Absent list reconstructs only an established header Archive UUID and never assigns new identities',async()=>{
 const root=directory({'a.txt':body()});const session=createTranscriptFolderSession(await readTranscriptFolder(root.source));await session.save();eq(parseTranscriptArchive(root.text(JSON_NAME)).archiveUuid,ARCHIVE);
 const legacy=directory({'a.txt':body().replace(`Archive UUID: ${ARCHIVE}\n`,'')});eq(createTranscriptFolderSession(await readTranscriptFolder(legacy.source)).status,'blocked');eq(legacy.state.writes,0);
});
await test('Empty complete folders remove immediate references, while a missing list stays absent',async()=>{
 const root=directory({[JSON_NAME]:JSON.stringify(manifest())});const session=createTranscriptFolderSession(await readTranscriptFolder(root.source));await session.save();eq(parseTranscriptArchive(root.text(JSON_NAME)).recordings,[]);
 const empty=directory({});eq(createTranscriptFolderSession(await readTranscriptFolder(empty.source)).status,'empty');eq(empty.state.writes,0);
});
await test('File-input selection retains unobserved references and emits a pending file only on changes',async()=>{
 const source={kind:'file-input',name:'Phone transcripts',files:[file('new.txt',body()),file(JSON_NAME,JSON.stringify(manifest()))]};const snapshot=await readTranscriptFolder(source);assert(!snapshot.complete);const session=createTranscriptFolderSession(snapshot);eq(session.status,'save-required');const candidate=parseTranscriptArchive(await session.file.text());eq(candidate.recordings[0].transcripts.length,2);await rejects(()=>session.save());session.acknowledgeShared(new File(['different'],JSON_NAME));eq(session.status,'save-required');session.acknowledgeShared(session.file);eq(session.status,'shared');
 source.files=[file('a.txt',body()),file(JSON_NAME,JSON.stringify(manifest()))];eq(createTranscriptFolderSession(await readTranscriptFolder(source)).status,'unchanged');
});
await test('Whole-folder file-input reconciles additions and removals like desktop without gaining write access',async()=>{
 const baseline=JSON.stringify(manifest([{relativePath:'gone.txt',model:'tiny',operation:'transcribe'},{relativePath:'nested/keep.txt',model:'base',operation:'transcribe'}]));
 const source={kind:'file-input',selectionScope:'folder',name:'Phone',files:[file('new.txt',body(),'Phone/new.txt'),file(JSON_NAME,baseline,'Phone/'+JSON_NAME)]};
 const snapshot=await readTranscriptFolder(source);assert(snapshot.complete);const session=createTranscriptFolderSession(snapshot);eq(session.status,'save-required');eq(parseTranscriptArchive(await session.file.text()).recordings[0].transcripts.map(ref=>ref.relativePath),['nested/keep.txt','new.txt']);await rejects(()=>session.save());
 const desktop=directory({'new.txt':body(),[JSON_NAME]:baseline});const native=createTranscriptFolderSession(await readTranscriptFolder(desktop.source));eq(await native.file.text(),await session.file.text());
});
await test('An empty whole-folder transcript inventory removes stale immediate references',async()=>{
 const source={kind:'file-input',selectionScope:'folder',name:'Phone',files:[file(JSON_NAME,JSON.stringify(manifest()))]};const snapshot=await readTranscriptFolder(source);assert(snapshot.complete);const session=createTranscriptFolderSession(snapshot);eq(parseTranscriptArchive(await session.file.text()).recordings,[]);
});
await test('Whole-folder read failures and cancellation still cannot authorize missing-reference removal',async()=>{
 const broken=file('unreadable.txt',body());broken.text=async()=>{throw Error('Provider failed');};const source={kind:'file-input',selectionScope:'folder',name:'Phone',files:[broken,file(JSON_NAME,JSON.stringify(manifest()))]};const snapshot=await readTranscriptFolder(source);assert(!snapshot.complete);eq(createTranscriptFolderSession(snapshot).status,'blocked');const controller=new AbortController();controller.abort();await rejects(()=>readTranscriptFolder(source,{signal:controller.signal}));
});
await test('Nested file-input files are outside root scope and do not affect the root manifest',async()=>{
 const source={kind:'file-input',name:'Phone',files:[file('a.txt',body(),'Phone/a.txt'),file('foreign.txt',body({archive:OTHER}),'Phone/nested/foreign.txt'),file(JSON_NAME,'invalid','Phone/nested/'+JSON_NAME)]};const snapshot=await readTranscriptFolder(source);eq(snapshot.files.length,1);eq(snapshot.manifest,null);eq(createTranscriptFolderSession(snapshot).status,'save-required');
});
await test('Mixed archives, manifest identity conflicts and ambiguous filenames never modify JSON',async()=>{
 for(const records of [[record('a.txt'),record('b.txt',{archive:OTHER})],[record('a.txt',{archive:OTHER})],[record('a.txt',{id:OTHER})],[record('a.txt'),record('A.txt')]]){
  await rejects(()=>Promise.resolve(reconcileTranscriptRecords(manifest(),records,{complete:true})));
 }
 const root=directory({'a.txt':body(),'b.txt':body({archive:OTHER}),[JSON_NAME]:JSON.stringify(manifest())});const session=createTranscriptFolderSession(await readTranscriptFolder(root.source));eq(session.status,'blocked');eq(root.state.writes,0);
});
await test('Unreadable or invalid JSON is blocked instead of replaced',async()=>{
 for(const text of ['{bad','{"schemaVersion":1,"schemaVersion":1}']){const root=directory({'a.txt':body(),[JSON_NAME]:text});eq(createTranscriptFolderSession(await readTranscriptFolder(root.source)).status,'blocked');eq(root.text(JSON_NAME),text);eq(root.state.writes,0);}
 const root=directory({'a.txt':body(),[JSON_NAME]:JSON.stringify(manifest())});root.state.failRead=JSON_NAME;eq(createTranscriptFolderSession(await readTranscriptFolder(root.source)).status,'blocked');eq(root.state.writes,0);
});
await test('Unreadable/invalid transcripts block reconciliation and never prune references',async()=>{
 const root=directory({'a.txt':body(),'broken.txt':'not a transcript',[JSON_NAME]:JSON.stringify(manifest())});let snapshot=await readTranscriptFolder(root.source);eq(snapshot.records.length,1);assert(snapshot.issues.length&&!snapshot.complete);eq(createTranscriptFolderSession(snapshot).status,'blocked');eq(root.state.writes,0);
 root.state.files.delete('broken.txt');root.state.failRead='a.txt';snapshot=await readTranscriptFolder(root.source);eq(createTranscriptFolderSession(snapshot).status,'blocked');eq(root.state.writes,0);
});
await test('Invalid or duplicate operation metadata cannot silently become a transcribe reference',async()=>{
 for(const text of [body({operation:'nonsense'}),body().replace('Operation: transcribe','Operation: transcribe\nOperation: translate')]){const root=directory({'a.txt':text});eq(createTranscriptFolderSession(await readTranscriptFolder(root.source)).status,'blocked');eq(root.state.writes,0);}
});
await test('Inventory failure and cancellation publish nothing',async()=>{
 const root=directory({'a.txt':body(),[JSON_NAME]:JSON.stringify(manifest())});root.state.failEnumerate=true;await rejects(()=>readTranscriptFolder(root.source));eq(root.state.writes,0);root.state.failEnumerate=false;const controller=new AbortController();await rejects(()=>readTranscriptFolder(root.source,{signal:controller.signal,onProgress:()=>controller.abort()}));eq(root.state.writes,0);
});
await test('Concurrent JSON edits block stale overwrite',async()=>{
 const root=directory({'a.txt':body(),'new.txt':body(),[JSON_NAME]:JSON.stringify(manifest())});const session=createTranscriptFolderSession(await readTranscriptFolder(root.source));const external=JSON.stringify({...manifest(),external:'preserve'});root.state.files.set(JSON_NAME,encode(external));await rejects(()=>session.save());eq(root.text(JSON_NAME),external);eq(root.state.writes,0);
});
await test('Write failure, empty creation shell and retry preserve the same identities',async()=>{
 const root=directory({'a.txt':body()});const session=createTranscriptFolderSession(await readTranscriptFolder(root.source));root.state.failWrite=true;await rejects(()=>session.save());eq(session.status,'save-required');await session.save();eq(parseTranscriptArchive(root.text(JSON_NAME)).archiveUuid,ARCHIVE);eq(session.status,'saved');
});
await test('Readback failure does not claim success or cause another identical write on retry',async()=>{
 const root=directory({'a.txt':body()});const session=createTranscriptFolderSession(await readTranscriptFolder(root.source));root.state.readbackError=true;await rejects(()=>session.save());eq(session.status,'save-required');await session.save();eq(session.status,'saved');eq(root.state.writes,1);
 const corrupt=directory({'a.txt':body()});const bad=createTranscriptFolderSession(await readTranscriptFolder(corrupt.source));corrupt.state.badReadback=true;await rejects(()=>bad.save());eq(bad.status,'save-required');await rejects(()=>bad.save());eq(corrupt.state.writes,1);
});
await test('Two sessions serialize on archive identity and a stale second candidate cannot overwrite the first',async()=>{
 const root=directory({'a.txt':body(),[JSON_NAME]:JSON.stringify(manifest())});root.state.files.set('b.txt',encode(body()));const first=createTranscriptFolderSession(await readTranscriptFolder(root.source));root.state.files.set('c.txt',encode(body()));const second=createTranscriptFolderSession(await readTranscriptFolder(root.source));await first.save();const saved=root.text(JSON_NAME);await rejects(()=>second.save());eq(root.text(JSON_NAME),saved);eq(root.state.writes,1);
});
await test('A fresh folder read sees externally edited text at the same path instead of reusing an older File snapshot',async()=>{
 const root=directory({'a.txt':body(),[JSON_NAME]:JSON.stringify(manifest())});const first=await readTranscriptFolder(root.source);root.state.files.set('a.txt',encode(body({text:'Externally edited'})));const second=await readTranscriptFolder(root.source);assert(first.files[0]!==second.files[0]);assert(second.records[0].transcript==='Externally edited');eq(createTranscriptFolderSession(second).status,'unchanged');
});
await test('Real browser-private directory save/readback updates only the transcript list and cleans up its own fixture',async()=>{
 const root=await navigator.storage.getDirectory(),name='memora-transcript-folder-test-'+crypto.randomUUID();const source=await root.getDirectoryHandle(name,{create:true});
 const put=async(filename,text)=>{const handle=await source.getFileHandle(filename,{create:true}),writer=await handle.createWritable();await writer.write(text);await writer.close();};
 try{
  const raw=body();await put('a.txt',raw);await put(JSON_NAME,JSON.stringify(manifest([{relativePath:'removed.txt',model:'tiny',operation:'transcribe'}])));await put('search-embeddings.json','untouched derived fixture');
  const snapshot=await readTranscriptFolder(source),session=createTranscriptFolderSession(snapshot);eq(session.status,'save-required');await session.save();eq(session.status,'saved');eq(parseTranscriptArchive(await (await source.getFileHandle(JSON_NAME)).getFile().then(file=>file.text())).recordings[0].transcripts.map(ref=>ref.relativePath),['a.txt']);
  eq(await (await source.getFileHandle('a.txt')).getFile().then(file=>file.text()),raw);eq(await (await source.getFileHandle('search-embeddings.json')).getFile().then(file=>file.text()),'untouched derived fixture');eq(createTranscriptFolderSession(await readTranscriptFolder(source)).status,'unchanged');
 }finally{await root.removeEntry(name,{recursive:true});}
});
document.getElementById('results').textContent=lines.join('\n')+`\n${lines.length-failed.length}/${lines.length} groups passed`;document.body.dataset.result=failed.length?'failed':'passed';
if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify({passed:lines.length-failed.length,failed,output:document.getElementById('results').textContent})});
