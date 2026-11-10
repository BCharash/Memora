import { createWhisperWorkerErrorMessage } from "./whisperFailures.js";
import { describeWhisperPipeline } from "./whisperDiagnostics.js";

import { pipeline } from
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

let transcriber = null;
let loadedModel = null;
let diagnostics = null;
let disposing = false;

self.onmessage = async event => {

    const message =
        event.data;

    if (message.type === "dispose") {
        // Detach model references before awaiting the library's release call.
        // The owner always terminates this disposable worker afterward.
        const current = transcriber;
        transcriber = null;
        diagnostics = null;
        loadedModel = null;
        disposing = true;
        let status = "not-loaded", error = null;
        try {
            if (current) {
                if (typeof current.dispose !== "function") status = "unavailable";
                else { await current.dispose(); status = "completed"; }
            }
        } catch (failure) { status = "failed"; error = failure.message || String(failure); }
        self.postMessage({ type: "disposed", requestId: message.requestId, status, error });
        return;
    }
    if (disposing) {
        self.postMessage(createWhisperWorkerErrorMessage(new Error("This worker is disposing its model and cannot accept more work."), { stage: message.type === "load" ? "load" : "inference", configurationId: message.model || loadedModel, boundary: "worker-state" }));
        return;
    }

    if (message.type === "load") {

        if (
            transcriber &&
            loadedModel === message.model
        ) {
            self.postMessage({
                type: "ready",
                diagnostics,
                model: message.model
            });
            return;
        }

        try {

            self.postMessage({
                type: "status",
                message:
                    `Loading Whisper ${message.model} on iPhone/iPad…`
            });

            transcriber =
                await pipeline(
                    "automatic-speech-recognition",
                    message.repository
                );

            loadedModel =
                message.model;

            diagnostics = describeWhisperPipeline(transcriber, {
                model: message.model, repository: message.repository,
                requestedBackend: "runtime default (WASM intended)",
                transformersVersion: "3.7.2", worker: "production iOS worker"
            });

            self.postMessage({
                type: "ready",
                diagnostics,
                model: message.model
            });

        } catch (error) {

            self.postMessage(createWhisperWorkerErrorMessage(error, { stage: "load", configurationId: message.model, boundary: "pipeline-create" }));
        }

        return;
    }

    if (message.type === "transcribe") {

        if (!transcriber) {

            self.postMessage(createWhisperWorkerErrorMessage(new Error("Whisper is not loaded."), { stage: "inference", configurationId: loadedModel, boundary: "worker-state" }));

            return;
        }

        try {

            const inferenceStarted = performance.now();
            const result =
                await transcriber(
                    message.audioData,
                    {
                        language: message.language,
                        task: "transcribe",
                        chunk_length_s: 30,
                        stride_length_s: 5
                    }
                );

            self.postMessage({
                type: "transcription",
                diagnostics,
                workerInferenceMs: performance.now() - inferenceStarted,
                text: result.text
            });

        } catch (error) {

            self.postMessage(createWhisperWorkerErrorMessage(error, { stage: "inference", configurationId: loadedModel, boundary: "pipeline-call" }));
        }
    }
};
