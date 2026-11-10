import { requestWhisperDisposal } from "../js/whisperDisposal.js";
import { createWhisperTestRunner } from "../js/whisperTestLifecycle.js";
const lines=[],assert=(v,m)=>{if(!v)throw new Error(m);};
const test=async(label,fn)=>{await fn();lines.push(`PASS ${label}`);};
const ack=(worker,message,status="completed")=>worker.onmessage?.({data:{type:"disposed",requestId:message.requestId,status}});
function runner(mode="success",disposeMode="ack"){
 const events=[];let terminated=0,released=0,disposed=0;
 const run=createWhisperTestRunner({environment:{operatingSystem:"ios"},acquireActivity:()=>()=>{released++;},loadFixture:async()=>({audioFile:{name:"fixture"},expectedText:"test"}),decode:async()=>new Float32Array([0]),prepareProduction:async()=>{},
 disposeWorker:(worker,options)=>requestWhisperDisposal(worker,{...options,timeoutMs:20}),
 createWorker:()=>({terminate(){terminated++;events.push("terminate");},postMessage(message){
  if(message.type==="dispose"){disposed++;events.push("dispose");if(disposeMode==="ack")ack(this,message);return;}
  if(mode==="stall-inference"&&message.type==="transcribe")return;
  queueMicrotask(()=>this.onmessage?.({data:message.type==="load"?{type:"ready"}:mode==="error"?{type:"error",message:"runtime failed"}:{type:"transcription",text:mode==="bad-output"?"wrong":"test"}}));
 }})});
 return {run:(options={})=>run({configuration:{id:"fixture",family:"tiny",repository:"fixture"},limits:{load:100,inference:100},...options}),events,counts:()=>({terminated,released,disposed})};
}
try{
 await test("Matching acknowledgement required; unrelated messages ignored and handlers restored",async()=>{
  const old=()=>{};const worker={onmessage:old,postMessage(message){ack(this,{requestId:"wrong"});this.onmessage({data:{type:"transcription"}});ack(this,message);}};
  const result=await requestWhisperDisposal(worker,{timeoutMs:50});assert(result.status==="acknowledged"&&worker.onmessage===old,"ack and restoration");
 });
 await test("Timeout resolves; duplicate and late acknowledgement cannot change result",async()=>{
  let late,message;const worker={postMessage(m){message=m;late=this.onmessage;}};
  const result=await requestWhisperDisposal(worker,{timeoutMs:10});late({data:{type:"disposed",requestId:message.requestId,status:"completed"}});
  assert(result.status==="timed-out","deadline retained");
 });
 await test("Cancellation before/during disposal resolves promptly",async()=>{
  for(const pre of [true,false]){const controller=new AbortController();let sent=0;const worker={postMessage(){sent++;controller.abort();}};if(pre)controller.abort();
   const result=await requestWhisperDisposal(worker,{signal:controller.signal,timeoutMs:100});assert(result.status==="cancelled"&&sent===(pre?0:1),"cancel");}
 });
 await test("Post/error/messageerror and unavailable API remain explicit",async()=>{
  for(const mode of ["post","error","messageerror","unavailable"]){const worker={postMessage(message){if(mode==="post")throw new Error("post failed");if(mode==="error")this.onerror({message:"worker failed"});if(mode==="messageerror")this.onmessageerror();if(mode==="unavailable")ack(this,message,"unavailable");}};
   const result=await requestWhisperDisposal(worker,{timeoutMs:50});assert(result.status===(mode==="unavailable"?"unavailable":"failed"),mode);}
 });
 await test("Absolute deadline rejects an acknowledgement delayed by a blocked main thread",async()=>{
  let now=0;const worker={postMessage(message){now=200;ack(this,message);}};
  assert((await requestWhisperDisposal(worker,{timeoutMs:100,clock:()=>now})).status==="timed-out","absolute deadline");
 });
 await test("Completed inference disposes before terminating and preserves PASS",async()=>{
  const f=runner();const result=await f.run();assert(result.passed===1&&result.results[0].disposal.status==="acknowledged","pass with ack");assert(f.events.join()==="dispose,terminate"&&f.counts().released===1,"order and lock release");
 });
 await test("Stalled disposal still terminates once, releases ownership and permits retry",async()=>{
  const f=runner("success","stall");for(let i=0;i<2;i++){const result=await f.run();assert(result.passed===1&&result.results[0].disposal.status==="timed-out"&&result.released===1,"fallback");}assert(f.counts().terminated===2&&f.counts().released===2,"each run released");
 });
 await test("Runtime failure skips graceful disposal; validation failure retains distinct outcomes",async()=>{
  const failed=runner("error");await failed.run();assert(failed.counts().disposed===0&&failed.counts().terminated===1,"busy/failed worker forced termination");
  const bad=runner("bad-output");const result=await bad.run();assert(result.failed===1&&result.results[0].transcriptionStatus==="passed"&&result.results[0].disposal.status==="acknowledged","accuracy independent");
 });
 await test("Cancelled and timed-out active inference force termination without concurrent disposal",async()=>{
  const controller=new AbortController(),cancelled=runner();
  const cancelledResult=await cancelled.run({signal:controller.signal,onEvent:event=>{if(event.type==="stage-start"&&event.phase==="inference")controller.abort();}});
  assert(cancelledResult.cancelled===1&&cancelled.counts().disposed===0&&cancelled.counts().terminated===1,"cancel forced");
  const stalled=runner("stall-inference");const timed=await stalled.run();
  assert(timed.timedOut===1&&stalled.counts().disposed===0&&stalled.counts().terminated===1,"timeout forced");
 });
 for(const [file,ios] of [["whisper-ios-worker.js",true],["whisper-desktop-worker.js",false]]){
  await test(`${file} acknowledges actual dispose completion/error/unavailable without changing load options`,async()=>{
   for(const mode of ["complete","throw","unavailable"]){
    let source=await(await fetch(`../js/${file}`)).text();
    source = source.replace('"./whisperFailures.js"', JSON.stringify(new URL("../js/whisperFailures.js", import.meta.url).href));
            source=source.replace('"./whisperDiagnostics.js"',JSON.stringify(new URL("../js/whisperDiagnostics.js",import.meta.url).href));
    source=source.replace(/await import\(\s*"https:[^"]+"\s*\)/g,"({pipeline:globalThis.__pipeline})").replace(/import \{ pipeline \} from\s*"https:[^"]+";/,"const pipeline=globalThis.__pipeline;");
    const prelude=`globalThis.__pipeline=async()=>{const fn=async()=>({text:"test"});fn.model={sessions:{}};${mode==="unavailable"?"":`fn.dispose=async()=>{self.postMessage({type:"dispose-entered"});await new Promise(r=>setTimeout(r,10));${mode==="throw"?'throw new Error("release failed");':''}};`}return fn;};\n`;
    const url=URL.createObjectURL(new Blob([prelude,source],{type:"text/javascript"})),worker=new Worker(url,{type:"module"});
    try{const observations=await new Promise((resolve,reject)=>{let entered=false;const timeout=setTimeout(()=>reject(new Error("worker fixture timeout")),2000);
      worker.onerror=event=>{clearTimeout(timeout);reject(new Error(event.message));};
      worker.onmessage=event=>{const m=event.data;if(m.type==="dispose-entered")entered=true;if(m.type==="ready"||m.type==="loaded")worker.postMessage({type:"dispose",requestId:"fixture-id"});if(m.type==="disposed"){clearTimeout(timeout);resolve({reply:m,entered});}};
      worker.postMessage({type:"load",model:"fixture",repository:"fixture",dtype:"q4"});});
     assert(observations.reply.requestId==="fixture-id"&&observations.reply.status===(mode==="complete"?"completed":mode==="throw"?"failed":"unavailable"),"correct acknowledgement");
     assert(mode==="unavailable"?!observations.entered:observations.entered,"API actually invoked");
    }finally{worker.terminate();URL.revokeObjectURL(url);}
   }
  });
 }
 document.body.dataset.result="passed";lines.push("ALL TESTS PASSED");
}catch(error){document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
document.getElementById("results").textContent=lines.join("\n");
