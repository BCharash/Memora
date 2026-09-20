// --------------------------------------------------
// Transcription workflow
// --------------------------------------------------

import { decodeAudio } from "./audioProcessor.js";
import { readM4AMetadata } from "./metadata.js";
import {
    loadTranscriber,
    transcribeAudio
} from "./whisper.js";


// --------------------------------------------------
// Transcribe a recording
// --------------------------------------------------

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

    const transcriber =
        await loadTranscriber(
            model,
            statusCallback
        );

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
