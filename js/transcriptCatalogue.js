// TXT metadata is authoritative. This bounded local cache never grants access,
// supplies missing identities to existing files, or writes a folder sidecar.
import {readTranscriptFile} from './combine.js';
import {openMemoraDatabase} from './database.js';

const scopes = new WeakMap();
const emptyCollections = new WeakMap();
const STORE = 'transcriptCatalogues';
const MAX_CACHED_FOLDERS = 16;

function scope(source) {
    if (!scopes.has(source)) scopes.set(source, crypto.randomUUID());
    return scopes.get(source);
}

export async function listTranscriptCatalogueCache() {
    const db = await openMemoraDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const request = db.transaction(STORE).objectStore(STORE).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } finally { db.close(); }
}

export async function clearTranscriptCatalogueCache() {
    const db = await openMemoraDatabase();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).clear();
            tx.oncomplete = resolve;
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}

export async function cacheTranscriptMetadata(source, records) {
    const entry = {
        id: scope(source), folderName: source.name, updatedAt: Date.now(),
        records: records.map(record => ({
            filename: record.filename, recordingId: record.recordingId,
            archiveUuid: record.archiveUuid, whisperModel: record.whisperModel,
            operation: record.operation, recordingDate: record.recordingDate,
            duration: record.duration, audioRelativePath: record.audioRelativePath,
            recordingFilename: record.recordingFilename,
            originalAudioFolderName: record.originalAudioFolderName,
            size: record.file.size, lastModified: record.file.lastModified
        }))
    };
    const db = await openMemoraDatabase();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            store.put(entry);
            const request = store.getAll();
            request.onsuccess = () => {
                const recent = request.result.sort((a, b) => b.updatedAt - a.updatedAt ||
                    (a.id === entry.id ? -1 : b.id === entry.id ? 1 : 0));
                for (const old of recent.slice(MAX_CACHED_FOLDERS)) store.delete(old.id);
            };
            tx.oncomplete = resolve;
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}

export async function readTranscriptFolder(source, {onProgress, signal} = {}) {
    const files = [], records = [], issues = [];
    const check = () => {
        if (signal?.aborted) throw new DOMException('Reading cancelled.', 'AbortError');
    };
    if (source?.kind === 'file-input') {
        for (const file of source.files) {
            check();
            if (/\.txt$/i.test(file.name) && (!file.webkitRelativePath ||
                file.webkitRelativePath === `${source.name}/${file.name}`)) files.push(file);
        }
    } else if (source?.kind === 'directory') {
        for await (const [name, handle] of source.entries()) {
            check();
            if (handle.kind === 'file' && /\.txt$/i.test(name)) files.push(await handle.getFile());
        }
    } else throw Error('Select a transcript folder.');

    const names = new Set();
    for (const [index, file] of files.entries()) {
        check();
        const key = file.name.normalize('NFC').toLowerCase();
        if (names.has(key)) issues.push(`Conflicting transcript filename: ${file.name}`);
        names.add(key);
        try { records.push(await readTranscriptFile(file)); }
        catch (error) { issues.push(`${file.name}: ${error.message}`); }
        onProgress?.({completed: index + 1, total: files.length});
        if (index % 32 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    check();
    const ids = new Set(records.map(record => record.archiveUuid?.toLowerCase()).filter(Boolean));
    let cacheError = null;
    try { await cacheTranscriptMetadata(source, records); }
    catch (error) { cacheError = error.message; } // Cache availability never establishes identity.
    return {source, files: records.map(record => record.file), records, issues, cacheError,
        archiveUuid: ids.size === 1 ? records.find(record => record.archiveUuid).archiveUuid : null,
        complete: source.kind === 'directory' || source.selectionScope === 'folder'};
}

export async function openTranscriptCatalogue(source) {
    const snapshot = await readTranscriptFolder(source);
    if (snapshot.issues.length) throw Error(snapshot.issues.join(' '));
    const ids = new Set(snapshot.records.map(record => record.archiveUuid?.toLowerCase()).filter(Boolean));
    if (ids.size > 1) throw Error('Choose one transcript collection before adding new transcripts.');
    if (snapshot.records.some(record => !record.archiveUuid || !record.recordingId))
        throw Error('Existing transcripts need Recording ID and Archive UUID metadata before adding to this collection.');
    // Empty collections get a session identity here, written into their first TXT.
    // Clearing the metadata cache does not change the active collection identity.
    if (!snapshot.records.length && !emptyCollections.has(source))
        emptyCollections.set(source, crypto.randomUUID());
    return {archiveUuid: snapshot.archiveUuid || emptyCollections.get(source), snapshot};
}
