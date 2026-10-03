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


// Experimental contextual-search settings. These are deliberately kept
// local to the Search experiment and are not yet part of a permanent
// Memora search architecture.
const CHUNK_SIZE = 5;
const CHUNK_OVERLAP = 2;


function buildChunkEntries(sentenceEntries) {

    const chunks = [];

    if (!sentenceEntries.length) {
        return chunks;
    }

    const step =
        Math.max(1, CHUNK_SIZE - CHUNK_OVERLAP);

    // Chunks are built from the complete sentence sequence of each
    // transcript. They are therefore independent of paragraph size and
    // may cross paragraph boundaries when that provides useful context.
    let start = 0;

    while (start < sentenceEntries.length) {

        const firstEntry =
            sentenceEntries[start];

        const transcriptFile =
            firstEntry.record.file;

        let end = start;

        while (
            end < sentenceEntries.length &&
            sentenceEntries[end].record.file === transcriptFile &&
            end < start + CHUNK_SIZE
        ) {
            end++;
        }

        const chunkEntries =
            sentenceEntries.slice(start, end);

        if (chunkEntries.length > 0) {
            chunks.push({
                record: firstEntry.record,
                sentences: chunkEntries,
                text: chunkEntries
                    .map(entry => entry.sentence)
                    .join(" "),
                firstSentenceGlobalIndex: start,
                lastSentenceGlobalIndex: end - 1
            });
        }

        if (end >= sentenceEntries.length ||
            sentenceEntries[end]?.record.file !== transcriptFile) {
            start = end;
        } else {
            start += step;
        }
    }

    return chunks;
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
            chunks: [],
            sentences: 0,
            chunkCount: 0,
            readDurationMs,
            sentenceProcessingDurationMs,
            embeddingDurationMs: 0,
            durationMs: performance.now() - startTime
        };

        currentIndex = emptyIndex;

        return emptyIndex;
    }

    const chunkStart = performance.now();

    const chunks =
        buildChunkEntries(entries);

    const chunkProcessingDurationMs =
        performance.now() - chunkStart;

    const embeddingStart = performance.now();

    // Sentence and chunk embeddings are generated in the same worker/model
    // request. This avoids loading or initializing the embedding model twice.
    const sentenceTexts =
        entries.map(entry => entry.sentence);

    const chunkTexts =
        chunks.map(chunk => chunk.text);

    const allTexts =
        sentenceTexts.concat(chunkTexts);

    const embeddings =
        await embedTexts(
            allTexts,
            modelId,
            statusCallback,
            "Analyzing semantic units"
        );

    const embeddingDurationMs =
        performance.now() - embeddingStart;

    for (let i = 0; i < entries.length; i++) {
        entries[i].embedding = embeddings[i];
    }

    for (let i = 0; i < chunks.length; i++) {
        chunks[i].embedding =
            embeddings[entries.length + i];
    }

    const index = {
        modelId,
        records,
        entries,
        chunks,
        sentences: entries.length,
        chunkCount: chunks.length,
        readDurationMs,
        sentenceProcessingDurationMs,
        chunkProcessingDurationMs,
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

    const scoredSentences =
        currentIndex.entries.map(
            (entry, index) => ({
                type: "sentence",
                entry,
                score: cosine(
                    queryEmbedding,
                    entry.embedding
                ),
                index
            })
        );

    const scoredChunks =
        currentIndex.chunks.map(
            (chunk, index) => ({
                type: "chunk",
                chunk,
                score: cosine(
                    queryEmbedding,
                    chunk.embedding
                ),
                index
            })
        );

    scoredSentences.sort(
        (a, b) => b.score - a.score
    );

    scoredChunks.sort(
        (a, b) => b.score - a.score
    );

    // Keep the two retrieval modes visible to the caller. A chunk is allowed
    // to remain a result even when none of its individual sentences is a
    // strong match; sentence-level similarity is therefore never a gate on
    // contextual retrieval.
    const sentenceLimit = Math.max(1, maxResults);
    const chunkLimit = Math.max(1, maxResults);

    const sentenceResults =
        scoredSentences
            .slice(0, sentenceLimit)
            .map(({ entry, score }) => ({
                type: "sentence",
                record: entry.record,
                filename: entry.record.filename,
                recordingFilename: entry.record.recordingFilename,
                recordingDate: entry.record.recordingDate,
                audioRelativePath: entry.record.audioRelativePath,
                paragraph: entry.paragraph,
                paragraphIndex: entry.paragraphIndex,
                sentence: entry.sentence,
                sentenceIndex: entry.sentenceIndex,
                score
            }));

    const chunkResults =
        scoredChunks
            .slice(0, chunkLimit)
            .map(({ chunk, score }) => ({
                type: "chunk",
                record: chunk.record,
                filename: chunk.record.filename,
                recordingFilename: chunk.record.recordingFilename,
                recordingDate: chunk.record.recordingDate,
                audioRelativePath: chunk.record.audioRelativePath,
                text: chunk.text,
                sentences: chunk.sentences.map(entry => ({
                    sentence: entry.sentence,
                    sentenceIndex: entry.sentenceIndex,
                    paragraphIndex: entry.paragraphIndex
                })),
                firstSentenceGlobalIndex: chunk.firstSentenceGlobalIndex,
                lastSentenceGlobalIndex: chunk.lastSentenceGlobalIndex,
                score
            }));

    const combined =
        sentenceResults.concat(chunkResults);

    combined.sort(
        (a, b) => b.score - a.score
    );

    return {
        results: combined.slice(0, Math.max(1, maxResults * 2)),
        sentenceResults,
        chunkResults,
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
        chunkProcessingDurationMs:
            currentIndex.chunkProcessingDurationMs,
        embeddingDurationMs:
            currentIndex.embeddingDurationMs,
        durationMs: currentIndex.durationMs
    };
}


export function clearSearchIndex() {
    currentIndex = null;
}
