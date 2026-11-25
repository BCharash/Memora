import {sharedFolders} from '../js/sharedFolderSelection.js';
import {directory,selections,calls,seedAudio} from './transcription-identity-fixtures.js';
import {readTranscriptFolder,openTranscriptCatalogue,clearTranscriptCatalogueCache,listTranscriptCatalogueCache,transcriptMetadataParent,removeTranscriptCatalogueCache} from '../js/transcriptCatalogue.js';
import {createTranscriptionGate} from '../js/transcriptionGate.js';
import {readTranscriptIdentity} from '../js/transcriptMetadata.js';
import {openMemoraDatabase} from './source-database-adapter.js';
import * as f from './recording-identity-fixtures.js';
const ID=f.ID,UUID='9599e552-b194-4511-8865-b37a07413a38';
const header=(id=ID,uuid=UUID)=>`old.wav\n\nRecording ID: ${id}\nArchive UUID: ${uuid}\nWhisper model: tiny\nOperation: transcribe\n\n--------------------------------------------------\n\nThis is an existing transcript.\n`;
const lines=[],failed=[],assert=(value,message='Assertion failed')=>{if(!value)throw Error(message);};
async function test(name,work){try{await work();lines.push('PASS '+name);}catch(error){failed.push(name);lines.push('FAIL '+name+': '+error.stack);}if(location.search.includes('report=1'))await fetch('/_identity-test-progress',{method:'POST',body:lines.at(-1)});}
async function wait(check){const until=Date.now()+7000;while(!check()){if(Date.now()>until)throw Error('Timed out: '+check+'; dialog='+document.querySelector('dialog[open]')?.textContent+'; status='+document.getElementById('transcriptionStatus')?.textContent);await new Promise(r=>setTimeout(r,15));}}
const click=id=>document.getElementById(id).click();
async function choose(label){await wait(()=>[...document.querySelectorAll('dialog[open] button')].some(b=>b.textContent===label));[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent===label).click();}
async function put(root,name,text){const w=await(await root.getFileHandle(name,{create:true})).createWritable();await w.write(text);await w.close();}
await test('Transcript loads ignore even unreadable old JSON and retain TXT identity in local metadata',async()=>{
 const json=new File(['invalid legacy sidecar'],'memora-transcript-archive.json');json.text=()=>{throw Error('Read retired JSON');};
 const source={kind:'file-input',name:'transcription',selectionScope:'folder',files:[json,new File([header()],'a.txt')]};const snapshot=await readTranscriptFolder(source);assert(snapshot.records.length===1&&snapshot.archiveUuid===UUID&&!snapshot.issues.length);assert((await openTranscriptCatalogue(source)).archiveUuid===UUID);assert((await openTranscriptCatalogue({kind:'file-input',name:'Uppercase identity',files:[new File([header(ID,UUID.toUpperCase())],'a.txt')]})).archiveUuid===UUID.toUpperCase(),'Existing UUID spelling changed');
 const db=await openMemoraDatabase();const rows=await new Promise((resolve,reject)=>{const request=db.transaction('transcriptCatalogues').objectStore('transcriptCatalogues').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});db.close();assert(rows.some(row=>row.records.some(record=>record.recordingId===ID&&record.archiveUuid===UUID)));assert(!rows.some(row=>JSON.stringify(row).includes('This is an existing transcript.')),'Metadata cache copied transcript bodies');
});
await test('Refreshing TXT metadata replaces stale local observations without borrowing cached identities',async()=>{
 const source={kind:'file-input',name:'Same name',files:[new File([header()],'a.txt')]};assert((await readTranscriptFolder(source)).records[0].recordingId===ID);source.files=[new File([header(f.OTHER)],'a.txt')];assert((await readTranscriptFolder(source)).records[0].recordingId===f.OTHER);
});
await test('Empty native and phone destinations need no JSON and receive a stable session UUID',async()=>{for(const source of [directory('Empty').root,{kind:'file-input',name:'New',files:[],selectionScope:'selection'}]){const first=await openTranscriptCatalogue(source),again=await openTranscriptCatalogue(source);assert(first.archiveUuid===again.archiveUuid&&first.snapshot.records.length===0);if(source.kind==='directory'){let count=0;for await(const _ of source.entries())count++;assert(count===0);}}});
await test('Missing/conflicting TXT identities still block new writes; read-only mixed archives remain loadable',async()=>{const source={kind:'file-input',name:'Mixed',files:[new File([header()],'a.txt'),new File([header(f.OTHER,f.OTHER)],'b.txt')]};assert((await readTranscriptFolder(source)).records.length===2);let blocked=false;try{await openTranscriptCatalogue(source);}catch{blocked=true;}assert(blocked);});
await test('Metadata parent labels use consistent TXT provenance and explicit unknown/mixed fallbacks',()=>{
 assert(transcriptMetadataParent({records:[{originalAudioFolderName:'2018'},{originalAudioFolderName:'2018'}]})==='2018');
 assert(transcriptMetadataParent({records:[],parentAudioFolderName:'Granted Audio'})==='Granted Audio');
 assert(transcriptMetadataParent({records:[]})==='Parent Audio Folder Unknown');
 assert(transcriptMetadataParent({records:[{originalAudioFolderName:'2016'},{originalAudioFolderName:'2017'}],parentAudioFolderName:'Wrong Guess'})==='Multiple Audio Folders');
});
await test('Empty granted children keep session identity without storing empty cache rows',async()=>{
 const source={kind:'file-input',name:'Empty child',parentAudioName:'Audio Parent',selectionScope:'folder',files:[]};const first=await openTranscriptCatalogue(source),again=await openTranscriptCatalogue(source);assert(first.archiveUuid===again.archiveUuid);assert(!(await listTranscriptCatalogueCache()).some(row=>row.folderName==='Empty child'));
});
await test('Reopening an identified transcript folder replaces its cached snapshot instead of retaining history',async()=>{
 const one={kind:'file-input',selectionScope:'folder',name:'Latest transcript folder',files:[new File([header()],'old.txt')]};await readTranscriptFolder(one);const before=(await listTranscriptCatalogueCache()).find(row=>row.folderName===one.name);const two={...one,files:[new File([header()],'new.txt')]};await readTranscriptFolder(two);const after=(await listTranscriptCatalogueCache()).filter(row=>row.folderName===one.name);assert(after.length===1&&after[0].id===before.id&&after[0].revision!==before.revision&&after[0].records[0].filename==='new.txt');
 const broken={...two,files:[new File(['broken'],'bad.txt')]};await readTranscriptFolder(broken);assert((await listTranscriptCatalogueCache()).find(row=>row.id===before.id).records[0].filename==='new.txt','Failed read replaced the valid snapshot');
});
await test('Newer duplicate transcript cache snapshot prevails and older copies are removed',async()=>{
 const source={kind:'file-input',selectionScope:'folder',name:'Duplicate cache folder',files:[new File([header()],'a.txt')]};await readTranscriptFolder(source);const first=(await listTranscriptCatalogueCache()).find(row=>row.folderName===source.name);const latest={...first,id:crypto.randomUUID(),revision:crypto.randomUUID(),updatedAt:first.updatedAt+100};const db=await openMemoraDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('transcriptCatalogues','readwrite');tx.objectStore('transcriptCatalogues').put(latest);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();await readTranscriptFolder({...source});const rows=(await listTranscriptCatalogueCache()).filter(row=>row.folderName===source.name);assert(rows.length===1&&rows[0].id===latest.id);
});
await test('Partial transcript access does not replace the existing complete cached folder',async()=>{
 const source={kind:'file-input',selectionScope:'folder',name:'Partial guarded cache',files:[new File([header()],'a.txt'),new File([header(f.OTHER)],'b.txt')]};await readTranscriptFolder(source);const before=(await listTranscriptCatalogueCache()).find(row=>row.folderName===source.name);source.selectionScope='selection';source.files=[source.files[0]];await readTranscriptFolder(source);assert((await listTranscriptCatalogueCache()).find(row=>row.id===before.id).records.length===2);
});
await test('Listing old cache entries immediately keeps only the latest identified snapshot and removes empty rows',async()=>{
 await clearTranscriptCatalogueCache();const metadata=(count,parent,archive)=>Array.from({length:count},(_,index)=>({filename:`recording-${index}.txt`,recordingId:ID,archiveUuid:archive,originalAudioFolderName:parent,whisperModel:'tiny',operation:'transcribe'}));
 const rows=[{id:'year-old',folderName:'transcription',updatedAt:100,records:metadata(83,'2016',UUID)},{id:'year-new',folderName:'transcription',updatedAt:200,records:metadata(83,'2016',UUID)},{id:'test-old',folderName:'testing',updatedAt:100,records:metadata(2,'Dayananda',f.OTHER)},{id:'test-new',folderName:'testing',updatedAt:200,records:metadata(3,'Dayananda',f.OTHER)},{id:'empty-root',folderName:'Dayananda',updatedAt:300,records:[]}];
 const db=await openMemoraDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('transcriptCatalogues','readwrite');for(const row of rows)tx.objectStore('transcriptCatalogues').put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();const after=await listTranscriptCatalogueCache();assert(after.length===2&&after.some(row=>row.id==='year-new'&&row.records.length===83)&&after.some(row=>row.id==='test-new'&&row.records.length===3));
});
await test('Distinct native folders with equal names and archive identities are not collapsed',async()=>{
 await clearTranscriptCatalogueCache();const root=await navigator.storage.getDirectory(),a=await(await root.getDirectoryHandle('Cache A',{create:true})).getDirectoryHandle('transcription',{create:true}),b=await(await root.getDirectoryHandle('Cache B',{create:true})).getDirectoryHandle('transcription',{create:true});
 const row={folderName:'transcription',updatedAt:100,records:[{filename:'a.txt',archiveUuid:UUID,recordingId:ID,originalAudioFolderName:'Same parent'}]};const db=await openMemoraDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('transcriptCatalogues','readwrite');tx.objectStore('transcriptCatalogues').put({...row,id:'native-a',directoryHandle:a});tx.objectStore('transcriptCatalogues').put({...row,id:'native-b',directoryHandle:b,updatedAt:200});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();assert((await listTranscriptCatalogueCache()).length===2);
});
await test('Concurrent initial reads create one stored snapshot before Settings cleanup is invoked',async()=>{
 await clearTranscriptCatalogueCache();const source=()=>({kind:'file-input',selectionScope:'folder',name:'Concurrent transcript',files:[new File([header()],'a.txt')]});const snapshots=await Promise.all([readTranscriptFolder(source()),readTranscriptFolder(source())]);assert(snapshots.every(s=>!s.cacheError));const db=await openMemoraDatabase();const rows=await new Promise((resolve,reject)=>{const request=db.transaction('transcriptCatalogues').objectStore('transcriptCatalogues').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});db.close();assert(rows.length===1);
});
await test('Session gate guards only untouched primary departures and resets per app session',()=>{const gate=createTranscriptionGate();assert(!gate.snapshot().guarded);gate.leave();assert(!gate.snapshot().guarded);gate.setTranscriptSource(true);assert(gate.snapshot().guarded);gate.activity();gate.leave();assert(!gate.snapshot().guarded&&gate.snapshot().enabled);assert(!createTranscriptionGate().snapshot().guarded);});
await test('Actual page opens with source at top and destination below; Settings alone does not gate it',async()=>{
 const parsed=new DOMParser().parseFromString(await(await fetch('../index.html')).text(),'text/html');parsed.querySelectorAll('script').forEach(s=>s.remove());document.body.replaceChildren(...parsed.body.childNodes);await import('../js/app.js');await wait(()=>document.getElementById('modelSelect').value==='tiny');
 assert(!document.querySelector('.source-section [data-select-transcript=transcribe]'));assert(document.querySelector('#transcriptionDestinationSection [data-select-transcript=transcribe]'));assert(!document.getElementById('transcriptionWorkspace').hidden);assert((document.getElementById('desktopTranscriptionDestinationOptions').style.display==='none')===!window.showDirectoryPicker,'Initial phone controls exposed native-only destinations');click('settingsButton');click('settingsButton');assert(!document.getElementById('transcriptionWorkspace').hidden&&document.getElementById('enableTranscriptionButton').hidden);click('combineTab');click('transcriptionTab');assert(!document.getElementById('transcriptionWorkspace').hidden&&document.getElementById('enableTranscriptionButton').hidden,'An untouched return with no transcript folder was gated');
});
const root=directory('Parent'),child=await root.root.getDirectoryHandle('transcription',{create:true});await seedAudio(root.root,'renamed.wav',ID);await put(child,'existing.txt',header());await put(child,'memora-transcript-archive.json','DO NOT READ OR CHANGE');root.state.files.set('memora-audio-source.json',new TextEncoder().encode('KEEP OLD AUDIO JSON'));
await test('Combine source selection keeps audio access without preparing Transcribe, and ignores old JSON',async()=>{
 click('combineTab');selections.push(root.root);document.querySelector('#combinePanel [data-select-audio]').click();await wait(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('#transcripts .recording-checkbox'));assert(document.querySelectorAll('#recordings .recording-checkbox').length===0,'Transcribe list prepared from Combine');assert(sharedFolders.resolveAudio({recordingId:ID,recordingFilename:'old.wav'}).name==='renamed.wav','Actual app inventory did not reach shared audio lookup');assert(!document.getElementById('saveCombineTranscriptListButton'));assert(await(await(await child.getFileHandle('memora-transcript-archive.json')).getFile()).text()==='DO NOT READ OR CHANGE');
 click('transcriptionTab');assert(!document.getElementById('enableTranscriptionButton').hidden&&document.getElementById('transcriptionWorkspace').hidden);assert(document.querySelector('[data-transcript-folder]').textContent.includes('Parent / transcription'));
});
await test('Actual Combine Show transcript and Play find parent audio automatically from the new inventory',async()=>{
 const picker=window.showDirectoryPicker,play=HTMLMediaElement.prototype.play;let picked=0;
 window.showDirectoryPicker=async()=>{picked++;throw Error('Unexpected manual audio picker');};HTMLMediaElement.prototype.play=async()=>{};
 try{click('combineTab');document.querySelector('#transcripts .search-transcript-toggle').click();await wait(()=>document.querySelector('#transcripts .search-audio-play'));assert(document.querySelector('#transcripts .search-audio-location-note').hidden,'Combine must hide the picker instructions before playback');document.querySelector('#transcripts .search-audio-play').click();await wait(()=>{const audio=document.querySelector('#transcripts audio');return audio&&!audio.hidden&&audio.src.startsWith('blob:');});assert(picked===0);assert(!document.querySelector('#transcripts .search-audio-error').textContent.includes('filter'));}finally{window.showDirectoryPicker=picker;HTMLMediaElement.prototype.play=play;click('transcriptionTab');}
});
await test('Enable Transcription reuses shared folders; recordings begin unchecked; no automatic inference',async()=>{
 click('enableTranscriptionButton');await wait(()=>document.querySelector('#recordings .recording-checkbox')&&!document.getElementById('sourceButton').disabled);assert([...document.querySelectorAll('#recordings .recording-checkbox')].every(box=>!box.checked));assert(calls.length===0);click('combineTab');click('transcriptionTab');assert(!document.getElementById('transcriptionWorkspace').hidden);
});
await test('Desktop writes only TXT and preserves existing Archive UUID without touching any transcript JSON',async()=>{
 document.getElementById('paragraphingCheckbox').checked=false;const box=document.querySelector('#recordings .recording-checkbox');box.checked=true;box.dispatchEvent(new Event('change'));await wait(()=>!document.getElementById('transcribeButton').disabled);click('transcribeButton');await wait(()=>document.getElementById('transcriptionStatus').textContent==='Transcription complete.');let files=[];for await(const [name,handle]of child.entries())if(name.endsWith('.txt'))files.push(await handle.getFile());assert(files.length===2);const created=files.find(file=>file.name!=='existing.txt');assert(readTranscriptIdentity(await created.text()).archiveUuid===UUID);assert(await(await(await child.getFileHandle('memora-transcript-archive.json')).getFile()).text()==='DO NOT READ OR CHANGE');
 const before=calls.length;await put(child,'existing.txt',header(ID,f.OTHER));click('transcribeButton');await wait(()=>document.getElementById('transcriptionStatus').textContent.includes('Choose one transcript collection'));assert(calls.length===before,'Changed/conflicting destination reached inference');await put(child,'existing.txt',header());
});
await test('Desktop lower destination selector creates an empty folder and its first TXT without a sidecar',async()=>{
 const original=window.prompt;window.prompt=()=> 'created below';try{document.querySelector('[data-select-transcript=transcribe]').click();await choose('New Transcript Folder…');await wait(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('[data-transcript-folder]').textContent.includes('created below'));}finally{window.prompt=original;}
 const target=await root.root.getDirectoryHandle('created below');let names=[];for await(const [name]of target.entries())names.push(name);assert(!names.length);const before=calls.length;click('transcribeButton');await wait(()=>calls.length>before&&document.getElementById('transcriptionStatus').textContent==='Transcription complete.');names=[];for await(const [name]of target.entries())names.push(name);assert(names.length===1&&names[0].endsWith('.txt'));assert(readTranscriptIdentity(await(await(await target.getFileHandle(names[0])).getFile()).text()).archiveUuid!==UUID);
 document.querySelector('[data-select-transcript=transcribe]').click();await choose('Parent / transcription');await wait(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('[data-transcript-folder]').textContent==='Parent / transcription');
});
await test('Failed child-folder discovery retains the prior shared source and its matching identity workflow',async()=>{
 const broken=directory('Broken next source');await seedAudio(broken.root,'other.wav',f.OTHER);const entries=broken.root.entries;let count=0;broken.root.entries=async function*(){if(++count===2)throw Error('Injected child discovery failure');yield* entries.call(broken.root);};const original=window.alert;window.alert=()=>{};
 try{selections.push(broken.root);click('sourceButton');await wait(()=>!document.getElementById('sourceButton').disabled&&document.getElementById('audioInventoryStatus').textContent.includes('Injected child discovery failure'));assert(document.querySelector('[data-audio-folder]').textContent==='Parent');const before=calls.length;click('transcribeButton');await wait(()=>calls.length>before&&document.getElementById('transcriptionStatus').textContent==='Transcription complete.');}finally{window.alert=original;}
});
await test('Search still reads its embeddings JSON while loading TXT metadata locally',async()=>{
 const {sharedSearchArchives}=await import('./shared-production-search-fixtures.js');await put(child,'search-embeddings.json',JSON.stringify({marker:'keep embedding archive'}));click('searchTab');await wait(()=>document.getElementById('searchIndexStatus').textContent.includes('Search ready'));assert(sharedSearchArchives.at(-1).marker==='keep embedding archive');assert(JSON.parse(await(await(await child.getFileHandle('search-embeddings.json')).getFile()).text()).marker==='keep embedding archive');click('transcriptionTab');
});
await test('Combine scope shows Search description without Memora, survives tab returns, and resets to All on folder load',async()=>{
 click('combineTab');await wait(()=>!document.getElementById('textSourceButton').disabled);click('textSourceButton');await choose('Parent / transcription');
 await wait(()=>!document.getElementById('textSourceButton').disabled&&document.getElementById('combineListScope').textContent==='All');
 assert(document.getElementById('combineListFolder').textContent==='Parent / transcription');
 click('searchTab');await wait(()=>!document.getElementById('searchButton').disabled);
 const input=document.getElementById('searchQueryInput');input.value='What did I say about dreams?; Silence, stillness';input.dispatchEvent(new Event('input'));
 click('searchButton');await wait(()=>document.querySelector('.search-use-combine-button'));
 document.querySelector('.search-use-combine-button').click();
 await wait(()=>!document.getElementById('combinePanel').hidden&&document.getElementById('combineListScope').textContent==='Search: Dreams; Silence, Stillness');
 assert(document.getElementById('combineListFolder').textContent==='Parent / transcription');
 assert(document.getElementById('textSourceButton').textContent==='Select Transcript Folder');
 assert(document.getElementById('combineTitleInput').value==='Memora — Search: Dreams; Silence, Stillness');
 assert(document.querySelectorAll('#transcripts .recording-checkbox').length===1,'Search subset replaced by full folder');
 click('searchTab');click('combineTab');assert(document.getElementById('combineListScope').textContent==='Search: Dreams; Silence, Stillness');
 click('textSourceButton');await choose('Parent / transcription');await wait(()=>!document.getElementById('textSourceButton').disabled&&document.getElementById('combineListScope').textContent==='All');
 const headings=[document.querySelector('#combinePanel .folder-heading'),...document.querySelectorAll('#combinePanel .shared-folder-row h2')];
 assert(new Set(headings.map(h=>getComputedStyle(h).fontSize)).size===1,'Folder and list heading sizes differ');
 const frame=document.createElement('iframe');frame.style.width='390px';frame.style.height='700px';document.body.append(frame);
 try{
  frame.contentDocument.open();frame.contentDocument.write('<link rel="stylesheet" href="../css/style.css">'+document.getElementById('combinePanel').outerHTML);frame.contentDocument.close();
  await wait(()=>frame.contentDocument.styleSheets.length>0&&frame.contentWindow.getComputedStyle(frame.contentDocument.querySelector('h2')).fontSize==='20px');
  const doc=frame.contentDocument,box=doc.getElementById('combineListOrigin');
  assert(new Set([...doc.querySelectorAll('.shared-folder-row h2,.folder-heading')].map(h=>frame.contentWindow.getComputedStyle(h).fontSize)).size===1,'Phone heading sizes differ');
  assert(box.getBoundingClientRect().right<=390&&box.scrollWidth<=box.clientWidth,'Phone origin box overflows');
 }finally{frame.remove();}

 assert([...document.querySelectorAll('[data-select-audio],#sourceButton')].every(button=>button.textContent.trim()==='Select Audio Folder'));
 click('transcriptionTab');
});
const phone={kind:'file-input',name:'Phone 2018',selectionScope:'folder',files:[new File([f.wav([f.wavChunk('imID',f.payload(ID))])],'memo.wav'),new File([JSON.stringify({schemaVersion:1,audioSourceId:f.OTHER,recordings:[{recordingId:ID,audioRelativePath:'memo.wav',identityOrigin:'imuse-embedded'}]})],'memora-audio-source.json')]};let shared=[],cancel=false;
Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{assert(Object.keys(data).join()==='files');if(cancel)throw new DOMException('Cancelled','AbortError');shared.push(data.files);}});
await test('Phone can name an empty/new destination without reading files or requiring JSON',async()=>{
 selections.push(phone);click('sourceButton');await wait(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('[data-audio-folder]').textContent==='Phone 2018');assert(!document.getElementById('saveRecordingListButton'),'Retired audio JSON save control returned');
 const original=window.prompt;window.prompt=()=> 'new transcripts';document.querySelector('[data-select-transcript=transcribe]').click();await choose('New Transcript Folder…');await wait(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('[data-transcript-folder]').textContent.includes('new transcripts'));window.prompt=original;
 assert(document.getElementById('destinationButton').textContent==='Browse for Another Folder');assert(!document.getElementById('saveTranscriptArchiveButton'));document.querySelector('#recordings .recording-checkbox').checked=true;click('transcribeButton');await wait(()=>document.getElementById('transcriptionStatus').textContent==='Transcription complete.'&&!document.getElementById('iphoneExportButton').disabled);assert(document.getElementById('iphoneExportLocation').textContent==='Save in: Phone 2018 / new transcripts');assert(parseFloat(getComputedStyle(document.getElementById('iphoneExportLocation')).fontSize)>parseFloat(getComputedStyle(document.getElementById('audioCacheStatus')).fontSize),'Destination is still small status text');
});
await test('Never-saved warning, canceled save retry, TXT-only share and post-share verification are distinct',async()=>{
 const pendingClose=new Event('beforeunload',{cancelable:true});window.dispatchEvent(pendingClose);assert(pendingClose.defaultPrevented,'Unsaved TXT no longer protected on close');
 click('transcribeButton');await wait(()=>document.querySelector('dialog[open]'));assert(document.querySelector('dialog[open]').textContent.includes('There are transcripts waiting to be saved'));await choose('Keep pending transcripts');
 cancel=true;click('iphoneExportButton');await wait(()=>!document.getElementById('iphoneExportButton').disabled);assert(!shared.length&&document.getElementById('iphoneExportButton').classList.contains('has-pending-exports'));
 cancel=false;click('iphoneExportButton');await wait(()=>shared.length===1&&!document.getElementById('iphoneExportButton').disabled);assert(shared[0].length===1&&shared[0][0].name.endsWith('.txt'));assert(!document.getElementById('iphoneExportButton').classList.contains('has-pending-exports'));click('transcribeButton');await wait(()=>document.querySelector('dialog[open]'));assert(document.querySelector('dialog[open]').textContent.includes('Please verify that your transcripts were saved in Phone 2018 / new transcripts'));await choose('Keep pending transcripts');
});
await test('A second new batch resets save warnings and pulse instead of inheriting the previous share result',async()=>{
 const before=calls.length;click('transcribeButton');await choose('Discard pending transcripts');await wait(()=>calls.length>before&&document.getElementById('transcriptionStatus').textContent==='Transcription complete.');assert(document.getElementById('iphoneExportButton').classList.contains('has-pending-exports'));click('transcribeButton');await wait(()=>document.querySelector('dialog[open]'));assert(document.querySelector('dialog[open]').textContent.includes('There are transcripts waiting to be saved'));await choose('Keep pending transcripts');
});
await test('Settings places named folder caches together with matching disclosures, separators and individual parent-grouped rows',async()=>{
 click('settingsButton');await wait(()=>document.getElementById('settingsStorageStatus').textContent.startsWith('Updated '));
 const audio=document.querySelector('[data-settings-action="toggle-audio-metadata"]').parentElement,metadata=document.querySelector('[data-settings-action="toggle-transcript-metadata"]').parentElement,registry=document.querySelector('[data-settings-action="toggle-registry-cache"]').parentElement;
 assert(audio.textContent.includes('Audio Folder Metadata Cache')&&metadata.textContent.includes('Transcript Folder Metadata Cache'));
 assert(audio.compareDocumentPosition(metadata)&Node.DOCUMENT_POSITION_FOLLOWING);assert(metadata.compareDocumentPosition(registry)&Node.DOCUMENT_POSITION_FOLLOWING);assert(metadata.previousElementSibling.classList.contains('settings-section-divider'));
 const toggle=metadata.querySelector('button');assert(getComputedStyle(toggle).width===getComputedStyle(audio.querySelector('button')).width);assert(document.documentElement.scrollWidth<=window.innerWidth,'Settings has horizontal overflow');toggle.click();
 await wait(()=>document.querySelector('#settingsTranscriptMetadataDetail .settings-item'));
 const detail=document.getElementById('settingsTranscriptMetadataDetail');assert(toggle.textContent==='Hide'&&detail.textContent.includes('new transcripts')&&detail.textContent.includes('Phone 2018'));
 assert(detail.querySelectorAll('.settings-item').length===(await listTranscriptCatalogueCache()).length,'Folder scopes collapsed into a report');
 assert(detail.querySelector('.settings-selection-actions').compareDocumentPosition(detail.querySelector('.settings-item'))&Node.DOCUMENT_POSITION_FOLLOWING);
 toggle.click();assert(detail.hidden&&toggle.textContent==='View');toggle.click();await wait(()=>!detail.hidden&&detail.querySelector('.settings-item'));
});
await test('Settings folder entries and disclosures fit a real 390px iframe viewport',async()=>{
 const parsed=new DOMParser().parseFromString(await(await fetch('../index.html')).text(),'text/html');
 const iframe=document.createElement('iframe');iframe.style.width='390px';iframe.style.height='844px';iframe.style.border='0';
 const loaded=new Promise(resolve=>iframe.onload=resolve);
 iframe.srcdoc=`<!doctype html><html><head><link rel="stylesheet" href="${new URL('../css/style.css',location.href)}">${[...parsed.head.querySelectorAll('style')].map(style=>style.outerHTML).join('')}</head><body>${document.getElementById('settingsStorage').outerHTML}</body></html>`;
 document.body.append(iframe);await loaded;
 try{const doc=iframe.contentDocument,view=iframe.contentWindow;assert(view.innerWidth===390);assert(doc.documentElement.scrollWidth<=390,'Narrow Settings overflow');const a=doc.querySelector('[data-settings-action="toggle-audio-metadata"]'),b=doc.querySelector('[data-settings-action="toggle-transcript-metadata"]');assert(view.getComputedStyle(a).width===view.getComputedStyle(b).width,'View and Hide button widths differ');assert(view.getComputedStyle(b.parentElement.children[1]).textAlign==='center');assert(doc.querySelectorAll('#settingsTranscriptMetadataDetail .settings-item').length>1);}finally{iframe.remove();}
});
await test('Settings audio metadata selection deletes only local snapshots and suppresses empty bulk controls',async()=>{
 const toggle=document.querySelector('[data-settings-action="toggle-audio-metadata"]');toggle.click();await wait(()=>document.querySelector('#settingsAudioMetadataDetail .settings-item'));
 const detail=document.getElementById('settingsAudioMetadataDetail'),all=detail.querySelector('.settings-selection-actions input'),button=[...detail.querySelectorAll('button')].find(b=>b.textContent==='Delete Selected');assert(button.disabled);all.checked=true;all.dispatchEvent(new Event('change'));
 const confirm=window.confirm;window.confirm=()=>true;try{button.click();await wait(()=>document.getElementById('settingsAudioMetadataDetail').textContent.includes('No cached audio folders.'));}finally{window.confirm=confirm;}
 assert(!document.querySelector('#settingsAudioMetadataDetail .settings-selection-actions')&&!document.getElementById('saveRecordingListButton'));
 document.querySelector('[data-settings-action="toggle-transcript-metadata"]').click();await wait(()=>document.querySelector('#settingsTranscriptMetadataDetail .settings-item'));
});
await test('Settings deletes one selected folder metadata snapshot and preserves unselected folders and pending transcript exports',async()=>{
 const detail=document.getElementById('settingsTranscriptMetadataDetail'),before=await listTranscriptCatalogueCache();const check=detail.querySelector('.settings-item input[type="checkbox"]'),remove=[...detail.querySelectorAll('button')].find(b=>b.textContent==='Delete Selected');assert(remove.disabled);check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));assert(!remove.disabled);const confirm=window.confirm;window.confirm=()=>true;
 try{remove.click();await wait(()=>document.querySelectorAll('#settingsTranscriptMetadataDetail .settings-item').length===before.length-1);}finally{window.confirm=confirm;}
 assert((await listTranscriptCatalogueCache()).length===before.length-1);
});
await test('Settings select-all cancellation preserves metadata, deletion empties only that cache, and empty controls are hidden',async()=>{
 let detail=document.getElementById('settingsTranscriptMetadataDetail'),count=(await listTranscriptCatalogueCache()).length;
 let all=detail.querySelector('.settings-selection-actions input');all.checked=true;all.dispatchEvent(new Event('change'));assert([...detail.querySelectorAll('.settings-item input')].every(c=>c.checked));
 const confirm=window.confirm;window.confirm=()=>false;
 let remove=[...detail.querySelectorAll('button')].find(b=>b.textContent==='Delete Selected');remove.click();await new Promise(r=>setTimeout(r,25));assert((await listTranscriptCatalogueCache()).length===count);
 window.confirm=()=>true;
 try{remove.click();await wait(()=>document.getElementById('settingsTranscriptMetadataDetail').textContent.includes('No cached transcript folders.'));}finally{window.confirm=confirm;}
 detail=document.getElementById('settingsTranscriptMetadataDetail');assert(!detail.querySelector('.settings-selection-actions')&&!detail.querySelector('.settings-item'));assert(document.querySelector('[data-settings-action="toggle-transcript-metadata"]').textContent==='Hide');
 click('settingsButton');assert(!document.getElementById('iphoneExportButton').disabled&&document.getElementById('iphoneExportButton').classList.contains('has-pending-exports'));
});
await test('Concurrent metadata refresh prevents atomic deletion of a newer snapshot',async()=>{
 const a={kind:'file-input',name:'Race A',files:[new File([header()],'a.txt')]},b={kind:'file-input',name:'Race B',files:[new File([header()],'b.txt')]};await readTranscriptFolder(a);await readTranscriptFolder(b);const before=await listTranscriptCatalogueCache();a.files=[new File([header(f.OTHER)],'changed.txt')];await readTranscriptFolder(a);let blocked=false;try{await removeTranscriptCatalogueCache(before);}catch{blocked=true;}assert(blocked);const after=await listTranscriptCatalogueCache();assert(after.length===2&&after.some(row=>row.folderName==='Race A'&&row.records[0].filename==='changed.txt')&&after.some(row=>row.folderName==='Race B'));
});
await test('Local metadata retention is bounded and keeps the latest distinct folder observation',async()=>{
 for(let index=0;index<18;index++)await readTranscriptFolder({kind:'file-input',name:'Bounded '+index,files:[new File([header()],'a.txt')]});const rows=await listTranscriptCatalogueCache();assert(rows.length<=16&&rows.some(row=>row.folderName==='Bounded 17'));assert(rows.every(row=>!row.records.some(record=>'transcript' in record)));
});
await test('Local metadata clearing changes no audio, TXT, source JSON or identities',async()=>{await clearTranscriptCatalogueCache();assert((await openTranscriptCatalogue({kind:'file-input',name:'Rebuilt',files:[new File([header()],'a.txt')]})).archiveUuid===UUID);assert(root.state.jsonWrites===0&&(await(await(await root.root.getFileHandle('memora-audio-source.json')).getFile()).text())==='KEEP OLD AUDIO JSON','Existing audio JSON was touched');assert(await(await(await child.getFileHandle('memora-transcript-archive.json')).getFile()).text()==='DO NOT READ OR CHANGE');});
await test('iPhone Search preserves the entire transcript and moves selection between highlighted matches',async()=>{
 const {searchEditorFixture}=await import('./shared-production-search-fixtures.js');
 const {openSearchSource}=await import('../js/searchUI.js');
 click('searchTab');
 const file=new File([header().replace('This is an existing transcript.',searchEditorFixture.body)],searchEditorFixture.filename);
 const source={kind:'file-input',name:'transcription',parentAudioName:'2018',files:[file,new File([header(f.OTHER)],'unselected.txt')]};
 sharedFolders.setTranscript(source,'2018 / transcription');
 await openSearchSource(source);
 const query=document.getElementById('searchQueryInput');query.value='match';query.dispatchEvent(new Event('input'));
 click('searchButton');
 await wait(()=>document.querySelector('.search-result-file'));
 const result=document.querySelector('.search-result-file');
 const full=result.querySelector('.search-result-full-transcript');
 const transcriptToggle=result.querySelector('button[aria-label="Show transcript"]');
 transcriptToggle.click();
 assert(!full.hidden&&full.textContent.includes('Opening paragraph.')&&full.textContent.includes('Closing paragraph.'),'Reader must show both ends of the transcript');
 assert(full.querySelectorAll('mark').length===2,'Reader must retain both colored matches');
 result.querySelector('.search-transcript-edit-button').click();
 const editor=result.querySelector('textarea'),selection=()=>editor.value.slice(editor.selectionStart,editor.selectionEnd);
 const previous=result.querySelector('.search-transcript-previous-match'),next=result.querySelector('.search-transcript-next-match');
 const preview=result.querySelector('.search-transcript-match-preview');
 const save=result.querySelector('.search-transcript-save-button');
 const saveHint=result.querySelector('.search-transcript-save-controls .settings-note');
 const cancelEdit=result.querySelector('.search-transcript-cancel-button');
 assert(editor.value===searchEditorFixture.body,'Editor must retain the exact full text');
 assert(document.activeElement===editor,'Opening Edit must focus the textarea');
 assert(selection()==='The first match crosses a\nline break.','Edit must select the first match across the line break');
 assert(preview.hidden,'The native selection must be the highlight while focused');
 assert(save.hidden&&saveHint.hidden&&!cancelEdit.hidden,'A clean editor must only offer Cancel');
 assert(previous.getAttribute('aria-disabled')==='true');
 next.click();assert(selection()==='The second match contains   extra spaces.','Next must select the original text with its repeated spaces');
 assert(document.activeElement===editor&&preview.hidden,'Navigating while focused must keep the native selection');
 assert(save.hidden&&saveHint.hidden,'Navigating must not count as an edit');
 assert(next.getAttribute('aria-disabled')==='true');
 editor.blur();previous.click();
 assert(document.activeElement!==editor&&selection().includes('\n')&&!preview.hidden&&preview.textContent===selection(),'Previous must show the first match without taking focus back');
 editor.setSelectionRange(editor.value.length,editor.value.length);
 editor.dispatchEvent(new Event('select'));
 previous.click();assert(selection()==='The second match contains   extra spaces.','Previous must also work from after the last match');
 const iframe=document.createElement('iframe');iframe.style.width='390px';
 const loaded=new Promise(resolve=>iframe.addEventListener('load',resolve,{once:true}));
 iframe.srcdoc=`<!doctype html><link rel="stylesheet" href="${new URL('../css/style.css',location.href)}">${result.outerHTML}`;
 document.body.append(iframe);await loaded;
 try{
  const doc=iframe.contentDocument;
  const rect=selector=>doc.querySelector(selector).getBoundingClientRect();
  const editorStyle=iframe.contentWindow.getComputedStyle(doc.querySelector('textarea'));
  assert(editorStyle.overflowY==='auto'&&editorStyle.overscrollBehaviorY==='contain','Search textarea must contain vertical scroll at its edges');
  const prompt=doc.querySelector('.search-transcript-save-controls .settings-note');
  const promptStyle=iframe.contentWindow.getComputedStyle(prompt);
  const pathStyle=iframe.contentWindow.getComputedStyle(prompt.querySelector('.save-destination-path'));
  assert(parseFloat(pathStyle.fontSize)===parseFloat(promptStyle.fontSize)+2&&pathStyle.whiteSpace==='nowrap'&&pathStyle.fontWeight==='700','The destination must be 2 px larger, bold and one line');
  assert(rect('.combine-transcript-actions').top>=rect('.search-result-file-name').bottom,'Result controls must sit below the filename');
  assert(rect('.search-transcript-editor-actions').top>=rect('textarea').bottom,'Save and Cancel must sit below the textarea');
  assert(iframe.contentWindow.getComputedStyle(doc.querySelector('.search-transcript-save-button')).display==='none','Save must be visually hidden until the text changes');
 }finally{iframe.remove();}
 editor.value+=' Unsaved change.';
 editor.dispatchEvent(new Event('input'));
 assert(!save.hidden&&!saveHint.hidden,'Text changes must reveal Save and the destination hint');
 editor.value=searchEditorFixture.body;
 editor.dispatchEvent(new Event('input'));
 assert(save.hidden&&saveHint.hidden,'Undoing all changes must hide Save and the destination hint');
 editor.value+=' Unsaved change.';
 editor.dispatchEvent(new Event('input'));
 const resultToggle=result.querySelector('.search-result-toggle');
 resultToggle.click();
 const confirm=window.confirm;
 let prompted=false;
 window.confirm=()=>{prompted=true;return false;};
 try{resultToggle.click();}finally{window.confirm=confirm;}
 assert(prompted&&!editor.closest('.search-transcript-editor-panel').hidden&&editor.value.endsWith('Unsaved change.'),'Hiding a result must let the user keep editing');
 result.querySelector('.search-transcript-cancel-button').click();
 assert(!full.hidden&&!full.querySelector('.search-transcript-text').hidden,'Cancel must restore the full highlighted reader');
 transcriptToggle.click();
 result.querySelector('.search-transcript-edit-button').click();
 result.querySelector('.search-transcript-cancel-button').click();
 assert(full.hidden&&!result.querySelector('.search-result-excerpt').hidden,'Cancel from the excerpt must restore the excerpt');
 transcriptToggle.click();
 const reader=full.querySelector('.search-transcript-text');
 assert(!full.hidden&&!reader.hidden&&reader.querySelectorAll('mark').length===2,'Show transcript after Cancel must still display the complete highlighted transcript');
});
await test('iPhone Search index save cancellation retains the pulse and a successful share leaves a normal retry button',async()=>{
 const button=document.getElementById('searchIndexUpdateButton');
 const guidance=document.getElementById('searchIndexSaveLocation');
 const status=document.getElementById('searchIndexStatus');
 assert(!guidance.hidden&&guidance.textContent.includes('2018 / transcription'),'Search index guidance must show the known parent');
 assert(guidance.querySelector('strong.save-destination-path')?.textContent==='2018 / transcription','Search index path must have its own bold line');
 assert(parseFloat(getComputedStyle(guidance).marginBottom)>=12,'Destination guidance needs space above the save button');
 assert(button.classList.contains('has-pending-index-update'),'Unsaved update must pulse');
 const activation=Object.getOwnPropertyDescriptor(navigator,'userActivation');
 Object.defineProperty(navigator,'userActivation',{configurable:true,value:{isActive:true}});
 const initialShares=shared.length;
 try{
  cancel=true;
  button.click();await wait(()=>!button.disabled&&status.textContent.includes('Save canceled'));
  assert(button.classList.contains('has-pending-index-update'),'Canceled first save must retain the pulse');
  cancel=false;
  button.click();await wait(()=>!button.disabled&&status.textContent.includes('Check in Files'));
  assert(!button.hidden&&!button.classList.contains('has-pending-index-update'),'Successful share must keep a standard active retry button');
  button.click();await wait(()=>!button.disabled&&shared.length===initialShares+2);
  assert(shared.at(-1)[0].name==='search-embeddings.json'&&!button.classList.contains('has-pending-index-update'),'The standard button must still share the index again');
 }finally{
  cancel=false;
  if(activation)Object.defineProperty(navigator,'userActivation',activation);
  else delete navigator.userActivation;
 }
});
async function withActiveShare(work){
 const activation=Object.getOwnPropertyDescriptor(navigator,'userActivation');
 Object.defineProperty(navigator,'userActivation',{configurable:true,value:{isActive:true}});
 try{await work();}finally{
  cancel=false;
  if(activation)Object.defineProperty(navigator,'userActivation',activation);
  else delete navigator.userActivation;
 }
}
await test('iPhone Search shares the edited TXT first and saves the folder-wide index separately',async()=>{
 const oldResult=document.querySelector('.search-result-file');
 oldResult.querySelector('.search-transcript-edit-button').click();
 const panel=oldResult.querySelector('.search-transcript-editor-panel');
 const editor=panel.querySelector('textarea');
 const save=panel.querySelector('.search-transcript-save-button');
 const source=sharedFolders.snapshot().transcript.source;
 const before=source.files;
 editor.value+=' Edited in Search.';editor.dispatchEvent(new Event('input'));
 await withActiveShare(async()=>{
  const count=shared.length;
  cancel=true;save.click();await wait(()=>!save.disabled&&panel.textContent.includes('Save canceled'));
  assert(source.files===before&&oldResult.isConnected&&!panel.hidden,'Canceled share must preserve the original source and editor');
  cancel=false;save.click();
  await wait(()=>shared.length===count+1&&document.getElementById('searchIndexStatus').textContent.includes('may be in a different order'));
  const [txt]=shared.at(-1);
  assert(shared.at(-1).length===1&&txt.name===before[0].name&&(await txt.text()).includes('Edited in Search.'),'Edit must share only the replacement TXT');
  const {readTranscriptFile}=await import('../js/combine.js');
  assert((await readTranscriptFile(txt)).memoraEdit?.target===txt.name,'Edited TXT must carry its intended filename');
  assert(!(await readTranscriptFile(txt)).memoraEdit.confirmed,'Share completion alone must not confirm the edit');
  const receiptStatus=document.getElementById('searchIndexStatus');
  const saved=new File([txt],txt.name,{lastModified:Date.now()});
  Object.defineProperty(saved,'webkitRelativePath',{value:`2018/${source.name}/${saved.name}`});
  selections.push({kind:'file-input',name:'2018',files:[saved]});
  receiptStatus.querySelector('.verify-files-button').click();
  await wait(()=>receiptStatus.textContent.includes('Verified')&&receiptStatus.textContent.includes('around the save attempt')&&!document.getElementById('searchButton').disabled);
  assert((await readTranscriptFile(saved)).memoraEdit.confirmed,'An exact verified replacement must be eligible for edited preference');
  const indexButton=document.getElementById('searchIndexUpdateButton');
  assert(indexButton.classList.contains('has-pending-index-update'),'Editing must leave a separate index save pending');
  indexButton.click();await wait(()=>shared.length===count+2&&!indexButton.disabled);
  const [index]=shared.at(-1);
  assert(shared.at(-1).length===1&&index.name==='search-embeddings.json','Index save must share only the JSON');
  assert(JSON.parse(await index.text()).files.includes('unselected.txt'),'The separate index must cover the entire folder');
  assert(!oldResult.isConnected&&document.getElementById('searchQueryInput').value==='match','Refresh must keep the query and rebuild the results');
 });
});
await test('iPhone Combine only offers Save and folder guidance for modified text',async()=>{
 document.querySelector('.search-use-combine-button').click();
 await wait(()=>!document.getElementById('combinePanel').hidden&&document.querySelector('#transcripts .combine-edit-toggle'));
 const edit=document.querySelector('#transcripts .combine-edit-toggle');
 edit.click();
 const panel=document.querySelector('#transcripts .combine-transcript-editor');
 const editor=panel.querySelector('textarea'),save=panel.querySelector('.combine-transcript-save-button');
 const hint=panel.querySelector('.settings-note'),cancelButton=panel.querySelector('.combine-transcript-secondary-button');
 assert(!panel.hidden&&!cancelButton.hidden&&save.hidden&&hint.hidden,'Clean Combine editor must only offer Cancel');
 const original=editor.value;
 editor.dispatchEvent(new Event('scroll'));
 assert(save.hidden&&hint.hidden,'Scrolling must not reveal Save');
 editor.value+=' Changed.';
 editor.dispatchEvent(new Event('input'));
 assert(!save.hidden&&!hint.hidden,'Changed transcript must show Save and the folder prompt');
 assert(hint.textContent.includes('2018 / transcription'),'Combine must use the Search source and its known parent');
 editor.value=original;
 editor.dispatchEvent(new Event('input'));
 assert(save.hidden&&hint.hidden,'Undoing all changes must hide Save and the folder hint again');
 cancelButton.click();
 edit.click();
 assert(!panel.hidden&&editor.value===original&&save.hidden&&hint.hidden,'Reopening after Cancel must begin clean');
 editor.value+=' Edited in Combine.';editor.dispatchEvent(new Event('input'));
 assert(hint.querySelector('strong.save-destination-path')?.textContent==='2018 / transcription');
 await withActiveShare(async()=>{
  const count=shared.length;
  save.click();await wait(()=>panel.hidden&&shared.length===count+1);
  const [txt]=shared.at(-1);
  assert(shared.at(-1).length===1&&(await txt.text()).includes('Edited in Combine.'),'Combine must share only the replacement TXT');
  const indexButton=document.getElementById('searchIndexUpdateButton');
  assert(indexButton.classList.contains('has-pending-index-update'),'Combine must keep the separate Search index update pending');
  indexButton.click();await wait(()=>shared.length===count+2&&!indexButton.disabled);
  const [index]=shared.at(-1);
  assert(shared.at(-1).length===1&&index.name==='search-embeddings.json');
  assert(JSON.parse(await index.text()).files.includes('unselected.txt'),'The separate index must include transcripts outside the Combine subset');
 });
});
await test('Desktop Search and Combine hide Save for clean text and use matching Cancel styles',async()=>{
 const {openSearchSource}=await import('../js/searchUI.js');
 click('searchTab');
 await wait(()=>!document.getElementById('searchSourceButton').disabled);
 sharedFolders.setTranscript(child,'Parent / transcription');
 await openSearchSource(child);
 const query=document.getElementById('searchQueryInput');
 query.value='existing';query.dispatchEvent(new Event('input'));
 click('searchButton');
 await wait(()=>!document.getElementById('searchButton').disabled&&document.querySelector('.search-transcript-edit-button'));
 document.querySelector('.search-transcript-edit-button').click();
 const searchPanel=document.querySelector('.search-transcript-editor-panel');
 assert(searchPanel.querySelector('.search-transcript-save-button').textContent==='Save and reindex','Search must use the native directory path');
 const searchMarkup=checkCleanEditor(searchPanel,'.search-transcript-save-button','.search-transcript-cancel-button');

 document.querySelector('.search-use-combine-button').click();
 await wait(()=>!document.getElementById('combinePanel').hidden&&document.querySelector('#transcripts .combine-edit-toggle'));
 document.querySelector('#transcripts .combine-edit-toggle').click();
 const combinePanel=document.querySelector('#transcripts .combine-transcript-editor');
 assert(combinePanel.querySelector('.combine-transcript-save-button').textContent==='Save changes','Combine must use the native directory path');
 const combineMarkup=checkCleanEditor(combinePanel,'.combine-transcript-save-button','.combine-transcript-secondary-button');

 const frame=document.createElement('iframe');
 const loaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
 frame.srcdoc=`<!doctype html><link rel="stylesheet" href="${new URL('../css/style.css',location.href)}">${searchMarkup}${combineMarkup}`;
 document.body.append(frame);await loaded;
 try{
  const style=selector=>frame.contentWindow.getComputedStyle(frame.contentDocument.querySelector(selector));
  const searchCancel=style('.search-transcript-cancel-button'),combineCancel=style('.combine-transcript-secondary-button');
  for(const property of ['background-color','color','border','border-radius','padding','font-size']){
   assert(searchCancel.getPropertyValue(property)===combineCancel.getPropertyValue(property),`Cancel styling differs for ${property}`);
  }
  assert(style('.search-transcript-save-button').display==='none'&&style('.combine-transcript-save-button').display==='none','Both clean Save buttons must be visually hidden');
 }finally{frame.remove();}

 const jsonBefore=await(await(await child.getFileHandle('search-embeddings.json')).getFile()).text();
 click('searchTab');
 await wait(()=>!document.getElementById('searchButton').disabled&&document.querySelector('.search-transcript-edit-button'));
 document.querySelector('.search-transcript-edit-button').click();
 const desktopEditor=document.querySelector('.search-transcript-editor-panel:not([hidden]) textarea');
 desktopEditor.value+=' Edited on desktop.';desktopEditor.dispatchEvent(new Event('input'));
 const initialShares=shared.length;
 document.querySelector('.search-transcript-editor-panel:not([hidden]) .search-transcript-save-button').click();
 await wait(()=>document.getElementById('searchIndexStatus').textContent.includes('may be in a different order'));
 assert(shared.length===initialShares&&await(await(await child.getFileHandle('search-embeddings.json')).getFile()).text()===jsonBefore,'Desktop edit must leave the JSON alone');
 const indexButton=document.getElementById('searchIndexUpdateButton');
 assert(indexButton.classList.contains('has-pending-index-update'),'Desktop must still prompt for the separate index update');
 indexButton.click();
 await wait(()=>document.getElementById('searchIndexStatus').textContent==='Search Index updated.');
 assert(await(await(await child.getFileHandle('search-embeddings.json')).getFile()).text()!==jsonBefore,'The index must write only after the separate button press');

 function checkCleanEditor(panel,saveSelector,cancelSelector){
  const editor=panel.querySelector('textarea'),save=panel.querySelector(saveSelector),cancelEdit=panel.querySelector(cancelSelector);
  const original=editor.value;
  assert(save.hidden&&!cancelEdit.hidden,'Clean editor must only offer Cancel');
  const markup=panel.outerHTML;
  editor.value+=' Changed.';editor.dispatchEvent(new Event('input'));
  assert(!save.hidden&&!cancelEdit.hidden,'Changing the text must show Save and keep Cancel visible');
  editor.value=original;editor.dispatchEvent(new Event('input'));
  assert(save.hidden&&!cancelEdit.hidden,'Undoing all changes must hide Save again');
  cancelEdit.click();
  return markup;
 }
});
await test('iPhone transcription starts without a selected destination and suggests the default child at save time',async()=>{
 const source={...phone,name:'Phone Without Destination'};
 selections.push(source);
 click('transcriptionTab');click('sourceButton');
 await choose('Discard pending transcripts');
 await wait(()=>!document.getElementById('sourceButton').disabled&&sharedFolders.snapshot().audio===source);
 assert(!sharedFolders.snapshot().transcript,'Fixture must have no destination');
 const before=calls.length;
 document.querySelector('#recordings .recording-checkbox').checked=true;
 click('transcribeButton');
 await wait(()=>calls.length>before&&!document.getElementById('iphoneExportButton').disabled);
 assert(document.getElementById('iphoneExportLocation').textContent.includes('Phone Without Destination / transcription'));
 assert(document.getElementById('iphoneExportFolderHelp').textContent.includes('Create'));
});
await test('iPhone can transcribe beside a mixed collection without adopting either archive identity',async()=>{
 const name='Phone Mixed Collections';
 const source={...phone,name,files:[...phone.files]};
 for(const [folder,filename,uuid] of [['transcription','one.txt',UUID],['transcription','two.txt',f.OTHER],['transcription - new','existing.txt',UUID]]){
  const file=new File([header(ID,uuid)],filename);
  Object.defineProperty(file,'webkitRelativePath',{value:`${name}/${folder}/${filename}`});
  source.files.push(file);
 }
 selections.push(source);click('sourceButton');await choose('Discard pending transcripts');
 await wait(()=>!document.getElementById('sourceButton').disabled&&sharedFolders.snapshot().audio===source);
 const destination=sharedFolders.snapshot().transcript.source;
 assert(destination.name==='transcription'&&destination.files.length===2,'Mixed folder must be the discovered default');
 const before=calls.length;
 document.querySelector('#recordings .recording-checkbox').checked=true;
 click('transcribeButton');
 await wait(()=>calls.length>before&&!document.getElementById('iphoneExportButton').disabled);
 assert(document.getElementById('iphoneExportLocation').textContent.includes(`${name} / transcription - new 2`),'The alternate must avoid existing sibling names');
 const shareCount=shared.length;click('iphoneExportButton');
 await wait(()=>shared.length===shareCount+1&&!document.getElementById('iphoneExportButton').disabled);
 const exported=readTranscriptIdentity(await shared.at(-1)[0].text());
 assert(exported.archiveUuid&&exported.archiveUuid!==UUID&&exported.archiveUuid!==f.OTHER,'The new TXT must carry a fresh archive identity');
 assert(destination.files.length===2,'The original folder snapshot must stay intact');
});
await test('Confirmed edit outranks the higher model while numbered copies and unedited ties follow existing rules',async()=>{
 const {replaceTranscriptBody}=await import('../js/transcriptMetadata.js');
 const {readTranscriptFiles,selectHighestModelRecords,getEditedTranscriptChoices}=await import('../js/combine.js');
 const high=new File([header().replace('Whisper model: tiny','Whisper model: large')],'large.txt');
 const otherHigh=new File([high],'later-large.txt',{lastModified:Date.now()+5000});
 const name='tiny.txt';
 const edited=replaceTranscriptBody(header(),'My edited words.',{filename:name,editedAt:new Date('2026-11-25T13:30:00Z')});
 const duplicate=new File([edited],'tiny 2.txt');
 const actual=new File([edited],name);
 const [large,later,numbered,tiny]=await readTranscriptFiles([high,otherHigh,duplicate,actual]);
 assert(selectHighestModelRecords([large,later,numbered])[0]===large,'Unverified numbered copy and a newer timestamp must not override normal selection');
 assert(selectHighestModelRecords([large,tiny])[0]===tiny,'A verified edit takes precedence even with a higher model');
 assert(getEditedTranscriptChoices([large,tiny],[tiny]).get(name)[0]===large,'The higher model must still be available for comparison');
 const {showTranscriptVersionChoices}=await import('../js/transcriptVersionUI.js');
 const choices=document.createElement('div');
 let selected;
 showTranscriptVersionChoices(choices,tiny,[large],version=>{selected=version;});
 assert(choices.textContent.includes('higher-model transcript'),'Warn explicitly about a higher model');
 choices.querySelector('details').open=true;
 const selector=choices.querySelector('select');
 selector.value='1';selector.dispatchEvent(new Event('change'));
 assert(choices.querySelector('pre').textContent===large.transcript,'The alternative must open with its full text');
 choices.querySelector('button').click();
 assert(selected===large,'Combine must be able to choose the alternate version for output');
 const resaved=replaceTranscriptBody(edited,'Another change.',{filename:name,editedAt:new Date('2026-11-25T14:00:00Z')});
 assert((resaved.match(/Memora edited at:/g)||[]).length===1,'Saving again must replace the edit marker');
 assert(readTranscriptIdentity(resaved).archiveUuid===UUID,'Edit metadata must keep the archive identity');
});
await test('Verification distinguishes numbered copies, mismatched contents and timestamps',async()=>{
 const {checkFileSave}=await import('../js/fileSaveVerification.js');
 const time=Date.now(),source={name:'transcription',parentAudioName:'2022'};
 const file=new File(['new'],'edit.txt',{lastModified:time});
 const receipt={source,file,startedAt:time-1000,returnedAt:time};
 const old=new File(['old'],'edit.txt',{lastModified:time});
 const duplicate=new File(['new'],'edit 2.txt',{lastModified:time});
 Object.defineProperty(duplicate,'webkitRelativePath',{value:'2022/transcription/edit 2.txt'});
 const wrong=await checkFileSave({name:'transcription',files:[old]},receipt);
 assert(wrong.recent&&!wrong.exact,'A recent timestamp alone must not verify the file');
 const copy=await checkFileSave({name:'2022',files:[duplicate]},receipt);
 assert(copy.duplicate===duplicate&&!copy.exact,'A numbered copy must be identified separately');
 const exact=await checkFileSave({name:'transcription',files:[file]},receipt);
 assert(exact.exact===file&&exact.recent);
});
await test('Removing the last indexed transcript leaves an index update with a deletion reason',async()=>{
 const {buildSearchIndex,compareSearchArchive}=await import('../js/search.js?verify-archive-removals');
 const archive={transcripts:[{filename:'deleted.txt',transcriptHash:'old'}]};
 const empty=await buildSearchIndex([],null,archive,{activate:false});
 assert(empty.archiveNeedsUpdate&&empty.archiveChanges.removed===1,'A deletion alone must mark the archive stale');
 const kept={filename:'kept.txt',transcriptHash:'same'};
 const changes=compareSearchArchive([kept],[kept],{transcripts:[kept,...archive.transcripts]});
 assert(changes.removed===1&&changes.added===0&&changes.changed===0,'Remaining valid entries must not hide a deletion');
 assert(compareSearchArchive([kept],[kept],archive,false).removed===0,'An incomplete selection must not be reported as a deletion');
});
await test('Combine Use once survives cancellation and an explicit default appears in removable Settings',async()=>{
 const {getSelectedTranscriptFiles}=await import('../js/combineUI.js');
 const {readTranscriptFiles,selectHighestModelRecords}=await import('../js/combine.js');
 const {listTranscriptPreferences,observeTranscriptPreferences}=await import('../js/transcriptPreferences.js');
 const high=new File([header().replace('Whisper model: tiny','Whisper model: large').replace('This is an existing transcript.','High model text.')],'higher.txt');
 const low=new File([header().replace('This is an existing transcript.','Explicit alternative text.')],'alternative.txt');
 const source={kind:'file-input',name:'Preference Test',selectionScope:'folder',files:[high,low]};
 sharedFolders.setTranscript(source,'Preference Test');
 click('combineTab');
 await wait(()=>document.querySelector('#transcripts .transcript-version-preview')&&!document.getElementById('textSourceButton').disabled);
 const openChoice=()=>{
  const details=document.querySelector('#transcripts details:has(.transcript-version-preview)');
  details.open=true;
  const selector=details.querySelector('select');
  selector.value=[...selector.options].find(option=>option.textContent.startsWith(low.name)).value;
  selector.dispatchEvent(new Event('change'));
  return details;
 };
 const findButton=(details,text)=>[...details.querySelectorAll('button')].find(button=>button.textContent===text);
 assert(listTranscriptPreferences().length===0,'Automatic choices must not populate Settings');
 findButton(openChoice(),'Use once').click();
 assert(getSelectedTranscriptFiles().length===1&&getSelectedTranscriptFiles()[0]===low);
 await withActiveShare(async()=>{
  const count=shared.length,button=document.getElementById('iphoneCombineExportButton');
  const status=document.getElementById('iphoneCombineExportStatus');
  cancel=true;button.click();await wait(()=>!button.disabled&&status.textContent.includes('Save canceled'));
  assert(getSelectedTranscriptFiles().length===1&&getSelectedTranscriptFiles()[0]===low,'Cancel must preserve the one-time choice');
  cancel=false;button.click();await wait(()=>shared.length===count+1&&!button.disabled);
  assert((await shared.at(-1)[0].text()).includes('Explicit alternative text.'),'Export must use the selected alternative');
  assert(getSelectedTranscriptFiles().length===2,'Successful export must consume the override');
 });
 const records=await readTranscriptFiles(source.files);
 assert(selectHighestModelRecords(records)[0].filename===high.name,'Automatic default must still prefer the higher model');
 findButton(openChoice(),'Make default').click();
 assert(listTranscriptPreferences().length===1&&selectHighestModelRecords(records)[0].filename===low.name,'An explicit default must override automatic ranking');
 click('searchTab');
 await wait(()=>!document.getElementById('searchButton').disabled);
 const query=document.getElementById('searchQueryInput');
 query.value='compare';query.dispatchEvent(new Event('input'));
 click('searchButton');
 await wait(()=>document.querySelector('.search-result-file-name')?.textContent===low.name);
 observeTranscriptPreferences([records[0]]);
 assert(listTranscriptPreferences()[0].available===false&&selectHighestModelRecords([records[0]])[0].filename===high.name,'A missing default must fall back automatically');
 click('settingsButton');
 await wait(()=>document.querySelector('[data-settings-action="toggle-transcript-preferences"]'));
 document.querySelector('[data-settings-action="toggle-transcript-preferences"]').click();
 const settings=document.getElementById('settingsTranscriptPreferences');
 assert(settings.textContent.includes(low.name)&&settings.textContent.includes('Unavailable'),'Settings must identify the missing preferred filename');
 settings.querySelector('button').click();
 assert(listTranscriptPreferences().length===0&&selectHighestModelRecords(records)[0].filename===high.name,'Removing the preference must restore the automatic rule');
 await wait(()=>document.querySelector('.search-result-file-name')?.textContent===high.name);
 assert(source.files[0]===high&&source.files[1]===low,'Preferences must leave original files alone');
});
const result={viewport:window.innerWidth,passed:lines.length-failed.length,failed,output:lines.join('\n')};const out=document.createElement('pre');out.textContent=result.output;document.body.prepend(out);if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify(result)});
