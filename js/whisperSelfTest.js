// --------------------------------------------------
// Memora Whisper Self-Test
// --------------------------------------------------

import { decodeAudio } from "./audioProcessor.js";
import { getModelRegistryBaseline } from "./modelManager.js";

const TEST_AUDIO_URL = "./data/whisper-test/test-audio.m4a";
const EXPECTED_TEXT_URL = "./data/whisper-test/expected-transcription.txt";
// Desktop tests use the explicit WebGPU configurations.
// iPhone/iPad tests use the platform-specific WASM configurations from
// the same model registry.
const DESKTOP_TEST_SEQUENCE = [
    "tiny-webgpu-default",
    "base-webgpu-default",
    "small-webgpu-default",
    "medium-webgpu-fp16-q4",
    "medium-webgpu-q4f16",
    "medium-webgpu-q4",
    "large-webgpu-fp16-q4"
];

const IOS_TEST_SEQUENCE = [
    "tiny-iphone-default",
    "base-iphone-default",
    "small-iphone-default",
    "medium-iphone-default",
    "large-iphone-default"
];

function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[“”‘’]/g, "'")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

function wordErrorRate(reference, hypothesis) {
    const ref = normalizeText(reference).split(/\s+/).filter(Boolean);
    const hyp = normalizeText(hypothesis).split(/\s+/).filter(Boolean);

    if (!ref.length) return hyp.length ? 1 : 0;

    const previous = Array.from({ length: hyp.length + 1 }, (_, i) => i);

    for (let i = 1; i <= ref.length; i++) {
        const current = [i];

        for (let j = 1; j <= hyp.length; j++) {
            const substitution = previous[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
            const insertion = current[j - 1] + 1;
            const deletion = previous[j] + 1;
            current[j] = Math.min(substitution, insertion, deletion);
        }

        for (let j = 0; j <= hyp.length; j++) {
            previous[j] = current[j];
        }
    }

    return previous[hyp.length] / ref.length;
}

function formatSeconds(ms) {
    return `${(ms / 1000).toFixed(1)} s`;
}

function getErrorDetails(error) {
    return {
        name: error?.name || "Error",
        message: error?.message || String(error),
        stack: error?.stack || ""
    };
}

async function loadTestAudio() {
    const response = await fetch(TEST_AUDIO_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Unable to load ${TEST_AUDIO_URL} (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    return new File([blob], "test-audio.m4a", {
        type: blob.type || "audio/mp4"
    });
}

async function loadExpectedText() {
    const response = await fetch(EXPECTED_TEXT_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Unable to load ${EXPECTED_TEXT_URL} (HTTP ${response.status}).`);
    }
    return response.text();
}

function getEnvironment() {
    const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    return {
        platform: isIOS ? "iOS" : "Desktop",
        runtime: isIOS ? "WASM / iPhone worker" : "WebGPU",
        webgpu: "gpu" in navigator
    };
}

export async function runWhisperSelfTest({ onEvent } = {}) {
    const emit = event => {
        onEvent?.(event);
    };

    const startedAt = performance.now();
    const environment = getEnvironment();

    const testSequence =
        environment.platform === "iOS"
            ? IOS_TEST_SEQUENCE
            : DESKTOP_TEST_SEQUENCE;

    emit({ type: "run-start", environment, sequence: [...testSequence] });

    let audioFile;
    let expectedText;

    try {
        emit({ type: "preparing", message: "Loading test audio and expected transcription…" });
        [audioFile, expectedText] = await Promise.all([
            loadTestAudio(),
            loadExpectedText()
        ]);
    } catch (error) {
        const details = getErrorDetails(error);
        emit({ type: "run-error", phase: "prepare", error: details });
        throw error;
    }

    let audio;
    const decodeStarted = performance.now();

    try {
        audio = await decodeAudio(audioFile);
    } catch (error) {
        const details = getErrorDetails(error);
        emit({ type: "run-error", phase: "decode", error: details });
        throw error;
    }

    const decodeMs = performance.now() - decodeStarted;
    const results = [];

    emit({
        type: "audio-ready",
        filename: audioFile.name,
        bytes: audioFile.size,
        decodeMs
    });

    const registry = getModelRegistryBaseline();
    const configurations = testSequence.map(id =>
        registry.find(record => record.id === id)
    );

    if (configurations.some(configuration => !configuration)) {
        throw new Error("One or more Whisper self-test configurations are missing from the model registry.");
    }

    emit({
        type: "test-plan",
        message:
            environment.platform === "iOS"
                ? "Each iPhone/iPad WASM configuration uses the normal iPhone Whisper worker. The worker is released before the next configuration is started."
                : "Each desktop WebGPU configuration runs in a brand-new disposable Web Worker. The worker is terminated before the next configuration is started. This isolates each model test from the previous model."
    });

    for (let index = 0; index < configurations.length; index++) {
        const configuration = configurations[index];
        const result = {
            index: index + 1,
            model: configuration.family,
            configurationId: configuration.id,
            label: configuration.label,
            repository: configuration.repository,
            dtype:
                configuration.configuration?.dtype ??
                (environment.platform === "iOS" ? "repository default" : "repository default"),
            loadMs: null,
            transcriptionMs: null,
            releaseMs: null,
            loadStatus: "not-run",
            transcriptionStatus: "not-run",
            wer: null,
            transcript: "",
            status: "failed",
            failedPhase: null,
            releaseStatus: "not-attempted",
            releaseError: null,
            error: null
        };

        emit({ type: "model-start", result: { ...result } });

        let worker = null;
        const testStartedAt = performance.now();

        try {
            worker = new Worker(
                environment.platform === "iOS"
                    ? "./js/whisper-worker.js"
                    : "./js/whisper-test-worker.js",
                { type: "module" }
            );

            await new Promise((resolve, reject) => {
                let settled = false;
                const finish = fn => value => {
                    if (settled) return;
                    settled = true;
                    fn(value);
                };

                const resolveOnce = finish(resolve);
                const rejectOnce = finish(reject);

                worker.onmessage = event => {
                    const message = event.data;

                    if (message.type === "boot") {
                        emit({
                            type: "model-status",
                            index: result.index,
                            model: result.configurationId,
                            message: message.message
                        });
                        return;
                    }

                    if (message.type === "status") {
                        emit({
                            type: "model-status",
                            index: result.index,
                            model: result.configurationId,
                            message: message.message
                        });
                        return;
                    }

                    if (
                        message.type === "loaded" ||
                        (environment.platform === "iOS" && message.type === "ready")
                    ) {
                        result.loadMs = performance.now() - testStartedAt;
                        result.loadStatus = "passed";

                        emit({
                            type: "load-complete",
                            index: result.index,
                            model: result.configurationId,
                            loadMs: result.loadMs
                        });

                        if (environment.platform === "iOS") {
                            worker.postMessage({
                                type: "transcribe",
                                audioData: audio,
                                language: null
                            });
                        } else {
                            worker.postMessage({
                                type: "transcribe",
                                audio
                            });
                        }
                        return;
                    }

                    if (message.type === "transcription") {
                        result.transcriptionMs =
                            performance.now() - testStartedAt - result.loadMs;
                        result.transcript = message.text || "";
                        result.wer = wordErrorRate(expectedText, result.transcript);
                        result.transcriptionStatus = "passed";
                        result.status = "passed";
                        resolveOnce();
                        return;
                    }

                    if (message.type === "error") {
                        rejectOnce(new Error(message.message || "Whisper test worker error."));
                    }
                };

                worker.onerror = event => {
                    const detail = [
                        event?.message,
                        event?.filename ? `file: ${event.filename}` : "",
                        Number.isFinite(event?.lineno) ? `line: ${event.lineno}` : "",
                        Number.isFinite(event?.colno) ? `column: ${event.colno}` : ""
                    ].filter(Boolean).join(" | ");

                    rejectOnce(new Error(
                        detail || "Whisper test worker failed before it could report an error."
                    ));
                };

                worker.postMessage(
                    environment.platform === "iOS"
                        ? {
                            type: "load",
                            model: configuration.id,
                            repository: configuration.repository
                        }
                        : {
                            type: "load",
                            model: configuration.id,
                            repository: configuration.repository,
                            dtype: configuration.configuration?.dtype ?? null
                        }
                );
            });
        } catch (error) {
            result.error = getErrorDetails(error);
            result.failedPhase =
                result.loadStatus === "not-run" ? "load" : "transcription";

            if (result.loadStatus === "passed") {
                result.transcriptionStatus = "failed";
            }
        } finally {
            const releaseStarted = performance.now();

            if (worker) {
                worker.terminate();
                worker = null;
            }

            result.releaseStatus = "worker-terminated";
            result.releaseMs = performance.now() - releaseStarted;

            emit({
                type: "model-released",
                index: result.index,
                model: result.configurationId,
                releaseMs: result.releaseMs,
                releaseStatus: result.releaseStatus
            });
        }

        results.push(result);
        emit({ type: "model-complete", result: { ...result } });

        await new Promise(resolve => setTimeout(resolve, 500));
    }


    const summary = {
        elapsedMs: performance.now() - startedAt,
        decodeMs,
        passed: results.filter(result => result.status === "passed").length,
        failed: results.filter(result => result.status === "failed").length,
        released: results.filter(result => result.releaseStatus === "worker-terminated").length,
        releaseFailures: results.filter(result => result.releaseStatus !== "worker-terminated").length,
        results
    };

    emit({ type: "run-complete", summary });
    return summary;
}
