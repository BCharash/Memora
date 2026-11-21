# Memora documentation

Updated **21 November 2026** for candidate build **2026-11-21.1**, database schema **7** (worktree based on b983463). Start with [Current status](CURRENT_STATUS.md#implemented-candidate-txt-catalogue-and-explicit-transcription--21-november-2026). Historical notes below retain earlier behavior and acceptance boundaries.

## TXT catalogue and transcription session candidate

The approved simplification retires **only memora-transcript-archive.json** from production reading/writing/saving. Existing files stay untouched. **memora-audio-source.json and search-embeddings.json remain**. Transcribe/Combine/Search read TXT metadata into a bounded, rebuildable local cache, exposed in Settings. Existing TXT identities remain authoritative; empty destinations receive a session UUID written into their first TXT. Schema 7 adds the cache without resetting other stores.

Transcribe has source above and destination below. Its controls are visible on first opening; untouched departures to Combine/Search guard the return behind **Enable Transcription**, with Settings excluded. Shared selection does not prepare its recording rows until intent is expressed, and new recording lists start unchecked. Native and phone new-folder choices need no transcript JSON. iPhone shares TXT only, with a prominent batch-bound destination and different never-saved/post-share warnings. Audio JSON naming/replacement still belongs to Files and remains a separate reported issue.

## Validation and acceptance

The current [TXT catalogue/session harness](../tests/transcript-catalogue.html) replaces the historical .7 sidecar/bundle app harness; [transcription-identity.html](../tests/transcription-identity.html) runs the current suite as a compatible entry point. **129 groups passed** in the focused run. Checks cover local metadata, schema/data preservation, audio-list recovery, identity/embeddings reuse and playback. See [current status](CURRENT_STATUS.md) and the [test guide](../tests/README.md) for counts and scope. Real MacBook/iPhone Files, folder creation and visual acceptance remain required. No deployment or user-archive edits were performed.

## Deferred architecture

The earlier combined TXT-plus-transcript-JSON workflow and its two-file save requirement are superseded. There is no transcript sidecar to reconcile with Search embeddings. Broader multi-archive workspace/import, recursive ownership, filename priority refinements and other deferred features remain separate. The audio catalogue has not been retired. See the [identity checkpoints](Recording_Identity_Checkpoints.md).

## What changed on 18–19 November

- Added the compact passed-only self-test summary: Model, RTF, Load (s), latest retained pass per model family.
- Aligned the Transcribe controls and desktop/iPhone flow; removed paragraph controls from Combine and reorganized Output controls.
- Reworked Settings storage categories, readable cache identities, centered counts, selection-only deletion, empty-list controls and one-action model-registry refresh.
- Reconciled Audio Recording Lists on source opening, removed full-audio hashing from production inventory, improved recovery/save state and made unchanged lists no-op saves.
- Added shared transcript-folder reading and Edit/Combine transcript-list reconciliation, including complete iPhone folder coverage, conflict protection and explicit mobile saving.
- Renamed the transcript JSON and added archive/year plus folder guidance to iPhone Transcribe/Edit/Combine saves. Shared Combine/Search audio playback now gives the same known-folder/recording guidance, with source-scoped caches and checks for inspectable embedded IDs.
- Preserved valid Whisper qualification across browser-version updates while retaining actual failure/review holds; accepted historical `large` labels without rewriting them.

## File names and decisions

| File | Role |
|---|---|
| memora-audio-source.json | Audio Recording List beside source audio. |
| memora-transcript-archive.json | Retired production sidecar; old copies are ignored and left untouched. |
| search-embeddings.json | Separate derived Search archive. |

TXT headers now supply the transcript catalogue. No external transcript list needs rebuilding or saving. Audio catalogue and Search embeddings remain independent. Do not delete/rewrite TXT metadata, audio lists or embeddings as part of this change.

The detailed Whisper metadata/backfill-tool proposal and extra transcription timestamp have been dropped. Keep existing model-family metadata. The agreed family-then-filename-counter priority rule is **not yet implemented**, and iPhone Files naming does not yet guarantee the desktop `-N` pattern. Audio whole-folder coverage parity is fixed in .24: successful complete native and iPhone folder reads remove missing immediate entries; partial/skipped/error/cancelled reads retain safeguards. iPhone still explicitly saves changed JSON; audio files are not deleted. See the exact [resume boundary](CURRENT_STATUS.md#resume-boundary--remaining-work).

Transcribe reads destination TXT metadata; Search reuses the current TXT snapshots for metadata and existing embeddings reconciliation. The former two-JSON reconciliation proposal is obsolete after transcript-sidecar retirement. Parent catalogues, recursive ownership/discovery, persistent multi-archive Combine/imports and DOCX/HTML output-metadata controls are distinct deferred work. Historical “architecture pause” text is not a claim that all later authorized root reconciliation is still unimplemented.

## Documentation map

| Document | Role |
|---|---|
| [Parent audio-folder selection handoff](Parent_Audio_Folder_Selection_Handoff.md) | Agreed workflow, Mac/iPhone test evidence, 15-file discrepancy and next checkpoint; production not implemented. |
| [Documentation review](Documentation_Review_2026-11-19.md) | Scope, document inventory, corrections and validation limits. |
| [Journal index and five volumes](journal-index.md) | Whole/split navigation and synchronization rules. |
| [Current status and resume instructions](CURRENT_STATUS.md) | Consolidated current behavior, tests, gaps, decisions and chronological build notes. |
| [Recording identity implementation contract](Recording_Identity_Implementation_Contract.md) | Root inventory, IDs, schemas, persistence/conflict rules and staged transcript integration. |
| [Recording identity handoff](Recording_Identity_Handoff.md) | Operational rebuild instructions and preserved historical migration/iMuse evidence. |
| [Audio library plan](Audio_Library_Architecture_Proposal.md) | Completed root reconciliation versus deferred parent/recursive ownership. |
| [Combine architecture](MEMORA_COMBINE_ARCHITECTURE.md) | Current selection/editing boundary and broader approved architecture. |
| [Combine Phase 1 contracts](MEMORA_COMBINE_PHASE_1_CONTRACTS.md) | Detailed future workspace/import/interchange contracts and implemented subsets. |
| [Self-test summary, timelines and reports](Self_Test_Timelines_and_Problem_Reports.md) | Summary versus history/eligibility, timing interpretation and saved observations. |
| [Whisper testing and eligibility](Whisper_Configuration_and_Test_Design.md) | PASS/recovery rules, browser-family continuity and retained diagnostic identity. |
| [Execution-failure contract](Whisper_Execution_Failure_Contract.md) | Runtime incidents, durable review decisions and stability observations. |
| [Whisper catalogue contract](Whisper_Catalogue_Resolver_Contract.md) | Canonical configuration/selection authority; registry cache is a projection. |
| [Broader registry/self-test architecture](Memora_Model_Registry_and_Self_Test_Architecture_Plan.md) | Long-term requirements with current implementation status. |
| [Runtime/database foundation](Runtime_and_Database_Status.md) | Schema ownership, capability/identity distinctions and storage management. |
| [File workflow inventory](File_Workflow_Inventory.md) | Current save/access/reconciliation map and pending sharing integration. |
| [Plain-language file map](../filemap.md) | Production modules, ownership, data and focused tests. |
| [Test guide](../tests/README.md) | Current safe harnesses/counts and historical test instructions. |
| [Search strategy](search%20model%20optimization.md) | Search requirements; shared reconciliation is a later stage. |
| [Build numbering](build-versioning.md) | Build IDs, separate from schema/configuration versions. |
| [Archive](archive/README.md) | Historical investigations/checkpoints and deferred release/offline designs. |

## Design journals

The [whole journal](design-journal.md) and [five-volume index](journal-index.md) now cover the same sections through **62**. [Volume 5](05-design-journal-sections-60-62.md) contains sections **60–62**, including the November runtime, Whisper, identity, Settings and reconciliation work. The first four volumes preserve their historical bodies; Volume 4 actually covers **49–59** and retains its existing filename for bookmark compatibility.

Update the whole journal first, then synchronize the affected volume. Historical section-number gaps and duplicates are preserved; compare number and heading together. The [review report](Documentation_Review_2026-11-19.md) records the checks and remaining implementation boundaries.

Documentation changes alone do not change the application build, schemas, models, user files or deployment.
