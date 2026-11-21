# Memora documentation

Current source: **2026-11-21.10**, database schema **10**. Documentation housekeeping checkpoint 4, **21 November 2026**. These pages describe the checked-out code, not independently verified deployment or new device acceptance.

## Start here

| Question | Read |
|---|---|
| What works now, what needs testing, and what comes next? | [Current status and resume instructions](CURRENT_STATUS.md) |
| How do I run a relevant check safely? | [Test guide](../tests/README.md) |
| Which modules own a feature? | [File map](../filemap.md); its structural JavaScript review is still pending |
| What documentation should be kept or consolidated? | [Complete audit and disposition register](Documentation_Audit_2026-11-21.md) |
| Where are earlier results and decisions? | [Journal index](journal-index.md), [preservation/evidence record](archive/Current_Guides_Preservation_2026-11-21.md) and [archive index](archive/README.md) |

## Current contracts and methodology

The references below separate current contracts, preserved research and future proposals. Superseded contracts are historical records in the archive, not competing current instructions. Some unrelated Whisper/operations documents remain scheduled for later consolidation.

| Topic | Reference |
|---|---|
| Recording identity | [Identity and storage](Recording_Identity_and_Storage.md), with the separate [exact prefix-ID algorithm/vector](Recording_Identity_Prefix_Contract.md#prefix-method-version-1) |
| Architecture, runtime and file access | [Architecture and file workflows](Architecture_and_File_Workflows.md) |
| Database and caches | [Identity/storage responsibilities, schema and preservation](Recording_Identity_and_Storage.md#database-ownership-and-preservation) |
| Search | [Current methodology](Search_Methodology.md), [preserved governing strategy](search%20model%20optimization.md) and [complete research record](archive/Search_Optimization_Research_Record.md) |
| Paragraphing | [Current methodology](Paragraphing_Methodology.md) and the intact [R4/R5 comparison, decision and revisit protocol](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md) |
| Whisper configuration and qualification | [Catalogue/resolver contract](Whisper_Catalogue_Resolver_Contract.md) and [testing/eligibility design](Whisper_Configuration_and_Test_Design.md) |
| Model failures, reviews and reporting | [Execution-failure contract](Whisper_Execution_Failure_Contract.md) and [self-test timelines/reports](Self_Test_Timelines_and_Problem_Reports.md) |
| Publishing and recovery | [Build numbering](build-versioning.md), [Pages recovery procedure](Pages_Deployment_Recovery.md) and its manual workflow; review the deployment SHA rather than reusing a historical incident default |

Nine superseded guides are now consolidated into the two current references above and the future Combine contract below. All nine originals remain complete in the [dated contract archive](archive/README.md#contracts-superseded-by-current-references--21-november-2026), with notices and repaired navigation. Search/paragraphing research remains intact; no uncertain-value history is destroyed.

## Future work and preserved evidence

- [Consolidated future Combine contract](Multi_Archive_Combine_Contract.md) separates implemented foundations, agreed future behavior and proposals. Both original plans remain archived; multi-archive Combine is not implemented.
- [Audio library proposal](Audio_Library_Architecture_Proposal.md) retains broader recursive ownership ideas. Shared parent-folder selection is already implemented.
- [DOCX metadata evidence](validation/docx-custom-properties/README.md) retains browser/Word round-trip results and unresolved interoperability limits; it does not implement production import.
- Offline Tiny, Vite/release conversion and iMuse convergence remain [deferred proposals](archive/README.md), requiring a fresh source review before implementation.
- The whole journal and five volumes preserve design history. [Journal index](journal-index.md) defines their current authoring/synchronization rule. Methodology and failed-experiment lessons must survive later consolidation.

The [audit](Documentation_Audit_2026-11-21.md) is the complete per-document register. This index intentionally does not duplicate release narratives, test totals or the full directory listing.

## Authority and maintenance

Source code establishes implementation; tests establish only their recorded scope; real-device observations remain dated evidence. A proposal, an old approval or a historical “next” instruction is not proof that work remains current or is authorized now.

Update the handoff for current behavior and the relevant owner for a contract. Record decisions/evidence once in the journal or a focused evidence record, and link to them elsewhere. Documentation-only changes do not advance the application build or database schema.
