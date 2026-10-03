let storageModulePromise = import("./storage.js");

const sourceButton = document.getElementById("sourceButton");
const destinationButton = document.getElementById("destinationButton");
const sourceDestinationButton =
    document.getElementById("sourceDestinationButton");
const transcriptionDestinationButton =
    document.getElementById("transcriptionDestinationButton");

const transcriptionDestinationSection =
    document.getElementById("transcriptionDestinationSection");
const desktopTranscriptionDestinationOptions =
    document.getElementById("desktopTranscriptionDestinationOptions");
const iphoneTranscriptionDestinationOptions =
    document.getElementById("iphoneTranscriptionDestinationOptions");
const iphoneExportButton =
    document.getElementById("iphoneExportButton");
const iphoneExportStatus =
    document.getElementById("iphoneExportStatus");
const fileInput = document.getElementById("fileInput");
const recordings = document.getElementById("recordings");
const recordingCollapseBottom =
    document.getElementById("recordingCollapseBottom");

const modelSelect = document.getElementById("modelSelect");
const languageSelect = document.getElementById("languageSelect");
const operationSelect = document.getElementById("operationSelect");
const paragraphingCheckbox = document.getElementById("paragraphingCheckbox");
const transcribeButton = document.getElementById("transcribeButton");

const transcriptionStatus =
    document.getElementById("transcriptionStatus");
const transcriptionOutput =
    document.getElementById("transcriptionOutput");

const transcriptionTab =
    document.getElementById("transcriptionTab");
const searchTab =
    document.getElementById("searchTab");

const combineTab =
    document.getElementById("combineTab");

const transcriptionPanel =
    document.getElementById("transcriptionPanel");

const combinePanel =
    document.getElementById("combinePanel");

const searchPanel =
    document.getElementById("searchPanel");

const searchSourceButton =
    document.getElementById("searchSourceButton");
const searchModelSelect =
    document.getElementById("searchModelSelect");
const searchQueryInput =
    document.getElementById("searchQueryInput");
const searchButton =
    document.getElementById("searchButton");
const searchIndexStatus =
    document.getElementById("searchIndexStatus");
const searchQueryStatus =
    document.getElementById("searchQueryStatus");
const searchResults =
    document.getElementById("searchResults");

const appIcon =
    document.getElementById("appIcon");

const textSourceButton =
    document.getElementById("textSourceButton");

const transcripts =
    document.getElementById("transcripts");
const transcriptCollapseBottom =
    document.getElementById("transcriptCollapseBottom");

const combineSourceDestinationButton =
    document.getElementById("combineSourceDestinationButton");

const combineFolderDestinationButton =
    document.getElementById("combineFolderDestinationButton");

const combineDestinationButton =
    document.getElementById("combineDestinationButton");

const combineDestinationSection =
    document.getElementById("combineDestinationSection");

const combineTextButton =
    document.getElementById("combineTextButton");

const combineHTMLButton =
    document.getElementById("combineHTMLButton");

const combineDOCXButton =
    document.getElementById("combineDOCXButton");
const iphoneCombineDestinationOptions =
    document.getElementById("iphoneCombineDestinationOptions");
const iphoneCombineFormatSelect =
    document.getElementById("iphoneCombineFormatSelect");
const iphoneCombineExportButton =
    document.getElementById("iphoneCombineExportButton");
const iphoneCombineExportStatus =
    document.getElementById("iphoneCombineExportStatus");

const combineStatus =
    document.getElementById("combineStatus");

const combineTitleInput =
    document.getElementById("combineTitleInput");

const combineParagraphingCheckbox =
    document.getElementById("combineParagraphingCheckbox");

let sourceHandle = null;
let destinationHandle = null;
let selectedFiles = [];
let pendingIPhoneExports = [];

let textSourceHandle = null;
let combineDestinationHandle = null;
let selectedTranscriptFiles = [];
let combineSortOrder = "date-desc";
let pendingIPhoneCombineExport = null;

let searchSourceHandle = null;
let searchIndexBuildToken = 0;
let searchIndexReady = false;


function setActiveDestinationButton(button) {

    document
        .querySelectorAll(".destination-options button")
        .forEach(otherButton => {
            otherButton.classList.remove("active");
        });

    if (button) {
        button.classList.add("active");
    }
}


function setActiveCombineDestinationButton(button) {

    document
        .querySelectorAll("#combinePanel .destination-options button")
        .forEach(otherButton => {
            otherButton.classList.remove("active");
        });

    if (button) {
        button.classList.add("active");
    }
}


async function updateCombineFolderButton() {

    if (!textSourceHandle) {
        combineFolderDestinationButton.textContent =
            'Create "combined" Folder';
        return;
    }

    try {

        const storage =
            await getStorageModule();

        await storage.getSubfolder(
            textSourceHandle,
            "combined",
            false
        );

        combineFolderDestinationButton.textContent =
            'Use "combined" Folder';

    } catch (error) {

        if (error.name === "NotFoundError") {
            combineFolderDestinationButton.textContent =
                'Create "combined" Folder';
        } else {
            console.error(
                "Unable to check combined folder:",
                error
            );
        }
    }
}


async function updateTranscriptionFolderButton() {

    if (!sourceHandle) {
        transcriptionDestinationButton.textContent =
            'Create "transcription" Folder';
        return;
    }

    try {

        const storage =
            await getStorageModule();

        const transcriptionFolder =
            await storage.getSubfolder(
                sourceHandle,
                "transcription",
                false
            );

        transcriptionDestinationButton.textContent =
            'Use "transcription" Folder';

        destinationHandle =
            transcriptionFolder;

        setActiveDestinationButton(
            transcriptionDestinationButton
        );

    } catch (error) {

        if (error.name === "NotFoundError") {

            transcriptionDestinationButton.textContent =
                'Create "transcription" Folder';

        } else {

            console.error(
                "Unable to check transcription folder:",
                error
            );
        }
    }
}


// --------------------------------------------------
// Transcription module
// --------------------------------------------------

let transcriptionModule = null;

async function getTranscriptionModule() {
    if (!transcriptionModule) {
        transcriptionModule =
            await import("./transcription.js");
    }
    return transcriptionModule;
}


// --------------------------------------------------
// Storage module
// --------------------------------------------------

async function getStorageModule() {
    return await storageModulePromise;
}


// --------------------------------------------------
// Combine module
// --------------------------------------------------

let combineModule = null;

async function getCombineModule() {

    if (!combineModule) {
        combineModule =
            await import("./combine.js");
    }

    return combineModule;
}


// --------------------------------------------------
// HTML module
// --------------------------------------------------

let htmlModule = null;

async function getHTMLModule() {

    if (!htmlModule) {
        htmlModule =
            await import("./html.js");
    }

    return htmlModule;
}


// --------------------------------------------------
// DOCX module
// --------------------------------------------------

let docxModule = null;

async function getDOCXModule() {

    if (!docxModule) {
        docxModule =
            await import("./docx.js");
    }

    return docxModule;
}


// --------------------------------------------------

let whisperModule = null;

async function getWhisperModule() {

    if (!whisperModule) {
        whisperModule =
            await import("./whisper.js");
    }

    return whisperModule;
}


// --------------------------------------------------
// Paragraphing module
// --------------------------------------------------

let paragraphingModule = null;

async function getParagraphingModule() {

    if (!paragraphingModule) {
        paragraphingModule =
            await import("./paragraphing.js");
    }

    return paragraphingModule;
}


// --------------------------------------------------
// Search module
// --------------------------------------------------

let searchModule = null;

async function getSearchModule() {

    if (!searchModule) {
        searchModule =
            await import("./search.js");
    }

    return searchModule;
}


// --------------------------------------------------
// Source / destination
// --------------------------------------------------

function updateDestinationVisibility(isFileInput) {
    if (transcriptionDestinationSection) {
        transcriptionDestinationSection.hidden = false;
    }

    if (desktopTranscriptionDestinationOptions) {
        desktopTranscriptionDestinationOptions.hidden = false;
        desktopTranscriptionDestinationOptions.style.display =
            isFileInput ? "none" : "flex";
    }

    if (iphoneTranscriptionDestinationOptions) {
        iphoneTranscriptionDestinationOptions.hidden = false;
        iphoneTranscriptionDestinationOptions.style.display =
            isFileInput ? "flex" : "none";
    }

    if (combineDestinationSection) {
        combineDestinationSection.hidden = isFileInput;
    }

    // The three desktop Combine output buttons are direct-write actions.
    // On iPhone they are replaced by the single format-specific share button.
    if (combineTextButton) {
        combineTextButton.hidden = isFileInput;
    }

    if (combineDOCXButton) {
        combineDOCXButton.hidden = isFileInput;
    }

    if (combineHTMLButton) {
        combineHTMLButton.hidden = isFileInput;
    }

    if (iphoneCombineDestinationOptions) {
        iphoneCombineDestinationOptions.hidden = !isFileInput;
        iphoneCombineDestinationOptions.style.display =
            isFileInput ? "block" : "none";
    }
}

if (transcriptionDestinationSection) {
    transcriptionDestinationSection.hidden = true;
}

// Keep Combine output controls hidden until a text source is selected.
// The source selection will reveal the appropriate desktop or iPhone controls.
if (combineTextButton) {
    combineTextButton.hidden = true;
}

if (combineDOCXButton) {
    combineDOCXButton.hidden = true;
}

if (combineHTMLButton) {
    combineHTMLButton.hidden = true;
}

if (iphoneCombineDestinationOptions) {
    iphoneCombineDestinationOptions.hidden = true;
    iphoneCombineDestinationOptions.style.display = "none";
}

sourceButton.addEventListener("click", async () => {

    try {

        const storage =
            await getStorageModule();

        sourceHandle =
            await storage.selectFolder();

        destinationHandle = null;

        resetIPhoneExportState();
        updateDestinationVisibility(sourceHandle.kind === "file-input");

        setActiveDestinationButton(null);

        const files =
            await storage.listAudioFiles(
                sourceHandle
            );

        if (files.length === 0) {

            showEmptyMessage();

            sourceButton.textContent =
                `Source: ${sourceHandle.name}`;

            if (sourceHandle.kind !== "file-input") {
                await updateTranscriptionFolderButton();
            }

            alert(
                "No audio recordings were found in this folder."
            );

            return;
        }

        sourceButton.textContent =
            `Source: ${sourceHandle.name}`;

        if (sourceHandle.kind !== "file-input") {
            await updateTranscriptionFolderButton();
        }

        await displayFiles(files);

    } catch (error) {

        if (error.name !== "AbortError") {

            console.error(
                "Source folder error:",
                error
            );

            alert(
                "Unable to read the source folder."
            );
        }
    }
});



if (iphoneExportButton) {
    iphoneExportButton.addEventListener("click", exportIPhoneTranscripts);
}


sourceDestinationButton.addEventListener("click", () => {

    if (!sourceHandle) {
        alert("Please select a source folder first.");
        return;
    }

    if (sourceHandle.kind === "file-input") {
        alert("An iPhone destination is not implemented yet.");
        return;
    }

    destinationHandle = sourceHandle;

    setActiveDestinationButton(
        sourceDestinationButton
    );
});


transcriptionDestinationButton.addEventListener("click", async () => {

    if (!sourceHandle) {
        alert("Please select a source folder first.");
        return;
    }

    if (sourceHandle.kind === "file-input") {
        alert("An iPhone destination is not implemented yet.");
        return;
    }

    try {

        const storage =
            await getStorageModule();

        destinationHandle =
            await storage.getSubfolder(
                sourceHandle,
                "transcription",
                true
            );

        transcriptionDestinationButton.textContent =
            'Use "transcription" Folder';


    } catch (error) {

        console.error(
            "Transcription folder error:",
            error
        );

        alert(
            "Unable to access the transcription folder."
        );
    }
});


destinationButton.addEventListener("click", async () => {

    try {

        const storage =
            await getStorageModule();

        destinationHandle =
            await storage.selectFolder();

        destinationButton.textContent =
            `Use "${destinationHandle.name}"`;

        setActiveDestinationButton(
            destinationButton
        );

    } catch (error) {

        if (error.name !== "AbortError") {

            console.error(
                "Destination error:",
                error
            );

            alert(
                "Unable to select the destination folder."
            );
        }
    }
});


// --------------------------------------------------
// Display recordings
// --------------------------------------------------

async function displayFiles(files) {

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


function showEmptyMessage() {

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


// --------------------------------------------------
// Transcription
// --------------------------------------------------

// Keep the operation control consistent with the selected language.
function updateOperationAvailability() {
    if (!languageSelect || !operationSelect) {
        return;
    }

    const language = languageSelect.value;

    if (language === "") {
        operationSelect.value = "translate";
        operationSelect.disabled = true;
    } else if (language === "en") {
        operationSelect.value = "transcribe";
        operationSelect.disabled = true;
    } else {
        operationSelect.disabled = false;
    }

    if (transcribeButton) {
        transcribeButton.textContent =
            operationSelect.value === "translate"
                ? "Translate Selected"
                : "Transcribe Selected";
    }
}

if (languageSelect) {
    languageSelect.addEventListener(
        "change",
        updateOperationAvailability
    );
}

// Establish the correct initial state when Memora loads.
updateOperationAvailability();

// Changing the model invalidates any completed-but-not-yet-saved
// iPhone transcript batch. A new model must start a new save batch.
if (modelSelect) {
    modelSelect.addEventListener("change", () => {
        resetIPhoneExportState();
    });
}

// Changing paragraphing changes the transcript that will be produced.
// A new iPhone save batch must therefore start from zero.
if (paragraphingCheckbox) {
    paragraphingCheckbox.addEventListener("change", () => {
        resetIPhoneExportState();
    });
}

// Keep the button text synchronized if the user changes
// the operation for a language where it is enabled.
if (operationSelect && transcribeButton) {
    operationSelect.addEventListener("change", () => {
        transcribeButton.textContent =
            operationSelect.value === "translate"
                ? "Translate Selected"
                : "Transcribe Selected";
    });
}

transcribeButton.addEventListener(
    "click",
    async () => {

        const filesToTranscribe =
            getSelectedFiles();

        if (filesToTranscribe.length === 0) {

            alert(
                "Please select at least one recording."
            );

            return;
        }

        const isIPhoneSource =
            sourceHandle?.kind === "file-input";

        if (!isIPhoneSource && !destinationHandle) {

            alert(
                "Please select a destination folder first."
            );

            return;
        }

        // Pressing Transcribe Selected defines a new iPhone export batch
        // using the recordings selected at that moment.
        if (isIPhoneSource) {
            resetIPhoneExportState();
        }

        try {

            transcribeButton.disabled = true;

            transcriptionOutput.textContent = "";

            const model =
                modelSelect.value;

            const language =
                languageSelect?.value || "auto";

            const operation =
                operationSelect?.value || "transcribe";

            const transcriptionFolder =
                isIPhoneSource
                    ? null
                    : destinationHandle;

            for (
                let i = 0;
                i < filesToTranscribe.length;
                i++
            ) {

                const file =
                    filesToTranscribe[i];

                const transcriptionAudioPath =
                    isIPhoneSource
                        ? file.name
                        : await getAudioRelativePath(
                            sourceHandle,
                            transcriptionFolder,
                            file.name
                        );

                setTranscriptionBusy(
                    `Transcribing ${i + 1} of ` +
                    `${filesToTranscribe.length}: ` +
                    `${file.name}`
                );

                const transcription =
                    await getTranscriptionModule();

                const record =
                    await transcription.transcribeRecording(
                        file,
                        model,
                        language,
                        operation,
                        setTranscriptionBusy
                    );

                let processedTranscript =
                    record.transcript;

                if (paragraphingCheckbox?.checked) {
                    setTranscriptionBusy(
                        `Creating paragraphs for ${i + 1} of ` +
                        `${filesToTranscribe.length}: ` +
                        `${file.name}`
                    );

                    const paragraphing =
                        await getParagraphingModule();

                    processedTranscript =
                        await paragraphing.paragraphize(
                            record.transcript,
                            setTranscriptionBusy
                        );
                }

                const transcript =
                    buildTranscript(
                        record.file,
                        record.metadata,
                        processedTranscript,
                        record.model,
                        language,
                        operation,
                        transcriptionAudioPath
                    );

                const savedFilename =
                    await saveTranscript(
                        transcriptionFolder,
                        record.file,
                        record.metadata,
                        transcript,
                        record.model,
                        operation
                    );

                if (isIPhoneSource) {
                    pendingIPhoneExports.push(
                        new File(
                            [transcript],
                            savedFilename,
                            { type: "text/plain" }
                        )
                    );
                    updateIPhoneExportButton();
                }

                appendTranscription(
                    record.file,
                    processedTranscript
                );
            }

            setTranscriptionComplete(
                "Transcription complete."
            );

            if (isIPhoneSource) {
                updateIPhoneExportButton(true);
            }

        } catch (error) {

            console.error(
                "Transcription error:",
                error
            );

            setTranscriptionError(
                error.message ||
                String(error)
            );

            if (isIPhoneSource && pendingIPhoneExports.length > 0) {
                updateIPhoneExportButton(true);
            }

        } finally {

            transcribeButton.disabled =
                false;
        }
    }
);


function getSelectedFiles() {

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


// --------------------------------------------------
// Busy indicator
// --------------------------------------------------

function setTranscriptionBusy(message) {

    transcriptionStatus.innerHTML = `
        <span class="transcription-spinner"
              aria-hidden="true"></span>
        <span>${message}</span>
    `;
}


function setTranscriptionComplete(message) {

    transcriptionStatus.innerHTML = `
        <span>${message}</span>
    `;
}


function setTranscriptionError(message) {

    transcriptionStatus.innerHTML = `
        <span>${message}</span>
    `;
}



// --------------------------------------------------
// Combine Files
// --------------------------------------------------

if (transcriptionTab && combineTab && searchTab) {

    function activateTab(activeTab) {

        const tabConfig = {
            transcription: {
                tab: transcriptionTab,
                panel: transcriptionPanel,
                icon: "icons/transcribe.png"
            },
            combine: {
                tab: combineTab,
                panel: combinePanel,
                icon: "icons/combine.png"
            },
            search: {
                tab: searchTab,
                panel: searchPanel,
                icon: "icons/search.png"
            }
        };

        Object.values(tabConfig).forEach(config => {
            const isActive =
                config.tab === activeTab;

            config.tab.classList.toggle(
                "active",
                isActive
            );

            config.tab.setAttribute(
                "aria-selected",
                isActive ? "true" : "false"
            );

            config.panel.hidden = !isActive;
        });

        const activeConfig =
            Object.values(tabConfig).find(
                config => config.tab === activeTab
            );

        if (activeConfig && appIcon) {
            appIcon.src = activeConfig.icon;
        }
    }


    transcriptionTab.addEventListener(
        "click",
        () => {
            activateTab(transcriptionTab);
        }
    );


    combineTab.addEventListener(
        "click",
        () => {
            activateTab(combineTab);
        }
    );


    searchTab.addEventListener(
        "click",
        () => {
            activateTab(searchTab);
        }
    );
}


// --------------------------------------------------
// Search
// --------------------------------------------------

function setSearchBusy(busy) {

    if (searchSourceButton) {
        searchSourceButton.disabled = busy;
    }

    if (searchModelSelect) {
        searchModelSelect.disabled = busy;
    }

    if (searchQueryInput) {
        searchQueryInput.disabled = busy || !searchIndexReady;
    }

    if (searchButton) {
        searchButton.disabled = busy || !searchIndexReady;
    }
}


function setSearchIndexStatus(message, busy = false) {

    if (!searchIndexStatus) {
        return;
    }

    searchIndexStatus.innerHTML = "";

    if (busy) {
        const spinner =
            document.createElement("span");

        spinner.className =
            "transcription-spinner";
        spinner.setAttribute(
            "aria-hidden",
            "true"
        );

        searchIndexStatus.appendChild(
            spinner
        );
    }

    const text =
        document.createElement("span");

    text.textContent = message;

    searchIndexStatus.appendChild(text);
}


function setSearchQueryStatus(message, busy = false) {

    if (!searchQueryStatus) {
        return;
    }

    searchQueryStatus.hidden = false;
    searchQueryStatus.innerHTML = "";

    if (busy) {
        const spinner =
            document.createElement("span");

        spinner.className =
            "transcription-spinner";
        spinner.setAttribute(
            "aria-hidden",
            "true"
        );

        searchQueryStatus.appendChild(
            spinner
        );
    }

    const text =
        document.createElement("span");

    text.textContent = message;

    searchQueryStatus.appendChild(text);
}


function formatElapsed(seconds) {
    if (seconds < 1) {
        return `${Math.round(seconds * 1000)} ms`;
    }

    return `${seconds.toFixed(1)} s`;
}


async function getSearchSourceFiles(handle) {

    const storage =
        await getStorageModule();

    return handle.kind === "file-input"
        ? handle.files.filter(
            file => /\.txt$/i.test(file.name)
        )
        : await storage.listTextFiles(handle);
}


async function buildSearchIndexForSource(files) {

    const token = ++searchIndexBuildToken;
    searchIndexReady = false;
    setSearchBusy(true);

    if (searchQueryStatus) {
        searchQueryStatus.hidden = true;
        searchQueryStatus.textContent = "";
    }

    setSearchIndexStatus(
        "Building the semantic index…",
        true
    );

    if (searchResults) {
        searchResults.innerHTML = `
            <p class="empty-message">
                Building the semantic index…
            </p>
        `;
    }

    try {

        const search =
            await getSearchModule();

        const index =
            await search.buildSearchIndex(
                files,
                searchModelSelect?.value || "minilm",
                message => {
                    if (token !== searchIndexBuildToken) {
                        return;
                    }

                    setSearchIndexStatus(
                        message,
                        true
                    );
                }
            );

        if (token !== searchIndexBuildToken) {
            return;
        }

        searchIndexReady =
            index.sentences > 0;

        const elapsedSeconds =
            index.durationMs / 1000;

        if (searchIndexStatus) {

            if (index.sentences > 0) {
                const timingDetails =
                    `Reading ${formatElapsed(index.readDurationMs / 1000)} · ` +
                    `sentences ${formatElapsed(index.sentenceProcessingDurationMs / 1000)} · ` +
                    `embeddings ${formatElapsed(index.embeddingDurationMs / 1000)}`;

                setSearchIndexStatus(
                    `Search ready — ${index.records.length} transcript${index.records.length === 1 ? "" : "s"}, ` +
                    `${index.sentences.toLocaleString()} sentences indexed in ${formatElapsed(elapsedSeconds)} ` +
                    `(${timingDetails}).`
                );
            } else {
                setSearchIndexStatus(
                    "No searchable sentences were found in the selected transcripts."
                );
            }
        }

        setSearchBusy(false);

    } catch (error) {

        if (token !== searchIndexBuildToken) {
            return;
        }

        console.error(
            "Search index error:",
            error
        );

        searchIndexReady = false;
        setSearchBusy(false);

        if (searchIndexStatus) {
            setSearchIndexStatus(
                "Unable to build the semantic search index."
            );
        }

        if (searchResults) {
            searchResults.innerHTML = `
                <p class="empty-message">
                    Search indexing failed. See the browser console for details.
                </p>
            `;
        }
    }
}


function normalizeSearchParagraph(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
}


function appendHighlightedParagraph(
    container,
    paragraph,
    matchedSentences
) {

    const text =
        normalizeSearchParagraph(paragraph);

    if (!text) {
        return;
    }

    const matches = [...matchedSentences]
        .sort((a, b) =>
            a.sentenceIndex - b.sentenceIndex
        );

    let cursor = 0;

    for (const match of matches) {

        const sentence =
            normalizeSearchParagraph(match.sentence);

        if (!sentence) {
            continue;
        }

        const start =
            text.indexOf(sentence, cursor);

        if (start === -1) {
            continue;
        }

        if (start > cursor) {
            container.appendChild(
                document.createTextNode(
                    text.slice(cursor, start)
                )
            );
        }

        const mark =
            document.createElement("mark");

        mark.textContent = sentence;
        container.appendChild(mark);

        cursor =
            start + sentence.length;
    }

    if (cursor < text.length) {
        container.appendChild(
            document.createTextNode(
                text.slice(cursor)
            )
        );
    }

    if (!container.childNodes.length) {
        container.textContent = text;
    }
}


function renderSearchResults(payload) {

    if (!searchResults) {
        return [];
    }

    searchResults.innerHTML = "";

    const rawResults =
        payload?.results || [];

    if (rawResults.length === 0) {

        searchResults.innerHTML = `
            <p class="empty-message">
                No semantic matches were found.
            </p>
        `;

        return [];
    }

    // Group sentence-level hits into paragraph-level passages and then
    // group those passages by transcript file. This lets the user select
    // entire transcript files for the existing Combine workflow without
    // losing sentence-level semantic ranking.
    const files = new Map();

    for (const result of rawResults) {

        let fileGroup =
            files.get(result.filename);

        if (!fileGroup) {
            fileGroup = {
                filename: result.filename,
                record: result.record,
                passages: new Map()
            };

            files.set(
                result.filename,
                fileGroup
            );
        }

        const passageKey =
            `${result.paragraphIndex}`;

        let passage =
            fileGroup.passages.get(passageKey);

        if (!passage) {
            passage = {
                paragraph: result.paragraph,
                paragraphIndex: result.paragraphIndex,
                matches: [],
                bestScore: result.score
            };

            fileGroup.passages.set(
                passageKey,
                passage
            );
        }

        passage.matches.push(result);
        passage.bestScore = Math.max(
            passage.bestScore,
            result.score
        );
    }

    const groups =
        Array.from(files.values());

    const toolbar =
        document.createElement("div");

    toolbar.className =
        "search-results-toolbar";

    const selectAllLabel =
        document.createElement("label");

    const selectAllCheckbox =
        document.createElement("input");

    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = true;

    selectAllLabel.appendChild(
        selectAllCheckbox
    );
    selectAllLabel.appendChild(
        document.createTextNode("Select all")
    );

    const summary =
        document.createElement("span");

    summary.textContent =
        `${groups.length} transcript${groups.length === 1 ? "" : "s"} represented · ` +
        `${rawResults.length} strongest sentence match${rawResults.length === 1 ? "" : "es"}`;

    const useButton =
        document.createElement("button");

    useButton.type = "button";
    useButton.className =
        "search-use-combine-button";
    useButton.textContent =
        "Use Selected in Combine";

    toolbar.appendChild(selectAllLabel);
    toolbar.appendChild(summary);
    toolbar.appendChild(useButton);
    searchResults.appendChild(toolbar);

    const groupCheckboxes = [];

    for (const group of groups) {

        const section =
            document.createElement("section");

        section.className =
            "search-result-file";

        const header =
            document.createElement("div");

        header.className =
            "search-result-file-header";

        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.className =
            "search-result-file-checkbox";
        checkbox.dataset.filename =
            group.filename;
        checkbox.dataset.searchFileKey =
            group.filename;

        groupCheckboxes.push(checkbox);

        const fileText =
            document.createElement("div");

        const fileName =
            document.createElement("div");

        fileName.className =
            "search-result-file-name";
        fileName.textContent =
            group.filename;

        fileText.appendChild(fileName);

        if (group.record.recordingFilename) {
            const details =
                document.createElement("div");

            details.className =
                "search-result-file-details";
            details.textContent =
                group.record.recordingFilename;

            fileText.appendChild(details);
        }

        header.appendChild(checkbox);
        header.appendChild(fileText);
        section.appendChild(header);

        const passages =
            Array.from(group.passages.values())
                .sort((a, b) => b.bestScore - a.bestScore)
                .slice(0, 4);

        for (const passage of passages) {

            const passageElement =
                document.createElement("div");

            passageElement.className =
                "search-result-passage";

            const label =
                document.createElement("div");

            label.className =
                "search-result-passage-label";
            label.textContent =
                "Matching passage";

            const textElement =
                document.createElement("div");

            textElement.className =
                "search-result-passage-text";

            appendHighlightedParagraph(
                textElement,
                passage.paragraph,
                passage.matches
            );

            passageElement.appendChild(label);
            passageElement.appendChild(textElement);
            section.appendChild(passageElement);
        }

        searchResults.appendChild(section);
    }

    function updateSelectionUI() {

        const selectedCount =
            groupCheckboxes.filter(
                checkbox => checkbox.checked
            ).length;

        selectAllCheckbox.checked =
            selectedCount === groupCheckboxes.length;

        selectAllCheckbox.indeterminate =
            selectedCount > 0 &&
            selectedCount < groupCheckboxes.length;

        useButton.disabled =
            selectedCount === 0;

        useButton.textContent =
            selectedCount === 0
                ? "Use Selected in Combine"
                : `Use ${selectedCount} Selected in Combine`;
    }

    selectAllCheckbox.onchange = () => {
        groupCheckboxes.forEach(
            checkbox => {
                checkbox.checked =
                    selectAllCheckbox.checked;
            }
        );

        updateSelectionUI();
    };

    groupCheckboxes.forEach(
        checkbox => {
            checkbox.onchange = updateSelectionUI;
        }
    );

    useButton.onclick = async () => {

        const selected =
            groupCheckboxes
                .filter(checkbox => checkbox.checked)
                .map(checkbox =>
                    groups.find(
                        group =>
                            group.filename ===
                            checkbox.dataset.filename
                    )?.record.file
                )
                .filter(Boolean);

        await useSearchSelectionInCombine(selected);
    };

    updateSelectionUI();

    return groups
        .map(group => group.record.file)
        .filter(Boolean);
}


async function runSearchQuery() {

    if (!searchIndexReady || !searchQueryInput) {
        return;
    }

    const query =
        searchQueryInput.value.trim();

    if (!query) {
        searchQueryInput.focus();
        return;
    }

    if (searchButton) {
        searchButton.disabled = true;
    }

    setSearchQueryStatus(
        "Searching…",
        true
    );

    try {

        const search =
            await getSearchModule();

        const payload =
            await search.search(
                query,
                30,
                message => {
                    setSearchQueryStatus(
                        message,
                        true
                    );
                }
            );

        renderSearchResults(payload);

        setSearchQueryStatus(
            `${payload.results.length} sentence match${payload.results.length === 1 ? "" : "es"} found in ${formatElapsed(payload.durationMs / 1000)}.`
        );

    } catch (error) {

        console.error(
            "Search error:",
            error
        );

        setSearchQueryStatus(
            "Unable to perform the search."
        );
    }

    if (searchButton) {
        searchButton.disabled = !searchIndexReady;
    }
}


async function useSearchSelectionInCombine(files) {

    if (!files.length) {
        return;
    }

    selectedTranscriptFiles =
        files;

    textSourceHandle =
        searchSourceHandle;

    combineDestinationHandle = null;
    resetIPhoneCombineExportState();
    setActiveCombineDestinationButton(null);

    if (textSourceHandle) {

        const isFileInput =
            textSourceHandle.kind === "file-input";

        if (combineDestinationSection) {
            combineDestinationSection.hidden = isFileInput;
        }

        if (combineTextButton) {
            combineTextButton.hidden = isFileInput;
        }

        if (combineDOCXButton) {
            combineDOCXButton.hidden = isFileInput;
        }

        if (combineHTMLButton) {
            combineHTMLButton.hidden = isFileInput;
        }

        if (iphoneCombineDestinationOptions) {
            iphoneCombineDestinationOptions.hidden = !isFileInput;
            iphoneCombineDestinationOptions.style.display =
                isFileInput ? "block" : "none";
        }

        if (!isFileInput) {
            await updateCombineFolderButton();
        }

        textSourceButton.textContent =
            `Text Source: ${textSourceHandle.name}`;
    }

    await displayTranscriptFiles(files);

    combineStatus.textContent =
        `${files.length} transcript${files.length === 1 ? "" : "s"} selected from Search.`;

    combineTab.click();
}


if (searchSourceButton) {

    searchSourceButton.addEventListener(
        "click",
        async () => {

            try {

                const storage =
                    await getStorageModule();

                const handle =
                    await storage.selectFolder();

                const files =
                    await getSearchSourceFiles(handle);

                searchSourceHandle = handle;

                searchIndexReady = false;
                setSearchBusy(true);
                setSearchIndexStatus(
                    "Preparing the semantic index…",
                    true
                );

                if (searchQueryInput) {
                    searchQueryInput.value = "";
                }

                if (searchButton) {
                    searchButton.disabled = true;
                }

                searchSourceButton.textContent =
                    `Search Source: ${handle.name}`;

                if (files.length === 0) {

                    setSearchIndexStatus(
                        "No transcript files found in the selected folder."
                    );

                    if (searchResults) {
                        searchResults.innerHTML = `
                            <p class="empty-message">
                                No transcript files found.
                            </p>
                        `;
                    }

                    setSearchBusy(false);
                    return;
                }

                await buildSearchIndexForSource(files);

            } catch (error) {

                if (error.name !== "AbortError") {

                    console.error(
                        "Search source error:",
                        error
                    );

                    searchIndexReady = false;
                    setSearchBusy(false);

                    setSearchIndexStatus(
                        "Unable to read the search source folder."
                    );
                }
            }
        }
    );
}


if (searchModelSelect) {

    searchModelSelect.addEventListener(
        "change",
        async () => {

            if (!searchSourceHandle) {
                return;
            }

            try {
                const files =
                    await getSearchSourceFiles(
                        searchSourceHandle
                    );

                await buildSearchIndexForSource(
                    files
                );

            } catch (error) {
                console.error(
                    "Search model change error:",
                    error
                );
            }
        }
    );
}


if (searchButton) {
    searchButton.addEventListener(
        "click",
        runSearchQuery
    );
}


if (searchQueryInput) {
    searchQueryInput.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                event.preventDefault();
                runSearchQuery();
            }
        }
    );
}


if (textSourceButton) {

    textSourceButton.addEventListener(
        "click",
        async () => {

            try {

                const storage =
                    await getStorageModule();

                textSourceHandle =
                    await storage.selectFolder();

                updateDestinationVisibility(textSourceHandle.kind === "file-input");

                const files =
                    textSourceHandle.kind === "file-input"
                        ? textSourceHandle.files.filter(
                            file => /\.txt$/i.test(file.name)
                        )
                        : await storage.listTextFiles(
                            textSourceHandle
                        );

                selectedTranscriptFiles =
                    files;

                resetIPhoneCombineExportState();

                combineDestinationHandle = null;
                setActiveCombineDestinationButton(null);
                await updateCombineFolderButton();

                await displayTranscriptFiles(
                    files
                );

                textSourceButton.textContent =
                    `Text Source: ${textSourceHandle.name}`;

                combineStatus.textContent =
                    files.length === 0
                        ? "No transcript files found."
                        : `${files.length} transcript file${files.length === 1 ? "" : "s"} found.`;

            } catch (error) {

                if (error.name !== "AbortError") {

                    console.error(
                        "Text source error:",
                        error
                    );

                    combineStatus.textContent =
                        "Unable to read the text source folder.";
                }
            }
        }
    );
}


if (combineSourceDestinationButton) {

    combineSourceDestinationButton.addEventListener(
        "click",
        () => {

            if (!textSourceHandle) {
                alert("Please select a text source folder first.");
                return;
            }

            combineDestinationHandle =
                textSourceHandle;

            setActiveCombineDestinationButton(
                combineSourceDestinationButton
            );
        }
    );
}


if (combineFolderDestinationButton) {

    combineFolderDestinationButton.addEventListener(
        "click",
        async () => {

            if (!textSourceHandle) {
                alert("Please select a text source folder first.");
                return;
            }

            try {

                const storage =
                    await getStorageModule();

                combineDestinationHandle =
                    await storage.getSubfolder(
                        textSourceHandle,
                        "combined",
                        true
                    );

                combineFolderDestinationButton.textContent =
                    'Use "combined" Folder';

                setActiveCombineDestinationButton(
                    combineFolderDestinationButton
                );

            } catch (error) {

                console.error(
                    "combined folder error:",
                    error
                );

                combineStatus.textContent =
                    "Unable to access the combined folder.";
            }
        }
    );
}


if (combineDestinationButton) {

    combineDestinationButton.addEventListener(
        "click",
        async () => {

            try {

                const storage =
                    await getStorageModule();

                combineDestinationHandle =
                    await storage.selectFolder();

                setActiveCombineDestinationButton(
                    combineDestinationButton
                );

                combineDestinationButton.textContent =
                    `Output: ${combineDestinationHandle.name}`;

            } catch (error) {

                if (error.name !== "AbortError") {

                    console.error(
                        "Combine destination error:",
                        error
                    );

                    combineStatus.textContent =
                        "Unable to select the output folder.";
                }
            }
        }
    );
}


async function displayTranscriptFiles(files) {

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

                resetIPhoneCombineExportState();
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

                        resetIPhoneCombineExportState();
                    };
            }
        );

        updateTranscriptCollapseUI();
    }

    render("date-desc");

    sortSelect.addEventListener(
        "change",
        () => {
            resetIPhoneCombineExportState();
            render(sortSelect.value);
        }
    );
}


function getIPhoneCombineFormatLabel() {
    if (!iphoneCombineFormatSelect) {
        return "TXT";
    }

    const labels = {
        text: "TXT",
        docx: "DOCX",
        html: "HTML"
    };

    return labels[iphoneCombineFormatSelect.value] || "TXT";
}


function updateIPhoneCombineButton() {
    if (!iphoneCombineExportButton) {
        return;
    }

    iphoneCombineExportButton.textContent =
        `Save ${getIPhoneCombineFormatLabel()} to Files`;

    iphoneCombineExportButton.disabled =
        selectedTranscriptFiles.length === 0;
}


function resetIPhoneCombineExportState() {
    pendingIPhoneCombineExport = null;

    const formatLabel =
        getIPhoneCombineFormatLabel();

    if (iphoneCombineExportButton) {
        iphoneCombineExportButton.disabled =
            selectedTranscriptFiles.length === 0;
        iphoneCombineExportButton.textContent =
            `Save ${formatLabel} to Files`;
    }

    if (iphoneCombineExportStatus) {
        iphoneCombineExportStatus.textContent =
            `Ready to share ${formatLabel}`;
    }
}


async function exportIPhoneCombinedFile(file) {
    if (!file) {
        return;
    }

    pendingIPhoneCombineExport = file;
    const formatLabel = getIPhoneCombineFormatLabel();

    updateIPhoneCombineButton(true);

    if (!navigator.share) {
        if (iphoneCombineExportStatus) {
            iphoneCombineExportStatus.textContent =
                "This iPhone browser cannot share files.";
        }
        return;
    }

    const shareData = {
        files: [file]
    };

    if (navigator.canShare && !navigator.canShare(shareData)) {
        if (iphoneCombineExportStatus) {
            iphoneCombineExportStatus.textContent =
                `This browser cannot share the ${formatLabel} file.`;
        }
        return;
    }

    try {
        await navigator.share(shareData);

        if (iphoneCombineExportStatus) {
            iphoneCombineExportStatus.textContent =
                `${formatLabel} shared`;
        }

        updateIPhoneCombineButton(true);

    } catch (error) {
        if (error.name === "AbortError") {
            if (iphoneCombineExportStatus) {
                iphoneCombineExportStatus.textContent =
                    `${formatLabel} ready to save`;
            }

            updateIPhoneCombineButton(true);
            return;
        }

        console.error(
            "iPhone combined file export error:",
            error
        );

        if (iphoneCombineExportStatus) {
            iphoneCombineExportStatus.textContent =
                `Unable to share the ${formatLabel} file.`;
        }

        updateIPhoneCombineButton(true);
    }
}


if (iphoneCombineFormatSelect) {
    iphoneCombineFormatSelect.addEventListener(
        "change",
        () => {
            resetIPhoneCombineExportState();
        }
    );
}


if (combineTitleInput) {
    combineTitleInput.addEventListener(
        "input",
        () => {
            if (textSourceHandle?.kind === "file-input") {
                resetIPhoneCombineExportState();
            }
        }
    );
}


if (combineParagraphingCheckbox) {
    combineParagraphingCheckbox.addEventListener(
        "change",
        () => {
            if (textSourceHandle?.kind === "file-input") {
                resetIPhoneCombineExportState();
            }
        }
    );
}


resetIPhoneCombineExportState();


function getSelectedTranscriptFiles() {

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


async function combineSelectedFiles(
    outputType
) {

    const isIPhoneSource =
        textSourceHandle?.kind === "file-input";

    const files =
        getSelectedTranscriptFiles();

    const combineTitle =
        combineTitleInput?.value.trim() ||
        "Memora — Combined Transcription";

    const safeFilenameBase =
        combineTitle
            .replace(/[<>:"/\\|?*]/g, "-")
            .replace(/[. ]+$/g, "")
            .trim() ||
        "Memora — Combined Transcription";

    if (files.length === 0) {

        combineStatus.textContent =
            "Please select at least one transcript.";

        return;
    }

    if (!isIPhoneSource && !combineDestinationHandle) {

        combineStatus.textContent =
            "Please select an output folder first.";

        return;
    }

    try {

        if (isIPhoneSource) {
            if (iphoneCombineExportButton) {
                iphoneCombineExportButton.disabled = true;
            }
        } else {
            combineTextButton.disabled = true;
            combineDOCXButton.disabled = true;
            combineHTMLButton.disabled = true;
        }

        combineStatus.textContent =
            `Reading ${files.length} transcript${files.length === 1 ? "" : "s"}…`;

        const combineModule =
            await getCombineModule();

        const records =
            await combineModule.readTranscriptFiles(
                files
            );

        const sortedRecords =
            combineModule.sortTranscriptRecords(
                records,
                combineSortOrder
            );

        const selectedRecords =
            combineModule.selectHighestModelRecords(
                sortedRecords
            );

        let outputRecords =
            selectedRecords;

        if (combineParagraphingCheckbox?.checked) {

            const paragraphing =
                await getParagraphingModule();

            outputRecords = [];

            for (let i = 0; i < selectedRecords.length; i++) {

                const record =
                    selectedRecords[i];

                combineStatus.textContent =
                    `Creating paragraphs for ${i + 1} of ` +
                    `${selectedRecords.length}: ` +
                    `${record.filename}`;

                const paragraphizedTranscript =
                    await paragraphing.paragraphize(
                        record.transcript,
                        message => {
                            combineStatus.textContent =
                                message;
                        }
                    );

                outputRecords.push({
                    ...record,
                    transcript: paragraphizedTranscript
                });
            }
        }

        // iPhone: generate exactly one selected format in memory, then
        // hand that file to the iOS share sheet. The same generated file
        // remains available for repeated sharing.
        if (isIPhoneSource) {

            if (outputType === "text") {

                const combinedText =
                    combineModule.combineTranscriptRecords(
                        outputRecords,
                        combineTitle
                    );

                const file =
                    new File(
                        [combinedText],
                        `${safeFilenameBase}.txt`,
                        { type: "text/plain" }
                    );

                combineStatus.textContent =
                    "Creating combined TXT…";

                await exportIPhoneCombinedFile(file);
                combineStatus.textContent = "";

            } else if (outputType === "docx") {

                const docx =
                    await getDOCXModule();

                const combinedDOCX =
                    await docx.createCombinedDOCX(
                        outputRecords,
                        combineTitle
                    );

                const file =
                    new File(
                        [combinedDOCX],
                        `${safeFilenameBase}.docx`,
                        {
                            type:
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        }
                    );

                combineStatus.textContent =
                    "Creating combined DOCX…";

                await exportIPhoneCombinedFile(file);
                combineStatus.textContent = "";

            } else {

                const html =
                    await getHTMLModule();

                // On iPhone there is no destination folder handle to
                // resolve a new prefix from. Preserve any relative audio
                // paths already carried by the transcript records.
                const htmlRecords =
                    outputRecords;

                const combinedHTML =
                    html.createCombinedHTML(
                        htmlRecords,
                        combineTitle
                    );

                const file =
                    new File(
                        [combinedHTML],
                        `${safeFilenameBase}.html`,
                        { type: "text/html" }
                    );

                combineStatus.textContent =
                    "Creating combined HTML…";

                await exportIPhoneCombinedFile(file);
                combineStatus.textContent = "";
            }

            return;
        }

        const storage =
            await getStorageModule();

        if (outputType === "text") {

            const combinedText =
                combineModule.combineTranscriptRecords(
                    outputRecords,
                    combineTitle
                );

            await storage.writeTextFile(
                combineDestinationHandle,
                `${safeFilenameBase}.txt`,
                combinedText
            );

            combineStatus.textContent =
                "Combined TXT created.";

        } else if (outputType === "docx") {

            const docx =
                await getDOCXModule();

            const combinedDOCX =
                await docx.createCombinedDOCX(
                    outputRecords,
                    combineTitle
                );

            await storage.writeBinaryFile(
                combineDestinationHandle,
                `${safeFilenameBase}.docx`,
                combinedDOCX
            );

            combineStatus.textContent =
                "Combined DOCX created.";

        } else {

            const html =
                await getHTMLModule();

            const htmlAudioPathPrefix =
                await getCombinedAudioPathPrefix(
                    textSourceHandle,
                    combineDestinationHandle
                );

            const htmlRecords =
                outputRecords.map(record => ({
                    ...record,
                    audioRelativePath:
                        record.audioRelativePath &&
                        htmlAudioPathPrefix !== null
                            ? htmlAudioPathPrefix +
                                record.audioRelativePath
                            : null
                }));

            const combinedHTML =
                html.createCombinedHTML(
                    htmlRecords,
                    combineTitle
                );

            await storage.writeTextFile(
                combineDestinationHandle,
                `${safeFilenameBase}.html`,
                combinedHTML
            );

            combineStatus.textContent =
                "Combined HTML created.";
        }

    } catch (error) {

        console.error(
            "Combine error:",
            error
        );

        combineStatus.textContent =
            error.message ||
            "Unable to create the combined file.";

        if (isIPhoneSource) {
            updateIPhoneCombineButton(
                pendingIPhoneCombineExport !== null
            );
        }

    } finally {

        if (isIPhoneSource) {
            if (iphoneCombineExportButton) {
                updateIPhoneCombineButton(
                    pendingIPhoneCombineExport !== null
                );
            }
        } else {
            combineTextButton.disabled = false;
            combineDOCXButton.disabled = false;
            combineHTMLButton.disabled = false;
        }
    }
}


if (combineTextButton) {

    combineTextButton.addEventListener(
        "click",
        () => combineSelectedFiles("text")
    );
}


if (combineDOCXButton) {

    combineDOCXButton.addEventListener(
        "click",
        () => combineSelectedFiles("docx")
    );
}


if (combineHTMLButton) {

    combineHTMLButton.addEventListener(
        "click",
        () => combineSelectedFiles("html")
    );
}

if (iphoneCombineExportButton) {

    iphoneCombineExportButton.addEventListener(
        "click",
        () => {
            const outputType =
                iphoneCombineFormatSelect?.value ||
                "text";

            combineSelectedFiles(outputType);
        }
    );
}


// --------------------------------------------------
// Whisper model
// --------------------------------------------------



// --------------------------------------------------
// Audio processing module
// --------------------------------------------------

let audioProcessor = null;



// --------------------------------------------------
// Audio path helpers
// --------------------------------------------------

async function getAudioRelativePath(
    sourceFolder,
    transcriptionFolder,
    filename
) {

    if (!sourceFolder || !transcriptionFolder) {
        return null;
    }

    const path =
        await sourceFolder.resolve(
            transcriptionFolder
        );

    if (!path) {
        return null;
    }

    return (
        "../".repeat(path.length) +
        filename
    );
}


async function getCombinedAudioPathPrefix(
    textSourceFolder,
    combineFolder
) {

    if (!textSourceFolder || !combineFolder) {
        return null;
    }

    const path =
        await textSourceFolder.resolve(
            combineFolder
        );

    if (!path) {
        return null;
    }

    return "../".repeat(path.length);
}


// --------------------------------------------------
// Build transcript file
// --------------------------------------------------

function buildTranscript(
    file,
    metadata,
    text,
    model,
    language,
    operation,
    audioRelativePath
) {

    const recordingDate =
        formatRecordingDate(
            metadata.recordingDate
        );

    const fileDate =
        formatRecordingDate(
            metadata.fileCreationDate
        );

    const duration =
        formatDuration(
            metadata.duration,
            metadata.durationTimescale
        );

    const metadataLines = [
        `Recording date: ${recordingDate}`,
        `File date: ${fileDate}`,
        `Duration: ${duration}`,
        `Voice Memo ID: ${metadata.uuid || "Unknown"}`,
        `Whisper model: ${model}`,
        `Operation: ${operation === "translate" ? "translate" : "transcribe"}`
    ];

    if (
        operation === "translate" &&
        language &&
        language !== "auto"
    ) {
        metadataLines.push(
            `Original language: ${formatLanguageName(language)}`
        );
    }

    if (audioRelativePath) {
        metadataLines.push(
            `Audio Relative Path: ${audioRelativePath}`
        );
    }

    return (
        `${file.name}\n\n` +
        `${metadataLines.join("\n")}\n\n` +
        `--------------------------------------------------\n\n` +
        `${text.trim()}\n`
    );
}


// --------------------------------------------------
// Save transcript
// --------------------------------------------------

async function saveTranscript(
    transcriptionFolder,
    file,
    metadata,
    transcript,
    model,
    operation
) {

    const storage =
        await getStorageModule();

    if (sourceHandle?.kind === "file-input") {

        const filename =
            await createUniqueTranscriptFilename(
                null,
                file,
                metadata,
                model,
                operation
            );

        await storage.saveTranscriptRecord(
            filename,
            transcript,
            metadata,
            model,
            operation
        );

        return filename;
    }

    const filename =
        await createUniqueTranscriptFilename(
            transcriptionFolder,
            file,
            metadata,
            model,
            operation
        );

    await storage.writeTextFile(
        transcriptionFolder,
        filename,
        transcript
    );

    return filename;
}


function updateIPhoneExportButton(forceEnable = false) {
    if (!iphoneExportButton) {
        return;
    }

    const count = pendingIPhoneExports.length;

    iphoneExportButton.textContent =
        `Save ${count} Transcript${count === 1 ? "" : "s"} to Files`;

    if (forceEnable) {
        iphoneExportButton.disabled = count === 0;
    }
}


function resetIPhoneExportState() {
    pendingIPhoneExports = [];

    if (iphoneExportButton) {
        iphoneExportButton.disabled = true;
        iphoneExportButton.textContent = "Save 0 Transcripts to Files";
    }

    if (iphoneExportStatus) {
        iphoneExportStatus.textContent = "No transcripts saved yet.";
    }

}


function setIPhoneExportSavedStatus(count) {
    if (iphoneExportButton) {
        iphoneExportButton.disabled = count === 0;
        iphoneExportButton.textContent =
            `Save ${count} Transcript${count === 1 ? "" : "s"} to Files`;
    }

    if (iphoneExportStatus) {
        iphoneExportStatus.textContent =
            `${count} Transcript${count === 1 ? "" : "s"} saved`;
    }

}


async function exportIPhoneTranscripts() {
    if (pendingIPhoneExports.length === 0) {
        return;
    }

    if (!navigator.share) {
        alert(
            "This iPhone browser cannot share files to the Files app."
        );
        return;
    }

    const shareData = {
        files: pendingIPhoneExports
    };

    if (navigator.canShare && !navigator.canShare({
        files: pendingIPhoneExports
    })) {
        alert(
            "These transcript files cannot be shared from this browser."
        );
        return;
    }

    try {
        const savedCount = pendingIPhoneExports.length;

        await navigator.share(shareData);

        setIPhoneExportSavedStatus(savedCount);

    } catch (error) {
        if (error.name !== "AbortError") {
            console.error(
                "iPhone transcript export error:",
                error
            );
            alert(
                "Unable to save the transcripts to Files."
            );
        }
    }
}


async function createUniqueTranscriptFilename(
    transcriptionFolder,
    file,
    metadata,
    model,
    operation
) {

    const baseFilename =
        createTranscriptFilename(
            file,
            metadata,
            model,
            operation
        );

    // On iPhone, the actual Files destination is chosen later through
    // the iOS share sheet, so Memora must not perform its own filename
    // collision/version tracking.
    if (sourceHandle?.kind === "file-input") {
        return baseFilename;
    }

    const extension = ".txt";
    const stem =
        baseFilename.endsWith(extension)
            ? baseFilename.slice(0, -extension.length)
            : baseFilename;

    let version = 1;

    while (true) {

        const filename =
            version === 1
                ? `${stem}${extension}`
                : `${stem}-${version}${extension}`;

        const storage =
            await getStorageModule();

        if (
            await storage.fileExists(
                transcriptionFolder,
                filename
            )
        ) {

            version++;

        } else {

            return filename;
        }
    }
}


function createTranscriptFilename(
    file,
    metadata,
    model,
    operation
) {

    const date =
        metadata.recordingDate ||
        metadata.fileCreationDate;

    const baseName =
        file.name.replace(/\.[^.]+$/i, "");

    const modelSuffix =
        sanitizeFilename(model);

    const operationSuffix =
        operation === "translate"
            ? " - eng"
            : "";

    if (!date) {
        return (
            `${sanitizeFilename(baseName)} - ` +
            `${modelSuffix}${operationSuffix}.txt`
        );
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return (
        `${year}-${month}-${day} - ` +
        `${sanitizeFilename(baseName)} - ` +
        `${modelSuffix}${operationSuffix}.txt`
    );
}


function sanitizeFilename(name) {

    return name.replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_"
    );
}


// --------------------------------------------------
// Display transcription
// --------------------------------------------------

function appendTranscription(
    file,
    text
) {

    const block =
        document.createElement("div");

    block.className =
        "transcription-block";

    const heading =
        document.createElement("h3");

    heading.textContent =
        file.name;

    const paragraph =
        document.createElement("p");

    paragraph.textContent =
        text;

    block.appendChild(heading);
    block.appendChild(paragraph);

    transcriptionOutput.appendChild(
        block
    );
}


// --------------------------------------------------
// Metadata processing module
// --------------------------------------------------

let metadataModule = null;

async function readAudioMetadata(file) {

    if (!metadataModule) {
        metadataModule =
            await import("./metadata.js");
    }

    return metadataModule.readAudioMetadata(file);
}


function formatLanguageName(language) {

    const names = {
        en: "English",
        pt: "Portuguese",
        es: "Spanish",
        fr: "French",
        de: "German",
        sa: "Sanskrit"
    };

    return names[language] || language;
}


// --------------------------------------------------
// Formatting
// --------------------------------------------------

function formatRecordingDate(date) {

    if (!date) {
        return "Date unknown";
    }

    return new Intl.DateTimeFormat(
        "en-GB",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    )
        .format(date)
        .replace(",", " ·");
}


function formatDuration(
    duration,
    timescale
) {

    if (!duration || !timescale) {
        return "Duration unknown";
    }

    const totalSeconds =
        Math.round(
            duration / timescale
        );

    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const remainingSeconds =
        totalSeconds % 60;

    return (
        `${minutes}:` +
        `${String(
            remainingSeconds
        ).padStart(2, "0")}`
    );
}