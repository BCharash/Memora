import { fingerprintWhisperConfiguration } from "./whisperConfigurations.js";
import { WHISPER_VALIDATION_PROTOCOL } from "./whisperValidation.js";
import { createWhisperEligibilityStore } from "./whisperEligibility.js";
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
    const executionWorker = isIOS ? "./js/whisper-ios-worker.js" : "./js/whisper-test-worker.js";
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
export function createWhisperEvidenceBridge({ storage = globalThis.localStorage, journal = createWhisperAttemptJournal({ storage }), store = createWhisperEligibilityStore({ storage }) } = {}) {
    const reviewKey = (id, environment) => REVIEW_PREFIX + encodeURIComponent(JSON.stringify([id, environment?.operatingSystem, environment?.deviceType]));
    async function sync() {
        const attempts = await journal.recover();
        for (const attempt of [...attempts].reverse()) {
            if (attempt.status === "running") continue;
            if (attempt.eligibilityContext) {
                await store.record(attempt.eligibilityContext, attempt);
            } else {
                const result = attempt.result?.results?.[0];
                const adverse = attempt.status === "interrupted" && ["load", "inference"].includes(attempt.phase) || attempt.status === "failed" && (["load", "inference"].includes(result?.failedPhase) || result?.transcriptionStatus === "passed" && result?.error?.name === "ValidationError");
                if (!adverse) continue; // Old passes never acquire invented identity.
                const key = reviewKey(attempt.configuration.id, attempt.environment);
                const value = JSON.stringify({ schemaVersion: 1, status: "blocked", attemptId: attempt.id, startedAt: attempt.startedAt, reason: "Earlier adverse test lacks exact fixture/configuration identity. Review and deliberate retest required; cause of interruption unknown." });
                storage.setItem(key, value);
                if (storage.getItem(key) !== value) throw new Error("Legacy safety review could not be saved; history was retained.");
            }
        }
        return attempts;
    }
    function get(context) {
        const exact = store.get(context);
        const review = storage.getItem(reviewKey(context.configurationId, context.environment));
        return review ? { ...exact, status: "blocked", reason: JSON.parse(review).reason, legacyReview: JSON.parse(review) } : exact;
    }
    return { sync, get };
}
