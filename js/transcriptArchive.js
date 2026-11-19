import {parseBoundedIdentityJson,AUDIO_SOURCE_LIMITS} from './audioSourceIdentity.js';
import {isRecordingUuid} from './transcriptMetadata.js';
import {readAudioSourceBytes,writeTextFile} from './storage.js';
export const TRANSCRIPT_ARCHIVE_FILENAME='memora-transcript-archive.json';
export function transcriptArchiveNameForRecords(manifest, records, folderName) {
    const declared = manifest?.archiveName?.trim();
    if (declared && declared !== folderName && declared !== 'Transcript archive') return declared;
    const names = new Set(records.map(record => record.originalAudioFolderName?.trim()).filter(Boolean));
    return names.size === 1 ? [...names][0] : declared || folderName || 'Transcript archive';
}
// This describes known archive/folder labels, not a verified full Files path.
export function describeTranscriptArchiveDestination({ archiveName, folderName = 'transcription' }) {
    return archiveName && archiveName !== folderName && archiveName !== 'Transcript archive'
        ? `the “${folderName}” folder for archive “${archiveName}”`
        : `the “${folderName}” transcript folder`;
}
const textDecoder=new TextDecoder('utf-8',{fatal:true});
const queues=new Map();
export async function archiveLock(key,work){
    const previous=queues.get(key)||Promise.resolve();
    const task=previous.catch(()=>{}).then(()=>globalThis.navigator?.locks ? navigator.locks.request(`memora-archive:${key}`,work):work());
    queues.set(key,task);try{return await task;}finally{if(queues.get(key)===task)queues.delete(key);}
}
export function parseTranscriptArchive(text) {
    const parsed=parseBoundedIdentityJson(text);
    if(parsed.status!=='valid')throw Error(parsed.issues[0].message);
    const value=parsed.value;
    if(!value||value.schemaVersion!==1||!isRecordingUuid(value.archiveUuid)||typeof value.archiveName!=='string'||!Array.isArray(value.recordings)||value.recordings.length>10000)throw Error('The transcript archive manifest is invalid or unsupported.');
    const ids=new Set(),paths=new Set();
    for(const entry of value.recordings){
        if(!isRecordingUuid(entry.recordingId)||ids.has(entry.recordingId.toLowerCase())||!Array.isArray(entry.transcripts))throw Error('The transcript archive contains conflicting recording entries.');
        ids.add(entry.recordingId.toLowerCase());
        for(const item of entry.transcripts){
            if(typeof item.relativePath!=='string'||item.relativePath.length>4096||item.relativePath.split('/').some(part=>!part||part==='.'||part==='..'||/[\\:\x00-\x1f\x7f]/.test(part)||/[. ]$/.test(part))||typeof item.model!=='string'||!item.model||!['transcribe','translate'].includes(item.operation))throw Error('The transcript archive contains an invalid transcript reference.');
            const path=item.relativePath.normalize('NFC').toLowerCase();if(paths.has(path))throw Error('The transcript archive repeats a transcript path.');paths.add(path);
        }
    }
    return value;
}
export function appendTranscriptReference(manifest,{recordingId,filename,model,operation}) {
    const copy=parseTranscriptArchive(JSON.stringify(manifest));
    let entry=copy.recordings.find(item=>item.recordingId.toLowerCase()===recordingId.toLowerCase());
    const existing=copy.recordings.flatMap(item=>item.transcripts.map(transcript=>({entry:item,transcript}))).find(item=>item.transcript.relativePath.normalize('NFC').toLowerCase()===filename.normalize('NFC').toLowerCase());
    if(existing){if(existing.entry!==entry||existing.transcript.relativePath!==filename||existing.transcript.model!==model||existing.transcript.operation!==operation)throw Error('This transcript filename already belongs to another archive reference.');return copy;}
    if(!entry){entry={recordingId,transcripts:[]};copy.recordings.push(entry);}
    entry.transcripts.push({relativePath:filename,model,operation});return parseTranscriptArchive(JSON.stringify(copy));
}
export async function openTranscriptArchive(destination,{selectedFile=null,createNew=false,archiveName=destination?.name||'Transcript archive',randomUUID=()=>crypto.randomUUID()}={}) {
    let original=null;
    if(selectedFile)original=textDecoder.decode(await readAudioSourceBytes(selectedFile,AUDIO_SOURCE_LIMITS.jsonBytes));
    else if(destination?.kind==='directory'){
        let handle;try{handle=await destination.getFileHandle(TRANSCRIPT_ARCHIVE_FILENAME);}catch(error){if(error.name!=='NotFoundError')throw error;}
        if(handle)original=textDecoder.decode(await readAudioSourceBytes(await handle.getFile(),AUDIO_SOURCE_LIMITS.jsonBytes));
    }
    if(original===null&&!createNew)return {status:'missing'};
    let manifest=original===null?{schemaVersion:1,archiveUuid:randomUUID(),archiveName,recordings:[]}:parseTranscriptArchive(original);
    // Validate before any file generation, including newly reserved UUIDs.
    manifest=parseTranscriptArchive(JSON.stringify(manifest));
    let written=null,createdEmpty=false;
    return {status:'ready',get archiveUuid(){return manifest.archiveUuid;},getManifest:()=>parseTranscriptArchive(JSON.stringify(manifest)),
        add(reference){return archiveLock(manifest.archiveUuid.toLowerCase(),async()=>{
            const candidate=appendTranscriptReference(manifest,reference),text=JSON.stringify(candidate,null,2)+'\n';
            if(new TextEncoder().encode(text).length>AUDIO_SOURCE_LIMITS.jsonBytes)throw Error('The transcript archive manifest is too large.');
            if(destination?.kind==='directory'){
                let current=null;try{const handle=await destination.getFileHandle(TRANSCRIPT_ARCHIVE_FILENAME);current=textDecoder.decode(await readAudioSourceBytes(await handle.getFile(),AUDIO_SOURCE_LIMITS.jsonBytes));}catch(error){if(error.name!=='NotFoundError')throw error;}
                if(written && current===written)original=current;
                if(original===null&&createdEmpty&&current==='')original='';
                if(current!==original)throw Error('The transcript archive changed in another session. Reload the destination before saving.');
                // The source identity has already passed its own persistence gate.
                try { await writeTextFile(destination,TRANSCRIPT_ARCHIVE_FILENAME,text);written=text; }
                catch(error){
                    if(original===null){try{const handle=await destination.getFileHandle(TRANSCRIPT_ARCHIVE_FILENAME);createdEmpty=(await handle.getFile()).size===0;}catch{/* Preserve write failure. */}}
                    throw error;
                }
                const saved=await destination.getFileHandle(TRANSCRIPT_ARCHIVE_FILENAME);
                if(textDecoder.decode(await readAudioSourceBytes(await saved.getFile(),AUDIO_SOURCE_LIMITS.jsonBytes))!==text)throw Error('The saved transcript archive could not be verified.');
                original=text;
            }
            manifest=candidate;return new File([text],TRANSCRIPT_ARCHIVE_FILENAME,{type:'application/json'});
        });}
    };
}
