// Standalone test.html only. No production UI, persistence or model imports.
import {createArchiveFolderAccess} from '../js/archiveFolderAccess.js';
const $=id=>document.getElementById(id);
let adapter=null,folders=[],chosen=null,token=0,url=null,loadedPath=null;
function log(message){window.dispatchEvent(new CustomEvent('archive-test-check',{detail:message}));}
function release(){const player=$('linkedPlayer');player.pause();player.removeAttribute('src');player.load();if(url)URL.revokeObjectURL(url);url=null;loadedPath=null;}
function fill(select,items,label){select.replaceChildren();items.forEach((item,i)=>{const option=document.createElement('option');option.value=i;option.textContent=label(item);select.append(option);});select.disabled=!items.length;}
function showFolder(){
 token++;release();chosen=folders[Number($('transcriptFolder').value)]||null;
 fill($('linkedTranscript'),chosen?.transcripts||[],entry=>entry.file.name);
 $('resolveAudio').disabled=!chosen?.transcripts.length;$('transcriptPreview').textContent='Select a transcript, then tap Find Linked Audio.';
 $('linkStatus').textContent=chosen?`${chosen.transcripts.length} recognizable transcript(s). ${chosen.hasTranscriptList?'Transcript list supplied.':'No transcript list supplied; headers used for discovery.'}`:'No eligible immediate transcript subfolders found.';
 if(chosen?.issues.length)$('linkStatus').textContent+='\n'+chosen.issues.map(i=>`${i.path}: ${i.error}`).join('\n');
 if(chosen)log(`Transcript folder chosen: ${chosen.name}; ${chosen.transcripts.length} recognizable transcripts; ${chosen.issues.length} issue(s).`);
}
window.addEventListener('archive-test-selection',async event=>{
 const request=++token;release();adapter=null;folders=[];chosen=null;$('resolveAudio').disabled=true;
 fill($('transcriptFolder'),[],()=> '');fill($('linkedTranscript'),[],()=> '');$('linkStatus').textContent='Discovering immediate transcript subfolders…';$('transcriptPreview').textContent='';
 try{
  const next=createArchiveFolderAccess(event.detail);const result=await next.discover(message=>{if(request===token)$('linkStatus').textContent=message;});
  if(request!==token)return;adapter=next;folders=result;fill($('transcriptFolder'),folders,g=>`${g.name} (${g.transcripts.length} transcripts)`);
  if(folders.length===1)showFolder();else if(folders.length){$('transcriptFolder').selectedIndex=-1;$('linkStatus').textContent='Choose one transcript subfolder. Its contents remain separate from the other folders.';}else showFolder();
  log(`Discovery: ${folders.map(f=>`${f.name}: ${f.transcripts.length}`).join('; ')||'no eligible immediate folders'}.`);
 }catch(error){if(request===token){$('linkStatus').textContent=error.message;log(`Discovery failed: ${error.message}`);}}
});
$('transcriptFolder').onchange=showFolder;
$('linkedTranscript').onchange=()=>{token++;release();$('transcriptPreview').textContent='';$('linkStatus').textContent='Tap Find Linked Audio for this transcript.';$('resolveAudio').disabled=false;};
$('resolveAudio').onclick=async()=>{
 const entry=chosen?.transcripts[Number($('linkedTranscript').value)],current=adapter,request=++token;if(!entry||!current)return;release();$('resolveAudio').disabled=true;$('linkStatus').textContent='Reading transcript and locating audio…';
 try{
  const text=await current.preview(entry);if(request!==token)return;$('transcriptPreview').textContent=text;
  if(chosen.issues.some(i=>i.error.startsWith('Mixed Archive UUIDs')))throw Error('Mixed Archive UUIDs in selected folder. Playback blocked for this test.');
  const result=await current.resolve(entry);if(request!==token)return;
  loadedPath=result.path;url=URL.createObjectURL(result.file);$('linkedPlayer').src=url;$('linkedPlayer').load();
  const message=`${entry.path}\n→ ${result.path}\n${result.message}\nTap Play below.`;$('linkStatus').textContent=message;log(`Transcript/audio link: ${message}`);
 }catch(error){if(request===token){$('linkStatus').textContent=error.message;log(`Transcript/audio link failed: ${entry.path} — ${error.message}`);}}
 finally{if(request===token)$('resolveAudio').disabled=false;}
};
$('linkedPlayer').addEventListener('playing',()=>{if(loadedPath)log(`Linked audio playback started: ${loadedPath}`);});
$('linkedPlayer').addEventListener('error',()=>{if(loadedPath){const message=`Linked audio error: ${loadedPath}; code ${$('linkedPlayer').error?.code||'unknown'}`;$('linkStatus').textContent+='\n'+message;log(message);}});
window.addEventListener('pagehide',release);
