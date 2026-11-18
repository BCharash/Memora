// Real browser-private filesystem test adapter. No folder picker and no user
// handles: every writable root is created here under OPFS and kept in a WeakSet.
import {parseAudioSourceManifest,AUDIO_SOURCE_LIMITS} from '../../../js/audioSourceIdentity.js';
import {parseTranscriptArchive} from '../../../js/transcriptArchive.js';
import {readAudioSourceBytes} from '../../../js/storage.js';
import {fingerprintAudio} from '../../../js/audioFingerprint.js';
import {planArchiveReconciliation} from './reconcile.js';
import {makeScenario,blobFor,audioPath,transcriptPath,transcriptFor} from './fixtures.js';
const registered=new WeakSet(),decoder=new TextDecoder('utf-8',{fatal:true});
const read=async(folder,name)=>decoder.decode(await readAudioSourceBytes(await (await folder.getFileHandle(name)).getFile(),AUDIO_SOURCE_LIMITS.jsonBytes));
async function write(folder,name,data){
    const stream=await (await folder.getFileHandle(name,{create:true})).createWritable();
    try{await stream.write(data);await stream.close();}catch(error){try{await stream.abort();}catch{}throw error;}
}
export async function createDisposableArchive({count=3,beforeWrite=null}={}){
    if(!Number.isInteger(count)||count<1||count>120)throw Error('Disposable fixture count must be 1–120.');
    const parent=await navigator.storage.getDirectory(),name=`memora-reconcile-lab-${crypto.randomUUID()}`;
    const root=await parent.getDirectoryHandle(name,{create:true});registered.add(root);
    let transcriptFolder;
    const proofs=new WeakMap();
    async function cleanup(){if(!registered.has(root)||!name.startsWith('memora-reconcile-lab-'))throw Error('Unregistered lab cleanup.');await parent.removeEntry(name,{recursive:true});registered.delete(root);}
    try{
        transcriptFolder=await root.getDirectoryHandle('transcription',{create:true});
        const scenario=await makeScenario(count);
        for(let n=1;n<=count;n++){await write(root,audioPath(n),blobFor(n));await write(transcriptFolder,transcriptPath(n),transcriptFor(n));}
        await write(root,'memora-audio-source.json',JSON.stringify(scenario.audioManifest,null,2)+'\n');
        await write(transcriptFolder,'memora-archive.json',JSON.stringify(scenario.transcriptManifest,null,2)+'\n');
    }catch(error){await cleanup();throw error;}
    async function scan(){
        if(!registered.has(root))throw Error('Disposable fixture is no longer available.');
        const audioText=await read(root,'memora-audio-source.json'),transcriptText=await read(transcriptFolder,'memora-archive.json');
        const checked=parseAudioSourceManifest(audioText);if(checked.status!=='valid')throw Error('Invalid disposable source list.');
        const audioFiles=[],transcriptFiles=[],errors=[];
        for await(const [path,handle] of root.entries()){
            if(handle.kind==='directory'){if(path!=='transcription')errors.push({path,message:'Unexpected nested source boundary; this top-level lab cannot claim complete coverage.'});continue;}
            if(!/\.(m4a|mp4|mp3|wav|webm|ogg|flac|aiff)$/i.test(path))continue;
            try{
                const file=await handle.getFile();
                const {readEmbeddedRecordingIdentity}=await import('../../../js/recordingIdentity.js');
                audioFiles.push({path,fingerprint:await fingerprintAudio(file),embedded:await readEmbeddedRecordingIdentity(file)});
            }catch(error){errors.push({path,message:error.message});}
        }
        for await(const [path,handle] of transcriptFolder.entries()){
            if(handle.kind==='directory'){errors.push({path:'transcription/'+path,message:'Unexpected nested transcript boundary; enumeration is incomplete.'});continue;}
            if(!/\.txt$/i.test(path))continue;
            try{const file=await handle.getFile();transcriptFiles.push({path,text:decoder.decode(await file.slice(0,65536).arrayBuffer()),fingerprint:await fingerprintAudio(file)});}
            catch(error){errors.push({path,message:error.message});}
        }
        audioFiles.sort((a,b)=>a.path.localeCompare(b.path));transcriptFiles.sort((a,b)=>a.path.localeCompare(b.path));
        const signature=JSON.stringify({audioText,transcriptText,audio:audioFiles.map(item=>[item.path,item.fingerprint]),transcripts:transcriptFiles.map(item=>[item.path,item.fingerprint]),errors});
        return {audioManifest:checked.manifest,transcriptManifest:parseTranscriptArchive(transcriptText),audioFiles,transcriptFiles,coverage:{audio:'complete',transcripts:'complete'},errors,audioText,transcriptText,signature};
    }
    return {root,transcriptFolder,scan,cleanup,
        async preview(options={}){
            const inventory=await scan();
            // Review options may affect decisions, never replace observed files,
            // manifests or native enumeration evidence from this registered root.
            const safePlan=planArchiveReconciliation({...inventory,allowLegacyReferences:options.allowLegacyReferences===true,removeMissingTranscripts:options.removeMissingTranscripts===true,audioChoices:options.audioChoices||{}});
            const result={plan:safePlan};
            proofs.set(result,{signature:inventory.signature,audioText:safePlan.candidate?.audioText,transcriptText:safePlan.candidate?.transcriptText,canApply:safePlan.canApply,baseAudioText:inventory.audioText,baseTranscriptText:inventory.transcriptText});
            return result;
        },
        async apply(review){
            if(!registered.has(root))throw Error('Only a registered disposable OPFS archive can be written.');
            const proof=proofs.get(review);
            if(!proof?.canApply||!review.plan.canApply)throw Error('A conflict-free reviewed candidate is required.');
            if(review.plan.candidate.audioText!==proof.audioText||review.plan.candidate.transcriptText!==proof.transcriptText)throw Error('The reviewed candidate changed; preview it again.');
            const current=await scan();if(current.signature!==proof.signature)throw Error('The disposable archive changed after preview. No JSON was written.');
            const completedWrites=[];
            try{
                if(proof.audioText!==current.audioText){await beforeWrite?.('audio');if(await read(root,'memora-audio-source.json')!==proof.baseAudioText)throw Error('Audio JSON changed before its write.');await write(root,'memora-audio-source.json',proof.audioText);if(await read(root,'memora-audio-source.json')!==proof.audioText)throw Error('Audio JSON readback failed.');completedWrites.push('audio');}
                if(await read(transcriptFolder,'memora-archive.json')!==proof.baseTranscriptText)throw Error('Transcript JSON changed before its write.');
                if(proof.transcriptText!==current.transcriptText){await beforeWrite?.('transcripts');if(await read(transcriptFolder,'memora-archive.json')!==proof.baseTranscriptText)throw Error('Transcript JSON changed before its write.');await write(transcriptFolder,'memora-archive.json',proof.transcriptText);if(await read(transcriptFolder,'memora-archive.json')!==proof.transcriptText)throw Error('Transcript JSON readback failed.');completedWrites.push('transcripts');}
                return {status:'verified-disposable-write',completedWrites};
            }catch(cause){throw Object.assign(new Error('Reconciliation did not complete. Verified JSON writes: '+(completedWrites.join(', ')||'none')+'. Preview again before retrying.',{cause}),{completedWrites});}
        }
    };
}
