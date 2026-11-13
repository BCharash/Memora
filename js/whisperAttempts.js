// Compact, nonrecursive snapshots retain sequence context after history clearing.
const HISTORY_LIMIT = 10;
const parsedTime = value => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const elapsedBetween = (start, end) => {
    const a = parsedTime(start), b = parsedTime(end);
    return a !== null && b !== null && b >= a ? b - a : null;
};
export function summarizeWhisperAttempt(record) {
    const result = record.result?.results?.[0] || record.observation || {};
    return { id:record.id, configurationId:record.configuration?.id || null,
        label:record.configuration?.label || record.configuration?.id || "Unknown model",
        pageId:record.pageId || null, build:record.build || null,
        startedAt:record.startedAt || null, finishedAt:record.finishedAt || null,
        status:record.status, phase:record.phase || null,
        durationMs:elapsedBetween(record.startedAt, record.finishedAt),
        loadMs:result.loadMs ?? null, transcriptionMs:result.transcriptionMs ?? null,
        cleanupMs:result.releaseMs ?? null, cleanup:result.releaseStatus || null,
        disposalStatus:result.disposal?.status || null };
}
export function snapshotWhisperTestHistory(records, record, source = "reconstructed-from-available-history") {
    const cutoff = parsedTime(record.startedAt);
    const previous = records.filter(item => item.id !== record.id && parsedTime(item.startedAt) !== null && cutoff !== null &&
        (parsedTime(item.startedAt) < cutoff || source === "captured-at-start" && parsedTime(item.startedAt) === cutoff))
        .sort((a,b) => parsedTime(a.startedAt) - parsedTime(b.startedAt));
    const rows = previous.map((item,index) => {
        const row = summarizeWhisperAttempt(item), before = previous[index-1];
        return {...row, gapBeforeMs:before ? elapsedBetween(before.finishedAt, item.startedAt) : null,
            overlapsPrevious:!!before?.finishedAt && parsedTime(before.finishedAt) > parsedTime(item.startedAt)};
    });
    return { version:1, source, capturedAt:source === "captured-at-start" ? record.startedAt || null : null, cutoffAt:record.startedAt || null, limit:HISTORY_LIMIT,
        availableEarlierCount:rows.length, records:rows.slice(-HISTORY_LIMIT),
        note:"Available browser-local history only. Missing finish times or clock-order conflicts have unknown duration/gap; no safe cooldown is inferred." };
}
export function whisperAttemptTimeline(record) {
    const history = record.recentSelfTests;
    const previous = history?.records || [];
    const before = previous[previous.length-1];
    return [...previous, {...summarizeWhisperAttempt(record), current:true,
        gapBeforeMs:before ? elapsedBetween(before.finishedAt, record.startedAt) : null,
        overlapsPrevious:!!before?.finishedAt && parsedTime(before.finishedAt) > parsedTime(record.startedAt)}];
}

// Presentation only: older browser/library revisions must not produce duplicate
// pass cards. Eligibility still uses the complete historical context elsewhere.
export function visibleWhisperAttempts(records) {
    const seen = new Set();
    return [...records].sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id)).filter(record => {
        if (record.status !== "passed") return true;
        const id = record.configuration?.id || record.eligibilityContext?.configurationId;
        const environment = record.environment || record.eligibilityContext?.environment || {};
        const platform = environment.operatingSystem || environment.platform;
        // Do not guess an identity for an unidentifiable legacy report.
        if (!id || !platform || platform === "unknown") return true;
        const key = JSON.stringify([id, platform]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Small, synchronous checkpoints survive page loss independently of model caches.
// No storage access on import. Per-attempt Web Locks protect live tabs during recovery.
const PREFIX = "memora.whisper-attempt.v1.";
export function createWhisperAttemptJournal({ storage = globalThis.localStorage, locks = globalThis.navigator?.locks, now = () => new Date().toISOString(), uuid = () => crypto.randomUUID() } = {}) {
    function list() {
        const records = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key?.startsWith(PREFIX)) continue;
            const record = JSON.parse(storage.getItem(key));
            if (!record || record.schemaVersion !== 1 || key !== PREFIX + record.id) throw new Error("Invalid Whisper attempt journal record; recovery stopped without deleting evidence.");
            records.push(record);
        }
        return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    }
    function save(record) {
        const value = JSON.stringify(record);
        storage.setItem(PREFIX + record.id, value);
        if (storage.getItem(PREFIX + record.id) !== value) throw new Error("Whisper attempt checkpoint could not be verified.");
    }
    async function withLock(id, action, ifAvailable = false) {
        if (!locks?.request) throw new Error("Safe Whisper attempt ownership requires Web Locks; test/recovery was not started.");
        return locks.request(PREFIX + id, { mode: "exclusive", ifAvailable }, lock => lock ? action() : null);
    }
    async function run(metadata, execute) {
        const id = uuid();
        return withLock(id, async () => {
            const record = { schemaVersion: 1, ...metadata, id, startedAt: now(), updatedAt: now(), phase: "prepare", status: "running" };
            record.recentSelfTests = snapshotWhisperTestHistory(list(), record, "captured-at-start");
            record.phaseTimeline = [];
            const mark = (phase, at) => { record.phaseTimeline.push({phase, at, elapsedMs:elapsedBetween(record.startedAt, at)}); record.phaseTimeline = record.phaseTimeline.slice(-32); };
            save(record); // Failure here prevents model work.
            const checkpoint = async (phase, observation) => {
                // Cleanup evidence must not replace the model phase used by eligibility recovery.
                if (["cleanup", "disposal-complete", "cleanup-complete"].includes(phase)) record.cleanupPhase = phase;
                else record.phase = phase;
                record.observation = observation ? { ...observation, status: "in-progress" } : null;
                record.updatedAt = now(); mark(phase, record.updatedAt); save(record);
            };
            let summary;
            try {
                summary = await execute(checkpoint, { id });
            } catch (error) {
                record.status = "failed";
                record.error = { name: error.name, message: error.message };
                record.finishedAt = record.updatedAt = now();
                mark("finished", record.finishedAt);
                try { save(record); } catch (storageError) { throw new Error(`${error.message}; attempt persistence also failed: ${storageError.message}`); }
                throw error;
            }
            record.status = summary.results[0].status;
            record.result = summary;
            record.finishedAt = record.updatedAt = now();
            mark("finished", record.finishedAt);
            try { save(record); summary.persistence = { status: "saved", attemptId: id }; }
            catch (error) { summary.persistence = { status: "failed", attemptId: id, message: error.message }; }
            return summary;
        });
    }
    async function recover() {
        const available = list();
        for (const record of available) {
            if (record.status !== "running" && record.recentSelfTests) continue;
            await withLock(record.id, () => {
                const current = JSON.parse(storage.getItem(PREFIX + record.id));
                if (!current) return;
                let changed = false;
                if (!current.recentSelfTests) {
                    current.recentSelfTests = snapshotWhisperTestHistory(available, current);
                    // Reconstruction time is distinct from the original start cutoff.
                    current.recentSelfTests.capturedAt = now(); changed = true;
                }
                if (current.status === "running") {
                    current.status = "interrupted";
                    current.recoveredAt = current.updatedAt = now();
                    current.reason = "No final result recorded; page loss or another interruption. Cause unknown. No automatic retry.";
                    changed = true;
                }
                if (changed) save(current);
            }, true);
        }
        return list();
    }
    async function clearCompleted(ids = null) {
        const selected = ids === null ? null : new Set(ids);
        // Read again under each owner lock: another tab may still be finishing.
        for (const record of list()) {
            if (selected && !selected.has(record.id)) continue;
            await withLock(record.id, () => {
                const current = JSON.parse(storage.getItem(PREFIX + record.id));
                if (current && current.status !== "running") storage.removeItem(PREFIX + record.id);
            }, true);
        }
    }
    return { run, recover, list, clearCompleted };
}
