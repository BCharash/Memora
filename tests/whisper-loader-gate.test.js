import { loadTranscriber, loadTranscriberConfiguration, releaseTranscriber } from "../js/whisper.js";
import { setAllowed } from "./whisper-loader-gate-fixture.js";
const lines=[],assert=(v,m)=>{if(!v)throw new Error(m);};
let workers=0, messages=[];const original=window.Worker;
window.Worker=class{constructor(){workers++;}postMessage(message){messages.push(message);queueMicrotask(()=>this.onmessage({data:{type:"loaded",model:message.model}}));}terminate(){}};
try{
 let denied=false;try{await loadTranscriber("tiny");}catch{denied=true;}
 assert(denied&&workers===0,"unqualified load creates no worker");lines.push("PASS eligibility guard precedes worker creation");
 setAllowed(true);await loadTranscriber("medium");
 assert(messages[0].model==="medium-webgpu-q4"&&messages[0].dtype==="q4","default canonical config");
 await releaseTranscriber();
 await loadTranscriberConfiguration({id:"medium-webgpu-q4",repository:"untrusted override",configuration:{dtype:"fp32"}});
 assert(messages[1].repository==="Xenova/whisper-medium"&&messages[1].dtype==="q4","override ignored");lines.push("PASS canonical identity and dtype cannot be overridden through eligibility bypass");
 document.body.dataset.result="passed";lines.push("ALL TESTS PASSED");
}catch(error){document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
finally{await releaseTranscriber();window.Worker=original;}
document.getElementById("results").textContent=lines.join("\n");
