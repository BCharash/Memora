import { createWhisperWorkerErrorMessage, whisperErrorFromWorkerMessage, whisperErrorFromWorkerEvent } from "../js/whisperFailures.js";
import { createWhisperTestRunner } from "../js/whisperTestLifecycle.js";
const lines = [], assert = (v, m) => { if (!v) throw new Error(m); };
async function test(name, action) { await action(); lines.push(`PASS ${name}`); }
const expected = { stage: "inference", source: "worker-reply", configurationId: "fixture-exact" };
try {
    await test("Structured decoder preserves original details and rejects invalid or mismatched evidence", () => {
        const original = new TypeError("fetch failed");
        const reply = createWhisperWorkerErrorMessage(original, { stage: "inference", configurationId: "fixture-exact", boundary: "pipeline-call" });
        const decoded = whisperErrorFromWorkerMessage(reply, expected);
        assert(decoded.name === "TypeError" && decoded.message === original.message && decoded.whisperFailure.error.stack === original.stack, "original diagnostics");
        assert(decoded.whisperFailure.certainty === "unknown", "fetch wording is not network proof");
        for (const [failure, status] of [[undefined, "legacy"], [{ ...reply.failure, schemaVersion: 99 }, "invalid"], [{ ...reply.failure, stage: "load", boundary: "pipeline-create" }, "mismatched"], [{ ...reply.failure, configurationId: "other" }, "mismatched"], [{ ...reply.failure, error: {} }, "invalid"], [{ ...reply.failure, boundary: "pipeline-create" }, "invalid"]]) {
            const result = whisperErrorFromWorkerMessage({ ...reply, failure }, expected);
            assert(result.whisperFailure.workerEvidence.status === status && result.whisperFailure.certainty === "unknown", status);
        }
        const fake = new Error("runtime text"); fake.name = "RuntimeError";
        assert(whisperErrorFromWorkerMessage(createWhisperWorkerErrorMessage(fake, { ...expected, boundary: "pipeline-call" }), expected).whisperFailure.category === "worker-failure", "forged name alone cannot prove runtime type");
        const event = whisperErrorFromWorkerEvent({ message: "script failed", error: original, filename: "fixture.js", lineno: 8, colno: 2 }, { ...expected, source: "worker-event" });
        assert(event.name === "TypeError" && event.whisperFailure.workerEvidence.line === 8 && event.whisperFailure.certainty === "unknown", "event evidence stays uncertain");
    });
    for (const ios of [false, true]) {
        await test(`${ios ? "iOS" : "desktop"} actual worker load/inference errors retain typed provenance`, async () => {
            let source = await (await fetch(`../js/whisper-${ios ? "ios" : "desktop"}-worker.js`)).text();
            source = source.replace(/from "\.\/([^"\n]+)"/g, (_, file) => `from ${JSON.stringify(new URL("../js/" + file, import.meta.url).href)}`);
            source = source.replace(/await import\(\s*"https:[^"]+"\s*\)/g, "({pipeline:globalThis.__pipeline})").replace(/import \{ pipeline \} from\s*"https:[^"]+";/, "const pipeline=globalThis.__pipeline;");
            for (const stage of (ios ? ["load", "inference"] : ["load", "inference", "import"])) for (const kind of ["runtime", "type", "abort", "network-name", "string"]) {
                const prelude = `const fault=()=>{throw ${kind === "runtime" ? 'new WebAssembly.RuntimeError("fixture wasm trap")' : kind === "type" ? 'new TypeError("fetch failed fixture")' : kind === "abort" ? 'new DOMException("aborted fixture","AbortError")' : kind === "network-name" ? 'new DOMException("network fixture","NetworkError")' : '"thrown fixture"'};};
                    globalThis.__pipeline=async()=>{${stage === "load" ? 'fault();' : ''}const fn=async()=>{${stage === "inference" ? 'fault();' : ''}return{text:"fixture"};};return fn;};\n`;
                const fixturePrelude = stage === "import" ? prelude + 'Object.defineProperty(globalThis,"__pipeline",{get:()=>fault()});\n' : prelude;
                const url = URL.createObjectURL(new Blob([fixturePrelude, source], { type: "text/javascript" })), worker = new Worker(url, { type: "module" });
                try {
                    const reply = await new Promise((resolve, reject) => {
                        const timer = setTimeout(() => reject(new Error("worker timeout")), 3000);
                        worker.onerror = event => { clearTimeout(timer); reject(new Error(event.message)); };
                        worker.onmessage = ({ data }) => {
                            if (data.type === "error") { clearTimeout(timer); resolve(data); }
                            else if (["loaded", "ready"].includes(data.type)) worker.postMessage(ios ? { type: "transcribe", audioData: new Float32Array([0]) } : { type: "transcribe", audio: new Float32Array([0]) });
                        };
                        worker.postMessage({ type: "load", model: "fixture-exact", repository: "fixture", dtype: "q4" });
                    });
                    assert(reply.failure.configurationId === "fixture-exact" && reply.failure.stage === (stage === "import" ? "load" : stage), "exact identity and operation");
                    assert(reply.failure.boundary === (stage === "import" ? "module-import" : stage === "load" ? "pipeline-create" : "pipeline-call"), "owning call boundary");
                    const error = whisperErrorFromWorkerMessage(reply, { ...expected, stage: stage === "import" ? "load" : stage });
                    assert(error.whisperFailure.workerEvidence.status === "matched", "validated payload");
                    if (kind === "runtime") assert(error.whisperFailure.category === "runtime-failure" && error.whisperFailure.certainty === "type-observed", "actual runtime instance observed");
                    else assert(error.whisperFailure.certainty === "unknown", "root cause remains unknown");
                    if (kind === "abort") assert(error.name === "AbortError" && error.whisperFailure.category === "aborted", "abort preserved without invented intent");
                    if (kind === "type") assert(error.name === "TypeError", "original error type preserved");
                } finally { worker.terminate(); URL.revokeObjectURL(url); }
            }
        });
    }
    await test("Self-test diagnostics gain evidence without changing failure/cancellation verdicts", async () => {
        for (const name of ["AbortError", "TimeoutError", "NetworkError"]) {
            const runner = createWhisperTestRunner({ environment: {}, acquireActivity: () => () => {}, prepareProduction: async () => {}, loadFixture: async () => ({ audioFile: {}, expectedText: "test" }), decode: async () => new Float32Array([0]),
                createWorker: () => ({ terminate() {}, postMessage() { queueMicrotask(() => this.onmessage({ data: createWhisperWorkerErrorMessage(new DOMException("fixture", name), { stage: "load", configurationId: "fixture-exact", boundary: "pipeline-create" }) })); } }) });
            const result = await runner({ configuration: { id: "fixture-exact", family: "tiny", repository: "fixture" }, limits: { load: 1000 } });
            assert(result.results[0].status === "failed" && result.results[0].error.name === "Error", "legacy verdict preserved");
            assert(result.results[0].error.failure.error.name === name, "original worker name in technical evidence");
        }
    });
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) { document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack}`); }
finally { document.getElementById("results").textContent = lines.join("\n"); }
