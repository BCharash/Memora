import {
    getModelDefinition,
    getModelRegistryBaseline
} from "./modelManager.js";


// --------------------------------------------------
// Transformers.js
// --------------------------------------------------

let transformers = null;

async function loadTransformers() {

    if (transformers) {
        return transformers;
    }

    transformers = await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0"
    );

    return transformers;
}


function isIOSDevice() {

    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
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

    desktopWhisperWorker = new Worker(
        "./js/whisper-desktop-worker.js",
        { type: "module" }
    );

    desktopWhisperWorker.onmessage = event => {
        const message = event.data;

        if (message.type === "status") {
            desktopWorkerLoadPromise?.statusCallback?.(message.message);
            return;
        }

        if (message.type === "loaded") {
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
                resolve({ text: message.text });
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

    whisperWorker =
        new Worker(
            "./js/whisper-worker.js",
            {
                type: "module"
            }
        );

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
                        { text: message.text }
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
        return transcriber;
    }

    if (transcriber) {
        await releaseTranscriber();
    }

    console.log("[Whisper diagnostic] Resolved model configuration:", {
        requestedModel: identity,
        repository: definition.repository,
        dtype: definition.dtype ?? definition.preferredDtype ?? null,
        transformersVersion: "4.0.0",
        runtime: isIOSDevice() ? "iphone-worker" : "webgpu",
    });

    const isIOS =
        isIOSDevice();

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
        if (isIOSDevice()) {
            if (whisperWorker) {
                whisperWorker.terminate();
                whisperWorker = null;
            }
            workerLoadPromise = null;
            workerTranscriptionPromise = null;
        } else {
            if (desktopWhisperWorker) {
                desktopWhisperWorker.terminate();
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
            isIOSDevice()
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

    // Diagnostic: Medium is loaded from the exact registry record used by
    // whisperSelfTest.js, rather than reconstructed from the model catalog.
    // This isolates whether the production path is changing the selected
    // implementation before it reaches the desktop worker.
    if (model === "medium") {
        const registryConfiguration =
            getModelRegistryBaseline().find(
                record => record.id === "medium-webgpu-q4"
            );

        if (!registryConfiguration) {
            throw new Error(
                "The medium-webgpu-q4 registry configuration was not found."
            );
        }

        console.log(
            "[Whisper diagnostic] Using exact registry configuration for Medium:",
            registryConfiguration
        );

        return loadTranscriberConfiguration(
            registryConfiguration,
            statusCallback
        );
    }

    const modelInfo =
        getModelDefinition(model);

    return loadTranscriberDefinition(
        modelInfo,
        model,
        statusCallback
    );
}


// Load an exact model-registry implementation.  This is used by diagnostics
// and, eventually, by the model resolver when it selects a validated variant.
export async function loadTranscriberConfiguration(
    configuration,
    statusCallback
) {

    return loadTranscriberDefinition(
        {
            label: configuration.label || configuration.family || "Whisper",
            repository: configuration.repository,
            dtype: configuration.configuration?.dtype ?? null
        },
        configuration.id || configuration.family || configuration.repository,
        statusCallback
    );
}


export async function releaseTranscriber() {

    const current = transcriber;

    // Clear our references first so a failed disposal cannot accidentally be
    // reused by a subsequent load.
    transcriber = null;
    loadedModel = null;

    if (!current) {
        return;
    }

    if (current === "worker") {
        if (whisperWorker) {
            whisperWorker.terminate();
            whisperWorker = null;
        }
        workerLoadPromise = null;
        workerTranscriptionPromise = null;
        return;
    }

    if (current === "desktop-worker") {
        if (desktopWhisperWorker) {
            desktopWhisperWorker.terminate();
            desktopWhisperWorker = null;
        }
        desktopWorkerLoadPromise = null;
        desktopWorkerTranscriptionPromise = null;
        return;
    }

    if (typeof current.dispose === "function") {
        await current.dispose();
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

    if (isIOSDevice()) {

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

    return transcriber(
        audio,
        {
            chunk_length_s: 30,
            stride_length_s: 5,
            ...options
        }
    );
}


