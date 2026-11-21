# Current-guide preservation and evidence — 21 November 2026

## Purpose and boundary

This is the preservation record for documentation cleanup **checkpoint 2**, not an application contract or new test run. The three live guides have been rewritten to describe current source rather than repeat rollout history. Unique lessons below remain accessible, complete research documents stay intact, and exact previous guide text remains pinned in Git.

Application **2026-11-21.10** and schema **10** are unchanged. Older build IDs, test counts, hypotheses and instructions describe their original checkpoint only. Retired audio/transcript sidecar instructions are not current repair procedures.

## Exact source preservation

All three originals were present in clean commit **da80b8a60407e1402e96f5840d8ec7e87c6a7103** before the rewrite. The pinned copies retain every paragraph, table, test count and original link, including superseded advice. Consult them as historical evidence, not executable guidance.

| Original guide | Lines | UTF-8 bytes | SHA-256 before rewriting |
|---|---:|---:|---|
| [docs/README.md](https://github.com/BCharash/Memora/blob/da80b8a60407e1402e96f5840d8ec7e87c6a7103/docs/README.md) | 81 | 10157 | cf7a826a456ba032b87456fbb0bd36b1038b0ed04c30e72e50c93faa41babd27 |
| [docs/CURRENT_STATUS.md](https://github.com/BCharash/Memora/blob/da80b8a60407e1402e96f5840d8ec7e87c6a7103/docs/CURRENT_STATUS.md) | 561 | 138334 | 904720b32cd88c531b41cbab5ae10ec67d37de11812702703796de86f1f30c75 |
| [tests/README.md](https://github.com/BCharash/Memora/blob/da80b8a60407e1402e96f5840d8ec7e87c6a7103/tests/README.md) | 237 | 42341 | 84f3903bc8db1eca82da2c67ea0ee794c4738c3d7b051ac8cbf300bbfe00d95e |

There is no duplicate full-guide archive in the working tree. The hashes can be checked against the Git blobs; no network lookup or claim of authenticated GitHub publication was made. The checked-out history is the local preservation authority.

## Dated evidence retained

| Checkpoint | Evidence / limitation to preserve |
|---|---|
| Runtime/database consolidation, through 9 November | The original missing-store/ownership failure was repaired through one preserving database owner. Recorded schema/production-consumer checks and user Mac/iPhone/Windows observations cover that repair, not all future schemas/models. Preserve the [repair evidence](IndexedDB_Audit_and_Repair_Design.md) and [repair plan](IndexedDB_Repair_and_Ownership_Plan.md). |
| Production failures/reviews, 10 November | Normal Mac/iPhone transcription and execution-report identity were observed. iPhone blob-link report downloading had lost session access; file-based sharing subsequently preserved it. Controlled reloads produced review opportunities on both devices, but saving an explanation did not prove a particular eligibility decision was selected. .14 presentation was later reported working on both devices. See [execution contract](../Whisper_Execution_Failure_Contract.md) and [dated checkpoint history](Development_Checkpoints_2026-11-10.md). |
| Self-test reports, 13 November | .8 added bounded recent-test timelines and problem reports; .9 made saved observations visible where entered; .10 refined summaries/history. Recorded 98-, 32- and 46-group focused sets overlap and are not additive. Small production success followed by Settings disappearance after tests did not establish a crash, memory-pressure cause or reproducible model failure. See [reporting methodology](../Self_Test_Timelines_and_Problem_Reports.md). |
| Summary, Settings, browser continuity, 18–19 November | Summary includes retained successful measurements only; registry definitions, loaded weights and eligibility are different authorities. Browser-family continuity preserves valid passes across versions without removing later holds. UI, history/delete controls and summary grouping were checked with synthetic data; device acceptance remained limited to the observations actually reported. |
| Source/list and transcript reconciliation, 18–19 November | Old sidecar safeguards distinguished complete folder reads from partial selections, stale data from current File snapshots and share acknowledgement from durable placement. Same-name recovery choices were unusable without meaningful evidence. Numbered iPhone JSON copies made sidecars unreliable as authorities. Preserve these lessons, not the retired create/save/restore workflow. |
| Parent-folder tests and archive repairs, 19–20 November | Parent selection on MacBook/iPhone supplied nested TXT, JSON and playable audio. The 15-file discrepancy and metadata-copy comparison were investigated separately; they were not proof of picker incompleteness. Four archive repairs/metadata cleanup are completed maintenance, not a feature to rerun. Detailed evidence remains in the [parent-selection handoff](../Parent_Audio_Folder_Selection_Handoff.md) and journal section 62. |
| Reproducible identity and root diagnostics, 20 November | Independent digest/UUID vector, renamed no-ID test stability, 107-entry MacBook/iPhone inventory agreement and linked audio supported the new direction. Missing/invalid/unsupported identity and duplicate actual IDs remain distinct from absent embedded identity. [Prefix contract](../Recording_Identity_Prefix_Contract.md) preserves exact method/limits; do not infer whole-file equivalence from a prefix hash. |
| Source progress and bounded reads, 20 November | Application metadata reads were bounded and detail work concurrent; the reported long iPhone source wait could include provider preparation. A spinner/read counter does not diagnose iCloud transfer or peak memory. Preserve the dedicated source-selection-performance fixture and its five original cases, not an unsupported timing promise. |
| Dayananda inventory comparison, 21 November | Earlier standalone observations: 107 audio, all Apple IDs; MacBook 1.193 s, iPhone 0.972 s; matching IDs/files/sizes and 68,277 requested bytes in 2,458 reads. This is user-selected diagnostic evidence, not measured full provider transfer or production warm-cache performance. |
| Audio cache/JSON retirement, .6–.7, 21 November | Production moved to embedded/reproducible identity and metadata-only caches. .6 playback failed because a consumer used recordings while inventory returned records; .7 corrected the real producer/consumer connection and removed legacy support/store. Earlier isolated fixtures supplied the old shape, so they did not establish integration correctness. The .7 183-group set uses synthetic stores/playback and excludes retired suites. |
| Transcript duplicates, .8, 21 November | User observed duplicate 83-record 2016 snapshots and 2/3-record testing snapshots sharing archive identities, plus an empty row. Cleanup originally ran only on reopen. Settings/list maintenance now prunes older identified/empty snapshots while preserving distinct native locations. Recorded 185 groups across 15 suites included concurrency, identity/embedding compatibility, schema rollback and playback resolution; media play was mocked. |
| Combine list origin, .9, 21 November | Recorded 45 groups across catalogue/app/Settings, shared production and iPhone-path gate. Actual Search-to-Combine fixture kept the subset, description and tab-return scope; folder reload reset All. A real 390px iframe checked heading/box geometry. This does not establish Safari visual/Files acceptance. |
| Semicolon descriptions, .10, 21 November | Recorded 33 catalogue/app/Settings groups checked semicolon-separated terms with a comma inside a term. Search retrieval already used semicolons; formatting/help was aligned. This focused rerun overlaps .8/.9 and is not a new full-suite total. |
| Pages deployment incident, 21 November | Build success/artifact creation did not imply publication. The in-progress Pages deployment blocked newer runs; canceling an Actions run was different from canceling the Pages deployment. The user later reported manual recovery worked. Keep the [recovery procedure](../Pages_Deployment_Recovery.md) and its old SHA as dated evidence, not a default to reuse for a future incident. |

These observations retain their reported scope. No latest-device-accepted build is invented from a mix of older successes and newer synthetic runs.

## Preservation map for the rewritten guides

| Removed live-guide material | Retained home / treatment |
|---|---|
| Status chronology, implementation counts, original resume prompts and exact historical wording | Pinned original guides above; whole journal sections 60–62 and existing checkpoint histories remain. This record retains the nontrivial lessons and evidence boundaries. Old prompts are historical, not a second current checklist. |
| Sidecar creation/rebuild/restore and audio-source UUID rules | Retired behavior. Identity-failure, complete/partial-read, concurrency and mobile-save lessons retained here and in the identity/journal records. No new authority is assigned to old JSON. |
| TXT metadata and full-text cache migration | Current [handoff](../CURRENT_STATUS.md#identities-and-local-data), durable-key/schema code, identity contract and journal. Detailed Whisper metadata expansion/backfill was dropped; generic family labels are not silently rewritten. |
| Model history, summary, browser continuity, reviews and resource hypotheses | Current handoff plus catalogue/testing/failure/report contracts; older quantitative results and user observations remain in the pinned originals and dated histories. Notes, reference passes and current holds remain distinct. |
| Search and paragraphing conclusions | Complete [Search research](Search_Optimization_Research_Record.md), [R4/R5 comparison](Memora_Revision4_vs_Revision5_Complete_Analysis.md) and journal remain untouched by this pass. New concise methodology pages belong to the next proposed batch. |
| Old guide module tables and retired test commands | Current filemap/test inventory now own navigation. Superseded commands are explicitly excluded from current instructions. Remaining stale runner routes are queued for the JavaScript audit, not silently described as working. |
| Wordmark font/appearance details | [Font provenance](../../fonts/README.md), [SIL license](../../fonts/OFL.txt), filemap wordmark section, original reporting checkpoints and journal; no font/style changes. |
| Future-work lists and feature approval wording | Current [next-work boundary](../CURRENT_STATUS.md#next-work) summarizes deferred scopes. Detailed Combine/import/portable metadata, library, offline/release and iMuse plans remain for later status-classified consolidation. |
| Other guides linking to removed handoff sections | Repo-local fragments retargeted to the closest current topic. Pinned originals above preserve old section URLs/content when checkpoint-specific evidence is needed. No hidden block of obsolete current instructions remains in the handoff. |

## Continuing maintenance

Keep dated evidence separate from runnable instructions. A change to a test filename requires updating its guide and checking runner support; it does not automatically invalidate earlier results. No new model test, database reset, archive repair or deployment is needed to validate this documentation pass.

This record is deliberately a concise evidence/preservation ledger, not another full-copy archive. Later consolidation should retain its source provenance and unique lessons while removing any new duplication.
