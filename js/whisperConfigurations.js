// Canonical definitions now feed modelManager's legacy registry projection.
// Resolver execution callers migrate in later checkpoints.
// No storage, worker, model download or runtime probing occurs on import.
const families = {
    tiny: { label: "Tiny", repository: "onnx-community/whisper-tiny" },
    base: { label: "Base", repository: "onnx-community/whisper-base" },
    small: { label: "Small", repository: "onnx-community/whisper-small" },
    medium: { label: "Medium", repository: "Xenova/whisper-medium" },
    large: { label: "Large", repository: "onnx-community/whisper-large-v3-ONNX" }
};

function freezeDeep(value) {
    if (value && typeof value === "object") {
        for (const child of Object.values(value)) freezeDeep(child);
        Object.freeze(value);
    }
    return value;
}

function definition(id, family, platform, dtype, familyDefault, testOrder) {
    const ios = platform === "ios";
    return {
        id, family, ...families[family], definitionRevision: 1,
        repositoryRevision: null, // Existing URLs are unpinned; never invent provenance.
        platform,
        runtime: ios ? "wasm" : "webgpu", // Legacy registry vocabulary, not execution evidence.
        operatingSystems: ios ? ["ios"] : ["windows", "macos", "linux"],
        runtimeLibrary: { name: "@huggingface/transformers", version: ios ? "3.7.2" : "4.0.0" },
        worker: {
            script: ios ? "./js/whisper-ios-worker.js" : "./js/whisper-desktop-worker.js",
            protocolRevision: 1, implementationRevision: 1
        },
        // null means OMIT, not an explicit WASM/q8 request. iOS currently relies on defaults.
        loader: { device: ios ? null : "webgpu", dtype, options: {} },
        production: { familyDefault },
        test: { allowed: testOrder !== null, order: testOrder }
    };
}

const configurations = freezeDeep([
    definition("tiny-webgpu-default", "tiny", "desktop", null, true, 0),
    definition("base-webgpu-default", "base", "desktop", null, true, 1),
    definition("small-webgpu-default", "small", "desktop", null, true, 2),
    definition("medium-webgpu-default", "medium", "desktop", null, false, null),
    definition("medium-webgpu-q4", "medium", "desktop", "q4", true, 5),
    definition("medium-webgpu-q4f16", "medium", "desktop", "q4f16", false, 4),
    definition("medium-webgpu-fp16-q4", "medium", "desktop", { encoder_model: "fp16", decoder_model_merged: "q4" }, false, 3),
    definition("large-webgpu-fp16-q4", "large", "desktop", { encoder_model: "fp16", decoder_model_merged: "q4" }, true, 6),
    ...Object.keys(families).map((family, index) => definition(`${family}-iphone-default`, family, "ios", null, true, family === "large" ? null : index))
]);

export function getWhisperConfigurationDefinitions() {
    return configurations;
}

function compatibility(configuration, environment, purpose, capabilities) {
    if (purpose !== "production" && purpose !== "self-test") return { code: "invalid-purpose", reason: "Expected production or self-test purpose." };
    if (!configuration.operatingSystems.includes(environment?.operatingSystem)) {
        return { code: "incompatible-environment", reason: `Configuration ${configuration.id} does not target ${environment?.operatingSystem || "unknown"}. Android/unknown execution is not enabled by this resolver.` };
    }
    if (purpose === "self-test" && !configuration.test.allowed) {
        return { code: "not-testable", reason: `${configuration.id} is not in the existing standalone test policy.` };
    }
    if (capabilities?.workers === false) return { code: "missing-capability", reason: "Web Workers are unavailable." };
    if (configuration.loader.device === "webgpu" && capabilities?.webgpu === false) {
        return { code: "missing-capability", reason: "This configuration requests WebGPU, but its API is absent. No backend substitution was made." };
    }
    return null;
}

// UI lists are derived from each definition's policy/order, not another ID list.
export function listWhisperConfigurations(environment, { purpose = "self-test", capabilities } = {}) {
    return Object.freeze(configurations.filter(configuration => !compatibility(configuration, environment, purpose, capabilities))
        .sort((a, b) => purpose === "self-test" ? a.test.order - b.test.order : configurations.indexOf(a) - configurations.indexOf(b)));
}

function canonicalJSON(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(",")}}`;
    }
    throw new Error("Configuration fingerprint contains an unsupported value.");
}

// Fingerprint only execution inputs. Labels, timestamps, test policy and prior
// validation do not change which bytes/options the loader is intended to use.
export async function fingerprintWhisperConfiguration(configuration) {
    const inputs = {
        fingerprintSchema: 1,
        repository: configuration.repository,
        repositoryRevision: configuration.repositoryRevision ?? null,
        runtimeLibrary: configuration.runtimeLibrary,
        worker: configuration.worker,
        loader: {
            ...configuration.loader,
            device: configuration.loader.device ?? null,
            dtype: configuration.loader.dtype ?? null,
            options: configuration.loader.options ?? {}
        }
    };
    if (!globalThis.crypto?.subtle) throw new Error("Secure configuration fingerprinting is unavailable; use HTTPS or localhost.");
    const bytes = new TextEncoder().encode(canonicalJSON(inputs));
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return `sha256:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function resolveWhisperConfiguration(request, environment, { purpose = "production", capabilities } = {}) {
    if (purpose !== "production" && purpose !== "self-test") return { ok: false, code: "invalid-purpose", reason: "Expected production or self-test purpose." };
    if (typeof request !== "string" || !request) return { ok: false, code: "invalid-request", reason: "Provide an exact configuration ID or model family." };
    const exact = configurations.find(configuration => configuration.id === request);
    const family = Object.hasOwn(families, request);
    if (!exact && !family) return { ok: false, code: "not-found", reason: `Unknown Whisper configuration or family: ${request}` };
    const configuration = exact || configurations.find(candidate => candidate.family === request && candidate.production.familyDefault && candidate.operatingSystems.includes(environment?.operatingSystem));
    if (!configuration) return { ok: false, code: "incompatible-environment", reason: `No ${request} default targets ${environment?.operatingSystem || "unknown"}. No substitute selected.` };
    const issue = compatibility(configuration, environment, purpose, capabilities);
    if (issue) return { ok: false, ...issue };
    const fingerprint = await fingerprintWhisperConfiguration(configuration);
    return freezeDeep({
        ok: true,
        reason: exact ? "Exact compatible configuration selected." : "Existing family default selected for the operating system.",
        configuration: { ...configuration, fingerprint },
        provenance: "Repository revision is unpinned; fingerprint identifies declared execution inputs, not immutable model weights.",
        validation: "unknown", // Definition resolution is never proof of successful execution.
        capabilityAssessment: capabilities ? "Checked supplied API observations; initialization/execution remain unverified." : "API availability not supplied; not verified."
    });
}
