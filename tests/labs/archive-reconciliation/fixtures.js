// Synthetic IDs and tiny container shapes; no real recordings or transcripts.
import {wav,wavChunk,payload} from '../../recording-identity-fixtures.js';
import {readEmbeddedRecordingIdentity} from '../../../js/recordingIdentity.js';
import {fingerprintAudio} from '../../../js/audioFingerprint.js';
export const SOURCE='15d91f9a-735e-4d73-a6b6-427140869795';
export const ARCHIVE='9599e552-b194-4511-8865-b37a07413a38';
export const FOREIGN='8c336fc1-7eda-48b9-955b-cf4d2a625852';
export const idFor=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const audioPath=n=>`memo-${String(n).padStart(3,'0')}.wav`;
export const transcriptPath=n=>`memo-${String(n).padStart(3,'0')}-medium.txt`;
export const blobFor=(n,{noId=false}={})=>wav(noId?[]:[wavChunk('imID',payload(idFor(n)))]);
export function transcriptFor(n,{legacy=false,archiveUuid=ARCHIVE,audioSourceId=SOURCE,model='medium',operation='transcribe'}={}){
    return `${audioPath(n)}\n\n${legacy?'Voice Memo ID: '+idFor(n):`Metadata version: 1\nArchive UUID: ${archiveUuid}\nAudio Source ID: ${audioSourceId}\nOriginal Audio Folder: Synthetic audio\nRecording ID: ${idFor(n)}`}\nWhisper model: ${model}\nOperation: ${operation}\nUnknown header: retain this\nAudio Relative Path: ../${audioPath(n)}\n\n--------------------------------------------------\n\nSynthetic text ${n}.\n\nSecond paragraph.\n`;
}
export async function inspectAudio(blob,path){return {path,fingerprint:await fingerprintAudio(blob),embedded:await readEmbeddedRecordingIdentity(blob)};}
export async function makeScenario(count=120,{legacy=false}={}){
    const audioFiles=[];
    for(let n=1;n<=count;n++)audioFiles.push(await inspectAudio(blobFor(n),audioPath(n)));
    const last=audioFiles.at(-1);
    return {
        audioManifest:{schemaVersion:1,audioSourceId:SOURCE,extensions:{keep:'source extension'},recordings:[{audioRelativePath:last.path,recordingId:idFor(count),identityOrigin:'imuse-embedded',audioFingerprint:{...last.fingerprint},note:'retain recording extension'}]},
        transcriptManifest:{schemaVersion:1,archiveUuid:ARCHIVE,archiveName:'Synthetic archive',extensions:{keep:'archive extension'},recordings:[{recordingId:idFor(count),note:'retain archive recording extension',transcripts:[{relativePath:'deleted-test-tiny.txt',model:'tiny',operation:'transcribe',note:'old test reference'}]}]},
        audioFiles,transcriptFiles:Array.from({length:count},(_,i)=>({path:transcriptPath(i+1),text:transcriptFor(i+1,{legacy})})),
        coverage:{audio:'complete',transcripts:'complete'},removeMissingTranscripts:true
    };
}
