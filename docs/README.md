# Memora documentation

Updated **21 November 2026** for candidate **2026-11-21.6**, database schema **9**. Start with [current behavior and device checks](CURRENT_STATUS.md#production-audio-metadata-cache-and-audio-json-retirement--21-november-2026).

## Current file and cache workflow

Production no longer creates, reads or saves audio/transcript inventory JSON. Existing files remain untouched. Embedded Apple/iMuse Recording IDs and the unchanged reproducible fallback identify audio; TXT headers retain recording and transcript Archive UUID identities. **Search embeddings remain in search-embeddings.json.**

Audio Folder Metadata Cache and Transcript Folder Metadata Cache hold rebuildable metadata, with one latest snapshot per identified scope, selection deletion and stale/partial/failure protection. Desktop can reuse unchanged metadata after browser-confirmed folder association. iPhone verifies current audio IDs before associating logical inventories and reusing date/duration metadata; equal copied sources cannot be physically distinguished by the File input API. Uncertain associations never grant access to a different folder. Cached full-text transcripts remain separate. Previous recording-list cache data is retained for optional inspection/deletion, not used for current audio identity.

Transcribe has Audio Source above and Transcript Destination below. Unused return is gated by Enable Transcription only after a transcript folder is selected. Without one, setup stays visible and populates shared audio unchecked. Settings alone does not trigger the gate. iPhone shares TXT only, with the batch destination shown clearly and different unsaved/post-share warnings. There is no audio-list save prerequisite.

## Validation and acceptance

**191 focused groups passed**, including 17 new audio cache and 29 current app/catalogue/Settings groups, with schema preservation, actual origin-private directory handles, 390px layout, playback, embeddings, identity and historical compatibility coverage. See the [test guide](../tests/README.md). Dayananda's earlier isolated inventory proof matched 107 IDs on MacBook and iPhone; actual production .6 acceptance remains pending. No real model/user archive execution or deployment was performed by Codex.

## Deferred architecture

Persistent multi-archive Combine/import, recursive ownership, transcript filename priority refinements and broader model catalogue work remain separate. Latest cache snapshot replacement does not select among actual duplicate audio files or implement transcript-family/filename-counter priority. See the [identity checkpoints](Recording_Identity_Checkpoints.md).

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
| memora-audio-source.json | Retired production sidecar; old copies are ignored and left untouched. |
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
