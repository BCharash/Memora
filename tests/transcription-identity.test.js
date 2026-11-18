import {directory,selections,calls,seedAudio} from './transcription-identity-fixtures.js';
import {readTranscriptIdentity,replaceTranscriptBody,recordingIdentityLines} from '../js/transcriptMetadata.js';
import {parseTranscriptArchive,appendTranscriptReference,openTranscriptArchive} from '../js/transcriptArchive.js';
import {parseTranscriptFile,combineTranscriptRecords,selectHighestModelRecords} from '../js/combine.js';
import {associatedSourceEvidence} from '../js/transcriptionIdentity.js';
import {readAudioMetadata as readRealMetadata} from '../js/metadata.js?identity-dates';
import {readEmbeddedRecordingIdentity} from '../js/recordingIdentity.js';
import * as f from './recording-identity-fixtures.js';
import {createRecordingIdentityUI} from '../js/recordingIdentityUI.js';
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
 const record=parseTranscriptFile(new File([header()],'a.txt'),header());eq(record.recordingId,ID);eq(record.audioSourceId,SOURCE);
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
 state.files.set('memora-archive.json',new TextEncoder().encode('{}'));
 await rejects(()=>archive.add({recordingId:ID,filename:'memo.txt',model:'tiny',operation:'transcribe'}));eq(decoder.decode(state.files.get('memora-archive.json')),'{}');
});
await test('Identity prompts preserve cancellation without persistence or inference',async()=>{
 let stages=0,writes=0;
 const ui=createRecordingIdentityUI({ask:async()=>({action:'cancel'}),openSession:async()=>({status:'ready',session:{stageRecording:async()=>{stages++;return {status:'decision-required',code:'audio-changed'};},persist:async()=>{writes++;}}})});
 await ui.prepareSource({kind:'file-input'});await rejects(()=>ui.prepareRecording(new File(['x'],'memo.wav')));eq(stages,1);eq(writes,0);
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
});
await test('Selected destination evidence reuses established source IDs by embedded UUID',async()=>{
 const selected=directory(),output=directory('transcription');const file=await seedAudio(selected.root,'memo.wav',ID);
 output.state.files.set('migrated.txt',new TextEncoder().encode(header()));
 const evidence=await associatedSourceEvidence(output.root,[file]);eq(evidence.ids,[SOURCE]);assert(evidence.labels.get(SOURCE).includes('migrated.txt'),'Evidence label missing');
});
await test('Unreadable source-list replacement requires separate confirmation and cancel preserves bytes',async()=>{
 const {root,state}=directory();state.files.set('memora-audio-source.json',new TextEncoder().encode('{damaged'));
 const answers=['replace','cancel'];let dialogs=0;
 const ui=createRecordingIdentityUI({ask:async()=>{dialogs++;return {action:answers.shift()};}});
 await rejects(()=>ui.prepareSource(root));eq(dialogs,2);eq(decoder.decode(state.files.get('memora-audio-source.json')),'{damaged');
});

let pageInstalled=false;
await test('Production page boots with isolated database and synthetic model selection',async()=>{
 const html=await (await fetch('../index.html')).text(),parsed=new DOMParser().parseFromString(html,'text/html');
 parsed.querySelectorAll('script').forEach(script=>script.remove());document.body.replaceChildren(...parsed.body.childNodes);pageInstalled=true;
 await import('../js/app.js');await waitFor(()=>document.getElementById('modelSelect').value==='tiny');
 document.getElementById('paragraphingCheckbox').checked=false;
 const language=document.getElementById('languageSelect');language.value='en';language.dispatchEvent(new Event('change'));
});
const desktop=directory('Audio'),second=directory('Other output');let firstID=null,firstArchive=null,originalAudio=null;
const click=id=>document.getElementById(id).click();
async function choose(label){await waitFor(()=>[...document.querySelectorAll('dialog[open] button')].some(button=>button.textContent===label));[...document.querySelectorAll('dialog[open] button')].find(button=>button.textContent===label).click();}
await test('Desktop normal flow persists source and archive IDs before verified TXT delivery',async()=>{
 originalAudio=await seedAudio(desktop.root);selections.push(desktop.root);click('sourceButton');await waitFor(()=>document.querySelectorAll('#recordings input[type=checkbox]').length>0);
 click('sourceDestinationButton');click('transcribeButton');await choose('Create recording list');await waitFor(()=>document.getElementById('transcriptionStatus').textContent==='Transcription complete.');
 const filename=[...desktop.state.files.keys()].find(name=>name.endsWith('.txt'));assert(filename,'No transcript written');
 const identity=readTranscriptIdentity(decoder.decode(desktop.state.files.get(filename)));firstID=identity.recordingId;firstArchive=identity.archiveUuid;
 const source=JSON.parse(decoder.decode(desktop.state.files.get('memora-audio-source.json'))),archive=JSON.parse(decoder.decode(desktop.state.files.get('memora-archive.json')));
 eq(source.recordings[0].recordingId,firstID);eq(archive.archiveUuid,firstArchive);eq(archive.recordings[0].transcripts[0].relativePath,filename);
 eq(calls[0].operation,'transcribe');eq(calls[0].language,'en');assert(calls[0].embedded.status==='absent','Inspected snapshot missing');
 eq(Array.from(new Uint8Array(await originalAudio.arrayBuffer())),Array.from(desktop.state.files.get('memo.wav')),'Audio changed');
});
await test('Different output archive reuses source Recording ID and creates separate Archive UUID',async()=>{
 selections.push(second.root);click('destinationButton');await waitFor(()=>document.getElementById('destinationButton').textContent.includes('Other output'));
 click('transcribeButton');await waitFor(()=>calls.length===2&&document.getElementById('transcriptionStatus').textContent==='Transcription complete.');
 const filename=[...second.state.files.keys()].find(name=>name.endsWith('.txt')),identity=readTranscriptIdentity(decoder.decode(second.state.files.get(filename)));
 eq(identity.recordingId,firstID);assert(identity.archiveUuid!==firstArchive,'Different archives conflated');
});
await test('Post-inference write failure retains text; retry saves without another model call',async()=>{
 second.state.failTranscriptOnce=true;click('transcribeButton');await waitFor(()=>!document.getElementById('retryTranscriptSaveButton').hidden);
 const count=calls.length;assert(document.getElementById('transcriptionOutput').textContent.includes('Synthetic completed text.'),'Completed text lost');
 click('retryTranscriptSaveButton');await waitFor(()=>document.getElementById('retryTranscriptSaveButton').hidden);eq(calls.length,count);assert(second.state.aborts>0,'Failed writer did not abort');
});
let shared=[],cancelShare=true;
await test('File-input prepares separate pending source/archive JSON and blocks transcript sharing',async()=>{
 const file=new File([await originalAudio.arrayBuffer()],'memo.wav');const sourceJson=new File([desktop.state.files.get('memora-audio-source.json')],'memora-audio-source.json');
 selections.push({kind:'file-input',name:'Audio',files:[file,sourceJson]});click('sourceButton');await waitFor(()=>document.getElementById('iphoneTranscriptionDestinationOptions').style.display === 'flex' && document.querySelector('#recordings .recording-checkbox') && !document.getElementById('transcribeButton').disabled);
 click('transcribeButton');await choose('Create transcript archive');await waitFor(()=>document.getElementById('transcriptionStatus').textContent==='Transcription complete.');
 assert(!document.getElementById('saveRecordingListButton').hidden&&!document.getElementById('saveTranscriptArchiveButton').hidden,'JSON actions missing');assert(document.getElementById('iphoneExportButton').disabled,'Transcript shared before JSON actions');
 Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{if(cancelShare)throw new DOMException('Cancelled','AbortError');shared.push(data.files);}});
});
await test('Share cancellation preserves pending files; completed JSON actions unlock transcript sharing',async()=>{
 click('saveRecordingListButton');await new Promise(resolve=>setTimeout(resolve,30));assert(document.getElementById('iphoneExportButton').disabled,'Cancelled share authorized delivery');
 cancelShare=false;click('saveRecordingListButton');await waitFor(()=>document.getElementById('recordingListSaveStatus').textContent.includes('Share completed'));
 assert(document.getElementById('iphoneExportButton').disabled,'Archive action bypassed');click('saveTranscriptArchiveButton');await waitFor(()=>!document.getElementById('iphoneExportButton').disabled);
 click('iphoneExportButton');await waitFor(()=>shared.length===3);eq(shared[0][0].name,'memora-audio-source.json');eq(shared[1][0].name,'memora-archive.json');assert(shared[2][0].name.endsWith('.txt'),'Transcript transport changed');
 eq(readTranscriptIdentity(await shared[2][0].text()).recordingId,firstID);assert(document.getElementById('iphoneExportStatus').textContent.includes('cannot verify'),'False saved-location claim');
});
await test('Settings removes only explicitly confirmed inactive recovery copies',async()=>{
 const {createAudioSourceRecoveryStore}=await import('./transcription-recovery-fixtures.js');const store=createAudioSourceRecoveryStore();
 await store.put({audioSourceId:ARCHIVE,revision:'removal-fixture',state:'verified',sourceName:'Inactive test source',baseBytes:null,manifestText:JSON.stringify({schemaVersion:1,audioSourceId:ARCHIVE,recordings:[]})},null);
 click('settingsButton');await waitFor(()=>document.querySelector('[data-settings-action="toggle-source-recovery"]'));
 document.querySelector('[data-settings-action="toggle-source-recovery"]').click();
 await waitFor(()=>document.getElementById('settingsSourceRecoveryDetail').textContent.includes('Inactive test source'));
 const rows=[...document.querySelectorAll('#settingsSourceRecoveryDetail button')];
 assert(rows.some(button=>button.disabled),'Active source removal was offered');const remove=rows.find(button=>!button.disabled);assert(remove,'Inactive source action missing');
 const originalConfirm=window.confirm;
 try{window.confirm=()=>false;remove.click();eq((await store.list()).length,2);window.confirm=()=>true;remove.click();await waitFor(()=>!document.getElementById('settingsSourceRecoveryDetail').textContent.includes('Inactive test source'));eq((await store.list()).length,1);}finally{window.confirm=originalConfirm;}
});
// Temporary browser profile contains only synthetic runtime logs; remove only the
// explicit identity fixture database here, never any user database.
await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(testRecoveryDatabaseName);request.onsuccess=resolve;request.onerror=()=>reject(request.error);});
const output=lines.join('\n')+`\n${lines.length-failures.length}/${lines.length} groups passed`;
const pre=document.createElement('pre');pre.id='checkpoint3Results';pre.textContent=output;document.body.prepend(pre);
document.body.dataset.testStatus=failures.length?'failed':'passed';
if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify({passed:lines.length-failures.length,failed:failures,output})});
