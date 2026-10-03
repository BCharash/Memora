// --------------------------------------------------
// Memora semantic search worker
// --------------------------------------------------
//
// Keeps Transformers.js model loading and embedding work off the main
// browser thread so the Search UI remains responsive while a collection
// is being indexed.
// --------------------------------------------------

import { pipeline, env } from
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

const SEARCH_MODELS = {
    minilm: {
        model: "Xenova/all-MiniLM-L6-v2",
        prefix: ""
    },
    multilingualE5: {
        model: "Xenova/multilingual-e5-small",
        prefix: "passage: "
    }
};

const BATCH_SIZE = 8;

let extractor = null;
let loadedModelId = null;


async function getExtractor(modelId) {

    const config = SEARCH_MODELS[modelId];

    if (!config) {
        throw new Error(
            `Unknown search model: ${modelId}`
        );
    }

    if (extractor && loadedModelId === modelId) {
        return extractor;
    }

    // A model change starts a new model instance. The browser/Transformers.js
    // cache still avoids downloading weights again when they are available.
    extractor = null;
    loadedModelId = null;

    self.postMessage({
        type: "status",
        message: "Loading the local semantic model. The first run may take a little while…"
    });

    extractor = await pipeline(
        "feature-extraction",
        config.model,
        { dtype: "q8" }
    );

    loadedModelId = modelId;

    return extractor;
}


async function embedTexts(
    texts,
    modelId,
    phaseLabel = "Analyzing",
    prefixOverride = null
) {

    const config = SEARCH_MODELS[modelId];

    if (!config) {
        throw new Error(
            `Unknown search model: ${modelId}`
        );
    }

    const semanticModel =
        await getExtractor(modelId);

    const embeddings = [];

    for (
        let start = 0;
        start < texts.length;
        start += BATCH_SIZE
    ) {

        const batch =
            texts.slice(
                start,
                start + BATCH_SIZE
            );

        const inputPrefix =
            prefixOverride === null
                ? config.prefix
                : prefixOverride;

        const modelInputs =
            inputPrefix
                ? batch.map(text =>
                    `${inputPrefix}${text}`
                )
                : batch;

        self.postMessage({
            type: "status",
            message:
                `${phaseLabel} sentences ${start + 1}–` +
                `${Math.min(start + batch.length, texts.length)} ` +
                `of ${texts.length}…`
        });

        const output =
            await semanticModel(
                modelInputs,
                {
                    pooling: "mean",
                    normalize: true
                }
            );

        const dimension =
            output.dims[output.dims.length - 1];

        for (let i = 0; i < batch.length; i++) {

            const offset = i * dimension;

            embeddings.push(
                new Float32Array(
                    output.data.slice(
                        offset,
                        offset + dimension
                    )
                )
            );
        }
    }

    return embeddings;
}


self.addEventListener("message", async event => {

    const {
        requestId,
        type,
        texts,
        modelId,
        phaseLabel,
        prefixOverride
    } = event.data || {};

    try {

        if (type === "embed") {

            const embeddings =
                await embedTexts(
                    Array.isArray(texts) ? texts : [],
                    modelId,
                    phaseLabel || "Analyzing",
                    prefixOverride ?? null
                );

            const transferables =
                embeddings.map(
                    embedding => embedding.buffer
                );

            self.postMessage(
                {
                    type: "complete",
                    requestId,
                    embeddings
                },
                transferables
            );

            return;
        }

        throw new Error(
            `Unknown search-worker request: ${type}`
        );

    } catch (error) {

        self.postMessage({
            type: "error",
            requestId,
            message:
                error?.message || String(error),
            stack:
                error?.stack || ""
        });
    }
});
