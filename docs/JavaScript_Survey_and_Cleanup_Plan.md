# JavaScript survey and staged cleanup plan

**Assessment recorded 21 November 2026**, source **886ab1a**, application **2026-11-21.11**, database **10**. The user requested a read-only survey followed by documentation of findings/checkpoints. **This document does not authorize or implement code changes.** Only documentation is changed at this checkpoint.

The source survey covered all 57 modules in js/, local imports/lazy imports/worker references, the 46 test/fixture JS files and two Node runners. It used source/dependency/reference inspection; no runtime, model, memory or device tests were executed. The [user memory handoff](Memora_Whisper_Memory_Handoff.md), application data and source remain unchanged.

## Overall assessment

The file count is not itself evidence of excessive architecture. Most modules have active, distinct responsibilities. The largest maintainability costs are mixed responsibilities, duplicated state-sensitive workflows, unclear names and obsolete tooling.

| Baseline | Finding |
|---|---|
| js/ modules | 57, approximately 763,448 bytes / 18,280 source lines. These are source-size observations, not runtime memory measurements. |
| Production-referenced modules | 54, following app imports, lazy imports and worker/script references; not a claim that all execute at startup. |
| Standalone diagnostic modules | archiveFolderAccess.js, audioInventory.js and audioInventoryTest.js; used by retained diagnostic pages/tests, not dead production code. |
| Whisper-prefixed modules | 19; separate definitions, lifecycle, evidence, production policy, reports and workers. Count alone does not justify merging them. |
| Local import graph | No cycles detected in the inspected graph. This is not a formal proof about arbitrary dynamic loading or callback/state interactions. |
| Tests/tooling | 46 top-level JS fixtures/tests and 2 MJS runners. Existing test aliases and obsolete runner routes require separate treatment. |

A substantial reduction in file count is not an acceptance criterion. Extracting a coherent controller can increase file count while reducing coupling. File moves/renames do not establish lower RAM use or faster iPhone execution.

## Large modules and responsibility concentration

| Current file | Lines | Why review it |
|---|---:|---|
| [searchUI.js](../js/searchUI.js) | 2,642 | Query orchestration, passage/transcript ranking, rendering, editing, shared audio playback and index delivery are combined. |
| [app.js](../js/app.js) | 2,287 | Page bootstrap, source/destination state, gate, pending artifacts, transcription, Combine and export orchestration. |
| [settings.js](../js/settings.js) | 1,314 | Storage categories/deletion, model controls, test rendering, histories/reviews and reporting. |
| [search.js](../js/search.js) | 1,305 | TXT/index preparation, derived archive compatibility, lexical retrieval and semantic scoring. |

These four files contain **7,548 lines, 41.3%** of js/. Line count is a guide to inspection, not complexity: dense modules such as audioFolderCache.js carry substantial policy in relatively few lines. Format/readability improvements should be separate from behavior changes when practical.

## Concrete findings and confidence

### Confirmed obsolete tooling

- [run-archive-reconciliation.mjs](../tests/run-archive-reconciliation.mjs) targets removed lab checks and a removed HTML page. It is not a usable current runner.
- [run-recording-identity.mjs](../tests/run-recording-identity.mjs) still accepts --source/--persistence routes for removed source identity/persistence suites.
- Current runner support does not cover every existing HTML suite. The [test guide](../tests/README.md) deliberately lists its supported subset.
- transcription-identity.html is an entry alias for the current catalogue suite, not another independent test count. Do not remove a working alias merely because it is not a separate implementation.

These are low-risk cleanup starting points once implementation is approved. Retire broken routes explicitly; do not redirect them silently to a different test and report success.

### Shared logic with actual consolidation value

1. **Search transcript hashing:** search.js and semantic.js duplicate the source/text hash payload construction. A shared pure owner can prevent drift. Preserve serialized field ordering, null/omission behavior and the intentional audioSourceId:null compatibility slot; matching function names alone is not proof that all source-key/hash functions are interchangeable.
2. **Audio playback:** reusable controls and resolution currently live in searchUI.js but are supplied to Combine by app.js. Give this shared behavior a clear owner with explicit current source access, rather than making it appear to belong only to Search.
3. **Transcript editing:** Search and Combine have separate editor/save/reindex workflows. Shared exact-target/content-conflict rules are valuable; view-specific rendering and index state need not be forced into one large component.
4. **Storage boundaries:** storage.js mixes browser filesystem transport, full-text cache writes and registry persistence. storageManager.js handles inspection/deletion across browser stores/caches. Clarify those owners before renaming files or creating another database layer.
5. **Container helpers:** metadata.js and recordingIdentity.js overlap in container reading while serving different metadata versus authoritative identity purposes. A shared low-level bounded reader may be useful later; merging the policies blindly risks identity/performance regressions.

Prioritize shared identity/state-sensitive logic over tiny generic formatting helpers. A five-line helper appearing twice is not necessarily a reason for another module.

### Exports are candidates, not automatic deletions

Some exported names lack another current code-text consumer, including runtime's isMobile/isDesktop, modelManager's updateModelRegistryRecord and Search's clearSearchIndex. Others are used inside their declaring module and may only need their export status reviewed.

Do not delete implementations just because they have no external reference:
- getModelRank, classifyRuntime and cacheTranscriptMetadata have internal uses.
- getModelCatalog and loadTranscriberConfiguration have test consumers, despite older file-map statements.
- paragraphizeTranscript has no current external code-text consumer but is a documented complete-TXT utility with plausible future value; retain or explicitly review it.
- Dynamic callbacks, lazy namespace access, test import maps and HTML entry scripts count as consumers.
- A rendered control must retain an actual action/renderer path. The recent registry-cache View failure demonstrates why checking button presence or static symbol use is insufficient.

A future removal needs an exact consumer/API decision and a meaningful regression check. This survey does not prove every public export is unnecessary or every dynamic reference was captured.

### Names worth improving

These are proposed directions, not an approved rename manifest.

| Current name | Possible clearer name / boundary |
|---|---|
| metadata.js | audioMetadata.js: it reads audio metadata, not generic transcript metadata. |
| recordingIdentity.js | embeddedRecordingIdentity.js: distinguish container identity reading from reproducible fallback. |
| docx.js / html.js | docxExport.js / htmlExport.js: make export responsibility explicit. |
| semantic.js | embeddingService.js, after deciding its worker/store responsibilities. |
| storage.js | Separate file access, cached transcript and registry persistence responsibilities first; one replacement name would still hide mixed work. |
| transcriptionIdentity.js | A source/destination-session name may be clearer than implying it is the low-level identity algorithm. Review actual public API before renaming. |
| transcriptCatalogue.js | A transcript-folder/metadata name may clarify its TXT-read/cache role. Avoid reusing a retired sidecar module name without an explicit contract. |

Keep descriptive existing names such as database.js, transcriptMetadata.js and reproducibleRecordingIdentity.js unless evidence justifies change. Cosmetic uniformity is lower priority than ownership.

### What should remain distinct

- Canonical model definitions, qualification reducer, evidence bridge, incident store, test lifecycle, production history and reporting. They have different authorities/lifecycles.
- Desktop and iOS worker entry points. Their paths participate in declared configuration fingerprints and are referenced by both production and self-tests.
- Authoritative recording identity versus derived folder metadata versus full-text cached transcripts.
- Readable export generation versus file/share transport.
- Search relevance/ranking versus result presentation/overlap/highlighting.
- Standalone diagnostic probes. They provide independent evidence and should not be deleted merely because production does not import them.
- HTML's standalone reader behavior, which does not inherit the live app's handles/import environment.

Separate MiniLM workers for paragraphing and Search are a resource/lifecycle question, not a safe module-merging exercise. No memory claim or shared-worker implementation is authorized here. Keep the memory handoff's feasibility-first boundary.

## Preservation and invariants for every implementation checkpoint

- Start with Git status and the exact source revision; preserve unrelated user changes.
- Preserve TXT/audio identities and body content, raw/legacy compatibility and current cache/schema data. No routine reset, archive rewrite or migration revival.
- Preserve Search embeddings, serialized hash bytes and representation/model compatibility unless a separate reviewed data change is intended.
- Keep worker entry URLs, configuration fingerprints, loader options, fixture/protocol identity, WER and eligibility semantics stable for structural cleanup.
- Preserve native versus file-input differences, permission/cancel rollback, pending artifact state, iPhone files-only sharing and truthful post-share messages.
- Preserve All/Search origin, current selection, sorting, editing/conflict checks and source-specific playback.
- Protect research, validation artifacts and the user memory handoff. This is not a Vite/offline/dependency conversion.
- Each batch is independently reviewable and has a clear stop point. No commit/push/deployment is implied. After a checkpoint is authorized, routine choices within that scope do not require repeated approval.
- Run relevant tests once changes justify them. Do not rerun real model stress tests or broaden testing without a reason. Static/fixture/device evidence remain distinct.

## Structured checkpoints

### 0. Survey and documented baseline — complete

Deliverable: this assessment, existing ownership links, source metrics, proposed checkpoints and explicit preservation rules. Documentation corrections may record current behavior; no cleanup implementation has begun.

Stop point: user reviews the plan. A later “proceed” should identify the agreed implementation scope; the documentation request alone is not code authorization.

### 1. Retire obsolete tooling and review exposed APIs

Scope: the broken reconciliation runner and source/persistence routes; current runner/harness mapping; narrowly justified unused exports. Keep usable aliases, independent fixtures and historical provenance.

Acceptance:
- Every advertised command targets an existing supported suite.
- A failing suite, timeout, invalid selector or missing page causes visible failure/nonzero runner outcome rather than false success.
- Valid existing routes still work in isolated profiles; failures do not access production databases/models.
- Export removal distinguishes internal/test/dynamic use from absence of a caller; no removed UI action.
- Test guide and file map reflect actual supported tools.

Stop point: one reviewed tooling/API batch; no production architecture or model changes.

### 2. Small naming batch

Scope: select a few low-risk misleading names, initially audio metadata and export generators. Freeze an exact old-to-new manifest before edits. Keep worker entry paths unchanged.

Acceptance:
- Static/lazy imports, new URL references, HTML entry points, test import-map keys, diagnostic URLs and documentation all resolve.
- No duplicate old/new implementations remain accidentally active.
- Relevant source/metadata/export/app checks pass; module rename alone does not alter bytes, rendering, file names or access behavior.
- Record any genuinely external/bookmarked path before removing it.

Stop point: a small rename-only commit, separate from logic extraction. Broader folder hierarchy is optional later, after ownership settles.

### 3. One Search identity/hash owner

Scope: extract shared pure hash/source payload work from search.js and semantic.js while preserving current results exactly. Do not merge unrelated recording-prefix or cached-TXT identity algorithms.

Acceptance:
- Independent expected hash/key vectors match before and after, including null/legacy fields, field order, Unicode and unchanged text.
- Both actual Search and semantic-store consumers use the owner.
- Existing compatible embeddings reuse without forced rebuild/resave; edited text and invalid identity still invalidate appropriately.
- Current Search ordering/highlighting is unchanged.

Stop point: one shared pure implementation with compatible outputs; no schema or archive-format change.

### 4A. Shared audio playback owner

Scope: extract the reusable control/resolution path from searchUI.js; keep Search and Combine views and current one-source behavior.

Acceptance:
- Actual producer inventory uses records, and both views find the selected recording by identity without an unnecessary picker.
- Wrong/ambiguous/missing audio, native/file-input fallback, cancellation and source changes preserve the existing rules.
- Object URLs/handlers are released correctly; one view cannot reuse another source by filename alone.
- Relevant audio-location and app integration checks pass; focused desktop/iPhone acceptance confirms real playback where the pathway changes.

Stop point: shared playback with unchanged behavior. Multi-archive access is not silently introduced.

### 4B. Shared exact-target edit/save rules

Scope: consolidate file/content checks and save outcome handling, keeping view-specific editors and Search reindex state separate where useful.

Acceptance:
- Edits affect the exact loaded file/model/operation; preserve header/unknown metadata and other candidates.
- External changes, missing target, lost permission and canceled replacement preserve drafts and require explicit recovery.
- Search reindexes affected current text; no stale-vector reuse or silent write to a newly preferred file.
- Combine selection/order and Search context survive the existing supported paths.

Stop point: shared editing invariants, not a new draft/history store. Any functional policy conflict is documented before implementation.

### 5. Extract shared source/session orchestration

Scope: reduce app.js's source/destination/consumer coordination into a clear controller with explicit state/actions. Design this boundary to support later multi-archive work, but retain one current source for this checkpoint.

Acceptance:
- Source selection stages/commits/rolls back correctly across all three tabs.
- Audio-only and transcript-child selections both populate the right views.
- Conditional Enable Transcription excludes Settings; recordings start unchecked and no implicit inference occurs.
- Destination changes, canceled pickers and pending iPhone save batches retain accurate state/location/messages.
- All/Search origin, source reset and edit protections remain intact.
- Actual shared-source/app/phone-path tests exercise transitions; do not substitute a mocked legacy producer shape.

Stop point: explicit session ownership with current behavior. No persistent workspace or additional schema/store.

### 6. Reduce remaining large controllers in separate sub-batches

Scope: extract Search query orchestration/result rendering/index delivery and Settings storage panels versus model/history controls. Keep app.js as bootstrap and explicit feature wiring.

Acceptance:
- Query semantics, both RRF stages, lexical-first order, normalized threshold, overlap/highlighting and pagination remain unchanged.
- Every Settings View/Hide/action is exercised through its actual dispatch path, including empty/error/delete/refresh states.
- Avoid duplicate global listeners and shared state hidden in renderers.
- Relevant existing synthetic suites pass; device layout checks target only changed pathways.
- Update ownership documentation after each extraction.

Stop point: one responsibility at a time. Do not combine all four large-file rewrites into one release.

### 7. Storage boundaries and optional lower-level consolidation

Scope: separate file transport from cached-text/registry data access, with inspection/deletion still clearly owned. Consider shared container readers only if demonstrated duplication warrants the risk.

Acceptance:
- database.js stays the sole schema/open authority; consumer connections close correctly.
- Preserving upgrades/refusal/rollback, cache keys, selected deletion, unavailable storage and concurrency behavior remain.
- Native write/read and iPhone share/cancel paths keep their contracts.
- Any MP4 helper extraction preserves identity/date/duration results and bounded-read limits; no revived whole-file scans.
- No extra framework/dependency, speculative schema or resource-merging policy is introduced.

Stop point: reviewed storage responsibility, with optional reader work deferred if its value is small.

### 8. Closure and multi-archive readiness review

Deliverables:
- Updated module/entry/test map and before/after rename/export manifests.
- No unresolved local import/worker/page paths; reviewed dynamic dispatch and aliases.
- Report preserved worker/configuration/hash/schema identity and the scoped test/device evidence.
- Confirm controllers accept explicit source/reference context rather than filename-only hidden assumptions.
- Preserve remaining filename-based limitations as explicit multi-archive implementation work; do not claim the workspace already exists.
- Keep main app/diagnostic entry URLs working and documentation current.

Stop point: agree the initial multi-archive interface and membership/access contract next. Memory feasibility, model discovery, offline packaging and other features remain independently scoped. It is not necessary to complete low-value cosmetic changes to proceed once the relevant source/reference boundaries are safe.

## Separate observations needing a later decision

**Search default documentation correction:** normal JS initialization uses 70% unless a valid stored preference overrides it; the HTML declares 80%, and the storage-exception catch can retain that HTML value. The earlier methodology text saying the normal initial value is 80% was inaccurate. Documentation is corrected to describe both paths. No slider behavior is changed; choosing one intended fallback and aligning source is a separate behavior decision, not an incidental rename.

The old file map also named retired transcriptFolder/transcriptArchive modules and missed test uses of getModelCatalog. Its current navigation/claims are corrected with this report. Historical sections retain dated context.

No stale source-UUID/recordings property should be removed from schema-migration fixtures or serialized compatibility solely because it looks old. Tests deliberately preserve previous stores/headers; Search's null hash slot is intentional.

## Evidence, limits and handoff

The survey follows current local source and public exports, with targeted inspection of actual callers/dispatch. Regex/reference searches can overestimate/underestimate dynamic use; they are not a dead-code proof, formal dependency checker or performance profile. No whole production module is recommended for deletion solely by this survey.

No code, test runner, model, user archive, schema, workflow or browser data was changed while documenting the plan. No runtime/model/device tests ran. The [current test guide](../tests/README.md), [operations guide](build-versioning.md), [current status](CURRENT_STATUS.md) and protected research remain the starting points for any subsequently authorized checkpoint.

Recommended first implementation: **checkpoint 1 only**, with a concrete route/export manifest, followed by a small naming batch. Larger extraction should follow its own reviewed stopping points.

Documentation validation: **60 Markdown files**, **918 local inline references**, no missing local targets/unresolved Markdown heading fragments, and five synchronized journal volumes. Only Markdown changed. The user memory handoff, original research and retained validation artifacts match their prior hashes. No runtime tests were executed.
