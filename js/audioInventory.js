// Audio JSON retirement checkpoint 1: independent, read-only reconstruction.
// No persistence, replacement IDs, decoding, folder access or production UI.
import {createReproducibleRecordingIdentityResolver,RECORDING_SAMPLE_METHOD} from './reproducibleRecordingIdentity.js';
import {parseAudioSourceManifest} from './audioSourceIdentity.js';
const key=value=>value.normalize('NFC').toLowerCase();
const abort=signal=>{if(signal?.aborted)throw new DOMException('Inventory cancelled.','AbortError');};
export async function inspectAudioInventory(files,{manifestText=null,complete=false,signal,onProgress=()=>{}}={}){
 const started=performance.now(),resolver=createReproducibleRecordingIdentityResolver();
 const stats={bytesRequested:0,readRequests:0,elapsedMs:0};
 const records=[],issues=[],paths=new Set();
 for(let index=0;index<files.length;index++){
  abort(signal);const file=files[index],path=file.name;
  onProgress({checked:index,total:files.length,filename:path});
  if(!path||/[\\/\x00-\x1f]/.test(path)||path==='.'||path==='..'||paths.has(key(path))){issues.push({path,code:'ambiguous-path'});continue;}
  paths.add(key(path));
  const snapshot={size:file.size,slice(start,end){
   stats.readRequests++;stats.bytesRequested+=Math.max(0,Math.min(file.size,end??file.size)-Math.max(0,start));
   return file.slice(start,end);
  }};
  const identity=await resolver.resolve(snapshot,{signal});abort(signal);
  const record={audioRelativePath:path,size:file.size,lastModified:file.lastModified??null,status:identity.status,
   recordingId:identity.recordingId,method:identity.method||null,identityOrigins:identity.identityOrigins||[],
   ...(identity.fingerprint?{sampledIdentity:{...identity.fingerprint}}:{})};
  records.push(record);
  if(identity.status!=='ready')issues.push({path,code:identity.code,details:identity.issues||[]});
  if(index%16===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 abort(signal);
 const byId=new Map();for(const record of records)if(record.recordingId){const id=key(record.recordingId);if(!byId.has(id))byId.set(id,[]);byId.get(id).push(record.audioRelativePath);}
 for(const [recordingId,locations]of byId)if(locations.length>1)issues.push({code:'duplicate-recording-id',recordingId,paths:locations});
 const counts={observed:files.length,embedded:records.filter(r=>r.method==='embedded').length,
  reproducible:records.filter(r=>r.method===RECORDING_SAMPLE_METHOD).length,
  unresolved:files.length-records.filter(r=>r.status==='ready').length};
 const comparison={status:manifestText===null?'absent':'invalid',matched:[],mismatched:[],added:[],missing:[],relocated:[],legacyAssigned:[]};
 if(manifestText!==null){
  const parsed=parseAudioSourceManifest(manifestText);
  if(parsed.status==='valid'){
   comparison.status='valid';const old=parsed.manifest.recordings,oldByPath=new Map(old.map(r=>[key(r.audioRelativePath),r]));
   const observed=new Set(files.map(file=>key(file.name)));
   comparison.legacyAssigned=old.filter(r=>r.identityOrigin==='memora-assigned'&&!r.sampledIdentity).map(r=>({path:r.audioRelativePath,recordingId:r.recordingId}));
   for(const record of records){
    const previous=oldByPath.get(key(record.audioRelativePath));
    if(record.status!=='ready')continue;
    if(previous){
     (key(previous.recordingId)===key(record.recordingId)?comparison.matched:comparison.mismatched).push({path:record.audioRelativePath,recordingId:record.recordingId,previousRecordingId:previous.recordingId});
    }else{
     const moved=old.find(r=>key(r.recordingId)===key(record.recordingId)&&!observed.has(key(r.audioRelativePath)));
     if(moved)comparison.relocated.push({path:record.audioRelativePath,previousPath:moved.audioRelativePath,recordingId:record.recordingId});
     else comparison.added.push({path:record.audioRelativePath,recordingId:record.recordingId});
    }
   }
   comparison.missing=old.filter(r=>!observed.has(key(r.audioRelativePath))&&!comparison.relocated.some(m=>key(m.previousPath)===key(r.audioRelativePath))).map(r=>({path:r.audioRelativePath,recordingId:r.recordingId}));
  }else comparison.issues=parsed.issues;
 }
 stats.elapsedMs=Math.round(performance.now()-started);
 return {records,issues,counts,comparison,stats,coverage:complete?'folder':'selection',
  usable:issues.length===0,complete:complete&&issues.length===0,
  // A missing path during a partial/failed scan is an observation, not deletion.
  removalsConfirmed:complete&&issues.length===0&&comparison.status==='valid'};
}
