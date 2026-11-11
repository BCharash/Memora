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
            save(record); // Failure here prevents model work.
            const checkpoint = async (phase, observation) => { record.phase = phase; record.observation = observation ? { ...observation, status: "in-progress" } : null; record.updatedAt = now(); save(record); };
            let summary;
            try {
                summary = await execute(checkpoint, { id });
            } catch (error) {
                record.status = "failed";
                record.error = { name: error.name, message: error.message };
                record.finishedAt = record.updatedAt = now();
                try { save(record); } catch (storageError) { throw new Error(`${error.message}; attempt persistence also failed: ${storageError.message}`); }
                throw error;
            }
            record.status = summary.results[0].status;
            record.result = summary;
            record.finishedAt = record.updatedAt = now();
            try { save(record); summary.persistence = { status: "saved", attemptId: id }; }
            catch (error) { summary.persistence = { status: "failed", attemptId: id, message: error.message }; }
            return summary;
        });
    }
    async function recover() {
        for (const record of list()) {
            if (record.status !== "running") continue;
            await withLock(record.id, () => {
                const current = JSON.parse(storage.getItem(PREFIX + record.id));
                if (current?.status !== "running") return;
                current.status = "interrupted";
                current.recoveredAt = current.updatedAt = now();
                current.reason = "No final result recorded; page loss or another interruption. Cause unknown. No automatic retry.";
                save(current);
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
