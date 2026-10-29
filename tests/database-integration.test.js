import { testDatabaseName, openMemoraDatabase } from "./database-adapter.js";
import * as storage from "../js/storage.js";
import * as semantic from "../js/semantic.js";
import * as manager from "../js/storageManager.js";
import { getModelRegistry } from "../js/modelManager.js";
import { initSettingsUI } from "../js/settings.js";

const lines = [];
const output = document.getElementById("results");
let result = "failed";
const assert = (value, message) => { if (!value) throw new Error(message); };
const requestResult = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});
async function test(label, action) {
    await action(); lines.push(`PASS ${label}`); output.textContent = lines.join("\n");
}
async function waitFor(predicate) {
    const end = Date.now() + 5000;
    while (!predicate()) {
        if (Date.now() > end) throw new Error("Timed out waiting for Settings renderer");
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}
try {
    await test("Legacy incomplete database repaired through production consumers", async () => {
        const request = indexedDB.open(testDatabaseName, 4);
        request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore("transcripts", { keyPath: "filename" }).put({ filename: "keep.txt", transcript: "preserve" });
            const entries = db.createObjectStore("semanticEntries", { keyPath: "id" });
            entries.createIndex("representationKey", "representationKey");
            entries.createIndex("sourceKey", "sourceKey");
            entries.put({ id: "old", sourceKey: "old-source", transcriptHash: "old-hash", representationKey: "old-repr", embedding: new Float32Array([1, 2]).buffer });
            db.createObjectStore("semanticMetadata", { keyPath: "key" });
        };
        (await requestResult(request)).close();
        const [exists, registry, stats] = await Promise.all([
            storage.transcriptExists("keep.txt"), getModelRegistry(), semantic.getSemanticStoreStats()
        ]);
        assert(exists && registry.length > 0 && stats.entryCount === 1, "legacy records and seeded registry");
        const db = await openMemoraDatabase(); assert(db.version === 5, "upgraded"); db.close();
    });
    await test("Cached transcript save/list/read/clear and registry evidence", async () => {
        await storage.saveTranscriptRecord("new.txt", "new transcript", {}, "tiny", "transcribe");
        assert((await manager.listCachedTranscripts()).length === 2, "list");
        assert((await manager.readCachedTranscripts()).find(x => x.filename === "keep.txt").transcript === "preserve", "preserved text");
        await storage.saveModelRegistryRecords([{ id: "test-evidence", validation: { status: "passed" } }]);
        assert((await storage.listModelRegistryRecords()).some(x => x.id === "test-evidence" && x.validation.status === "passed"), "evidence");
        await manager.clearCachedTranscript("new.txt");
        assert(!await storage.transcriptExists("new.txt"), "delete only target");
    });
    await test("Semantic removal and write failure release connections", async () => {
        assert(await semantic.removeSemanticEntriesForTranscript("old-source", "old-hash") === 1, "target removal");
        assert((await semantic.getSemanticStoreStats()).entryCount === 0, "stats after removal");
        let rejected = false;
        try { await storage.saveModelRegistryRecords([{ id: "must-rollback" }, { invalid: true }]); } catch { rejected = true; }
        assert(rejected && await storage.transcriptExists("keep.txt"), "failed write followed by working read");
        assert(!(await storage.listModelRegistryRecords()).some(x => x.id === "must-rollback"), "failed batch rolled back");
        // Missing source association exercises semantic cleanup without a worker/model download.
        rejected = false;
        try { await semantic.persistSemanticEmbeddings({ items: [{ ordinal: 0, text: "x" }], embeddings: [new Float32Array([1])] }); } catch { rejected = true; }
        assert(rejected, "semantic failure is terminal");
        await semantic.clearSemanticStore();
        await manager.clearAllSemanticEntries();
        await manager.clearAllCachedTranscripts();
        assert((await manager.readCachedTranscripts()).length === 0, "explicit test clearing");
    });
    await test("Semantic persistence and reuse without loading an ML model", async () => {
        const record = { recordingFilename: "fixture.m4a", transcript: "fixture sentence" };
        const item = { record, ordinal: 0, text: record.transcript, representationType: "chunk", chunkSize: 3, chunkOverlap: 1 };
        await semantic.persistSemanticEmbeddings({ items: [item], embeddings: [new Float32Array([0.25, 0.5])], sourceRecords: [record] });
        const stored = await semantic.getStoredSemanticEntries({ sourceRecords: [record], chunkSize: 3, chunkOverlap: 1 });
        assert(stored.length === 1 && new Float32Array(stored[0].embedding)[1] === 0.5, "binary lookup");
        const reused = await semantic.getSemanticEmbeddings({ items: [item], sourceRecords: [record] });
        assert(reused[0][0] === 0.25, "reuses stored embedding without worker");
        await manager.clearSemanticRepresentation({ modelId: "minilm", representationType: "chunk", chunkSize: 3, chunkOverlap: 1 });
        assert((await semantic.getSemanticStoreStats()).entryCount === 0, "representation clearing");
    });
    await test("Settings runtime stays visible when storage reporting fails", async () => {
        document.getElementById("fixture").innerHTML = '<div id="settingsStorageStatus"></div><div id="settingsStorage"></div><div id="settingsRuntime"></div><button id="settingsRefreshButton"></button>';
        const ui = initSettingsUI({ getStorageManager: async () => ({ getStorageReport: async () => { throw new Error("Injected report failure"); } }), getStorage: async () => storage });
        await ui.refresh();
        assert(document.getElementById("settingsRuntime").textContent.includes("Platform"), "runtime visible");
        assert(document.getElementById("settingsStorageStatus").textContent.includes("Injected report failure"), "visible error");
    });
    await test("Settings registry renders and reports a later database failure visibly", async () => {
        const report = await manager.getStorageReport();
        const originalFetch = window.fetch;
        // Availability checks are unrelated; avoid network/model downloads.
        window.fetch = async () => ({ ok: false, status: 503 });
        try {
            const ui = initSettingsUI({ getStorageManager: async () => ({ getStorageReport: async () => report }), getStorage: async () => storage });
            await ui.refresh();
            document.querySelector('[data-settings-action="toggle-whisper-models"]').click();
            await waitFor(() => document.querySelector('[name="model-registry-scope"]'));
            assert(document.getElementById("settingsModelRegistryContainer").textContent.includes("This device · WebGPU"), "desktop filter visible");
            // All manager connections should have closed, so this upgrade can finish.
            const request = indexedDB.open(testDatabaseName, 6);
            (await requestResult(request)).close();
            document.querySelector('[name="model-registry-scope"][value="all"]').click();
            await waitFor(() => document.getElementById("settingsModelRegistryContainer").textContent.includes("Model Registry unavailable"));
        } finally {
            window.fetch = originalFetch;
        }
    });
    result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) {
    lines.push(`FAIL ${error.stack || error}`);
} finally {
    assert(testDatabaseName.startsWith("Memora-integration-test-"), "safe cleanup name");
    await requestResult(indexedDB.deleteDatabase(testDatabaseName));
    output.textContent = lines.join("\n"); document.body.dataset.result = result;
}
