# File workflow inventory

## Current workflow addendum — 19 November 2026

Reviewed against candidate **2026-11-19.25**. This is the current overview; earlier dated inventory/acceptance below is retained for audit history.

| Workflow | Reading/reconciliation | Writable directory | File-input/iPhone |
|---|---|---|---|
| Audio Recording List | At source selection, before transcription; all immediate selected audio, known IDs reused, bounded new-file metadata, no content hashes | Save changed memora-audio-source.json and verify; complete native coverage can prune absent entries | Explicit pulsing Save Audio Recording List after reading; complete folder coverage removes absent immediate entries as of .24, while partial/skipped/error/cancelled coverage cannot prune |
| Edit/Combine Transcript File List | Shared transcriptFolder.js returns records from one root scan/read; unchanged membership/body-only edits do not dirty JSON | Save changed memora-transcript-archive.json with prior-byte check, archive lock and readback | Whole-folder coverage can prune absent transcript references; Save Transcript File List names archive/year and folder; partial/error coverage cannot prune |
| Transcribe Transcript File List | Existing append/save integration; shared full-folder reconciliation after successful TXT saves is a next stage | Append references and deliver/verify TXT through savePreparedTranscript | Choose/create named new-name archive and explicitly share JSON before transcript batch; pending callback carries archive/folder labels |
| Search | Existing transcript/embedding indexing and search-embeddings.json reconciliation | Existing embedding save path | Existing separate embedding share path; shared transcript-list reconciliation/two-JSON save action is not implemented |

Combine/Search audio playback shares appendSearchAudioControl in searchUI.js. Since .25 it shows known archive, Original Audio Folder and requested basename before the picker and in missing-file guidance. File-input/iPhone chooses files/batches; native fallback chooses the audio folder. Caches are scoped by source/archive (or selected-source object for unidentified legacy results), and bounded embedded-ID checks reject known mismatches/invalid or conflicting inspectable metadata. Legacy/absent/unsupported-container IDs retain filename matching without a verified-identity claim. This is not a full source-JSON association or multi-source resolver, and it does not alter audio, transcripts or indexes. Exact picker starting locations remain outside the web app's control.

storage.selectFolder returns a directory handle or a readable file-input descriptor with selectionScope=folder when the actual directory input was used. Coverage and writability are independent. JSONs track independent changes; transcript-list changes must not force unchanged embeddings to regenerate/save. A future batch share can group changed JSONs only if they share a destination and after real Files testing. Neither paths, share text nor title can force/verify an iPhone Files destination.

Current Transcribe/Edit/Combine transcript-list guidance uses meaningful validated archiveName or consistent header provenance plus the selected transcript folder. Rebuild each old-name archive through Edit/Combine before further Transcribe use; no automatic old-file migration/deletion. Whole-folder counter priority and broader remaining save-location guidance are not silently included. Desktop increments transcript collision suffixes; iPhone currently supplies base filenames and Files handles collisions. Detailed Whisper metadata/backfill and an added timestamp were dropped. See [current status](CURRENT_STATUS.md) for remaining work and verification limits.

Code inspection: 29 October 2026. This records existing behavior after the worker and Combine module renames; it does not authorize or implement a refactor. Both renames passed the user's testing. No new browser or device testing was performed for this inventory.

## Standalone HTML reader — source revision 47ca641

createCombinedHTML in html.js generates its own date/name sort and direction controls, text-size controls (with a CSS fallback), and Locate Audio Folder UI. Its script preserves creation-time record order until reader interaction. It first uses relative audio references, then lets the reader explicitly select a folder; directory-input fallback handles environments without a working native directory picker. Audio is matched by filename, ambiguous/previously registered basenames are not silently replaced, and selected audio uses page-local object URLs.

This exported document does not import searchUI.js or inherit the app's scoped caches/embedded-ID checks. Reader controls are not Memora collection-reference metadata, workspace persistence or document import. Source inspection during this review is not new browser/Files/audio acceptance. The latest HTML change has no distinct APP_BUILD increment, so record commit 47ca641 as well as the displayed .25 label when reproducing its behavior.

## Loading and access

`storage.selectFolder()` prefers `showDirectoryPicker({ mode: "readwrite" })`. Otherwise it uses the directory file input and returns `{ kind: "file-input", selectionScope: "folder", name, files }`. That descriptor provides readable files, not a writable folder handle. A picker rejection does not automatically retry using the fallback.

Transcription, Combine, and Search inspect source descriptors when reading files and selecting delivery paths. The variable name `isIPhoneSource` in `app.js` actually means a file-input source. These branches are not exclusively device checks: a desktop browser using the fallback can reach them. Conversely, a directory handle alone does not guarantee that subsequent writes succeed; permissions and write failures still matter.

Search audio also has its own platform-specific controls and an optional read-only directory picker for locating recordings. Those audio behaviors should remain outside a sharing refactor.

## Delivery map

| Workflow | Branch and direct-write path | Share path and owner |
|---|---|---|
| Transcription output | `app.js`: writable workflow uses `savePreparedTranscript()` and `storage.writeTextFile()` | File-input workflow collects generated `File` objects in `pendingIPhoneExports`; `exportIPhoneTranscripts()` shares the batch from its save button. |
| Combined TXT/DOCX/HTML | `app.js`: directory destination receives text or binary writes through storage helpers | File-input workflow creates the chosen format in memory; `combineShareExport.js` manages controls/status and shares one file. |
| Combine transcript edit | `app.js` callback `onSaveTranscriptEdits`: writes updated text through `storage.writeTextFile()` | File-input source shares a replacement through `storage.shareFile()`; successful completion invalidates Search state. |
| Search transcript edit | `searchUI.js`: obtains the existing file handle and writes through `createWritable()` | File-input source shares a replacement through `storage.shareFile()`, updates the session's file list, and reindexes the edited transcript. |
| Embedding archive update | `searchUI.js`, `updateSearchIndexArchive()`: writes `search-embeddings.json` into the source directory | File-input source shares that JSON through `storage.shareFile()`. Completion clears `archiveNeedsUpdate` and disables the update button. Browser-internal semantic persistence in `semantic.js` is a separate operation. |
| Execution JSON report | Desktop uses the execution-report component's blob-link download; View/Copy remain available | iOS Save report uses navigator.share with a JSON File in whisperExecutionReports.js; no link fallback after session-loss reports. Cancelling is neutral. |
| Settings cached transcript export | `settings.js`, `saveCachedTranscripts()`: if the directory picker exists, asks for a folder and writes missing filenames, leaving existing files unchanged | Without a writable folder path, constructs a batch and calls `navigator.share()` directly. This branch is capability-based rather than an iOS classifier. |

## Existing sharing contracts and differences

- `storage.shareFile(file)` checks `navigator.share` and optional `navigator.canShare` for the payload, then awaits sharing. Unsupported cases and rejected shares, including cancellation, propagate to callers.
- `combineShareExport.js` performs its own checks. It handles cancellation locally and displays a ready-to-save status. Unsupported and other failed shares also return after updating status rather than throwing. Its caller therefore cannot infer successful delivery merely from a resolved call.
- Transcription batch sharing in `app.js` performs its own checks, handles cancellation silently, and updates the saved-count status after a resolved share.
- Settings batch sharing performs its own checks; rejected sharing reaches the enclosing Settings action handler, which reports a generic operation error.

These are behavior differences to preserve during naming work and explicitly settle before consolidation. A resolved share is evidence that the share request completed, not confirmation of a particular saved destination or replacement of the original file. File-input edits deliver replacement files rather than overwriting the source on disk.

## Status and next use

Historical status reviewed 9 November 2026; use the 19 November workflow addendum above for current behavior. Runtime identification is complete for the agreed scope and canonical IndexedDB ownership passed Mac/iPhone/Windows checks. No sharing extraction/consolidation has been implemented. No file-workflow change is currently underway; runtime/database and the agreed Whisper consolidation are complete for their scopes; see [CURRENT_STATUS.md](CURRENT_STATUS.md).

This document is an overview, not an exhaustive dependency audit. Before changing a file workflow, trace its preparation, UI state, delivery, cancellation and post-save effects end to end. Before migrating callers to a shared helper, audit all affected callers. Consider extending storage's helper and extracting transcription export controls only as separate authorized changes. Keep feature controls, pending batches, archive state and reindexing with feature owners. iPhone delivery changes need an explicit device checklist.

10 November .8 follow-up: automatic eligibility-driven model-choice refresh preserves pending iPhone transcript exports rather than triggering the deliberate-model-change reset. Review/observation metadata is independent of those file payloads. The shared execution-report JSON includes related user review events; audio/transcript contents are excluded, but technical errors and user notes can contain private information.
