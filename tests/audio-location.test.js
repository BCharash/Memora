import {openAudioFolderInventory} from '../js/audioFolderCache.js';
import {sharedFolders} from '../js/sharedFolderSelection.js';
import * as fixtures from './recording-identity-fixtures.js';
import {createReproducibleRecordingIdentityResolver} from '../js/reproducibleRecordingIdentity.js';
const source=await(await fetch('../js/searchUI.js')).text();
async function controlModule(ios){
 const modified=source.replace('import { isIOS } from "./runtime.js";',`const isIOS=${ios};`).replace(/from (["'])\.\/([^"'\n]+)\1/g,(_,quote,path)=>`from ${JSON.stringify(new URL('../js/'+path,import.meta.url).href)}`);
 const url=URL.createObjectURL(new Blob([modified],{type:'text/javascript'}));try{return await import(url);}finally{URL.revokeObjectURL(url);}
}
const ios=await controlModule(true),desktop=await controlModule(false);
const ID=fixtures.ID,OTHER=fixtures.OTHER,SOURCE='15d91f9a-735e-4d73-a6b6-427140869795',ARCHIVE='9599e552-b194-4511-8865-b37a07413a38';
const lines=[],failed=[],assert=(value,message='Assertion failed')=>{if(!value)throw Error(message);};
async function waitFor(check){const end=Date.now()+5000;while(!check()){if(Date.now()>end)throw Error('Timed out: '+check);await new Promise(resolve=>setTimeout(resolve,10));}}
async function test(name,action){try{await action();lines.push('PASS '+name);}catch(error){failed.push(name);lines.push('FAIL '+name+': '+error.stack);}}
const audio=(name,id)=>new File([fixtures.wav(id?[fixtures.wavChunk('imID',fixtures.payload(id))]:[])],name);
const record=(year,id=ID,sourceId=SOURCE)=>({recordingFilename:'memo.wav',audioRelativePath:'../memo.wav',recordingId:id,audioSourceId:sourceId,archiveUuid:ARCHIVE,originalAudioFolderName:year});
let pickerOpens=0,plays=0;
function mount(module,metadata,handle={kind:'file-input',name:'transcription',files:[]},archiveName=null){
 const section=document.createElement('section');document.getElementById('fixture').append(section);module.appendSearchAudioControl(section,{record:metadata,archiveName},handle);
 const control=section.querySelector('.search-result-audio-control'),input=control.querySelector('input'),button=control.querySelector('button'),player=control.querySelector('audio'),note=control.querySelector('.search-audio-location-note'),error=control.querySelector('.search-audio-error');
 input.click=()=>{assert(!note.hidden,'Picker covered hidden guidance');pickerOpens++;};
 return{section,control,input,button,player,note,error,async choose(files){Object.defineProperty(input,'files',{configurable:true,value:files});input.dispatchEvent(new Event('change'));await new Promise(resolve=>setTimeout(resolve,20));}};
}
const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=async()=>{plays++;};
try{
 await test('Shared guidance names the archive, original audio folder and requested basename without inventing a full Files path',()=>{
  const text=ios.audioLocationGuidance(record('2016'),'Dreams 2016');assert(text.includes('Archive “Dreams 2016”')&&text.includes('audio folder “2016”')&&text.includes('“memo.wav”'));assert(!text.includes('../memo.wav'));const fallback=ios.audioLocationGuidance({audioRelativePath:'../recording.m4a'});assert(fallback.includes('recording.m4a')&&!fallback.includes('undefined'));
 });
 let first;
 await test('iPhone guidance appears above playback before the native picker and fits a narrow result',async()=>{
  first=mount(ios,record('2016'),undefined,'Dreams 2016');first.section.style.width='240px';assert(first.note.hidden,'Audio guidance must start hidden');assert(first.note.compareDocumentPosition(first.button)&Node.DOCUMENT_POSITION_FOLLOWING);assert(first.control.scrollWidth<=first.control.clientWidth+1,'Hint overflows phone width');const before=pickerOpens;first.button.click();await waitFor(()=>!first.button.disabled);assert(pickerOpens===before+1);assert(first.input.getAttribute('aria-label').includes('2016'));first.input.dispatchEvent(new Event('cancel'));assert(first.player.hidden&&!first.note.hidden);
 });
 await test('A missing recording repeats the correct folder/filename guidance and preserves batch reuse',async()=>{
  const before=plays;await first.choose([audio('other.wav',OTHER)]);await waitFor(()=>!first.error.hidden);assert(first.error.textContent.includes('2016')&&first.error.textContent.includes('memo.wav'));assert(first.player.hidden&&plays===before);
  const batch=mount(ios,{...record('2016',OTHER),recordingFilename:'other.wav',audioRelativePath:'../other.wav'});const opened=pickerOpens;batch.button.click();await waitFor(()=>!batch.player.hidden);assert(pickerOpens===opened,'Selected batch was not reused');
 });
 await test('Matching embedded IDs load normally and session reuse avoids another picker',async()=>{
  const file=audio('memo.wav',ID);file.arrayBuffer=()=>{throw Error('Whole audio read requested');};await first.choose([file]);await waitFor(()=>!first.player.hidden);assert(first.note.hidden&&first.button.hidden);const repeated=mount(ios,record('2016'));assert(repeated.note.hidden,'Cached audio should not need Files guidance');const before=pickerOpens;repeated.button.click();await waitFor(()=>!repeated.player.hidden);assert(pickerOpens===before&&repeated.note.hidden);
 });
 await test('Another archive with the same filename gets its own guidance and cannot borrow cached audio',async()=>{
  const second=mount(ios,record('2017',OTHER,'aaaaaaaa-1111-4111-8111-111111111111'),undefined,'Dreams 2017'),before=pickerOpens;second.button.click();await waitFor(()=>!second.button.disabled);assert(pickerOpens===before+1&&second.note.textContent.includes('2017'));await second.choose([audio('memo.wav',ID)]);await waitFor(()=>!second.error.hidden);assert(second.player.hidden&&second.error.textContent.includes('different recording')&&second.error.textContent.includes('2017'));await second.choose([audio('memo.wav',ID),audio('memo.wav',OTHER)]);await waitFor(()=>!second.player.hidden);
 });
 await test('Conflicting embedded metadata is rejected, while absent and unsupported-container IDs preserve legacy playback',async()=>{
  const item=mount(ios,record('2018',ID,'bbbbbbbb-1111-4111-8111-111111111111'));const bad=new File([fixtures.wav([fixtures.wavChunk('imID',fixtures.payload(ID)),fixtures.wavChunk('imID',fixtures.payload(OTHER))])],'memo.wav');await item.choose([bad]);await waitFor(()=>!item.error.hidden);assert(item.player.hidden&&item.error.textContent.includes('could not be verified'));
  await item.choose([audio('memo.wav',null)]);await waitFor(()=>!item.player.hidden);
  const mp3=mount(ios,{...record('2019'),recordingFilename:'memo.mp3',audioRelativePath:'memo.mp3',audioSourceId:'cccccccc-1111-4111-8111-111111111111'});await mp3.choose([new File(['synthetic unsupported-container bytes'],'memo.mp3')]);await waitFor(()=>!mp3.player.hidden);
 });
 await test('Unidentified legacy results do not share filename cache across different selected sources',async()=>{
  const metadata={recordingFilename:'legacy.wav',originalAudioFolderName:'Older recordings'};const one=mount(ios,metadata,{kind:'file-input',files:[]}),two=mount(ios,metadata,{kind:'file-input',files:[]});await one.choose([audio('legacy.wav',null)]);await waitFor(()=>!one.player.hidden);const before=pickerOpens;two.button.click();await waitFor(()=>!two.button.disabled);assert(two.player.hidden&&pickerOpens===before+1);
 });
 await test('Desktop fallback folder requests identify the archive/source and reuse only that scoped folder',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(window,'showDirectoryPicker');let folders=0;const chosen={kind:'directory',name:'2020',async getFileHandle(){return{getFile:async()=>audio('memo.wav',ID)};},async *entries(){}};
  Object.defineProperty(window,'showDirectoryPicker',{configurable:true,value:async()=>{folders++;return chosen;}});
  const transcription={kind:'directory',async getFileHandle(){throw new DOMException('Missing','NotFoundError');},async *entries(){}};
  try{const item=mount(desktop,record('2020',ID,'dddddddd-1111-4111-8111-111111111111'),transcription,'Dreams 2020');item.button.click();await waitFor(()=>!item.player.hidden);assert(folders===1);assert(item.note.textContent.includes('Dreams 2020')&&item.note.textContent.includes('2020'));const again=mount(desktop,record('2020',ID,'dddddddd-1111-4111-8111-111111111111'),transcription);again.button.click();await waitFor(()=>!again.player.hidden);assert(folders===1);}finally{if(descriptor)Object.defineProperty(window,'showDirectoryPicker',descriptor);else delete window.showDirectoryPicker;}
 });
 await test('Declared sampled IDs verify actual audio and reject a wrong prefix',async()=>{
  const file=audio('sample.wav'),identity=await createReproducibleRecordingIdentityResolver().resolve(file),metadata={...record('Sample',identity.recordingId),recordingFilename:'sample.wav',audioRelativePath:'../sample.wav',archiveUuid:crypto.randomUUID(),recordingIdentityMethod:identity.method};const item=mount(ios,metadata);item.button.click();const wrong=new File([fixtures.wav([fixtures.wavChunk('JUNK',new Uint8Array([99]))])],'sample.wav');await item.choose([wrong]);assert(item.player.hidden,'Wrong sampled audio loaded');await item.choose([file]);await waitFor(()=>!item.player.hidden);
 });
 await test('Changing only retired Audio Source ID does not invalidate playback cache',async()=>{
  const archiveUuid=crypto.randomUUID(),metadata={...record('Rebuilt'),archiveUuid},first=mount(ios,metadata);first.button.click();await first.choose([audio('memo.wav',ID)]);await waitFor(()=>!first.player.hidden);const before=pickerOpens,second=mount(ios,{...metadata,audioSourceId:OTHER});second.button.click();await waitFor(()=>!second.player.hidden);assert(pickerOpens===before,'Source UUID alone forced another picker');
 });
 await test('Current inventory producer connects to shared automatic audio lookup on iPhone and desktop',async()=>{
  const selectedAudio=audio('renamed.wav',ID),root={kind:'file-input',name:'Shared Audio',selectionScope:'folder',files:[selectedAudio]};
  const session=await openAudioFolderInventory(root,[selectedAudio],{store:{async list(){return [];},async put(){}}});
  sharedFolders.setAudio(root,[],[selectedAudio],session.getInventory());assert(sharedFolders.resolveAudio(record('Shared Audio'))===selectedAudio);
  const picker=window.showDirectoryPicker;window.showDirectoryPicker=async()=>{throw Error('Unexpected audio folder picker');};
  try{for(const module of [ios,desktop]){const before=pickerOpens,handle={kind:'directory',name:'transcription',async getFileHandle(){throw Error('Transcript folder should not be searched');}},control=mount(module,record('Shared Audio'),handle);control.button.click();await waitFor(()=>!control.player.hidden);assert(pickerOpens===before,'Automatic lookup opened another picker');assert(control.player.src.startsWith('blob:'),'Shared recording was not loaded');assert(!control.section.querySelector('.search-audio-error').textContent.includes('filter'),'Inventory contract mismatch');}}finally{window.showDirectoryPicker=picker;}
 });
}finally{HTMLMediaElement.prototype.play=play;for(const element of document.querySelectorAll('audio[data-object-url]'))URL.revokeObjectURL(element.dataset.objectUrl);}
document.getElementById('results').textContent=lines.join('\n')+`\n${lines.length-failed.length}/${lines.length} groups passed`;document.body.dataset.result=failed.length?'failed':'passed';
if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify({passed:lines.length-failed.length,failed,output:document.getElementById('results').textContent})});
