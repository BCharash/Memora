// Fixture-specific functional validation, not general model quality/eligibility.
// v1 preserves the previous case/apostrophe/punctuation normalization exactly.
export const WHISPER_VALIDATION_PROTOCOL = "whisper-fixture-wer-v1";
export const MAX_WHISPER_WER = 0.15;

export function formatWhisperWer(wer) {
    if (!Number.isFinite(wer)) return "unavailable";
    const percent = (wer * 100).toFixed(2);
    // Never display a failed near-boundary score as though it met the limit.
    return `${wer > MAX_WHISPER_WER && Number(percent) <= 15 ? ">" : ""}${percent}%`;
}

export function normalizeWhisperText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[“”‘’]/g, "'")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

export function wordErrorRate(reference, hypothesis) {
    const ref = normalizeWhisperText(reference).split(/\s+/).filter(Boolean);
    const hyp = normalizeWhisperText(hypothesis).split(/\s+/).filter(Boolean);
    if (!ref.length) return hyp.length ? 1 : 0;
    const previous = Array.from({ length: hyp.length + 1 }, (_, i) => i);
    for (let i = 1; i <= ref.length; i++) {
        const current = [i];
        for (let j = 1; j <= hyp.length; j++) {
            current[j] = Math.min(previous[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1), previous[j] + 1, current[j - 1] + 1);
        }
        for (let j = 0; j <= hyp.length; j++) previous[j] = current[j];
    }
    return previous[hyp.length] / ref.length;
}

export function hasWhisperReference(reference) {
    return typeof reference === "string" && normalizeWhisperText(reference).length > 0;
}

export function validateWhisperOutput(reference, transcript, score = wordErrorRate) {
    const result = {
        protocol: WHISPER_VALIDATION_PROTOCOL, maxWer: MAX_WHISPER_WER,
        status: "failed", reason: null, wer: null, message: ""
    };
    const fail = (reason, message) => ({ ...result, reason, message });
    if (!hasWhisperReference(reference)) return fail("invalid-reference", "The expected transcript is empty or invalid; this fixture cannot validate a model.");
    if (typeof transcript !== "string") return fail("invalid-output", "Inference replied without a valid text string.");
    if (!normalizeWhisperText(transcript)) return fail("empty-output", "Inference completed but returned no words.");
    try { result.wer = score(reference, transcript); }
    catch { return fail("invalid-score", "The transcript accuracy score could not be calculated."); }
    if (!Number.isFinite(result.wer) || result.wer < 0) {
        result.wer = null;
        return fail("invalid-score", "The transcript accuracy score is invalid.");
    }
    if (result.wer > MAX_WHISPER_WER) return fail("wer-exceeded", `WER ${formatWhisperWer(result.wer)} exceeds the 15% limit.`);
    return { ...result, status: "passed", reason: "within-limit", message: "WER is within the 15% limit." };
}
