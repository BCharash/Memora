import { testDatabaseName, openMemoraDatabase, DATABASE_VERSION } from "./database-adapter.js";
import * as storage from "../js/storage.js";
import * as semantic from "../js/semantic.js";
import * as manager from "../js/storageManager.js";
import { getModelRegistry } from "../js/modelManager.js";
import { getWhisperConfigurationDefinitions } from "../js/whisperConfigurations.js";
import { getWhisperEligibilityContext } from "../js/whisperEligibilityEvidence.js";
import { eligibilityKey } from "../js/whisperEligibility.js";
import { initSettingsUI } from "../js/settings.js";

const cachedText=body=>`memo.wav\nRecording ID: 4cd30ed1-dad7-4f9b-876c-0ba7f9d53ed9\nArchive UUID: 9599e552-b194-4511-8865-b37a07413a38\nWhisper model: tiny\nOperation: transcribe\n--------------------------------------------------\n${body}`;
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
        const db = await openMemoraDatabase(); assert(db.version === DATABASE_VERSION, "upgraded"); db.close();
    });
    await test("Cached transcript save/list/read/clear and registry evidence", async () => {
        await storage.saveTranscriptRecord("new.txt", cachedText("new transcript"), {}, "tiny", "transcribe");
        assert((await manager.listCachedTranscripts()).length === 2, "list");
        assert((await manager.readCachedTranscripts()).find(x => x.filename === "keep.txt").transcript === "preserve", "preserved text");
        await storage.saveModelRegistryRecords([{ id: "test-evidence", validation: { status: "passed" } }]);
        assert((await storage.listModelRegistryRecords()).some(x => x.id === "test-evidence" && x.validation.status === "passed"), "evidence");
        await manager.clearCachedTranscript((await manager.listCachedTranscripts()).find(record=>record.filename==="new.txt").id);
        assert(!await storage.transcriptExists("new.txt"), "delete only target");
    });
    await test("Catalogue projection refresh preserves saved registry evidence", async () => {
        const record = (await getModelRegistry()).find(x => x.id === "tiny-webgpu-default");
        const saved = { ...record, validation: { status: "passed", seconds: 6.3, detail: "prior fixture evidence" }, updatedAt: "2026-11-09T00:00:00Z", customEvidence: { retained: true } };
        await storage.saveModelRegistryRecords([saved]);
        const refreshed = (await getModelRegistry()).find(x => x.id === saved.id);
        assert(JSON.stringify(refreshed) === JSON.stringify(saved), "saved evidence/fields retained");
        const persisted = (await storage.listModelRegistryRecords()).find(x => x.id === saved.id);
        assert(JSON.stringify(persisted) === JSON.stringify(saved), "persisted record not reset");
    });
    await test("Registry refresh synchronizes canonical fields while retaining historical metadata; readonly views do not refill deletions",async()=>{
        const before=await getModelRegistry(),baseline=before.find(record=>record.id==='tiny-webgpu-default');
        await storage.saveModelRegistryRecords([{...baseline,label:'Stale label',repository:'outdated/repository',validation:{status:'passed',detail:'historical only'},customEvidence:{keep:true}}]);
        const refreshed=(await getModelRegistry()).find(record=>record.id===baseline.id);
        assert(refreshed.repository===baseline.repository&&refreshed.label===baseline.label,'canonical fields not synchronized');assert(refreshed.validation.detail==='historical only'&&refreshed.customEvidence.keep,'historical metadata removed');
        const count=(await storage.listModelRegistryRecords()).length;await storage.deleteModelRegistryRecords([baseline.id]);await getModelRegistry({initialize:false});assert((await storage.listModelRegistryRecords()).length===count-1,'readonly view recreated deleted data');
        await getModelRegistry();assert((await storage.listModelRegistryRecords()).length===count,'explicit initialization did not rebuild baseline');
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
        const record = { recordingFilename: "fixture.m4a", transcript: "fixture sentence", audioSourceId: "historical-catalogue" };
        const item = { record, ordinal: 0, text: record.transcript, representationType: "chunk", chunkSize: 3, chunkOverlap: 1 };
        await semantic.persistSemanticEmbeddings({ items: [item], embeddings: [new Float32Array([0.25, 0.5])], sourceRecords: [record] });
        record.audioSourceId="rebuilt-catalogue";record.recordingIdentityMethod="memora-recording-prefix-v1";
        const stored = await semantic.getStoredSemanticEntries({ sourceRecords: [record], chunkSize: 3, chunkOverlap: 1 });
        assert(stored.length === 1 && new Float32Array(stored[0].embedding)[1] === 0.5, "binary lookup");
        assert(stored[0].record.recordingIdentityMethod==="memora-recording-prefix-v1", "current identity method survives cache lookup");
        const reused = await semantic.getSemanticEmbeddings({ items: [item], sourceRecords: [record] });
        assert(reused[0][0] === 0.25, "reuses stored embedding without worker");
        await manager.clearSemanticRepresentation({ modelId: "minilm", representationType: "chunk", chunkSize: 3, chunkOverlap: 1 });
        assert((await semantic.getSemanticStoreStats()).entryCount === 0, "representation clearing");
    });
    await test("Storage order, specific cache paths and selection deletion preserve unselected data",async()=>{
        const cacheName='memora-settings-selection-test',cache=await caches.open(cacheName);
        const urls=['https://huggingface.co/example/model-one/resolve/main/onnx/model.onnx','https://huggingface.co/example/model-two/resolve/main/tokenizer.json','https://huggingface.co/example/whisper-small/resolve/main/onnx/model.onnx'];
        for(const url of urls)await cache.put(url,new Response('fixture',{headers:{'content-length':'7'}}));
        const runtimeUrl='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.0-dev.20260327-722743c0e2/dist/ort-wasm-simd-threaded.wasm',miniUrl='https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx';
        await cache.put(runtimeUrl,new Response('runtime'));await cache.put(miniUrl,new Response('model'));
        const report=await manager.getStorageReport();const runtime=report.modelCache.models.find(item=>item.files.includes(runtimeUrl)),mini=report.modelCache.models.find(item=>item.files.includes(miniUrl));
        assert(runtime.label==='ONNX Runtime — shared inference files'&&mini.label==='MiniLM — semantic embedding model','runtime confused with embedding model');
        const originalFetch=window.fetch,originalConfirm=window.confirm;window.fetch=async()=>({ok:false,status:503});window.confirm=()=>true;
        try{
            document.getElementById('fixture').innerHTML='<div id="settingsStorageStatus"></div><div id="settingsStorage"></div><div id="settingsRuntime"></div><button id="settingsRefreshButton"></button>';
            const ui=initSettingsUI({getStorageManager:async()=>manager,getStorage:async()=>storage});await ui.refresh();
            const names=[...document.querySelectorAll('.settings-storage-category .settings-disclosure-title')].map(node=>node.textContent);
            assert(JSON.stringify(names)===JSON.stringify(['Semantic Index','Other Cached Models','DOM Diagnostics','Cached Transcripts','Audio Recording List Cache','Transcript Folder Metadata Cache','Model Registry Cache','Whisper Models']),'storage section order');
            assert(!document.querySelector('[data-settings-action^="clear-all-"]'),'old bulk deletion remains');
            const open=action=>document.querySelector(`[data-settings-action="${action}"]`).click();
            const button=(detail,label)=>[...detail.querySelectorAll('button')].find(node=>node.textContent===label);
            open('toggle-other-models');let detail=document.getElementById('settingsOtherModelsDetail');
            assert(detail.textContent.includes('example/model-one')&&detail.textContent.includes(urls[0]),'specific model identity and filename');
            assert([...detail.querySelectorAll('.settings-item-name')].some(node=>node.textContent==='MiniLM — semantic embedding model'),'readable MiniLM label absent');
            assert(![...detail.querySelectorAll('.settings-item-name')].some(node=>node.textContent.startsWith('https://')),'URL duplicated as title');assert(!detail.querySelector('.settings-item button'),'individual model delete remains');
            await cache.delete(runtimeUrl);await cache.delete(miniUrl);await ui.refresh();open('toggle-other-models');detail=document.getElementById('settingsOtherModelsDetail');
            assert(button(detail,'Delete Selected').disabled,'empty selection enabled');detail.querySelector('.settings-selection-actions input').click();assert(detail.querySelector('.settings-selection-actions input').checked,'selection toggle');detail.querySelector('.settings-selection-actions input').click();
            detail.querySelector('.settings-item input').click();button(detail,'Delete Selected').click();await waitFor(()=>document.getElementById('settingsOtherModelsDetail').querySelectorAll('.settings-item').length===1);
            assert(!(await cache.match(urls[0]))&&await cache.match(urls[1]),'unselected model preserved');
            open('toggle-whisper-models');await waitFor(()=>document.querySelector('#settingsWhisperModelsDetail input[data-cache-name]'));
            detail=document.getElementById('settingsWhisperModelsDetail');assert(detail.querySelector('#settingsWhisperModelsDetail input[data-cache-name]').dataset.cacheName==='whisper-small','cached action shifted onto unavailable tiny');
            detail.querySelector('.settings-selection-actions input').click();button(detail,'Delete Selected').click();await waitFor(()=>!document.querySelector('#settingsWhisperModelsDetail input[data-cache-name]'));assert(!await cache.match(urls[2]),'selected Whisper cache survived');assert(await cache.match(urls[1]),'Whisper deletion removed other model');
            await storage.saveTranscriptRecord('selected.txt',cachedText('body'),{},'tiny','transcribe');await storage.saveTranscriptRecord('keep-selected.txt',cachedText('keep'),{},'tiny','transcribe');await ui.refresh();open('toggle-transcripts');await waitFor(()=>document.getElementById('settingsTranscriptsDetail').querySelectorAll('.settings-item input').length===2);
            detail=document.getElementById('settingsTranscriptsDetail');assert(button(detail,'Save Selected Transcripts').disabled,'save enabled without selection');[...detail.querySelectorAll('.settings-item')].find(row=>row.querySelector('.settings-item-name').textContent==='selected.txt').querySelector('input').click();assert(!button(detail,'Save Selected Transcripts').disabled,'selected save disabled');assert(detail.querySelector('.settings-selection-actions input').indeterminate,'partial selection missing');button(detail,'Delete Selected').click();await waitFor(()=>document.getElementById('settingsTranscriptsDetail').querySelectorAll('.settings-item').length===1);assert(await storage.transcriptExists('keep-selected.txt')&&!await storage.transcriptExists('selected.txt'),'transcript selection');
            await manager.clearAllCachedTranscripts();
            const db=await openMemoraDatabase();await new Promise((resolve,reject)=>{const tx=db.transaction('semanticEntries','readwrite');tx.objectStore('semanticEntries').put({id:'selection-fixture',modelId:'fixture',representationType:'document',embedding:[1]});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
            await ui.refresh();open('toggle-semantic');detail=document.getElementById('settingsSemanticDetail');detail.querySelector('.settings-selection-actions input').click();button(detail,'Delete Selected').click();await waitFor(()=>document.getElementById('settingsSemanticDetail').textContent.includes('No semantic index entries'));assert((await semantic.getSemanticStoreStats()).entryCount===0,'semantic selection');
        }finally{window.fetch=originalFetch;window.confirm=originalConfirm;await caches.delete(cacheName);}
    });
    await test("Registry initialization failure leaves storage inspection and deletion accessible",async()=>{
        await storage.clearModelRegistry();document.getElementById('fixture').innerHTML='<div id="settingsStorageStatus"></div><div id="settingsStorage"></div><div id="settingsRuntime"></div><button id="settingsRefreshButton"></button>';
        const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='modelRegistry')throw new DOMException('Injected registry quota failure','QuotaExceededError');return original.apply(this,args);};
        try{const ui=initSettingsUI({getStorageManager:async()=>manager,getStorage:async()=>storage});await ui.refresh();assert(document.getElementById('settingsStorageStatus').textContent.includes('Model Registry Cache update failed'),'registry error hidden');assert(document.querySelector('[data-settings-action="toggle-registry-cache"]'),'cache controls hidden by failed initialization');assert(document.querySelector('[data-settings-action="toggle-source-recovery"]'),'saved-list controls hidden by failed initialization');}
        finally{IDBObjectStore.prototype.put=original;}
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
        const definition = getWhisperConfigurationDefinitions().find(item => item.id === "large-webgpu-fp16-q4");
        const context = await getWhisperEligibilityContext(definition);
        const key = eligibilityKey(context);
        const previous = localStorage.getItem(key);
        localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, context, status: "eligible", reason: "Synthetic qualification fixture." }));
        // Availability checks are unrelated; avoid network/model downloads.
        window.fetch = async () => ({ ok: false, status: 503 });
        try {
            const ui = initSettingsUI({ getStorageManager: async () => ({ getStorageReport: async () => report }), getStorage: async () => storage });
            await ui.refresh();
            document.querySelector('[data-settings-action="toggle-whisper-models"]').click();
            await waitFor(() => document.querySelector('[name="model-registry-scope"]'));
            assert(document.getElementById("settingsModelRegistryContainer").textContent.includes("This device · WebGPU"), "desktop filter visible");
            const registry = document.getElementById("settingsModelRegistryContainer");
            assert(registry.textContent.includes("Test-qualified: Synthetic qualification fixture. Available for transcription."), "current qualification displayed");
            assert(registry.querySelector("details")?.textContent.includes("does not determine current transcription eligibility"), "historical validation separated");
            assert(!registry.querySelector("details").open, "history collapsed");
            document.querySelector('[name="model-registry-scope"][value="all"]').click();
            await waitFor(() => registry.textContent.includes("Not evaluated on this device."));
            assert(registry.textContent.includes("Test-qualified: Synthetic qualification fixture."), "all-devices keeps exact current qualification");
            // All manager connections should have closed, so this upgrade can finish.
            const request = indexedDB.open(testDatabaseName, DATABASE_VERSION + 1);
            (await requestResult(request)).close();
            document.querySelector('[name="model-registry-scope"][value="current"]').click();
            await waitFor(() => document.getElementById("settingsModelRegistryContainer").textContent.includes("Model Registry unavailable"));
        } finally {
            window.fetch = originalFetch;
            if (previous === null) localStorage.removeItem(key); else localStorage.setItem(key, previous);
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

if (location.search.includes("report=1")) await fetch("/_identity-test-result", { method:"POST", body:JSON.stringify({ passed:lines.filter(line=>line.startsWith("PASS ")).length, failed:result === "passed" ? [] : ["suite failed"], output:output.textContent }) });
