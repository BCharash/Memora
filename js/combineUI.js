// --------------------------------------------------
// Combine UI
// --------------------------------------------------

const transcripts = document.getElementById("transcripts");
const transcriptCollapseBottom =
    document.getElementById("transcriptCollapseBottom");

let selectedTranscriptFiles = [];
let combineSortOrder = "date-desc";
let getCombineModule;
let onSelectionChanged;
let saveTranscriptEdits;
let appendAudioControl;
let getAudioSourceHandle;
export async function displayTranscriptFiles(files) {

    selectedTranscriptFiles = files;
    onSelectionChanged();

    transcripts.innerHTML = "";

    if (transcriptCollapseBottom) {
        transcriptCollapseBottom.innerHTML = "";
        transcriptCollapseBottom.hidden = files.length === 0;
    }

    if (files.length === 0) {

        transcripts.innerHTML = `
            <p class="empty-message">
                No transcript files found.
            </p>
        `;

        return;
    }

    const controls =
        document.createElement("div");

    controls.className =
        "recording-controls";

    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "10px";
    controls.style.marginBottom = "14px";

    const sortLabel =
        document.createElement("label");

    sortLabel.textContent =
        "Sort transcripts";

    sortLabel.htmlFor =
        "transcriptSort";

    sortLabel.style.color = "var(--muted)";
    sortLabel.style.fontSize = "14px";
    sortLabel.style.fontWeight = "500";

    const sortSelect =
        document.createElement("select");

    sortSelect.id =
        "transcriptSort";

    sortSelect.innerHTML = `
        <option value="date-desc">
            Date — newest first
        </option>
        <option value="date-asc">
            Date — oldest first
        </option>
        <option value="name-asc">
            Name — A → Z
        </option>
        <option value="name-desc">
            Name — Z → A
        </option>
    `;

    sortSelect.style.border = "1px solid var(--border)";
    sortSelect.style.borderRadius = "8px";
    sortSelect.style.padding = "8px 10px";
    sortSelect.style.background = "white";
    sortSelect.style.color = "var(--text)";
    sortSelect.style.font = "inherit";
    sortSelect.style.fontSize = "14px";

    controls.appendChild(sortLabel);
    controls.appendChild(sortSelect);

    const selectAllRow =
        document.createElement("div");

    selectAllRow.className =
        "recording-select-all";

    const selectAllCheckbox =
        document.createElement("input");

    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = true;
    selectAllCheckbox.id =
        "selectAllTranscripts";

    const selectAllLabel =
        document.createElement("label");

    selectAllLabel.htmlFor =
        "selectAllTranscripts";

    selectAllLabel.textContent =
        "Select all";

    selectAllRow.appendChild(
        selectAllCheckbox
    );

    selectAllRow.appendChild(
        selectAllLabel
    );

    const collapseCheckboxTop =
        document.createElement("input");

    collapseCheckboxTop.type = "checkbox";
    collapseCheckboxTop.id =
        "collapseAllTranscriptsTop";

    const collapseLabelTop =
        document.createElement("label");

    collapseLabelTop.htmlFor =
        "collapseAllTranscriptsTop";
    collapseLabelTop.textContent =
        "Collapse all";

    const collapseControlTop =
        document.createElement("span");

    collapseControlTop.className =
        "selection-action";

    collapseControlTop.appendChild(
        collapseCheckboxTop
    );

    collapseControlTop.appendChild(
        collapseLabelTop
    );

    selectAllRow.appendChild(
        collapseControlTop
    );

    let transcriptListItems = null;
    let transcriptsCollapsed = false;

    // Preserve each file's selection across list rebuilds caused by sorting.
    // The first render defaults to selecting every file.
    let hasRenderedTranscriptList = false;
    let selectedFilenames = new Set();

    const collapseCheckboxBottom =
        document.createElement("input");

    collapseCheckboxBottom.type = "checkbox";
    collapseCheckboxBottom.id =
        "collapseAllTranscriptsBottom";

    const collapseLabelBottom =
        document.createElement("label");

    collapseLabelBottom.htmlFor =
        "collapseAllTranscriptsBottom";
    collapseLabelBottom.textContent =
        "Collapse all";

    const collapseControlBottom =
        document.createElement("div");

    collapseControlBottom.className =
        "selection-action selection-action-bottom";

    collapseControlBottom.appendChild(
        collapseCheckboxBottom
    );

    collapseControlBottom.appendChild(
        collapseLabelBottom
    );

    if (transcriptCollapseBottom) {
        const lowerSeparator =
            document.createElement("div");

        lowerSeparator.className =
            "selection-double-separator";

        transcriptCollapseBottom.appendChild(
            lowerSeparator
        );

        transcriptCollapseBottom.appendChild(
            collapseControlBottom
        );
    }

    function updateTranscriptCollapseUI() {

        const label =
            transcriptsCollapsed
                ? "Expand all"
                : "Collapse all";

        collapseLabelTop.textContent = label;
        collapseLabelBottom.textContent = label;

        collapseCheckboxTop.checked = false;
        collapseCheckboxBottom.checked = false;

        if (transcriptListItems) {
            transcriptListItems.hidden = transcriptsCollapsed;
        }
    }

    function toggleTranscriptCollapse() {
        transcriptsCollapsed = !transcriptsCollapsed;
        updateTranscriptCollapseUI();
    }

    function expandTranscriptsFromBottom() {
        const bottomTopBefore =
            transcriptCollapseBottom
                ? transcriptCollapseBottom.getBoundingClientRect().top
                : null;

        transcriptsCollapsed = false;
        updateTranscriptCollapseUI();

        if (bottomTopBefore !== null && transcriptCollapseBottom) {
            requestAnimationFrame(() => {
                const bottomTopAfter =
                    transcriptCollapseBottom.getBoundingClientRect().top;

                window.scrollBy(
                    0,
                    bottomTopAfter - bottomTopBefore
                );
            });
        }
    }

    collapseCheckboxTop.onchange = toggleTranscriptCollapse;

    collapseCheckboxBottom.onchange = () => {
        if (transcriptsCollapsed) {
            expandTranscriptsFromBottom();
        } else {
            toggleTranscriptCollapse();
        }
    };

    async function render(sortOrder) {

        combineSortOrder = sortOrder;

        const combineModule =
            await getCombineModule();

        // Use the actual Recording date stored inside each transcript
        // rather than the filename. This keeps the on-screen order
        // identical to the order used for the combined output.
        const records =
            await combineModule.readTranscriptFiles(
                selectedTranscriptFiles
            );

        const sorted =
            combineModule.sortTranscriptRecords(
                records,
                sortOrder
            );

        transcriptListItems =
            document.createElement("div");

        transcriptListItems.className =
            "recording-list-items";

        const checkboxes = [];

        // Capture the current selections before rebuilding the list.
        // On the initial render, selectedFilenames is intentionally empty
        // and every checkbox defaults to checked.
        if (hasRenderedTranscriptList) {
            selectedFilenames = new Set(
                Array.from(
                    transcripts.querySelectorAll(".recording-checkbox")
                )
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => checkbox.dataset.filename)
            );
        }

        for (const record of sorted) {

            const item =
                document.createElement("div");

            item.className =
                "recording-item";

            const checkbox =
                document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.checked = !hasRenderedTranscriptList ||
                selectedFilenames.has(record.filename);
            checkbox.className =
                "recording-checkbox";
            checkbox.dataset.filename =
                record.filename;

            checkboxes.push(
                checkbox
            );

            const content =
                document.createElement("div");

            content.className =
                "recording-content";

            const header =
                document.createElement("div");

            header.className =
                "combine-recording-header";

            const name =
                document.createElement("div");

            name.className =
                "recording-name";

            name.textContent =
                record.filename;

            const transcriptToggle =
                document.createElement("button");

            transcriptToggle.type = "button";
            transcriptToggle.className = "search-transcript-toggle";
            transcriptToggle.textContent = "Show transcript";
            transcriptToggle.title = "Show transcript";
            transcriptToggle.setAttribute("aria-label", "Show transcript");
            transcriptToggle.setAttribute("aria-expanded", "false");

            const transcriptContent =
                document.createElement("div");

            transcriptContent.className = "search-transcript-text";
            transcriptContent.hidden = true;

            const editToggle = document.createElement("button");
            editToggle.type = "button";
            editToggle.className = "search-transcript-toggle combine-edit-toggle";
            editToggle.textContent = "Edit";
            editToggle.title = "Edit transcript";
            editToggle.setAttribute("aria-label", `Edit ${record.filename}`);
            editToggle.hidden = true;

            const transcriptActions = document.createElement("div");
            transcriptActions.className = "combine-transcript-actions";
            // Keep Show/Hide in its established rightmost position;
            // place Edit immediately to its left when it is visible.
            transcriptActions.appendChild(editToggle);
            transcriptActions.appendChild(transcriptToggle);

            const editPanel = document.createElement("div");
            editPanel.className = "combine-transcript-editor";
            editPanel.hidden = true;

            const editor = document.createElement("textarea");
            editor.className = "combine-transcript-editor-input";
            editor.setAttribute("aria-label", `Edit transcript text for ${record.filename}`);
            editor.spellcheck = true;

            const editActions = document.createElement("div");
            editActions.className = "combine-transcript-editor-actions";

            const cancelEdit = document.createElement("button");
            cancelEdit.type = "button";
            cancelEdit.className = "combine-transcript-secondary-button";
            cancelEdit.textContent = "Cancel";

            const saveEdit = document.createElement("button");
            saveEdit.type = "button";
            saveEdit.textContent = "Save changes";

            editActions.appendChild(cancelEdit);
            editActions.appendChild(saveEdit);
            editPanel.appendChild(editor);
            editPanel.appendChild(editActions);

            // Keep audio outside the transcript text container so it remains
            // available while the transcript is being edited.
            const audioContainer = document.createElement("div");
            audioContainer.hidden = true;
            let audioControlCreated = false;
            let transcriptRendered = false;

            function renderTranscriptText() {
                transcriptContent.innerHTML = "";
                const currentTranscript = String(record.transcript || "").trim();
                const paragraphs = currentTranscript
                    .replace(/\r\n?/g, "\n")
                    .split(/\n\s*\n+/)
                    .map(paragraph => paragraph.trim())
                    .filter(Boolean);

                if (paragraphs.length) {
                    for (const paragraph of paragraphs) {
                        const paragraphElement = document.createElement("p");
                        paragraphElement.className = "search-full-transcript-paragraph";
                        paragraphElement.textContent = paragraph;
                        transcriptContent.appendChild(paragraphElement);
                    }
                } else {
                    const fallback = document.createElement("p");
                    fallback.className = "empty-message";
                    fallback.textContent = currentTranscript
                        ? "This transcript is empty."
                        : "The transcript text is unavailable for this file.";
                    transcriptContent.appendChild(fallback);
                }
                transcriptRendered = true;
            }

            function ensureAudioControl() {
                if (audioControlCreated) return;
                if (appendAudioControl && (record.audioRelativePath || record.recordingFilename)) {
                    appendAudioControl(
                        audioContainer,
                        { record },
                        getAudioSourceHandle?.() || null
                    );
                }
                audioControlCreated = true;
            }

            function showTranscript() {
                if (!transcriptRendered) renderTranscriptText();
                ensureAudioControl();
                audioContainer.hidden = false;
                transcriptContent.hidden = false;
                editPanel.hidden = true;
                transcriptToggle.textContent = "Hide transcript";
                transcriptToggle.title = "Hide transcript";
                transcriptToggle.setAttribute("aria-label", "Hide transcript");
                transcriptToggle.setAttribute("aria-expanded", "true");
                editToggle.hidden = false;
            }

            header.appendChild(name);
            header.appendChild(transcriptActions);
            content.appendChild(header);
            content.appendChild(audioContainer);
            content.appendChild(transcriptContent);
            content.appendChild(editPanel);

            transcriptToggle.addEventListener("click", () => {
                if (transcriptContent.hidden) {
                    showTranscript();
                } else {
                    transcriptContent.hidden = true;
                    audioContainer.hidden = true;
                    transcriptToggle.textContent = "Show transcript";
                    transcriptToggle.title = "Show transcript";
                    transcriptToggle.setAttribute("aria-label", "Show transcript");
                    transcriptToggle.setAttribute("aria-expanded", "false");
                    editToggle.hidden = true;
                }
            });

            editToggle.addEventListener("click", () => {
                if (editPanel.hidden) {
                    ensureAudioControl();
                    audioContainer.hidden = false;
                    editor.value = String(record.transcript || "");
                    editPanel.hidden = false;
                    transcriptContent.hidden = true;
                    transcriptToggle.textContent = "Show transcript";
                    transcriptToggle.title = "Show transcript";
                    transcriptToggle.setAttribute("aria-label", "Show transcript");
                    transcriptToggle.setAttribute("aria-expanded", "false");
                    editToggle.hidden = true;
                    editToggle.textContent = "Edit";
                    editor.focus();
                    // Start editing at the beginning of the transcript, not at its end.
                    editor.setSelectionRange(0, 0);
                    editor.scrollTop = 0;
                } else {
                    if (editor.value !== String(record.transcript || "") &&
                        !confirm("Discard the unsaved transcript edits?")) {
                        return;
                    }
                    editPanel.hidden = true;
                    editToggle.textContent = "Edit";
                    editToggle.hidden = transcriptContent.hidden;
                    audioContainer.hidden = transcriptContent.hidden;
                    editor.value = String(record.transcript || "");
                }
            });

            cancelEdit.addEventListener("click", () => {
                editPanel.hidden = true;
                editToggle.textContent = "Edit";
                audioContainer.hidden = false;
                transcriptContent.hidden = false;
                transcriptToggle.textContent = "Hide transcript";
                transcriptToggle.title = "Hide transcript";
                transcriptToggle.setAttribute("aria-label", "Hide transcript");
                transcriptToggle.setAttribute("aria-expanded", "true");
                editToggle.hidden = false;
                editor.value = String(record.transcript || "");
            });

            saveEdit.addEventListener("click", async () => {
                if (saveEdit.disabled) return;
                saveEdit.disabled = true;
                cancelEdit.disabled = true;
                editToggle.disabled = true;
                const originalLabel = saveEdit.textContent;
                saveEdit.textContent = "Saving…";

                try {
                    const originalText = await record.file.text();
                    const lines = originalText.split(/\r?\n/);
                    const separatorIndex = lines.findIndex(
                        line => line.trim() === "--------------------------------------------------"
                    );
                    if (separatorIndex === -1) {
                        throw new Error("The transcript separator was not found; the file was not changed.");
                    }
                    const headerText = lines.slice(0, separatorIndex + 1).join("\n");
                    const editedBody = editor.value.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "");
                    const updatedText = `${headerText}\n${editedBody}\n`;
                    const updatedFile = await saveTranscriptEdits(record, updatedText);

                    record.file = updatedFile || new File([updatedText], record.filename, {
                        type: "text/plain",
                        lastModified: Date.now()
                    });
                    record.transcript = editedBody;
                    const selectedIndex = selectedTranscriptFiles.findIndex(
                        file => file.name === record.filename
                    );
                    if (selectedIndex !== -1) {
                        selectedTranscriptFiles[selectedIndex] = record.file;
                    }

                    renderTranscriptText();

                    editPanel.hidden = true;
                    audioContainer.hidden = false;
                    editToggle.textContent = "Edit";
                    transcriptContent.hidden = false;
                    transcriptToggle.textContent = "Hide transcript";
                    transcriptToggle.title = "Hide transcript";
                    transcriptToggle.setAttribute("aria-label", "Hide transcript");
                    transcriptToggle.setAttribute("aria-expanded", "true");
                    editToggle.hidden = false;
                } catch (error) {
                    console.error("Unable to save transcript edits:", error);
                    alert(`Unable to save this transcript. ${error?.message || "Please try again."}`);
                } finally {
                    saveEdit.disabled = false;
                    cancelEdit.disabled = false;
                    editToggle.disabled = false;
                    saveEdit.textContent = "Save changes";
                }
            });

            item.appendChild(checkbox);
            item.appendChild(content);

            transcriptListItems.appendChild(item);
        }

        transcripts.innerHTML = "";

        transcripts.appendChild(
            controls
        );

        transcripts.appendChild(
            selectAllRow
        );

        const upperSeparator =
            document.createElement("div");

        upperSeparator.className =
            "selection-double-separator";

        transcripts.appendChild(
            upperSeparator
        );

        transcripts.appendChild(
            transcriptListItems
        );

        selectAllCheckbox.checked =
            checkboxes.length > 0 &&
            checkboxes.every(checkbox => checkbox.checked);

        hasRenderedTranscriptList = true;

        selectAllCheckbox.onchange =
            () => {

                checkboxes.forEach(
                    checkbox => {
                        checkbox.checked =
                            selectAllCheckbox.checked;
                    }
                );

                onSelectionChanged();
            };

        checkboxes.forEach(
            checkbox => {

                checkbox.onchange =
                    () => {

                        selectAllCheckbox.checked =
                            checkboxes.every(
                                item =>
                                    item.checked
                            );

                        onSelectionChanged();
                    };
            }
        );

        updateTranscriptCollapseUI();
    }

    render("date-desc");

    sortSelect.addEventListener(
        "change",
        () => {
            onSelectionChanged();
            render(sortSelect.value);
        }
    );
}


export function getSelectedTranscriptFiles() {

    const checkboxes =
        Array.from(
            document.querySelectorAll(
                "#transcripts .recording-checkbox"
            )
        );

    return selectedTranscriptFiles.filter(
        file => {

            const checkbox =
                checkboxes.find(
                    item =>
                        item.dataset.filename ===
                        file.name
                );

            return checkbox &&
                checkbox.checked;
        }
    );
}



export function getTranscriptFileCount() {
    return selectedTranscriptFiles.length;
}

export function getCombineSortOrder() {
    return combineSortOrder;
}

export function initCombineUI({
    getCombineModule: loadCombineModule,
    onSelectionChanged: resetExportState,
    onSaveTranscriptEdits,
    onAppendAudioControl,
    getAudioSourceHandle: readAudioSourceHandle
}) {
    getCombineModule = loadCombineModule;
    onSelectionChanged = resetExportState;
    saveTranscriptEdits = onSaveTranscriptEdits;
    appendAudioControl = onAppendAudioControl;
    getAudioSourceHandle = readAudioSourceHandle;
}
