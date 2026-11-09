import { createWhisperEligibilityStore, reduceWhisperEligibility, eligibilityKey } from "../js/whisperEligibility.js";
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
    await test("Interruption during loading/inference blocks without inferring a crash cause", () => {
        for (const phase of ["load","inference"]) assert(reduceWhisperEligibility(null,attempt("interrupted",phase)).status === "blocked", phase);
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
        assert(blocked.status === "blocked", "not automatically restored");
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
        assert(createWhisperEligibilityStore({storage}).get(context).status === "blocked", "independent evidence");
    });
    await test("Configuration/browser/protocol/fixture/recipe/capability changes require validation", async () => {
        const store=createWhisperEligibilityStore({storage:memory()}); await store.record(context,attempt("passed"));
        for (const [key,value] of Object.entries({ configurationFingerprint:"changed", browser:"updated", executionWorker:"new-worker", protocol:"v2", fixtureDigest:"new-fixture", recipe:{language:"en"}, capabilities:{workers:true,webgpu:true},environment:{operatingSystem:"ios",deviceType:"tablet"} })) {
            assert(store.get({...context,[key]:value}).status === "needs-validation", key);
        }
        assert(eligibilityKey(context) === eligibilityKey(Object.fromEntries(Object.entries(context).reverse())), "stable keys");
    });
    await test("Concurrent updates retain newer decision; storage failure and mismatched evidence are explicit", async () => {
        const storage=memory(),store=createWhisperEligibilityStore({storage}); const old=attempt("passed"), newer=attempt("interrupted");
        await Promise.all([store.record(context,newer),store.record(context,old)]);
        assert(store.get(context).status === "blocked", "newer evidence retained");
        let rejected=false; try { await store.record(context,{...attempt("passed"),configuration:{id:"other"}}); } catch {rejected=true;} assert(rejected,"mismatch");
        storage.setItem=()=>{throw new Error("quota");}; rejected=false;
        try {await store.record(context,attempt("failed"));} catch {rejected=true;} assert(rejected,"write failure");
    });
    document.body.dataset.result="passed"; lines.push("ALL TESTS PASSED");
} catch(error) {document.body.dataset.result="failed";lines.push(`FAIL ${error.stack}`);}
document.getElementById("results").textContent=lines.join("\n");
