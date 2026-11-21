# Architecture and file workflows

Current-source reference, **21 November 2026**, commit **95fe938**, application **2026-11-21.10**, database **10**. This consolidates file-access and runtime/workflow guidance; it is not a new implementation or device-acceptance result.

Use [current status](CURRENT_STATUS.md) for the resume boundary, [identity and storage](Recording_Identity_and_Storage.md) for exact data responsibilities, and [tests](../tests/README.md) for verification. Original guides remain in the [dated contract archive](archive/README.md#contracts-superseded-by-current-references--21-november-2026).

## Ownership and data flow

| Responsibility | Current owner |
|---|---|
| Page orchestration, tabs, source/destination choices, batch state | [app.js](../js/app.js) |
| Shared page-session folder selection, child discovery and audio membership | [sharedFolderSelection.js](../js/sharedFolderSelection.js) |
| Browser folder/file transport and cached-text operations | [storage.js](../js/storage.js) |
| Embedded/reproducible recording inspection and metadata-only audio cache | [recordingIdentity.js](../js/recordingIdentity.js), [reproducibleRecordingIdentity.js](../js/reproducibleRecordingIdentity.js), [audioFolderCache.js](../js/audioFolderCache.js) |
| TXT metadata parsing and folder observations | [transcriptMetadata.js](../js/transcriptMetadata.js), [transcriptCatalogue.js](../js/transcriptCatalogue.js) |
| Transcribe identity orchestration | [transcriptionIdentity.js](../js/transcriptionIdentity.js); actual model processing remains in transcription/Whisper modules |
| Preferred-family selection, loaded transcript rows/editing | [combine.js](../js/combine.js), [combineUI.js](../js/combineUI.js) |
| Search/index/rendering | [Search methodology and ownership](Search_Methodology.md) |
| Document generation and mobile Combine transport | [docx.js](../js/docx.js), [html.js](../js/html.js), [combineShareExport.js](../js/combineShareExport.js) |
| Runtime identity, database ownership, Settings reporting | [runtime.js](../js/runtime.js), [database.js](../js/database.js), [settings.js](../js/settings.js), [storageManager.js](../js/storageManager.js) |

Normal flow: select audio parent → inspect immediate audio → discover transcript children → select/read current TXT → render/transcribe/search → write or explicitly share the requested output. Sidecar inventory JSON is not an intermediate requirement. **search-embeddings.json** remains the independent derived Search archive.

## Runtime identity versus access capabilities

runtime.js distinguishes operating system, device type/class and browser reporting. Capability checks are separate: an API can exist without permission, a working adapter or successful execution. A tablet's shape alone must not choose an OS implementation.

Whisper, self-test, Settings and audio controls consume shared runtime identity. Requested WebGPU/backend settings do not establish actual operator execution. See [catalogue/qualification](Whisper_Catalogue_Resolver_Contract.md) for execution/evidence authority.

Actual source behavior is capability/source-driven:
- Native directory handles permit enumeration, child-folder discovery and writes after permission.
- File-input sources supply immutable File snapshots and relative paths. They do not provide writable directory access or permission to an unselected parent.
- Desktop uses the native directory picker where available rather than an upload-style folder input. iPhone fallback confirmation and Files/share behavior are browser-controlled.
- A browser/provider may prepare or fetch a cloud file before the app can inspect it. Bounded slice requests do not prove bounded cloud transfer time.

## Shared source selection

Select Audio Folder selects one parent and inventories immediate audio. Shared discovery lists immediate transcript children; a unique transcription child is the default. Child selection rebases the relevant file-input paths and excludes deeper descendant output such as combined documents. Native enumeration can represent empty child folders; file-input discovery can represent only children supplied by the picker.

Select Transcript Folder can use an available child or a separately selected folder. Direct transcript selection cannot infer permission to a parent. Changing the audio parent resets the earlier transcript override. A canceled/failed selection retains the previous successful source where the workflow stages the change before publication.

One session selection is reused across tabs. This is not a persistent library, recursive multi-source catalogue or simultaneous multi-archive workspace. Current-source audio lookup uses Recording ID before basename; actual playback retains identity checks. Distinct/ambiguous locations are not silently resolved by matching folder names.

## Transcribe and destination handling

The source is above the transcription settings; destination controls remain below them. Model, language and operation controls stay grouped; paragraphing applies only when enabled. [Current status](CURRENT_STATUS.md#transcription-and-saving) owns the exact Enable Transcription and pending-save UI rules.

Desktop may use/create transcription, select the source destination or browse. A selected destination's current TXT supplies its collection identity; an empty one gets a session identity carried by its first TXT. Existing conflicting identities must not be silently rewritten.

An iPhone empty/new destination may be a named intended location rather than a readable/writable folder grant. The app can prepare named files and guidance; the user still chooses Files placement. It does not discover inaccessible empty folders or silently write to them.

Native TXT writing and local text caching are distinct operations. Current savePreparedTranscript writes/closes the requested TXT before updating display/cache state; a cache error is reported separately. Do not describe this as a cross-process atomic compare-and-swap or a verified whole-folder transaction. A completed text whose write fails remains available for the explicit retry path.

## Delivery and honest completion

| Artifact | Desktop/native route | iPhone/file-input route |
|---|---|---|
| New transcripts | TXT in the granted destination; local cache is separate. | Named TXT batch via a files-only share payload, with intended location shown in the app. |
| Edited transcript | Explicit save to the exact accessible target after the existing content-change checks. | Explicit replacement/export when native overwrite is unavailable; no silent original-folder write. |
| Combined TXT/DOCX/HTML | Existing output/destination controls and document generators. | Format selection and explicit file sharing through Combine transport. |
| Search embeddings archive | Existing independent index-save route. | Explicit index sharing and location guidance; no transcript/audio list accompanies it. |
| Diagnostic reports | Existing download/copy controls where supported. | File sharing for supported report routes; route-specific copy/manual alternatives remain. |

Do not assume all delivery pathways have identical fallback policy. Preserve the existing generator/transport separation and user activation for pickers/sharing.

Share success means the share flow returned, not independently verified Files placement, overwrite, sync or durable storage. Cancellation/error keeps pending artifacts available. Files-only transcript sharing avoids the extra text.txt attachment previously produced by title/text share fields. Pre-share pending messages and post-share verification messages represent different states.

## Combine, Search and exported documents

Combine folder loading replaces the current list; Search handoff supplies its selected subset. The origin box reports folder and All or Search description. Current selection/editing still includes filename-based operations. Durable cache identity does not implement multi-archive membership or retained per-source audio access.

Search reads current TXT, chooses preferred model-family records, reconciles derived vectors and retains its independent index file. [Search methodology](Search_Methodology.md) details ranking, parsing and current performance limitations. [Paragraphing methodology](Paragraphing_Methodology.md) explains why existing paragraph structure is preserved.

Existing exported documents are static readable artifacts. Standalone HTML has its own reader/audio behavior and does not inherit live app handles. Proposed collection-reference import/output metadata and persistent workspaces are in the [future Combine contract](Multi_Archive_Combine_Contract.md), not current exporter guarantees.

## Operational boundaries

No repeated archive migration, detailed TXT model backfill, audio/transcript inventory JSON rebuild or blanket cache clearing is part of the current workflow. Keep user audio/TXT and search-embeddings.json intact.

Historical picker instability, provider waits and resource interruptions are observations with their recorded limits, not proof of one common root cause. Record phase/timing/device evidence before proposing a fix.

This consolidation changes Markdown only. No model, browser regression, user archive or deployment was exercised. The [audit/disposition record](Documentation_Audit_2026-11-21.md) identifies archived originals and preservation checks.
