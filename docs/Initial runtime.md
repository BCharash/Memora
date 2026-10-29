# Initial Runtime Identification

## Updated scope and order — 29 October 2026

Progress: the iOS worker and Combine export renames have been implemented and passed the user's testing. The next read-only inventory is recorded in [File workflow inventory](File_Workflow_Inventory.md). Runtime consolidation and sharing refactors remain unimplemented. Proceed one small change at a time, pausing for the user's test results; specifically identify changes that affect iPhone paths so deployment/device testing is requested only when relevant. Do not commit or publish without instruction.

This plan now starts with a narrow naming cleanup before runtime consolidation. Updating this document does not authorize code changes. Each implementation step should remain independently reviewable, with behavior preserved unless a change is explicitly agreed.

The broader change inventory below describes possible later work, not the scope of the first rename. The model-registry and self-test overhaul remains a subsequent project governed by `Memora_Model_Registry_and_Self_Test_Architecture_Plan.md`; this groundwork does not replace its repository audit, baseline capture, or safety checkpoints.

### First step: naming only

Use the existing kebab-case worker and camelCase application-module conventions:

| Current file | Planned file | Reason |
|---|---|---|
| `js/whisper-worker.js` | `js/whisper-ios-worker.js` | Makes the original worker's iOS role explicit, including iPad. |
| `js/whisper-desktop-worker.js` | Keep unchanged | Already identifies its role consistently. |
| `js/iphoneCombineExport.js` | `js/combineShareExport.js` | Names the feature and delivery mechanism rather than implying that only iPhones can use it. |

Rename the Combine initializer from `initIPhoneCombineExportUI` to `initCombineShareExportUI` and its corresponding local references consistently. Update production worker URLs in `whisper.js`, the iOS worker URL in `whisperSelfTest.js`, the Combine import/call sites in `app.js`, and current documentation references. Historical journal entries may retain the original names as historical facts.

Preserve worker routing, worker messages, export behavior, HTML element IDs, user-visible wording, model configuration IDs, persisted evidence, and database schema. Do not extract transcription export code or consolidate sharing in this step. Verify references and module syntax, inspect the diff, and smoke-test worker loading and Combine export where browser/device access permits. A missed worker URL or import is the principal risk; the change is low risk, not risk-free. The working estimate for this narrow step is 20–40 minutes, excluding hands-on device testing.

### File loading, saving, and sharing: current ownership

The iPhone-oriented sharing workflow is used by more than Combine. Sharing is a common delivery mechanism, while file creation and interface state belong to individual features.

| Workflow | Current owner/path | What to preserve |
|---|---|---|
| Generated transcription batch | `app.js`, including `exportIPhoneTranscripts()` | Pending batch, save button/status, and multi-file sharing. |
| Generated combined TXT/DOCX/HTML | `iphoneCombineExport.js` and `app.js` | Format selection, busy/status state, and single-file sharing. |
| Updated semantic embeddings JSON | `searchUI.js` through `storage.shareFile()` for file-input sources | Export of `search-embeddings.json`; distinguish this file from browser-internal embedding persistence. |
| Edited transcript in Combine | `app.js` through `storage.shareFile()` for file-input sources | Edited-file content and the existing write-versus-share choice. |
| Edited transcript in Search | `searchUI.js` through `storage.shareFile()` for file-input sources | Edited-file delivery and subsequent session reindexing behavior. |
| Other file export | Settings also calls `navigator.share` directly | Include these callers in the inventory before designing a common helper. |

These paths are intended to support iOS Save to Files, but several are selected by `kind === "file-input"`, not device detection. A desktop browser using the read-only file-input fallback can reach the same workflow if it supports sharing. Writable directory-handle workflows must continue to write directly where supported.

An inventory must trace both load and save routes: folder selection, source descriptor, writable destination, generated or edited payload, delivery mechanism, cancellation, and UI outcome. Keep three separate inputs: device/platform for specific workarounds, browser capabilities for supported operations, and selected source/destination access for whether direct writing is possible.

### Later module ownership

After the inventory, a separate refactor may move transcription batch export controls/state from `app.js` to `transcriptionShareExport.js`, alongside `combineShareExport.js`. Feature modules should create their files and own their controls/status; `app.js` should coordinate them.

Evaluate extending `storage.shareFile()` with a multi-file helper before adding another module. A common helper should handle the actual payload's share checks, invocation, cancellation, unsupported cases, and errors with explicit outcomes. It must not treat a completed share request as proof that a user saved to a particular destination. Feature-specific messages and state stay with the feature. Migrate batch transcripts, combined exports, embedding JSON, edited files, and Settings callers deliberately, preserving each workflow. This extraction/consolidation is separate from naming and runtime detection.

## Recommendation

Yes, Memora would benefit from identifying its runtime once during application startup and exposing one consistent, read-only classification to the rest of the application. At present, platform decisions are repeated in several modules and do not use the same rules. A common startup result would make these decisions easier to find, explain, and maintain.

The proposed `pc` versus `mobile` flag should be treated as a coarse device classification, not as the authority for every feature decision. Memora's actual workflows depend on browser capabilities and on the selected source type. For example, `showDirectoryPicker`, file sharing, WebGPU, and the selected-folder `file-input` mode each describe different constraints. Those should remain explicit capability or source checks. Tablet behavior also needs a defined policy; it should not be accidentally classified as PC solely because a browser omits a mobile user-agent token.

The current application already has `js/runtime.js`, but it is a reporting utility, not a startup singleton. `settings.js` calls `getRuntimeInfo()` when rendering Settings. It reports platform, browser, device type, Whisper execution and WebGPU presence. The other modules do not use that result and instead repeat their own iOS checks. Thus this proposal is a consolidation and extension of an existing runtime module, rather than adding runtime identification from scratch.

## Current behavior and inconsistencies

- `js/runtime.js` derives platform, browser and device type from `navigator.userAgent` and `navigator.platform` each time `getRuntimeInfo()` is called. Its device classification treats `Mobi`/`Android` as Mobile before checking `Tablet`/`iPad`, and it has no Mac-with-touch iPad detection. Consequently, iPad and some tablet reports can be inaccurate. Its Whisper description also uses a different iOS test from the production Whisper module.
- `js/whisper.js` has a private iOS predicate that recognizes iPhone, iPad and iPod, plus iPadOS reporting itself as `MacIntel` with multiple touch points. This selects the iPhone/WASM worker; other environments use the desktop WebGPU worker path.
- `js/whisperSelfTest.js` repeats essentially the same iOS classification and chooses the iOS or desktop test sequence independently.
- `js/settings.js` has another iOS predicate to describe the active Whisper model configuration. It imports `getRuntimeInfo()` only for the Settings display.
- `js/searchUI.js` has an iPhone browser test for search-result audio controls and file-selection behavior. It uses iPhone/iPod and MacIntel touch detection; it is not a general mobile classification.
- `js/app.js` determines whether the selected source is `kind: "file-input"` and shows share-based Transcribe/Combine controls in that case. Several variable names and comments call this an iPhone source, even though the descriptor means that a folder was read through an HTML file input and is read-only; it does not itself establish which device selected it.
- `js/storage.js` prefers `window.showDirectoryPicker()` when present, otherwise uses the `webkitdirectory` input. It returns a directory handle or a `{ kind: "file-input", files }` descriptor. Write operations distinguish these source modes. `storage.shareFile()` wraps `navigator.share` and optional `navigator.canShare` checks.
- `js/iphoneCombineExport.js` separately checks `navigator.share`/`navigator.canShare` and owns the iPhone Combine share UI.
- `js/app.js` also implements its own batch `navigator.share({ files })` path for Transcribe. Thus share capability checks and user-facing outcomes are not centralized.
- `js/modelManager.js` contains a runtime catalog of desktop WebGPU and iPhone-labelled WASM model configurations. Model selection and compatibility policy are related to runtime, but the catalog's configuration identifiers and stored registry records also have persistence implications.
- `index.html` includes both desktop destination controls and hidden iPhone controls. `app.js` toggles them when a selected source is or is not a file-input descriptor. The document loads `js/app.js` as a module at the end of `<body>`; static HTML therefore renders before module initialization unless runtime classes/data are set earlier.
- `css/style.css` has responsive/mobile layout rules. These respond to viewport/layout needs and should remain independent of a JavaScript platform flag. A narrow desktop window and a mobile device can have similar widths but different file APIs.

## Dependencies and design decisions

### Classification inputs

The runtime initializer needs a documented set of signals for its stable classification. Existing signals include `navigator.userAgent`, `navigator.platform`, `navigator.maxTouchPoints`, and the presence of browser APIs. User-agent strings are imperfect and can be reduced or changed. iPadOS may identify itself as Mac, so touch-capable `MacIntel` must be considered if iPad is to follow the mobile path. Viewport width and CSS media queries are useful for layout, but are poor evidence of device type and should not be the primary classifier.

Choose and document whether tablets belong to `mobile`, a separate `tablet` class, or a broader touch-device category. If the requested public contract must be exactly PC/mobile, the least surprising mapping for the current workflows is mobile for iPhone/iPad/Android phones and tablets, and PC for conventional desktop browsers. A separate detailed `deviceType` can preserve distinctions without expanding the simple flag.

### Classification versus capabilities

Do not make the PC/mobile flag imply that an API exists. Keep feature checks for at least:

- Directory access: `window.showDirectoryPicker` and the `webkitdirectory` input fallback.
- File writing: directory-handle write support and the selected source's `kind`.
- File sharing: `navigator.share`, and `navigator.canShare({ files })` for the actual payload when available.
- ML acceleration: `navigator.gpu` and any runtime-specific Transformers.js/worker constraints.
- Other browser storage and processing APIs as needed (`indexedDB`, `navigator.storage.estimate`, Web Workers).

The flag can choose a default workflow or messaging where the product intentionally distinguishes broad device classes. Each operation should still check the capability it needs and report unsupported cases clearly. In particular, do not assume that all mobile browsers lack directory access, that all desktop browsers can write folders, or that every mobile browser can share every file type or batch.

### Initialization and API shape

`js/runtime.js` is the natural owner. It should calculate a single immutable runtime snapshot at module initialization (or through a one-time initializer explicitly called before application modules make runtime-dependent decisions), and export a small consistent API: for example, a detailed `runtimeInfo` object plus `isMobile`/`isPC` or `deviceClass`. Existing `getRuntimeInfo()` can remain as a compatibility accessor while callers are migrated. Prefer module exports over writing generic mutable globals onto `window`; an actual global property would create naming, mutation, and startup-order concerns without helping ES modules already in use.

The snapshot should contain distinct concepts, such as `deviceClass`, `deviceType`, `platform`, `browser`, and capability booleans. Device classification should not change when orientation or window size changes. Capabilities that can change at runtime should be queried when used or represented as live feature functions, rather than frozen as device identity. An initialization failure should safely fall back to an explicit `unknown`/conservative class rather than crash application startup.

`js/app.js` is the main application entry and imports its UI modules statically. Any module that branches during its own initialization must be able to import the already-initialized snapshot synchronously. If the HTML needs a class before first paint, a small early inline bootstrap could set a `data-device-class` attribute, but that would duplicate detection logic; prefer accepting a brief unclassified initial render unless eliminating it is a concrete requirement. CSS responsive rules need not wait for or depend on runtime classification.

## Change inventory

No code changes are made by this document. If implementation is approved later, the expected change surface is:

1. **`js/runtime.js`** — define a single classification policy; fix tablet/iPadOS handling; expose stable snapshot and simple PC/mobile accessors; preserve detailed runtime reporting; separate device identity from feature capability checks; align Whisper runtime reporting with actual selection policy.
2. **`js/app.js`** — import the shared runtime snapshot. Replace only genuine device-class decisions. Keep selected-source checks (`kind === "file-input"`) tied to storage semantics. Review the Transcribe batch-share checks and its control visibility so runtime class and actual share support are not conflated. Rename misleading local names/comments from iPhone source only where that improves accuracy.
3. **`js/whisper.js`** — remove its duplicate `isIOSDevice()` predicate and use the shared detailed platform/runtime classification for worker and model-path selection. Confirm that the current policy of iOS using the WASM worker and other systems using desktop WebGPU is intentional; a PC/mobile flag alone is too coarse to express that policy.
4. **`js/whisperSelfTest.js`** — use the same platform/runtime policy for test candidates and explanatory text, so production and diagnostics do not disagree.
5. **`js/settings.js`** — use the shared runtime snapshot for Runtime display and its self-test model configuration. Avoid a separate iOS classifier; continue querying live storage/capability data where relevant.
6. **`js/searchUI.js`** — assess the `isIPhoneBrowser()` branch for audio controls and file browsing. Use a device class only for user-interface behavior that truly depends on device class; retain API and source-mode checks for picker behavior. Avoid renaming this branch to “mobile” unless its behavior is verified for Android and tablets.
7. **`js/storage.js`** — keep folder selection, writing, and share capability checks capability-driven. Consider exposing named capability helpers if multiple callers need the same behavior, while preserving the `file-input` descriptor's meaning as a read-only source mechanism. Do not route storage decisions through `isMobile`.
8. **`js/iphoneCombineExport.js` and `js/app.js` share flow** — address duplicate file-share capability handling only if the runtime consolidation is also intended to standardize sharing. A device-class flag by itself does not centralize share policy. If a shared file-delivery abstraction is introduced, migrate single-file and batch paths deliberately and preserve feature-specific UI/state.
9. **`js/modelManager.js`** — retain existing persisted configuration identifiers during this groundwork. Review naming and any necessary migration in the later registry overhaul, accounting for IndexedDB records and prior validation results.
10. **`index.html`** — potentially add a runtime data attribute or adapt initial visibility only if there is a demonstrated first-render requirement. Existing IDs and iPhone controls can be migrated separately; the `file-input`-based behavior should not be changed merely because an element name says iPhone.
11. **`css/style.css`** — leave responsive layout based on CSS media queries. Only add device-class styling if a requirement is about platform behavior that cannot be expressed by responsive layout, and avoid duplicate visibility rules that conflict with `app.js`.
12. **Documentation and diagnostics** — update runtime architecture notes and any stale platform claims. Include classification reason/signals in Settings diagnostics if useful, without exposing unnecessary raw user-agent data beyond the existing diagnostics behavior.

## Behavior and verification dependencies

Before implementation, agree on intended handling for Windows/macOS/Linux desktop browsers, iPhone, iPad including desktop-mode user agent, Android phones, Android tablets, touch-enabled PCs, and unknown or privacy-reduced user agents. Then verify at least:

- one initialization snapshot is shared by every importing module;
- Settings, Whisper selection, and Whisper self-test report the same relevant runtime;
- iPadOS desktop-mode identification follows the chosen tablet policy;
- a narrow desktop viewport does not become mobile just because of width;
- layout continues to respond correctly through CSS independently of the runtime class;
- directory selection and writes are based on available APIs/source descriptor;
- share controls are usable only when the selected workflow and actual share capability permit them;
- missing/partial `navigator.canShare` behavior is handled consistently;
- unknown classification degrades safely;
- no stored model registry identifiers or validation metadata are unintentionally invalidated.

These checks should include real target browsers for file APIs, sharing, and Whisper execution. User-agent classification can be unit-checked with representative navigator fixtures, but browser-specific API behavior cannot be established by those fixtures alone.

## Suggested implementation sequence

1. **Rename only.** Apply the two file renames and Combine symbol updates described above. Maintain every dependency and verify that worker routing and export behavior remain unchanged.
2. **Inventory file workflows.** Trace loading, direct writing, and sharing across transcription, Combine, Search edits, semantic embedding JSON, and Settings. Record the actual source/capability/device conditions and current owners before moving logic.
3. **Centralize runtime identification.** Agree terminology and tablet mapping, preferably `desktop`, `mobile`, and explicit `unknown` to align with the larger plan. Create the synchronous immutable snapshot in `runtime.js`; migrate Whisper, self-test, and Settings first. Review Search's platform workarounds individually. Preserve the existing iOS/WASM versus non-iOS/WebGPU routing; Android becoming mobile does not imply switching it to the iOS worker. Correct runtime descriptions without claiming actual backend execution from API presence. Actual execution evidence belongs to individual runs, not immutable device identity.
4. **Refactor sharing separately.** Use the inventory to define common single/batch delivery outcomes. Consider extracting `transcriptionShareExport.js` and extending the storage sharing helper. Migrate all relevant callers in small changes, preserving feature-specific controls, direct-write paths, and cancellation behavior. This is useful cleanup, not a prerequisite for starting the registry overhaul.
5. **Validate and document each completed step.** Run checks appropriate to that change and record real-device versus simulated results. Verify supported direct-write and share workflows, including edited transcripts and embedding JSON, without bundling unrelated UI work.
6. **Begin the model-registry/self-test overhaul.** Follow its own audit and baseline stages with the shared environment foundation in place. Database ownership, configuration resolution, eligibility, and durable execution evidence remain in that project.

## Risks and limits

- A PC/mobile classification is necessarily coarse and can be wrong for unusual, privacy-reduced, remote, or hybrid environments.
- User-agent logic will need maintenance as browser identification changes; API feature detection remains more reliable for operation support.
- A mutable `window.isMobile` global can disagree with module-derived values or be overwritten; immutable module exports provide a clearer source of truth.
- Replacing iOS-specific branching with generic mobile branching could change model/runtime behavior on Android without verified support.
- Reclassifying iPad or renaming iPhone model registry IDs could affect model choice, test results, UI visibility, and persisted registry compatibility.
- Initialization-based rendering can cause a flash if the class is applied only after first paint. Avoid duplicating runtime detection in HTML unless this has been observed and matters.

