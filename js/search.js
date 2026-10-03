// --------------------------------------------------
// Memora semantic search
// --------------------------------------------------
//
// Builds an in-memory sentence-level semantic index for selected
// transcript files and searches that index with a natural-language query.
//
// The search model is loaded locally through Transformers.js and cached by
// the browser. The search index itself is deliberately kept in memory for
// the current page session; it is not written to disk or IndexedDB.
// --------------------------------------------------

import {
    readTranscriptFiles,
    selectHighestModelRecords
} from "./combine.js";

const SEARCH_MODELS = {
    minilm: {
        label: "MiniLM — fast, general",
        model: "Xenova/all-MiniLM-L6-v2",
        prefix: ""
    },
    multilingualE5: {
        label: "Multilingual E5-small — multilingual",
        model: "Xenova/multilingual-e5-small",
        prefix: "passage: "
    }
};

let currentIndex = null;

let searchWorker = null;
let nextWorkerRequestId = 1;
const pendingWorkerRequests = new Map();


export function getSearchModels() {
    return Object.entries(SEARCH_MODELS).map(
        ([id, config]) => ({
            id,
            label: config.label
        })
    );
}


function splitSentences(text) {

    let normalized = String(text || "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) {
        return [];
    }

    // Keep this sentence handling aligned with the established
    // paragraphing implementation so Search and paragraphing agree about
    // where sentences begin and end.
    normalized = normalized
        .replace(/\bMr\./g, "Mr§")
        .replace(/\bMrs\./g, "Mrs§")
        .replace(/\bDr\./g, "Dr§")
        .replace(/\bMs\./g, "Ms§")
        .replace(/\be\.g\./gi, "eg§")
        .replace(/\bi\.e\./gi, "ie§");

    const result =
        normalized.match(
            /[^.!?]+(?:[.!?]+["'’”)]*)?(?=\s+|$)/g
        ) || [normalized];

    return result
        .map(sentence =>
            sentence
                .replace(/§/g, ".")
                .trim()
        )
        .filter(Boolean);
}


function buildSentenceEntries(records) {

    const entries = [];

    for (const record of records) {

        const rawParagraphs =
            String(record.transcript || "")
                .replace(/\r\n?/g, "\n")
                .split(/\n\s*\n+/)
                .map(paragraph => paragraph.trim())
                .filter(Boolean);

        // Treat a transcript that contains no paragraph separators as one
        // paragraph. Search still operates at sentence level within it.
        for (
            let paragraphIndex = 0;
            paragraphIndex < rawParagraphs.length;
            paragraphIndex++
        ) {

            const paragraph =
                rawParagraphs[paragraphIndex];

            const sentenceList =
                splitSentences(paragraph);

            for (
                let sentenceIndex = 0;
                sentenceIndex < sentenceList.length;
                sentenceIndex++
            ) {

                const sentence =
                    sentenceList[sentenceIndex];

                if (sentence.length < 2) {
                    continue;
                }

                entries.push({
                    record,
                    paragraph,
                    paragraphIndex,
                    sentence,
                    sentenceIndex
                });
            }
        }
    }

    return entries;
}


function getSearchWorker() {

    if (searchWorker) {
        return searchWorker;
    }

    searchWorker = new Worker(
        new URL("./search-worker.js", import.meta.url),
        { type: "module" }
    );

    searchWorker.addEventListener(
        "message",
        event => {

            const data = event.data || {};

            if (data.type === "status") {
                for (const request of pendingWorkerRequests.values()) {
                    if (request.statusCallback) {
                        request.statusCallback(data.message);
                    }
                }
                return;
            }

            const request =
                pendingWorkerRequests.get(data.requestId);

            if (!request) {
                return;
            }

            pendingWorkerRequests.delete(data.requestId);

            if (data.type === "complete") {
                request.resolve(data.embeddings || []);
                return;
            }

            if (data.type === "error") {
                const error = new Error(
                    data.message || "Search worker failed."
                );

                if (data.stack) {
                    error.stack = data.stack;
                }

                request.reject(error);
            }
        }
    );

    searchWorker.addEventListener(
        "error",
        event => {

            const message =
                event.message ||
                "The search worker stopped unexpectedly.";

            const error = new Error(message);

            for (const request of pendingWorkerRequests.values()) {
                request.reject(error);
            }

            pendingWorkerRequests.clear();
            searchWorker = null;
        }
    );

    return searchWorker;
}


function embedTexts(
    texts,
    modelId,
    statusCallback,
    phaseLabel = "Analyzing",
    prefixOverride = null
) {

    const worker = getSearchWorker();
    const requestId = nextWorkerRequestId++;

    return new Promise((resolve, reject) => {

        pendingWorkerRequests.set(
            requestId,
            {
                resolve,
                reject,
                statusCallback
            }
        );

        worker.postMessage({
            type: "embed",
            requestId,
            texts,
            modelId,
            phaseLabel,
            prefixOverride
        });
    });
}
function cosine(a, b) {

    let dot = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
    }

    // Both indexed and query embeddings are normalized by Transformers.js.
    // Keeping cosine here also makes the search robust if that implementation
    // detail changes later.
    return dot;
}


export async function buildSearchIndex(
    files,
    modelId = "minilm",
    statusCallback
) {

    const startTime = performance.now();

    const readStart = performance.now();

    currentIndex = null;

    if (!Array.isArray(files) || files.length === 0) {
        return {
            modelId,
            records: [],
            entries: [],
            sentences: 0,
            readDurationMs: 0,
            sentenceProcessingDurationMs: 0,
            embeddingDurationMs: 0,
            durationMs: performance.now() - startTime
        };
    }

    if (statusCallback) {
        statusCallback(
            `Reading ${files.length} transcript ` +
            `file${files.length === 1 ? "" : "s"}…`
        );
    }

    const allRecords =
        await readTranscriptFiles(files);

    const readDurationMs =
        performance.now() - readStart;

    const records =
        selectHighestModelRecords(allRecords);

    const sentenceStart = performance.now();

    const entries =
        buildSentenceEntries(records);

    const sentenceProcessingDurationMs =
        performance.now() - sentenceStart;

    if (entries.length === 0) {
        const emptyIndex = {
            modelId,
            records,
            entries,
            sentences: 0,
            readDurationMs,
            sentenceProcessingDurationMs,
            embeddingDurationMs: 0,
            durationMs: performance.now() - startTime
        };

        currentIndex = emptyIndex;

        return emptyIndex;
    }

    const embeddingStart = performance.now();

    const embeddings =
        await embedTexts(
            entries.map(entry => entry.sentence),
            modelId,
            statusCallback
        );

    const embeddingDurationMs =
        performance.now() - embeddingStart;

    for (let i = 0; i < entries.length; i++) {
        entries[i].embedding = embeddings[i];
    }

    const index = {
        modelId,
        records,
        entries,
        sentences: entries.length,
        readDurationMs,
        sentenceProcessingDurationMs,
        embeddingDurationMs,
        durationMs: performance.now() - startTime
    };

    currentIndex = index;

    return index;
}


export async function search(
    query,
    maxResults = 30,
    statusCallback
) {

    if (!currentIndex) {
        throw new Error(
            "A search index has not been built yet."
        );
    }

    const cleanQuery =
        String(query || "").trim();

    if (!cleanQuery) {
        return [];
    }

    const startTime = performance.now();
    const config =
        SEARCH_MODELS[currentIndex.modelId];

    if (statusCallback) {
        statusCallback("Understanding your search…");
    }

    const queryEmbedding =
        (await embedTexts(
            [cleanQuery],
            currentIndex.modelId,
            null,
            "",
            config.prefix === "passage: "
                ? "query: "
                : ""
        ))[0];

    const scored =
        currentIndex.entries.map(
            (entry, index) => ({
                entry,
                score: cosine(
                    queryEmbedding,
                    entry.embedding
                ),
                index
            })
        );

    scored.sort(
        (a, b) => b.score - a.score
    );

    return {
        results: scored
            .slice(0, Math.max(1, maxResults))
            .map(({ entry, score }) => ({
                record: entry.record,
                filename: entry.record.filename,
                recordingFilename:
                    entry.record.recordingFilename,
                recordingDate:
                    entry.record.recordingDate,
                audioRelativePath:
                    entry.record.audioRelativePath,
                paragraph: entry.paragraph,
                paragraphIndex: entry.paragraphIndex,
                sentence: entry.sentence,
                sentenceIndex: entry.sentenceIndex,
                score
            })),
        durationMs:
            performance.now() - startTime
    };
}


export function getSearchIndexStats() {

    if (!currentIndex) {
        return null;
    }

    return {
        modelId: currentIndex.modelId,
        transcriptCount: currentIndex.records.length,
        sentenceCount: currentIndex.sentences,
        readDurationMs: currentIndex.readDurationMs,
        sentenceProcessingDurationMs:
            currentIndex.sentenceProcessingDurationMs,
        embeddingDurationMs:
            currentIndex.embeddingDurationMs,
        durationMs: currentIndex.durationMs
    };
}


export function clearSearchIndex() {
    currentIndex = null;
}
