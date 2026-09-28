// --------------------------------------------------
// Whisper model catalog
// --------------------------------------------------

const MODEL_CATALOG = {
    tiny: {
        label: "Tiny",
        repository: "onnx-community/whisper-tiny"
    },
    base: {
        label: "Base",
        repository: "onnx-community/whisper-base"
    },
    small: {
        label: "Small",
        repository: "onnx-community/whisper-small"
    },
    medium: {
        label: "Medium",
        repository: "Xenova/whisper-medium",
        dtype: "q4"
    },
    "large-v3": {
        label: "Large-v3",
        repository: "Xenova/whisper-large-v3",
        dtype: {
            encoder_model: "fp16",
            decoder_model_merged: "q4"
        }
    }
};


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
                        message.result
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


export async function loadTranscriber(
    model,
    statusCallback
) {

    if (
        transcriber &&
        loadedModel === model
    ) {
        return transcriber;
    }

    const modelInfo =
        MODEL_CATALOG[model];

    if (!modelInfo) {
        throw new Error(
            `Unknown Whisper model: ${model}`
        );
    }

    const isIOS =
        isIOSDevice();

    if (statusCallback) {
        statusCallback(
            isIOS
                ? `Loading Whisper ${modelInfo.label} on iPhone/iPad…`
                : `Loading Whisper ${modelInfo.label} using WebGPU…`
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
                model,
                repository:
                    modelInfo.repository,
                dtype:
                    modelInfo.dtype || null
            });

            await workerLoadPromise.promise;

            transcriber =
                "worker";

        } else {

            const {
                pipeline
            } = await loadTransformers();

            const pipelineOptions = {
                device: "webgpu"
            };

            if (modelInfo.dtype) {
                pipelineOptions.dtype =
                    modelInfo.dtype;
            }

            transcriber =
                await pipeline(
                    "automatic-speech-recognition",
                    modelInfo.repository,
                    pipelineOptions
                );
        }

    } catch (error) {

        const details =
            error?.stack ||
            error?.message ||
            String(error);

        if (statusCallback) {
            statusCallback(
                `Whisper ${modelInfo.label} failed to load:\n${details}`
            );
        }

        throw new Error(details);
    }

    loadedModel = model;

    if (statusCallback) {
        statusCallback(
            isIOSDevice()
                ? `Whisper ${model} loaded on iPhone/iPad.`
                : `Whisper ${model} loaded using WebGPU.`
        );
    }

    return transcriber;
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

        whisperWorker.postMessage(
            {
                type: "transcribe",
                audioData: audio,
                options: {
                    chunk_length_s: 30,
                    stride_length_s: 5,
                    ...options
                }
            },
            [audio.buffer]
        );

        return workerTranscriptionPromise.promise;
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


export function getModelCatalog() {
    return MODEL_CATALOG;
}
