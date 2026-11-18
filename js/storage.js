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


import { openMemoraDatabase as openTranscriptDatabase } from "./database.js";

const TRANSCRIPT_STORE_NAME = "transcripts";
const MODEL_REGISTRY_STORE_NAME = "modelRegistry";

export async function transcriptExists(filename) {
    const database =
        await openTranscriptDatabase();
    try {

        return await new Promise((resolve, reject) => {
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

            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
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
    try {

        return await new Promise((resolve, reject) => {
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
    } finally {
        database.close();
    }
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

// --------------------------------------------------
// Model Registry
// --------------------------------------------------

export async function listModelRegistryRecords() {
    const database = await openTranscriptDatabase();
    try {

        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(
                MODEL_REGISTRY_STORE_NAME,
                "readonly"
            );
            const store = transaction.objectStore(MODEL_REGISTRY_STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => database.close();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
}

export async function saveModelRegistryRecords(records) {
    const database = await openTranscriptDatabase();
    try {

        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(
                MODEL_REGISTRY_STORE_NAME,
                "readwrite"
            );
            const store = transaction.objectStore(MODEL_REGISTRY_STORE_NAME);

            try {
                for (const record of records) store.put(record);
            } catch (error) {
                transaction.abort();
                reject(error);
                return;
            }

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
    } finally {
        database.close();
    }
}

export async function clearModelRegistry() {
    const database = await openTranscriptDatabase();
    try {

        return await new Promise((resolve, reject) => {
            const transaction = database.transaction(
                MODEL_REGISTRY_STORE_NAME,
                "readwrite"
            );
            transaction.objectStore(MODEL_REGISTRY_STORE_NAME).clear();

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
    } finally {
        database.close();
    }
}


// Isolated recording-list I/O for checkpoint 2B. These functions do not select
// folders, prompt for permission, share files or change production call sites.
export const AUDIO_SOURCE_FILENAME = 'memora-audio-source.json';
export async function readAudioSourceBytes(file, maxBytes) {
    if (!Number.isSafeInteger(file?.size) || file.size < 0 || file.size > maxBytes) {
        throw Object.assign(new Error('The recording list exceeds the supported JSON size. Select another copy.'), { code: 'source-size' });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== file.size || bytes.length > maxBytes) throw new Error('The recording list could not be read completely.');
    return bytes;
}
export async function discoverAudioSourceFile(source, maxBytes) {
    try {
        if (source?.kind === 'file-input') {
            // A filtered/incomplete selection cannot establish absence. Only an
            // exact root-relative match counts; nested same-name JSON is ignored.
            const files = source.files.filter(file => file.name === AUDIO_SOURCE_FILENAME &&
                (!file.webkitRelativePath || file.webkitRelativePath === `${source.name}/${AUDIO_SOURCE_FILENAME}`));
            if (files.length > 1) return { status: 'ambiguous', bytes: null };
            if (!files.length) return { status: 'not-included', bytes: null };
            return { status: 'found', bytes: await readAudioSourceBytes(files[0], maxBytes) };
        }
        if (source?.kind !== 'directory') throw new TypeError('Select an audio source folder.');
        let handle;
        try { handle = await source.getFileHandle(AUDIO_SOURCE_FILENAME); }
        catch (error) { if (error.name === 'NotFoundError') return { status: 'absent', bytes: null }; throw error; }
        return { status: 'found', bytes: await readAudioSourceBytes(await handle.getFile(), maxBytes) };
    } catch (error) {
        return { status: error?.code === 'source-size' ? 'size-limited' : ['NotAllowedError','SecurityError'].includes(error?.name) ? 'permission-denied' : 'read-failed', bytes: null, error };
    }
}
export async function writeAudioSourceFile(source, bytes) {
    if (source?.kind !== 'directory') throw new TypeError('This source does not provide a writable folder.');
    const handle = await source.getFileHandle(AUDIO_SOURCE_FILENAME, { create: true });
    const writable = await handle.createWritable();
    try { await writable.write(bytes); await writable.close(); }
    catch (error) {
        // Do not close (and publish partial contents) after a failed write.
        try { await writable.abort(); } catch { /* Recovery copy remains pending. */ }
        throw error;
    }
}
export async function resolveAudioSourceHandle(source, relativePath) {
    if (source?.kind !== 'directory' || typeof relativePath !== 'string' ||
        relativePath.split('/').some(part => !part || part === '.' || part === '..' || /[\\:\x00-\x1f\x7f]/.test(part) || /[. ]$/.test(part))) {
        throw new TypeError('A safe audio path and source folder are required.');
    }
    const parts = relativePath.split('/'); let folder = source;
    for (const part of parts.slice(0,-1)) folder = await folder.getDirectoryHandle(part);
    return folder.getFileHandle(parts.at(-1));
}
