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
        // Current worker replies contain text, not reliable runtime/network
        // types. A reported failure is not proof of model incompatibility.
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
