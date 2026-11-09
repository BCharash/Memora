import { createRuntimeDiagnostics } from "../js/runtimeDiagnostics.js";
import { createWhisperTestRunner } from "../js/whisperTestLifecycle.js";
const lines=[],assert=(v,m)=>{if(!v)throw new Error(m);};
const test=async(label,fn)=>{await fn();lines.push(`PASS ${label}`);};
const memory=()=>{const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const prefix="memora-test-runtime.";
const persistent={get length(){return Object.keys(localStorage).filter(k=>k.startsWith(prefix)).length;},key:i=>Object.keys(localStorage).filter(k=>k.startsWith(prefix))[i]?.slice(prefix.length),getItem:k=>localStorage.getItem(prefix+k),setItem:(k,v)=>localStorage.setItem(prefix+k,v),removeItem:k=>localStorage.removeItem(prefix+k)};
function fixtureRun(diagnostic){
 return createWhisperTestRunner({diagnostic,environment:{operatingSystem:"macos"},acquireActivity:()=>()=>{},loadFixture:async()=>({audioFile:{name:"fixture"},expectedText:"test"}),decode:async()=>new Float32Array([0]),prepareProduction:async()=>{},createWorker:()=>({postMessage(message){queueMicrotask(()=>this.onmessage?.({data:message.type==="load"?{type:"loaded"}:{type:"transcription",text:"test"}}));},terminate(){}})})({configuration:{id:"fixture",family:"tiny",repository:"fixture"}});
}
try{
 if(!new URL(location.href).searchParams.has("recover")){
  const first=createRuntimeDiagnostics({storage:persistent,pageId:"before-reload"});first.record("test-stage",{phase:"inference",attemptId:"fixture"});location.replace(location.href+"?recover=1");
 }else{
 await test("Real page navigation retains previous page identity/stage and records new instance",async()=>{
  const second=createRuntimeDiagnostics({storage:persistent,pageId:"after-reload",navigation:{type:"reload"}});
  const report=second.snapshot("before-reload");assert(report.currentPageId!==report.attemptPageId&&report.attemptPageAvailable,"different instances");
  assert(report.pages.some(p=>p.pageId==="before-reload"&&p.events.some(e=>e.phase==="inference")),"prior stage retained");
  const keys=Array.from({length:persistent.length},(_,i)=>persistent.key(i));for(const key of keys)persistent.removeItem(key);
 });
 await test("Events/pages bounded and unrelated storage preserved",()=>{
  const storage=memory();storage.setItem("unrelated","keep");
  for(let i=0;i<9;i++){const log=createRuntimeDiagnostics({storage,pageId:`page-${i}`,now:()=>new Date(i*1000).toISOString()});for(let j=0;j<110;j++)log.record("fixture",{index:j});}
  assert(storage.length===7,"six page keys plus unrelated");const log=createRuntimeDiagnostics({storage,pageId:"last",now:()=>new Date(99999).toISOString()});
  assert(log.snapshot().pages.every(p=>p.events.length<=100)&&storage.getItem("unrelated")==="keep","bounded events");
 });
 await test("Unavailable or full diagnostic storage never throws; report states limitation",()=>{
  const storage=memory();storage.setItem=()=>{throw new Error("quota");};const log=createRuntimeDiagnostics({storage});log.record("fixture");
  assert(log.snapshot().persistenceError.includes("quota"),"error visible");assert(log.snapshot().pages.length===1,"in-memory evidence available");
 });
 await test("Fresh exports include later events without mutating earlier snapshots",()=>{
  const log=createRuntimeDiagnostics({storage:memory()}),before=log.snapshot();log.record("settings-closed",{reason:"settings-button"});const after=log.snapshot();
  assert(before.pages[0].events.length+1===after.pages[0].events.length,"fresh snapshot");
 });
 await test("Actual navigation code reports open/close reasons without generating a page restart",async()=>{
  const source=await(await fetch("../js/app.js")).text();
  const start=source.indexOf("    let activePrimaryTab = transcriptionTab;");const end=source.indexOf("\n}\n\n\n// --------------------------------------------------\n// Settings",start);
  assert(start>=0&&end>start,"navigation block found");
  const host=document.getElementById("fixture");host.innerHTML='<button id="ft">Transcription</button><button id="fc">Combine</button><button id="fs">Search</button><button id="fb">Settings</button><div id="fp" hidden></div><div id="fa"></div><div id="pt"></div><div id="pc"></div><div id="ps"></div>';
  const ids=["ft","fc","fs","fb","fp","fa"].map(id=>document.getElementById(id));const events=[];
  const config=Object.fromEntries(["t","c","s"].map((id,i)=>[id,{tab:ids[i],panel:document.getElementById("p"+id)}]));
  new Function("transcriptionTab","combineTab","searchTab","settingsButton","settingsPanel","appTabs","tabConfig","appIcon","settingsUI","recordRuntimeDiagnostic",source.slice(start,end))(...ids,config,null,{refresh(){}},(type,details)=>events.push({type,...details}));
  ids[3].click();await Promise.resolve();ids[3].click();await Promise.resolve();ids[3].click();ids[0].click();await Promise.resolve();
  assert(events.some(e=>e.type==="settings-closed"&&e.reason==="settings-button")&&events.some(e=>e.type==="settings-closed"&&e.reason==="transcription-tab"),"specific reasons");
  assert(events.some(e=>e.type==="settings-visibility"),"visibility observed");
 });
 await test("Worker lifecycle trace orders creation, inference, termination and outcome",async()=>{
  const events=[];const result=await fixtureRun((type,details)=>events.push({type,...details}));const types=events.map(e=>e.type);
  assert(result.passed===1,"pass");assert(types.indexOf("test-worker-create-requested")<types.indexOf("test-worker-created"),"creation ordered");
  assert(types.indexOf("test-worker-terminate-requested")<types.indexOf("test-worker-termination-invoked")&&types.at(-1)==="test-finished","cleanup ordered");
  assert(events.some(e=>e.type==="test-stage"&&e.phase==="inference"),"stage");
 });
 await test("Throwing diagnostic hook cannot change inference or cleanup result",async()=>{
  const result=await fixtureRun(()=>{throw new Error("diagnostic error");});assert(result.passed===1&&result.released===1,"behavior unchanged");
 });
 document.body.dataset.result="passed";lines.push("ALL TESTS PASSED");
 }
}catch(error){document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
document.getElementById("results").textContent=lines.join("\n");
