// This acknowledges completion of the library API, never physical memory reclamation.
export const WHISPER_DISPOSAL_TIMEOUT_MS = 5000;
let serial = 0;
export function requestWhisperDisposal(worker, { timeoutMs = WHISPER_DISPOSAL_TIMEOUT_MS, signal, clock = () => performance.now() } = {}) {
    const started = clock();
    const requestId = `dispose-${Date.now()}-${++serial}`;
    return new Promise(resolve => {
        let settled = false, timer;
        const prior = { onmessage: worker.onmessage, onerror: worker.onerror, onmessageerror: worker.onmessageerror };
        const finish = (status, error = null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            Object.assign(worker, prior);
            resolve({ status, error, elapsedMs: clock() - started, requestId });
        };
        const abort = () => finish("cancelled", "Disposal wait cancelled; worker termination follows.");
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) { finish("failed", "Invalid disposal deadline."); return; }
        const deadline = started + timeoutMs;
        worker.onmessage = event => {
            const reply = event.data || {};
            if (reply.type !== "disposed" || reply.requestId !== requestId) return;
            if (clock() >= deadline) { finish("timed-out", "Disposal acknowledgement arrived after its deadline."); return; }
            finish(reply.status === "completed" ? "acknowledged" : reply.status === "unavailable" ? "unavailable" : reply.status === "not-loaded" ? "not-loaded" : "failed", reply.error || null);
        };
        worker.onerror = event => finish("failed", event?.message || "Worker error during disposal.");
        worker.onmessageerror = () => finish("failed", "Unreadable disposal response.");
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) { abort(); return; }
        timer = setTimeout(() => finish("timed-out", "Disposal acknowledgement deadline exceeded."), timeoutMs);
        try { worker.postMessage({ type: "dispose", requestId }); }
        catch (error) { finish("failed", error.message || String(error)); }
    });
}
