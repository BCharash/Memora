import { renderWhisperExecutionHistory, renderWhisperEligibilityReviews, createWhisperHistorySelection, renderWhisperExecutionReport } from "./whisperExecutionReports.js";
import { getRuntimeDiagnosticReport } from "./runtimeDiagnostics.js";
import { createWhisperEvidenceBridge, getWhisperEligibilityContext } from "./whisperEligibilityEvidence.js";
import { getWhisperConfigurationDefinitions } from "./whisperConfigurations.js";
import { presentWhisperAttempt, renderWhisperAttemptContext } from "./whisperAttemptReport.js";
import { createWhisperAttemptJournal, visibleWhisperAttempts } from "./whisperAttempts.js";
// --------------------------------------------------
// Memora Settings UI
// --------------------------------------------------

import {
    checkAllModels,
    getModelRegistry,
    initializeModelRegistry,
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

    void Promise.resolve().then(() => createWhisperEvidenceBridge().sync())
        .catch(error => console.warn("Transcription history recovery unavailable:", error));

    window.addEventListener("memora-whisper-review-retest", event => {
        const selector = document.getElementById("settingsWhisperSelfTestModel");
        if (!selector) return;
        if (![...selector.options].some(option => option.value === event.detail?.configurationId)) {
            status.textContent = "This exact configuration is not currently offered for reference testing. No other model was selected."; return;
        }
        selector.value = event.detail.configurationId; selector.dispatchEvent(new Event("change")); selector.scrollIntoView({ block: "center" });
    });

    let currentReport = null;
    let modelAvailability = null;
    let latestDomDiagnostics = null;
    let selfTestController = null;
    let activeSelfTestStatus = null;
    let registryRenderToken = 0;
    let registryMode = "current";
    let showReviewsOnRender = false;

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
        if (bytes < 1024) return `${Math.round(bytes)} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    function formatTestPlatform(environment = {}) {
        const os = environment.operatingSystem || environment.platform;
        return ({ ios: "iOS", macos: "macOS", windows: "Windows", linux: "Linux", android: "Android" })[os] || os || "Unknown platform";
    }

    function formatSeconds(ms) {
        return `${(ms / 1000).toFixed(1)} s`;
    }

    function row(label, value) {
        return `<div class="settings-row"><span class="settings-label">${label}</span><span class="settings-value">${value}</span></div>`;
    }

    function button(label, action, disabled = false) {
        const historyId = { "toggle-self-test-summary": "settingsWhisperSummarySection", "toggle-self-test-history": "settingsWhisperHistorySection", "toggle-execution-history": "settingsWhisperExecutionHistorySection", "toggle-model-reviews": "settingsWhisperEligibilityReviewsSection", "toggle-stability-observations": "settingsWhisperStabilitySection" }[action];
        return `<button type="button" data-settings-action="${action}" ${historyId ? `aria-expanded="false" aria-controls="${historyId}"` : ""} ${disabled ? "disabled" : ""}>${label}</button>`;
    }

    function formatRegistryDtype(dtype) {
        if (!dtype) return "Default";
        if (typeof dtype === "string") return dtype;
        return Object.entries(dtype)
            .map(([key, value]) => `${key.replace("_model", "")}: ${value}`)
            .join(" · ");
    }

    function formatEligibilityStatus(evidence) {
        return ({ eligible: "Test-qualified", blocked: "Failed test—retest required",
            suspended: "Paused pending retest", "needs-validation": "Needs fresh validation",
            unverified: "Not yet validated" })[evidence.status] || "Eligibility unavailable";
    }

    function sameDtype(left, right) {
        const normalize = value => value && typeof value === "object"
            ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value ?? null;
        return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
    }

    function render(report) {
        currentReport = report;
        const semantic = report.indexedDB.semanticEntries;
        const models = report.modelCache;
        const transcripts = report.indexedDB.transcripts;
        const registryStore=report.indexedDB.otherStores.find(item=>item.name==='modelRegistry')||{bytes:0,count:0};
        const audioMetadata=report.indexedDB.otherStores.find(item=>item.name==='audioFolderCatalogues')||{bytes:0,count:0};
        const transcriptMetadata=report.indexedDB.otherStores.find(item=>item.name==='transcriptCatalogues')||{bytes:0,count:0};
        const legacyMetadata=report.indexedDB.otherStores.find(item=>item.name==='semanticMetadata');

        storage.innerHTML = `
            ${row("Browser storage used", formatBytes(report.browser.usage))}
            ${row("Browser storage quota", formatBytes(report.browser.quota))}

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure settings-storage-category">
                <span class="settings-disclosure-title">Semantic Index</span>
                <span>${formatBytes(semantic.embeddingBytes)} · ${semantic.count.toLocaleString()} entries</span>
                ${button("View", "toggle-semantic")}
            </div>
            <div id="settingsSemanticDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure settings-storage-category">
                <span class="settings-disclosure-title">Other Cached Models</span>
                <span>${formatBytes(models.models.filter(item => !/^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)).reduce((sum, item) => sum + (item.bytes || 0), 0))} · ${models.models.filter(item => !/^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)).reduce((sum, item) => sum + (item.count || 0), 0).toLocaleString()} files</span>
                ${button("View", "toggle-other-models")}
            </div>
            <div id="settingsOtherModelsDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure settings-storage-category">
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
            <div class="settings-disclosure settings-storage-category">
                <span class="settings-disclosure-title">Cached Transcripts</span>
                <span>${formatBytes(transcripts.bytes)} · ${transcripts.count.toLocaleString()} files</span>
                ${button("View", "toggle-transcripts")}
            </div>
            <div id="settingsTranscriptsDetail" class="settings-detail" hidden></div>


            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure settings-storage-category">
                <span class="settings-disclosure-title">Audio Folder Metadata Cache</span>
                <span>${formatBytes(audioMetadata.bytes)} · ${audioMetadata.count.toLocaleString()} folders</span>
                ${button("View", "toggle-audio-metadata")}
            </div>
            <p class="settings-note">Recording identities and metadata rebuilt from audio when needed.</p>
            <div id="settingsAudioMetadataDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure settings-storage-category">
                <span class="settings-disclosure-title">Transcript Folder Metadata Cache</span>
                <span>${formatBytes(transcriptMetadata.bytes)} · ${transcriptMetadata.count.toLocaleString()} folders</span>
                ${button("View", "toggle-transcript-metadata")}
            </div>
            <p class="settings-note">Folder metadata rebuilt when transcripts are opened.</p>
            <div id="settingsTranscriptMetadataDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure settings-storage-category">
                <span class="settings-disclosure-title">Model Registry Cache</span>
                <span>${formatBytes(registryStore.bytes)} · ${registryStore.count.toLocaleString()} entries</span>
                ${button("View", "toggle-registry-cache")}
            </div>
            <p class="settings-note">Model definitions cached by Memora. Deleting them preserves downloaded models and test results.</p>
            <div id="settingsRegistryCacheDetail" class="settings-detail" hidden></div>
            ${legacyMetadata?.count?`<div class="settings-row"><span>Unused Semantic Metadata · ${formatBytes(legacyMetadata.bytes)} · ${legacyMetadata.count} legacy entries</span>${button("Clear", "clear-unused-semantic-metadata")}</div><p class="settings-note">Retained legacy data; current Search does not use this store.</p>`:''}


            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;"></div>
            <div class="settings-disclosure settings-storage-category">
                <span class="settings-disclosure-title">Whisper Models</span>
                <span id="settingsWhisperModelsSummary">${formatBytes(models.models.filter(item => /^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)).reduce((sum, item) => sum + (item.bytes || 0), 0))} · ${models.models.filter(item => /^whisper-(tiny|base|small|medium|large-v3)$/i.test(item.name)).length} models</span>
                ${button("View", "toggle-whisper-models")}
            </div>
            <div id="settingsWhisperModelsDetail" class="settings-detail" hidden></div>

            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;" aria-hidden="true"></div>
            <div id="settingsStorageRefreshGroup" style="padding:9px 0; border-bottom:1px solid var(--border);">
                <p class="settings-note">Browser storage usage is the authoritative overall figure. Category sizes are estimates or known byte counts and may not add exactly to the browser total.</p>
                <div id="settingsStorageRefreshSlot" class="action-row"></div>
            </div>
            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;" aria-hidden="true"></div>
            <div class="settings-disclosure">
                <h3 class="settings-major-heading">Whisper Self-Test</h3>
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
            <details id="settingsWhisperAdvanced" style="padding-bottom:9px; border-bottom:1px solid var(--border);">
                <summary>Advanced test settings</summary>
            <p class="settings-note">Self-test releases the idle production Whisper model. Default load limit: 600 seconds; inference: 180 seconds. These are provisional Tiny safety limits, not measured limits for larger models.</p>
            <p class="settings-note">Accuracy passes only with non-empty text and WER ≤15% against the test reference. Inference completion alone is not an accuracy pass.</p>
            <div class="whisper-self-test-controls">
                <label>Load limit (seconds) <input id="settingsWhisperLoadLimit" type="number" min="1" max="86400" value="600"></label>
                <label>Inference limit (seconds) <input id="settingsWhisperInferenceLimit" type="number" min="1" max="86400" value="180"></label>
            </div>

            </details>
            <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;" aria-hidden="true"></div>
            <div id="settingsWhisperHistories" style="display:grid; gap:8px;">
                <div class="settings-disclosure">
                    <h3 class="settings-major-heading">History and Reviews</h3>
                </div>
                <div class="settings-disclosure">
                    <span class="settings-disclosure-title">Self-test Summary</span>
                    ${button("View", "toggle-self-test-summary")}
                </div>
                <div id="settingsWhisperSummarySection" class="settings-detail" hidden>
                    <div id="settingsWhisperSummary" class="settings-note"></div>
                </div>
                <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;" aria-hidden="true"></div>
                <div class="settings-disclosure">
                    <span class="settings-disclosure-title">Self-test history</span>
                    ${button("View", "toggle-self-test-history")}
                </div>
                <div id="settingsWhisperHistorySection" class="settings-detail" hidden>
                    <p class="settings-note">Reference self-test results, accuracy, failures and interruptions.</p>
                    <div id="settingsWhisperAttemptHistory" class="settings-note"></div>
                </div>
                <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;" aria-hidden="true"></div>
                <div class="settings-disclosure">
                    <span class="settings-disclosure-title">Transcription history</span>
                    ${button("View", "toggle-execution-history")}
                </div>
                <div id="settingsWhisperExecutionHistorySection" class="settings-detail" hidden>
                    <p class="settings-note">Normal audio transcriptions, including timing, failures and interruptions.</p>
                    <div id="settingsWhisperExecutionHistory" class="settings-note"></div>
                </div>
                <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;" aria-hidden="true"></div>
                <div class="settings-disclosure">
                    <span class="settings-disclosure-title">Model eligibility reviews</span>
                    ${button("View", "toggle-model-reviews")}
                </div>
                <div id="settingsWhisperEligibilityReviewsSection" class="settings-detail" hidden>
                    <p class="settings-note">Decisions about model eligibility. Active reviews remain visible until resolved.</p>
                    <div id="settingsWhisperEligibilityReviews" class="settings-note"></div>
                </div>
                <div class="settings-section-divider" style="border-top:1px solid currentColor; opacity:.15; margin:12px 0;" aria-hidden="true"></div>
                <div class="settings-disclosure">
                    <span class="settings-disclosure-title">Session stability observations</span>
                    ${button("View", "toggle-stability-observations")}
                </div>
                <div id="settingsWhisperStabilitySection" class="settings-detail" hidden>
                    <p class="settings-note">Session behavior and additional observations; model eligibility is unchanged.</p>
                    <div id="settingsWhisperStabilityObservations" class="settings-note"></div>
                </div>
            </div>

        `;

        // Move the existing button so its original listener and busy state survive rerenders.
        if (refreshButton) document.getElementById("settingsStorageRefreshSlot").append(refreshButton);
        renderRuntime();
        syncSelfTestControls();
        void renderWhisperAttempts();
        if (showReviewsOnRender) {
            showReviewsOnRender = false;
            void setHistorySection("settingsWhisperEligibilityReviewsSection", true);
            document.getElementById("settingsWhisperEligibilityReviewsSection").scrollIntoView({ block: "start" });
        }
        const selector = document.getElementById("settingsWhisperSelfTestModel");
        selector.onchange = () => void renderWhisperEligibility();
        storage.onclick = handleAction;
    }

    async function setHistorySection(id, open) {
        const section = document.getElementById(id);
        if (!section) return;
        section.hidden = !open;
        const action = { settingsWhisperSummarySection: "toggle-self-test-summary", settingsWhisperHistorySection: "toggle-self-test-history", settingsWhisperExecutionHistorySection: "toggle-execution-history", settingsWhisperEligibilityReviewsSection: "toggle-model-reviews", settingsWhisperStabilitySection: "toggle-stability-observations" }[id];
        const toggle = storage.querySelector(`[data-settings-action="${action}"]`);
        if (toggle) { toggle.textContent = open ? "Hide" : "View"; toggle.setAttribute("aria-expanded", String(open)); toggle.setAttribute("aria-controls", id); }
        if (!open) return;
        if (["settingsWhisperHistorySection", "settingsWhisperSummarySection"].includes(id)) await renderWhisperAttempts();
        if (id === "settingsWhisperExecutionHistorySection") await renderWhisperExecutionHistory(document.getElementById("settingsWhisperExecutionHistory"));
        if (id === "settingsWhisperEligibilityReviewsSection") await renderWhisperEligibilityReviews(document.getElementById("settingsWhisperEligibilityReviews"), { kind: "incident" });
        if (id === "settingsWhisperStabilitySection") await renderWhisperEligibilityReviews(document.getElementById("settingsWhisperStabilityObservations"), { kind: "stability" });
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

    function selectionActions(detail, onDelete) {
        const firstRow=detail.querySelector('.settings-item');
        if(!detail.querySelector('.settings-item input[type="checkbox"]'))return;
        const actions=document.createElement('div');actions.className='action-row settings-selection-actions';
        const all=document.createElement('input'),remove=document.createElement('button');
        all.type='checkbox';
        const label=document.createElement('label');label.className='selection-action';label.append(all,document.createTextNode('Select all'));
        remove.textContent='Delete Selected';
        let busy=false;
        const available=()=>[...detail.querySelectorAll('.settings-item input[type="checkbox"]')].filter(check=>!check.disabled);
        function update(){
            const checks=available(),count=checks.filter(check=>check.checked).length;
            all.disabled=busy||!checks.length;
            all.checked=checks.length>0&&count===checks.length;
            all.indeterminate=count>0&&count<checks.length;
            remove.disabled=busy||!count;
            const save=detail.querySelector('[data-settings-action="save-transcripts"]');
            if(save)save.disabled=busy||!count;
        }
        all.onchange=()=>{const checked=all.checked;for(const check of available()){check.checked=checked;check.dispatchEvent(new Event('change',{bubbles:true}));}update();};
        remove.onclick=async()=>{if(busy)return;const checks=available().filter(check=>check.checked);if(!checks.length)return;busy=true;update();try{await onDelete(checks);}catch(error){status.textContent=error.message;}finally{busy=false;update();}};
        detail.onchange=update;actions.append(label,remove);detail.insertBefore(actions,firstRow);update();
    }

    function selectableRows(detail, onDelete){
        for(const row of detail.querySelectorAll('.settings-item')){
            if(!row.hasAttribute('data-selection-index')&&!row.hasAttribute('data-selection-cache'))continue;
            const check=document.createElement('input');check.type='checkbox';check.dataset.index=row.dataset.selectionIndex;check.dataset.cacheName=row.dataset.selectionCache||'';
            check.setAttribute('aria-label',`Select ${row.querySelector('.settings-item-name')?.textContent||'item'}`);row.prepend(check);
        }
        selectionActions(detail,onDelete);
    }

    async function showSemantic() {
        const detail = document.getElementById("settingsSemanticDetail");
        if (!detail) return;
        detail.hidden = !detail.hidden;
        const toggle = storage.querySelector('[data-settings-action="toggle-semantic"]');
        if (toggle) toggle.textContent = detail.hidden ? "View" : "Hide";
        if (detail.hidden) return;
        const items = currentReport.indexedDB.semanticEntries.representations;
        detail.innerHTML = items.length ? items.map((item,i) => `
            <div class="settings-item" data-selection-index="${i}">
                <div class="settings-item-info">
                    <div class="settings-item-name">${item.name}</div>
                    <div class="settings-item-detail">${formatBytes(item.embeddingBytes)} · ${item.count.toLocaleString()} entries</div>
                </div>
            </div>
        `).join("") : `<p class="settings-note">No semantic index entries.</p>`;
        selectableRows(detail,async checks=>{if(!confirm(`Delete ${checks.length} selected semantic indexes? They will be regenerated when needed.`))return;const manager=await getStorageManager();for(const check of checks)await manager.clearSemanticRepresentation(items[Number(check.dataset.index)]);await refresh();await showSemantic();});
    }

    async function checkModels() {
        const detail = document.getElementById("settingsWhisperModelsDetail");
        if (detail) {
            detail.dataset.selfTestPlatform = formatTestPlatform(environment);
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
        if (selfTestController) {
            target.textContent = activeSelfTestStatus;
            return;
        }
        const run = storage.querySelector('[data-settings-action="run-whisper-self-test"]');
        if (run) run.textContent = "Run test";
        try {
            const context = await getWhisperEligibilityContext(getWhisperConfigurationDefinitions().find(item => item.id === id));
            if (document.getElementById("settingsWhisperSelfTestModel")?.value !== id) return;
            if (selfTestController) { target.textContent = activeSelfTestStatus; return; }
            const evidence = createWhisperEvidenceBridge().get(context);
            if (run) run.textContent = ["blocked", "suspended"].includes(evidence.status) ? "Retest" : "Run test";
            const status = formatEligibilityStatus(evidence);
            target.textContent = `${status}: ${evidence.reason}`;
        } catch (error) { target.textContent = selfTestController ? activeSelfTestStatus : `Eligibility unavailable: ${error.message}`; }
    }

    function renderWhisperSummary(records) {
        const target = document.getElementById("settingsWhisperSummary");
        if (!target) return;
        // One summary row per model size, even when legacy IDs or variants differ.
        // Full configuration-specific evidence remains in history.
        const definitions = getWhisperConfigurationDefinitions();
        const familyOrder = ["tiny", "base", "small", "medium", "large"];
        const familyOf = record => {
            const configuration = record.configuration || {};
            const definition = definitions.find(item => item.id === (configuration.id || record.eligibilityContext?.configurationId));
            const declaredFamily = definition?.family || configuration.family || record.declaredDefinition?.family;
            if (familyOrder.includes(declaredFamily?.toLowerCase())) return declaredFamily.toLowerCase();
            const identity = [configuration.label, configuration.id, record.eligibilityContext?.configurationId, configuration.repository].filter(Boolean).join(" ").toLowerCase();
            return identity.match(/(?:^|[^a-z])(tiny|base|small|medium|large)(?:$|[^a-z])/)?.[1] || null;
        };
        const seen = new Set();
        const passes = [...records].filter(record => record.status === "passed")
            .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || "") || (b.id || "").localeCompare(a.id || ""))
            .filter(record => {
                const configuration = record.configuration || {};
                const key = familyOf(record) || configuration.id || record.eligibilityContext?.configurationId ||
                    configuration.label?.trim().toLowerCase() || "unknown";
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        const rank = record => {
            const index = familyOrder.indexOf(familyOf(record));
            return index < 0 ? familyOrder.length : index;
        };
        passes.sort((a, b) => rank(a) - rank(b) ||
            (a.configuration?.label || a.configuration?.id || "").localeCompare(b.configuration?.label || b.configuration?.id || ""));
        if (!passes.length) {
            target.textContent = "No passed self-tests in saved history. Run a self-test above to add a result.";
            return;
        }
        const rows = passes.map(record => {
            const configuration = record.configuration || {};
            const id = configuration.id || record.eligibilityContext?.configurationId;
            const result = record.result?.results?.[0] || record.observation || {};
            const rtf = Number.isFinite(result.transcriptionMs) && result.transcriptionMs >= 0 &&
                Number.isFinite(result.audioDurationMs) && result.audioDurationMs > 0
                ? (result.transcriptionMs / result.audioDurationMs).toFixed(3) : "Unavailable";
            const load = Number.isFinite(result.loadMs) && result.loadMs >= 0
                ? (result.loadMs / 1000).toFixed(2) : "Unavailable";
            return [configuration.label ? formatSelfTestOption(configuration) : id || "Unknown model", rtf, load];
        });
        // Use text nodes for all persisted labels and reuse the existing phone table containment.
        const scroll = document.createElement("div");
        scroll.className = "whisper-test-timeline-scroll";
        scroll.tabIndex = 0; scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", "Passed self-test summary");
        const table = document.createElement("table");
        const caption = document.createElement("caption"); caption.textContent = "Latest saved passes"; table.append(caption);
        const head = document.createElement("thead"), header = document.createElement("tr");
        for (const label of ["Model", "RTF", "Load (s)"]) {
            const th = document.createElement("th"); th.scope = "col"; th.textContent = label; header.append(th);
        }
        head.append(header); table.append(head);
        const body = document.createElement("tbody");
        for (const values of rows) {
            const tr = document.createElement("tr");
            for (const value of values) { const td = document.createElement("td"); td.textContent = value; tr.append(td); }
            body.append(tr);
        }
        table.append(body); scroll.append(table);
        const note = document.createElement("p");
        note.textContent = "RTF = transcription time ÷ audio duration; lower is faster. 0.25 means 15 seconds per minute of audio, excluding loading. Short reference-test results; longer recordings may differ.";
        if (document.getElementById("settingsWhisperSummary") === target) target.replaceChildren(scroll, note);
    }

    async function renderWhisperAttempts() {
        const target = document.getElementById("settingsWhisperAttemptHistory");
        if (!target) return;
        try {
            const bridge = createWhisperEvidenceBridge();
            const records = await bridge.sync();
            renderWhisperSummary(records);
            const drafts = new Map([...target.querySelectorAll('[data-self-test-observation]')].map(input=>[input.dataset.selfTestObservation,input.value]));
            await renderWhisperEligibility();
            if (document.getElementById("settingsWhisperEligibilityReviewsSection")?.hidden === false) void renderWhisperEligibilityReviews(document.getElementById("settingsWhisperEligibilityReviews"), { kind: "incident" });
            if (document.getElementById("settingsWhisperStabilitySection")?.hidden === false) void renderWhisperEligibilityReviews(document.getElementById("settingsWhisperStabilityObservations"), { kind: "stability" });
            window.dispatchEvent(new Event("memora-whisper-eligibility-changed"));
            target.replaceChildren();
            const title = document.createElement("p");
            title.textContent = "Local to this browser. Shows the newest pass for each configuration and device platform, including older reports, plus all failures and other outcomes. Superseded passes remain stored as evidence. Clearing selected reports does not change eligibility.";
            target.append(title);
            if (!records.length) { target.append("No saved self-tests."); return; }
            const selection = createWhisperHistorySelection(target, { label: "Clear selected test history", onClear: async ids => {
                await createWhisperEvidenceBridge().sync();
                await createWhisperAttemptJournal().clearCompleted(ids);
                await renderWhisperAttempts();
            } });
            selection.clear.dataset.whisperClearHistory = "";
            for (const record of visibleWhisperAttempts(records)) {
                const details = document.createElement("article");
                const label = document.createElement("label"); label.className = "whisper-history-heading";
                const outcome = { passed: "Passed", failed: "Failed", cancelled: "Cancelled", "timed-out": "Timed out", running: "Running", interrupted: "Interrupted—no final result recorded" }[record.status] || record.status;
                const date = new Date(record.startedAt);
                const localDate = Number.isNaN(date.getTime()) ? record.startedAt : date.toLocaleString();
                const model = record.configuration.label ? formatSelfTestOption(record.configuration) : record.configuration.id;
                const environment = record.environment || record.eligibilityContext?.environment || {};
                const heading = `${outcome} · Platform: ${formatTestPlatform(environment)} · ${model} · ${localDate}`;
                label.append(selection.add(record, heading, record.status !== "running"), document.createTextNode(heading));
                const description = document.createElement("p");
                const phases = { prepare: "audio preparation", decode: "audio decoding", release: "previous model release", load: "model loading", inference: "transcription", validation: "accuracy validation" };
                const result = record.result?.results?.[0];
                description.textContent = `Last saved stage: ${phases[record.phase] || record.phase}. `;
                if (record.status === "interrupted") description.textContent += "No final result was recorded. Cause unknown. No automatic retry.";
                else if (result?.error?.message || record.error?.message) description.textContent += result?.error?.message || record.error.message;
                else if (result?.status === "passed") description.textContent += `Load ${formatSeconds(result.loadMs)} · transcription ${formatSeconds(result.transcriptionMs)} · WER ${formatWhisperWer(result.wer)} (limit 15%).`;
                details.classList.add("whisper-saved-report");
                details.append(label, description);
                renderWhisperAttemptContext(details, record, {records, draft:drafts.get(record.id) || "",
                    runtimeDiagnostics:()=>getRuntimeDiagnosticReport(record.pageId || null),
                    getObservations:()=>bridge.listProductionReviews().filter(row=>row.sourceKind==="self-test" && row.attemptId===record.id),
                    saveObservation:async(id,note,diagnostics)=>{
                        await bridge.addSelfTestStabilityNote(id,note,diagnostics);
                        if(document.getElementById("settingsWhisperStabilitySection")?.hidden===false)
                            await renderWhisperEligibilityReviews(document.getElementById("settingsWhisperStabilityObservations"),{kind:"stability"});
                    }});
                renderWhisperExecutionReport(details,record.id,{kind:"self-test",includeStability:false,bridge,
                    journal:{list:()=>[{...presentWhisperAttempt(record,records),runtimeDiagnostics:getRuntimeDiagnosticReport(record.pageId || null)}]}});
                target.append(details);
            }
        } catch (error) {
            target.textContent = `Attempt history unavailable: ${error.message}`;
            const summary = document.getElementById("settingsWhisperSummary");
            if (summary) summary.textContent = `Self-test summary unavailable: ${error.message}`;
        }
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
            if (document.getElementById("settingsModelRegistryContainer") &&
                !document.getElementById("settingsWhisperModelsDetail")?.hidden) void renderModelRegistry(registryMode);
            return;
        }
        if (event.type === "run-start") {
            const environment = event.environment;
            detail.dataset.selfTestPlatform = formatTestPlatform(environment);
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

        if (event.type === "cleanup-start") {
            currentStage.textContent = "Releasing model resources…";
        } else if (event.type === "preparing") {
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
            card.querySelector(".whisper-self-test-status").textContent = status.replace(" · ", ` · Platform: ${detail.dataset.selfTestPlatform || "Unknown platform"} · `);
            if (r.status !== "passed" && r.transcriptionStatus === "passed") {
                card.insertAdjacentHTML("beforeend", `<div class="settings-note">Inference completed; accuracy failed${Number.isFinite(r.wer) ? ` · WER ${formatWhisperWer(r.wer)} (limit 15%)` : ""}.</div>`);
            }
            card.insertAdjacentHTML("beforeend", `<details><summary>Timing and model diagnostics</summary><p class="settings-note">${escapeHtml(formatWhisperDiagnostics(r.diagnostics))}</p><p class="settings-note">Worker inference: ${Number.isFinite(r.workerInferenceMs) ? formatSeconds(r.workerInferenceMs) : "unavailable"} · audio: ${Number.isFinite(r.audioDurationMs) ? formatSeconds(r.audioDurationMs) : "unavailable"}</p></details>`);
            if (r.transcriptionStatus === "passed") {
                card.insertAdjacentHTML("beforeend", `<details><summary>Transcript</summary><pre>${escapeHtml(r.transcript)}</pre></details>`);
            } else if (r.error?.stack) {
                card.insertAdjacentHTML("beforeend", `<details><summary>Error details</summary><pre>${escapeHtml(r.error.stack)}</pre></details>`);
            }
            card.insertAdjacentHTML("beforeend", `<details><summary>Cleanup details</summary><div class="settings-note">Model disposal API: ${escapeHtml(r.disposal?.status || "not-requested")}${r.disposal?.error ? ` · ${escapeHtml(r.disposal.error)}` : ""}. Cleanup: ${escapeHtml(r.releaseStatus)}${r.releaseError ? ` · ${escapeHtml(r.releaseError)}` : ""}. Disposal acknowledgement and worker termination do not verify memory reclamation.</div></details>`);
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
        activeSelfTestStatus = "Test in progress. Checking saved eligibility…";
        void renderWhisperEligibility();
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
            const evidence = bridge.get(context);
            const deliberateRetest = ["blocked", "suspended"].includes(evidence.status);
            activeSelfTestStatus = evidence.status === "eligible"
                ? "Test in progress. Existing transcription eligibility remains in effect until a new result is saved."
                : `${deliberateRetest ? "Retest" : "Test"} in progress. Transcription remains unavailable until this test passes.`;
            void renderWhisperEligibility();
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
            activeSelfTestStatus = null;
            syncSelfTestControls();
            await renderWhisperEligibility();
        }
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
                <div class="settings-item" data-selection-index="${i}">
                    <div class="settings-item-info">
                        <div class="settings-item-name">${escapeHtml(model.label||model.name)}</div>
                        <div class="settings-item-detail">${escapeHtml(model.detail)}</div>
                        ${(model.files||[]).map(file=>`<div class="settings-item-detail settings-cache-path">${escapeHtml(file)}</div>`).join("")}
                    </div>
                </div>
            `).join("")
            : `<p class="settings-note">No other cached model files were identified.</p>`;

        detail._otherModels = otherModels;
        selectableRows(detail,async checks=>{if(!confirm(`Delete ${checks.length} selected cached models? They will download again when needed.`))return;const manager=await getStorageManager();for(const check of checks)await manager.clearCachedModel(otherModels[Number(check.dataset.index)].name);await refresh();await showOtherModels();});
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
                <div class="settings-item" ${cached?`data-selection-cache="${cachedName}"`:''}>
                    <div class="settings-item-info">
                        <div class="settings-item-name">${item.label}</div>
                        <div class="settings-item-detail">${status}${cacheText}</div>
                        <div class="settings-item-detail">${detailText}</div>
                        <div class="settings-item-detail">Runtime: ${runtimeText}</div>
                    </div>
                </div>
            `;
        }).join("");

        selectableRows(detail,async checks=>{if(!confirm(`Delete ${checks.length} selected cached Whisper models? They will download again when needed.`))return;const manager=await getStorageManager();for(const check of checks)await manager.clearCachedModel(check.dataset.cacheName);await refresh();await showWhisperModels();});

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
        const token = ++registryRenderToken;
        registryMode = mode;
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
            const registry = await getModelRegistry({initialize:false});
            if (!registryContainer.isConnected || token !== registryRenderToken) return;
            const families = ["tiny", "base", "small", "medium", "large"];
            const currentTarget = getCurrentRegistryTarget();

            const matchesCurrentDevice = record =>
                record.platform === currentTarget.platform &&
                record.runtime === currentTarget.runtime;

            const filteredRegistry =
                mode === "current"
                    ? registry.filter(matchesCurrentDevice)
                    : registry;

            const definitions = getWhisperConfigurationDefinitions();
            const statuses = new Map(await Promise.all(filteredRegistry.map(async record => {
                const definition = definitions.find(item => item.id === record.id);
                let text;
                if (!definition || definition.repository !== record.repository || definition.family !== record.family ||
                    definition.platform !== record.platform || definition.runtime !== record.runtime ||
                    !sameDtype(definition.loader.dtype, record.configuration?.dtype)) {
                    text = "Custom/older configuration—current eligibility not mapped.";
                } else if (!definition.operatingSystems.includes(runtimeIdentity.operatingSystem)) {
                    text = "Not evaluated on this device.";
                } else {
                    try {
                        const evidence = createWhisperEvidenceBridge().get(await getWhisperEligibilityContext(definition));
                        text = `${formatEligibilityStatus(evidence)}: ${evidence.reason}`;
                        if (evidence.status === "eligible") text += definition.production.familyDefault
                            ? " Available for transcription." : " Not the transcription default.";
                    } catch (error) { text = `Eligibility unavailable: ${error.message}`; }
                }
                return [record.id, text];
            })));
            if (!registryContainer.isConnected || token !== registryRenderToken) return;

            const registryHtml = families.map(family => {
                const records = filteredRegistry.filter(record => record.family === family);
                if (!records.length) return "";

                const label = records[0].label;

                return `
                    <div class="settings-item" style="display:block;">
                        <div class="settings-item-name">${escapeHtml(label)}</div>
                        ${records.map(record => {
                            const isCurrent =
                                mode === "all" &&
                                matchesCurrentDevice(record);

                            return `
                                <div class="settings-item-detail" style="margin-top:8px;${isCurrent ? "font-weight:700;" : ""}">
                                    ${escapeHtml(formatRegistryRuntime(record.runtime))} · ${escapeHtml(formatRegistryDtype(record.configuration?.dtype))}
                                </div>
                                <div class="settings-item-detail" style="margin-bottom:8px;${isCurrent ? "font-weight:700;" : ""}">
                                    ${escapeHtml(record.repository)}
                                </div>
                                <div class="settings-item-detail">${escapeHtml(statuses.get(record.id))}</div>
                                <details class="settings-item-detail" style="margin-bottom:12px;">
                                    <summary>Historical registry record</summary>
                                    <p>Older registry validation: ${escapeHtml(record.validation?.status || "not-tested")}. This record does not determine current transcription eligibility.</p>
                                </details>
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
                    Showing ${targetLabel}. Current eligibility determines transcription choices. File availability and historical registry records are separate from test qualification.
                </div>

                <div class="settings-detail" style="display:block;">
                    ${registryHtml}
                    <details style="margin-top:10px;">
                        <summary>Advanced maintenance</summary>
                        <p class="settings-note">Stops the active Whisper worker. Downloaded model files and test qualification are preserved. The model will load again when needed.</p>
                        <div class="action-row">
                            ${button("Unload active Whisper model", "clear-whisper-resources")}
                        </div>
                        <p class="settings-note">Troubleshooting only. Restores built-in model definitions and removes historical registry validation/customizations. Does not refresh test results or repair the database schema. Current eligibility, saved test reports and downloaded models are preserved.</p>
                        <div class="action-row">
                            ${button("Reset stored model definitions", "rebuild-model-registry")}
                        </div>
                    </details>
                </div>
            `;
        } catch (error) {
            console.error("Settings model registry error:", error);
            if (registryContainer.isConnected && token === registryRenderToken) {
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
            <div class="settings-item" data-selection-index="${i}">
                <div class="settings-item-info"><div class="settings-item-name">${escapeHtml(item.filename)}</div><div class="settings-item-detail">${formatBytes(item.bytes)}${item.model ? ` · ${escapeHtml(item.model)}` : ""}${item.archiveUuid?` · ${escapeHtml(item.originalAudioFolderName||"Archive")} · ${escapeHtml(item.archiveUuid)}`:" · Legacy cached copy"}</div></div>
            </div>
        `).join("") : `<p class="settings-note">No cached transcripts.</p>`;
        if (items.length) detail.insertAdjacentHTML("beforeend", `<div class="action-row" style="margin-top:10px;">${button("Save Selected Transcripts", "save-transcripts")}</div>`);
        detail._items = items;
        selectableRows(detail,async checks=>{if(!confirm(`Delete ${checks.length} selected cached transcripts? Files saved to disk are preserved.`))return;for(const check of checks)await manager.clearCachedTranscript(items[Number(check.dataset.index)].id);await refresh();await showTranscripts();});
    }

    async function showAudioMetadata(){
        const detail=document.getElementById('settingsAudioMetadataDetail'),toggle=storage.querySelector('[data-settings-action="toggle-audio-metadata"]');
        detail.hidden=!detail.hidden;toggle.textContent=detail.hidden?'View':'Hide';if(detail.hidden)return;
        const cache=await import('./audioFolderCache.js'),rows=(await cache.listAudioFolderCache()).sort((a,b)=>a.folderName.localeCompare(b.folderName));
        detail.innerHTML='<p class="settings-note">Deleting metadata preserves audio, transcripts and Search indexes.</p>';
        if(!rows.length){detail.insertAdjacentHTML('beforeend','<p class="settings-note">No cached audio folders.</p>');return;}
        for(const [index,row]of rows.entries())detail.insertAdjacentHTML('beforeend',`<div class="settings-item" data-selection-index="${index}"><div class="settings-item-info"><div class="settings-item-name">${escapeHtml(row.folderName)}</div><div class="settings-item-detail">${row.records.length} recordings · ${escapeHtml(new Date(row.updatedAt).toLocaleString())}</div><details class="settings-cache-files"><summary>Recordings</summary><ul>${row.records.map(record=>`<li>${escapeHtml(record.audioRelativePath)} · ${escapeHtml(record.recordingId)}</li>`).join('')}</ul></details></div></div>`);
        selectableRows(detail,async checks=>{if(!confirm(`Delete metadata for ${checks.length} selected audio folders? Audio and transcript files are preserved.`))return;await cache.removeAudioFolderCache(checks.map(check=>rows[Number(check.dataset.index)]));await refresh({initializeRegistry:false});await showAudioMetadata();});
    }

    async function showTranscriptMetadata(){
        const detail=document.getElementById('settingsTranscriptMetadataDetail'),toggle=storage.querySelector('[data-settings-action="toggle-transcript-metadata"]');
        if(!detail)return;
        detail.hidden=!detail.hidden;toggle.textContent=detail.hidden?'View':'Hide';toggle.setAttribute('aria-expanded',String(!detail.hidden));
        if(detail.hidden)return;
        const catalogue=await import('./transcriptCatalogue.js');
        const rows=(await catalogue.listTranscriptCatalogueCache()).sort((a,b)=>catalogue.transcriptMetadataParent(a).localeCompare(catalogue.transcriptMetadataParent(b))||a.folderName.localeCompare(b.folderName)||b.updatedAt-a.updatedAt);
        detail.innerHTML='<p class="settings-note">Deleting metadata leaves transcript files, cached text and Search indexes unchanged.</p>';
        if(!rows.length){detail.insertAdjacentHTML('beforeend','<p class="settings-note">No cached transcript folders.</p>');return;}
        let parent=null;
        for(const [index,row]of rows.entries()){
            const label=catalogue.transcriptMetadataParent(row);
            if(label!==parent){detail.insertAdjacentHTML('beforeend',`<h4 class="settings-cache-parent">${escapeHtml(label)}</h4>`);parent=label;}
            const archives=[...new Set(row.records.map(record=>record.archiveUuid).filter(Boolean))];
            const time=new Date(row.updatedAt),updated=Number.isFinite(time.getTime())?time.toLocaleString():'Update time unavailable';
            detail.insertAdjacentHTML('beforeend',`<div class="settings-item" data-selection-index="${index}"><div class="settings-item-info">
                <div class="settings-item-name">${escapeHtml(row.folderName)}</div>
                <div class="settings-item-detail">${row.records.length} transcripts · ${formatBytes(new Blob([JSON.stringify(row)]).size)} · ${escapeHtml(updated)}</div>
                ${archives.length?`<div class="settings-item-detail">Archive: ${archives.map(escapeHtml).join(', ')}</div>`:''}
                ${row.records.length?`<details class="settings-cache-files"><summary>Transcript Files</summary><ul>${row.records.map(record=>`<li>${escapeHtml(record.filename)}${record.whisperModel?' · '+escapeHtml(record.whisperModel):''}${record.operation?' · '+escapeHtml(record.operation):''}</li>`).join('')}</ul></details>`:''}
            </div></div>`);
        }
        selectableRows(detail,async checks=>{
            if(!confirm(`Delete metadata for ${checks.length} selected transcript folders? Transcript files and cached text are preserved.`))return;
            await catalogue.removeTranscriptCatalogueCache(checks.map(check=>rows[Number(check.dataset.index)]));
            await refresh({initializeRegistry:false});await showTranscriptMetadata();
        });
        detail.insertBefore(detail.querySelector('.settings-selection-actions'),detail.querySelector('.settings-cache-parent'));
    }

    async function handleAction(event) {
        const target = event.target.closest("[data-settings-action]");
        if (!target) return;
        const action = target.dataset.settingsAction;
        try {
            if (action === "cancel-whisper-self-test") { selfTestController?.abort(); return; }
            const historySection = { "toggle-self-test-summary": "settingsWhisperSummarySection", "toggle-self-test-history": "settingsWhisperHistorySection", "toggle-execution-history": "settingsWhisperExecutionHistorySection", "toggle-model-reviews": "settingsWhisperEligibilityReviewsSection", "toggle-stability-observations": "settingsWhisperStabilitySection" }[action];
            if (historySection) return await setHistorySection(historySection, document.getElementById(historySection).hidden);
            if (action === "toggle-semantic") return await showSemantic();
            if (action === "toggle-whisper-models") return await showWhisperModels();
            if (action === "toggle-other-models") return await showOtherModels();
            if(action==='toggle-audio-metadata')return await showAudioMetadata();
            if(action==='toggle-transcript-metadata')return await showTranscriptMetadata();
            if(action==='clear-unused-semantic-metadata'){
                if(!confirm('Clear unused legacy semantic metadata? Current embeddings and transcript files are preserved.'))return;
                const manager=await getStorageManager();await manager.clearUnusedSemanticMetadata();await refresh({initializeRegistry:false});return;
            }
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
                if (!confirm("Unload the active Whisper model? Downloaded model files and test qualification will be preserved. The model will load again when needed. Do not use this while a transcription is in progress.")) return;
                await clearWhisperResources();
                status.textContent = "Active Whisper model unloaded. Downloaded model files and test qualification are preserved.";
                return;
            }
            if (action === "model-registry-mode") {
                return await renderModelRegistry(
                    target.value === "all" ? "all" : "current"
                );
            }
            if (action === "rebuild-model-registry") {
                if (!confirm("Reset stored model definitions to Memora's built-in defaults? Historical registry validation/customizations will be removed. Current eligibility, saved test reports and downloaded models will be preserved. This does not refresh test results or repair the database schema.")) return;
                await rebuildModelRegistry();
                await refresh({initializeRegistry:false});await showWhisperModels();
                return;
            }
            const manager = await getStorageManager();
            if (action === "save-transcripts") {
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
        const detail = document.getElementById("settingsTranscriptsDetail");
        const selected = new Set([...detail.querySelectorAll('.settings-item input[type="checkbox"]:checked')]
            .map(check => detail._items[Number(check.dataset.index)].id));
        if (!selected.size) return;
        const storageModule = await getStorage();
        let folder = null;
        if (window.showDirectoryPicker) {
            folder = await storageModule.selectFolder();
        }
        const records = (await manager.readCachedTranscripts()).filter(record => selected.has(record.id));
        if (!records.length) return;
        const used=new Set();
        const exports=records.map(record=>{
            let filename=record.filename,number=2;
            while(used.has(filename.toLowerCase()))filename=record.filename.replace(/\.txt$/i,'')+` - cached ${number++}.txt`;
            used.add(filename.toLowerCase());return {...record,exportFilename:filename};
        });
        if (folder) {
            if (folder.kind !== "file-input") {
                const existing = new Set((await storageModule.listTextFiles(folder)).map(file => file.name.normalize('NFC').toLowerCase()));
                let saved = 0;
                for (const record of exports) {
                    if (!existing.has(record.exportFilename.normalize('NFC').toLowerCase())) {
                        await storageModule.writeTextFile(folder, record.exportFilename, record.transcript);
                        existing.add(record.exportFilename.normalize('NFC').toLowerCase());
                        saved++;
                    }
                }
                alert(`${saved} cached transcript${saved === 1 ? " was" : "s were"} saved. Existing files were left unchanged.`);
                return;
            }
        }
        const files=exports.map(record=>new File([record.transcript],record.exportFilename,{type:'text/plain'}));
        if (!navigator.share || (navigator.canShare && !navigator.canShare({files}))) {
            alert("This browser cannot save cached transcripts through the Files app.");
            return;
        }
        await navigator.share({files});
    }

    async function refresh({initializeRegistry=true}={}) {
        if (!status) return;
        if (selfTestController) {
            status.textContent = "A Whisper self-test is running. Finish or cancel it before refreshing storage information.";
            return;
        }

        renderRuntime();
        status.innerHTML = `<span class="transcription-spinner" aria-hidden="true"></span><span>Reading Memora storage information…</span>`;

        try {
            let registryWarning=null;
            if(initializeRegistry){try{await initializeModelRegistry();}catch(error){registryWarning=error;}}
            const manager = await getStorageManager();
            await (await import('./transcriptCatalogue.js')).listTranscriptCatalogueCache();
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

            status.textContent = `Updated ${new Intl.DateTimeFormat("en-GB", {hour:"2-digit", minute:"2-digit", second:"2-digit"}).format(new Date())}.`+
                (registryWarning?` Model Registry Cache update failed: ${registryWarning.message}. Storage deletion controls remain available.`:'');
        } catch (error) {
            console.error("Settings storage error:", error);
            status.textContent = `Unable to read Memora storage information: ${error?.message || String(error)}`;
        }
    }

    refreshButton?.addEventListener("click",()=>refresh());
    function showProductionReviews() {
        showReviewsOnRender = true;
        const section = document.getElementById("settingsWhisperEligibilityReviewsSection");
        if (section) { showReviewsOnRender = false; void setHistorySection(section.id, true); section.scrollIntoView({ block: "start" }); }
    }
    return { refresh, showProductionReviews };
}
