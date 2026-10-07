// --------------------------------------------------
// Memora Settings UI
// --------------------------------------------------

import {
    checkAllModels,
    getModelRegistry,
    rebuildModelRegistry
} from "./modelManager.js";
import { getRuntimeInfo } from "./runtime.js";
import { clearWhisperResources } from "./whisper.js";
import { getWhisperSelfTestOptions, runWhisperSelfTest } from "./whisperSelfTest.js";

export function initSettingsUI({ getStorageManager, getStorage }) {
    const status = document.getElementById("settingsStorageStatus");
    const storage = document.getElementById("settingsStorage");
    const refreshButton = document.getElementById("settingsRefreshButton");

    let currentReport = null;
    let modelAvailability = null;

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
            <div id="settingsWhisperSelfTestDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Whisper Resources</span>
                <span>Unload the active Whisper model and runtime resources</span>
                ${button("Clear resources", "clear-whisper-resources")}
            </div>

            <p class="settings-note">Browser storage usage is the authoritative overall figure. Category sizes are estimates or known byte counts and may not add exactly to the browser total.</p>
        `;

        renderRuntime();
        storage.onclick = handleAction;
    }

    function renderRuntime() {
        const runtime = document.getElementById("settingsRuntime");
        if (!runtime) return;

        const info = getRuntimeInfo();

        runtime.innerHTML = [
            row("Platform", info.platform),
            row("Browser", info.browser),
            row("Device", info.deviceType),
            row(
                "Whisper",
                `Transformers.js ${info.whisper.transformersVersion} · ${info.whisper.execution} · ${info.whisper.acceleration}`
            ),
            row(
                "WebGPU",
                info.webgpu ? "Available" : "Not available"
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

    function renderSelfTestEvent(detail, event) {
        if (!detail) return;

        if (event.type === "run-start") {
            detail.hidden = false;
            detail.innerHTML = `
                <div class="whisper-self-test-output">
                    <div class="settings-note">Running ${event.sequence.length} tests: ${event.sequence.map(escapeHtml).join(" → ")}</div>
                    <div id="settingsWhisperSelfTestResults"></div>
                </div>`;
            return;
        }

        const results = detail.querySelector("#settingsWhisperSelfTestResults");
        if (!results) return;

        if (event.type === "preparing") {
            results.insertAdjacentHTML("beforeend", `<div class="whisper-self-test-log">${escapeHtml(event.message)}</div>`);
        } else if (event.type === "audio-ready") {
            results.insertAdjacentHTML("beforeend", `<div class="whisper-self-test-log">Test audio ready · decode ${formatSeconds(event.decodeMs)}</div>`);
        } else if (event.type === "model-start") {
            const r = event.result;
            results.insertAdjacentHTML("beforeend", `
                <div class="whisper-self-test-result" id="whisper-self-test-${r.index}">
                    <div class="settings-item-name">${r.index}. ${escapeHtml(r.label)}</div>
                    <div class="settings-item-detail">${escapeHtml(r.repository)} · ${escapeHtml(formatSelfTestDtype(r.dtype))}</div>
                    <div class="whisper-self-test-status">Loading…</div>
                </div>`);
        } else if (event.type === "load-complete") {
            const card = detail.querySelector(`#whisper-self-test-${event.index}`);
            if (card) card.querySelector(".whisper-self-test-status").textContent = `Load PASS · ${formatSeconds(event.loadMs)} · transcribing…`;
        } else if (event.type === "model-complete") {
            const r = event.result;
            const card = detail.querySelector(`#whisper-self-test-${r.index}`);
            if (!card) return;
            const status = r.status === "passed"
                ? `PASS · load ${formatSeconds(r.loadMs)} · transcription ${formatSeconds(r.transcriptionMs)} · WER ${(r.wer * 100).toFixed(1)}%`
                : `FAIL · ${escapeHtml(r.error?.name || "Error")}: ${escapeHtml(r.error?.message || "Unknown error")}`;
            card.querySelector(".whisper-self-test-status").textContent = status;
            if (r.status === "passed") {
                card.insertAdjacentHTML("beforeend", `<details><summary>Transcript</summary><pre>${escapeHtml(r.transcript)}</pre></details>`);
            } else if (r.error?.stack) {
                card.insertAdjacentHTML("beforeend", `<details><summary>Error details</summary><pre>${escapeHtml(r.error.stack)}</pre></details>`);
            }
        } else if (event.type === "run-complete") {
            const s = event.summary;
            results.insertAdjacentHTML("beforeend", `<div class="whisper-self-test-summary"><strong>Complete:</strong> ${s.passed} passed · ${s.failed} failed · total ${formatSeconds(s.elapsedMs)}</div>`);
        } else if (event.type === "run-error") {
            results.insertAdjacentHTML("beforeend", `<div class="whisper-self-test-error">Self-test stopped: ${escapeHtml(event.error?.message || "Unknown error")}</div>`);
        }
    }

    async function showWhisperSelfTest() {
        const detail = document.getElementById("settingsWhisperSelfTestDetail");
        if (!detail) return;

        detail.hidden = false;
        detail.innerHTML = `<p class="settings-note">Starting Whisper self-test…</p>`;

        const runButton = storage.querySelector('[data-settings-action="run-whisper-self-test"]');
        if (runButton) runButton.disabled = true;

        try {
            const modelSelect = storage.querySelector("#settingsWhisperSelfTestModel");
            await runWhisperSelfTest({
                modelId: modelSelect?.value,
                onEvent: event => renderSelfTestEvent(detail, event)
            });
        } catch (error) {
            console.error("Whisper self-test error:", error);
            if (!detail.querySelector(".whisper-self-test-error")) {
                detail.innerHTML = `<div class="whisper-self-test-error">${escapeHtml(error?.message || String(error))}</div>`;
            }
        } finally {
            if (runButton) runButton.disabled = false;
        }
    }

    async function showOtherIndexedDB() {
        const detail = document.getElementById("settingsOtherIndexedDBDetail");
        if (!detail) return;

        detail.hidden = !detail.hidden;
        const toggle = storage.querySelector('[data-settings-action="toggle-other-indexeddb"]');
        if (toggle) toggle.textContent = detail.hidden ? "View" : "Hide";
        if (detail.hidden) return;

        const count = currentReport?.indexedDB?.otherCount || 0;
        detail.innerHTML = count
            ? `<p class="settings-note">${count.toLocaleString()} other IndexedDB ${count === 1 ? "entry" : "entries"} are present.</p>`
            : `<p class="settings-note">No other IndexedDB files.</p>`;
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

        const runtime = getRuntimeInfo();
        const runtimeText =
            `Transformers.js ${runtime.whisper.transformersVersion} · ` +
            `${runtime.whisper.execution} · ${runtime.whisper.acceleration}`;

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

        renderModelRegistry();
    }

    function getCurrentRegistryTarget() {
        const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

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

        const registry = await getModelRegistry();
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

        let registryContainer = document.getElementById("settingsModelRegistryContainer");

        if (!registryContainer) {
            detail.insertAdjacentHTML("beforeend", `
                <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:14px 0 10px;"></div>
                <div id="settingsModelRegistryContainer"></div>
            `);
            registryContainer = document.getElementById("settingsModelRegistryContainer");
        }

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
            if (action === "toggle-semantic") return await showSemantic();
            if (action === "toggle-whisper-models") return await showWhisperModels();
            if (action === "toggle-other-models") return await showOtherModels();
            if (action === "toggle-other-indexeddb") return await showOtherIndexedDB();
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

        status.innerHTML = `<span class="transcription-spinner" aria-hidden="true"></span><span>Reading Memora storage information…</span>`;

        try {
            const manager = await getStorageManager();
            const report = await manager.getStorageReport();
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
            status.textContent = "Unable to read Memora storage information.";
        }
    }

    refreshButton?.addEventListener("click", refresh);
    return { refresh };
}
