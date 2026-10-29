# File workflow inventory

Code inspection: 29 October 2026. This records existing behavior after the worker and Combine module renames; it does not authorize or implement a refactor. Both renames passed the user's testing. No new browser or device testing was performed for this inventory.

## Loading and access

`storage.selectFolder()` prefers `showDirectoryPicker({ mode: "readwrite" })`. Otherwise it uses the directory file input and returns `{ kind: "file-input", files }`. That descriptor provides readable files, not a writable folder handle. A picker rejection does not automatically retry using the fallback.

Transcription, Combine, and Search inspect source descriptors when reading files and selecting delivery paths. The variable name `isIPhoneSource` in `app.js` actually means a file-input source. These branches are not exclusively device checks: a desktop browser using the fallback can reach them. Conversely, a directory handle alone does not guarantee that subsequent writes succeed; permissions and write failures still matter.

Search audio also has its own platform-specific controls and an optional read-only directory picker for locating recordings. Those audio behaviors should remain outside a sharing refactor.

## Delivery map

| Workflow | Branch and direct-write path | Share path and owner |
|---|---|---|
| Transcription output | `app.js`: writable workflow uses `saveTranscript()` and `storage.writeTextFile()` | File-input workflow collects generated `File` objects in `pendingIPhoneExports`; `exportIPhoneTranscripts()` shares the batch from its save button. |
| Combined TXT/DOCX/HTML | `app.js`: directory destination receives text or binary writes through storage helpers | File-input workflow creates the chosen format in memory; `combineShareExport.js` manages controls/status and shares one file. |
| Combine transcript edit | `app.js` callback `onSaveTranscriptEdits`: writes updated text through `storage.writeTextFile()` | File-input source shares a replacement through `storage.shareFile()`; successful completion invalidates Search state. |
| Search transcript edit | `searchUI.js`: obtains the existing file handle and writes through `createWritable()` | File-input source shares a replacement through `storage.shareFile()`, updates the session's file list, and reindexes the edited transcript. |
| Embedding archive update | `searchUI.js`, `updateSearchIndexArchive()`: writes `search-embeddings.json` into the source directory | File-input source shares that JSON through `storage.shareFile()`. Completion clears `archiveNeedsUpdate` and disables the update button. Browser-internal semantic persistence in `semantic.js` is a separate operation. |
| Settings cached transcript export | `settings.js`, `saveCachedTranscripts()`: if the directory picker exists, asks for a folder and writes missing filenames, leaving existing files unchanged | Without a writable folder path, constructs a batch and calls `navigator.share()` directly. This branch is capability-based rather than an iOS classifier. |

## Existing sharing contracts and differences

- `storage.shareFile(file)` checks `navigator.share` and optional `navigator.canShare` for the payload, then awaits sharing. Unsupported cases and rejected shares, including cancellation, propagate to callers.
- `combineShareExport.js` performs its own checks. It handles cancellation locally and displays a ready-to-save status. Unsupported and other failed shares also return after updating status rather than throwing. Its caller therefore cannot infer successful delivery merely from a resolved call.
- Transcription batch sharing in `app.js` performs its own checks, handles cancellation silently, and updates the saved-count status after a resolved share.
- Settings batch sharing performs its own checks; rejected sharing reaches the enclosing Settings action handler, which reports a generic operation error.

These are behavior differences to preserve during naming work and explicitly settle before consolidation. A resolved share is evidence that the share request completed, not confirmation of a particular saved destination or replacement of the original file. File-input edits deliver replacement files rather than overwriting the source on disk.

## Smallest next code change

Follow the runtime plan next: first introduce the shared immutable environment API with compatibility accessors, without migrating consumers in the same change. Then migrate consumers one at a time. Review the snapshot contract against the larger registry plan; keep requested and actual execution evidence distinct from device identity.

Sharing consolidation can follow separately. Prefer evaluating a multi-file helper in `storage.js` before creating another delivery module. Define cancellation/error outcomes before migrating any caller; leave feature controls, pending batches, archive state, and reindexing with their existing feature owners. Extracting transcription controls into `transcriptionShareExport.js` is optional and should be its own change.

Each change to a shared delivery helper or its iPhone callers requires an explicit iPhone regression checklist. Documentation-only inventory needs no deployment test. No registry IDs, database schema, model routing, or delivery behavior changed in this step.
