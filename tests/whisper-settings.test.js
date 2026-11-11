import { getWhisperEligibilityContext } from "../js/whisperEligibilityEvidence.js";
import { getWhisperConfigurationDefinitions } from "../js/whisperConfigurations.js";
import { createWhisperEligibilityStore } from "../js/whisperEligibility.js";
import { runtimeIdentity } from "../js/runtime.js";
import { initSettingsUI } from "../js/settings.js";
import { acquireWhisperActivity } from "../js/whisperActivity.js";
import { transcribeRecording } from "../js/transcription.js";

const lines = [];
const assert = (value, message) => { if (!value) throw new Error(message); };
async function waitFor(predicate) {
    const until = performance.now() + 3000;
    while (!predicate()) {
        if (performance.now() > until) throw new Error("Timed out waiting for Settings");
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}
const originalFetch = window.fetch;
const originalWorker = window.Worker;
const report = {
    browser: { usage: 0, quota: 100 },
    indexedDB: { semanticEntries: { count: 0, embeddingBytes: 0, representations: [] }, transcripts: { count: 0, bytes: 0 }, otherBytes: 0, otherCount: 0, otherStores: [] },
    modelCache: { models: [] }
};
window.fetch = (url, options) => {
    if (String(url).includes("data/whisper-test/")) return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("Cancelled fixture", "AbortError")), { once: true });
    });
    return Promise.resolve({ ok: false, status: 503 });
};
window.Worker = class { constructor() { throw new Error("Unexpected real worker in UI test"); } };
const runButton = () => document.querySelector('[data-settings-action="run-whisper-self-test"]');
const cancelButton = () => document.querySelector('[data-settings-action="cancel-whisper-self-test"]');
try {
    const ui = initSettingsUI({ getStorageManager: async () => ({ getStorageReport: async () => report }), getStorage: async () => ({}) });
    await ui.refresh();
    assert(!runButton().disabled && cancelButton().disabled && cancelButton().hidden && document.getElementById("settingsWhisperSelfTestCancel").hidden, "initial controls");
    const advanced = document.getElementById("settingsWhisperAdvanced");
    const history = document.getElementById("settingsWhisperHistorySection");
    const result = document.getElementById("settingsWhisperSelfTestDetail");
    assert(!advanced.open && history.hidden, "secondary sections collapsed");
    assert(result.compareDocumentPosition(advanced) & Node.DOCUMENT_POSITION_FOLLOWING, "result before settings");
    assert(advanced.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING, "history last");
    lines.push("PASS initial controls, section order and collapsed secondary sections");
    const historyToggle = document.querySelector('[data-settings-action="toggle-self-test-history"]');
    historyToggle.click(); await waitFor(() => !history.hidden);
    assert(historyToggle.textContent === "Hide", "View opens history with matching button");
    historyToggle.click(); assert(history.hidden && historyToggle.textContent === "View", "Hide closes history");
    lines.push("PASS history View/Hide controls");
    const reviewToggle = document.querySelector('[data-settings-action="toggle-model-reviews"]');
    assert(reviewToggle.closest(".settings-disclosure").previousElementSibling.classList.contains("settings-section-divider"), "review separator independent of transcription records");
    runButton().click();
    await waitFor(() => runButton().disabled && !cancelButton().disabled);
    assert(!cancelButton().hidden && !document.getElementById("settingsWhisperSelfTestCancel").hidden, "cancel shown only during test");
    assert(!cancelButton().closest(".whisper-self-test-controls"), "cancel separate from selector row");
    await ui.refresh();
    assert(!cancelButton().disabled, "refresh preserves cancel");
    cancelButton().click();
    await waitFor(() => !runButton().disabled);
    assert(document.getElementById("settingsWhisperSelfTestDetail").textContent.includes("1 cancelled"), "cancel terminal display");
    assert(cancelButton().disabled && cancelButton().hidden && document.getElementById("settingsWhisperSelfTestCancel").hidden, "cancel hidden after stop");
    lines.push("PASS Cancel during preparation, refresh safety and terminal display");
    const selectedId = document.getElementById("settingsWhisperSelfTestModel").value;
    const selectedContext = await getWhisperEligibilityContext(getWhisperConfigurationDefinitions().find(item => item.id === selectedId));
    const eligibility = createWhisperEligibilityStore();
    await eligibility.record(selectedContext, { id: crypto.randomUUID(), startedAt: new Date().toISOString(), configuration: { id: selectedId }, status: "interrupted", phase: "load" });
    await ui.refresh();
    await waitFor(() => runButton().textContent === "Retest");
    assert(!document.querySelector('[data-settings-action="retest-whisper-self-test"]'), "single test action");
    runButton().click(); await waitFor(() => !cancelButton().disabled);
    assert(runButton().disabled, "main action disabled while active");
    await waitFor(() => document.getElementById("settingsWhisperEligibility").textContent.startsWith("Retest in progress."));
    assert(!document.getElementById("settingsWhisperEligibility").textContent.includes("Paused pending retest"), "active retest does not display paused status");
    assert(eligibility.get(selectedContext).status === "suspended", "running message does not release eligibility hold");
    await ui.refresh();
    assert(document.getElementById("settingsWhisperEligibility").textContent.startsWith("Retest in progress."), "active status survives refresh request");
    cancelButton().click();
    await waitFor(() => !runButton().disabled);
    const savedRetests = Object.keys(localStorage).filter(key => key.startsWith("memora.whisper-attempt.v1.")).map(key => JSON.parse(localStorage.getItem(key)));
    assert(savedRetests.some(record => record.deliberateRetest === true && record.status === "cancelled" && record.pageId), "deliberate action recorded before execution");
    await waitFor(() => runButton().textContent === "Retest" && document.getElementById("settingsWhisperEligibility").textContent.includes("Paused pending retest"));
    const passing = id => ({ id: crypto.randomUUID(), startedAt: new Date().toISOString(), configuration: { id }, status: "passed", phase: "validation", result: { results: [{ status: "passed", transcriptionStatus: "passed", accuracyStatus: "passed", validation: { status: "passed" }, wer: 0 }] } });
    const otherId = getWhisperConfigurationDefinitions().find(item => item.platform === "desktop" && item.id !== selectedId && item.test.allowed).id;
    const otherContext = await getWhisperEligibilityContext(getWhisperConfigurationDefinitions().find(item => item.id === otherId));
    await eligibility.record(otherContext, passing(otherId), { deliberateRetest: true });
    const selector = document.getElementById("settingsWhisperSelfTestModel");
    selector.value = otherId; selector.dispatchEvent(new Event("change"));
    await waitFor(() => runButton().textContent === "Run test");
    selector.value = selectedId; selector.dispatchEvent(new Event("change"));
    await waitFor(() => runButton().textContent === "Retest");
    await eligibility.record(selectedContext, passing(selectedId), { deliberateRetest: true });
    await ui.refresh();
    await waitFor(() => runButton().textContent === "Run test");
    lines.push("PASS exact-selection Test/Retest switching, durable intent and restoration after pass");
    document.getElementById("settingsWhisperLoadLimit").value = "0";
    runButton().click(); await waitFor(() => !runButton().disabled);
    assert(document.getElementById("settingsWhisperSelfTestDetail").textContent.includes("between 1 and 86400"), "invalid bounds message");
    lines.push("PASS timeout input validation and control recovery");
    const release = acquireWhisperActivity("self-test");
    let blocked = false;
    try { await transcribeRecording({}, "tiny"); } catch (error) { blocked = error.message.includes("busy"); }
    release(); assert(blocked, "production entry respects test guard");
    try { await transcribeRecording({ name: "broken.m4a", arrayBuffer: async () => { throw new Error("fixture failure"); } }, "tiny"); } catch { /* expected preparation failure */ }
    acquireWhisperActivity("transcription")();
    lines.push("PASS actual production wrapper exclusion and failed-preparation cleanup");
    const recoveryKey = "memora.whisper-attempt.v1.settings-recovery-fixture";
    try {
        localStorage.setItem(recoveryKey, JSON.stringify({ schemaVersion: 1, id: "settings-recovery-fixture", configuration: { id: document.getElementById("settingsWhisperSelfTestModel").value, label: "medium-fixture" }, environment: runtimeIdentity, startedAt: "2026-01-01", status: "running", phase: "inference" }));
        await ui.refresh();
        await waitFor(() => document.getElementById("settingsWhisperAttemptHistory").textContent.includes("Interrupted—no final result recorded"));
        assert(document.getElementById("settingsWhisperAttemptHistory").textContent.includes("Last saved stage: transcription"), "model and stage visible");
        const historyPanel = document.getElementById("settingsWhisperAttemptHistory");
        const technical = historyPanel.querySelector("[data-technical-report]");
        assert(technical && technical.hidden, "technical report separately collapsed");
        const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
        let copied = "";
        try {
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { copied = text; } } });
            const copy = technical.parentElement.querySelector("[data-whisper-copy-report]");
            copy.click();
            await waitFor(() => !!copied);
            assert(JSON.parse(copied).schemaVersion === 1 && JSON.parse(copied).runtimeDiagnostics.currentPageId, "copy includes export-time page diagnostics");
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } });
            copy.click();
            await waitFor(() => !technical.hidden);
            assert(technical.parentElement.textContent.includes("Copy unavailable"), "copy failure offers manual recovery");
        } finally {
            if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
            else delete navigator.clipboard;
        }
        lines.push("PASS readable report, collapsed JSON and copy success/failure");
        await waitFor(() => document.getElementById("settingsWhisperEligibility").textContent.includes("Paused pending retest"));
        lines.push("PASS recovered interruption visible in Settings with model, stage and eligibility");
        const clearHistory = document.querySelector("[data-whisper-clear-history]");
        assert(clearHistory, "clear history control visible");
        assert(clearHistory.disabled, "no clearing without selection");
        historyPanel.querySelector(`[data-history-record-id="settings-recovery-fixture"]`).click();
        assert(!clearHistory.disabled, "selected row enables clearing");
        clearHistory.click();
        await waitFor(() => !document.getElementById("settingsWhisperAttemptHistory").textContent.includes("medium-fixture"));
        assert(localStorage.getItem(recoveryKey) === null, "saved record removed");
        await waitFor(() => document.getElementById("settingsWhisperEligibility").textContent.includes("Paused pending retest"));
        lines.push("PASS clear saved history updates Settings and persisted records");
    } finally { localStorage.removeItem(recoveryKey); }
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) {
    document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack || error}`);
} finally {
    window.fetch = originalFetch; window.Worker = originalWorker;
    document.getElementById("results").textContent = lines.join("\n");
}
