// Historical build .7 sidecar/bundle harness. Replaced in production by transcript-catalogue.test.js.
// Retained as specification evidence for the retired workflow, not a current app suite.
import {directory,selections,calls,seedAudio,pauseNextTranscription} from './transcription-identity-fixtures.js';
import {readTranscriptIdentity,replaceTranscriptBody,recordingIdentityLines} from '../js/transcriptMetadata.js';
import {parseTranscriptArchive,appendTranscriptReference,openTranscriptArchive} from '../js/transcriptArchive.js';
import {parseTranscriptFile,combineTranscriptRecords,selectHighestModelRecords} from '../js/combine.js';
import {associatedSourceEvidence,createTranscriptionIdentity} from '../js/transcriptionIdentity.js';
import {readAudioMetadata as readRealMetadata} from '../js/metadata.js?identity-dates';
import {readEmbeddedRecordingIdentity} from '../js/recordingIdentity.js';
import * as f from './recording-identity-fixtures.js';
import {createRecordingIdentityUI,pickIdentityJson,validateIdentitySelection,askIdentity} from '../js/recordingIdentityUI.js';
import {testRecoveryDatabaseName} from './source-database-adapter.js';
const SOURCE='15d91f9a-735e-4d73-a6b6-427140869795',ID='4cd30ed1-dad7-4f9b-876c-0ba7f9d53ed9',ARCHIVE='9599e552-b194-4511-8865-b37a07413a38';
const lines=[],failures=[],decoder=new TextDecoder();
const assert=(value,message)=>{if(!value)throw Error(message||'Assertion failed');};
const eq=(a,b,message)=>assert(JSON.stringify(a)===JSON.stringify(b),message||`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
async function rejects(work){try{await work();}catch{return;}throw Error('Expected failure');}
async function waitFor(check){const until=Date.now()+7000;while(!check()){if(Date.now()>until)throw Error('Timed out: '+check.toString()+'; status='+document.getElementById('transcriptionStatus')?.textContent+'; dialog='+document.querySelector('dialog[open]')?.textContent);await new Promise(resolve=>setTimeout(resolve,15));}}
async function test(name,work){try{await work();lines.push('PASS '+name);}catch(error){failures.push(name);lines.push('FAIL '+name+': '+(error.stack||error));}if(location.search.includes('report=1'))await fetch('/_identity-test-progress',{method:'POST',body:lines.at(-1)});}
const header=(label='Recording ID',id=ID)=>`memo.wav\r\n\r\n${label}: ${id}\r\nArchive UUID: ${ARCHIVE}\r\nAudio Source ID: ${SOURCE}\r\nOriginal Audio Folder: Audio\r\nWhisper model: tiny\r\nOperation: transcribe\r\nUnknown field: retain me\r\n\r\n--------------------------------------------------\r\n\r\nold body\r\n`;
await test('Universal and legacy labels resolve only from headers; dual conflicts block',async()=>{
 eq(readTranscriptIdentity(header()).recordingId,ID);eq(readTranscriptIdentity(header('Voice Memo ID')).recordingId,ID);
 const withBody=header()+'Voice Memo ID: '+ARCHIVE;eq(readTranscriptIdentity(withBody).recordingId,ID);
 await rejects(()=>Promise.resolve(readTranscriptIdentity(header().replace('Archive UUID:',`Voice Memo ID: ${ARCHIVE}\r\nArchive UUID:`))));
 await rejects(()=>Promise.resolve(readTranscriptIdentity(header().replace(ID,'bad-id'))));
});
await test('Editor preserves exact CRLF header and user body bytes',async()=>{
 const original=header(),body='\n  exact body\r\n\r\n';const changed=replaceTranscriptBody(original,body);
 assert(changed.startsWith(original.slice(0,original.indexOf('old body'))),'Header changed');assert(changed.endsWith(body),'Body normalized');
});
await test('Combine accepts migrated headers and keeps different archives independent',async()=>{
 const record=parseTranscriptFile(new File([header()],'a.txt'),header());eq(record.recordingId,ID);eq(record.audioSourceId,null);
 const other={...record,archiveUuid:SOURCE};eq(selectHighestModelRecords([record,other]).length,2);
 assert(combineTranscriptRecords([record]).includes('Recording ID: '+ID),'Universal TXT label missing');
});
await test('Readable header writer validates identity and rejects injected fields',async()=>{
 const result=recordingIdentityLines({recordingId:ID,archiveUuid:ARCHIVE,audioSourceId:SOURCE,originalAudioFolderName:'Audio'});
 assert(result.includes('Recording ID: '+ID)&&!result.some(line=>line.startsWith('Identity origin:')),'Identity contract');
 await rejects(()=>Promise.resolve(recordingIdentityLines({recordingId:ID,archiveUuid:ARCHIVE,audioSourceId:SOURCE,originalAudioFolderName:'Audio\nInjected: x'})));
});
await test('Archive validation rejects duplicate JSON keys, unsafe paths and conflicts',async()=>{
 const manifest={schemaVersion:1,archiveUuid:ARCHIVE,archiveName:'Archive',recordings:[],extensions:{keep:true}};
 const candidate=appendTranscriptReference(manifest,{recordingId:ID,filename:'memo.txt',model:'tiny',operation:'transcribe'});
 eq(candidate.extensions,{keep:true});eq(manifest.recordings.length,0);
 eq(appendTranscriptReference(candidate,{recordingId:ID,filename:'memo.txt',model:'tiny',operation:'transcribe'}),candidate);
 await rejects(()=>Promise.resolve(appendTranscriptReference(candidate,{recordingId:SOURCE,filename:'memo.txt',model:'tiny',operation:'transcribe'})));
 await rejects(()=>Promise.resolve(appendTranscriptReference(manifest,{recordingId:ID,filename:'../memo.txt',model:'tiny',operation:'transcribe'})));
 await rejects(()=>Promise.resolve(parseTranscriptArchive(JSON.stringify(manifest).replace('"schemaVersion":1','"schemaVersion":1,"schemaVersion":1'))));
});
await test('Archive recheck refuses concurrent replacement without destroying it',async()=>{
 const {root,state}=directory();const archive=await openTranscriptArchive(root,{createNew:true});
 state.files.set('memora-transcript-archive.json',new TextEncoder().encode('{}'));
 await rejects(()=>archive.add({recordingId:ID,filename:'memo.txt',model:'tiny',operation:'transcribe'}));eq(decoder.decode(state.files.get('memora-transcript-archive.json')),'{}');
});
await test('Identity prompts preserve cancellation without persistence or inference',async()=>{
 let stages=0,writes=0;
 const ui=createRecordingIdentityUI({ask:async()=>({action:'cancel'}),openSession:async()=>({status:'ready',session:{stageRecording:async()=>{stages++;return {status:'decision-required',code:'audio-changed'};},persist:async()=>{writes++;}}})});
 await ui.prepareSource({kind:'file-input'});await rejects(()=>ui.prepareRecording(new File(['x'],'memo.wav')));eq(stages,1);eq(writes,0);
});

await test('Unchanged audio JSON preserves its completed share; changed JSON and reset require a new share',async()=>{
 let content='first list',notifications=0,shared=false;
 const ui=createRecordingIdentityUI({onPendingList:file=>{notifications++;shared=false;},openSession:async()=>({status:'ready',session:{persist:async()=>({status:'export-pending',file:new File([content],'memora-audio-source.json')})}})});
 await ui.prepareSource({kind:'file-input'});await ui.persist();eq(notifications,1);
 shared=true;await ui.persist();assert(shared,'Unchanged persistence invalidated completed sharing');eq(notifications,1);
 content='list with another recording';await ui.persist();eq(notifications,2);assert(!shared,'Changed list reused old share acknowledgement');
 ui.reset();await ui.prepareSource({kind:'file-input'});await ui.persist();eq(notifications,4);
});
await test('Same-name recovery choices show dates and recordings and allow selecting the original JSON',async()=>{
 let calls=0,shown=null;const original=new File(['original'],'memora-audio-source.json');
 const candidates=[{audioSourceId:SOURCE,sourceName:'Audio',updatedAt:'2026-11-18T10:00:00Z',recordingCount:1,recordingExamples:['earlier.wav']},{audioSourceId:ARCHIVE,sourceName:'Audio',updatedAt:'2026-11-19T11:00:00Z',recordingCount:2,recordingExamples:['later.wav','extra.wav']}];
 const ui=createRecordingIdentityUI({ask:async dialog=>{shown=dialog;return {action:'select',value:original};},openSession:async options=>{if(!calls++)return {status:'decision-required',code:'recovery-association-conflict',candidates};eq(options.selectedFile,original);eq(options.selectedRecoverySourceId,null);return {status:'ready',session:{}};}});
 await ui.prepareSource({kind:'directory'});assert(shown.choices.some(item=>item.action==='select'),'Original-list selection unavailable');
 assert(shown.choices[1].label.includes('earlier.wav')&&shown.choices[2].label.includes('extra.wav'),'Recording examples missing');assert(shown.choices[1].label.includes('Last saved:')&&shown.choices[2].label.includes('2 recording(s)'),'Recovery detail missing');assert(shown.message.includes('Nothing is merged or deleted'),'Cancel guidance missing');
});

await test('Audio-list dialogs hide Restore whenever the session does not establish all eligibility criteria',async()=>{
 for(const code of ['select-existing-or-create','create-source-list','unreadable-source-list']){
  let shown;const ui=createRecordingIdentityUI({ask:async dialog=>{shown=dialog;return {action:'cancel'};},openSession:async()=>({status:'decision-required',code,canRestore:false})});
  await rejects(()=>ui.prepareSource({kind:code==='select-existing-or-create'?'file-input':'directory'}));
  assert(!shown.choices.some(choice=>choice.action==='restore'),'Restore offered without eligibility');assert(shown.choices.some(choice=>choice.action==='select'&&choice.label==='Browse for Audio Recording List…'),'Browse was lost');assert(shown.choices.some(choice=>['create','replace'].includes(choice.action)),'Create/replacement was lost');
 }
});
await test('Apple dates/duration remain unchanged; iMuse identity does not imply an Apple date',async()=>{
 const movie=f.box('mvhd',f.join([f.number(0),f.number(3800000000),f.number(3800000000),f.number(1000),f.number(2000)]));
 const apple=f.mp4([f.box('moov',f.join([movie,f.box('udta',f.box('meta',f.join([f.number(0),f.box('ilst',f.appleItem())])))]))]);
 const appleFile=new File([apple],'apple.m4a'),appleIdentity=await readEmbeddedRecordingIdentity(appleFile);
 const previous=await readRealMetadata(appleFile),current=await readRealMetadata(appleFile,{embeddedIdentity:appleIdentity});
 eq(current,previous);eq(current.uuid,ID);assert(current.recordingDate,'Apple date lost');
 const imuse=new File([f.mp4([f.box('moov',movie),f.imuseBox()])],'imuse.m4a');
 const metadata=await readRealMetadata(imuse,{embeddedIdentity:await readEmbeddedRecordingIdentity(imuse)});
 eq(metadata.uuid,null);eq(metadata.recordingDate,null);eq(metadata.duration,current.duration);eq(metadata.fileCreationDate,current.fileCreationDate);
 eq(await readRealMetadata(imuse,{embeddedIdentity:{identityOrigins:['imuse-embedded'],source:'audio-recording-list'}}),metadata,'Saved identity origin changed metadata presentation');
});
await test('Non-M4A list metadata reads duration without whole-file JavaScript reads or Web Audio decoding',async()=>{
 const header=new ArrayBuffer(44),view=new DataView(header),write=(offset,text)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};
 const samples=16000;write(0,'RIFF');view.setUint32(4,36+samples*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples*2,true);
 const file=new File([header,new Uint8Array(samples*2)],'duration.wav',{type:'audio/wav'});file.arrayBuffer=()=>{throw Error('Whole-file metadata read attempted');};
 const original=window.AudioContext;window.AudioContext=function(){throw Error('Audio decode during folder listing');};
 try{const metadata=await readRealMetadata(file,{metadataOnly:true});eq(metadata.duration,1);eq(metadata.durationTimescale,1);}finally{window.AudioContext=original;}
});
await test('Transcript source UUIDs no longer establish audio catalogue identity',async()=>{
 const selected=directory(),output=directory('transcription');const file=await seedAudio(selected.root,'memo.wav',ID);
 output.state.files.set('migrated.txt',new TextEncoder().encode(header()));
 const evidence=await associatedSourceEvidence(output.root,[file]);eq(evidence.ids,[]);eq(evidence.labels.size,0);
});
await test('Transcript names and old source UUIDs cannot associate unembedded audio',async()=>{
 const selected=directory(),output=directory('transcription');const file=await seedAudio(selected.root,'memo.wav');
 output.state.files.set('previous-tiny.txt',new TextEncoder().encode(header()));
 const evidence=await associatedSourceEvidence(output.root,[file]);eq(evidence.ids,[]);eq(evidence.labels.size,0);
});
await test('Unreadable source-list replacement requires separate confirmation and cancel preserves bytes',async()=>{
 const {root,state}=directory();state.files.set('memora-audio-source.json',new TextEncoder().encode('{damaged'));
 const answers=['replace','cancel'];let dialogs=0;
 const ui=createRecordingIdentityUI({ask:async()=>{dialogs++;return {action:answers.shift()};}});
 await rejects(()=>ui.prepareSource(root));eq(dialogs,2);eq(decoder.decode(state.files.get('memora-audio-source.json')),'{damaged');
});

await test('JSON picker omits type filtering and accepts provider-classified archive indexes',async()=>{
 const original=HTMLInputElement.prototype.click;
 const file=new File([JSON.stringify({schemaVersion:1,archiveUuid:ARCHIVE,archiveName:'Existing archive',recordings:[]})],'memora-transcript-archive.json',{type:'application/octet-stream'});
 let input;
 try{
  HTMLInputElement.prototype.click=function(){
   if(this.type!=='file')return original.call(this);
   input=this;assert(!this.hasAttribute('accept'),'Native type filter can disable iCloud JSON');assert(!this.multiple,'Expected one explicit selection');
   Object.defineProperty(this,'files',{configurable:true,value:[file]});queueMicrotask(()=>this.dispatchEvent(new Event('change')));
  };
  const selected=await pickIdentityJson();assert(selected===file,'Selection was replaced');eq(parseTranscriptArchive(await selected.text()).archiveUuid,ARCHIVE);assert(!input.isConnected,'Temporary input retained');
 }finally{HTMLInputElement.prototype.click=original;}
});
await test('Cancelling the JSON picker cleans up and leaves the archive untouched',async()=>{
 const original=HTMLInputElement.prototype.click;let input;
 try{
  HTMLInputElement.prototype.click=function(){if(this.type!=='file')return original.call(this);input=this;queueMicrotask(()=>this.dispatchEvent(new Event('cancel')));};
  let error;try{await pickIdentityJson();}catch(failure){error=failure;}
  eq(error?.name,'AbortError');assert(!input.isConnected,'Cancelled input retained');
 }finally{HTMLInputElement.prototype.click=original;}
});

await test('Wrong list selection explains both filenames and the correct destination',async()=>{
 const audio=new File([JSON.stringify({schemaVersion:1,audioSourceId:SOURCE,recordings:[]})],'memora-audio-source.json');
 const transcript=new File([JSON.stringify({schemaVersion:1,archiveUuid:ARCHIVE,archiveName:'Archive',recordings:[]})],'memora-transcript-archive.json');
 for(const [file,kind,diagnosis,expected,folder] of [[audio,'transcript','audio recording list','memora-transcript-archive.json','transcription folder'],[transcript,'audio','transcript file list','memora-audio-source.json','audio folder']]){
  let failure;try{await validateIdentitySelection(file,kind);}catch(error){failure=error;}
  assert(failure?.message.includes(diagnosis)&&failure.message.includes(expected)&&failure.message.includes(folder),'Wrong-file guidance missing');
 }
 assert(await validateIdentitySelection(audio,'audio')===audio);assert(await validateIdentitySelection(transcript,'transcript')===transcript);
 await rejects(()=>validateIdentitySelection(new File(['not JSON'],'memora-transcript-archive.json'),'transcript'));
});
await test('Wrong-file confirmation stays in the chooser and cancellation changes no archive',async()=>{
 const original=HTMLInputElement.prototype.click;
 const audio=new File([JSON.stringify({schemaVersion:1,audioSourceId:SOURCE,recordings:[]})],'memora-audio-source.json');
 try{
  HTMLInputElement.prototype.click=function(){if(this.type!=='file')return original.call(this);Object.defineProperty(this,'files',{configurable:true,value:[audio]});queueMicrotask(()=>this.dispatchEvent(new Event('change')));};
  const result=askIdentity({title:'Choose the transcript file list',message:'Select memora-transcript-archive.json in your transcription folder.',choices:[{action:'select',label:'Select transcript file list',run:()=>pickIdentityJson({kind:'transcript'})},{action:'cancel',label:'Cancel'}]});
  document.querySelector('dialog[open] button').click();
  await waitFor(()=>document.querySelector('dialog[open] p')?.textContent.includes('This is your audio recording list'));
  assert(!document.querySelector('dialog[open] button').disabled,'Cannot retry selection');
  [...document.querySelectorAll('dialog[open] button')].find(button=>button.textContent==='Cancel').click();eq((await result).action,'cancel');
  eq(JSON.parse(await audio.text()).audioSourceId,SOURCE);
 }finally{HTMLInputElement.prototype.click=original;}
});

await test('A valid Mac-saved list opens on the phone without stale pending prompts or a replacement export',async()=>{
 const id=crypto.randomUUID(),oldId=crypto.randomUUID(),diskId=crypto.randomUUID(),archive=JSON.stringify({schemaVersion:1,archiveUuid:ARCHIVE,archiveName:'Retained archive',recordings:[]});
 const old={schemaVersion:1,audioSourceId:id,recordings:[{audioRelativePath:'memo.wav',recordingId:oldId,identityOrigin:'memora-assigned'}]};
 const disk={...old,recordings:[{...old.recordings[0],recordingId:diskId}],desktopExtension:'preserve'};
 const {createAudioSourceRecoveryStore}=await import('./transcription-recovery-fixtures.js');const store=createAudioSourceRecoveryStore();await store.put({audioSourceId:id,revision:'stale-phone',state:'export-pending',manifestText:JSON.stringify(old),baseBytes:null,sourceName:'Audio',pendingTranscriptArchive:archive},null);
 const file=new File(['no need to read known audio'],'memo.wav');file.slice=()=>{throw Error('Known audio reread');};const source={kind:'file-input',name:'Audio',files:[file,new File([JSON.stringify(disk)],'memora-audio-source.json')]};
 let published=0;const workflow=createTranscriptionIdentity({ask:async()=>{throw Error('Valid saved JSON prompted for local pending data');},onPendingList:()=>{published++;}});
 await workflow.prepareSource(source,[file]);await workflow.activateSource();eq(workflow.getInventorySummary().saveOutcome,'unchanged');eq(published,0);eq(workflow.getSession().getManifest(),disk);eq(workflow.getSession().getPendingTranscriptArchive(),archive);
 const record=await store.get(id);await store.remove(id,record.revision);
});

let pageInstalled=false;
await test('Production page boots with isolated database and synthetic model selection',async()=>{
 const html=await (await fetch('../index.html')).text(),parsed=new DOMParser().parseFromString(html,'text/html');
 parsed.querySelectorAll('script').forEach(script=>script.remove());document.body.replaceChildren(...parsed.body.childNodes);pageInstalled=true;
 await import('../js/app.js');await waitFor(()=>document.getElementById('modelSelect').value==='tiny');
 assert(!document.getElementById('refreshAudioSourceButton'),'Obsolete refresh control remains');
 assert(!document.getElementById('cancelAudioInventoryButton'),'Obsolete Cancel Scan control remains');
 assert(document.querySelector('#transcriptionPanel .source-section [data-select-transcript=transcribe]'),'Top destination selector missing');assert(document.querySelector('#transcriptionDestinationSection [data-transcript-folder]'),'Lower destination display missing');
 eq(document.getElementById('saveRecordingListButton').textContent,'Save Audio Recording List');
 assert(document.getElementById('saveRecordingListButton').closest('.source-section'),'Audio list save is not beside the source controls');
 document.getElementById('paragraphingCheckbox').checked=false;
 const language=document.getElementById('languageSelect');language.value='en';language.dispatchEvent(new Event('change'));
});
const desktop=directory('Audio'),second=directory('Other output');let firstID=null,firstArchive=null,originalAudio=null;
const click=id=>document.getElementById(id).click();
async function refreshSource(){
 const button=document.getElementById('sourceButton');let started=false;
 await new Promise(resolve=>{
  const observer=new MutationObserver(records=>{if(records.some(record=>record.attributeName==='disabled'&&record.oldValue===null))started=true;if(started&&!button.disabled){observer.disconnect();resolve();}});
  observer.observe(button,{attributes:true,attributeOldValue:true,attributeFilter:['disabled']});selections.push(desktop.root);click('sourceButton');
 });
}

async function choose(label){await waitFor(()=>[...document.querySelectorAll('dialog[open] button')].some(button=>button.textContent===label));[...document.querySelectorAll('dialog[open] button')].find(button=>button.textContent===label).click();}
await test('Source activity appears before a delayed Files response and clears on cancellation',async()=>{
 let cancel;const gate=new Promise((resolve,reject)=>{cancel=()=>reject(new DOMException('Picker cancelled','AbortError'));});const previous=document.getElementById('sourceButton').textContent;
 selections.push(gate);click('sourceButton');
 assert(!document.getElementById('audioSourceActivity').hidden,'No immediate activity indicator');assert(document.getElementById('sourceButton').disabled,'Picker could be opened twice');assert(document.querySelector('.source-section').getAttribute('aria-busy')==='true');
 await waitFor(()=>document.getElementById('audioSourceElapsed').textContent!=='Elapsed: 0s');assert(document.getElementById('audioInventoryStatus').textContent.includes('Waiting for folder selection'));
 cancel();await waitFor(()=>document.getElementById('audioSourceActivity').hidden&&!document.getElementById('sourceButton').disabled);eq(document.getElementById('sourceButton').textContent,previous);eq(document.querySelector('.source-section').getAttribute('aria-busy'),'false');
});
await test('Desktop normal flow persists source and archive IDs before verified TXT delivery',async()=>{
 originalAudio=await seedAudio(desktop.root);await refreshSource();await waitFor(()=>document.querySelectorAll('#recordings input[type=checkbox]').length>0);
 assert(desktop.state.files.has('memora-audio-source.json'),'Desktop list was not created during source selection');eq(calls.length,0);assert(document.getElementById('audioSourceActivity').hidden,'Spinner remained after scan completion');
 assert(document.getElementById('recordingListSaveStatus').textContent.includes('Saved and verified: Audio / memora-audio-source.json'),'Desktop save outcome/location missing');
 click('sourceDestinationButton');await waitFor(()=>document.querySelector('[data-transcript-folder]').textContent==='Audio');click('transcribeButton');await waitFor(()=>document.getElementById('transcriptionStatus').textContent==='Transcription complete.');
 const filename=[...desktop.state.files.keys()].find(name=>name.endsWith('.txt'));assert(filename,'No transcript written');
 assert(!decoder.decode(desktop.state.files.get(filename)).includes('Audio Source ID:'),'Obsolete source field written');
 const identity=readTranscriptIdentity(decoder.decode(desktop.state.files.get(filename)));firstID=identity.recordingId;firstArchive=identity.archiveUuid;
 const source=JSON.parse(decoder.decode(desktop.state.files.get('memora-audio-source.json'))),archive=JSON.parse(decoder.decode(desktop.state.files.get('memora-transcript-archive.json')));
 eq(source.recordings[0].recordingId,firstID);eq(archive.archiveUuid,firstArchive);eq(archive.recordings[0].transcripts[0].relativePath,filename);
 eq(calls[0].operation,'transcribe');eq(calls[0].language,'en');eq(calls[0].embedded.source,'audio-recording-list','Known audio was inspected again');
 eq(Array.from(new Uint8Array(await originalAudio.arrayBuffer())),Array.from(desktop.state.files.get('memo.wav')),'Audio changed');
});
await test('Deleted desktop JSON rebuilds reproducible IDs before transcription',async()=>{
 desktop.state.files.delete('memora-audio-source.json');const before=calls.length;
 await refreshSource();
 assert(!document.querySelector('dialog[open]'),'Reproducible rebuild prompted for obsolete source identity');
 eq(calls.length,before);eq(JSON.parse(decoder.decode(desktop.state.files.get('memora-audio-source.json'))).recordings[0].recordingId,firstID);
});
await test('Source inventory samples new unidentified files, reuses known IDs, removes absent entries and reenrolls returning files',async()=>{
 const before=calls.length;await seedAudio(desktop.root,'extra.wav');
 await refreshSource();
 let manifest=JSON.parse(decoder.decode(desktop.state.files.get('memora-audio-source.json')));eq(manifest.recordings.length,2);eq(calls.length,before);
 const extra=manifest.recordings.find(item=>item.audioRelativePath==='extra.wav'),extraId=extra.recordingId;assert(!extra.sourceAvailability,'Routine scans added portable coverage metadata');assert(!('audioFingerprint' in extra),'New audio was fingerprinted');
 const saved=decoder.decode(desktop.state.files.get('memora-audio-source.json'));
 const changed=new Uint8Array(await f.wav([f.wavChunk('JUNK',new Uint8Array([1,2,3,4]))]).arrayBuffer());
 desktop.state.files.set('extra.wav',changed);await refreshSource();
 eq(decoder.decode(desktop.state.files.get('memora-audio-source.json')),saved,'Existing audio changes rewrote the list');assert(!document.querySelector('dialog[open]'),'Unexpected edited-audio prompt');
 const archive=decoder.decode(desktop.state.files.get('memora-transcript-archive.json'));
 desktop.state.files.delete('extra.wav');await refreshSource();
 manifest=JSON.parse(decoder.decode(desktop.state.files.get('memora-audio-source.json')));eq(manifest.recordings.length,1);assert(!manifest.recordings.some(item=>item.recordingId===extraId),'Absent entry retained');eq(manifest.recordings[0].recordingId,firstID);eq(decoder.decode(desktop.state.files.get('memora-transcript-archive.json')),archive,'Audio removal modified transcripts');
 const writes=desktop.state.jsonWrites;await refreshSource();eq(desktop.state.jsonWrites,writes,'Unchanged refresh rewrote JSON');eq(calls.length,before);assert(document.getElementById('recordingListSaveStatus').textContent.startsWith('Already up to date: Audio / memora-audio-source.json'),'Unchanged scan falsely reported a write');
 desktop.state.files.set('extra.wav',changed);await refreshSource();manifest=JSON.parse(decoder.decode(desktop.state.files.get('memora-audio-source.json')));assert(manifest.recordings.find(item=>item.audioRelativePath==='extra.wav').recordingId!==extraId,'Removed fallback ID was silently restored');
 desktop.state.files.delete('extra.wav');await refreshSource();
});
await test('Different output archive reuses source Recording ID and creates separate Archive UUID',async()=>{
 selections.push(second.root);click('destinationButton');await waitFor(()=>document.querySelector('[data-transcript-folder]').textContent.includes('Other output'));
 click('transcribeButton');await waitFor(()=>calls.length===2&&document.getElementById('transcriptionStatus').textContent==='Transcription complete.');
 const filename=[...second.state.files.keys()].find(name=>name.endsWith('.txt')),identity=readTranscriptIdentity(decoder.decode(second.state.files.get(filename)));
 eq(identity.recordingId,firstID);assert(identity.archiveUuid!==firstArchive,'Different archives conflated');
});
await test('Post-inference write failure retains text; retry saves without another model call',async()=>{
 const beforeList=JSON.parse(decoder.decode(second.state.files.get('memora-transcript-archive.json')));
 second.state.failTranscriptOnce=true;click('transcribeButton');await waitFor(()=>!document.getElementById('retryTranscriptSaveButton').hidden);eq(JSON.parse(decoder.decode(second.state.files.get('memora-transcript-archive.json'))),beforeList,'Failed TXT write published an archive reference');
 const count=calls.length;assert(document.getElementById('transcriptionOutput').textContent.includes('Synthetic completed text.'),'Completed text lost');
 click('retryTranscriptSaveButton');await waitFor(()=>document.getElementById('retryTranscriptSaveButton').hidden);eq(calls.length,count);assert(second.state.aborts>0,'Failed writer did not abort');
});
await test('Failed desktop write reports the actual target and error through cancellation',async()=>{
 const failed=directory('Blocked audio'),id=crypto.randomUUID();await seedAudio(failed.root);
 const original=JSON.stringify({schemaVersion:1,audioSourceId:id,recordings:[]});failed.state.files.set('memora-audio-source.json',new TextEncoder().encode(original));failed.state.failSourceWriteOnce=true;
 selections.push(failed.root);click('sourceButton');await waitFor(()=>document.querySelector('dialog[open] h2')?.textContent==='The audio recording list could not be saved');
 assert(document.querySelector('dialog[open] p').textContent.includes('Blocked audio / memora-audio-source.json — Error: Injected audio-list write failure'),'Dialog dropped file/error details');
 assert(document.getElementById('audioInventoryStatus').textContent.includes('Save failed:'),'Failed write still displayed a saving status');await choose('Cancel');await waitFor(()=>!document.getElementById('sourceButton').disabled);
 assert(document.getElementById('audioInventoryStatus').textContent.includes('Save failed: Blocked audio / memora-audio-source.json — Error: Injected audio-list write failure'),'Failure was disguised as ordinary cancellation');eq(decoder.decode(failed.state.files.get('memora-audio-source.json')),original,'Failed write changed the source JSON');
 const {createAudioSourceRecoveryStore}=await import('./transcription-recovery-fixtures.js');const store=createAudioSourceRecoveryStore(),record=await store.get(id);if(record)await store.remove(id,record.revision);
});
let shared=[],cancelShare=true;
await test('File-input prepares separate pending source/archive JSON and blocks transcript sharing',async()=>{
 const file=new File([await originalAudio.arrayBuffer()],'memo.wav');const sourceJson=new File([desktop.state.files.get('memora-audio-source.json')],'memora-audio-source.json');
 const saveButton=document.getElementById('saveRecordingListButton');let prematureSave=false;
 const observer=new MutationObserver(()=>{if(document.getElementById('sourceButton').disabled&&!saveButton.hidden)prematureSave=true;});
 observer.observe(document.querySelector('.source-section'),{attributes:true,subtree:true,attributeFilter:['disabled','hidden']});
 selections.push({kind:'file-input',name:'Audio',files:[file,new File([f.wav([f.wavChunk('JUNK',new Uint8Array([9,8,7]))])],'new.wav'),sourceJson]});click('sourceButton');await waitFor(()=>document.getElementById('iphoneTranscriptionDestinationOptions').style.display === 'flex' && document.querySelector('#recordings .recording-checkbox') && !document.getElementById('transcribeButton').disabled);
 observer.disconnect();assert(!prematureSave,'Save button was visible while source reading was active');
 assert(document.getElementById('recordingListSaveStatus').textContent.startsWith('Save required: Audio / memora-audio-source.json'),'Prepared export was not distinguished from a saved file');
 assert(!document.getElementById('saveRecordingListButton').hidden,'Updated audio list was not offered at source selection');
 assert(document.getElementById('saveRecordingListButton').classList.contains('has-pending-archive-save'),'Compiled audio list did not highlight its save action before transcription');
 click('transcribeButton');await choose('Create transcript file list');await waitFor(()=>document.getElementById('transcriptionStatus').textContent==='Transcription complete.');
 assert(document.getElementById('transcriptArchiveSaveStatus').textContent.includes('memora-transcript-archive.json')&&document.getElementById('transcriptArchiveSaveStatus').textContent.includes('archive “Audio”'),'Transcribe save guidance omitted archive name');
 assert(!document.getElementById('saveRecordingListButton').hidden&&document.getElementById('saveTranscriptArchiveButton').hidden,'Transcript list must travel with the batch');assert(document.getElementById('iphoneExportButton').disabled,'Transcript shared before JSON actions');
 assert(document.getElementById('saveRecordingListButton').classList.contains('has-pending-archive-save')&&document.getElementById('iphoneExportButton').classList.contains('has-pending-exports'),'Pending save pulse missing');
 Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{eq(Object.keys(data),['files'],'File exports must not include guidance as share title/text');if(cancelShare)throw new DOMException('Cancelled','AbortError');shared.push(data.files);}});
});
await test('One iPhone share includes all transcripts and their JSON; cancellation retains the exact batch',async()=>{
 click('saveRecordingListButton');await new Promise(resolve=>setTimeout(resolve,30));assert(document.getElementById('iphoneExportButton').disabled,'Cancelled audio share authorized delivery');
 cancelShare=false;click('saveRecordingListButton');await waitFor(()=>document.getElementById('recordingListSaveStatus').textContent.includes('Audio recording list shared.'));
 assert(!document.getElementById('iphoneExportButton').disabled,'Separate transcript JSON save was still required');assert(document.getElementById('saveTranscriptArchiveButton').hidden);
 cancelShare=true;click('iphoneExportButton');await waitFor(()=>!document.getElementById('iphoneExportButton').disabled);eq(shared.length,1);assert(document.getElementById('iphoneExportButton').classList.contains('has-pending-exports'));
 cancelShare=false;click('iphoneExportButton');await waitFor(()=>shared.length===2&&!document.getElementById('iphoneExportButton').disabled);
 eq(shared[0][0].name,'memora-audio-source.json');const batch=shared[1],txt=batch.filter(file=>file.name.endsWith('.txt')),lists=batch.filter(file=>file.name==='memora-transcript-archive.json');assert(txt.length>0&&lists.length===1&&batch.length===txt.length+1);
 const list=JSON.parse(await lists[0].text());for(const file of txt){const identity=readTranscriptIdentity(await file.text());assert(list.recordings.some(entry=>entry.recordingId===identity.recordingId&&entry.transcripts.some(ref=>ref.relativePath===file.name)));}
 assert(document.getElementById('iphoneExportStatus').textContent.includes('cannot verify'),'False saved-location claim');
});
await test('Completed audio-list sharing survives repeated persistence during and after inference',async()=>{
 const release=pauseNextTranscription(),before=calls.length;
 try{
  click('transcribeButton');await choose('Discard pending transcripts');await waitFor(()=>calls.length===before+1);
  assert(!document.getElementById('saveRecordingListButton').classList.contains('has-pending-archive-save'),'Unchanged pre-inference persistence reset audio-list sharing');
 }finally{release();}
 await waitFor(()=>document.getElementById('transcriptionStatus').textContent==='Transcription complete.');
 assert(!document.getElementById('saveRecordingListButton').classList.contains('has-pending-archive-save'),'Completed transcript reset audio-list sharing');
 click('iphoneExportButton');await waitFor(()=>shared.length===3&&!document.getElementById('iphoneExportButton').disabled);
 assert(shared[2].some(file=>file.name==='memora-transcript-archive.json')&&shared[2].some(file=>file.name.endsWith('.txt')),'Combined transcript delivery missing');assert(!shared[2].some(file=>file.name==='memora-audio-source.json'),'Transcript required redundant audio JSON save');
});
await test('Archive save pulse reuses the existing animation and respects reduced motion',async()=>{
 const link=document.createElement('link');link.rel='stylesheet';link.href='../css/style.css';
 await new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=reject;document.head.append(link);});
 const source=document.getElementById('saveRecordingListButton'),transcript=document.getElementById('saveTranscriptArchiveButton');
 source.classList.add('has-pending-archive-save');transcript.classList.add('has-pending-archive-save');
 const name=getComputedStyle(source).animationName;
 eq(name,matchMedia('(prefers-reduced-motion: reduce)').matches?'none':'search-index-blue-halo');eq(getComputedStyle(transcript).animationName,name);
 eq(getComputedStyle(source,'::after').animationName,matchMedia('(prefers-reduced-motion: reduce)').matches?'none':'search-index-black-outline');
 source.classList.remove('has-pending-archive-save');transcript.classList.remove('has-pending-archive-save');
 eq(getComputedStyle(source).animationName,'none');
 const reduced=[...link.sheet.cssRules].find(rule=>rule.conditionText==='(prefers-reduced-motion: reduce)');
 assert(reduced&&[...reduced.cssRules].some(rule=>rule.selectorText?.includes('.has-pending-archive-save')&&rule.style.animationName==='none'),'Reduced motion override missing');
});
await test('One Settings refresh initializes registry counts; cache clearing and viewing do not silently recreate entries',async()=>{
 click('settingsButton');await waitFor(()=>document.querySelector('[data-settings-action="toggle-registry-cache"]'));
 assert(!document.querySelector('[data-settings-action="toggle-other-indexeddb"]'),'Generic Other section remains');assert(!document.getElementById('settingsStorage').textContent.includes('semanticMetadata'),'Unused zero store shown');
 const storageApi=await import('./transcription-identity-fixtures.js');let records=await storageApi.listModelRegistryRecords();assert(records.length>0,'Refresh did not initialize the cache before reporting');
 const storagePanel=document.getElementById('settingsStorage'),oldWidth=storagePanel.style.width;storagePanel.style.width='700px';
 const headers=[...storagePanel.querySelectorAll('.settings-storage-category')];const centers=headers.map(row=>{const rect=row.children[1].getBoundingClientRect();return rect.left+rect.width/2;});assert(centers.every(value=>Math.abs(value-centers[0])<1),'Storage summaries are not aligned');
 storagePanel.style.width='240px';assert(headers.every(row=>row.scrollWidth<=row.clientWidth+1),'Storage header overflows narrow Settings');assert(headers.every(row=>getComputedStyle(row.children[1]).textAlign==='center'),'Summary text not centered');storagePanel.style.width=oldWidth;
 const registryRow=document.querySelector('[data-settings-action="toggle-registry-cache"]').parentElement;assert(registryRow.textContent.includes(records.length+' entries'),'Registry count needs a second refresh');
 document.querySelector('[data-settings-action="toggle-registry-cache"]').click();await waitFor(()=>document.getElementById('settingsRegistryCacheDetail').querySelector('.settings-selection-actions input'));
 const cacheDetail=document.getElementById('settingsRegistryCacheDetail');assert(cacheDetail.querySelector('.settings-note').compareDocumentPosition(cacheDetail.querySelector('.settings-selection-actions'))&Node.DOCUMENT_POSITION_FOLLOWING,'Controls precede registry description');assert(cacheDetail.querySelector('.settings-selection-actions').compareDocumentPosition(cacheDetail.querySelector('.settings-item'))&Node.DOCUMENT_POSITION_FOLLOWING,'Controls follow registry rows');cacheDetail.style.width='240px';assert(cacheDetail.scrollWidth<=cacheDetail.clientWidth+1,'Registry cache rows overflow narrow Settings');cacheDetail.style.width='';
 const originalConfirm=window.confirm;try{
  const registryButton=label=>[...document.querySelectorAll('#settingsRegistryCacheDetail button')].find(button=>button.textContent===label);
  cacheDetail.querySelector('.settings-selection-actions input').click();assert(cacheDetail.querySelector('.settings-selection-actions input').checked);cacheDetail.querySelector('.settings-selection-actions input').click();assert([...cacheDetail.querySelectorAll('input')].every(check=>!check.checked));cacheDetail.querySelector('.settings-selection-actions input').click();
  window.confirm=()=>false;registryButton('Delete Selected').click();eq((await storageApi.listModelRegistryRecords()).length,records.length);
  await new Promise(resolve=>setTimeout(resolve,0));window.confirm=()=>true;registryButton('Delete Selected').click();await waitFor(()=>document.getElementById('settingsRegistryCacheDetail').textContent.includes('No cached model definitions'));
  assert(!document.querySelector('#settingsRegistryCacheDetail .settings-selection-actions'),'Empty registry shows selection actions');eq((await storageApi.listModelRegistryRecords()).length,0);document.querySelector('[data-settings-action="toggle-whisper-models"]').click();await waitFor(()=>document.getElementById('settingsModelRegistryContainer')?.textContent.includes('known configurations'));eq((await storageApi.listModelRegistryRecords()).length,0,'View Models recreated hidden cache data');
  click('settingsRefreshButton');await waitFor(()=>document.querySelector('[data-settings-action="toggle-registry-cache"]')?.parentElement.textContent.includes(records.length+' entries'));eq((await storageApi.listModelRegistryRecords()).length,records.length);
  document.querySelector('[data-settings-action="toggle-registry-cache"]').click();await waitFor(()=>document.querySelectorAll('#settingsRegistryCacheDetail .settings-item input[type=checkbox]').length===records.length);
  document.querySelector('#settingsRegistryCacheDetail .settings-item input[type=checkbox]').click();[...document.querySelectorAll('#settingsRegistryCacheDetail button')].find(button=>button.textContent==='Delete Selected').click();await waitFor(()=>document.querySelectorAll('#settingsRegistryCacheDetail .settings-item input[type=checkbox]').length===records.length-1);eq((await storageApi.listModelRegistryRecords()).length,records.length-1);
  assert(!document.querySelector('#settingsRegistryCacheDetail .settings-item button'),'Individual cache delete remains');document.querySelector('#settingsRegistryCacheDetail .settings-item input[type=checkbox]').click();[...document.querySelectorAll('#settingsRegistryCacheDetail button')].find(button=>button.textContent==='Delete Selected').click();await waitFor(()=>document.querySelectorAll('#settingsRegistryCacheDetail .settings-item input[type=checkbox]').length===records.length-2);eq((await storageApi.listModelRegistryRecords()).length,records.length-2);
  click('settingsRefreshButton');await waitFor(()=>document.querySelector('[data-settings-action="toggle-registry-cache"]')?.parentElement.textContent.includes(records.length+' entries'));
 }finally{window.confirm=originalConfirm;}
});
await test('Saved audio lists use selection-only deletion while protecting the active source',async()=>{
 const {createAudioSourceRecoveryStore}=await import('./transcription-recovery-fixtures.js');const store=createAudioSourceRecoveryStore();
 const names=['Inactive test source','Selected inactive source','Bulk inactive source'];
 for(const [index,name]of names.entries()){const id=index===0?ARCHIVE:crypto.randomUUID();await store.put({audioSourceId:id,revision:'removal-'+index,state:'verified',sourceName:name,baseBytes:null,manifestText:JSON.stringify({schemaVersion:1,audioSourceId:id,recordings:[]})},null);}
 if(document.getElementById('settingsPanel')?.hidden)click('settingsButton');await waitFor(()=>document.querySelector('[data-settings-action="toggle-source-recovery"]'));
 document.querySelector('[data-settings-action="toggle-source-recovery"]').click();await waitFor(()=>document.getElementById('settingsSourceRecoveryDetail').textContent.includes(names[0]));
 const detail=()=>document.getElementById('settingsSourceRecoveryDetail'),rows=()=>[...detail().querySelectorAll('.settings-item')];assert(rows().some(row=>row.textContent.includes('In use')&&row.querySelector('input').disabled),'Active source was deletable');
 const originalConfirm=window.confirm;
 try{
  assert(!detail().querySelector('.settings-item button'),'Individual recovery delete remains');rows().find(row=>row.textContent.includes(names[0])).querySelector('input').click();
  window.confirm=()=>false;[...detail().querySelectorAll('button')].find(button=>button.textContent==='Delete Selected').click();eq((await store.list()).length,4);
  await new Promise(resolve=>setTimeout(resolve,0));window.confirm=()=>true;[...detail().querySelectorAll('button')].find(button=>button.textContent==='Delete Selected').click();await waitFor(()=>!detail().textContent.includes(names[0])&&detail().textContent.includes(names[1]));eq((await store.list()).length,3);
  rows().find(row=>row.textContent.includes(names[1])).querySelector('input').click();[...detail().querySelectorAll('button')].find(button=>button.textContent==='Delete Selected').click();await waitFor(()=>!detail().textContent.includes(names[1])&&detail().textContent.includes(names[2]));eq((await store.list()).length,2);
  detail().querySelector('.settings-selection-actions input').click();assert(rows().find(row=>row.textContent.includes('In use')).querySelector('input').checked===false,'Select All included active source');[...detail().querySelectorAll('button')].find(button=>button.textContent==='Delete Selected').click();await waitFor(()=>!detail().textContent.includes(names[2])&&detail().textContent.includes('In use'));eq((await store.list()).length,1);
 }finally{window.confirm=originalConfirm;}
});
await test('File-input missing JSON is resolved before showing a new source and before transcription',async()=>{
 const file=new File([await originalAudio.arrayBuffer()],'memo.wav');const before=calls.length;
 // Discard the already-shared batch retained for optional repeat sharing.
 selections.push({kind:'file-input',name:'Phone source',files:[file]});click('sourceButton');await choose('Discard pending transcripts');
 await waitFor(()=>document.querySelector('dialog[open] h2')?.textContent==='Audio recording list was not found in the selected files');
 assert(![...document.querySelectorAll('dialog[open] button')].some(button=>button.textContent.includes('Restore')),'iPhone omission exposed unrelated saved copies');
 eq(calls.length,before);assert(document.getElementById('transcribeButton').disabled,'Transcription enabled during source resolution');
 await choose('Create audio recording list');await waitFor(()=>!document.getElementById('sourceButton').disabled);
 assert(document.querySelector('[data-audio-folder]').textContent.includes('Phone source'),'New source was not committed');eq(calls.length,before);assert(!document.querySelector('dialog[open]'),'Source resolution deferred');
});
await test('Internal scan cancellation retains the previous source and saves no recovery or JSON',async()=>{
 const {createAudioSourceRecoveryStore}=await import('./transcription-recovery-fixtures.js');const store=createAudioSourceRecoveryStore(),before=(await store.list()).length,previous=document.getElementById('sourceButton').textContent;
 const audio=new File([f.wav([f.wavChunk('JUNK',new Uint8Array(2*1024*1024))])],'large.wav');
 const json=new File([JSON.stringify({schemaVersion:1,audioSourceId:crypto.randomUUID(),recordings:[]})],'memora-audio-source.json');
 const source={kind:'file-input',name:'Cancelled inventory',files:[audio,json]},controller=new AbortController();
 const workflow=createTranscriptionIdentity();
 await rejects(()=>workflow.prepareSource(source,[audio],{signal:controller.signal,onProgress:()=>controller.abort()}));
 assert(controller.signal.aborted,'Internal cancellation not exercised');eq(document.getElementById('sourceButton').textContent,previous);eq((await store.list()).length,before);
});
await test('A provider read failure saves no partial inventory and retains the previous source',async()=>{
 const {createAudioSourceRecoveryStore}=await import('./transcription-recovery-fixtures.js');const store=createAudioSourceRecoveryStore(),before=(await store.list()).length,previous=document.getElementById('sourceButton').textContent;
 const audio=new File([await originalAudio.arrayBuffer()],'unreadable.wav');audio.slice=()=>{throw Error('Injected provider read failure');};
 const json=new File([JSON.stringify({schemaVersion:1,audioSourceId:crypto.randomUUID(),recordings:[]})],'memora-audio-source.json');
 selections.push({kind:'file-input',name:'Unreadable inventory',files:[audio,json]});const originalAlert=window.alert;
 try{window.alert=()=>{};click('sourceButton');await choose('Discard pending lists');await waitFor(()=>document.getElementById('audioInventoryStatus').textContent.includes('Source scan not saved:')&&!document.getElementById('sourceButton').disabled);}
 finally{window.alert=originalAlert;}
 eq(document.getElementById('sourceButton').textContent,previous);eq((await store.list()).length,before);
});
await test('Combine reconciles a complete folder, reuses read records for sorting and preserves body-only edits',async()=>{
 const root=directory('Combine reconciliation');const encode=value=>new TextEncoder().encode(value);
 root.state.files.set('a.txt',encode(header()));root.state.files.set('b.txt',encode(header().replace('Whisper model: tiny','Whisper model: base').replace('memo.wav','zulu.wav')));
 root.state.files.set('memora-transcript-archive.json',encode(JSON.stringify({schemaVersion:1,archiveUuid:ARCHIVE,archiveName:root.root.name,recordings:[{recordingId:ID,transcripts:[{relativePath:'gone.txt',model:'tiny',operation:'transcribe'}]}]})));
 root.state.files.set('search-embeddings.json',encode('synthetic untouched search data'));
 const originalText=File.prototype.text,originalEntries=root.root.entries;let reads=0,scans=0;
 File.prototype.text=function(){if(/^[ab]\.txt$/.test(this.name))reads++;return originalText.call(this);};root.root.entries=async function*(){scans++;yield*originalEntries.call(this);};
 try{
  click('combineTab');selections.push(root.root);click('textSourceButton');await waitFor(()=>!document.getElementById('textSourceButton').disabled&&document.querySelector('[data-transcript-folder]').textContent.includes(root.root.name));
  eq(scans,1);eq(reads,2);assert(document.getElementById('combineTranscriptListStatus').textContent.includes('saved and verified'));assert(document.getElementById('saveCombineTranscriptListButton').hidden);
  const saved=decoder.decode(root.state.files.get('memora-transcript-archive.json'));const list=parseTranscriptArchive(saved);eq(list.recordings[0].transcripts.map(item=>item.relativePath),['a.txt','b.txt']);eq(decoder.decode(root.state.files.get('search-embeddings.json')),'synthetic untouched search data');
  const sort=document.getElementById('transcriptSort');sort.value='name-desc';sort.dispatchEvent(new Event('change'));await waitFor(()=>document.querySelector('#transcripts .recording-checkbox')?.dataset.filename==='b.txt');eq(reads,2);
  const row=document.querySelector('#transcripts .recording-checkbox').closest('.recording-item');row.querySelector('.search-transcript-toggle:not(.combine-edit-toggle)').click();assert(row.querySelector('.search-audio-location-note').textContent.includes('Archive “Combine reconciliation”'),'Combine audio prompt omitted archive name');row.querySelector('.combine-edit-toggle').click();const editor=row.querySelector('textarea');editor.value='Body edited in Combine';row.querySelector('.combine-transcript-editor-actions button:last-child').click();await waitFor(()=>decoder.decode(root.state.files.get('b.txt')).includes('Body edited in Combine'));eq(decoder.decode(root.state.files.get('memora-transcript-archive.json')),saved);
 }finally{File.prototype.text=originalText;root.root.entries=originalEntries;}
});
await test('A failed Combine inventory leaves the previous source visible and writes no transcript list',async()=>{
 const before=document.getElementById('textSourceButton').textContent,root=directory('Unreadable combine inventory');root.root.entries=async function*(){throw Error('Interrupted transcript enumeration');};
 selections.push(root.root);click('textSourceButton');await waitFor(()=>!document.getElementById('textSourceButton').disabled);eq(document.getElementById('textSourceButton').textContent,before);assert(document.getElementById('combineStatus').textContent.includes('Interrupted transcript enumeration'));assert(!root.state.files.has('memora-transcript-archive.json'));
});
await test('Combine iPhone folder saves remove missing references, survive cancellation and avoid repeated unchanged saves',async()=>{
 const transcript=new File([header()],'new.txt'),list=new File([JSON.stringify({schemaVersion:1,archiveUuid:ARCHIVE,archiveName:'Phone transcripts',recordings:[{recordingId:ID,transcripts:[{relativePath:'unseen.txt',model:'tiny',operation:'transcribe'}]}]})],'memora-transcript-archive.json');
 const source={kind:'file-input',selectionScope:'folder',name:'Phone transcripts',files:[transcript,list]};const before=shared.length;selections.push(source);click('textSourceButton');await waitFor(()=>!document.getElementById('textSourceButton').disabled&&document.querySelector('[data-transcript-folder]').textContent.includes(source.name));
 const button=document.getElementById('saveCombineTranscriptListButton');assert(!button.hidden&&button.classList.contains('has-pending-archive-save'));assert(document.getElementById('combineTranscriptListStatus').textContent.includes('Phone transcripts'));eq(shared.length,before);
 cancelShare=true;button.click();await waitFor(()=>!button.disabled);assert(!button.hidden&&button.classList.contains('has-pending-archive-save'));eq(shared.length,before);
 click('textSourceButton');await choose('Keep current folder');await waitFor(()=>!document.getElementById('textSourceButton').disabled);assert(!button.hidden);assert(document.querySelector('[data-transcript-folder]').textContent.includes('Phone transcripts'));
 cancelShare=false;button.click();await waitFor(()=>button.hidden);assert(!button.classList.contains('has-pending-archive-save'));eq(shared.length,before+1);const exported=shared.at(-1)[0];eq(exported.name,'memora-transcript-archive.json');eq(parseTranscriptArchive(await exported.text()).recordings[0].transcripts.map(item=>item.relativePath),['new.txt']);
 selections.push({...source,files:[transcript,exported]});click('textSourceButton');await waitFor(()=>!document.getElementById('textSourceButton').disabled);assert(button.hidden);assert(document.getElementById('combineTranscriptListStatus').textContent.includes('up to date'));eq(shared.length,before+1);
});
await test('Combine keeps readable transcripts available while an invalid manifest blocks JSON replacement',async()=>{
 const source={kind:'file-input',name:'Invalid transcript list',files:[new File([header()],'a.txt'),new File(['invalid list'],'memora-transcript-archive.json')]};selections.push(source);click('textSourceButton');await waitFor(()=>!document.getElementById('textSourceButton').disabled&&document.querySelector('[data-transcript-folder]').textContent.includes(source.name));assert(document.querySelector('#transcripts .recording-checkbox'));assert(document.getElementById('combineTranscriptListStatus').textContent.includes('not updated'));assert(document.getElementById('saveCombineTranscriptListButton').hidden);
});
await test('Rebuilding yearly Combine lists includes archive and folder in the actual iPhone save prompt',async()=>{
 for(const [year,archive]of [['2016',ARCHIVE],['2017','12345678-1234-4234-8234-123456789abc']]){
  const text=header().replace(ARCHIVE,archive).replace('Original Audio Folder: Audio',`Original Audio Folder: ${year}`),transcript=new File([text],'year.txt');const source={kind:'file-input',selectionScope:'folder',name:'transcription',files:[transcript]};
  selections.push(source);click('textSourceButton');await waitFor(()=>!document.getElementById('textSourceButton').disabled);const note=document.getElementById('combineTranscriptListStatus').textContent;assert(note.includes('memora-transcript-archive.json')&&note.includes('“transcription”')&&note.includes(`“${year}”`),'year/folder missing from save prompt');
  const button=document.getElementById('saveCombineTranscriptListButton');assert(!button.hidden);cancelShare=false;button.click();await waitFor(()=>button.hidden);const exported=shared.at(-1)[0];eq(exported.name,'memora-transcript-archive.json');const rebuilt=parseTranscriptArchive(await exported.text());eq(rebuilt.archiveUuid,archive);eq(rebuilt.archiveName,year);assert(document.getElementById('combineTranscriptListStatus').textContent.includes(`“${year}”`),'year missing after sharing');
 }
});
await test('A new iPhone Transcribe archive uses the audio archive name in its chooser, JSON and pending-save context',async()=>{
 const audio=new File([f.wav([f.wavChunk('imID',f.payload(ID))])],'year.m4a'),sourceId=crypto.randomUUID();const source={kind:'file-input',selectionScope:'folder',name:'2018',files:[audio,new File([JSON.stringify({schemaVersion:1,audioSourceId:sourceId,recordings:[]})],'memora-audio-source.json')]};let chooser=null,pending=null,location=null;
 const workflow=createTranscriptionIdentity({ask:async request=>{chooser=request;return{action:'create'};},onPendingArchive:(file,context)=>{pending=file;location=context;}});await workflow.prepareSource(source,[audio]);await workflow.begin(source,null,[audio]);assert(chooser.message.includes('memora-transcript-archive.json')&&chooser.message.includes('“2018”')&&chooser.message.includes('“transcription”'),'chooser missing target');
 const identity=await workflow.prepare(audio);await workflow.addTranscript({recordingId:identity.recordingId,filename:'year.txt',model:'large',operation:'transcribe'});eq(pending.name,'memora-transcript-archive.json');eq(parseTranscriptArchive(await pending.text()).archiveName,'2018');eq(location,{archiveName:'2018',folderName:'transcription'});workflow.reset();
});
function audioFolderFixture(selectionScope='folder'){
 const other='12345678-1234-4234-8234-123456789abc',nested='99999999-1234-1234-1234-123456789abc';
 const manifest={schemaVersion:1,audioSourceId:crypto.randomUUID(),recordings:[{audioRelativePath:'memo.wav',recordingId:ID,identityOrigin:'memora-assigned'},{audioRelativePath:'gone.wav',recordingId:other,identityOrigin:'imuse-embedded'},{audioRelativePath:'nested/kept.wav',recordingId:nested,identityOrigin:'memora-assigned'}]};
 const audio=new File([f.wav()],'memo.wav'),json=new File([JSON.stringify(manifest)],'memora-audio-source.json');
 return{manifest,audio,json,other,source:{kind:'file-input',selectionScope,name:'Whole phone audio',files:[audio,json]}};
}
await test('Whole-folder iPhone audio removes missing immediate entries, retains nested entries and offers only changed JSON',async()=>{
 const fixture=audioFolderFixture();let exported=null;const workflow=createTranscriptionIdentity({ask:async()=>{throw Error('Valid source prompted');},onPendingList:file=>{exported=file;}});
 await workflow.prepareSource(fixture.source,[fixture.audio]);const summary=workflow.getInventorySummary();eq(summary.removed,1);eq(summary.coverage,'folder');assert(summary.pendingSave);eq(workflow.getSession().getManifest().recordings.map(entry=>entry.audioRelativePath),['memo.wav','nested/kept.wav']);eq(exported,null,'Save appeared before source activation');await workflow.activateSource();assert(exported);eq(fixture.source.files.length,2,'Source files were deleted');eq((JSON.parse(await fixture.json.text())).recordings.length,3,'Original selected JSON changed');
 const saved=JSON.parse(await exported.text());eq(saved.recordings[0].recordingId,ID);let repeated=0;const reopened=createTranscriptionIdentity({ask:async()=>{throw Error('Valid saved list prompted');},onPendingList:()=>{repeated++;}});await reopened.prepareSource({...fixture.source,files:[fixture.audio,exported]},[fixture.audio]);await reopened.activateSource();eq(reopened.getInventorySummary().saveOutcome,'unchanged');eq(reopened.getInventorySummary().removed,0);eq(repeated,0);
 const returned=new File([f.wav([f.wavChunk('imID',f.payload(fixture.other))])],'gone.wav'),returning=createTranscriptionIdentity({ask:async()=>{throw Error('Returning embedded recording prompted');}});await returning.prepareSource({...fixture.source,files:[fixture.audio,returned,exported]},[fixture.audio,returned]);eq(returning.getSession().getManifest().recordings.find(entry=>entry.audioRelativePath==='gone.wav').recordingId,fixture.other);assert(returning.getInventorySummary().pendingSave);
});
await test('Explicit/unmarked iPhone audio selections retain unseen entries without a replacement save',async()=>{
 for(const scope of ['selection',undefined]){const fixture=audioFolderFixture(scope);if(scope===undefined)delete fixture.source.selectionScope;const workflow=createTranscriptionIdentity({ask:async()=>{throw Error('Partial source prompted');}});await workflow.prepareSource(fixture.source,[fixture.audio]);eq(workflow.getInventorySummary().removed,0);eq(workflow.getInventorySummary().coverage,'selection');eq(workflow.getInventorySummary().saveOutcome,'unchanged');eq(workflow.getSession().getManifest(),fixture.manifest);}
});
await test('Skipping an unresolved recording in an iPhone folder prevents removal of unseen entries',async()=>{
 const fixture=audioFolderFixture(),unsupported=new File([f.wav([f.wavChunk('imID',f.payload(ID,99))])],'unsupported.wav');fixture.source.files.push(unsupported);let prompts=0;const workflow=createTranscriptionIdentity({ask:async()=>{prompts++;return{action:'skip'};}});await workflow.prepareSource(fixture.source,[fixture.audio,unsupported]);eq(prompts,1);eq(workflow.getInventorySummary().skipped,1);eq(workflow.getInventorySummary().removed,0);eq(workflow.getInventorySummary().coverage,'selection');eq(workflow.getSession().getManifest(),fixture.manifest);
});
await test('Failed or cancelled iPhone whole-folder reads do not persist removal candidates',async()=>{
 const {createAudioSourceRecoveryStore}=await import('./transcription-recovery-fixtures.js');const store=createAudioSourceRecoveryStore();
 for(const cancel of [false,true]){const fixture=audioFolderFixture(),broken=new File([f.wav()],'unreadable.wav');broken.slice=()=>{throw Error('Injected provider failure');};fixture.source.files.push(broken);const before=(await store.list()).length,controller=new AbortController();let publishes=0;const workflow=createTranscriptionIdentity({ask:async()=>{throw Error('Unexpected identity prompt');},onPendingList:()=>{publishes++;}});await rejects(()=>workflow.prepareSource(fixture.source,[fixture.audio,broken],{signal:controller.signal,onProgress:()=>{if(cancel)controller.abort();}}));eq((await store.list()).length,before);eq(publishes,0);eq((JSON.parse(await fixture.json.text())).recordings.length,3);}
});
await test('An empty iPhone whole-folder audio inventory removes only immediate entries',async()=>{
 const fixture=audioFolderFixture();fixture.source.files=[fixture.json];let exported=null;const workflow=createTranscriptionIdentity({ask:async()=>{throw Error('Empty valid list prompted');},onPendingList:file=>{exported=file;}});await workflow.prepareSource(fixture.source,[]);eq(workflow.getInventorySummary().removed,2);eq(workflow.getInventorySummary().coverage,'folder');await workflow.activateSource();eq(JSON.parse(await exported.text()).recordings.map(entry=>entry.audioRelativePath),['nested/kept.wav']);
});
await test('Actual iPhone audio source controls offer a changed list, retain cancelled saving and suppress unchanged re-save',async()=>{
 const fixture=audioFolderFixture();const before=shared.length;selections.push(fixture.source);click('sourceButton');await waitFor(()=>document.querySelector('dialog[open]')||(!document.getElementById('sourceButton').disabled&&document.querySelector('[data-audio-folder]').textContent.includes(fixture.source.name)));
 if(document.querySelector('dialog[open]')){const choices=[...document.querySelectorAll('dialog[open] button')];const discard=choices.find(button=>button.textContent==='Discard pending transcripts'||button.textContent==='Discard pending lists');assert(discard,'Unexpected pending prompt');discard.click();}
 await waitFor(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('[data-audio-folder]').textContent.includes(fixture.source.name));const button=document.getElementById('saveRecordingListButton');assert(!button.hidden&&button.classList.contains('has-pending-archive-save'));assert(document.getElementById('audioInventoryStatus').textContent.includes('1 removed from list'));assert(document.getElementById('audioInventoryStatus').textContent.includes('Audio directly in this folder'));eq(shared.length,before);
 cancelShare=true;button.click();await waitFor(()=>!button.disabled);assert(button.classList.contains('has-pending-archive-save'));eq(shared.length,before);cancelShare=false;button.click();await waitFor(()=>!button.disabled&&!button.classList.contains('has-pending-archive-save'));eq(shared.length,before+1);const saved=shared.at(-1)[0];eq(saved.name,'memora-audio-source.json');eq(JSON.parse(await saved.text()).recordings.map(entry=>entry.audioRelativePath),['memo.wav','nested/kept.wav']);
 selections.push({...fixture.source,files:[fixture.audio,saved]});click('sourceButton');await waitFor(()=>!document.getElementById('sourceButton').disabled&&document.getElementById('audioInventoryStatus').textContent.includes('0 removed from list'));assert(button.hidden,'Unchanged folder requested another JSON save');assert(document.getElementById('audioInventoryStatus').textContent.includes('0 removed from list'));eq(shared.length,before+1);
});
const {sharedFolders}=await import('../js/sharedFolderSelection.js');
const {sharedSearchBuilds}=await import('./shared-production-search-fixtures.js');
const sharedRoot=directory('Shared parent'),child=await sharedRoot.root.getDirectoryHandle('transcription',{create:true}),alternate=await sharedRoot.root.getDirectoryHandle('alternate',{create:true});
async function putText(root,name,text){const w=await(await root.getFileHandle(name,{create:true})).createWritable();await w.write(text);await w.close();}
await seedAudio(sharedRoot.root,'renamed.wav',ID);await putText(child,'current.txt',header());await putText(alternate,'alternate.txt',header());
await test('Shared native parent defaults all folder rows without eager Search and links renamed audio by ID in Combine',async()=>{
 click('transcriptionTab');const before=sharedSearchBuilds.length;selections.push(sharedRoot.root);click('sourceButton');await waitFor(()=>!document.getElementById('sourceButton').disabled&&sharedFolders.snapshot().audio===sharedRoot.root);
 assert([...document.querySelectorAll('[data-audio-folder]')].every(node=>node.textContent==='Shared parent'));assert([...document.querySelectorAll('[data-transcript-folder]')].every(node=>node.textContent==='Shared parent / transcription'));eq(sharedSearchBuilds.length,before);
 click('combineTab');await waitFor(()=>document.querySelector('#transcripts .recording-checkbox')&&!document.getElementById('textSourceButton').disabled);assert(document.getElementById('combineStatus').textContent.includes('1 transcript'));assert(sharedRoot.state.folders.get('transcription')===child);assert(!sharedRoot.state.files.has('memora-transcript-archive.json'));
 let plays=0,pickers=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=async()=>{plays++;};
 try{[...document.querySelectorAll('#transcripts button')].find(button=>button.textContent==='Show transcript').click();const control=document.querySelector('#transcripts .search-result-audio-control');control.querySelector('input').click=()=>{pickers++;};control.querySelector('.search-audio-play').click();await waitFor(()=>plays===1);eq(pickers,0);assert(control.querySelector('audio').src.startsWith('blob:'));}finally{HTMLMediaElement.prototype.play=play;}
});
await test('Keeping unsaved Combine edits prevents a shared folder change and leaves folder access intact',async()=>{
 const button=[...document.querySelectorAll('#transcripts button')].find(button=>button.textContent==='Edit');button.click();const editor=document.querySelector('#transcripts .combine-transcript-editor-input');const before=editor.value;editor.value=before+' unsaved change';const selected=sharedFolders.snapshot().transcript.source;
 click('textSourceButton');await choose('Keep editing');await waitFor(()=>!document.getElementById('textSourceButton').disabled);assert(sharedFolders.snapshot().transcript.source===selected&&editor.value===before+' unsaved change');
 [...editor.parentElement.querySelectorAll('button')].find(button=>button.textContent==='Cancel').click();
});
await test('Top and lower desktop destination controls reread external JSON changes and display the chosen folder',async()=>{
 click('transcriptionTab');const file=await(await child.getFileHandle('memora-transcript-archive.json')).getFile(),list=JSON.parse(await file.text());list.recordings[0].transcripts.push({relativePath:'removed.txt',model:'tiny',operation:'transcribe'});await putText(child,'memora-transcript-archive.json',JSON.stringify(list));
 await new Promise(resolve=>{const button=document.getElementById('sourceButton');let started=false;const observer=new MutationObserver(records=>{if(records.some(record=>record.oldValue===null))started=true;if(started&&!button.disabled){observer.disconnect();resolve();}});observer.observe(button,{attributes:true,attributeOldValue:true,attributeFilter:['disabled']});click('transcriptionDestinationButton');});
 const updated=JSON.parse(await(await(await child.getFileHandle('memora-transcript-archive.json')).getFile()).text());assert(!updated.recordings.some(entry=>entry.transcripts.some(ref=>ref.relativePath==='removed.txt')));
 selections.push(alternate);click('destinationButton');await waitFor(()=>!document.getElementById('sourceButton').disabled&&sharedFolders.snapshot().transcript.source===alternate);assert(document.getElementById('destinationButton').textContent.includes('alternate'));
 document.querySelector('[data-select-transcript=transcribe]').click();await choose('Shared parent / transcription');await waitFor(()=>!document.getElementById('sourceButton').disabled&&sharedFolders.snapshot().transcript.source===child);click('combineTab');await waitFor(()=>document.querySelector('#transcripts .recording-checkbox')&&!document.getElementById('textSourceButton').disabled);
});
await test('Search adopts the shared default and transcript overrides propagate without replacing audio',async()=>{
 click('searchTab');await waitFor(()=>!document.getElementById('searchSourceButton').disabled&&document.getElementById('searchIndexStatus').textContent.includes('Search ready'));eq(sharedSearchBuilds.at(-1),['current.txt']);
 click('searchSourceButton');await choose('Shared parent / alternate');await waitFor(()=>!document.getElementById('searchSourceButton').disabled&&sharedFolders.snapshot().transcript.source===alternate);eq(sharedSearchBuilds.at(-1),['alternate.txt']);assert(sharedFolders.snapshot().audio===sharedRoot.root);assert([...document.querySelectorAll('[data-transcript-folder]')].every(node=>node.textContent==='Shared parent / alternate'));
 click('combineTab');await waitFor(()=>document.getElementById('combineStatus').textContent.includes('1 transcript')&&!document.getElementById('textSourceButton').disabled);assert(document.querySelector('#transcripts').textContent.includes('alternate.txt'));
});
await test('Direct transcript browsing retains audio access and a cancelled folder menu preserves both choices',async()=>{
 const external=directory('External transcripts');await putText(external.root,'external.txt',header());selections.push(external.root);click('textSourceButton');await choose('Browse for Another Folder');await waitFor(()=>!document.getElementById('textSourceButton').disabled&&sharedFolders.snapshot().transcript.source===external.root);assert(sharedFolders.snapshot().audio===sharedRoot.root);eq(sharedFolders.resolveAudio(parseTranscriptFile(new File([header()],'external.txt'),header())).name,'renamed.wav');
 click('textSourceButton');await choose('Cancel');await waitFor(()=>!document.getElementById('textSourceButton').disabled);assert(sharedFolders.snapshot().transcript.source===external.root);
});
await test('Selecting an audio parent from Search clears the prior transcript choice when no default exists',async()=>{
 click('searchTab');await waitFor(()=>!document.getElementById('searchSourceButton').disabled);const other=directory('Different parent');await seedAudio(other.root,'other.wav',f.OTHER);selections.push(other.root);document.querySelector('#searchPanel [data-select-audio]').click();await waitFor(()=>!document.getElementById('sourceButton').disabled&&sharedFolders.snapshot().audio===other.root);assert([...document.querySelectorAll('[data-transcript-folder]')].every(node=>node.textContent==='None Selected'));eq(sharedFolders.resolveAudio({recordingId:ID}),null);
});
await test('iPhone parent access rebases one child only and saves that child list without another audio picker',async()=>{
 const wrap=(name,data)=>{const file=new File([data],name.split('/').at(-1));Object.defineProperty(file,'webkitRelativePath',{value:'Phone shared/'+name});return file;};
 const audio=wrap('renamed.wav',f.wav([f.wavChunk('imID',f.payload(ID))]));
 const manifest={schemaVersion:1,audioSourceId:SOURCE,recordings:[{recordingId:ID,audioRelativePath:'renamed.wav',identityOrigin:'imuse-embedded'}]};
 const source={kind:'file-input',selectionScope:'folder',name:'Phone shared',files:[audio,wrap('memora-audio-source.json',JSON.stringify(manifest)),wrap('transcription/phone.txt',header()),wrap('alternate/other.txt',header()),wrap('transcription/combined/export.txt','not a transcript')]};
 selections.push(source);document.querySelector('#searchPanel [data-select-audio]').click();await waitFor(()=>!document.getElementById('sourceButton').disabled&&sharedFolders.snapshot().audio===source);eq(sharedFolders.snapshot().transcript.source.files.map(file=>file.webkitRelativePath),['transcription/phone.txt']);eq(sharedSearchBuilds.at(-1),['phone.txt']);assert(document.getElementById('saveRecordingListButton').hidden);
 click('combineTab');await waitFor(()=>!document.getElementById('textSourceButton').disabled&&!document.getElementById('saveCombineTranscriptListButton').hidden);assert(document.getElementById('combineTranscriptListStatus').textContent.includes('“transcription”'));const before=shared.length;click('saveCombineTranscriptListButton');await waitFor(()=>!document.getElementById('saveCombineTranscriptListButton').disabled);eq(shared.length,before+1);eq(JSON.parse(await shared.at(-1)[0].text()).recordings[0].transcripts[0].relativePath,'phone.txt');
 let plays=0,pickers=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=async()=>{plays++;};try{[...document.querySelectorAll('#transcripts button')].find(button=>button.textContent==='Show transcript').click();const control=document.querySelector('#transcripts .search-result-audio-control');control.querySelector('input').click=()=>{pickers++;};control.querySelector('.search-audio-play').click();await waitFor(()=>plays===1);eq(pickers,0);}finally{HTMLMediaElement.prototype.play=play;}
});

await test('iPhone destination batch shares TXT and JSON together and retains prior shared references for the next batch',async()=>{
 click('transcriptionTab');click('transcribeButton');await waitFor(()=>document.getElementById('transcriptionStatus').textContent==='Transcription complete.'&&!document.getElementById('iphoneExportButton').disabled);const before=shared.length;click('iphoneExportButton');await waitFor(()=>shared.length===before+1&&!document.getElementById('iphoneExportButton').disabled);
 const first=shared.at(-1),firstText=first.find(file=>file.name.endsWith('.txt')),target=sharedFolders.snapshot().transcript.source;assert(firstText&&first.some(file=>file.name==='memora-transcript-archive.json'));assert(target.files.some(file=>file.name===firstText.name)&&target.selectionScope==='selection');
 const beforeCalls=calls.length;click('transcribeButton');await choose('Discard pending transcripts');await waitFor(()=>calls.length>beforeCalls&&document.getElementById('transcriptionStatus').textContent==='Transcription complete.');click('iphoneExportButton');await waitFor(()=>shared.length===before+2&&!document.getElementById('iphoneExportButton').disabled);
 const second=shared.at(-1),list=JSON.parse(await second.find(file=>file.name==='memora-transcript-archive.json').text());assert(list.recordings.some(entry=>entry.transcripts.some(ref=>ref.relativePath===firstText.name)));for(const file of second.filter(file=>file.name.endsWith('.txt')))assert(list.recordings.some(entry=>entry.transcripts.some(ref=>ref.relativePath===file.name)));
});
await test('Phone Transcribe reads the selected child JSON without a second picker and retains its Archive UUID',async()=>{
 const wrap=(name,data)=>{const file=new File([data],name.split('/').at(-1));Object.defineProperty(file,'webkitRelativePath',{value:name});return file;};
 const audio=wrap('Phone/memo.wav',f.wav([f.wavChunk('imID',f.payload(ID))]));
 const source={kind:'file-input',selectionScope:'folder',name:'Phone',files:[audio,wrap('Phone/memora-audio-source.json',JSON.stringify({schemaVersion:1,audioSourceId:SOURCE,recordings:[{recordingId:ID,audioRelativePath:'memo.wav',identityOrigin:'imuse-embedded'}]}))]};
 const list={schemaVersion:1,archiveUuid:ARCHIVE,archiveName:'Phone',recordings:[]};const destination={kind:'file-input',selectionScope:'folder',name:'alternate',files:[wrap('alternate/memora-transcript-archive.json',JSON.stringify(list))]};
 let location=null;const workflow=createTranscriptionIdentity({ask:async()=>{throw Error('Unnecessary transcript picker');},onPendingArchive:(file,where)=>{location=where;}});
 await workflow.prepareSource(source,[audio]);await workflow.begin(source,destination,[audio]);const identity=await workflow.prepare(audio);eq(identity.archiveUuid,ARCHIVE);await workflow.addTranscript({filename:'new.txt',recordingId:ID,model:'tiny',operation:'transcribe'});eq(location.folderName,'alternate');
});
await test('Phone selected child reconstructs a missing list from existing TXT but blocks a corrupt existing list',async()=>{
 const audio=new File([f.wav([f.wavChunk('imID',f.payload(ID))])],'memo.wav');
 const source={kind:'file-input',selectionScope:'folder',name:'Phone rebuild',files:[audio,new File([JSON.stringify({schemaVersion:1,audioSourceId:SOURCE,recordings:[{recordingId:ID,audioRelativePath:'memo.wav',identityOrigin:'imuse-embedded'}]})],'memora-audio-source.json')]};
 for(const corrupt of [false,true]){
  const destination={kind:'file-input',selectionScope:'folder',name:'transcription',files:[new File([header()],'a.txt'),...(corrupt?[new File(['invalid'],'memora-transcript-archive.json')]:[])]};
  const workflow=createTranscriptionIdentity({ask:async()=>{throw Error('Unexpected picker');}});await workflow.prepareSource(source,[audio]);
  if(corrupt)await rejects(()=>workflow.begin(source,destination,[audio]));else{await workflow.begin(source,destination,[audio]);eq((await workflow.prepare(audio)).archiveUuid,ARCHIVE);}
 }
});

// Temporary browser profile contains only synthetic runtime logs; remove only the
// explicit identity fixture database here, never any user database.
await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(testRecoveryDatabaseName);request.onsuccess=resolve;request.onerror=()=>reject(request.error);});
const output=lines.join('\n')+`\n${lines.length-failures.length}/${lines.length} groups passed`;
const pre=document.createElement('pre');pre.id='checkpoint3Results';pre.textContent=output;document.body.prepend(pre);
document.body.dataset.testStatus=failures.length?'failed':'passed';
if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify({passed:lines.length-failures.length,failed:failures,output})});
