import { createWhisperEvidenceBridge, getWhisperEligibilityContext, digestWhisperFixture, WHISPER_FIXTURE_DIGEST } from "../js/whisperEligibilityEvidence.js";
import { getWhisperConfigurationDefinitions, fingerprintWhisperConfiguration } from "../js/whisperConfigurations.js";
import { createWhisperEligibilityStore } from "../js/whisperEligibility.js";
const lines=[],assert=(v,m)=>{if(!v)throw new Error(m);};
const test=async(label,fn)=>{await fn();lines.push(`PASS ${label}`);};
const memory=()=>{const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const definition=getWhisperConfigurationDefinitions()[0];
try {
    const context=await getWhisperEligibilityContext(definition);
    await test("Fingerprint records shared production worker, environment and recipe",async()=>{
        const expected=await fingerprintWhisperConfiguration({...definition,worker:{...definition.worker,script:context.executionWorker}});
        assert(context.configurationFingerprint===expected && context.recipe.chunk_length_s===30,"actual inputs");
        assert(context.configurationFingerprint===await fingerprintWhisperConfiguration(definition),"same production/test fingerprint");
    });
    await test("Shipped fixture digest matches fetched audio and reference; changes differ",async()=>{
        const audio=await(await fetch("../data/whisper-test/test-audio.m4a")).blob();
        const text=await(await fetch("../data/whisper-test/expected-transcription.txt")).text();
        assert(await digestWhisperFixture(audio,text)===WHISPER_FIXTURE_DIGEST,"manifest current");
        assert(await digestWhisperFixture(audio,text+" changed")!==WHISPER_FIXTURE_DIGEST,"changed reference");
    });
    const pass={id:"pass",startedAt:"2026-01-01T00:00:00Z",status:"passed",phase:"validation",configuration:{id:context.configurationId},eligibilityContext:context,result:{results:[{status:"passed",transcriptionStatus:"passed",accuracyStatus:"passed",validation:{status:"passed"},wer:0}]}};
    await test("Exact terminal evidence ingestion is durable and idempotent",async()=>{
        const storage=memory(), journal={recover:async()=>[pass]},bridge=createWhisperEvidenceBridge({storage,journal});
        await bridge.sync();await bridge.sync();assert(bridge.get(context).status==="eligible","qualified");
        assert(createWhisperEligibilityStore({storage}).get(context).latestAttempt.id==="pass","durable");
    });
    await test("Recovered interruption suspends; live records are ignored",async()=>{
        const storage=memory(), interrupted={...pass,id:"interrupted",status:"interrupted",phase:"load"};
        const bridge=createWhisperEvidenceBridge({storage,journal:{recover:async()=>[interrupted]}});
        await bridge.sync();assert(bridge.get(context).status==="suspended","suspended");
        const live=createWhisperEvidenceBridge({storage:memory(),journal:{recover:async()=>[{...interrupted,status:"running"}]}});
        await live.sync();assert(live.get(context).status==="unverified","live untouched");
    });
    await test("Legacy pass cannot qualify; legacy interruption remains suspended after history deletion",async()=>{
        const storage=memory();let records=[{...pass,eligibilityContext:undefined,environment:context.environment,browser:context.browser}];
        const bridge=createWhisperEvidenceBridge({storage,journal:{recover:async()=>records}});
        await bridge.sync();assert(bridge.get(context).status==="unverified","no invented pass");
        records=[{...records[0],status:"interrupted",phase:"load"}];
        await bridge.sync();records=[];await bridge.sync();
        assert(bridge.get(context).status==="suspended" && bridge.get(context).legacyReview,"review retained");
        assert(bridge.get({...context,environment:{...context.environment,deviceType:"other"}}).status!=="suspended","environment isolation");
    });
    await test("Deliberate pass resolves legacy hold durably; replay and cancellation cannot recreate it", async()=>{
        const storage=memory();
        const legacy={...pass,eligibilityContext:undefined,environment:context.environment,status:"interrupted",phase:"load"};
        let records=[legacy];const bridge=createWhisperEvidenceBridge({storage,journal:{recover:async()=>records}});
        await bridge.sync();assert(bridge.get(context).status==="suspended","initial hold");
        const retest={...pass,id:"retest",startedAt:"2026-01-02T00:00:00Z",deliberateRetest:true};
        records=[retest,legacy];await bridge.sync();await bridge.sync();
        assert(bridge.get(context).status==="eligible" && bridge.get(context).legacyReview.resolvedBy.attemptId==="retest","resolved with evidence");
        records=[{...pass,id:"cancel",startedAt:"2026-01-03T00:00:00Z",status:"cancelled",deliberateRetest:true},...records];await bridge.sync();
        assert(bridge.get(context).status==="eligible","cancel neutral");
        records=[];await bridge.sync();assert(bridge.get(context).status==="eligible","history clear retains resolution");
        assert(bridge.get({...context,browser:"changed"}).status!=="eligible","resolution scoped to exact context");
    });
    await test("Unsuccessful deliberate retest does not resolve legacy hold; later legacy failure reopens review",async()=>{
        const storage=memory();const legacy={...pass,eligibilityContext:undefined,environment:context.environment,status:"interrupted",phase:"load"};
        let records=[legacy];const bridge=createWhisperEvidenceBridge({storage,journal:{recover:async()=>records}});
        const failed={...pass,id:"bad-retest",startedAt:"2026-01-02T00:00:00Z",status:"failed",deliberateRetest:true,result:{results:[{status:"failed",failedPhase:"inference"}]}};
        records=[failed,legacy];await bridge.sync();assert(bridge.get(context).status==="blocked" && !bridge.get(context).legacyReview.resolvedBy,"failure retained");
        const good={...pass,id:"good",startedAt:"2026-01-03T00:00:00Z",deliberateRetest:true};
        records=[good,...records];await bridge.sync();assert(bridge.get(context).status==="eligible","resolved");
        records=[{...legacy,id:"new-loss",startedAt:"2026-01-04T00:00:00Z"},...records];await bridge.sync();
        assert(bridge.get(context).status==="suspended","newer interruption reopens hold");
    });
    await test("Legacy confirmed failure is not downgraded by a subsequent unexplained interruption",async()=>{
        const failed={...pass,eligibilityContext:undefined,environment:context.environment,status:"failed",result:{results:[{failedPhase:"inference"}]}};
        const lost={...failed,id:"lost-later",startedAt:"2026-01-02T00:00:00Z",status:"interrupted",phase:"load"};
        const bridge=createWhisperEvidenceBridge({storage:memory(),journal:{recover:async()=>[lost,failed]}});
        await bridge.sync();assert(bridge.get(context).status==="blocked" && bridge.get(context).legacyReview.confirmedFailure.attemptId===failed.id,"confirmed evidence retained");
    });
    await test("Identity changes require fresh validation without inheriting a pass",async()=>{
        const bridge=createWhisperEvidenceBridge({storage:memory(),journal:{recover:async()=>[pass]}});
        await bridge.sync();assert(bridge.get({...context,fixtureDigest:"changed"}).status==="needs-validation","changed bytes");
    });
    await test("Ingestion storage errors propagate rather than silently clearing safety evidence",async()=>{
        const storage=memory();storage.setItem=()=>{throw new Error("quota");};let rejected=false;
        try{await createWhisperEvidenceBridge({storage,journal:{recover:async()=>[pass]}}).sync();}catch{rejected=true;}
        assert(rejected,"write error");
    });
    document.body.dataset.result="passed";lines.push("ALL TESTS PASSED");
}catch(error){document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
document.getElementById("results").textContent=lines.join("\n");
