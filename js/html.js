// --------------------------------------------------
// HTML output
// --------------------------------------------------
//
// Converts structured transcript records into a complete
// standalone HTML document. This module does not read or
// write files and does not access the UI.
//

export function createCombinedHTML(
    records,
    title = "Memora — Combined Transcription"
) {

    const sections =
        records
            .map(record =>
                createTranscriptSection(record)
            )
            .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <title>${escapeHTML(title)}</title>
    <style>
        body {
            margin: 0;
            padding: 40px 24px;
            font-family:
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;
            color: #20242C;
            background: #F7F8FA;
            line-height: 1.6;
        }

        main {
            max-width: 900px;
            margin: 0 auto;
            background: #FFFFFF;
            padding: 40px;
            border: 1px solid #E1E4E8;
            border-radius: 16px;
        }

        h1 {
            margin: 0 0 32px;
            font-size: 28px;
            font-weight: 600;
        }

        h2 {
            margin: 0 0 10px;
            font-size: 20px;
            font-weight: 600;
        }

        .metadata {
            color: #707782;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 20px;
        }

        .transcript {
            white-space: pre-wrap;
        }

        .record {
            padding: 28px 0;
            border-top: 1px solid #E1E4E8;
        }

        .record:first-of-type {
            border-top: none;
            padding-top: 0;
        }
    </style>
</head>
<body>
    <main>
        <h1>${escapeHTML(title)}</h1>
        ${sections}
    </main>
</body>
</html>`;
}


function createTranscriptSection(record) {

    const heading =
        record.recordingFilename ||
        record.filename ||
        "Untitled recording";

    const recordingDate =
        record.recordingDate ||
        "Date unknown";

    const duration =
        record.duration ||
        "Duration unknown";

    const voiceMemoId =
        record.voiceMemoId ||
        "Unknown";

    const transcript =
        record.transcript ||
        "";

    return `
        <section class="record">
            <h2>${escapeHTML(heading)}</h2>

            <div class="metadata">
                Recording date:
                ${escapeHTML(recordingDate)}
                <br>
                Duration:
                ${escapeHTML(duration)}
                <br>
                Voice Memo ID:
                ${escapeHTML(voiceMemoId)}
            </div>

            <div class="transcript">${escapeHTML(transcript)}</div>
        </section>
    `;
}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
