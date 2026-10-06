// --------------------------------------------------
// Memora Whisper Model Manager
// --------------------------------------------------
// User-facing model families are intentionally stable:
// tiny, base, small, medium, large.
// Repository names, revisions, and Transformers.js details stay internal.

const MODEL_CATALOG = {
    tiny: {
        label: "Tiny",
        repository: "onnx-community/whisper-tiny",
        preferredDtype: "q8"
    },
    base: {
        label: "Base",
        repository: "onnx-community/whisper-base",
        preferredDtype: "q8"
    },
    small: {
        label: "Small",
        repository: "onnx-community/whisper-small",
        preferredDtype: "q8"
    },
    medium: {
        label: "Medium",
        repository: "Xenova/whisper-medium",
        preferredDtype: "q4"
    },
    large: {
        label: "Large",
        repository: "onnx-community/whisper-large-v3-ONNX",
        dtype: {
            encoder_model: "fp16",
            decoder_model_merged: "q4"
        }
    }
};

const MODEL_API_BASE = "https://huggingface.co/api/models/";
const TRANSFORMERS_URL =
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0";

let transformersModule = null;

async function loadTransformers() {
    if (!transformersModule) {
        transformersModule = await import(TRANSFORMERS_URL);
    }
    return transformersModule;
}

async function getRepositoryFiles(repository) {
    const response = await fetch(
        `${MODEL_API_BASE}${repository}/tree/main?recursive=true`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error(`Hugging Face returned HTTP ${response.status}.`);
    }

    const entries = await response.json();
    return entries
        .filter(entry => entry.type === "file")
        .map(entry => entry.path);
}

function requiredModelFiles(definition, files) {
    const required = [
        "config.json",
        "tokenizer.json",
        "tokenizer_config.json",
        "preprocessor_config.json"
    ];

    if (definition.dtype && typeof definition.dtype === "object") {
        required.push(
            `onnx/encoder_model_${definition.dtype.encoder_model}.onnx`,
            `onnx/decoder_model_merged_${definition.dtype.decoder_model_merged}.onnx`
        );
    } else if (definition.preferredDtype) {
        required.push(
            `onnx/encoder_model_${definition.preferredDtype}.onnx`,
            `onnx/decoder_model_merged_${definition.preferredDtype}.onnx`
        );
    }

    return required;
}

export function getModelCatalog() {
    return MODEL_CATALOG;
}

export function getModelDefinition(model) {
    const definition = MODEL_CATALOG[model];
    if (!definition) {
        throw new Error(`Unknown Whisper model: ${model}`);
    }
    return definition;
}

export async function checkModelAvailability(model) {
    const definition = getModelDefinition(model);
    const response = await fetch(
        `${MODEL_API_BASE}${definition.repository}`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        return {
            model,
            label: definition.label,
            repository: definition.repository,
            available: false,
            status: "Unavailable",
            error: `Hugging Face returned HTTP ${response.status}.`
        };
    }

    const data = await response.json();
    const files = await getRepositoryFiles(definition.repository);
    const required = requiredModelFiles(definition, files);
    const missing = required.filter(path => !files.includes(path));

    // Transformers.js 4.0.0 also exposes ModelRegistry, which can verify
    // that the repository contains a complete ONNX configuration for a dtype.
    // This is a repository/configuration check, not a multi-gigabyte download.
    let registryDtypes = null;
    let registryError = null;
    try {
        const { ModelRegistry } = await loadTransformers();
        registryDtypes = await ModelRegistry.get_available_dtypes(
            definition.repository
        );
    } catch (error) {
        registryError = error?.message || String(error);
    }

    const dtypeReady = definition.dtype && typeof definition.dtype === "object"
        ? required.every(path => files.includes(path))
        : !definition.preferredDtype ||
          (registryDtypes ? registryDtypes.includes(definition.preferredDtype) : missing.length === 0);

    const ready = missing.length === 0 && dtypeReady;

    return {
        model,
        label: definition.label,
        repository: definition.repository,
        available: ready,
        status: ready ? "Ready" : "Incomplete",
        revision: data.sha || null,
        lastModified: data.lastModified || null,
        availableDtypes: registryDtypes,
        missingFiles: missing,
        error: registryError || null
    };
}

export async function checkAllModels() {
    return Promise.all(
        Object.keys(MODEL_CATALOG).map(async model => {
            try {
                return await checkModelAvailability(model);
            } catch (error) {
                const definition = MODEL_CATALOG[model];
                return {
                    model,
                    label: definition.label,
                    repository: definition.repository,
                    available: false,
                    status: "Check failed",
                    error: error?.message || String(error)
                };
            }
        })
    );
}
