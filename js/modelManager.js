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
        dtype: "q4"
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

/*
 * Availability follows the way whisper.js actually loads each family.
 * Tiny/Base/Small pass only the repository to Transformers.js.
 * Medium passes dtype: "q4".
 * Large passes encoder fp16 + merged decoder q4.
 *
 * Cache status is reported separately from repository availability.
 */

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

function hasCoreFiles(files) {
    return [
        "config.json",
        "tokenizer.json",
        "tokenizer_config.json",
        "preprocessor_config.json"
    ].every(path => files.includes(path));
}

function hasAnyWhisperOnnxPair(files) {
    const encoders = files
        .filter(path => /^onnx\/encoder_model.*\.onnx$/.test(path))
        .map(path => path.replace(/^onnx\/encoder_model(.*)\.onnx$/, "$1"));

    const decoders = new Set(
        files
            .filter(path => /^onnx\/decoder_model_merged.*\.onnx$/.test(path))
            .map(path => path.replace(/^onnx\/decoder_model_merged(.*)\.onnx$/, "$1"))
    );

    return encoders.some(suffix => decoders.has(suffix));
}

function getConfiguredMissingFiles(definition, files) {
    if (definition.dtype && typeof definition.dtype === "object") {
        return [
            `onnx/encoder_model_${definition.dtype.encoder_model}.onnx`,
            `onnx/decoder_model_merged_${definition.dtype.decoder_model_merged}.onnx`
        ].filter(path => !files.includes(path));
    }

    if (typeof definition.dtype === "string") {
        return [
            `onnx/encoder_model_${definition.dtype}.onnx`,
            `onnx/decoder_model_merged_${definition.dtype}.onnx`
        ].filter(path => !files.includes(path));
    }

    // Tiny/Base/Small do not pass a dtype in whisper.js.
    return [];
}

async function getCachedModelInfo(repository) {
    if (!("caches" in window)) {
        return { cached: false, files: 0 };
    }

    const cacheNames = await caches.keys();
    let files = 0;

    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
            if (request.url.includes(repository)) {
                files++;
            }
        }
    }

    return { cached: files > 0, files };
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
            cached: false,
            status: "Unavailable",
            error: `Hugging Face returned HTTP ${response.status}.`
        };
    }

    const data = await response.json();
    const files = await getRepositoryFiles(definition.repository);
    const cached = await getCachedModelInfo(definition.repository);

    const coreReady = hasCoreFiles(files);
    const onnxReady = hasAnyWhisperOnnxPair(files);
    const configuredMissing = getConfiguredMissingFiles(definition, files);

    const available =
        coreReady &&
        onnxReady &&
        configuredMissing.length === 0;

    let status = "Unavailable";

    if (available && cached.cached) {
        status = "Cached";
    } else if (available) {
        status = "Available";
    } else if (response.ok) {
        status = "Incomplete";
    }

    return {
        model,
        label: definition.label,
        repository: definition.repository,
        available,
        cached: cached.cached,
        cachedFiles: cached.files,
        status,
        revision: data.sha || null,
        lastModified: data.lastModified || null,
        missingFiles: configuredMissing
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
