const STORAGE_KEY = "memora.transcript-preferences.v1";
export const transcriptPreferencesChanged = "memora-transcript-preferences-changed";
const availability = new Map();

export function transcriptPreferenceKey(record) {
    if (!record?.archiveUuid || !record.recordingId) return null;
    return JSON.stringify([record.archiveUuid.toLowerCase(), record.recordingId.toLowerCase(), record.operation || "transcribe"]);
}

export function readTranscriptPreferences() {
    try {
        const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return new Map(rows.map(row => [row.key, row]));
    } catch {
        return new Map();
    }
}

function writePreferences(preferences, key) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...preferences.values()]));
    window.dispatchEvent(new CustomEvent(transcriptPreferencesChanged, { detail: key }));
}

export function setTranscriptPreference(record) {
    const key = transcriptPreferenceKey(record);
    if (!key) throw new Error("This transcript needs an Archive UUID and Recording ID to remember a default.");
    const preferences = readTranscriptPreferences();
    preferences.set(key, {
        key, filename: record.filename, archiveUuid: record.archiveUuid, recordingId: record.recordingId,
        archive: record.originalAudioFolderName || record.archiveUuid,
        recording: record.recordingFilename || record.filename,
        operation: record.operation || "transcribe"
    });
    availability.set(key, true);
    writePreferences(preferences, key);
}

export function removeTranscriptPreference(key) {
    const preferences = readTranscriptPreferences();
    if (!preferences.delete(key)) return;
    availability.delete(key);
    writePreferences(preferences, key);
}

export function observeTranscriptPreferences(records) {
    const preferences = readTranscriptPreferences();
    if (!preferences.size) return;
    const filesByKey = new Map();
    const archives = new Set();
    for (const record of records) {
        if (record.archiveUuid) archives.add(record.archiveUuid.toLowerCase());
        const key = transcriptPreferenceKey(record);
        if (!preferences.has(key)) continue;
        if (!filesByKey.has(key)) filesByKey.set(key, new Set());
        filesByKey.get(key).add(record.filename);
    }
    for (const [key, preference] of preferences) {
        if (archives.has(preference.archiveUuid.toLowerCase())) {
            availability.set(key, filesByKey.get(key)?.has(preference.filename) ?? false);
        }
    }
}

export function listTranscriptPreferences() {
    return [...readTranscriptPreferences().values()].map(row => ({...row, available: availability.get(row.key)}));
}
