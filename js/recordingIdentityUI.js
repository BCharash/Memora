import {openAudioSourceSession} from './audioSourcePersistence.js';
import {AUDIO_SOURCE_LIMITS,parseBoundedIdentityJson,validateAudioSourceManifest} from './audioSourceIdentity.js';
import {readAudioSourceBytes} from './storage.js';
import {parseTranscriptArchive} from './transcriptArchive.js';
export async function validateIdentitySelection(file,kind){
    const bytes=await readAudioSourceBytes(file,AUDIO_SOURCE_LIMITS.jsonBytes);
    let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('This file is not readable JSON text. Select the list named in this step.');}
    const parsed=parseBoundedIdentityJson(text);
    if(parsed.status!=='valid')throw Error(parsed.issues[0].message);
    const audio=validateAudioSourceManifest(parsed.value);
    let transcript=false;try{parseTranscriptArchive(text);transcript=true;}catch{/* Keep each schema's validation independent. */}
    if(audio.status==='valid'&&transcript)throw Error('This file mixes audio and transcript list identities. Select a separate list for this step.');
    if(kind==='transcript'){
        if(audio.status==='valid')throw Error('This is your audio recording list. Here, select the transcript file list: memora-archive.json, in your transcription folder. Your files have not been changed.');
        parseTranscriptArchive(text);
    }else if(kind==='audio'){
        if(transcript)throw Error('This is your transcript file list. Here, select the audio recording list: memora-audio-source.json, in your audio folder. Your files have not been changed.');
        if(audio.status!=='valid')throw Error(audio.issues[0].message);
    }else throw Error('Choose whether this step needs an audio recording list or a transcript file list.');
    return file;
}
// One bounded, text-only dialog. Picker/share actions run directly in the button
// event, preserving browser user activation; no hidden automatic share/picker.
export function pickIdentityJson({kind='transcript'}={}){
    return new Promise((resolve,reject)=>{
        const input=document.createElement('input');input.type='file';
        // Files providers can classify JSON differently on iOS. Do not apply
        // an accept filter (including */*); validate bounded content after selection.
        input.hidden=true;document.body.append(input);
        input.onchange=async()=>{const file=input.files?.[0];input.remove();if(!file){reject(new DOMException('Selection cancelled.','AbortError'));return;}try{resolve(await validateIdentitySelection(file,kind));}catch(error){reject(error);}};
        input.oncancel=()=>{input.remove();reject(new DOMException('Selection cancelled.','AbortError'));};input.click();
    });
}
export function askIdentity({title,message,choices,signal}){
    return new Promise(resolve=>{
        const dialog=document.createElement('dialog');dialog.className='identity-dialog';
        const heading=document.createElement('h2'),body=document.createElement('p'),actions=document.createElement('div');heading.textContent=title;body.textContent=message;actions.className='identity-dialog-actions';
        let done=false;const aborted=()=>finish({action:'cancel'});const finish=value=>{if(done)return;done=true;signal?.removeEventListener('abort',aborted);if(dialog.open)dialog.close();dialog.remove();resolve(value);};
        for(const choice of choices){const button=document.createElement('button');button.type='button';button.textContent=choice.label;
            button.addEventListener('click',async()=>{button.disabled=true;try{const value=choice.run?await choice.run():undefined;finish({action:choice.action,value});}catch(error){if(error.name==='AbortError'){button.disabled=false;return;}body.textContent=error.message;button.disabled=false;}});actions.append(button);
        }
        if(signal?.aborted){finish({action:'cancel'});return;}signal?.addEventListener('abort',aborted,{once:true});
        dialog.append(heading,body,actions);dialog.addEventListener('cancel',event=>{event.preventDefault();finish({action:'cancel'});});document.body.append(dialog);dialog.showModal();actions.querySelector('button')?.focus();
    });
}
const cancel={action:'cancel',label:'Cancel'};
const pick={action:'select',label:'Browse for Audio Recording List…',run:()=>pickIdentityJson({kind:'audio'})};
export function createRecordingIdentityUI({ask=askIdentity,onPendingList=()=>{},onStatus=()=>{},shareFile,openSession=openAudioSourceSession}={}){
    let session=null,source=null,lastPendingListText=null,operationSignal=null;
    const askSource=options=>ask({...options,signal:operationSignal});
    async function publishPendingList(file){const text=await file.text();if(text!==lastPendingListText){onPendingList(file);lastPendingListText=text;}}
    return {
        reset(){session=null;source=null;lastPendingListText=null;onPendingList(null);},
        getSession:()=>session,
        publishPendingList,
        async revalidateSource(){if(!session)throw Error("Select an audio source first.");await session.revalidateSource?.();},
        async prepareSource(selectedSource,establishedAudioSourceIds=[],sourceLabels=new Map(),{signal,audioFiles=null}={}){
            operationSignal=signal;
            if(session&&source===selectedSource)return session;
            const options={source:selectedSource,establishedAudioSourceIds,signal,audioFiles,verifyAudioContents:false};
            for(let attempts=0;attempts<20;attempts++){
                const result=await openSession(options);
                if(result.status==='ready'){source=selectedSource;session=result.session;return session;}
                let answer;
                if(result.code==='source-id-conflict'){
                    answer=await askSource({title:'These source associations do not match',message:'Choose the audio-source association to use. Existing transcripts will not be changed.',choices:[...result.association.candidates.map((id,i)=>({action:id,label:sourceLabels.get(id.toLowerCase())||`${i===0?'Selected recording list':'Established audio source'} (${id.slice(0,8)}…)`})),cancel]});
                    if(answer.action!=='cancel'){options.selectedAudioSourceId=answer.action;continue;}
                }else if(result.code==='recovery-association-conflict'&&result.candidates?.length){
                    answer=await askSource({title:'Choose a saved audio recording list',message:'Choose the saved recording list that belongs to this audio folder. Compare the dates and recordings below with your existing transcripts. The date is when Memora last saved its recovery copy, not the recording date. If unsure, select the original memora-audio-source.json from your audio folder, or cancel. Nothing is merged or deleted.',choices:[pick,...result.candidates.map((item,index)=>{
                        const date=new Date(item.updatedAt);
                        const saved=item.updatedAt&&!Number.isNaN(date.getTime())?date.toLocaleString():'Unavailable';
                        const examples=item.recordingExamples?.length?item.recordingExamples.join(', '):'No recordings listed';
                        const transcript=sourceLabels.get(item.audioSourceId.toLowerCase());
                        return {action:item.audioSourceId,label:`${item.sourceName||'Audio folder'} — saved list ${index+1}\nLast saved: ${saved}\n${item.recordingCount??0} recording(s): ${examples}${transcript?'\n'+transcript:''}`};
                    }),cancel]});
                    if(answer.action==='select'){options.selectedFile=answer.value;options.action=null;options.selectedRecoverySourceId=null;options.replacementConfirmed=false;continue;}
                    if(answer.action!=='cancel'){options.selectedRecoverySourceId=answer.action;options.action='restore';continue;}
                }else if(result.code==='confirm-replacement'){
                    answer=await askSource({title:'Replace the audio recording list?',message:'Replace memora-audio-source.json in your audio folder? This changes the list of original recordings, not the transcript file list. Your audio and existing transcripts will remain unchanged.',choices:[{action:'replace',label:'Replace audio recording list'},cancel]});
                    if(answer.action==='replace'){options.replacementConfirmed=true;continue;}
                }else if(['unreadable-source-list','source-changed'].includes(result.code)){
                    const diagnosis=result.discovery?.validation?.status==='unsupported'?'uses an unsupported version':'cannot be read safely';
                    answer=await askSource({title:'Memora cannot use this audio recording list',message:`memora-audio-source.json ${diagnosis}. Select another copy or explicitly create a replacement.`,choices:[pick,...(result.canRestore?[{action:'restore',label:'Restore saved copy'}]:[]),{action:'replace',label:'Create replacement list'},cancel]});
                }else if(result.code==='pending-source-list'){
                    answer=await askSource({title:'Continue the pending audio recording list?',message:'memora-audio-source.json is waiting to be saved in your audio folder. Continue with its existing Recording IDs.',choices:[{action:'resume',label:'Continue pending list'},cancel]});
                }else if(['restore-available','create-source-list','select-existing-or-create'].includes(result.code)){
                    const missing=result.discovery?.status==='absent'||result.code==='create-source-list';
                    answer=await askSource({title:missing?'Audio recording list is missing':'Audio recording list was not found in the selected files',message:`${missing?'Memora could not find memora-audio-source.json in this audio folder.':'The selected folder files do not include memora-audio-source.json.'} Browse for an existing list${result.canRestore?', restore a saved copy to preserve its Recording IDs,':''} or create a new list. Creating a new list will assign new Recording IDs to recordings without embedded IDs. Existing embedded Recording IDs will be reused. Your audio and existing transcripts will not be changed.`,choices:[pick,...(result.canRestore?[{action:'restore',label:'Restore saved recording list'}]:[]),{action:'create',label:'Create audio recording list'},cancel]});
                }else throw Error(result.discovery?.error?.message||`Memora could not open this recording list (${result.code}). Check source access and try again.`);
                if(!answer||answer.action==='cancel')throw new DOMException('Recording-list selection cancelled.','AbortError');
                if(answer.action==='select'){options.selectedFile=answer.value;options.action=null;options.replacementConfirmed=false;}
                else {options.action=answer.action;options.replacementConfirmed=false;}
            }
            throw Error('The recording list could not be resolved. Select the audio source again.');
        },
        async prepareRecording(file,{onProgress}={}){
            if(!session)throw Error('Select the recording list first.');
            const path=file.webkitRelativePath?file.webkitRelativePath.slice(file.webkitRelativePath.indexOf('/')+1):file.name;
            let choice=null;
            for(let attempts=0;attempts<10;attempts++){
                onStatus(`Checking Recording ID: ${file.name}`);
                const result=await session.stageRecording({audioRelativePath:path,choice,onProgress});
                if(result.status==='ready')return result;
                if(result.status==='skipped')return null;
                if(result.code==='stale-choice'){choice=null;continue;}
                let title,message,choices;
                if(result.code==='audio-changed'){
                    title='This audio file has changed';message=`“${file.name}” differs from the file recorded in Memora’s list. Keep its ID for an edited version of the same recording, or assign a new ID for a different recording.`;
                    choices=[{action:'keep-existing',label:'Keep existing ID'},{action:'assign-new',label:'Assign new ID'},cancel];
                }else if(result.code==='embedded-id-mismatch'){
                    title='The recording IDs do not match';message=`“${file.name}” contains a different embedded Recording ID. Updating the list will use that ID for future transcriptions. Existing transcripts will remain unchanged.`;choices=[{action:'use-embedded',label:'Update recording list'},cancel];
                }else if(result.code==='unreadable-embedded-id'){
                    title='Memora cannot use this recording’s ID';message=`The ID information in “${file.name}” ${result.recoveryReason==='unsupported-embedded-metadata'?'uses an unsupported format':'is damaged'}. You can assign a Memora ID without changing the audio or existing transcripts.`;choices=[{action:'assign-new',label:'Assign new Memora ID'},{action:'skip',label:'Skip recording'},cancel];
                }else{
                    title='Memora cannot establish this Recording ID';message=`“${file.name}”: ${result.issues?.[0]?.message||result.validation?.issues?.[0]?.message||result.code}. The recording has not been changed.`;choices=[{action:'skip',label:'Skip recording'},cancel];
                }
                const answer=await askSource({title,message,choices});if(answer.action==='cancel')throw new DOMException('Recording identity cancelled.','AbortError');choice=answer.action;
            }
            throw Error('The recording identity could not be resolved. Read the source again.');
        },
        async persist({notify=true,onCommit}={}){
            for(;;){
                try{
                    const result=await session.persist({onCommit});
                    if(result.status==='export-pending'){
                        // Preparing a transcript persists the list again. A new File
                        // with unchanged contents must not invalidate a completed share.
                        if(notify)await publishPendingList(result.file);
                    }
                    return result;
                }
                catch(error){
                    if(error.name==='AbortError')throw error;
                    onStatus(`Save failed: ${source.name||'Selected folder'} / memora-audio-source.json — ${error.name}: ${error.message}`);
                    const answer=await askSource({title:'The audio recording list could not be saved',message:`${source.name||'Selected folder'} / memora-audio-source.json — ${error.name}: ${error.message}`,choices:[{action:'retry',label:'Retry'},{action:'export',label:'Save audio recording list',run:()=>shareFile(session.exportPending())},cancel]});
                    if(answer.action==='cancel'){const cancelled=new DOMException('Recording-list save cancelled.','AbortError');cancelled.saveFailure=error;throw cancelled;}
                }
            }
        }
    };
}
