import {calls} from './transcription-identity-fixtures.js';
import * as f from './recording-identity-fixtures.js';
window.showDirectoryPicker=undefined;
const lines=[],failed=[];
const assert=(value,message)=>{if(!value)throw Error(message||'Assertion failed');};
async function wait(check){const until=Date.now()+7000;while(!check()){if(Date.now()>until)throw Error('Timed out: '+check+'; '+document.querySelector('dialog[open]')?.textContent);await new Promise(r=>setTimeout(r,15));}}
async function test(name,work){try{await work();lines.push('PASS '+name);}catch(error){failed.push(name);lines.push('FAIL '+name+': '+error.stack);}if(location.search.includes('report=1'))await fetch('/_identity-test-progress',{method:'POST',body:lines.at(-1)});}
const click=id=>document.getElementById(id).click();
function pickFiles(files){const input=document.getElementById('folderInput');input.click=()=>{Object.defineProperty(input,'files',{configurable:true,value:files});input.dispatchEvent(new Event('change',{bubbles:true}));};}
let shares=0;
Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{shares++;}});
const audio=new File([f.wav([f.wavChunk('imID',f.payload(f.ID))])],'memo.wav',{lastModified:123});
Object.defineProperty(audio,'webkitRelativePath',{value:'Phone/memo.wav'});
const txt=new File([`memo.wav\nRecording ID: ${f.ID}\nArchive UUID: ${f.OTHER}\nWhisper model: tiny\nOperation: transcribe\n--------------------------------------------------\n\nExisting text.\n`],'memo.txt');
Object.defineProperty(txt,'webkitRelativePath',{value:'Phone/transcription/memo.txt'});
await test('iPhone actual folder-input boot keeps untouched Transcribe available',async()=>{
 const parsed=new DOMParser().parseFromString(await(await fetch('../index.html')).text(),'text/html');parsed.querySelectorAll('script').forEach(s=>s.remove());document.body.replaceChildren(...parsed.body.childNodes);await import('../js/app.js');await wait(()=>document.getElementById('modelSelect').value==='tiny');
});
await test('iPhone audio-only source returns to visible Transcribe and lists its shared recordings',async()=>{
 click('combineTab');pickFiles([audio]);document.querySelector('#combinePanel [data-select-audio]').click();
 await wait(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('[data-audio-folder]').textContent==='Phone');
 click('transcriptionTab');assert(document.getElementById('enableTranscriptionButton').hidden,'No transcript folder must leave setup visible');
 await wait(()=>document.querySelector('#recordings .recording-checkbox')&&!document.getElementById('sourceButton').disabled);
 assert([...document.querySelectorAll('#recordings .recording-checkbox')].every(box=>!box.checked));assert(calls.length===0);
});
await test('iPhone Combine selection discovers transcription without preparing Transcribe rows',async()=>{
 click('combineTab');let release,paused=false;
 const originalSlice=audio.slice.bind(audio);audio.slice=(...args)=>{const blob=originalSlice(...args);if(!paused){paused=true;const read=blob.arrayBuffer.bind(blob);blob.arrayBuffer=()=>new Promise(resolve=>{release=async()=>resolve(await read());});}return blob;};
 pickFiles([audio,txt]);document.querySelector('#combinePanel [data-select-audio]').click();
 await wait(()=>release);click('transcriptionTab');assert(document.getElementById('enableTranscriptionButton').hidden,'Previous audio-only source must remain unguarded before discovery');await release();
 await wait(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('[data-transcript-folder]').textContent.includes('Phone / transcription'));
 assert(!document.getElementById('enableTranscriptionButton').hidden&&document.getElementById('transcriptionWorkspace').hidden,'Finishing delayed discovery must refresh the gate without another tab click');
 click('combineTab');await wait(()=>document.querySelector('#transcripts .recording-checkbox'));
 assert(!document.querySelector('#recordings .recording-checkbox'),'Transcribe rows eagerly prepared');
});
await test('Combine has no audio JSON save controls or hidden save clicks and preserves the transcription gate',async()=>{
 click('combineTab');assert(!document.getElementById('saveRecordingListButton')&&!document.querySelector('#combinePanel .shared-folder-note button'));assert(shares===0&&!document.querySelector('dialog[open]'));
 click('transcriptionTab');assert(!document.getElementById('enableTranscriptionButton').hidden&&document.getElementById('transcriptionWorkspace').hidden);
});
await test('Enable Transcription lists the shared iPhone recordings unchecked without inference',async()=>{
 click('enableTranscriptionButton');await wait(()=>document.querySelector('#recordings .recording-checkbox')&&!document.getElementById('sourceButton').disabled);assert(!document.getElementById('transcriptionWorkspace').hidden);assert([...document.querySelectorAll('#recordings .recording-checkbox')].every(box=>!box.checked));assert(calls.length===0,'Automatic inference');click('combineTab');click('transcriptionTab');assert(document.getElementById('enableTranscriptionButton').hidden,'Explicit enable was not retained');
});
const result={passed:lines.length-failed.length,failed,output:lines.join('\n')};document.body.prepend(Object.assign(document.createElement('pre'),{textContent:result.output}));if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify(result)});
