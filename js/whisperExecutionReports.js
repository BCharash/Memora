import { createWhisperExecutionJournal } from "./whisperExecutions.js";

// Shared view for Settings and completed-transcription diagnostics. Both fetch
// the same saved record; no parallel copy of execution evidence is maintained.
export function renderWhisperExecutionReport(container, id, { journal = createWhisperExecutionJournal() } = {}) {
    const technical = document.createElement("details");
    const title = document.createElement("summary"); title.textContent = "Technical execution report";
    const body = document.createElement("pre"); body.style.whiteSpace = "pre-wrap"; body.style.overflowWrap = "anywhere";
    technical.append(title, body);
    const feedback = document.createElement("span"); feedback.setAttribute("role", "status");
    const actions = document.createElement("div"); actions.className = "whisper-report-actions";
    function refresh() {
        const record = journal.list().find(item => item.id === id);
        if (!record) throw new Error("Execution record is no longer available; it may have been cleared or aged out of history.");
        body.textContent = JSON.stringify(record, null, 2);
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
        const button = document.createElement("button"); button.type = "button"; button.textContent = label;
        button.onclick = async () => {
            let url;
            try {
                const record = refresh();
                if (label === "Copy report") {
                    await navigator.clipboard.writeText(body.textContent); feedback.textContent = " Report copied.";
                } else {
                    url = URL.createObjectURL(new Blob([body.textContent], { type: "application/json" }));
                    const link = document.createElement("a"); link.href = url;
                    link.download = `whisper-execution-${record.startedAt}-${record.id}.json`.replace(/[^a-zA-Z0-9._-]/g, "-");
                    document.body.append(link); try { link.click(); } finally { link.remove(); }
                    feedback.textContent = " Report download requested.";
                }
            } catch (error) {
                technical.open = true; feedback.textContent = ` ${error.message} Select and copy available report text manually.`;
            } finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 30000); }
        };
        actions.append(button);
    }
    const reference = document.createElement("p"); reference.className = "settings-note"; reference.textContent = `Execution ID: ${id}`;
    container.append(reference, actions, feedback, technical);
}

export async function renderWhisperExecutionHistory(container, { journal = createWhisperExecutionJournal() } = {}) {
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
            try { await journal.clearCompleted(); await renderWhisperExecutionHistory(container, { journal }); }
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
