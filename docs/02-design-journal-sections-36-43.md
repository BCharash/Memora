# 36. Persistent Search Storage and Future Optimization

Persistent semantic storage is now implemented, but its long-term architecture remains an area for refinement.

The current design treats semantic embeddings as derived data. The transcript `.txt` files remain authoritative.

## 36.1 Current persistent representations

The active persistent Search store contains embeddings for:

    3–2 contextual representation
    5–3 contextual representation
    7–4 contextual representation
    sentence representation

Each derived record is associated with the source/transcript identity and the semantic representation used to create it.

Older experimental representations may remain in IndexedDB, but the current application does not read or regenerate them.

## 36.2 Why persistence matters

The collection used during current testing contains approximately:

    60 transcripts
    1,922 sentences

Embedding computation is much more expensive than reading the files or splitting them into sentences. Persisting embeddings therefore avoids unnecessary repeated work when the underlying transcript content has not changed.

The current implementation also invalidates/rebuilds the relevant derived data when a transcript changes, as demonstrated by correcting the Ganga transcript and observing the updated retrieval behavior.

## 36.3 Future reuse with paragraphing

The paragraphing module and Search both use MiniLM sentence embeddings.

This creates a potential future optimization:

    transcription
        ↓
    sentence splitting
        ↓
    MiniLM sentence embeddings
        ├────────→ paragraphing
        └────────→ Search index

This is not yet implemented as a shared computation path. It remains a desirable future optimization because it could avoid performing the same embedding work twice.

## 36.4 Model/version awareness

Future persistent indexes must remain aware of the semantic model and its version/revision.

A change in the embedding model should not silently mix incompatible embeddings with an existing index.

This keeps transcript files durable while allowing derived Search indexes to evolve independently.

# 37. Future Search Modes

A keyword-search mode remains a possible complementary retrieval method.

The conceptual distinction is:

    Keyword search
        exact word/phrase retrieval
        potentially chronological or alphabetical ordering

    Semantic search
        meaning/association retrieval
        relevance ordering

Keyword search would not require an embedding model and should therefore be substantially faster for exact terminology.

No keyword-search implementation is currently active.

# 38. Search Development Principles Established So Far

The Search work has established these current principles:

1. Search belongs in its own module rather than being folded into `combine.js` or paragraphing.
2. Heavy semantic indexing belongs in a Web Worker so that the browser UI remains responsive.
3. Selecting a Search Source begins indexing immediately because the selected collection is the intended search corpus.
4. MiniLM is currently fixed as the Search embedding model so retrieval experiments are not confounded by model-selection changes.
5. Semantic embeddings are derived data and may be persisted independently of the durable transcript files.
6. Active contextual retrieval uses 3–2, 5–3, and 7–4 representations.
7. The 5–3 representation is the principal contextual representation; 3–2 and 7–4 provide narrower and broader context.
8. Search results are deduplicated at the transcript level so the same transcript is not repeatedly displayed.
9. Search should hand selected transcript files to the existing Combine workflow rather than duplicating Combine functionality.
10. Search results should be evaluated against real user questions and known answers rather than only synthetic examples.
11. Retrieval quality should be separated from transcription quality when diagnosing failures.
12. Fixed global score thresholds should not be introduced until score behavior is better understood across query types.
13. Filename knowledge and later human interpretation are currently outside the semantic corpus.
14. Deterministic lexical expansion is deferred until retrieval testing shows that it is worth the added complexity.
15. Future Search changes should be incremental and should preserve the current stable baseline while each experiment is evaluated.

# 39. Current Search Status

Search is now a working experimental retrieval system rather than a placeholder.

Implemented:

- Search top-level tab;
- Search source selection;
- fixed MiniLM embedding model;
- immediate source indexing;
- persistent IndexedDB semantic storage;
- sentence-level semantic indexing;
- 3–2 contextual representation;
- 5–3 contextual representation;
- 7–4 contextual representation;
- combined multi-representation retrieval;
- transcript-level result deduplication;
- maximum 30 unique transcript results;
- paragraph/context-aware result presentation;
- sentence highlighting/supporting matches;
- semantic relevance ordering using relative rank across representations;
- transcript-file selection;
- Select all;
- Search → Combine handoff;
- Search-derived Combine title through the existing title field;
- Search Worker for responsive bulk indexing;
- progress/status reporting;
- top and bottom Collapse all controls for Search results;
- preservation of the user's approximate top/bottom viewport position when expanding from the corresponding Collapse all control.

Not yet implemented:

- dynamic score-distribution thresholding;
- deterministic lexical expansion;
- semantic indexing of filenames or later user-assigned concepts;
- keyword search;
- reuse of paragraphing embeddings by Search;
- automatic paragraphing during every transcription;
- application-level controls for changing the Search retrieval architecture;
- a revised retrieval architecture beyond the current multi-representation baseline.

The current Search implementation should be treated as the experimental baseline for retrieval-quality testing. The next changes should be driven by observed behavior across real queries rather than by adding complexity speculatively.

# 40. Development Process Reminder

The working project rule is:

> Always ask for the current version of a file before making changes.

The current file supplied by the user is authoritative for subsequent modifications. Older versions, earlier generated ZIP contents, and prior conversation copies should not be assumed to be current.

Search changes should continue to be made incrementally and should avoid disturbing the stable Transcribe and Combine workflows.

# 41. Latest Development Milestone: Settings and Storage Management

Settings was introduced as a management area rather than as another operating tab.

The design principle is:

    Operating tabs
        ↓
    perform Memora's work

    Settings
        ↓
    manages Memora

The initial Settings implementation is deliberately small and read-only. It provides visibility into browser-side storage without introducing destructive controls before the accounting has been tested.

## 41.1 Settings access and navigation

Settings is accessed through a gear button in the upper-right of the application header.

It is not included as a fourth item in the main operating-tab navigation.

The primary navigation therefore remains:

    Transcribe | Combine | Search

This avoids treating configuration and storage management as another stage in the recording/transcription workflow.

The header layout is independently positioned so that:

- the active tab's icon remains at the left;
- the Memora title/tagline remain centered;
- the Settings gear remains at the right.

The refinement preserves the previously working behavior in which the header icon changes with the active tab.

## 41.2 Initial Settings scope

The first Settings milestone is intentionally limited to information that can be reported reliably from the browser.

The initial scope is:

- browser storage usage and quota;
- IndexedDB usage;
- semantic Search-index size and entry count;
- other IndexedDB storage;
- cached model storage;
- cached model groups and file counts;
- a refresh operation that rereads the current storage state.

No deletion or cache-clearing operation was introduced in this milestone.

This follows the project's incremental-development principle: first make the storage accounting visible and trustworthy, then consider management operations.

## 41.3 Storage architecture

A separate `storageManager.js` module was introduced rather than expanding the existing `storage.js`.

The distinction is intentional.

`storage.js` remains responsible for application file/folder operations and transcript persistence.

`storageManager.js` is responsible for reporting browser-side application storage.

The storage manager currently performs read-only inspection of:

- IndexedDB stores;
- the persistent semantic Search store;
- the browser Cache API;
- `navigator.storage.estimate()`.

It does not delete, modify, or clear stored data.

This preserves the existing storage abstraction while preventing management/reporting concerns from becoming entangled with ordinary file operations.

## 41.4 Storage accounting presentation

Settings presents storage quantities using a compact form:

    size · count entries

or, where the underlying item is a cached file:

    size · count files

This makes both the amount of storage and the number of stored objects visible at the same time.

The semantic index is therefore reported as a storage size plus its number of entries.

Cached model groups are reported as a storage size plus the number of cached files.

IndexedDB transcript records are described as cached transcripts rather than as the user's transcript files. This distinction is important because the user's durable `.txt` transcripts remain external files; browser-side transcript records are a separate cache/safety layer.

## 41.5 Browser storage versus transcript files

The Settings display deliberately avoids implying that the browser's IndexedDB transcript store is the user's transcript library.

The durable transcript files continue to be the primary external source material.

The browser-side IndexedDB transcript store is a cache/safety layer used by the application, particularly for the iPhone workflow.

Therefore a browser report such as:

    Cached transcripts
    0 B · 0 entries

does not mean that the user has no transcript files. It means that no transcript records are currently present in that particular browser-side store.

This distinction should remain explicit as Settings evolves.

## 41.6 Semantic Search storage

The persistent semantic Search index is derived data.

Settings reports:

- its storage size;
- its total number of entries;
- its representation breakdown.

The active Search architecture uses:

    3–2
    5–3
    7–4
    sentence

The current Search implementation does not read or regenerate older experimental representations that may still physically exist in IndexedDB.

Settings therefore reports what is stored rather than assuming that every historical IndexedDB representation is active Search data.

## 41.7 Cached model storage

The browser Cache API can contain substantial local model data.

The Settings implementation identifies recognized model groups including:

- Whisper large-v3;
- Whisper medium;
- Whisper small;
- Whisper base;
- Whisper tiny;
- all-MiniLM-L6-v2.

Unrecognized model-like cached files are grouped as:

    Other cached model files

This category is intentionally descriptive rather than speculative. The storage manager does not guess which model a file belongs to merely because it is large or has a model-like URL.

The current implementation counts and sizes the files but does not delete them.

A future refinement may expose the exact URLs/file names represented by the "Other cached model files" group if that information is useful to the user. No such identification or deletion behavior is part of the current milestone.

## 41.8 Refresh behavior

The Settings **Refresh Storage Information** control performs a new storage report rather than merely revealing the values from the previous page load.

The refresh operation:

1. obtains the storage-manager module;
2. rereads the IndexedDB stores;
3. rereads the Cache API model assets;
4. rereads browser storage estimates;
5. rerenders the Settings report;
6. updates the report timestamp.

This makes the control useful after a model has been loaded, a cache has changed, or another application operation has altered browser storage.

## 41.9 Current observed storage scale

During initial Settings testing, the browser reported approximately:

    Browser storage used: 9.02 GB
    Browser quota:        19.02 GB

The same report showed that model caching dominated the browser-side storage, while the persistent semantic Search index was comparatively small.

The observed model-cache breakdown included approximately:

    all-MiniLM-L6-v2       21.91 MB
    Other cached files    133.47 MB
    Whisper base          424.17 MB
    Whisper large-v3        1.93 GB
    Whisper medium          4.88 GB
    Whisper small           1.37 GB
    Whisper tiny          222.35 MB

The semantic index was approximately:

    7.64 MB
    5,218 entries

These values are observations from the development browser at the time of the Settings test, not fixed application constants.

The significance of the result is architectural: local Whisper model caching can consume orders of magnitude more storage than the semantic Search index.

## 41.10 Why deletion controls are deferred

Settings could eventually provide controls for clearing:

- selected Whisper model caches;
- unused model caches;
- the semantic Search index;
- browser-side transcript safety records.

Those operations are deliberately not part of this first Settings milestone.

Deletion is materially different from reporting. A storage-management control must be precise about what will be removed, what can be rebuilt, what cannot be recovered, and whether a browser cache entry is shared by another application operation.

The current milestone therefore establishes observability before introducing destructive management.

## 41.11 Application language remains a separate Settings concern

Application/UI language remains a planned Settings capability.

It should not be confused with transcription language.

Transcription language belongs to the Transcribe workflow because it determines how Whisper processes the selected recording.

Application language belongs to Settings because it determines how Memora's own interface is presented.

The first Settings milestone does not yet implement the application-language selector.

## 41.12 Architectural rationale

The Settings milestone reinforces several existing Memora principles:

1. **Operating tabs perform work; Settings manages the application.**
2. **Storage reporting is separated from ordinary file operations.**
3. **The first management step is observation before deletion.**
4. **Derived Search embeddings remain distinguishable from durable transcript files.**
5. **Browser-side transcript records are described as cached records, not as the user's external transcript library.**
6. **Model-cache storage is treated as a significant resource that deserves visibility.**
7. **The existing tab-specific header icon behavior is preserved.**
8. **The header title remains centered while the icon and Settings gear occupy independent left/right positions.**
9. **Settings is kept small so that it does not become another operational workflow.**
10. **Future destructive controls should be introduced only after the storage model has been tested and understood.**

## 41.13 Current Settings status

Implemented and tested:

- Settings entry through the header gear;
- Settings as a management area rather than a fourth operating tab;
- centered Memora title/tagline;
- left-justified tab-specific icon;
- right-justified Settings gear;
- read-only browser storage accounting;
- IndexedDB accounting;
- semantic Search-index accounting;
- representation breakdown;
- Cache API model accounting;
- recognized Whisper/MiniLM model grouping;
- "Other cached model files" grouping;
- size plus entry/file-count presentation;
- refreshable storage information;
- no destructive storage controls.

Not yet implemented:

- application/UI language selector;
- exact per-file identification of "Other cached model files" in the Settings interface;
- selective model-cache deletion;
- semantic-index clearing/rebuilding controls;
- transcript-cache management controls.

These remain future Settings work and should be introduced incrementally.

---

# 42. Incremental UI Module Extraction and Paragraphing Responsiveness

This milestone records the first staged reduction of `app.js`. The goal is to make future edits easier to reason about by keeping feature-specific UI and state near each feature, while preserving `app.js` as the application coordinator.

## 42.1 ES module entry point

`index.html` loads `app.js` with `type="module"`. This enables explicit imports between UI modules. The application continues to initialize after the document has been parsed.

## 42.2 Search UI extraction

Search-specific state, status rendering, index-building interaction, query handling, result rendering, selection controls, and Search event listeners live in `searchUI.js`.

`app.js` initializes Search UI with the existing lazy storage/Search loaders and an explicit callback for the Search-to-Combine handoff. Combine state remains in the coordinator at that boundary; Search UI does not reach into Combine's private variables.

The domain/search-index implementation in `search.js` was not changed as part of the UI extraction.

## 42.3 Transcription recording-list extraction

`transcriptionUI.js` owns the audio recording list, metadata display, sort and collapse controls, checkbox state, empty state, and selected-recording lookup.

`app.js` retains source-folder selection and transcription orchestration. It passes metadata-reading and formatting functions into the UI module so the module does not rely on names that are private to `app.js`.

Audio capture is a separate future feature. It should use a dedicated recording module rather than expanding `transcriptionUI.js`, which is responsible for displaying and selecting existing files.

## 42.4 Combine transcript-list extraction

`combineUI.js` owns the transcript list, sort order, selection controls, collapse controls, and selected transcript state. Its API provides the selected files, sort order, and list count to `app.js`.

The module receives the existing lazy Combine loader and an explicit callback for resetting iPhone export state when the list or selection changes. File generation for TXT, DOCX, and HTML remains in `app.js` for now. Search results populate the list through the same display API.

## 42.5 Combine progress visibility

Combine status messages now identify the current stage, including loading tools, reading transcripts, generating an output format, and writing to the selected destination. This was added to identify pending operations during a reported Combine stall.

Investigation showed that the long operation occurred when **Create paragraphs** was enabled, before Combine used the output folder. The destination folder was not the cause of the delay.

## 42.6 Paragraphing worker and existing paragraphs

Paragraphing uses its dedicated `paragraphing-worker.js` to load MiniLM and embed sentences one at a time, matching the original paragraphing inference flow while keeping model work off the page's main thread. `paragraphing.js` retains the paragraph-boundary algorithm and public `paragraphize()` API used by both Transcribe and Combine. It no longer routes paragraphing through Search's `semantic.js` or `semantic-worker.js` pipeline.

The paragraphing function preserves transcripts that already contain blank-line paragraph breaks and skips model inference for them. This avoids re-embedding transcripts that were already paragraphized during transcription. Search continues to use its existing semantic worker independently.

## 42.7 Refactoring method and current status

The UI extractions are performed one at a time. After each extraction, the code boundary and cross-feature calls are reviewed, then the application is checked in the browser before moving to another module. The Search, recording-list, and Combine transcript-list flows have been reported working by the user.

The current direction is to keep `app.js` focused on application startup, cross-feature coordination, and processing workflows. Additional large extractions should retain explicit APIs and avoid moving domain algorithms as part of UI-only changes.

## 42.8 iPhone Combine export extraction

The iPhone Combine share workflow now lives in `iphoneCombineExport.js`. The module owns its format selector, share button and status display, format labels, Web Share API checks, and share error handling. `app.js` supplies the transcript count and a callback that starts Combine generation for the selected format.

Combine generation and format creation remain in `app.js`; once a generated file is ready, the coordinator passes it to the export module. The module exposes a small API for sharing, resetting UI state, and reflecting whether Combine is busy. This keeps iPhone-specific delivery separate from file generation and desktop folder writing.

## 42.9 Dedicated paragraphing worker

Paragraphing inference is isolated in `paragraphing-worker.js`. The worker uses the same MiniLM model and Transformers.js version as the original paragraphing path and processes one sentence per inference call. `paragraphing.js` communicates with that worker and keeps its existing API, so Transcribe and Combine orchestration do not change. Search remains on `semantic-worker.js` and does not share paragraphing's worker or inference requests.


# 43. Latest Development Milestone: Settings, Storage Management, and Model Visibility

The Settings area has evolved from a simple storage readout into a practical management and diagnostic area for Memora's browser-side resources. The purpose is not to expose implementation details for their own sake, but to make the application's substantial local storage and model state understandable and recoverable.

## 43.1 Settings is a management area, not an operating tab

Settings remains separate from the three primary Memora operations:

- Transcribe
- Combine
- Search

It is opened through the header gear and is intended to answer questions such as:

- How much browser storage is Memora using?
- How much of that is the semantic index?
- Which Whisper models are cached?
- Which other model assets are cached?
- Are transcripts currently stored in the iPhone recovery cache?
- What runtime is Memora using on this device?

The design deliberately keeps these questions out of the normal transcription interface.

## 43.2 Storage categories

The current Settings design separates browser storage into useful categories:

- Browser storage used
- Browser storage quota
- Semantic Index
- Whisper Models
- Other Cached Models
- Cached Transcripts
- Other Memora IndexedDB data
- Runtime information

The browser's reported overall storage usage is treated as authoritative. Individual category totals are either known byte counts or estimates and therefore are not expected to add exactly to the browser total.

## 43.3 Semantic Index management

The Semantic Index disclosure shows the persistent semantic-search representations and their approximate storage size and entry count. Individual representations can be viewed and cleared, and a **Clear All Semantic Indexes** control is available.

The Search architecture now uses the active representations 3–1, 5–2, and 7–3, with 5–2 remaining the principal in-memory representation. Older representations may still physically exist in IndexedDB from earlier experiments, but they are not part of the current active search path and are not recreated merely because they remain in storage.

This distinction is important: physical remnants of an earlier experiment are not automatically treated as part of the current Search design.

## 43.4 Whisper Models and Other Cached Models

Settings now treats Whisper model assets separately from other cached model assets while still making the relationship visible.

The user-facing Whisper model names remain:

- Tiny
- Base
- Small
- Medium
- Large

The browser cache, however, uses model/repository-oriented names such as `whisper-tiny`, `whisper-base`, `whisper-small`, `whisper-medium`, and `whisper-large-v3`. The Settings display can therefore use the friendly names in the Whisper section while showing the actual cache-oriented names in the lower-level storage reporting where useful.

Other Cached Models contains non-Whisper assets such as `all-MiniLM-L6-v2` and other model files that Transformers.js may have cached.

The Settings design therefore reflects an important distinction:

> A model selected by the user, a model repository, and the files actually present in the browser cache are related but are not the same thing.

## 43.5 Cached Transcripts as an iPhone safety layer

The Cached Transcripts section exposes the browser-side IndexedDB transcript cache. Individual cached transcripts can be cleared, all cached transcripts can be cleared, and the complete cached set can be saved through **Save Cached Transcripts**.

This recovery mechanism was already present before it was noticed during the recent Settings work. It has now been tested directly on the iPhone: selecting **Save Cached Transcripts** successfully brought up the normal iOS file/share workflow and allowed the cached transcripts to be saved.

No per-file recovery checkbox system is needed. The current design deliberately keeps recovery simple: Memora can recover the cached set, after which the user can decide which files to retain.

This establishes a useful disaster-recovery path without adding another layer of selection state to the application.

## 43.6 Refresh behavior

**Refresh Storage Information** is the single refresh mechanism. Refreshing the Settings report also returns the disclosure sections to their collapsed state. This avoids maintaining separate refresh/check controls for the same underlying information.

The Settings work also moved toward displaying actual cached Whisper-model storage/count information rather than presenting a misleading generic count of models that have merely been checked.

The intended Whisper summary is therefore conceptually:

    12.23 GB · 5 models

or, after clearing a model, the corresponding current total and model count.

The value should be derived from the actual cached Whisper model groups rather than being hard-coded.

## 43.7 Runtime reporting

Settings now records the important runtime distinction between desktop and iPhone/iPad environments. The current architecture has used different Transformers.js/runtime paths during development:

- Desktop Whisper: Transformers.js 4.0.0 with WebGPU
- iPhone/iPad Whisper: Transformers.js 3.7.2 with worker-based processing
- Semantic search: Transformers.js 3.7.2 with browser cache

This is not merely documentation. The runtime difference has become an important part of understanding why the same nominal Whisper model behaves differently on different devices.

---

