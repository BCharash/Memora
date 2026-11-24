// --------------------------------------------------
// HTML output
// --------------------------------------------------
//
// Converts structured transcript records into a complete
// standalone HTML document. This module does not read or
// write files and does not access the UI.
//

import { defaultCombineMetadata, getCombinedMetadataFields } from "./combineMetadata.js";

export function createCombinedHTML(
    records,
    title = "Memora — Combined Transcription",
    metadataOptions = defaultCombineMetadata
) {

    const defaultSort = inferDefaultSort(records);
    const hasOmittedFields = Object.keys(defaultCombineMetadata).some(key => !metadataOptions[key]);

    const sections =
        records
            .map((record, index) =>
                createTranscriptSection(record, index, metadataOptions)
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

        .transcript-separator {
            border: 0;
            border-top: 1px solid #E1E4E8;
            margin: 16px 0;
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

        .sort-controls {
            display: none;
            margin-top: 14px;
            padding-top: 12px;
            border-top: 1px solid #E1E4E8;
            color: #707782;
        }

        .sort-row + .sort-row {
            margin-top: 10px;
        }

        .sort-row-label {
            display: block;
            margin-bottom: 5px;
            color: #707782;
            font-size: 12px;
            line-height: 1.3;
        }

        .sort-options {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
        }

        .sort-options input[type="radio"] {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }

        .sort-options label {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 30px;
            padding: 0 10px;
            box-sizing: border-box;
            border: 1px solid #D5D9DE;
            border-radius: 6px;
            background: #FFFFFF;
            color: #20242C;
            font-size: 14px;
            cursor: pointer;
            user-select: none;
        }

        .sort-options input:checked + label {
            border-color: #707782;
            background: #E9ECF0;
        }

        .sort-options input:focus-visible + label {
            outline: 2px solid #526A91;
            outline-offset: 2px;
        }

        .sort-options [hidden] {
            display: none !important;
        }

        .metadata-display-options {
            margin-top: 12px;
        }

        .metadata-display-fields:not([hidden]) {
            display: flex;
            flex-wrap: wrap;
            gap: 6px 14px;
            margin-top: 6px;
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

        .audio-location {
            display: none;
            margin: 12px 0 24px;
            padding: 12px 14px;
            background: #F7F8FA;
            border: 1px solid #E1E4E8;
            border-radius: 10px;
            font-size: 14px;
        }

        .audio-location button {
            margin: 4px 8px 4px 0;
            padding: 7px 12px;
            border: 1px solid #D5D9DE;
            border-radius: 6px;
            background: #FFFFFF;
            color: #20242C;
            cursor: pointer;
        }

        .audio-location-status {
            display: block;
            margin-top: 6px;
            color: #707782;
        }

        .audio-location-needed {
            display: none;
            margin-left: 10px;
            font-size: 13px;
        }

        .audio-control.audio-missing .audio-location-needed {
            display: inline;
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
        }

        .record:first-of-type {
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

                <div class="sort-controls" aria-label="Transcript sorting">
                    <div class="sort-row">
                        <span class="sort-row-label" id="sortByLabel">Sort by</span>
                        <div class="sort-options" role="radiogroup" aria-labelledby="sortByLabel">
                            <input id="sortByDate" type="radio" name="sortBy" value="date" ${defaultSort.type === "date" ? "checked" : ""}>
                            <label for="sortByDate">Date</label>
                            <input id="sortByAlpha" type="radio" name="sortBy" value="alpha" ${defaultSort.type === "alpha" ? "checked" : ""}>
                            <label for="sortByAlpha">Alphabetical</label>
                        </div>
                    </div>

                    <div class="sort-row">
                        <span class="sort-row-label" id="sortOrderLabel">Order</span>
                        <div class="sort-options" role="radiogroup" aria-labelledby="sortOrderLabel">
                            <div class="sort-order-options" id="dateOrderOptions">
                                <input id="sortOldest" type="radio" name="dateOrder" value="oldest" ${defaultSort.type !== "date" || defaultSort.direction === "oldest" ? "checked" : ""}>
                                <label for="sortOldest">Oldest first</label>
                                <input id="sortNewest" type="radio" name="dateOrder" value="newest" ${defaultSort.type === "date" && defaultSort.direction === "newest" ? "checked" : ""}>
                                <label for="sortNewest">Newest first</label>
                            </div>
                            <div class="sort-order-options" id="alphaOrderOptions" hidden>
                                <input id="sortAZ" type="radio" name="alphaOrder" value="az" ${defaultSort.type !== "alpha" || defaultSort.direction === "az" ? "checked" : ""}>
                                <label for="sortAZ">A–Z</label>
                                <input id="sortZA" type="radio" name="alphaOrder" value="za" ${defaultSort.type === "alpha" && defaultSort.direction === "za" ? "checked" : ""}>
                                <label for="sortZA">Z–A</label>
                            </div>
                        </div>
                    </div>
                    ${hasOmittedFields ? `
                        <div class="metadata-display-options">
                            <label>
                                <input id="showMetadataOptions" type="checkbox" autocomplete="off" aria-controls="metadataDisplayFields">
                                Metadata display options
                            </label>
                            <div class="metadata-display-fields" id="metadataDisplayFields" hidden>
                                ${[["title", "Transcript title"], ...getCombinedMetadataFields({}), ["separator", "Separator"]].map(([key, label]) =>
                                    `<label><input type="checkbox" value="${key}" autocomplete="off" ${metadataOptions[key] ? "checked" : ""}> ${label}</label>`
                                ).join("\n")}
                            </div>
                        </div>
                    ` : ""}
                </div>
            </div>

            <div class="audio-location" id="audioLocation">
                <button type="button" id="chooseAudioFolder">Locate Audio Folder</button>
                <input id="audioFolderInput" type="file" webkitdirectory multiple accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg" hidden>
                <span class="audio-location-status" id="audioLocationStatus" role="status" aria-live="polite"></span>
            </div>

            <div class="records">
                ${sections}
            </div>
        </div>
    </main>

    <script>
        document.querySelector(".js-controls").style.display = "grid";
        document.querySelector(".fallback").style.display = "none";

        const showMetadataOptions = document.getElementById("showMetadataOptions");
        if (showMetadataOptions) {
            const fields = document.getElementById("metadataDisplayFields");
            showMetadataOptions.addEventListener("change", () => {
                fields.hidden = !showMetadataOptions.checked;
            });
            fields.querySelectorAll("input").forEach(input => {
                input.addEventListener("change", () => {
                    document.querySelectorAll('[data-metadata-field="' + input.value + '"]').forEach(element => {
                        element.hidden = !input.checked;
                    });
                    document.querySelectorAll(".record .metadata").forEach(group => {
                        group.hidden = !group.querySelector("[data-metadata-field]:not([hidden])");
                    });
                });
            });
        }

        const sortControls = document.querySelector(".sort-controls");
        const recordsContainer = document.querySelector(".records");
        const sortByInputs = document.querySelectorAll('input[name="sortBy"]');
        const dateOrderOptions = document.getElementById("dateOrderOptions");
        const alphaOrderOptions = document.getElementById("alphaOrderOptions");

        function getSelectedValue(name) {
            return document.querySelector('input[name="' + name + '"]:checked')?.value;
        }

        function sortRecords() {
            const type = getSelectedValue("sortBy") || "date";
            const direction = type === "date"
                ? (getSelectedValue("dateOrder") || "oldest")
                : (getSelectedValue("alphaOrder") || "az");

            const records = Array.from(recordsContainer.querySelectorAll(".record"));

            records.sort((a, b) => {
                if (type === "alpha") {
                    const comparison = (a.dataset.sortName || "").localeCompare(
                        b.dataset.sortName || "",
                        undefined,
                        { numeric: true, sensitivity: "base" }
                    );
                    return (direction === "za" ? -comparison : comparison)
                        || Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex);
                }

                const aDate = a.dataset.sortDate === "" ? null : Number(a.dataset.sortDate);
                const bDate = b.dataset.sortDate === "" ? null : Number(b.dataset.sortDate);

                // Put records with known dates before records without dates.
                // Reverse the unknown-date group too, so changing direction is
                // observable even when some or all dates cannot be parsed.
                if (aDate === null && bDate !== null) return 1;
                if (aDate !== null && bDate === null) return -1;

                if (aDate !== null && bDate !== null && aDate !== bDate) {
                    const comparison = aDate - bDate;
                    return direction === "newest" ? -comparison : comparison;
                }

                // Equal or unavailable dates: keep a stable order for Oldest,
                // and reverse it for Newest. Previously this tie-breaker always
                // used original order, making Newest appear to do nothing when
                // all dates were unavailable (or identical).
                const originalOrder =
                    Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex);
                return direction === "newest" ? -originalOrder : originalOrder;
            });

            records.forEach(record => recordsContainer.appendChild(record));
        }

        function updateSortControls(shouldSort = true) {
            const type = getSelectedValue("sortBy") || "date";
            dateOrderOptions.hidden = type !== "date";
            alphaOrderOptions.hidden = type !== "alpha";
            if (shouldSort) sortRecords();
        }

        sortByInputs.forEach(input => input.addEventListener("change", () => updateSortControls(true)));
        document.querySelectorAll('input[name="dateOrder"], input[name="alphaOrder"]')
            .forEach(input => {
                // A click must also apply the sort when the chosen radio is
                // already checked: in that case, browsers do not fire change.
                input.addEventListener("click", sortRecords);
                input.addEventListener("change", sortRecords);
            });

        // Preserve the creation-time HTML order on initial load. The checked
        // controls describe that order; reordering begins only after user input.
        updateSortControls(false);
        sortControls.style.display = "block";

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

        // Audio files are matched by their original filename. The browser grants
        // access only to files explicitly selected by the reader; no uploads.
        const audioLocation = document.getElementById("audioLocation");
        const audioFolderInput = document.getElementById("audioFolderInput");
        const audioLocationStatus = document.getElementById("audioLocationStatus");
        const audioByName = new Map();
        const audioObjectUrls = new Set();
        const audioControls = Array.from(document.querySelectorAll(".audio-control"));

        const audioKey = name => String(name || "").normalize("NFC").toLowerCase();
        const audioFilename = audio =>
            audio.dataset.filename || (audio.dataset.src || "").split(/[\\/]/).pop();

        function selectedAudioUrl(audio) {
            const key = audioKey(audioFilename(audio));
            return audioByName.get(key) || null;
        }

        function updateAudioStatus(message) {
            audioLocationStatus.textContent = message;
        }

        function registerAudioFiles(files) {
            let added = 0;
            let duplicates = 0;
            const batch = new Map();
            for (const file of files) {
                if (!/\.(m4a|mp3|wav|webm|ogg|aac|flac)$/i.test(file.name) &&
                    !String(file.type).startsWith("audio/")) continue;
                const key = audioKey(file.name);
                if (batch.has(key)) {
                    batch.set(key, null); // Ambiguous within the newly selected folder.
                } else {
                    batch.set(key, file);
                }
            }
            for (const [key, file] of batch) {
                if (!file) {
                    duplicates++;
                    continue;
                }
                // Do not silently replace a recording selected from an earlier folder.
                if (audioByName.has(key)) {
                    duplicates++;
                    continue;
                }
                const url = URL.createObjectURL(file);
                audioByName.set(key, url);
                audioObjectUrls.add(url);
                added++;
            }
            let matched = 0;
            for (const control of audioControls) {
                const audio = control.querySelector(".audio-player");
                if (audio && selectedAudioUrl(audio)) {
                    matched++;
                    control.classList.remove("audio-missing");
                }
            }
            updateAudioStatus(
                added + " new audio file(s) linked; " + matched + " of " +
                audioControls.length + " recordings matched from selected folders." +
                (duplicates ? " " + duplicates +
                    " duplicate filename(s) skipped; earlier links preserved." : "")
            );
        }

        // Prefer the native directory permission picker where supported.
        // A local HTML document may not be eligible for this API in every
        // browser, so retain the directory-input picker as a fallback.
        document.getElementById("chooseAudioFolder").addEventListener("click", async () => {
            if (typeof window.showDirectoryPicker !== "function") {
                audioFolderInput.value = "";
                audioFolderInput.click();
                return;
            }

            let directory;
            try {
                directory = await window.showDirectoryPicker({ mode: "read" });
            } catch (error) {
                if (error?.name === "AbortError") return; // User cancelled.
                // Security restrictions or unsupported local-file contexts.
                audioFolderInput.value = "";
                audioFolderInput.click();
                return;
            }

            try {
                const files = [];
                // Only the chosen folder's direct children are needed: Memora
                // keeps its original audio files together in one folder.
                for await (const entry of directory.values()) {
                    if (entry.kind !== "file") continue;
                    if (!/\.(m4a|mp3|wav|webm|ogg|aac|flac)$/i.test(entry.name)) continue;
                    files.push(await entry.getFile());
                }
                registerAudioFiles(files);
            } catch (error) {
                updateAudioStatus("Unable to read the selected folder: " +
                    (error?.message || String(error)) + ". Please try again.");
            }
        });
        audioFolderInput.addEventListener("change", () => registerAudioFiles(audioFolderInput.files));
        window.addEventListener("pagehide", () => {
            for (const url of audioObjectUrls) URL.revokeObjectURL(url);
        });

        async function tryAudioSource(audio, source) {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            audio.src = source;
            try {
                await audio.play();
                return { ok: true };
            } catch (error) {
                audio.pause();
                audio.removeAttribute("src");
                audio.load();
                return { ok: false, error };
            }
        }

        audioControls.forEach(control => {
            const button = control.querySelector(".audio-play-button");
            const audio = control.querySelector(".audio-player");
            if (!button || !audio) return;
            control.classList.add("audio-enabled");

            button.addEventListener("click", async () => {
                control.classList.remove("audio-missing");
                audio.controls = true;
                control.classList.add("active");

                const storedPath = audio.dataset.src || "";
                const filename = audioFilename(audio);
                const candidates = [...new Set([
                    storedPath,
                    filename,
                    filename && "../" + filename,
                    filename && "../../" + filename
                ].filter(Boolean))];

                for (const candidate of candidates) {
                    const result = await tryAudioSource(audio, candidate);
                    if (result.ok) return;
                    if (result.error?.name === "NotAllowedError") {
                        updateAudioStatus("Playback was blocked. Tap Play again or check browser permissions.");
                        control.classList.remove("active");
                        return;
                    }
                }

                // Relative paths failed: try a previously selected audio folder.
                const selected = selectedAudioUrl(audio);
                if (selected) {
                    const result = await tryAudioSource(audio, selected);
                    if (result.ok) return;
                    if (result.error?.name === "NotAllowedError") {
                        updateAudioStatus("Playback was blocked. Tap Play again or check browser permissions.");
                        control.classList.remove("active");
                        return;
                    }
                }

                audioLocation.style.display = "block";
                control.classList.remove("active");
                control.classList.add("audio-missing");
                audio.controls = false;
                updateAudioStatus("Recording not found: " + filename +
                    ". Select its containing folder above.");
            });
        });
    </script>
</body>
</html>`;
}


function getRecordingSortDate(record) {
    const value = record.recordingDate;

    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    const text = String(value).trim();
    if (!text || text.toLowerCase() === "date unknown") {
        return null;
    }

    // Parse common day-first dates first, so a date such as 05/06/2025
    // is interpreted consistently as 5 June rather than depending on locale.
    const dayFirst = text.match(
        /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );

    if (dayFirst) {
        const [, day, month, year, hour = "0", minute = "0", second = "0"] = dayFirst;
        const date = new Date(
            Number(year), Number(month) - 1, Number(day),
            Number(hour), Number(minute), Number(second)
        );

        if (
            date.getFullYear() === Number(year) &&
            date.getMonth() === Number(month) - 1 &&
            date.getDate() === Number(day)
        ) {
            return date.getTime();
        }
    }

    // ISO dates and other unambiguous date strings are handled consistently
    // by the standard parser.
    const parsed = Date.parse(text);
    if (Number.isFinite(parsed)) {
        return parsed;
    }

    return null;
}

function inferDefaultSort(records) {
    const headings = records.map(record =>
        record.recordingFilename || record.filename || "Untitled recording"
    );
    const dates = records.map(getRecordingSortDate);

    const isSorted = compare => records.every((_record, index) =>
        index === 0 || compare(index - 1, index) <= 0
    );

    const compareAlpha = (a, b) => headings[a].localeCompare(
        headings[b], undefined, { numeric: true, sensitivity: "base" }
    );

    const compareDate = (a, b) => {
        if (dates[a] === null && dates[b] !== null) return 1;
        if (dates[a] !== null && dates[b] === null) return -1;
        if (dates[a] === null && dates[b] === null) return 0;
        return dates[a] - dates[b];
    };

    const ascendingDatesAvailable = dates.filter(date => date !== null).length >= 2;

    if (ascendingDatesAvailable) {
        const oldest = isSorted(compareDate);
        const newest = isSorted((a, b) => compareDate(b, a));
        if (oldest && !newest) return { type: "date", direction: "oldest" };
        if (newest && !oldest) return { type: "date", direction: "newest" };
    }

    const alphabetical = isSorted(compareAlpha);
    const reverseAlphabetical = isSorted((a, b) => compareAlpha(b, a));

    if (alphabetical && !reverseAlphabetical) {
        return { type: "alpha", direction: "az" };
    }
    if (reverseAlphabetical && !alphabetical) {
        return { type: "alpha", direction: "za" };
    }

    // If the input order is ambiguous (for example, all dates are identical),
    // choose the common chronological default without changing the HTML order
    // until the user explicitly selects a sort option.
    return { type: "date", direction: "oldest" };
}

function createTranscriptSection(record, index, metadataOptions) {

    const heading =
        record.recordingFilename ||
        record.filename ||
        "Untitled recording";

    const sortDate = getRecordingSortDate(record);

    const metadataFields = getCombinedMetadataFields(record);
    const hasVisibleMetadata = metadataFields.some(([key]) => metadataOptions[key]);

    const transcript =
        record.transcript ||
        "";

    return `
        <section
            class="record"
            data-sort-name="${escapeHTML(heading)}"
            data-sort-date="${sortDate === null ? "" : sortDate}"
            data-original-index="${index}"
        >
            <h2 data-metadata-field="title" ${metadataOptions.title ? "" : "hidden"}>${escapeHTML(heading)}</h2>

            <div class="metadata" ${hasVisibleMetadata ? "" : "hidden"}>
                ${metadataFields.map(([key, label, value]) =>
                    `<div data-metadata-field="${key}" ${metadataOptions[key] ? "" : "hidden"}>${label}: ${escapeHTML(value)}</div>`
                ).join("\n")}
            </div>

            ${createAudioControl(record)}
            <div class="transcript">${escapeHTML(transcript)}</div>
            <hr class="transcript-separator" data-metadata-field="separator" ${metadataOptions.separator ? "" : "hidden"}>
        </section>
    `;
}


function createAudioControl(record) {

    const relativePath = record.playbackAudioPath === undefined
        ? record.audioRelativePath
        : record.playbackAudioPath;
    const audioPath =
        relativePath ||
        record.recordingFilename ||
        "";

    if (!audioPath) {
        return "";
    }

    const safePath =
        escapeHTML(audioPath);

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
                controls
                data-src="${safePath}"
                data-filename="${escapeHTML(record.recordingFilename || "")}"
            ></audio>
            <span class="audio-location-needed">Audio not found — use Locate Audio Folder above.</span>
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
