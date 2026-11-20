// Test-only folder state. No production or persistence dependencies.
export function createSharedFolderSelection(){
 let root=null,transcript=null,view='transcribe';
 return {
  setRoot(selection){root=selection;const defaults=selection.folders.filter(folder=>folder.name.toLowerCase()==='transcription');transcript=defaults.length===1?defaults[0]:null;},
  setTranscript(folder){if(!root)throw Error('Select an Audio Source Folder first.');transcript=folder;},
  setView(next){if(!['transcribe','combine','search'].includes(next))throw Error('Unknown test view.');view=next;},
  snapshot(){return {root,transcript,view,role:view==='transcribe'?'Transcript Destination':'Transcript Source',audioLabel:root?.name||'None Selected',transcriptLabel:transcript?(transcript.external?`${transcript.name} (Selected Separately)`:`${root.name} / ${transcript.name}`):'None Selected'};}
 };
}
export async function readNativeFolder(handle){
 const files=[],handles=new Map([['',handle]]);
 async function walk(directory,prefix=''){
  for await(const [name,entry] of directory.entries()){
   const relative=prefix+name;
   if(entry.kind==='directory'){handles.set(relative,entry);await walk(entry,relative+'/');}
   else if(entry.kind==='file'){const file=await entry.getFile();const snapshot=new File([file],file.name,{type:file.type,lastModified:file.lastModified});Object.defineProperty(snapshot,'webkitRelativePath',{value:`${handle.name}/${relative}`});files.push(snapshot);}
  }
 }
 await walk(handle);return {name:handle.name,files,handles};
}
export function immediateSubfolders(files,handles=new Map()){
 const names=new Set();for(const file of files){const parts=file.webkitRelativePath?.split('/');if(parts?.length>2)names.add(parts[1]);}
 for(const path of handles.keys())if(path&&!path.includes('/'))names.add(path);
 return [...names].sort().map(name=>({name,handle:handles.get(name)||null,files:files.filter(file=>file.webkitRelativePath?.split('/')[1]===name),external:false}));
}
// Explicit user action only. Never open an existing file for writing.
export async function saveNativeSample(handle,name,text){
 if(handle.queryPermission&&await handle.queryPermission({mode:'readwrite'})!=='granted'){
  if(!handle.requestPermission||await handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('Write permission was not granted.');
 }
 try{await handle.getFileHandle(name);throw Error('A file with this test name already exists. Try again.');}catch(error){if(error.name!=='NotFoundError')throw error;}
 const fileHandle=await handle.getFileHandle(name,{create:true});const writer=await fileHandle.createWritable();
 try{await writer.write(text);await writer.close();}catch(error){try{await writer.abort();}catch{}throw error;}
 if(await (await fileHandle.getFile()).text()!==text)throw Error('Test-file readback did not match.');
}
