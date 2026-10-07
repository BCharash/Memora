// --------------------------------------------------
// Memora Semantic Store
// --------------------------------------------------
//
// Persistent storage for semantic representations. The store is deliberately
// independent of the Search ranking strategy so multiple representations can
// coexist and be reused by future search experiments.
// --------------------------------------------------

const DB_NAME = "Memora";
const DB_VERSION = 4;
const ENTRY_STORE = "semanticEntries";
const META_STORE = "semanticMetadata";
const MODEL_VERSION = "transformers.js-3.7.2";

let worker = null;
let nextRequestId = 1;
const pendingRequests = new Map();

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains("transcripts")) {
                db.createObjectStore("transcripts", { keyPath: "filename" });
            }

            if (!db.objectStoreNames.contains(ENTRY_STORE)) {
                const store = db.createObjectStore(ENTRY_STORE, {
                    keyPath: "id"
                });
                store.createIndex("representationKey", "representationKey", {
                    unique: false
                });
                store.createIndex("sourceKey", "sourceKey", {
                    unique: false
                });
            }

            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(
            new Error("Memora storage upgrade is blocked by another open database connection.")
        );
    });
}

function getWorker() {
    if (worker) return worker;

    worker = new Worker(
        new URL("./semantic-worker.js", import.meta.url),
        { type: "module" }
    );

    worker.addEventListener("message", event => {
        const data = event.data || {};

        if (data.type === "status") {
            for (const request of pendingRequests.values()) {
                request.statusCallback?.(data.message);
            }
            return;
        }

        const request = pendingRequests.get(data.requestId);
        if (!request) return;

        pendingRequests.delete(data.requestId);

        if (data.type === "complete") {
            request.resolve(data.embeddings || []);
        } else if (data.type === "error") {
            const error = new Error(data.message || "Semantic worker failed.");
            if (data.stack) error.stack = data.stack;
            request.reject(error);
        }
    });

    worker.addEventListener("error", event => {
        const error = new Error(
            event.message || "The semantic worker stopped unexpectedly."
        );
        for (const request of pendingRequests.values()) {
            request.reject(error);
        }
        pendingRequests.clear();
        worker = null;
    });

    return worker;
}

function embedInWorker(texts, modelId, statusCallback, phaseLabel, prefixOverride) {
    const semanticWorker = getWorker();
    const requestId = nextRequestId++;

    return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, {
            resolve,
            reject,
            statusCallback
        });

        semanticWorker.postMessage({
            type: "embed",
            requestId,
            texts,
            modelId,
            phaseLabel,
            prefixOverride
        });
    });
}

async function digestText(value) {
    const bytes = new TextEncoder().encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function getSourceKey(record) {
    return digestText(JSON.stringify({
        voiceMemoId: record.voiceMemoId || null,
        recordingFilename: record.recordingFilename || null,
        recordingDate: record.recordingDate || null,
        operation: record.operation || "transcribe"
    }));
}

async function getTranscriptHash(record) {
    return digestText(JSON.stringify({
        source: {
            voiceMemoId: record.voiceMemoId || null,
            recordingFilename: record.recordingFilename || null,
            recordingDate: record.recordingDate || null,
            operation: record.operation || "transcribe"
        },
        transcript: String(record.transcript || "")
    }));
}

function makeRepresentationKey({
    sourceKey,
    transcriptHash,
    modelId,
    representationType,
    chunkSize = null,
    chunkOverlap = null
}) {
    return [
        sourceKey,
        transcriptHash,
        modelId,
        MODEL_VERSION,
        representationType,
        chunkSize ?? "",
        chunkOverlap ?? ""
    ].join("|");
}

function makeEntryId(representationKey, ordinal) {
    return `${representationKey}|${ordinal}`;
}

async function loadExistingEntries(db, representationKeys) {
    if (!representationKeys.length) return [];

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ENTRY_STORE, "readonly");
        const store = transaction.objectStore(ENTRY_STORE);
        const index = store.index("representationKey");
        const results = [];
        let pending = representationKeys.length;

        for (const key of representationKeys) {
            const request = index.getAll(key);
            request.onsuccess = () => {
                results.push(...request.result);
                pending--;
                if (pending === 0) resolve(results);
            };
            request.onerror = () => reject(request.error);
        }

        transaction.onerror = () => reject(transaction.error);
    });
}

function writeEntries(db, entries) {
    if (!entries.length) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ENTRY_STORE, "readwrite");
        const store = transaction.objectStore(ENTRY_STORE);

        for (const entry of entries) store.put(entry);

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

function makeStoredEntry({
    item,
    embedding,
    sourceKey,
    transcriptHash,
    modelId,
    representationKey
}) {
    return {
        id: makeEntryId(representationKey, item.ordinal),
        representationKey,
        sourceKey,
        transcriptHash,
        modelId,
        modelVersion: MODEL_VERSION,
        representationType: item.representationType,
        ordinal: item.ordinal,
        text: item.text,
        chunkSize: item.chunkSize ?? null,
        chunkOverlap: item.chunkOverlap ?? null,
        paragraphIndex: item.paragraphIndex ?? null,
        sentenceIndex: item.sentenceIndex ?? null,
        firstSentenceGlobalIndex:
            item.firstSentenceGlobalIndex ?? null,
        lastSentenceGlobalIndex:
            item.lastSentenceGlobalIndex ?? null,
        embedding: embedding.buffer.slice(
            embedding.byteOffset,
            embedding.byteOffset + embedding.byteLength
        ),
        dimension: embedding.length,
        dtype: "float32",
        createdAt: new Date().toISOString()
    };
}

function entryToEmbedding(entry) {
    return new Float32Array(entry.embedding);
}

export async function persistSemanticEmbeddings({
    items = [],
    embeddings = [],
    modelId = "minilm",
    sourceRecords = []
}) {
    if (!items.length) return;
    if (items.length !== embeddings.length) {
        throw new Error("Semantic embedding count does not match item count.");
    }

    const db = await openDatabase();
    const sourceInfo = [];

    for (const record of sourceRecords) {
        sourceInfo.push({
            record,
            sourceKey: await getSourceKey(record),
            transcriptHash: await getTranscriptHash(record)
        });
    }

    const sourceMap = new Map(
        sourceInfo.map(info => [info.record, info])
    );

    const itemsWithKeys = [];
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const record = findRecordForItem(item, sourceInfo);
        const info = sourceMap.get(record);

        if (!info) {
            db.close();
            throw new Error("Could not associate a semantic item with its transcript.");
        }

        const representationKey = makeRepresentationKey({
            sourceKey: info.sourceKey,
            transcriptHash: info.transcriptHash,
            modelId,
            representationType: item.representationType,
            chunkSize: item.chunkSize,
            chunkOverlap: item.chunkOverlap
        });

        itemsWithKeys.push({
            item,
            embedding: embeddings[index],
            sourceKey: info.sourceKey,
            transcriptHash: info.transcriptHash,
            representationKey
        });
    }

    const existing = await loadExistingEntries(
        db,
        [...new Set(itemsWithKeys.map(item => item.representationKey))]
    );

    const existingIds = new Set(existing.map(entry => entry.id));

    const entriesToWrite = itemsWithKeys
        .filter(item => !existingIds.has(
            makeEntryId(item.representationKey, item.item.ordinal)
        ))
        .map(item => makeStoredEntry({
            item: item.item,
            embedding: item.embedding,
            sourceKey: item.sourceKey,
            transcriptHash: item.transcriptHash,
            modelId,
            representationKey: item.representationKey
        }));

    await writeEntries(db, entriesToWrite);
    db.close();
}


export async function getSemanticEmbeddings({
    items = [],
    texts = null,
    modelId = "minilm",
    statusCallback = null,
    phaseLabel = "Analyzing",
    prefixOverride = null,
    sourceRecords = [],
    persist = true
}) {
    const normalizedItems = Array.isArray(items) && items.length
        ? items
        : (Array.isArray(texts)
            ? texts.map((text, ordinal) => ({
                representationType: "query",
                ordinal,
                text
            }))
            : []);

    if (!normalizedItems.length) return [];

    if (!persist || normalizedItems[0].representationType === "query") {
        return embedInWorker(
            normalizedItems.map(item => item.text),
            modelId,
            statusCallback,
            phaseLabel,
            prefixOverride
        );
    }

    const db = await openDatabase();
    const sourceInfo = [];

    for (const record of sourceRecords) {
        sourceInfo.push({
            record,
            sourceKey: await getSourceKey(record),
            transcriptHash: await getTranscriptHash(record)
        });
    }

    // Current Search supplies items grouped by transcript. Build the lookup
    // using object identity so entries from different recordings cannot collide.
    const sourceMap = new Map(
        sourceInfo.map(info => [info.record, info])
    );

    const itemsWithKeys = [];
    for (const item of normalizedItems) {
        // Search's item list is ordered by sentence/chunk and therefore needs
        // a deterministic transcript association. Match by ordinal ranges.
        // The current build passes all records in the same order as entries.
        const record = findRecordForItem(item, sourceInfo);
        const info = sourceMap.get(record);

        if (!info) {
            db.close();
            throw new Error("Could not associate a semantic item with its transcript.");
        }

        const representationKey = makeRepresentationKey({
            sourceKey: info.sourceKey,
            transcriptHash: info.transcriptHash,
            modelId,
            representationType: item.representationType,
            chunkSize: item.chunkSize,
            chunkOverlap: item.chunkOverlap
        });

        itemsWithKeys.push({ item, ...info, representationKey });
    }

    const existing = await loadExistingEntries(
        db,
        [...new Set(itemsWithKeys.map(item => item.representationKey))]
    );

    const existingById = new Map(
        existing.map(entry => [entry.id, entry])
    );

    const missing = itemsWithKeys.filter(item =>
        !existingById.has(makeEntryId(item.representationKey, item.item.ordinal))
    );

    // Report the reuse state before any new embedding work begins. The
    // worker's progress count is intentionally over only the missing items,
    // so the UI needs this context to make values such as "344" meaningful.
    const totalCount = itemsWithKeys.length;
    const storedCount = totalCount - missing.length;
    const modelLabel = modelId === "minilm"
        ? "MiniLM"
        : modelId === "multilingualE5"
            ? "Multilingual E5-small"
            : modelId;

    if (statusCallback) {
        statusCallback(
            `${modelLabel} · ${phaseLabel} — ` +
            `${storedCount.toLocaleString()} stored · ` +
            `${missing.length.toLocaleString()} new · ` +
            `${totalCount.toLocaleString()} total`
        );
    }

    let missingEmbeddings = [];
    if (missing.length) {
        missingEmbeddings = await embedInWorker(
            missing.map(item => item.item.text),
            modelId,
            message => statusCallback?.(`${modelLabel} · ${message}`),
            `Embedding ${phaseLabel.toLowerCase()}`,
            prefixOverride
        );

        const newEntries = missing.map((item, index) =>
            makeStoredEntry({
                item: item.item,
                embedding: missingEmbeddings[index],
                sourceKey: item.sourceKey,
                transcriptHash: item.transcriptHash,
                modelId,
                representationKey: item.representationKey
            })
        );

        await writeEntries(db, newEntries);
        for (const entry of newEntries) existingById.set(entry.id, entry);
    }

    db.close();

    return itemsWithKeys.map(item =>
        entryToEmbedding(
            existingById.get(
                makeEntryId(item.representationKey, item.item.ordinal)
            )
        )
    );
}

function findRecordForItem(item, sourceInfo) {
    // The caller must provide the originating record explicitly. Semantic
    // storage must never infer transcript identity by matching text, because
    // identical sentences can occur in multiple transcripts.
    if (!item.record) {
        throw new Error(
            `Semantic item is missing its transcript record: ${String(item.text || "").slice(0, 80)}`
        );
    }

    const info = sourceInfo.find(candidate => candidate.record === item.record);
    if (info) return info.record;

    throw new Error(
        `Semantic item refers to a transcript that was not supplied to the semantic store: ${String(item.text || "").slice(0, 80)}`
    );
}

export async function getStoredSemanticEntries({
    sourceRecords = [],
    modelId = "minilm",
    representationType = "chunk",
    chunkSize = null,
    chunkOverlap = null
}) {
    if (!sourceRecords.length) return [];

    const db = await openDatabase();
    const sourceInfo = [];

    for (const record of sourceRecords) {
        const sourceKey = await getSourceKey(record);
        const transcriptHash = await getTranscriptHash(record);
        const representationKey = makeRepresentationKey({
            sourceKey,
            transcriptHash,
            modelId,
            representationType,
            chunkSize,
            chunkOverlap
        });

        sourceInfo.push({
            record,
            representationKey
        });
    }

    const entries =
        await loadExistingEntries(
            db,
            sourceInfo.map(info => info.representationKey)
        );

    const recordByRepresentationKey =
        new Map(
            sourceInfo.map(info => [
                info.representationKey,
                info.record
            ])
        );

    db.close();

    return entries.map(entry => ({
        ...entry,
        record:
            recordByRepresentationKey.get(
                entry.representationKey
            ) || null
    }));
}


export async function getSemanticStoreStats() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ENTRY_STORE, "readonly");
        const request = transaction.objectStore(ENTRY_STORE).getAll();

        request.onsuccess = () => {
            const entries = request.result;
            const groups = new Map();
            let totalEmbeddingBytes = 0;

            for (const entry of entries) {
                const representationKey = [
                    entry.modelId,
                    entry.modelVersion || "",
                    entry.representationType,
                    entry.chunkSize ?? "",
                    entry.chunkOverlap ?? ""
                ].join("|");

                let group = groups.get(representationKey);

                if (!group) {
                    group = {
                        modelId: entry.modelId,
                        modelVersion: entry.modelVersion || null,
                        representationType: entry.representationType,
                        chunkSize: entry.chunkSize ?? null,
                        chunkOverlap: entry.chunkOverlap ?? null,
                        count: 0,
                        dimension: entry.dimension ?? null,
                        dtype: entry.dtype || null,
                        embeddingBytes: 0,
                        sourceKeys: new Set(),
                        transcriptHashes: new Set()
                    };

                    groups.set(representationKey, group);
                }

                group.count += 1;
                group.embeddingBytes +=
                    entry.embedding?.byteLength || 0;
                group.sourceKeys.add(entry.sourceKey);
                group.transcriptHashes.add(entry.transcriptHash);

                totalEmbeddingBytes +=
                    entry.embedding?.byteLength || 0;
            }

            const representations =
                [...groups.values()]
                    .map(group => ({
                        modelId: group.modelId,
                        modelVersion: group.modelVersion,
                        representationType:
                            group.representationType,
                        chunkSize: group.chunkSize,
                        chunkOverlap: group.chunkOverlap,
                        count: group.count,
                        dimension: group.dimension,
                        dtype: group.dtype,
                        embeddingBytes: group.embeddingBytes,
                        embeddingMB:
                            group.embeddingBytes / (1024 * 1024),
                        sourceCount: group.sourceKeys.size,
                        transcriptHashCount:
                            group.transcriptHashes.size
                    }))
                    .sort((a, b) => {
                        const modelComparison =
                            a.modelId.localeCompare(b.modelId);

                        if (modelComparison !== 0) {
                            return modelComparison;
                        }

                        return (
                            a.representationType.localeCompare(
                                b.representationType
                            ) ||
                            (a.chunkSize ?? 0) -
                                (b.chunkSize ?? 0) ||
                            (a.chunkOverlap ?? 0) -
                                (b.chunkOverlap ?? 0)
                        );
                    });

            db.close();

            resolve({
                entryCount: entries.length,
                totalEmbeddingBytes,
                totalEmbeddingMB:
                    totalEmbeddingBytes / (1024 * 1024),
                representationCount:
                    representations.length,
                representations
            });
        };

        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}

export async function clearSemanticStore() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(ENTRY_STORE, "readwrite");
        transaction.objectStore(ENTRY_STORE).clear();
        transaction.oncomplete = () => {
            db.close();
            resolve();
        };
        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}
