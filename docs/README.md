# Memora documentation

Reviewed **19 November 2026** against application candidate **2026-11-19.25**, database schema **6**, based on committed source **d03d432**. Start with [Current status and resume instructions](CURRENT_STATUS.md#consolidated-handoff--19-november-2026). Its current overview supersedes dated checkpoint notes; it separates implemented behavior, agreed next work and real-device acceptance.

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
| memora-transcript-archive.json | Transcript File List in the transcript folder. |
| search-embeddings.json | Separate derived Search archive. |

The user will rebuild the four old memora-archive.json lists through **Edit/Combine before Transcribe**; preserve identities from TXT headers. Desktop saves automatically; iPhone explicitly saves into the named archive's transcription folder. The rename does not require deleting audio lists or embeddings.

The detailed Whisper metadata/backfill-tool proposal and extra transcription timestamp have been dropped. Keep existing model-family metadata. The agreed family-then-filename-counter priority rule is **not yet implemented**, and iPhone Files naming does not yet guarantee the desktop `-N` pattern. Audio whole-folder coverage parity is fixed in .24: successful complete native and iPhone folder reads remove missing immediate entries; partial/skipped/error/cancelled reads retain safeguards. iPhone still explicitly saves changed JSON; audio files are not deleted. See the exact [resume boundary](CURRENT_STATUS.md#resume-boundary--remaining-work).

Transcribe's full-folder transcript reconciliation and Search's shared scan/two-JSON saving remain future stages. Parent catalogues, recursive ownership/discovery, persistent multi-archive Combine/imports and DOCX/HTML output-metadata controls are distinct deferred work. Historical “architecture pause” text is not a claim that all later authorized root reconciliation is still unimplemented.

## Documentation map

| Document | Role |
|---|---|
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

The [main journal](design-journal.md#62-self-test-summary-settings-and-root-archive-maintenance--1819-november-2026) now includes **section 62**, consolidating the 18–19 November work and subsequent simplified-metadata/filename-priority decisions. Sections through 61 retain earlier history.

The four overlapping split journals remain historical: [1–35](01-design-journal-sections-1-35.md), [36–43](02-design-journal-sections-36-43.md), [44–48](03-design-journal-sections-44-48.md), [49 onward](04-design-journal-sections-49-51.md). This update does not duplicate the new section into those files.

Documentation changes alone do not change the application build, schemas, models, user files or deployment.
