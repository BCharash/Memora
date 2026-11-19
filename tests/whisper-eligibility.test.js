import { createWhisperEligibilityStore, reduceWhisperEligibility, eligibilityKey, qualificationKey } from "../js/whisperEligibility.js";
import { createWhisperAttemptJournal } from "../js/whisperAttempts.js";
const lines = [], assert = (v,m) => { if (!v) throw new Error(m); };
const test = async (label, fn) => { await fn(); lines.push(`PASS ${label}`); };
const context = { configurationId: "medium-iphone-default", configurationFingerprint: "sha256:fixture", executionWorker: "ios-worker", protocol: "wer-v1", fixtureDigest: "sha256:audio-and-reference", browser: "Safari fixture", environment: { operatingSystem: "ios", deviceType: "phone" }, capabilities: { workers: true }, recipe: { language: null } };
const memory = () => { const map = new Map(); return { get length() { return map.size; }, key: i => [...map.keys()][i], getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; };
let serial = 0;
const attempt = (status, phase = "inference") => ({ id: `attempt-${++serial}`, startedAt: new Date(1000*serial).toISOString(), configuration: { id: context.configurationId }, status, phase, result: { results: [{ status, failedPhase: phase, transcriptionStatus: "passed", accuracyStatus: "passed", validation: { status: "passed" }, wer: .15 }] } });
try {
    await test("Inclusive valid accuracy pass qualifies; malformed claimed passes do not", () => {
        assert(reduceWhisperEligibility(null, attempt("passed")).status === "eligible", "15% passes");
        for (const wer of [.15001, NaN, -1, null]) { const a=attempt("passed"); a.result.results[0].wer=wer; assert(reduceWhisperEligibility(null,a).status === "unverified", "invalid pass"); }
    });
    await test("Interruption during loading/inference suspends without inferring a crash cause", () => {
        for (const phase of ["load","inference"]) assert(reduceWhisperEligibility(null,attempt("interrupted",phase)).status === "suspended", phase);
        assert(reduceWhisperEligibility(null,attempt("interrupted","prepare")).status === "unverified", "preparation inconclusive");
    });
    await test("Runtime/accuracy failure blocks; preparation, timeout and cancellation remain inconclusive", () => {
        assert(reduceWhisperEligibility(null,attempt("failed")).status === "blocked", "runtime failure");
        const accuracy=attempt("failed","validation"); accuracy.result.results[0].error={name:"ValidationError"};
        assert(reduceWhisperEligibility(null,accuracy).status === "blocked", "accuracy failure");
        for (const a of [attempt("cancelled"),attempt("timed-out"),attempt("failed","prepare")]) assert(reduceWhisperEligibility(null,a).status === "unverified", "neutral");
    });
    await test("Blocked status survives neutral outcomes; only deliberate qualifying retest restores it", () => {
        let blocked=reduceWhisperEligibility(null,attempt("interrupted"));
        for (const status of ["cancelled","timed-out","passed"]) blocked=reduceWhisperEligibility(blocked,attempt(status));
        assert(blocked.status === "suspended", "not automatically restored");
        assert(reduceWhisperEligibility(blocked,attempt("passed"),{deliberateRetest:true}).status === "eligible", "explicit recovery");
    });
    await test("Later failure retains last success; stale and duplicate evidence cannot overwrite newer decision", () => {
        const pass=attempt("passed"), success=reduceWhisperEligibility(null,pass), failure=attempt("failed"), blocked=reduceWhisperEligibility(success,failure);
        assert(blocked.lastSuccess.id === pass.id, "success retained");
        assert(reduceWhisperEligibility(blocked,pass) === blocked && reduceWhisperEligibility(blocked,failure) === blocked, "replay safe");
    });
    await test("Storage survives new instances; report clearing cannot erase eligibility", async () => {
        const storage=memory(), store=createWhisperEligibilityStore({storage});
        await store.record(context,attempt("interrupted","load"));
        await createWhisperAttemptJournal({storage}).clearCompleted();
        assert(createWhisperEligibilityStore({storage}).get(context).status === "suspended", "independent evidence");
    });
    await test("Old interruption blocks migrate to suspended; confirmed failure survives a later interruption", () => {
        const interruption = attempt("interrupted");
        const old = { status: "blocked", lastDecision: { status: "interrupted" }, latestAttempt: { id: interruption.id, startedAt: interruption.startedAt } };
        assert(reduceWhisperEligibility(old, interruption).status === "suspended", "old hold normalized");
        const failed = reduceWhisperEligibility(null, attempt("failed"));
        assert(reduceWhisperEligibility(failed, attempt("interrupted")).status === "blocked", "confirmed failure retained");
        assert(reduceWhisperEligibility(failed, attempt("passed"), { deliberateRetest: true }).status === "eligible", "deliberate pass restores confirmed failure");
    });
    await test("Configuration/browser-family/protocol/fixture/recipe/capability changes require validation", async () => {
        const store=createWhisperEligibilityStore({storage:memory()}); await store.record(context,attempt("passed"));
        for (const [key,value] of Object.entries({ configurationFingerprint:"changed", browser:"updated", executionWorker:"new-worker", protocol:"v2", fixtureDigest:"new-fixture", recipe:{language:"en"}, capabilities:{workers:true,webgpu:true},environment:{operatingSystem:"ios",deviceType:"tablet"} })) {
            assert(store.get({...context,[key]:value}).status === "needs-validation", key);
        }
        assert(eligibilityKey(context) === eligibilityKey(Object.fromEntries(Object.entries(context).reverse())), "stable keys");
    });
    await test("Browser version changes reuse old stored passes without altering report context or storage",async()=>{
        const storage=memory(),old={...context,browser:'Mozilla/5.0 Chrome/156.0.0.0 Safari/537.36'},updated={...context,browser:'Mozilla/5.0 Chrome/157.0.0.0 Safari/538.0'};
        const saved={...reduceWhisperEligibility(null,attempt('passed')),context:old};const key=eligibilityKey(old),raw=JSON.stringify(saved);storage.setItem(key,raw);
        const store=createWhisperEligibilityStore({storage});assert(store.get(updated).status==='eligible','old pass lost');assert(storage.getItem(key)===raw&&storage.length===1,'reading migrated or removed raw evidence');assert(qualificationKey(old)===qualificationKey(updated),'version in qualification identity');assert(eligibilityKey(old)!==eligibilityKey(updated),'raw report context lost');
        for(const [field,value]of Object.entries({configurationFingerprint:'changed',executionWorker:'changed',fixtureDigest:'changed',protocol:'changed',recipe:{language:'en'},capabilities:{workers:true,webgpu:true},environment:{operatingSystem:'macos',deviceType:'desktop'}}))assert(store.get({...updated,[field]:value}).status==='needs-validation',field+' no longer checked');
    });
    await test("Chrome, Edge, Firefox and Safari keep version continuity without sharing across browser families",()=>{
        const pairs=[['Chrome/156.0.0.0 Safari/537.36','Chrome/157.0.0.0 Safari/538.0'],['Chrome/156 Safari/537 Edg/156.0','Chrome/157 Safari/538 Edg/157.0'],['Firefox/156.0','Firefox/157.0'],['Version/26.0 Safari/605.1.15','Version/26.1 Safari/606.2']];
        const keys=pairs.map(([before,after])=>{const first=qualificationKey({...context,browser:before});assert(first===qualificationKey({...context,browser:after}),'version changed identity');return first;});assert(new Set(keys).size===4,'browser families merged');assert(qualificationKey({...context,browser:'unknown 1'})!==qualificationKey({...context,browser:'unknown 2'}),'unknown identities merged');
    });
    await test("Existing version-specific decisions combine chronologically; newer failures beat passes and neutral outcomes",async()=>{
        const storage=memory(),old={...context,browser:'Chrome/156.0'},updated={...context,browser:'Chrome/157.0'},future={...context,browser:'Chrome/158.0'};
        const passed=attempt('passed'),failure=attempt('failed'),neutral=attempt('cancelled');
        for(const [ctx,a]of [[old,passed],[updated,failure],[future,neutral]])storage.setItem(eligibilityKey(ctx),JSON.stringify({...reduceWhisperEligibility(null,a),context:ctx}));
        const store=createWhisperEligibilityStore({storage});assert(store.get(future).status==='blocked','newer failure escaped');assert(store.get(future).latestAttempt.id===neutral.id,'latest neutral attempt lost');assert(store.get(future).lastSuccess.id===passed.id,'prior pass lost');
        await store.record(old,passed,{deliberateRetest:true});assert(store.get(future).status==='blocked','replayed older pass cleared hold');await store.record(future,attempt('passed'),{deliberateRetest:true});assert(store.get(old).status==='eligible','later manual pass did not restore across versions');
    });
    await test("An interruption remains suspended across browser versions and never becomes a qualifying pass",async()=>{
        const store=createWhisperEligibilityStore({storage:memory()}),old={...context,browser:'Chrome/156.0'};await store.record(old,attempt('interrupted'));assert(store.get({...old,browser:'Chrome/157.0'}).status==='suspended','interrupted load qualified');
    });
    await test("Concurrent updates retain newer decision; storage failure and mismatched evidence are explicit", async () => {
        const storage=memory(),store=createWhisperEligibilityStore({storage}); const old=attempt("passed"), newer=attempt("interrupted");
        await Promise.all([store.record(context,newer),store.record(context,old)]);
        assert(store.get(context).status === "suspended", "newer evidence retained");
        let rejected=false; try { await store.record(context,{...attempt("passed"),configuration:{id:"other"}}); } catch {rejected=true;} assert(rejected,"mismatch");
        storage.setItem=()=>{throw new Error("quota");}; rejected=false;
        try {await store.record(context,attempt("failed"));} catch {rejected=true;} assert(rejected,"write failure");
    });
    document.body.dataset.result="passed"; lines.push("ALL TESTS PASSED");
} catch(error) {document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
document.getElementById("results").textContent=lines.join("\n");

if(location.search.includes("report=1"))await fetch("/_identity-test-result",{method:"POST",body:JSON.stringify({passed:lines.filter(line=>line.startsWith("PASS ")).length,failed:document.body.dataset.result==="passed"?[]:["suite failed"],output:document.getElementById("results").textContent})});
