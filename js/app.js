const sourceButton = document.getElementById("sourceButton");
const destinationButton = document.getElementById("destinationButton");
const sourceDestinationButton =
    document.getElementById("sourceDestinationButton");
const transcriptionDestinationButton =
    document.getElementById("transcriptionDestinationButton");

const fileInput = document.getElementById("fileInput");
const recordings = document.getElementById("recordings");

const modelSelect = document.getElementById("modelSelect");
const transcribeButton = document.getElementById("transcribeButton");

const transcriptionStatus =
    document.getElementById("transcriptionStatus");
const transcriptionOutput =
    document.getElementById("transcriptionOutput");

const transcriptionTab =
    document.getElementById("transcriptionTab");

const combineTab =
    document.getElementById("combineTab");

const transcriptionPanel =
    document.getElementById("transcriptionPanel");

const combinePanel =
    document.getElementById("combinePanel");

const textSourceButton =
    document.getElementById("textSourceButton");

const transcripts =
    document.getElementById("transcripts");

const combineSourceDestinationButton =
    document.getElementById("combineSourceDestinationButton");

const combineFolderDestinationButton =
    document.getElementById("combineFolderDestinationButton");

const combineDestinationButton =
    document.getElementById("combineDestinationButton");

const combineTextButton =
    document.getElementById("combineTextButton");

const combineHTMLButton =
    document.getElementById("combineHTMLButton");

const combineDOCXButton =
    document.getElementById("combineDOCXButton");

const combineStatus =
    document.getElementById("combineStatus");

const combineTitleInput =
    document.getElementById("combineTitleInput");

let sourceHandle = null;
let destinationHandle = null;
let selectedFiles = [];

let textSourceHandle = null;
let combineDestinationHandle = null;
let selectedTranscriptFiles = [];
let combineSortOrder = "date-desc";


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
            'Create "Combined" Folder';
        return;
    }

    try {

        const storage =
            await getStorageModule();

        await storage.getSubfolder(
            textSourceHandle,
            "Combined",
            false
        );

        combineFolderDestinationButton.textContent =
            'Use "Combined" Folder';

    } catch (error) {

        if (error.name === "NotFoundError") {
            combineFolderDestinationButton.textContent =
                'Create "Combined" Folder';
        } else {
            console.error(
                "Unable to check Combined folder:",
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

let storageModule = null;

async function getStorageModule() {

    if (!storageModule) {
        storageModule =
            await import("./storage.js");
    }

    return storageModule;
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
// Source / destination
// --------------------------------------------------

sourceButton.addEventListener("click", async () => {

    try {

        const storage =
            await getStorageModule();

        sourceHandle =
            await storage.selectFolder();

        destinationHandle = null;

        setActiveDestinationButton(null);

        const files =
            await storage.listAudioFiles(
                sourceHandle
            );

        if (files.length === 0) {

            showEmptyMessage();

            sourceButton.textContent =
                `Source: ${sourceHandle.name}`;

            await updateTranscriptionFolderButton();

            alert(
                "No audio recordings were found in this folder."
            );

            return;
        }

        sourceButton.textContent =
            `Source: ${sourceHandle.name}`;

        await updateTranscriptionFolderButton();

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


sourceDestinationButton.addEventListener("click", () => {

    if (!sourceHandle) {
        alert("Please select a source folder first.");
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

    recordings.appendChild(controls);

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

    recordings.appendChild(
        selectAllRow
    );

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

                const aTime =
                    a.metadata &&
                    a.metadata.date
                        ? a.metadata.date.getTime()
                        : null;

                const bTime =
                    b.metadata &&
                    b.metadata.date
                        ? b.metadata.date.getTime()
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

        recordings.innerHTML = "";

        recordings.appendChild(
            controls
        );

        recordings.appendChild(
            selectAllRow
        );

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

                details.textContent =
                    `${formatRecordingDate(entry.metadata.date)} · ` +
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

            recordings.appendChild(item);
        }

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
                                checkbox =>
                                    checkbox.checked
                            );
                    };
            }
        );
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

    selectedFiles = [];
}


// --------------------------------------------------
// Transcription
// --------------------------------------------------

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

        if (!destinationHandle) {

            alert(
                "Please select a destination folder first."
            );

            return;
        }

        try {

            transcribeButton.disabled = true;

            transcriptionOutput.textContent = "";

            const model =
                modelSelect.value;

            const transcriptionFolder =
                destinationHandle;

            for (
                let i = 0;
                i < filesToTranscribe.length;
                i++
            ) {

                const file =
                    filesToTranscribe[i];

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
                        setTranscriptionBusy
                    );

                const transcript =
                    buildTranscript(
                        record.file,
                        record.metadata,
                        record.transcript,
                        record.model
                    );

                await saveTranscript(
                    transcriptionFolder,
                    record.file,
                    record.metadata,
                    transcript,
                    record.model
                );

                appendTranscription(
                    record.file,
                    record.transcript
                );
            }

            setTranscriptionComplete(
                "Transcription complete."
            );

        } catch (error) {

            console.error(
                "Transcription error:",
                error
            );

            setTranscriptionError(
                error.message ||
                String(error)
            );

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
                ".recording-checkbox"
            )
        );

    return selectedFiles.filter(
        file => {

            const checkbox =
                checkboxes.find(
                    checkbox =>
                        checkbox.dataset.filename ===
                        file.name
                );

            return checkbox &&
                checkbox.checked;
        }
    );
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

if (transcriptionTab && combineTab) {

    transcriptionTab.addEventListener(
        "click",
        () => {

            transcriptionPanel.hidden = false;
            combinePanel.hidden = true;

            transcriptionTab.classList.add("active");
            combineTab.classList.remove("active");

            transcriptionTab.setAttribute(
                "aria-selected",
                "true"
            );

            combineTab.setAttribute(
                "aria-selected",
                "false"
            );
        }
    );


    combineTab.addEventListener(
        "click",
        () => {

            transcriptionPanel.hidden = true;
            combinePanel.hidden = false;

            combineTab.classList.add("active");
            transcriptionTab.classList.remove("active");

            combineTab.setAttribute(
                "aria-selected",
                "true"
            );

            transcriptionTab.setAttribute(
                "aria-selected",
                "false"
            );
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

                const files =
                    await storage.listTextFiles(
                        textSourceHandle
                    );

                selectedTranscriptFiles =
                    files;

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
                        "Combined",
                        true
                    );

                combineFolderDestinationButton.textContent =
                    'Use "Combined" Folder';

                setActiveCombineDestinationButton(
                    combineFolderDestinationButton
                );

            } catch (error) {

                console.error(
                    "Combined folder error:",
                    error
                );

                combineStatus.textContent =
                    "Unable to access the Combined folder.";
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

        transcripts.innerHTML = "";

        transcripts.appendChild(
            controls
        );

                transcripts.appendChild(
                    selectAllRow
                );

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

                    transcripts.appendChild(item);
                }

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
                            };
                    }
                );
    }

    render("date-desc");

    sortSelect.addEventListener(
        "change",
        () => render(sortSelect.value)
    );
}


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

    if (!combineDestinationHandle) {

        combineStatus.textContent =
            "Please select an output folder first.";

        return;
    }

    try {

        combineTextButton.disabled = true;
        combineDOCXButton.disabled = true;
        combineHTMLButton.disabled = true;

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

        const storage =
            await getStorageModule();

        if (outputType === "text") {

            const combinedText =
                combineModule.combineTranscriptRecords(
                    selectedRecords,
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
                    selectedRecords,
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

            const combinedHTML =
                html.createCombinedHTML(
                    selectedRecords,
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

    } finally {

        combineTextButton.disabled = false;
        combineDOCXButton.disabled = false;
        combineHTMLButton.disabled = false;
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


// --------------------------------------------------
// Whisper model
// --------------------------------------------------



// --------------------------------------------------
// Audio processing module
// --------------------------------------------------

let audioProcessor = null;



// --------------------------------------------------
// Build transcript file
// --------------------------------------------------

function buildTranscript(
    file,
    metadata,
    text,
    model
) {

    const date =
        formatRecordingDate(metadata.date);

    const duration =
        formatDuration(
            metadata.duration,
            metadata.durationTimescale
        );

    return (
        `${file.name}\n\n` +
        `Recording date: ${date}\n` +
        `Duration: ${duration}\n` +
        `Voice Memo ID: ${metadata.uuid || "Unknown"}\n` +
        `Whisper model: ${model}\n\n` +
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
    model
) {

    const filename =
        await createUniqueTranscriptFilename(
            transcriptionFolder,
            file,
            metadata,
            model
        );

    const storage =
        await getStorageModule();

    await storage.writeTextFile(
        transcriptionFolder,
        filename,
        transcript
    );
}


async function createUniqueTranscriptFilename(
    transcriptionFolder,
    file,
    metadata,
    model
) {

    const baseFilename =
        createTranscriptFilename(
            file,
            metadata,
            model
        );

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
    model
) {

    const date = metadata.date;

    const baseName =
        file.name.replace(/\.[^.]+$/i, "");

    const modelSuffix =
        sanitizeFilename(model);

    if (!date) {
        return (
            `${sanitizeFilename(baseName)} - ` +
            `${modelSuffix}.txt`
        );
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return (
        `${year}-${month}-${day} ` +
        `${hours}-${minutes} - ` +
        `${sanitizeFilename(baseName)} - ` +
        `${modelSuffix}.txt`
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