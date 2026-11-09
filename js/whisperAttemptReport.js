// Presentation copy only: preserve terminal outcomes and stored historical evidence.
export function presentWhisperAttempt(record) {
    const report = structuredClone(record);
    if (report.observation?.status === "failed" && !report.observation.error && !report.observation.failedPhase) {
        report.observation.status = "in-progress";
    }
    return report;
}
