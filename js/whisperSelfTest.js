import { createWhisperEvidenceBridge, getWhisperEligibilityContext, digestWhisperFixture } from "./whisperEligibilityEvidence.js";
// --------------------------------------------------
// Memora Whisper Self-Test
// --------------------------------------------------

import { APP_BUILD } from "./build-info.js";
import { createWhisperAttemptJournal } from "./whisperAttempts.js";
import { DEFAULT_TEST_LIMITS } from "./whisperTestLifecycle.js";
import { WHISPER_VALIDATION_PROTOCOL } from "./whisperValidation.js";
import { decodeAudio } from "./audioProcessor.js";
import { getModelRegistryBaseline } from "./modelManager.js";
import { getWhisperConfigurationDefinitions } from "./whisperConfigurations.js";
import { isIOS, runtimeIdentity, getRuntimeCapabilities } from "./runtime.js";
import { clearWhisperResources } from "./whisper.js";
import { acquireWhisperActivity } from "./whisperActivity.js";
import { createWhisperTestRunner } from "./whisperTestLifecycle.js";

const TEST_AUDIO_URL = "./data/whisper-test/test-audio.m4a";
const EXPECTED_TEXT_URL = "./data/whisper-test/expected-transcription.txt";
async function loadTestAudio(signal) {
    const response = await fetch(TEST_AUDIO_URL, { cache: "no-store", signal });
    if (!response.ok) {
        throw new Error(`Unable to load ${TEST_AUDIO_URL} (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    return new File([blob], "test-audio.m4a", {
        type: blob.type || "audio/mp4"
    });
}

async function loadExpectedText(signal) {
    const response = await fetch(EXPECTED_TEXT_URL, { cache: "no-store", signal });
    if (!response.ok) {
        throw new Error(`Unable to load ${EXPECTED_TEXT_URL} (HTTP ${response.status}).`);
    }
    return response.text();
}

function getEnvironment() {
    return {
        ...runtimeIdentity,
        platform: runtimeIdentity.operatingSystem,
        requestedBackend: isIOS ? "wasm" : "webgpu",
        actualBackend: "unknown",
        webgpu: getRuntimeCapabilities().webgpu
    };
}

export function getWhisperSelfTestOptions() {
    const registry = getModelRegistryBaseline();
    // Preserve the existing iOS/non-iOS split during this list-only migration.
    // Resolver OS/capability checks belong to the later execution checkpoint.
    const platform = isIOS ? "ios" : "desktop";
    return getWhisperConfigurationDefinitions()
        .filter(configuration => configuration.platform === platform && configuration.test.allowed)
        .sort((a, b) => a.test.order - b.test.order)
        .map(configuration => registry.find(record => record.id === configuration.id))
        .filter(Boolean);
}

const createStandalone = (checkpoint, eligibilityContext) => createWhisperTestRunner({
    checkpoint,
    loadFixture: async signal => {
        const [audioFile, expectedText] = await Promise.all([loadTestAudio(signal), loadExpectedText(signal)]);
        eligibilityContext.fixtureDigest = await digestWhisperFixture(audioFile, expectedText);
        return { audioFile, expectedText };
    },
    decode: decodeAudio,
    createWorker: () => new Worker(isIOS ? "./js/whisper-ios-worker.js" : "./js/whisper-desktop-worker.js", { type: "module" }),
    prepareProduction: clearWhisperResources,
    acquireActivity: () => acquireWhisperActivity("self-test"),
    environment: getEnvironment
});

export async function runWhisperSelfTest({ modelId, onEvent, signal, limits, deliberateRetest = false } = {}) {
    const options = getWhisperSelfTestOptions();
    const selected = modelId ? options.find(configuration => configuration.id === modelId) : options[0];
    if (!selected) throw new Error("The requested Whisper self-test configuration is not available for this device.");
    const bridge = createWhisperEvidenceBridge();
    await bridge.sync(); // Persist adverse history before journal retention can prune it.
    const eligibilityContext = await getWhisperEligibilityContext(getWhisperConfigurationDefinitions().find(item => item.id === selected.id));
    const journal = createWhisperAttemptJournal();
    const summary = await journal.run({
        deliberateRetest: deliberateRetest === true, eligibilityContext, build: APP_BUILD, environment: getEnvironment(), browser: navigator.userAgent,
        configuration: selected, declaredDefinition: getWhisperConfigurationDefinitions().find(item => item.id === selected.id), protocol: WHISPER_VALIDATION_PROTOCOL,
        executionWorker: isIOS ? "./js/whisper-ios-worker.js" : "./js/whisper-desktop-worker.js",
        fixture: { audio: TEST_AUDIO_URL, reference: EXPECTED_TEXT_URL }, limits: { ...DEFAULT_TEST_LIMITS, ...limits }
    }, checkpoint => createStandalone(checkpoint, eligibilityContext)({ configuration: selected, onEvent, signal, limits }));
    try { await bridge.sync(); }
    catch (error) { summary.eligibilityPersistence = { status: "failed", message: error.message }; }
    window.dispatchEvent(new Event("memora-whisper-eligibility-changed"));
    onEvent?.({ type: "attempt-saved", persistence: summary.persistence, eligibilityPersistence: summary.eligibilityPersistence });
    return summary;
}
