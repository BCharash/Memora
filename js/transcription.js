import { createWhisperExecutionJournal } from "./whisperExecutions.js";
import { selectWhisperConfigurationDefinition, fingerprintWhisperConfiguration } from "./whisperConfigurations.js";
import { runtimeIdentity } from "./runtime.js";
import { APP_BUILD } from "./build-info.js";
import { startRuntimeDiagnostics } from "./runtimeDiagnostics.js";
import { atWhisperFailureBoundary } from "./whisperFailures.js";
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
    statusCallback,
    execution
) {
    const timings = {};
    if (statusCallback) {
        statusCallback(
            `Preparing ${file.name}…`
        );
    }

    execution.checkpoint("metadata");
    let started = performance.now();
    const metadata =
        await atWhisperFailureBoundary({ stage: "metadata" }, () => readAudioMetadata(file));
    timings.metadataMs = performance.now() - started;

    execution.checkpoint("decode", { timings });
    started = performance.now();
    const audio =
        await atWhisperFailureBoundary({ stage: "decode" }, () => decodeAudio(file));
    timings.decodeMs = performance.now() - started;
    timings.audioDurationMs = audio.length / 16000 * 1000;

    execution.checkpoint("load", { timings });
    started = performance.now();
    await atWhisperFailureBoundary({ stage: "load" }, () => loadTranscriber(model, statusCallback));
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

    execution.checkpoint("inference", { timings, diagnostics: loaded.diagnostics });
    started = performance.now();
    const result =
        await atWhisperFailureBoundary({ stage: "inference" }, () => transcribeAudio(audio, whisperOptions));
    timings.inferenceMs = performance.now() - started;
    timings.workerInferenceMs = result.workerInferenceMs;
    const diagnostics = result.diagnostics || loaded.diagnostics;
    execution.checkpoint("model-complete", { timings, diagnostics });
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
export async function transcribeRecording(file, model, language, operation, statusCallback, afterInference = null) {
    const release = acquireWhisperActivity("transcription");
    try {
        const selected = selectWhisperConfigurationDefinition(model, runtimeIdentity);
        const configuration = selected.ok ? selected.configuration : null;
        let configurationFingerprint = null;
        try { if (configuration) configurationFingerprint = await fingerprintWhisperConfiguration(configuration); }
        catch (error) { console.warn("Execution fingerprint unavailable:", error); }
        const metadata = {
            build: APP_BUILD, pageId: startRuntimeDiagnostics().pageId, environment: runtimeIdentity,
            browser: navigator.userAgent, requestedModel: model, configuration, configurationFingerprint,
            recipe: { task: operation === "translate" ? "translate" : "transcribe", language: language || "auto", sampleRate: 16000, chunk_length_s: 30, stride_length_s: 5,
                effectiveTask: configuration?.platform === "ios" ? "transcribe" : operation === "translate" ? "translate" : "transcribe" }
        };
        // Storage/locking failure is visible, but does not disable a working
        // transcriber in this observation-only checkpoint.
        let journal;
        try { journal = createWhisperExecutionJournal(); }
        catch (error) { journal = createWhisperExecutionJournal({ storage: null, locks: null }); }
        return await journal.run(metadata, async execution => {
            let record;
            try { record = await transcribeRecordingInternal(file, model, language, operation, statusCallback, execution); }
            finally { release(); } // Preserve the existing model activity boundary.
            record.executionId = execution.id;
            if (afterInference) await afterInference(record, execution);
            execution.checkpoint("complete", { timings: record.timings, diagnostics: record.diagnostics });
            return record;
        });
    } finally { release(); }
}
