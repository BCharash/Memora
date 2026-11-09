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
    assert(!advanced.open && !history.open, "secondary sections collapsed");
    assert(result.compareDocumentPosition(advanced) & Node.DOCUMENT_POSITION_FOLLOWING, "result before settings");
    assert(advanced.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING, "history last");
    lines.push("PASS initial controls, section order and collapsed secondary sections");
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
    runButton().click(); await waitFor(() => !cancelButton().disabled); cancelButton().click();
    await waitFor(() => !runButton().disabled);
    lines.push("PASS UI retry after cancellation");
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
        const technical = [...historyPanel.querySelectorAll("details")].find(el => el.querySelector(":scope > summary")?.textContent === "Technical report");
        assert(technical && !technical.open, "technical report separately collapsed");
        const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
        let copied = "";
        try {
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { copied = text; } } });
            const copy = technical.parentElement.querySelector("[data-whisper-copy-report]");
            copy.click();
            await waitFor(() => !!copied);
            assert(JSON.parse(copied).schemaVersion === 1, "copy contains JSON report");
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } });
            copy.click();
            await waitFor(() => technical.open);
            assert(technical.parentElement.textContent.includes("Copy unavailable"), "copy failure offers manual recovery");
        } finally {
            if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
            else delete navigator.clipboard;
        }
        lines.push("PASS readable report, collapsed JSON and copy success/failure");
        await waitFor(() => document.getElementById("settingsWhisperEligibility").textContent.includes("Blocked pending review"));
        lines.push("PASS recovered interruption visible in Settings with model, stage and eligibility");
        const clearHistory = document.querySelector("[data-whisper-clear-history]");
        assert(clearHistory, "clear history control visible");
        clearHistory.click();
        await waitFor(() => !document.getElementById("settingsWhisperAttemptHistory").textContent.includes("medium-fixture"));
        assert(localStorage.getItem(recoveryKey) === null, "saved record removed");
        await waitFor(() => document.getElementById("settingsWhisperEligibility").textContent.includes("Blocked pending review"));
        lines.push("PASS clear saved history updates Settings and persisted records");
    } finally { localStorage.removeItem(recoveryKey); }
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) {
    document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack || error}`);
} finally {
    window.fetch = originalFetch; window.Worker = originalWorker;
    document.getElementById("results").textContent = lines.join("\n");
}
