import { getWhisperConfigurationDefinitions } from "./whisperConfigurations.js";
import { eligibilityKey } from "./whisperEligibility.js";
import { createWhisperEvidenceBridge, getWhisperEligibilityContext } from "./whisperEligibilityEvidence.js";
import { isIOS, runtimeIdentity } from "./runtime.js";
import { createWhisperExecutionJournal } from "./whisperExecutions.js";

// Shared view for Settings and completed-transcription diagnostics. Both fetch
// the same saved record; no parallel copy of execution evidence is maintained.
export function renderWhisperExecutionReport(container, id, { journal = createWhisperExecutionJournal(), bridge = createWhisperEvidenceBridge(), includeStability = true } = {}) {
    const technical = document.createElement("details");
    const title = document.createElement("summary"); title.textContent = "Technical execution report";
    const body = document.createElement("pre"); body.style.whiteSpace = "pre-wrap"; body.style.overflowWrap = "anywhere";
    technical.append(title, body);
    const feedback = document.createElement("span"); feedback.setAttribute("role", "status");
    const actions = document.createElement("div"); actions.className = "whisper-report-actions";
    function refresh() {
        const record = journal.list().find(item => item.id === id);
        if (!record) throw new Error("Execution record is no longer available; it may have been cleared or aged out of history.");
        const reviews = bridge.listProductionReviews().filter(row => row.id === record.eligibilityEvaluation?.incidentId || row.execution?.id === id)
            .map(({ execution, ...review }) => review);
        body.textContent = JSON.stringify(reviews.length ? { ...record, productionReviews: reviews } : record, null, 2);
        return record;
    }
    technical.id = `whisper-execution-report-${crypto.randomUUID()}`;
    const view = document.createElement("button"); view.type = "button";
    view.setAttribute("aria-controls", technical.id);
    const syncView = () => {
        view.textContent = technical.open ? "Hide report" : "View report";
        view.setAttribute("aria-expanded", String(technical.open));
    };
    const showReport = () => { try { refresh(); } catch (error) { body.textContent = error.message; } };
    view.onclick = () => {
        technical.open = !technical.open;
        if (technical.open) showReport();
        syncView();
    };
    technical.addEventListener("toggle", () => { if (technical.open) showReport(); syncView(); });
    syncView(); actions.append(view);
    for (const label of ["Copy report", "Download report"]) {
        const button = document.createElement("button"); button.type = "button";
        button.textContent = label === "Download report" && isIOS ? "Save report" : label;
        button.onclick = async () => {
            button.disabled = true;
            let url;
            try {
                const record = refresh();
                if (label === "Copy report") {
                    await navigator.clipboard.writeText(body.textContent); feedback.textContent = " Report copied.";
                } else {
                    const filename = `whisper-execution-${record.startedAt}-${record.id}.json`.replace(/[^a-zA-Z0-9._-]/g, "-");
                    if (isIOS) {
                        // Keep the app document in place. Blob-link downloads
                        // can replace the iOS page and lose its unsaved session.
                        const files = [new File([body.textContent], filename, { type: "application/json" })];
                        if (!navigator.share || (navigator.canShare && !navigator.canShare({ files }))) {
                            throw new Error("Report file sharing is unavailable here. Use Copy report instead.");
                        }
                        feedback.textContent = " Choose Save to Files in the share sheet.";
                        await navigator.share({ files });
                        feedback.textContent = " Report shared.";
                        return;
                    }
                    url = URL.createObjectURL(new Blob([body.textContent], { type: "application/json" }));
                    const link = document.createElement("a"); link.href = url;
                    link.download = filename;
                    document.body.append(link); try { link.click(); } finally { link.remove(); }
                    feedback.textContent = " Report download requested.";
                }
            } catch (error) {
                if (isIOS && label === "Download report" && error?.name === "AbortError") {
                    feedback.textContent = " Report sharing cancelled.";
                    return;
                }
                technical.open = true; feedback.textContent = ` ${error?.message || String(error)} Select and copy available report text manually.`;
            } finally {
                button.disabled = false;
                if (url) setTimeout(() => URL.revokeObjectURL(url), 30000);
            }
        };
        actions.append(button);
    }
    const reference = document.createElement("p"); reference.className = "settings-note"; reference.textContent = `Execution ID: ${id}`;
    const stability = document.createElement("details"), stabilityTitle = document.createElement("summary");
    stabilityTitle.textContent = "Report session instability after completion";
    const stabilityNote = document.createElement("p"); stabilityNote.textContent = "Optional observation only; does not change model eligibility. Cause remains unknown.";
    const stabilityInput = document.createElement("textarea"); stabilityInput.rows = 2; stabilityInput.maxLength = 2000; stabilityInput.setAttribute("aria-label", "Post-completion stability observation");
    stabilityInput.style.width = "100%"; stabilityInput.style.boxSizing = "border-box";
    const saveNote = document.createElement("button"); saveNote.type = "button"; saveNote.textContent = "Save stability observation";
    saveNote.onclick = async () => {
        saveNote.disabled = true;
        try { await bridge.addStabilityNote(id, stabilityInput.value); stabilityNote.textContent = "Observation saved in Settings reviews. Model eligibility is unchanged."; }
        catch (error) { stabilityNote.textContent = error.message; }
        finally { saveNote.disabled = false; }
    };
    stability.append(stabilityTitle, stabilityNote, stabilityInput, saveNote);
    container.append(reference, actions, feedback, technical);
    if (includeStability) container.append(stability);
}

export async function renderWhisperExecutionHistory(container, { journal = createWhisperExecutionJournal(), beforeClear = async () => createWhisperEvidenceBridge().sync() } = {}) {
    container.replaceChildren();
    try {
        const records = await journal.recover();
        if (!container.isConnected) return;
        const note = document.createElement("p");
        note.textContent = "Local to this browser. Keeps the latest 20 finished executions plus active work. No audio or transcript contents. Clearing history does not change eligibility.";
        container.append(note);
        if (!records.length) { const empty = document.createElement("p"); empty.textContent = "No saved transcription executions."; container.append(empty); return; }
        const clear = document.createElement("button"); clear.type = "button"; clear.textContent = "Clear transcription execution history";
        clear.onclick = async () => {
            clear.disabled = true;
            try { await beforeClear(); await journal.clearCompleted(); await renderWhisperExecutionHistory(container, { journal, beforeClear }); }
            catch (error) { note.textContent = `Could not clear history: ${error.message}`; clear.disabled = false; }
        };
        container.append(clear);
        for (const record of records) {
            const detail = document.createElement("details"); detail.className = "whisper-saved-report";
            const summary = document.createElement("summary");
            const outcome = record.status === "interrupted" ? "Interrupted—cause unknown" : record.status;
            summary.textContent = `${outcome} · ${record.configuration?.id || record.requestedModel} · ${new Date(record.startedAt).toLocaleString()}`;
            const description = document.createElement("p");
            description.textContent = `Last saved stage: ${record.phase}. Model execution: ${record.modelOutcome}. ${record.reason || record.failure?.error?.message || ""}`;
            detail.append(summary, description); renderWhisperExecutionReport(detail, record.id, { journal }); container.append(detail);
        }
    } catch (error) { container.textContent = `Transcription execution history unavailable: ${error.message}`; }
}

async function currentReviewContexts(rows) {
    const ids = new Set(rows.map(row => row.configurationId));
    const definitions = getWhisperConfigurationDefinitions().filter(definition => ids.has(definition.id) && definition.operatingSystems.includes(runtimeIdentity.operatingSystem));
    return new Set(await Promise.all(definitions.map(async definition => eligibilityKey(await getWhisperEligibilityContext(definition)))));
}
const noticeVersions = new WeakMap();
const reviewVersions = new WeakMap();

// Reviews are independent of clearable execution history; deferred choices and
// user explanations stay available after reload or history clearing.
export async function renderWhisperEligibilityReviews(container, { bridge = createWhisperEvidenceBridge() } = {}) {
    const version = Symbol(); reviewVersions.set(container, version);
    const drafts = new Map([...container.querySelectorAll("[data-production-review-id]")].map(item => [item.dataset.productionReviewId, { value: item.querySelector("textarea")?.value || "", open: item.open }]));
    container.replaceChildren();
    try {
        await bridge.sync();
        if (!container.isConnected || reviewVersions.get(container) !== version) return;
        const rows = bridge.listProductionReviews();
        const currentContexts = await currentReviewContexts(rows);
        if (!container.isConnected || reviewVersions.get(container) !== version) return;
        const note = document.createElement("p");
        note.textContent = "Unclear model-work incidents stay on hold until reviewed or retested. Confirmed runtime failures require a reference retest. Saved contexts are independent; older-context reviews do not qualify a changed configuration.";
        container.append(note);
        if (!rows.length) { const empty = document.createElement("p"); empty.textContent = "No production eligibility reviews or stability observations."; container.append(empty); }
        for (const kind of ["incident", "stability"]) {
            const group = document.createElement("details"), title = document.createElement("summary");
            const items = rows.filter(row => row.kind === kind);
            title.textContent = `${kind === "incident" ? "Model eligibility reviews" : "Session stability observations (no eligibility effect)"} · ${items.length}`;
            group.open = kind === "incident" && items.some(row => ["pending", "deferred", "retest-required"].includes(row.state));
            group.append(title); container.append(group);
            for (const row of items) {
                const item = document.createElement("details"), label = document.createElement("summary");
                item.dataset.productionReviewId = row.id; item.open = drafts.get(row.id)?.open || false;
                const isCurrent = row.kind !== "incident" || currentContexts.has(row.contextKey);
                const stateLabel = !isCurrent ? "Historical context—current choices unaffected" : { pending: "Awaiting review", deferred: "Decide later—hold remains", "retest-required": "Retest required", kept: "Previous eligibility preserved for this incident", "reference-passed": "Resolved by reference test", observation: "Observation only" }[row.state] || row.state;
                label.textContent = `${row.execution?.configuration?.label || row.configurationId} · ${stateLabel} · ${new Date(row.evidenceAt).toLocaleString()}`;
                const explanation = document.createElement("p"); explanation.textContent = `Original event: ${row.reason} Last saved stage: ${row.execution?.phase || "unknown"}. Model completion: ${row.execution?.modelOutcome || "unknown"}.`;
                const input = document.createElement("textarea"); input.maxLength = 2000; input.rows = 2; input.setAttribute("aria-label", "Additional information");
                input.value = drafts.get(row.id)?.value || "";
                input.placeholder = kind === "stability" ? "For example: phone sluggish afterward; reboot helped. Cause unknown." : "Add new information here. Explain an external cause to keep previous eligibility.";
                input.style.width = "100%"; input.style.boxSizing = "border-box";
                const feedback = document.createElement("p"); feedback.setAttribute("role", "status");
                const actions = document.createElement("div"); actions.className = "whisper-report-actions";
                const unresolved = isCurrent && ["pending", "deferred", "retest-required"].includes(row.state);
                const choices = row.kind === "incident" && unresolved && row.effect !== "blocked" && row.state !== "retest-required"
                    ? [["Require a retest", "retest"], ["Keep previous eligibility", "keep"], ["Decide later", "defer"], ["Add additional information", "note"]]
                    : [["Add additional information", "note"]];
                for (const [text, action] of choices) {
                    const button = document.createElement("button"); button.type = "button"; button.textContent = text;
                    button.disabled = action === "keep" && (row.previousQualification?.status !== "eligible" || !row.previousQualification?.lastSuccess);
                    button.onclick = async () => {
                        button.disabled = true;
                        try {
                            const submitted = input.value;
                            await bridge.decideProductionReview(row.id, action, submitted);
                            if (input.value === submitted) input.value = "";
                            window.dispatchEvent(new Event("memora-whisper-eligibility-changed"));
                            await renderWhisperEligibilityReviews(container, { bridge });
                        } catch (error) { feedback.textContent = error.message; button.disabled = false; }
                    };
                    actions.append(button);
                }
                if (row.kind === "incident" && unresolved) {
                    const test = document.createElement("button"); test.type = "button"; test.textContent = "Find reference test";
                    test.onclick = () => window.dispatchEvent(new CustomEvent("memora-whisper-review-retest", { detail: { configurationId: row.configurationId } }));
                    actions.append(test);
                }
                const saved = document.createElement("div"); saved.className = "settings-note"; saved.dataset.reviewSavedInformation = "";
                if (row.events.length) {
                    const heading = document.createElement("p"); heading.textContent = "Saved information (read-only)";
                    const history = document.createElement("ul");
                    const names = { note: "Additional information", keep: "Keep previous eligibility", defer: "Decide later", retest: "Require a retest", "reference-passed": "Reference test passed", "stability-note": "Stability observation" };
                    for (const event of row.events) {
                        const entry = document.createElement("li"); entry.textContent = `${new Date(event.at).toLocaleString()} · ${names[event.action] || event.action}${event.explanation ? ": " + event.explanation : ""}`; history.append(entry);
                    }
                    saved.append(heading, history);
                }
                const inputLabel = document.createElement("p"); inputLabel.textContent = "Additional information";
                item.append(label, explanation, saved, inputLabel, input, actions, feedback);
                const provenance = document.createElement("p"); provenance.textContent = "Report uses the preserved incident snapshot plus current decision history; it remains available after execution history is cleared.";
                item.append(provenance);
                renderWhisperExecutionReport(item, row.execution.id, { journal: { list: () => [row.execution] }, bridge, includeStability: false });
                group.append(item);
            }
        }
    } catch (error) { if (reviewVersions.get(container) === version) container.textContent = `Eligibility review data unavailable: ${error.message}`; }
}

export async function renderWhisperReviewNotice(container, { bridge = createWhisperEvidenceBridge() } = {}) {
    const version = Symbol(); noticeVersions.set(container, version);
    container.replaceChildren();
    try {
        const rows = bridge.listProductionReviews();
        const currentContexts = await currentReviewContexts(rows);
        if (noticeVersions.get(container) !== version || !container.isConnected) return;
        const pending = rows.filter(row => row.kind === "incident" && currentContexts.has(row.contextKey) && ["pending", "deferred", "retest-required"].includes(row.state));
        container.hidden = !pending.length;
        if (!pending.length) return;
        const text = document.createElement("span"); text.textContent = `${pending.length} saved model incident${pending.length === 1 ? " needs" : "s need"} review or a reference retest. `;
        const button = document.createElement("button"); button.type = "button"; button.textContent = "Review in Settings";
        button.onclick = () => window.dispatchEvent(new Event("memora-whisper-review-requested"));
        container.append(text, button);
    } catch (error) { if (noticeVersions.get(container) === version) { container.hidden = false; container.textContent = `Eligibility reviews unavailable: ${error.message}`; } }
}
