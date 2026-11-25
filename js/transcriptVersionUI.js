import { getModelRank } from "./combine.js";

export function showTranscriptVersionChoices(container, record, alternatives, onChoose) {
    const edit = record.memoraEdit;
    if (!alternatives?.length && (!edit || edit.confirmed)) return;
    const note = document.createElement("p");
    note.className = "settings-note";
    const higher = alternatives?.find(version => getModelRank(version.whisperModel) > getModelRank(record.whisperModel));
    const competingEdits = alternatives?.some(version => version.memoraEdit?.confirmed);
    note.textContent = edit?.confirmed
        ? [
            "The edited transcript is the default.",
            higher && `A higher-model transcript is available (${higher.whisperModel}).`,
            competingEdits && "Another edited copy is available. Compare the edits before choosing."
        ].filter(Boolean).join(" ")
        : edit
            ? "This edit has an unverified save or a different filename from its intended target."
            : "Another copy carries an edit that has not been verified under its intended filename.";
    container.append(note);
    if (!alternatives?.length) return;

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Compare transcript versions";
    const selector = document.createElement("select");
    selector.setAttribute("aria-label", "Transcript version to view");
    const text = document.createElement("pre");
    text.className = "transcript-version-preview";
    const versions = [record, ...alternatives];
    versions.forEach((version, i) => {
        const label = version.memoraEdit?.confirmed ? " (edited)"
            : version.memoraEdit ? " (unverified edit)" : "";
        selector.add(new Option(`${version.filename}${label}`, String(i)));
    });
    function showVersion() {
        if (details.open) text.textContent = versions[Number(selector.value)].transcript;
    }
    details.addEventListener("toggle", showVersion);
    selector.addEventListener("change", showVersion);
    details.append(summary, selector, text);
    if (onChoose) {
        const use = document.createElement("button");
        use.type = "button";
        use.textContent = "Use this version in output";
        use.addEventListener("click", () => onChoose(versions[Number(selector.value)]));
        details.append(use);
    }
    container.append(details);
}
