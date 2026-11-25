# Memora documentation

Current save and editor reference **2026-11-25.3**, database schema **10**. The [current handoff](CURRENT_STATUS.md) records browser coverage, the confirmed iPhone overwrite correction and remaining device checks.

## Start here

| Question | Read |
|---|---|
| What works now, what needs testing, and what comes next? | [Current status and resume instructions](CURRENT_STATUS.md) |
| Where should desktop Codex resume the iPhone 2017 audio-load investigation? | [Crash investigation handoff](iPhone_2017_Audio_Load_Investigation.md); observations, source findings and options, no code authorized |
| Where do iPhone saves go, and how do the transcript editors behave? | [iPhone save flow audit](iPhone_Save_Flow_Audit.md) |
| How do I run a relevant check safely? | [Test guide](../tests/README.md) |
| Which modules own a feature? | [File map](../filemap.md) |
| What did the JavaScript survey find, and what cleanup is proposed? | [Survey and staged checkpoint plan](JavaScript_Survey_and_Cleanup_Plan.md); assessment complete, implementation not authorized |
| What documentation should be kept or consolidated? | [Complete audit and disposition register](Documentation_Audit_2026-11-21.md) |
| Where are earlier results and decisions? | [Journal index](journal-index.md), [preservation/evidence record](archive/Current_Guides_Preservation_2026-11-21.md) and [archive index](archive/README.md) |

## Current contracts and methodology

The references below separate current contracts, preserved research and future proposals. Superseded contracts are historical records in the archive, not competing current instructions. File/identity, future Combine, Whisper and operations guidance now have consolidated owners; older plans remain historical or explicitly deferred.

| Topic | Reference |
|---|---|
| Recording identity | [Identity and storage](Recording_Identity_and_Storage.md), with the separate [exact prefix-ID algorithm/vector](Recording_Identity_Prefix_Contract.md#prefix-method-version-1) |
| Architecture, runtime and file access | [Architecture and file workflows](Architecture_and_File_Workflows.md) |
| Database and caches | [Identity/storage responsibilities, schema and preservation](Recording_Identity_and_Storage.md#database-ownership-and-preservation) |
| Search | [Current methodology](Search_Methodology.md), [preserved governing strategy](search%20model%20optimization.md) and [complete research record](archive/Search_Optimization_Research_Record.md) |
| Paragraphing | [Current methodology](Paragraphing_Methodology.md) and the intact [R4/R5 comparison, decision and revisit protocol](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md) |
| Whisper configuration, qualification and reporting | [Current Whisper guide](Whisper_Architecture_and_Qualification.md); four complete originals retained in the [Whisper archive](archive/README.md#whisper-guides-consolidated--21-november-2026) |
| Model failures and review state machine | [Separate execution-failure contract](Whisper_Execution_Failure_Contract.md) |
| Planned self-test memory work | [User memory handoff](Memora_Whisper_Memory_Handoff.md), preserved unchanged; feasibility first, not implemented |
| Local serving, build numbering, publishing and recovery | [Operations and deployment](build-versioning.md); the existing URL is retained, and both original guides are archived |

Across the three consolidation batches, **15 old guides feed 5 current references**, with all 15 originals archived complete. See the [archive index](archive/README.md) and [audit/preservation records](Documentation_Audit_2026-11-21.md). The separate prefix/failure contracts, research, validation artifacts and user memory handoff remain retained; no uncertain-value history is destroyed.

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
