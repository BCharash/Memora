import {cachedTranscriptRecord,transcriptFilenameKey} from './transcriptCacheIdentity.js';
import { askIdentity } from "./identityDialog.js";
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
            const cleanup=()=>{input.removeEventListener('change',changed);input.removeEventListener('cancel',cancelled);};
            const cancelled=()=>{cleanup();reject(new DOMException('The folder selection was cancelled.','AbortError'));};
            const changed=()=>{const selected=Array.from(input.files||[]);cleanup();if(selected.length)resolve(selected);else reject(new DOMException('No folder files were supplied.','AbortError'));};
            input.addEventListener('change',changed);
            input.addEventListener('cancel',cancelled);
            input.value=''; // Reselecting the same folder must produce a new snapshot.
            input.click();
        });

        return {
            kind: "file-input",
            // Folder coverage and write access are separate capabilities.
            selectionScope: input.webkitdirectory ? "folder" : "selection",
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

export async function transcriptExists(filename,{archiveUuid=null}={}) {
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

            const request = archiveUuid
                ? store.index('archiveFilename').getKey([archiveUuid.toLowerCase(),transcriptFilenameKey(filename)])
                : store.index('filenameKey').getKey(transcriptFilenameKey(filename));

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

            store.put(cachedTranscriptRecord({filename,transcript,metadata,model,operation,savedAt:new Date()}));

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
            file => audioExtensions.test(file.name) &&
                (!file.webkitRelativePath || file.webkitRelativePath === `${directoryHandle.name}/${file.name}`)
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
        await writable.close();
    } catch (error) {
        try { await writable.abort(); } catch { /* Preserve original write error. */ }
        throw error;
    }

    return fileHandle;
}




export async function readTextFile(directoryHandle, filename) {
    if (directoryHandle?.kind === "file-input") {
        const file =
            directoryHandle.files.find(
                candidate => candidate.name === filename &&
                    (!candidate.webkitRelativePath || candidate.webkitRelativePath === `${directoryHandle.name}/${filename}`)
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


export async function shareFiles(files, guidance) {
    if (!navigator.share) {
        throw new Error(
            "This browser cannot share files to the Files app."
        );
    }

    if (
        navigator.canShare &&
        !navigator.canShare({ files })
    ) {
        throw new Error(
            "This browser cannot share this file to the Files app."
        );
    }

    if (guidance && navigator.userActivation?.isActive === false) {
        const answer = await askIdentity({
            title: "Save to Files",
            message: guidance,
            choices: [
                { action: "share", label: "Open Share Sheet", run: () => navigator.share({ files }) },
                { action: "cancel", label: "Cancel" }
            ]
        });
        if (answer.action !== "share") throw new DOMException("Save canceled.", "AbortError");
        return;
    }
    await navigator.share({ files });
}

export function shareFile(file, guidance) {
    return shareFiles([file], guidance);
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

export async function deleteModelRegistryRecords(ids) {
    if(!ids.length)return;
    const database=await openTranscriptDatabase();
    try{await new Promise((resolve,reject)=>{
        const tx=database.transaction(MODEL_REGISTRY_STORE_NAME,'readwrite');
        for(const id of ids)tx.objectStore(MODEL_REGISTRY_STORE_NAME).delete(id);
        tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('Unable to clear model registry cache.'));
    });}finally{database.close();}
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
