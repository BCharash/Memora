// Per-page exclusion between a normal transcription and a disposable self-test.
let active = null;

export function acquireWhisperActivity(kind) {
    if (active) throw new Error(`Whisper is busy (${active.kind}). Finish or cancel it before starting another operation.`);
    const token = { kind };
    active = token;
    return () => { if (active === token) active = null; };
}
