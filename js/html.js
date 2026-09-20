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

        .reader-controls {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 28px;
            padding: 12px 14px;
            background: #F7F8FA;
            border: 1px solid #E1E4E8;
            border-radius: 10px;
            font-size: 14px;
            color: #707782;
        }

        .reader-controls label {
            white-space: nowrap;
            font-weight: 600;
        }

        .reader-controls input[type="range"] {
            flex: 1;
            min-width: 120px;
        }

        .reader-size-value {
            width: 42px;
            text-align: right;
            font-variant-numeric: tabular-nums;
        }

        .transcript {
            white-space: pre-wrap;
            font-size: var(--transcript-size, 16px);
        }

        .record {
            padding: 28px 0;
            border-top: 1px solid #E1E4E8;
        }

        .record:first-of-type {
            border-top: none;
            padding-top: 0;
        }

        @media (max-width: 600px) {
            body {
                padding: 20px 12px;
            }

            main {
                padding: 24px 18px;
            }

            .reader-controls {
                flex-wrap: wrap;
            }

            .reader-controls input[type="range"] {
                order: 3;
                flex-basis: 100%;
            }
        }
    </style>
</head>
<body>
    <main>
        <h1>${escapeHTML(title)}</h1>

        <div class="reader-controls">
            <label for="textSize">Text size</label>
            <input
                id="textSize"
                type="range"
                min="12"
                max="28"
                step="1"
                value="16"
                aria-label="Text size"
            >
            <span id="textSizeValue" class="reader-size-value">16px</span>
        </div>

        ${sections}
    </main>

    <script>
        const textSize = document.getElementById("textSize");
        const textSizeValue = document.getElementById("textSizeValue");

        textSize.addEventListener("input", () => {
            document.documentElement.style.setProperty(
                "--transcript-size",
                `\${textSize.value}px`
            );
            textSizeValue.textContent = `\${textSize.value}px`;
        });
    </script>
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

    const whisperModel =
        record.whisperModel ||
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
                <br>
                Whisper model:
                ${escapeHTML(whisperModel)}
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
