import { validateWhisperOutput, wordErrorRate, MAX_WHISPER_WER, formatWhisperWer } from "../js/whisperValidation.js";
import { createWhisperTestRunner } from "../js/whisperTestLifecycle.js";
import { acquireWhisperActivity } from "../js/whisperActivity.js";
import { initSettingsUI } from "../js/settings.js";

const lines = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function test(label, fn) { await fn(); lines.push(`PASS ${label}`); }
const reference = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty";
const threeErrors = reference.split(" ").map((word, i) => i < 3 ? "wrong" : word).join(" ");
const fourErrors = reference.split(" ").map((word, i) => i < 4 ? "wrong" : word).join(" ");
const configuration = { id: "tiny-fixture", family: "tiny", label: "Tiny", repository: "fixture" };
function runner({ expectedText = reference, text = reference, score } = {}) {
    let created = 0; let terminated = 0;
    const run = createWhisperTestRunner({
        loadFixture: async () => ({ audioFile: { name: "fixture", size: 1 }, expectedText }),
        decode: async () => new Float32Array([1, 2]), prepareProduction: async () => {},
        acquireActivity: () => acquireWhisperActivity("self-test"), environment: { operatingSystem: "macos" }, score,
        createWorker: () => {
            created++;
            return { terminate() { terminated++; }, postMessage(m) {
                this.onmessage({ data: m.type === "load" ? { type: "loaded" } : { type: "transcription", text } });
            } };
        }
    });
    return { run: () => run({ configuration }), created: () => created, terminated: () => terminated };
}
const originals = { fetch: window.fetch, Worker: window.Worker, AudioContext: window.AudioContext };
try {
    await test("Inclusive 15% boundary and above-boundary rejection", () => {
        assert(MAX_WHISPER_WER === 0.15, "approved threshold");
        assert(wordErrorRate(reference, threeErrors) === 0.15 && validateWhisperOutput(reference, threeErrors).status === "passed", "exact 15 percent");
        assert(validateWhisperOutput(reference, fourErrors).status === "failed", "20 percent");
        assert(validateWhisperOutput(reference, reference, () => 0.150001).status === "failed", "no rounding into pass");
        assert(formatWhisperWer(0.150001) === ">15.00%", "no misleading boundary display");
    });
    await test("Existing case and punctuation normalization retained", () => {
        assert(validateWhisperOutput("Hello, WORLD!", "hello world").wer === 0, "case/punctuation");
        assert(wordErrorRate("That’s a test", "That's a test") === 0, "curly apostrophe");
        assert(wordErrorRate("21", "twenty one") > 0, "number spellings not silently normalized");
    });
    await test("Missing, empty and punctuation-only outputs cannot pass", () => {
        for (const text of [undefined, null, {}, 12, "", "   ", "…!!!"]) {
            assert(validateWhisperOutput(reference, text).status === "failed", "reject invalid output");
        }
    });
    await test("Invalid reference cannot certify an output", () => {
        for (const text of [undefined, null, {}, "", "!!!"]) assert(validateWhisperOutput(text, "test").reason === "invalid-reference", "invalid reference");
    });
    await test("NaN, infinity, negative, nonnumeric and thrown scores cannot pass", () => {
        for (const value of [NaN, Infinity, -Infinity, -0.1, "0", null]) {
            const v = validateWhisperOutput(reference, reference, () => value);
            assert(v.reason === "invalid-score" && v.wer === null, "invalid score");
        }
        assert(validateWhisperOutput(reference, reference, () => { throw new Error("bad score"); }).reason === "invalid-score", "thrown score");
        const v = validateWhisperOutput("one", "one two three");
        assert(v.wer === 2 && v.reason === "wer-exceeded", "WER over 100% is valid but fails threshold");
    });
    await test("Real validator turns only eligible completed inference into PASS", async () => {
        for (const [text, pass] of [[reference, true], [threeErrors, true], [fourErrors, false], ["", false], [{ invalid: true }, false]]) {
            const f = runner({ text }); const summary = await f.run(); const r = summary.results[0];
            assert(r.transcriptionStatus === "passed", "inference completion retained");
            assert(r.accuracyStatus === (pass ? "passed" : "failed") && summary.passed === Number(pass), "quality verdict");
            assert(pass || r.failedPhase === "validation", "failure stage");
            assert(f.terminated() === 1 && r.validation.protocol === "whisper-fixture-wer-v1", "cleanup/protocol");
        }
    });
    await test("Invalid-score result preserves text and inference status", async () => {
        const f = runner({ score: () => NaN }); const r = (await f.run()).results[0];
        assert(r.status === "failed" && r.transcriptionStatus === "passed" && r.transcript === reference && r.wer === null, "honest evidence");
    });
    await test("Invalid fixture fails before a worker is created and releases activity", async () => {
        const f = runner({ expectedText: "!!!" }); const r = (await f.run()).results[0];
        assert(r.failedPhase === "fixture-validation" && f.created() === 0, "preflight gate");
        acquireWhisperActivity("transcription")();
    });
    await test("Settings shows accuracy failure, keeps transcript and supports retry", async () => {
        const report = { browser: { usage: 0, quota: 100 }, indexedDB: { semanticEntries: { count: 0, embeddingBytes: 0, representations: [] }, transcripts: { count: 0, bytes: 0 }, otherBytes: 0, otherCount: 0, otherStores: [] }, modelCache: { models: [] } };
        window.fetch = async url => {
            if (String(url).endsWith("expected-transcription.txt")) return { ok: true, text: async () => reference };
            if (String(url).endsWith("test-audio.m4a")) return { ok: true, blob: async () => new Blob(["fixture"]) };
            return { ok: false, status: 503 };
        };
        window.AudioContext = class {
            async decodeAudioData() { return { sampleRate: 16000, getChannelData: () => new Float32Array([1, 2]) }; }
            async close() {}
        };
        let output = fourErrors;
        window.Worker = class {
            postMessage(m) { this.onmessage({ data: m.type === "load" ? { type: "loaded" } : { type: "transcription", text: output } }); }
            terminate() {}
        };
        const ui = initSettingsUI({ getStorageManager: async () => ({ getStorageReport: async () => report }), getStorage: async () => ({}) });
        await ui.refresh();
        const run = document.querySelector('[data-settings-action="run-whisper-self-test"]');
        async function runAndWait() {
            run.click(); const until = performance.now() + 3000;
            while (run.disabled) { if (performance.now() > until) throw new Error("UI timeout"); await new Promise(resolve => setTimeout(resolve, 10)); }
            return document.getElementById("settingsWhisperSelfTestDetail");
        }
        let detail = await runAndWait();
        assert(detail.textContent.includes("Inference completed; accuracy failed") && detail.textContent.includes("20.00%"), "quality failure display");
        assert(detail.querySelector("pre").textContent === fourErrors, "failed transcript retained");
        output = threeErrors; detail = await runAndWait();
        assert(detail.textContent.includes("accuracy passed") && detail.textContent.includes("15.00% (limit 15%)"), "inclusive UI verdict");
    });
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) { document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack || error}`); }
finally {
    Object.assign(window, originals);
    document.getElementById("results").textContent = lines.join("\n");
}
