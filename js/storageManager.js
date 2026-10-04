// --------------------------------------------------
// Memora Storage Manager
// --------------------------------------------------
//
// Read-only accounting for browser storage used by Memora.
// This module deliberately does not mutate transcripts, semantic data,
// browser caches, or model data.
//

const DB_NAME = "Memora";


function openMemoraDatabase() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            resolve(null);
            return;
        }

        const request = indexedDB.open(DB_NAME);

        request.onsuccess = () => {
            const database = request.result;
            database.onversionchange = () => database.close();
            resolve(database);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


function estimateValueBytes(value) {
    try {
        return new TextEncoder().encode(
            JSON.stringify(value)
        ).byteLength;
    } catch {
        return 0;
    }
}


function embeddingByteLength(embedding) {
    if (!embedding) return 0;

    if (embedding instanceof ArrayBuffer) {
        return embedding.byteLength;
    }

    if (ArrayBuffer.isView(embedding)) {
        return embedding.byteLength;
    }

    if (Array.isArray(embedding)) {
        // Semantic embeddings are normally stored as numeric arrays when
        // crossing IndexedDB boundaries. Float32 is the useful size estimate.
        return embedding.length * Float32Array.BYTES_PER_ELEMENT;
    }

    return 0;
}


async function readIndexedDBReport() {
    const database = await openMemoraDatabase();

    const empty = {
        transcripts: {
            count: 0,
            bytes: 0
        },
        semanticEntries: {
            count: 0,
            embeddingBytes: 0,
            recordBytes: 0,
            representations: []
        },
        otherBytes: 0,
        otherCount: 0
    };

    if (!database) {
        return empty;
    }

    const stores = Array.from(database.objectStoreNames);

    const result = await new Promise((resolve, reject) => {
        const transaction =
            database.transaction(
                stores,
                "readonly"
            );

        const output = {
            transcripts: {
                count: 0,
                bytes: 0
            },
            semanticEntries: {
                count: 0,
                embeddingBytes: 0,
                recordBytes: 0,
                representations: []
            },
            otherBytes: 0,
            otherCount: 0
        };

        for (const storeName of stores) {
            const request =
                transaction.objectStore(storeName).getAll();

            request.onsuccess = () => {
                const values = request.result || [];

                if (storeName === "transcripts") {
                    output.transcripts.count = values.length;
                    output.transcripts.bytes =
                        values.reduce(
                            (total, value) =>
                                total + estimateValueBytes(value),
                            0
                        );
                    return;
                }

                if (storeName === "semanticEntries") {
                    const groups = new Map();

                    for (const value of values) {
                        output.semanticEntries.embeddingBytes +=
                            embeddingByteLength(value.embedding);

                        output.semanticEntries.recordBytes +=
                            estimateValueBytes(value);

                        const key =
                            [
                                value.modelId || "unknown model",
                                value.representationType || "unknown representation",
                                value.chunkSize ?? "",
                                value.chunkOverlap ?? ""
                            ].join("|");

                        const group =
                            groups.get(key) || {
                                name: "Semantic representation",
                                count: 0,
                                embeddingBytes: 0
                            };

                        group.count++;
                        group.embeddingBytes +=
                            embeddingByteLength(value.embedding);

                        group.name =
                            formatRepresentationName(value);

                        groups.set(key, group);
                    }

                    output.semanticEntries.count = values.length;
                    output.semanticEntries.representations =
                        Array.from(groups.values())
                            .sort((a, b) =>
                                a.name.localeCompare(b.name)
                            );
                    return;
                }

                output.otherCount += values.length;
                output.otherBytes +=
                    values.reduce(
                        (total, value) =>
                            total + estimateValueBytes(value),
                        0
                    );
            };
        }

        transaction.oncomplete = () => resolve(output);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });

    database.close();

    return result;
}


function formatRepresentationName(value) {
    const model =
        value.modelId || "Unknown model";

    const type =
        value.representationType || "representation";

    if (
        value.chunkSize !== undefined &&
        value.chunkSize !== null
    ) {
        const overlap =
            value.chunkOverlap !== undefined &&
            value.chunkOverlap !== null
                ? value.chunkOverlap
                : "?";

        return `${model} · ${type} ${value.chunkSize}–${overlap}`;
    }

    return `${model} · ${type}`;
}


function isLikelyModelAsset(url) {
    const value = String(url || "").toLowerCase();

    return (
        value.includes("huggingface.co") ||
        value.includes("/onnx/") ||
        value.includes(".onnx") ||
        value.includes("tokenizer") ||
        value.includes("config.json") ||
        value.includes(".wasm")
    );
}


function modelNameFromUrl(url) {
    const value = String(url || "");

    const knownNames = [
        "whisper-large-v3",
        "whisper-medium",
        "whisper-small",
        "whisper-base",
        "whisper-tiny",
        "all-minilm-l6-v2"
    ];

    const lower = value.toLowerCase();

    const known =
        knownNames.find(name =>
            lower.includes(name)
        );

    if (known) {
        return known;
    }

    return "Other cached model files";
}


async function readModelCacheReport() {
    const result = {
        knownBytes: 0,
        modelEntryCount: 0,
        models: []
    };

    if (!window.caches) {
        return result;
    }

    const cacheNames =
        await caches.keys();

    const groups = new Map();

    for (const cacheName of cacheNames) {
        let cache;

        try {
            cache = await caches.open(cacheName);
        } catch {
            continue;
        }

        let requests;

        try {
            requests = await cache.keys();
        } catch {
            continue;
        }

        for (const request of requests) {
            if (!isLikelyModelAsset(request.url)) {
                continue;
            }

            result.modelEntryCount++;

            let bytes = 0;

            try {
                const response =
                    await cache.match(request);

                const contentLength =
                    response?.headers.get("content-length");

                if (contentLength) {
                    bytes = Number(contentLength);
                    if (!Number.isFinite(bytes)) {
                        bytes = 0;
                    }
                }
            } catch {
                // Some cached responses do not expose a usable size header.
            }

            result.knownBytes += bytes;

            const name =
                modelNameFromUrl(request.url);

            const group =
                groups.get(name) || {
                    name,
                    detail: "Cached model files · size not fully exposed by the browser",
                    bytes: 0,
                    count: 0
                };

            group.count++;
            group.bytes += bytes;

            group.detail =
                `${formatBytesForManager(group.bytes)} · ` +
                `${group.count} file${group.count === 1 ? "" : "s"}`;

            groups.set(name, group);
        }
    }

    result.models =
        Array.from(groups.values())
            .sort((a, b) =>
                a.name.localeCompare(b.name)
            );

    return result;
}


function formatBytesForManager(bytes) {
    if (!Number.isFinite(bytes)) {
        return "unknown size";
    }

    if (bytes < 1024) {
        return `${Math.round(bytes)} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}


export async function getStorageReport() {
    const browser =
        navigator.storage &&
        navigator.storage.estimate
            ? await navigator.storage.estimate()
            : {};

    const indexedDBReport =
        await readIndexedDBReport();

    const modelCache =
        await readModelCacheReport();

    return {
        browser: {
            usage:
                Number.isFinite(browser.usage)
                    ? browser.usage
                    : null,
            quota:
                Number.isFinite(browser.quota)
                    ? browser.quota
                    : null
        },
        indexedDB: indexedDBReport,
        modelCache
    };
}
