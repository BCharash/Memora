import { describeWhisperPipeline, formatWhisperDiagnostics, formatTranscriptionTimings } from "../js/whisperDiagnostics.js";
import { transcribeRecording } from "../js/transcription.js";
import { calls } from "./whisper-diagnostics-fixtures.js";
const lines = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function test(label, action) { await action(); lines.push(`PASS ${label}`); }
const options = { model: "tiny", repository: "fixture", requestedBackend: "webgpu", transformersVersion: "4.0.0", worker: "fixture" };
try {
    await test("Session settings reported without promoting them to execution proof", () => {
        const diag = describeWhisperPipeline({ model: { sessions: { encoder: { config: { device: "webgpu", dtype: "fp16" } } } } }, options);
        assert(diag.sessions[0].device === "webgpu" && diag.actualBackend === "unknown", "evidence separation");
        assert(formatWhisperDiagnostics(diag).includes("encoder: webgpu, fp16"), "readable settings");
    });
    await test("Missing/throwing metadata is a diagnostic limitation, not inference failure", () => {
        const unavailable = { get model() { throw new Error("not exposed"); } };
        assert(describeWhisperPipeline(unavailable, options).actualBackend === "unknown", "safe getters");
        assert(!describeWhisperPipeline({}, options).sessions.length, "unavailable sessions");
        assert(formatWhisperDiagnostics(null).includes("unavailable"), "cached older worker fallback");
    });
    await test("Production timing wrapper preserves text/options and distinguishes reuse", async () => {
        const file = { name: "test.m4a" };
        const record = await transcribeRecording(file, "tiny", "fr", "translate");
        assert(record.file === file && record.transcript === "fixture result", "record preserved");
        assert(calls[0] === "metadata" && calls[1] === "decode" && calls[2] === "load:tiny", "original order");
        assert(calls[3].task === "translate" && calls[3].language === "fr", "original inference options");
        for (const key of ["metadataMs", "decodeMs", "loadMs", "inferenceMs"]) assert(Number.isFinite(record.timings[key]) && record.timings[key] >= 0, key);
        assert(record.timings.audioDurationMs === 1000 && record.timings.workerInferenceMs === 25 && record.timings.reused, "timing provenance");
        assert(formatTranscriptionTimings(record.timings).includes("(reused)"), "readable reuse");
    });
    await test("Application display code parses with the new optional diagnostics", async () => {
        const source = await (await fetch("../js/app.js")).text();
        // Compile without executing DOM initialization or production workflows.
        new Function(source.replace(/import\s[\s\S]*?from\s+["'][^"']+["'];/g, ""));
    });
    for (const [filename, ios, model] of [["whisper-desktop-worker.js", false, "large"], ["whisper-test-worker.js", false, "large-test"], ["whisper-ios-worker.js", true, "tiny-ios"]]) {
        await test(`${filename} preserves loader options and returns session/timing evidence`, async () => {
            let source = await (await fetch(`../js/${filename}`)).text();
            source = source.replace('"./whisperDiagnostics.js"', JSON.stringify(new URL("../js/whisperDiagnostics.js", import.meta.url).href));
            source = source.replace(/await import\(\s*"https:[^"]+"\s*\)/g, "({ pipeline: globalThis.__pipeline })");
            source = source.replace(/import \{ pipeline \} from\s*"https:[^"]+";/, "const pipeline = globalThis.__pipeline;");
            const prelude = `globalThis.__pipeline = async (...args) => {
                self.postMessage({type:"captured-load", args});
                const fn = async (audio, options) => { self.postMessage({type:"captured-inference",options}); return {text:"fixture"}; };
                fn.model = {sessions: {encoder: {config: {device:"${ios ? "wasm" : "webgpu"}", dtype:"fp16"}}}};
                return fn;
            };\n`;
            const url = URL.createObjectURL(new Blob([prelude, source], { type: "text/javascript" }));
            const worker = new Worker(url, { type: "module" });
            try {
                const result = await new Promise((resolve, reject) => {
                    const timer = setTimeout(() => reject(new Error("worker test timeout")), 5000);
                    const observations = {};
                    worker.onerror = event => { clearTimeout(timer); reject(new Error(event.message)); };
                    worker.onmessage = event => {
                        const m = event.data;
                        if (m.type === "captured-load") observations.load = m.args;
                        if (m.type === "captured-inference") observations.inference = m.options;
                        if (m.type === "loaded" || m.type === "ready") {
                            observations.diagnostics = m.diagnostics;
                            worker.postMessage(ios ? { type: "transcribe", audioData: new Float32Array([1]), language: "en" } : { type: "transcribe", audio: new Float32Array([1]), options: { task: "transcribe", language: "en" } });
                        }
                        if (m.type === "transcription") { clearTimeout(timer); resolve({ ...observations, reply: m }); }
                        if (m.type === "error") { clearTimeout(timer); reject(new Error(m.message)); }
                    };
                    worker.postMessage({ type: "load", model, repository: "fixture-repository", dtype: { encoder_model: "fp16", decoder_model_merged: "q4" } });
                });
                assert(result.load[1] === "fixture-repository", "repository unchanged");
                assert(ios ? result.load.length === 2 : result.load[2].device === "webgpu" && result.load[2].dtype.decoder_model_merged === "q4", "loader options unchanged");
                assert(result.reply.text === "fixture" && Number.isFinite(result.reply.workerInferenceMs), "timing reply");
                assert(result.diagnostics.selection === model && result.diagnostics.actualBackend === "unknown", "selection and evidence");
                assert(result.inference.chunk_length_s === 30 && result.inference.stride_length_s === 5, "chunk options unchanged");
            } finally { worker.terminate(); URL.revokeObjectURL(url); }
        });
    }
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) { document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack || error}`); }
document.getElementById("results").textContent = lines.join("\n");
