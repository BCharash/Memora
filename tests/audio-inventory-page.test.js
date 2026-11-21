import {directory,seedAudio} from './transcription-identity-fixtures.js';
import * as f from './recording-identity-fixtures.js';
const assert=(v,m='Assertion failed')=>{if(!v)throw Error(m);},lines=[],failed=[];
async function wait(check){const end=Date.now()+7000;while(!check()){if(Date.now()>end)throw Error('Timed out; '+document.getElementById('status').textContent);await new Promise(r=>setTimeout(r,10));}}
async function test(name,work){try{await work();lines.push('PASS '+name);}catch(e){failed.push(name);lines.push('FAIL '+name+': '+e.stack);}}
const root=directory('Apple archive');await seedAudio(root.root,'memo.wav',f.ID);
const text=JSON.stringify({schemaVersion:1,audioSourceId:f.OTHER,recordings:[{audioRelativePath:'memo.wav',recordingId:f.ID,identityOrigin:'imuse-embedded'}]});
const writer=await(await root.root.getFileHandle('memora-audio-source.json',{create:true})).createWritable();await writer.write(text);await writer.close();const before=root.state.jsonWrites;
const parsed=new DOMParser().parseFromString(await(await fetch('../audio-inventory-test.html')).text(),'text/html');parsed.querySelectorAll('script').forEach(s=>s.remove());document.body.replaceChildren(...parsed.body.childNodes);
window.showDirectoryPicker=async options=>{assert(options.mode==='read','Requested writable permission');return root.root;};let shared;
Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{shared=data;}});
await import('../js/audioInventoryTest.js');
await test('Standalone native page inventories audio without reading or rewriting JSON',async()=>{document.getElementById('choose').click();await wait(()=>!document.getElementById('choose').disabled);assert(document.getElementById('report').textContent.includes('Embedded IDs: 1'));assert(!document.getElementById('report').textContent.includes('List comparison'));assert(root.state.jsonWrites===before);assert(document.getElementById('busy').hidden);});
await test('Standalone report shares a named text file without JSON or extra text attachments',async()=>{document.getElementById('save').click();await wait(()=>shared);assert(Object.keys(shared).join()==='files'&&shared.files.length===1&&shared.files[0].name==='memora-audio-inventory-report.txt');assert((await shared.files[0].text()).includes('Embedded IDs: 1'));});
await test('Standalone iPhone folder path reconstructs without JSON and excludes nested audio',async()=>{
 window.showDirectoryPicker=undefined;
 const audio=await(await root.root.getFileHandle('memo.wav')).getFile();Object.defineProperty(audio,'webkitRelativePath',{value:'Phone/memo.wav'});
 const nested=new File(['unsupported'],'nested.mp3');Object.defineProperty(nested,'webkitRelativePath',{value:'Phone/subfolder/nested.mp3'});
 const input=document.getElementById('input');input.click=()=>{Object.defineProperty(input,'files',{configurable:true,value:[audio,nested]});input.dispatchEvent(new Event('change'));};
 document.getElementById('choose').click();await wait(()=>!document.getElementById('choose').disabled);const report=document.getElementById('report').textContent;assert(report.includes('Folder: Phone')&&report.includes('Audio files: 1')&&report.includes('Inventory complete without identity issues: true'));assert(root.state.jsonWrites===before);
});
const result={passed:lines.length-failed.length,failed,output:lines.join('\n')};document.body.prepend(Object.assign(document.createElement('pre'),{textContent:result.output}));if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify(result)});
