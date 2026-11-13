import { createWhisperAttemptJournal, snapshotWhisperTestHistory } from "./whisperAttempts.js";
import { eligibilityKey } from "./whisperEligibility.js";
import { createWhisperExecutionJournal } from "./whisperExecutions.js";
import { classifyWhisperProductionExecution } from "./whisperFailures.js";

// Persistent review evidence, not another model catalogue or qualification store.
// The existing evidence bridge remains the single final eligibility authority.
const PREFIX = "memora.whisper-production-evidence.v1.";
const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : -Infinity;
export function createWhisperProductionEvidence({ storage = globalThis.localStorage, locks = globalThis.navigator?.locks,
    journal = createWhisperExecutionJournal({ storage, locks }), now = () => new Date().toISOString() } = {}) {
    function rows() {
        return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(key => key?.startsWith(PREFIX)).map(key => {
            const value = JSON.parse(storage.getItem(key));
            if (value?.schemaVersion !== 1 || !["reference", "incident", "stability"].includes(value.kind)) throw new Error("Invalid production review evidence; records were retained.");
            return value;
        });
    }
    function save(key, value) {
        const text = JSON.stringify(value); storage.setItem(PREFIX + key, text);
        if (storage.getItem(PREFIX + key) !== text) throw new Error("Production review write could not be verified.");
    }
    function transaction(action) {
        if (!locks?.request) throw new Error("Production eligibility reviews require safe storage ownership.");
        return locks.request(PREFIX + "writer", action);
    }
    const keyFor = context => eligibilityKey(context);
    const recent = (records, record) => records.filter(item => record.pageId && item.id !== record.id && item.pageId === record.pageId && time(item.startedAt) <= time(record.evidenceAt || record.finishedAt || record.startedAt)).slice(0, 5)
        .map(item => ({ id: item.id, configurationId: item.configuration?.id || item.requestedModel, startedAt: item.startedAt, finishedAt: item.finishedAt || null, modelCompletedAt: item.modelCompletedAt || null, status: item.status, modelOutcome: item.modelOutcome }));
    function recentTests(record) {
        if (!record.pageId) return { status: "page-id-unavailable", records: [] };
        try {
            const records = createWhisperAttemptJournal({ storage, locks }).list().filter(item => item.pageId === record.pageId && time(item.startedAt) <= time(record.evidenceAt || record.finishedAt || record.startedAt)).slice(0, 5)
                .map(item => ({ id: item.id, configurationId: item.configuration?.id, startedAt: item.startedAt, finishedAt: item.finishedAt || null, status: item.status, phase: item.phase, cleanup: item.result?.results?.[0]?.releaseStatus || null }));
            return { status: "available-history-only", records };
        } catch { return { status: "unavailable", records: [] }; }
    }
    function list() { return rows().filter(row => row.kind !== "reference").sort((a, b) => b.evidenceAt.localeCompare(a.evidenceAt) || b.id.localeCompare(a.id)); }
    function certificate(contextKey) { return rows().find(row => row.kind === "reference" && row.contextKey === contextKey); }
    function isActive(row) { return row.kind === "incident" && !["kept", "reference-passed"].includes(row.state); }
    function newerReference(row, reference) { return reference && time(reference.startedAt) > time(row.evidenceAt); }
    async function recordReference(context, attempt) {
        return transaction(() => {
            const contextKey = keyFor(context), existing = certificate(contextKey);
            if (existing && time(existing.startedAt) >= time(attempt.startedAt)) return;
            save("reference." + encodeURIComponent(contextKey), { schemaVersion: 1, kind: "reference", contextKey, id: attempt.id, startedAt: attempt.startedAt });
        });
    }
    async function sync() {
        return transaction(async () => {
            const executions = await journal.recover();
            for (const record of [...executions].reverse()) {
                if (record.status === "running" || record.eligibilityEvaluation?.status === "processed") continue;
                const decision = classifyWhisperProductionExecution(record);
                let contextKey = null, reason = decision.reason, effect = decision.effect, incident;
                try {
                    contextKey = keyFor(record.eligibilityContext);
                    if (record.configuration?.id !== record.eligibilityContext.configurationId || record.configurationFingerprint !== record.eligibilityContext.configurationFingerprint ||
                        record.browser !== record.eligibilityContext.browser || record.environment?.operatingSystem !== record.eligibilityContext.environment.operatingSystem) throw new Error("Execution context mismatch.");
                } catch { contextKey = null; effect = "none"; reason = "Exact qualification context unavailable; no identity was invented."; }
                if (contextKey && effect !== "none") {
                    incident = rows().find(row => row.kind !== "reference" && row.id === record.id);
                    if (!incident) {
                        incident = { schemaVersion: 1, kind: effect === "stability" ? "stability" : "incident", id: record.id,
                            contextKey, context: record.eligibilityContext, configurationId: record.configuration.id,
                            evidenceAt: record.evidenceAt || record.finishedAt || record.startedAt, recordedAt: now(),
                            effect, state: effect === "blocked" ? "retest-required" : effect === "review" ? "pending" : "observation",
                            reason, previousQualification: record.previousQualification || null,
                            execution: record, recentExecutions: recent(executions, record), recentSelfTests: recentTests(record), events: [] };
                        save("incident." + record.id, incident);
                    }
                }
                // Ack only after the durable incident (if any). Unacknowledged
                // records cannot be pruned/cleared by the execution journal.
                if (journal.markEvaluated) await journal.markEvaluated(record.id, { status: "processed", effect, reason, incidentId: incident?.id || null });
            }
            for (const row of list()) if (isActive(row)) {
                const reference = certificate(row.contextKey);
                if (newerReference(row, reference)) {
                    row.state = "reference-passed";
                    row.events.push({ at: now(), actor: "system", action: "reference-passed", referenceId: reference.id, referenceStartedAt: reference.startedAt });
                    save("incident." + row.id, row);
                }
            }
            if (journal.prune) await journal.prune();
        });
    }
    function apply(context, base) {
        const active = list().filter(row => row.contextKey === keyFor(context) && isActive(row));
        if (!active.length || base.status === "blocked") return base;
        const blocked = active.find(row => row.effect === "blocked");
        return { ...base, status: blocked ? "blocked" : "suspended", reason: blocked ? blocked.reason : "Model work needs review. Open Model eligibility reviews in Settings, or run a reference retest.", productionReviewIds: active.map(row => row.id) };
    }
    async function decide(id, action, explanation, baseFor) {
        if (!["keep", "retest", "defer", "note"].includes(action)) throw new Error("Unknown review action.");
        const note = String(explanation || "").trim();
        if (note.length > 2000) throw new Error("Please keep the explanation within 2,000 characters.");
        return transaction(() => {
            const row = list().find(item => item.id === id);
            if (!row) throw new Error("The review is no longer available.");
            if (action === "note") {
                if (!note) throw new Error("Enter an observation first.");
            } else {
                if (!isActive(row) || row.effect === "blocked" || row.state === "retest-required") throw new Error("This incident requires a successful reference retest, or is already resolved.");
                if (action === "keep") {
                    if (!note) throw new Error("Explain why previous eligibility should be kept.");
                    const base = baseFor(row.context);
                    if (row.previousQualification?.status !== "eligible" || !row.previousQualification?.lastSuccess || base.status !== "eligible") throw new Error("A review cannot grant qualification or override another eligibility hold. Run a reference test.");
                    row.state = "kept";
                } else row.state = action === "defer" ? "deferred" : "retest-required";
            }
            row.events.push({ at: now(), actor: "user", action, explanation: note });
            save("incident." + row.id, row);
            return row;
        });
    }
    async function setArchived(id, archived) {
        if (typeof archived !== "boolean") throw new Error("Invalid archive choice.");
        return transaction(() => {
            const row = list().find(item => item.id === id);
            if (!row) throw new Error("The review is no longer available.");
            if (archived && isActive(row)) throw new Error("Resolve this model review or complete its reference retest before archiving.");
            if (!!row.archivedAt === archived) return row;
            row.archivedAt = archived ? now() : null;
            row.events.push({ at: now(), actor: "user", action: archived ? "archived" : "restored", explanation: "" });
            save("incident." + row.id, row);
            return row;
        });
    }
    async function addStabilityNote(executionId, explanation) {
        const note = String(explanation || "").trim();
        if (!note || note.length > 2000) throw new Error("Enter a stability observation within 2,000 characters.");
        return transaction(() => {
            const record = journal.list().find(row => row.id === executionId);
            if (!record || record.modelOutcome !== "completed") throw new Error("A completed model execution is required for a post-completion observation.");
            const id = "note-" + executionId;
            const row = list().find(item => item.id === id) || { schemaVersion: 1, kind: "stability", id,
                contextKey: record.eligibilityContext ? keyFor(record.eligibilityContext) : null, configurationId: record.configuration?.id || record.requestedModel,
                evidenceAt: record.modelCompletedAt || record.finishedAt || record.startedAt, recordedAt: now(), effect: "stability", state: "observation",
                reason: "User-reported post-completion session stability; cause unknown. Qualification is unchanged.", execution: record, recentExecutions: recent(journal.list(), record), recentSelfTests: recentTests(record), events: [] };
            row.events.push({ at: now(), actor: "user", action: "stability-note", explanation: note }); save("incident." + id, row);
        });
    }
    async function addSelfTestStabilityNote(attemptId, explanation, runtimeDiagnostics = null) {
        const note = String(explanation || "").trim();
        if (!note || note.length > 2000) throw new Error("Enter an observation within 2,000 characters.");
        return transaction(() => {
            const attempts = createWhisperAttemptJournal({storage, locks}).list();
            const attempt = attempts.find(item => item.id === attemptId);
            if (!attempt || attempt.status === "running") throw new Error("A saved, finished or interrupted self-test is required.");
            const id = "self-test-note-" + attemptId;
            const snapshot = structuredClone(attempt);
            if (!snapshot.recentSelfTests) snapshot.recentSelfTests = snapshotWhisperTestHistory(attempts, snapshot);
            const row = list().find(item => item.id === id) || {schemaVersion:1,kind:"stability",sourceKind:"self-test",id,attemptId,
                contextKey:null, configurationId:attempt.configuration?.id || "unknown",
                evidenceAt:attempt.finishedAt || attempt.startedAt, recordedAt:now(), effect:"stability",state:"observation",
                reason:"User-reported problem after a self-test; cause unknown. Test result and qualification are unchanged.",
                selfTest:snapshot, recentSelfTests:snapshot.recentSelfTests, runtimeDiagnostics, events:[]};
            row.events.push({at:now(),actor:"user",action:"stability-note",explanation:note});
            // Keep the first observation's test/timeline snapshot immutable.
            save("incident." + id, row);
            return row;
        });
    }
    return { sync, recordReference, apply, list, decide, addStabilityNote, addSelfTestStabilityNote, setArchived };
}
