import {RECORDING_SAMPLE_BYTES as LIMIT,sampleRecordingFingerprint as sample,createReproducibleRecordingIdentityResolver as resolver,groupRecordingIdentityCandidates as group} from '../js/reproducibleRecordingIdentity.js';
import {parseAudioSourceManifest} from '../js/audioSourceIdentity.js';
import {readTranscriptIdentity} from '../js/transcriptMetadata.js';
import * as f from './recording-identity-fixtures.js';
const lines=[],failures=[];
const assert=(value,message='Assertion failed')=>{if(!value)throw Error(message);};
async function test(name,work){try{await work();lines.push('PASS '+name);}catch(error){failures.push(name);lines.push('FAIL '+name+': '+error.stack);}document.getElementById('results').textContent=lines.join('\n');}
async function rejects(work,name){try{await work();}catch(error){assert(!name||error.name===name,error.message);return;}throw Error('Expected rejection');}
const file=(blob=f.wav(),name='memo.wav')=>new File([blob],name);
const embedded=id=>file(f.wav([f.wavChunk('imID',f.payload(id))]));
function tracked(blob){const reads=[];return {reads,snapshot:{size:blob.size,slice(start,end){reads.push([start,end]);return blob.slice(start,end);}}};}
await test('Independent Python SHA-256 vector and fixed UUID layout',async()=>{
 const result=await sample(f.wav());assert(result.fingerprint.digest==='d18267b5d12c59d86442cf8a876931b900ba9753276a637a4889042711fee3de');assert(result.recordingId==='d18267b5-d12c-89d8-a442-cf8a876931b9');assert(result.fingerprint.sampleBytes===24);assert(LIMIT===256000);
});
await test('Embedded IDs take priority and retain original spelling',async()=>{const id=f.ID.toUpperCase(),result=await resolver().resolve(embedded(id));assert(result.status==='ready'&&result.method==='embedded'&&result.recordingId===id&&!result.fingerprint);});
await test('Apple embedded UUID is reused too',async()=>{const result=await resolver().resolve(file(f.mp4([f.appleMoov()])));assert(result.method==='embedded'&&result.recordingId.toLowerCase()===f.ID);});
await test('Supported audio without metadata gets sampled identity',async()=>{const result=await resolver().resolve(file());assert(result.status==='ready'&&result.method==='memora-recording-prefix-v1');});
await test('Rename and lastModified do not affect identity',async()=>{const r=resolver(),blob=f.wav();const a=await r.resolve(new File([blob],'a.wav',{lastModified:1})),b=await r.resolve(new File([blob],'renamed.wav',{lastModified:999}));assert(a.recordingId===b.recordingId);});
await test('Rebuilding with a fresh resolver reproduces IDs',async()=>{assert((await resolver().resolve(file())).recordingId===(await resolver().resolve(file())).recordingId);});
await test('Size changes affect identity even with identical prefix',async()=>{const prefix=new Uint8Array(LIMIT);assert((await sample(new Blob([prefix,'a']))).recordingId!==(await sample(new Blob([prefix,'ab']))).recordingId);});
await test('Prefix changes affect identity',async()=>{assert((await sample(new Blob(['abc']))).recordingId!==(await sample(new Blob(['xbc']))).recordingId);});
await test('Same size and prefix intentionally cannot distinguish different tails',async()=>{
 const prefix=new Uint8Array(LIMIT),a=await sample(new Blob([prefix,'a'])),b=await sample(new Blob([prefix,'b']));assert(a.recordingId===b.recordingId&&a.fingerprint.digest===b.fingerprint.digest);
 const result=group([{...a,location:'A/a.wav'},{...b,location:'B/b.wav'}]);assert(result.groups[0].status==='ambiguous'&&result.groups[0].candidates.length===2);
});
await test('Sampling requests exactly one bounded prefix for huge logical files',async()=>{const reads=[],snapshot={size:500*1024*1024,slice(start,end){reads.push([start,end]);return new Blob([new Uint8Array(end-start)]);}};const result=await sample(snapshot);assert(reads.length===1&&reads[0][0]===0&&reads[0][1]===LIMIT&&result.fingerprint.byteLength===snapshot.size);});
await test('Whole small file sampled without padding',async()=>{const t=tracked(new Blob(['abc']));await sample(t.snapshot);assert(t.reads.length===1&&t.reads[0][1]===3);});
await test('Immutable snapshot cache avoids repeated metadata and hash reads',async()=>{const t=tracked(f.wav()),r=resolver();const a=await r.resolve(t.snapshot),count=t.reads.length;assert(Object.isFrozen(a)&&Object.isFrozen(a.fingerprint));assert(await r.resolve(t.snapshot)===a&&t.reads.length===count);r.clear();assert((await r.resolve(t.snapshot)).recordingId===a.recordingId&&t.reads.length>count);});
await test('New snapshot is inspected despite identical filename and size',async()=>{const r=resolver();const a=embedded(f.ID),b=embedded(f.OTHER);assert((await r.resolve(a)).recordingId!==(await r.resolve(b)).recordingId);});
await test('Invalid embedded metadata is blocked without sampling',async()=>{const t=tracked(file(f.wav([f.wavChunk('imID',f.payload('bad-id'))])));const result=await resolver().resolve(t.snapshot);assert(result.status==='blocked'&&result.recordingId===null&&!t.reads.some(([a,b])=>a===0&&b===t.snapshot.size));});
await test('Conflicting embedded IDs are blocked',async()=>{const result=await resolver().resolve(file(f.mp4([f.appleMoov(),f.imuseBox(f.payload(f.OTHER))])));assert(result.status==='blocked'&&result.recordingId===null);});
await test('Unsupported container is not silently hashed',async()=>{const result=await resolver().resolve(file(new Blob(['unsupported mp3 data']),'a.mp3'));assert(result.status==='blocked'&&result.code==='embedded-unsupported');});
await test('Unreadable metadata is blocked and failure is not cached',async()=>{let calls=0;const snapshot={size:100,slice(){calls++;throw Error('Read failed');}};const r=resolver();assert((await r.resolve(snapshot)).status==='blocked');const n=calls;await r.resolve(snapshot);assert(calls>n);});
await test('Short prefix reads fail instead of producing an ID',async()=>{await rejects(()=>sample({size:40,slice:()=>new Blob(['short'])}));});
await test('Abort before reads, after read, and with cached identity',async()=>{const c=new AbortController();c.abort();await rejects(()=>sample(f.wav(),{signal:c.signal}),'AbortError');const r=resolver(),snapshot=file();await r.resolve(snapshot);await rejects(()=>r.resolve(snapshot,{signal:c.signal}),'AbortError');const later=new AbortController();await rejects(()=>sample({size:2,slice(){later.abort();return new Blob(['ab']);}},{signal:later.signal}),'AbortError');});
await test('Invalid snapshot sizes are rejected',async()=>{for(const size of [-1,NaN,1.5,Number.MAX_SAFE_INTEGER+1])await rejects(()=>sample({size,slice(){throw Error('must not read');}}),'TypeError');});
await test('Duplicate embedded IDs remain ambiguous; unresolved inputs stay visible',async()=>{const result=group([{status:'ready',recordingId:f.ID,location:'A'},{status:'ready',recordingId:f.ID.toUpperCase(),location:'B'},{status:'blocked',recordingId:null}]);assert(result.groups.length===1&&result.groups[0].status==='ambiguous'&&result.unresolved.length===1);});
await test('New IDs fit existing manifest and TXT UUID validators without changing them',async()=>{const result=await resolver().resolve(file());const parsed=parseAudioSourceManifest(JSON.stringify({schemaVersion:1,audioSourceId:f.ID,recordings:[{audioRelativePath:'memo.wav',recordingId:result.recordingId,identityOrigin:'memora-assigned',sampledIdentity:result.fingerprint}]}));assert(parsed.status==='valid');const header=readTranscriptIdentity(`Recording ID: ${result.recordingId}\nArchive UUID: ${f.ID}\n--------------------------------------------------\n`);assert(header.recordingId===result.recordingId);});
const report={passed:lines.length-failures.length,failed:failures.length,output:lines.join('\n')};document.getElementById('results').textContent+='\n\n'+report.passed+' passed; '+report.failed+' failed.';
if(new URLSearchParams(location.search).has('report'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify(report)});
