// Shared execution-failure vocabulary. Pure: no storage, eligibility changes,
// retries or resource management. Model definitions remain in the catalogue.
const STAGES = new Set(["metadata", "decode", "eligibility", "load", "inference", "paragraphing", "save"]);
const SOURCES = new Set(["workflow", "eligibility", "worker-reply", "worker-event", "loader"]);

export function describeWhisperFailure(error, { stage, source = "workflow", configurationId = null } = {}) {
    if (!STAGES.has(stage) || !SOURCES.has(source)) throw new Error("Invalid Whisper failure boundary.");
    const name = typeof error?.name === "string" ? error.name : "Error";
    const message = typeof error?.message === "string" ? error.message : String(error);
    let category = "unknown", certainty = "unknown";
    if (name === "AbortError") {
        // An abort does not establish whether it came from a user or a network
        // operation. Never call it a confirmed user cancellation without evidence.
        category = "aborted";
    } else if (["metadata", "decode"].includes(stage)) {
        category = "input-preparation";
        certainty = "boundary-known";
    } else if (["paragraphing", "save"].includes(stage)) {
        category = "post-processing";
        certainty = "boundary-known";
    } else if (stage === "eligibility") {
        category = "eligibility-check";
        certainty = "boundary-known";
    } else if (["worker-reply", "worker-event"].includes(source)) {
        // Legacy/unknown worker evidence is not proof of model incompatibility.
        // Matching typed evidence is enriched separately by the decoder.
        category = "worker-failure";
    }
    return Object.freeze({
        schemaVersion: 1, stage, source, configurationId,
        category, certainty,
        error: Object.freeze({ name, message, stack: typeof error?.stack === "string" ? error.stack : null })
    });
}

export function annotateWhisperFailure(error, boundary) {
    // Preserve the most specific inner boundary, including an exact canonical
    // configuration ID. A generic workflow catch must not overwrite it.
    if (error?.whisperFailure?.schemaVersion === 1) return error;
    const failure = describeWhisperFailure(error, boundary);
    const wrapped = new Error(failure.error.message, { cause: error });
    wrapped.name = failure.error.name;
    wrapped.whisperFailure = failure;
    return wrapped;
}

export async function atWhisperFailureBoundary(boundary, action) {
    try { return await action(); }
    catch (error) { throw annotateWhisperFailure(error, boundary); }
}

// Additive worker error envelope; successful execution/protocol is unchanged.
const WORKER_BOUNDARIES = new Set(["module-import", "pipeline-create", "pipeline-call", "worker-state"]);
const ERROR_KINDS = new Set(["wasm-runtime-error", "dom-exception", "javascript-error", "thrown-value"]);
export function createWhisperWorkerErrorMessage(error, { stage, configurationId, boundary }) {
    const kind = typeof WebAssembly !== "undefined" && error instanceof WebAssembly.RuntimeError ? "wasm-runtime-error"
        : typeof DOMException !== "undefined" && error instanceof DOMException ? "dom-exception"
        : error instanceof Error ? "javascript-error" : "thrown-value";
    return {
        type: "error", message: error?.stack || error?.message || String(error),
        failure: { schemaVersion: 1, stage, configurationId: configurationId || null, boundary, kind,
            error: { name: typeof error?.name === "string" ? error.name : "Error", message: typeof error?.message === "string" ? error.message : String(error),
                stack: typeof error?.stack === "string" ? error.stack : null,
                code: typeof error?.code === "number" || typeof error?.code === "string" ? error.code : null } }
    };
}

export function whisperErrorFromWorkerMessage(message, expected) {
    const fallback = () => annotateWhisperFailure(new Error(typeof message?.message === "string" ? message.message : "Whisper worker error."), expected);
    const payload = message?.failure;
    let status = "legacy";
    if (payload != null) {
        status = "invalid";
        if (payload.schemaVersion === 1 && ["load", "inference"].includes(payload.stage) &&
            typeof payload.configurationId === "string" && WORKER_BOUNDARIES.has(payload.boundary) &&
            (payload.boundary === "worker-state" || payload.stage === "load" && ["module-import", "pipeline-create"].includes(payload.boundary) || payload.stage === "inference" && payload.boundary === "pipeline-call") && ERROR_KINDS.has(payload.kind) &&
            typeof payload.error?.name === "string" && typeof payload.error.message === "string" &&
            (payload.error.stack === null || typeof payload.error.stack === "string")) {
            status = payload.stage === expected.stage && payload.configurationId === expected.configurationId ? "matched" : "mismatched";
        }
    }
    if (status !== "matched") {
        const error = fallback();
        error.whisperFailure = Object.freeze({ ...error.whisperFailure, workerEvidence: Object.freeze({ schemaVersion: 1, status }) });
        return error;
    }
    const original = new Error(payload.error.message); original.name = payload.error.name;
    if (payload.error.stack) original.stack = payload.error.stack;
    const error = annotateWhisperFailure(original, expected);
    const observedRuntime = payload.kind === "wasm-runtime-error";
    const workerEvidence = Object.freeze({ schemaVersion: 1, status, boundary: payload.boundary, kind: payload.kind,
        error: Object.freeze({ name: original.name, message: original.message, stack: payload.error.stack,
            code: typeof payload.error.code === "number" || typeof payload.error.code === "string" ? payload.error.code : null }) });
    error.whisperFailure = Object.freeze({ ...error.whisperFailure,
        category: observedRuntime ? "runtime-failure" : error.whisperFailure.category,
        certainty: observedRuntime ? "type-observed" : error.whisperFailure.certainty, workerEvidence });
    return error;
}

export function whisperErrorFromWorkerEvent(event, expected) {
    const reported = event?.error;
    const original = new Error(typeof reported?.message === "string" ? reported.message : event?.message || "Whisper worker error.");
    if (typeof reported?.name === "string") original.name = reported.name;
    if (typeof reported?.stack === "string") original.stack = reported.stack;
    const error = annotateWhisperFailure(original, expected);
    error.whisperFailure = Object.freeze({ ...error.whisperFailure, workerEvidence: Object.freeze({
        schemaVersion: 1, status: "event-only", filename: typeof event?.filename === "string" ? event.filename : null,
        line: Number.isFinite(event?.lineno) ? event.lineno : null, column: Number.isFinite(event?.colno) ? event.colno : null
    }) });
    return error;
}
