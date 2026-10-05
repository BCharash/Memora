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


function renderSearchResults(payload) {

    if (!searchResults) {
        return [];
    }

    searchResults.innerHTML = "";

    const rawResults =
        payload?.results || [];

    if (rawResults.length === 0) {

        searchResults.innerHTML = `
            <p class="empty-message">
                No semantic matches were found.
            </p>
        `;

        return [];
    }

    // Contextual chunks and sentence matches are independent retrieval
    // mechanisms. A chunk result is never discarded merely because none of
    // its sentences is a strong sentence-level match.
    const files = new Map();

    function getFileGroup(result) {

        let group =
            files.get(result.filename);

        if (!group) {
            group = {
                filename: result.filename,
                record: result.record,
                passages: new Map(),
                displayRank: 0
            };

            files.set(
                result.filename,
                group
            );
        }

        return group;
    }

    const chunkPassages = [];

    for (const result of payload.chunkResults || []) {

        const group =
            getFileGroup(result);

        const key =
            `chunk:${result.firstSentenceGlobalIndex}`;

        const passage = {
            type: "chunk",
            text: result.text,
            paragraph: null,
            paragraphIndex: null,
            matches: [],
            bestScore: result.score,
            firstSentenceGlobalIndex:
                result.firstSentenceGlobalIndex,
            lastSentenceGlobalIndex:
                result.lastSentenceGlobalIndex,
            sentenceRefs: result.sentences
        };

        group.passages.set(key, passage);
        group.displayRank = Math.max(
            group.displayRank,
            result.relativeRank || 0
        );
        chunkPassages.push({
            result,
            group,
            passage
        });
    }

    // Add sentence matches. If the sentence belongs to one of the displayed
    // contextual chunks, use it only to provide optional highlighting inside
    // that chunk. Sentence-only results are used only to fill the result set
    // when fewer than 30 contextual transcripts were found.
    const contextualFileNames =
        new Set(
            (payload.chunkResults || [])
                .map(result => result.filename)
        );
    const sentenceOnlyFiles = new Set();
    const sentenceOnlyLimit =
        Math.max(0, 30 - contextualFileNames.size);

    for (const result of payload.sentenceResults || []) {

        const containingChunk =
            chunkPassages.find(item =>
                item.result.filename === result.filename &&
                item.result.sentences.some(sentence =>
                    sentence.sentenceIndex === result.sentenceIndex &&
                    sentence.paragraphIndex === result.paragraphIndex
                )
            );

        if (containingChunk) {
            containingChunk.passage.matches.push(result);
            containingChunk.passage.bestScore = Math.max(
                containingChunk.passage.bestScore,
                result.score
            );
            continue;
        }

        if (
            !contextualFileNames.has(result.filename) &&
            !sentenceOnlyFiles.has(result.filename)
        ) {
            if (sentenceOnlyFiles.size >= sentenceOnlyLimit) {
                continue;
            }
            sentenceOnlyFiles.add(result.filename);
        }

        const group =
            getFileGroup(result);

        const key =
            `paragraph:${result.paragraphIndex}`;

        let passage =
            group.passages.get(key);

        if (!passage) {
            passage = {
                type: "sentence",
                text: null,
                paragraph: result.paragraph,
                paragraphIndex: result.paragraphIndex,
                matches: [],
                bestScore: result.score
            };

            group.passages.set(key, passage);
        }

        passage.matches.push(result);
        passage.bestScore = Math.max(
            passage.bestScore,
            result.score
        );
        if (group.displayRank === 0) {
            group.displayRank =
                Math.max(
                    group.displayRank,
                    1 / Math.max(1, result.rank || 1)
                );
        }
    }

    const groups =
        Array.from(files.values())
            .filter(group => group.passages.size > 0)
            .sort((a, b) => b.displayRank - a.displayRank);

    const toolbar =
        document.createElement("div");

    toolbar.className =
        "search-results-toolbar";

    const selectAllLabel =
        document.createElement("label");

    const selectAllCheckbox =
        document.createElement("input");

    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = true;

    selectAllLabel.appendChild(
        selectAllCheckbox
    );
    selectAllLabel.appendChild(
        document.createTextNode("Select all")
    );

    const summary =
        document.createElement("span");

    summary.textContent =
        `${groups.length} transcript${groups.length === 1 ? "" : "s"} represented · ` +
        `${(payload.sentenceResults || []).length} sentence matches · ` +
        `${(payload.chunkResults || []).length} contextual chunk matches`;

    const useButton =
        document.createElement("button");

    useButton.type = "button";
    useButton.className =
        "search-use-combine-button";
    useButton.textContent =
        "Use Selected in Combine";

    toolbar.appendChild(selectAllLabel);

    const collapseCheckboxTop =
        document.createElement("input");

    collapseCheckboxTop.type = "checkbox";
    collapseCheckboxTop.id =
        "collapseAllSearchTop";

    const collapseLabelTop =
        document.createElement("label");

    collapseLabelTop.htmlFor =
        "collapseAllSearchTop";
    collapseLabelTop.textContent =
        "Collapse all";

    const collapseControlTop =
        document.createElement("span");

    collapseControlTop.className =
        "selection-action";

    collapseControlTop.appendChild(
        collapseCheckboxTop
    );

    collapseControlTop.appendChild(
        collapseLabelTop
    );

    toolbar.appendChild(
        collapseControlTop
    );

    toolbar.appendChild(summary);
    toolbar.appendChild(useButton);
    searchResults.appendChild(toolbar);

    const upperSeparator =
        document.createElement("div");

    upperSeparator.className =
        "selection-double-separator";

    searchResults.appendChild(
        upperSeparator
    );

    const groupCheckboxes = [];
    let searchResultListItems = [];
    let searchResultsCollapsed = false;

    for (const group of groups) {

        const section =
            document.createElement("section");

        section.className =
            "search-result-file";

        const header =
            document.createElement("div");

        header.className =
            "search-result-file-header";

        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.className =
            "search-result-file-checkbox";
        checkbox.dataset.filename =
            group.filename;
        checkbox.dataset.searchFileKey =
            group.filename;

        groupCheckboxes.push(checkbox);

        const fileText =
            document.createElement("div");

        const fileName =
            document.createElement("div");

        fileName.className =
            "search-result-file-name";
        fileName.textContent =
            group.filename;

        fileText.appendChild(fileName);

        if (group.record.recordingFilename) {
            const details =
                document.createElement("div");

            details.className =
                "search-result-file-details";
            details.textContent =
                group.record.recordingFilename;

            fileText.appendChild(details);
        }

        header.appendChild(checkbox);
        header.appendChild(fileText);
        section.appendChild(header);

        const passages =
            Array.from(group.passages.values())
                .sort((a, b) => b.bestScore - a.bestScore)
                .slice(0, 4);

        for (const passage of passages) {

            const passageElement =
                document.createElement("div");

            passageElement.className =
                "search-result-passage";

            const label =
                document.createElement("div");

            label.className =
                "search-result-passage-label";
            label.textContent =
                passage.type === "chunk"
                    ? "Contextual match"
                    : "Sentence match";

            const textElement =
                document.createElement("div");

            textElement.className =
                "search-result-passage-text";

            if (passage.type === "chunk") {

                appendHighlightedChunk(
                    textElement,
                    passage.text,
                    passage.matches
                );

            } else {

                appendHighlightedParagraph(
                    textElement,
                    passage.paragraph,
                    passage.matches
                );
            }

            passageElement.appendChild(label);
            passageElement.appendChild(textElement);
            section.appendChild(passageElement);
        }

        searchResults.appendChild(section);
        searchResultListItems.push(section);
    }

    const bottomSeparator =
        document.createElement("div");

    bottomSeparator.className =
        "selection-double-separator";

    searchResults.appendChild(
        bottomSeparator
    );

    const collapseCheckboxBottom =
        document.createElement("input");

    collapseCheckboxBottom.type = "checkbox";
    collapseCheckboxBottom.id =
        "collapseAllSearchBottom";

    const collapseLabelBottom =
        document.createElement("label");

    collapseLabelBottom.htmlFor =
        "collapseAllSearchBottom";
    collapseLabelBottom.textContent =
        "Collapse all";

    const collapseControlBottom =
        document.createElement("div");

    collapseControlBottom.className =
        "selection-action selection-action-bottom";

    collapseControlBottom.appendChild(
        collapseCheckboxBottom
    );

    collapseControlBottom.appendChild(
        collapseLabelBottom
    );

    searchResults.appendChild(
        collapseControlBottom
    );

    function updateSearchCollapseUI() {

        const label =
            searchResultsCollapsed
                ? "Expand all"
                : "Collapse all";

        collapseLabelTop.textContent = label;
        collapseLabelBottom.textContent = label;

        collapseCheckboxTop.checked = false;
        collapseCheckboxBottom.checked = false;

        searchResultListItems.forEach(
            section => {
                section.hidden = searchResultsCollapsed;
            }
        );
    }

    function toggleSearchCollapse() {
        searchResultsCollapsed =
            !searchResultsCollapsed;
        updateSearchCollapseUI();
    }

    function expandSearchResultsFromBottom() {
        const bottomTopBefore =
            collapseControlBottom
                ? collapseControlBottom.getBoundingClientRect().top
                : null;

        searchResultsCollapsed = false;
        updateSearchCollapseUI();

        if (bottomTopBefore !== null) {
            requestAnimationFrame(() => {
                const bottomTopAfter =
                    collapseControlBottom.getBoundingClientRect().top;

                window.scrollBy(
                    0,
                    bottomTopAfter - bottomTopBefore
                );
            });
        }
    }

    collapseCheckboxTop.onchange =
        toggleSearchCollapse;

    collapseCheckboxBottom.onchange = () => {
        if (searchResultsCollapsed) {
            expandSearchResultsFromBottom();
        } else {
            toggleSearchCollapse();
        }
    };

    updateSearchCollapseUI();

    function updateSelectionUI() {

        const selectedCount =
            groupCheckboxes.filter(
                checkbox => checkbox.checked
            ).length;

        selectAllCheckbox.checked =
            selectedCount === groupCheckboxes.length;

        selectAllCheckbox.indeterminate =
            selectedCount > 0 &&
            selectedCount < groupCheckboxes.length;

        useButton.disabled =
            selectedCount === 0;

        useButton.textContent =
            selectedCount === 0
                ? "Use Selected in Combine"
                : `Use ${selectedCount} Selected in Combine`;
    }

    selectAllCheckbox.onchange = () => {
        groupCheckboxes.forEach(
            checkbox => {
                checkbox.checked =
                    selectAllCheckbox.checked;
            }
        );

        updateSelectionUI();
    };

    groupCheckboxes.forEach(
        checkbox => {
            checkbox.onchange = updateSelectionUI;
        }
    );

    useButton.onclick = async () => {

        const selected =
            groupCheckboxes
                .filter(checkbox => checkbox.checked)
                .map(checkbox =>
                    groups.find(
                        group =>
                            group.filename ===
                            checkbox.dataset.filename
                    )?.record.file
                )
                .filter(Boolean);

        await combineSelectionHandler(
            selected,
            searchQueryInput?.value.trim() || "",
            searchSourceHandle
        );
    };

    updateSelectionUI();

    return groups
        .map(group => group.record.file)
        .filter(Boolean);
}


function appendHighlightedChunk(
    container,
    chunkText,
    matchedSentences
) {

    const text =
        normalizeSearchParagraph(chunkText);

    if (!text) {
        return;
    }

    if (!matchedSentences || matchedSentences.length === 0) {
        container.textContent = text;
        return;
    }

    appendHighlightedParagraph(
        container,
        text,
        matchedSentences
    );
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

        renderSearchResults(payload);

        setSearchQueryStatus(
            `${payload.chunkResults.length} contextual result${payload.chunkResults.length === 1 ? "" : "s"} from 3–1, 5–2 and 7–3 context` +
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
