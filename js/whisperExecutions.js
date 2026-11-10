// Normal transcription history only. Never ingested as self-test validation.
// No storage access on import; live attempts are protected across tabs.
const PREFIX = "memora.whisper-execution.v1.";
export const WHISPER_EXECUTION_HISTORY_LIMIT = 20;
const PHASES = new Set(["prepare", "metadata", "decode", "load", "inference", "model-complete", "paragraphing", "save", "complete"]);
export function createWhisperExecutionJournal({ storage = globalThis.localStorage, locks = globalThis.navigator?.locks, now = () => new Date().toISOString(), uuid = () => crypto.randomUUID() } = {}) {
    function list() {
        return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(key => key?.startsWith(PREFIX)).map(key => {
            const record = JSON.parse(storage.getItem(key));
            if (record?.schemaVersion !== 1 || record.origin !== "production" || key !== PREFIX + record.id) throw new Error("Invalid transcription history; evidence was retained.");
            return record;
        }).sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id));
    }
    function write(record) {
        const value = JSON.stringify(record);
        storage.setItem(PREFIX + record.id, value);
        if (storage.getItem(PREFIX + record.id) !== value) throw new Error("Transcription history write could not be verified.");
    }
    async function lock(id, action, ifAvailable = false) {
        if (!locks?.request) throw new Error("Transcription history requires Web Locks for safe ownership.");
        return locks.request(PREFIX + id, { mode: "exclusive", ifAvailable }, token => token ? action() : null);
    }
    async function prune() {
        // Remove only terminal records, checking ownership again under each lock.
        const completed = list().filter(record => record.status !== "running");
        for (const record of completed.slice(WHISPER_EXECUTION_HISTORY_LIMIT)) await lock(record.id, () => {
            const current = JSON.parse(storage.getItem(PREFIX + record.id));
            if (current && current.status !== "running") storage.removeItem(PREFIX + record.id);
        }, true);
    }
    async function recover() {
        for (const record of list()) if (record.status === "running") await lock(record.id, () => {
            const current = JSON.parse(storage.getItem(PREFIX + record.id));
            if (current?.status !== "running") return;
            current.status = "interrupted";
            if (["loading", "running"].includes(current.modelOutcome)) current.modelOutcome = "unknown";
            current.updatedAt = current.recoveredAt = now();
            current.reason = "No final workflow result recorded; cause unknown. No automatic retry.";
            write(current);
        }, true);
        await prune();
        return list();
    }
    async function clearCompleted() {
        for (const record of list()) await lock(record.id, () => {
            const current = JSON.parse(storage.getItem(PREFIX + record.id));
            if (current && current.status !== "running") storage.removeItem(PREFIX + record.id);
        }, true);
    }
    async function run(metadata, execute) {
        const id = uuid();
        let entered = false;
        async function perform(owned) {
            entered = true;
            const record = {
                schemaVersion: 1, origin: "production", id, startedAt: now(), updatedAt: now(),
                status: "running", phase: "prepare", modelOutcome: "not-started",
                build: metadata.build, pageId: metadata.pageId, environment: metadata.environment,
                browser: metadata.browser, requestedModel: metadata.requestedModel,
                configuration: metadata.configuration || null, configurationFingerprint: metadata.configurationFingerprint || null,
                recipe: metadata.recipe, timings: {}, diagnostics: null
            };
            let persistenceError = owned ? null : "Safe history ownership unavailable; transcription continued without a durable record.";
            const save = () => {
                if (persistenceError) return;
                try { write(record); }
                catch (error) { persistenceError = error.message; console.warn("Transcription history unavailable:", error); }
            };
            save();
            const execution = {
                id,
                checkpoint(phase, observations = {}) {
                    if (!PHASES.has(phase)) throw new Error("Invalid transcription stage.");
                    record.phase = phase; record.updatedAt = now();
                    if (observations.timings) record.timings = Object.fromEntries(Object.entries(observations.timings)
                        .filter(([key, value]) => ["metadataMs", "decodeMs", "audioDurationMs", "loadMs", "inferenceMs", "workerInferenceMs", "paragraphMs", "reused"].includes(key) && (Number.isFinite(value) || typeof value === "boolean")));
                    if (observations.diagnostics) {
                        const { selection, repository, requestedDtype, requestedBackend, transformersVersion, worker, sessions, evidence, actualBackend } = observations.diagnostics;
                        record.diagnostics = { selection, repository, requestedDtype, requestedBackend, transformersVersion, worker, evidence, actualBackend,
                            sessions: sessions?.slice(0, 20).map(({ name, device, dtype }) => ({ name, device, dtype })) || [] };
                    }
                    if (phase === "load") record.modelOutcome = "loading";
                    if (phase === "inference") record.modelOutcome = "running";
                    if (phase === "model-complete") record.modelOutcome = "completed";
                    save();
                }
            };
            let value;
            try {
                value = await execute(execution);
                record.status = "completed"; record.phase = "complete";
            } catch (error) {
                record.status = error?.name === "AbortError" ? "aborted" : "failed";
                if (["loading", "running"].includes(record.modelOutcome)) record.modelOutcome = "not-confirmed";
                // No file, audio, transcript or arbitrary returned record is stored.
                record.failure = error?.whisperFailure || { schemaVersion: 1, stage: record.phase, category: "unknown", certainty: "unknown", error: { name: error?.name || "Error", message: error?.message || String(error) } };
                record.failure = JSON.parse(JSON.stringify(record.failure));
                record.failure.truncated = false;
                for (const diagnostic of [record.failure.error, record.failure.workerEvidence?.error]) {
                    if (!diagnostic) continue;
                    record.failure.truncated ||= (diagnostic.message?.length || 0) > 4000 || (diagnostic.stack?.length || 0) > 8000;
                    if (diagnostic.message) diagnostic.message = diagnostic.message.slice(0, 4000);
                    if (diagnostic.stack) diagnostic.stack = diagnostic.stack.slice(0, 8000);
                }
                record.finishedAt = record.updatedAt = now(); save();
                if (error && typeof error === "object") { error.executionId = id; error.executionPersistenceError = persistenceError; }
                throw error;
            }
            record.finishedAt = record.updatedAt = now(); save();
            if (value && typeof value === "object") { value.executionId = id; value.executionPersistenceError = persistenceError; }
            return value;
        }
        try { return await lock(id, () => perform(true)); }
        catch (error) {
            if (entered) throw error; // Never repeat model work after a real operation failure.
            console.warn("Transcription history ownership unavailable:", error);
            return perform(false);
        } finally {
            try { await prune(); } catch (error) { console.warn("Transcription history retention unavailable:", error); }
        }
    }
    return { run, list, recover, clearCompleted };
}
