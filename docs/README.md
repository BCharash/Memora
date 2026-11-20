# Memora documentation

Reviewed **20 November 2026** against source **ce1583b**, displayed build **2026-11-20.7**, database schema **6**. Start with [Current status and resume instructions](CURRENT_STATUS.md). Its opening section records the revised plan for 21 November; dated checkpoint notes remain historical evidence.

## Next implementation: Enable Transcription and save guidance

**Planned, not implemented.** Initial Transcribe selectors remain visible. Leaving untouched Transcribe for Combine/Search guards the return behind **Enable Transcription**; Settings does not count as leaving or transcription activity. Reuse shared folder selections, defer Transcribe-only recording-list preparation and leave its recordings unchecked. Also revise never-saved versus post-share warning text, fix stale iPhone destination guidance with a prominent current-batch location, and consolidate audio-first/transcript-second list statuses. The earlier hide-on-first-opening proposal is superseded. See the [full plan and acceptance checklist](CURRENT_STATUS.md#next-implementation-enable-transcription-and-save-guidance).

## Current implementation and evidence

Build .7 includes reproducible recording identities, shared parent audio/transcript folder access, destination-time transcript reconciliation, native TXT verification before publishing references, and combined files-only iPhone transcript-plus-JSON sharing. The Audio Recording List remains separately saved in its parent. Shared folder reads currently also prepare Transcribe; separating that work is part of the next planned pass. The previous implementation run passed **176 targeted groups**; no tests have run for the new plan because no code changed. Combine playback was user-confirmed on MacBook and iPhone. The user says test.html loaded; production picker cancellation while browsing remains unconfirmed. Share completion does not verify actual Files placement.

## Identity and deferred architecture

The [recording identity checkpoints](Recording_Identity_Checkpoints.md) preserve the staged history and current contracts: embedded IDs or the reproducible sampled fallback identify recordings; obsolete TXT source UUIDs do not establish audio access. Shared parent-folder access is implemented; saved-copy/cache retirement, broader recursive/multi-archive ownership and workspace/import work remain separate. Consult current status rather than treating a dated pending implementation note as today's boundary.

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

Canonical lists now use memora-transcript-archive.json. Preserve Recording IDs and Archive UUIDs when reconciling/rebuilding. Desktop verifies native writes; iPhone shares transcript TXT files and their updated list together into the named transcript folder, while the audio list stays in its parent. This does not require deleting audio lists or embeddings.

The detailed Whisper metadata/backfill-tool proposal and extra transcription timestamp have been dropped. Keep existing model-family metadata. The agreed family-then-filename-counter priority rule is **not yet implemented**, and iPhone Files naming does not yet guarantee the desktop `-N` pattern. Audio whole-folder coverage parity is fixed in .24: successful complete native and iPhone folder reads remove missing immediate entries; partial/skipped/error/cancelled reads retain safeguards. iPhone still explicitly saves changed JSON; audio files are not deleted. See the exact [resume boundary](CURRENT_STATUS.md#resume-boundary--remaining-work).

Transcribe reconciles the destination at selection and adds native references after successful TXT writes; Search's shared scan/two-JSON reconciliation remains a future stage. Parent catalogues, recursive ownership/discovery, persistent multi-archive Combine/imports and DOCX/HTML output-metadata controls are distinct deferred work. Historical “architecture pause” text is not a claim that all later authorized root reconciliation is still unimplemented.

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
