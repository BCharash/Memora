// Standalone test.html only. No production UI, persistence or model imports.
import {createArchiveFolderAccess} from '../js/archiveFolderAccess.js';
import {createReproducibleRecordingIdentityResolver} from '../js/reproducibleRecordingIdentity.js';
const $=id=>document.getElementById(id);
let adapter=null,folders=[],chosen=null,token=0,url=null,loadedPath=null,inventory=null,buildController=null;
function log(message){window.dispatchEvent(new CustomEvent('archive-test-check',{detail:message}));}
function release(){const player=$('linkedPlayer');player.pause();player.removeAttribute('src');player.load();if(url)URL.revokeObjectURL(url);url=null;loadedPath=null;}
function fill(select,items,label){select.replaceChildren();items.forEach((item,i)=>{const option=document.createElement('option');option.value=i;option.textContent=label(item);select.append(option);});select.disabled=!items.length;}
function showFolder(){
 token++;release();chosen=$('transcriptFolder').selectedIndex<0?null:folders[Number($('transcriptFolder').value)]||null;
 fill($('linkedTranscript'),chosen?.transcripts||[],entry=>entry.file.name);
 $('resolveAudio').disabled=!inventory||!chosen?.transcripts.length;$('transcriptPreview').textContent='Select a transcript, then tap Find Linked Audio.';
 $('linkStatus').textContent=chosen?`${chosen.transcripts.length} recognizable transcript(s). ${chosen.hasTranscriptList?'Transcript list supplied.':'No transcript list supplied; headers used for discovery.'}`:'No eligible immediate transcript subfolders found.';
 if(chosen?.issues.length)$('linkStatus').textContent+='\n'+chosen.issues.map(i=>`${i.path}: ${i.error}`).join('\n');
 if(chosen)window.dispatchEvent(new CustomEvent('archive-test-folder-chosen',{detail:chosen.name}));
 if(chosen)log(`Transcript folder chosen: ${chosen.name}; ${chosen.transcripts.length} recognizable transcripts; ${chosen.issues.length} issue(s).`);
}
window.addEventListener('archive-test-selection',async event=>{
 const request=++token;buildController?.abort();buildController=null;inventory=null;$('buildInventory').disabled=true;$('ignoreAudioList').disabled=false;$('inventoryStatus').textContent='Select a folder and build its temporary recording list.';$('inventoryPreview').textContent='';release();adapter=null;folders=[];chosen=null;$('resolveAudio').disabled=true;
 fill($('transcriptFolder'),[],()=> '');fill($('linkedTranscript'),[],()=> '');$('linkStatus').textContent='Discovering immediate transcript subfolders…';$('transcriptPreview').textContent='';
 try{
  const next=createArchiveFolderAccess(event.detail);const result=await next.discover(message=>{if(request===token)$('linkStatus').textContent=message;});
  if(request!==token)return;adapter=next;$('buildInventory').disabled=false;folders=result;fill($('transcriptFolder'),folders,g=>`${g.name} (${g.transcripts.length} transcripts)`);
  if(folders.length){$('transcriptFolder').selectedIndex=-1;$('linkStatus').textContent='Choose one transcript subfolder. Its contents remain separate from the other folders.';}else showFolder();
  window.dispatchEvent(new CustomEvent('archive-test-discovery'));
  log(`Discovery: ${folders.map(f=>`${f.name}: ${f.transcripts.length}`).join('; ')||'no eligible immediate folders'}.`);
 }catch(error){if(request===token){$('linkStatus').textContent=error.message;log(`Discovery failed: ${error.message}`);}}
});
$('transcriptFolder').onchange=showFolder;
$('linkedTranscript').onchange=()=>{token++;release();$('transcriptPreview').textContent='';$('linkStatus').textContent='Tap Find Linked Audio for this transcript.';$('resolveAudio').disabled=!inventory;};
$('resolveAudio').onclick=async()=>{
 const entry=chosen?.transcripts[Number($('linkedTranscript').value)],current=adapter,request=++token;if(!entry||!current||!inventory)return;release();$('resolveAudio').disabled=true;$('linkStatus').textContent='Reading transcript and locating audio…';
 try{
  const text=await current.preview(entry);if(request!==token)return;$('transcriptPreview').textContent=text;
  if(chosen.issues.some(i=>i.error.startsWith('Mixed Archive UUIDs')))throw Error('Mixed Archive UUIDs in selected folder. Playback blocked for this test.');
  const result=await current.resolve(entry,{inventory});if(request!==token)return;
  loadedPath=result.path;url=URL.createObjectURL(result.file);$('linkedPlayer').src=url;$('linkedPlayer').load();
  const message=`${entry.path}\n→ ${result.path}\n${result.message}\nTap Play below.`;$('linkStatus').textContent=message;log(`Transcript/audio link: ${message}`);
 }catch(error){if(request===token){$('linkStatus').textContent=error.message;log(`Transcript/audio link failed: ${entry.path} — ${error.message}`);}}
 finally{if(request===token)$('resolveAudio').disabled=!inventory;}
};
$('linkedPlayer').addEventListener('playing',()=>{if(loadedPath)log(`Linked audio playback started: ${loadedPath}`);});
$('linkedPlayer').addEventListener('error',()=>{if(loadedPath){const message=`Linked audio error: ${loadedPath}; code ${$('linkedPlayer').error?.code||'unknown'}`;$('linkStatus').textContent+='\n'+message;log(message);}});
window.addEventListener('pagehide',release);

$('ignoreAudioList').onchange=()=>{token++;release();inventory=null;$('resolveAudio').disabled=true;$('inventoryPreview').textContent='';$('inventoryStatus').textContent='Mode changed. Build the temporary recording list again.';};
$('buildInventory').onclick=async()=>{
 if(!adapter)return;
 const current=adapter,request=++token,controller=new AbortController();buildController?.abort();buildController=controller;
 inventory=null;release();$('buildInventory').disabled=true;$('ignoreAudioList').disabled=true;$('transcriptFolder').disabled=true;$('linkedTranscript').disabled=true;$('resolveAudio').disabled=true;$('inventoryPreview').textContent='';
 const start=performance.now(),ignored=$('ignoreAudioList').checked;
 try{
  const built=await current.buildInventory({ignoreList:ignored,signal:controller.signal,onProgress:message=>{if(request===token)$('inventoryStatus').textContent=message;}});
  if(request!==token)return;inventory=built;
  const embedded=built.recordings.filter(r=>r.method==='embedded').length,ambiguous=built.groups.filter(g=>g.status==='ambiguous');
  const messages=[`Temporary list: ${built.recordings.length} recording(s); ${embedded} embedded IDs; ${built.recordings.length-embedded} sampled IDs.`,`${built.unresolved.length} blocked audio file(s); ${ambiguous.length} ambiguous Recording ID(s).`,`Existing JSON: ${built.comparison.status}. No file saved or replaced.`,`Elapsed: ${Math.round(performance.now()-start)} ms (may include file-provider download time).`];
  if(built.comparison.status==='compared')messages.push(`Compared IDs: ${built.comparison.matched} matching; ${built.comparison.conflicts.length} conflicting; ${built.comparison.missing.length} absent/blocked; ${built.comparison.unlisted.length} unlisted.`);
  if(built.comparison.message)messages.push(built.comparison.message);
  for(const c of built.unresolved)messages.push(`Blocked: ${c.path} — ${c.issues?.[0]?.message||c.code}`);
  for(const group of ambiguous)messages.push(`Ambiguous: ${group.recordingId} — ${group.candidates.map(c=>c.path).join(', ')}`);
  $('inventoryStatus').textContent=messages.join('\n');$('inventoryPreview').textContent=JSON.stringify({previewOnly:true,recordings:built.recordings},null,2);log(messages.join('\n'));
 }catch(error){if(request===token){$('inventoryStatus').textContent=error.message;log(`Temporary inventory failed: ${error.message}`);}}
 finally{if(request===token){buildController=null;$('buildInventory').disabled=false;$('ignoreAudioList').disabled=false;$('transcriptFolder').disabled=!folders.length;$('linkedTranscript').disabled=!chosen?.transcripts.length;$('resolveAudio').disabled=!inventory||!chosen?.transcripts.length;}}
};
$('fallbackDemo').onclick=async()=>{
 $('fallbackDemo').disabled=true;
 try{
  const bytes=new Uint8Array([82,73,70,70,16,0,0,0,87,65,86,69,100,97,116,97,4,0,0,0,1,0,2,0]);
  const changed=bytes.slice();changed[20]=3;
  const a=await createReproducibleRecordingIdentityResolver().resolve(new File([bytes],'original.wav'));
  const b=await createReproducibleRecordingIdentityResolver().resolve(new File([bytes],'renamed.wav'));
  const c=await createReproducibleRecordingIdentityResolver().resolve(new File([changed],'changed.wav'));
  if([a,b,c].some(r=>r.status!=='ready')||a.recordingId!==b.recordingId||a.recordingId===c.recordingId)throw Error('Fallback reproducibility check failed.');
  const message=`PASS: synthetic rebuild and rename reproduced ${a.recordingId}.\nChanged sampled bytes produced ${c.recordingId}.\nMethod: ${a.method}; ${a.fingerprint.sampleBytes} bytes sampled. No user files read or written.`;
  $('fallbackResult').textContent=message;log(message);
 }catch(error){$('fallbackResult').textContent=error.message;log(`Synthetic fallback check failed: ${error.message}`);}
 finally{$('fallbackDemo').disabled=false;}
};

window.addEventListener('folder-test-transcript-choice',async event=>{
 if(!adapter)return;
 const descriptor=event.detail,current=adapter,request=++token;buildController?.abort();buildController=null;
 $('buildInventory').disabled=false;$('ignoreAudioList').disabled=false;
 release();chosen=null;$('transcriptFolder').selectedIndex=-1;$('linkedTranscript').replaceChildren();$('linkedTranscript').disabled=true;$('resolveAudio').disabled=true;$('transcriptPreview').textContent='';
 try{
  let index=descriptor.external?-1:folders.findIndex(g=>g.name===descriptor.name);
  if(index<0){
   const group=await current.openTranscriptSelection(descriptor.files,descriptor.external?`${descriptor.name} (Selected Separately)`:descriptor.name,{relativeFolder:descriptor.external?null:descriptor.name});
   if(request!==token)return;
   folders.push(group);index=folders.length-1;fill($('transcriptFolder'),folders,g=>`${g.name} (${g.transcripts.length} transcripts)`);
  }
  $('transcriptFolder').value=String(index);showFolder();
 }catch(error){if(request===token){$('linkStatus').textContent=error.message;log(`Transcript folder read failed: ${error.message}`);}}
});
