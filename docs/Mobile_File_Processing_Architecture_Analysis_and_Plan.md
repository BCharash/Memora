# Mobile File Processing Architecture: Analysis and Improvement Plan

**Prepared:** 20 October 2026  
**Scope:** Read-only analysis of the current Memora code and a staged plan for making mobile file handling more consistent and portable. No application code changes are included in this document.

## 1. Executive summary

Memora currently has several mobile file workflows, but they do not share a single application-level boundary:

- Transcribe accumulates generated transcript `File` objects and implements batch sharing in `app.js`.
- Combine creates TXT, DOCX, or HTML output and delegates the final share interaction to `iphoneCombineExport.js`, a module coupled to Combine-specific HTML controls.
- Combine transcript editing and Search transcript editing call `storage.shareFile()` to share replacement transcript files.
- Search builds and serializes its semantic index in `searchUI.js`; on a file-input/mobile source it wraps the JSON archive in a `File` and shares it through `storage.shareFile()`.
- `storage.js` provides a single-file Web Share API wrapper and the folder-selection/read/write abstraction. It does not unify the workflows' UI, batches, state, or persistence semantics.

The best improvement is not to move all feature logic into one large “mobile export service.” Instead, define a small, platform-neutral file-delivery boundary and let each feature retain ownership of preparing its artifact and deciding what success means. A reasonable initial module name is `mobileFileDelivery.js` if the module is explicitly intended to cover mobile browsers; `iPhone` is more accurate for present-day iOS-specific UI and messages, while `Mobile` is more extensible but must not imply Android has been implemented or verified.

The change should be staged. First document and standardize the existing single-file and batch share behavior. Then route the callers through a shared delivery utility. Only after that should the project consider a broader mobile file adapter for capabilities such as save pickers, downloads, or platform-specific fallbacks. Search Index creation/reindexing must remain separate from file delivery.

## 2. Current architecture and responsibilities

### 2.1 Folder selection and storage abstraction

`js/storage.js` owns browser file/folder access. `selectFolder()` uses the File System Access API when `window.showDirectoryPicker` exists; otherwise it can use a `webkitdirectory` file input and return a descriptor with `kind: "file-input"`, a name, and the selected `File` objects. Other storage methods branch on this descriptor: directory handles can be read or written directly, while selected input files are read-only snapshots.

This descriptor is an important boundary, but `kind: "file-input"` describes the mechanism rather than a platform. The code treats this mode as iPhone/iPad in feature comments and UI. It should not be equated with all mobile devices, nor should support for Android be inferred from use of browser APIs.

Relevant implementation: `js/storage.js` (`selectFolder`, `readTextFile`, `writeTextFile`, `shareFile`, `writeBinaryFile`).

### 2.2 Transcribe

Transcribe detects a file-input source and avoids direct destination writes. As each transcript is produced, `app.js` adds a text `File` to `pendingIPhoneExports`. A feature-specific button then shares the entire array with `navigator.share({ files })`, after checking for `navigator.share` and, when available, `navigator.canShare`.

The flow includes batch state and Transcribe-specific status/button text in `app.js`. It is not routed through `storage.shareFile()`, which only accepts one file. Error and cancellation behavior is also distinct: an `AbortError` is silently treated as a user cancellation, while other errors are logged and shown with an alert.

Relevant implementation: `js/app.js` (`pendingIPhoneExports`, transcript creation, `exportIPhoneTranscripts`, and the `updateIPhoneExport*` functions).

### 2.3 Combine output

`js/iphoneCombineExport.js` exports `initIPhoneCombineExportUI(...)`. It reads the Combine format selector, button, and status elements by Combine-specific HTML IDs. It updates the label and disabled state, calls the supplied `onExportRequested` callback, checks file-sharing support, calls `navigator.share({ files: [file] })`, and writes Combine-specific status messages.

`app.js` creates the output artifact: TXT, DOCX, or HTML. It passes the resulting `File` to the module's `exportFile()` method. Combine generation, sorting, paragraphing, filename handling, and format conversion remain in `app.js` and the Combine/format modules. This is a Combine UI controller plus a single-file share helper, not a general export service.

Relevant implementation: `js/iphoneCombineExport.js`; its initialization and call sites are in `js/app.js`; its controls are in `index.html` under the `iphoneCombine*` IDs.

### 2.4 Edited transcript delivery

Combine editing creates an updated text `File`. When the selected source is a file-input descriptor, `app.js` calls `storage.shareFile(updatedFile)`; otherwise it writes the text back through the directory handle. It invalidates Search state after a successful edit so stale indexed data is not used.

Search editing has a separate implementation in `js/searchUI.js`. For a file-input source, it creates a replacement transcript `File`, calls `storage.shareFile()`, replaces the matching item in the in-memory selected file list, then rebuilds the in-memory Search index for that session. For a directory handle, it writes the content directly and creates a `File` representation for reindexing.

These flows share the low-level delivery operation, but not their editing, source-update, or indexing policy. That distinction is useful and should remain explicit.

### 2.5 Search Index archive delivery

`js/searchUI.js` builds the semantic Search index and serializes its archive using the Search module. `updateSearchIndexArchive()` creates a `search-embeddings.json` `File` and calls `storage.shareFile()` for a file-input source; otherwise it writes the JSON directly to the selected folder.

Editing a transcript reindexes the current in-memory Search session and marks the archive as needing an update. The user separately invokes **Update Search Index** to deliver the JSON archive. Therefore, sharing the edited transcript and sharing the Search Index are separate artifacts and separate user actions. A file-delivery service should not take responsibility for embeddings, index validation, reindexing, archive serialization, or deciding when the archive is stale.

Relevant implementation: `js/searchUI.js` (`reindexEditedTranscript`, `updateSearchIndexArchive`, and transcript editor save handler); `js/search.js` (`serializeSearchEmbeddingsArchive`).

## 3. Dependency map

| Workflow | Artifact preparation | Current delivery mechanism | Feature-specific state / follow-up |
|---|---|---|---|
| Transcribe | `app.js` builds transcript text and `File` objects | Direct `navigator.share({ files })` from `app.js` | Pending batch, button count, Transcribe status, cancellation/error handling |
| Combine output | `app.js` plus `combine.js`, `docx.js`, `html.js` | `iphoneCombineExport.js` calls `navigator.share({ files: [file] })` | Format selector, Combine button/status, busy state |
| Combine edited transcript | `app.js` creates updated text `File` | `storage.shareFile(file)` | Search invalidation after save |
| Search edited transcript | `searchUI.js` preserves metadata and creates updated `File` | `storage.shareFile(file)` | In-memory source replacement, reindexing, index-stale status |
| Search Index archive | `searchUI.js` serializes Search module output into JSON `File` | `storage.shareFile(file)` | Archive dirty/current state, update button, status |

The repeated low-level concern is delivery of one or more `File` objects through browser capabilities. The non-repeated concerns are artifact creation, batches, UI state, session mutation, and Search consistency.

## 4. Naming and module-boundary recommendation

### 4.1 Is `iphoneCombineExport.js` too limited?

It is accurately named for what the module currently does. The *overall application capability* is broader, but the module itself is not currently the owner of Transcribe or Search exporting. Renaming the file alone would not make its responsibility universal.

### 4.2 Should the shared module say “iPhone” or “Mobile”?

- Use **iPhone** when describing confirmed platform-specific behavior, current UI copy, or Safari/iOS constraints. Current comments and status messages mention iPhone/iPad, and no Android workflow is established by this review.
- Use **Mobile** for a deliberately platform-neutral capability abstraction intended to serve mobile browsers generally. This is a design scope, not a claim that Android is supported. Support must be determined through capabilities and verified on target browsers.
- Avoid naming the general abstraction `iPhoneExportService` if it is to own only a browser capability such as sharing. “Export” can imply artifact generation or durable saving, while Web Share presents a system share sheet and may not prove that the user saved the file.

Recommended direction:

1. If only renaming the present Combine UI module, use a name such as `combineFileExportUI.js` and retain its feature-specific ownership.
2. If extracting shared delivery behavior, create a DOM-independent module named **`mobileFileDelivery.js`** (or `fileDelivery.js` if it is designed to work for desktop and mobile alike). Keep Combine UI control in a separate Combine module.
3. Prefer “delivery” or “sharing” to “export” for a utility that invokes `navigator.share`. Reserve “export” for a higher-level workflow that also owns artifact construction and export policy.

## 5. Target design principles

1. **Prepare artifacts in feature modules.** Transcribe constructs transcript files; Combine constructs combined documents; Search constructs updated transcript and index archive files.
2. **Make delivery capability-driven.** Do not infer all support from a user-agent string or the selected folder descriptor. Check the actual capability for the files to be delivered.
3. **Keep the shared delivery layer DOM-independent.** It should not look up HTML IDs, update labels, call `alert()`, manipulate Search state, or know Combine formats.
4. **Represent one-file and batch delivery deliberately.** A single-file helper should not silently become a batch API with different semantics. Define accepted inputs and capability checks clearly.
5. **Distinguish success, user cancellation, and failure.** `navigator.share()` resolving means the share flow completed; it does not reliably prove the destination or durable save. UI wording should say “shared” or “ready to save” unless the platform provides stronger confirmation.
6. **Keep direct folder writes as a separate adapter.** Directory-handle writing and share-sheet delivery are distinct destinations and should be selected by a clear storage/delivery policy.
7. **Preserve feature ownership.** The shared module delivers files; feature modules decide when delivery is offered and what application state follows.
8. **Do not claim platform support from API presence alone.** Maintain a browser/device verification matrix for the selected-folder path, file share support, batch support, cancellation, and practical file-size behavior.

## 6. Staged implementation plan

### Phase 0 — Confirm scope and behavior contract

Before editing code, record which target platforms and browsers are in scope (for example, iPhone Safari and iPad Safari first; Android browsers as a later target). Inventory exact user-facing terms, supported file types, batch limits if any, and expected cancellation semantics. Confirm whether the Transcribe batch flow is intended to preserve all generated files after a canceled share attempt.

**Deliverable:** a short capability/behavior table. Do not describe Android as supported until verified.

### Phase 1 — Define a small shared delivery contract

Create a platform-neutral utility that accepts a `File` or an explicitly documented list of `File` objects and uses Web Share capabilities. It should return a clear outcome or throw a documented error. A useful result model distinguishes at least:

- share completed;
- user canceled (`AbortError`);
- unsupported sharing;
- unsupported file payload;
- other platform/browser error.

Decide whether cancellation is returned as a normal outcome or propagated as an exception, then use that convention consistently. Keep the utility independent of DOM and feature-specific wording. Avoid adding download or File System Access fallbacks in the same first change unless those behaviors are separately designed and verified.

**Candidate module:** `js/mobileFileDelivery.js`.  
**Candidate API shape:** `canShareFiles(files)`, `shareFiles(files)`, or one `shareFiles(files)` operation with typed/structured outcomes. Exact names and result shape should follow existing project conventions after inspecting error handling and tests.

### Phase 2 — Migrate existing paths without changing feature policy

Route these paths through the shared utility while keeping each feature's current artifact and state logic:

1. Transcribe's batch of transcript files.
2. Combine's one generated TXT/DOCX/HTML file.
3. Combine's edited transcript file.
4. Search's edited transcript file.
5. Search's `search-embeddings.json` archive.

Remove duplicate Web Share API checks only after equivalent behavior is covered by the shared utility. Keep `storage.shareFile()` either as a compatibility wrapper delegating to the new utility or migrate callers and remove it; do not leave two divergent implementations indefinitely. Because `storage.js` is already the platform-access boundary, assess whether the shared utility belongs there as an exported capability or in its own module. Avoid circular dependencies.

### Phase 3 — Separate Combine UI from delivery

Refactor `iphoneCombineExport.js` so its Combine-specific role is explicit. It can continue to own the format select, button, busy state, and status UI, but should call the shared delivery utility (directly or via a callback) rather than implementing Web Share API policy itself.

Update names in `app.js` and the import path. HTML IDs such as `iphoneCombineFormatSelect` may remain feature/UI-specific; a module rename does not require changing them. If user-facing iPhone-specific controls are broadened to other mobile browsers, update labels and visibility logic deliberately rather than mechanically renaming every `iphone` identifier.

### Phase 4 — Clarify source capabilities and fallback policy

The current `file-input` descriptor represents a read-only selected-file collection, not a mobile device. Consider replacing or augmenting the implicit `kind` check with an explicit capability description, for example:

- can read selected files;
- can write to selected directory;
- can share files;
- can share multiple files;
- can select a destination or save file.

Do not add a broad abstraction prematurely. Start with the capability the workflows need, and retain the original browser objects only where necessary. Define behavior for unsupported sharing: report the limitation and preserve the generated artifact in application state when possible. Any alternative such as browser download, per-file sharing, or a save picker needs a product decision and device testing because it changes user expectations and may behave differently across browsers.

### Phase 5 — Validate on real target browsers

Validate at minimum:

- file sharing available and unavailable;
- `canShare` absent, true, and false;
- one file versus multiple files;
- TXT, DOCX, HTML, and JSON MIME types;
- user cancellation;
- non-cancellation failure;
- repeated share attempts;
- large batch/file behavior within realistic device memory limits;
- edited transcript share followed by in-session Search reindex;
- Search archive update after transcript edits;
- desktop directory-handle writes remain unaffected.

Record browser, OS version, installed/PWA versus normal browser mode, API availability, outcome, and any observed file-size constraints. Desktop success is not evidence of mobile compatibility, and one iPhone browser result is not evidence of Android support.

### Phase 6 — Update documentation and clean up

Update the historical design-journal statement that currently says the iPhone Combine workflow lives in `iphoneCombineExport.js` if ownership changes. There are two copies to review: `docs/design-journal.md` and `docs/02-design-journal-sections-36-43.md`. Preserve history accurately if the statement records an earlier architecture; otherwise add a dated follow-up describing the refactor. Search for stale filenames, initializer names, logs, comments, and platform claims.

## 7. Dependency and change-surface checklist

If the change is a **filename-only rename** of the current Combine module, expected references include:

- `js/iphoneCombineExport.js` file path;
- import in `js/app.js`;
- exported initializer name `initIPhoneCombineExportUI` if it is renamed;
- local variable name `iphoneCombineExportUI` and its call sites;
- references in `docs/design-journal.md` and `docs/02-design-journal-sections-36-43.md`.

The HTML IDs in `index.html` are looked up by the module and are Combine-specific, but do not depend on the JS filename. They only need changing if the UI scope or terminology changes.

If the change is a **shared delivery extraction**, additionally review:

- Transcribe batch handling and button/status helpers in `js/app.js`;
- Combine generation and edited-transcript save flow in `js/app.js`;
- `storage.shareFile()` in `js/storage.js` and its callers;
- Search edit and Search Index archive paths in `js/searchUI.js`;
- file-input capability decisions throughout app and storage code;
- error/cancellation messages, which currently vary by feature;
- tests or manual verification documentation (discover the project test setup before adding or changing tests).

Do not move `search-embeddings.json` serialization, semantic reindexing, transcript parsing, document formatting, or Combine sorting into the delivery module.

## 8. Risks and safeguards

- **False “saved” confirmation:** Web Share completion does not establish that the user selected Files or completed a durable save. Use accurate copy.
- **Cancellation mismatch:** Combine displays a “ready to save” status on cancellation; Transcribe leaves its batch available. Preserve or intentionally revise these behaviors.
- **Batch compatibility:** Some browsers may support sharing one file but reject a batch. Capability checks should use the actual payload, and fallback behavior should be explicit.
- **User activation constraints:** Sharing must remain tied to a valid user interaction where required by the browser. Avoid moving the share call behind long asynchronous work after the click; Combine currently generates the file after the user request, which should be verified on target browsers.
- **File lifetime and state:** Keep pending Transcribe files available after cancellation or failure unless the user starts a new batch. Search session replacement files must continue to feed reindexing after share completion.
- **Search consistency:** Delivery success and index freshness are distinct. Do not mark an archive current merely because a transcript file was shared.
- **Platform overgeneralization:** A generic module name must not become an unsupported claim that all mobile browsers or Android are covered.
- **Scope creep:** Adding download, save-picker, offline persistence, or a general export queue would materially broaden the change. Treat each as its own design and validation item.

## 9. Completion criteria

The architecture improvement is complete when:

1. All relevant file-sharing calls use one documented delivery contract.
2. Single-file and batch behavior are explicit and tested on each claimed platform.
3. Feature modules retain artifact preparation and feature-specific state responsibilities.
4. Search transcript edits still reindex the in-memory session, and the JSON archive remains a separate update action.
5. Unsupported sharing, cancellation, and failure are distinguishable and communicated accurately.
6. Desktop directory-handle writes continue to work without invoking mobile sharing.
7. Names and documentation match the actual supported platform scope.
8. No Android or general-mobile support claim is made without corresponding validation.

## 10. Handoff instructions for an implementation agent

Before coding, inspect current repository status and existing project instructions. Treat this document as architectural guidance, not authorization to expand behavior beyond the agreed target. Start by tracing all references to `navigator.share`, `navigator.canShare`, `storage.shareFile`, `file-input`, and `iphoneCombineExport`. Propose the delivery contract and target browser scope in the change summary. Implement incrementally, preserve current artifact and Search-index semantics, and verify the exact browser/device matrix that the project claims to support. Do not infer a successful Files save solely from a resolved share promise.

## Appendix: primary files reviewed

- `js/iphoneCombineExport.js`
- `js/app.js`
- `js/storage.js`
- `js/searchUI.js`
- `js/search.js`
- `index.html`
- `docs/design-journal.md`
- `docs/02-design-journal-sections-36-43.md`
