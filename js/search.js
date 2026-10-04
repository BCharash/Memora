// --------------------------------------------------
// Memora semantic search
// --------------------------------------------------
//
// Memora semantic search
//
// Builds/reuses a persistent semantic store for selected transcript files
// and searches it with a natural-language query. The semantic representations
// are stored in IndexedDB so search experiments do not require re-embedding
// unchanged transcripts.
// --------------------------------------------------

import {
    readTranscriptFiles,
    selectHighestModelRecords
} from "./combine.js";

import {
    getSemanticEmbeddings,
    getSemanticStoreStats,
    clearSemanticStore
} from "./semantic.js";

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


function buildChunkEntries(
    sentenceEntries,
    chunkSize = CHUNK_SIZE,
    chunkOverlap = CHUNK_OVERLAP
) {

    const chunks = [];

    if (!sentenceEntries.length) {
        return chunks;
    }

    const step =
        Math.max(1, chunkSize - chunkOverlap);

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
            end < start + chunkSize
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


async function embedTexts(
    texts,
    modelId,
    statusCallback,
    phaseLabel = "Analyzing",
    prefixOverride = null,
    semanticContext = null
) {
    return getSemanticEmbeddings({
        texts,
        modelId,
        statusCallback,
        phaseLabel,
        prefixOverride,
        ...semanticContext
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
        buildChunkEntries(entries, CHUNK_SIZE, CHUNK_OVERLAP);

    // A second persistent representation is intentionally generated now so
    // that the semantic-store diagnostics have real work to report. It is
    // stored for future experiments but is NOT used by the current Search
    // ranking, which continues to use the established 5–3 representation.
    const experimentalChunkSize = 5;
    const experimentalChunkOverlap = 3;

    const experimentalChunks =
        buildChunkEntries(
            entries,
            experimentalChunkSize,
            experimentalChunkOverlap
        );

    const chunkProcessingDurationMs =
        performance.now() - chunkStart;

    const embeddingStart = performance.now();

    // Sentence and chunk embeddings are generated in the same worker/model
    // request. This avoids loading or initializing the embedding model twice.
    const sentenceTexts =
        entries.map(entry => entry.sentence);

    const chunkTexts =
        chunks.map(chunk => chunk.text);

    // Persistent semantic identities must be stable regardless of the order
    // in which transcript files are supplied to Search. The semantic store
    // already identifies each representation by transcript, so the ordinal
    // is local to that transcript rather than the position in the combined
    // Search array.
    //
    // Sentences and contextual chunks are deliberately embedded in separate
    // semantic-store calls. This makes the persistent-store diagnostic
    // representation-aware and will allow additional chunk configurations to
    // coexist later without making the status ambiguous.
    const sentenceItems = [];
    const sentenceOrdinals = new Map();

    for (let i = 0; i < entries.length; i++) {
        const record = entries[i].record;
        const ordinal = sentenceOrdinals.get(record) || 0;
        sentenceOrdinals.set(record, ordinal + 1);

        sentenceItems.push({
            representationType: "sentence",
            ordinal,
            record,
            text: sentenceTexts[i],
            paragraphIndex: entries[i].paragraphIndex,
            sentenceIndex: entries[i].sentenceIndex
        });
    }

    const sentenceEmbeddings =
        await getSemanticEmbeddings({
            items: sentenceItems,
            modelId,
            statusCallback,
            phaseLabel: "Sentences",
            sourceRecords: records
        });

    const chunkItems = [];
    const chunkOrdinals = new Map();

    for (let i = 0; i < chunks.length; i++) {
        const record = chunks[i].record;
        const ordinal = chunkOrdinals.get(record) || 0;
        chunkOrdinals.set(record, ordinal + 1);

        chunkItems.push({
            representationType: "chunk",
            ordinal,
            record,
            text: chunkTexts[i],
            firstSentenceGlobalIndex: chunks[i].firstSentenceGlobalIndex,
            lastSentenceGlobalIndex: chunks[i].lastSentenceGlobalIndex,
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP
        });
    }

    const chunkEmbeddings =
        await getSemanticEmbeddings({
            items: chunkItems,
            modelId,
            statusCallback,
            phaseLabel: `Chunks ${CHUNK_SIZE}–${CHUNK_SIZE - CHUNK_OVERLAP}`,
            sourceRecords: records
        });

    // Persist 5–2 as a second representation. Its embeddings are deliberately
    // not added to currentIndex yet; this experiment is about proving that
    // multiple chunk configurations can coexist in persistent storage.
    const experimentalChunkItems = [];
    const experimentalChunkOrdinals = new Map();

    for (let i = 0; i < experimentalChunks.length; i++) {
        const record = experimentalChunks[i].record;
        const ordinal = experimentalChunkOrdinals.get(record) || 0;
        experimentalChunkOrdinals.set(record, ordinal + 1);

        experimentalChunkItems.push({
            representationType: "chunk",
            ordinal,
            record,
            text: experimentalChunks[i].text,
            firstSentenceGlobalIndex:
                experimentalChunks[i].firstSentenceGlobalIndex,
            lastSentenceGlobalIndex:
                experimentalChunks[i].lastSentenceGlobalIndex,
            chunkSize: experimentalChunkSize,
            chunkOverlap: experimentalChunkOverlap
        });
    }

    await getSemanticEmbeddings({
        items: experimentalChunkItems,
        modelId,
        statusCallback,
        phaseLabel:
            `Chunks ${experimentalChunkSize}–` +
            `${experimentalChunkSize - experimentalChunkOverlap}`,
        sourceRecords: records
    });

    const embeddingDurationMs =
        performance.now() - embeddingStart;

    for (let i = 0; i < entries.length; i++) {
        entries[i].embedding = sentenceEmbeddings[i];
    }

    for (let i = 0; i < chunks.length; i++) {
        chunks[i].embedding = chunkEmbeddings[i];
    }

    const index = {
        modelId,
        records,
        entries,
        chunks,
        sentences: entries.length,
        chunkCount: chunks.length,
        experimentalChunkCount: experimentalChunks.length,
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
        (await getSemanticEmbeddings({
            items: [{
                representationType: "query",
                ordinal: 0,
                text: cleanQuery
            }],
            modelId: currentIndex.modelId,
            statusCallback: null,
            phaseLabel: "",
            prefixOverride:
                config.prefix === "passage: "
                    ? "query: "
                    : null,
            persist: false
        }))[0];

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

export async function getSearchSemanticStats() {
    return getSemanticStoreStats();
}

export async function clearSearchSemanticStore() {
    await clearSemanticStore();
    currentIndex = null;
}
