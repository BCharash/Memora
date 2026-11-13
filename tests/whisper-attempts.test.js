import { presentWhisperAttempt } from "../js/whisperAttemptReport.js";
import { createWhisperAttemptJournal, visibleWhisperAttempts, whisperAttemptTimeline } from "../js/whisperAttempts.js";
import { createWhisperTestRunner } from "../js/whisperTestLifecycle.js";
const lines = [];
const assert = (v, m) => { if (!v) throw new Error(m); };
const test = async (label, fn) => { await fn(); lines.push(`PASS ${label}`); };
const memory = () => { const data = new Map(); return { get length() { return data.size; }, key: i => [...data.keys()][i], getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) }; };
const metadata = { configuration: { id: "tiny-test" }, build: "fixture" };
const summary = status => ({ results: [{ status, diagnostics: { actualBackend: "unknown" } }] });
const locks = navigator.locks;
let serial = 0;
const journal = storage => createWhisperAttemptJournal({ storage, locks, uuid: () => `fixture-${++serial}` });
// A real navigation must preserve this unfinished record, using a dedicated test namespace.
const namespace = "memora-test-journal.";
const reloadStore = {
    get length() { return Object.keys(localStorage).filter(k => k.startsWith(namespace)).length; },
    key: i => Object.keys(localStorage).filter(k => k.startsWith(namespace))[i]?.slice(namespace.length),
    getItem: k => localStorage.getItem(namespace+k), setItem: (k,v) => localStorage.setItem(namespace+k,v), removeItem: k => localStorage.removeItem(namespace+k)
};
try {
    if (!new URL(location.href).searchParams.has("recovered")) {
        reloadStore.setItem("memora.whisper-attempt.v1.reload", JSON.stringify({ schemaVersion: 1, id: "reload", configuration: metadata.configuration, startedAt: "2026-01-01", status: "running", phase: "inference" }));
        location.replace(location.href + "?recovered=1");
    } else {
        await test("Real page navigation recovers saved stage without claiming crash cause", async () => {
            const records = await journal(reloadStore).recover();
            assert(records[0].status === "interrupted" && records[0].phase === "inference", "recovery");
            assert(records[0].reason.includes("Cause unknown"), "no speculative cause");
            const again = await journal(reloadStore).recover();
            assert(again[0].recoveredAt === records[0].recoveredAt, "idempotent");
            reloadStore.removeItem("memora.whisper-attempt.v1.reload");
        });
        await test("Started and stage checkpoints precede work; terminal result survives new journal", async () => {
            const storage = memory(), j = journal(storage);
            await j.run(metadata, async checkpoint => {
                assert(j.list()[0].status === "running", "saved before work");
                await checkpoint("inference", { diagnostics: { sessions: "fixture" } });
                assert(j.list()[0].phase === "inference" && j.list()[0].observation.diagnostics.sessions === "fixture", "saved stage and diagnostics");
                return summary("passed");
            });
            assert(journal(storage).list()[0].status === "passed", "terminal durable");
        });
        await test("Live owner is not marked interrupted by another journal", async () => {
            const storage = memory(), j = journal(storage);
            await j.run(metadata, async checkpoint => {
                await checkpoint("load");
                assert((await journal(storage).recover())[0].status === "running", "active lock respected");
                return summary("cancelled");
            });
            assert((await j.recover())[0].status === "cancelled", "terminal untouched");
        });
        await test("Initial storage failure and unavailable ownership prevent execution", async () => {
            for (const j of [journal({ ...memory(), setItem() { throw new Error("quota"); } }), createWhisperAttemptJournal({ storage: memory(), locks: null })]) {
                let ran = false, failed = false;
                try { await j.run(metadata, async () => { ran = true; }); } catch { failed = true; }
                assert(failed && !ran, "fail closed");
            }
        });
        await test("Terminal persistence failure retains inference outcome and warns", async () => {
            const storage = memory(), j = journal(storage), write = storage.setItem;
            const result = await j.run(metadata, async () => { storage.setItem = () => { throw new Error("quota"); }; return summary("passed"); });
            assert(result.results[0].status === "passed" && result.persistence.status === "failed", "outcomes separate");
            storage.setItem = write;
            assert((await j.recover())[0].status === "interrupted", "unfinished durable record recovered");
        });
        await test("Failure/cancellation/timeout history is retained until selected for clearing", async () => {
            const j = journal(memory());
            await j.run(metadata, async () => summary("passed"));
            for (let i=0; i<25; i++) await j.run(metadata, async () => summary(["failed", "cancelled", "timed-out"][i%3]));
            assert(j.list().some(r => r.status === "passed"), "last success retained");
            assert(j.list().length === 26, "all failures and other outcomes retained");
            const records = j.list();
            await j.clearCompleted([]); assert(j.list().length === 26, "empty selection is neutral");
            await j.clearCompleted([records[0].id]);
            assert(j.list().length === 25 && !j.list().some(row => row.id === records[0].id), "selected deletion only");
        });
        await test("Superseded passes are hidden across browser revisions and legacy context formats", () => {
            const context = { configurationId: "tiny-test", configurationFingerprint: "fingerprint", executionWorker: "worker", protocol: "fixture", fixtureDigest: "digest", browser: "browser", environment: { operatingSystem: "ios" }, recipe: {}, capabilities: {} };
            const older = { id: "old", startedAt: "2026-01-01", status: "passed", eligibilityContext: context };
            const newer = { ...older, id: "new", startedAt: "2026-01-02" };
            const failure = { ...newer, id: "failure", status: "failed" };
            const changed = { ...older, id: "changed", eligibilityContext: { ...context, browser: "changed" } };
            const legacy = { ...older, id: "legacy", eligibilityContext: null, configuration: { id: "tiny-test" }, environment: { platform: "ios" } };
            const otherPlatform = { ...older, id: "other-platform", eligibilityContext: { ...context, environment: { operatingSystem: "macos" } } };
            const unidentified = { ...older, id: "unidentified", eligibilityContext: null };
            const records = [older, newer, failure, changed, legacy, otherPlatform, unidentified];
            const visible = visibleWhisperAttempts(records);
            assert(visible.length === 4 && !visible.some(row => row.id === "old"), "older passes hidden");
            assert(records.length === 7 && visible.some(row => row.id === "failure") && !visible.some(row => row.id === "changed") && !visible.some(row => row.id === "legacy") && visible.some(row => row.id === "other-platform") && visible.some(row => row.id === "unidentified"), "stored evidence, failures, other platforms and unidentified legacy reports preserved");
        });
        await test("Failed stage checkpoint stops actual lifecycle before fixture/model work", async () => {
            let touched = false, released = false;
            const run = createWhisperTestRunner({
                environment: {}, acquireActivity: () => () => { released = true; },
                checkpoint: async () => { throw new Error("checkpoint unavailable"); },
                loadFixture: () => { touched = true; }
            });
            const result = await run({ configuration: { id: "fixture" } });
            assert(!touched && released && result.results[0].status === "failed", "stop and release");
        });
        await test("Clear removes terminal history while preserving a live owner and unrelated storage", async () => {
            const storage = memory(), j = journal(storage);
            storage.setItem("unrelated", "keep");
            await j.run(metadata, async () => summary("passed"));
            await j.run(metadata, async checkpoint => {
                await checkpoint("inference");
                await journal(storage).clearCompleted();
                assert(j.list().length === 1 && j.list()[0].status === "running", "live attempt retained");
                return summary("cancelled");
            });
            await j.clearCompleted();
            assert(j.list().length === 0 && storage.getItem("unrelated") === "keep", "only journal history removed");
        });
        await test("Legacy placeholder display is normalized without changing stored or real failure evidence", () => {
            const legacy = { status: "interrupted", observation: { status: "failed", error: null, failedPhase: null } };
            assert(presentWhisperAttempt(legacy).observation.status === "in-progress", "placeholder normalized");
            assert(legacy.observation.status === "failed", "historical record not mutated");
            legacy.observation.error = { message: "real error" };
            assert(presentWhisperAttempt(legacy).observation.status === "failed", "real failure preserved");
        });
        await test("Thrown orchestration error is saved and ownership released", async () => {
            const j = journal(memory());
            try { await j.run(metadata, async () => { throw new Error("fixture failure"); }); } catch {}
            assert((await j.recover())[0].error.message === "fixture failure", "error saved");
        });
        await test("Recent history freezes order, duration and gaps before each test; survives clearing", async () => {
            const storage=memory(); let clock=0, id=0;
            const at=()=>new Date(1700000000000+clock).toISOString();
            const j=createWhisperAttemptJournal({storage,locks,uuid:()=>`sequence-${++id}`,now:at});
            for(const [name,start,end] of [["Tiny",0,1000],["Base",31000,34000],["Small",80000,85000]]) {
                clock=start; await j.run({configuration:{id:name,label:name},pageId:`page-${id}`},async checkpoint=>{
                    await checkpoint("inference",{});clock=end;return summary("passed");
                });
            }
            const small=j.list().find(row=>row.configuration.id==="Small"), before=JSON.stringify(small.recentSelfTests);
            assert(small.recentSelfTests.source==="captured-at-start"&&small.recentSelfTests.records.map(row=>row.configurationId).join(',')==="Tiny,Base","ordered predecessors across pages");
            const timeline=whisperAttemptTimeline(small);
            assert(timeline.map(row=>row.durationMs).join(',')==='1000,3000,5000'&&timeline[1].gapBeforeMs===30000&&timeline[2].gapBeforeMs===46000,'measured duration and inter-test gaps');
            assert(small.phaseTimeline.some(point=>point.phase==='inference')&&small.phaseTimeline.at(-1).phase==='finished','progress persisted');
            await j.clearCompleted(['sequence-1','sequence-2']);
            assert(JSON.stringify(j.list()[0].recentSelfTests)===before,'clear leaves attached context');
            clock=100000;await j.run(metadata,async()=>summary('cancelled'));
            assert(JSON.stringify(j.list().find(row=>row.id===small.id).recentSelfTests)===before,'later tests cannot rewrite context');
        });
        await test("Old history is backfilled once without inventing missing timings or outcomes", async () => {
            const storage=memory(),j=journal(storage);
            storage.setItem('memora.whisper-attempt.v1.old-a',JSON.stringify({schemaVersion:1,id:'old-a',configuration:{id:'Tiny'},startedAt:'2026-01-01T00:00:00Z',status:'passed',phase:'validation'}));
            storage.setItem('memora.whisper-attempt.v1.old-b',JSON.stringify({schemaVersion:1,id:'old-b',configuration:{id:'Base'},startedAt:'2026-01-01T00:01:00Z',finishedAt:'2026-01-01T00:01:02Z',status:'passed',phase:'validation'}));
            const records=await j.recover(),b=records.find(row=>row.id==='old-b');
            assert(b.status==='passed'&&b.recentSelfTests.source==='reconstructed-from-available-history','result preserved, provenance explicit');
            assert(whisperAttemptTimeline(b)[1].gapBeforeMs===null&&b.recentSelfTests.records[0].durationMs===null,'missing finish is unknown');
            const frozen=JSON.stringify(b.recentSelfTests);await j.clearCompleted(['old-a']);await j.recover();
            assert(JSON.stringify(j.list()[0].recentSelfTests)===frozen,'reconstruction frozen after source removal');
        });
        await test("Cleanup checkpoints retain model-stage recovery semantics and compact snapshots", async () => {
            const storage=memory(),j=journal(storage);
            await j.run(metadata,async checkpoint=>{
                await checkpoint('inference',{transcript:'private fixture text'});
                await checkpoint('cleanup',{transcriptionStatus:'passed',releaseStatus:'not-attempted'});
                const current=j.list()[0];
                assert(current.phase==='inference'&&current.cleanupPhase==='cleanup','model phase remains authoritative');
                return summary('passed');
            });
            const next={id:'next',startedAt:new Date(Date.now()+1000).toISOString()};
            const snapshot=presentWhisperAttempt(next,j.list()).recentSelfTests;
            assert(!JSON.stringify(snapshot).includes('private fixture text')&&!JSON.stringify(snapshot).includes('recentSelfTests'),'no transcript or recursive snapshots');
        });
        document.body.dataset.result = "passed";
        document.getElementById("results").textContent = lines.join("\n") + "\nALL TESTS PASSED";
    }
} catch (error) { document.body.dataset.result = "failed"; document.getElementById("results").textContent = lines.join("\n") + "\nFAIL " + error.stack; }
