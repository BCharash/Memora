// Standalone checkpoint page only; never imported by the production app.
import {inspectAudioInventory} from './audioInventory.js';
import {listAudioFiles} from './storage.js';
const choose=document.getElementById('choose'),save=document.getElementById('save'),input=document.getElementById('input');
const status=document.getElementById('status'),report=document.getElementById('report'),busy=document.getElementById('busy');
let text='';
async function pick(){
 if(window.showDirectoryPicker)return window.showDirectoryPicker({mode:'read'});
 return new Promise((resolve,reject)=>{
  input.value='';input.oncancel=()=>reject(new DOMException('Cancelled','AbortError'));
  input.onchange=()=>{const files=Array.from(input.files||[]);if(!files.length)return reject(new Error('No files supplied.'));resolve({kind:'file-input',selectionScope:'folder',name:files[0].webkitRelativePath.split('/')[0],files});};input.click();
 });
}
choose.onclick=async()=>{
 choose.disabled=save.disabled=true;busy.hidden=false;report.textContent='';text='';status.textContent='Waiting for folder selection or iCloud availability…';
 try{
  const source=await pick(),began=performance.now();status.textContent='Listing audio files…';
  const files=await listAudioFiles(source),enumerationMs=Math.round(performance.now()-began);
  const result=await inspectAudioInventory(files,{complete:source.kind==='directory'||source.selectionScope==='folder',
   onProgress:p=>{status.textContent=`Checking ${p.checked+1} of ${p.total}: ${p.filename}`;}});
  text=`Memora audio inventory report\n${new Date().toISOString()}\nFolder: ${source.name}\nBrowser: ${navigator.userAgent}\nAudio files: ${files.length}\nEmbedded IDs: ${result.counts.embedded}\nReproducible IDs: ${result.counts.reproducible}\nUnresolved: ${result.counts.unresolved}\nEnumeration: ${enumerationMs} ms\nIdentity inspection: ${result.stats.elapsedMs} ms\nRequested audio bytes: ${result.stats.bytesRequested} in ${result.stats.readRequests} reads (provider downloads may differ)\nInventory complete without identity issues: ${result.complete}\nNo files or caches were written.\n\nDetails:\n${JSON.stringify(result,null,2)}`;
  report.textContent=text;status.textContent=result.usable?'Inventory complete.':'Inventory complete; review unresolved or ambiguous recordings.';save.disabled=false;
 }catch(error){status.textContent=error.name==='AbortError'?'Selection cancelled.':error.message;}
 finally{choose.disabled=false;busy.hidden=true;input.value='';}
};
save.onclick=async()=>{
 const file=new File([text],'memora-audio-inventory-report.txt',{type:'text/plain'});
 try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});status.textContent=`Shared. Check in Files for ${file.name} in the folder you chose.`;return;}
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status.textContent=`Download requested for ${file.name}. Check Files or your browser downloads.`;
 }catch(error){status.textContent=error.name==='AbortError'?'Sharing canceled. The report is still available.':error.message;}
};
