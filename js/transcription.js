// --------------------------------------------------
// Transcription workflow
// --------------------------------------------------

import { decodeAudio } from "./audioProcessor.js";
import { readM4AMetadata } from "./metadata.js";
import {
    loadTranscriber,
    transcribeAudio
} from "./whisper.js";

export async function transcribeRecording(
    file,
    model,
    statusCallback
) {
    if (statusCallback) {
        statusCallback(
            `Preparing ${file.name}…`
        );
    }

    const metadata =
        await readM4AMetadata(file);

    const audio =
        await decodeAudio(file);

    await loadTranscriber(
        model,
        statusCallback
    );

    if (statusCallback) {
        statusCallback(
            `Transcribing ${file.name}…`
        );
    }

    const result =
        await transcribeAudio(
            audio
        );

    return {
        file,
        filename: file.name,
        metadata,
        transcript: result.text,
        model
    };
}
