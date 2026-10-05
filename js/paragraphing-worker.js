import { pipeline, env } from
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

env.allowLocalModels = false;
env.useBrowserCache = true;

let semanticModel = null;
let requestQueue = Promise.resolve();

async function getModel(requestId) {
    if (semanticModel) {
        return semanticModel;
    }

    self.postMessage({
        type: "status",
        requestId,
        message:
            "Loading the local semantic model. The first run may take a little while…"
    });

    semanticModel = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { dtype: "q8" }
    );

    return semanticModel;
}

async function embedSentences(requestId, sentences) {
    const model = await getModel(requestId);
    const embeddings = [];

    for (let index = 0; index < sentences.length; index++) {
        self.postMessage({
            type: "status",
            requestId,
            message:
                `Analyzing sentence ${index + 1} of ${sentences.length}…`
        });

        const result = await model(sentences[index], {
            pooling: "mean",
            normalize: true
        });

        // Copy each result into its own buffer before transferring it back.
        embeddings.push(Float32Array.from(result.data));
    }

    self.postMessage(
        {
            type: "complete",
            requestId,
            embeddings
        },
        embeddings.map(embedding => embedding.buffer)
    );
}

async function processMessage(message) {
    const { requestId, type, sentences } = message || {};

    try {
        if (type !== "embed-sentences") {
            throw new Error(
                `Unknown paragraphing-worker request: ${type}`
            );
        }

        await embedSentences(
            requestId,
            Array.isArray(sentences) ? sentences : []
        );
    } catch (error) {
        self.postMessage({
            type: "error",
            requestId,
            message:
                error?.message ||
                "Paragraphing worker failed.",
            stack: error?.stack || null
        });
    }
}

self.addEventListener("message", event => {
    const message = event.data || {};
    requestQueue = requestQueue.then(
        () => processMessage(message),
        () => processMessage(message)
    );
});
