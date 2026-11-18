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
export function askIdentity({title,message,choices}){
    return new Promise(resolve=>{
        const dialog=document.createElement('dialog');dialog.className='identity-dialog';
        const heading=document.createElement('h2'),body=document.createElement('p'),actions=document.createElement('div');heading.textContent=title;body.textContent=message;actions.className='identity-dialog-actions';
        let done=false;const finish=value=>{if(done)return;done=true;dialog.close();dialog.remove();resolve(value);};
        for(const choice of choices){const button=document.createElement('button');button.type='button';button.textContent=choice.label;
            button.addEventListener('click',async()=>{button.disabled=true;try{const value=choice.run?await choice.run():undefined;finish({action:choice.action,value});}catch(error){if(error.name==='AbortError'){button.disabled=false;return;}body.textContent=error.message;button.disabled=false;}});actions.append(button);
        }
        dialog.append(heading,body,actions);dialog.addEventListener('cancel',event=>{event.preventDefault();finish({action:'cancel'});});document.body.append(dialog);dialog.showModal();actions.querySelector('button')?.focus();
    });
}
const cancel={action:'cancel',label:'Cancel'};
const pick={action:'select',label:'Select audio recording list',run:()=>pickIdentityJson({kind:'audio'})};
export function createRecordingIdentityUI({ask=askIdentity,onPendingList=()=>{},onStatus=()=>{},shareFile,openSession=openAudioSourceSession}={}){
    let session=null,source=null;
    return {
        reset(){session=null;source=null;onPendingList(null);},
        getSession:()=>session,
        async prepareSource(selectedSource,establishedAudioSourceIds=[],sourceLabels=new Map()){
            if(session&&source===selectedSource)return session;
            const options={source:selectedSource,establishedAudioSourceIds};
            for(let attempts=0;attempts<20;attempts++){
                const result=await openSession(options);
                if(result.status==='ready'){source=selectedSource;session=result.session;return session;}
                let answer;
                if(result.code==='source-id-conflict'){
                    answer=await ask({title:'These source associations do not match',message:'Choose the audio-source association to use. Existing transcripts will not be changed.',choices:[...result.association.candidates.map((id,i)=>({action:id,label:sourceLabels.get(id.toLowerCase())||`${i===0?'Selected recording list':'Established audio source'} (${id.slice(0,8)}…)`})),cancel]});
                    if(answer.action!=='cancel'){options.selectedAudioSourceId=answer.action;continue;}
                }else if(result.code==='recovery-association-conflict'&&result.candidates?.length){
                    answer=await ask({title:'Choose a saved audio recording list',message:'More than one saved source association is available for this folder.',choices:[...result.candidates.map(item=>({action:item.audioSourceId,label:`${item.sourceName||'Saved audio source'} (${item.audioSourceId.slice(0,8)}…)`})),cancel]});
                    if(answer.action!=='cancel'){options.selectedRecoverySourceId=answer.action;options.action='restore';continue;}
                }else if(result.code==='confirm-replacement'){
                    answer=await ask({title:'Replace the audio recording list?',message:'Replace memora-audio-source.json in your audio folder? This changes the list of original recordings, not the transcript file list. Your audio and existing transcripts will remain unchanged.',choices:[{action:'replace',label:'Replace audio recording list'},cancel]});
                    if(answer.action==='replace'){options.replacementConfirmed=true;continue;}
                }else if(['unreadable-source-list','source-changed'].includes(result.code)){
                    const diagnosis=result.discovery?.validation?.status==='unsupported'?'uses an unsupported version':'cannot be read safely';
                    answer=await ask({title:'Memora cannot use this audio recording list',message:`memora-audio-source.json ${diagnosis}. Select another copy or explicitly create a replacement.`,choices:[pick,...(result.canRestore?[{action:'restore',label:'Restore saved copy'}]:[]),{action:'replace',label:'Create replacement list'},cancel]});
                }else if(result.code==='pending-source-list'){
                    answer=await ask({title:'Continue the pending audio recording list?',message:'memora-audio-source.json is waiting to be saved in your audio folder. Continue with its existing Recording IDs.',choices:[{action:'resume',label:'Continue pending list'},cancel]});
                }else if(result.code==='restore-available'){
                    answer=await ask({title:'Restore this folder’s audio recording list?',message:'Restore memora-audio-source.json for your audio folder to reuse its Recording IDs. This does not replace the transcript file list.',choices:[{action:'restore',label:'Restore audio recording list'},cancel]});
                }else if(['create-source-list','select-existing-or-create'].includes(result.code)){
                    answer=await ask({title:'Choose the audio recording list',message:'Select memora-audio-source.json in your audio folder. This identifies the original recordings. If this is the first time, create an audio recording list. This step does not need the transcript file list (memora-archive.json).',choices:[pick,{action:'create',label:'Create audio recording list'},cancel]});
                }else throw Error(result.discovery?.error?.message||`Memora could not open this recording list (${result.code}). Check source access and try again.`);
                if(!answer||answer.action==='cancel')throw new DOMException('Recording-list selection cancelled.','AbortError');
                if(answer.action==='select'){options.selectedFile=answer.value;options.action=null;options.replacementConfirmed=false;}
                else {options.action=answer.action;options.replacementConfirmed=false;}
            }
            throw Error('The recording list could not be resolved. Select the audio source again.');
        },
        async prepareRecording(file){
            if(!session)throw Error('Select the recording list first.');
            const path=file.webkitRelativePath?file.webkitRelativePath.slice(file.webkitRelativePath.indexOf('/')+1):file.name;
            let choice=null;
            for(let attempts=0;attempts<10;attempts++){
                onStatus(`Checking Recording ID: ${file.name}`);
                const result=await session.stageRecording({audioRelativePath:path,choice});
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
                const answer=await ask({title,message,choices});if(answer.action==='cancel')throw new DOMException('Recording identity cancelled.','AbortError');choice=answer.action;
            }
            throw Error('The recording identity could not be resolved. Read the source again.');
        },
        async persist(){
            for(;;){
                try{const result=await session.persist();if(result.status==='export-pending')onPendingList(result.file);return result;}
                catch(error){
                    const answer=await ask({title:'The audio recording list could not be saved',message:error.message,choices:[{action:'retry',label:'Retry'},{action:'export',label:'Save audio recording list',run:()=>shareFile(session.exportPending())},cancel]});
                    if(answer.action==='cancel')throw new DOMException('Recording-list save cancelled.','AbortError');
                }
            }
        }
    };
}
