import {createRecordingIdentityUI,askIdentity,pickIdentityJson} from './recordingIdentityUI.js';
import {openTranscriptArchive} from './transcriptArchive.js';
import {readEmbeddedRecordingIdentity} from './recordingIdentity.js';
import {readTranscriptIdentity,recordingIdentityLines} from './transcriptMetadata.js';
import {discoverAudioSource} from './audioSourcePersistence.js';
import {checkAudioSourceAbort} from './audioFingerprint.js';
import {listTextFiles,shareFile} from './storage.js';
// Inspect only the explicitly selected transcript destination. Embedded IDs
// corroborate associations; folder names and filenames cannot establish identity.
export async function associatedSourceEvidence(destination,files){
    const labels=new Map();
    if(destination?.kind!=='directory')return {ids:[],labels};
    const ids=new Set();
    for(const file of files){const result=await readEmbeddedRecordingIdentity(file);if(result.status==='valid')ids.add(result.recordingId.toLowerCase());}
    const established=new Set(),summaries=new Map();
    for(const file of await listTextFiles(destination)){
        if(file.size>0){
            let identity;try{identity=readTranscriptIdentity(await file.slice(0,65536).text());}catch{continue;}
            if(identity.recordingId&&identity.audioSourceId){
                const sourceId=identity.audioSourceId.toLowerCase();
                const summary=summaries.get(sourceId)||{count:0,examples:[]};
                summary.count++;if(summary.examples.length<3)summary.examples.push(file.name);summaries.set(sourceId,summary);
                // A transcript can describe a recovery choice without proving that
                // the selected audio belongs to it. Only embedded IDs establish that.
                if(ids.has(identity.recordingId.toLowerCase()))established.add(sourceId);
            }
        }
    }
    for(const [id,summary] of summaries)labels.set(id,`Referenced by ${summary.count} transcript(s) in ${destination.name}: ${summary.examples.join(', ')}`);
    return {ids:[...established],labels};
}
export function createTranscriptionIdentity({ask=askIdentity,onPendingList,onPendingArchive,onStatus}={}){
    const ui=createRecordingIdentityUI({ask,onPendingList,onStatus,shareFile});
    let archive=null,destination=null,source=null,preparedSource=null,pendingInventoryList=null,inventorySummary=null;
    return {
        reset(){ui.reset();archive=null;destination=null;source=null;preparedSource=null;onPendingArchive?.(null);},
        getSession:()=>ui.getSession(),
        getInventorySummary:()=>inventorySummary,
        async activateSource(){if(pendingInventoryList)await ui.publishPendingList(pendingInventoryList);},
        async prepareSource(selectedSource,files,{signal,onProgress=()=>{}}={}){
            checkAudioSourceAbort(signal);
            const discovery=await discoverAudioSource(selectedSource);
            const evidence=discovery.validation?.status==='valid'?{ids:[],labels:new Map()}:await associatedSourceEvidence(selectedSource,files);
            const session=await ui.prepareSource(selectedSource,evidence.ids,evidence.labels,{signal});
            const observedPaths=[],verifiedPaths=[];let skipped=0;
            for(let index=0;index<files.length;index++){
                checkAudioSourceAbort(signal);
                const file=files[index];
                const path=file.webkitRelativePath?file.webkitRelativePath.slice(file.webkitRelativePath.indexOf('/')+1):file.name;
                observedPaths.push(path);
                const message=`Checking audio recording list: ${index+1} of ${files.length} — ${file.name}`;
                onProgress(message);
                await new Promise(resolve=>setTimeout(resolve,0));
                checkAudioSourceAbort(signal);
                const identity=await ui.prepareRecording(file,{onProgress:progress=>onProgress(`${message} (${Math.round(progress.bytesRead/Math.max(1,progress.byteLength)*100)}%)`)});
                if(identity)verifiedPaths.push(path);else skipped++;
            }
            checkAudioSourceAbort(signal);
            const counts=await session.reconcileAvailability({observedPaths,verifiedPaths,complete:selectedSource.kind==='directory'&&skipped===0});
            onProgress('Saving audio recording list…');
            const result=await ui.persist({notify:false,onCommit:()=>onProgress('Writing audio recording list…')});
            pendingInventoryList=result.status==='export-pending'?result.file:null;
            for(const path of verifiedPaths)session.releaseRecordingSnapshot(path);
            inventorySummary={...counts,checked:verifiedPaths.length,skipped,coverage:selectedSource.kind==='directory'&&skipped===0?'folder':'selection',pendingSave:!!pendingInventoryList};
            preparedSource=selectedSource;
            return session;
        },
        async begin(selectedSource,selectedDestination,files){
            if(preparedSource!==selectedSource)throw Error('Select the audio source folder and resolve its audio recording list first.');
            await ui.revalidateSource();
            const session=ui.getSession();
            if(archive&&source===selectedSource&&destination===selectedDestination)return;
            let selectedFile=null;
            if(selectedSource.kind==='file-input'){
                const pending=session.getPendingTranscriptArchive();
                const answer=await ask({title:'Choose the transcript file list',message:'Select memora-archive.json in your transcription folder. This lists the transcript files in the archive. This step does not need the audio recording list (memora-audio-source.json).',choices:[
                    {action:'select',label:'Select transcript file list',run:()=>pickIdentityJson({kind:'transcript'})},
                    ...(pending?[{action:'pending',label:'Use pending transcript file list'}]:[]),
                    {action:'create',label:'Create transcript file list'},{action:'cancel',label:'Cancel'}]});
                if(answer.action==='cancel')throw new DOMException('Transcript archive selection cancelled.','AbortError');
                selectedFile=answer.action==='select'?answer.value:answer.action==='pending'?new File([pending],'memora-archive.json',{type:'application/json'}):null;
            }
            archive=await openTranscriptArchive(selectedDestination,{selectedFile,createNew:true});
            source=selectedSource;destination=selectedDestination;
        },
        async prepare(file){
            const identity=await ui.prepareRecording(file);if(!identity)return null;
            const resolved={...identity,embedded:identity.embedded||{identityOrigins:identity.identityOrigin==='memora-assigned'?[]:[identity.identityOrigin],source:'audio-recording-list'},archiveUuid:archive.archiveUuid,audioSourceId:ui.getSession().sourceId,originalAudioFolderName:source.name};
            recordingIdentityLines(resolved);
            await ui.persist();
            return resolved;
        },
        async addTranscript(reference){
            const file=await archive.add(reference);
            if(source.kind==='file-input'){
                await ui.getSession().retainTranscriptArchive(file);
                onPendingArchive?.(file);
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
