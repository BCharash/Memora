import { createWhisperExecutionJournal } from "../js/whisperExecutions.js";
import { renderWhisperExecutionHistory, renderWhisperExecutionReport } from "../js/whisperExecutionReports.js";
const lines = [], assert = (v, m) => { if (!v) throw new Error(m); };
const test = async (name, action) => { await action(); lines.push(`PASS ${name}`); };
function memory() { const data = new Map(); return { get length() { return data.size; }, key: i => [...data.keys()][i], getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }; }
const metadata = { build: "fixture", requestedModel: "tiny", configuration: { id: "tiny-fixture" }, recipe: { task: "transcribe" } };
let serial = 0;
const factory = (storage, options = {}) => createWhisperExecutionJournal({ storage, locks: navigator.locks, uuid: () => `execution-fixture-${++serial}`, now: () => new Date(1700000000000 + serial * 1000).toISOString(), ...options });
const fixture = document.getElementById("fixture");
try {
    await test("Success stores stages and diagnostics but excludes audio/transcript results", async () => {
        const storage = memory(), journal = factory(storage);
        const result = await journal.run({ ...metadata, transcript: "private metadata" }, async execution => {
            execution.checkpoint("load"); execution.checkpoint("inference");
            execution.checkpoint("model-complete", { timings: { inferenceMs: 5 }, diagnostics: { actualBackend: "unknown" } });
            return { transcript: "private output", audio: new Float32Array([1]) };
        });
        const record = journal.list()[0], text = JSON.stringify(record);
        assert(record.origin === "production" && record.status === "completed" && record.modelOutcome === "completed", "distinct production outcome");
        assert(record.timings.inferenceMs === 5 && record.diagnostics.actualBackend === "unknown", "observations kept");
        assert(record.id === result.executionId && !text.includes("private") && !text.includes('"audio"'), "no raw returned contents stored");
    });
    await test("Inference failure and later save failure remain distinct", async () => {
        const journal = factory(memory());
        for (const stage of ["inference", "save"]) {
            const original = new Error(`injected ${stage}`);
            let observed;
            try { await journal.run(metadata, async execution => {
                execution.checkpoint("inference");
                if (stage === "save") { execution.checkpoint("model-complete"); execution.checkpoint("save"); }
                throw original;
            }); } catch (error) { observed = error; }
            const record = journal.list().find(item => item.id === observed.executionId);
            assert(observed === original && record.status === "failed", "original error preserved");
            assert(record.modelOutcome === (stage === "save" ? "completed" : "not-confirmed") && record.phase === stage, "model/postprocessing separated");
        }
    });
    await test("Recovery and clear respect another live owner and preserve unrelated evidence", async () => {
        const storage = memory(), journal = factory(storage);
        storage.setItem("memora.whisper-eligibility.v1.fixture", "keep");
        await journal.run(metadata, async execution => {
            execution.checkpoint("inference");
            assert((await factory(storage).recover())[0].status === "running", "active lock protects live tab");
            await factory(storage).clearCompleted(); assert(journal.list().length === 1, "live record not cleared");
            execution.checkpoint("model-complete"); return {};
        });
        await journal.clearCompleted();
        assert(!journal.list().length && storage.getItem("memora.whisper-eligibility.v1.fixture") === "keep", "clear only this history");
    });
    await test("Retention expires only 24-hour successes and preserves failures, active and pending evidence", async () => {
        const storage = memory(); let clock = Date.parse("2026-01-01T00:00:00Z");
        const journal = factory(storage, { now: () => new Date(clock).toISOString() });
        const success = await journal.run(metadata, async execution => { execution.checkpoint("model-complete"); return {}; });
        let failedId;
        try { await journal.run(metadata, async () => { throw new Error("keep failure"); }); } catch (error) { failedId = error.executionId; }
        const pending = await journal.run({ ...metadata, eligibilityContext: { fixture: true } }, async () => ({}));
        clock += 24 * 60 * 60 * 1000 - 1;
        await journal.prune(); assert(journal.list().some(row => row.id === success.executionId), "success retained until full day");
        clock++;
        await journal.run(metadata, async execution => {
            await journal.prune();
            assert(journal.list().some(row => row.id === execution.id), "active work retained");
            return {};
        });
        assert(!journal.list().some(row => row.id === success.executionId), "24-hour success expires");
        assert(journal.list().some(row => row.id === failedId) && journal.list().some(row => row.id === pending.executionId), "failure and unevaluated record retained");
        await journal.clearCompleted([]); assert(journal.list().some(row => row.id === failedId), "empty selection clears nothing");
        await journal.clearCompleted([failedId, pending.executionId]);
        assert(!journal.list().some(row => row.id === failedId) && journal.list().some(row => row.id === pending.executionId), "only selected deletable records removed");
        await journal.markEvaluated(pending.executionId, { status: "processed" }); await journal.prune();
        assert(!journal.list().some(row => row.id === pending.executionId), "expired pending success removed only after evaluation");
    });
    await test("Storage and lock failures warn without repeating or stopping model work", async () => {
        for (const locks of [navigator.locks, null]) {
            const storage = memory(); storage.setItem = () => { throw new Error("quota fixture"); };
            const journal = factory(storage, { locks }); let called = 0;
            const result = await journal.run(metadata, async execution => { called++; execution.checkpoint("load"); return {}; });
            assert(called === 1 && !!result.executionPersistenceError, "nonfatal persistence problem visible");
        }
        const storage = memory(), journal = factory(storage), write = storage.setItem;
        const result = await journal.run(metadata, async execution => { execution.checkpoint("inference"); storage.setItem = () => { throw new Error("late quota"); }; execution.checkpoint("model-complete"); return {}; });
        assert(result.executionPersistenceError, "final/stage write failure visible");
        storage.setItem = write;
        assert((await journal.recover())[0].status === "interrupted", "last durable stage recovered honestly");
    });
    await test("Actual page navigation recovers active inference and post-model interruption", async () => {
        const namespace = `memora-execution-navigation-test.${crypto.randomUUID()}.`;
        const frame = document.createElement("iframe"); fixture.append(frame);
        function scopedStorage(prefix) { return {
            get length() { return Object.keys(localStorage).filter(key => key.startsWith(prefix)).length; },
            key(i) { return Object.keys(localStorage).filter(key => key.startsWith(prefix))[i]?.slice(prefix.length); },
            getItem(key) { return localStorage.getItem(prefix + key); }, setItem(key, value) { localStorage.setItem(prefix + key, value); }, removeItem(key) { localStorage.removeItem(prefix + key); }
        }; }
        const setup = `import {createWhisperExecutionJournal} from ${JSON.stringify(new URL("../js/whisperExecutions.js", import.meta.url).href)};
            const storage = (${scopedStorage.toString()})(${JSON.stringify(namespace)});
            const journal = createWhisperExecutionJournal({storage});`;
        const navigate = code => new Promise((resolve, reject) => {
            const timer = setTimeout(() => { window.removeEventListener("message", listen); reject(new Error("navigation timeout")); }, 5000);
            function listen(event) { if (event.source !== frame.contentWindow) return; clearTimeout(timer); window.removeEventListener("message", listen); resolve(event.data); }
            window.addEventListener("message", listen);
            frame.srcdoc = `<script type="module">${setup}\n${code}<\/script>`;
        });
        try {
            for (const phase of ["inference", "save"]) {
                const started = await navigate(`void journal.run({requestedModel:"tiny"},async execution=>{execution.checkpoint("inference");${phase === "save" ? 'execution.checkpoint("model-complete");execution.checkpoint("save");' : ''}parent.postMessage({started:true},"*");await new Promise(()=>{});});`);
                assert(started.started, "checkpoint before navigation");
                const recovered = await navigate('parent.postMessage({records:await journal.recover()},"*");');
                const record = recovered.records.find(item => item.phase === phase);
                assert(record?.status === "interrupted" && record.reason.includes("unknown"), "new page recovers unknown interruption");
                assert(record.modelOutcome === (phase === "save" ? "completed" : "unknown"), "save interruption cannot undo model completion");
            }
        } finally { frame.remove(); for (const key of Object.keys(localStorage)) if (key.startsWith(namespace)) localStorage.removeItem(key); }
    });
    await test("History and linked controls read the same record, copy/download and clear", async () => {
        const journal = factory(memory()); const result = await journal.run(metadata, async execution => { execution.checkpoint("model-complete"); return {}; });
        const history = document.createElement("div"), linked = document.createElement("div"); fixture.append(history, linked);
        await renderWhisperExecutionHistory(history, { journal }); renderWhisperExecutionReport(linked, result.executionId, { journal });
        assert(history.textContent.includes("tiny-fixture") && linked.textContent.includes(result.executionId), "both reference one record");
        const reportButton = label => [...linked.querySelectorAll("button")].find(button => button.textContent === label);
        const view = reportButton("View report"), technical = linked.querySelector("[data-technical-report]");
        assert(technical.hidden && view.getAttribute("aria-expanded") === "false", "view starts collapsed");
        view.click();
        assert(!technical.hidden && view.textContent === "Hide report" && JSON.parse(technical.querySelector("pre").textContent).id === result.executionId, "view expands same saved JSON");
        view.click(); assert(technical.hidden && view.textContent === "View report", "hide collapses report");
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
        const originalClick = HTMLAnchorElement.prototype.click; let copied, filename;
        try {
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { copied = JSON.parse(text); } } });
            reportButton("Copy report").click(); await new Promise(resolve => setTimeout(resolve, 0));
            assert(copied.id === result.executionId && copied.origin === "production", "copy exact saved record");
            HTMLAnchorElement.prototype.click = function() { filename = this.download; };
            reportButton("Download report").click(); assert(filename.startsWith("whisper-execution-") && filename.endsWith(".json"), "download naming");
            await journal.clearCompleted(); reportButton("Copy report").click(); await new Promise(resolve => setTimeout(resolve, 0));
            assert(linked.textContent.includes("no longer available"), "cleared record not exported from stale view");
            await renderWhisperExecutionHistory(history, { journal }); assert(history.textContent.includes("No saved"), "empty state after clear");
        } finally {
            HTMLAnchorElement.prototype.click = originalClick;
            if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard); else delete navigator.clipboard;
        }
    });
    await test("History selection starts empty, check-all tracks partial selection and clears only selected records", async () => {
        const journal = factory(memory());
        await journal.run(metadata, async () => ({})); await journal.run(metadata, async () => ({}));
        const container = document.createElement("div"); fixture.append(container);
        await renderWhisperExecutionHistory(container, { journal, beforeClear: async () => {} });
        const all = container.querySelector("[data-history-check-all]"), boxes = [...container.querySelectorAll("[data-history-record-id]")];
        const clear = [...container.querySelectorAll("button")].find(button => button.textContent === "Clear selected transcription history");
        assert(!all.checked && boxes.every(box => !box.checked) && clear.disabled, "unchecked by default");
        assert(!container.querySelector("summary")?.textContent.includes("Technical"), "no redundant technical disclosure");
        const row = container.querySelector("article"), stability = row.querySelector("details"), title = row.querySelector(".whisper-report-title");
        assert(stability.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING, "stability control above report actions");
        all.click(); assert(boxes.every(box => box.checked) && !clear.disabled, "check all selects rows");
        boxes[0].click(); assert(all.indeterminate && !all.checked && !clear.disabled, "partial state");
        const keep = boxes[0].dataset.historyRecordId, remove = boxes[1].dataset.historyRecordId;
        clear.click();
        for (let i = 0; i < 100 && journal.list().some(row => row.id === remove); i++) await new Promise(resolve => setTimeout(resolve, 5));
        assert(journal.list().some(row => row.id === keep) && !journal.list().some(row => row.id === remove), "unselected report survives");
    });
    await test("iOS saves execution reports through sharing without any download navigation", async () => {
        let source = await (await fetch("../js/whisperExecutionReports.js")).text();
        source = source.replace('import { isIOS, runtimeIdentity } from "./runtime.js";', 'import { runtimeIdentity } from "./runtime.js"; const isIOS = true;');
        source = source.replace(/from "\.\/([^"\n]+)"/g, (_, file) => `from ${JSON.stringify(new URL("../js/" + file, import.meta.url).href)}`);
        const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        const ios = await import(url);
        const journal = factory(memory()), result = await journal.run(metadata, async execution => { execution.checkpoint("model-complete"); return {}; });
        const container = document.createElement("div"), transcript = document.createElement("p"); transcript.textContent = "Unsaved transcript fixture";
        container.append(transcript); fixture.append(container); ios.renderWhisperExecutionReport(container, result.executionId, { journal });
        const save = [...container.querySelectorAll("button")].find(button => button.textContent === "Save report");
        const originalShare = Object.getOwnPropertyDescriptor(navigator, "share"), originalCanShare = Object.getOwnPropertyDescriptor(navigator, "canShare");
        const originalClick = HTMLAnchorElement.prototype.click, originalURL = URL.createObjectURL;
        let anchorCalls = 0, urlCalls = 0, shareCalls = 0, shared, finish;
        try {
            HTMLAnchorElement.prototype.click = function() { anchorCalls++; };
            URL.createObjectURL = function(...args) { urlCalls++; return originalURL.apply(this, args); };
            Object.defineProperty(navigator, "canShare", { configurable: true, value: payload => payload.files[0] instanceof File });
            Object.defineProperty(navigator, "share", { configurable: true, value: payload => { shareCalls++; shared = payload; return new Promise(resolve => { finish = resolve; }); } });
            save.click();
            assert(shareCalls === 1 && save.disabled, "share invoked from click and duplicate action disabled");
            assert(shared.files[0].type === "application/json" && shared.files[0].name.endsWith(".json"), "correct report file");
            assert(JSON.parse(await shared.files[0].text()).id === result.executionId, "same saved record shared");
            finish(); await new Promise(resolve => setTimeout(resolve, 0));
            assert(!save.disabled && container.textContent.includes("Report shared"), "success restores control");
            Object.defineProperty(navigator, "share", { configurable: true, value: async () => { throw new DOMException("cancelled", "AbortError"); } });
            save.click(); await new Promise(resolve => setTimeout(resolve, 0));
            assert(!save.disabled && container.textContent.includes("sharing cancelled"), "cancellation is neutral");
            Object.defineProperty(navigator, "share", { configurable: true, value: async () => { throw new Error("share failed"); } });
            save.click(); await new Promise(resolve => setTimeout(resolve, 0));
            assert(container.textContent.includes("share failed") && !container.querySelector("[data-technical-report]").hidden, "share error offers inline report");
            Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false });
            save.click(); await new Promise(resolve => setTimeout(resolve, 0));
            assert(container.textContent.includes("Use Copy report"), "unsupported payload offers copy");
            Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
            save.click(); await new Promise(resolve => setTimeout(resolve, 0));
            assert(container.textContent.includes("Use Copy report"), "missing sharing API offers copy");
            assert(anchorCalls === 0 && urlCalls === 0, "no blob link or download fallback on iOS");
            assert(transcript.isConnected && journal.list().some(item => item.id === result.executionId), "result and saved history retained");
        } finally {
            for (const [name, descriptor] of [["share", originalShare], ["canShare", originalCanShare]]) {
                if (descriptor) Object.defineProperty(navigator, name, descriptor); else delete navigator[name];
            }
            HTMLAnchorElement.prototype.click = originalClick; URL.createObjectURL = originalURL; URL.revokeObjectURL(url);
        }
    });
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) { document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack}`); }
finally { document.getElementById("results").textContent = lines.join("\n"); }
