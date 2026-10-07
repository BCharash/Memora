// --------------------------------------------------
// Memora Whisper Isolated Test Worker
// --------------------------------------------------
//
// Diagnostic worker only. A fresh worker is created for every candidate
// and terminated after that candidate finishes. The production iPhone
// worker is intentionally not changed.

let pipeline = null;
let transcriber = null;

async function loadTransformers() {
    if (!pipeline) {
        const transformers = await import(
            "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0"
        );
        pipeline = transformers.pipeline;
    }

    return pipeline;
}

self.postMessage({
    type: "boot",
    message: "Isolated Whisper test worker started."
});

self.onmessage = async event => {
    const message = event.data;

    try {
        if (message.type === "load") {
            self.postMessage({
                type: "status",
                message: `Loading ${message.model} in an isolated test worker…`
            });

            const createPipeline = await loadTransformers();

            const pipelineOptions = {
                device: "webgpu"
            };

            if (message.dtype) {
                pipelineOptions.dtype = message.dtype;
            }

            transcriber = await createPipeline(
                "automatic-speech-recognition",
                message.repository,
                pipelineOptions
            );

            self.postMessage({
                type: "loaded"
            });

            self.postMessage({
                type: "status",
                message: `${message.model} loaded in an isolated test worker.`
            });

            return;
        }

        if (message.type === "transcribe") {
            if (!transcriber) {
                throw new Error("Whisper test worker has not loaded a model.");
            }

            const result = await transcriber(
                message.audio,
                {
                    task: "transcribe",
                    chunk_length_s: 30,
                    stride_length_s: 5
                }
            );

            self.postMessage({
                type: "transcription",
                text: result?.text || ""
            });
        }
    } catch (error) {
        self.postMessage({
            type: "error",
            message:
                error?.stack ||
                error?.message ||
                String(error)
        });
    }
};
