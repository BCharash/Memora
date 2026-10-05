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

        for (const record of sorted) {

            const item =
                document.createElement("div");

            item.className =
                "recording-item";

            const checkbox =
                document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.checked = true;
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

            const name =
                document.createElement("div");

            name.className =
                "recording-name";

            name.textContent =
                record.filename;

            content.appendChild(name);

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
            checkboxes.length > 0;

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
    onSelectionChanged: resetExportState
}) {
    getCombineModule = loadCombineModule;
    onSelectionChanged = resetExportState;
}
