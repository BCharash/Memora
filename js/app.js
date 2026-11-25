import {createTranscriptionGate} from './transcriptionGate.js';
import {sharedFolders,discoverTranscriptFolders,transcriptSaveLocation} from './sharedFolderSelection.js';
import { createTranscriptionIdentity } from "./transcriptionIdentity.js";

import {readTranscriptFolder, TranscriptCollectionError} from "./transcriptCatalogue.js";
import { readTranscriptSourceText } from "./combine.js";
import { resolveSearchHighlights } from "./searchExportHighlights.js";
import { recordingIdentityLines, readTranscriptIdentity } from "./transcriptMetadata.js";
import { askIdentity } from "./identityDialog.js";
import { renderWhisperExecutionReport, renderWhisperReviewNotice } from "./whisperExecutionReports.js";
import { atWhisperFailureBoundary } from "./whisperFailures.js";
import { startRuntimeDiagnostics, recordRuntimeDiagnostic } from "./runtimeDiagnostics.js";
import { listQualifiedWhisperProductionModels } from "./whisperProductionEligibility.js";
import { displayBuildInfo } from "./build-info.js";
import { formatWhisperDiagnostics, formatTranscriptionTimings } from "./whisperDiagnostics.js";

import {
    displayTranscriptFiles,
    getCombineSortOrder,
    getSelectedTranscriptFiles,
    getTranscriptFileCount,
    initCombineUI
} from "./combineUI.js";
import { displayFiles, getSelectedFiles, showEmptyMessage } from "./transcriptionUI.js";
import { appendSearchAudioControl, initSearchUI, shareEditedTranscript, refreshSearchAfterCombineEdit, openSearchSource, resetSharedSearchSource, isSearchSourceBusy, hasPendingSearchIndexUpdate } from "./searchUI.js";
import { initCombineShareExportUI } from "./combineShareExport.js";
import { initSettingsUI } from "./settings.js";

startRuntimeDiagnostics();
displayBuildInfo(document.getElementById("appBuild"));

// --------------------------------------------------
// Display text-size preference
// --------------------------------------------------

const TEXT_SIZE_STORAGE_KEY = "memoraTextSizePx";
const DEFAULT_TEXT_SIZE_PX = 16;

function applyTextSizePreference(value) {
    const size = Math.max(14, Math.min(26, Number(value) || DEFAULT_TEXT_SIZE_PX));
    const root = document.documentElement;
    root.style.setProperty("--memora-file-heading-size", `${size}px`);
    root.style.setProperty("--memora-transcript-heading-size", `${Math.round(size * 0.9375)}px`);
    root.style.setProperty("--memora-transcript-body-size", `${size}px`);
    root.style.setProperty("--memora-search-body-size", `${size}px`);
    root.style.setProperty("--memora-settings-help-size", `${size}px`);

    const slider = document.getElementById("textSizeSlider");
    const valueLabel = document.getElementById("textSizeValue");
    if (slider && slider.value !== String(size)) slider.value = String(size);
    if (valueLabel) valueLabel.textContent = `${size} px`;
}

let savedTextSize = DEFAULT_TEXT_SIZE_PX;
try {
    const storedTextSize = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    if (storedTextSize !== null) savedTextSize = Number(storedTextSize);
} catch (error) {
    // Continue with the default if browser storage is unavailable.
}
applyTextSizePreference(savedTextSize);

const DEFAULT_COMBINE_TITLE = "Combined Transcription";

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
const modelSelect = document.getElementById("modelSelect");
let transcriptionBatchActive = false;
let sourceSelectionActive = false;
let sourceSelectionRequested = false;
let sharedFolderOperation = false;
let modelRefreshVersion = 0;
async function refreshQualifiedWhisperModels() {
    const version = ++modelRefreshVersion;
    if (!modelSelect || transcriptionBatchActive || sourceSelectionActive || sourceSelectionRequested || sharedFolderOperation) return;
    const note = document.getElementById("modelEligibilityNote");
    const previous = modelSelect.value;
    try {
        const definitions = await listQualifiedWhisperProductionModels();
        if (version !== modelRefreshVersion || transcriptionBatchActive || sourceSelectionActive || sourceSelectionRequested || sharedFolderOperation) return;
        modelSelect.replaceChildren();
        for (const definition of definitions) {
            const option = document.createElement("option");
            option.value = definition.family;
            option.textContent = definition.label;
            modelSelect.append(option);
        }
        if (definitions.some(item => item.family === previous)) modelSelect.value = previous;
        if (!definitions.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No qualified models";
            modelSelect.append(option);
        }
        modelSelect.disabled = !definitions.length;
        transcribeButton.disabled = !definitions.length;
        if (previous !== modelSelect.value) modelSelect.dispatchEvent(new CustomEvent("change", { detail: { preserveExports: true } }));
        if (note) note.textContent = definitions.length ? "Only test-qualified models are shown." : "Open Settings → Whisper Self-Test and test a model to enable transcription.";
        const reviewNotice = document.getElementById("modelReviewNotice");
        if (reviewNotice) renderWhisperReviewNotice(reviewNotice);
    } catch (error) {
        if (version !== modelRefreshVersion || transcriptionBatchActive || sourceSelectionActive || sourceSelectionRequested || sharedFolderOperation) return;
        modelSelect.replaceChildren();
        modelSelect.disabled = transcribeButton.disabled = true;
        if (note) note.textContent = `Model eligibility unavailable: ${error.message}`;
    }
}
window.addEventListener("memora-whisper-eligibility-changed", () => void refreshQualifiedWhisperModels());
window.addEventListener("focus", () => void refreshQualifiedWhisperModels());
window.addEventListener("storage", event => {
    if (event.key === null || event.key?.startsWith("memora.whisper-eligibility") || event.key?.startsWith("memora.whisper-production-evidence")) void refreshQualifiedWhisperModels();
});
const languageSelect = document.getElementById("languageSelect");
const operationSelect = document.getElementById("operationSelect");
const paragraphingCheckbox = document.getElementById("paragraphingCheckbox");
const transcribeButton = document.getElementById("transcribeButton");
void refreshQualifiedWhisperModels();

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

const appIcon =
    document.getElementById("appIcon");

const textSourceButton =
    document.getElementById("textSourceButton");

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
const combineStatus =
    document.getElementById("combineStatus");

const combineTitleInput =
    document.getElementById("combineTitleInput");

// Paragraphing is enabled by default for new transcriptions.
// Existing transcripts that already contain blank-line paragraph breaks are
// left untouched by paragraphing.js.
if (paragraphingCheckbox) {
    paragraphingCheckbox.checked = true;
}

let sourceHandle = null;
let destinationHandle = null;

let pendingIPhoneExports = [];
let exportBatchLocation=null,exportBatchState="unattempted";
let exportBatchDestination=null, implicitIPhoneDestination=null, alternateIPhoneDestination=null;
const pendingTranscriptSaves = [];

const retryTranscriptSaveButton = document.getElementById("retryTranscriptSaveButton");
function createIdentityWorkflow() { return createTranscriptionIdentity(); }
let identityWorkflow = createIdentityWorkflow();
window.addEventListener("beforeunload", event => {
    if (pendingTranscriptSaves.length || pendingIPhoneExports.length && exportBatchState!=='shared') {
        event.preventDefault(); event.returnValue = "";
    }
});
function updatePendingSaveButton() {
    if (retryTranscriptSaveButton) retryTranscriptSaveButton.hidden = !pendingTranscriptSaves.length;
    document.getElementById("pendingTranscriptSaveStatus").textContent = pendingTranscriptSaves.length ? "Completed text is retained below. Retry its save without transcribing again." : "";
}
async function confirmPendingDiscard() {
    if (!pendingIPhoneExports.length && !pendingTranscriptSaves.length) {
        return true;
    }
    const wasShared=exportBatchState==='shared';
    const answer = await askIdentity({title:wasShared?'Verify saved transcripts':'Keep the pending transcripts?',message:wasShared?`Please verify that your transcripts were saved in ${exportBatchLocation||'the intended folder'} before continuing.`:'There are transcripts waiting to be saved. Keep them and finish saving, or explicitly discard them before starting a new source or batch.', choices:[{action:"cancel",label:"Keep pending transcripts"},{action:"discard",label:"Discard pending transcripts"}]});
    if (answer.action !== "discard") return false;
    pendingTranscriptSaves.length = 0; updatePendingSaveButton(); resetIPhoneExportState(); return true;
}


let textSourceHandle = null;
let combineFolderSession = null;
let combineListOrigin = null;
const combineSearchHighlightOption = document.getElementById("combineSearchHighlightOption");
const combineSearchHighlights = document.getElementById("combineSearchHighlights");
const combineMetadataOptions = document.getElementById("combineMetadataOptions");
const combineTranscriptListStatus=document.getElementById('combineTranscriptListStatus');
function updateCombineOutputOptions() {
    const hasSelection = getSelectedTranscriptFiles().length > 0;
    combineMetadataOptions.hidden = !hasSelection;
    combineSearchHighlightOption.hidden = !hasSelection || !combineListOrigin?.searchHighlights;
    const location = document.getElementById("iphoneCombineExportLocation");
    location.hidden = !hasSelection || textSourceHandle?.kind !== "file-input";
    if (!location.hidden) {
        const { folder, parentHint } = transcriptSaveLocation(textSourceHandle, "combined");
        location.textContent = `Suggested folder in Save to Files: ${folder}.${parentHint} Create “combined” inside the transcript folder if needed, or choose another destination.`;
    }
    if (getTranscriptFileCount() === 0) {
        combineTitleInput.value = DEFAULT_COMBINE_TITLE;
    }
}
function renderCombineTranscriptList(){
    const box=document.getElementById('combineListOrigin');
    box.hidden=!combineListOrigin;
    if(combineListOrigin){
        const {source,searchTitle}=combineListOrigin;
        const selected=sharedFolders.snapshot().transcript;
        document.getElementById('combineListFolder').textContent=selected?.source===source?selected.label:
            source.parentAudioName?`${source.parentAudioName} / ${source.name}`:source.name;
        document.getElementById('combineListScope').textContent=searchTitle||'All';
    }
    combineTranscriptListStatus.hidden=!combineFolderSession;
    if(combineFolderSession)combineTranscriptListStatus.textContent=`Transcripts: ${combineFolderSession.records.length} loaded.${combineFolderSession.cacheError?' Local metadata cache unavailable.':''}${combineFolderSession.issues?.length?' '+combineFolderSession.issues.join(' '):''}`;
}
async function retainPendingCombineList(){return true;}
let combineDestinationHandle = null;

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

// Before a source is selected, use the available folder-access pathway.
// The common destination selector stays visible on both pathways.
updateDestinationVisibility(!window.showDirectoryPicker);
if (transcriptionDestinationSection) {
    transcriptionDestinationSection.hidden = false;
}

// Keep Combine output controls hidden until a text source is selected.
// The source selection will reveal the appropriate desktop or iPhone controls.
if (combineDestinationSection) {
    combineDestinationSection.hidden = true;
}

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

const audioInventoryStatus=document.getElementById("audioInventoryStatus");
const transcriptionGate=createTranscriptionGate();
let currentAudioFiles=[],renderedAudioSource=null;
const transcriptionWorkspace=document.createElement('div'),enableTranscriptionButton=document.createElement('button');
transcriptionWorkspace.id='transcriptionWorkspace';enableTranscriptionButton.id='enableTranscriptionButton';enableTranscriptionButton.textContent='Enable Transcription';enableTranscriptionButton.type='button';enableTranscriptionButton.hidden=true;
const transcriptionContainer=transcriptionPanel.querySelector('.panel');transcriptionWorkspace.append(...transcriptionContainer.childNodes);transcriptionContainer.append(enableTranscriptionButton,transcriptionWorkspace);
function renderTranscriptionGate(){transcriptionGate.setTranscriptSource(!!sharedFolders.snapshot().transcript);const state=transcriptionGate.snapshot();transcriptionWorkspace.hidden=state.guarded;enableTranscriptionButton.hidden=!state.guarded;}
async function prepareRecordingDisplay(){
    if(!sourceHandle||renderedAudioSource===sourceHandle)return;
    showEmptyMessage();
    await displayFiles(currentAudioFiles,file=>identityWorkflow.getSession().getRecordingMetadata(file,readAudioMetadata),formatRecordingDate,formatDuration,message=>{audioInventoryStatus.textContent=message;});
    await identityWorkflow.getSession().saveMetadata();
    renderedAudioSource=sourceHandle;audioInventoryStatus.textContent='';
}
// Shared iPhone save controls forward clicks here from Combine/Search. Those
// hidden actions are not transcription intent and must not bypass its gate.
const transcriptionSetupVisible=()=>!transcriptionPanel.hidden&&!transcriptionWorkspace.hidden;
transcriptionWorkspace.addEventListener('click',event=>{if(transcriptionSetupVisible()&&event.target.closest('button,input,select'))transcriptionGate.activity();});
transcriptionWorkspace.addEventListener('change',event=>{if(transcriptionSetupVisible()&&!event.detail?.preserveExports)transcriptionGate.activity();});
enableTranscriptionButton.addEventListener('click',async()=>{transcriptionGate.activity();renderTranscriptionGate();sourceSelectionRequested=true;updateSharedFolderControls();try{await prepareRecordingDisplay();}catch(error){audioInventoryStatus.textContent=error.message;}finally{sourceSelectionRequested=false;updateSharedFolderControls();await refreshQualifiedWhisperModels();}});
// Returning while iPhone Files is still preparing a source can precede child
// discovery. Refresh the gate when discovery commits, not only on tab clicks.
async function resumeTranscriptionView(){
    renderTranscriptionGate();
    if(transcriptionPanel.hidden||transcriptionWorkspace.hidden||!sourceHandle||renderedAudioSource===sourceHandle||sourceSelectionRequested||sharedFolderOperation)return;
    sourceSelectionRequested=true;updateSharedFolderControls();
    try{await prepareRecordingDisplay();}catch(error){audioInventoryStatus.textContent=error.message;}
    finally{sourceSelectionRequested=false;updateSharedFolderControls();await refreshQualifiedWhisperModels();}
}
let loadedSharedCombine=null,loadedSharedSearch=null;
let transcribeDestinationSession=null;
function updateSharedFolderControls(){
    const busy=transcriptionBatchActive||sourceSelectionRequested||sharedFolderOperation||isSearchSourceBusy();
    document.querySelectorAll('[data-select-audio],[data-select-transcript],#sourceButton,#textSourceButton,#searchSourceButton').forEach(button=>button.disabled=busy);
}
function applySharedTranscriptSelection(){
    const state=sharedFolders.snapshot();
    destinationHandle=state.transcript?.source||null;
    destinationButton.textContent='Browse for Another Folder';
    const chooseDestination=document.querySelector('[data-select-transcript="transcribe"]');
    chooseDestination.textContent=state.audio?.kind==='file-input' ? 'Choose Optional Destination' : 'Select Transcript Destination';
    document.querySelectorAll('[data-audio-folder]').forEach(node=>node.textContent=sharedFolders.audioLabel());
    document.querySelectorAll('[data-transcript-folder]').forEach(node=>node.textContent=sharedFolders.transcriptLabel());
    renderCombineTranscriptList();
    const hasDefault=state.folders.some(folder=>folder.name.toLowerCase()==='transcription');
    transcriptionDestinationButton.textContent=hasDefault?'Use "transcription" Folder':'Create "transcription" Folder';
    renderTranscriptionGate();
}
function clearSharedCombineRows(){
    return displayTranscriptFiles([], "No transcript source opened.");
}
function resetSharedConsumers(){
    loadedSharedCombine=loadedSharedSearch=null;
    textSourceHandle=null;combineFolderSession=null;combineListOrigin=null;combineDestinationHandle=null;
    renderCombineTranscriptList();
    clearSharedCombineRows();
    resetSharedSearchSource();
}
async function confirmSharedFolderChange(){
    if(transcriptionBatchActive||pendingTranscriptSaves.length||document.querySelector('.search-transcript-save-button:disabled,.combine-transcript-editor-actions button:disabled'))return false;
    const dirty=[...document.querySelectorAll('.combine-transcript-editor-input,.search-transcript-editor')].some(editor=>editor.value!==editor.defaultValue && !editor.parentElement.hidden);
    if(dirty){
        const answer=await askIdentity({title:'Unsaved transcript edits',message:'Keep editing, or discard the unsaved edits before changing folders.',choices:[{action:'keep',label:'Keep editing'},{action:'discard',label:'Discard edits'}]});
        if(answer.action!=='discard')return false;
    }
    if(hasPendingSearchIndexUpdate()){
        const answer=await askIdentity({title:'Unsaved Search Index',message:'Keep the current folders to save the Search Index, or discard its pending update before changing folders.',choices:[{action:'keep',label:'Keep current folders'},{action:'discard',label:'Discard index update'}]});
        if(answer.action!=='discard')return false;
    }
    return await retainPendingCombineList() && await confirmPendingDiscard();
}
async function prepareTranscribeDestination(source){
    if(!source)return null;
    const snapshot=await readTranscriptFolder(source);
    if(snapshot.issues.length)throw Error(snapshot.issues.join(' '));
    return snapshot;
}
function publishTranscribeDestination(snapshot){
    transcribeDestinationSession=snapshot;identityWorkflow.invalidateDestination();
    document.getElementById('transcribeDestinationStatus').textContent=snapshot?`Transcripts: ${snapshot.records.length} loaded.${snapshot.cacheError?' Local metadata cache unavailable.':''}`:
        sourceHandle?.kind==='file-input'?'Choose where to save in Files after transcription.':'Transcripts: Select a destination.';
}
async function chooseSharedTranscript(view,{browse=false,source:chosenSource=null,label:chosenLabel=null}={}){
    if(sharedFolderOperation||sourceSelectionRequested||transcriptionBatchActive||isSearchSourceBusy())return;
    sharedFolderOperation=true;updateSharedFolderControls();
    try{
        if(!await confirmSharedFolderChange())return;
        const state=sharedFolders.snapshot();
        let selected=chosenSource?{source:chosenSource,label:chosenLabel||chosenSource.name}:null;
        if(selected){/* A lower shortcut selected an already granted folder. */}
        else if(!browse){
            const answer=await askIdentity({title:view==='transcribe'?'Select Transcript Destination':'Select Transcript Folder',message:'Choose an existing folder, or name a new destination.',choices:[
                ...state.folders.map((folder,index)=>({action:String(index),label:`${state.audio.name} / ${folder.name}`})),
                ...(view==='transcribe'&&state.audio?[{action:'new',label:'New Transcript Folder…',run:async()=>{
                    const name=prompt('Transcript folder name','transcription');if(!name)throw new DOMException('Cancelled.','AbortError');
                    if(/[\\/:\x00-\x1f]/.test(name)||name==='.'||name==='..')throw Error('Use a folder name without path separators.');
                    const candidates=[...state.folders,...(state.transcript?.source.parentAudioName===state.audio.name?[state.transcript]:[])];
                    const existing=candidates.find(folder=>folder.name.normalize('NFC').toLowerCase()===name.normalize('NFC').toLowerCase());if(existing)return existing.source;
                    return state.audio.kind==='directory'?await (await getStorageModule()).getSubfolder(state.audio,name,true):{kind:'file-input',selectionScope:'selection',files:[],name,parentAudioName:state.audio.name,intended:true};
                }}]:[]),
                {action:'browse',label:'Browse for Another Folder',run:async()=>await (await getStorageModule()).selectFolder()},
                {action:'cancel',label:'Cancel'}]});
            if(answer.action==='cancel')return;
            selected=answer.action==='browse'||answer.action==='new'?{source:answer.value,label:answer.action==='new'?`${state.audio.name} / ${answer.value.name}`:`${answer.value.name} (Selected Separately)`}:{...state.folders[Number(answer.action)],label:`${state.audio.name} / ${state.folders[Number(answer.action)].name}`};
        }else{
            const source=await (await getStorageModule()).selectFolder();selected={source,label:`${source.name} (Selected Separately)`};
        }
        // A failed read does not replace the previous shared selection.
        let destinationSession;
        if(view==='combine')destinationSession=await openCombineSource(selected.source);
        else if(view!=='transcribe')await readTranscriptFolder(selected.source);
        try{destinationSession ||= await prepareTranscribeDestination(selected.source);}
        catch(error){if(view==='transcribe')throw error;destinationSession={status:'blocked',error,source:selected.source};}
        sharedFolders.setTranscript(selected.source,selected.label);
        applySharedTranscriptSelection();
        publishTranscribeDestination(destinationSession);
        destinationButton.textContent='Browse for Another Folder';
        if(view!=='combine'){
            textSourceHandle=null;combineFolderSession=null;combineListOrigin=null;combineDestinationHandle=null;renderCombineTranscriptList();
            clearSharedCombineRows();
        }
        loadedSharedCombine=view==='combine'?selected.source:null;
        loadedSharedSearch=null;
        resetSharedSearchSource();
        if(view==='search'){await openSearchSource(selected.source);loadedSharedSearch=selected.source;}
    }catch(error){if(error.name!=='AbortError'){
        if(view==='combine')combineStatus.textContent=`Unable to read the text source folder. ${error.message}`;
        else alert(error.message);
    }}finally{
        sharedFolderOperation=false;
        if(view==='transcribe'&&transcriptionGate.snapshot().enabled&&sourceHandle&&renderedAudioSource!==sourceHandle){
            sourceSelectionRequested=true;updateSharedFolderControls();
            try{await prepareRecordingDisplay();}catch(error){audioInventoryStatus.textContent=error.message;}
            finally{sourceSelectionRequested=false;}
        }
        updateSharedFolderControls();await refreshQualifiedWhisperModels();
    }
}
async function ensureSharedTranscriptForActiveView(){
    if(sharedFolderOperation||sourceSelectionRequested||transcriptionBatchActive||isSearchSourceBusy())return;
    const source=sharedFolders.snapshot().transcript?.source;if(!source)return;
    const view=!document.getElementById('combinePanel').hidden?'combine':!document.getElementById('searchPanel').hidden?'search':null;
    if(!view||view==='combine'&&loadedSharedCombine===source||view==='search'&&loadedSharedSearch===source)return;
    const panel=document.getElementById(view==='combine'?'combinePanel':'searchPanel');
    if([...panel.querySelectorAll('textarea')].some(editor=>editor.value!==editor.defaultValue&&!editor.parentElement.hidden))return;
    sharedFolderOperation=true;updateSharedFolderControls();
    try{
        if(view==='combine'){await openCombineSource(source);loadedSharedCombine=source;}
        else{await openSearchSource(source);loadedSharedSearch=source;}
    }catch(error){if(view==='combine')combineStatus.textContent=`Unable to read the transcript source. ${error.message}`;else alert(error.message);}
    finally{sharedFolderOperation=false;updateSharedFolderControls();await refreshQualifiedWhisperModels();}
}
document.addEventListener('memora-search-busy',updateSharedFolderControls);
document.querySelectorAll('[data-select-audio]').forEach(button=>button.addEventListener('click',()=>loadAudioSource()));
document.querySelectorAll('[data-select-transcript]').forEach(button=>button.addEventListener('click',()=>chooseSharedTranscript(button.dataset.selectTranscript)));
// Mirror source preparation into the active workspace, including the Files wait.
for(const panel of [document.getElementById('combinePanel'),document.getElementById('searchPanel')]){
    const mirror=document.createElement('div');mirror.className='shared-folder-note';
    const activity=document.getElementById('audioSourceActivity').cloneNode(true);activity.removeAttribute('id');activity.querySelector('[id]')?.removeAttribute('id');
    const status=document.createElement('p');status.className='settings-note';status.setAttribute('role','status');
    mirror.append(activity,status);panel.querySelector('.source-section,.search-source-section').append(mirror);
    const observer=new MutationObserver(()=>{activity.hidden=document.getElementById('audioSourceActivity').hidden;activity.lastElementChild.textContent=document.getElementById('audioSourceElapsed').textContent;status.textContent=[audioInventoryStatus.textContent,document.getElementById('audioCacheStatus').textContent].filter(Boolean).join(' ');});
    for(const target of [document.getElementById('audioSourceActivity'),audioInventoryStatus,document.getElementById('audioCacheStatus')])observer.observe(target,{subtree:true,childList:true,attributes:true,characterData:true});
}

sourceButton.addEventListener("click",()=>loadAudioSource());
async function loadAudioSource() {
    if(transcriptionBatchActive||sourceSelectionActive||sourceSelectionRequested||sharedFolderOperation||isSearchSourceBusy())return;
    sourceSelectionRequested=true;updateSharedFolderControls();sourceButton.disabled=true;transcribeButton.disabled=true;
    const activity=document.getElementById('audioSourceActivity'),elapsed=document.getElementById('audioSourceElapsed'),started=performance.now();
    activity.hidden=false;sourceButton.closest('.source-section').setAttribute('aria-busy','true');elapsed.textContent='Elapsed: 0s';
    audioInventoryStatus.textContent='Waiting for folder selection or Files to make it available. iCloud preparation may take time.';
    const activityTimer=setInterval(()=>{elapsed.textContent=`Elapsed: ${Math.floor((performance.now()-started)/1000)}s`;},1000);
    let selectedSource=null;
    try {
        const storage=await getStorageModule();
        if(!await confirmSharedFolderChange())return;
        sourceSelectionActive=true;sourceButton.disabled=true;transcribeButton.disabled=true;
        audioInventoryStatus.textContent='Waiting for folder selection or Files to make it available. iCloud preparation may take time.';
        selectedSource=await storage.selectFolder();
        audioInventoryStatus.textContent='Reading audio metadata…';
        const files=await storage.listAudioFiles(selectedSource);
        const selectedIdentityWorkflow=createIdentityWorkflow();
        await selectedIdentityWorkflow.prepareSource(selectedSource,files,{onProgress:message=>{audioInventoryStatus.textContent=message;}});
        audioInventoryStatus.textContent='Finding transcript folders…';
        const children=await discoverTranscriptFolders(selectedSource);
        // Commit shared access and identity together after discovery succeeds.
        identityWorkflow.reset();identityWorkflow=selectedIdentityWorkflow;
        sourceHandle=selectedSource;
        destinationHandle=null;
        implicitIPhoneDestination=null;
        alternateIPhoneDestination=null;
        resetIPhoneExportState();
        updateDestinationVisibility(sourceHandle.kind==='file-input');
        setActiveDestinationButton(null);
        sourceButton.textContent='Select Audio Folder';
        sharedFolders.setAudio(sourceHandle,children,files,selectedIdentityWorkflow.getSession().getInventory());
        applySharedTranscriptSelection();
        resetSharedConsumers();
        try{publishTranscribeDestination(await prepareTranscribeDestination(destinationHandle));}
        catch(error){transcribeDestinationSession={status:'blocked',error};document.getElementById('transcribeDestinationStatus').textContent=`Transcript destination needs attention: ${error.message}`;}
        currentAudioFiles=files;renderedAudioSource=null;showEmptyMessage();
        if(transcriptionGate.snapshot().enabled||(!transcriptionPanel.hidden&&!transcriptionWorkspace.hidden))await prepareRecordingDisplay();
        const summary=identityWorkflow.getInventorySummary();
        document.getElementById('audioCacheStatus').textContent=`Audio: ${summary.checked} recordings ready.${summary.cacheError?' Local metadata cache unavailable.':''}`;
        audioInventoryStatus.textContent='';

    } catch(error) {
        audioInventoryStatus.textContent=error.name==='AbortError'?'Source selection cancelled. The previous source is retained.':`Unable to open audio source: ${error.message}`;
        if(error.name!=='AbortError'){console.error('Source folder error:',error);alert(error.message||'Unable to read the source folder.');}
    } finally {
        clearInterval(activityTimer);activity.hidden=true;sourceButton.closest('.source-section').setAttribute('aria-busy','false');
        sourceSelectionRequested=false;sourceSelectionActive=false;sourceButton.disabled=false;
        if(!transcriptionBatchActive)await refreshQualifiedWhisperModels();
        updateSharedFolderControls();
    }
    await ensureSharedTranscriptForActiveView();
}



if (iphoneExportButton) {
    iphoneExportButton.addEventListener("click", exportIPhoneTranscripts);
}


sourceDestinationButton.addEventListener('click',async()=>{
    if(!sourceHandle||sourceHandle.kind==='file-input')return;
    await chooseSharedTranscript('transcribe',{source:sourceHandle,label:sourceHandle.name});
});
transcriptionDestinationButton.addEventListener('click',async()=>{
    if(!sourceHandle||sourceHandle.kind==='file-input')return;
    try{
        const child=await (await getStorageModule()).getSubfolder(sourceHandle,'transcription',true);
        await chooseSharedTranscript('transcribe',{source:child,label:`${sourceHandle.name} / transcription`});
    }catch(error){if(error.name!=='AbortError')alert(error.message);}
});

destinationButton.addEventListener('click',()=>chooseSharedTranscript('transcribe',{browse:true}));


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

// Completed artifacts retain their original settings until explicitly discarded.
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

        if(!transcriptionGate.snapshot().enabled)return;
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

        if (!destinationHandle && !isIPhoneSource) {

            alert(
                "Please select a destination folder first."
            );

            return;
        }

        if(sharedFolderOperation||sourceSelectionRequested||isSearchSourceBusy())return;
        if(transcribeDestinationSession?.status==='blocked'){alert(transcribeDestinationSession.error.message);return;}
        if (pendingTranscriptSaves.length) {
            alert("Retry the pending transcript save before starting another transcription."); return;
        }
        if (isIPhoneSource && !(await confirmPendingDiscard())) return;

        // Pressing Transcribe Selected defines a new iPhone export batch
        // using the recordings selected at that moment.
        if (isIPhoneSource) {
            resetIPhoneExportState();
            if (!destinationHandle) {
                implicitIPhoneDestination ??= {
                    kind: 'file-input', selectionScope: 'selection', files: [],
                    name: 'transcription', parentAudioName: sourceHandle.name, intended: true
                };
            }
            exportBatchDestination = destinationHandle || implicitIPhoneDestination;
            exportBatchLocation = transcriptSaveLocation(exportBatchDestination).folder;
        }
        identityWorkflow.invalidateDestination();

        try {

            transcriptionBatchActive = true;
            updateSharedFolderControls();
            for (const button of [sourceButton,destinationButton,sourceDestinationButton,transcriptionDestinationButton]) button.disabled = true;
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

            try {
                await identityWorkflow.begin(sourceHandle, isIPhoneSource ? exportBatchDestination : destinationHandle);
            } catch (error) {
                if (!isIPhoneSource || !(error instanceof TranscriptCollectionError)) throw error;
                if (!alternateIPhoneDestination) {
                    const names = new Set(sharedFolders.snapshot().folders.map(folder => folder.name.normalize('NFC').toLowerCase()));
                    names.add(exportBatchDestination.name.normalize('NFC').toLowerCase());
                    const stem = 'transcription - new';
                    let name = stem;
                    for (let number = 2; names.has(name); number++) name = `${stem} ${number}`;
                    alternateIPhoneDestination = {
                        kind: 'file-input', selectionScope: 'selection', files: [],
                        name, parentAudioName: sourceHandle.name, intended: true
                    };
                }
                exportBatchDestination = alternateIPhoneDestination;
                exportBatchLocation = transcriptSaveLocation(exportBatchDestination).folder;
                await identityWorkflow.begin(sourceHandle, exportBatchDestination);
            }

            for (
                let i = 0;
                i < filesToTranscribe.length;
                i++
            ) {

                const identity = await identityWorkflow.prepare(filesToTranscribe[i]);
                if (!identity) continue;
                const file = identity.file;

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
                        setTranscriptionBusy,
                        async (record, execution) => {

                            let processedTranscript =
                                record.transcript;

                            if (paragraphingCheckbox?.checked) {
                                setTranscriptionBusy(
                                    `Creating paragraphs for ${i + 1} of ` +
                                    `${filesToTranscribe.length}: ` +
                                    `${file.name}`
                                );

                                execution.checkpoint("paragraphing", { timings: record.timings });
                                const paragraphing =
                                    await getParagraphingModule();

                                const paragraphStarted = performance.now();
                                processedTranscript =
                                    await atWhisperFailureBoundary({ stage: "paragraphing" }, () => paragraphing.paragraphize(
                                        record.transcript,
                                        setTranscriptionBusy
                                    ));
                                if (record.timings) record.timings.paragraphMs = performance.now() - paragraphStarted;
                            }

                            record.metadata = { ...record.metadata, recordingId: identity.recordingId,
                                archiveUuid: identity.archiveUuid, recordingIdentityMethod: identity.recordingIdentityMethod,
                                originalAudioFolderName: identity.originalAudioFolderName };
                            record.processedTranscript = processedTranscript;
                            execution.checkpoint("save", { timings: record.timings });
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

                            const prepared = { transcriptionFolder, record, transcript, operation, filename: null };
                            try {
                                await atWhisperFailureBoundary({ stage: "save" }, () => savePreparedTranscript(prepared));
                            } catch (error) {
                                pendingTranscriptSaves.push(prepared); updatePendingSaveButton();
                                appendTranscription(record.file, processedTranscript, record);
                                throw error;
                            }

                        },
                        identity.embedded
                    );
                appendTranscription(record.file, record.processedTranscript, record);
            }

            setTranscriptionComplete(
                "Transcription complete."
            );

            if (isIPhoneSource) {
                updateIPhoneExportButton();
            }

        } catch (error) {

            console.error(
                "Transcription error:",
                error
            );

            setTranscriptionError(
                (error.message || String(error)) + (error.executionPersistenceError ? ` History unavailable: ${error.executionPersistenceError}` : "") + (error.eligibilityPersistenceError ? ` Eligibility update unavailable: ${error.eligibilityPersistenceError}` : "")
            );

            if (isIPhoneSource && pendingIPhoneExports.length > 0) {
                updateIPhoneExportButton();
            }

        } finally {

            transcriptionBatchActive = false;
            updateSharedFolderControls();
            for (const button of [sourceButton,destinationButton,sourceDestinationButton,transcriptionDestinationButton]) button.disabled = false;
            loadedSharedCombine=loadedSharedSearch=null;
            await refreshQualifiedWhisperModels();
        }
    }
);


// --------------------------------------------------
// Busy indicator
// --------------------------------------------------

function setTranscriptionBusy(message) {
    const spinner = document.createElement("span"); spinner.className = "transcription-spinner"; spinner.setAttribute("aria-hidden", "true");
    const text = document.createElement("span"); text.textContent = message;
    transcriptionStatus.replaceChildren(spinner, text);
}
function setTranscriptionComplete(message) { transcriptionStatus.textContent = message; }
function setTranscriptionError(message) { transcriptionStatus.textContent = message; }

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
    if (settingsPanel) {
        new MutationObserver(() => recordRuntimeDiagnostic("settings-visibility", { hidden: settingsPanel.hidden, expectedOpen: settingsOpen }))
            .observe(settingsPanel, { attributes: true, attributeFilter: ["hidden"] });
    }

    function activateTab(activeTab) {
        if(activePrimaryTab===transcriptionTab&&activeTab!==transcriptionTab)transcriptionGate.leave();
        renderTranscriptionGate();
        activePrimaryTab = activeTab;

        Object.values(tabConfig).forEach(config => {
            const isActive = config.tab === activeTab;
            config.tab.classList.toggle("active", isActive);
            config.tab.setAttribute("aria-selected", isActive ? "true" : "false");
            config.panel.hidden = !isActive;
        });

        if(activeTab===transcriptionTab)resumeTranscriptionView();

        if (appIcon) {
            const activeConfig = Object.values(tabConfig).find(
                config => config.tab === activeTab
            );
            if (activeConfig?.icon) {
                appIcon.src = activeConfig.icon;
            }
        }
    }

    function openSettings(reason = "unspecified", trusted = null) {
        if (settingsOpen) return;

        recordRuntimeDiagnostic("settings-open-requested", { reason, trusted });
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

        recordRuntimeDiagnostic("settings-opened", { reason, trusted });
        settingsUI.refresh();
    }

    function closeSettings(reason = "unspecified", trusted = null) {
        if (!settingsOpen) return;

        recordRuntimeDiagnostic("settings-close-requested", { reason, trusted });
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
        recordRuntimeDiagnostic("settings-closed", { reason, trusted, tab: activePrimaryTab?.id || "unknown" });
    }

    transcriptionTab.addEventListener("click", event => {
        if (settingsOpen) closeSettings("transcription-tab", event.isTrusted);
        activateTab(transcriptionTab);
    });

    combineTab.addEventListener("click", event => {
        if (settingsOpen) closeSettings("combine-tab", event.isTrusted);
        activateTab(combineTab);
        ensureSharedTranscriptForActiveView();
    });

    searchTab.addEventListener("click", event => {
        if (settingsOpen) closeSettings("search-tab", event.isTrusted);
        activateTab(searchTab);
        ensureSharedTranscriptForActiveView();
    });

    window.addEventListener("memora-whisper-review-requested", () => {
        settingsUI.showProductionReviews();
        if (!settingsOpen) openSettings("eligibility-review");
    });
    if (settingsButton) {
        settingsButton.addEventListener("click", event => {
            if (settingsOpen) {
                closeSettings("settings-button", event.isTrusted);
            } else {
                openSettings("settings-button", event.isTrusted);
            }
        });
    }
}


// --------------------------------------------------
// Settings
// --------------------------------------------------

const settingsUI = initSettingsUI({
    getStorageManager: getStorageManagerModule,
    getStorage: getStorageModule,
});

const textSizeSlider = document.getElementById("textSizeSlider");
textSizeSlider?.addEventListener("input", () => {
    const size = Number(textSizeSlider.value);
    applyTextSizePreference(size);
    try {
        localStorage.setItem(TEXT_SIZE_STORAGE_KEY, String(size));
    } catch (error) {
        // The current page still updates even if the preference cannot be saved.
    }
});


function createSearchCombineTitle(query) {
    const terms=[...new Set(String(query||'').split(';').map(term=>term.trim()).filter(Boolean))]
        .map(createSearchTermTitle).filter(Boolean);
    return terms.length ? `Search: ${terms.join("; ")}` : "";
}

function createSearchTermTitle(query) {

    let phrase =
        String(query || "")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/[?!.]+$/g, "")
            .trim();

    if (!phrase) {
        return '';
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

    return phrase;
}


async function useSearchSelectionInCombine(files, searchQuery, searchSourceHandle, records = []) {

    if (!files.length) {
        return;
    }

    if(!await retainPendingCombineList())return;
    combineFolderSession=null;
    textSourceHandle = searchSourceHandle;
    const searchTitle = createSearchCombineTitle(searchQuery);
    combineListOrigin = {
        source: searchSourceHandle,
        searchTitle,
        searchHighlights: new Map(records.map(record => [record.file.name, record.searchHighlights]))
    };
    combineSearchHighlights.checked = false;
    renderCombineTranscriptList();

    combineDestinationHandle = null;
    setActiveCombineDestinationButton(null);

    if (combineTitleInput) {
        const audioName = getCombineAudioSourceName(searchSourceHandle, records);
        const title = searchTitle || DEFAULT_COMBINE_TITLE;
        combineTitleInput.value = audioName ? `${audioName} - ${title}` : title;
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

        textSourceButton.textContent = 'Select Transcript Folder';
    }

    await displayTranscriptFiles(files);

    combineStatus.textContent =
        `${files.length} transcript${files.length === 1 ? "" : "s"} selected from Search.`;

    loadedSharedCombine=searchSourceHandle;
    combineTab.click();
}



initSearchUI({
    getStorageModule,
    getSearchModule,
    onUseSelectionInCombine: useSearchSelectionInCombine,
    onSelectTranscriptSource: ()=>chooseSharedTranscript('search')
});

function getCombineAudioSourceName(source, records) {
    const state = sharedFolders.snapshot();
    const discoveredAudioName = state.folders.some(folder => folder.source === source)
        ? state.audio?.name
        : null;
    const recordedAudioNames = new Set(
        records.map(record => record.originalAudioFolderName).filter(Boolean)
    );
    return source?.parentAudioName || discoveredAudioName ||
        (recordedAudioNames.size === 1 ? [...recordedAudioNames][0] : null);
}

function createFolderCombineTitle(source, records) {
    const audioName = getCombineAudioSourceName(source, records);
    const folderTitle = source.name ? `Combined ${source.name}` : DEFAULT_COMBINE_TITLE;
    return audioName ? `${audioName} - ${folderTitle}` : folderTitle;
}

async function openCombineSource(selectedSource) {
    combineStatus.textContent='Reading transcript files…';
    const snapshot=await readTranscriptFolder(selectedSource,{onProgress:({completed,total})=>{
        combineStatus.textContent=`Reading transcript files: ${completed} of ${total}…`;
    }});
    const session=snapshot;
    textSourceHandle=selectedSource;
    combineFolderSession=session;
    combineListOrigin={source:selectedSource,searchTitle:null};
    renderCombineTranscriptList();
    updateDestinationVisibility(textSourceHandle.kind === 'file-input');
    const files=snapshot.files;

    if (combineTitleInput) {
        combineTitleInput.value =
            createFolderCombineTitle(selectedSource, snapshot.records);
    }

    combineDestinationHandle = null;
    setActiveCombineDestinationButton(null);
    if(textSourceHandle.kind==='directory')await updateCombineFolderButton();

    await displayTranscriptFiles(
        files
    );

    textSourceButton.textContent = 'Select Transcript Folder';

    combineStatus.textContent =
        files.length === 0
            ? "No transcript files found."
            : `${files.length} transcript file${files.length === 1 ? "" : "s"} found.`;

    return session;
}
if(textSourceButton)textSourceButton.addEventListener('click',()=>chooseSharedTranscript('combine'));


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


const combineShareExportUI = initCombineShareExportUI({
    getTranscriptFileCount,
    onExportRequested: outputType => combineSelectedFiles(outputType)
});


if (combineTitleInput) {
    combineTitleInput.addEventListener(
        "input",
        () => {
            if (textSourceHandle?.kind === "file-input") {
                combineShareExportUI.reset();
            }
        }
    );
}


initCombineUI({
    getCombineModule,
    onSelectionChanged: () => {
        updateCombineOutputOptions();
        combineShareExportUI.reset();
    },
    onAppendAudioControl: (section,group,source)=>appendSearchAudioControl(section,{...group,archiveName:combineFolderSession?.archiveName},source),
    getAudioSourceHandle: () => textSourceHandle,
    onSaveTranscriptEdits: async (record, updatedText) => {
        const storage = await getStorageModule();
        const sourceHandle = textSourceHandle;
        if (!sourceHandle) {
            throw new Error("Select the transcript source again before editing.");
        }

        readTranscriptIdentity(updatedText);
        const updatedFile = new File([updatedText], record.filename, {
            type: "text/plain",
            lastModified: Date.now()
        });

        let prepared;
        if (sourceHandle.kind === "file-input") {
            combineStatus.textContent = "Preparing the transcript and Search Index…";
            try {
                prepared = await shareEditedTranscript(sourceHandle, updatedFile, message => { combineStatus.textContent = message; });
            } catch (error) {
                combineStatus.textContent = error.name === "AbortError" ? "Save canceled. Your edits are still available." : error.message;
                throw error;
            }
            combineStatus.textContent = "Transcript and Search Index shared. Verify both replacements in Files.";
        } else {
            if (await storage.readTextFile(sourceHandle, record.filename) !== await readTranscriptSourceText(record.file)) throw new Error("This transcript changed outside Memora. Reload it before saving your edits.");
            await storage.writeTextFile(sourceHandle, record.filename, updatedText);
            combineStatus.textContent = "Transcript saved. Use Update Search Index in Search to save the JSON.";
        }

        await refreshSearchAfterCombineEdit(sourceHandle, updatedFile, prepared);
        return updatedFile;
    }
});

updateCombineOutputOptions();
window.addEventListener("pageshow", updateCombineOutputOptions);

async function combineSelectedFiles(
    outputType
) {

    const isIPhoneSource =
        textSourceHandle?.kind === "file-input";
    const exportGuidance = document.getElementById("iphoneCombineExportLocation").textContent;

    const files =
        getSelectedTranscriptFiles();

    const combineTitle =
        combineTitleInput?.value.trim() ||
        DEFAULT_COMBINE_TITLE;
    const metadataOptions = Object.fromEntries(
        Array.from(document.querySelectorAll("#combineMetadataOptions input"), input =>
            [input.name, input.checked]
        )
    );
    const searchHighlights = outputType !== "text" && combineSearchHighlights.checked
        ? combineListOrigin?.searchHighlights
        : null;

    const safeFilenameBase =
        combineTitle
            .replace(/[<>:"/\\|?*]/g, "-")
            .replace(/[. ]+$/g, "")
            .trim() ||
        DEFAULT_COMBINE_TITLE;

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
            combineShareExportUI.setBusy(true);
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
                getCombineSortOrder()
            );

        const selectedRecords =
            combineModule.selectHighestModelRecords(
                sortedRecords
            );

        combineStatus.textContent =
            `Preparing ${selectedRecords.length} transcript${selectedRecords.length === 1 ? "" : "s"}…`;

        // Combine preserves the paragraphs in the selected transcripts.
        const outputRecords = searchHighlights ? selectedRecords.map(record => ({
            ...record,
            searchHighlights: resolveSearchHighlights(searchHighlights.get(record.filename), record.transcript)
        })) : selectedRecords;

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

                await combineShareExportUI.exportFile(file, exportGuidance);
                combineStatus.textContent = "";

            } else if (outputType === "docx") {

                const docx =
                    await getDOCXModule();

                const combinedDOCX =
                    await docx.createCombinedDOCX(
                        outputRecords,
                        combineTitle,
                        metadataOptions
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

                await combineShareExportUI.exportFile(file, exportGuidance);
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
                        combineTitle,
                        metadataOptions
                    );

                const file =
                    new File(
                        [combinedHTML],
                        `${safeFilenameBase}.html`,
                        { type: "text/html" }
                    );

                combineStatus.textContent =
                    "Creating combined HTML…";

                await combineShareExportUI.exportFile(file, exportGuidance);
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
                    combineTitle,
                    metadataOptions
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
                    playbackAudioPath:
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
                    combineTitle,
                    metadataOptions
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

    } finally {

        if (isIPhoneSource) {
            combineShareExportUI.setBusy(false);
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

// --------------------------------------------------
// Whisper model
// --------------------------------------------------



// --------------------------------------------------
// Audio processing module
// --------------------------------------------------




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

    // Keep recording/transcription details together, then identity/provenance.
    metadataLines.push("", ...recordingIdentityLines(metadata));

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


// Save verified identity-bearing TXT independently of metadata cache availability.
async function savePreparedTranscript(prepared) {
    const {transcriptionFolder,record,transcript,operation} = prepared;
    const storage = await getStorageModule();
    if (!prepared.filename) prepared.filename = await createUniqueTranscriptFilename(transcriptionFolder,record.file,record.metadata,record.model,operation);
    const filename = prepared.filename;
    if (transcriptionFolder) {
        const existing = await storage.readTextFile(transcriptionFolder,filename);
        if (existing !== null && existing !== transcript && !(prepared.emptyCreated && existing === "")) throw new Error("The pending transcript filename changed outside Memora. Keep the completed text and review that file before retrying.");
        if (existing === null || prepared.emptyCreated && existing === "") {
            try { await storage.writeTextFile(transcriptionFolder,filename,transcript); }
            catch (error) { if (existing === null && await storage.readTextFile(transcriptionFolder,filename) === "") prepared.emptyCreated = true; throw error; }
        }
        if (await storage.readTextFile(transcriptionFolder,filename) !== transcript) throw new Error("The saved transcript could not be verified. Retry the pending save.");
    } else {
        await storage.saveTranscriptRecord(filename,transcript,record.metadata,record.model,operation);
    }
    if (!transcriptionFolder && !pendingIPhoneExports.some(file => file.name === filename)) {
        pendingIPhoneExports.push(new File([transcript],filename,{type:"text/plain"}));
        updateIPhoneExportButton();
    }
}
retryTranscriptSaveButton?.addEventListener("click", async () => {
    retryTranscriptSaveButton.disabled = true;
    try {
        while (pendingTranscriptSaves.length) { await savePreparedTranscript(pendingTranscriptSaves[0]); pendingTranscriptSaves.shift(); }
        setTranscriptionComplete("Pending transcript save completed.");
    } catch (error) { setTranscriptionError(error.message); }
    finally { retryTranscriptSaveButton.disabled = false; updatePendingSaveButton(); }
});

function updateIPhoneExportButton(){
    const count=pendingIPhoneExports.length;
    iphoneExportButton.textContent=`Save ${count} Transcription${count===1?'':'s'} to Files`;
    iphoneExportButton.disabled=!count;
    iphoneExportButton.classList.toggle('has-pending-exports',count>0&&exportBatchState!=='shared');
    const location=document.getElementById('iphoneExportLocation');
    const help=document.getElementById('iphoneExportFolderHelp');
    location.hidden=!count;
    help.hidden=!count;
    if(count){
        const source=exportBatchDestination;
        const parentHint=source?.kind==='file-input' ? transcriptSaveLocation(source).parentHint : '';
        const createHint=source?.intended ? ` Create “${source.name}” under “${source.parentAudioName}” in Files if it does not exist.` : '';
        location.textContent=`Save in: ${exportBatchLocation||sharedFolders.transcriptLabel()}`;
        const collectionHint=source===alternateIPhoneDestination ? 'The selected folder cannot be used as a single transcript collection. Save this batch in the separate folder shown above. ' : '';
        help.textContent=`${collectionHint}Choose this folder in Save to Files.${parentHint}${createHint}`;
    }
}
function resetIPhoneExportState(){pendingIPhoneExports=[];exportBatchDestination=null;exportBatchLocation=null;exportBatchState='unattempted';iphoneExportStatus.textContent='';updateIPhoneExportButton();}
async function exportIPhoneTranscripts(){
    if(sharedFolderOperation||sourceSelectionRequested||transcriptionBatchActive||!pendingIPhoneExports.length)return;
    const files=[...pendingIPhoneExports];
    if(!navigator.share||navigator.canShare&&!navigator.canShare({files})){alert('File sharing is unavailable.');return;}
    sharedFolderOperation=true;updateSharedFolderControls();iphoneExportButton.disabled=true;exportBatchState='sharing';
    try{
        await navigator.share({files});exportBatchState='shared';
        iphoneExportStatus.textContent='Shared. Please verify your transcripts were saved in this folder.';
        const destination=exportBatchDestination;
        if(destination?.kind==='file-input'){
            const names=new Set(files.map(file=>file.name));
            destination.files=[...destination.files.filter(file=>!names.has(file.name)),...files.map(file=>{
                const snapshot=new File([file],file.name,{type:file.type,lastModified:file.lastModified});Object.defineProperty(snapshot,'webkitRelativePath',{value:`${destination.name}/${file.name}`});return snapshot;
            })];destination.selectionScope='selection';loadedSharedCombine=loadedSharedSearch=null;
        }
    }catch(error){exportBatchState=error.name==='AbortError'?'cancelled':'failed';iphoneExportStatus.textContent=error.name==='AbortError'?'Save canceled. Transcripts are still available.':`Save failed: ${error.message}`;}
    finally{sharedFolderOperation=false;updateSharedFolderControls();updateIPhoneExportButton();}
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
    text,
    record
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
    if (record?.timings) {
        const detail = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Timing and model diagnostics";
        const timing = document.createElement("p");
        timing.className = "settings-note";
        timing.textContent = formatTranscriptionTimings(record.timings);
        const configuration = document.createElement("p");
        configuration.className = "settings-note";
        configuration.textContent = formatWhisperDiagnostics(record.diagnostics);
        detail.append(summary, timing, configuration);
        if (record.executionId) renderWhisperExecutionReport(detail, record.executionId);
        if (record.executionPersistenceError) {
            const warning = document.createElement("p");
            warning.textContent = `Execution history unavailable: ${record.executionPersistenceError}`;
            detail.append(warning);
        }
        if (record.eligibilityPersistenceError) {
            const warning = document.createElement("p"); warning.textContent = `Eligibility review update unavailable: ${record.eligibilityPersistenceError}`; detail.append(warning);
        }
        block.appendChild(detail);
    }

    transcriptionOutput.appendChild(
        block
    );
}


// --------------------------------------------------
// Metadata processing module
// --------------------------------------------------

let metadataModulePromise = null;

async function readAudioMetadata(file,embeddedIdentity=null) {
    metadataModulePromise ||= import('./metadata.js');
    const metadataModule=await metadataModulePromise;
    return metadataModule.readAudioMetadata(file,{metadataOnly:true,embeddedIdentity});
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
