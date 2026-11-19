// Checkpoint 2B: isolated source identity I/O. No production UI/inference imports.
import { AUDIO_SOURCE_LIMITS, parseAudioSourceManifest, serializeAudioSourceManifest,
    createAudioSourceManifest, resolveAudioSourceId, planRecordingIdentity, planAudioSourceAvailability } from './audioSourceIdentity.js';
import { readEmbeddedRecordingIdentity } from './recordingIdentity.js';
import { fingerprintAudio, checkAudioSourceAbort } from './audioFingerprint.js';
import { createAudioSourceRecoveryStore, matchAudioSourceRecovery } from './audioSourceRecovery.js';
import { AUDIO_SOURCE_FILENAME, readAudioSourceBytes, discoverAudioSourceFile, writeAudioSourceFile, resolveAudioSourceHandle, listAudioFiles } from './storage.js';
const encoder=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true});
const sameBytes=(a,b)=>a===null || b===null ? a===b : a.length===b.length && a.every((value,i)=>value===b[i]);
const sameFingerprint=(a,b)=>a.byteLength===b.byteLength && a.digest===b.digest;
const fail=(code,message)=>Object.assign(new Error(message),{code});
function parse(bytes) {
    try { return parseAudioSourceManifest(decoder.decode(bytes)); }
    catch { return {status:'invalid',issues:[{code:'invalid-utf8',message:'The recording list is not valid UTF-8.'}]}; }
}
function serialize(manifest) {
    const result=serializeAudioSourceManifest(manifest);
    if (result.status!=='valid') throw fail('invalid-manifest',result.issues[0].message);
    return result.text;
}
// Serializes same-realm writes, plus cross-tab Web Locks where supported.
// The final byte check remains necessary; external programs do not honor locks.
const queues=new Map();
async function locked(key, work, signal) {
    const previous=queues.get(key)||Promise.resolve();
    const task=previous.catch(()=>{}).then(()=> {
        checkAudioSourceAbort(signal);
        return globalThis.navigator?.locks ? navigator.locks.request(`memora-source:${key}`,{mode:'exclusive',signal},work) : work();
    });
    queues.set(key,task);
    try { return await task; } finally { if (queues.get(key)===task) queues.delete(key); }
}
export async function discoverAudioSource(source, { selectedFile=null } = {}) {
    let discovery;
    if (selectedFile) {
        try { discovery={status:'found',bytes:await readAudioSourceBytes(selectedFile,AUDIO_SOURCE_LIMITS.jsonBytes), selectedFile:true}; }
        catch (error) { return {status:error.code==='source-size'?'size-limited':'read-failed',bytes:null,error}; }
    } else discovery=await discoverAudioSourceFile(source,AUDIO_SOURCE_LIMITS.jsonBytes);
    return discovery.status==='found' ? {...discovery,validation:parse(discovery.bytes)} : discovery;
}

// Actions are explicit user decisions supplied by the future UI adapter:
// create | replace (separate confirmation) | restore | resume, or null to open.
export async function openAudioSourceSession({ source, action=null, replacementConfirmed=false,
    selectedFile=null, establishedAudioSourceIds=[], selectedAudioSourceId=null, selectedRecoverySourceId=null,
    recoveryStore=createAudioSourceRecoveryStore(), randomUUID=()=>crypto.randomUUID(), signal, verifyAudioContents=true, audioFiles=null } = {}) {
    checkAudioSourceAbort(signal);
    const discovery=await discoverAudioSource(source,{selectedFile});
    let selectedRootBytes;
    if(selectedFile && source?.kind==='directory') {
        const root=await discoverAudioSourceFile(source,AUDIO_SOURCE_LIMITS.jsonBytes);
        if(!['found','absent'].includes(root.status))return {status:'blocked',code:root.status,discovery:root};
        if(!replacementConfirmed)return {status:'decision-required',code:'confirm-replacement'};
        selectedRootBytes=root.bytes;
    }
    if (!['found','absent','not-included'].includes(discovery.status)) return {status:'blocked',code:discovery.status,discovery};
    const valid=discovery.validation?.status==='valid';
    const diskManifest=valid ? discovery.validation.manifest : null;
    const sourceIds=[...establishedAudioSourceIds,...(diskManifest?[diskManifest.audioSourceId]:[])];
    const initialChoice=sourceIds.some(id=>typeof id==='string' && id.toLowerCase()===String(selectedAudioSourceId).toLowerCase()) ? selectedAudioSourceId : null;
    if (selectedAudioSourceId!==null && initialChoice===null && !['restore','resume'].includes(action)) return {status:'blocked',code:'invalid-source-choice'};
    const association=resolveAudioSourceId({establishedAudioSourceIds:sourceIds,selectedAudioSourceId:initialChoice});
    if (association.status==='invalid') return {status:'blocked',code:'source-evidence',association};
    if (association.status==='decision-required') return {status:'decision-required',code:'source-id-conflict',association};
    if (action!==null && !['create','replace','restore','resume'].includes(action)) return {status:'blocked',code:'invalid-action'};
    let records, recoveryError=null;
    try { records=await recoveryStore.list(); } catch (error) { records=[]; recoveryError=error; }
    checkAudioSourceAbort(signal);
    let matches=await matchAudioSourceRecovery(records,{source,establishedAudioSourceIds:association.audioSourceId?[association.audioSourceId]:[]});
    // Prefer explicit identity over older handle associations. An explicit new
    // list can coexist with an older recovery record for the same directory.
    if (association.audioSourceId) {
        const exact=matches.filter(item=>item.audioSourceId.toLowerCase()===association.audioSourceId.toLowerCase());
        if (exact.length || valid) matches=exact;
    }
    // Restore is for recovering needed fallback IDs, never a general backup
    // chooser. File-input omission cannot establish that the JSON is absent.
    const restoreIds=new Set();
    if(discovery.status==='absent' && matches.length && [null,'restore'].includes(action)){
        const files=audioFiles??await listAudioFiles(source);
        const pathsBySource=new Map(matches.map(item=>[item.audioSourceId.toLowerCase(),new Set(
            parseAudioSourceManifest(item.manifestText).manifest.recordings.filter(entry=>entry.identityOrigin==='memora-assigned').map(entry=>entry.audioRelativePath))]));
        for(const file of files){
            checkAudioSourceAbort(signal);
            const path=file.webkitRelativePath?file.webkitRelativePath.slice(file.webkitRelativePath.indexOf('/')+1):file.name;
            const possible=matches.filter(item=>pathsBySource.get(item.audioSourceId.toLowerCase()).has(path));
            if(!possible.length)continue;
            const embedded=await readEmbeddedRecordingIdentity(file);
            checkAudioSourceAbort(signal);
            if(embedded.issues.some(issue=>issue.code==='read-failed'))throw fail('audio-read-failed',`“${file.name}” could not be read. Restore availability cannot be established.`);
            if(embedded.status==='absent')for(const item of possible)restoreIds.add(item.audioSourceId.toLowerCase());
        }
    }
    const restorable=matches.filter(item=>restoreIds.has(item.audioSourceId.toLowerCase()));
    const canRestore=discovery.status==='absent' && restorable.length>0;
    if(action==='restore'){
        if(!canRestore)return {status:'blocked',code:'restore-not-available',discovery};
        matches=restorable;
    }
    if (selectedRecoverySourceId!==null) {
        const chosen=matches.filter(item=>item.audioSourceId.toLowerCase()===String(selectedRecoverySourceId).toLowerCase());
        if (chosen.length!==1) return {status:'blocked',code:'invalid-recovery-choice'};
        matches=chosen;
    }
    // Missing JSON is resolved before offering individual recovery copies.
    // A saved handle association alone never chooses a replacement list.
    if (!valid && discovery.status!=='found' && action===null) return {
        status:'decision-required',code:canRestore?'restore-available':discovery.status==='absent'?'create-source-list':'select-existing-or-create',
        discovery,canRestore
    };
    if (matches.length>1 && ['restore','resume'].includes(action)) return {status:'decision-required',code:'recovery-association-conflict',candidates:matches.map(item=>{
        const manifest=parseAudioSourceManifest(item.manifestText).manifest;
        return {audioSourceId:item.audioSourceId,sourceName:item.sourceName,updatedAt:item.updatedAt,
            recordingCount:manifest.recordings.length,
            recordingExamples:manifest.recordings.slice(0,3).map(record=>record.audioRelativePath)};
    })};
    let recovery=matches[0]||null, manifest=diskManifest;
    if (action==='restore' || action==='resume') {
        if (!recovery) return {status:'blocked',code:'no-matching-recovery',recoveryError};
        const recoveredAssociation=resolveAudioSourceId({audioSourceId:recovery.audioSourceId,
            establishedAudioSourceIds:association.audioSourceId?[association.audioSourceId]:[],selectedAudioSourceId});
        if (recoveredAssociation.status!=='resolved') return {status:'decision-required',code:'source-id-conflict',association:recoveredAssociation};
        association.audioSourceId=recoveredAssociation.audioSourceId;
        // Never silently replace a valid but externally changed disk list.
        const candidateBytes=encoder.encode(recovery.manifestText);
        if (action==='resume' && !sameBytes(discovery.bytes,recovery.baseBytes) && !sameBytes(discovery.bytes,candidateBytes)) {
            return {status:'decision-required',code:'source-changed',message:'This recording list has changed. Reload it and review the saved copy before replacing it.'};
        }
        if (action==='restore' && discovery.status==='found' && !replacementConfirmed) return {status:'decision-required',code:'confirm-replacement'};
        manifest=parseAudioSourceManifest(recovery.manifestText).manifest;
    } else if (!valid) {
        if (discovery.status==='found' && !(action==='replace' && replacementConfirmed)) {
            return {status:'decision-required',code:action==='replace'?'confirm-replacement':'unreadable-source-list',discovery,canRestore:false};
        }
        if (discovery.status!=='found' && action!=='create') return {status:'decision-required',code:canRestore?'restore-available':discovery.status==='absent'?'create-source-list':'select-existing-or-create',canRestore};
        if (discovery.status==='found' && action!=='replace') return {status:'blocked',code:'replacement-required'};
        // Explicit replacement may discard old recovery; ordinary opening may not.
        manifest=createAudioSourceManifest(association.audioSourceId||randomUUID()).manifest;
        if (!manifest) throw fail('source-id','A cryptographic Audio Source UUID could not be reserved.');
    } else if (action!==null) return {status:'blocked',code:'inapplicable-action'};
    if (association.audioSourceId) manifest={...manifest,audioSourceId:association.audioSourceId};
    // A pending list must be resumed explicitly before new assignments are made.
    const suppliedRecovery=valid && recovery && serialize(diskManifest)===serialize(parseAudioSourceManifest(recovery.manifestText).manifest);
    if (recovery && recovery.state!=='verified' && action===null && !suppliedRecovery) return {status:'decision-required',code:'pending-source-list',canResume:true};
    const key=manifest.audioSourceId.toLowerCase();
    // Query by source ID too: do not overwrite an unassociated same-ID recovery.
    const stored=await recoveryStore.get(key).catch(error=>{ recoveryError=error; return null; });
    if (stored && recovery && stored.revision!==recovery.revision) throw fail('recovery-conflict','The saved recording list changed. Open it again.');
    if (stored && !recovery) return {status:'decision-required',code:'recovery-association-conflict'};
    let revision=stored?.revision||null, baseline=selectedRootBytes===undefined?discovery.bytes:selectedRootBytes;
    let current=manifest, staged=null, pendingRecord=null, writtenBytes=null;
    let recoveryExtras=stored?.pendingTranscriptArchive ? {pendingTranscriptArchive:stored.pendingTranscriptArchive} : {};
    const unresolved=new Set();
    const snapshots=new Map(), assignments=new Map();
    let busy=false;
    async function exclusive(work) {
        if (busy) throw fail('session-busy','Finish the current recording-list operation before starting another.');
        busy=true; try { return await work(); } finally { busy=false; }
    }
    async function currentSource() {
        const result=await discoverAudioSourceFile(source,AUDIO_SOURCE_LIMITS.jsonBytes);
        if (!['found','absent'].includes(result.status)) throw fail(result.status,'Memora could not recheck this recording list. Check folder access and try again.');
        return result.bytes;
    }
    async function revalidateAudio() {
        checkAudioSourceAbort(signal);
        if(!verifyAudioContents)return;
        for (const [path,snapshot] of snapshots) {
            checkAudioSourceAbort(signal);
            if (source.kind==='directory') {
                const handle=await resolveAudioSourceHandle(source,path), file=await handle.getFile();
                // File size/time never prove unchanged contents. Compare raw digest.
                if (file.size!==snapshot.file.size || !sameFingerprint(await fingerprintAudio(file,{signal}),snapshot.fingerprint)) {
                    throw fail('audio-changed',`“${path}” changed after its Recording ID was reviewed. Read the file again before saving the list.`);
                }
            }
        }
    }
    async function saveRecovery(state,text) {
        // Keep revision/UUIDs in session on failure; retry does not regenerate IDs.
        if (!pendingRecord || pendingRecord.manifestText!==text || pendingRecord.state!==state) pendingRecord={
            ...recoveryExtras, audioSourceId:key, revision:randomUUID(), state, manifestText:text, baseBytes:baseline,
            directoryHandle:source.kind==='directory'?source:null, sourceName:source.name||'Audio folder', updatedAt:new Date().toISOString()
        };
        await recoveryStore.put(pendingRecord,revision); revision=pendingRecord.revision;
        pendingRecord=null;
    }
    // A supplied valid list is already a saved copy. Export it again only when
    // its contents change; restored/pending copies still need explicit sharing.
    const suppliedSavedText=source.kind==='file-input' && valid && serialize(diskManifest)===serialize(manifest) ? serialize(diskManifest) : null;
    const session={
        sourceId:manifest.audioSourceId, discovery, recoveryError,
        needsInitialSave:action!==null || diskManifest?.audioSourceId!==manifest.audioSourceId,
        revalidateSource:()=>exclusive(async()=> {
            if(source.kind==='directory' && !sameBytes(await currentSource(),baseline))
                throw fail('source-changed','The audio recording list changed after this source was opened. Select the audio source folder again to resolve its recording list before transcribing.');
        }),
        getManifest:()=>parseAudioSourceManifest(serialize(staged||current)).manifest,
        releaseRecordingSnapshot: path=> {
            if(unresolved.has(path))throw fail('unresolved-recording','Resolve or skip the recording before releasing its snapshot.');
            snapshots.delete(path);
        },
        getPendingTranscriptArchive:()=>recoveryExtras.pendingTranscriptArchive||null,
        retainTranscriptArchive: file=>exclusive(async()=> {
            const bytes=await readAudioSourceBytes(file,AUDIO_SOURCE_LIMITS.jsonBytes);
            recoveryExtras={pendingTranscriptArchive:decoder.decode(bytes)};
            await saveRecovery(source.kind==='directory'?'verified':'export-pending',serialize(staged||current));
        }),
        reconcileAvailability:options=>exclusive(async()=> {
            checkAudioSourceAbort(signal);
            const result=planAudioSourceAvailability(staged||current,options);
            staged=result.manifest;
            return result.counts;
        }),
        stageRecording: options=>exclusive(async()=> {
            checkAudioSourceAbort(signal);
            const {audioRelativePath,choice=null,onProgress}=options;
            if (choice==='cancel') return {status:'cancelled',recordingId:null,candidate:null};
            if (choice==='skip') {
                if (staged) {
                    const original=current.recordings.find(item=>item.audioRelativePath===audioRelativePath);
                    staged.recordings=original ? staged.recordings.map(item=>item.audioRelativePath===audioRelativePath ? original : item) :
                        staged.recordings.filter(item=>item.audioRelativePath!==audioRelativePath);
                }
                unresolved.delete(audioRelativePath); snapshots.delete(audioRelativePath);
                return {status:'skipped',recordingId:null,candidate:null};
            }
            unresolved.add(audioRelativePath);
            // Validate paths before any handle lookup, read or UUID reservation.
            const pathCheck=planRecordingIdentity({manifest:staged||current,audioRelativePath,
                fingerprint:{algorithm:'sha256',byteLength:0,digest:'0'.repeat(64)},embedded:{status:'absent',recordingId:null,issues:[]},verifyAudioContents});
            if (['audio-path','path-spelling'].includes(pathCheck.code)) return pathCheck;
            let file;
            if (source.kind==='directory') file=await (await resolveAudioSourceHandle(source,audioRelativePath)).getFile();
            else {
                const files=source.files.filter(item=>(item.webkitRelativePath ? item.webkitRelativePath.slice(item.webkitRelativePath.indexOf('/')+1) : item.name)===audioRelativePath);
                if (files.length!==1) throw fail('audio-selection',`Select one unambiguous copy of “${audioRelativePath}”.`);
                file=files[0];
            }
            // One immutable File snapshot for reader, hash and future inference.
            const known=(staged||current).recordings.find(item=>item.audioRelativePath===audioRelativePath);
            const embedded=!verifyAudioContents&&known?null:await readEmbeddedRecordingIdentity(file);
            checkAudioSourceAbort(signal);
            if(embedded?.issues.some(issue=>issue.code==='read-failed'))throw fail('audio-read-failed',`“${file.name}” could not be read. The audio recording list has not been updated.`);
            const fingerprint=verifyAudioContents?await fingerprintAudio(file,{signal,onProgress}):null;
            const token=JSON.stringify([fingerprint,embedded,file.size,file.lastModified]);
            const previous=snapshots.get(audioRelativePath);
            if (choice && (!previous || previous.token!==token)) {
                snapshots.set(audioRelativePath,{file,fingerprint,embedded,token});
                return {status:'decision-required',code:'stale-choice',recordingId:null,candidate:null,message:'The recording changed or this choice has not been reviewed. Review its current identity before continuing.'};
            }
            const args={manifest:staged||current,audioRelativePath,fingerprint,embedded,choice,verifyAudioContents};
            let result=planRecordingIdentity(args);
            if (result.status==='assignment-required') {
                const assignmentKey=`${audioRelativePath}:${token}:${choice||'new'}`;
                if (!assignments.has(assignmentKey)) assignments.set(assignmentKey,randomUUID());
                result=planRecordingIdentity({...args,assignedRecordingId:assignments.get(assignmentKey)});
            }
            snapshots.set(audioRelativePath,{file,fingerprint,embedded,token});
            if (result.status==='ready') { staged=result.candidate;
                const entry=staged.recordings.find(item=>item.audioRelativePath===audioRelativePath);
                if(entry.sourceAvailability)entry.sourceAvailability.status='available';
                unresolved.delete(audioRelativePath); }
            return {...result,file,fingerprint,embedded,identityOrigin:known?.identityOrigin||result.candidate?.recordings.find(item=>item.audioRelativePath===audioRelativePath)?.identityOrigin};
        }),
        persist: ({onCommit}={})=>exclusive(()=>locked(key,async()=> {
            checkAudioSourceAbort(signal);
            if (unresolved.size) throw fail('unresolved-recording','Review or skip the unresolved recording before saving this list.');
            const text=serialize(staged||current), bytes=encoder.encode(text);
            if (source.kind==='directory') {
                const disk=await currentSource();
                if (writtenBytes && sameBytes(disk,writtenBytes)) baseline=disk;
                if (!sameBytes(disk,baseline)) throw fail('source-changed','This recording list changed after it was opened. Reload it before saving.');
            }
            await saveRecovery(source.kind==='directory'?'pending':'export-pending',text);
            checkAudioSourceAbort(signal);
            if (source.kind==='file-input') {
                current=staged||current; staged=null;
                if(text===suppliedSavedText)return {status:'unchanged',sourceVerified:false,transcriptDeliveryAllowed:true};
                return {status:'export-pending',sourceVerified:false,transcriptDeliveryAllowed:true,
                    file:new File([bytes],AUDIO_SOURCE_FILENAME,{type:'application/json'}),
                    guidance:'Save memora-audio-source.json in the audio folder so Memora can reuse its Recording IDs.'};
            }
            // Recheck after durable staging, immediately before opening the writer.
            await revalidateAudio();
            checkAudioSourceAbort(signal);
            if (!sameBytes(await currentSource(),baseline)) throw fail('source-changed','This recording list changed before saving. Reload it; the pending list remains available.');
            const parsedDisk=parse(baseline);
            if(parsedDisk.status==='valid' && serialize(parsedDisk.manifest)===text){
                current=staged||current;staged=null;
                await saveRecovery('verified',text);
                return {status:'unchanged',sourceVerified:true,transcriptDeliveryAllowed:true};
            }
            onCommit?.();
            try { await writeAudioSourceFile(source,bytes); writtenBytes=bytes; }
            catch (error) {
                // Creating a new handle can leave an empty file even when the
                // writable stream aborts. Recognize only that exact empty shell.
                if (baseline===null) {
                    try { const disk=await currentSource(); if (disk?.length===0) baseline=disk; } catch { /* Keep original failure. */ }
                }
                throw error;
            }
            // No success on write/close alone: actual readback must agree exactly.
            if (!sameBytes(await currentSource(),bytes)) throw fail('readback-failed','Memora could not verify the saved recording list. Keep the pending copy and try again.');
            baseline=bytes; current=staged||current; staged=null;
            await saveRecovery('verified',text);
            return {status:'verified',sourceVerified:true,transcriptDeliveryAllowed:true};
        },signal)),
        // Sharing must be a separate user gesture using storage.shareFile(file).
        // This export does not grant dependent transcript delivery after IDB failure.
        exportPending:()=>new File([serialize(staged||current)],AUDIO_SOURCE_FILENAME,{type:'application/json'}),
        verifySelectedCopy: file=>exclusive(async()=> {
            if (unresolved.size) throw fail('unresolved-recording','Review or skip the unresolved recording first.');
            await revalidateAudio();
            const bytes=await readAudioSourceBytes(file,AUDIO_SOURCE_LIMITS.jsonBytes), expected=encoder.encode(serialize(staged||current));
            if (!sameBytes(bytes,expected)) throw fail('readback-failed','The selected recording list does not match the pending copy.');
            await saveRecovery('verified',decoder.decode(bytes));
            current=staged||current; staged=null; baseline=bytes;
            return {status:'verified-copy',sourceVerified:false,transcriptDeliveryAllowed:true};
        })
    };
    return {status:'ready',session};
}
