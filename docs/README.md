# Memora documentation

Current source: **2026-11-21.10**, database schema **10**. Documentation housekeeping checkpoint 3, **21 November 2026**. These pages describe the checked-out code, not independently verified deployment or new device acceptance.

## Start here

| Question | Read |
|---|---|
| What works now, what needs testing, and what comes next? | [Current status and resume instructions](CURRENT_STATUS.md) |
| How do I run a relevant check safely? | [Test guide](../tests/README.md) |
| Which modules own a feature? | [File map](../filemap.md); its structural JavaScript review is still pending |
| What documentation should be kept or consolidated? | [Complete audit and disposition register](Documentation_Audit_2026-11-21.md) |
| Where are earlier results and decisions? | [Journal index](journal-index.md), [preservation/evidence record](archive/Current_Guides_Preservation_2026-11-21.md) and [archive index](archive/README.md) |

## Current contracts and methodology

These documents retain useful detail but are still scheduled for consolidation. Where an older plan conflicts with current source, use the current-status page and the audit's source-checked findings.

| Topic | Reference |
|---|---|
| Recording identity | [Exact reproducible-ID contract](Recording_Identity_Prefix_Contract.md); retain its algorithm and independent vector, not historical checkpoint-next instructions |
| Runtime, database and caches | [Foundation record](Runtime_and_Database_Status.md); current schema/store summary is in the handoff |
| Search | [Current methodology](Search_Methodology.md), [preserved governing strategy](search%20model%20optimization.md) and [complete research record](archive/Search_Optimization_Research_Record.md) |
| Paragraphing | [Current methodology](Paragraphing_Methodology.md) and the intact [R4/R5 comparison, decision and revisit protocol](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md) |
| Whisper configuration and qualification | [Catalogue/resolver contract](Whisper_Catalogue_Resolver_Contract.md) and [testing/eligibility design](Whisper_Configuration_and_Test_Design.md) |
| Model failures, reviews and reporting | [Execution-failure contract](Whisper_Execution_Failure_Contract.md) and [self-test timelines/reports](Self_Test_Timelines_and_Problem_Reports.md) |
| Publishing and recovery | [Build numbering](build-versioning.md), [Pages recovery procedure](Pages_Deployment_Recovery.md) and its manual workflow; review the deployment SHA rather than reusing a historical incident default |

Checkpoint 3 is additive: the Search and paragraphing summaries sit alongside the full original records. Uncertain future value favors retention; no research is deleted or shortened.

## Future work and preserved evidence

- [Combine architecture](MEMORA_COMBINE_ARCHITECTURE.md) and [Phase 1 contracts](MEMORA_COMBINE_PHASE_1_CONTRACTS.md) preserve future workspace/import/editing requirements. Their old sidecar and filename-keyed cache assumptions are superseded; multi-archive Combine is not implemented.
- [Audio library proposal](Audio_Library_Architecture_Proposal.md) retains broader recursive ownership ideas. Shared parent-folder selection is already implemented.
- [DOCX metadata evidence](validation/docx-custom-properties/README.md) retains browser/Word round-trip results and unresolved interoperability limits; it does not implement production import.
- Offline Tiny, Vite/release conversion and iMuse convergence remain [deferred proposals](archive/README.md), requiring a fresh source review before implementation.
- The whole journal and five volumes preserve design history. [Journal index](journal-index.md) defines their current authoring/synchronization rule. Methodology and failed-experiment lessons must survive later consolidation.

The [audit](Documentation_Audit_2026-11-21.md) is the complete per-document register. This index intentionally does not duplicate release narratives, test totals or the full directory listing.

## Authority and maintenance

Source code establishes implementation; tests establish only their recorded scope; real-device observations remain dated evidence. A proposal, an old approval or a historical “next” instruction is not proof that work remains current or is authorized now.

Update the handoff for current behavior and the relevant owner for a contract. Record decisions/evidence once in the journal or a focused evidence record, and link to them elsewhere. Documentation-only changes do not advance the application build or database schema.
