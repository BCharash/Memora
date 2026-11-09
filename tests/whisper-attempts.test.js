import { createWhisperAttemptJournal } from "../js/whisperAttempts.js";
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
        await test("Failure/cancellation/timeout history preserves last successful result and bounds retention", async () => {
            const j = journal(memory());
            await j.run(metadata, async () => summary("passed"));
            for (let i=0; i<25; i++) await j.run(metadata, async () => summary(["failed", "cancelled", "timed-out"][i%3]));
            assert(j.list().some(r => r.status === "passed"), "last success retained");
            assert(j.list().length <= 22, "bounded terminal history");
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
        await test("Thrown orchestration error is saved and ownership released", async () => {
            const j = journal(memory());
            try { await j.run(metadata, async () => { throw new Error("fixture failure"); }); } catch {}
            assert((await j.recover())[0].error.message === "fixture failure", "error saved");
        });
        document.body.dataset.result = "passed";
        document.getElementById("results").textContent = lines.join("\n") + "\nALL TESTS PASSED";
    }
} catch (error) { document.body.dataset.result = "failed"; document.getElementById("results").textContent = lines.join("\n") + "\nFAIL " + error.stack; }
