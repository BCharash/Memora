import { createWhisperTestRunner } from "../js/whisperTestLifecycle.js";
import { acquireWhisperActivity } from "../js/whisperActivity.js";

const output = document.getElementById("results");
const lines = [];
const configuration = { id: "tiny-test", family: "tiny", label: "Tiny", repository: "fixture", configuration: { dtype: null } };
const limits = { prepare: 1000, decode: 1000, release: 1000, load: 1000, inference: 1000 };
const assert = (value, message) => { if (!value) throw new Error(message); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const never = () => new Promise(() => {});
async function rejects(fn, text) {
    try { await fn(); } catch (error) { assert(error.message.includes(text), error.message); return; }
    throw new Error(`Expected rejection: ${text}`);
}
function fixture(overrides = {}, ios = false) {
    const workers = [];
    let released = 0;
    const dependencies = {
        loadFixture: async () => ({ audioFile: { name: "test.m4a", size: 10 }, expectedText: "test" }),
        decode: async () => new Float32Array([0, 1]),
        prepareProduction: async () => { released++; },
        acquireActivity: () => acquireWhisperActivity("self-test"),
        environment: { operatingSystem: ios ? "ios" : "macos" }, score: () => 0,
        createWorker: () => {
            const worker = {
                terminated: 0, messages: [],
                terminate() { this.terminated++; },
                postMessage(message) {
                    this.messages.push(message);
                    this.onmessage?.({ data: message.type === "load" ? { type: ios ? "ready" : "loaded" } : { type: "transcription", text: "test" } });
                }
            };
            workers.push(worker); return worker;
        }, ...overrides
    };
    const run = createWhisperTestRunner(dependencies);
    const events = [];
    return { run: args => run({ configuration, limits, onEvent: event => events.push(event), ...args }), workers, events, released: () => released };
}
async function test(name, fn) { await fn(); lines.push(`PASS ${name}`); output.textContent = lines.join("\n"); }

try {
    for (const ios of [false, true]) await test(`${ios ? "iOS" : "desktop"} success preserves messages and terminates once`, async () => {
        const f = fixture({}, ios); const s = await f.run(); const worker = f.workers[0];
        assert(s.passed === 1 && worker.terminated === 1 && f.released() === 1, "success lifecycle");
        const message = worker.messages[1];
        assert(ios ? "audioData" in message && message.language === null : "audio" in message, "protocol");
        assert(f.events.filter(e => e.type === "run-complete").length === 1, "one terminal event");
    });
    await test("Pre-cancelled test creates no worker or production side effect", async () => {
        const controller = new AbortController(); controller.abort(); const f = fixture();
        const s = await f.run({ signal: controller.signal });
        assert(s.cancelled === 1 && !f.workers.length && !f.released(), "pre-cancelled");
    });
    await test("Cancellation aborts fixture fetch ownership and permits retry", async () => {
        let fetchSignal; let first = true;
        const f = fixture({ loadFixture: signal => {
            fetchSignal = signal;
            if (first) { first = false; return never(); }
            return Promise.resolve({ audioFile: { name: "test", size: 1 }, expectedText: "test" });
        } });
        const controller = new AbortController(); const pending = f.run({ signal: controller.signal });
        await delay(0); controller.abort(); const s = await pending;
        assert(s.cancelled === 1 && fetchSignal.aborted && !f.workers.length, "fetch abort");
        assert((await f.run()).passed === 1, "retry");
    });
    await test("Late decoder result cannot restart a cancelled test", async () => {
        let finish; const f = fixture({ decode: () => new Promise(resolve => { finish = resolve; }) });
        const controller = new AbortController(); const pending = f.run({ signal: controller.signal });
        await delay(0); controller.abort(); assert((await pending).cancelled === 1, "decode cancel");
        finish(new Float32Array([1])); await delay(0); assert(!f.workers.length, "no late worker");
    });
    for (const phase of ["prepare", "decode", "release", "load", "inference"]) await test(`${phase} timeout settles and cleans up`, async () => {
        const overrides = phase === "prepare" ? { loadFixture: never } : phase === "decode" ? { decode: never } : phase === "release" ? { prepareProduction: never } : {};
        const f = fixture(overrides);
        if (phase === "load" || phase === "inference") {
            // Replace worker method after construction using the same test dependency seam.
            // A separate fixture keeps the stalled worker observable.
            let worker;
            const g = fixture({ createWorker: () => (worker = {
                terminated: 0, terminate() { this.terminated++; },
                postMessage(m) { if (phase === "inference" && m.type === "load") this.onmessage({ data: { type: "loaded" } }); }
            }) });
            const s = await g.run({ limits: { ...limits, [phase]: 20 } });
            assert(s.timedOut === 1 && s.results[0].failedPhase === phase && worker.terminated === 1, "worker timeout");
        } else {
            const s = await f.run({ limits: { ...limits, [phase]: 20 } });
            assert(s.timedOut === 1 && !f.workers.length, "early timeout");
            assert(s.results[0].releaseStatus === "not-attempted", "no false cleanup claim");
        }
    });
    for (const failure of ["constructor", "post", "error", "messageerror", "out-of-order"]) await test(`${failure} reports failure and unlocks`, async () => {
        let worker;
        const f = fixture({ createWorker: () => {
            if (failure === "constructor") throw new Error("constructor");
            return worker = { terminated: 0, terminate() { this.terminated++; }, postMessage() {
                if (failure === "post") throw new Error("post");
                if (failure === "error") this.onerror({ message: "error" });
                if (failure === "messageerror") this.onmessageerror();
                if (failure === "out-of-order") this.onmessage({ data: { type: "transcription", text: "test" } });
            } };
        } });
        const s = await f.run(); assert(s.failed === 1, "classified failure");
        assert(worker ? worker.terminated === 1 : s.results[0].releaseStatus === "not-attempted", "truthful cleanup");
        assert((await fixture().run()).passed === 1, "unlocked");
    });
    await test("Cancel loading worker ignores a saved late response", async () => {
        let callback; let worker;
        const f = fixture({ createWorker: () => (worker = { terminated: 0, terminate() { this.terminated++; }, postMessage() { callback = this.onmessage; } }) });
        const controller = new AbortController(); const pending = f.run({ signal: controller.signal });
        await delay(0); controller.abort(); const s = await pending;
        callback({ data: { type: "loaded" } });
        assert(s.cancelled === 1 && worker.terminated === 1 && s.results[0].loadStatus !== "passed", "no late mutation");
    });
    await test("Cancel inference terminates once and retry remains available", async () => {
        let worker;
        const f = fixture({ createWorker: () => (worker = { terminated: 0, terminate() { this.terminated++; }, postMessage(m) {
            if (m.type === "load") this.onmessage({ data: { type: "loaded" } });
        } }) });
        const controller = new AbortController(); const pending = f.run({ signal: controller.signal });
        await delay(0); controller.abort(); const s = await pending;
        assert(s.cancelled === 1 && s.results[0].failedPhase === "inference" && worker.terminated === 1, "inference cancellation");
        assert((await fixture().run()).passed === 1, "fresh retry");
    });
    await test("One active run and production/test exclusion", async () => {
        const controller = new AbortController(); const f = fixture({ loadFixture: never });
        const pending = f.run({ signal: controller.signal });
        await rejects(() => f.run(), "already running");
        await rejects(() => Promise.resolve(acquireWhisperActivity("transcription")), "busy");
        controller.abort(); await pending;
        const release = acquireWhisperActivity("transcription");
        await rejects(() => fixture().run(), "busy"); release();
        assert((await fixture().run()).passed === 1, "both directions unlock");
    });
    await test("Duplicate acknowledgements produce one inference and one completion", async () => {
        let count = 0;
        const f = fixture({ createWorker: () => ({ terminate() {}, postMessage(m) {
            if (m.type === "load") { this.onmessage({ data: { type: "loaded" } }); this.onmessage({ data: { type: "loaded" } }); }
            else { count++; this.onmessage({ data: { type: "loaded" } }); this.onmessage({ data: { type: "transcription", text: "test" } }); }
        } }) });
        assert((await f.run()).passed === 1 && count === 1, "duplicates");
        assert(f.events.filter(e => e.type === "model-complete").length === 1, "single model result");
    });
    await test("A late callback after a blocked main thread cannot defeat deadline", async () => {
        const f = fixture({ createWorker: () => ({ terminate() {}, postMessage() {
            const end = performance.now() + 30; while (performance.now() < end) { /* simulate throttled timer */ }
            this.onmessage({ data: { type: "loaded" } });
        } }) });
        assert((await f.run({ limits: { ...limits, load: 10 } })).timedOut === 1, "absolute deadline");
    });
    await test("Cleanup failure stays distinct from successful inference", async () => {
        const f = fixture({ createWorker: () => ({ terminate() { throw new Error("cleanup"); }, postMessage(m) {
            this.onmessage({ data: m.type === "load" ? { type: "loaded" } : { type: "transcription", text: "test" } });
        } }) });
        const s = await f.run(); assert(s.passed === 1 && s.releaseFailures === 1 && s.results[0].releaseError === "cleanup", "separate cleanup evidence");
    });
    await test("Invalid limits do not acquire a run", async () => {
        const f = fixture(); await rejects(() => f.run({ limits: { load: NaN } }), "Invalid");
        assert((await f.run()).passed === 1, "retry after invalid options");
    });
    lines.push("ALL TESTS PASSED"); document.body.dataset.result = "passed";
} catch (error) {
    lines.push(`FAIL ${error.stack || error}`); document.body.dataset.result = "failed";
} finally { output.textContent = lines.join("\n"); }
