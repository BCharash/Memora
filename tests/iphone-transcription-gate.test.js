import {selections,calls} from './transcription-identity-fixtures.js';
import * as f from './recording-identity-fixtures.js';
window.showDirectoryPicker=undefined;
const lines=[],failed=[];
const assert=(value,message)=>{if(!value)throw Error(message||'Assertion failed');};
async function wait(check){const until=Date.now()+7000;while(!check()){if(Date.now()>until)throw Error('Timed out: '+check+'; '+document.querySelector('dialog[open]')?.textContent);await new Promise(r=>setTimeout(r,15));}}
async function test(name,work){try{await work();lines.push('PASS '+name);}catch(error){failed.push(name);lines.push('FAIL '+name+': '+error.stack);}if(location.search.includes('report=1'))await fetch('/_identity-test-progress',{method:'POST',body:lines.at(-1)});}
const click=id=>document.getElementById(id).click();
let shares=0;
Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{shares++;}});
const audio=new File([f.wav([f.wavChunk('imID',f.payload(f.ID))])],'memo.wav',{lastModified:123});
Object.defineProperty(audio,'webkitRelativePath',{value:'Phone/memo.wav'});
const txt=new File([`memo.wav\nRecording ID: ${f.ID}\nArchive UUID: ${f.OTHER}\nWhisper model: tiny\nOperation: transcribe\n--------------------------------------------------\n\nExisting text.\n`],'memo.txt');
Object.defineProperty(txt,'webkitRelativePath',{value:'Phone/transcription/memo.txt'});
await test('iPhone Combine selection discovers transcription without preparing Transcribe rows',async()=>{
 const parsed=new DOMParser().parseFromString(await(await fetch('../index.html')).text(),'text/html');parsed.querySelectorAll('script').forEach(s=>s.remove());document.body.replaceChildren(...parsed.body.childNodes);await import('../js/app.js');await wait(()=>document.getElementById('modelSelect').value==='tiny');
 click('combineTab');selections.push({kind:'file-input',name:'Phone',selectionScope:'folder',files:[audio,txt]});document.querySelector('#combinePanel [data-select-audio]').click();
 await wait(()=>!document.getElementById('sourceButton').disabled&&document.querySelector('#transcripts .recording-checkbox'));
 assert(!document.querySelector('#recordings .recording-checkbox'),'Transcribe rows eagerly prepared');
});
await test('Saving the audio list from Combine must not enable hidden Transcribe',async()=>{
 const button=[...document.querySelectorAll('#combinePanel .shared-folder-note button')].find(b=>b.textContent==='Save Audio Recording List');await wait(()=>button&&!button.hidden);button.click();await wait(()=>shares===1&&!button.disabled);
 click('transcriptionTab');assert(!document.getElementById('enableTranscriptionButton').hidden,'Hidden forwarded save click incorrectly enabled transcription');assert(document.getElementById('transcriptionWorkspace').hidden,'Unused Transcribe was exposed');
});
await test('Enable Transcription lists the shared iPhone recordings unchecked without inference',async()=>{
 click('enableTranscriptionButton');await wait(()=>document.querySelector('#recordings .recording-checkbox')&&!document.getElementById('sourceButton').disabled);assert(!document.getElementById('transcriptionWorkspace').hidden);assert([...document.querySelectorAll('#recordings .recording-checkbox')].every(box=>!box.checked));assert(calls.length===0,'Automatic inference');click('combineTab');click('transcriptionTab');assert(document.getElementById('enableTranscriptionButton').hidden,'Explicit enable was not retained');
});
const result={passed:lines.length-failed.length,failed,output:lines.join('\n')};document.body.prepend(Object.assign(document.createElement('pre'),{textContent:result.output}));if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify(result)});
