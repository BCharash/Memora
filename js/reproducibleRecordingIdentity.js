// Shared read-only recording identity rules. No persistence or catalogue IDs.
import {readEmbeddedRecordingIdentity} from './recordingIdentity.js';
import {isRecordingUuid} from './transcriptMetadata.js';
export const RECORDING_SAMPLE_BYTES=250*1024;
export const RECORDING_SAMPLE_METHOD='memora-recording-prefix-v1';
const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
function aborted(signal){if(signal?.aborted)throw new DOMException('Recording identity check cancelled.','AbortError');}
function checkFile(file){if(!file||!Number.isSafeInteger(file.size)||file.size<0||typeof file.slice!=='function')throw new TypeError('A readable immutable File or Blob snapshot is required.');}
function frozen(result){if(result.fingerprint)Object.freeze(result.fingerprint);if(result.issues)result.issues=Object.freeze(result.issues.map(issue=>Object.freeze({...issue})));return Object.freeze(result);}
function blocked(code,message){return frozen({status:'blocked',recordingId:null,code,issues:[{code,message}]});}

// Explicit low-level sampling; the resolver below permits it only after a
// supported container has been inspected and reported no embedded identity.
export async function sampleRecordingFingerprint(file,{signal}={}){
 checkFile(file);aborted(signal);
 if(!globalThis.crypto?.subtle)throw Error('SHA-256 is unavailable; use HTTPS or localhost.');
 const sampleLength=Math.min(file.size,RECORDING_SAMPLE_BYTES);
 const sample=new Uint8Array(await file.slice(0,sampleLength).arrayBuffer());aborted(signal);
 if(sample.length!==sampleLength)throw Error('The audio prefix could not be read completely.');
 // UTF-8 decimal integers with LF delimiters; fixed domain prevents cross-method reuse.
 const frame=encoder.encode(`${RECORDING_SAMPLE_METHOD}\n${file.size}\n${RECORDING_SAMPLE_BYTES}\n`);
 const input=new Uint8Array(frame.length+sample.length);input.set(frame);input.set(sample,frame.length);
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',input));aborted(signal);
 const uuidBytes=digest.slice(0,16);uuidBytes[6]=(uuidBytes[6]&15)|128;uuidBytes[8]=(uuidBytes[8]&63)|128;
 const id=hex(uuidBytes);const recordingId=`${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
 return frozen({status:'ready',recordingId,method:RECORDING_SAMPLE_METHOD,
  fingerprint:{method:RECORDING_SAMPLE_METHOD,algorithm:'sha256',byteLength:file.size,sampleBytes:sampleLength,digest:hex(digest)}});
}

// Cache only successful results for this exact immutable object. No filename,
// size, timestamp or catalogue-ID cache can stand in for a new File snapshot.
export function createReproducibleRecordingIdentityResolver(){
 let cache=new WeakMap();
 return Object.freeze({
  clear(){cache=new WeakMap();},
  async resolve(file,{signal}={}){
   checkFile(file);aborted(signal);if(cache.has(file))return cache.get(file);
   const embedded=await readEmbeddedRecordingIdentity(file);aborted(signal);
   let result;
   if(embedded.status==='valid'&&isRecordingUuid(embedded.recordingId)){
    result=frozen({status:'ready',recordingId:embedded.recordingId,method:'embedded',identityOrigins:Object.freeze([...embedded.identityOrigins]),issues:embedded.issues||[]});
   }else if(embedded.status==='absent'){
    try{result=await sampleRecordingFingerprint(file,{signal});}
    catch(error){if(error.name==='AbortError')throw error;return blocked('sample-failed',error.message);}
   }else{
    return frozen({status:'blocked',recordingId:null,code:`embedded-${embedded.status}`,issues:embedded.issues||[]});
   }
   cache.set(file,result);return result;
  }
 });
}

// Same ID means candidate locations, never permission to silently pick a file.
// Keep unresolved inputs visible for the future UI instead of dropping them.
export function groupRecordingIdentityCandidates(candidates){
 const groups=new Map(),unresolved=[];
 for(const candidate of candidates){
  if(candidate.status!=='ready'||!isRecordingUuid(candidate.recordingId)){unresolved.push(candidate);continue;}
  const id=candidate.recordingId.toLowerCase();if(!groups.has(id))groups.set(id,[]);groups.get(id).push(candidate);
 }
 return {groups:[...groups].map(([recordingId,locations])=>({recordingId,status:locations.length===1?'unique':'ambiguous',candidates:locations})),unresolved};
}
