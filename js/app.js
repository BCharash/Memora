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

// Whisper model catalog. Keep the user-facing model names separate from
// the actual Transformers.js / Hugging Face repository names.
const MODEL_CATALOG = {
    tiny: {
        label: "Tiny",
        repository: "onnx-community/whisper-tiny"
    },
    base: {
        label: "Base",
        repository: "onnx-community/whisper-base"
    },
    small: {
        label: "Small",
        repository: "onnx-community/whisper-small"
    },
    medium: {
        label: "Medium",
        repository: "Xenova/whisper-medium",
        dtype: "q4"
    },
    "large-v3": {
        label: "Large-v3",
        repository: "Xenova/whisper-large-v3",
        dtype: {
            encoder_model: "fp16",
            decoder_model_merged: "q4"
        }
    }
};
const transcriptionStatus =
    document.getElementById("transcriptionStatus");
const transcriptionOutput =
    document.getElementById("transcriptionOutput");

let sourceHandle = null;
let destinationHandle = null;
let selectedFiles = [];
let transcriber = null;
let loadedModel = null;


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


async function updateTranscriptionFolderButton() {

    if (!sourceHandle) {
        transcriptionDestinationButton.textContent =
            'Create "transcription" Folder';
        return;
    }

    try {
        await sourceHandle.getDirectoryHandle(
            "transcription",
            { create: false }
        );

        transcriptionDestinationButton.textContent =
            'Use "transcription" Folder';

        destinationHandle =
            await sourceHandle.getDirectoryHandle(
                "transcription",
                { create: false }
            );

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
// Load Transformers.js
// --------------------------------------------------

let transformers = null;

async function loadTransformers() {

    if (transformers) {
        return transformers;
    }

    transcriptionStatus.textContent =
        "Loading transcription engine…";

    transformers = await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0"
    );

    return transformers;
}


// --------------------------------------------------
// Source / destination
// --------------------------------------------------

sourceButton.addEventListener("click", async () => {

    if (!window.showDirectoryPicker) {
        alert("Folder selection is not supported by this browser.");
        return;
    }

    try {

        sourceHandle =
            await window.showDirectoryPicker({
                mode: "readwrite"
            });

        destinationHandle = null;

        setActiveDestinationButton(null);

        const files = [];

        for await (const [name, handle] of sourceHandle.entries()) {

            if (
                handle.kind === "file" &&
                /\.m4a$/i.test(name)
            ) {
                const file = await handle.getFile();
                files.push(file);
            }
        }

        if (files.length === 0) {

            showEmptyMessage();

            sourceButton.textContent =
                `Source: ${sourceHandle.name}`;

            await updateTranscriptionFolderButton();

            alert(
                "No M4A recordings were found in this folder."
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

        destinationHandle =
            await sourceHandle.getDirectoryHandle(
                "transcription",
                {
                    create: true
                }
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

    if (!window.showDirectoryPicker) {
        alert("Folder selection is not supported by this browser.");
        return;
    }

    try {

        destinationHandle =
            await window.showDirectoryPicker({
                mode: "readwrite"
            });

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
                await readM4AMetadata(file);

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

            await loadTranscriber(model);

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

                const audio =
                    await decodeAudio(file);

                const result =
                    await transcriber(audio, {
                        chunk_length_s: 30,
                        stride_length_s: 5
                    });

                const metadata =
                    await readM4AMetadata(file);

                const transcript =
                    buildTranscript(
                        file,
                        metadata,
                        result.text
                    );

                await saveTranscript(
                    transcriptionFolder,
                    file,
                    metadata,
                    transcript,
                    model
                );

                appendTranscription(
                    file,
                    result.text
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
// Whisper model
// --------------------------------------------------

async function loadTranscriber(model) {

    if (
        transcriber &&
        loadedModel === model
    ) {
        return;
    }

    const {
        pipeline
    } = await loadTransformers();

    const modelInfo =
        MODEL_CATALOG[model];

    if (!modelInfo) {
        throw new Error(
            `Unknown Whisper model: ${model}`
        );
    }

    setTranscriptionBusy(
        `Loading Whisper ${modelInfo.label} using WebGPU…`
    );

    try {

        const pipelineOptions = {
                device: "webgpu"
            };

            if (modelInfo.dtype) {
                pipelineOptions.dtype =
                    modelInfo.dtype;
            }

            transcriber =
                await pipeline(
                    "automatic-speech-recognition",
                    modelInfo.repository,
                    pipelineOptions
                );

    } catch (error) {

        throw new Error(
            `Unable to load Whisper ${modelInfo.label}. ` +
            `The model may no longer be available or compatible. ` +
            `(${modelInfo.repository})`
        );
    }

    loadedModel = model;

    setTranscriptionComplete(
        `Whisper ${model} loaded using WebGPU.`
    );
}


// --------------------------------------------------
// Audio decoding
// --------------------------------------------------

async function decodeAudio(file) {

    const arrayBuffer =
        await file.arrayBuffer();

    const audioContext =
        new AudioContext();

    const audioBuffer =
        await audioContext.decodeAudioData(
            arrayBuffer
        );

    const source =
        audioBuffer.getChannelData(0);

    const sourceSampleRate =
        audioBuffer.sampleRate;

    const targetSampleRate =
        16000;

    if (
        sourceSampleRate ===
        targetSampleRate
    ) {

        await audioContext.close();

        return source;
    }

    const targetLength =
        Math.ceil(
            source.length *
            targetSampleRate /
            sourceSampleRate
        );

    const offlineContext =
        new OfflineAudioContext(
            1,
            targetLength,
            targetSampleRate
        );

    const buffer =
        offlineContext.createBuffer(
            1,
            source.length,
            sourceSampleRate
        );

    buffer.copyToChannel(
        source,
        0
    );

    const sourceNode =
        offlineContext.createBufferSource();

    sourceNode.buffer =
        buffer;

    sourceNode.connect(
        offlineContext.destination
    );

    sourceNode.start();

    const resampledBuffer =
        await offlineContext.startRendering();

    await audioContext.close();

    return resampledBuffer.getChannelData(0);
}


// --------------------------------------------------
// Build transcript file
// --------------------------------------------------

function buildTranscript(
    file,
    metadata,
    text
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
        `Voice Memo ID: ${metadata.uuid || "Unknown"}\n\n` +
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

    const outputFile =
        await transcriptionFolder.getFileHandle(
            filename,
            {
                create: true
            }
        );

    const writable =
        await outputFile.createWritable();

    await writable.write(
        transcript
    );

    await writable.close();
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

        try {
            await transcriptionFolder.getFileHandle(
                filename,
                { create: false }
            );

            version++;

        } catch (error) {

            if (error.name === "NotFoundError") {
                return filename;
            }

            throw error;
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
        file.name.replace(/\.m4a$/i, "");

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
// M4A metadata
// --------------------------------------------------

async function readM4AMetadata(file) {

    const arrayBuffer =
        await file.arrayBuffer();

    const uuid =
        extractVoiceMemoUUID(
            arrayBuffer
        );

    const mp4boxFile =
        MP4Box.createFile();

    return new Promise(
        (resolve, reject) => {

            mp4boxFile.onReady =
                (info) => {

                    console.log(
                        "MP4Box info:",
                        info
                    );

                    resolve({
                        date:
                            info.created ||
                            null,

                        uuid:
                            uuid,

                        duration:
                            info.duration ||
                            null,

                        durationTimescale:
                            info.timescale ||
                            null
                    });
                };

            mp4boxFile.onError =
                (error) => {

                    reject(error);
                };

            arrayBuffer.fileStart = 0;

            mp4boxFile.appendBuffer(
                arrayBuffer
            );

            mp4boxFile.flush();
        }
    );
}


function extractVoiceMemoUUID(
    arrayBuffer
) {

    const bytes =
        new Uint8Array(
            arrayBuffer
        );

    const text =
        new TextDecoder(
            "latin1"
        ).decode(bytes);

    const marker =
        "voice-memo-uuid";

    const markerIndex =
        text.indexOf(marker);

    if (markerIndex === -1) {
        return null;
    }

    const searchArea =
        text.slice(
            markerIndex,
            markerIndex + 200
        );

    const uuidMatch =
        searchArea.match(
            /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/
        );

    return uuidMatch ?
        uuidMatch[0] :
        null;
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