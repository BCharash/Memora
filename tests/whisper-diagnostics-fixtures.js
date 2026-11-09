export const calls = [];
export async function readAudioMetadata() { calls.push("metadata"); return { title: "fixture" }; }
export async function decodeAudio() { calls.push("decode"); return new Float32Array(16000); }
export async function loadTranscriber(model) { calls.push(`load:${model}`); }
export function getWhisperLoadDiagnostics() { return { diagnostics: { selection: "tiny", repository: "fixture" }, reused: true }; }
export async function transcribeAudio(audio, options) { calls.push(options); return { text: "fixture result", workerInferenceMs: 25 }; }
