import { getModelRank } from "./combine.js";
import { readTranscriptPreferences, removeTranscriptPreference, setTranscriptPreference, transcriptPreferenceKey } from "./transcriptPreferences.js";

export function showTranscriptVersionChoices(container, record, alternatives, onUseOnce, preferences = readTranscriptPreferences()) {
    const edit = record.memoraEdit;
    const key = transcriptPreferenceKey(record);
    const preference = preferences.get(key);
    if (!alternatives?.length && !preference && (!edit || edit.confirmed)) return;
    const note = document.createElement("p");
    note.className = "settings-note";
    const higher = alternatives?.find(version => getModelRank(version.whisperModel) > getModelRank(record.whisperModel));
    const competingEdits = alternatives?.some(version => version.memoraEdit?.confirmed);
    note.textContent = preference
        ? preference.filename === record.filename
            ? "Using your chosen default."
            : `Your chosen default “${preference.filename}” is unavailable in this selection. Using the automatic choice.`
        : edit?.confirmed
        ? [
            "The edited transcript is the default.",
            higher && `A higher-model transcript is available (${higher.whisperModel}).`,
            competingEdits && "Another edited copy is available. Compare the edits before choosing."
        ].filter(Boolean).join(" ")
        : edit
            ? "This edit has an unverified save or a different filename from its intended target."
            : alternatives?.some(version => version.memoraEdit && !version.memoraEdit.confirmed)
                ? "Another copy carries an edit that has not been verified under its intended filename."
                : "Other versions of this recording are available.";
    container.append(note);

    const feedback = document.createElement("p");
    feedback.className = "settings-note";
    feedback.setAttribute("role", "status");
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "Reset to automatic";
    reset.addEventListener("click", () => {
        try { removeTranscriptPreference(key); }
        catch (error) { feedback.textContent = error.message; }
    });
    if (!alternatives?.length) {
        if (preference) container.append(reset, feedback);
        return;
    }

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Compare transcript versions";
    const selector = document.createElement("select");
    selector.setAttribute("aria-label", "Transcript version to view");
    const text = document.createElement("pre");
    text.className = "transcript-version-preview";
    const versions = [record, ...(alternatives || [])];
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
    const actions = document.createElement("div");
    actions.className = "action-row";
    if (onUseOnce && versions.length > 1) {
        const use = document.createElement("button");
        use.type = "button";
        use.textContent = "Use once";
        use.addEventListener("click", () => onUseOnce(versions[Number(selector.value)]));
        actions.append(use);
    }
    if (key && versions.length > 1) {
        const makeDefault = document.createElement("button");
        makeDefault.type = "button";
        makeDefault.textContent = "Make default";
        makeDefault.addEventListener("click", () => {
            try { setTranscriptPreference(versions[Number(selector.value)]); }
            catch (error) { feedback.textContent = error.message; }
        });
        actions.append(makeDefault);
    }
    if (preference) actions.append(reset);
    details.append(actions, feedback);
    container.append(details);
}
