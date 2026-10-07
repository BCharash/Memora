// --------------------------------------------------
// Memora Whisper Model Manager
// --------------------------------------------------

import {
    clearModelRegistry,
    listModelRegistryRecords,
    saveModelRegistryRecords
} from "./storage.js";
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
        // Preserve the pre-registry behavior: no explicit dtype is passed
        // to Transformers.js. The repository/runtime chooses its default.
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

const MODEL_REGISTRY_SCHEMA_VERSION = 2;

const MODEL_REGISTRY_BASELINE = [
    {
        id: "tiny-webgpu-default",
        family: "tiny",
        label: "Tiny",
        repository: "onnx-community/whisper-tiny",
        runtime: "webgpu",
        platform: "desktop",
        configuration: { dtype: null },
        status: "known",
        validation: { status: "not-tested" }
    },
    {
        id: "base-webgpu-default",
        family: "base",
        label: "Base",
        repository: "onnx-community/whisper-base",
        runtime: "webgpu",
        platform: "desktop",
        configuration: { dtype: null },
        status: "known",
        validation: { status: "not-tested" }
    },
    {
        id: "small-webgpu-default",
        family: "small",
        label: "Small",
        repository: "onnx-community/whisper-small",
        runtime: "webgpu",
        platform: "desktop",
        configuration: { dtype: null },
        status: "known",
        validation: { status: "not-tested" }
    },
    {
        id: "medium-webgpu-default",
        family: "medium",
        label: "Medium",
        repository: "Xenova/whisper-medium",
        runtime: "webgpu",
        platform: "desktop",
        configuration: { dtype: null },
        status: "known",
        validation: { status: "not-tested" }
    },
    {
        id: "medium-webgpu-q4",
        family: "medium",
        label: "Medium",
        repository: "Xenova/whisper-medium",
        runtime: "webgpu",
        platform: "desktop",
        configuration: { dtype: "q4" },
        status: "known",
        validation: { status: "not-tested" }
    },
    {
        id: "medium-webgpu-q4f16",
        family: "medium",
        label: "Medium",
        repository: "Xenova/whisper-medium",
        runtime: "webgpu",
        platform: "desktop",
        configuration: { dtype: "q4f16" },
        status: "known",
        validation: { status: "not-tested" }
    },
    {
        id: "medium-webgpu-fp16-q4",
        family: "medium",
        label: "Medium",
        repository: "Xenova/whisper-medium",
        runtime: "webgpu",
        platform: "desktop",
        configuration: {
            dtype: {
                encoder_model: "fp16",
                decoder_model_merged: "q4"
            }
        },
        status: "known",
        validation: { status: "not-tested" }
    },
    {
        id: "large-webgpu-fp16-q4",
        family: "large",
        label: "Large",
        repository: "onnx-community/whisper-large-v3-ONNX",
        runtime: "webgpu",
        platform: "desktop",
        configuration: {
            dtype: {
                encoder_model: "fp16",
                decoder_model_merged: "q4"
            }
        },
        status: "known",
        validation: { status: "not-tested" }
    },
    ...["tiny", "base", "small", "medium", "large"].map(family => ({
        id: `${family}-iphone-default`,
        family,
        label: MODEL_CATALOG[family].label,
        repository: MODEL_CATALOG[family].repository,
        runtime: "wasm",
        platform: "ios",
        configuration: { dtype: null },
        status: "known",
        validation: { status: "not-tested" }
    }))
].map(record => ({
    schemaVersion: MODEL_REGISTRY_SCHEMA_VERSION,
    ...record,
    validation: { status: "not-tested", ...(record.validation || {}) },
    updatedAt: null,
    source: "builtin"
}));


/*
 * Availability follows the way whisper.js actually loads each family.
 * Tiny/Base/Small pass only the repository to Transformers.js.
 * Medium preserves the pre-registry behavior and passes no explicit dtype.
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

function cloneRegistryBaseline() {
    return MODEL_REGISTRY_BASELINE.map(record => structuredClone(record));
}

function normalizeRegistryRecord(record) {
    const normalized = structuredClone(record);

    // Migrate the terminology used by the first registry iteration.
    if (normalized.runtime === "iphone-worker") {
        normalized.runtime = "wasm";
    }

    // Older records did not store platform explicitly.
    if (!normalized.platform) {
        normalized.platform =
            normalized.runtime === "wasm" ? "ios" : "desktop";
    }

    normalized.schemaVersion = MODEL_REGISTRY_SCHEMA_VERSION;
    return normalized;
}

function mergeRegistryWithBaseline(existing) {
    const normalized = existing.map(normalizeRegistryRecord);
    const byId = new Map(normalized.map(record => [record.id, record]));

    for (const baselineRecord of MODEL_REGISTRY_BASELINE) {
        if (!byId.has(baselineRecord.id)) {
            byId.set(baselineRecord.id, structuredClone(baselineRecord));
        }
    }

    return Array.from(byId.values());
}

export async function initializeModelRegistry() {
    const existing = await listModelRegistryRecords();

    if (existing.length) {
        const migrated = mergeRegistryWithBaseline(existing);
        const needsSave =
            migrated.length !== existing.length ||
            migrated.some((record, index) => {
                const old = existing[index];
                return (
                    !old ||
                    old.schemaVersion !== MODEL_REGISTRY_SCHEMA_VERSION ||
                    old.runtime === "iphone-worker" ||
                    !old.platform
                );
            });

        if (needsSave) {
            await saveModelRegistryRecords(migrated);
        }

        return migrated;
    }

    const baseline = cloneRegistryBaseline();
    await saveModelRegistryRecords(baseline);
    return baseline;
}

export async function getModelRegistry() {
    return initializeModelRegistry();
}

export async function rebuildModelRegistry() {
    await clearModelRegistry();
    const baseline = cloneRegistryBaseline();
    await saveModelRegistryRecords(baseline);
    return baseline;
}

export async function updateModelRegistryRecord(id, changes) {
    const records = await initializeModelRegistry();
    const index = records.findIndex(record => record.id === id);

    if (index < 0) {
        throw new Error(`Unknown model registry record: ${id}`);
    }

    records[index] = {
        ...records[index],
        ...changes,
        updatedAt: new Date().toISOString()
    };

    await saveModelRegistryRecords([records[index]]);
    return records[index];
}

export function getModelRegistryBaseline() {
    return cloneRegistryBaseline();
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
