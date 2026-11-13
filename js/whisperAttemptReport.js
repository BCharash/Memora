import { snapshotWhisperTestHistory, whisperAttemptTimeline } from "./whisperAttempts.js";
// Presentation copy only: preserve terminal outcomes and stored historical evidence.
export function presentWhisperAttempt(record, availableRecords = []) {
    const report = structuredClone(record);
    if (report.observation?.status === "failed" && !report.observation.error && !report.observation.failedPhase) {
        report.observation.status = "in-progress";
    }
    if (!report.recentSelfTests) report.recentSelfTests = snapshotWhisperTestHistory(availableRecords, report);
    const timeline = whisperAttemptTimeline(report), current = timeline[timeline.length - 1];
    const {recentSelfTests, ...technicalDetails} = report;
    delete technicalDetails.selfTestTimeline;
    delete technicalDetails.reportSummary;
    // Put the readable essentials before the larger technical evidence in JSON.
    return {
        reportSummary:{type:"self-test",testId:record.id,model:current.label,result:record.status,
            startedAt:current.startedAt,finishedAt:current.finishedAt,
            durationSeconds:Number.isFinite(current.durationMs) ? current.durationMs / 1000 : null,
            gapBeforeThisTestSeconds:Number.isFinite(current.gapBeforeMs) ? current.gapBeforeMs / 1000 : null,
            sequence:timeline.map(row=>row.label).join(" → "),previousTestCount:recentSelfTests.records.length,
            historySource:recentSelfTests.source,lastSavedStage:record.cleanupPhase || record.phase || null,
            cleanup:current.cleanup},
        selfTestTimeline:timeline, recentSelfTests, ...technicalDetails
    };
}

const timeLabel = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : "Unknown";
const durationLabel = value => Number.isFinite(value) && value >= 0 ? `${(value / 1000).toFixed(1)} s` : "Unknown";

// Readable context accompanies the identical exported JSON. No model/storage work.
export function renderWhisperAttemptContext(container, record, { records = [], saveObservation,
    runtimeDiagnostics = () => null, draft = "", getObservations = () => [] } = {}) {
    const report = presentWhisperAttempt(record, records), history = report.recentSelfTests;
    const timeline = document.createElement("details"); timeline.className = "whisper-test-timeline";
    const title = document.createElement("summary"); title.textContent = `Recent self-test history (${history.records.length} previous)`;
    const note = document.createElement("p"); note.className = "settings-note";
    note.textContent = history.source === "captured-at-start"
        ? "Saved before this test started. Up to 10 earlier tests, followed by this test. Gaps are measured from the preceding finish to the next start."
        : "Reconstructed from remaining saved history. Earlier cleared tests and unsaved stage timings cannot be recovered.";
    const scroll = document.createElement("div"); scroll.className = "whisper-test-timeline-scroll"; scroll.tabIndex = 0; scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", "Self-test sequence and timing");
    const table = document.createElement("table"), head = document.createElement("tr");
    for (const text of ["Test", "Started", "Finished", "Duration", "Gap before", "Result"]) { const cell=document.createElement("th");cell.textContent=text;cell.scope="col";head.append(cell); }
    const thead=document.createElement("thead");thead.append(head);table.append(thead);
    const tbody=document.createElement("tbody");
    for (const row of report.selfTestTimeline) {
        const tr=document.createElement("tr"); if(row.current)tr.className="whisper-test-timeline-current";
        for(const text of [`${row.label}${row.current ? " (this test)" : ""}`,timeLabel(row.startedAt),timeLabel(row.finishedAt),durationLabel(row.durationMs),row.overlapsPrevious ? "Overlapping / clock conflict" : durationLabel(row.gapBeforeMs),row.status]) {
            const td=document.createElement("td");td.textContent=text;tr.append(td);
        }
        tbody.append(tr);
    }
    table.append(tbody);scroll.append(table);
    const hint=document.createElement("p");hint.className="settings-note";hint.textContent="Scroll the table sideways to see all columns.";
    timeline.append(title,note,scroll,hint);
    const stageTitle=document.createElement("p");stageTitle.textContent="This test’s saved stage checkpoints";
    const stages=document.createElement("ul");
    for(const point of report.phaseTimeline || []) {const li=document.createElement("li");li.textContent=`${point.phase} · ${timeLabel(point.at)} · ${durationLabel(point.elapsedMs)} since start`;stages.append(li);}
    if(!stages.children.length){const li=document.createElement("li");li.textContent="Detailed stage timestamps were not saved for this older test. Existing duration fields remain in the technical report.";stages.append(li);}
    timeline.append(stageTitle,stages);container.append(timeline);
    const saved=document.createElement("section");saved.className="whisper-test-saved-observations";saved.setAttribute("aria-label","Saved self-test observations");
    function refreshSaved() {
        saved.replaceChildren();
        const observations=getObservations(); saved.hidden=!observations.length;
        if(!observations.length)return;
        const heading=document.createElement("h4");heading.textContent="Saved observations";saved.append(heading);
        for(const observation of observations) {
            const list=document.createElement("ul");
            for(const event of observation.events || []) {
                if(!["stability-note","note"].includes(event.action))continue;
                const item=document.createElement("li");item.textContent=`${timeLabel(event.at)} — ${event.explanation}`;list.append(item);
            }
            saved.append(list);

        }
    }
    refreshSaved();container.append(saved);
    if(!saveObservation || record.status === "running")return;
    const disclosure=document.createElement("details"), summary=document.createElement("summary");summary.textContent="Report a problem after this self-test";
    const information=document.createElement("p");information.className="settings-note";information.textContent="Saves this result, its timeline and available page/Settings diagnostics under Session stability observations. Test result and model eligibility are unchanged; cause remains unknown.";
    const input=document.createElement("textarea");input.rows=2;input.maxLength=2000;input.value=draft;input.dataset.selfTestObservation=record.id;input.setAttribute("aria-label","Problem after this self-test");
    const save=document.createElement("button");save.type="button";save.textContent="Save observation";
    const feedback=document.createElement("p");feedback.setAttribute("role","status");
    save.onclick=async()=>{save.disabled=true;try{await saveObservation(record.id,input.value,runtimeDiagnostics());refreshSaved();feedback.textContent="Saved. Your observation is shown above and in Session stability observations, with this test’s timeline. Result and eligibility unchanged.";input.value="";}catch(error){feedback.textContent=error.message||String(error);}finally{save.disabled=false;}};
    disclosure.append(summary,information,input,save,feedback);container.append(disclosure);
}
