import { displayFiles, getSelectedFiles, showEmptyMessage } from "./transcriptionUI.js";
import { initSearchUI } from "./searchUI.js";

let storageModulePromise = import("./storage.js");
let storageManagerModulePromise = import("./storageManager.js");

const sourceButton = document.getElementById("sourceButton");
const destinationButton = document.getElementById("destinationButton");
const sourceDestinationButton =
    document.getElementById("sourceDestinationButton");
const transcriptionDestinationButton =
    document.getElementById("transcriptionDestinationButton");

const transcriptionDestinationSection =
    document.getElementById("transcriptionDestinationSection");
const desktopTranscriptionDestinationOptions =
    document.getElementById("desktopTranscriptionDestinationOptions");
const iphoneTranscriptionDestinationOptions =
    document.getElementById("iphoneTranscriptionDestinationOptions");
const iphoneExportButton =
    document.getElementById("iphoneExportButton");
const iphoneExportStatus =
    document.getElementById("iphoneExportStatus");
const fileInput = document.getElementById("fileInput");
const modelSelect = document.getElementById("modelSelect");
const languageSelect = document.getElementById("languageSelect");
const operationSelect = document.getElementById("operationSelect");
const paragraphingCheckbox = document.getElementById("paragraphingCheckbox");
const transcribeButton = document.getElementById("transcribeButton");

const transcriptionStatus =
    document.getElementById("transcriptionStatus");
const transcriptionOutput =
    document.getElementById("transcriptionOutput");

const transcriptionTab =
    document.getElementById("transcriptionTab");
const searchTab =
    document.getElementById("searchTab");

const combineTab =
    document.getElementById("combineTab");

const transcriptionPanel =
    document.getElementById("transcriptionPanel");

const combinePanel =
    document.getElementById("combinePanel");

const searchPanel =
    document.getElementById("searchPanel");

const settingsPanel =
    document.getElementById("settingsPanel");

const settingsButton =
    document.getElementById("settingsButton");

const appTabs =
    document.querySelector(".app-tabs");

const settingsStorageStatus =
    document.getElementById("settingsStorageStatus");

const settingsStorage =
    document.getElementById("settingsStorage");

const settingsRuntime =
    document.getElementById("settingsRuntime");

const settingsRefreshButton =
    document.getElementById("settingsRefreshButton");

const appIcon =
    document.getElementById("appIcon");

const textSourceButton =
    document.getElementById("textSourceButton");

const transcripts =
    document.getElementById("transcripts");
const transcriptCollapseBottom =
    document.getElementById("transcriptCollapseBottom");

const combineSourceDestinationButton =
    document.getElementById("combineSourceDestinationButton");

const combineFolderDestinationButton =
    document.getElementById("combineFolderDestinationButton");

const combineDestinationButton =
    document.getElementById("combineDestinationButton");

const combineDestinationSection =
    document.getElementById("combineDestinationSection");

const combineTextButton =
    document.getElementById("combineTextButton");

const combineHTMLButton =
    document.getElementById("combineHTMLButton");

const combineDOCXButton =
    document.getElementById("combineDOCXButton");
const iphoneCombineDestinationOptions =
    document.getElementById("iphoneCombineDestinationOptions");
const iphoneCombineFormatSelect =
    document.getElementById("iphoneCombineFormatSelect");
const iphoneCombineExportButton =
    document.getElementById("iphoneCombineExportButton");
const iphoneCombineExportStatus =
    document.getElementById("iphoneCombineExportStatus");

const combineStatus =
    document.getElementById("combineStatus");

const combineTitleInput =
    document.getElementById("combineTitleInput");

const combineParagraphingCheckbox =
    document.getElementById("combineParagraphingCheckbox");

let sourceHandle = null;
let destinationHandle = null;

let pendingIPhoneExports = [];

let textSourceHandle = null;
let combineDestinationHandle = null;
let selectedTranscriptFiles = [];
let combineSortOrder = "date-desc";
let pendingIPhoneCombineExport = null;




function setActiveDestinationButton(button) {

    document
        .querySelectorAll(".destination-options button")
        .forEach(otherButton => {
            otherButton.classList.remove("active");
        });

    if (button) {
        button.classList.add("active");
    }
}


function setActiveCombineDestinationButton(button) {

    document
        .querySelectorAll("#combinePanel .destination-options button")
        .forEach(otherButton => {
            otherButton.classList.remove("active");
        });

    if (button) {
        button.classList.add("active");
    }
}


async function updateCombineFolderButton() {

    if (!textSourceHandle) {
        combineFolderDestinationButton.textContent =
            'Create "combined" Folder';
        return;
    }

    try {

        const storage =
            await getStorageModule();

        await storage.getSubfolder(
            textSourceHandle,
            "combined",
            false
        );

        combineFolderDestinationButton.textContent =
            'Use "combined" Folder';

    } catch (error) {

        if (error.name === "NotFoundError") {
            combineFolderDestinationButton.textContent =
                'Create "combined" Folder';
        } else {
            console.error(
                "Unable to check combined folder:",
                error
            );
        }
    }
}


async function updateTranscriptionFolderButton() {

    if (!sourceHandle) {
        transcriptionDestinationButton.textContent =
            'Create "transcription" Folder';
        return;
    }

    try {

        const storage =
            await getStorageModule();

        const transcriptionFolder =
            await storage.getSubfolder(
                sourceHandle,
                "transcription",
                false
            );

        transcriptionDestinationButton.textContent =
            'Use "transcription" Folder';

        destinationHandle =
            transcriptionFolder;

        setActiveDestinationButton(
            transcriptionDestinationButton
        );

    } catch (error) {

        if (error.name === "NotFoundError") {

            transcriptionDestinationButton.textContent =
                'Create "transcription" Folder';

        } else {

            console.error(
                "Unable to check transcription folder:",
                error
            );
        }
    }
}


// --------------------------------------------------
// Transcription module
// --------------------------------------------------

let transcriptionModule = null;

async function getTranscriptionModule() {
    if (!transcriptionModule) {
        transcriptionModule =
            await import("./transcription.js");
    }
    return transcriptionModule;
}


// --------------------------------------------------
// Storage module
// --------------------------------------------------

async function getStorageModule() {
    return await storageModulePromise;
}

async function getStorageManagerModule() {
    return await storageManagerModulePromise;
}


// --------------------------------------------------
// Combine module
// --------------------------------------------------

let combineModule = null;

async function getCombineModule() {

    if (!combineModule) {
        combineModule =
            await import("./combine.js");
    }

    return combineModule;
}


// --------------------------------------------------
// HTML module
// --------------------------------------------------

let htmlModule = null;

async function getHTMLModule() {

    if (!htmlModule) {
        htmlModule =
            await import("./html.js");
    }

    return htmlModule;
}


// --------------------------------------------------
// DOCX module
// --------------------------------------------------

let docxModule = null;

async function getDOCXModule() {

    if (!docxModule) {
        docxModule =
            await import("./docx.js");
    }

    return docxModule;
}


// --------------------------------------------------

let whisperModule = null;

async function getWhisperModule() {

    if (!whisperModule) {
        whisperModule =
            await import("./whisper.js");
    }

    return whisperModule;
}


// --------------------------------------------------
// Paragraphing module
// --------------------------------------------------

let paragraphingModule = null;

async function getParagraphingModule() {

    if (!paragraphingModule) {
        paragraphingModule =
            await import("./paragraphing.js");
    }

    return paragraphingModule;
}


// --------------------------------------------------
// Search module
// --------------------------------------------------

let searchModule = null;

async function getSearchModule() {

    if (!searchModule) {
        searchModule =
            await import("./search.js");
    }

    return searchModule;
}

// --------------------------------------------------
// Source / destination
// --------------------------------------------------

function updateDestinationVisibility(isFileInput) {
    if (transcriptionDestinationSection) {
        transcriptionDestinationSection.hidden = false;
    }

    if (desktopTranscriptionDestinationOptions) {
        desktopTranscriptionDestinationOptions.hidden = false;
        desktopTranscriptionDestinationOptions.style.display =
            isFileInput ? "none" : "flex";
    }

    if (iphoneTranscriptionDestinationOptions) {
        iphoneTranscriptionDestinationOptions.hidden = false;
        iphoneTranscriptionDestinationOptions.style.display =
            isFileInput ? "flex" : "none";
    }

    if (combineDestinationSection) {
        combineDestinationSection.hidden = isFileInput;
    }

    // The three desktop Combine output buttons are direct-write actions.
    // On iPhone they are replaced by the single format-specific share button.
    if (combineTextButton) {
        combineTextButton.hidden = isFileInput;
    }

    if (combineDOCXButton) {
        combineDOCXButton.hidden = isFileInput;
    }

    if (combineHTMLButton) {
        combineHTMLButton.hidden = isFileInput;
    }

    if (iphoneCombineDestinationOptions) {
        iphoneCombineDestinationOptions.hidden = !isFileInput;
        iphoneCombineDestinationOptions.style.display =
            isFileInput ? "block" : "none";
    }
}

if (transcriptionDestinationSection) {
    transcriptionDestinationSection.hidden = true;
}

// Keep Combine output controls hidden until a text source is selected.
// The source selection will reveal the appropriate desktop or iPhone controls.
if (combineTextButton) {
    combineTextButton.hidden = true;
}

if (combineDOCXButton) {
    combineDOCXButton.hidden = true;
}

if (combineHTMLButton) {
    combineHTMLButton.hidden = true;
}

if (iphoneCombineDestinationOptions) {
    iphoneCombineDestinationOptions.hidden = true;
    iphoneCombineDestinationOptions.style.display = "none";
}

sourceButton.addEventListener("click", async () => {

    try {

        const storage =
            await getStorageModule();

        sourceHandle =
            await storage.selectFolder();

        destinationHandle = null;

        resetIPhoneExportState();
        updateDestinationVisibility(sourceHandle.kind === "file-input");

        setActiveDestinationButton(null);

        const files =
            await storage.listAudioFiles(
                sourceHandle
            );

        if (files.length === 0) {

            showEmptyMessage();

            sourceButton.textContent =
                `Source: ${sourceHandle.name}`;

            if (sourceHandle.kind !== "file-input") {
                await updateTranscriptionFolderButton();
            }

            alert(
                "No audio recordings were found in this folder."
            );

            return;
        }

        sourceButton.textContent =
            `Source: ${sourceHandle.name}`;

        if (sourceHandle.kind !== "file-input") {
            await updateTranscriptionFolderButton();
        }

        await displayFiles(
            files,
            readAudioMetadata,
            formatRecordingDate,
            formatDuration
        );

    } catch (error) {

        if (error.name !== "AbortError") {

            console.error(
                "Source folder error:",
                error
            );

            alert(
                "Unable to read the source folder."
            );
        }
    }
});



if (iphoneExportButton) {
    iphoneExportButton.addEventListener("click", exportIPhoneTranscripts);
}


sourceDestinationButton.addEventListener("click", () => {

    if (!sourceHandle) {
        alert("Please select a source folder first.");
        return;
    }

    if (sourceHandle.kind === "file-input") {
        alert("An iPhone destination is not implemented yet.");
        return;
    }

    destinationHandle = sourceHandle;

    setActiveDestinationButton(
        sourceDestinationButton
    );
});


transcriptionDestinationButton.addEventListener("click", async () => {

    if (!sourceHandle) {
        alert("Please select a source folder first.");
        return;
    }

    if (sourceHandle.kind === "file-input") {
        alert("An iPhone destination is not implemented yet.");
        return;
    }

    try {

        const storage =
            await getStorageModule();

        destinationHandle =
            await storage.getSubfolder(
                sourceHandle,
                "transcription",
                true
            );

        transcriptionDestinationButton.textContent =
            'Use "transcription" Folder';


    } catch (error) {

        console.error(
            "Transcription folder error:",
            error
        );

        alert(
            "Unable to access the transcription folder."
        );
    }
});


destinationButton.addEventListener("click", async () => {

    try {

        const storage =
            await getStorageModule();

        destinationHandle =
            await storage.selectFolder();

        destinationButton.textContent =
            `Use "${destinationHandle.name}"`;

        setActiveDestinationButton(
            destinationButton
        );

    } catch (error) {

        if (error.name !== "AbortError") {

            console.error(
                "Destination error:",
                error
            );

            alert(
                "Unable to select the destination folder."
            );
        }
    }
});


// --------------------------------------------------
// --------------------------------------------------
// Transcription
// --------------------------------------------------

// Keep the operation control consistent with the selected language.
function updateOperationAvailability() {
    if (!languageSelect || !operationSelect) {
        return;
    }

    const language = languageSelect.value;

    if (language === "") {
        operationSelect.value = "translate";
        operationSelect.disabled = true;
    } else if (language === "en") {
        operationSelect.value = "transcribe";
        operationSelect.disabled = true;
    } else {
        operationSelect.disabled = false;
    }

    if (transcribeButton) {
        transcribeButton.textContent =
            operationSelect.value === "translate"
                ? "Translate Selected"
                : "Transcribe Selected";
    }
}

if (languageSelect) {
    languageSelect.addEventListener(
        "change",
        updateOperationAvailability
    );
}

// Establish the correct initial state when Memora loads.
updateOperationAvailability();

// Changing the model invalidates any completed-but-not-yet-saved
// iPhone transcript batch. A new model must start a new save batch.
if (modelSelect) {
    modelSelect.addEventListener("change", () => {
        resetIPhoneExportState();
    });
}

// Changing paragraphing changes the transcript that will be produced.
// A new iPhone save batch must therefore start from zero.
if (paragraphingCheckbox) {
    paragraphingCheckbox.addEventListener("change", () => {
        resetIPhoneExportState();
    });
}

// Keep the button text synchronized if the user changes
// the operation for a language where it is enabled.
if (operationSelect && transcribeButton) {
    operationSelect.addEventListener("change", () => {
        transcribeButton.textContent =
            operationSelect.value === "translate"
                ? "Translate Selected"
                : "Transcribe Selected";
    });
}

transcribeButton.addEventListener(
    "click",
    async () => {

        const filesToTranscribe =
            getSelectedFiles();

        if (filesToTranscribe.length === 0) {

            alert(
                "Please select at least one recording."
            );

            return;
        }

        const isIPhoneSource =
            sourceHandle?.kind === "file-input";

        if (!isIPhoneSource && !destinationHandle) {

            alert(
                "Please select a destination folder first."
            );

            return;
        }

        // Pressing Transcribe Selected defines a new iPhone export batch
        // using the recordings selected at that moment.
        if (isIPhoneSource) {
            resetIPhoneExportState();
        }

        try {

            transcribeButton.disabled = true;

            transcriptionOutput.textContent = "";

            const model =
                modelSelect.value;

            const language =
                languageSelect?.value || "auto";

            const operation =
                operationSelect?.value || "transcribe";

            const transcriptionFolder =
                isIPhoneSource
                    ? null
                    : destinationHandle;

            for (
                let i = 0;
                i < filesToTranscribe.length;
                i++
            ) {

                const file =
                    filesToTranscribe[i];

                const transcriptionAudioPath =
                    isIPhoneSource
                        ? file.name
                        : await getAudioRelativePath(
                            sourceHandle,
                            transcriptionFolder,
                            file.name
                        );

                setTranscriptionBusy(
                    `Transcribing ${i + 1} of ` +
                    `${filesToTranscribe.length}: ` +
                    `${file.name}`
                );

                const transcription =
                    await getTranscriptionModule();

                const record =
                    await transcription.transcribeRecording(
                        file,
                        model,
                        language,
                        operation,
                        setTranscriptionBusy
                    );

                let processedTranscript =
                    record.transcript;

                if (paragraphingCheckbox?.checked) {
                    setTranscriptionBusy(
                        `Creating paragraphs for ${i + 1} of ` +
                        `${filesToTranscribe.length}: ` +
                        `${file.name}`
                    );

                    const paragraphing =
                        await getParagraphingModule();

                    processedTranscript =
                        await paragraphing.paragraphize(
                            record.transcript,
                            setTranscriptionBusy
                        );
                }

                const transcript =
                    buildTranscript(
                        record.file,
                        record.metadata,
                        processedTranscript,
                        record.model,
                        language,
                        operation,
                        transcriptionAudioPath
                    );

                const savedFilename =
                    await saveTranscript(
                        transcriptionFolder,
                        record.file,
                        record.metadata,
                        transcript,
                        record.model,
                        operation
                    );

                if (isIPhoneSource) {
                    pendingIPhoneExports.push(
                        new File(
                            [transcript],
                            savedFilename,
                            { type: "text/plain" }
                        )
                    );
                    updateIPhoneExportButton();
                }

                appendTranscription(
                    record.file,
                    processedTranscript
                );
            }

            setTranscriptionComplete(
                "Transcription complete."
            );

            if (isIPhoneSource) {
                updateIPhoneExportButton(true);
            }

        } catch (error) {

            console.error(
                "Transcription error:",
                error
            );

            setTranscriptionError(
                error.message ||
                String(error)
            );

            if (isIPhoneSource && pendingIPhoneExports.length > 0) {
                updateIPhoneExportButton(true);
            }

        } finally {

            transcribeButton.disabled =
                false;
        }
    }
);


// --------------------------------------------------
// Busy indicator
// --------------------------------------------------

function setTranscriptionBusy(message) {

    transcriptionStatus.innerHTML = `
        <span class="transcription-spinner"
              aria-hidden="true"></span>
        <span>${message}</span>
    `;
}


function setTranscriptionComplete(message) {

    transcriptionStatus.innerHTML = `
        <span>${message}</span>
    `;
}


function setTranscriptionError(message) {

    transcriptionStatus.innerHTML = `
        <span>${message}</span>
    `;
}



// --------------------------------------------------
// Combine Files
// --------------------------------------------------

if (
    transcriptionTab &&
    combineTab &&
    searchTab
) {

    const tabConfig = {
        transcription: {
            tab: transcriptionTab,
            panel: transcriptionPanel,
            icon: "icons/transcribe.png"
        },
        combine: {
            tab: combineTab,
            panel: combinePanel,
            icon: "icons/combine.png"
        },
        search: {
            tab: searchTab,
            panel: searchPanel,
            icon: "icons/search.png"
        }
    };

    let activePrimaryTab = transcriptionTab;
    let settingsOpen = false;

    function activateTab(activeTab) {
        activePrimaryTab = activeTab;

        Object.values(tabConfig).forEach(config => {
            const isActive = config.tab === activeTab;
            config.tab.classList.toggle("active", isActive);
            config.tab.setAttribute("aria-selected", isActive ? "true" : "false");
            config.panel.hidden = !isActive;
        });

        if (appIcon) {
            const activeConfig = Object.values(tabConfig).find(
                config => config.tab === activeTab
            );
            if (activeConfig?.icon) {
                appIcon.src = activeConfig.icon;
            }
        }
    }

    function openSettings() {
        if (settingsOpen) return;

        settingsOpen = true;
        Object.values(tabConfig).forEach(config => {
            config.panel.hidden = true;
        });

        if (appTabs) {
            appTabs.hidden = true;
        }

        if (settingsPanel) {
            settingsPanel.hidden = false;
        }

        if (settingsButton) {
            settingsButton.setAttribute("aria-expanded", "true");
            settingsButton.classList.add("active");
        }

        refreshSettings();
    }

    function closeSettings() {
        if (!settingsOpen) return;

        settingsOpen = false;

        if (settingsPanel) {
            settingsPanel.hidden = true;
        }

        if (appTabs) {
            appTabs.hidden = false;
        }

        if (settingsButton) {
            settingsButton.setAttribute("aria-expanded", "false");
            settingsButton.classList.remove("active");
        }

        activateTab(activePrimaryTab);
    }

    transcriptionTab.addEventListener("click", () => {
        if (settingsOpen) closeSettings();
        activateTab(transcriptionTab);
    });

    combineTab.addEventListener("click", () => {
        if (settingsOpen) closeSettings();
        activateTab(combineTab);
    });

    searchTab.addEventListener("click", () => {
        if (settingsOpen) closeSettings();
        activateTab(searchTab);
    });

    if (settingsButton) {
        settingsButton.addEventListener("click", () => {
            if (settingsOpen) {
                closeSettings();
            } else {
                openSettings();
            }
        });
    }
}


// --------------------------------------------------
// Settings
// --------------------------------------------------

function formatStorageBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function renderSettingsRows(rows) {
    return rows.map(row => `
        <div class="settings-row">
            <span class="settings-label">${row.label}</span>
            <span class="settings-value">${row.value}</span>
        </div>
    `).join("");
}

function renderSettingsModel(model) {
    return `
        <div class="settings-model">
            <div class="settings-model-name">${model.name}</div>
            <div class="settings-model-detail">${model.detail}</div>
        </div>
    `;
}

function renderSettingsReport(report) {
    if (!settingsStorage || !settingsRuntime) return;

    const storageRows = [
        { label: "Browser storage used", value: formatStorageBytes(report.browser.usage) },
        { label: "Browser storage quota", value: formatStorageBytes(report.browser.quota) },
        {
            label: "Cached transcripts",
            value: `${formatStorageBytes(report.indexedDB.transcripts.bytes)} · ${report.indexedDB.transcripts.count.toLocaleString()} files`
        },
        {
            label: "Semantic index",
            value: `${formatStorageBytes(report.indexedDB.semanticEntries.embeddingBytes)} · ${report.indexedDB.semanticEntries.count.toLocaleString()} entries`
        },
        {
            label: "Other Memora IndexedDB data",
            value: `${formatStorageBytes(report.indexedDB.otherBytes)} · ${report.indexedDB.otherCount.toLocaleString()} entries`
        },
        {
            label: "Cached model files",
            value: `${formatStorageBytes(report.modelCache.knownBytes)} · ${report.modelCache.modelEntryCount.toLocaleString()} files`
        }
    ];

    settingsStorage.innerHTML =
        renderSettingsRows(storageRows) +
        `<h4 class="settings-subheading">Semantic index</h4>` +
        report.indexedDB.semanticEntries.representations.map(item =>
            renderSettingsModel({
                name: item.name,
                detail: `${formatStorageBytes(item.embeddingBytes)} · ${item.count.toLocaleString()} entries`
            })
        ).join("") +
        `<h4 class="settings-subheading">Cached models</h4>` +
        (
            report.modelCache.models.length
                ? report.modelCache.models.map(renderSettingsModel).join("")
                : `<p class="settings-note">No cached model files were identified through the browser Cache API.</p>`
        ) +
        `<p class="settings-note">
            Browser storage usage is the authoritative overall figure.
            Category sizes are estimates or known byte counts and should not be expected to add exactly to the browser total.
        </p>`;

    settingsRuntime.innerHTML = renderSettingsRows([
        { label: "Desktop Whisper", value: "Transformers.js 4.0.0 · WebGPU" },
        { label: "iPhone/iPad Whisper", value: "Transformers.js 3.7.2 · worker" },
        { label: "Semantic search", value: "Transformers.js 3.7.2 · browser cache" }
    ]);
}

async function refreshSettings() {
    if (!settingsStorageStatus) return;

    settingsStorageStatus.innerHTML = `
        <span class="transcription-spinner" aria-hidden="true"></span>
        <span>Reading Memora storage information…</span>
    `;

    try {
        const manager = await getStorageManagerModule();
        const report = await manager.getStorageReport();
        renderSettingsReport(report);
        settingsStorageStatus.textContent =
            `Updated ${new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }).format(new Date())}.`;
    } catch (error) {
        console.error("Settings storage error:", error);
        settingsStorageStatus.textContent =
            "Unable to read Memora storage information.";
    }
}

if (settingsRefreshButton) {
    settingsRefreshButton.addEventListener("click", refreshSettings);
}


function createSearchCombineTitle(query) {

    let phrase =
        String(query || "")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/[?!.]+$/g, "")
            .trim();

    if (!phrase) {
        return "Memora — Combined Transcription";
    }

    const framingPatterns = [
        /^what did I say about\s+/i,
        /^what have I said about\s+/i,
        /^what was I saying about\s+/i,
        /^tell me what I said about\s+/i,
        /^tell me about what I said about\s+/i,
        /^can you remind me what I said about\s+/i,
        /^can you remind me about what I said about\s+/i,
        /^when did I talk about\s+/i,
        /^where did I talk about\s+/i,
        /^did I say anything about\s+/i,
        /^what do I say about\s+/i,
        /^what have I said regarding\s+/i,
        /^what did I say regarding\s+/i
    ];

    for (const pattern of framingPatterns) {
        const stripped =
            phrase.replace(pattern, "").trim();

        if (stripped && stripped !== phrase) {
            phrase = stripped;
            break;
        }
    }

    const smallWords = new Set([
        "a", "an", "and", "as", "at", "by",
        "for", "from", "in", "into", "of", "on",
        "or", "the", "to", "with"
    ]);

    const words = phrase.split(" ");

    phrase =
        words.map((word, index) => {
            if (!/^[a-z]+$/.test(word)) {
                return word;
            }

            if (
                index > 0 &&
                index < words.length - 1 &&
                smallWords.has(word)
            ) {
                return word;
            }

            return (
                word.charAt(0).toUpperCase() +
                word.slice(1)
            );
        }).join(" ");

    return `Memora — Search: ${phrase}`;
}


async function useSearchSelectionInCombine(files, searchQuery, searchSourceHandle) {

    if (!files.length) {
        return;
    }

    selectedTranscriptFiles =
        files;

    textSourceHandle =
        searchSourceHandle;

    combineDestinationHandle = null;
    resetIPhoneCombineExportState();
    setActiveCombineDestinationButton(null);

    if (combineTitleInput) {
        combineTitleInput.value =
            createSearchCombineTitle(searchQuery);
    }

    if (textSourceHandle) {

        const isFileInput =
            textSourceHandle.kind === "file-input";

        if (combineDestinationSection) {
            combineDestinationSection.hidden = isFileInput;
        }

        if (combineTextButton) {
            combineTextButton.hidden = isFileInput;
        }

        if (combineDOCXButton) {
            combineDOCXButton.hidden = isFileInput;
        }

        if (combineHTMLButton) {
            combineHTMLButton.hidden = isFileInput;
        }

        if (iphoneCombineDestinationOptions) {
            iphoneCombineDestinationOptions.hidden =
                !isFileInput;

            iphoneCombineDestinationOptions.style.display =
                isFileInput ? "block" : "none";
        }

        if (!isFileInput) {
            await updateCombineFolderButton();
        }

        textSourceButton.textContent =
            `Text Source: ${textSourceHandle.name}`;
    }

    await displayTranscriptFiles(files);

    combineStatus.textContent =
        `${files.length} transcript${files.length === 1 ? "" : "s"} selected from Search.`;

    combineTab.click();
}



initSearchUI({
    getStorageModule,
    getSearchModule,
    onUseSelectionInCombine: useSearchSelectionInCombine
});

if (textSourceButton) {

    textSourceButton.addEventListener(
        "click",
        async () => {

            try {

                const storage =
                    await getStorageModule();

                textSourceHandle =
                    await storage.selectFolder();

                updateDestinationVisibility(textSourceHandle.kind === "file-input");

                const files =
                    textSourceHandle.kind === "file-input"
                        ? textSourceHandle.files.filter(
                            file => /\.txt$/i.test(file.name)
                        )
                        : await storage.listTextFiles(
                            textSourceHandle
                        );

                selectedTranscriptFiles =
                    files;

                resetIPhoneCombineExportState();

                combineDestinationHandle = null;
                setActiveCombineDestinationButton(null);
                await updateCombineFolderButton();

                await displayTranscriptFiles(
                    files
                );

                textSourceButton.textContent =
                    `Text Source: ${textSourceHandle.name}`;

                combineStatus.textContent =
                    files.length === 0
                        ? "No transcript files found."
                        : `${files.length} transcript file${files.length === 1 ? "" : "s"} found.`;

            } catch (error) {

                if (error.name !== "AbortError") {

                    console.error(
                        "Text source error:",
                        error
                    );

                    combineStatus.textContent =
                        "Unable to read the text source folder.";
                }
            }
        }
    );
}


if (combineSourceDestinationButton) {

    combineSourceDestinationButton.addEventListener(
        "click",
        () => {

            if (!textSourceHandle) {
                alert("Please select a text source folder first.");
                return;
            }

            combineDestinationHandle =
                textSourceHandle;

            setActiveCombineDestinationButton(
                combineSourceDestinationButton
            );
        }
    );
}


if (combineFolderDestinationButton) {

    combineFolderDestinationButton.addEventListener(
        "click",
        async () => {

            if (!textSourceHandle) {
                alert("Please select a text source folder first.");
                return;
            }

            try {

                const storage =
                    await getStorageModule();

                combineDestinationHandle =
                    await storage.getSubfolder(
                        textSourceHandle,
                        "combined",
                        true
                    );

                combineFolderDestinationButton.textContent =
                    'Use "combined" Folder';

                setActiveCombineDestinationButton(
                    combineFolderDestinationButton
                );

            } catch (error) {

                console.error(
                    "combined folder error:",
                    error
                );

                combineStatus.textContent =
                    "Unable to access the combined folder.";
            }
        }
    );
}


if (combineDestinationButton) {

    combineDestinationButton.addEventListener(
        "click",
        async () => {

            try {

                const storage =
                    await getStorageModule();

                combineDestinationHandle =
                    await storage.selectFolder();

                setActiveCombineDestinationButton(
                    combineDestinationButton
                );

                combineDestinationButton.textContent =
                    `Output: ${combineDestinationHandle.name}`;

            } catch (error) {

                if (error.name !== "AbortError") {

                    console.error(
                        "Combine destination error:",
                        error
                    );

                    combineStatus.textContent =
                        "Unable to select the output folder.";
                }
            }
        }
    );
}


async function displayTranscriptFiles(files) {

    transcripts.innerHTML = "";

    if (transcriptCollapseBottom) {
        transcriptCollapseBottom.innerHTML = "";
        transcriptCollapseBottom.hidden = files.length === 0;
    }

    if (files.length === 0) {

        transcripts.innerHTML = `
            <p class="empty-message">
                No transcript files found.
            </p>
        `;

        return;
    }

    const controls =
        document.createElement("div");

    controls.className =
        "recording-controls";

    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "10px";
    controls.style.marginBottom = "14px";

    const sortLabel =
        document.createElement("label");

    sortLabel.textContent =
        "Sort transcripts";

    sortLabel.htmlFor =
        "transcriptSort";

    sortLabel.style.color = "var(--muted)";
    sortLabel.style.fontSize = "14px";
    sortLabel.style.fontWeight = "500";

    const sortSelect =
        document.createElement("select");

    sortSelect.id =
        "transcriptSort";

    sortSelect.innerHTML = `
        <option value="date-desc">
            Date — newest first
        </option>
        <option value="date-asc">
            Date — oldest first
        </option>
        <option value="name-asc">
            Name — A → Z
        </option>
        <option value="name-desc">
            Name — Z → A
        </option>
    `;

    sortSelect.style.border = "1px solid var(--border)";
    sortSelect.style.borderRadius = "8px";
    sortSelect.style.padding = "8px 10px";
    sortSelect.style.background = "white";
    sortSelect.style.color = "var(--text)";
    sortSelect.style.font = "inherit";
    sortSelect.style.fontSize = "14px";

    controls.appendChild(sortLabel);
    controls.appendChild(sortSelect);

    const selectAllRow =
        document.createElement("div");

    selectAllRow.className =
        "recording-select-all";

    const selectAllCheckbox =
        document.createElement("input");

    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = true;
    selectAllCheckbox.id =
        "selectAllTranscripts";

    const selectAllLabel =
        document.createElement("label");

    selectAllLabel.htmlFor =
        "selectAllTranscripts";

    selectAllLabel.textContent =
        "Select all";

    selectAllRow.appendChild(
        selectAllCheckbox
    );

    selectAllRow.appendChild(
        selectAllLabel
    );

    const collapseCheckboxTop =
        document.createElement("input");

    collapseCheckboxTop.type = "checkbox";
    collapseCheckboxTop.id =
        "collapseAllTranscriptsTop";

    const collapseLabelTop =
        document.createElement("label");

    collapseLabelTop.htmlFor =
        "collapseAllTranscriptsTop";
    collapseLabelTop.textContent =
        "Collapse all";

    const collapseControlTop =
        document.createElement("span");

    collapseControlTop.className =
        "selection-action";

    collapseControlTop.appendChild(
        collapseCheckboxTop
    );

    collapseControlTop.appendChild(
        collapseLabelTop
    );

    selectAllRow.appendChild(
        collapseControlTop
    );

    let transcriptListItems = null;
    let transcriptsCollapsed = false;

    const collapseCheckboxBottom =
        document.createElement("input");

    collapseCheckboxBottom.type = "checkbox";
    collapseCheckboxBottom.id =
        "collapseAllTranscriptsBottom";

    const collapseLabelBottom =
        document.createElement("label");

    collapseLabelBottom.htmlFor =
        "collapseAllTranscriptsBottom";
    collapseLabelBottom.textContent =
        "Collapse all";

    const collapseControlBottom =
        document.createElement("div");

    collapseControlBottom.className =
        "selection-action selection-action-bottom";

    collapseControlBottom.appendChild(
        collapseCheckboxBottom
    );

    collapseControlBottom.appendChild(
        collapseLabelBottom
    );

    if (transcriptCollapseBottom) {
        const lowerSeparator =
            document.createElement("div");

        lowerSeparator.className =
            "selection-double-separator";

        transcriptCollapseBottom.appendChild(
            lowerSeparator
        );

        transcriptCollapseBottom.appendChild(
            collapseControlBottom
        );
    }

    function updateTranscriptCollapseUI() {

        const label =
            transcriptsCollapsed
                ? "Expand all"
                : "Collapse all";

        collapseLabelTop.textContent = label;
        collapseLabelBottom.textContent = label;

        collapseCheckboxTop.checked = false;
        collapseCheckboxBottom.checked = false;

        if (transcriptListItems) {
            transcriptListItems.hidden = transcriptsCollapsed;
        }
    }

    function toggleTranscriptCollapse() {
        transcriptsCollapsed = !transcriptsCollapsed;
        updateTranscriptCollapseUI();
    }

    function expandTranscriptsFromBottom() {
        const bottomTopBefore =
            transcriptCollapseBottom
                ? transcriptCollapseBottom.getBoundingClientRect().top
                : null;

        transcriptsCollapsed = false;
        updateTranscriptCollapseUI();

        if (bottomTopBefore !== null && transcriptCollapseBottom) {
            requestAnimationFrame(() => {
                const bottomTopAfter =
                    transcriptCollapseBottom.getBoundingClientRect().top;

                window.scrollBy(
                    0,
                    bottomTopAfter - bottomTopBefore
                );
            });
        }
    }

    collapseCheckboxTop.onchange = toggleTranscriptCollapse;

    collapseCheckboxBottom.onchange = () => {
        if (transcriptsCollapsed) {
            expandTranscriptsFromBottom();
        } else {
            toggleTranscriptCollapse();
        }
    };

    async function render(sortOrder) {

        combineSortOrder = sortOrder;

        const combineModule =
            await getCombineModule();

        // Use the actual Recording date stored inside each transcript
        // rather than the filename. This keeps the on-screen order
        // identical to the order used for the combined output.
        const records =
            await combineModule.readTranscriptFiles(
                selectedTranscriptFiles
            );

        const sorted =
            combineModule.sortTranscriptRecords(
                records,
                sortOrder
            );

        transcriptListItems =
            document.createElement("div");

        transcriptListItems.className =
            "recording-list-items";

        const checkboxes = [];

        for (const record of sorted) {

            const item =
                document.createElement("div");

            item.className =
                "recording-item";

            const checkbox =
                document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.checked = true;
            checkbox.className =
                "recording-checkbox";
            checkbox.dataset.filename =
                record.filename;

            checkboxes.push(
                checkbox
            );

            const content =
                document.createElement("div");

            content.className =
                "recording-content";

            const name =
                document.createElement("div");

            name.className =
                "recording-name";

            name.textContent =
                record.filename;

            content.appendChild(name);

            item.appendChild(checkbox);
            item.appendChild(content);

            transcriptListItems.appendChild(item);
        }

        transcripts.innerHTML = "";

        transcripts.appendChild(
            controls
        );

        transcripts.appendChild(
            selectAllRow
        );

        const upperSeparator =
            document.createElement("div");

        upperSeparator.className =
            "selection-double-separator";

        transcripts.appendChild(
            upperSeparator
        );

        transcripts.appendChild(
            transcriptListItems
        );

        selectAllCheckbox.checked =
            checkboxes.length > 0;

        selectAllCheckbox.onchange =
            () => {

                checkboxes.forEach(
                    checkbox => {
                        checkbox.checked =
                            selectAllCheckbox.checked;
                    }
                );

                resetIPhoneCombineExportState();
            };

        checkboxes.forEach(
            checkbox => {

                checkbox.onchange =
                    () => {

                        selectAllCheckbox.checked =
                            checkboxes.every(
                                item =>
                                    item.checked
                            );

                        resetIPhoneCombineExportState();
                    };
            }
        );

        updateTranscriptCollapseUI();
    }

    render("date-desc");

    sortSelect.addEventListener(
        "change",
        () => {
            resetIPhoneCombineExportState();
            render(sortSelect.value);
        }
    );
}


function getIPhoneCombineFormatLabel() {
    if (!iphoneCombineFormatSelect) {
        return "TXT";
    }

    const labels = {
        text: "TXT",
        docx: "DOCX",
        html: "HTML"
    };

    return labels[iphoneCombineFormatSelect.value] || "TXT";
}


function updateIPhoneCombineButton() {
    if (!iphoneCombineExportButton) {
        return;
    }

    iphoneCombineExportButton.textContent =
        `Save ${getIPhoneCombineFormatLabel()} to Files`;

    iphoneCombineExportButton.disabled =
        selectedTranscriptFiles.length === 0;
}


function resetIPhoneCombineExportState() {
    pendingIPhoneCombineExport = null;

    const formatLabel =
        getIPhoneCombineFormatLabel();

    if (iphoneCombineExportButton) {
        iphoneCombineExportButton.disabled =
            selectedTranscriptFiles.length === 0;
        iphoneCombineExportButton.textContent =
            `Save ${formatLabel} to Files`;
    }

    if (iphoneCombineExportStatus) {
        iphoneCombineExportStatus.textContent =
            `Ready to share ${formatLabel}`;
    }
}


async function exportIPhoneCombinedFile(file) {
    if (!file) {
        return;
    }

    pendingIPhoneCombineExport = file;
    const formatLabel = getIPhoneCombineFormatLabel();

    updateIPhoneCombineButton(true);

    if (!navigator.share) {
        if (iphoneCombineExportStatus) {
            iphoneCombineExportStatus.textContent =
                "This iPhone browser cannot share files.";
        }
        return;
    }

    const shareData = {
        files: [file]
    };

    if (navigator.canShare && !navigator.canShare(shareData)) {
        if (iphoneCombineExportStatus) {
            iphoneCombineExportStatus.textContent =
                `This browser cannot share the ${formatLabel} file.`;
        }
        return;
    }

    try {
        await navigator.share(shareData);

        if (iphoneCombineExportStatus) {
            iphoneCombineExportStatus.textContent =
                `${formatLabel} shared`;
        }

        updateIPhoneCombineButton(true);

    } catch (error) {
        if (error.name === "AbortError") {
            if (iphoneCombineExportStatus) {
                iphoneCombineExportStatus.textContent =
                    `${formatLabel} ready to save`;
            }

            updateIPhoneCombineButton(true);
            return;
        }

        console.error(
            "iPhone combined file export error:",
            error
        );

        if (iphoneCombineExportStatus) {
            iphoneCombineExportStatus.textContent =
                `Unable to share the ${formatLabel} file.`;
        }

        updateIPhoneCombineButton(true);
    }
}


if (iphoneCombineFormatSelect) {
    iphoneCombineFormatSelect.addEventListener(
        "change",
        () => {
            resetIPhoneCombineExportState();
        }
    );
}


if (combineTitleInput) {
    combineTitleInput.addEventListener(
        "input",
        () => {
            if (textSourceHandle?.kind === "file-input") {
                resetIPhoneCombineExportState();
            }
        }
    );
}


if (combineParagraphingCheckbox) {
    combineParagraphingCheckbox.addEventListener(
        "change",
        () => {
            if (textSourceHandle?.kind === "file-input") {
                resetIPhoneCombineExportState();
            }
        }
    );
}


resetIPhoneCombineExportState();


function getSelectedTranscriptFiles() {

    const checkboxes =
        Array.from(
            document.querySelectorAll(
                "#transcripts .recording-checkbox"
            )
        );

    return selectedTranscriptFiles.filter(
        file => {

            const checkbox =
                checkboxes.find(
                    item =>
                        item.dataset.filename ===
                        file.name
                );

            return checkbox &&
                checkbox.checked;
        }
    );
}


async function combineSelectedFiles(
    outputType
) {

    const isIPhoneSource =
        textSourceHandle?.kind === "file-input";

    const files =
        getSelectedTranscriptFiles();

    const combineTitle =
        combineTitleInput?.value.trim() ||
        "Memora — Combined Transcription";

    const safeFilenameBase =
        combineTitle
            .replace(/[<>:"/\\|?*]/g, "-")
            .replace(/[. ]+$/g, "")
            .trim() ||
        "Memora — Combined Transcription";

    if (files.length === 0) {

        combineStatus.textContent =
            "Please select at least one transcript.";

        return;
    }

    if (!isIPhoneSource && !combineDestinationHandle) {

        combineStatus.textContent =
            "Please select an output folder first.";

        return;
    }

    try {

        if (isIPhoneSource) {
            if (iphoneCombineExportButton) {
                iphoneCombineExportButton.disabled = true;
            }
        } else {
            combineTextButton.disabled = true;
            combineDOCXButton.disabled = true;
            combineHTMLButton.disabled = true;
        }

        combineStatus.textContent =
            `Reading ${files.length} transcript${files.length === 1 ? "" : "s"}…`;

        combineStatus.textContent =
            "Loading combine tools…";

        const combineModule =
            await getCombineModule();

        combineStatus.textContent =
            `Reading ${files.length} transcript${files.length === 1 ? "" : "s"}…`;

        const records =
            await combineModule.readTranscriptFiles(
                files
            );

        const sortedRecords =
            combineModule.sortTranscriptRecords(
                records,
                combineSortOrder
            );

        const selectedRecords =
            combineModule.selectHighestModelRecords(
                sortedRecords
            );

        combineStatus.textContent =
            `Preparing ${selectedRecords.length} transcript${selectedRecords.length === 1 ? "" : "s"}…`;

        let outputRecords =
            selectedRecords;

        if (combineParagraphingCheckbox?.checked) {

            const paragraphing =
                await getParagraphingModule();

            outputRecords = [];

            for (let i = 0; i < selectedRecords.length; i++) {

                const record =
                    selectedRecords[i];

                combineStatus.textContent =
                    `Creating paragraphs for ${i + 1} of ` +
                    `${selectedRecords.length}: ` +
                    `${record.filename}`;

                const paragraphizedTranscript =
                    await paragraphing.paragraphize(
                        record.transcript,
                        message => {
                            combineStatus.textContent =
                                message;
                        }
                    );

                outputRecords.push({
                    ...record,
                    transcript: paragraphizedTranscript
                });
            }
        }

        // iPhone: generate exactly one selected format in memory, then
        // hand that file to the iOS share sheet. The same generated file
        // remains available for repeated sharing.
        if (isIPhoneSource) {

            if (outputType === "text") {

                const combinedText =
                    combineModule.combineTranscriptRecords(
                        outputRecords,
                        combineTitle
                    );

                const file =
                    new File(
                        [combinedText],
                        `${safeFilenameBase}.txt`,
                        { type: "text/plain" }
                    );

                combineStatus.textContent =
                    "Creating combined TXT…";

                await exportIPhoneCombinedFile(file);
                combineStatus.textContent = "";

            } else if (outputType === "docx") {

                const docx =
                    await getDOCXModule();

                const combinedDOCX =
                    await docx.createCombinedDOCX(
                        outputRecords,
                        combineTitle
                    );

                const file =
                    new File(
                        [combinedDOCX],
                        `${safeFilenameBase}.docx`,
                        {
                            type:
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        }
                    );

                combineStatus.textContent =
                    "Creating combined DOCX…";

                await exportIPhoneCombinedFile(file);
                combineStatus.textContent = "";

            } else {

                const html =
                    await getHTMLModule();

                // On iPhone there is no destination folder handle to
                // resolve a new prefix from. Preserve any relative audio
                // paths already carried by the transcript records.
                const htmlRecords =
                    outputRecords;

                const combinedHTML =
                    html.createCombinedHTML(
                        htmlRecords,
                        combineTitle
                    );

                const file =
                    new File(
                        [combinedHTML],
                        `${safeFilenameBase}.html`,
                        { type: "text/html" }
                    );

                combineStatus.textContent =
                    "Creating combined HTML…";

                await exportIPhoneCombinedFile(file);
                combineStatus.textContent = "";
            }

            return;
        }

        combineStatus.textContent =
            "Loading output storage…";

        const storage =
            await getStorageModule();

        if (outputType === "text") {

            combineStatus.textContent =
                "Creating combined TXT…";

            const combinedText =
                combineModule.combineTranscriptRecords(
                    outputRecords,
                    combineTitle
                );

            combineStatus.textContent =
                `Writing combined TXT to “${combineDestinationHandle.name}”…`;

            await storage.writeTextFile(
                combineDestinationHandle,
                `${safeFilenameBase}.txt`,
                combinedText
            );

            combineStatus.textContent =
                "Combined TXT created.";

        } else if (outputType === "docx") {

            combineStatus.textContent =
                "Loading DOCX tools…";

            const docx =
                await getDOCXModule();

            combineStatus.textContent =
                "Creating combined DOCX…";

            const combinedDOCX =
                await docx.createCombinedDOCX(
                    outputRecords,
                    combineTitle
                );

            combineStatus.textContent =
                `Writing combined DOCX to “${combineDestinationHandle.name}”…`;

            await storage.writeBinaryFile(
                combineDestinationHandle,
                `${safeFilenameBase}.docx`,
                combinedDOCX
            );

            combineStatus.textContent =
                "Combined DOCX created.";

        } else {

            combineStatus.textContent =
                "Loading HTML tools…";

            const html =
                await getHTMLModule();

            combineStatus.textContent =
                "Preparing combined HTML…";

            const htmlAudioPathPrefix =
                await getCombinedAudioPathPrefix(
                    textSourceHandle,
                    combineDestinationHandle
                );

            const htmlRecords =
                outputRecords.map(record => ({
                    ...record,
                    audioRelativePath:
                        record.audioRelativePath &&
                        htmlAudioPathPrefix !== null
                            ? htmlAudioPathPrefix +
                                record.audioRelativePath
                            : null
                }));

            combineStatus.textContent =
                "Creating combined HTML…";

            const combinedHTML =
                html.createCombinedHTML(
                    htmlRecords,
                    combineTitle
                );

            combineStatus.textContent =
                `Writing combined HTML to “${combineDestinationHandle.name}”…`;

            await storage.writeTextFile(
                combineDestinationHandle,
                `${safeFilenameBase}.html`,
                combinedHTML
            );

            combineStatus.textContent =
                "Combined HTML created.";
        }

    } catch (error) {

        console.error(
            "Combine error:",
            error
        );

        combineStatus.textContent =
            error.message ||
            "Unable to create the combined file.";

        if (isIPhoneSource) {
            updateIPhoneCombineButton(
                pendingIPhoneCombineExport !== null
            );
        }

    } finally {

        if (isIPhoneSource) {
            if (iphoneCombineExportButton) {
                updateIPhoneCombineButton(
                    pendingIPhoneCombineExport !== null
                );
            }
        } else {
            combineTextButton.disabled = false;
            combineDOCXButton.disabled = false;
            combineHTMLButton.disabled = false;
        }
    }
}


if (combineTextButton) {

    combineTextButton.addEventListener(
        "click",
        () => combineSelectedFiles("text")
    );
}


if (combineDOCXButton) {

    combineDOCXButton.addEventListener(
        "click",
        () => combineSelectedFiles("docx")
    );
}


if (combineHTMLButton) {

    combineHTMLButton.addEventListener(
        "click",
        () => combineSelectedFiles("html")
    );
}

if (iphoneCombineExportButton) {

    iphoneCombineExportButton.addEventListener(
        "click",
        () => {
            const outputType =
                iphoneCombineFormatSelect?.value ||
                "text";

            combineSelectedFiles(outputType);
        }
    );
}


// --------------------------------------------------
// Whisper model
// --------------------------------------------------



// --------------------------------------------------
// Audio processing module
// --------------------------------------------------

let audioProcessor = null;



// --------------------------------------------------
// Audio path helpers
// --------------------------------------------------

async function getAudioRelativePath(
    sourceFolder,
    transcriptionFolder,
    filename
) {

    if (!sourceFolder || !transcriptionFolder) {
        return null;
    }

    const path =
        await sourceFolder.resolve(
            transcriptionFolder
        );

    if (!path) {
        return null;
    }

    return (
        "../".repeat(path.length) +
        filename
    );
}


async function getCombinedAudioPathPrefix(
    textSourceFolder,
    combineFolder
) {

    if (!textSourceFolder || !combineFolder) {
        return null;
    }

    const path =
        await textSourceFolder.resolve(
            combineFolder
        );

    if (!path) {
        return null;
    }

    return "../".repeat(path.length);
}


// --------------------------------------------------
// Build transcript file
// --------------------------------------------------

function buildTranscript(
    file,
    metadata,
    text,
    model,
    language,
    operation,
    audioRelativePath
) {

    const recordingDate =
        formatRecordingDate(
            metadata.recordingDate
        );

    const fileDate =
        formatRecordingDate(
            metadata.fileCreationDate
        );

    const duration =
        formatDuration(
            metadata.duration,
            metadata.durationTimescale
        );

    const metadataLines = [
        `Recording date: ${recordingDate}`,
        `File date: ${fileDate}`,
        `Duration: ${duration}`,
        `Voice Memo ID: ${metadata.uuid || "Unknown"}`,
        `Whisper model: ${model}`,
        `Operation: ${operation === "translate" ? "translate" : "transcribe"}`
    ];

    if (
        operation === "translate" &&
        language &&
        language !== "auto"
    ) {
        metadataLines.push(
            `Original language: ${formatLanguageName(language)}`
        );
    }

    if (audioRelativePath) {
        metadataLines.push(
            `Audio Relative Path: ${audioRelativePath}`
        );
    }

    return (
        `${file.name}\n\n` +
        `${metadataLines.join("\n")}\n\n` +
        `--------------------------------------------------\n\n` +
        `${text.trim()}\n`
    );
}


// --------------------------------------------------
// Save transcript
// --------------------------------------------------

async function saveTranscript(
    transcriptionFolder,
    file,
    metadata,
    transcript,
    model,
    operation
) {

    const storage =
        await getStorageModule();

    if (sourceHandle?.kind === "file-input") {

        const filename =
            await createUniqueTranscriptFilename(
                null,
                file,
                metadata,
                model,
                operation
            );

        await storage.saveTranscriptRecord(
            filename,
            transcript,
            metadata,
            model,
            operation
        );

        return filename;
    }

    const filename =
        await createUniqueTranscriptFilename(
            transcriptionFolder,
            file,
            metadata,
            model,
            operation
        );

    await storage.writeTextFile(
        transcriptionFolder,
        filename,
        transcript
    );

    return filename;
}


function updateIPhoneExportButton(forceEnable = false) {
    if (!iphoneExportButton) {
        return;
    }

    const count = pendingIPhoneExports.length;

    iphoneExportButton.textContent =
        `Save ${count} Transcript${count === 1 ? "" : "s"} to Files`;

    if (forceEnable) {
        iphoneExportButton.disabled = count === 0;
    }
}


function resetIPhoneExportState() {
    pendingIPhoneExports = [];

    if (iphoneExportButton) {
        iphoneExportButton.disabled = true;
        iphoneExportButton.textContent = "Save 0 Transcripts to Files";
    }

    if (iphoneExportStatus) {
        iphoneExportStatus.textContent = "No transcripts saved yet.";
    }

}


function setIPhoneExportSavedStatus(count) {
    if (iphoneExportButton) {
        iphoneExportButton.disabled = count === 0;
        iphoneExportButton.textContent =
            `Save ${count} Transcript${count === 1 ? "" : "s"} to Files`;
    }

    if (iphoneExportStatus) {
        iphoneExportStatus.textContent =
            `${count} Transcript${count === 1 ? "" : "s"} saved`;
    }

}


async function exportIPhoneTranscripts() {
    if (pendingIPhoneExports.length === 0) {
        return;
    }

    if (!navigator.share) {
        alert(
            "This iPhone browser cannot share files to the Files app."
        );
        return;
    }

    const shareData = {
        files: pendingIPhoneExports
    };

    if (navigator.canShare && !navigator.canShare({
        files: pendingIPhoneExports
    })) {
        alert(
            "These transcript files cannot be shared from this browser."
        );
        return;
    }

    try {
        const savedCount = pendingIPhoneExports.length;

        await navigator.share(shareData);

        setIPhoneExportSavedStatus(savedCount);

    } catch (error) {
        if (error.name !== "AbortError") {
            console.error(
                "iPhone transcript export error:",
                error
            );
            alert(
                "Unable to save the transcripts to Files."
            );
        }
    }
}


async function createUniqueTranscriptFilename(
    transcriptionFolder,
    file,
    metadata,
    model,
    operation
) {

    const baseFilename =
        createTranscriptFilename(
            file,
            metadata,
            model,
            operation
        );

    // On iPhone, the actual Files destination is chosen later through
    // the iOS share sheet, so Memora must not perform its own filename
    // collision/version tracking.
    if (sourceHandle?.kind === "file-input") {
        return baseFilename;
    }

    const extension = ".txt";
    const stem =
        baseFilename.endsWith(extension)
            ? baseFilename.slice(0, -extension.length)
            : baseFilename;

    let version = 1;

    while (true) {

        const filename =
            version === 1
                ? `${stem}${extension}`
                : `${stem}-${version}${extension}`;

        const storage =
            await getStorageModule();

        if (
            await storage.fileExists(
                transcriptionFolder,
                filename
            )
        ) {

            version++;

        } else {

            return filename;
        }
    }
}


function createTranscriptFilename(
    file,
    metadata,
    model,
    operation
) {

    const date =
        metadata.recordingDate ||
        metadata.fileCreationDate;

    const baseName =
        file.name.replace(/\.[^.]+$/i, "");

    const modelSuffix =
        sanitizeFilename(model);

    const operationSuffix =
        operation === "translate"
            ? " - eng"
            : "";

    if (!date) {
        return (
            `${sanitizeFilename(baseName)} - ` +
            `${modelSuffix}${operationSuffix}.txt`
        );
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return (
        `${year}-${month}-${day} - ` +
        `${sanitizeFilename(baseName)} - ` +
        `${modelSuffix}${operationSuffix}.txt`
    );
}


function sanitizeFilename(name) {

    return name.replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_"
    );
}


// --------------------------------------------------
// Display transcription
// --------------------------------------------------

function appendTranscription(
    file,
    text
) {

    const block =
        document.createElement("div");

    block.className =
        "transcription-block";

    const heading =
        document.createElement("h3");

    heading.textContent =
        file.name;

    const paragraph =
        document.createElement("p");

    paragraph.textContent =
        text;

    block.appendChild(heading);
    block.appendChild(paragraph);

    transcriptionOutput.appendChild(
        block
    );
}


// --------------------------------------------------
// Metadata processing module
// --------------------------------------------------

let metadataModule = null;

async function readAudioMetadata(file) {

    if (!metadataModule) {
        metadataModule =
            await import("./metadata.js");
    }

    return metadataModule.readAudioMetadata(file);
}


function formatLanguageName(language) {

    const names = {
        en: "English",
        pt: "Portuguese",
        es: "Spanish",
        fr: "French",
        de: "German",
        sa: "Sanskrit"
    };

    return names[language] || language;
}


// --------------------------------------------------
// Formatting
// --------------------------------------------------

function formatRecordingDate(date) {

    if (!date) {
        return "Date unknown";
    }

    return new Intl.DateTimeFormat(
        "en-GB",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    )
        .format(date)
        .replace(",", " ·");
}


function formatDuration(
    duration,
    timescale
) {

    if (!duration || !timescale) {
        return "Duration unknown";
    }

    const totalSeconds =
        Math.round(
            duration / timescale
        );

    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const remainingSeconds =
        totalSeconds % 60;

    return (
        `${minutes}:` +
        `${String(
            remainingSeconds
        ).padStart(2, "0")}`
    );
}
