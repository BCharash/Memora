import { fingerprintWhisperConfiguration } from "./whisperConfigurations.js";
import { WHISPER_VALIDATION_PROTOCOL } from "./whisperValidation.js";
import { createWhisperEligibilityStore, eligibilityKey } from "./whisperEligibility.js";
import { createWhisperAttemptJournal } from "./whisperAttempts.js";
import { runtimeIdentity, getRuntimeCapabilities, isIOS } from "./runtime.js";

// Digest of the shipped audio/reference bytes. Update when either fixture changes.
export const WHISPER_FIXTURE_DIGEST = "sha256:72ccb863fdbaeb83e9f877d9eeb22f382be27171b2f690ceea53a6fac3918ec0";
export async function digestWhisperFixture(audioFile, expectedText) {
    const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
    const parts = await Promise.all([hash(await audioFile.arrayBuffer()), hash(new TextEncoder().encode(expectedText))]);
    return `sha256:${await hash(new TextEncoder().encode(JSON.stringify(parts)))}`;
}
export async function getWhisperEligibilityContext(definition) {
    const executionWorker = definition.worker.script;
    const capabilities = getRuntimeCapabilities();
    return {
        configurationId: definition.id,
        configurationFingerprint: await fingerprintWhisperConfiguration({ ...definition, worker: { ...definition.worker, script: executionWorker } }),
        executionWorker, protocol: WHISPER_VALIDATION_PROTOCOL, fixtureDigest: WHISPER_FIXTURE_DIGEST,
        browser: navigator.userAgent, environment: runtimeIdentity,
        capabilities: { workers: capabilities.workers, webgpu: capabilities.webgpu },
        recipe: { task: "transcribe", chunk_length_s: 30, stride_length_s: 5, language: isIOS ? null : "omitted", sampleRate: 16000 }
    };
}

const REVIEW_PREFIX = "memora.whisper-eligibility-review.v1.";
export function createWhisperEvidenceBridge({ storage = globalThis.localStorage, journal = createWhisperAttemptJournal({ storage }), store = createWhisperEligibilityStore({ storage }), locks = globalThis.navigator?.locks } = {}) {
    const reviewKey = (id, environment) => REVIEW_PREFIX + encodeURIComponent(JSON.stringify([id, environment?.operatingSystem, environment?.deviceType]));
    function saveReview(key, review) {
        const value = JSON.stringify(review);
        storage.setItem(key, value);
        if (storage.getItem(key) !== value) throw new Error("Safety review could not be saved; history was retained.");
    }
    async function ingest() {
        const attempts = await journal.recover();
        for (const attempt of [...attempts].reverse()) {
            if (attempt.status === "running") continue;
            if (attempt.eligibilityContext) {
                const context = attempt.eligibilityContext;
                const decision = await store.record(context, attempt, { deliberateRetest: attempt.deliberateRetest === true });
                const key = reviewKey(context.configurationId, context.environment);
                const rawReview = storage.getItem(key);
                if (rawReview && attempt.deliberateRetest === true && decision.status === "eligible" && decision.lastDecision?.id === attempt.id) {
                    const review = JSON.parse(rawReview);
                    if (Date.parse(attempt.startedAt) > Date.parse(review.startedAt)) {
                        saveReview(key, { ...review, resolvedBy: { attemptId: attempt.id, startedAt: attempt.startedAt, contextKey: eligibilityKey(context) } });
                    }
                }
            } else {
                const result = attempt.result?.results?.[0];
                const adverse = attempt.status === "interrupted" && ["load", "inference"].includes(attempt.phase) || attempt.status === "failed" && (["load", "inference"].includes(result?.failedPhase) || result?.transcriptionStatus === "passed" && result?.error?.name === "ValidationError");
                if (!adverse) continue; // Old passes never acquire invented identity.
                const key = reviewKey(attempt.configuration.id, attempt.environment);
                const current = JSON.parse(storage.getItem(key) || "null");
                if (current && (Date.parse(current.startedAt) > Date.parse(attempt.startedAt) || current.attemptId === attempt.id && current.adverseStatus)) continue;
                const confirmedFailure = attempt.status === "failed"
                    ? { attemptId: attempt.id, startedAt: attempt.startedAt }
                    : !current?.resolvedBy ? current?.confirmedFailure || (current?.adverseStatus === "failed" ? { attemptId: current.attemptId, startedAt: current.startedAt } : null) : null;
                saveReview(key, { schemaVersion: 1, confirmedFailure, status: confirmedFailure ? "blocked" : "suspended", adverseStatus: attempt.status, attemptId: attempt.id, startedAt: attempt.startedAt,
                    reason: confirmedFailure ? "Earlier test failed without exact historical identity. Deliberate retest required." : "Earlier model work was interrupted; cause unknown. Paused pending deliberate retest; exact historical identity is unavailable." });
            }
        }
        return attempts;
    }
    async function sync() {
        if (!locks?.request) throw new Error("Safe evidence ingestion requires Web Locks.");
        return locks.request(REVIEW_PREFIX + "writer", ingest);
    }
    function get(context) {
        const exact = store.get(context);
        const review = storage.getItem(reviewKey(context.configurationId, context.environment));
        if (!review) return exact;
        const legacy = JSON.parse(review);
        if (legacy.resolvedBy?.contextKey === eligibilityKey(context)) return { ...exact, legacyReview: legacy };
        // Old generic blocks did not distinguish interruptions. Treat as a hold,
        // unless a confirmed failure was recorded; never claim incompatibility.
        const legacyStatus = legacy.confirmedFailure || legacy.adverseStatus === "failed" ? "blocked" : "suspended";
        if (exact.status === "blocked") return { ...exact, legacyReview: legacy };
        return { ...exact, status: legacyStatus, reason: legacyStatus === "suspended" ? "Earlier interruption needs review. Paused pending deliberate retest; cause unknown." : legacy.reason, legacyReview: legacy };
    }
    return { sync, get };
}
