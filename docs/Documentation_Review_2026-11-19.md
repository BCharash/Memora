# Documentation review — 19 November 2026

## Scope and authority

Reviewed the repository's **41 existing Markdown documents** and added this report, a journal index and Volume 5, for **44 documents**. The review inventories the complete set, checks local references and journal consistency, and checks active implementation statements against current source. Historical research, external specifications and model/provider URLs were not independently revalidated online. Existing test and device observations remain dated evidence, not new acceptance results.

Source checkpoint: **47ca641**, following **33e69dc**. Displayed application build remains **2026-11-19.25**; database schema remains **6**. The later standalone HTML-reader change shares the .25 label, so commit identity matters. This review changes Markdown only: no application, schema, model, user-file, deployment or commit changes, and no runtime tests rerun.

## Corrections and additions

- The four split journals matched the whole through section 59, but sections 60–62 were absent from the split set. New **Volume 5** supplies those sections; the whole journal includes bridging entries for identity persistence/recovery and production integration. Navigation now links all five volumes.
- Volume 4 already contains sections 49–59 despite its 49-51 filename. Its filename is preserved for compatibility. Historical duplicate section numbers 22 and 24, and gaps including 12 and 27, remain unchanged. Synchronization compares heading title as well as number.
- Stale claims that .24/.25 were uncommitted were corrected. Current source includes both changes in 33e69dc and the subsequent HTML-reader commit 47ca641.
- Combine's recording key already includes archive identity and operation. Family selection recognizes historical `large` and `large-v3` at the same family rank; equal-ranked records currently keep the first encountered. The agreed filename-counter preference remains future work, and iPhone Files collision naming is not guaranteed to follow desktop's counter pattern.
- Successful complete iPhone audio-folder reads now remove missing immediate entries, like native folder access. Partial/skipped/failed reads retain safety boundaries. This is completed work, not an outstanding iPhone defect.
- Edit/Combine transcript reconciliation is implemented. Full-folder reconciliation after Transcribe saves and shared Search parsing/reconciliation with independent JSON save decisions remain later stages. A transcript-list change must not force unchanged embeddings to regenerate or save.
- The canonical transcript-list filename is **memora-transcript-archive.json**. The user's four-archive rebuild is planned, not confirmed complete. Preserve header identities by rebuilding through Edit/Combine before Transcribe; the rename does not require deleting audio lists or embeddings.
- Detailed Whisper metadata/backfill tooling and an extra transcription timestamp were dropped. Current model-family metadata remains the decision; historical proposals are not requirements to implement them.
- The standalone combined HTML reader now includes date/name ordering, text size and audio-folder locating. It is a separate embedded runtime using filename matching, not the live app's source-scoped/embedded-ID playback checks. Source inspection establishes these controls exist; this review supplies no new browser/device acceptance or portable workspace/import implementation.
- Settings, successful-test summary, browser-version qualification continuity, source-list recovery, guided iPhone saves and Combine/Search audio guidance are documented as implemented, with existing device/test limits retained.

## Complete document inventory

“Reviewed” does not mean every historical paragraph was rewritten. Earlier decisions, experiments, dates and evidence are preserved; current status and explicit superseding entries establish today's boundary.

| Document | Review disposition |
|---|---|
| [docs/01-design-journal-sections-1-35.md](01-design-journal-sections-1-35.md) | Synchronized split volume; historical bodies preserved, navigation updated. |
| [docs/02-design-journal-sections-36-43.md](02-design-journal-sections-36-43.md) | Synchronized split volume; historical bodies preserved, navigation updated. |
| [docs/03-design-journal-sections-44-48.md](03-design-journal-sections-44-48.md) | Synchronized split volume; historical bodies preserved, navigation updated. |
| [docs/04-design-journal-sections-49-51.md](04-design-journal-sections-49-51.md) | Synchronized split volume; historical bodies preserved, navigation updated. |
| [docs/05-design-journal-sections-60-62.md](05-design-journal-sections-60-62.md) | Synchronized split volume; historical bodies preserved, navigation updated. |
| [docs/Audio_Library_Architecture_Proposal.md](Audio_Library_Architecture_Proposal.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/CURRENT_STATUS.md](CURRENT_STATUS.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/Documentation_Review_2026-11-19.md](Documentation_Review_2026-11-19.md) | New review inventory, findings and validation boundaries. |
| [docs/File_Workflow_Inventory.md](File_Workflow_Inventory.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/MEMORA_COMBINE_ARCHITECTURE.md](MEMORA_COMBINE_ARCHITECTURE.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/MEMORA_COMBINE_PHASE_1_CONTRACTS.md](MEMORA_COMBINE_PHASE_1_CONTRACTS.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/Memora_Model_Registry_and_Self_Test_Architecture_Plan.md](Memora_Model_Registry_and_Self_Test_Architecture_Plan.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/README.md](README.md) | Current documentation map, source checkpoint and fifth-volume links updated. |
| [docs/Recording_Identity_Handoff.md](Recording_Identity_Handoff.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/Recording_Identity_Implementation_Contract.md](Recording_Identity_Implementation_Contract.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/Runtime_and_Database_Status.md](Runtime_and_Database_Status.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/Self_Test_Timelines_and_Problem_Reports.md](Self_Test_Timelines_and_Problem_Reports.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/Whisper_Catalogue_Resolver_Contract.md](Whisper_Catalogue_Resolver_Contract.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/Whisper_Configuration_and_Test_Design.md](Whisper_Configuration_and_Test_Design.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/Whisper_Execution_Failure_Contract.md](Whisper_Execution_Failure_Contract.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/archive/Asset_and_Deployment_Inventory.md](archive/Asset_and_Deployment_Inventory.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Development_Checkpoints_2026-11-09.md](archive/Development_Checkpoints_2026-11-09.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Development_Checkpoints_2026-11-10.md](archive/Development_Checkpoints_2026-11-10.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/IndexedDB_Audit_and_Repair_Design.md](archive/IndexedDB_Audit_and_Repair_Design.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/IndexedDB_Repair_and_Ownership_Plan.md](archive/IndexedDB_Repair_and_Ownership_Plan.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Initial runtime.md](archive/Initial%20runtime.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Mobile_File_Processing_Architecture_Analysis_and_Plan.md](archive/Mobile_File_Processing_Architecture_Analysis_and_Plan.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Offline_Whisper_Tiny_Implementation_Plan.md](archive/Offline_Whisper_Tiny_Implementation_Plan.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/README.md](archive/README.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Search_Optimization_Research_Record.md](archive/Search_Optimization_Research_Record.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Test_Checkpoint_History_2026-11-09.md](archive/Test_Checkpoint_History_2026-11-09.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Vite_Design_and_Rollout_Plan.md](archive/Vite_Design_and_Rollout_Plan.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/Whisper_Configuration_and_Test_Design_History.md](archive/Whisper_Configuration_and_Test_Design_History.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/archive/iMuse migration.md](archive/iMuse%20migration.md) | Historical/deferred record retained; archive authority/navigation reviewed. |
| [docs/build-versioning.md](build-versioning.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/design-journal.md](design-journal.md) | Canonical history; Version 17, bridging checkpoint entries and review entry. |
| [docs/journal-index.md](journal-index.md) | New whole/five-volume navigation and synchronization policy. |
| [docs/search model optimization.md](search%20model%20optimization.md) | Active status/contract/plan reviewed against current source; dated history and implementation boundaries retained. |
| [docs/validation/docx-custom-properties/README.md](validation/docx-custom-properties/README.md) | Isolated evidence retained; current/historical boundary clarified, no experiment rerun. |
| [filemap.md](../filemap.md) | Current module/test ownership and source checkpoint reviewed; fixture inventory corrected where needed. |
| [fonts/README.md](../fonts/README.md) | Font/license file references checked; no change required. |
| [tests/README.md](../tests/README.md) | Current module/test ownership and source checkpoint reviewed; fixture inventory corrected where needed. |
| [tests/labs/archive-reconciliation/README.md](../tests/labs/archive-reconciliation/README.md) | Isolated evidence retained; current/historical boundary clarified, no experiment rerun. |

## Validation and remaining work

The whole/split section bodies, local Markdown file/anchor references, whitespace errors and changed-file scope are checked for this documentation update. Results: **44 Markdown documents, 442 local file/anchor references and 62 numbered journal sections across five volumes; zero broken local references or mismatched section bodies.** The fifth-volume body also matches the whole-journal section-60-to-end text exactly. `git diff --check` passes, and all changed/new repository files are Markdown. Existing runtime-test counts belong to their original checkpoints and overlap; they must not be added into a new test total.

Application work still requiring its own implementation/validation includes same-family filename-counter priority; full-folder Transcribe transcript reconciliation; Search's shared scan and independent transcript/embedding JSON saves; and the distinct parent/recursive ownership, persistent multi-archive workspace/import and output-metadata plans. Standalone HTML controls and iPhone Files/playback still require real-device acceptance where not already recorded. None of these plans are implemented by this documentation review.
