# Memora file map

Save and editor references updated for **2026-11-24.10**, schema **10**. Production audio inventory is owned by audioFolderCache.js, transcript identities/catalogues by transcriptMetadata.js and transcriptCatalogue.js, and shared source access by sharedFolderSelection.js. The latter consumes inventory.records for ID-first playback. identityDialog.js provides shared prompts. [Save flow audit](docs/iPhone_Save_Flow_Audit.md)

The legacy audio source/manifest/recovery modules and unused sidecar helpers, writer APIs and obsolete tests/lab code are removed. Schema 10 drops only audioSourceRecovery. Existing disk JSON files remain untouched, while search-embeddings.json and every active cache/model/text/embedding store remain. [Current status](docs/CURRENT_STATUS.md#combine-and-search) governs current acceptance; dated historical notes below retain their context.

The [read-only JavaScript survey and checkpoint plan](docs/JavaScript_Survey_and_Cleanup_Plan.md) records the latest source/dependency assessment. It proposes cleanup; no implementation is authorized by the plan itself.

## The short answer about the number of files

There are **57 JavaScript files in `js/`**, including **19 whose names begin with `whisper`**. There are **46 top-level test/fixture JavaScript files under `tests/`** and no nested test JavaScript files (46 total). Test files are separate from the normal application.

Production entry points follow app.js, including lazy imports and worker-script references. Standalone inventory tools are separate from production; the earlier module groups below are not a claim that every JS file runs at startup. They support different features, not separate models. Model code and model weights are different things: importing a module does not mean loading all of its models.

The one-time archive migration is complete. Its disposable tool and tests were removed; it has no production dependency path. See the [recording identity handoff](docs/archive/2026-11-21-contracts/Recording_Identity_Handoff.md) for checkpoint 3 integration and its acceptance boundary.

The obsolete `whisper-test-worker.js` and its regression-test case have been removed. Production and self-tests share the active platform worker. Build .8 removes unused private declarations and extra arguments found across the current 57 modules; it also consolidates old transcript cache snapshots during Settings refresh. Historical exported-helper candidates below are separate from that local-declaration audit. See [cleanup findings](#cleanup-findings) before deleting anything.

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
| File saving/sharing | `js/storage.js`, then the specific workflow in `app.js`, `searchUI.js` or `combineUI.js`; see [current file workflows](docs/Architecture_and_File_Workflows.md) |
| Current limits, pending work and how to resume | [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) |

## How the main features connect

- **Transcribe:** `index.html` → `app.js`, `audioFolderCache.js`, `transcriptCatalogue.js` and `transcriptionIdentity.js` → `transcription.js` → `whisper.js` → the iOS or desktop worker. Production transcriptions reuse the loaded model while the configuration stays the same. External inventory sidecars are retired.
- **Self-test:** `settings.js` → `whisperSelfTest.js` → `whisperTestLifecycle.js` → the same platform worker. Each standalone test creates a fresh worker and ends it after the test. This repeated-load behavior is under investigation on iPhone.
- **Permission to transcribe:** canonical configurations + saved eligibility → `whisperProductionEligibility.js` → the selector and the loader. File availability/cache presence alone does not grant eligibility.
- **Combine:** `app.js` → `transcriptCatalogue.js` for TXT folder reading/local metadata, then `combineUI.js` → `combine.js` → text, HTML or Word output. `combineShareExport.js` manages the additional share/export controls. The retired transcriptFolder/transcriptArchive modules are not current dependencies.
- **Shared audio playback:** `searchUI.js` supplies Combine and Search with location guidance, scoped caches and bounded embedded-ID checks where available. Legacy filename fallback and the broader pending audio resolver remain distinct.
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
| [test.html](test.html) | Standalone parent-folder selection/access probe with nested-file report sharing; read-only production helpers, no app bootstrap/model loading or Memora storage. |
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

## Whisper and its registry — 19 Whisper files plus modelManager

### Running the model

| File | Responsibility | Status/callers |
|---|---|---|
| [whisperProductionEvidence.js](js/whisperProductionEvidence.js) | Durable production incidents, reference certificates and separate transcription/self-test stability snapshots; observations never create eligibility holds. | Eligibility bridge and review UI |
| [whisperExecutions.js](js/whisperExecutions.js) | Separate durable production journal: stages, model outcome, recovery, live ownership and bounded retention; protects unprocessed evidence before review ingestion. | Transcription and Settings |
| [whisperExecutionReports.js](js/whisperExecutionReports.js) | Shared execution/self-test View/Copy/export controls (iOS file sharing), history, and separate saved stability observations. | App and Settings |
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
| [whisperAttempts.js](js/whisperAttempts.js) | Locked self-test journal: progressive phase/cleanup evidence, frozen prior-test timing snapshots, legacy reconstruction, recovery and selected clearing. | Self-test, evidence integration and Settings |
| [whisperAttemptReport.js](js/whisperAttemptReport.js) | Self-test report projection, readable sequence/stage timeline, problem-note input and visible saved observations and summary-first JSON; preserves outcomes and missing-data provenance. | Settings |
| [whisperDiagnostics.js](js/whisperDiagnostics.js) | Reads available model-session settings and formats timing/backend diagnostics. It is distinct from the page event log. | Active workers, app output and Settings |

The tiny activity/report modules could be grouped differently later. They are not duplicate algorithms, and merging them solely to reduce file count would not simplify their responsibilities automatically.

## Combine and output documents — 5 files

| File | Responsibility | Main callers |
|---|---|---|
| [combine.js](js/combine.js) | Parses transcript records, sorts them, selects preferred model versions and combines text. | App and Search |
| [combineUI.js](js/combineUI.js) | Combine lists and editing, including Save and destination guidance tied to changes in the text. | App |
| [combineShareExport.js](js/combineShareExport.js) | Combine format and sharing controls, with named verification after sharing. Output generation and destination suggestions are connected through app callbacks. | App |
| [html.js](js/html.js) | Generates standalone combined HTML documents, including their embedded functionality. | App exports |
| [docx.js](js/docx.js) | Generates combined Word documents using an external document library. | App exports |

Standalone exported HTML has its own date/name/order and text-size controls plus explicit audio-folder locating at source 47ca641. It matches selected audio by filename and does not import the app's scoped playback/embedded-ID checks. These reader controls do not implement portable collection-reference import or workspace persistence. No fresh reader/device tests were run for this docs review.

## Search and stored embeddings — 4 files

| File | Responsibility | Main callers |
|---|---|---|
| [searchUI.js](js/searchUI.js) | Search results, shared playback fallback, full-transcript editing, match navigation and Search index saving. | App and Combine playback |
| [search.js](js/search.js) | Search indexing/ranking, keyword and semantic searches, and embedding archive serialization. | App/Search UI callbacks |
| [semantic.js](js/semantic.js) | Coordinates embedding requests and persistent semantic entries. | Search and Search UI |
| [semantic-worker.js](js/semantic-worker.js) | Runs embedding models in the background. Supports MiniLM and multilingual E5 definitions. | `semantic.js` |

## Paragraph creation — 2 files

| File | Responsibility | Main callers |
|---|---|---|
| [paragraphing.js](js/paragraphing.js) | Decides where paragraph boundaries belong; coordinates sentence embeddings. | App transcription/Combine options |
| [paragraphing-worker.js](js/paragraphing-worker.js) | Runs the sentence-embedding model used for paragraph boundaries. | `paragraphing.js` |

Search and paragraphing both can use MiniLM, but perform different jobs and own separate workers. This is a potential shared-service/resource-lifecycle design opportunity, not proof either file is disposable or the cause of the iPhone restarts.

## Recording and transcript identity

Current inventory uses audioFolderCache.js and transcriptCatalogue.js; the old sidecar workflow is removed. Standalone harnesses keep tests separate from user data.

| File | Responsibility | Main callers |
|---|---|---|
| [audioFolderCache.js](js/audioFolderCache.js) | Metadata-only audio inventory, scope association, latest snapshot persistence and actual-file verification. | Production transcription identity and Settings |
| [identityDialog.js](js/identityDialog.js) | Shared decision dialog independent of retired persistence. | App and historical identity UI |
| [reproducibleRecordingIdentity.js](js/reproducibleRecordingIdentity.js) | Embedded identity first, fixed prefix/size fallback, immutable-snapshot reuse. | Inventory, playback and tests |
| [transcriptCacheIdentity.js](js/transcriptCacheIdentity.js) | Durable full-text cache keys from existing TXT identities. | Database migration and storage |
| [recordingIdentity.js](js/recordingIdentity.js) | Bounded read-only Apple/iMuse embedded ID and provenance inspection. | Reproducible resolver, playback and tests |
| [transcriptMetadata.js](js/transcriptMetadata.js) | Universal/legacy header validation and Memora edit metadata. Retains unrelated header bytes during body edits. | App, Combine, Search and editing |
| [fileSaveVerification.js](js/fileSaveVerification.js) | Optional iPhone save verification by expected filename, contents and modification time. | Search and Combine |
| [transcriptCatalogue.js](js/transcriptCatalogue.js) | TXT-only metadata inventory, bounded local cache, existing identity preservation and empty-collection session identity. | Transcribe, Combine, Search and Settings |
| [transcriptionGate.js](js/transcriptionGate.js) | Session intent and untouched primary-tab departure state; Settings routing remains separate. | App Transcribe setup |
| [sharedFolderSelection.js](js/sharedFolderSelection.js) | Page-session folder access, child discovery and rebasing, ID-first audio lookup and known-parent save guidance. | App, Search and Combine |
| [transcriptionIdentity.js](js/transcriptionIdentity.js) | Coordinates current audio inventory, verified recording identity and TXT archive selection without sidecars. | App |


## Persistent data and Settings — 5 files

| File | Responsibility | Main callers |
|---|---|---|
| [database.js](js/database.js) | Sole owner of the Memora IndexedDB schema/open/upgrade/validation behavior. Current schema version: 10; only legacy audio recovery is removed, while current caches and full-text identities are preserved. | Storage, storage reporting and semantic store |
| [storage.js](js/storage.js) | File/folder reads and writes, file sharing with fresh user activation when needed, transcript cache and legacy model-registry record access. | App, Search, Combine, Settings and model manager |
| [storageManager.js](js/storageManager.js) | Measures storage and handles the specific clear/delete actions exposed in Settings. | App-provided Settings service |
| [settings.js](js/settings.js) | Settings content and actions: availability, testing, eligibility status, reports and storage controls. | App |
| [domDiagnostics.js](js/domDiagnostics.js) | Snapshot of document/control counts and available browser metrics for troubleshooting. Not the persistent lifecycle log. | Settings |

### What is saved where?

| Storage | Contents/owner |
|---|---|
| Memora IndexedDB | `transcripts`, `semanticEntries`, `semanticMetadata`, `modelRegistry`, `audioSourceRecovery`; schema in `database.js`. |
| Browser model caches | Downloaded model assets. Cache presence does not prove eligibility or active model memory use. |
| Local storage: `memora.whisper-production-evidence.v1.*` | Original production incidents, review decisions/user explanations, manual-reference certificates and stability notes; retained independently of clearable histories. |
| Local storage: `memora.whisper-execution.v1.*` | Normal transcription execution history: successes for 24 hours, failures/interruptions until selected clearing, active/unprocessed work protected; separate from self-test validation. |
| Local storage: `memora.whisper-attempt.v1.*` | Saved self-test reports; `whisperAttempts.js`. |
| Local storage: `memora.whisper-eligibility.v1.*` and `memora.whisper-eligibility-review.v1.*` | Qualification and older review/resolution evidence; eligibility modules. Clearing reports does not reset these decisions. |
| Local storage: `memora.runtime-diagnostics.v1.*` | Bounded diagnostic page/event records; `runtimeDiagnostics.js`. |
| User-selected files/folders and shared downloads | Original recordings, exported/edited transcripts and generated documents. Managed by the relevant file workflow. |

## Developer tests — separate from the application

There are **35 top-level HTML developer test pages**. Most import a matching `.test.js`; the isolated reconciliation lab has its own page module. Open via Live Server when a particular change calls for it; see [test instructions](tests/README.md) for isolation and limitations. Synthetic passes do not prove actual iPhone memory stability.

| Test page | What it checks |
|---|---|
| [audio-location.html](tests/audio-location.html) | Shared audio-location prompts, phone-width hints, source-scoped batch/cache reuse, identity mismatch and native fallback. |
| [transcript-folder.html](https://github.com/BCharash/Memora/blob/456fbffaec2a06e3eea2311c12f0291e977434d9/tests/transcript-folder.html) | Complete/partial coverage, manifest reconciliation, identity preservation, year-specific rebuild guidance, retries/concurrency and isolated OPFS saves. |
| [whisper-executions.html](tests/whisper-executions.html) | Production history ownership, retention, privacy, real navigation recovery and linked report controls. |
| [whisper-production-reviews.html](tests/whisper-production-reviews.html) | Durable policy/user reviews, reference recovery, ordering, stability and persistence safety in isolated fixtures. |
| [whisper-worker-failures.html](tests/whisper-worker-failures.html) | Typed actual-worker fault evidence, legacy/mismatched envelopes and self-test verdict preservation. |
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

Examples of top-level support JavaScript files are whisper-diagnostics-fixtures.js, recording-identity-fixtures.js, source-database-adapter.js, database-adapter.js, whisper-executions-fixture.js, transcription-identity-fixtures.js and whisper-loader-gate-fixture.js. Additional fixtures and test modules are described in tests/README.md. The obsolete archive-reconciliation lab JS files have been removed. tests/fixtures/whisper-registry-baseline-v2.json is an independent pre-migration snapshot; do not regenerate it from new code to disguise a mismatch.

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
| **Unused exported helpers** | `getModelCatalog()` and `loadTranscriberConfiguration()` have test consumers. `isMobile`/`isDesktop` have no other current code-text consumers; internal/dynamic callers must be checked before changing an export. See the survey plan; a missing external caller is not justification to delete its whole module. |
| **Similar embedding services** | Paragraphing and semantic search can each load MiniLM in separate workers. A shared service might reduce duplicated live resources, but this requires feature/lifecycle design and is not a safe file deletion. |
| **Potentially regroupable small modules** | Activity ownership, report presentation and diagnostic formatting are small but have different callers/responsibilities. Optional later organization work; lower priority than eliminating genuinely duplicated selection/definitions. |

Registry-versus-eligibility presentation is clarified in .23 and user-accepted. The production error audit and classification-only checkpoint are implemented in .2; durable observational history/recovery is added in .3, production eligibility/reviews and separate stability observations are implemented in .8; see [current status](docs/CURRENT_STATUS.md). Production default/compatibility selection and availability family metadata now share canonical definitions. Keep resource-stability investigation separate from cosmetic file grouping. Do not rename or merge all Whisper files in one change.

## Scope of this review

Checked the initial 41 `js/` filenames (40 remained after obsolete-worker removal; failure classification plus production history/report views plus the production review repository bring the current total to 44), exports/imports, worker creation paths, entry pages, test references and complete-file hashes, with targeted source review of overlap candidates. Followed dynamic imports and worker filenames as well as ordinary imports. The old worker filename inside a test was also checked manually and removed with the worker.

This is a static dependency/organization audit, not a fresh device test, exhaustive line-by-line proof of necessity, memory profile or guarantee of every external cached client's behavior. The initial inventory changed documentation only. Subsequent authorized cleanups removed the obsolete worker/test case and unused page-side loader/fallback branches. Build .20 identifies the latter change. Active worker files, HTML, CSS, databases, model options and configuration fingerprints are unchanged.

## Earlier model-selection checkpoint and future direction

Candidate .6 implements the audio JSON retirement and local latest-snapshot inventories; real MacBook/iPhone production acceptance is next. Family-then-filename-counter transcript priority remains agreed but unimplemented; that is separate from newest-cache-snapshot replacement. Search embeddings persist independently. Persistent multi-archive Combine/imports and recursive catalogue ownership remain future work. Use [CURRENT_STATUS](docs/CURRENT_STATUS.md) for the device checklist and limitations.

### Earlier checkpoint note

Current source uses fixed qualified family defaults, not automatic competition among passing variants. Worker failure provenance is implemented in .7 in the existing workers/classifier, with no eligibility changes; normal Mac/iPhone acceptance is next. Production-evidence ingestion/reviews are implemented in .8 through the existing bridge on failure/startup recovery; normal-use acceptance is next. The [catalogue roadmap](docs/Whisper_Architecture_and_Qualification.md#unresolved-resource-observations-and-future-work) records later candidate discovery, evaluation and explainable per-device preferred variants. These require no additional model definition source.

## Stable pause — 10 November 2026

Source .14 is accepted on Mac/iPhone; .2026-11-11.4 history controls and retention await device acceptance. Production eligibility/reviews are implemented, not an unstarted checkpoint. No further code is selected. The [current handoff](docs/CURRENT_STATUS.md) provides acceptance limits, stable-stop instructions and future priorities; the [10 November history](docs/archive/Development_Checkpoints_2026-11-10.md) preserves detailed checkpoint notes.

## Header wordmark assets

| File | Purpose |
|---|---|
| [icons/Memora.png](icons/Memora.png) | User-provided Me graphic in the central Memora wordmark; separate from the active-tab context icon. |
| [fonts/DancingScript.ttf](fonts/DancingScript.ttf) | Locally bundled variable font for the adjoining mora lettering. |
| [fonts/OFL.txt](fonts/OFL.txt) | SIL Open Font License 1.1 for Dancing Script. |
| [fonts/README.md](fonts/README.md) | Font source, unchanged-distribution note and bundled-file checksum. |

Wordmark markup/styles live in index.html and css/style.css. Tab icon switching remains in js/app.js; the new central graphic is independent of appIcon.

Self-test reporting guide: [docs/Self_Test_Timelines_and_Problem_Reports.md](docs/Whisper_Architecture_and_Qualification.md#attempts-recovery-and-timing-context). This adds no application JavaScript module or model.
