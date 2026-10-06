import { pipeline } from
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0";

let transcriber = null;
let loadedModel = null;

self.onmessage = async event => {

    const message =
        event.data;

    if (message.type === "load") {

        if (
            transcriber &&
            loadedModel === message.model
        ) {
            self.postMessage({
                type: "ready",
                model: message.model
            });
            return;
        }

        try {

            self.postMessage({
                type: "status",
                message:
                    `Loading Whisper ${message.model} on iPhone/iPad using WebGPU…`
            });

            transcriber =
                await pipeline(
                    "automatic-speech-recognition",
                    message.repository,
                    { device: "webgpu" }
                );

            loadedModel =
                message.model;

            self.postMessage({
                type: "ready",
                model: message.model
            });

        } catch (error) {

            self.postMessage({
                type: "error",
                message:
                    error?.stack ||
                    error?.message ||
                    String(error)
            });
        }

        return;
    }

    if (message.type === "transcribe") {

        if (!transcriber) {

            self.postMessage({
                type: "error",
                message:
                    "Whisper is not loaded."
            });

            return;
        }

        try {

            const result =
                await transcriber(
                    message.audioData,
                    {
                        language: message.language,
                        task: "transcribe",
                        chunk_length_s: 30,
                        stride_length_s: 5
                    }
                );

            self.postMessage({
                type: "transcription",
                text: result.text
            });

        } catch (error) {

            self.postMessage({
                type: "error",
                message:
                    error?.stack ||
                    error?.message ||
                    String(error)
            });
        }
    }
};
