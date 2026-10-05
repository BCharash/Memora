// --------------------------------------------------
// Transcription UI
// --------------------------------------------------

const recordings = document.getElementById("recordings");
const recordingCollapseBottom =
    document.getElementById("recordingCollapseBottom");

let selectedFiles = [];
// Display recordings
// --------------------------------------------------

export async function displayFiles(
    files,
    readAudioMetadata,
    formatRecordingDate,
    formatDuration
) {

    selectedFiles = files;

    const metadataEntries = [];

    recordings.innerHTML = "";

    if (recordingCollapseBottom) {
        recordingCollapseBottom.innerHTML = "";
        recordingCollapseBottom.hidden = files.length === 0;
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
        "Sort recordings";

    sortLabel.htmlFor =
        "recordingSort";

    sortLabel.style.color = "var(--muted)";
    sortLabel.style.fontSize = "14px";
    sortLabel.style.fontWeight = "500";

    const sortSelect =
        document.createElement("select");

    sortSelect.id =
        "recordingSort";

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
        "selectAllRecordings";

    const selectAllLabel =
        document.createElement("label");

    selectAllLabel.htmlFor =
        "selectAllRecordings";

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
        "collapseAllRecordingsTop";

    const collapseLabelTop =
        document.createElement("label");

    collapseLabelTop.htmlFor =
        "collapseAllRecordingsTop";
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

    let recordingListItems = null;
    let recordingsCollapsed = false;

    const collapseCheckboxBottom =
        document.createElement("input");

    collapseCheckboxBottom.type = "checkbox";
    collapseCheckboxBottom.id =
        "collapseAllRecordingsBottom";

    const collapseLabelBottom =
        document.createElement("label");

    collapseLabelBottom.htmlFor =
        "collapseAllRecordingsBottom";
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

    if (recordingCollapseBottom) {
        const lowerSeparator =
            document.createElement("div");

        lowerSeparator.className =
            "selection-double-separator";

        recordingCollapseBottom.appendChild(
            lowerSeparator
        );

        recordingCollapseBottom.appendChild(
            collapseControlBottom
        );
    }

    function updateRecordingCollapseUI() {

        const label =
            recordingsCollapsed
                ? "Expand all"
                : "Collapse all";

        collapseLabelTop.textContent = label;
        collapseLabelBottom.textContent = label;

        collapseCheckboxTop.checked = false;
        collapseCheckboxBottom.checked = false;

        if (recordingListItems) {
            recordingListItems.hidden = recordingsCollapsed;
        }
    }

    function toggleRecordingCollapse() {
        recordingsCollapsed = !recordingsCollapsed;
        updateRecordingCollapseUI();
    }

    function expandRecordingsFromBottom() {
        const bottomTopBefore =
            recordingCollapseBottom
                ? recordingCollapseBottom.getBoundingClientRect().top
                : null;

        recordingsCollapsed = false;
        updateRecordingCollapseUI();

        if (bottomTopBefore !== null && recordingCollapseBottom) {
            requestAnimationFrame(() => {
                const bottomTopAfter =
                    recordingCollapseBottom.getBoundingClientRect().top;

                window.scrollBy(
                    0,
                    bottomTopAfter - bottomTopBefore
                );
            });
        }
    }

    collapseCheckboxTop.onchange = toggleRecordingCollapse;

    collapseCheckboxBottom.onchange = () => {
        if (recordingsCollapsed) {
            expandRecordingsFromBottom();
        } else {
            toggleRecordingCollapse();
        }
    };

    for (const file of files) {

        const entry = {
            file,
            metadata: null
        };

        metadataEntries.push(entry);

        try {

            entry.metadata =
                await readAudioMetadata(file);

        } catch (error) {

            console.error(
                "Metadata error:",
                error
            );
        }
    }

    function sortEntries(entries, sortOrder) {

        return [...entries].sort(
            (a, b) => {

                if (
                    sortOrder === "name-asc" ||
                    sortOrder === "name-desc"
                ) {

                    const comparison =
                        a.file.name.localeCompare(
                            b.file.name,
                            undefined,
                            {
                                numeric: true,
                                sensitivity: "base"
                            }
                        );

                    return sortOrder === "name-asc"
                        ? comparison
                        : -comparison;
                }

                const aDate =
                    a.metadata &&
                    (a.metadata.recordingDate ||
                        a.metadata.fileCreationDate);

                const bDate =
                    b.metadata &&
                    (b.metadata.recordingDate ||
                        b.metadata.fileCreationDate);

                const aTime =
                    aDate
                        ? aDate.getTime()
                        : null;

                const bTime =
                    bDate
                        ? bDate.getTime()
                        : null;

                if (aTime === null && bTime === null) {
                    return a.file.name.localeCompare(
                        b.file.name,
                        undefined,
                        {
                            numeric: true,
                            sensitivity: "base"
                        }
                    );
                }

                if (aTime === null) {
                    return 1;
                }

                if (bTime === null) {
                    return -1;
                }

                const comparison =
                    aTime - bTime;

                return sortOrder === "date-asc"
                    ? comparison
                    : -comparison;
            }
        );
    }

    function renderSortedEntries() {

        const existingCheckboxes =
            Array.from(
                document.querySelectorAll(
                    ".recording-checkbox"
                )
            );

        const checkedNames =
            new Set(
                existingCheckboxes
                    .filter(
                        checkbox =>
                            checkbox.checked
                    )
                    .map(
                        checkbox =>
                            checkbox.dataset.filename
                    )
            );

        const hasExistingSelection =
            existingCheckboxes.length > 0;

        const sortedEntries =
            sortEntries(
                metadataEntries,
                sortSelect.value
            );

        recordingListItems =
            document.createElement("div");

        recordingListItems.className =
            "recording-list-items";

        const recordingCheckboxes = [];

        for (const entry of sortedEntries) {

            const file =
                entry.file;

            const item =
                document.createElement("div");

            item.className =
                "recording-item";

            const checkbox =
                document.createElement("input");

            checkbox.type = "checkbox";

            checkbox.checked =
                hasExistingSelection
                    ? checkedNames.has(file.name)
                    : true;

            checkbox.className =
                "recording-checkbox";

            checkbox.dataset.filename =
                file.name;

            recordingCheckboxes.push(
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
                file.name;

            const details =
                document.createElement("div");

            details.className =
                "recording-details";

            if (entry.metadata) {

                const metadataDate =
                    entry.metadata.recordingDate ||
                    entry.metadata.fileCreationDate;

                const dateLabel =
                    entry.metadata.recordingDate
                        ? formatRecordingDate(metadataDate)
                        : entry.metadata.fileCreationDate
                            ? `File date: ${formatRecordingDate(metadataDate)}`
                            : "Date unknown";

                details.textContent =
                    `${dateLabel} · ` +
                    `${formatDuration(
                        entry.metadata.duration,
                        entry.metadata.durationTimescale
                    )}`;

            } else {

                details.textContent =
                    "Unable to read metadata";
            }

            content.appendChild(name);
            content.appendChild(details);

            item.appendChild(checkbox);
            item.appendChild(content);

            recordingListItems.appendChild(item);
        }

        recordings.innerHTML = "";

        recordings.appendChild(
            controls
        );

        recordings.appendChild(
            selectAllRow
        );

        const upperSeparator =
            document.createElement("div");

        upperSeparator.className =
            "selection-double-separator";

        recordings.appendChild(
            upperSeparator
        );

        recordings.appendChild(
            recordingListItems
        );

        selectAllCheckbox.checked =
            recordingCheckboxes.length > 0 &&
            recordingCheckboxes.every(
                checkbox =>
                    checkbox.checked
            );

        selectAllCheckbox.onchange =
            () => {

                recordingCheckboxes.forEach(
                    checkbox => {
                        checkbox.checked =
                            selectAllCheckbox.checked;
                    }
                );
            };

        recordingCheckboxes.forEach(
            checkbox => {

                checkbox.onchange =
                    () => {

                        selectAllCheckbox.checked =
                            recordingCheckboxes.every(
                                item =>
                                    item.checked
                            );
                    };
            }
        );

        updateRecordingCollapseUI();
    }

    renderSortedEntries();

    sortSelect.addEventListener(
        "change",
        renderSortedEntries
    );
}


export function showEmptyMessage() {

    recordings.innerHTML = `
        <p class="empty-message">
            No recordings selected.
        </p>
    `;

    if (recordingCollapseBottom) {
        recordingCollapseBottom.innerHTML = "";
        recordingCollapseBottom.hidden = true;
    }

    selectedFiles = [];
}


export function getSelectedFiles() {

    const checkboxes =
        Array.from(
            document.querySelectorAll(
                "#recordings .recording-checkbox"
            )
        );

    return checkboxes
        .filter(
            checkbox =>
                checkbox.checked
        )
        .map(
            checkbox =>
                selectedFiles.find(
                    file =>
                        file.name ===
                        checkbox.dataset.filename
                )
        )
        .filter(Boolean);
}


