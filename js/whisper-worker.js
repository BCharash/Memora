import { pipeline } from
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

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
                    `Loading Whisper ${message.model} on iPhone/iPad…`
            });

            const pipelineOptions = {};

            if (message.dtype) {
                pipelineOptions.dtype =
                    message.dtype;
            }

            transcriber =
                await pipeline(
                    "automatic-speech-recognition",
                    message.repository,
                    pipelineOptions
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
                    message.options
                );

            self.postMessage({
                type: "transcription",
                result
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
