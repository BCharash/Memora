import {runChecks} from './checks.js';
import {makeScenario,transcriptFor,FOREIGN} from './fixtures.js';
import {planArchiveReconciliation} from './reconcile.js';
import {createDisposableArchive} from './disposable.js';
const element=id=>document.getElementById(id);
let scenario;
try{
    const result=await runChecks(line=>{element('results').textContent+='\n'+line;});
    element('results').textContent=result.output;
    element('testStatus').textContent=`${result.passed}/${result.passed+result.failed.length} groups passed${result.skipped?`; ${result.skipped} native browser groups skipped`:''}.`;
    document.body.dataset.testStatus=result.failed.length?'failed':'passed';
    if(location.search.includes('report=1'))await fetch('/_reconciliation-result',{method:'POST',body:JSON.stringify(result)});
    scenario=await makeScenario();element('previewButton').disabled=false;
    element('nativeButton').disabled=!navigator.storage?.getDirectory;
    if(element('nativeButton').disabled)element('nativeStatus').textContent='Native write test unavailable in this browser/context. Pure previews remain available.';
}catch(error){
    element('testStatus').textContent='Lab failed: '+error.message;
    if(location.search.includes('report=1'))await fetch('/_reconciliation-result',{method:'POST',body:JSON.stringify({passed:0,failed:[error.message],skipped:0,output:error.stack||error.message})});
}
function preview(){
    const input=structuredClone(scenario),kind=element('scenario').value;
    input.removeMissingTranscripts=element('removeMissing').checked;input.allowLegacyReferences=element('allowLegacy').checked;
    if(kind==='partial'){input.audioFiles=input.audioFiles.slice(-1);input.transcriptFiles=input.transcriptFiles.slice(-1);input.coverage={audio:'partial',transcripts:'partial'};}
    if(kind==='legacy')input.transcriptFiles=input.transcriptFiles.map((item,index)=>({...item,text:transcriptFor(index+1,{legacy:true})}));
    if(kind==='conflict')input.transcriptFiles[0].text=transcriptFor(1,{archiveUuid:FOREIGN});
    const result=planArchiveReconciliation(input);
    element('previewStatus').textContent=result.status==='review-ready'?'Candidate ready for review — no files changed.':result.status==='blocked'?'Blocked by conflicts — no candidate may be applied.':'Review the listed decisions before an update can be prepared.';
    const sourceCount=result.candidate?.audioManifest.recordings.length;
    const referenceCount=result.candidate?.transcriptManifest.recordings.reduce((sum,item)=>sum+item.transcripts.length,0);
    element('summary').textContent=[`Observed audio files: ${input.audioFiles.length}`,`Observed transcript files: ${input.transcriptFiles.length}`,`Coverage: audio ${result.coverage.audio}; transcripts ${result.coverage.transcripts}`,`New audio entries: ${result.report.addAudio.length}`,`New transcript references: ${result.report.addTranscripts.length}`,`Confirmed missing transcript references: ${result.report.missingTranscripts.length}`,`Unobserved transcript references retained: ${result.report.unobservedTranscripts.length}`,`Proposed source entries: ${sourceCount??'not available'}`,`Proposed transcript references: ${referenceCount??'not available'}`].join('\n');
    element('findings').textContent=JSON.stringify(result.report,null,2);
    element('audioCandidate').textContent=result.candidate?.audioText||'No candidate until conflicts/decisions are resolved.';
    element('transcriptCandidate').textContent=result.candidate?.transcriptText||'No candidate until conflicts/decisions are resolved.';
}
element('previewButton').addEventListener('click',preview);
for(const id of ['scenario','removeMissing','allowLegacy'])element(id).addEventListener('change',()=>{if(scenario)preview();});
element('nativeButton').addEventListener('click',async()=>{
    element('nativeButton').disabled=true;let fixture;
    try{fixture=await createDisposableArchive();const before=await fixture.scan(),review=await fixture.preview({removeMissingTranscripts:true});const saved=await fixture.apply(review),after=await fixture.scan();
        const unchanged=JSON.stringify(before.audioFiles.map(item=>item.fingerprint))===JSON.stringify(after.audioFiles.map(item=>item.fingerprint))&&JSON.stringify(before.transcriptFiles.map(item=>item.fingerprint))===JSON.stringify(after.transcriptFiles.map(item=>item.fingerprint));
        if(!unchanged)throw Error('Synthetic file bytes changed.');
        element('nativeStatus').textContent=`${saved.status}: source entries ${after.audioManifest.recordings.length}; transcript references ${after.transcriptManifest.recordings.reduce((sum,item)=>sum+item.transcripts.length,0)}. Audio and transcript bytes unchanged.`;
    }catch(error){element('nativeStatus').textContent='Test failed: '+error.message;}
    finally{if(fixture){try{await fixture.cleanup();element('nativeStatus').textContent+=' Disposable folder removed.';}catch(error){element('nativeStatus').textContent+=' Fixture cleanup failed: '+error.message;}}element('nativeButton').disabled=false;}
});
