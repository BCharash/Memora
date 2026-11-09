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
    lines.push("PASS initial controls and production module parsing");
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
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) {
    document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack || error}`);
} finally {
    window.fetch = originalFetch; window.Worker = originalWorker;
    document.getElementById("results").textContent = lines.join("\n");
}
