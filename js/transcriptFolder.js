import { readTranscriptFile, readTranscriptSourceText } from './combine.js';
import { archiveLock, parseTranscriptArchive, TRANSCRIPT_ARCHIVE_FILENAME } from './transcriptArchive.js';
import { readAudioSourceBytes, writeTextFile } from './storage.js';
import { AUDIO_SOURCE_LIMITS } from './audioSourceIdentity.js';
import { transcriptHeader } from './transcriptMetadata.js';

const decoder = new TextDecoder('utf-8', { fatal: true });
const atRoot = (source, file) => !file.webkitRelativePath || file.webkitRelativePath === `${source.name}/${file.name}`;

// A single inventory/read pass, independent of the embedding runtime. A
// successful folder picker provides complete coverage even without write access.
// Explicit file selections without that coverage remain partial.
export async function readTranscriptFolder(source, { signal, onProgress } = {}) {
    const files = [], records = [], issues = [];
    let archiveFile = null;
    const check = () => { if (signal?.aborted) throw new DOMException('Folder reading cancelled.', 'AbortError'); };
    if (source?.kind === 'file-input') {
        for (const file of source.files) {
            check();
            if (!atRoot(source, file)) continue;
            if (file.name === TRANSCRIPT_ARCHIVE_FILENAME) {
                if (archiveFile) issues.push('More than one transcript file list was selected.');
                archiveFile = file;
            } else if (/\.txt$/i.test(file.name)) files.push(file);
        }
    } else if (source?.kind === 'directory') {
        // Enumeration errors escape: an unfinished inventory must never prune.
        for await (const [name, handle] of source.entries()) {
            check();
            if (handle.kind !== 'file' || (!/\.txt$/i.test(name) && name !== TRANSCRIPT_ARCHIVE_FILENAME)) continue;
            try {
                const file = await handle.getFile();
                if (name === TRANSCRIPT_ARCHIVE_FILENAME) archiveFile = file;
                else files.push(file);
            } catch (error) { issues.push(`${name}: ${error.message}`); }
        }
    } else throw Error('Select a transcript folder first.');

    let manifest = null, originalText = null;
    if (archiveFile) {
        try {
            originalText = decoder.decode(await readAudioSourceBytes(archiveFile, AUDIO_SOURCE_LIMITS.jsonBytes));
            manifest = parseTranscriptArchive(originalText);
        } catch (error) { issues.push(`${TRANSCRIPT_ARCHIVE_FILENAME}: ${error.message}`); }
    }
    for (const [index, file] of files.entries()) {
        check();
        try {
            const record = await readTranscriptFile(file);
            records.push(record);
            const header = transcriptHeader(await readTranscriptSourceText(file)).text;
            const operations = header.split(/\r?\n/).filter(line => line.startsWith('Operation:')).map(line => line.slice(10).trim().toLowerCase());
            const models = header.split(/\r?\n/).filter(line => line.startsWith('Whisper model:'));
            if (operations.length !== 1 || !['transcribe', 'translate'].includes(operations[0]) || models.length !== 1)
                issues.push(`${file.name}: model or operation metadata needs inspection.`);
        }
        catch (error) { issues.push(`${file.name}: ${error.message}`); }
        onProgress?.({ completed: index + 1, total: files.length });
        if ((index + 1) % 40 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    check();
    return { source, files: records.map(record => record.file), records, manifest, originalText,
        issues, complete: (source.kind === 'directory' || source.selectionScope === 'folder') && !issues.length };
}

const pathKey = path => path.normalize('NFC').toLowerCase();

// Preserve existing identities and extension fields. Only complete root scans
// remove missing immediate files; nested references remain outside this scope.
export function reconcileTranscriptRecords(manifest, records, { complete = false, archiveName = 'Transcript archive' } = {}) {
    const archiveIds = new Set(records.map(record => record.archiveUuid?.toLowerCase()).filter(Boolean));
    if (archiveIds.size > 1) throw Error('Transcripts from different archives are present. The transcript file list was left unchanged.');
    const archiveUuid = manifest?.archiveUuid || records[0]?.archiveUuid;
    if (!manifest && !records.length) return { manifest: null, changed: false };
    if (!archiveUuid) throw Error('These transcripts do not establish an Archive UUID. The transcript file list was left unchanged.');
    const original = manifest ? parseTranscriptArchive(JSON.stringify(manifest)) : null;
    const candidate = original ? structuredClone(original) : { schemaVersion: 1, archiveUuid, archiveName, recordings: [] };
    const entries = new Map(candidate.recordings.map(entry => [entry.recordingId.toLowerCase(), entry]));
    const refs = new Map(candidate.recordings.flatMap(entry => entry.transcripts.map(ref => [pathKey(ref.relativePath), { entry, ref }])));
    const observed = new Set();
    for (const record of [...records].sort((a, b) => a.filename.localeCompare(b.filename))) {
        if (!record.recordingId || !record.archiveUuid || !record.whisperModel)
            throw Error(`${record.filename}: recording, archive or model identity is missing. The transcript file list was left unchanged.`);
        if (record.archiveUuid.toLowerCase() !== archiveUuid.toLowerCase())
            throw Error(`${record.filename}: Archive UUID differs from the transcript file list. No identities were changed.`);
        const key = pathKey(record.filename);
        if (observed.has(key)) throw Error('Selected transcripts have conflicting filenames. The transcript file list was left unchanged.');
        observed.add(key);
        const previous = refs.get(key);
        if (previous && previous.entry.recordingId.toLowerCase() !== record.recordingId.toLowerCase())
            throw Error(`${record.filename}: Recording ID differs from its existing reference. No identities were changed.`);
        let entry = entries.get(record.recordingId.toLowerCase());
        if (!entry) {
            entry = { recordingId: record.recordingId, transcripts: [] };
            entries.set(record.recordingId.toLowerCase(), entry); candidate.recordings.push(entry);
        }
        if (previous) Object.assign(previous.ref, { relativePath: record.filename, model: record.whisperModel, operation: record.operation });
        else entry.transcripts.push({ relativePath: record.filename, model: record.whisperModel, operation: record.operation });
    }
    if (complete) {
        for (const entry of candidate.recordings)
            entry.transcripts = entry.transcripts.filter(ref => ref.relativePath.includes('/') || observed.has(pathKey(ref.relativePath)));
        candidate.recordings = candidate.recordings.filter(entry => entry.transcripts.length);
    }
    const validated = parseTranscriptArchive(JSON.stringify(candidate));
    return { manifest: validated, changed: !original || JSON.stringify(original) !== JSON.stringify(validated) };
}

// The manifest has its own dirty/save state. No embedding data is loaded here.
export function createTranscriptFolderSession(snapshot, { updatesAllowed = true } = {}) {
    const { source } = snapshot;
    if (!updatesAllowed) return { status: 'blocked', source,
        error: Error('Finish transcription and save pending transcripts, then select this folder again to update its file list.') };
    let result;
    try {
        if (snapshot.issues.length) throw Error(snapshot.issues.join(' '));
        result = reconcileTranscriptRecords(snapshot.manifest, snapshot.records, {
            complete: snapshot.complete, archiveName: source.name
        });
    } catch (error) { return { status: 'blocked', error, source }; }
    if (!result.changed) return { status: result.manifest ? 'unchanged' : 'empty', source };
    const text = JSON.stringify(result.manifest, null, 2) + '\n';
    if (new TextEncoder().encode(text).length > AUDIO_SOURCE_LIMITS.jsonBytes)
        return { status: 'blocked', error: Error('The transcript file list exceeds the supported size.'), source };
    const file = new File([text], TRANSCRIPT_ARCHIVE_FILENAME, { type: 'application/json' });
    let createdEmpty = false;
    const session = { status: 'save-required', source, file,
        async save() {
            if (source.kind !== 'directory') throw Error('Use Save Transcript File List to save through Files.');
            return archiveLock(result.manifest.archiveUuid.toLowerCase(), async () => {
                const readCurrent = async () => {
                    let handle;
                    try { handle = await source.getFileHandle(TRANSCRIPT_ARCHIVE_FILENAME); }
                    catch (error) { if (error.name === 'NotFoundError') return null; throw error; }
                    return decoder.decode(await readAudioSourceBytes(await handle.getFile(), AUDIO_SOURCE_LIMITS.jsonBytes));
                };
                const current = await readCurrent();
                // A prior close may have succeeded even if readback failed.
                if (current !== text && current !== snapshot.originalText && !(createdEmpty && current === ''))
                    throw Error('The transcript file list changed outside this scan. Select the folder again before saving.');
                if (current !== text) {
                    try { await writeTextFile(source, TRANSCRIPT_ARCHIVE_FILENAME, text); }
                    catch (error) {
                        if (current === null) {
                            try { createdEmpty = await readCurrent() === ''; } catch { /* Keep the write error. */ }
                        }
                        throw error;
                    }
                }
                if (await readCurrent() !== text) throw Error('The saved transcript file list could not be verified. Retry the save.');
                session.status = 'saved';
            });
        },
        acknowledgeShared(sharedFile) {
            if (sharedFile === file) session.status = 'shared';
        }
    };
    return session;
}
