import { createWhisperEvidenceBridge, getWhisperEligibilityContext } from "../js/whisperEligibilityEvidence.js";
import { createWhisperEligibilityStore } from "../js/whisperEligibility.js";
import { createWhisperExecutionJournal } from "../js/whisperExecutions.js";
import { getWhisperConfigurationDefinitions } from "../js/whisperConfigurations.js";
import { createWhisperWorkerErrorMessage, whisperErrorFromWorkerMessage, annotateWhisperFailure } from "../js/whisperFailures.js";
import { renderWhisperEligibilityReviews, renderWhisperReviewNotice, renderWhisperExecutionReport } from "../js/whisperExecutionReports.js";
const lines = [], assert = (v, m) => { if (!v) throw new Error(m); };
async function test(name, action) { await action(); lines.push(`PASS ${name}`); }
function memory() { const data = new Map(); return { get length() { return data.size; }, key: i => [...data.keys()][i], getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }; }
const definition = getWhisperConfigurationDefinitions()[0], context = await getWhisperEligibilityContext(definition);
let serial = 0;
const fixtureStart = Date.now();
const date = second => new Date(fixtureStart + second * 1000).toISOString();
function pass(id, second, mode = "manual") { return { id, startedAt: date(second), status: "passed", phase: "validation", executionMode: mode, configuration: { id: context.configurationId }, eligibilityContext: context,
    result: { results: [{ status: "passed", transcriptionStatus: "passed", accuracyStatus: "passed", validation: { status: "passed" }, wer: 0 }] } }; }
async function fixture(qualified = true) {
    const storage = memory(), attempts = qualified ? [pass(`pass-${++serial}`, 1)] : [], bridge = createWhisperEvidenceBridge({ storage, journal: { recover: async () => attempts } });
    let clock = 2;
    const journal = createWhisperExecutionJournal({ storage, uuid: () => `execution-review-${++serial}`, now: () => date(clock) });
    await bridge.sync();
    const metadata = () => ({ requestedModel: definition.family, configuration: definition, configurationFingerprint: context.configurationFingerprint,
        browser: context.browser, environment: context.environment, eligibilityContext: context,
        previousQualification: { status: bridge.get(context).status, lastSuccess: bridge.get(context).lastSuccess || null } });
    return { storage, attempts, bridge, journal, metadata, clock: value => { clock = value; } };
}
function workerError(kind = "unknown") {
    const error = kind === "runtime" ? new WebAssembly.RuntimeError("injected trap") : kind === "network" ? new DOMException("network", "NetworkError") : new Error("unknown worker issue");
    return whisperErrorFromWorkerMessage(createWhisperWorkerErrorMessage(error, { stage: "inference", configurationId: definition.id, boundary: "pipeline-call" }), { stage: "inference", source: "worker-reply", configurationId: definition.id });
}
async function failed(f, kind) {
    let error;
    try { await f.journal.run(f.metadata(), async execution => { execution.checkpoint("inference"); throw workerError(kind); }); } catch (failure) { error = failure; }
    return error.executionId;
}
try {
    await test("Confirmed runtime failure mandates retest, cannot be kept, and reference pass restores", async () => {
        const f = await fixture(); const id = await failed(f, "runtime"); await f.bridge.sync();
        assert(f.bridge.get(context).status === "blocked", "runtime withheld immediately");
        let refused = false; try { await f.bridge.decideProductionReview(id, "keep", "I think it is okay"); } catch { refused = true; }
        assert(refused && f.bridge.get(context).status === "blocked", "no user override of confirmed runtime");
        f.attempts.push(pass(`automatic-${++serial}`, 3, "automatic")); await f.bridge.sync();
        assert(f.bridge.get(context).status === "blocked", "automatic success cannot borrow manual recovery");
        f.attempts.push(pass(`manual-${++serial}`, 4)); await f.bridge.sync();
        assert(f.bridge.get(context).status === "eligible" && f.bridge.listProductionReviews()[0].state === "reference-passed", "manual reference resolves retained incident");
    });
    await test("Unclear failure supports durable deferral and explained restoration of previous qualification", async () => {
        const f = await fixture(), id = await failed(f, "unknown"); await f.bridge.sync();
        assert(f.bridge.get(context).status === "suspended", "unknown held for review");
        await f.bridge.decideProductionReview(id, "defer", "Need to check what happened.");
        const reloaded = createWhisperEvidenceBridge({ storage: f.storage, journal: { recover: async () => f.attempts } }); await reloaded.sync();
        assert(reloaded.get(context).status === "suspended" && reloaded.listProductionReviews()[0].state === "deferred", "defer survives bridge reconstruction");
        let missing = false; try { await reloaded.decideProductionReview(id, "keep", " "); } catch { missing = true; } assert(missing, "explanation required");
        await reloaded.decideProductionReview(id, "keep", "I deliberately refreshed the page.");
        assert(reloaded.get(context).status === "eligible", "previous qualification restored");
        assert(reloaded.listProductionReviews()[0].events.filter(event => event.actor === "user").length === 2, "all actual choices retained");
    });
    await test("Reviews cannot qualify an unverified model or override newer failures", async () => {
        const f = await fixture(false), id = await failed(f, "unknown"); await f.bridge.sync();
        let refused = false; try { await f.bridge.decideProductionReview(id, "keep", "I refreshed"); } catch { refused = true; } assert(refused, "no invented qualification");
        const g = await fixture(), earlier = await failed(g, "unknown"); await g.bridge.sync();
        g.clock(3); await failed(g, "runtime"); await g.bridge.sync();
        await g.bridge.decideProductionReview(earlier, "keep", "External cause for the first incident only.");
        assert(g.bridge.get(context).status === "blocked", "later mandatory hold survives older review");
        g.attempts.push({ ...pass(`selftest-failed-${++serial}`, 4), status: "failed", phase: "inference", result: { results: [{ status: "failed", failedPhase: "inference" }] } }); await g.bridge.sync();
        assert(g.bridge.get(context).status === "blocked", "self-test failure remains authoritative");
    });
    await test("A user requiring retest keeps the hold until a later reference pass", async () => {
        const f = await fixture(), id = await failed(f, "unknown"); await f.bridge.sync();
        await f.bridge.decideProductionReview(id, "retest", "I prefer verification.");
        let refused = false; try { await f.bridge.decideProductionReview(id, "keep", "changed my mind"); } catch { refused = true; }
        assert(refused && f.bridge.get(context).status === "suspended", "chosen retest remains required");
        f.attempts.push(pass(`retest-${++serial}`, 5)); await f.bridge.sync(); assert(f.bridge.get(context).status === "eligible", "reference restores");
    });
    await test("Network, abort, input, save and ordinary success do not change qualification", async () => {
        const f = await fixture();
        await failed(f, "network"); await f.bridge.sync(); assert(f.bridge.get(context).status === "eligible", "reported network exception neutral");
        try { await f.journal.run(f.metadata(), async execution => {
            execution.checkpoint("load");
            throw whisperErrorFromWorkerMessage(createWhisperWorkerErrorMessage(new TypeError("module import failed"), { stage: "load", configurationId: definition.id, boundary: "module-import" }), { stage: "load", source: "worker-reply", configurationId: definition.id });
        }); } catch {}
        await f.bridge.sync(); assert(f.bridge.get(context).status === "eligible", "runtime import does not reach model initialization");
        for (const stage of ["metadata", "decode", "eligibility", "save"]) {
            try { await f.journal.run(f.metadata(), async execution => {
                execution.checkpoint(stage === "eligibility" ? "load" : stage);
                if (stage === "save") { execution.checkpoint("model-complete"); execution.checkpoint("save"); }
                throw annotateWhisperFailure(new Error("fixture"), { stage });
            }); } catch {}
            await f.bridge.sync(); assert(f.bridge.get(context).status === "eligible", stage);
        }
        try { await f.journal.run(f.metadata(), async execution => { execution.checkpoint("inference"); throw annotateWhisperFailure(new DOMException("abort", "AbortError"), { stage: "inference" }); }); } catch {}
        await f.bridge.sync(); assert(f.bridge.get(context).status === "eligible", "abort neutral");
        const g = await fixture(false); await g.journal.run(g.metadata(), async execution => { execution.checkpoint("model-complete"); return {}; }); await g.bridge.sync();
        assert(g.bridge.get(context).status === "unverified", "normal success cannot qualify");
    });
    await test("Recovered active-model interruption creates review, post-completion loss only stability observation", async () => {
        for (const completed of [false, true]) {
            const f = await fixture(); const id = `lost-${++serial}`;
            f.storage.setItem("memora.whisper-execution.v1." + id, JSON.stringify({ schemaVersion: 1, origin: "production", id, ...f.metadata(), startedAt: date(2), updatedAt: date(2), phase: completed ? "save" : "inference", status: "running", modelOutcome: completed ? "completed" : "running" }));
            await f.bridge.sync();
            assert(f.bridge.get(context).status === (completed ? "eligible" : "suspended"), "model completion boundary controls hold");
            assert(f.bridge.listProductionReviews()[0].kind === (completed ? "stability" : "incident"), "separate observation type");
        }
    });
    await test("Delayed recovery cannot undo a newer reference pass or borrow changed context", async () => {
        const f = await fixture(); f.attempts.push(pass(`newer-reference-${++serial}`, 4)); await f.bridge.sync();
        f.attempts.length = 0; // Reference provenance must survive self-test history clearing.
        const id = `old-loss-${++serial}`;
        f.storage.setItem("memora.whisper-execution.v1." + id, JSON.stringify({ schemaVersion: 1, origin: "production", id, ...f.metadata(), startedAt: date(2), updatedAt: date(2), phase: "inference", status: "running", modelOutcome: "running" }));
        await f.bridge.sync(); assert(f.bridge.get(context).status === "eligible", "old checkpoint time, not recovery time, orders event");
        const changed = { ...context, browser: context.browser + " changed" }; assert(f.bridge.get(changed).status === "needs-validation", "review cannot qualify changed browser context");
    });
    await test("Live owners and unprocessed incidents survive recovery, clear and retention", async () => {
        const f = await fixture();
        await f.journal.run(f.metadata(), async execution => {
            execution.checkpoint("inference"); await f.bridge.sync(); await f.journal.clearCompleted();
            assert(f.journal.list().some(record => record.id === execution.id && record.status === "running"), "live owner preserved");
            execution.checkpoint("model-complete"); return {};
        });
        const id = await failed(f, "unknown"); await f.journal.clearCompleted(); assert(f.journal.list().some(row => row.id === id), "unprocessed evidence not cleared");
        await f.bridge.sync(); await f.bridge.decideProductionReview(id, "defer", "Later."); await f.journal.clearCompleted();
        assert(!f.journal.list().length && f.bridge.listProductionReviews().some(row => row.id === id && row.events.length), "review snapshots survive execution clearing");
    });
    await test("Required storage failures stop before model work; decision failure leaves evidence retryable", async () => {
        const f = await fixture(), write = f.storage.setItem; let worked = false;
        f.storage.setItem = () => { throw new Error("quota"); };
        let refused = false; try { await f.journal.run(f.metadata(), async () => { worked = true; }); } catch (error) { refused = error.name === "ExecutionPersistenceError"; }
        assert(refused && !worked, "required initial checkpoint fails closed");
        f.storage.setItem = write; const id = await failed(f, "unknown");
        f.storage.setItem = (key, value) => { if (key.startsWith("memora.whisper-production-evidence.v1.incident.")) throw new Error("review quota"); write(key, value); };
        let failedDecision = false; try { await f.bridge.sync(); } catch { failedDecision = true; }
        assert(failedDecision && f.journal.list().find(row => row.id === id).eligibilityEvaluation.status === "pending", "not acknowledged until durable review saved");
        await f.journal.clearCompleted(); assert(f.journal.list().some(row => row.id === id), "failed decision cannot be concealed by clear");
        f.storage.setItem = write; await f.bridge.sync(); assert(f.bridge.get(context).status === "suspended", "retry persists decision");
    });
    await test("Review UI, persistent route and user stability notes use the same durable evidence", async () => {
        const f = await fixture(), id = await failed(f, "unknown"); await f.bridge.sync();
        const container = document.createElement("div"), banner = document.createElement("div"); document.getElementById("fixture").append(container, banner);
        await renderWhisperEligibilityReviews(container, { bridge: f.bridge }); await renderWhisperReviewNotice(banner, { bridge: f.bridge });
        assert(container.querySelector("h4")?.textContent.startsWith("Model eligibility reviews") && ![...container.querySelectorAll("summary")].some(node => node.textContent.startsWith("Model eligibility reviews")), "review group displayed without nested disclosure");
        assert(banner.textContent.includes("Review in Settings") && container.textContent.includes("Decide later"), "persistent review route and choices");
        container.querySelector("textarea").value = "I need to check the external interruption.";
        [...container.querySelectorAll("button")].find(button => button.textContent === "Decide later").click();
        for (let i = 0; i < 100 && f.bridge.listProductionReviews()[0].state !== "deferred"; i++) await new Promise(resolve => setTimeout(resolve, 5));
        assert(f.bridge.listProductionReviews()[0].state === "deferred", "UI writes deferral");
        await f.journal.clearCompleted(); await renderWhisperEligibilityReviews(container, { bridge: f.bridge });
        const saved = container.querySelector("[data-review-saved-information]"), freshInput = container.querySelector("textarea");
        assert(saved.classList.contains("settings-note") && saved.textContent.includes("I need to check the external interruption."), "saved observation shown in muted read-only area");
        assert(saved.compareDocumentPosition(freshInput) & Node.DOCUMENT_POSITION_FOLLOWING, "saved information above new input");
        assert(freshInput.value === "" && container.textContent.includes("Add additional information"), "successful save clears submitted draft");
        freshInput.value = "A follow-up observation.";
        [...container.querySelectorAll("button")].find(button => button.textContent === "Add additional information").click();
        for (let i = 0; i < 100 && !f.bridge.listProductionReviews()[0].events.some(event => event.explanation === "A follow-up observation."); i++) await new Promise(resolve => setTimeout(resolve, 5));
        await renderWhisperEligibilityReviews(container, { bridge: f.bridge });
        assert(f.bridge.listProductionReviews()[0].events.length === 2 && container.querySelector("[data-review-saved-information]").textContent.includes("A follow-up observation."), "follow-up appended without editing original");
        [...container.querySelectorAll("button")].find(button => button.textContent === "View report").click();
        const exported = JSON.parse(container.querySelector("pre").textContent);
        assert(exported.id === id && exported.productionReviews[0].events.some(event => event.action === "defer"), "durable review report includes user input after execution clearing");
        const g = await fixture();
        const prior = await g.journal.run({ ...g.metadata(), pageId: "stability-page" }, async execution => { execution.checkpoint("model-complete"); return {}; });
        g.clock(3);
        const result = await g.journal.run({ ...g.metadata(), pageId: "stability-page" }, async execution => { execution.checkpoint("model-complete"); return {}; }); await g.bridge.sync();
        const recentTest = { ...pass("recent-stability-test", 1), schemaVersion: 1, pageId: "stability-page" };
        g.storage.setItem("memora.whisper-attempt.v1." + recentTest.id, JSON.stringify(recentTest));
        await g.bridge.addStabilityNote(result.executionId, "Phone sluggish after success; reboot helped. Cause unknown.");
        assert(g.bridge.get(context).status === "eligible" && g.bridge.listProductionReviews()[0].kind === "stability", "user stability note never creates eligibility hold");
        assert(g.bridge.listProductionReviews()[0].recentExecutions[0].id === prior.executionId && g.bridge.listProductionReviews()[0].recentSelfTests.records[0].id === recentTest.id, "available same-session production/test sequence retained without cause attribution");
        await g.journal.clearCompleted(); assert(g.bridge.listProductionReviews()[0].events[0].explanation.includes("sluggish"), "observation independent of clearable history");
    });
    await test("Old browser/context reviews remain auditable without a current Transcribe hold notice", async () => {
        const f = await fixture(), id = await failed(f, "unknown"); await f.bridge.sync();
        const row = structuredClone(f.bridge.listProductionReviews()[0]); row.contextKey += " historical";
        const bridge = { sync: async () => {}, listProductionReviews: () => [row] };
        const container = document.createElement("div"), banner = document.createElement("div"); document.getElementById("fixture").append(container, banner);
        await renderWhisperEligibilityReviews(container, { bridge }); await renderWhisperReviewNotice(banner, { bridge });
        assert(banner.hidden && container.textContent.includes("Historical context"), "stale context does not nag current model choices");
        assert(![...container.querySelectorAll("button")].some(button => button.textContent === "Keep previous eligibility"), "historical context cannot be used to grant current eligibility");
    });
    document.body.dataset.result = "passed"; lines.push("ALL TESTS PASSED");
} catch (error) { document.body.dataset.result = "failed"; lines.push(`FAIL ${error.stack}`); }
finally { document.getElementById("results").textContent = lines.join("\n"); }
