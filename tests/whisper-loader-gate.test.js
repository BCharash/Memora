import { loadTranscriber, loadTranscriberConfiguration, releaseTranscriber } from "../js/whisper.js";
import { setAllowed } from "./whisper-loader-gate-fixture.js";
const lines=[],assert=(v,m)=>{if(!v)throw new Error(m);};
let fault=null;
let workers=0, terminations=0, messages=[];const original=window.Worker;
window.Worker=class{constructor(path){workers++;this.ios=String(path).includes("ios");}postMessage(message){messages.push(message);if(fault?.phase===message.type&&fault.kind==="post")throw new DOMException("injected posting failure","DataCloneError");queueMicrotask(()=>{if(fault?.phase===message.type){if(fault.kind==="event")this.onerror({message:"injected worker event"});else this.onmessage({data:{type:"error",message:"injected worker reply"}});return;}this.onmessage({data:message.type==="load"?{type:this.ios?"ready":"loaded",model:message.model}:{type:"transcription",text:"fixture",workerInferenceMs:1}});});}terminate(){terminations++;}};
try{
 let denied=false;try{await loadTranscriber("tiny");}catch(error){denied=error.whisperFailure?.category==="eligibility-check";}
 assert(denied&&workers===0,"unqualified load creates no worker");lines.push("PASS eligibility guard precedes worker creation");
 setAllowed(true);await loadTranscriber("medium");
 assert(messages[0].model==="medium-webgpu-q4"&&messages[0].dtype==="q4","default canonical config");
 await releaseTranscriber();
 await loadTranscriberConfiguration({id:"medium-webgpu-q4",repository:"untrusted override",configuration:{dtype:"fp32"}});
 assert(messages[1].repository==="Xenova/whisper-medium"&&messages[1].dtype==="q4","override ignored");lines.push("PASS canonical identity and dtype cannot be overridden through eligibility bypass");
 await releaseTranscriber();
 for(const ios of [false,true]){
  let source=await(await fetch("../js/whisper.js")).text();
  source=source.replace('import { isIOS } from "./runtime.js";',`const isIOS = ${ios};`);
  source=source.replace('"./whisperProductionEligibility.js"',JSON.stringify(new URL("./whisper-loader-gate-fixture.js",import.meta.url).href));
  source=source.replace(/from "\.\/([^"\n]+)"/g,(_,file)=>`from ${JSON.stringify(new URL("../js/"+file,import.meta.url).href)}`);
  const url=URL.createObjectURL(new Blob([source],{type:"text/javascript"}));const loader=await import(url);
  const beforeWorkers=workers,beforeMessages=messages.length,beforeTerminations=terminations;
  try{
   await loader.loadTranscriber("tiny");await loader.loadTranscriber("tiny");
   assert(workers===beforeWorkers+1&&messages.length===beforeMessages+1&&loader.getWhisperLoadDiagnostics().reused,"same model reuses worker");
   const result=await loader.transcribeAudio(new Float32Array([0]),{language:"en",task:"translate"});
   const request=messages.at(-1);assert(result.text==="fixture","worker result retained");
   assert(ios?request.audioData&&request.language==="en":request.audio&&request.options.language==="en"&&request.options.task==="translate","platform messages retained");
   await loader.releaseTranscriber();await loader.releaseTranscriber();assert(terminations===beforeTerminations+1,"release exactly once");
   let refused=false;try{await loader.transcribeAudio(new Float32Array([0]));}catch{refused=true;}assert(refused,"unloaded transcription rejected");
   lines.push(`PASS ${ios?"iOS":"desktop"} worker reuse, transcription messages and idempotent release`);
   for(const kind of ["reply","event","post"]){
    fault={phase:"load",kind};let loadError;
    try{await loader.loadTranscriber("tiny");}catch(error){loadError=error;}
    assert(loadError?.whisperFailure.stage==="load"&&loadError.whisperFailure.configurationId==="tiny-webgpu-default","failed load preserves canonical identity");
    assert(loadError.whisperFailure.source===(kind==="post"?"loader":`worker-${kind}`)&&loadError.whisperFailure.certainty==="unknown","failed load preserves origin without guessing cause");
    fault=null;await loader.loadTranscriber("tiny");fault={phase:"transcribe",kind};let inferenceError;
    try{await loader.transcribeAudio(new Float32Array([0]));}catch(error){inferenceError=error;}
    assert(inferenceError?.whisperFailure.stage==="inference"&&inferenceError.whisperFailure.configurationId==="tiny-webgpu-default","inference preserves exact identity");
    assert(inferenceError.whisperFailure.source===(kind==="post"?"loader":`worker-${kind}`),"inference source retained");
    fault=null;await loader.releaseTranscriber();
   }
   lines.push(`PASS ${ios?"iOS":"desktop"} load/inference reply, event and posting failure classification`);
  }finally{fault=null;await loader.releaseTranscriber();URL.revokeObjectURL(url);}
 }
 document.body.dataset.result="passed";lines.push("ALL TESTS PASSED");
}catch(error){document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
finally{await releaseTranscriber();window.Worker=original;}
document.getElementById("results").textContent=lines.join("\n");
