// Eligibility foundation only. No imports, storage reads or production gating on import.
const PREFIX = "memora.whisper-eligibility.v1.";
function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
}
export function eligibilityKey(context) {
    for (const field of ["configurationId", "configurationFingerprint", "executionWorker", "protocol", "fixtureDigest", "browser"]) {
        if (typeof context?.[field] !== "string" || !context[field]) throw new Error(`Missing eligibility context: ${field}`);
    }
    if (!context.environment?.operatingSystem || !context.recipe || !context.capabilities) throw new Error("Eligibility requires environment, recipe and observed capabilities.");
    return PREFIX + encodeURIComponent(JSON.stringify(canonical(context)));
}

function normalizeInterruption(record) {
    if (record?.status === "blocked" && record.lastDecision?.status === "interrupted") {
        return { ...record, status: "suspended", reason: "Model work was interrupted; cause unknown. Paused pending deliberate retest." };
    }
    return record;
}

export function reduceWhisperEligibility(previous, attempt, { deliberateRetest = false } = {}) {
    previous = normalizeInterruption(previous);
    if (!attempt?.id || !Number.isFinite(Date.parse(attempt.startedAt))) throw new Error("Eligibility evidence requires attempt identity and start time.");
    // Replay and late writes must not erase newer evidence, including cancellations.
    if (previous?.latestAttempt && (previous.latestAttempt.id === attempt.id || Date.parse(previous.latestAttempt.startedAt) > Date.parse(attempt.startedAt))) return previous;
    const result = attempt.result?.results?.[0];
    const phase = attempt.phase || result?.failedPhase;
    const evidence = { id: attempt.id, startedAt: attempt.startedAt, status: attempt.status, phase };
    const next = { schemaVersion: 1, status: "unverified", reason: "No qualifying test result.", ...previous, latestAttempt: evidence };
    const wer = result?.wer;
    const validPass = attempt.status === "passed" && result?.status === "passed" && result.transcriptionStatus === "passed" && result.accuracyStatus === "passed" && result.validation?.status === "passed" && Number.isFinite(wer) && wer >= 0 && wer <= 0.15;
    if (validPass) {
        next.lastSuccess = evidence;
        if (!["blocked", "suspended"].includes(previous?.status) || deliberateRetest) {
            next.status = "eligible";
            next.reason = "Completed reference test passed the inclusive 15% WER gate.";
            next.lastDecision = evidence;
        }
    } else if ((attempt.status === "interrupted" && ["load", "inference"].includes(phase)) ||
        (attempt.status === "failed" && (["load", "inference"].includes(result?.failedPhase) || result?.error?.name === "ValidationError" && result?.transcriptionStatus === "passed"))) {
        // An interruption does not downgrade a previously confirmed failure.
        if (attempt.status === "interrupted" && previous?.status === "blocked") return next;
        next.status = attempt.status === "interrupted" ? "suspended" : "blocked";
        next.reason = attempt.status === "interrupted" ? "Model work was interrupted; cause unknown. Paused pending deliberate retest." : "Model execution or reference accuracy failed. Deliberate retest required.";
        next.lastDecision = evidence;
    } else if (attempt.status !== "cancelled") {
        next.reason = previous?.reason || "Inconclusive evidence; no eligibility granted.";
    }
    return next;
}

export function createWhisperEligibilityStore({ storage = globalThis.localStorage, locks = globalThis.navigator?.locks } = {}) {
    function records() {
        return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(key => key?.startsWith(PREFIX)).map(key => {
            const record = JSON.parse(storage.getItem(key));
            if (record?.schemaVersion !== 1 || eligibilityKey(record.context) !== key) throw new Error("Invalid Whisper eligibility record; evidence was not reset.");
            return record;
        });
    }
    function get(context) {
        const key = eligibilityKey(context);
        const all = records();
        const exact = all.find(record => eligibilityKey(record.context) === key);
        if (exact) return normalizeInterruption(exact);
        const prior = all.some(record => record.context.configurationId === context.configurationId);
        return { schemaVersion: 1, context, status: prior ? "needs-validation" : "unverified", reason: prior ? "Execution or environment context changed; old evidence does not qualify this context." : "No qualifying test evidence." };
    }
    async function record(context, attempt, options) {
        const key = eligibilityKey(context);
        if (attempt.configuration?.id !== context.configurationId) throw new Error("Attempt/configuration mismatch.");
        if (!locks?.request) throw new Error("Safe eligibility updates require Web Locks.");
        return locks.request(PREFIX + "writer", async () => {
            const next = { ...reduceWhisperEligibility(get(context), attempt, options), context };
            const value = JSON.stringify(next);
            storage.setItem(key, value);
            if (storage.getItem(key) !== value) throw new Error("Eligibility write could not be verified.");
            return next;
        });
    }
    return { get, record };
}
