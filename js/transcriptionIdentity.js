import {readTranscriptFolder,createTranscriptFolderSession} from './transcriptFolder.js';
import {createRecordingIdentityUI,askIdentity,pickIdentityJson} from './recordingIdentityUI.js';
import {openTranscriptArchive, TRANSCRIPT_ARCHIVE_FILENAME, transcriptArchiveNameForRecords, describeTranscriptArchiveDestination} from './transcriptArchive.js';
import {recordingIdentityLines} from './transcriptMetadata.js';
import {checkAudioSourceAbort} from './audioFingerprint.js';
import {shareFile,AUDIO_SOURCE_FILENAME} from './storage.js';
// Compatibility entry point: TXT source UUIDs no longer establish catalogue identity.
export async function associatedSourceEvidence(destination,files){
    const labels=new Map();
    if(destination?.kind!=='directory')return {ids:[],labels};
    // Source UUIDs in historical TXT headers are not recording identity.
    // Recovery continues to use saved handles/lists; never infer a catalogue ID from TXT.
    return {ids:[],labels};
}
export function createTranscriptionIdentity({ask=askIdentity,onPendingList,onPendingArchive,onStatus}={}){
    const ui=createRecordingIdentityUI({ask,onPendingList,onStatus,shareFile});
    let archive=null,destination=null,source=null,preparedSource=null,pendingInventoryList=null,inventorySummary=null;
    return {
        reset(){ui.reset();archive=null;destination=null;source=null;preparedSource=null;onPendingArchive?.(null);},
        invalidateDestination(){archive=null;destination=null;source=null;onPendingArchive?.(null);},
        getSession:()=>ui.getSession(),
        acknowledgeShared:(kind,file)=>ui.getSession()?.acknowledgeShared(kind,file),
        getInventorySummary:()=>inventorySummary,
        async activateSource(){if(pendingInventoryList)await ui.publishPendingList(pendingInventoryList);},
        async prepareSource(selectedSource,files,{signal,onProgress=()=>{}}={}){
            checkAudioSourceAbort(signal);
            const session=await ui.prepareSource(selectedSource,[],new Map(),{signal,audioFiles:files});
            const observedPaths=[],verifiedPaths=[];let skipped=0;
            for(let index=0;index<files.length;index++){
                checkAudioSourceAbort(signal);
                const file=files[index];
                const path=file.webkitRelativePath?file.webkitRelativePath.slice(file.webkitRelativePath.indexOf('/')+1):file.name;
                observedPaths.push(path);
                const message=`Checking audio recording list: ${index+1} of ${files.length} — ${file.name}`;
                onProgress(message);
                if(index%16===0)await new Promise(resolve=>setTimeout(resolve,0));
                checkAudioSourceAbort(signal);
                const identity=await ui.prepareRecording(file,{onProgress:progress=>onProgress(`${message} (${Math.round(progress.bytesRead/Math.max(1,progress.byteLength)*100)}%)`)});
                if(identity)verifiedPaths.push(path);else skipped++;
            }
            checkAudioSourceAbort(signal);
            // Folder coverage is independent of writable access: iPhone's
            // directory input also inventories the whole immediate folder.
            const complete=(selectedSource.kind==='directory'||selectedSource.selectionScope==='folder')&&skipped===0;
            const counts=await session.reconcileAvailability({observedPaths,verifiedPaths,complete});
            onProgress('Preparing audio recording list…');
            const result=await ui.persist({notify:false,onCommit:()=>onProgress('Saving audio recording list…')});
            pendingInventoryList=result.status==='export-pending'?result.file:null;
            for(const path of verifiedPaths)session.releaseRecordingSnapshot(path);
            inventorySummary={...counts,checked:verifiedPaths.length,skipped,coverage:complete?'folder':'selection',pendingSave:!!pendingInventoryList,saveOutcome:result.status,sourceVerified:result.sourceVerified,sourceFolder:selectedSource.name||'Selected folder',listFilename:AUDIO_SOURCE_FILENAME};
            preparedSource=selectedSource;
            return session;
        },
        async begin(selectedSource,selectedDestination,files){
            if(preparedSource!==selectedSource)throw Error('Select the audio source folder and resolve its audio recording list first.');
            await ui.revalidateSource();
            const session=ui.getSession();
            if(archive&&source===selectedSource&&destination===selectedDestination)return;
            let selectedFile=null;
            if(selectedSource.kind==='file-input'&&selectedDestination?.kind==='file-input'){
                const snapshot=await readTranscriptFolder(selectedDestination);
                const prepared=createTranscriptFolderSession(snapshot);
                if(prepared.status==='blocked')throw prepared.error;
                selectedFile=prepared.file||selectedDestination.files.find(file=>file.name===TRANSCRIPT_ARCHIVE_FILENAME)||null;
            }else if(selectedSource.kind==='file-input'){
                const pending=session.getPendingTranscriptArchive();
                const location=describeTranscriptArchiveDestination({archiveName:selectedSource.name,folderName:selectedDestination?.name||'transcription'});
                const answer=await ask({title:'Choose the transcript file list',message:`Select ${TRANSCRIPT_ARCHIVE_FILENAME} in ${location}. This lists the transcript files in the archive. This step does not need the audio recording list (memora-audio-source.json).`,choices:[
                    {action:'select',label:'Select transcript file list',run:()=>pickIdentityJson({kind:'transcript'})},
                    ...(pending?[{action:'pending',label:'Use pending transcript file list'}]:[]),
                    {action:'create',label:'Create transcript file list'},{action:'cancel',label:'Cancel'}]});
                if(answer.action==='cancel')throw new DOMException('Transcript archive selection cancelled.','AbortError');
                selectedFile=answer.action==='select'?answer.value:answer.action==='pending'?new File([pending],TRANSCRIPT_ARCHIVE_FILENAME,{type:'application/json'}):null;
            }
            archive=await openTranscriptArchive(selectedDestination,{selectedFile,createNew:true,archiveName:selectedSource.name||selectedDestination?.name||'Transcript archive'});
            source=selectedSource;destination=selectedDestination;
        },
        async prepare(file){
            const identity=await ui.prepareRecording(file,{verifyIdentity:true});if(!identity)return null;
            const resolved={...identity,embedded:identity.embedded||{identityOrigins:identity.identityOrigin==='memora-assigned'?[]:[identity.identityOrigin],source:'audio-recording-list'},archiveUuid:archive.archiveUuid,originalAudioFolderName:source.name};
            recordingIdentityLines(resolved);
            await ui.persist();
            return resolved;
        },
        async addTranscript(reference){
            const file=await archive.add(reference);
            if(source.kind==='file-input'){
                await ui.getSession().retainTranscriptArchive(file);
                const folderName=destination?.name||'transcription';
                onPendingArchive?.(file,{archiveName:transcriptArchiveNameForRecords(archive.getManifest(),[{originalAudioFolderName:source.name}],folderName),folderName});
            }
            return file;
        },
        finishRecording(file){
            const path=file.webkitRelativePath?file.webkitRelativePath.slice(file.webkitRelativePath.indexOf('/')+1):file.name;
            ui.getSession().releaseRecordingSnapshot(path);
        },
        persist:()=>ui.persist()
    };
}
