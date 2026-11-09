import { getRuntimeDiagnosticReport } from "./runtimeDiagnostics.js";
import { createWhisperEvidenceBridge, getWhisperEligibilityContext } from "./whisperEligibilityEvidence.js";
import { getWhisperConfigurationDefinitions } from "./whisperConfigurations.js";
import { presentWhisperAttempt } from "./whisperAttemptReport.js";
import { createWhisperAttemptJournal } from "./whisperAttempts.js";
// --------------------------------------------------
// Memora Settings UI
// --------------------------------------------------

import {
    checkAllModels,
    getModelRegistry,
    rebuildModelRegistry
} from "./modelManager.js";
import { getRuntimeInfo, runtimeIdentity, isIOS, getRuntimeCapabilities } from "./runtime.js";
import { clearWhisperResources } from "./whisper.js";
import { getWhisperSelfTestOptions, runWhisperSelfTest } from "./whisperSelfTest.js";
import { collectDomDiagnostics, formatDomDiagnostics } from "./domDiagnostics.js";
import { formatWhisperDiagnostics } from "./whisperDiagnostics.js";
import { formatWhisperWer } from "./whisperValidation.js";

// Describes current routing policy, not confirmation of model execution.
function getWhisperRuntimeDescription() {
    return isIOS
        ? "Transformers.js 3.7.2 · worker · requested backend: WASM"
        : "Transformers.js 4.0.0 · worker · requested backend: WebGPU";
}

export function initSettingsUI({ getStorageManager, getStorage }) {
    const status = document.getElementById("settingsStorageStatus");
    const storage = document.getElementById("settingsStorage");
    const refreshButton = document.getElementById("settingsRefreshButton");

    // Recover at app initialization, even before Settings is opened. Storage
    // failures do not prevent startup; the history panel reports them on open.
    void Promise.resolve().then(() => createWhisperEvidenceBridge().sync())
        .catch(error => console.warn("Whisper attempt recovery unavailable:", error));

    let currentReport = null;
    let modelAvailability = null;
    let latestDomDiagnostics = null;
    let selfTestController = null;

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
        if (bytes < 1024) return `${Math.round(bytes)} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    function formatSeconds(ms) {
        return `${(ms / 1000).toFixed(1)} s`;
    }

    function row(label, value) {
        return `<div class="settings-row"><span class="settings-label">${label}</span><span class="settings-value">${value}</span></div>`;
    }

    function button(label, action, disabled = false) {
        return `<button type="button" data-settings-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
    }

    function formatRegistryDtype(dtype) {
        if (!dtype) return "Default";
        if (typeof dtype === "string") return dtype;
        return Object.entries(dtype)
            .map(([key, value]) => `${key.replace("_model", "")}: ${value}`)
            .join(" · ");
    }

    function formatValidation(validation) {
        const status = validation?.status || "not-tested";
        if (status === "passed") {
            return validation.seconds != null
                ? `✓ Validated · ${validation.seconds}s`
                : "✓ Validated";
        }
        if (status === "failed") return "⚠ Validation failed";
        if (status === "slow") return "⚠ Slow";
        return "Not tested";
    }

    function render(report) {
        currentReport = report;
        const semantic = report.indexedDB.semanticEntries;
        const models = report.modelCache;
        const transcripts = report.indexedDB.transcripts;

        storage.innerHTML = `
            ${row("Browser storage used", formatBytes(report.browser.usage))}
            ${row("Browser storage quota", formatBytes(report.browser.quota))}

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Semantic Index</span>
                <span>${formatBytes(semantic.embeddingBytes)} · ${semantic.count.toLocaleString()} entries</span>
                ${button("View", "toggle-semantic")}
            </div>
            <div id="settingsSemanticDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Other Cached Models</span>
                <span>${formatBytes(models.models.filter(item => !/^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)).reduce((sum, item) => sum + (item.bytes || 0), 0))} · ${models.models.filter(item => !/^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)).reduce((sum, item) => sum + (item.count || 0), 0).toLocaleString()} files</span>
                ${button("View", "toggle-other-models")}
            </div>
            <div id="settingsOtherModelsDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Cached Transcripts</span>
                <span>${formatBytes(transcripts.bytes)} · ${transcripts.count.toLocaleString()} files</span>
                ${button("View", "toggle-transcripts")}
            </div>
            <div id="settingsTranscriptsDetail" class="settings-detail" hidden></div>


            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Other Memora IndexedDB data</span>
                <span>${formatBytes(report.indexedDB.otherBytes)} · ${report.indexedDB.otherCount.toLocaleString()} entries</span>
                ${button("View", "toggle-other-indexeddb")}
            </div>
            <div id="settingsOtherIndexedDBDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">DOM Diagnostics</span>
                <span>Read-only snapshot of the current page</span>
                ${button("View", "toggle-dom-diagnostics")}
            </div>
            <div id="settingsDomDiagnosticsDetail" class="settings-detail dom-diagnostics-detail" hidden aria-live="polite">
                <p class="settings-note">Captures data only when requested.</p>
                <div class="dom-diagnostics-actions">
                    ${button("Capture", "capture-dom-diagnostics")}
                    ${button("Copy report", "copy-dom-diagnostics", true)}
                </div>
                <div id="settingsDomDiagnosticsReport"></div>
            </div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Whisper Models</span>
                <span id="settingsWhisperModelsSummary">${formatBytes(models.models.filter(item => /^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)).reduce((sum, item) => sum + (item.bytes || 0), 0))} · ${models.models.filter(item => /^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)).length} models</span>
                ${button("View", "toggle-whisper-models")}
            </div>
            <div id="settingsWhisperModelsDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Whisper Self-Test</span>
            </div>
            <div class="whisper-self-test-controls">
                <label for="settingsWhisperSelfTestModel">Model</label>
                <select id="settingsWhisperSelfTestModel">
                    ${getWhisperSelfTestOptions().map(configuration => `
                        <option value="${escapeHtml(configuration.id)}">
                            ${escapeHtml(formatSelfTestOption(configuration))}
                        </option>
                    `).join("")}
                </select>
                ${button("Run test", "run-whisper-self-test")}
            </div>
            <div id="settingsWhisperSelfTestCancel" class="whisper-self-test-cancel" hidden>
                ${button("Cancel test", "cancel-whisper-self-test", true)}
            </div>
            <div id="settingsWhisperEligibility" class="settings-note" role="status"></div>
            <div id="settingsWhisperSelfTestDetail" class="settings-detail" hidden></div>
            <details id="settingsWhisperAdvanced">
                <summary>Advanced test settings</summary>
            <p class="settings-note">Self-test releases the idle production Whisper model. Default load limit: 600 seconds; inference: 180 seconds. These are provisional Tiny safety limits, not measured limits for larger models.</p>
            <p class="settings-note">Accuracy passes only with non-empty text and WER ≤15% against the test reference. Inference completion alone is not an accuracy pass.</p>
            <div class="whisper-self-test-controls">
                <label>Load limit (seconds) <input id="settingsWhisperLoadLimit" type="number" min="1" max="86400" value="600"></label>
                <label>Inference limit (seconds) <input id="settingsWhisperInferenceLimit" type="number" min="1" max="86400" value="180"></label>
            </div>

            </details>
            <details id="settingsWhisperHistorySection">
                <summary>Saved results and interruption reports</summary>
                <div id="settingsWhisperAttemptHistory" class="settings-note"></div>
            </details>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Whisper Resources</span>
                <span>Unload the active Whisper model and runtime resources</span>
                ${button("Clear resources", "clear-whisper-resources")}
            </div>

            <p class="settings-note">Browser storage usage is the authoritative overall figure. Category sizes are estimates or known byte counts and may not add exactly to the browser total.</p>
        `;

        renderRuntime();
        syncSelfTestControls();
        void renderWhisperAttempts();
        const selector = document.getElementById("settingsWhisperSelfTestModel");
        selector.onchange = () => void renderWhisperEligibility();
        storage.onclick = handleAction;
    }

    function renderRuntime() {
        const runtime = document.getElementById("settingsRuntime");
        if (!runtime) return;

        const info = getRuntimeInfo();
        const capabilities = getRuntimeCapabilities();
        const platformLabels = {
            ios: "iOS / iPadOS", android: "Android", windows: "Windows",
            macos: "macOS", linux: "Linux", unknown: "Unknown"
        };
        const deviceLabels = {
            phone: "Phone", tablet: "Tablet", desktop: "Desktop", unknown: "Unknown"
        };

        runtime.innerHTML = [
            row("Platform", platformLabels[runtimeIdentity.operatingSystem]),
            row("Browser", info.browser),
            row("Device", deviceLabels[runtimeIdentity.deviceType]),
            row(
                "Whisper",
                getWhisperRuntimeDescription()
            ),
            row(
                "WebGPU API",
                capabilities.webgpu ? "Present (execution not verified)" : "Not present"
            ),
            row(
                "Semantic search",
                "Transformers.js 3.7.2 · browser cache"
            )
        ].join("");
    }

    async function showSemantic() {
        const detail = document.getElementById("settingsSemanticDetail");
        if (!detail) return;
        detail.hidden = !detail.hidden;
        const toggle = storage.querySelector('[data-settings-action="toggle-semantic"]');
        if (toggle) toggle.textContent = detail.hidden ? "View" : "Hide";
        if (detail.hidden) return;
        const items = currentReport.indexedDB.semanticEntries.representations;
        detail.innerHTML = items.length ? items.map(item => `
            <div class="settings-item">
                <div class="settings-item-info">
                    <div class="settings-item-name">${item.name}</div>
                    <div class="settings-item-detail">${formatBytes(item.embeddingBytes)} · ${item.count.toLocaleString()} entries</div>
                </div>
                <div class="settings-item-actions">${button("Clear", "clear-semantic", false)}</div>
            </div>
        `).join("") + button("Clear All Semantic Indexes", "clear-all-semantic") : `<p class="settings-note">No semantic index entries.</p>`;
        detail.querySelectorAll('[data-settings-action="clear-semantic"]').forEach((b, i) => {
            b.dataset.index = String(i);
        });
    }

    async function checkModels() {
        const detail = document.getElementById("settingsWhisperModelsDetail");
        if (detail) {
            detail.hidden = false;
            detail.innerHTML = `<p class="settings-note">Checking Whisper models…</p>`;
        }

        modelAvailability = await checkAllModels();
        renderModelAvailability();
    }

    async function showWhisperModels() {
        const detail = document.getElementById("settingsWhisperModelsDetail");
        if (!detail) return;

        detail.hidden = !detail.hidden;
        const toggle = storage.querySelector('[data-settings-action="toggle-whisper-models"]');
        if (toggle) toggle.textContent = detail.hidden ? "View" : "Hide";
        if (detail.hidden) return;

        if (!modelAvailability) {
            await checkModels();
            return;
        }

        renderModelAvailability();
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatSelfTestDtype(dtype) {
        if (!dtype) return "default";
        if (typeof dtype === "string") return dtype;
        return Object.entries(dtype).map(([key, value]) => `${key}: ${value}`).join(" · ");
    }

    function formatSelfTestOption(configuration) {
        const dtype = configuration.configuration?.dtype;

        if (!dtype) return configuration.label;

        if (typeof dtype === "string") {
            return `${configuration.label} · ${dtype}`;
        }

        const encoder = dtype.encoder_model;
        const decoder = dtype.decoder_model_merged;

        if (encoder && decoder) {
            return `${configuration.label} · ${encoder}/${decoder}`;
        }

        return `${configuration.label} · ${Object.values(dtype).join("/")}`;
    }

    async function renderWhisperEligibility() {
        const target = document.getElementById("settingsWhisperEligibility");
        const id = document.getElementById("settingsWhisperSelfTestModel")?.value;
        if (!target || !id) return;
        const run = storage.querySelector('[data-settings-action="run-whisper-self-test"]');
        if (run) run.textContent = "Run test";
        try {
            const context = await getWhisperEligibilityContext(getWhisperConfigurationDefinitions().find(item => item.id === id));
            if (document.getElementById("settingsWhisperSelfTestModel")?.value !== id) return;
            const evidence = createWhisperEvidenceBridge().get(context);
            if (run) run.textContent = ["blocked", "suspended"].includes(evidence.status) ? "Retest" : "Run test";
            const status = { eligible: "Test-qualified", blocked: "Failed test—retest required", suspended: "Paused pending retest", "needs-validation": "Needs fresh validation", unverified: "Not yet validated" }[evidence.status];
            target.textContent = `${status}: ${evidence.reason}`;
        } catch (error) { target.textContent = `Eligibility unavailable: ${error.message}`; }
    }

    async function renderWhisperAttempts() {
        const target = document.getElementById("settingsWhisperAttemptHistory");
        if (!target) return;
        try {
            const records = await createWhisperEvidenceBridge().sync();
            await renderWhisperEligibility();
            window.dispatchEvent(new Event("memora-whisper-eligibility-changed"));
            target.replaceChildren();
            if (records.length) {
                const title = document.createElement("p");
                title.textContent = "Saved self-test attempts (local to this browser)";
                const clear = document.createElement("button");
                clear.type = "button";
                clear.textContent = "Clear saved test history";
                clear.dataset.whisperClearHistory = "";
                clear.onclick = async () => {
                    clear.disabled = true;
                    try {
                        await createWhisperEvidenceBridge().sync();
                        await createWhisperAttemptJournal().clearCompleted();
                        await renderWhisperAttempts();
                    } catch (error) {
                        const message = document.createElement("p");
                        message.textContent = `Could not clear test history: ${error.message}`;
                        target.append(message);
                        clear.disabled = false;
                    }
                };
                target.append(title, clear);
            }
            for (const record of records) {
                const details = document.createElement("details");
                const label = document.createElement("summary");
                const outcome = { passed: "Passed", failed: "Failed", cancelled: "Cancelled", "timed-out": "Timed out", running: "Running", interrupted: "Interrupted—no final result recorded" }[record.status] || record.status;
                const date = new Date(record.startedAt);
                const localDate = Number.isNaN(date.getTime()) ? record.startedAt : date.toLocaleString();
                const model = record.configuration.label ? formatSelfTestOption(record.configuration) : record.configuration.id;
                label.textContent = `${outcome} · ${model} · ${localDate}`;
                const description = document.createElement("p");
                const phases = { prepare: "audio preparation", decode: "audio decoding", release: "previous model release", load: "model loading", inference: "transcription", validation: "accuracy validation" };
                const result = record.result?.results?.[0];
                description.textContent = `Last saved stage: ${phases[record.phase] || record.phase}. `;
                if (record.status === "interrupted") description.textContent += "No final result was recorded. Cause unknown. No automatic retry.";
                else if (result?.error?.message || record.error?.message) description.textContent += result?.error?.message || record.error.message;
                else if (result?.status === "passed") description.textContent += `Load ${formatSeconds(result.loadMs)} · transcription ${formatSeconds(result.transcriptionMs)} · WER ${formatWhisperWer(result.wer)} (limit 15%).`;
                const technical = document.createElement("details");
                const technicalLabel = document.createElement("summary");
                technicalLabel.textContent = "Technical report";
                const body = document.createElement("pre");
                body.style.whiteSpace = "pre-wrap";
                body.style.overflowWrap = "anywhere";
                const refreshReport = () => {
                    body.textContent = JSON.stringify({ ...presentWhisperAttempt(record), runtimeDiagnostics: getRuntimeDiagnosticReport(record.pageId || null) }, null, 2);
                };
                refreshReport();
                technical.addEventListener("toggle", () => { if (technical.open) refreshReport(); });
                const copy = document.createElement("button");
                copy.type = "button";
                copy.textContent = "Copy report";
                copy.dataset.whisperCopyReport = "";
                const feedback = document.createElement("span");
                feedback.setAttribute("role", "status");
                copy.onclick = async () => {
                    try {
                        refreshReport();
                        await navigator.clipboard.writeText(body.textContent);
                        feedback.textContent = " Report copied.";
                    } catch {
                        technical.open = true;
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(body);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        feedback.textContent = " Copy unavailable. Select and copy the technical report below.";
                    }
                };
                const download = document.createElement("button");
                download.type = "button";
                download.textContent = "Download report";
                download.onclick = () => {
                    let url;
                    const link = document.createElement("a");
                    try {
                        refreshReport();
                        url = URL.createObjectURL(new Blob([body.textContent], { type: "application/json" }));
                        link.href = url;
                        const name = `whisper-test-${record.configuration.id}-${record.startedAt}-${record.id}`;
                        link.download = `${name.replace(/[^a-zA-Z0-9._-]/g, "-")}.json`;
                        document.body.append(link);
                        link.click();
                        feedback.textContent = " Report download requested.";
                    } catch (error) {
                        feedback.textContent = ` Download unavailable: ${error.message}. Use Copy report instead.`;
                    } finally {
                        link.remove();
                        // Give the browser time to consume the URL before releasing it.
                        if (url) setTimeout(() => URL.revokeObjectURL(url), 30000);
                    }
                };
                const actions = document.createElement("div");
                actions.className = "whisper-report-actions";
                actions.append(copy, download);
                technical.append(technicalLabel, body);
                details.classList.add("whisper-saved-report");
                details.append(label, description, actions, feedback, technical);
                target.append(details);
            }
        } catch (error) { target.textContent = `Attempt history unavailable: ${error.message}`; }
    }

    function renderSelfTestEvent(detail, event) {
        if (!detail) return;

        if (event.type === "attempt-saved") {
            if (event.persistence.status === "failed") {
                const warning = document.createElement("p");
                warning.textContent = `Result is not durable: ${event.persistence.message}`;
                detail.append(warning);
            }
            if (event.eligibilityPersistence?.status === "failed") {
                const warning = document.createElement("p");
                warning.textContent = `Eligibility was not saved: ${event.eligibilityPersistence.message}`;
                detail.append(warning);
            }
            void renderWhisperAttempts();
            return;
        }
        if (event.type === "run-start") {
            const environment = event.environment;
            detail.hidden = false;
            detail.innerHTML = `
                <div class="whisper-self-test-output">
                    <div id="settingsWhisperCurrentStage" class="settings-note" role="status">Preparing audio…</div>
                    <div id="settingsWhisperSelfTestResults"></div>
                    <details><summary>Test diagnostics and stage log</summary>
                    <div class="settings-note">Environment: ${escapeHtml(environment.operatingSystem)} · ${escapeHtml(environment.deviceType)} · requested backend: ${escapeHtml(environment.requestedBackend)} · WebGPU API: ${environment.webgpu ? "present" : "not present"} · actual backend: ${escapeHtml(environment.actualBackend)}</div>
                    <div class="settings-note">Running ${event.sequence.length} tests: ${event.sequence.map(escapeHtml).join(" → ")}</div>
                    <div id="settingsWhisperStageLog"></div>
                    </details>
                </div>`;
            return;
        }

        const results = detail.querySelector("#settingsWhisperSelfTestResults");
        if (!results) return;
        const log = detail.querySelector("#settingsWhisperStageLog");
        const currentStage = detail.querySelector("#settingsWhisperCurrentStage");

        if (event.type === "preparing") {
            log.insertAdjacentHTML("beforeend", `<div class="whisper-self-test-log">${escapeHtml(event.message)}</div>`);
        } else if (event.type === "audio-ready") {
            log.insertAdjacentHTML("beforeend", `<div class="whisper-self-test-log">Test audio ready · decode ${formatSeconds(event.decodeMs)}</div>`);
        } else if (event.type === "model-start") {
            const r = event.result;
            results.insertAdjacentHTML("beforeend", `
                <div class="whisper-self-test-result" id="whisper-self-test-${r.index}">
                    <div class="settings-item-name">${r.index}. ${escapeHtml(r.label)}</div>
                    <div class="settings-item-detail">${escapeHtml(r.repository)} · ${escapeHtml(formatSelfTestDtype(r.dtype))}</div>
                    <div class="whisper-self-test-status" hidden></div>
                </div>`);
        } else if (event.type === "load-complete") {
            const card = detail.querySelector(`#whisper-self-test-${event.index}`);
            if (card) log.insertAdjacentHTML("beforeend", `<div class="settings-note">Model loaded · ${formatSeconds(event.loadMs)}</div>`);
        } else if (event.type === "model-complete") {
            const r = event.result;
            const card = detail.querySelector(`#whisper-self-test-${r.index}`);
            if (!card) return;
            const status = r.status === "passed"
                ? `PASS · inference completed · accuracy passed · load ${formatSeconds(r.loadMs)} · transcription ${formatSeconds(r.transcriptionMs)} · WER ${formatWhisperWer(r.wer)} (limit 15%)`
                : `${r.status === "cancelled" ? "CANCELLED" : r.status === "timed-out" ? "TIMED OUT" : "FAIL"} · ${r.failedPhase || "unknown stage"} · ${r.error?.message || "Unknown error"}`;
            card.querySelector(".whisper-self-test-status").hidden = false;
            card.querySelector(".whisper-self-test-status").textContent = status;
            if (r.status !== "passed" && r.transcriptionStatus === "passed") {
                card.insertAdjacentHTML("beforeend", `<div class="settings-note">Inference completed; accuracy failed${Number.isFinite(r.wer) ? ` · WER ${formatWhisperWer(r.wer)} (limit 15%)` : ""}.</div>`);
            }
            card.insertAdjacentHTML("beforeend", `<details><summary>Timing and model diagnostics</summary><p class="settings-note">${escapeHtml(formatWhisperDiagnostics(r.diagnostics))}</p><p class="settings-note">Worker inference: ${Number.isFinite(r.workerInferenceMs) ? formatSeconds(r.workerInferenceMs) : "unavailable"} · audio: ${Number.isFinite(r.audioDurationMs) ? formatSeconds(r.audioDurationMs) : "unavailable"}</p></details>`);
            if (r.transcriptionStatus === "passed") {
                card.insertAdjacentHTML("beforeend", `<details><summary>Transcript</summary><pre>${escapeHtml(r.transcript)}</pre></details>`);
            } else if (r.error?.stack) {
                card.insertAdjacentHTML("beforeend", `<details><summary>Error details</summary><pre>${escapeHtml(r.error.stack)}</pre></details>`);
            }
            card.insertAdjacentHTML("beforeend", `<details><summary>Cleanup details</summary><div class="settings-note">Cleanup: ${escapeHtml(r.releaseStatus)}${r.releaseError ? ` · ${escapeHtml(r.releaseError)}` : ""}. Worker termination does not verify memory reclamation.</div></details>`);
        } else if (event.type === "run-complete") {
            const s = event.summary;
            currentStage.hidden = true;
            results.insertAdjacentHTML("beforeend", `<div class="whisper-self-test-summary"><strong>Complete:</strong> ${s.passed} passed · ${s.failed} failed · ${s.cancelled} cancelled · ${s.timedOut} timed out · total ${formatSeconds(s.elapsedMs)}</div>`);
        } else if (event.type === "run-error") {
            currentStage.hidden = true;
            results.insertAdjacentHTML("beforeend", `<div class="whisper-self-test-error">Self-test stopped: ${escapeHtml(event.error?.message || "Unknown error")}</div>`);
        } else if (event.type === "stage-start") {
            const labels = { prepare: "Preparing audio…", decode: "Decoding audio…", release: "Releasing the previous model…", load: "Loading model…", inference: "Transcribing…", validation: "Checking accuracy…" };
            currentStage.textContent = labels[event.phase] || event.phase;
            log.insertAdjacentHTML("beforeend", `<div class="settings-note">${escapeHtml(event.phase)} · limit ${event.timeoutMs / 1000} seconds</div>`);
        }
    }

    function syncSelfTestControls() {
        const busy = !!selfTestController;
        const run = storage.querySelector('[data-settings-action="run-whisper-self-test"]');
        const cancel = storage.querySelector('[data-settings-action="cancel-whisper-self-test"]');
        if (run) run.disabled = busy;
        if (cancel) {
            cancel.disabled = !busy;
            cancel.hidden = !busy;
        }
        const cancelRow = document.getElementById("settingsWhisperSelfTestCancel");
        if (cancelRow) cancelRow.hidden = !busy;
        for (const id of ["settingsWhisperSelfTestModel", "settingsWhisperLoadLimit", "settingsWhisperInferenceLimit"]) {
            const input = document.getElementById(id);
            if (input) input.disabled = busy;
        }
    }

    async function showWhisperSelfTest() {
        if (selfTestController) return;
        const detail = document.getElementById("settingsWhisperSelfTestDetail");
        if (!detail) return;

        detail.hidden = false;
        detail.innerHTML = `<p class="settings-note">Starting Whisper self-test…</p>`;

        selfTestController = new AbortController();
        syncSelfTestControls();

        try {
            const modelSelect = storage.querySelector("#settingsWhisperSelfTestModel");
            const seconds = id => {
                const value = Number(document.getElementById(id)?.value);
                if (!Number.isFinite(value) || value < 1 || value > 86400) throw new Error("Test limits must be between 1 and 86400 seconds.");
                return value * 1000;
            };
            // Re-read the exact selected context at click time. Button text may
            // still be refreshing, and another tab can have updated evidence.
            const bridge = createWhisperEvidenceBridge();
            await bridge.sync();
            const context = await getWhisperEligibilityContext(getWhisperConfigurationDefinitions().find(item => item.id === modelSelect?.value));
            const deliberateRetest = ["blocked", "suspended"].includes(bridge.get(context).status);
            await runWhisperSelfTest({
                deliberateRetest, modelId: modelSelect?.value,
                signal: selfTestController.signal,
                limits: { load: seconds("settingsWhisperLoadLimit"), inference: seconds("settingsWhisperInferenceLimit") },
                onEvent: event => renderSelfTestEvent(document.getElementById("settingsWhisperSelfTestDetail"), event)
            });
        } catch (error) {
            console.error("Whisper self-test error:", error);
            if (!detail.querySelector(".whisper-self-test-error")) {
                detail.innerHTML = `<div class="whisper-self-test-error">${escapeHtml(error?.message || String(error))}</div>`;
            }
        } finally {
            selfTestController = null;
            syncSelfTestControls();
        }
    }

    async function showOtherIndexedDB() {
        const detail = document.getElementById("settingsOtherIndexedDBDetail");
        if (!detail) return;

        detail.hidden = !detail.hidden;
        const toggle = storage.querySelector('[data-settings-action="toggle-other-indexeddb"]');
        if (toggle) toggle.textContent = detail.hidden ? "View" : "Hide";
        if (detail.hidden) return;

        const otherStores = currentReport?.indexedDB?.otherStores || [];
        const count = currentReport?.indexedDB?.otherCount || 0;

        if (!count) {
            detail.innerHTML = `<p class="settings-note">No other IndexedDB records are present.</p>`;
            return;
        }

        const descriptions = {
            semanticMetadata: "Semantic search metadata and index bookkeeping.",
            modelRegistry: "Whisper model definitions and validation records."
        };

        detail.innerHTML = `
            <p class="settings-note">${count.toLocaleString()} records across ${otherStores.length} other IndexedDB ${otherStores.length === 1 ? "store" : "stores"}. No data has been changed.</p>
            ${otherStores.map(store => `
                <div class="settings-row">
                    <span class="settings-label">
                        <span class="settings-item-name">${escapeHtml(store.name)}</span>
                        <span class="settings-note">${escapeHtml(descriptions[store.name] || "Other stored Memora data; purpose not classified here.")}</span>
                    </span>
                    <span class="settings-value">${formatBytes(store.bytes)} · ${store.count.toLocaleString()} entries</span>
                </div>
            `).join("")}
        `;
    }

    async function showOtherModels() {
        const detail = document.getElementById("settingsOtherModelsDetail");
        if (!detail) return;

        detail.hidden = !detail.hidden;
        const toggle = storage.querySelector('[data-settings-action="toggle-other-models"]');
        if (toggle) toggle.textContent = detail.hidden ? "View" : "Hide";
        if (detail.hidden) return;

        const otherModels = currentReport.modelCache.models.filter(
            model => !/^whisper-(tiny|base|small|medium|large-v3)$/i.test(model.name)
        );

        detail.innerHTML = otherModels.length
            ? otherModels.map((model, i) => `
                <div class="settings-item">
                    <div class="settings-item-info">
                        <div class="settings-item-name">${model.name}</div>
                        <div class="settings-item-detail">${model.detail}</div>
                    </div>
                    <div class="settings-item-actions">${button("Clear", "clear-other-model", false)}</div>
                </div>
            `).join("") + button("Clear All Other Cached Models", "clear-all-other-models")
            : `<p class="settings-note">No other cached model files were identified.</p>`;

        detail._otherModels = otherModels;
        detail.querySelectorAll('[data-settings-action="clear-other-model"]').forEach(
            (b, i) => b.dataset.index = String(i)
        );
    }

    function renderModelAvailability() {
        const detail = document.getElementById("settingsWhisperModelsDetail");
        if (!detail) return;

        if (!modelAvailability) {
            detail.innerHTML = `<p class="settings-note">Model availability has not been checked.</p>`;
            return;
        }

        const whisperCacheNames = {
            tiny: "whisper-tiny",
            base: "whisper-base",
            small: "whisper-small",
            medium: "whisper-medium",
            large: "whisper-large-v3"
        };

        const runtimeText = getWhisperRuntimeDescription();

        detail.innerHTML = modelAvailability.map(item => {
            const cachedName = whisperCacheNames[item.model];
            const cached = currentReport.modelCache.models.find(
                model => model.name.toLowerCase() === cachedName
            );

            const status = item.status || (item.available ? "Available" : "Unavailable");
            const cacheText = cached ? ` · ${cached.detail}` : "";
            const updatedText = item.lastModified
                ? `Updated ${new Date(item.lastModified).toLocaleDateString("en-GB")}`
                : "";

            const detailText = item.error
                || (item.missingFiles?.length
                    ? `Missing ${item.missingFiles.join(", ")}`
                    : updatedText || "Model files found");

            return `
                <div class="settings-item">
                    <div class="settings-item-info">
                        <div class="settings-item-name">${item.label}</div>
                        <div class="settings-item-detail">${status}${cacheText}</div>
                        <div class="settings-item-detail">${detailText}</div>
                        <div class="settings-item-detail">Runtime: ${runtimeText}</div>
                    </div>
                    <div class="settings-item-actions">
                        ${cached ? button("Clear", "clear-whisper-model", false) : ""}
                    </div>
                </div>
            `;
        }).join("") + button("Clear All Whisper Models", "clear-all-whisper-models");

        detail.querySelectorAll('[data-settings-action="clear-whisper-model"]').forEach((b, i) => {
            b.dataset.model = modelAvailability[i].model;
            b.dataset.cacheName = whisperCacheNames[modelAvailability[i].model];
        });

        const summary = document.getElementById("settingsWhisperModelsSummary");
        if (summary) {
                const whisperModels = currentReport.modelCache.models.filter(
                    item => /^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)
                );
                summary.textContent = `${formatBytes(whisperModels.reduce((sum, item) => sum + (item.bytes || 0), 0))} · ${whisperModels.length} models`;
            }
        const toggle = storage.querySelector('[data-settings-action="toggle-whisper-models"]');
        if (toggle) toggle.textContent = "Hide";

        // The renderer owns its error state; no rejected promise is left unhandled.
        void renderModelRegistry();
    }

    function getCurrentRegistryTarget() {
        return isIOS
            ? { platform: "ios", runtime: "wasm", label: "WASM" }
            : { platform: "desktop", runtime: "webgpu", label: "WebGPU" };
    }

    function formatRegistryRuntime(runtime) {
        if (runtime === "webgpu") return "WebGPU";
        if (runtime === "wasm") return "WASM";
        return runtime || "Unknown";
    }

    async function renderModelRegistry(mode = "current") {
        const detail = document.getElementById("settingsWhisperModelsDetail");
        if (!detail) return;

        let registryContainer = document.getElementById("settingsModelRegistryContainer");
        if (!registryContainer) {
            registryContainer = document.createElement("div");
            registryContainer.id = "settingsModelRegistryContainer";
            detail.appendChild(registryContainer);
        }
        registryContainer.innerHTML = `<strong>Model Registry</strong><p>Loading registry…</p>`;

        try {
            const registry = await getModelRegistry();
            if (!registryContainer.isConnected) return;
            const families = ["tiny", "base", "small", "medium", "large"];
            const currentTarget = getCurrentRegistryTarget();

            const matchesCurrentDevice = record =>
                record.platform === currentTarget.platform &&
                record.runtime === currentTarget.runtime;

            const filteredRegistry =
                mode === "current"
                    ? registry.filter(matchesCurrentDevice)
                    : registry;

            const registryHtml = families.map(family => {
                const records = filteredRegistry.filter(record => record.family === family);
                if (!records.length) return "";

                const label = records[0].label;

                return `
                    <div class="settings-item" style="display:block;">
                        <div class="settings-item-name">${label}</div>
                        ${records.map(record => {
                            const isCurrent =
                                mode === "all" &&
                                matchesCurrentDevice(record);

                            return `
                                <div class="settings-item-detail" style="margin-top:8px;${isCurrent ? "font-weight:700;" : ""}">
                                    ${formatRegistryRuntime(record.runtime)} · ${formatRegistryDtype(record.configuration?.dtype)} · ${formatValidation(record.validation)}
                                </div>
                                <div class="settings-item-detail" style="margin-bottom:8px;${isCurrent ? "font-weight:700;" : ""}">
                                    ${record.repository}
                                </div>
                            `;
                        }).join("")}
                    </div>
                `;
            }).join("");

            const knownCount = filteredRegistry.length;
            const targetLabel =
                mode === "current"
                    ? `This device · ${currentTarget.label}`
                    : "All devices";

            registryContainer.innerHTML = `
                <div class="settings-disclosure">
                    <span class="settings-disclosure-title">Model Registry</span>
                    <span>${knownCount} known configurations</span>
                </div>

                <div class="model-registry-mode" role="radiogroup" aria-label="Model registry scope">
                    <label class="model-registry-radio">
                        <input
                            type="radio"
                            name="model-registry-scope"
                            value="current"
                            data-settings-action="model-registry-mode"
                            ${mode === "current" ? "checked" : ""}
                        >
                        <span>This device</span>
                    </label>
                    <label class="model-registry-radio">
                        <input
                            type="radio"
                            name="model-registry-scope"
                            value="all"
                            data-settings-action="model-registry-mode"
                            ${mode === "all" ? "checked" : ""}
                        >
                        <span>All devices</span>
                    </label>
                </div>

                <div class="settings-note" style="margin-bottom:10px;">
                    Showing ${targetLabel}.
                </div>

                <div class="settings-detail" style="display:block;">
                    ${registryHtml}
                    <div class="action-row" style="margin-top:10px;">
                        ${button("Rebuild Registry", "rebuild-model-registry")}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error("Settings model registry error:", error);
            if (registryContainer.isConnected) {
                registryContainer.innerHTML = `<strong>Model Registry unavailable</strong><p>${escapeHtml(error?.message || String(error))}</p>`;
            }
        }
    }

    async function showTranscripts() {
        const detail = document.getElementById("settingsTranscriptsDetail");
        if (!detail) return;
        detail.hidden = !detail.hidden;
        const toggle = storage.querySelector('[data-settings-action="toggle-transcripts"]');
        if (toggle) toggle.textContent = detail.hidden ? "View" : "Hide";
        if (detail.hidden) return;
        const manager = await getStorageManager();
        const items = await manager.listCachedTranscripts();
        detail.innerHTML = items.length ? items.map((item, i) => `
            <div class="settings-item">
                <div class="settings-item-info"><div class="settings-item-name">${item.filename}</div><div class="settings-item-detail">${formatBytes(item.bytes)}${item.model ? ` · ${item.model}` : ""}</div></div>
                <div class="settings-item-actions">${button("Clear", "clear-transcript", false)}</div>
            </div>
        `).join("") + button("Clear All Cached Transcripts", "clear-all-transcripts") : `<p class="settings-note">No cached transcripts.</p>`;
        detail.querySelectorAll('[data-settings-action="clear-transcript"]').forEach((b, i) => b.dataset.index = String(i));
        if (items.length) detail.insertAdjacentHTML("beforeend", `<div class="action-row" style="margin-top:10px;">${button("Save Cached Transcripts", "save-transcripts")}</div>`);
        detail._items = items;
    }

    async function handleAction(event) {
        const target = event.target.closest("[data-settings-action]");
        if (!target) return;
        const action = target.dataset.settingsAction;
        try {
            if (action === "cancel-whisper-self-test") { selfTestController?.abort(); return; }
            if (action === "toggle-semantic") return await showSemantic();
            if (action === "toggle-whisper-models") return await showWhisperModels();
            if (action === "toggle-other-models") return await showOtherModels();
            if (action === "toggle-other-indexeddb") return await showOtherIndexedDB();
            if (action === "toggle-dom-diagnostics") {
                const detail = document.getElementById("settingsDomDiagnosticsDetail");
                if (!detail) return;
                detail.hidden = !detail.hidden;
                target.textContent = detail.hidden ? "View" : "Hide";
                return;
            }
            if (action === "capture-dom-diagnostics") {
                latestDomDiagnostics = collectDomDiagnostics();
                const report = document.getElementById("settingsDomDiagnosticsReport");
                if (report) {
                    const reportText = formatDomDiagnostics(latestDomDiagnostics);
                    report.innerHTML = `<div class="dom-diagnostics-summary">Snapshot captured ${escapeHtml(latestDomDiagnostics.timestamp)}</div><pre class="dom-diagnostics-report">${escapeHtml(reportText)}</pre>`;
                }
                const copyButton = storage.querySelector('[data-settings-action="copy-dom-diagnostics"]');
                if (copyButton) copyButton.disabled = false;
                return;
            }
            if (action === "copy-dom-diagnostics") {
                if (!latestDomDiagnostics) return;
                const reportText = formatDomDiagnostics(latestDomDiagnostics);
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(reportText);
                } else {
                    const temporary = document.createElement("textarea");
                    temporary.value = reportText;
                    temporary.setAttribute("readonly", "");
                    temporary.style.position = "fixed";
                    temporary.style.opacity = "0";
                    document.body.appendChild(temporary);
                    temporary.select();
                    const copied = document.execCommand("copy");
                    temporary.remove();
                    if (!copied) throw new Error("Clipboard access is unavailable in this browser.");
                }
                const copyButton = storage.querySelector('[data-settings-action="copy-dom-diagnostics"]');
                if (copyButton) {
                    copyButton.textContent = "Copied";
                    window.setTimeout(() => { if (copyButton.isConnected) copyButton.textContent = "Copy report"; }, 1500);
                }
                return;
            }
            if (action === "toggle-transcripts") return await showTranscripts();
            if (action === "run-whisper-self-test") return await showWhisperSelfTest();
            if (action === "clear-whisper-resources") {
                if (!confirm("Clear the active Whisper model and runtime resources? Cached Whisper model files will not be deleted. Do not use this while a transcription is in progress.")) return;
                await clearWhisperResources();
                status.textContent = "Whisper resources cleared.";
                return;
            }
            if (action === "model-registry-mode") {
                return await renderModelRegistry(
                    target.value === "all" ? "all" : "current"
                );
            }
            if (action === "rebuild-model-registry") {
                if (!confirm("Rebuild the Whisper Model Registry from Memora's built-in defaults? Validation results and discovered registry changes will be reset.")) return;
                await rebuildModelRegistry();
                await checkModels();
                return;
            }
            const manager = await getStorageManager();
            if (action === "clear-semantic") {
                const item = currentReport.indexedDB.semanticEntries.representations[Number(target.dataset.index)];
                if (!item || !confirm(`Clear ${item.name}? The index will be regenerated when needed.`)) return;
                await manager.clearSemanticRepresentation(item);
            } else if (action === "clear-all-semantic") {
                if (!confirm("Clear all semantic indexes? They will be regenerated when needed.")) return;
                await manager.clearAllSemanticEntries();
            } else if (action === "clear-other-model") {
                const items = document.getElementById("settingsOtherModelsDetail")?._otherModels || [];
                const item = items[Number(target.dataset.index)];
                if (!item || !confirm(`Clear cached ${item.name}? The model will be downloaded again when needed.`)) return;
                await manager.clearCachedModel(item.name);
            } else if (action === "clear-whisper-model") {
                const cacheName = target.dataset.cacheName;
                if (!cacheName || !confirm(`Clear cached ${cacheName}? The model will be downloaded again when needed.`)) return;
                await manager.clearCachedModel(cacheName);
            } else if (action === "clear-all-whisper-models") {
                const whisperModels = currentReport.modelCache.models.filter(
                    item => /^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)
                );
                if (!whisperModels.length) return;
                if (!confirm("Clear all cached Whisper models? They will be downloaded again when needed.")) return;
                for (const item of whisperModels) await manager.clearCachedModel(item.name);
            } else if (action === "clear-all-other-models") {
                const items = currentReport.modelCache.models.filter(item => !/^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name));
                if (!items.length) return;
                if (!confirm("Clear all other cached model files? Models will be downloaded again when needed.")) return;
                for (const item of items) await manager.clearCachedModel(item.name);
            } else if (action === "clear-transcript") {
                const items = document.getElementById("settingsTranscriptsDetail")?._items || [];
                const item = items[Number(target.dataset.index)];
                if (!item || !confirm(`Clear the cached transcript “${item.filename}”?`)) return;
                await manager.clearCachedTranscript(item.filename);
            } else if (action === "clear-all-transcripts") {
                if (!confirm("Clear all cached transcripts? This does not delete transcript files already saved to disk.")) return;
                await manager.clearAllCachedTranscripts();
            } else if (action === "save-transcripts") {
                await saveCachedTranscripts(manager);
                return;
            }
            await refresh();
        } catch (error) {
            console.error("Settings action error:", error);
            alert("Unable to complete that Settings operation.");
        }
    }

    async function saveCachedTranscripts(manager) {
        const storageModule = await getStorage();
        let folder = null;
        if (window.showDirectoryPicker) {
            folder = await storageModule.selectFolder();
        }
        const records = await manager.readCachedTranscripts();
        if (!records.length) return;
        if (folder) {
            if (folder.kind !== "file-input") {
                const existing = new Set((await storageModule.listTextFiles(folder)).map(file => file.name));
                let saved = 0;
                for (const record of records) {
                    if (!existing.has(record.filename)) {
                        await storageModule.writeTextFile(folder, record.filename, record.transcript);
                        saved++;
                    }
                }
                alert(`${saved} cached transcript${saved === 1 ? " was" : "s were"} saved. Existing files were left unchanged.`);
                return;
            }
        }
        const files = records.map(record => new File([record.transcript], record.filename, {type:"text/plain"}));
        if (!navigator.share || (navigator.canShare && !navigator.canShare({files}))) {
            alert("This browser cannot save cached transcripts through the Files app.");
            return;
        }
        await navigator.share({files});
    }

    async function refresh() {
        if (!status) return;
        if (selfTestController) {
            status.textContent = "A Whisper self-test is running. Finish or cancel it before refreshing storage information.";
            return;
        }

        renderRuntime();
        status.innerHTML = `<span class="transcription-spinner" aria-hidden="true"></span><span>Reading Memora storage information…</span>`;

        try {
            const manager = await getStorageManager();
            const report = await manager.getStorageReport();
            if (selfTestController) return;
            render(report);

            modelAvailability = await checkAllModels();

            const summary = document.getElementById("settingsWhisperModelsSummary");
            if (summary) {
                const whisperModels = currentReport.modelCache.models.filter(
                    item => /^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)
                );
                summary.textContent = `${formatBytes(whisperModels.reduce((sum, item) => sum + (item.bytes || 0), 0))} · ${whisperModels.length} models`;
            }

            status.textContent = `Updated ${new Intl.DateTimeFormat("en-GB", {hour:"2-digit", minute:"2-digit", second:"2-digit"}).format(new Date())}.`;
        } catch (error) {
            console.error("Settings storage error:", error);
            status.textContent = `Unable to read Memora storage information: ${error?.message || String(error)}`;
        }
    }

    refreshButton?.addEventListener("click", refresh);
    return { refresh };
}
