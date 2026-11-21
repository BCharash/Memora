# Archived and deferred documents

Reviewed for documentation consistency on **19 November 2026**, against source **47ca641** (displayed build .25). These records preserve unique decisions, observations, experiments and earlier proposals. Historical “current”, “next” and “pending” statements describe their checkpoint. Start with [the live handoff](../CURRENT_STATUS.md) and [documentation index](../README.md); archived instructions do not authorize work.

## Checkpoint history

| Document | Why retained |
|---|---|
| [Current-guide preservation, 21 November](Current_Guides_Preservation_2026-11-21.md) | Compact evidence/lesson extraction and immutable originals for the current-only index/handoff/test rewrite; no duplicate full-guide archive. |
| [10 November checkpoints through .14](Development_Checkpoints_2026-11-10.md) | Detailed implementation/review/UI sequence; old pending notes are superseded by the current handoff. |
| [Development checkpoints through .23](Development_Checkpoints_2026-11-09.md) | Full earlier handoff, implementation steps, device observations, limits and evidence. Replaced by a shorter current-status document. |
| [Original Whisper audit/design updates](Whisper_Configuration_and_Test_Design_History.md) | Original ownership map, timing samples, staged proposals and retry/recovery decisions. Current rules are in [testing design](2026-11-21-whisper/Whisper_Configuration_and_Test_Design.md). |
| [Test checkpoint history](Test_Checkpoint_History_2026-11-09.md) | Prior focused runs/counts and historical device instructions. Use [current test guide](../../tests/README.md) to choose a harness. |
| [Original runtime plan](Initial%20runtime.md) | Completed identity migration; see [foundation record](2026-11-21-contracts/Runtime_and_Database_Status.md). |
| [Database repair plan](IndexedDB_Repair_and_Ownership_Plan.md) | Completed schema ownership/repair. |
| [Database audit/history](IndexedDB_Audit_and_Repair_Design.md) | Preserves schema map, failure mechanism and repair evidence. |

## Deferred proposals — not cancelled, not active

| Document | Resume boundary |
|---|---|
| [Vite design and rollout](Vite_Design_and_Rollout_Plan.md) | Setup was discarded before asset adaptations. Re-audit source/tool versions and hosting if explicitly resumed. |
| [Asset/deployment inventory](Asset_and_Deployment_Inventory.md) | Dated pre-cleanup asset map; it still names the removed desktop test worker/page loader. Re-inventory before build conversion. |
| [Offline Tiny](Offline_Whisper_Tiny_Implementation_Plan.md) | No verified offline service/fallback is implemented. Align with current canonical definitions, workers and eligibility; its copyable prompt is future reference only. |
| [Future iMuse migration](iMuse%20migration.md) | Inspect both repositories/schema before implementation; leave the recording database untouched meanwhile. |
| [Earlier mobile file proposal](Mobile_File_Processing_Architecture_Analysis_and_Plan.md) | Background only; use [current file workflows](../Architecture_and_File_Workflows.md) before a fresh dependency audit. |

## Research and earlier evaluations

| Document | Current authority |
|---|---|
| [Search research](Search_Optimization_Research_Record.md) | Full experiments/caveats; [active Search strategy](../search%20model%20optimization.md) and journal retain governing production decisions. |
| [Paragraphing R4/R5 analysis](Memora_Revision4_vs_Revision5_Complete_Analysis.md) | Historical comparison; selected direction is recorded in the journal. |

Nothing was deleted in this refresh. The whole journal and **five synchronized split volumes** remain in the parent folder; see the [journal index](../journal-index.md). Volume 5 covers sections 60–62. Original archived dates/evidence remain historical; this review does not rerun experiments or authorize deferred implementation.

## Contracts superseded by current references — 21 November 2026

Checkpoint 4 consolidates nine active guides into [current file workflows](../Architecture_and_File_Workflows.md), [identity/storage](../Recording_Identity_and_Storage.md) and the [future Combine contract](../Multi_Archive_Combine_Contract.md). All nine full originals are retained below. Archive notices and relative links are adapted; original narrative, dates, decisions, examples and test evidence are not removed. The [audit](../Documentation_Audit_2026-11-21.md) records original hashes and preservation checks. These historical plans are not current implementation instructions.

| Archived complete original | Current owner |
|---|---|
| [File_Workflow_Inventory.md](2026-11-21-contracts/File_Workflow_Inventory.md) | [Architecture_and_File_Workflows.md](../Architecture_and_File_Workflows.md) |
| [Runtime_and_Database_Status.md](2026-11-21-contracts/Runtime_and_Database_Status.md) | [Recording_Identity_and_Storage.md](../Recording_Identity_and_Storage.md) |
| [Recording_Identity_Implementation_Contract.md](2026-11-21-contracts/Recording_Identity_Implementation_Contract.md) | [Recording_Identity_and_Storage.md](../Recording_Identity_and_Storage.md) |
| [Recording_Identity_Handoff.md](2026-11-21-contracts/Recording_Identity_Handoff.md) | [Recording_Identity_and_Storage.md](../Recording_Identity_and_Storage.md) |
| [Recording_Identity_Checkpoints.md](2026-11-21-contracts/Recording_Identity_Checkpoints.md) | [Recording_Identity_and_Storage.md](../Recording_Identity_and_Storage.md) |
| [Parent_Audio_Folder_Selection_Handoff.md](2026-11-21-contracts/Parent_Audio_Folder_Selection_Handoff.md) | [Architecture_and_File_Workflows.md](../Architecture_and_File_Workflows.md) |
| [Audio_JSON_Retirement_Audit.md](2026-11-21-contracts/Audio_JSON_Retirement_Audit.md) | [Recording_Identity_and_Storage.md](../Recording_Identity_and_Storage.md) |
| [MEMORA_COMBINE_ARCHITECTURE.md](2026-11-21-contracts/MEMORA_COMBINE_ARCHITECTURE.md) | [Multi_Archive_Combine_Contract.md](../Multi_Archive_Combine_Contract.md) |
| [MEMORA_COMBINE_PHASE_1_CONTRACTS.md](2026-11-21-contracts/MEMORA_COMBINE_PHASE_1_CONTRACTS.md) | [Multi_Archive_Combine_Contract.md](../Multi_Archive_Combine_Contract.md) |

## Whisper guides consolidated — 21 November 2026

Four guides now feed the [current Whisper architecture/qualification/reporting reference](../Whisper_Architecture_and_Qualification.md). Full originals remain below with archive notices and repaired navigation only. The [detailed failure contract](../Whisper_Execution_Failure_Contract.md) stays active separately. The user's [memory handoff](../Memora_Whisper_Memory_Handoff.md) remains unchanged in docs/, not moved into this archive.

| Complete archived original | Preserved value |
|---|---|
| [Memora_Model_Registry_and_Self_Test_Architecture_Plan.md](2026-11-21-whisper/Memora_Model_Registry_and_Self_Test_Architecture_Plan.md) | Broad overhaul rationale, stage plans, resource hypotheses, observations and candidate-selection proposals. |
| [Whisper_Catalogue_Resolver_Contract.md](2026-11-21-whisper/Whisper_Catalogue_Resolver_Contract.md) | Exact catalogue/selection/fingerprint contracts, cache/qualification distinctions and deferred discovery. |
| [Whisper_Configuration_and_Test_Design.md](2026-11-21-whisper/Whisper_Configuration_and_Test_Design.md) | PASS/lifecycle/recovery policy, timing/instability evidence and unimplemented sequence/retry proposals. |
| [Self_Test_Timelines_and_Problem_Reports.md](2026-11-21-whisper/Self_Test_Timelines_and_Problem_Reports.md) | Timeline capture/backfill, saved observations, JSON summaries, device limits and historical test evidence. |
