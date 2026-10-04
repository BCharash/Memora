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
    getStoredSemanticEntries
} from "./semantic.js";

const SEARCH_MODEL_ID = "minilm";

const SEARCH_CONTEXTS = [
    { chunkSize: 3, chunkOverlap: 1, label: "3–2" },
    { chunkSize: 5, chunkOverlap: 2, label: "5–3" },
    { chunkSize: 7, chunkOverlap: 3, label: "7–4" }
];

let currentIndex = null;

let searchWorker = null;
let nextWorkerRequestId = 1;
const pendingWorkerRequests = new Map();


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
    statusCallback
) {

    const modelId = SEARCH_MODEL_ID;

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

    // Persist the three contextual representations used by Search.
    const contextualConfigs = SEARCH_CONTEXTS.filter(
        config => !(config.chunkSize === CHUNK_SIZE && config.chunkOverlap === CHUNK_OVERLAP)
    ).map(config => ({
        ...config,
        chunks: buildChunkEntries(
            entries,
            config.chunkSize,
            config.chunkOverlap
        )
    }));

    const chunkProcessingDurationMs =
        performance.now() - chunkStart;

    const embeddingStart = performance.now();

    // Sentence and chunk embeddings are generated in the same worker/model
    // request. This avoids loading or initializing the embedding model twice.
    const sentenceTexts =
        entries.map(entry => entry.sentence);

    const chunkTexts =
        chunks.map(chunk => chunk.text);

    // Persistent semantic identities are local to each transcript so Search
    // results remain stable regardless of source-file order.
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

    for (const config of contextualConfigs) {
        const contextualChunkItems = [];
        const contextualChunkOrdinals = new Map();

        for (const chunk of config.chunks) {
            const record = chunk.record;
            const ordinal = contextualChunkOrdinals.get(record) || 0;
            contextualChunkOrdinals.set(record, ordinal + 1);

            contextualChunkItems.push({
                representationType: "chunk",
                ordinal,
                record,
                text: chunk.text,
                firstSentenceGlobalIndex:
                    chunk.firstSentenceGlobalIndex,
                lastSentenceGlobalIndex:
                    chunk.lastSentenceGlobalIndex,
                chunkSize: config.chunkSize,
                chunkOverlap: config.chunkOverlap
            });
        }

        await getSemanticEmbeddings({
            items: contextualChunkItems,
            modelId,
            statusCallback,
            phaseLabel: `Chunks ${config.label}`,
            sourceRecords: records
        });
    }

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


export async function searchStoredRepresentations(
    query,
    {
        maxResults = 30,
        records = []
    } = {}
) {
    const cleanQuery = String(query || "").trim();

    if (!cleanQuery) {
        return {
            results: [],
            chunkResults: [],
            representations: []
        };
    }

    const queryEmbedding =
        (await getSemanticEmbeddings({
            items: [{
                representationType: "query",
                ordinal: 0,
                text: cleanQuery
            }],
            modelId: SEARCH_MODEL_ID,
            persist: false
        }))[0];

    const allSentenceEntries = buildSentenceEntries(records);
    const candidates = new Map();
    const representationResults = [];

    for (const context of SEARCH_CONTEXTS) {
        const entries =
            await getStoredSemanticEntries({
                sourceRecords: records,
                modelId: SEARCH_MODEL_ID,
                representationType: "chunk",
                chunkSize: context.chunkSize,
                chunkOverlap: context.chunkOverlap
            });

        const scored = entries
            .map(entry => ({
                entry,
                score: cosine(
                    queryEmbedding,
                    new Float32Array(entry.embedding)
                )
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.max(1, maxResults));

        const results = scored.map(({ entry, score }, index) => ({
            type: "chunk",
            rank: index + 1,
            representation: context.label,
            relativeRank: 1 / (index + 1),
            record: entry.record,
            filename: entry.record.filename,
            recordingFilename: entry.record.recordingFilename,
            recordingDate: entry.record.recordingDate,
            audioRelativePath: entry.record.audioRelativePath,
            text: entry.text,
            sentences: buildStoredChunkSentenceRefs(
                entry,
                allSentenceEntries
            ),
            firstSentenceGlobalIndex: entry.firstSentenceGlobalIndex,
            lastSentenceGlobalIndex: entry.lastSentenceGlobalIndex,
            score
        }));

        representationResults.push({
            representation: context.label,
            results
        });

        for (const result of results) {
            const existing = candidates.get(result.filename);

            if (!existing) {
                candidates.set(result.filename, {
                    ...result,
                    representations: [result.representation]
                });
                continue;
            }

            existing.representations.push(result.representation);

            if (
                result.relativeRank > existing.relativeRank ||
                (
                    result.relativeRank === existing.relativeRank &&
                    result.score > existing.score
                )
            ) {
                const representations = existing.representations;
                Object.assign(existing, result);
                existing.representations = representations;
            }
        }
    }

    const chunkResults =
        Array.from(candidates.values())
            .sort((a, b) => {
                if (b.relativeRank !== a.relativeRank) {
                    return b.relativeRank - a.relativeRank;
                }

                if (b.representations.length !== a.representations.length) {
                    return b.representations.length - a.representations.length;
                }

                return b.score - a.score;
            })
            .slice(0, Math.max(1, maxResults))
            .map((result, index) => ({
                ...result,
                rank: index + 1
            }));

    return {
        results: chunkResults,
        chunkResults,
        representations: representationResults
    };
}

function buildStoredChunkSentenceRefs(
    entry,
    allSentenceEntries
) {
    const first =
        entry.firstSentenceGlobalIndex ?? 0;
    const last =
        entry.lastSentenceGlobalIndex ?? first;

    return allSentenceEntries
        .slice(first, last + 1)
        .filter(item => item.record === entry.record)
        .map(item => ({
            sentence: item.sentence,
            sentenceIndex: item.sentenceIndex,
            paragraphIndex: item.paragraphIndex
        }));
}


export function getSearchIndexRecords() {
    return currentIndex?.records || [];
}


export function clearSearchIndex() {
    currentIndex = null;
}
