// --------------------------------------------------
// Storage
// --------------------------------------------------
//
// Platform-specific file and folder access lives here.
//

export async function selectFolder() {

    

    if (window.showDirectoryPicker) {
        return window.showDirectoryPicker({
            mode: "readwrite"
        });
    }

    if ("webkitdirectory" in document.createElement("input")) {

        const input =
            document.getElementById("folderInput");

        if (!input) {
            throw new Error(
                "Folder input element was not found."
            );
        }

        const files = await new Promise((resolve, reject) => {

            input.addEventListener(
                "change",
                () => resolve(Array.from(input.files || [])),
                { once: true }
            );

            input.addEventListener(
                "cancel",
                () => reject(
                    new DOMException(
                        "The folder selection was cancelled.",
                        "AbortError"
                    )
                ),
                { once: true }
            );

            input.click();
        });

        return {
            kind: "file-input",
            name:
                files[0]?.webkitRelativePath?.split("/")[0] ||
                "Selected Folder",
            files
        };
    }

    throw new Error(
        "Folder selection is not supported by this browser."
    );
}


const TRANSCRIPT_DB_NAME = "Memora";
const TRANSCRIPT_DB_VERSION = 3;
const TRANSCRIPT_STORE_NAME = "transcripts";

function openTranscriptDatabase() {
    return new Promise((resolve, reject) => {
        const request =
            indexedDB.open(
                TRANSCRIPT_DB_NAME,
                TRANSCRIPT_DB_VERSION
            );

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(TRANSCRIPT_STORE_NAME)) {
                database.createObjectStore(
                    TRANSCRIPT_STORE_NAME,
                    { keyPath: "filename" }
                );
            }

            if (!database.objectStoreNames.contains("semanticEntries")) {
                const store = database.createObjectStore("semanticEntries", {
                    keyPath: "id"
                });
                store.createIndex("representationKey", "representationKey", {
                    unique: false
                });
                store.createIndex("sourceKey", "sourceKey", {
                    unique: false
                });
            }

            if (!database.objectStoreNames.contains("semanticMetadata")) {
                database.createObjectStore("semanticMetadata", { keyPath: "key" });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


export async function transcriptExists(filename) {
    const database =
        await openTranscriptDatabase();

    return new Promise((resolve, reject) => {
        const transaction =
            database.transaction(
                TRANSCRIPT_STORE_NAME,
                "readonly"
            );

        const store =
            transaction.objectStore(
                TRANSCRIPT_STORE_NAME
            );

        const request =
            store.getKey(filename);

        request.onsuccess = () => {
            resolve(request.result !== undefined);
        };

        request.onerror = () => {
            reject(request.error);
        };

        transaction.oncomplete = () => {
            database.close();
        };

        transaction.onerror = () => {
            reject(transaction.error);
        };
    });
}


export async function saveTranscriptRecord(
    filename,
    transcript,
    metadata,
    model,
    operation
) {
    const database =
        await openTranscriptDatabase();

    return new Promise((resolve, reject) => {
        const transaction =
            database.transaction(
                TRANSCRIPT_STORE_NAME,
                "readwrite"
            );

        const store =
            transaction.objectStore(
                TRANSCRIPT_STORE_NAME
            );

        store.put({
            filename,
            transcript,
            metadata,
            model,
            operation,
            savedAt: new Date()
        });

        transaction.oncomplete = () => {
            database.close();
            resolve();
        };

        transaction.onerror = () => {
            database.close();
            reject(transaction.error);
        };

        transaction.onabort = () => {
            database.close();
            reject(transaction.error);
        };
    });
}


export async function listAudioFiles(directoryHandle) {

    const audioExtensions =
        /\.(m4a|mp3|wav|webm|mp4|aiff|flac|ogg)$/i;

    if (directoryHandle?.kind === "file-input") {
        return directoryHandle.files.filter(
            file => audioExtensions.test(file.name)
        );
    }

    const files = [];

    for await (
        const [name, handle]
        of directoryHandle.entries()
    ) {

        if (
            handle.kind === "file" &&
            audioExtensions.test(name)
        ) {
            files.push(
                await handle.getFile()
            );
        }
    }

    return files;
}


export async function listTextFiles(directoryHandle) {

    const files = [];

    for await (
        const [name, handle]
        of directoryHandle.entries()
    ) {

        if (
            handle.kind === "file" &&
            /\.txt$/i.test(name)
        ) {
            files.push(
                await handle.getFile()
            );
        }
    }

    return files;
}


export async function getSubfolder(
    directoryHandle,
    name,
    create = false
) {

    return directoryHandle.getDirectoryHandle(
        name,
        { create }
    );
}


export async function writeTextFile(
    directoryHandle,
    filename,
    text
) {

    const fileHandle =
        await directoryHandle.getFileHandle(
            filename,
            { create: true }
        );

    const writable =
        await fileHandle.createWritable();

    try {
        await writable.write(text);
    } finally {
        await writable.close();
    }

    return fileHandle;
}




export async function readTextFile(directoryHandle, filename) {
    if (directoryHandle?.kind === "file-input") {
        const file =
            directoryHandle.files.find(
                candidate => candidate.name === filename
            );

        return file ? await file.text() : null;
    }

    try {
        const fileHandle =
            await directoryHandle.getFileHandle(filename);

        const file =
            await fileHandle.getFile();

        return await file.text();
    } catch (error) {
        if (error?.name === "NotFoundError") {
            return null;
        }
        throw error;
    }
}


export async function shareFile(file) {
    if (!navigator.share) {
        throw new Error(
            "This browser cannot share files to the Files app."
        );
    }

    if (
        navigator.canShare &&
        !navigator.canShare({ files: [file] })
    ) {
        throw new Error(
            "This browser cannot share this file to the Files app."
        );
    }

    await navigator.share({
        files: [file]
    });
}


export async function writeBinaryFile(
    directoryHandle,
    filename,
    data
) {

    const fileHandle =
        await directoryHandle.getFileHandle(
            filename,
            { create: true }
        );

    const writable =
        await fileHandle.createWritable();

    try {
        await writable.write(data);
    } finally {
        await writable.close();
    }

    return fileHandle;
}


export async function fileExists(
    directoryHandle,
    filename
) {

    try {

        await directoryHandle.getFileHandle(
            filename,
            { create: false }
        );

        return true;

    } catch (error) {

        if (error.name === "NotFoundError") {
            return false;
        }

        throw error;
    }
}
