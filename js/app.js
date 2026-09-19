const sourceButton = document.getElementById("sourceButton");
const destinationButton = document.getElementById("destinationButton");
const fileInput = document.getElementById("fileInput");
const recordings = document.getElementById("recordings");

let destinationHandle = null;


sourceButton.addEventListener("click", () => {
    fileInput.click();
});


destinationButton.addEventListener("click", async () => {

    if (!window.showDirectoryPicker) {
        alert("Folder selection is not supported by this browser.");
        return;
    }

    try {
        destinationHandle = await window.showDirectoryPicker();

        destinationButton.textContent =
            `Destination: ${destinationHandle.name}`;

    } catch (error) {
        if (error.name !== "AbortError") {
            console.error("Destination error:", error);

            alert("Unable to select the destination folder.");
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


async function displayFiles(files) {

    recordings.innerHTML = "";

    const selectAllRow = document.createElement("div");
    selectAllRow.className = "recording-select-all";

    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = true;
    selectAllCheckbox.id = "selectAllRecordings";

    const selectAllLabel = document.createElement("label");
    selectAllLabel.htmlFor = "selectAllRecordings";
    selectAllLabel.textContent = "Select all";

    selectAllRow.appendChild(selectAllCheckbox);
    selectAllRow.appendChild(selectAllLabel);

    recordings.appendChild(selectAllRow);

    const recordingCheckboxes = [];

    for (const file of files) {

        const item = document.createElement("div");
        item.className = "recording-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.className = "recording-checkbox";

        recordingCheckboxes.push(checkbox);

        const content = document.createElement("div");
        content.className = "recording-content";

        const name = document.createElement("div");
        name.className = "recording-name";
        name.textContent = file.name;

        const details = document.createElement("div");
        details.className = "recording-details";
        details.textContent = "Reading metadata…";

        content.appendChild(name);
        content.appendChild(details);

        item.appendChild(checkbox);
        item.appendChild(content);

        recordings.appendChild(item);

        try {

            const metadata = await readM4AMetadata(file);

            details.textContent =
                `${formatRecordingDate(metadata.date)} · ` +
                `${formatDuration(metadata.duration, metadata.durationTimescale)}`;

            console.log(file.name, metadata);

        } catch (error) {

            console.error("Metadata error:", error);

            details.textContent =
                "Unable to read metadata";
        }
    }

    selectAllCheckbox.addEventListener("change", () => {
        recordingCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    });

    recordingCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            selectAllCheckbox.checked =
                recordingCheckboxes.every(checkbox => checkbox.checked);
        });
    });
}


function showEmptyMessage() {

    recordings.innerHTML = `
        <p class="empty-message">
            No recordings selected.
        </p>
    `;
}


async function readM4AMetadata(file) {

    const arrayBuffer = await file.arrayBuffer();

    const uuid = extractVoiceMemoUUID(arrayBuffer);

    const mp4boxFile = MP4Box.createFile();

    return new Promise((resolve, reject) => {

        mp4boxFile.onReady = (info) => {

            console.log("MP4Box info:", info);

            resolve({
                date: info.created || null,
                uuid: uuid,
                duration: info.duration || null,
                durationTimescale: info.timescale || null
            });
        };

        mp4boxFile.onError = (error) => {
            reject(error);
        };

        arrayBuffer.fileStart = 0;
        mp4boxFile.appendBuffer(arrayBuffer);
        mp4boxFile.flush();
    });
}


function extractVoiceMemoUUID(arrayBuffer) {

    const bytes = new Uint8Array(arrayBuffer);

    const text = new TextDecoder("latin1").decode(bytes);

    const marker = "voice-memo-uuid";
    const markerIndex = text.indexOf(marker);

    if (markerIndex === -1) {
        return null;
    }

    const searchArea = text.slice(
        markerIndex,
        markerIndex + 200
    );

    const uuidMatch = searchArea.match(
        /[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/
    );

    return uuidMatch ? uuidMatch[0] : null;
}


function formatRecordingDate(date) {

    if (!date) {
        return "Date unknown";
    }

    return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date).replace(",", " ·");
}


function formatDuration(duration, timescale) {

    if (!duration || !timescale) {
        return "Duration unknown";
    }

    const totalSeconds = Math.round(duration / timescale);

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}