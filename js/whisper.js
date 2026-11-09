import { recordRuntimeDiagnostic } from "./runtimeDiagnostics.js";
import { requireWhisperProductionEligibility } from "./whisperProductionEligibility.js";
import { isIOS } from "./runtime.js";


function terminateWhisperWorker(worker, role) {
    recordRuntimeDiagnostic("production-worker-terminate-requested", { role });
    try {
        worker.terminate();
        recordRuntimeDiagnostic("production-worker-termination-invoked", { role });
    } catch (error) {
        recordRuntimeDiagnostic("production-worker-termination-failed", { role, message: error.message });
        throw error;
    }
}

let whisperWorker = null;
let workerLoadPromise = null;
let workerTranscriptionPromise = null;

let desktopWhisperWorker = null;
let desktopWorkerLoadPromise = null;
let desktopWorkerTranscriptionPromise = null;


function createDesktopWhisperWorker() {
    if (desktopWhisperWorker) {
        return desktopWhisperWorker;
    }

    recordRuntimeDiagnostic("production-worker-create-requested", { role: "desktop" });
    desktopWhisperWorker = new Worker(
        "./js/whisper-desktop-worker.js",
        { type: "module" }
    );

    recordRuntimeDiagnostic("production-worker-created", { role: "desktop" });
    desktopWhisperWorker.onmessage = event => {
        const message = event.data;

        if (message.type === "status") {
            desktopWorkerLoadPromise?.statusCallback?.(message.message);
            return;
        }

        if (message.type === "loaded") {
            loadedDiagnostics = message.diagnostics || null;
            if (desktopWorkerLoadPromise) {
                const resolve = desktopWorkerLoadPromise.resolve;
                desktopWorkerLoadPromise = null;
                loadedModel = message.model;
                resolve();
            }
            return;
        }

        if (message.type === "transcription") {
            if (desktopWorkerTranscriptionPromise) {
                const resolve = desktopWorkerTranscriptionPromise.resolve;
                desktopWorkerTranscriptionPromise = null;
                resolve({ text: message.text, diagnostics: message.diagnostics || loadedDiagnostics, workerInferenceMs: message.workerInferenceMs });
            }
            return;
        }

        if (message.type === "error") {
            const error = new Error(
                message.message || "Desktop Whisper worker error."
            );

            if (desktopWorkerLoadPromise) {
                const reject = desktopWorkerLoadPromise.reject;
                desktopWorkerLoadPromise = null;
                reject(error);
                return;
            }

            if (desktopWorkerTranscriptionPromise) {
                const reject = desktopWorkerTranscriptionPromise.reject;
                desktopWorkerTranscriptionPromise = null;
                reject(error);
            }
        }
    };

    desktopWhisperWorker.onerror = error => {
        const workerError = new Error(
            error?.message || "Desktop Whisper worker error."
        );

        if (desktopWorkerLoadPromise) {
            const reject = desktopWorkerLoadPromise.reject;
            desktopWorkerLoadPromise = null;
            reject(workerError);
            return;
        }

        if (desktopWorkerTranscriptionPromise) {
            const reject = desktopWorkerTranscriptionPromise.reject;
            desktopWorkerTranscriptionPromise = null;
            reject(workerError);
        }
    };

    return desktopWhisperWorker;
}


function createWhisperWorker() {

    if (whisperWorker) {
        return whisperWorker;
    }

    recordRuntimeDiagnostic("production-worker-create-requested", { role: "ios" });
    whisperWorker =
        new Worker(
            "./js/whisper-ios-worker.js",
            {
                type: "module"
            }
        );

    recordRuntimeDiagnostic("production-worker-created", { role: "ios" });
    whisperWorker.onmessage =
        event => {

            const message =
                event.data;

            if (message.type === "status") {

                if (workerLoadPromise) {
                    workerLoadPromise.statusCallback?.(
                        message.message
                    );
                }

                return;
            }

            if (message.type === "ready") {
                loadedDiagnostics = message.diagnostics || null;

                if (workerLoadPromise) {

                    const resolve =
                        workerLoadPromise.resolve;

                    workerLoadPromise =
                        null;

                    loadedModel =
                        message.model;

                    resolve();
                }

                return;
            }

            if (message.type === "transcription") {

                if (workerTranscriptionPromise) {

                    const resolve =
                        workerTranscriptionPromise.resolve;

                    workerTranscriptionPromise =
                        null;

                    resolve(
                        { text: message.text, diagnostics: message.diagnostics || loadedDiagnostics, workerInferenceMs: message.workerInferenceMs }
                    );
                }

                return;
            }

            if (message.type === "error") {

                const error =
                    new Error(
                        message.message ||
                        "Whisper worker error."
                    );

                if (workerLoadPromise) {

                    const reject =
                        workerLoadPromise.reject;

                    workerLoadPromise =
                        null;

                    reject(error);

                    return;
                }

                if (workerTranscriptionPromise) {

                    const reject =
                        workerTranscriptionPromise.reject;

                    workerTranscriptionPromise =
                        null;

                    reject(error);
                }
            }
        };

    whisperWorker.onerror =
        error => {

            const workerError =
                new Error(
                    error?.message ||
                    "Whisper worker error."
                );

            if (workerLoadPromise) {

                const reject =
                    workerLoadPromise.reject;

                workerLoadPromise =
                    null;

                reject(workerError);

                return;
            }

            if (workerTranscriptionPromise) {

                const reject =
                    workerTranscriptionPromise.reject;

                workerTranscriptionPromise =
                    null;

                reject(workerError);
            }
        };

    return whisperWorker;
}

// --------------------------------------------------
// Whisper transcription engine
// --------------------------------------------------

let transcriber = null;
let loadedModel = null;
let loadedDiagnostics = null;
let lastLoadReused = false;

export function getWhisperLoadDiagnostics() {
    return { diagnostics: loadedDiagnostics, reused: lastLoadReused };
}


async function loadTranscriberDefinition(
    definition,
    identity,
    statusCallback
) {

    if (!definition) {
        throw new Error("Whisper model definition is required.");
    }

    // Keep the currently loaded model for repeated transcriptions. Only
    // replace it when the requested implementation actually changes.
    if (transcriber && loadedModel === identity) {
        lastLoadReused = true;
        return transcriber;
    }

    if (transcriber) {
        await releaseTranscriber();
    }
    lastLoadReused = false;
    loadedDiagnostics = null;

    console.log("[Whisper diagnostic] Resolved model configuration:", {
        requestedModel: identity,
        repository: definition.repository,
        dtype: isIOS ? null : definition.dtype ?? null,
        transformersVersion: isIOS ? "3.7.2" : "4.0.0",
        runtime: isIOS ? "iphone-worker" : "webgpu",
    });

    if (statusCallback) {
        statusCallback(
            isIOS
                ? `Loading Whisper ${definition.label} on iPhone/iPad…`
                : `Loading Whisper ${definition.label} using WebGPU…`
        );
    }

    try {

        if (isIOS) {

            const worker =
                createWhisperWorker();

            workerLoadPromise =
                {};

            workerLoadPromise.promise =
                new Promise(
                    (resolve, reject) => {

                        workerLoadPromise.resolve =
                            resolve;

                        workerLoadPromise.reject =
                            reject;

                        workerLoadPromise.statusCallback =
                            statusCallback;
                    }
                );

            worker.postMessage({
                type: "load",
                model: identity,
                repository:
                    definition.repository
            });

            await workerLoadPromise.promise;

            transcriber =
                "worker";

        } else {

            const worker =
                createDesktopWhisperWorker();

            desktopWorkerLoadPromise = {};

            desktopWorkerLoadPromise.promise =
                new Promise(
                    (resolve, reject) => {
                        desktopWorkerLoadPromise.resolve = resolve;
                        desktopWorkerLoadPromise.reject = reject;
                        desktopWorkerLoadPromise.statusCallback =
                            statusCallback;
                    }
                );

            worker.postMessage({
                type: "load",
                model: identity,
                repository: definition.repository,
                dtype: definition.dtype ?? null
            });

            await desktopWorkerLoadPromise.promise;

            transcriber =
                "desktop-worker";
        }

    } catch (error) {

        const details =
            error?.stack ||
            error?.message ||
            String(error);

        // A failed load can leave a partially-created pipeline behind.
        // Terminate the worker explicitly because transcriber is only assigned
        // after the worker reports a successful load.
        if (isIOS) {
            if (whisperWorker) {
                terminateWhisperWorker(whisperWorker, "ios");
                whisperWorker = null;
            }
            workerLoadPromise = null;
            workerTranscriptionPromise = null;
        } else {
            if (desktopWhisperWorker) {
                terminateWhisperWorker(desktopWhisperWorker, "desktop");
                desktopWhisperWorker = null;
            }
            desktopWorkerLoadPromise = null;
            desktopWorkerTranscriptionPromise = null;
        }

        transcriber = null;
        loadedModel = null;

        if (statusCallback) {
            statusCallback(
                `Whisper ${definition.label} failed to load:\n${details}`
            );
        }

        throw new Error(details);
    }

    loadedModel = identity;

    if (statusCallback) {
        statusCallback(
            isIOS
                ? `Whisper ${identity} loaded on iPhone/iPad.`
                : `Whisper ${identity} loaded using WebGPU.`
        );
    }

    return transcriber;
}


export async function loadTranscriber(
    model,
    statusCallback
) {

    const definition = await requireWhisperProductionEligibility(model);
    return loadTranscriberDefinition(
        { label: definition.label, repository: definition.repository, dtype: definition.loader.dtype },
        definition.id,
        statusCallback
    );
}


// Load an exact model-registry implementation.  This is used by diagnostics
// and, eventually, by the model resolver when it selects a validated variant.
export async function loadTranscriberConfiguration(
    configuration,
    statusCallback
) {

    // Use canonical fields after checking identity; caller-supplied repository
    // or dtype overrides must never borrow another configuration's eligibility.
    return loadTranscriber(configuration.id, statusCallback);
}


export async function releaseTranscriber() {

    const current = transcriber;

    // Clear our references first so a failed disposal cannot accidentally be
    // reused by a subsequent load.
    transcriber = null;
    loadedModel = null;
    loadedDiagnostics = null;
    lastLoadReused = false;

    if (!current) {
        return;
    }

    if (current === "worker") {
        if (whisperWorker) {
            terminateWhisperWorker(whisperWorker, "ios");
            whisperWorker = null;
        }
        workerLoadPromise = null;
        workerTranscriptionPromise = null;
        return;
    }

    if (current === "desktop-worker") {
        if (desktopWhisperWorker) {
            terminateWhisperWorker(desktopWhisperWorker, "desktop");
            desktopWhisperWorker = null;
        }
        desktopWorkerLoadPromise = null;
        desktopWorkerTranscriptionPromise = null;
        return;
    }

}


// Clear the active Whisper model and its runtime environment.
// For desktop this terminates the dedicated WebGPU worker, which provides
// a stronger resource reset than disposing the pipeline alone.
export async function clearWhisperResources() {
    await releaseTranscriber();
}

export async function transcribeAudio(
    audio,
    options = {}
) {

    if (!transcriber) {
        throw new Error(
            "Whisper has not been loaded yet."
        );
    }

    if (isIOS) {

        if (!whisperWorker) {
            throw new Error(
                "Whisper worker has not been created."
            );
        }

        workerTranscriptionPromise =
            {};

        workerTranscriptionPromise.promise =
            new Promise(
                (resolve, reject) => {

                    workerTranscriptionPromise.resolve =
                        resolve;

                    workerTranscriptionPromise.reject =
                        reject;
                }
            );

        whisperWorker.postMessage({
            type: "transcribe",
            audioData: audio,
            language: options.language || null
        });

        return workerTranscriptionPromise.promise;
    }

    if (transcriber === "desktop-worker") {
        if (!desktopWhisperWorker) {
            throw new Error(
                "Desktop Whisper worker has not been created."
            );
        }

        desktopWorkerTranscriptionPromise = {};

        desktopWorkerTranscriptionPromise.promise =
            new Promise(
                (resolve, reject) => {
                    desktopWorkerTranscriptionPromise.resolve = resolve;
                    desktopWorkerTranscriptionPromise.reject = reject;
                }
            );

        desktopWhisperWorker.postMessage({
            type: "transcribe",
            audio: audio,
            options: {
                task: options.task || "transcribe",
                language: options.language || null,
                chunk_length_s: 30,
                stride_length_s: 5
            }
        });

        return desktopWorkerTranscriptionPromise.promise;
    }

    throw new Error("Unsupported Whisper worker state.");
}


