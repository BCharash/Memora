// Standalone architecture test, never imported by Memora production startup.
import {createSharedFolderSelection,readNativeFolder,immediateSubfolders,saveNativeSample} from './shared-folder-selection.js';
const $=id=>document.getElementById(id),state=createSharedFolderSelection();
let pendingNative=null,busy=false,rootGeneration=0;
const log=message=>window.dispatchEvent(new CustomEvent('archive-test-check',{detail:message}));
function render(){
 const s=state.snapshot();$('sharedAudioName').textContent=s.audioLabel;$('sharedTranscriptName').textContent=s.transcriptLabel;$('transcriptRole').textContent=s.role;
 $('selectTranscript').textContent='Select '+s.role;$('selectTranscript').disabled=!s.root||busy;$('saveTestArea').hidden=s.view!=='transcribe';$('saveTestFile').disabled=!s.transcript||busy;
 $('folderPanel').setAttribute('aria-labelledby',({transcribe:'tabTranscribe',combine:'tabCombine',search:'tabSearch'})[s.view]);
 for(const button of $('testTabs').querySelectorAll('[data-view]'))button.setAttribute('aria-selected',String(button.dataset.view===s.view));
 $('saveGuidance').textContent=s.transcript?`Audio Source: ${s.audioLabel}. Save the sample file in: ${s.transcriptLabel}. ${s.transcript.handle?'This selected desktop folder can be used for a verified save.':'Choose Save to Files and this destination; selected files do not grant write access.'}`:'Choose a Transcript Destination first.';
}
function useTranscript(folder){state.setTranscript(folder);render();$('transcriptChooser').hidden=true;$('sharedHint').textContent=`Shared transcript folder: ${state.snapshot().transcriptLabel}`;log(`Shared transcript folder: ${state.snapshot().transcriptLabel}`);window.dispatchEvent(new CustomEvent('folder-test-transcript-choice',{detail:folder}));}
for(const button of $('testTabs').querySelectorAll('[data-view]'))button.onclick=()=>{state.setView(button.dataset.view);$('transcriptChooser').hidden=true;render();log(`Test view: ${button.textContent}; Audio Source: ${state.snapshot().audioLabel}; ${state.snapshot().role}: ${state.snapshot().transcriptLabel}`);};
$('choose').onclick=async()=>{
 if(busy)return;
 if(typeof window.showDirectoryPicker!=='function'){pendingNative=null;$('folder').value='';$('folder').click();return;}
 busy=true;$('choose').disabled=true;render();$('sharedHint').textContent='Select an Audio Source Folder.';
 try{
  const handle=await window.showDirectoryPicker({mode:'read',id:'memora-test-audio'});$('sharedHint').textContent='Reading selected folder entries…';
  const selection=await readNativeFolder(handle);pendingNative=selection;window.dispatchEvent(new CustomEvent('folder-test-native-picked',{detail:{files:selection.files,rootName:selection.name}}));
 }catch(error){pendingNative=null;$('sharedHint').textContent=error.name==='AbortError'?'Selection cancelled. Previous folders retained.':`Folder selection failed: ${error.message}`;log($('sharedHint').textContent);}
 finally{busy=false;$('choose').disabled=false;render();}
};
window.addEventListener('archive-test-selection',event=>{
 rootGeneration++;const native=pendingNative;pendingNative=null;const files=event.detail;
 const names=new Set(files.map(file=>file.webkitRelativePath?.split('/')[0]).filter(Boolean));
 if(!native&&(names.size!==1||files.some(f=>!f.webkitRelativePath))){$('sharedHint').textContent='Relative paths for one parent archive are required.';return;}
 const folders=immediateSubfolders(files,native?.handles);state.setRoot({name:native?.name||[...names][0],folders,files,native:!!native});$('transcriptChooser').hidden=true;$('saveTestStatus').textContent='';render();
 const s=state.snapshot();$('sharedHint').textContent=`${native?'Native desktop directory access':'File-input access; Files controls any confirmation'}. ${s.transcript?'Defaulted to '+s.transcriptLabel+'.':'No transcription subfolder was supplied. Choose a transcript folder.'}`;
 log($('sharedHint').textContent);
});
// Discovery finishes after root state is installed. Select the shared default then.
window.addEventListener('archive-test-discovery',()=>{const s=state.snapshot();if(s.transcript)window.dispatchEvent(new CustomEvent('folder-test-transcript-choice',{detail:s.transcript}));});
window.addEventListener('archive-test-folder-chosen',event=>{
 const s=state.snapshot(),folder=s.root?.folders.find(f=>f.name===event.detail);if(folder&&s.transcript?.name!==folder.name){state.setTranscript(folder);render();}
});
$('selectTranscript').onclick=()=>{
 const s=state.snapshot();if(!s.root||busy)return;
 $('subfolderChoice').replaceChildren();for(const folder of s.root.folders){const option=document.createElement('option');option.value=folder.name;option.textContent=`${s.root.name} / ${folder.name}`;$('subfolderChoice').append(option);}
 if(s.transcript&&!s.transcript.external)$('subfolderChoice').value=s.transcript.name;
 $('useSubfolder').disabled=!s.root.folders.length;$('subfolderChoice').disabled=!s.root.folders.length;$('transcriptChooser').hidden=false;
};
$('useSubfolder').onclick=()=>{const folder=state.snapshot().root?.folders.find(f=>f.name===$('subfolderChoice').value);if(folder)useTranscript(folder);};
$('cancelTranscript').onclick=()=>{$('transcriptChooser').hidden=true;};
$('browseTranscript').onclick=async()=>{
 if(busy)return;
 if(typeof window.showDirectoryPicker!=='function'){$('transcriptFolderInput').value='';$('transcriptFolderInput').click();return;}
 const generation=rootGeneration;
 try{
  const handle=await window.showDirectoryPicker({mode:'read',id:'memora-test-transcripts'});const selected=await readNativeFolder(handle);if(generation!==rootGeneration)return;
  // Reuse a known child descriptor if this picker chose an existing subfolder.
  let folder=null;for(const candidate of state.snapshot().root.folders){if(candidate.handle?.isSameEntry&&await candidate.handle.isSameEntry(handle)){folder=candidate;break;}}
  useTranscript(folder||{name:selected.name,handle,files:selected.files,external:true});
 }catch(error){$('sharedHint').textContent=error.name==='AbortError'?'Transcript selection cancelled. Previous selection retained.':error.message;}
};
$('transcriptFolderInput').addEventListener('change',()=>{
 const files=Array.from($('transcriptFolderInput').files||[]),names=new Set(files.map(f=>f.webkitRelativePath?.split('/')[0]).filter(Boolean));
 if(!files.length||names.size!==1||files.some(f=>!f.webkitRelativePath)){$('sharedHint').textContent='No identifiable folder supplied. Previous selection retained; empty folders may not be supplied by Files.';return;}
 useTranscript({name:[...names][0],handle:null,files,external:true});
});
$('transcriptFolderInput').addEventListener('cancel',()=>{$('sharedHint').textContent='Transcript selection cancelled. Previous selection retained.';});
$('saveTestFile').onclick=async()=>{
 const s=state.snapshot(),generation=rootGeneration;if(!s.transcript||busy)return;
 const name=`memora-destination-test-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID()}.txt`;
 const text=`Memora folder destination test\nAudio Source: ${s.audioLabel}\nIntended destination: ${s.transcriptLabel}\nCreated: ${new Date().toISOString()}\nThis is a disposable test file, not a transcript.\n`;
 busy=true;$('choose').disabled=true;render();
 try{
  if(s.transcript.handle){await saveNativeSample(s.transcript.handle,name,text);$('saveTestStatus').textContent=`Saved and verified: ${s.transcriptLabel} / ${name}`;}
  else{const file=new File([text],name,{type:'text/plain'});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Save in '+s.transcriptLabel});$('saveTestStatus').textContent=`Share completed. Intended destination: ${s.transcriptLabel}. Saved location cannot be verified.`;}
   else{const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('saveTestStatus').textContent=`Download requested. Move the sample to ${s.transcriptLabel}; location is not verified.`;}}
  log($('saveTestStatus').textContent);
 }catch(error){$('saveTestStatus').textContent=error.name==='AbortError'?'Sample save cancelled. Folder selections retained.':`Sample save failed: ${error.message}`;log($('saveTestStatus').textContent);}
 finally{busy=false;$('choose').disabled=false;if(generation===rootGeneration)render();}
};
render();

$('choose').disabled=false;
