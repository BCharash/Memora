// Isolated proof of concept. No production imports this module. Pure planning:
// no I/O, UUID generation, file deletion, header edits or transcript inference.
import {validateAudioSourceManifest,planRecordingIdentity} from '../../../js/audioSourceIdentity.js';
import {parseTranscriptArchive,appendTranscriptReference} from '../../../js/transcriptArchive.js';
import {readTranscriptIdentity,transcriptHeader} from '../../../js/transcriptMetadata.js';
const lower=value=>value.toLowerCase();
const pathKey=path=>{
    if(typeof path!=='string'||!path||path.length>4096||path.split('/').some(part=>!part||part==='.'||part==='..'||/[\\:\x00-\x1f\x7f]/.test(part)||/[. ]$/.test(part)))throw Error('Unsafe relative inventory path.');
    return path.normalize('NFC').toLowerCase();
};
const issue=(code,path,message)=>({code,path,message});
export function planArchiveReconciliation({audioManifest,transcriptManifest,audioFiles=[],transcriptFiles=[],
    coverage={},errors=[],allowLegacyReferences=false,removeMissingTranscripts=false,audioChoices={}}={}){
    const report={addAudio:[],addTranscripts:[],missingAudio:[],missingTranscripts:[],unobservedAudio:[],unobservedTranscripts:[],legacyHeaders:[],conflicts:[],decisions:[],warnings:[]};
    const result=(status,candidate=null)=>({status,canApply:status==='review-ready',candidate,report,
        coverage:{audio:coverage.audio==='complete'?'complete':'partial',transcripts:coverage.transcripts==='complete'?'complete':'partial'}});
    let audio,transcripts;
    try{
        const checked=validateAudioSourceManifest(audioManifest);
        if(checked.status!=='valid')throw Error(checked.issues[0].message);
        audio=checked.manifest;transcripts=parseTranscriptArchive(JSON.stringify(transcriptManifest));
    }catch(error){report.conflicts.push(issue('invalid-manifest',null,error.message));return result('blocked');}
    if(!Array.isArray(audioFiles)||!Array.isArray(transcriptFiles)||audioFiles.length>10000||transcriptFiles.length>10000||!Array.isArray(errors)){
        report.conflicts.push(issue('invalid-inventory',null,'Inventory shape or entry limit is invalid.'));return result('blocked');
    }
    for(const error of errors)report.conflicts.push(issue('incomplete-read',error.path||null,error.message||'A file or folder could not be read.'));
    const audioSeen=new Set(),transcriptSeen=new Set(),observedIds=new Map();
    for(const item of [...audioFiles].sort((a,b)=>String(a.path).localeCompare(String(b.path),'en'))){
        try{
            const key=pathKey(item.path);
            if(audioSeen.has(key))throw Error('Audio paths collide by case or Unicode spelling.');audioSeen.add(key);
            const before=audio.recordings.find(entry=>pathKey(entry.audioRelativePath)===key);
            const selected=Object.hasOwn(audioChoices,item.path)?audioChoices[item.path]:{};
            if(selected.choice==='skip'||selected.choice==='cancel'){
                report.decisions.push(issue('audio-not-enrolled',item.path,'A complete reconciliation cannot silently skip this audio file.'));continue;
            }
            const plan=planRecordingIdentity({manifest:audio,audioRelativePath:item.path,fingerprint:item.fingerprint,embedded:item.embedded,choice:selected.choice??null,assignedRecordingId:selected.assignedRecordingId??null});
            if(plan.status!=='ready'){
                const target=plan.status==='blocked'?report.conflicts:report.decisions;
                target.push(issue(plan.code,item.path,plan.validation?.issues?.[0]?.message||'Resolve this recording identity explicitly before applying the inventory.'));continue;
            }
            audio=plan.candidate;
            const id=lower(plan.recordingId);
            if(observedIds.has(id))throw Error('The same Recording ID appears at multiple audio paths.');
            observedIds.set(id,item.path);
            if(!before)report.addAudio.push(item.path);
        }catch(error){report.conflicts.push(issue('audio-conflict',item?.path||null,error.message));}
    }
    for(const entry of audioManifest.recordings){
        if(!audioSeen.has(pathKey(entry.audioRelativePath))){
            if(coverage.audio==='complete'){
                report.missingAudio.push(entry.audioRelativePath);
                report.decisions.push(issue('missing-audio-policy',entry.audioRelativePath,'Audio identity-retention/removal policy requires separate review. Do not silently delete an established Recording ID.'));
            }else report.unobservedAudio.push(entry.audioRelativePath);
        }
    }
    const existingPaths=new Map(transcripts.recordings.flatMap(entry=>entry.transcripts.map(item=>[pathKey(item.relativePath),{entry,item}])));
    for(const item of [...transcriptFiles].sort((a,b)=>String(a.path).localeCompare(String(b.path),'en'))){
        try{
            const key=pathKey(item.path);
            if(transcriptSeen.has(key))throw Error('Transcript paths collide by case or Unicode spelling.');transcriptSeen.add(key);
            if(typeof item.text!=='string')throw Error('The transcript header was not readable.');
            const identity=readTranscriptIdentity(item.text);
            if(!identity.recordingId)throw Error('The transcript has no Recording ID. Filename guessing is not allowed.');
            if(identity.archiveUuid&&lower(identity.archiveUuid)!==lower(transcripts.archiveUuid))throw Error('The transcript belongs to a different Archive UUID.');
            if(identity.audioSourceId&&lower(identity.audioSourceId)!==lower(audio.audioSourceId))throw Error('The transcript requires another Audio Source ID; do not silently relabel it.');
            if(!observedIds.has(lower(identity.recordingId))) {
                report.decisions.push(issue('unresolved-audio',item.path,'Current audio identity is unavailable; obtain its source before claiming a verified association.'));continue;
            }
            if(!identity.archiveUuid||!identity.audioSourceId){
                report.legacyHeaders.push(item.path);
                if(!allowLegacyReferences){report.decisions.push(issue('legacy-association',item.path,'Confirm these legacy references belong to the supplied, already established archive. No UUID is generated or header rewritten.'));continue;}
            }
            const header=transcriptHeader(item.text).text;
            const field=label=>{
                const values=header.split(/\r?\n/).filter(line=>line.startsWith(label+':')).map(line=>line.slice(label.length+1).trim());
                if(values.length!==1||!values[0])throw Error(`The ${label} field is missing or ambiguous.`);return values[0];
            };
            const model=field('Whisper model'),operation=field('Operation');
            if(!['transcribe','translate'].includes(operation))throw Error('Unsupported transcript operation.');
            const before=existingPaths.get(key);
            transcripts=appendTranscriptReference(transcripts,{recordingId:identity.recordingId,filename:item.path,model,operation});
            if(!before)report.addTranscripts.push(item.path);
        }catch(error){report.conflicts.push(issue('transcript-conflict',item?.path||null,error.message));}
    }
    for(const entry of transcriptManifest.recordings){
        for(const item of entry.transcripts){
            if(!transcriptSeen.has(pathKey(item.relativePath))){
                if(coverage.transcripts==='complete')report.missingTranscripts.push(item.relativePath);
                else report.unobservedTranscripts.push(item.relativePath);
            }
        }
    }
    if(report.missingTranscripts.length){
        if(!removeMissingTranscripts)report.decisions.push(issue('missing-transcript-review',null,'Review removal of confirmed-missing transcript references before applying.'));
        else {
            const missing=new Set(report.missingTranscripts.map(pathKey));
            // Keep recording entries/unknown fields even when their last transcript
            // reference is removed. Deleting a TXT is not deleting recording identity.
            for(const entry of transcripts.recordings)entry.transcripts=entry.transcripts.filter(item=>!missing.has(pathKey(item.relativePath)));
        }
    }
    if(coverage.transcripts!=='complete'||coverage.audio!=='complete')report.warnings.push('Partial selection: unobserved entries were retained. This is not a complete archive verification.');
    if(report.conflicts.length)return result('blocked');
    if(report.decisions.length)return result('needs-review');
    const checked=validateAudioSourceManifest(audio);
    if(checked.status!=='valid'){report.conflicts.push(issue('invalid-candidate',null,checked.issues[0].message));return result('blocked');}
    try{transcripts=parseTranscriptArchive(JSON.stringify(transcripts));}catch(error){report.conflicts.push(issue('invalid-candidate',null,error.message));return result('blocked');}
    return result('review-ready',{audioManifest:checked.manifest,transcriptManifest:transcripts,
        audioText:JSON.stringify(checked.manifest,null,2)+'\n',transcriptText:JSON.stringify(transcripts,null,2)+'\n'});
}
