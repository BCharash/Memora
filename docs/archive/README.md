# Archived and deferred documents

Reviewed 9 November 2026 through build .23. These records preserve unique decisions, observations, experiments and earlier proposals. Historical “current”, “next” and “pending” statements describe their checkpoint. Start with [the live handoff](../CURRENT_STATUS.md) and [documentation index](../README.md); archived instructions do not authorize work.

## Checkpoint history

| Document | Why retained |
|---|---|
| [Development checkpoints through .23](Development_Checkpoints_2026-11-09.md) | Full earlier handoff, implementation steps, device observations, limits and evidence. Replaced by a shorter current-status document. |
| [Original Whisper audit/design updates](Whisper_Configuration_and_Test_Design_History.md) | Original ownership map, timing samples, staged proposals and retry/recovery decisions. Current rules are in [testing design](../Whisper_Configuration_and_Test_Design.md). |
| [Test checkpoint history](Test_Checkpoint_History_2026-11-09.md) | Prior focused runs/counts and historical device instructions. Use [current test guide](../../tests/README.md) to choose a harness. |
| [Original runtime plan](Initial%20runtime.md) | Completed identity migration; see [foundation record](../Runtime_and_Database_Status.md). |
| [Database repair plan](IndexedDB_Repair_and_Ownership_Plan.md) | Completed schema ownership/repair. |
| [Database audit/history](IndexedDB_Audit_and_Repair_Design.md) | Preserves schema map, failure mechanism and repair evidence. |

## Deferred proposals — not cancelled, not active

| Document | Resume boundary |
|---|---|
| [Vite design and rollout](Vite_Design_and_Rollout_Plan.md) | Setup was discarded before asset adaptations. Re-audit source/tool versions and hosting if explicitly resumed. |
| [Asset/deployment inventory](Asset_and_Deployment_Inventory.md) | Dated pre-cleanup asset map; it still names the removed desktop test worker/page loader. Re-inventory before build conversion. |
| [Offline Tiny](Offline_Whisper_Tiny_Implementation_Plan.md) | No verified offline service/fallback is implemented. Align with current canonical definitions, workers and eligibility; its copyable prompt is future reference only. |
| [Future iMuse migration](iMuse%20migration.md) | Inspect both repositories/schema before implementation; leave the recording database untouched meanwhile. |
| [Earlier mobile file proposal](Mobile_File_Processing_Architecture_Analysis_and_Plan.md) | Background only; use [file workflow overview](../File_Workflow_Inventory.md) before a fresh dependency audit. |

## Research and earlier evaluations

| Document | Current authority |
|---|---|
| [Search research](Search_Optimization_Research_Record.md) | Full experiments/caveats; [active Search strategy](../search%20model%20optimization.md) and journal retain governing production decisions. |
| [Paragraphing R4/R5 analysis](Memora_Revision4_vs_Revision5_Complete_Analysis.md) | Historical comparison; selected direction is recorded in the journal. |

Nothing was deleted in this refresh. Five overlapping journals remain in the parent folder; only the main journal receives the new section 60. No journal restructuring or application change accompanies archiving.
