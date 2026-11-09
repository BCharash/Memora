const lines=[],assert=(v,m)=>{if(!v)throw new Error(m);};
const test=async(label,fn)=>{await fn();lines.push(`PASS ${label}`);};
try{
 const source=await(await fetch("../js/app.js")).text();
 const fragment=source.slice(source.indexOf("let transcriptionBatchActive ="),source.indexOf('window.addEventListener("memora-whisper-eligibility-changed"'));
 let list=async()=>[];
 const select=document.getElementById("fixtureModel"),button=document.getElementById("fixtureTranscribe");
 const controller=new Function("modelSelect","transcribeButton","document","listQualifiedWhisperProductionModels",fragment+";return { refresh: refreshQualifiedWhisperModels, busy: value => { transcriptionBatchActive = value; } };")(select,button,document,()=>list());
 await test("Empty eligibility disables transcription and explains Settings onboarding",async()=>{
  await controller.refresh();assert(select.disabled&&button.disabled&&select.value==="","disabled");
  assert(document.getElementById("modelEligibilityNote").textContent.includes("Settings"),"onboarding");
 });
 await test("Qualified family appears, selected model persists, hold removes it",async()=>{
  list=async()=>[{family:"tiny",label:"Tiny"},{family:"small",label:"Small"}];await controller.refresh();select.value="small";
  await controller.refresh();assert(select.value==="small"&&!button.disabled,"selection retained");
  list=async()=>[{family:"tiny",label:"Tiny"}];await controller.refresh();assert(select.value==="tiny"&&select.options.length===1,"held choice removed");
 });
 await test("Active batch is not disturbed and stale async results cannot restore obsolete choices",async()=>{
  controller.busy(true);list=async()=>[];await controller.refresh();assert(select.value==="tiny","batch unchanged");controller.busy(false);
  let resolve;list=()=>new Promise(r=>{resolve=r;});const old=controller.refresh();
  list=async()=>[];await controller.refresh();resolve([{family:"small",label:"Small"}]);await old;
  assert(select.disabled&&select.value==="","stale result ignored");
 });
 await test("Storage errors remove stale choices and fail closed",async()=>{
  list=async()=>{throw new Error("storage unavailable");};await controller.refresh();
  assert(select.options.length===0&&button.disabled&&select.disabled,"no stale choice");
 });
 document.body.dataset.result="passed";lines.push("ALL TESTS PASSED");
}catch(error){document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
document.getElementById("results").textContent=lines.join("\n");
