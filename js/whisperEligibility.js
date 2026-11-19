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

// Keep full user agents in reports and existing storage keys. Qualification
// follows browser family, not browser/engine version numbers. Unknown agents
// remain exact rather than accidentally sharing qualification with each other.
function browserQualificationIdentity(userAgent) {
    if (userAgent.startsWith('browser-family:')) return userAgent;
    const families = [
        ['edge', /\bEdg(?:A|iOS)?\//i], ['opera', /\b(?:OPR|OPiOS)\//i],
        ['samsung', /\bSamsungBrowser\//i], ['firefox', /\b(?:Firefox|FxiOS)\//i],
        ['chromium', /\bChromium\//i], ['chrome', /\b(?:Chrome|HeadlessChrome|CriOS)\//i], ['safari', /\bVersion\/.*\bSafari\//i]
    ];
    const family = families.find(([, pattern]) => pattern.test(userAgent));
    return family ? `browser-family:${family[0]}` : userAgent;
}
export function qualificationKey(context) {
    eligibilityKey(context); // Retain the same required-context validation.
    return eligibilityKey({ ...context, browser: browserQualificationIdentity(context.browser) });
}
export function normalizeWhisperEligibilityKey(key) {
    if (typeof key !== 'string' || !key.startsWith(PREFIX)) return key;
    try { return qualificationKey(JSON.parse(decodeURIComponent(key.slice(PREFIX.length)))); }
    catch { return key; } // Preserve unrelated or malformed historical evidence.
}

function normalizeInterruption(record) {
    if (record?.status === "blocked" && record.lastDecision?.status === "interrupted") {
        return { ...record, status: "suspended", reason: "Model work was interrupted; cause unknown. A successful manual test can restore eligibility." };
    }
    return record;
}

export function reduceWhisperEligibility(previous, attempt, { deliberateRetest = false } = {}) {
    previous = normalizeInterruption(previous);
    if (!attempt?.id || !Number.isFinite(Date.parse(attempt.startedAt))) throw new Error("Eligibility evidence requires attempt identity and start time.");
    const result = attempt.result?.results?.[0];
    const phase = attempt.phase || result?.failedPhase;
    const evidence = { id: attempt.id, startedAt: attempt.startedAt, status: attempt.status, phase };
    const wer = result?.wer;
    const validPass = attempt.status === "passed" && result?.status === "passed" && result.transcriptionStatus === "passed" && result.accuracyStatus === "passed" && result.validation?.status === "passed" && Number.isFinite(wer) && wer >= 0 && wer <= 0.15;
    // Migrate an already-ingested manual pass that the old flag rule withheld.
    // A newer adverse decision always wins; later neutral attempts stay visible.
    const recoverSavedPass = deliberateRetest && validPass && ["blocked", "suspended"].includes(previous?.status)
        && Date.parse(attempt.startedAt) > Date.parse(previous.lastDecision?.startedAt || "1970-01-01")
        && (previous.latestAttempt?.id === attempt.id || ["cancelled", "timed-out"].includes(previous.latestAttempt?.status));
    if (previous?.latestAttempt && (previous.latestAttempt.id === attempt.id || Date.parse(previous.latestAttempt.startedAt) > Date.parse(attempt.startedAt)) && !recoverSavedPass) return previous;
    const latestAttempt = previous?.latestAttempt && Date.parse(previous.latestAttempt.startedAt) > Date.parse(attempt.startedAt) ? previous.latestAttempt : evidence;
    const next = { schemaVersion: 1, status: "unverified", reason: "No qualifying test result.", ...previous, latestAttempt };
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
        next.reason = attempt.status === "interrupted" ? "Model work was interrupted; cause unknown. A successful manual test can restore eligibility." : "Model execution or reference accuracy failed. A successful manual test can restore eligibility.";
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
        const key = qualificationKey(context);
        const all = records();
        const matches = all.filter(record => qualificationKey(record.context) === key).map(normalizeInterruption);
        if (matches.length) {
            const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : -Infinity;
            const decisionTime = record => time(record.lastDecision?.startedAt || record.lastSuccess?.startedAt);
            const severity = { blocked: 4, suspended: 3, eligible: 2, 'needs-validation': 1, unverified: 0 };
            // Several old version-specific rows may match. A later adverse
            // decision must beat an earlier pass, even across a browser update.
            matches.sort((a,b) => (decisionTime(b) - decisionTime(a)) || (severity[b.status] || 0) - (severity[a.status] || 0));
            const latest = field => matches.map(record => record[field]).filter(Boolean).sort((a,b) => time(b.startedAt) - time(a.startedAt))[0];
            const combined = { ...matches[0], context };
            for (const field of ['latestAttempt', 'lastSuccess']) {
                const value = latest(field); if (value) combined[field] = value;
            }
            return combined;
        }
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
