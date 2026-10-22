// --------------------------------------------------
// Search UI
// --------------------------------------------------
let getStorageModule;
let getSearchModule;

const searchSourceButton = document.getElementById("searchSourceButton");
const searchIndexUpdateButton = document.getElementById("searchIndexUpdateButton");
const searchQueryInput = document.getElementById("searchQueryInput");
const clearSearchButton = document.getElementById("clearSearchButton");
const lexicalFuzzySlider = document.getElementById("lexicalFuzzySlider");
const lexicalFuzzyValue = document.getElementById("lexicalFuzzyValue");
const semanticFractionSlider = document.getElementById("semanticFractionSlider");
const semanticFractionValue = document.getElementById("semanticFractionValue");
const LEXICAL_FUZZY_STORAGE_KEY = "memoraLexicalFuzzyThreshold";
const SEMANTIC_FRACTION_STORAGE_KEY = "memoraSemanticResultsFraction";
const DEFAULT_LEXICAL_FUZZY_PERCENT = 70;
const MIN_LEXICAL_FUZZY_PERCENT = 50;
const MAX_LEXICAL_FUZZY_PERCENT = 100;
const LEXICAL_FUZZY_STEP = 5;
const DEFAULT_SEMANTIC_SLIDER_POSITION = 0;
const MIN_SEMANTIC_RETAINED_PERCENT = 50;
const MAX_SEMANTIC_RETAINED_PERCENT = 100;
const SEMANTIC_SLIDER_MAX = 100;
const searchButton = document.getElementById("searchButton");
const searchIndexStatus = document.getElementById("searchIndexStatus");
const searchQueryStatus = document.getElementById("searchQueryStatus");
const searchResults = document.getElementById("searchResults");

let searchSourceHandle = null;
let searchIndexBuildToken = 0;
let searchIndexReady = false;
let combineSelectionHandler = null;
let currentSearchIndex = null;
let searchQueryToken = 0;

function getLexicalFuzzyPercent() {
    const value = Number(lexicalFuzzySlider?.value);
    return Number.isFinite(value)
        ? Math.min(MAX_LEXICAL_FUZZY_PERCENT, Math.max(MIN_LEXICAL_FUZZY_PERCENT, value))
        : DEFAULT_LEXICAL_FUZZY_PERCENT;
}

function updateLexicalFuzzyValue() {
    if (lexicalFuzzySlider && lexicalFuzzyValue) {
        lexicalFuzzyValue.textContent = `${getLexicalFuzzyPercent()}%`;
    }
}

if (lexicalFuzzySlider) {
    // Set the range here as well as in the HTML so the control remains correct
    // even when an older cached index.html specifies a different minimum.
    lexicalFuzzySlider.min = String(MIN_LEXICAL_FUZZY_PERCENT);
    lexicalFuzzySlider.max = String(MAX_LEXICAL_FUZZY_PERCENT);
    lexicalFuzzySlider.step = String(LEXICAL_FUZZY_STEP);
}

try {
    const savedThreshold = Number(localStorage.getItem(LEXICAL_FUZZY_STORAGE_KEY));
    if (lexicalFuzzySlider && Number.isFinite(savedThreshold) && savedThreshold >= MIN_LEXICAL_FUZZY_PERCENT && savedThreshold <= MAX_LEXICAL_FUZZY_PERCENT) {
        lexicalFuzzySlider.value = String(Math.round(savedThreshold / LEXICAL_FUZZY_STEP) * LEXICAL_FUZZY_STEP);
    } else if (lexicalFuzzySlider) {
        lexicalFuzzySlider.value = String(DEFAULT_LEXICAL_FUZZY_PERCENT);
    }
} catch (_) {
    // Use the default when browser storage is unavailable.
}
updateLexicalFuzzyValue();

function getSemanticSliderPosition() {
    const value = Number(semanticFractionSlider?.value);
    return Number.isFinite(value)
        ? Math.min(SEMANTIC_SLIDER_MAX, Math.max(0, value))
        : DEFAULT_SEMANTIC_SLIDER_POSITION;
}

// Moving right increases filtering continuously: 0 = retain 100%;
// 100 = retain 50%. The visible Low/Medium/High labels are guideposts only.
function getSemanticFractionPercent() {
    return Math.round(
        MAX_SEMANTIC_RETAINED_PERCENT -
        (getSemanticSliderPosition() / SEMANTIC_SLIDER_MAX) *
        (MAX_SEMANTIC_RETAINED_PERCENT - MIN_SEMANTIC_RETAINED_PERCENT)
    );
}

function getSemanticFilterLabel() {
    const position = getSemanticSliderPosition();
    if (position < 33.333) return "Low";
    if (position < 66.667) return "Medium";
    return "High";
}

function updateSemanticFractionValue() {
    if (semanticFractionSlider && semanticFractionValue) {
        semanticFractionValue.textContent = getSemanticFilterLabel();
    }
}

if (semanticFractionSlider) {
    semanticFractionSlider.min = "0";
    semanticFractionSlider.max = String(SEMANTIC_SLIDER_MAX);
    semanticFractionSlider.step = "1";
}

try {
    // Preserve the previous saved retained percentage by converting it to
    // the equivalent position on the new continuous slider.
    const savedFraction = Number(localStorage.getItem(SEMANTIC_FRACTION_STORAGE_KEY));
    if (semanticFractionSlider && Number.isFinite(savedFraction) && savedFraction >= MIN_SEMANTIC_RETAINED_PERCENT && savedFraction <= MAX_SEMANTIC_RETAINED_PERCENT) {
        const position = ((MAX_SEMANTIC_RETAINED_PERCENT - savedFraction) /
            (MAX_SEMANTIC_RETAINED_PERCENT - MIN_SEMANTIC_RETAINED_PERCENT)) * SEMANTIC_SLIDER_MAX;
        semanticFractionSlider.value = String(Math.round(position));
    } else if (semanticFractionSlider) {
        semanticFractionSlider.value = String(DEFAULT_SEMANTIC_SLIDER_POSITION);
    }
} catch (_) {
    // Use the default when browser storage is unavailable.
}
updateSemanticFractionValue();

// Keep the strongest fraction of each semantic result family. Lexical results
// are intentionally excluded from this filtering. Contextual candidates are
// filtered separately by window size so the experiment does not erase an
// entire context size merely because another size has a different score scale.
function retainSemanticFraction(results, percent, key = null) {
    const fraction = Math.min(1, Math.max(0, percent / 100));
    if (!key) {
        const sorted = [...(results || [])].sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity) || (b.score || 0) - (a.score || 0));
        return sorted.slice(0, Math.ceil(sorted.length * fraction));
    }

    const groups = new Map();
    for (const result of results || []) {
        const groupKey = result[key] || "unknown";
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(result);
    }

    const retained = [];
    for (const group of groups.values()) {
        group.sort((a, b) => (b.relativeRank || 0) - (a.relativeRank || 0) || (b.score || 0) - (a.score || 0));
        retained.push(...group.slice(0, Math.ceil(group.length * fraction)));
    }
    return retained;
}

function setSearchBusy(busy) {

    if (searchSourceButton) {
        searchSourceButton.disabled = busy;
    }

    if (searchQueryInput) {
        searchQueryInput.disabled = busy || !searchIndexReady;
    }
    updateClearSearchButton();

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
        // Match the indexer's sentence splitting: decimal points are not
        // sentence boundaries, so values such as 99.9% stay together.
        .replace(/(\d)\.(?=\d)/g, "$1§")
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

function appendLexicallyBoldText(container, text, matchRanges) {
    const ranges = (Array.isArray(matchRanges) ? matchRanges : [])
        .filter(range => Number.isFinite(range.start) && Number.isFinite(range.end) &&
            range.start >= 0 && range.end > range.start && range.end <= text.length)
        .sort((a, b) => a.start - b.start || a.end - b.end);
    if (!ranges.length) {
        container.appendChild(document.createTextNode(text));
        return;
    }

    let cursor = 0;
    for (const range of ranges) {
        // Merge overlapping ranges so repeated/overlapping query hits do not
        // duplicate text or create nested <strong> elements.
        const start = Math.max(cursor, range.start);
        if (start > cursor) {
            container.appendChild(document.createTextNode(text.slice(cursor, start)));
        }
        const end = Math.max(start, range.end);
        if (end > start) {
            const strong = document.createElement("strong");
            strong.textContent = text.slice(start, end);
            container.appendChild(strong);
            cursor = end;
        }
    }
    if (cursor < text.length) {
        container.appendChild(document.createTextNode(text.slice(cursor)));
    }
}

function createSearchResultExcerptGroup(group) {
    const transcript = String(group.record?.transcript || "").trim();
    const paragraphs = transcript
        .replace(/\r\n?/g, "\n")
        .split(/\n\s*\n+/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean);

    const excerptParagraphs = [];
    const excerptColors = new Map();
    const excerptLexicalMatches = new Map();
    const excerptYellowSentences = new Set();
    const colors = group.sentenceColors || new Map();

    function assignmentFor(paragraphIndex, sentenceIndex, sentence) {
        const normalized = normalizeSentenceMatchKey(sentence);
        if (group.yellowSentences?.has(normalized)) return { color: "yellow", priority: 0 };
        const positional = colors.get(searchPositionKey(group.filename, paragraphIndex, sentenceIndex));
        const textual = colors.get(`text:${group.filename}|${normalized}`);
        if (!positional) return textual || null;
        if (!textual) return positional;
        return textual.priority < positional.priority ? textual : positional;
    }

    const lexicalBySentence = group.lexicalMatchesBySentence || new Map();
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
        const sentences = splitTranscriptSentences(paragraphs[paragraphIndex]);
        const entries = sentences.map((sentence, sentenceIndex) => {
            const key = normalizeSentenceMatchKey(sentence);
            return {
                sentence,
                key,
                assignment: assignmentFor(paragraphIndex, sentenceIndex, sentence),
                lexical: lexicalBySentence.get(key) || []
            };
        });

        const selected = new Set();
        entries.forEach((entry, index) => {
            if (entry.assignment || entry.lexical.length) {
                selected.add(index);
                if (index > 0) selected.add(index - 1);
                if (index + 1 < entries.length) selected.add(index + 1);
            }
        });
        if (!selected.size) continue;

        const kept = [];
        entries.forEach((entry, index) => {
            if (!selected.has(index)) return;
            kept.push(entry.sentence);
            const textKey = `text:${group.filename}|${entry.key}`;
            if (entry.assignment) {
                excerptColors.set(textKey, entry.assignment);
                if (entry.assignment.color === "yellow") excerptYellowSentences.add(entry.key);
            }
            if (entry.lexical.length) excerptLexicalMatches.set(entry.key, entry.lexical);
        });
        if (kept.length) excerptParagraphs.push(kept.join(" "));
    }

    return {
        ...group,
        record: { ...group.record, transcript: excerptParagraphs.join("\n\n") },
        sentenceColors: excerptColors,
        lexicalMatchesBySentence: excerptLexicalMatches,
        yellowSentences: excerptYellowSentences
    };
}

function appendColoredTranscript(container, group, { showMatchIndicators = false } = {}) {
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
            // Preserve the existing continuous colored background, but apply
            // lexical bolding sentence by sentence inside that background.
            const runSentences = splitTranscriptSentences(run.text);
            if (!runSentences.length) {
                mark.textContent = run.text;
            } else {
                runSentences.forEach((sentence, index) => {
                    if (index > 0) mark.appendChild(document.createTextNode(" "));
                    const lexicalWords = group.lexicalMatchesBySentence?.get(
                        normalizeSentenceMatchKey(sentence)
                    );
                    appendLexicallyBoldText(mark, sentence, lexicalWords);
                });
            }
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
                    // Keep the separator outside a newly starting highlight.
                    // flushRun() splits run.text into sentences and trims them,
                    // so putting this space inside run.text would discard it.
                    paragraphElement.appendChild(document.createTextNode(" "));
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
                const lexicalWords = group.lexicalMatchesBySentence?.get(
                    normalizeSentenceMatchKey(piece.sentence)
                );
                appendLexicallyBoldText(paragraphElement, piece.sentence, lexicalWords);
            }
        });

        flushRun();

        if (showMatchIndicators) {
            // Keep the transcript text and its existing highlight spans intact.
            // The indicator lives beside the paragraph, not inside its text.
            const matchedSentenceCount = pieces.filter(piece =>
                Boolean(piece.assignment) ||
                Boolean(group.lexicalMatchesBySentence?.get(normalizeSentenceMatchKey(piece.sentence))?.length)
            ).length;

            if (matchedSentenceCount > 0) {
                const paragraphRow = document.createElement("div");
                paragraphRow.className = "search-transcript-paragraph-row";
                paragraphRow.style.display = "flex";
                paragraphRow.style.alignItems = "flex-start";
                paragraphRow.style.gap = "0.5rem";

                const indicator = document.createElement("button");
                indicator.type = "button";
                indicator.className = "search-transcript-match-indicator";
                indicator.textContent = "●";
                indicator.title = `Go to ${matchedSentenceCount} match${matchedSentenceCount === 1 ? "" : "es"} in paragraph ${paragraphIndex + 1}`;
                indicator.setAttribute("aria-label", indicator.title);
                indicator.style.flex = "0 0 1.5rem";
                indicator.style.minWidth = "1.5rem";
                indicator.style.padding = "0.15rem 0";
                indicator.style.border = "0";
                indicator.style.background = "transparent";
                indicator.style.cursor = "pointer";
                indicator.style.color = "#2563eb";
                indicator.style.lineHeight = "inherit";
                indicator.addEventListener("click", () => {
                    paragraphElement.scrollIntoView({ behavior: "smooth", block: "center" });
                    indicator.focus({ preventScroll: true });
                });

                paragraphElement.style.flex = "1 1 auto";
                paragraphElement.style.minWidth = "0";
                paragraphElement.style.marginBlock = "0.5em";
                paragraphRow.append(indicator, paragraphElement);
                container.appendChild(paragraphRow);
            } else {
                // Keep unmarked paragraphs aligned with the indicator column.
                const paragraphRow = document.createElement("div");
                paragraphRow.className = "search-transcript-paragraph-row";
                paragraphRow.style.display = "flex";
                paragraphRow.style.alignItems = "flex-start";
                paragraphRow.style.gap = "0.5rem";
                const spacer = document.createElement("span");
                spacer.setAttribute("aria-hidden", "true");
                spacer.style.flex = "0 0 1.5rem";
                paragraphElement.style.flex = "1 1 auto";
                paragraphElement.style.minWidth = "0";
                paragraphElement.style.marginBlock = "0.5em";
                paragraphRow.append(spacer, paragraphElement);
                container.appendChild(paragraphRow);
            }
        } else {
            container.appendChild(paragraphElement);
        }
    });
}

let searchAudioRootHandle = null;
// Files chosen in iPhone Safari remain available for matching during this page
// session. Keep File references, not copies of the audio data.
const searchAudioFileCache = new Map();

async function findAudioInDirectory(directoryHandle, filename, depth = 0) {
    if (!directoryHandle || depth > 2 || !filename) return null;

    try {
        const direct = await directoryHandle.getFileHandle(filename);
        return await direct.getFile();
    } catch (_) {
        // Try matching files in this directory and then its subfolders.
    }

    const wanted = filename.toLocaleLowerCase();
    try {
        for await (const [name, entry] of directoryHandle.entries()) {
            if (entry.kind === "file" && name.toLocaleLowerCase() === wanted) {
                return await entry.getFile();
            }
        }
        if (depth < 2) {
            for await (const [, entry] of directoryHandle.entries()) {
                if (entry.kind !== "directory") continue;
                const found = await findAudioInDirectory(entry, filename, depth + 1);
                if (found) return found;
            }
        }
    } catch (error) {
        console.warn("Could not search audio folder:", error);
    }
    return null;
}

async function resolveSearchAudioFile(relativePath, recordingFilename, sourceHandleOverride = null) {
    const candidates = [...new Set([relativePath, recordingFilename].filter(Boolean))];
    const wantedNames = candidates
        .map(value => value.split(/[\\/]/).pop().toLocaleLowerCase());

    // On iPhone, a recording selected once can be reused by later results.
    // Match by basename because transcript metadata may contain relative paths.
    for (const name of wantedNames) {
        if (searchAudioFileCache.has(name)) {
            return searchAudioFileCache.get(name);
        }
    }

    const handle = sourceHandleOverride || searchSourceHandle;
    if (!handle) return null;

    if (handle.kind === "file-input") {
        const wanted = new Set(candidates.map(value => value.split(/[\\/]/).pop().toLocaleLowerCase()));
        return handle.files.find(file => wanted.has(file.name.toLocaleLowerCase())) || null;
    }

    const roots = [...new Set([handle, searchAudioRootHandle].filter(Boolean))];
    for (const root of roots) {
        for (const candidate of candidates) {
            try {
                let currentHandle = root;
                const parts = candidate.replace(/\\/g, "/").split("/").filter(Boolean);
                let fileHandle = null;
                for (let index = 0; index < parts.length; index++) {
                    const part = parts[index];
                    if (part === "." || part === "..") {
                        // File System Access handles cannot navigate to a parent.
                        fileHandle = null;
                        break;
                    }
                    if (index === parts.length - 1) {
                        fileHandle = await currentHandle.getFileHandle(part);
                    } else {
                        currentHandle = await currentHandle.getDirectoryHandle(part);
                    }
                }
                if (fileHandle) return await fileHandle.getFile();
            } catch (_) {
                // Try the next candidate/root.
            }
        }

        const filename = recordingFilename || candidates[0]?.split(/[\\/]/).pop();
        const found = await findAudioInDirectory(root, filename, 0);
        if (found) return found;
    }
    return null;
}

function isIPhoneBrowser() {
    return /iPhone|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function appendSearchAudioControl(section, group, sourceHandleOverride = null) {
    const relativePath = group.record?.audioRelativePath || "";
    const recordingFilename = group.record?.recordingFilename || "";
    if (!relativePath && !recordingFilename) return;

    const onIPhone = isIPhoneBrowser();
    const control = document.createElement("div");
    control.className = "search-result-audio-control";

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "search-audio-play";
    playButton.textContent = "▶";
    playButton.setAttribute("aria-label", "Play recording audio");
    playButton.title = "Play recording";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.hidden = true;
    audio.className = "search-result-audio";
    if (onIPhone) {
        // iPhone Safari needs its native audio controls; do not hide the player
        // after loading a file selected through the iOS document picker.
        audio.controls = true;
        audio.classList.add("search-audio-no-controls");
    }

    const errorMessage = document.createElement("span");
    errorMessage.className = "search-audio-error";
    errorMessage.hidden = true;
    errorMessage.setAttribute("role", "status");

    // iOS Safari cannot use showDirectoryPicker and cannot browse upward from a
    // selected directory. If the audio is not already available, let the user
    // choose the individual recording with the native Files picker instead.
    const audioFileInput = document.createElement("input");
    audioFileInput.type = "file";
    audioFileInput.accept = "audio/*,.m4a,.mp3,.wav,.aac,.caf,.mp4";
    // Select a batch of recordings once instead of revisiting Files for each result.
    audioFileInput.multiple = true;
    audioFileInput.hidden = true;
    audioFileInput.setAttribute("aria-label", "Choose an audio recording");

    function showLoadedPlayer(file) {
        if (audio.dataset.objectUrl) {
            URL.revokeObjectURL(audio.dataset.objectUrl);
        }
        const objectUrl = URL.createObjectURL(file);
        audio.dataset.objectUrl = objectUrl;
        audio.src = objectUrl;
        audio.controls = true;
        audio.hidden = false;
        audio.style.display = "inline-block";
        audio.style.maxWidth = "100%";
        // Once the full player is visible, the compact play button is redundant.
        // Use inline display as well as the hidden attribute because site CSS
        // can override the browser's default [hidden] styling for buttons.
        playButton.textContent = "▶";
        playButton.hidden = true;
        playButton.style.display = "none";
        errorMessage.hidden = true;
    }

    audioFileInput.addEventListener("change", async () => {
        const selectedFiles = Array.from(audioFileInput.files || []);
        // Dismissing the iOS picker without choosing files leaves the result alone.
        if (!selectedFiles.length) return;

        for (const file of selectedFiles) {
            searchAudioFileCache.set(file.name.toLocaleLowerCase(), file);
        }

        const wantedNames = new Set(
            [relativePath, recordingFilename]
                .filter(Boolean)
                .map(value => value.split(/[\\/]/).pop().toLocaleLowerCase())
        );
        const matchingFile = selectedFiles.find(file =>
            wantedNames.has(file.name.toLocaleLowerCase())
        ) || [...searchAudioFileCache.entries()]
            .find(([name]) => wantedNames.has(name))?.[1];

        if (!matchingFile) {
            errorMessage.textContent = `Added ${selectedFiles.length} recording${selectedFiles.length === 1 ? "" : "s"} for this session, but the matching file “${recordingFilename || wantedNames.values().next().value || ""}” was not among them. Tap Play and select a batch containing that recording.`;
            errorMessage.hidden = false;
            return;
        }

        try {
            showLoadedPlayer(matchingFile);
            await audio.play();
        } catch (error) {
            // The native controls remain visible if Safari blocks auto-play.
            errorMessage.textContent = "Recording loaded. Tap Play in the audio controls to start playback.";
            errorMessage.hidden = false;
        }
    });

    playButton.addEventListener("click", async () => {
        // On iPhone, open the native file chooser directly from the tap. A
        // directory picker is not available there, and the share sheet cannot
        // be opened until an actual File object has been obtained.
        if (onIPhone) {
            const cachedFile = await resolveSearchAudioFile(relativePath, recordingFilename, sourceHandleOverride);
            if (cachedFile) {
                showLoadedPlayer(cachedFile);
                try {
                    await audio.play();
                } catch (_) {
                    errorMessage.textContent = "Audio is loaded. Tap Play in the audio controls to start playback.";
                    errorMessage.hidden = false;
                }
                return;
            }
            audioFileInput.click();
            return;
        }

        if (audio.src) {
            audio.hidden = false;
            playButton.hidden = true;
            playButton.style.display = "none";
            try {
                await audio.play();
            } catch (error) {
                errorMessage.textContent = error?.message || "Could not play this recording.";
                errorMessage.hidden = false;
            }
            return;
        }

        playButton.disabled = true;
        playButton.textContent = "…";
        errorMessage.hidden = true;
        try {
            let file = await resolveSearchAudioFile(relativePath, recordingFilename, sourceHandleOverride);

            // A selected directory handle cannot navigate upward to its parent.
            // Ask for the audio-containing parent once, then reuse that handle
            // for subsequent search results and searches in this page session.
            if (!file && (sourceHandleOverride || searchSourceHandle)?.kind !== "file-input" && window.showDirectoryPicker) {
                errorMessage.textContent = "The recording wasn't in the selected folder. Select the parent folder that contains the audio.";
                errorMessage.hidden = false;
                const chosenRoot = await window.showDirectoryPicker({ mode: "read" });
                searchAudioRootHandle = chosenRoot;
                file = await resolveSearchAudioFile(relativePath, recordingFilename, sourceHandleOverride);
            }

            if (!file) {
                throw new Error("Recording not found. Select the parent folder that contains the audio files.");
            }

            showLoadedPlayer(file);
            try {
                await audio.play();
            } catch (playError) {
                errorMessage.textContent = "Audio is loaded. Use the player controls to start playback.";
                errorMessage.hidden = false;
            }
        } catch (error) {
            if (error?.name !== "AbortError") {
                errorMessage.textContent = error?.message || "Could not load the recording.";
                errorMessage.hidden = false;
            }
        } finally {
            playButton.disabled = false;
            playButton.textContent = "▶";
        }
    });

    control.appendChild(playButton);
    control.appendChild(audio);
    control.appendChild(audioFileInput);
    control.appendChild(errorMessage);
    section.appendChild(control);
}

function makeSearchEditButton(label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
}

function getTranscriptFileContent(file, editedTranscript) {
    return file.text().then(originalText => {
        const lines = originalText.split(/\r?\n/);
        const separatorIndex = lines.findIndex(line => line.trim() === "--------------------------------------------------");
        if (separatorIndex < 0) {
            throw new Error("This transcript has no metadata separator, so Memora cannot safely replace only its transcript text.");
        }
        const header = lines.slice(0, separatorIndex + 1).join("\n");
        const cleanTranscript = String(editedTranscript ?? "").replace(/\r\n?/g, "\n");
        return `${header}\n${cleanTranscript}${cleanTranscript.endsWith("\n") ? "" : "\n"}`;
    });
}

async function reindexEditedTranscript(updatedFile, oldRecord) {
    if (!currentSearchIndex || !searchIndexReady) {
        throw new Error("Search is not ready to reindex this transcript. Please rebuild the Search Index first.");
    }
    const search = await getSearchModule();
    const semantic = await import("./semantic.js");
    const oldArchive = JSON.parse(search.serializeSearchEmbeddingsArchive(currentSearchIndex));
    const files = currentSearchIndex.records.map(record =>
        record.filename === updatedFile.name ? updatedFile : record.file
    ).filter(Boolean);
    if (!files.some(file => file.name === updatedFile.name)) {
        throw new Error("The edited transcript is not part of the current Search Index.");
    }

    const previousIndex = currentSearchIndex;
    const previousReady = searchIndexReady;
    searchIndexReady = false;
    if (searchButton) searchButton.disabled = true;
    if (searchIndexUpdateButton) searchIndexUpdateButton.disabled = true;
    setSearchIndexStatus("Reindexing the edited transcript and reusing unchanged embeddings…", true);

    try {
        const replacementIndex = await search.buildSearchIndex(
            files,
            message => setSearchIndexStatus(message, true),
            oldArchive
        );
        if (!replacementIndex || !replacementIndex.sentences) {
            throw new Error("The edited transcript did not produce a searchable index.");
        }
        currentSearchIndex = replacementIndex;
        searchIndexReady = true;

        // Clean only the old hash version. New embeddings have a different hash,
        // even though they retain the same source key.
        try {
            await semantic.removeSemanticEntriesForTranscript(oldRecord.sourceKey, oldRecord.transcriptHash);
        } catch (cleanupError) {
            console.warn("Old semantic cache entries could not be cleaned up:", cleanupError);
        }

        if (searchIndexUpdateButton) {
            searchIndexUpdateButton.disabled = !replacementIndex.archiveNeedsUpdate;
        }
        setSearchIndexStatus("Transcript updated and reindexed. Search Index has unsaved changes.");
    } catch (error) {
        currentSearchIndex = previousIndex;
        searchIndexReady = false; // Prevent new queries from silently using stale index data.
        if (searchButton) searchButton.disabled = true;
        if (searchIndexUpdateButton) searchIndexUpdateButton.disabled = true;
        setSearchIndexStatus(`Transcript file saved, but reindexing failed: ${error.message || String(error)}. Rebuild the Search Index before searching again.`);
        throw error;
    } finally {
        if (searchButton) searchButton.disabled = !searchIndexReady;
        if (!searchIndexReady && previousReady) {
            // Current result DOM remains visible, but new queries are blocked until recovery.
        }
    }
}

function addTranscriptEditor(section, group, transcriptTextElement, header, transcriptElement, transcriptToggle) {
    const record = group.record;
    const editButton = makeSearchEditButton("Edit", "search-transcript-toggle combine-edit-toggle search-transcript-edit-button");
    editButton.title = "Edit transcript";
    editButton.setAttribute("aria-label", `Edit ${group.filename}`);
    const transcriptActions = document.createElement("div");
    transcriptActions.className = "combine-transcript-actions";
    // Match Combine: Edit sits immediately to the left of Show/Hide transcript.
    transcriptActions.append(editButton, transcriptToggle);
    header.appendChild(transcriptActions);

    // Defer the editor DOM and its event handlers until Edit is actually used.
    // Search results often contain many transcripts, but users usually edit few.
    let editorPanel = null;
    let textarea = null;
    let saveButton = null;
    let cancelButton = null;
    let status = null;
    // Capture the transcript controls before editing so Cancel can restore the
    // exact visibility state that was in place when Edit was opened.
    let stateBeforeEdit = null;

    let matchNavigation = null;
    let previousMatchButton = null;
    let nextMatchButton = null;
    let markedTextRanges = [];

    function findMarkedTextRanges(text) {
        const ranges = [];
        const source = String(text || "");
        const paragraphPattern = /\\r?\\n\\s*\\r?\\n+/g;
        let segmentStart = 0;
        const segments = [];
        let separator;
        while ((separator = paragraphPattern.exec(source)) !== null) {
            segments.push({ start: segmentStart, end: separator.index });
            segmentStart = separator.index + separator[0].length;
        }
        segments.push({ start: segmentStart, end: source.length });

        segments.forEach((segment, paragraphIndex) => {
            const rawParagraph = source.slice(segment.start, segment.end);
            const leadingWhitespace = rawParagraph.match(/^\\s*/)?.[0].length || 0;
            const paragraph = rawParagraph.trim();
            if (!paragraph) return;
            const paragraphStart = segment.start + leadingWhitespace;
            let sentenceCursor = 0;

            splitTranscriptSentences(paragraph).forEach((sentence, sentenceIndex) => {
                let sentenceStart = paragraph.indexOf(sentence, sentenceCursor);
                if (sentenceStart < 0) sentenceStart = paragraph.indexOf(sentence);
                if (sentenceStart < 0) return;
                const normalized = normalizeSentenceMatchKey(sentence);
                const positionAssignment = group.sentenceColors?.get(
                    searchPositionKey(group.filename, paragraphIndex, sentenceIndex)
                );
                const textAssignment = group.sentenceColors?.get(`text:${group.filename}|${normalized}`);
                const assignment = group.yellowSentences?.has(normalized)
                    ? true
                    : Boolean(positionAssignment || textAssignment);
                const lexical = group.lexicalMatchesBySentence?.get(normalized);
                if (assignment || lexical?.length) {
                    ranges.push({
                        start: paragraphStart + sentenceStart,
                        end: paragraphStart + sentenceStart + sentence.length
                    });
                }
                sentenceCursor = sentenceStart + sentence.length;
            });
        });

        return ranges.sort((a, b) => a.start - b.start);
    }

    function updateMatchNavigationButtons() {
        if (!textarea || !previousMatchButton || !nextMatchButton) return;
        const position = textarea.selectionStart ?? 0;
        const selectedRange = markedTextRanges.find(range =>
            range.start === textarea.selectionStart && range.end === textarea.selectionEnd
        );
        const currentIndex = selectedRange
            ? markedTextRanges.indexOf(selectedRange)
            : markedTextRanges.findIndex(range => range.start >= position);
        const previousUnavailable = markedTextRanges.length === 0 || currentIndex <= 0;
        const nextUnavailable = markedTextRanges.length === 0 ||
            (currentIndex >= 0 && currentIndex >= markedTextRanges.length - 1);

        // Do not use the native disabled property here. Clicking a disabled
        // button can still move focus away from the textarea, hiding its blue
        // selection even though the selected range has not changed. Keep the
        // controls visibly disabled while preserving textarea focus/selection.
        [[previousMatchButton, previousUnavailable], [nextMatchButton, nextUnavailable]]
            .forEach(([button, unavailable]) => {
                button.disabled = false;
                button.setAttribute("aria-disabled", String(unavailable));
                button.style.opacity = unavailable ? "0.45" : "1";
                button.style.cursor = unavailable ? "default" : "pointer";
            });
    }

    function scrollMarkedTextToCenter(target) {
        if (!textarea || !target) return;

        // A textarea does not expose text ranges that can be scrolled into view.
        // Mirror its typography and wrapping in an invisible element to measure
        // the selected sentence's visual position, then center that position.
        const style = window.getComputedStyle(textarea);
        const mirror = document.createElement("div");
        mirror.setAttribute("aria-hidden", "true");
        mirror.style.position = "absolute";
        mirror.style.visibility = "hidden";
        mirror.style.pointerEvents = "none";
        mirror.style.left = "-100000px";
        mirror.style.top = "0";
        mirror.style.width = `${textarea.clientWidth}px`;
        mirror.style.boxSizing = style.boxSizing;
        mirror.style.padding = style.padding;
        mirror.style.border = style.border;
        mirror.style.font = style.font;
        mirror.style.letterSpacing = style.letterSpacing;
        mirror.style.lineHeight = style.lineHeight;
        mirror.style.textIndent = style.textIndent;
        mirror.style.textTransform = style.textTransform;
        mirror.style.wordSpacing = style.wordSpacing;
        mirror.style.whiteSpace = "pre-wrap";
        mirror.style.overflowWrap = "break-word";
        mirror.style.wordBreak = style.wordBreak;

        mirror.appendChild(document.createTextNode(textarea.value.slice(0, target.start)));
        const selectedText = document.createElement("span");
        selectedText.textContent = textarea.value.slice(target.start, target.end) || " ";
        mirror.appendChild(selectedText);
        mirror.appendChild(document.createTextNode(textarea.value.slice(target.end)));
        document.body.appendChild(mirror);

        const targetTop = selectedText.offsetTop;
        const targetHeight = selectedText.offsetHeight || parseFloat(style.lineHeight) || 20;
        const centeredScrollTop = targetTop - (textarea.clientHeight / 2) + (targetHeight / 2);
        textarea.scrollTop = Math.max(0, centeredScrollTop);
        mirror.remove();
    }

    function navigateMarkedText(direction) {
        if (!textarea || !markedTextRanges.length) return;

        const selectionStart = textarea.selectionStart ?? 0;
        const selectionEnd = textarea.selectionEnd ?? selectionStart;
        const exactSelectedIndex = markedTextRanges.findIndex(range =>
            range.start === selectionStart && range.end === selectionEnd
        );

        let targetIndex;
        if (exactSelectedIndex >= 0) {
            targetIndex = exactSelectedIndex + direction;
        } else if (direction > 0) {
            // Include a match that begins at the caret, especially when the
            // first marked sentence starts at offset zero.
            targetIndex = markedTextRanges.findIndex(range => range.start >= selectionStart);
        } else {
            targetIndex = -1;
            for (let i = markedTextRanges.length - 1; i >= 0; i--) {
                if (markedTextRanges[i].start < selectionStart) {
                    targetIndex = i;
                    break;
                }
            }
        }

        // At either end, leave the current selection untouched.
        if (targetIndex < 0 || targetIndex >= markedTextRanges.length) {
            updateMatchNavigationButtons();
            return;
        }

        const target = markedTextRanges[targetIndex];
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(target.start, target.end);
        scrollMarkedTextToCenter(target);
        updateMatchNavigationButtons();
    }

    function clearMarkedTextSelection() {
        if (!textarea) return;
        const position = textarea.selectionEnd ?? 0;
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(position, position);
        updateMatchNavigationButtons();
    }

    function ensureEditorCreated() {
        if (editorPanel) return;

        editorPanel = document.createElement("div");
        editorPanel.className = "search-transcript-editor-panel";
        editorPanel.hidden = true;

        textarea = document.createElement("textarea");
        textarea.className = "search-transcript-editor";
        textarea.setAttribute("aria-label", `Edit full transcript: ${group.filename}`);
        textarea.rows = 12;

        matchNavigation = document.createElement("div");
        matchNavigation.className = "search-transcript-match-navigation";
        matchNavigation.style.display = "flex";
        matchNavigation.style.alignItems = "center";
        matchNavigation.style.gap = "0.5rem";
        matchNavigation.style.marginBlock = "0.4rem";

        previousMatchButton = makeSearchEditButton("↑ Previous match", "search-transcript-previous-match");
        previousMatchButton.title = "Move to the previous marked text";
        previousMatchButton.setAttribute("aria-label", "Previous marked text");
        nextMatchButton = makeSearchEditButton("↓ Next match", "search-transcript-next-match");
        nextMatchButton.title = "Move to the next marked text";
        nextMatchButton.setAttribute("aria-label", "Next marked text");
        const clearMatchButton = makeSearchEditButton("Clear selection", "search-transcript-clear-match");
        clearMatchButton.title = "Clear the current text selection without changing the transcript";
        clearMatchButton.setAttribute("aria-label", "Clear current match selection");
        // Prevent mouse clicks on the navigation controls from blurring the
        // textarea. This keeps the selected text visibly highlighted, including
        // when a greyed-out control is clicked at either end of the match list.
        [previousMatchButton, nextMatchButton].forEach(button => {
            button.addEventListener("mousedown", event => event.preventDefault());
        });
        previousMatchButton.addEventListener("click", () => {
            if (previousMatchButton.getAttribute("aria-disabled") === "true") return;
            navigateMarkedText(-1);
        });
        clearMatchButton.addEventListener("click", clearMarkedTextSelection);
        nextMatchButton.addEventListener("click", () => {
            if (nextMatchButton.getAttribute("aria-disabled") === "true") return;
            navigateMarkedText(1);
        });
        matchNavigation.append(previousMatchButton, clearMatchButton, nextMatchButton);

        const actions = document.createElement("div");
        actions.className = "search-transcript-editor-actions";
        saveButton = makeSearchEditButton("Save and reindex", "search-transcript-save-button");
        cancelButton = makeSearchEditButton("Cancel", "search-transcript-cancel-button");
        status = document.createElement("p");
        status.className = "search-transcript-editor-status";
        status.setAttribute("role", "status");
        actions.append(saveButton, cancelButton);
        editorPanel.append(matchNavigation, textarea, actions, status);
        markedTextRanges = findMarkedTextRanges(textarea.value);
        updateMatchNavigationButtons();
        ["click", "keyup", "select", "input"].forEach(eventName =>
            textarea.addEventListener(eventName, () => {
                if (eventName === "input") markedTextRanges = findMarkedTextRanges(textarea.value);
                updateMatchNavigationButtons();
            })
        );

        const transcriptBody = section.querySelector(".search-result-full-transcript");
        (transcriptBody || section).appendChild(editorPanel);

        cancelButton.addEventListener("click", () => {
            editorPanel.hidden = true;
            const previousState = stateBeforeEdit;
            stateBeforeEdit = null;
            if (previousState) {
                transcriptElement.hidden = !previousState.transcriptVisible;
                transcriptTextElement.hidden = !previousState.transcriptVisible;
                transcriptToggle.hidden = previousState.toggleHidden;
                transcriptToggle.textContent = previousState.toggleText;
                transcriptToggle.title = previousState.toggleTitle;
                transcriptToggle.setAttribute("aria-label", previousState.toggleAriaLabel);
                transcriptToggle.setAttribute("aria-expanded", previousState.toggleExpanded);
            } else {
                // Defensive fallback for an editor opened without a saved state.
                transcriptTextElement.hidden = false;
            }
            editButton.classList.remove("is-editing");
            editButton.style.fontWeight = "";
            status.textContent = "";
            textarea.value = String(record.transcript || "");
        });

        saveButton.addEventListener("click", async () => {
            const editedTranscript = textarea.value;
            if (!editedTranscript.trim()) {
                status.textContent = "The transcript cannot be empty.";
                return;
            }
            if (editedTranscript === String(record.transcript || "")) {
                status.textContent = "No changes to save.";
                return;
            }
            saveButton.disabled = true;
            cancelButton.disabled = true;
            status.textContent = "Saving transcript…";
            try {
                const storage = await getStorageModule();
                const fullText = await getTranscriptFileContent(record.file, editedTranscript);
                let updatedFile;
                if (searchSourceHandle?.kind === "file-input") {
                    // iPhone/iPad folder selection is read-only. Share an updated
                    // replacement file instead of claiming the original was overwritten.
                    updatedFile = new File([fullText], record.filename, { type: "text/plain", lastModified: Date.now() });
                    await storage.shareFile(updatedFile);
                    const currentFiles = Array.from(searchSourceHandle.files || []);
                    const idx = currentFiles.findIndex(file => file.name === record.filename);
                    if (idx >= 0) currentFiles[idx] = updatedFile;
                    else currentFiles.push(updatedFile);
                    searchSourceHandle.files = currentFiles;
                    status.textContent = "Updated transcript shared. Reindexing this session…";
                } else {
                    const fileHandle = await searchSourceHandle.getFileHandle(record.filename, { create: false });
                    const writable = await fileHandle.createWritable();
                    try { await writable.write(fullText); } finally { await writable.close(); }
                    updatedFile = new File([fullText], record.filename, { type: "text/plain", lastModified: Date.now() });
                    status.textContent = "Transcript saved. Reindexing…";
                }

                const oldRecord = { ...record };
                await reindexEditedTranscript(updatedFile, oldRecord);
                record.transcript = editedTranscript;
                record.file = updatedFile;
                // Close the editor before refreshing results. Re-running the same
                // query rebuilds the result DOM from the edited transcript and
                // refreshed in-memory index, so stale text/highlighting disappears.
                transcriptTextElement.hidden = false;
                editorPanel.hidden = true;
                editButton.classList.remove("is-editing");
                editButton.style.fontWeight = "";
                status.textContent = "Transcript updated. Refreshing search results…";
                await runSearchQuery();
                // The index archive is separate from the live in-memory index.
                // Keep the existing top-of-page Update Search Index control as the
                // single way to persist the refreshed archive.
                const reminder = "Search results refreshed with the edited transcript. Remember to click Update Search Index above to save the index changes.";
                setSearchIndexStatus(reminder);
                status.textContent = reminder;
                window.scrollTo(0, 0);
            } catch (error) {
                console.error("Search transcript edit failed:", error);
                status.textContent = error.message || "Unable to save or reindex this transcript.";
            } finally {
                saveButton.disabled = false;
                cancelButton.disabled = false;
            }
        });
    }

    editButton.addEventListener("click", () => {
        ensureEditorCreated();
        if (!editorPanel.hidden) {
            textarea.focus({ preventScroll: true });
            return;
        }
        stateBeforeEdit = {
            transcriptVisible: !transcriptElement.hidden,
            toggleHidden: transcriptToggle.hidden,
            toggleText: transcriptToggle.textContent,
            toggleTitle: transcriptToggle.title,
            toggleAriaLabel: transcriptToggle.getAttribute("aria-label") || transcriptToggle.textContent,
            toggleExpanded: transcriptToggle.getAttribute("aria-expanded") || "false"
        };
        textarea.value = String(record.transcript || "");
        markedTextRanges = findMarkedTextRanges(textarea.value);
        updateMatchNavigationButtons();
        editorPanel.hidden = false;
        transcriptElement.hidden = false;
        transcriptToggle.textContent = "Hide transcript";
        transcriptToggle.title = "Hide transcript";
        transcriptToggle.setAttribute("aria-label", "Hide transcript");
        transcriptToggle.setAttribute("aria-expanded", "true");
        transcriptTextElement.hidden = true;
        editButton.classList.add("is-editing");
        editButton.style.fontWeight = "bold";
        // Keep the button enabled so its selected state can be shown in bold,
        // rather than using the browser's greyed-out disabled appearance.
        textarea.focus({ preventScroll: true });
        // Keep the insertion point at the start without scrolling the textarea.
        textarea.setSelectionRange(0, 0);
        textarea.scrollTop = 0;

        // Once the newly revealed editor has been laid out, scroll so the top
        // of the editing area is centered in the viewport. This is especially
        // helpful when Edit is selected directly from the collapsed result view.
        requestAnimationFrame(() => {
            const editorTop = textarea.getBoundingClientRect().top + window.scrollY;
            const targetScrollY = editorTop - (window.innerHeight / 2);
            window.scrollTo({ top: Math.max(0, targetScrollY), left: window.scrollX, behavior: "instant" });
        });
    });
}

function renderSearchResults(payload) {
    if (!searchResults) {
        return { files: [], displayedChunkCount: 0 };
    }

    // Release object URLs belonging to players from the previous result set.
    searchResults.querySelectorAll("audio[data-object-url]").forEach(audio => {
        try { URL.revokeObjectURL(audio.dataset.objectUrl); } catch (_) {}
        delete audio.dataset.objectUrl;
        audio.removeAttribute("src");
        audio.load();
    });
    searchResults.innerHTML = "";
    const rawResults = (payload?.results || []).concat(payload?.lexicalResults || []);
    if (rawResults.length === 0) {
        searchResults.innerHTML = '<p class="empty-message">No lexical or semantic matches were found.</p>';
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
                lexicalMatchesBySentence: new Map(),
                displayCategory: Number.POSITIVE_INFINITY,
                displayRelevance: 0
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
        if (group.displayCategory > 1) {
            group.displayCategory = 1;
            group.displayRelevance = 0;
        }
        if (group.displayCategory === 1) {
            group.displayRelevance = Math.max(
                group.displayRelevance,
                1 / Math.max(1, result.rank || 1)
            );
        }
    }

    // Lexical matches are independent of semantic matches, so lexical-only
    // transcripts are included and their matching words can be bolded.
    for (const result of payload.lexicalResults || []) {
        const group = getFileGroup(result);
        const key = normalizeSentenceMatchKey(result.sentence || "");
        if (key && Number.isFinite(result.matchStart) && Number.isFinite(result.matchEnd)) {
            const ranges = group.lexicalMatchesBySentence.get(key) || [];
            ranges.push({ start: result.matchStart, end: result.matchEnd });
            group.lexicalMatchesBySentence.set(key, ranges);
        }
        if (group.displayCategory > 0) {
            group.displayCategory = 0;
            group.displayRelevance = 0;
        }
        if (group.displayCategory === 0) {
            group.displayRelevance = Math.max(group.displayRelevance, result.score || 0);
        }
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
        const categoryByRepresentation = { "3–1": 2, "5–2": 3, "7–3": 4 };
        const category = categoryByRepresentation[result.representation] ?? 4;
        if (category < group.displayCategory) {
            group.displayCategory = category;
            group.displayRelevance = result.relativeRank || result.score || 0;
        } else if (category === group.displayCategory) {
            group.displayRelevance = Math.max(
                group.displayRelevance,
                result.relativeRank || result.score || 0
            );
        }
        displayedChunkCount++;
    }

    // Transcript order is categorical first, relevance second:
    // lexical > sentence > contextual 3–1 > 5–2 > 7–3.
    // A transcript appears only once, at its strongest available match category.
    const groups = Array.from(files.values()).sort((a, b) =>
        a.displayCategory - b.displayCategory ||
        b.displayRelevance - a.displayRelevance ||
        a.filename.localeCompare(b.filename)
    );

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
        // The result header stays minimal when its transcript is collapsed:
        // show the transcript name and selection checkbox only.
        header.appendChild(checkbox);
        header.appendChild(fileText);

        // Search result excerpts are the default view. The full transcript is
        // separate and is only displayed on request; neither action reruns search.
        const resultToggle = document.createElement("button");
        resultToggle.type = "button";
        resultToggle.className = "search-transcript-toggle search-result-toggle";
        resultToggle.textContent = "Hide result";
        resultToggle.title = "Hide search result";
        resultToggle.setAttribute("aria-label", "Hide search result");
        resultToggle.setAttribute("aria-expanded", "true");

        const transcriptToggle = document.createElement("button");
        transcriptToggle.type = "button";
        transcriptToggle.className = "search-transcript-toggle";
        transcriptToggle.textContent = "Show transcript";
        transcriptToggle.title = "Show transcript";
        transcriptToggle.setAttribute("aria-label", "Show transcript");
        transcriptToggle.setAttribute("aria-expanded", "false");

        const resultElement = document.createElement("div");
        resultElement.className = "search-result-excerpt";
        appendColoredTranscript(resultElement, createSearchResultExcerptGroup(group));
        section.appendChild(header);
        section.appendChild(resultElement);

        const transcriptElement = document.createElement("div");
        transcriptElement.className = "search-result-full-transcript";
        transcriptElement.hidden = true;

        appendSearchAudioControl(transcriptElement, group);
        const transcriptTextElement = document.createElement("div");
        transcriptTextElement.className = "search-transcript-text";
        appendColoredTranscript(transcriptTextElement, group);
        transcriptElement.appendChild(transcriptTextElement);
        section.appendChild(transcriptElement);
        addTranscriptEditor(section, group, transcriptTextElement, header, transcriptElement, transcriptToggle);

        // Preserve button order: Edit is added first by addTranscriptEditor,
        // then Show/Hide transcript, then Show/Hide result.
        const transcriptActions = header.querySelector(".combine-transcript-actions");
        transcriptActions.appendChild(resultToggle);

        transcriptToggle.addEventListener("click", () => {
            const willShow = transcriptElement.hidden;
            transcriptElement.hidden = !willShow;
            // The full transcript replaces the excerpt while visible. The audio
            // control stays inside transcriptElement, so it is shown only with
            // the full transcript rather than with the search-result excerpt.
            resultElement.hidden = willShow;
            transcriptToggle.textContent = willShow ? "Hide transcript" : "Show transcript";
            transcriptToggle.title = transcriptToggle.textContent;
            transcriptToggle.setAttribute("aria-label", transcriptToggle.title);
            transcriptToggle.setAttribute("aria-expanded", String(willShow));
            resultToggle.textContent = willShow ? "Show result" : "Hide result";
            resultToggle.title = willShow ? "Show search result" : "Hide search result";
            resultToggle.setAttribute("aria-label", resultToggle.title);
            resultToggle.setAttribute("aria-expanded", String(!willShow));
        });

        resultToggle.addEventListener("click", () => {
            const willShow = resultElement.hidden;
            resultElement.hidden = !willShow;
            resultToggle.textContent = willShow ? "Hide result" : "Show result";
            resultToggle.title = willShow ? "Hide search result" : "Show search result";
            resultToggle.setAttribute("aria-label", resultToggle.title);
            resultToggle.setAttribute("aria-expanded", String(willShow));
            if (!willShow) {
                transcriptElement.hidden = true;
                // If the result is hidden while editing, close the editor and
                // restore the Edit control so it is usable when the result returns.
                const editButton = section.querySelector(".search-transcript-edit-button");
                const editorPanel = section.querySelector(".search-transcript-editor-panel");
                if (editorPanel) editorPanel.hidden = true;
                const transcriptText = section.querySelector(".search-transcript-text");
                if (transcriptText) transcriptText.hidden = false;
                if (editButton) {
                    editButton.classList.remove("is-editing");
                    editButton.style.fontWeight = "";
                }
                transcriptToggle.hidden = true;
                transcriptToggle.textContent = "Show transcript";
                transcriptToggle.title = "Show transcript";
                transcriptToggle.setAttribute("aria-label", "Show transcript");
                transcriptToggle.setAttribute("aria-expanded", "false");
            } else {
                transcriptToggle.hidden = false;
                // Explicitly restore Edit when the result is redisplayed. The
                // editor is closed above when hiding a result, so this control
                // must be available again when the result returns.
                const editButton = section.querySelector(".search-transcript-edit-button");
                if (editButton) {
                    editButton.hidden = false;
                    editButton.disabled = false;
                    editButton.classList.remove("is-editing");
                    editButton.style.fontWeight = "";
                }
            }
        });

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


function updateClearSearchButton() {
    if (!clearSearchButton) return;

    const hasQuery = Boolean(searchQueryInput?.value);
    // Clearing must remain available even while an index/search operation is busy.
    clearSearchButton.disabled = !hasQuery;
    clearSearchButton.setAttribute("aria-disabled", String(clearSearchButton.disabled));
}

function clearSearchQueryAndResults() {
    // Invalidate any search still in progress so it cannot repopulate cleared results.
    searchQueryToken++;

    if (searchQueryInput) {
        searchQueryInput.value = "";
    }

    if (searchResults) {
        searchResults.querySelectorAll("audio[data-object-url]").forEach(audio => {
            try {
                URL.revokeObjectURL(audio.dataset.objectUrl);
            } catch (_) {}
            delete audio.dataset.objectUrl;
            audio.removeAttribute("src");
            audio.load();
        });
        searchResults.innerHTML = "";
    }

    if (searchQueryStatus) {
        searchQueryStatus.hidden = true;
        searchQueryStatus.innerHTML = "";
    }

    if (searchButton) {
        searchButton.disabled = !searchIndexReady;
    }

    updateClearSearchButton();

    // Do not move focus during a pointer event. On some browsers, focusing
    // the input here can interfere with completing the button's click gesture.
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

    const requestToken = ++searchQueryToken;

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
                    if (requestToken !== searchQueryToken) return;
                    setSearchQueryStatus(
                        message,
                        true
                    );
                }
            );

        if (requestToken !== searchQueryToken) return;

        const lexicalResults =
            search.searchLexical(query, { threshold: getLexicalFuzzyPercent() / 100 });

        const semanticFractionPercent = getSemanticFractionPercent();
        const semanticSentenceResults = retainSemanticFraction(
            sentencePayload.sentenceResults,
            semanticFractionPercent
        );

        const contextualPayload =
            await search.searchStoredRepresentations(
                query,
                {
                    maxResults: 30,
                    records: search.getSearchIndexRecords()
                }
            );

        if (requestToken !== searchQueryToken) return;

        const semanticChunkResults = retainSemanticFraction(
            contextualPayload.chunkResults,
            semanticFractionPercent,
            "representation"
        );

        const payload = {
            results: semanticSentenceResults
                .concat(semanticChunkResults)
                .concat(lexicalResults)
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
            sentenceResults: semanticSentenceResults,
            chunkResults: semanticChunkResults,
            lexicalResults,
            durationMs: sentencePayload.durationMs,
            representations: contextualPayload.representations
        };

        const displaySummary = renderSearchResults(payload);

        setSearchQueryStatus(
            `${lexicalResults.length} lexical sentence match${lexicalResults.length === 1 ? "" : "es"}` +
            ` · ${semanticSentenceResults.length} semantic sentence matches (${getSemanticFilterLabel()} filtering)` +
            ` · ${displaySummary.displayedChunkCount} contextual results after overlap filtering` +
            ` · ${formatElapsed(payload.durationMs / 1000)}.`
        );

    } catch (error) {

        if (requestToken !== searchQueryToken) return;

        console.error(
            "Search error:",
            error
        );

        setSearchQueryStatus(
            "Unable to perform the search."
        );
    }

    if (requestToken === searchQueryToken && searchButton) {
        searchButton.disabled = !searchIndexReady;
    }
}


// A transcript edit makes the current Search session potentially stale.
// Require a fresh source selection so files are reread before the next index build.
export function invalidateSearchAfterTranscriptEdit() {
    searchIndexBuildToken++;
    searchQueryToken++;
    searchSourceHandle = null;
    currentSearchIndex = null;
    searchIndexReady = false;

    if (searchQueryInput) searchQueryInput.value = "";
    if (searchSourceButton) {
        searchSourceButton.textContent = "Select Transcript Folder";
        searchSourceButton.disabled = false;
    }
    if (searchIndexUpdateButton) searchIndexUpdateButton.disabled = true;
    if (searchResults) {
        searchResults.querySelectorAll("audio[data-object-url]").forEach(audio => {
            try { URL.revokeObjectURL(audio.dataset.objectUrl); } catch (_) {}
            audio.removeAttribute("src");
            audio.load();
        });
        searchResults.innerHTML = '<p class="empty-message">Select the source folder again to search the latest transcript files.</p>';
    }
    if (searchQueryStatus) {
        searchQueryStatus.hidden = true;
        searchQueryStatus.innerHTML = "";
    }
    setSearchIndexStatus("Transcript edited. Select the source folder again to rebuild Search.");
    setSearchBusy(false);
    updateClearSearchButton();
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
                    updateClearSearchButton();

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


    if (semanticFractionSlider) {
        semanticFractionSlider.addEventListener("input", updateSemanticFractionValue);
        semanticFractionSlider.addEventListener("change", () => {
            try {
                localStorage.setItem(SEMANTIC_FRACTION_STORAGE_KEY, String(getSemanticFractionPercent()));
            } catch (_) {
                // The current setting still applies for this page session.
            }
            if (searchIndexReady && searchQueryInput?.value.trim()) {
                runSearchQuery();
            }
        });
    }

    if (lexicalFuzzySlider) {
        lexicalFuzzySlider.addEventListener("input", updateLexicalFuzzyValue);
        lexicalFuzzySlider.addEventListener("change", () => {
            try {
                localStorage.setItem(LEXICAL_FUZZY_STORAGE_KEY, String(getLexicalFuzzyPercent()));
            } catch (_) {
                // The current setting still applies for this page session.
            }
            // Re-run the current query after the user releases the slider.
            // This avoids launching repeated semantic searches during dragging.
            if (searchIndexReady && searchQueryInput?.value.trim()) {
                runSearchQuery();
            }
        });
    }

    if (clearSearchButton) {
        // Clear on pointer-down so a single mouse/touch press is sufficient.
        // Prevent the default focus transition and stop propagation so the
        // gesture cannot activate another control or trigger page navigation.
        clearSearchButton.addEventListener("pointerdown", event => {
            if (clearSearchButton.disabled) return;
            event.preventDefault();
            event.stopPropagation();
            clearSearchQueryAndResults();
        }, true);

        // Keep keyboard activation accessible. The pointer handler may already
        // have cleared the query before the browser emits click, so this is safe
        // to call again.
        clearSearchButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (searchQueryInput?.value || searchResults?.childElementCount) {
                clearSearchQueryAndResults();
            }
        }, true);
    }

    if (searchQueryInput) {
        searchQueryInput.addEventListener("input", updateClearSearchButton);
        updateClearSearchButton();
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
