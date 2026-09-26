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
            margin-bottom: 28px;
            padding: 12px 14px;
            background: #F7F8FA;
            border: 1px solid #E1E4E8;
            border-radius: 10px;
            font-size: 14px;
            color: #707782;
        }

        .reader-controls .js-controls {
            display: none;
            grid-template-columns: auto minmax(120px, 1fr) auto;
            align-items: center;
            gap: 12px;
        }

        .reader-controls .fallback {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .reader-controls .fallback input[type="radio"] {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }

        .reader-controls .fallback label {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            height: 30px;
            padding: 0 6px;
            box-sizing: border-box;
            border: 1px solid #D5D9DE;
            border-radius: 6px;
            background: #FFFFFF;
            color: #20242C;
            font-size: 14px;
            cursor: pointer;
            user-select: none;
        }

        .reader-controls .fallback > span:first-child {
            font-size: 12px;
            line-height: 1;
        }

        .reader-controls .fallback > span:last-child {
            font-size: 32px;
            line-height: 1;
        }

        .reader-controls .fallback .size-buttons {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .reader-controls .fallback .size-buttons input:checked + label {
            border-color: #707782;
            background: #E9ECF0;
        }

        .reader-controls .js-controls input[type="range"] {
            width: auto;
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

        .reader:has(#size12:checked) .transcript {
            font-size: 12px;
        }

        .reader:has(#size16:checked) .transcript {
            font-size: 16px;
        }

        .reader:has(#size20:checked) .transcript {
            font-size: 20px;
        }

        .reader:has(#size24:checked) .transcript {
            font-size: 24px;
        }

        .reader:has(#size28:checked) .transcript {
            font-size: 28px;
        }

        .reader:has(#size32:checked) .transcript {
            font-size: 32px;
        }

        .audio-control {
            display: none;
            margin: 0 0 18px;
            align-items: center;
        }

        .audio-control.audio-enabled {
            display: flex;
        }

        .audio-play-button {
            width: 32px;
            height: 30px;
            padding: 0;
            border: 1px solid #D5D9DE;
            border-radius: 6px;
            background: #FFFFFF;
            color: #20242C;
            font-size: 15px;
            line-height: 1;
            cursor: pointer;
        }

        .audio-play-button:hover {
            background: #F7F8FA;
        }

        .audio-player {
            display: none;
            width: 100%;
            max-width: 520px;
        }

        .audio-control.active .audio-play-button {
            display: none;
        }

        .audio-control.active .audio-player {
            display: block;
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

            .reader-controls .js-controls {
                grid-template-columns: auto minmax(120px, 1fr) auto;
            }

            .reader-controls .fallback {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <main>
        <h1>${escapeHTML(title)}</h1>

        <div class="reader">
            <div class="reader-controls">
                <div class="js-controls">
                    <label for="textSize">Text size</label>
                    <input
                        id="textSize"
                        type="range"
                        min="12"
                        max="32"
                        step="1"
                        value="16"
                        aria-label="Text size"
                    >
                    <span id="textSizeValue" class="reader-size-value">16px</span>
                </div>

                <div class="fallback" aria-label="Text size">
                    <span aria-hidden="true">A</span>
                    <div class="size-buttons">
                        <input id="size12" type="radio" name="textSizeFallback" value="12">
                        <label for="size12">12</label>
                        <input id="size16" type="radio" name="textSizeFallback" value="16" checked>
                        <label for="size16">16</label>
                        <input id="size20" type="radio" name="textSizeFallback" value="20">
                        <label for="size20">20</label>
                        <input id="size24" type="radio" name="textSizeFallback" value="24">
                        <label for="size24">24</label>
                        <input id="size28" type="radio" name="textSizeFallback" value="28">
                        <label for="size28">28</label>
                        <input id="size32" type="radio" name="textSizeFallback" value="32">
                        <label for="size32">32</label>
                    </div>
                    <span aria-hidden="true">A</span>
                </div>
            </div>

            ${sections}
        </div>
    </main>

    <script>
        document.querySelector(".js-controls").style.display = "grid";
        document.querySelector(".fallback").style.display = "none";

        document
            .querySelectorAll('.fallback input[type="radio"]')
            .forEach(input => {
                input.checked = false;
            });

        const textSize = document.getElementById("textSize");
        const textSizeValue = document.getElementById("textSizeValue");

        textSize.addEventListener("input", () => {
            document.documentElement.style.setProperty(
                "--transcript-size",
                \`\${textSize.value}px\`
            );
            textSizeValue.textContent = \`\${textSize.value}px\`;
        });

        const audioIsDesktop =
            window.matchMedia(
                "(pointer: fine) and (hover: hover)"
            ).matches;

        if (audioIsDesktop) {
            document
                .querySelectorAll(".audio-control")
                .forEach(control => {
                    const button =
                        control.querySelector(".audio-play-button");

                    const audio =
                        control.querySelector(".audio-player");

                    if (!button || !audio) {
                        return;
                    }

                    control.classList.add("audio-enabled");

                    button.addEventListener("click", async () => {
                        audio.src = audio.dataset.src;
                        audio.controls = true;
                        control.classList.add("active");

                        try {
                            await audio.play();
                        } catch (error) {
                            control.classList.remove("active");
                            audio.controls = false;
                            audio.removeAttribute("src");
                        }
                    });
                });
        }
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

            ${createAudioControl(record.audioRelativePath)}

            <div class="transcript">${escapeHTML(transcript)}</div>
        </section>
    `;
}


function createAudioControl(audioRelativePath) {

    if (!audioRelativePath) {
        return "";
    }

    const safePath =
        escapeHTML(audioRelativePath);

    return `
        <div class="audio-control">
            <button
                class="audio-play-button"
                type="button"
                aria-label="Play recording"
                title="Play recording"
            >▶</button>
            <audio
                class="audio-player"
                preload="metadata"
                data-src="${safePath}"
            ></audio>
        </div>
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
