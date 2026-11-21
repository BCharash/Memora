import {readTranscriptIdentity,recordingIdentityLines} from '../js/transcriptMetadata.js';
import {buildSearchIndex,createSearchEmbeddingsArchive} from '../js/search.js';
import {generated,resetGenerated} from './production-recording-identity-fixtures.js';
import * as f from './recording-identity-fixtures.js';
const SOURCE='99999999-9999-4999-8999-999999999999',ARCHIVE='88888888-8888-4888-8888-888888888888';
const lines=[],failures=[];const assert=(v,m='Assertion failed')=>{if(!v)throw Error(m);};
async function test(name,fn){try{await fn();lines.push('PASS '+name);}catch(e){failures.push(name);lines.push('FAIL '+name+': '+e.stack);}document.getElementById('results').textContent=lines.join('\n');}
async function rejects(fn){try{await fn();}catch{return;}throw Error('Expected rejection');}
const header=(extra='')=>`memo.wav\nWhisper model: tiny\nOperation: transcribe\nRecording ID: ${f.ID}\nArchive UUID: ${ARCHIVE}\n${extra}--------------------------------------------------\nHello world. This is a second sentence.`;
await test('New production headers omit source UUID and preserve recording/archive identity',async()=>{const lines=recordingIdentityLines({recordingId:f.ID,archiveUuid:ARCHIVE,originalAudioFolderName:'Audio'});assert(!lines.some(l=>l.startsWith('Audio Source ID:')));assert(readTranscriptIdentity(lines.join('\n')+'\n--------------------------------------------------\n').recordingId===f.ID);});
await test('Missing/malformed/repeated obsolete source UUID fields do not block parsing',async()=>{for(const value of ['',`Audio Source ID: ${SOURCE}\n`,'Audio Source ID: bad\nAudio Source ID: another\n'])assert(!('audioSourceId'in readTranscriptIdentity(header(value))));});
await test('Recording and archive conflicts still fail',async()=>{await rejects(async()=>readTranscriptIdentity(header('Voice Memo ID: '+f.OTHER+'\n')));await rejects(async()=>readTranscriptIdentity(header().replace(ARCHIVE,'bad')));});
await test('Search reuses exact text embeddings across historical source-hash changes',async()=>{const file=new File([header()], 'memo.txt');resetGenerated();const initial=await buildSearchIndex([file]);assert(generated>0);const archive=createSearchEmbeddingsArchive(initial);for(const t of archive.transcripts)t.transcriptHash='historical-source-id-hash';resetGenerated();await buildSearchIndex([new File([header('Audio Source ID: bad-old-value\n')],'memo.txt')],undefined,archive);assert(generated===0,'Re-embedded text solely due to retired source metadata');});
await test('Search header compatibility never reuses vectors for changed text',async()=>{
 const initial=await buildSearchIndex([new File([header()],'memo.txt')]);const archive=createSearchEmbeddingsArchive(initial);for(const t of archive.transcripts)t.transcriptHash='legacy';resetGenerated();await buildSearchIndex([new File([header().replace('Hello world.','Changed words.')],'memo.txt')],undefined,archive);assert(generated>0,'Changed text reused stale vectors');
});
await test('Ambiguous archived filenames cannot bridge a changed source hash',async()=>{
 const initial=await buildSearchIndex([new File([header()],'memo.txt')]);const archive=createSearchEmbeddingsArchive(initial);archive.transcripts[0].transcriptHash='legacy-a';archive.transcripts.push({...archive.transcripts[0],transcriptHash:'legacy-b'});resetGenerated();await buildSearchIndex([new File([header()],'memo.txt')],undefined,archive);assert(generated>0,'Ambiguous filename silently selected archived vectors');
});
const result={passed:lines.length-failures.length,failed:failures.length,output:lines.join('\n')};document.getElementById('results').textContent+=`\n\n${result.passed} passed; ${result.failed} failed.`;if(location.search.includes('report=1'))await fetch('/_identity-test-result',{method:'POST',body:JSON.stringify(result)});
