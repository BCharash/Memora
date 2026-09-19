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

            item.textContent =
                `${file.name} — ${metadata.date || "No date found"} — ${metadata.uuid || "No UUID found"}`;

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
                uuid: uuid
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