// --------------------------------------------------
// Memora Desktop Whisper Worker
// --------------------------------------------------

// Production desktop worker. A single worker owns the WebGPU Whisper
// pipeline so the model and ONNX runtime are isolated from the page.
// Repeated transcriptions reuse the loaded model. Releasing Whisper
// terminates this worker.

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

self.onmessage = async event => {
    const message = event.data;

    try {
        if (message.type === "load") {
            self.postMessage({
                type: "status",
                message: `Loading ${message.model} in the desktop Whisper worker…`
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
                type: "loaded",
                model: message.model
            });

            self.postMessage({
                type: "status",
                message: `${message.model} loaded using WebGPU.`
            });

            return;
        }

        if (message.type === "transcribe") {
            if (!transcriber) {
                throw new Error(
                    "Desktop Whisper worker has not loaded a model."
                );
            }

            const options = {
                task: message.options?.task || "transcribe",
                chunk_length_s: 30,
                stride_length_s: 5
            };

            if (message.options?.language) {
                options.language = message.options.language;
            }

            const result = await transcriber(
                message.audio,
                options
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
