import {planArchiveReconciliation as plan} from './reconcile.js';
import {makeScenario,inspectAudio,blobFor,idFor,transcriptFor,transcriptPath,audioPath,SOURCE,ARCHIVE,FOREIGN} from './fixtures.js';
const clone=value=>structuredClone(value);
const assert=(value,message='Assertion failed')=>{if(!value)throw Error(message);};
const equal=(a,b,message='Values differ')=>assert(JSON.stringify(a)===JSON.stringify(b),message);
const refs=manifest=>manifest.recordings.flatMap(item=>item.transcripts);
async function rejects(work,contains){try{await work();}catch(error){assert(!contains||error.message.includes(contains),error.message);return error;}throw Error('Expected failure');}
export async function runChecks(onProgress=()=>{}){
    const lines=[],failures=[];let skipped=0;
    async function test(name,work){try{await work();lines.push('PASS '+name);}catch(error){failures.push(name);lines.push('FAIL '+name+': '+(error.stack||error));}onProgress(lines.at(-1));}
    const base=await makeScenario();
    await test('Whole archive: 120 audio files and 120 transcripts replace a one-entry inventory',()=>{
        const result=plan(base);assert(result.canApply);equal(result.candidate.audioManifest.recordings.length,120);equal(refs(result.candidate.transcriptManifest).length,120);
        equal(result.report.addAudio.length,119);equal(result.report.addTranscripts.length,120);equal(result.report.missingTranscripts,['deleted-test-tiny.txt']);
    });
    await test('Planning neither changes input JSON nor rewrites any transcript body',()=>{
        const before=JSON.stringify(base);plan(base);equal(JSON.stringify(base),before);
    });
    await test('Second reconciliation is idempotent and preserves archive/source UUIDs',()=>{
        const first=plan(base),second=plan({...base,...first.candidate});assert(second.canApply);
        equal(second.report.addAudio,[]);equal(second.report.addTranscripts,[]);equal(second.report.missingTranscripts,[]);
        equal(second.candidate.audioText,first.candidate.audioText);equal(second.candidate.transcriptText,first.candidate.transcriptText);
        equal(second.candidate.audioManifest.audioSourceId,SOURCE);equal(second.candidate.transcriptManifest.archiveUuid,ARCHIVE);
    });
    await test('Unknown root and recording extension data survive reconciliation',()=>{
        const result=plan(base);equal(result.candidate.audioManifest.extensions,{keep:'source extension'});equal(result.candidate.transcriptManifest.extensions,{keep:'archive extension'});
        equal(result.candidate.audioManifest.recordings.find(item=>item.recordingId===idFor(120)).note,'retain recording extension');
        equal(result.candidate.transcriptManifest.recordings.find(item=>item.recordingId===idFor(120)).note,'retain archive recording extension');
    });
    await test('Legacy headers require explicit archive-association review; no new UUID or header rewrite',()=>{
        const input=clone(base);input.transcriptFiles=input.transcriptFiles.map((item,index)=>({...item,text:transcriptFor(index+1,{legacy:true})}));
        const blocked=plan(input);equal(blocked.status,'needs-review');equal(blocked.candidate,null);equal(blocked.report.legacyHeaders.length,120);
        const before=JSON.stringify(input),accepted=plan({...input,allowLegacyReferences:true});assert(accepted.canApply);equal(refs(accepted.candidate.transcriptManifest).length,120);equal(JSON.stringify(input),before);
    });
    await test('Confirmed-missing transcript references require removal review',()=>{
        const result=plan({...base,removeMissingTranscripts:false});equal(result.status,'needs-review');equal(result.candidate,null);assert(result.report.decisions.some(item=>item.code==='missing-transcript-review'));
    });
    await test('Partial mobile selection never removes unobserved audio or transcript entries',()=>{
        const input={...base,audioFiles:base.audioFiles.slice(-1),transcriptFiles:base.transcriptFiles.slice(-1),coverage:{audio:'partial',transcripts:'partial'}};
        const result=plan(input);assert(result.canApply);equal(result.report.missingTranscripts,[]);equal(result.report.unobservedTranscripts,['deleted-test-tiny.txt']);
        assert(refs(result.candidate.transcriptManifest).some(item=>item.relativePath==='deleted-test-tiny.txt'));equal(result.candidate.audioManifest.recordings.length,1);assert(result.report.warnings.length);
    });
    await test('Unselected known audio identities are retained under partial coverage',()=>{
        const ready=plan(base),result=plan({...base,...ready.candidate,audioFiles:base.audioFiles.slice(0,1),transcriptFiles:base.transcriptFiles.slice(0,1),coverage:{audio:'partial',transcripts:'partial'}});
        assert(result.canApply);equal(result.candidate.audioManifest.recordings.length,120);equal(refs(result.candidate.transcriptManifest).length,120);equal(result.report.unobservedAudio.length,119);
    });
    await test('Permission/read/provider errors block application instead of proving deletion',()=>{
        const result=plan({...base,transcriptFiles:[],errors:[{path:'transcription',message:'Provider unavailable'}]});equal(result.status,'blocked');equal(result.candidate,null);
    });
    await test('Foreign Archive UUID blocks without retargeting transcripts',()=>{
        const input=clone(base);input.transcriptFiles[0].text=transcriptFor(1,{archiveUuid:FOREIGN});const result=plan(input);equal(result.status,'blocked');assert(result.report.conflicts.some(item=>item.message.includes('different Archive UUID')));
    });
    await test('Foreign Audio Source ID requires another source association',()=>{
        const input=clone(base);input.transcriptFiles[0].text=transcriptFor(1,{audioSourceId:FOREIGN});equal(plan(input).status,'blocked');
    });
    await test('A reused transcript filename cannot silently change its Recording ID',()=>{
        const input=clone(base);input.transcriptManifest.recordings[0].transcripts[0].relativePath=transcriptPath(1);equal(plan(input).status,'blocked');
    });
    await test('Case/Unicode-ambiguous paths and unsafe inventory paths are rejected',()=>{
        for(const path of ['../memo.wav','/memo.wav','a\\b.wav']){const input=clone(base);input.audioFiles[0].path=path;equal(plan(input).status,'blocked');}
        const input=clone(base);input.transcriptFiles.push({...input.transcriptFiles[0],path:input.transcriptFiles[0].path.toUpperCase()});equal(plan(input).status,'blocked');
    });
    await test('Conflicting legacy/universal labels block; body UUID markers are ignored',()=>{
        const input=clone(base);input.transcriptFiles[0].text=input.transcriptFiles[0].text.replace('Whisper model:',`Voice Memo ID: ${FOREIGN}\nWhisper model:`);equal(plan(input).status,'blocked');
        input.transcriptFiles[0].text=transcriptFor(1)+'\nRecording ID: '+FOREIGN;assert(plan(input).canApply);
    });
    await test('Deleting a last transcript reference retains audio identity and archive record',()=>{
        const ready=plan(base),input={...base,...ready.candidate,transcriptFiles:base.transcriptFiles.slice(0,-1)};const result=plan(input);assert(result.canApply);
        equal(result.candidate.audioManifest.recordings.length,120);equal(result.candidate.transcriptManifest.recordings.find(item=>item.recordingId===idFor(120)).transcripts,[]);
    });
    await test('Missing audio requires a retention-policy decision, never automatic ID deletion',()=>{
        const result=plan({...base,audioFiles:base.audioFiles.slice(0,-1),transcriptFiles:base.transcriptFiles.slice(0,-1)});equal(result.status,'needs-review');assert(result.report.decisions.some(item=>item.code==='missing-audio-policy'));equal(result.candidate,null);
    });
    await test('No embedded ID requests a supplied reserved assignment and reuses it on retry',async()=>{
        const input=clone(base);input.audioFiles[0]=await inspectAudio(blobFor(1,{noId:true}),audioPath(1));equal(plan(input).status,'needs-review');
        const choices={[audioPath(1)]:{choice:'assign-new',assignedRecordingId:idFor(1)}};
        const a=plan({...input,audioChoices:choices}),b=plan({...input,audioChoices:choices});assert(a.canApply);equal(a.candidate.audioText,b.candidate.audioText);
    });
    await test('Changed catalogued audio requires keep/new confirmation',async()=>{
        const input=clone(base);input.audioFiles[119]=await inspectAudio(blobFor(120,{noId:true}),audioPath(120));equal(plan(input).status,'needs-review');
        const result=plan({...input,audioChoices:{[audioPath(120)]:{choice:'keep-existing'}}});assert(result.canApply);equal(result.candidate.audioManifest.recordings.find(item=>item.audioRelativePath===audioPath(120)).recordingId,idFor(120));
    });
    await test('Duplicate audio IDs block and skipped recordings cannot masquerade as a full inventory',()=>{
        const input=clone(base);input.audioFiles.push({...input.audioFiles[0],path:'copied.wav'});equal(plan(input).status,'blocked');
        equal(plan({...base,audioChoices:{[audioPath(1)]:{choice:'skip'}}}).status,'needs-review');
    });
    await test('Lower-model and translation transcripts are retained independently',()=>{
        const input=clone(base);input.transcriptFiles.push({path:'memo-001-large.txt',text:transcriptFor(1,{model:'large'})},{path:'memo-001-translation.txt',text:transcriptFor(1,{operation:'translate'})});
        const result=plan(input);assert(result.canApply);const group=result.candidate.transcriptManifest.recordings.find(item=>item.recordingId===idFor(1));equal(group.transcripts.length,3);assert(group.transcripts.some(item=>item.model==='large'));assert(group.transcripts.some(item=>item.operation==='translate'));
    });
    await test('Invalid/unsupported manifests never generate replacement archive/source identities',()=>{
        const input=clone(base);input.audioManifest.schemaVersion=2;equal(plan(input).status,'blocked');input.audioManifest.schemaVersion=1;input.transcriptManifest.archiveUuid='invalid';equal(plan(input).candidate,null);
    });
    if(globalThis.navigator?.storage?.getDirectory){
        const {createDisposableArchive}=await import('./disposable.js');
        await test('Native disposable folder: apply both JSONs, read back and leave audio/TXT bytes unchanged',async()=>{
            const fixture=await createDisposableArchive();try{const before=await fixture.scan(),review=await fixture.preview({removeMissingTranscripts:true});assert(review.plan.canApply);equal((await fixture.apply(review)).completedWrites,['audio','transcripts']);const after=await fixture.scan();equal(after.audioManifest.recordings.length,3);equal(refs(after.transcriptManifest).length,3);equal(after.audioFiles.map(item=>item.fingerprint),before.audioFiles.map(item=>item.fingerprint));equal(after.transcriptFiles.map(item=>item.fingerprint),before.transcriptFiles.map(item=>item.fingerprint));assert((await fixture.preview()).plan.canApply);}finally{await fixture.cleanup();}
        });
        await test('Native deleted-TXT refresh removes its reference while keeping audio and recording ID',async()=>{
            const fixture=await createDisposableArchive();try{await fixture.apply(await fixture.preview({removeMissingTranscripts:true}));await fixture.transcriptFolder.removeEntry(transcriptPath(3));const review=await fixture.preview({removeMissingTranscripts:true});equal(review.plan.report.missingTranscripts,[transcriptPath(3)]);await fixture.apply(review);const after=await fixture.scan();equal(after.audioManifest.recordings.length,3);equal(after.transcriptManifest.recordings.find(item=>item.recordingId===idFor(3)).transcripts,[]);}finally{await fixture.cleanup();}
        });
        await test('Native post-preview transcript content change blocks all JSON writes',async()=>{
            const fixture=await createDisposableArchive();try{const before=await fixture.scan(),review=await fixture.preview({removeMissingTranscripts:true});const stream=await(await fixture.transcriptFolder.getFileHandle(transcriptPath(1))).createWritable();await stream.write(transcriptFor(1)+'changed');await stream.close();await rejects(()=>fixture.apply(review),'changed after preview');const after=await fixture.scan();equal(after.audioText,before.audioText);equal(after.transcriptText,before.transcriptText);}finally{await fixture.cleanup();}
        });
        await test('Native concurrent JSON replacement is preserved and not overwritten',async()=>{
            const fixture=await createDisposableArchive();try{const before=await fixture.scan(),review=await fixture.preview({removeMissingTranscripts:true});const outside=JSON.stringify({...before.transcriptManifest,archiveName:'Changed elsewhere'});const stream=await(await fixture.transcriptFolder.getFileHandle('memora-archive.json')).createWritable();await stream.write(outside);await stream.close();await rejects(()=>fixture.apply(review),'changed after preview');equal((await fixture.scan()).transcriptText,outside);equal((await fixture.scan()).audioText,before.audioText);}finally{await fixture.cleanup();}
        });
        await test('Native two-JSON interruption reports partial completion; re-preview retries with stable IDs',async()=>{
            let fail=true;const fixture=await createDisposableArchive({beforeWrite:kind=>{if(kind==='transcripts'&&fail)throw new DOMException('Injected quota failure','QuotaExceededError');}});
            try{const review=await fixture.preview({removeMissingTranscripts:true});const error=await rejects(()=>fixture.apply(review),'did not complete');equal(error.completedWrites,['audio']);const partial=await fixture.scan();equal(partial.audioManifest.recordings.length,3);equal(refs(partial.transcriptManifest).length,1);fail=false;await fixture.apply(await fixture.preview({removeMissingTranscripts:true}));const after=await fixture.scan();equal(after.audioManifest.audioSourceId,SOURCE);equal(after.transcriptManifest.archiveUuid,ARCHIVE);equal(refs(after.transcriptManifest).length,3);}finally{await fixture.cleanup();}
        });
        await test('Native candidate tampering or unreviewed plan cannot write either JSON',async()=>{
            const fixture=await createDisposableArchive();try{const before=await fixture.scan();await rejects(()=>fixture.apply({plan:{canApply:true}}));const review=await fixture.preview({removeMissingTranscripts:true});review.plan.candidate.audioText='{}';await rejects(()=>fixture.apply(review),'candidate changed');equal((await fixture.scan()).audioText,before.audioText);}finally{await fixture.cleanup();}
        });
    }else{skipped=6;lines.push('SKIP 6 native browser-private filesystem groups (browser required).');}
    return {passed:lines.filter(line=>line.startsWith('PASS ')).length,failed:failures,skipped,output:lines.join('\n')};
}
