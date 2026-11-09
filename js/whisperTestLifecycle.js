// Disposable self-test orchestration. Dependencies are injected for controlled
// failure tests; no worker/model/database is opened merely by importing this file.
import { hasWhisperReference, validateWhisperOutput, MAX_WHISPER_WER, WHISPER_VALIDATION_PROTOCOL } from "./whisperValidation.js";
export const DEFAULT_TEST_LIMITS = Object.freeze({ prepare: 60000, decode: 60000, release: 30000, load: 600000, inference: 180000 });

function stopError(name, message) {
    const error = new Error(message);
    error.name = name;
    return error;
}

export function createWhisperTestRunner({ loadFixture, decode, createWorker, prepareProduction, acquireActivity, environment, score, checkpoint, diagnostic }) {
    let active = false;
    return async function run({ configuration, onEvent, signal, limits = {} }) {
        if (active) throw new Error("A Whisper self-test is already running.");
        const deadlines = { ...DEFAULT_TEST_LIMITS, ...limits };
        for (const [stage, ms] of Object.entries(deadlines)) {
            if (!Number.isFinite(ms) || ms <= 0 || ms > 2147483647) throw new Error(`Invalid ${stage} timeout.`);
        }
        const runtime = typeof environment === "function" ? environment() : environment;
        const releaseActivity = acquireActivity();
        active = true;
        const started = performance.now();
        let phase = "prepare";
        let decodeMs = null;
        let worker = null;
        const controller = new AbortController();
        const cancel = () => controller.abort();
        signal?.addEventListener("abort", cancel, { once: true });
        if (signal?.aborted) cancel();
        // UI/reporting exceptions must not strand an active worker or lock.
        const emit = event => {
            try { onEvent?.(event); } catch (error) { console.error("Whisper self-test display error:", error); }
        };
        const result = {
            index: 1, model: configuration.family, configurationId: configuration.id,
            label: configuration.label, repository: configuration.repository,
            dtype: configuration.configuration?.dtype ?? "repository default",
            loadMs: null, transcriptionMs: null, releaseMs: null,
            loadStatus: "not-run", transcriptionStatus: "not-run", accuracyStatus: "not-run", validation: null, wer: null, transcript: "",
            status: "failed", failedPhase: null, releaseStatus: "not-attempted", releaseError: null, error: null
        };
        let modelStarted = false;
        const trace = (type, details = {}) => { try { diagnostic?.(type, { configurationId: configuration.id, ...details }); } catch { /* Observability cannot change a run. */ } };
        trace("test-start");

        async function stage(name, task) {
            phase = name;
            trace("test-stage", { phase: name });
            await checkpoint?.(name, { ...result });
            const startedAt = performance.now();
            const deadline = startedAt + deadlines[name];
            emit({ type: "stage-start", phase: name, timeoutMs: deadlines[name] });
            try {
                return await new Promise((resolve, reject) => {
                    let settled = false;
                    let timer;
                    const finish = (fn, value) => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        controller.signal.removeEventListener("abort", abort);
                        fn(value);
                    };
                    const timeout = () => {
                        const error = stopError("TimeoutError", `${name} exceeded its ${deadlines[name] / 1000}-second limit; this does not establish model incompatibility.`);
                        error.timeoutMs = deadlines[name];
                        error.elapsedMs = performance.now() - startedAt;
                        error.visibility = typeof document === "undefined" ? "unknown" : document.visibilityState;
                        finish(reject, error);
                    };
                    const abort = () => finish(reject, stopError("AbortError", "Self-test cancelled."));
                    controller.signal.addEventListener("abort", abort, { once: true });
                    if (controller.signal.aborted) { abort(); return; }
                    timer = setTimeout(timeout, deadlines[name]);
                    const accept = (fn, value) => {
                        if (settled) return;
                        if (performance.now() >= deadline) timeout();
                        else finish(fn, value);
                    };
                    Promise.resolve().then(() => {
                        if (!settled) return task();
                    }).then(value => accept(resolve, value), error => accept(reject, error));
                });
            } finally {
                // Decode may finish late; its result cannot restart this run.
                if (worker) worker.onmessage = worker.onerror = worker.onmessageerror = null;
            }
        }

        function workerStage(expected, message) {
            return new Promise((resolve, reject) => {
                let done = false;
                const settle = (fn, value) => { if (!done) { done = true; fn(value); } };
                worker.onmessage = event => {
                    if (done || controller.signal.aborted) return;
                    try {
                        const reply = event.data || {};
                        if (reply.type === "status" || reply.type === "boot") {
                            emit({ type: "model-status", index: 1, model: configuration.id, message: reply.message });
                        } else if (reply.type === "error") {
                            settle(reject, new Error(reply.message || "Whisper test worker error."));
                        } else if (reply.type === expected) {
                            settle(resolve, reply);
                        } else if (reply.type === "transcription" && expected !== "transcription") {
                            settle(reject, new Error("Whisper replied with transcription before loading completed."));
                        }
                    } catch (error) { settle(reject, error); }
                };
                worker.onerror = event => settle(reject, new Error(event?.message || "Whisper test worker failed."));
                worker.onmessageerror = () => settle(reject, new Error("Whisper test worker returned an unreadable message."));
                try { worker.postMessage(message); } catch (error) { settle(reject, error); }
            });
        }

        emit({ type: "run-start", environment: runtime, sequence: [configuration.id], selectedModel: configuration.id, limits: deadlines, validationProtocol: WHISPER_VALIDATION_PROTOCOL, maxWer: MAX_WHISPER_WER });
        try {
            emit({ type: "preparing", message: "Loading test audio and expected transcription…" });
            const fixture = await stage("prepare", () => loadFixture(controller.signal));
            phase = "fixture-validation";
            if (!hasWhisperReference(fixture.expectedText)) throw stopError("ValidationError", "Expected transcript is empty or invalid; no model test was attempted.");
            const decodeStarted = performance.now();
            const audio = await stage("decode", () => decode(fixture.audioFile));
            decodeMs = performance.now() - decodeStarted;
            emit({ type: "audio-ready", filename: fixture.audioFile.name, bytes: fixture.audioFile.size, decodeMs });
            await stage("release", prepareProduction);
            modelStarted = true;
            emit({ type: "model-start", result: { ...result } });
            const loadStarted = performance.now();
            const loaded = await stage("load", () => {
                trace("test-worker-create-requested");
                worker = createWorker();
                trace("test-worker-created");
                return workerStage(runtime.operatingSystem === "ios" ? "ready" : "loaded", {
                    type: "load", model: configuration.id, repository: configuration.repository,
                    ...(runtime.operatingSystem === "ios" ? {} : { dtype: configuration.configuration?.dtype ?? null })
                });
            });
            result.diagnostics = loaded.diagnostics || null;
            result.loadMs = performance.now() - loadStarted;
            result.loadStatus = "passed";
            emit({ type: "load-complete", index: 1, model: configuration.id, loadMs: result.loadMs });
            const inferenceStarted = performance.now();
            const reply = await stage("inference", () => workerStage("transcription", runtime.operatingSystem === "ios"
                ? { type: "transcribe", audioData: audio, language: null }
                : { type: "transcribe", audio }));
            result.transcriptionMs = performance.now() - inferenceStarted;
            result.workerInferenceMs = reply.workerInferenceMs;
            result.audioDurationMs = audio.length / 16000 * 1000;
            result.diagnostics = reply.diagnostics || result.diagnostics;
            result.transcript = typeof reply.text === "string" ? reply.text : "";
            result.transcriptionStatus = "passed";
            phase = "validation";
            trace("test-stage", { phase: "validation" });
            await checkpoint?.("validation", { ...result });
            result.validation = validateWhisperOutput(fixture.expectedText, reply.text, score);
            result.wer = result.validation.wer;
            result.accuracyStatus = result.validation.status;
            if (result.accuracyStatus !== "passed") throw stopError("ValidationError", result.validation.message);
            result.status = "passed";
        } catch (error) {
            result.status = error.name === "AbortError" ? "cancelled" : error.name === "TimeoutError" ? "timed-out" : "failed";
            result.failedPhase = phase;
            result.error = { name: error.name || "Error", message: error.message || String(error), stack: error.stack || "", timeoutMs: error.timeoutMs, elapsedMs: error.elapsedMs, visibility: error.visibility };
            if (phase === "load") result.loadStatus = result.status;
            if (phase === "inference") result.transcriptionStatus = result.status;
        } finally {
            controller.abort(); // Aborts owned fixture fetches, including a sibling after failure.
            const releaseStarted = performance.now();
            if (worker) {
                worker.onmessage = worker.onerror = worker.onmessageerror = null;
                try {
                    trace("test-worker-terminate-requested");
                    worker.terminate();
                    trace("test-worker-termination-invoked");
                    result.releaseStatus = "termination-invoked";
                } catch (error) {
                    trace("test-worker-termination-failed", { message: error.message });
                    result.releaseStatus = "failed";
                    result.releaseError = error.message || String(error);
                }
                worker = null;
            }
            result.releaseMs = performance.now() - releaseStarted;
            signal?.removeEventListener("abort", cancel);
            releaseActivity();
            active = false;
        }
        trace("test-finished", { status: result.status, phase: result.failedPhase || phase, cleanup: result.releaseStatus });
        if (modelStarted) {
            emit({ type: "model-released", index: 1, model: configuration.id, releaseMs: result.releaseMs, releaseStatus: result.releaseStatus });
            emit({ type: "model-complete", result: { ...result } });
        } else {
            emit({ type: "run-error", phase: result.failedPhase, status: result.status, error: result.error });
        }
        const summary = {
            elapsedMs: performance.now() - started, decodeMs,
            passed: Number(result.status === "passed"), failed: Number(result.status === "failed"),
            cancelled: Number(result.status === "cancelled"), timedOut: Number(result.status === "timed-out"),
            released: Number(result.releaseStatus === "termination-invoked"), releaseFailures: Number(result.releaseStatus === "failed"),
            results: [result]
        };
        emit({ type: "run-complete", summary });
        return summary;
    };
}
