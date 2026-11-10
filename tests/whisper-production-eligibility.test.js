import { createWhisperProductionGate } from "../js/whisperProductionEligibility.js";
const lines=[],assert=(v,m)=>{if(!v)throw new Error(m);};
const test=async(label,fn)=>{await fn();lines.push(`PASS ${label}`);};
const states=new Map();let failing=false;
const gate=os=>createWhisperProductionGate({environment:{operatingSystem:os},contextFor:async d=>({id:d.id}),bridge:{productionEvidenceRevision:1,sync:async()=>{if(failing)throw new Error("storage unavailable");},get:c=>({status:states.get(c.id)||"unverified",reason:"fixture"})}});
try{
 await test("No evidence yields empty production choices; all nonqualified states are refused",async()=>{
  const mac=gate("macos");assert((await mac.list()).length===0,"empty");
  for(const state of ["unverified","needs-validation","suspended","blocked"]){states.set("tiny-webgpu-default",state);let denied=false;try{await mac.requireEligible("tiny");}catch{denied=true;}assert(denied,state);}
 });
 await test("Qualified defaults appear; hold removes them; recovery restores them",async()=>{
  const mac=gate("macos");states.set("tiny-webgpu-default","eligible");assert((await mac.list()).map(d=>d.family).join()==="tiny","qualified");
  states.set("tiny-webgpu-default","suspended");assert((await mac.list()).length===0,"withheld");
  states.set("tiny-webgpu-default","eligible");assert((await mac.requireEligible("tiny")).id==="tiny-webgpu-default","restored");
 });
 await test("Medium production maps to desktop q4 and iOS runtime default without cross-platform borrowing",async()=>{
  const mac=gate("macos"),ios=gate("ios");states.set("medium-webgpu-q4","eligible");
  assert((await mac.requireEligible("medium")).loader.dtype==="q4","q4");let denied=false;try{await ios.requireEligible("medium");}catch{denied=true;}assert(denied,"no borrowed evidence");
  states.set("medium-iphone-default","eligible");assert((await ios.requireEligible("medium")).loader.dtype===null,"iOS omitted dtype");
  denied=false;try{await ios.requireEligible("medium-webgpu-q4");}catch{denied=true;}assert(denied,"wrong platform exact ID");
 });
 await test("Passing alternative variant never qualifies a different family default",async()=>{
  states.set("medium-webgpu-q4","blocked");states.set("medium-webgpu-q4f16","eligible");
  assert(!(await gate("macos").list()).some(d=>d.family==="medium"),"default withheld");
  assert((await gate("macos").requireEligible("medium-webgpu-q4f16")).id==="medium-webgpu-q4f16","exact configuration only");
 });
 await test("Android/unknown and unknown IDs do not fall back to Tiny",async()=>{
  for(const os of ["android","unknown"]){assert((await gate(os).list()).length===0,"no defaults");let denied=false;try{await gate(os).requireEligible("tiny");}catch{denied=true;}assert(denied,"unsupported");}
  let denied=false;try{await gate("macos").requireEligible("typo");}catch{denied=true;}assert(denied,"unknown");
 });
 await test("Storage failure refuses listing and execution instead of using stale choices",async()=>{
  failing=true;for(const task of [()=>gate("macos").list(),()=>gate("macos").requireEligible("tiny")]){let denied=false;try{await task();}catch{denied=true;}assert(denied,"fail closed");}
 });
 await test("An older cached eligibility adapter cannot bypass production review support",async()=>{
  const old=createWhisperProductionGate({environment:{operatingSystem:"macos"},contextFor:async d=>({id:d.id}),bridge:{sync:async()=>{},get:()=>({status:"eligible"})}});
  for(const operation of [()=>old.list(),()=>old.requireEligible("tiny")]){let denied=false;try{await operation();}catch(error){denied=error.message.includes("Reload Memora");}assert(denied,"stale adapter fails closed");}
 });
 document.body.dataset.result="passed";lines.push("ALL TESTS PASSED");
}catch(error){document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
document.getElementById("results").textContent=lines.join("\n");
