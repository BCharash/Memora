// --------------------------------------------------
// Search UI
// --------------------------------------------------
let getStorageModule;
let getSearchModule;

const searchSourceButton = document.getElementById("searchSourceButton");
const searchIndexUpdateButton = document.getElementById("searchIndexUpdateButton");
const searchQueryInput = document.getElementById("searchQueryInput");
const searchButton = document.getElementById("searchButton");
const searchIndexStatus = document.getElementById("searchIndexStatus");
const searchQueryStatus = document.getElementById("searchQueryStatus");
const searchResults = document.getElementById("searchResults");

let searchSourceHandle = null;
let searchIndexBuildToken = 0;
let searchIndexReady = false;
let combineSelectionHandler = null;
let currentSearchIndex = null;

function setSearchBusy(busy) {

    if (searchSourceButton) {
        searchSourceButton.disabled = busy;
    }

    if (searchQueryInput) {
        searchQueryInput.disabled = busy || !searchIndexReady;
    }

    if (searchButton) {
        searchButton.disabled = busy || !searchIndexReady;
    }
}


function setSearchIndexStatus(message, busy = false) {

    if (!searchIndexStatus) {
        return;
    }

    searchIndexStatus.innerHTML = "";

    if (busy) {
        const spinner =
            document.createElement("span");

        spinner.className =
            "transcription-spinner";
        spinner.setAttribute(
            "aria-hidden",
            "true"
        );

        searchIndexStatus.appendChild(
            spinner
        );
    }

    const text =
        document.createElement("span");

    text.textContent = message;

    searchIndexStatus.appendChild(text);
}


function setSearchQueryStatus(message, busy = false) {

    if (!searchQueryStatus) {
        return;
    }

    searchQueryStatus.hidden = false;
    searchQueryStatus.innerHTML = "";

    if (busy) {
        const spinner =
            document.createElement("span");

        spinner.className =
            "transcription-spinner";
        spinner.setAttribute(
            "aria-hidden",
            "true"
        );

        searchQueryStatus.appendChild(
            spinner
        );
    }

    const text =
        document.createElement("span");

    text.textContent = message;

    searchQueryStatus.appendChild(text);
}


function formatElapsed(seconds) {
    if (seconds < 1) {
        return `${Math.round(seconds * 1000)} ms`;
    }

    return `${seconds.toFixed(1)} s`;
}


async function getSearchSourceFiles(handle) {

    const storage =
        await getStorageModule();

    return handle.kind === "file-input"
        ? handle.files.filter(
            file => /\.txt$/i.test(file.name)
        )
        : await storage.listTextFiles(handle);
}


async function buildSearchIndexForSource(files) {

    const token = ++searchIndexBuildToken;
    searchIndexReady = false;
    currentSearchIndex = null;
    setSearchBusy(true);

    if (searchIndexUpdateButton) {
        searchIndexUpdateButton.disabled = true;
    }

    if (searchQueryStatus) {
        searchQueryStatus.hidden = true;
        searchQueryStatus.textContent = "";
    }

    setSearchIndexStatus(
        "Loading the Search Index…",
        true
    );

    if (searchResults) {
        searchResults.innerHTML = `
            <p class="empty-message">
                Loading the Search Index…
            </p>
        `;
    }

    try {

        const storage =
            await getStorageModule();

        let archive = null;

        try {
            const archiveText =
                await storage.readTextFile(
                    searchSourceHandle,
                    "search-embeddings.json"
                );

            if (archiveText) {
                archive = JSON.parse(archiveText);
            }
        } catch (error) {
            console.warn(
                "Search Index could not be loaded. A new index will be generated.",
                error
            );
        }

        if (token !== searchIndexBuildToken) {
            return;
        }

        const search =
            await getSearchModule();

        const index =
            await search.buildSearchIndex(
                files,
                message => {
                    if (token !== searchIndexBuildToken) {
                        return;
                    }

                    setSearchIndexStatus(
                        message,
                        true
                    );
                },
                archive
            );

        if (token !== searchIndexBuildToken) {
            return;
        }

        currentSearchIndex = index;
        searchIndexReady =
            index.sentences > 0;

        const elapsedSeconds =
            index.durationMs / 1000;

        if (searchIndexStatus) {

            if (index.sentences > 0) {
                const timingDetails =
                    `Reading ${formatElapsed(index.readDurationMs / 1000)} · ` +
                    `sentences ${formatElapsed(index.sentenceProcessingDurationMs / 1000)} · ` +
                    `chunks ${formatElapsed(index.chunkProcessingDurationMs / 1000)} · ` +
                    `embeddings ${formatElapsed(index.embeddingDurationMs / 1000)}`;

                const archiveMessage =
                    index.archiveNeedsUpdate
                        ? " · Search Index update available"
                        : " · Search Index current";

                setSearchIndexStatus(
                    `Search ready — ${index.records.length} transcript${index.records.length === 1 ? "" : "s"}, ` +
                    `${index.sentences.toLocaleString()} sentences + ${index.chunkCount.toLocaleString()} contextual chunks indexed in ${formatElapsed(elapsedSeconds)} ` +
                    `(${timingDetails})${archiveMessage}.`
                );
            } else {
                setSearchIndexStatus(
                    "No searchable sentences were found in the selected transcripts."
                );
            }
        }

        if (searchIndexUpdateButton) {
            searchIndexUpdateButton.disabled =
                !index.archiveNeedsUpdate;
        }

        setSearchBusy(false);

    } catch (error) {

        if (token !== searchIndexBuildToken) {
            return;
        }

        console.error(
            "Search index error:",
            error
        );

        searchIndexReady = false;
        currentSearchIndex = null;
        setSearchBusy(false);

        if (searchIndexUpdateButton) {
            searchIndexUpdateButton.disabled = true;
        }

        if (searchIndexStatus) {
            setSearchIndexStatus(
                "Unable to build the semantic search index."
            );
        }

        if (searchResults) {
            searchResults.innerHTML = `
                <p class="empty-message">
                    Search indexing failed. See the browser console for details.
                </p>
            `;
        }
    }
}


async function updateSearchIndexArchive() {

    if (!currentSearchIndex || !searchSourceHandle) {
        return;
    }

    const search =
        await getSearchModule();

    const storage =
        await getStorageModule();

    const archiveText =
        search.serializeSearchEmbeddingsArchive(
            currentSearchIndex
        );

    if (searchSourceHandle.kind === "file-input") {
        const file =
            new File(
                [archiveText],
                "search-embeddings.json",
                { type: "application/json" }
            );

        await storage.shareFile(file);
    } else {
        await storage.writeTextFile(
            searchSourceHandle,
            "search-embeddings.json",
            archiveText
        );
    }

    currentSearchIndex.archiveNeedsUpdate = false;

    if (searchIndexUpdateButton) {
        searchIndexUpdateButton.disabled = true;
    }

    setSearchIndexStatus(
        "Search Index updated."
    );
}


function normalizeSearchParagraph(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
}

// Use a punctuation-insensitive key when matching the same sentence across
// indexing, contextual chunks, and the displayed transcript. Formatting and
// punctuation can differ slightly between those representations.
function normalizeSentenceMatchKey(text) {
    return normalizeSearchParagraph(text)
        .normalize("NFKC")
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}


function appendHighlightedParagraph(
    container,
    paragraph,
    matchedSentences
) {

    const text =
        normalizeSearchParagraph(paragraph);

    if (!text) {
        return;
    }

    const matches = [...matchedSentences]
        .sort((a, b) =>
            a.sentenceIndex - b.sentenceIndex
        );

    let cursor = 0;

    for (const match of matches) {

        const sentence =
            normalizeSearchParagraph(match.sentence);

        if (!sentence) {
            continue;
        }

        const start =
            text.indexOf(sentence, cursor);

        if (start === -1) {
            continue;
        }

        if (start > cursor) {
            container.appendChild(
                document.createTextNode(
                    text.slice(cursor, start)
                )
            );
        }

        const mark =
            document.createElement("mark");

        mark.textContent = sentence;
        container.appendChild(mark);

        cursor =
            start + sentence.length;
    }

    if (cursor < text.length) {
        container.appendChild(
            document.createTextNode(
                text.slice(cursor)
            )
        );
    }

    if (!container.childNodes.length) {
        container.textContent = text;
    }
}


function searchPositionKey(filename, paragraphIndex, sentenceIndex) {
    return `position:${filename}|${paragraphIndex}|${sentenceIndex}`;
}

function splitTranscriptSentences(text) {
    let normalized = String(text || "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) return [];

    normalized = normalized
        .replace(/\bMr\./g, "Mr§")
        .replace(/\bMrs\./g, "Mrs§")
        .replace(/\bDr\./g, "Dr§")
        .replace(/\bMs\./g, "Ms§")
        .replace(/\be\.g\./gi, "eg§")
        .replace(/\bi\.e\./gi, "ie§");

    return (normalized.match(/[^.!?]+(?:[.!?]+["'’”)]*)?(?=\s+|$)/g) || [normalized])
        .map(sentence => sentence.replace(/§/g, ".").trim())
        .filter(Boolean);
}

function setSentenceColor(group, paragraphIndex, sentenceIndex, color, priority, sentenceText = "") {
    const assignment = { color, priority };
    const positionKey = searchPositionKey(group.filename, paragraphIndex, sentenceIndex);
    const existingPosition = group.sentenceColors.get(positionKey);
    if (!existingPosition || priority < existingPosition.priority) {
        group.sentenceColors.set(positionKey, assignment);
    }

    // Text fallback protects highlighting if transcript paragraph/sentence
    // numbering differs slightly between the indexed text and displayed text.
    const normalizedSentence = normalizeSentenceMatchKey(sentenceText);
    if (normalizedSentence) {
        const textKey = `text:${group.filename}|${normalizedSentence}`;
        const existingText = group.sentenceColors.get(textKey);
        if (!existingText || priority < existingText.priority) {
            group.sentenceColors.set(textKey, assignment);
        }
    }
}

function appendColoredTranscript(container, group) {
    const transcript = String(group.record?.transcript || "").trim();
    if (!transcript) {
        const fallback = document.createElement("p");
        fallback.className = "empty-message";
        fallback.textContent = "The full transcript text is unavailable for this result.";
        container.appendChild(fallback);
        return;
    }

    const paragraphs = transcript
        .replace(/\r\n?/g, "\n")
        .split(/\n\s*\n+/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean);

    const colors = {
        yellow: "#FFFF00",
        blue: "#C8E7FF",
        orange: "#FFD2B3",
        green: "#D8EBCB"
    };

    // Yellow is priority 0, then blue, orange and green. Resolve positional
    // and text-fallback assignments together so a mismatched position cannot
    // mask a yellow sentence match.
    const getAssignment = (paragraphIndex, sentenceIndex, sentence) => {
        const normalizedText = normalizeSentenceMatchKey(sentence);

        // Direct sentence matches are tracked separately from contextual colors.
        // This gives yellow first priority even if position keys or contextual
        // sentence references do not line up exactly.
        if (group.yellowSentences?.has(normalizedText)) {
            return { color: "yellow", priority: 0 };
        }

        const positionKey = searchPositionKey(group.filename, paragraphIndex, sentenceIndex);
        const textKey = `text:${group.filename}|${normalizeSentenceMatchKey(sentence)}`;
        const positionAssignment = group.sentenceColors.get(positionKey);
        const textAssignment = group.sentenceColors.get(textKey);

        if (!positionAssignment) return textAssignment || null;
        if (!textAssignment) return positionAssignment;
        return textAssignment.priority < positionAssignment.priority
            ? textAssignment
            : positionAssignment;
    };

    paragraphs.forEach((paragraph, paragraphIndex) => {
        const paragraphElement = document.createElement("p");
        paragraphElement.className = "search-full-transcript-paragraph";
        const sentences = splitTranscriptSentences(paragraph);
        const pieces = sentences.map((sentence, sentenceIndex) => ({
            sentence,
            assignment: getAssignment(paragraphIndex, sentenceIndex, sentence)
        }));

        // Adjacent sentences of the same color are emitted as one continuous
        // span, including the spaces between them.
        let run = null;
        const flushRun = () => {
            if (!run) return;
            // Use native <mark> for direct sentence matches. This keeps the
            // yellow match visually distinct from contextual highlight spans.
            const mark = document.createElement(run.color === "yellow" ? "mark" : "span");
            mark.className = `search-transcript-highlight search-highlight-${run.color}`;
            mark.style.setProperty("background-color", colors[run.color], "important");
            mark.style.setProperty("color", "inherit", "important");
            mark.style.setProperty("-webkit-box-decoration-break", "clone");
            mark.style.setProperty("box-decoration-break", "clone");
            mark.style.borderRadius = "2px";
            mark.textContent = run.text;
            paragraphElement.appendChild(mark);
            run = null;
        };

        pieces.forEach((piece, index) => {
            const color = piece.assignment?.color || null;

            if (index > 0) {
                if (run && run.color === color && color) {
                    run.text += " ";
                } else {
                    flushRun();
                    if (color) run = { color, text: " " };
                    else paragraphElement.appendChild(document.createTextNode(" "));
                }
            }

            if (color) {
                if (run && run.color === color) run.text += piece.sentence;
                else {
                    flushRun();
                    run = { color, text: piece.sentence };
                }
            } else {
                flushRun();
                paragraphElement.appendChild(document.createTextNode(piece.sentence));
            }
        });

        flushRun();
        container.appendChild(paragraphElement);
    });
}

async function resolveSearchAudioFile(relativePath, recordingFilename) {
    const candidates = [...new Set([relativePath, recordingFilename].filter(Boolean))];
    const handle = searchSourceHandle;

    if (!handle) return null;

    if (handle.kind === "file-input") {
        const wanted = new Set(candidates.map(value => value.split("/").pop().toLocaleLowerCase()));
        return handle.files.find(file => wanted.has(file.name.toLocaleLowerCase())) || null;
    }

    for (const candidate of candidates) {
        try {
            let currentHandle = handle;
            const parts = candidate.replace(/\\/g, "/").split("/").filter(Boolean);
            let fileHandle = null;

            for (let index = 0; index < parts.length; index++) {
                const part = parts[index];
                if (index === parts.length - 1) {
                    fileHandle = await currentHandle.getFileHandle(part);
                } else {
                    currentHandle = await currentHandle.getDirectoryHandle(part);
                }
            }

            if (fileHandle) return await fileHandle.getFile();
        } catch (_) {
            // Try the next known path or filename.
        }
    }

    return null;
}

function appendSearchAudioControl(section, group) {
    const relativePath = group.record?.audioRelativePath || "";
    const recordingFilename = group.record?.recordingFilename || "";
    if (!relativePath && !recordingFilename) return;

    const control = document.createElement("div");
    control.className = "search-result-audio-control";

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.textContent = "Load audio";
    loadButton.setAttribute("aria-label", "Load recording audio");

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.hidden = true;

    loadButton.addEventListener("click", async () => {
        loadButton.disabled = true;
        loadButton.textContent = "Loading audio…";
        try {
            const file = await resolveSearchAudioFile(relativePath, recordingFilename);
            if (!file) throw new Error("Recording file not found in the selected Search Source folder.");
            if (audio.dataset.objectUrl) URL.revokeObjectURL(audio.dataset.objectUrl);
            const objectUrl = URL.createObjectURL(file);
            audio.dataset.objectUrl = objectUrl;
            audio.src = objectUrl;
            audio.hidden = false;
            loadButton.textContent = "Audio loaded";
            loadButton.disabled = false;
        } catch (error) {
            loadButton.textContent = "Audio unavailable";
            loadButton.title = error?.message || "Could not load the recording.";
            loadButton.disabled = false;
        }
    });

    control.appendChild(loadButton);
    control.appendChild(audio);
    section.appendChild(control);
}

function renderSearchResults(payload) {
    if (!searchResults) {
        return { files: [], displayedChunkCount: 0 };
    }

    searchResults.innerHTML = "";
    const rawResults = payload?.results || [];
    if (rawResults.length === 0) {
        searchResults.innerHTML = '<p class="empty-message">No semantic matches were found.</p>';
        return { files: [], displayedChunkCount: 0 };
    }

    const files = new Map();
    function getFileGroup(result) {
        let group = files.get(result.filename);
        if (!group) {
            group = {
                filename: result.filename,
                record: result.record,
                sentenceColors: new Map(),
                yellowSentences: new Set(),
                displayRank: 0
            };
            files.set(result.filename, group);
        }
        return group;
    }

    function sentenceKeys(filename, sentence) {
        // Overlap suppression must use sentence identity, not paragraph/sentence
        // coordinates: coordinates can shift when transcript paragraphing or
        // sentence splitting differs between indexing and display.
        const sentenceText = sentence.sentence ?? sentence.text ?? "";
        const normalizedSentence = normalizeSentenceMatchKey(sentenceText);
        return normalizedSentence
            ? [`text:${filename}|${normalizedSentence}`]
            : [];
    }

    const sentenceMatchKeys = new Set();
    for (const result of payload.sentenceResults || []) {
        for (const key of sentenceKeys(result.filename, result)) sentenceMatchKeys.add(key);
        const group = getFileGroup(result);
        const yellowText = normalizeSearchParagraph(result.sentence ?? result.text ?? "");
        if (yellowText) {
            group.yellowSentences.add(normalizeSentenceMatchKey(yellowText));
        }
        setSentenceColor(
            group,
            result.paragraphIndex,
            result.sentenceIndex,
            "yellow",
            0,
            yellowText
        );
        group.displayRank = Math.max(group.displayRank, 1 / Math.max(1, result.rank || 1));
    }

    const orderedChunks = [...(payload.chunkResults || [])].sort((a, b) => {
        const sizeA = Number(String(a.representation || "7–3").split("–")[0]);
        const sizeB = Number(String(b.representation || "7–3").split("–")[0]);
        if (sizeA !== sizeB) return sizeA - sizeB;
        if ((b.relativeRank || 0) !== (a.relativeRank || 0)) return (b.relativeRank || 0) - (a.relativeRank || 0);
        return (b.score || 0) - (a.score || 0);
    });

    const acceptedChunksByFile = new Map();
    let displayedChunkCount = 0;
    const colorByRepresentation = { "3–1": "blue", "5–2": "orange", "7–3": "green" };
    const priorityByRepresentation = { "3–1": 1, "5–2": 2, "7–3": 3 };

    for (const result of orderedChunks) {
        const refs = result.sentences || [];
        const keys = refs.flatMap(sentence => sentenceKeys(result.filename, sentence));
        const chunkSize = Number(String(result.representation || "7–3").split("–")[0]);

        // Sentence matches are always yellow and suppress every contextual chunk that contains one.
        if (keys.some(key => sentenceMatchKeys.has(key))) continue;

        const acceptedChunks = acceptedChunksByFile.get(result.filename) || [];
        // A broader chunk is suppressed if it shares any sentence with an accepted narrower chunk.
        if (acceptedChunks.some(accepted => accepted.chunkSize < chunkSize && keys.some(key => accepted.keys.has(key)))) {
            continue;
        }

        const group = getFileGroup(result);
        const color = colorByRepresentation[result.representation];
        const priority = priorityByRepresentation[result.representation];
        if (color && Number.isFinite(priority)) {
            for (const ref of refs) {
                setSentenceColor(group, ref.paragraphIndex, ref.sentenceIndex, color, priority, ref.sentence);
            }
        }

        acceptedChunks.push({ chunkSize, keys: new Set(keys) });
        acceptedChunksByFile.set(result.filename, acceptedChunks);
        group.displayRank = Math.max(group.displayRank, result.relativeRank || 0);
        displayedChunkCount++;
    }

    const groups = Array.from(files.values()).sort((a, b) => b.displayRank - a.displayRank);

    const toolbar = document.createElement("div");
    toolbar.className = "search-results-toolbar";

    const selectAllLabel = document.createElement("label");
    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = true;
    selectAllLabel.appendChild(selectAllCheckbox);
    selectAllLabel.appendChild(document.createTextNode("Select all"));
    toolbar.appendChild(selectAllLabel);

    const collapseCheckboxTop = document.createElement("input");
    collapseCheckboxTop.type = "checkbox";
    collapseCheckboxTop.id = "collapseAllSearchTop";
    const collapseLabelTop = document.createElement("label");
    collapseLabelTop.htmlFor = "collapseAllSearchTop";
    collapseLabelTop.textContent = "Collapse all";
    const collapseControlTop = document.createElement("span");
    collapseControlTop.className = "selection-action";
    collapseControlTop.appendChild(collapseCheckboxTop);
    collapseControlTop.appendChild(collapseLabelTop);
    toolbar.appendChild(collapseControlTop);

    const summary = document.createElement("span");
    summary.textContent = `${groups.length} transcript${groups.length === 1 ? "" : "s"} represented · ${(payload.sentenceResults || []).length} sentence matches · ${displayedChunkCount} contextual chunks shown`;
    toolbar.appendChild(summary);

    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.className = "search-use-combine-button";
    useButton.textContent = "Use Selected in Combine";
    toolbar.appendChild(useButton);
    searchResults.appendChild(toolbar);

    const upperSeparator = document.createElement("div");
    upperSeparator.className = "selection-double-separator";
    searchResults.appendChild(upperSeparator);

    const groupCheckboxes = [];
    const searchResultListItems = [];
    let searchResultsCollapsed = false;

    for (const group of groups) {
        const section = document.createElement("section");
        section.className = "search-result-file";

        const header = document.createElement("div");
        header.className = "search-result-file-header";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.className = "search-result-file-checkbox";
        checkbox.dataset.filename = group.filename;
        checkbox.dataset.searchFileKey = group.filename;
        groupCheckboxes.push(checkbox);

        const fileText = document.createElement("div");
        const fileName = document.createElement("div");
        fileName.className = "search-result-file-name";
        fileName.textContent = group.filename;
        fileText.appendChild(fileName);
        if (group.record?.recordingFilename) {
            const details = document.createElement("div");
            details.className = "search-result-file-details";
            details.textContent = group.record.recordingFilename;
            fileText.appendChild(details);
        }
        header.appendChild(checkbox);
        header.appendChild(fileText);
        section.appendChild(header);

        appendSearchAudioControl(section, group);
        const transcriptElement = document.createElement("div");
        transcriptElement.className = "search-result-full-transcript";
        appendColoredTranscript(transcriptElement, group);
        section.appendChild(transcriptElement);

        searchResults.appendChild(section);
        searchResultListItems.push(section);
    }

    const bottomSeparator = document.createElement("div");
    bottomSeparator.className = "selection-double-separator";
    searchResults.appendChild(bottomSeparator);

    const collapseCheckboxBottom = document.createElement("input");
    collapseCheckboxBottom.type = "checkbox";
    collapseCheckboxBottom.id = "collapseAllSearchBottom";
    const collapseLabelBottom = document.createElement("label");
    collapseLabelBottom.htmlFor = "collapseAllSearchBottom";
    collapseLabelBottom.textContent = "Collapse all";
    const collapseControlBottom = document.createElement("div");
    collapseControlBottom.className = "selection-action selection-action-bottom";
    collapseControlBottom.appendChild(collapseCheckboxBottom);
    collapseControlBottom.appendChild(collapseLabelBottom);
    searchResults.appendChild(collapseControlBottom);

    function updateSearchCollapseUI() {
        const label = searchResultsCollapsed ? "Expand all" : "Collapse all";
        collapseLabelTop.textContent = label;
        collapseLabelBottom.textContent = label;
        collapseCheckboxTop.checked = false;
        collapseCheckboxBottom.checked = false;
        searchResultListItems.forEach(section => { section.hidden = searchResultsCollapsed; });
    }

    function toggleSearchCollapse() {
        searchResultsCollapsed = !searchResultsCollapsed;
        updateSearchCollapseUI();
    }

    function expandSearchResultsFromBottom() {
        const bottomTopBefore = collapseControlBottom?.getBoundingClientRect().top ?? null;
        searchResultsCollapsed = false;
        updateSearchCollapseUI();
        if (bottomTopBefore !== null) {
            requestAnimationFrame(() => {
                const bottomTopAfter = collapseControlBottom.getBoundingClientRect().top;
                window.scrollBy(0, bottomTopAfter - bottomTopBefore);
            });
        }
    }

    collapseCheckboxTop.onchange = toggleSearchCollapse;
    collapseCheckboxBottom.onchange = () => {
        if (searchResultsCollapsed) expandSearchResultsFromBottom();
        else toggleSearchCollapse();
    };
    updateSearchCollapseUI();

    function updateSelectionUI() {
        const selectedCount = groupCheckboxes.filter(checkbox => checkbox.checked).length;
        selectAllCheckbox.checked = selectedCount === groupCheckboxes.length;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < groupCheckboxes.length;
        useButton.disabled = selectedCount === 0;
        useButton.textContent = selectedCount === 0 ? "Use Selected in Combine" : `Use ${selectedCount} Selected in Combine`;
    }

    selectAllCheckbox.onchange = () => {
        groupCheckboxes.forEach(checkbox => { checkbox.checked = selectAllCheckbox.checked; });
        updateSelectionUI();
    };
    groupCheckboxes.forEach(checkbox => { checkbox.onchange = updateSelectionUI; });

    useButton.onclick = async () => {
        const selected = groupCheckboxes
            .filter(checkbox => checkbox.checked)
            .map(checkbox => groups.find(group => group.filename === checkbox.dataset.filename)?.record.file)
            .filter(Boolean);
        await combineSelectionHandler(selected, searchQueryInput?.value.trim() || "", searchSourceHandle);
    };

    updateSelectionUI();
    return {
        files: groups.map(group => group.record.file).filter(Boolean),
        displayedChunkCount
    };
}

function appendHighlightedChunk(
    container,
    chunkText,
    matchedSentences,
    representation
) {

    const text =
        normalizeSearchParagraph(chunkText);

    if (!text) {
        return;
    }

    // The color identifies the size of the contextual representation that
    // produced this result. Direct sentence matches remain yellow on top.
    const contextualColors = {
        "3–1": "#C8E7FF",
        "5–2": "#FFD2B3",
        "7–3": "#D8EBCB"
    };
    const contextualColor =
        contextualColors[representation] || "transparent";

    const highlightedText = document.createElement("span");
    highlightedText.style.backgroundColor = contextualColor;
    highlightedText.style.borderRadius = "2px";
    highlightedText.style.boxDecorationBreak = "clone";
    highlightedText.style.webkitBoxDecorationBreak = "clone";

    if (!matchedSentences || matchedSentences.length === 0) {
        highlightedText.textContent = text;
    } else {
        // Yellow sentence marks are nested inside the contextual span and
        // therefore take visual precedence over the contextual background.
        appendHighlightedParagraph(
            highlightedText,
            text,
            matchedSentences
        );
    }

    container.appendChild(highlightedText);
}


async function runSearchQuery() {

    if (!searchIndexReady || !searchQueryInput) {
        return;
    }

    const query =
        searchQueryInput.value.trim();

    if (!query) {
        searchQueryInput.focus();
        return;
    }

    if (searchButton) {
        searchButton.disabled = true;
    }

    setSearchQueryStatus(
        "Searching…",
        true
    );

    try {

        const search =
            await getSearchModule();

        const sentencePayload =
            await search.search(
                query,
                30,
                message => {
                    setSearchQueryStatus(
                        message,
                        true
                    );
                }
            );

        const contextualPayload =
            await search.searchStoredRepresentations(
                query,
                {
                    maxResults: 30,
                    records: search.getSearchIndexRecords()
                }
            );

        const payload = {
            results: sentencePayload.sentenceResults
                .concat(contextualPayload.chunkResults)
                .sort((a, b) => {
                    const aRank =
                        a.type === "chunk"
                            ? a.relativeRank
                            : 1 / Math.max(1, a.rank || 1);
                    const bRank =
                        b.type === "chunk"
                            ? b.relativeRank
                            : 1 / Math.max(1, b.rank || 1);
                    return bRank - aRank;
                }),
            sentenceResults: sentencePayload.sentenceResults,
            chunkResults: contextualPayload.chunkResults,
            durationMs: sentencePayload.durationMs,
            representations: contextualPayload.representations
        };

        const displaySummary = renderSearchResults(payload);

        setSearchQueryStatus(
            `${displaySummary.displayedChunkCount} contextual result${displaySummary.displayedChunkCount === 1 ? "" : "s"} shown after overlap filtering` +
            ` · ${formatElapsed(payload.durationMs / 1000)}.`
        );

    } catch (error) {

        console.error(
            "Search error:",
            error
        );

        setSearchQueryStatus(
            "Unable to perform the search."
        );
    }

    if (searchButton) {
        searchButton.disabled = !searchIndexReady;
    }
}


export function initSearchUI({
    getStorageModule: loadStorageModule,
    getSearchModule: loadSearchModule,
    onUseSelectionInCombine
}) {
    getStorageModule = loadStorageModule;
    getSearchModule = loadSearchModule;
    combineSelectionHandler = onUseSelectionInCombine;

    if (searchSourceButton) {

        searchSourceButton.addEventListener(
            "click",
            async () => {

                try {

                    const storage =
                        await getStorageModule();

                    const handle =
                        await storage.selectFolder();

                    const files =
                        await getSearchSourceFiles(handle);

                    searchSourceHandle = handle;

                    searchIndexReady = false;
                    setSearchBusy(true);
                    setSearchIndexStatus(
                        "Preparing the semantic index…",
                        true
                    );

                    if (searchQueryInput) {
                        searchQueryInput.value = "";
                    }

                    if (searchButton) {
                        searchButton.disabled = true;
                    }

                    searchSourceButton.textContent =
                        `Search Source: ${handle.name}`;

                    if (files.length === 0) {

                        setSearchIndexStatus(
                            "No transcript files found in the selected folder."
                        );

                        if (searchResults) {
                            searchResults.innerHTML = `
                                <p class="empty-message">
                                    No transcript files found.
                                </p>
                            `;
                        }

                        setSearchBusy(false);
                        return;
                    }

                    await buildSearchIndexForSource(files);

                } catch (error) {

                    if (error.name !== "AbortError") {

                        console.error(
                            "Search source error:",
                            error
                        );

                        searchIndexReady = false;
                        setSearchBusy(false);

                        setSearchIndexStatus(
                            "Unable to read the search source folder."
                        );
                    }
                }
            }
        );
    }


    if (searchIndexUpdateButton) {
        searchIndexUpdateButton.addEventListener(
            "click",
            async () => {
                if (searchIndexUpdateButton.disabled) {
                    return;
                }

                searchIndexUpdateButton.disabled = true;
                setSearchIndexStatus(
                    "Updating the Search Index…",
                    true
                );

                try {
                    await updateSearchIndexArchive();
                } catch (error) {
                    console.error(
                        "Search Index update error:",
                        error
                    );

                    searchIndexUpdateButton.disabled = false;
                    setSearchIndexStatus(
                        error.message ||
                        "Unable to update the Search Index."
                    );
                }
            }
        );
    }


    if (searchButton) {
        searchButton.addEventListener(
            "click",
            runSearchQuery
        );
    }


    if (searchQueryInput) {
        searchQueryInput.addEventListener(
            "keydown",
            event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    runSearchQuery();
                }
            }
        );
    }


}
