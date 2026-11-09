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
import * as whisperRuntime from "./whisper.js";

async function transcribeRecordingInternal(
    file,
    model,
    language,
    operation,
    statusCallback
) {
    const timings = {};
    if (statusCallback) {
        statusCallback(
            `Preparing ${file.name}…`
        );
    }

    let started = performance.now();
    const metadata =
        await readAudioMetadata(file);
    timings.metadataMs = performance.now() - started;

    started = performance.now();
    const audio =
        await decodeAudio(file);
    timings.decodeMs = performance.now() - started;
    timings.audioDurationMs = audio.length / 16000 * 1000;

    started = performance.now();
    await loadTranscriber(
        model,
        statusCallback
    );
    timings.loadMs = performance.now() - started;
    // An older cached loader can still transcribe; diagnostic additions should
    // degrade to unavailable evidence rather than break module startup.
    const loaded = whisperRuntime.getWhisperLoadDiagnostics?.() || { diagnostics: null, reused: null };
    timings.reused = loaded.reused;

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

    started = performance.now();
    const result =
        await transcribeAudio(
            audio,
            whisperOptions
        );
    timings.inferenceMs = performance.now() - started;
    timings.workerInferenceMs = result.workerInferenceMs;
    const diagnostics = result.diagnostics || loaded.diagnostics;
    console.info("[Whisper transcription timings]", { filename: file.name, timings, diagnostics });

    return {
        file,
        filename: file.name,
        metadata,
        transcript: result.text,
        model,
        timings,
        diagnostics
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
