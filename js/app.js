const sourceButton = document.getElementById("sourceButton");
const destinationButton = document.getElementById("destinationButton");
const fileInput = document.getElementById("fileInput");
const recordings = document.getElementById("recordings");

const modelSelect = document.getElementById("modelSelect");
const transcribeButton = document.getElementById("transcribeButton");
const transcriptionStatus =
    document.getElementById("transcriptionStatus");
const transcriptionOutput =
    document.getElementById("transcriptionOutput");

let destinationHandle = null;
let selectedFiles = [];
let transcriber = null;
let loadedModel = null;


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

sourceButton.addEventListener("click", () => {
    fileInput.click();
});


destinationButton.addEventListener("click", async () => {

    if (!window.showDirectoryPicker) {
        alert("Folder selection is not supported by this browser.");
        return;
    }

    try {

        destinationHandle =
            await window.showDirectoryPicker();

        destinationButton.textContent =
            `Destination: ${destinationHandle.name}`;

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


fileInput.addEventListener("change", async () => {

    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        showEmptyMessage();
        return;
    }

    await displayFiles(files);
});


// --------------------------------------------------
// Display recordings
// --------------------------------------------------

async function displayFiles(files) {

    recordings.innerHTML = "";

    selectedFiles = files;

    const selectAllRow =
        document.createElement("div");

    selectAllRow.className =
        "recording-select-all";

    const selectAllCheckbox =
        document.createElement("input");

    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = true;
    selectAllCheckbox.id = "selectAllRecordings";

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

    const recordingCheckboxes = [];

    for (const file of files) {

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

        details.textContent =
            "Reading metadata…";

        content.appendChild(name);
        content.appendChild(details);

        item.appendChild(checkbox);
        item.appendChild(content);

        recordings.appendChild(item);

        try {

            const metadata =
                await readM4AMetadata(file);

            details.textContent =
                `${formatRecordingDate(metadata.date)} · ` +
                `${formatDuration(
                    metadata.duration,
                    metadata.durationTimescale
                )}`;

            console.log(
                file.name,
                metadata
            );

        } catch (error) {

            console.error(
                "Metadata error:",
                error
            );

            details.textContent =
                "Unable to read metadata";
        }
    }

    selectAllCheckbox.addEventListener(
        "change",
        () => {

            recordingCheckboxes.forEach(
                checkbox => {

                    checkbox.checked =
                        selectAllCheckbox.checked;
                }
            );
        }
    );

    recordingCheckboxes.forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    selectAllCheckbox.checked =
                        recordingCheckboxes.every(
                            checkbox =>
                                checkbox.checked
                        );
                }
            );
        }
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
                await destinationHandle.getDirectoryHandle(
                    "transcription",
                    {
                        create: true
                    }
                );

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
                    transcript
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

    const modelName =
        `onnx-community/whisper-${model}`;

    setTranscriptionBusy(
        `Loading Whisper ${model} using WebGPU…`
    );

    transcriber =
        await pipeline(
            "automatic-speech-recognition",
            modelName,
            {
                device: "webgpu"
            }
        );

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
    transcript
) {

    const filename =
        createTranscriptFilename(
            file,
            metadata
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


function createTranscriptFilename(
    file,
    metadata
) {

    const date =
        metadata.date;

    if (!date) {

        return (
            sanitizeFilename(
                file.name.replace(
                    /\.m4a$/i,
                    ""
                )
            ) +
            ".txt"
        );
    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    const hours =
        String(
            date.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            date.getMinutes()
        ).padStart(2, "0");

    const baseName =
        file.name.replace(
            /\.m4a$/i,
            ""
        );

    return (
        `${year}-${month}-${day} ` +
        `${hours}-${minutes} - ` +
        `${sanitizeFilename(baseName)}.txt`
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