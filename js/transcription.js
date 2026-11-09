import { acquireWhisperActivity } from "./whisperActivity.js";

// --------------------------------------------------
// Transcription workflow
// --------------------------------------------------

import { decodeAudio } from "./audioProcessor.js";
import { readAudioMetadata } from "./metadata.js";
import {
    loadTranscriber,
    transcribeAudio
} from "./whisper.js";

async function transcribeRecordingInternal(
    file,
    model,
    language,
    operation,
    statusCallback
) {
    if (statusCallback) {
        statusCallback(
            `Preparing ${file.name}…`
        );
    }

    const metadata =
        await readAudioMetadata(file);

    const audio =
        await decodeAudio(file);

    await loadTranscriber(
        model,
        statusCallback
    );

    const task =
        operation === "translate"
            ? "translate"
            : "transcribe";

    const whisperOptions = {
        task
    };

    if (language && language !== "auto") {
        whisperOptions.language = language;
    }

    if (statusCallback) {
        statusCallback(
            operation === "translate"
                ? `Translating ${file.name}…`
                : `Transcribing ${file.name}…`
        );
    }

    const result =
        await transcribeAudio(
            audio,
            whisperOptions
        );

    return {
        file,
        filename: file.name,
        metadata,
        transcript: result.text,
        model
    };
}

// A self-test may release idle model resources; never overlap that with an
// active recording transcription (including preparation and metadata work).
export async function transcribeRecording(file, model, language, operation, statusCallback) {
    const release = acquireWhisperActivity("transcription");
    try {
        return await transcribeRecordingInternal(file, model, language, operation, statusCallback);
    } finally {
        release();
    }
}
