import { createWhisperExecutionJournal } from "./whisper-executions-fixture.js";
import { describeWhisperFailure, annotateWhisperFailure, atWhisperFailureBoundary } from "../js/whisperFailures.js";
const lines = [], urls = [];
const assert = (value, message) => { if (!value) throw new Error(message); };
async function test(label, action) { await action(); lines.push(`PASS ${label}`); }
const output = document.getElementById("results");
const moduleURL = source => { const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" })); urls.push(url); return url; };
try {
    await test("boundary categories never infer model incompatibility from text", () => {
        for (const [stage, category] of [["metadata", "input-preparation"], ["decode", "input-preparation"], ["paragraphing", "post-processing"], ["save", "post-processing"], ["eligibility", "eligibility-check"]]) {
            const failure = describeWhisperFailure(new Error("GPU out of memory"), { stage });
            assert(failure.category === category, stage);
        }
        for (const source of ["loader", "worker-reply", "worker-event"]) {
            const failure = describeWhisperFailure(new Error("network or runtime or out of memory"), { stage: "load", source });
            assert(failure.certainty === "unknown", "text cannot prove cause");
        }
    });
    await test("abort and non-Error exceptions preserve diagnostic truth", () => {
        const original = new DOMException("download aborted", "AbortError");
        const wrapped = annotateWhisperFailure(original, { stage: "load" });
        assert(wrapped.name === "AbortError" && wrapped.cause === original, "abort preserved");
        assert(wrapped.whisperFailure.category === "aborted" && wrapped.whisperFailure.certainty === "unknown", "no invented user intent");
        assert(annotateWhisperFailure("failure", { stage: "decode" }).message === "failure", "thrown string preserved");
        const serialized = JSON.parse(JSON.stringify(wrapped.whisperFailure));
        assert(serialized.error.message === "download aborted", "serializable evidence");
    });
    await test("inner exact configuration and original cause survive outer catches", async () => {
        const original = new Error("runtime text");
        const inner = annotateWhisperFailure(original, { stage: "inference", source: "worker-reply", configurationId: "tiny-webgpu-default" });
        let observed;
        try { await atWhisperFailureBoundary({ stage: "inference" }, () => { throw inner; }); } catch (error) { observed = error; }
        assert(observed === inner && observed.cause === original, "specific evidence not replaced");
        assert(observed.whisperFailure.configurationId === "tiny-webgpu-default", "exact ID retained");
        assert(Object.isFrozen(observed.whisperFailure) && Object.isFrozen(observed.whisperFailure.error), "immutable description");
    });
    await test("actual transcription workflow attributes injected failures and releases ownership", async () => {
        let stage = "", called = [];
        globalThis.__whisperFailureFixture = async name => {
            called.push(name);
            if (name === stage) throw new Error(`injected ${name}`);
            if (name === "decode") return new Float32Array(160);
            if (name === "inference") return { text: "fixture", workerInferenceMs: 1 };
            return {};
        };
        const fixtures = moduleURL(`export const readAudioMetadata = () => globalThis.__whisperFailureFixture("metadata");
            export const decodeAudio = () => globalThis.__whisperFailureFixture("decode");
            export const loadTranscriber = () => globalThis.__whisperFailureFixture("load");
            export const transcribeAudio = () => globalThis.__whisperFailureFixture("inference");`);
        let source = await (await fetch("../js/transcription.js")).text();
        for (const file of ["metadata.js", "audioProcessor.js", "whisper.js"]) source = source.replaceAll(`"./${file}"`, JSON.stringify(fixtures));
        source = source.replace(/from "\.\/([^"\n]+)"/g, (_, file) => `from ${JSON.stringify(new URL("../js/" + file, import.meta.url).href)}`);
        const workflow = await import(moduleURL(source));
        for (stage of ["metadata", "decode", "load", "inference"]) {
            called = []; let error;
            try { await workflow.transcribeRecording({ name: "fixture.wav" }, "tiny", "auto", "transcribe"); } catch (failure) { error = failure; }
            assert(error?.whisperFailure.stage === stage, `exact boundary ${stage}`);
            assert(error.message === `injected ${stage}`, "user error text preserved");
            assert(called.at(-1) === stage, "later stages not executed");
        }
        stage = "";
        const record = await workflow.transcribeRecording({ name: "fixture.wav" }, "tiny", "auto", "transcribe");
        assert(record.transcript === "fixture" && record.model === "tiny", "success and activity release unchanged");
        const journal = createWhisperExecutionJournal();
        assert(journal.list().find(item => item.id === record.executionId)?.modelOutcome === "completed", "same durable ID returned after model completion");
        let saveError;
        try { await workflow.transcribeRecording({ name: "fixture.wav" }, "tiny", "auto", "transcribe", null, async (_record, execution) => {
            execution.checkpoint("save");
            await atWhisperFailureBoundary({ stage: "save" }, () => { throw new Error("save failed fixture"); });
        }); } catch (error) { saveError = error; }
        const failedSave = journal.list().find(item => item.id === saveError?.executionId);
        assert(failedSave?.phase === "save" && failedSave.modelOutcome === "completed" && failedSave.failure.category === "post-processing", "real workflow callback distinguishes saved model success from save failure");
    });
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) { document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack}`); }
finally { urls.forEach(url => URL.revokeObjectURL(url)); delete globalThis.__whisperFailureFixture; output.textContent = lines.join("\n"); }
