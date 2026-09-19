const sourceButton = document.getElementById("sourceButton");
const fileInput = document.getElementById("fileInput");
const recordings = document.getElementById("recordings");

sourceButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        recordings.innerHTML = `
            <p class="empty-message">
                No recordings selected.
            </p>
        `;
        return;
    }

    recordings.innerHTML = "";

    for (const file of files) {
        const item = document.createElement("div");
        item.className = "recording-item";
        item.textContent = `Reading ${file.name}…`;
        recordings.appendChild(item);

        try {
            const metadata = await readM4AMetadata(file);

            const name = document.createElement("div");
                name.className = "recording-name";
                name.textContent = file.name;

                const details = document.createElement("div");
                details.className = "recording-details";
                details.textContent =
                    `${formatRecordingDate(metadata.date)} · ${formatDuration(metadata.duration, metadata.durationTimescale)}`;

                item.textContent = "";
                item.appendChild(name);
                item.appendChild(details);

                console.log(file.name, metadata);
        } catch (error) {
            console.error("Metadata error:", error);

            item.textContent =
                `${file.name} — Unable to read metadata`;
        }
    }
});


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
    }).format(date);
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