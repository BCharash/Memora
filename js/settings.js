// --------------------------------------------------
// Memora Settings UI
// --------------------------------------------------

export function initSettingsUI({ getStorageManager, getStorage }) {
    const status = document.getElementById("settingsStorageStatus");
    const storage = document.getElementById("settingsStorage");
    const refreshButton = document.getElementById("settingsRefreshButton");

    let currentReport = null;

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
        if (bytes < 1024) return `${Math.round(bytes)} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    function row(label, value) {
        return `<div class="settings-row"><span class="settings-label">${label}</span><span class="settings-value">${value}</span></div>`;
    }

    function button(label, action, disabled = false) {
        return `<button type="button" data-settings-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
    }

    function render(report) {
        currentReport = report;
        const semantic = report.indexedDB.semanticEntries;
        const models = report.modelCache;
        const transcripts = report.indexedDB.transcripts;

        storage.innerHTML = `
            ${row("Browser storage used", formatBytes(report.browser.usage))}
            ${row("Browser storage quota", formatBytes(report.browser.quota))}

            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Semantic Index</span>
                <span>${formatBytes(semantic.embeddingBytes)} · ${semantic.count.toLocaleString()} entries</span>
                ${button("View", "toggle-semantic")}
            </div>
            <div id="settingsSemanticDetail" class="settings-detail" hidden></div>

            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Cached Models</span>
                <span>${formatBytes(models.knownBytes)} · ${models.modelEntryCount.toLocaleString()} files</span>
                ${button("View", "toggle-models")}
            </div>
            <div id="settingsModelsDetail" class="settings-detail" hidden></div>

            <div class="settings-disclosure">
                <span class="settings-disclosure-title">Cached Transcripts</span>
                <span>${formatBytes(transcripts.bytes)} · ${transcripts.count.toLocaleString()} files</span>
                ${button("View", "toggle-transcripts")}
            </div>
            <div id="settingsTranscriptsDetail" class="settings-detail" hidden></div>

            ${row("Other Memora IndexedDB data", `${formatBytes(report.indexedDB.otherBytes)} · ${report.indexedDB.otherCount.toLocaleString()} entries`)}
            <p class="settings-note">Browser storage usage is the authoritative overall figure. Category sizes are estimates or known byte counts and may not add exactly to the browser total.</p>
        `;

        renderRuntime();
        storage.onclick = handleAction;
    }

    function renderRuntime() {
        const runtime = document.getElementById("settingsRuntime");
        if (!runtime) return;
        runtime.innerHTML = [
            row("Desktop Whisper", "Transformers.js 4.0.0 · WebGPU"),
            row("iPhone/iPad Whisper", "Transformers.js 3.7.2 · worker"),
            row("Semantic search", "Transformers.js 3.7.2 · browser cache")
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

    async function showModels() {
        const detail = document.getElementById("settingsModelsDetail");
        if (!detail) return;
        detail.hidden = !detail.hidden;
        const toggle = storage.querySelector('[data-settings-action="toggle-models"]');
        if (toggle) toggle.textContent = detail.hidden ? "View" : "Hide";
        if (detail.hidden) return;
        const models = currentReport.modelCache.models;
        detail.innerHTML = models.length ? models.map((model, i) => `
            <div class="settings-item">
                <div class="settings-item-info"><div class="settings-item-name">${model.name}</div><div class="settings-item-detail">${model.detail}</div></div>
                <div class="settings-item-actions">${button("Clear", "clear-model", false)}</div>
            </div>
        `).join("") + button("Clear All Cached Models", "clear-all-models") : `<p class="settings-note">No cached model files were identified.</p>`;
        detail.querySelectorAll('[data-settings-action="clear-model"]').forEach((b, i) => b.dataset.index = String(i));
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
        const target = event.target.closest("button[data-settings-action]");
        if (!target) return;
        const action = target.dataset.settingsAction;
        try {
            if (action === "toggle-semantic") return showSemantic();
            if (action === "toggle-models") return showModels();
            if (action === "toggle-transcripts") return showTranscripts();
            const manager = await getStorageManager();
            if (action === "clear-semantic") {
                const item = currentReport.indexedDB.semanticEntries.representations[Number(target.dataset.index)];
                if (!item || !confirm(`Clear ${item.name}? The index will be regenerated when needed.`)) return;
                await manager.clearSemanticRepresentation(item);
            } else if (action === "clear-all-semantic") {
                if (!confirm("Clear all semantic indexes? They will be regenerated when needed.")) return;
                await manager.clearAllSemanticEntries();
            } else if (action === "clear-model") {
                const item = currentReport.modelCache.models[Number(target.dataset.index)];
                if (!item || !confirm(`Clear cached ${item.name}? The model will be downloaded again when needed.`)) return;
                await manager.clearCachedModel(item.name);
            } else if (action === "clear-all-models") {
                if (!confirm("Clear all cached model files? Models will be downloaded again when needed.")) return;
                await manager.clearAllCachedModels();
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
            status.textContent = `Updated ${new Intl.DateTimeFormat("en-GB", {hour:"2-digit", minute:"2-digit", second:"2-digit"}).format(new Date())}.`;
        } catch (error) {
            console.error("Settings storage error:", error);
            status.textContent = "Unable to read Memora storage information.";
        }
    }

    refreshButton?.addEventListener("click", refresh);
    return { refresh };
}
