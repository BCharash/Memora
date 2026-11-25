import { isMemoraEditConfirmed, readMemoraEdit, readTranscriptIdentity, transcriptHeader } from "./transcriptMetadata.js";
import { readTranscriptPreferences, transcriptPreferenceKey } from "./transcriptPreferences.js";
// --------------------------------------------------
// Combine transcript files
// --------------------------------------------------
//
// Reads durable Memora transcript files, extracts their
// metadata, sorts them, and combines them. When the same
// recording exists at multiple Whisper model levels, only
// the highest available model is retained.

const MODEL_RANK = {
    tiny: 1,
    base: 2,
    small: 3,
    medium: 4,
    // Legacy archives use "large" without establishing a model generation.
    large: 5,
    "large-v3": 5
};

export function parseTranscriptFile(file, text) {

    const lines = text.split(/\r?\n/);

    const filename = file && file.name ? file.name : "";
    const identity = readTranscriptIdentity(text);
    const headerLines = text.slice(0, text.search(/^--------------------------------------------------[\t ]*(?:\r?\n|$)/m)).split(/\r?\n/);

    const recordingFilename =
        lines.length > 0
            ? lines[0].trim()
            : "";

    const recordingDate =
        extractField(headerLines, "Recording date:");

    const duration =
        extractField(headerLines, "Duration:");

    const voiceMemoId = identity.recordingId;

    const whisperModelField =
        extractField(headerLines, "Whisper model:");

    const whisperModel =
        normalizeModelName(whisperModelField) ||
        extractModelFromFilename(filename);

    const operationField =
        extractField(headerLines, "Operation:");

    const operation =
        operationField.toLowerCase() === "translate"
            ? "translate"
            : "transcribe";

    const audioRelativePath =
        extractField(headerLines, "Audio Relative Path:") ||
        null;

    const separatorIndex =
        lines.findIndex(
            line => line.trim() === "--------------------------------------------------"
        );

    let transcript = "";

    if (separatorIndex !== -1) {
        transcript =
            lines
                .slice(separatorIndex + 1)
                .join("\n")
                .trim();
    }

    return {
        file,
        filename,
        memoraEdit: readMemoraEdit(transcriptHeader(text).text, file),
        recordingFilename,
        ...identity,
        recordingDate,
        duration,
        // Compatibility alias for existing consumers; it does not imply Apple origin.
        voiceMemoId:
            voiceMemoId === "Unknown"
                ? null
                : voiceMemoId,
        whisperModel,
        operation,
        audioRelativePath,
        transcript
    };
}


function extractField(lines, label) {

    const line =
        lines.find(line => line.startsWith(label));

    if (!line) {
        return "";
    }

    return line.slice(label.length).trim();
}


function normalizeModelName(value) {

    if (!value) {
        return null;
    }

    const normalized =
        String(value).trim().toLowerCase();

    return MODEL_RANK[normalized]
        ? normalized
        : null;
}


function extractModelFromFilename(filename) {

    const match =
        String(filename).match(
            / - (tiny|base|small|medium|large-v3|large)(?:-\d+)?\.txt$/i
        );

    return match
        ? match[1].toLowerCase()
        : null;
}


// File objects are immutable snapshots. A new folder selection supplies new
// objects, so reuse within a selection never hides changes on the next scan.
const transcriptSnapshots = new WeakMap();
function transcriptSnapshot(file) {
    if (!transcriptSnapshots.has(file)) {
        const pending = file.text().then(text => ({ text, record: parseTranscriptFile(file, text) }));
        transcriptSnapshots.set(file, pending);
        pending.catch(() => { if (transcriptSnapshots.get(file) === pending) transcriptSnapshots.delete(file); });
    }
    return transcriptSnapshots.get(file);
}
export async function readTranscriptFile(file) {
    // Editors may mutate their working records. Keep the cached snapshot
    // independent so another consumer of the same File still sees its bytes.
    const {record} = await transcriptSnapshot(file);
    return {
        ...record,
        memoraEdit: record.memoraEdit && {
            ...record.memoraEdit,
            confirmed: isMemoraEditConfirmed(file, record.memoraEdit.target)
        }
    };
}
export async function readTranscriptSourceText(file) {
    return (await transcriptSnapshot(file)).text;
}


export async function readTranscriptFiles(files) {

    const records = [];

    for (const file of files) {

        if (!/\.txt$/i.test(file.name)) {
            continue;
        }

        records.push(
            await readTranscriptFile(file)
        );
    }

    return records;
}


export function sortTranscriptRecords(
    records,
    sortOrder = "date-desc"
) {

    return [...records].sort((a, b) => {

        if (
            sortOrder === "name-asc" ||
            sortOrder === "name-desc"
        ) {

            const comparison =
                getSortName(a).localeCompare(
                    getSortName(b),
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );

            return sortOrder === "name-asc"
                ? comparison
                : -comparison;
        }

        const aTime =
            parseRecordingDate(a.recordingDate);

        const bTime =
            parseRecordingDate(b.recordingDate);

        if (aTime === null && bTime === null) {
            return getSortName(a).localeCompare(
                getSortName(b),
                undefined,
                { numeric: true, sensitivity: "base" }
            );
        }

        if (aTime === null) return 1;
        if (bTime === null) return -1;

        const comparison = aTime - bTime;

        return sortOrder === "date-asc"
            ? comparison
            : -comparison;
    });
}


function getSortName(record) {

    return (
        record.recordingFilename ||
        record.filename ||
        ""
    );
}


function parseRecordingDate(value) {

    if (!value || value === "Date unknown") {
        return null;
    }

    // Memora writes dates in a human-readable form such as:
    // "Thursday · 15 June 2023 at 08:40". JavaScript's Date.parse()
    // does not reliably understand that format, so parse the date
    // components explicitly.
    const match = String(value).match(
        /(?:^|[·,]\s*)\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+at\s+(\d{1,2}):(\d{2}))?/
    );

    if (!match) {
        return null;
    }

    const day = Number(match[1]);
    const monthName = match[2].toLowerCase();
    const year = Number(match[3]);
    const hour = match[4] ? Number(match[4]) : 0;
    const minute = match[5] ? Number(match[5]) : 0;

    const months = {
        january: 0, february: 1, march: 2, april: 3,
        may: 4, june: 5, july: 6, august: 7,
        september: 8, october: 9, november: 10, december: 11
    };

    const month = months[monthName];

    if (month === undefined) {
        return null;
    }

    const date = new Date(year, month, day, hour, minute);

    // Reject impossible dates rather than silently normalizing them.
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day ||
        date.getHours() !== hour ||
        date.getMinutes() !== minute
    ) {
        return null;
    }

    return date.getTime();
}


export function getModelRank(model) {

    return MODEL_RANK[normalizeModelName(model)] || 0;
}


export function selectHighestModelRecords(records) {

    const preferences = readTranscriptPreferences();
    const bestByKey = new Map();
    const ungrouped = new Set();

    for (const record of records) {

        const key = getRecordingKey(record);

        if (!key) {
            ungrouped.add(record);
            continue;
        }

        const existing = bestByKey.get(key);

        if (!existing) {
            bestByKey.set(key, record);
            continue;
        }

        const existingRank =
            getModelRank(existing.whisperModel);

        const newRank =
            getModelRank(record.whisperModel);

        const edited = !!record.memoraEdit?.confirmed;
        const existingEdited = !!existing.memoraEdit?.confirmed;
        const preferred = preferences.get(transcriptPreferenceKey(record))?.filename;
        if (record.filename === preferred || (existing.filename !== preferred &&
            ((edited && !existingEdited) || (!edited && !existingEdited && newRank > existingRank)))) {
            bestByKey.set(key, record);
        }
    }

    // Rebuild the result by walking the already-sorted input.
    // This preserves the user's requested sort order even when
    // duplicate recordings are removed or a higher model replaces
    // a lower-model version.
    const result = [];
    const addedKeys = new Set();

    for (const record of records) {

        const key = getRecordingKey(record);

        if (!key) {
            if (ungrouped.has(record)) {
                result.push(record);
                ungrouped.delete(record);
            }
            continue;
        }

        if (addedKeys.has(key)) {
            continue;
        }

        const best = bestByKey.get(key);

        if (best === record) {
            result.push(record);
            addedKeys.add(key);
        }
    }

    return result;
}

export function getEditedTranscriptChoices(records, preferred) {
    const groups = new Map();
    for (const record of records) {
        const key = getRecordingKey(record);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(record);
    }
    const choices = new Map();
    for (const record of preferred) {
        const group = groups.get(getRecordingKey(record));
        if (!group) continue;
        const alternatives = group.filter(copy => copy !== record);
        if (alternatives.length) choices.set(record.filename, alternatives);
    }
    return choices;
}


export function getRecordingKey(record) {

    const operation =
        record.operation === "translate"
            ? "translate"
            : "transcribe";

    if (record.recordingId || record.voiceMemoId) {
        return `archive:${record.archiveUuid || "legacy"}|id:${record.recordingId || record.voiceMemoId}|operation:${operation}`;
    }

    if (record.recordingFilename) {
        return (
            `name:${record.recordingFilename}` +
            `|date:${record.recordingDate || ""}` +
            `|operation:${operation}`
        );
    }

    return null;
}


export function combineTranscriptRecords(
    records,
    title = "Memora — Combined Transcription"
) {

    const selectedRecords =
        selectHighestModelRecords(records);

    const documentTitle =
        String(title).trim() ||
        "Memora — Combined Transcription";

    return (
        documentTitle + "\n\n" +
        selectedRecords
        .map(record => {

            const heading =
                record.recordingFilename ||
                record.filename;

            return (
                `${heading}\n\n` +
                `Recording date: ${record.recordingDate || "Date unknown"}\n` +
                `Duration: ${record.duration || "Duration unknown"}\n` +
                `Recording ID: ${record.recordingId || record.voiceMemoId || "Unknown"}\n` +
                `Whisper model: ${formatModelName(record.whisperModel)}\n\n` +
                `${record.transcript.trim()}\n` +
                `──────────────────────────────────────────────────\n`
            );
        })
        .join("\n")
    );
}


export function formatModelName(model) {

    if (!model) {
        return "Unknown";
    }

    if (model === "large-v3") {
        return "large-v3";
    }

    return model;
}
