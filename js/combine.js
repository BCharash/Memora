// --------------------------------------------------
// Combine Files
// --------------------------------------------------
//
// This module works with existing transcript .txt files.
// It does not access folders directly and does not perform
// transcription. The caller supplies File objects.
//

export function parseTranscriptFile(file, text) {

    const lines = text.split(/\r?\n/);

    const filename =
        file && file.name
            ? file.name
            : "";

    const recordingFilename =
        lines.length > 0
            ? lines[0].trim()
            : "";

    const recordingDate =
        extractField(
            lines,
            "Recording date:"
        );

    const duration =
        extractField(
            lines,
            "Duration:"
        );

    const voiceMemoId =
        extractField(
            lines,
            "Voice Memo ID:"
        );

    const separatorIndex =
        lines.findIndex(
            line =>
                line.trim() ===
                "--------------------------------------------------"
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
        recordingFilename,
        recordingDate,
        duration,
        voiceMemoId:
            voiceMemoId === "Unknown"
                ? null
                : voiceMemoId,
        transcript
    };
}


function extractField(lines, label) {

    const line =
        lines.find(
            line =>
                line.startsWith(label)
        );

    if (!line) {
        return "";
    }

    return line
        .slice(label.length)
        .trim();
}


export async function readTranscriptFile(file) {

    const text =
        await file.text();

    return parseTranscriptFile(
        file,
        text
    );
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

    return [...records].sort(
        (a, b) => {

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
                parseRecordingDate(
                    a.recordingDate
                );

            const bTime =
                parseRecordingDate(
                    b.recordingDate
                );

            if (
                aTime === null &&
                bTime === null
            ) {
                return getSortName(a).localeCompare(
                    getSortName(b),
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );
            }

            if (aTime === null) {
                return 1;
            }

            if (bTime === null) {
                return -1;
            }

            const comparison =
                aTime - bTime;

            return sortOrder === "date-asc"
                ? comparison
                : -comparison;
        }
    );
}


function getSortName(record) {

    return (
        record.recordingFilename ||
        record.filename ||
        ""
    );
}


function parseRecordingDate(value) {

    if (!value) {
        return null;
    }

    const timestamp =
        Date.parse(value);

    return Number.isNaN(timestamp)
        ? null
        : timestamp;
}


export function combineTranscriptRecords(
    records
) {

    return records
        .map(record => {

            const heading =
                record.recordingFilename ||
                record.filename;

            return (
                `${heading}\n\n` +
                `Recording date: ${record.recordingDate || "Date unknown"}\n` +
                `Duration: ${record.duration || "Duration unknown"}\n` +
                `Voice Memo ID: ${record.voiceMemoId || "Unknown"}\n\n` +
                `--------------------------------------------------\n\n` +
                `${record.transcript.trim()}\n`
            );
        })
        .join("\n");
}
