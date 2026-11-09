// Read-only, best-effort observations. Library session metadata is not an
// operator-level GPU execution trace and must never change loading/inference.
export function describeWhisperPipeline(pipeline, { model, repository, dtype = null, requestedBackend, transformersVersion, worker }) {
    const diagnostics = {
        selection: model, repository, requestedDtype: dtype, requestedBackend,
        transformersVersion, worker, sessions: [],
        evidence: "session metadata unavailable", actualBackend: "unknown"
    };
    try {
        for (const [name, session] of Object.entries(pipeline?.model?.sessions || {})) {
            diagnostics.sessions.push({
                name,
                device: typeof session?.config?.device === "string" ? session.config.device : "unknown",
                dtype: typeof session?.config?.dtype === "string" ? session.config.dtype : "unknown"
            });
        }
        if (diagnostics.sessions.length) diagnostics.evidence = "initialized session settings (not an operator execution trace)";
    } catch { /* Diagnostics must not break a working model. */ }
    return diagnostics;
}

export function formatWhisperDiagnostics(diagnostics) {
    if (!diagnostics) return "Worker configuration evidence unavailable; reload this build if cached modules are suspected.";
    const dtype = diagnostics.requestedDtype == null ? "runtime default" : JSON.stringify(diagnostics.requestedDtype);
    const sessions = diagnostics.sessions?.length
        ? diagnostics.sessions.map(session => `${session.name}: ${session.device}, ${session.dtype}`).join("; ")
        : "unavailable";
    return `Selection: ${diagnostics.selection} · ${diagnostics.repository} · requested dtype: ${dtype} · requested backend: ${diagnostics.requestedBackend} · Transformers.js ${diagnostics.transformersVersion} · ${diagnostics.worker} · initialized sessions: ${sessions} · actual operator backend: unknown`;
}

export function formatTranscriptionTimings(timings) {
    const seconds = value => Number.isFinite(value) ? `${(value / 1000).toFixed(1)}s` : "unavailable";
    const reuse = timings.reused === true ? "reused" : timings.reused === false ? "new load" : "reuse unknown";
    return `Metadata ${seconds(timings.metadataMs)} · decode ${seconds(timings.decodeMs)} · model load ${seconds(timings.loadMs)} (${reuse}) · inference ${seconds(timings.inferenceMs)} · worker inference ${seconds(timings.workerInferenceMs)} · audio ${seconds(timings.audioDurationMs)}${Number.isFinite(timings.paragraphMs) ? ` · paragraphing ${seconds(timings.paragraphMs)}` : ""}`;
}
