# Memora file map

Reviewed against the checkout on 9 November 2026, candidate build **2026-11-10.5**.

This guide explains which file to open and why it exists. Start with [current project status](docs/CURRENT_STATUS.md) for what we are doing next. This inventory makes no code changes.

## The short answer about the number of files

There are **43 JavaScript files in `js/`**, including **18 whose names begin with `whisper`**. There are another **21 JavaScript files under `tests/`**. Test files are separate from the normal application.

**All 43 application files have a dependency path from the main page.** They support different features; they are not 43 separate models. Model code and model weights are different things: importing a module does not mean loading all of its models.

The obsolete `whisper-test-worker.js` and its regression-test case have been removed. Production and self-tests share the active platform worker. There are also unused functions and overlapping selection/catalogue logic inside otherwise active files. See [cleanup findings](#cleanup-findings) before deleting anything.

“Active” below means current application code references the module. It does not mean every function in the module is necessary, or that every feature is used on every visit. A worker is a background program; it is not a separate browser tab.

## Where to start for a particular change

| What you want to understand or change | Start here |
|---|---|
| Overall page layout | `index.html` and `css/style.css` |
| Tabs, opening/closing Settings, transcription button and batch saving | `js/app.js` |
| Settings content, model tests and saved-report buttons | `js/settings.js` |
| Which model configurations exist | `js/whisperConfigurations.js` |
| Which qualified models appear for transcription | `js/whisperProductionEligibility.js`, then its callers in `js/app.js` and `js/whisper.js` |
| Why a model passed, failed or is withheld | `js/whisperEligibility.js` and `js/whisperEligibilityEvidence.js` |
| Running a reference test, cancellation and deadlines | `js/whisperSelfTest.js` and `js/whisperTestLifecycle.js` |
| Model disposal acknowledgement | `js/whisperDisposal.js` and the two active Whisper workers |
| Investigating a page restart | `js/runtimeDiagnostics.js` and the exported test report |
| IndexedDB schema and upgrades | `js/database.js` |
| File saving/sharing | `js/storage.js`, then the specific workflow in `app.js`, `searchUI.js` or `combineUI.js`; see [file workflow inventory](docs/File_Workflow_Inventory.md) |
| Current limits, pending work and how to resume | [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) |

## How the main features connect

- **Transcribe:** `index.html` → `app.js` → `transcription.js` → `whisper.js` → the iOS or desktop worker. Production transcriptions reuse the loaded model while the configuration stays the same.
- **Self-test:** `settings.js` → `whisperSelfTest.js` → `whisperTestLifecycle.js` → the same platform worker. Each standalone test creates a fresh worker and ends it after the test. This repeated-load behavior is under investigation on iPhone.
- **Permission to transcribe:** canonical configurations + saved eligibility → `whisperProductionEligibility.js` → the selector and the loader. File availability/cache presence alone does not grant eligibility.
- **Combine:** `app.js` + `combineUI.js` → `combine.js` → text, HTML or Word output. `combineShareExport.js` manages the additional share/export controls.
- **Search:** `searchUI.js` + `search.js` → `semantic.js` → `semantic-worker.js` for meaning-based search. Keyword search is also implemented in `search.js`.
- **Paragraphs:** `paragraphing.js` → `paragraphing-worker.js`. This is a separate feature from speech recognition.

## Pages and supporting folders

| File/folder | Purpose |
|---|---|
| [index.html](index.html) | Main application: Transcribe, Combine, Search and Settings. Loads `js/app.js`. |
| [css/style.css](css/style.css) | Application appearance, spacing, controls and responsive layouts. |
| [manifest.json](manifest.json) | Web-app installation metadata and icons. It is not a model registry or cache manager. |
| `icons/` and `favicon.ico` | App/tab icons. |
| `data/whisper-test/` | The fixed test recording and expected transcript used to measure accuracy. Changing these changes test identity. |
| [webgpu-test.html](webgpu-test.html) | Standalone WebGPU probe with inline JavaScript. Does not run Whisper or qualify models. Not part of normal startup. |
| [tests/](tests/README.md) | Isolated developer checks and their HTML runners. |
| [docs/](docs/README.md) | Current handoff, plans and feature documentation. |
| [docs/archive/](docs/archive/README.md) | Historical documentation. Not the current work queue. |

The discarded worker-reuse lab is absent. There is no `whisper-reuse-test.html` in the current checkout. The Vite experiment is also absent; this remains the source-file/Live Server and GitHub Pages main/root workflow.

## Application foundation — 4 files

| File | Plain-language responsibility | Main callers |
|---|---|---|
| [app.js](js/app.js) | Main coordinator. Connects page controls to features, manages tabs/Settings visibility, transcription batches, file destinations and exports. Large file, but actively used. | `index.html` |
| [runtime.js](js/runtime.js) | Shared device/OS identity and browser capability observations. API presence is not proof of successful execution. | App features, Settings and Whisper selection/testing |
| [build-info.js](js/build-info.js) | Human-readable build label. Does not control IndexedDB or model versions. | App footer, reports and diagnostics |
| [runtimeDiagnostics.js](js/runtimeDiagnostics.js) | Small persistent page/event log for investigating restarts, Settings navigation and worker lifecycle. | App, Settings, Whisper loader and self-test |

## Transcription workflow — 4 files

| File | Plain-language responsibility | Main callers |
|---|---|---|
| [transcriptionUI.js](js/transcriptionUI.js) | Displays recordings and lets the user select files for transcription. | `app.js` |
| [transcription.js](js/transcription.js) | Runs one recording through metadata reading, decoding, model loading and transcription. Collects timing and prevents overlap with a self-test. | `app.js` |
| [audioProcessor.js](js/audioProcessor.js) | Decodes audio and resamples it to the format Whisper expects. | Production transcription and self-test |
| [metadata.js](js/metadata.js) | Reads recording metadata, including supported audio-container details. | Transcription and app export/record handling |

## Whisper and its registry — 18 Whisper files plus modelManager

### Running the model

| File | Responsibility | Status/callers |
|---|---|---|
| [whisperExecutions.js](js/whisperExecutions.js) | Separate durable production journal: stages, model outcome, recovery, live ownership and bounded retention; no eligibility changes. | Transcription and Settings |
| [whisperExecutionReports.js](js/whisperExecutionReports.js) | Shared technical report/Copy/Download controls and Settings execution history. Reads the same record used by a completed result. | App and Settings |
| [whisperFailures.js](js/whisperFailures.js) | Pure shared failure descriptions and boundary annotations; preserves unknown cause. No storage or eligibility mutation. | Production workflow and parent loader; contract tests |
| [whisper.js](js/whisper.js) | Page-side production loader/transcriber. Checks eligibility, communicates with the selected worker and reuses a loaded model. | Active: transcription, Settings resource clearing, self-test preparation |
| [whisper-ios-worker.js](js/whisper-ios-worker.js) | Actual iPhone/iPad model execution using Transformers.js 3.7.2. Supports loading, transcription and disposal acknowledgement. | Active: production and self-test |
| [whisper-desktop-worker.js](js/whisper-desktop-worker.js) | Actual desktop model execution using Transformers.js 4.0.0 and requested WebGPU. Supports the same operations. | Active: production and self-test |

The iOS and desktop workers are intentional platform variants, not interchangeable copies: library versions, requested backend, messages and options differ. Sharing their implementation would require a deliberate compatibility change.

### Definitions and eligibility

| File | Responsibility | Main callers |
|---|---|---|
| [whisperConfigurations.js](js/whisperConfigurations.js) | Canonical configuration list: model repositories, variants, defaults, platform policy, worker revisions and fingerprinting. Owns shared exact-ID/family/default selection used by production, plus an async fingerprinting resolver wrapper. | Registry projection, self-test choices, eligibility and production gate |
| [whisperProductionEligibility.js](js/whisperProductionEligibility.js) | Selects the correct canonical configuration and admits only currently eligible models for production. Rechecks at loading time. | `app.js`, `whisper.js` |
| [whisperEligibility.js](js/whisperEligibility.js) | Rules and storage for eligibility: qualified, unverified, needs validation, suspended or failed. | Evidence integration |
| [whisperEligibilityEvidence.js](js/whisperEligibilityEvidence.js) | Builds exact test identity, hashes the fixture, imports test outcomes and handles older review records. This connects reports to eligibility rules. | Production gate, self-test and Settings |
| [modelManager.js](js/modelManager.js) | Registry projection/persistence and repository/cache availability reporting for Settings. Its family availability projection now derives from canonical definitions. | Settings and self-test option projection |

These are different questions: **definition** = what model/configuration is requested; **availability** = can its files be found; **eligibility** = has the exact context qualified. The older IndexedDB registry and newer eligibility records are separate systems today. Settings now displays current eligibility as the authority; old registry validation is retained in collapsed historical disclosures.

### Running and checking a self-test

| File | Responsibility | Main callers |
|---|---|---|
| [whisperSelfTest.js](js/whisperSelfTest.js) | Connects real fixtures, worker selection, test lifecycle, persistent attempts, eligibility and diagnostics. | Settings |
| [whisperTestLifecycle.js](js/whisperTestLifecycle.js) | Test controller: stage deadlines, cancellation, worker messages, accuracy verdict and cleanup. Dependencies can be replaced for failure tests. | Self-test and synthetic test harnesses |
| [whisperActivity.js](js/whisperActivity.js) | Small per-page ownership lock so production transcription and self-test do not overlap. Not a cross-tab memory manager. | Transcription and self-test |
| [whisperValidation.js](js/whisperValidation.js) | Shared text normalization, word error rate (WER) and the inclusive 15% accuracy threshold. | Test controller and Settings formatting |
| [whisperDisposal.js](js/whisperDisposal.js) | Waits up to five seconds for a matching disposal acknowledgement. The controller still terminates afterward. | Self-test cleanup |

### Keeping and displaying evidence

| File | Responsibility | Main callers |
|---|---|---|
| [whisperAttempts.js](js/whisperAttempts.js) | Saves started/stage/finished test records, recovers interrupted attempts, retains history and clears completed reports. | Self-test, evidence integration and Settings |
| [whisperAttemptReport.js](js/whisperAttemptReport.js) | Small presentation adapter that corrects misleading provisional status in old report copies without rewriting stored evidence. | Settings |
| [whisperDiagnostics.js](js/whisperDiagnostics.js) | Reads available model-session settings and formats timing/backend diagnostics. It is distinct from the page event log. | Active workers, app output and Settings |

The tiny activity/report modules could be grouped differently later. They are not duplicate algorithms, and merging them solely to reduce file count would not simplify their responsibilities automatically.

## Combine and output documents — 5 files

| File | Responsibility | Main callers |
|---|---|---|
| [combine.js](js/combine.js) | Parses transcript records, sorts them, selects preferred model versions and combines text. | App and Search |
| [combineUI.js](js/combineUI.js) | Combine lists, selection, editing and associated controls. | App |
| [combineShareExport.js](js/combineShareExport.js) | Controls the Combine share/export workflow. Actual output generation/saving remains connected through app callbacks. | App |
| [html.js](js/html.js) | Generates standalone combined HTML documents, including their embedded functionality. | App exports |
| [docx.js](js/docx.js) | Generates combined Word documents using an external document library. | App exports |

Standalone exported HTML needs its own embedded behavior; it is not simply another copy of the live application's UI.

## Search and stored embeddings — 4 files

| File | Responsibility | Main callers |
|---|---|---|
| [searchUI.js](js/searchUI.js) | Search controls/results, playback, editing and search-file workflows. | App |
| [search.js](js/search.js) | Search indexing/ranking, keyword and semantic searches, and embedding archive serialization. | App/Search UI callbacks |
| [semantic.js](js/semantic.js) | Coordinates embedding requests and persistent semantic entries. | Search and Search UI |
| [semantic-worker.js](js/semantic-worker.js) | Runs embedding models in the background. Supports MiniLM and multilingual E5 definitions. | `semantic.js` |

## Paragraph creation — 2 files

| File | Responsibility | Main callers |
|---|---|---|
| [paragraphing.js](js/paragraphing.js) | Decides where paragraph boundaries belong; coordinates sentence embeddings. | App transcription/Combine options |
| [paragraphing-worker.js](js/paragraphing-worker.js) | Runs the sentence-embedding model used for paragraph boundaries. | `paragraphing.js` |

Search and paragraphing both can use MiniLM, but perform different jobs and own separate workers. This is a potential shared-service/resource-lifecycle design opportunity, not proof either file is disposable or the cause of the iPhone restarts.

## Persistent data and Settings — 5 files

| File | Responsibility | Main callers |
|---|---|---|
| [database.js](js/database.js) | Sole owner of the Memora IndexedDB schema/open/upgrade/validation behavior. Current schema version: 5. | Storage, storage reporting and semantic store |
| [storage.js](js/storage.js) | File/folder reading/writing/sharing, transcript cache and legacy model-registry record access. | App and model manager |
| [storageManager.js](js/storageManager.js) | Measures storage and handles the specific clear/delete actions exposed in Settings. | App-provided Settings service |
| [settings.js](js/settings.js) | Settings content and actions: availability, testing, eligibility status, reports and storage controls. | App |
| [domDiagnostics.js](js/domDiagnostics.js) | Snapshot of document/control counts and available browser metrics for troubleshooting. Not the persistent lifecycle log. | Settings |

### What is saved where?

| Storage | Contents/owner |
|---|---|
| Memora IndexedDB | `transcripts`, `semanticEntries`, `semanticMetadata`, `modelRegistry`; schema in `database.js`. |
| Browser model caches | Downloaded model assets. Cache presence does not prove eligibility or active model memory use. |
| Local storage: `memora.whisper-execution.v1.*` | Normal transcription execution history, 20 terminal records plus active work; separate from self-test validation. |
| Local storage: `memora.whisper-attempt.v1.*` | Saved self-test reports; `whisperAttempts.js`. |
| Local storage: `memora.whisper-eligibility.v1.*` and `memora.whisper-eligibility-review.v1.*` | Qualification and older review/resolution evidence; eligibility modules. Clearing reports does not reset these decisions. |
| Local storage: `memora.runtime-diagnostics.v1.*` | Bounded diagnostic page/event records; `runtimeDiagnostics.js`. |
| User-selected files/folders and shared downloads | Original recordings, exported/edited transcripts and generated documents. Managed by the relevant file workflow. |

## Developer tests — separate from the application

There are **17 HTML test runners**. Each imports its matching `.test.js` file. Open via Live Server when a particular change calls for it; see [test instructions](tests/README.md) for isolation and limitations. Synthetic passes do not prove actual iPhone memory stability.

| Test page | What it checks |
|---|---|
| [whisper-executions.html](tests/whisper-executions.html) | Production history ownership, retention, privacy, real navigation recovery and linked report controls. |
| [whisper-failures.html](tests/whisper-failures.html) | Injected stage/source classification and actual workflow attribution without model runs. |
| [database.html](tests/database.html) | Schema creation/upgrades and failure cases in temporary databases. |
| [database-integration.html](tests/database-integration.html) | Application modules working with an isolated database fixture. |
| [runtime-diagnostics.html](tests/runtime-diagnostics.html) | Persistent page/event logs, navigation and instrumentation isolation. |
| [whisper-configurations.html](tests/whisper-configurations.html) | Canonical definitions, legacy projection parity, fingerprints and resolver policy. |
| [whisper-lifecycle.html](tests/whisper-lifecycle.html) | Deadlines, cancellation, worker errors, cleanup and ownership. |
| [whisper-validation.html](tests/whisper-validation.html) | WER, invalid output and accuracy presentation. |
| [whisper-settings.html](tests/whisper-settings.html) | Settings controls, adaptive Test/Retest and report/recovery behavior. |
| [whisper-diagnostics.html](tests/whisper-diagnostics.html) | Model-session/timing diagnostics and worker protocols. |
| [whisper-attempts.html](tests/whisper-attempts.html) | Durable report history, interruption recovery, retention and clearing. |
| [whisper-eligibility.html](tests/whisper-eligibility.html) | Qualification rules and separate evidence storage. |
| [whisper-evidence.html](tests/whisper-evidence.html) | Exact-context evidence ingestion, manual recovery and legacy reviews. |
| [whisper-production-eligibility.html](tests/whisper-production-eligibility.html) | Which configurations can enter production. |
| [whisper-production-selector.html](tests/whisper-production-selector.html) | Selector empty state, updates and active-batch protection. |
| [whisper-loader-gate.html](tests/whisper-loader-gate.html) | Loader guard and prevention of repository/dtype override bypasses. |
| [whisper-disposal.html](tests/whisper-disposal.html) | Disposal handshake, deadlines and mandatory termination fallback. |

The other four test JavaScript files are support fixtures: [whisper-executions-fixture.js](tests/whisper-executions-fixture.js), [database-adapter.js](tests/database-adapter.js), [whisper-loader-gate-fixture.js](tests/whisper-loader-gate-fixture.js) and [whisper-diagnostics-fixtures.js](tests/whisper-diagnostics-fixtures.js). They replace dependencies during tests. `tests/fixtures/whisper-registry-baseline-v2.json` is an independent pre-migration snapshot; do not regenerate it from new code to disguise a mismatch.

## Cleanup findings

No complete JavaScript files are byte-for-byte identical. That does **not** mean there is no overlapping logic.

| Finding | Evidence and recommended next action |
|---|---|
| **Legacy duplicate worker — removed** | `whisper-test-worker.js` and its obsolete diagnostics case were removed. Active iOS/desktop worker coverage remains. Older cached pages using the historical filename need a refresh to the current app. |
| **Unused page-side loader — removed in .20** | Removed `loadTransformers()` and its cached `transformers` variable from `whisper.js`. Active workers retain their own library loading. |
| **Old page-thread fallbacks — removed in .20** | Removed unreachable direct pipeline execution/disposal branches. Active iOS/desktop worker loading, reuse, messages and termination are unchanged; unexpected worker state now reports an explicit error. |
| **Production selection — shared core in .21** | Production gate and async resolver now use the same canonical exact-ID/family/default selector and platform compatibility checks. Self-test now calls the same catalogue list API (.22). Its historical non-iOS menu fallback is an explicit list-only option; production/resolver compatibility stays strict. |
| **Separate family catalogue — derived in .21** | `modelManager.js` now projects family labels/repositories and Large's mixed-precision readiness fields from canonical definitions. Unused preferredDtype hints were removed. Legacy generic ONNX-pair availability checks are preserved; exact per-configuration readiness would be a separate behavior change. |
| **Two model/evidence representations** | Legacy IndexedDB registry validation and newer local eligibility coexist. Display meaning is clarified in .23: current eligibility is authoritative, older registry validation is historical. Both stores and their evidence remain intact. |
| **Unused exported helpers** | `getModelCatalog()` has no caller found; `isMobile`/`isDesktop` have no current consumers. `loadTranscriberConfiguration()` is currently exercised by a loader test, not an app caller. These are function-level cleanup candidates, not reasons to delete their modules. |
| **Similar embedding services** | Paragraphing and semantic search can each load MiniLM in separate workers. A shared service might reduce duplicated live resources, but this requires feature/lifecycle design and is not a safe file deletion. |
| **Potentially regroupable small modules** | Activity ownership, report presentation and diagnostic formatting are small but have different callers/responsibilities. Optional later organization work; lower priority than eliminating genuinely duplicated selection/definitions. |

Registry-versus-eligibility presentation is clarified in .23 and user-accepted. The production error audit and classification-only checkpoint are implemented in .2; durable observational history/recovery is added in .3, while eligibility feedback remains separate; see [current status](docs/CURRENT_STATUS.md). Production default/compatibility selection and availability family metadata now share canonical definitions. Keep resource-stability investigation separate from cosmetic file grouping. Do not rename or merge all Whisper files in one change.

## Scope of this review

Checked the initial 41 `js/` filenames (40 remained after obsolete-worker removal; failure classification plus production history/report views bring the current total to 43), exports/imports, worker creation paths, entry pages, test references and complete-file hashes, with targeted source review of overlap candidates. Followed dynamic imports and worker filenames as well as ordinary imports. The old worker filename inside a test was also checked manually and removed with the worker.

This is a static dependency/organization audit, not a fresh device test, exhaustive line-by-line proof of necessity, memory profile or guarantee of every external cached client's behavior. The initial inventory changed documentation only. Subsequent authorized cleanups removed the obsolete worker/test case and unused page-side loader/fallback branches. Build .20 identifies the latter change. Active worker files, HTML, CSS, databases, model options and configuration fingerprints are unchanged.
