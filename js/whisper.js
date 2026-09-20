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

    const {
        pipeline
    } = await loadTransformers();

    const modelInfo =
        MODEL_CATALOG[model];

    if (!modelInfo) {
        throw new Error(
            `Unknown Whisper model: ${model}`
        );
    }

    if (statusCallback) {
        statusCallback(
            `Loading Whisper ${modelInfo.label} using WebGPU…`
        );
    }

    try {

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

    } catch (error) {

        throw new Error(
            `Unable to load Whisper ${modelInfo.label}. ` +
            `The model may no longer be available or compatible. ` +
            `(${modelInfo.repository})`
        );
    }

    loadedModel = model;

    if (statusCallback) {
        statusCallback(
            `Whisper ${model} loaded using WebGPU.`
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
