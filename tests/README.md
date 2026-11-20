# Memora test guide

## Shared folder architecture — 20 November 2026

[shared-folder-selection.html](shared-folder-selection.html): **15 synthetic groups passed**, plus 20 parent-folder and 22 identity groups rerun (57 total). Shared defaults/overrides/reset, native directory picking without the upload input, fallback and separately selected transcript linking, empty native folders, cancellation, mock sample-save verification/refusal and 320px containment are covered. Root [test.html](../test.html) is now test 5. Its explicit Save Test File can create a disposable sample on a user-selected device; automated checks use synthetic handles/sharing only. No real user archives or Memora databases were written by these harnesses. Test-5 real-device acceptance remains pending.

## Parent-folder reconstruction checkpoint 2 — 20 November 2026

[archive-folder-access.html](archive-folder-access.html): **20 synthetic adapter/UI groups passed**, plus the 22 identity-helper groups rerun successfully. Includes missing-list/no-JSON reconstruction, source UUID independence, list disagreement, recording ID ambiguity/failure, scope/legacy paths, sampled rename/rebuild, cancellation, real test-page controls and report privacy. No user files, databases, models or writes; synthetic audio verifies player loading only. Root [test.html](../test.html) test 4 is the user device-acceptance page, with a default missing-list simulation and no JSON replacement.

## Reproducible recording identity checkpoint 1 — 20 November 2026

[reproducible-recording-identity.html](reproducible-recording-identity.html): **22 synthetic Chrome groups passed** for the isolated helper, including an independent Python hash vector, embedded priority, prefix bounds, rebuild/rename/size behavior, metadata failures, cancellation/cache, ambiguity and unchanged production UUID-validator compatibility. No user archives, IndexedDB, models or writes. Large-file reads are synthetic; real device/iCloud behavior is the next checkpoint. [Exact contract](../docs/Recording_Identity_Prefix_Contract.md).

## Current recorded verification — 19 November 2026

Reviewed source **47ca641**, displayed build **2026-11-19.25**, schema **6**. The audio whole-folder correction has now been tested as described below; earlier .23 documentation consolidation itself did not rerun tests. The counts below are previously recorded runs, not a sum of independent model/device validations.

| Page / checkpoint | Latest relevant recorded groups | Coverage |
|---|---:|---|
| [audio-location.html](audio-location.html), .25 | 8 | Shared Combine/Search hints, 240px layout, picker cancellation, missing/correct files, batch reuse, cross-archive names, inspectable embedded-ID mismatch, legacy fallback and native folder guidance. Uses stubbed media playback; no actual iPhone playback claim. |
| [transcript-folder.html](transcript-folder.html), .24 recheck | 29 | One read/parse, immutable File snapshot isolation, complete desktop/iPhone versus partial coverage, invalid/conflicting identity, unchanged saves, retries/concurrency, real isolated OPFS, new filename and yearly labels. |
| [transcription-identity.html](transcription-identity.html), .24 | 49 | Actual app with synthetic files/inference, source/recovery/save UI, Settings, Combine sorting/body editor, source failure retention, iPhone cancellation/share/reopen and Transcribe/Combine year-specific JSON guidance; whole-folder iPhone audio pruning, nested retention, returning files, skipped/partial/failure/cancellation safeguards and actual pending-save/reopen controls. |
| [audio-source-persistence.html](audio-source-persistence.html), .24 recheck | 47 | Source identity/storage, no-op/large-inventory paths, recovery cleanup, pending payloads, verified persistence and isolated native handles/database. |
| [whisper-eligibility.html](whisper-eligibility.html), .22 | 13 | Qualification decisions, saved browser-version continuity, distinct browser families, later holds and raw report preservation. |
| [whisper-evidence.html](whisper-evidence.html), .22 | 14 | Journal ingestion, manual recovery, old-context resolution and preserved holds. |
| [whisper-production-reviews.html](whisper-production-reviews.html), .22 | 15 | Legacy/new production keys, cross-version hold/reference handling, review decisions and UI notices. |
| [whisper-production-eligibility.html](whisper-production-eligibility.html), .22 | 8 | Actual Large gate continuity across Chrome versions, later-failure rejection, defaults/platform separation and cached-adapter refusal. |
| [whisper-settings.html](whisper-settings.html), .22 | 12 | Passed summary grouping/measurements, 240/280/350px widths, history/controls and test lifecycle UI. |
| [whisper-executions.html](whisper-executions.html), .22 | 9 | Saved execution/ownership/navigation recovery, selected history deletion and iOS report transport. |
| [archive-reconciliation.html](archive-reconciliation.html), .23 fixture rename | 27 | Isolated historical lab and disposable filesystem. Its older policy is separate from production and is not a current acceptance requirement. |

The .25 guidance change passed **86 groups** (8 shared-audio + 49 app integration + 29 transcript-folder), with overlap in the app checks. The .24 core set was **125 groups** (29+49+47), extending .23’s 119-group core set; the .22 eligibility/UI set was **112 groups**, including overlapping app/Settings checks. Do not add repeated checkpoint totals together. No real Whisper inference or user archives/databases are used by these fixture runs. Real iPhone/iCloud replacement/destination behavior and representative large-archive timing/memory remain device acceptance.

## Running current harnesses safely

Serve the repository through Live Server/localhost and use a separate disposable browser profile, not the profile holding real model qualification or archives. Open the relevant page above without query parameters; it displays its own result. Some pages create/remove their own synthetic database/browser-private filesystem fixtures. Confirm Chromium supports the page's required APIs before interpreting a skipped native test as a pass.

The committed Node runner supports `--suite=transcription-identity --browser`, `--persistence --browser`, and its listed Settings/schema/identity suites; set MEMORA_TEST_BROWSER to the browser executable. It does **not** currently accept transcript-folder or the newer eligibility-suite names as --suite values. Open those pages directly. Their optional `?report=1` mode posts to a runner endpoint and is intended for an orchestrator providing that endpoint, not ordinary Live Server use.

Current manual checks: inspect storage order/centered counts/description→selection→rows; ensure empty lists have no actions; cancel and finish pending JSON sharing; rebuild disposable yearly archives and verify the displayed archive plus folder; re-open unchanged lists; confirm actual failure/review holds are preserved. A browser-version change alone no longer requires a reference retest. Do not deliberately crash or stress devices for this documentation task.

Do not use the four user archives as disposable fixtures. The user's separately planned old-JSON rebuild uses Edit/Combine first to preserve header identities. The separately authorized .24 change fixes whole-folder iPhone audio removal parity. It does not implement filename-counter priority, new detailed Whisper metadata, shared Transcribe/Search reconciliation or batch JSON delivery.

## Historical checkpoint instructions

The following material records earlier counts/builds/filenames and acceptance at those dates. Current instructions above and [CURRENT_STATUS](../docs/CURRENT_STATUS.md) supersede contradictory “current”, “not wired”, unchanged-filename and old 22/32-group statements. Preserve the history without treating it as today's task list.

# Current interface/header candidate — 2026-11-18.4; library architecture paused

Checkpoint 3 is committed as `4c8e5f7`. The user clarified selecting the wrong kind of JSON and had not tried .2; a native iCloud picker defect is unconfirmed. This candidate implements approved **Audio recording list** / **Transcript file list** prompts, correct-file/folder guidance, expected-kind validation, the existing Memora pulse for pending saves and the readable TXT header order. No recursive/library implementation is included. Direct transcription/translation comparisons also verified unchanged metadata values and body bytes after the header reorder.

Open **`tests/transcription-identity.html`** through Live Server in Chrome. Expected: **22/22 groups passed**, shown above the app after the test completes. It loads the actual page with synthetic files, mocked inference, memory recovery for fake handles and a disposable transcript-cache database. It does not select user folders, run real models or use the real Memora database. The native 2B harness remains a separate **32/32** check of actual browser handle/IndexedDB behavior.

Earlier checkpoint-3 verification also passed 31 source-identity, 21 embedded-reader, six Whisper diagnostics, four failure-classification, nine Settings/ownership and seven storage/Settings integration groups. No real-device acceptance is inferred from these results.

Run `node tests/run-recording-identity.mjs --suite=transcription-identity --browser` with `MEMORA_TEST_BROWSER` set to Chromium. Other focused browser suites now supported by the runner: `--suite=whisper-diagnostics`, `--suite=whisper-failures`, `--suite=whisper-settings`, `--suite=database`, `--suite=database-integration` (each with `--browser`).

For this candidate, test the wording on the actual iPhone using disposable copies: choose the wrong list once, confirm that it names the right file/folder and lets you retry/cancel, then choose the correct list. Before sharing, both pending list buttons should pulse like existing Memora save buttons. Cancel one share and confirm it still pulses; complete each share and confirm only that list's pulse clears. Reduced motion should suppress animation. File names/schemas stay unchanged and successful sharing does not prove saved placement. The automated suite covers these state transitions and reads actual CSS animation rules, but native picker/visual acceptance remains pending. See [the library proposal](../docs/Audio_Library_Architecture_Proposal.md) for the paused architecture.

Broader checkpoint-3 manual acceptance uses copied short audio and a new empty output destination; do not test writes against the four migrated archives. Follow [contract section 15](../docs/Recording_Identity_Implementation_Contract.md#15-checkpoint-3--production-transcription-integration) for the ordered desktop/iPhone checks and the supported-container limitation. No agent commit/deployment was performed.

---

## Historical identity checkpoint 2B — 18 November 2026

Open `tests/audio-source-persistence.html` through Live Server. Expected: **32/32 groups passed** in a Chromium browser with browser-private filesystem support. All default database calls are redirected by the harness import map; only temporary fixture databases/private test directories are created and removed. No real Memora database, selected user folder, models or archive changes. The page writes synthetic data in its browser-private filesystem for native persistence verification.

Recorded verification on Mac: **32/32 Chrome groups**, **30/30 Node groups** (two browser-only groups explicitly skipped), **31/31 checkpoint-2A groups**, **21/21 reader groups**, **12/12 schema groups** and **7/7 storage/Settings integration groups**. Node/Chrome runs use installed VS Code's Electron Node runtime and temporary browser profiles. The initial restricted localhost bind failed before browser tests; successful browser runs used authorized unrestricted execution. No real iPhone or representative-large-archive acceptance is claimed.

Run `node tests/run-recording-identity.mjs --persistence`; add `--browser` and set `MEMORA_TEST_BROWSER` for Chromium. The existing `--source` and default reader suites still work. Database regressions: `--suite=database --browser`, `--suite=database-integration --browser`. Source recovery is schema 6; tests verify additive upgrades preserve the original four stores and transcript/semantic cleanup leaves recovery intact.

Checkpoint 3 is not wired. Review [implementation contract section 14](../docs/Recording_Identity_Implementation_Contract.md#14-checkpoint-2b--isolated-source-persistence) before integration; no transcription/model/iPhone deployment test is needed for this isolated harness review.

---

## Earlier test guide

Reviewed 9 November 2026 through candidate application build **2026-11-10.14**. These browser harnesses support focused changes; they are separate from Settings' real model self-test. Detailed prior run counts, device results and checkpoint instructions are preserved in [test history](../docs/archive/Test_Checkpoint_History_2026-11-09.md). Old pending instructions there are historical.

## How to run safely

Serve the repository over localhost using Live Server or a plain static server. Open a test page from the table below; it runs automatically and should finish with **ALL TESTS PASSED**. Use a separate browser profile for developer harnesses: Settings/evidence/selector integration can create synthetic journal, eligibility and diagnostic records. Do not run them in the profile used to establish real model qualification.

Schema tests use temporary `Memora-schema-test-…` databases. Database integration substitutes a temporary `Memora-integration-test-…` owner through an import map; it must not be bundled in a way that bypasses that substitution. Fixtures clean up their temporary databases; closing mid-run may leave fixture databases. Never clear the real Memora or iMuse database for testing.

Whisper harnesses use synthetic workers/pipelines/audio or cancelled/stubbed network responses. Their passes establish code behavior under those fixtures, not real model accuracy, GPU operator execution, iPhone memory reclamation or sequence stability. Expected injected errors can appear in the Console; use the test page's final result. Close fixtures after use.

## Choose a focused harness

| Page | Coverage |
|---|---|
| [audio-source-identity.html](audio-source-identity.html) | Checkpoint 2A: 31 in-memory source-list validation/resolution groups; unknown fields, fingerprints/recovery decisions, source conflicts and checkpoint-1 reader integration. No hashing, UUID generation, writes, database or production integration. Node 22+: `node tests/run-recording-identity.mjs --source`; add `--browser` for isolated Edge. See contract section 13. |
| [recording-identity.html](recording-identity.html) | Checkpoint 1: isolated read-only Apple/iMuse identity reader; 21 groups across all supported containers, malformed/conflicting metadata, provenance and actual exporter fixtures. No production integration or writes. Node 22+: `node tests/run-recording-identity.mjs`; add `--browser` for isolated Edge. See contract section 12 for evidence/limits. |
| [whisper-executions.html](whisper-executions.html) | Separate production journal, live ownership, page-navigation recovery, privacy projection, bounded retention and shared report controls. |
| [whisper-production-reviews.html](whisper-production-reviews.html) | Production decisions, mandatory/manual recovery, deferred reviews/notes, stage-aware stability, ordering and persistence safety in memory. |
| [whisper-worker-failures.html](whisper-worker-failures.html) | Actual worker source with injected typed faults, validated/legacy payloads, original diagnostics and unchanged self-test verdicts. |
| [whisper-failures.html](whisper-failures.html) | Shared failure vocabulary, original diagnostics and real workflow boundary attribution with injected dependencies. No model/storage access. |
| [database.html](database.html) | Version-5 schema, incomplete upgrades, preservation, incompatible/future schemas, blocked requests, connection lifecycle and retry. |
| [database-integration.html](database-integration.html) | Storage/semantic/registry consumers with a temporary database; evidence preservation and Settings registry status/error display. |
| [whisper-configurations.html](whisper-configurations.html) | Canonical definitions, independent legacy snapshot parity, defaults, compatibility, selection/list policy, availability projection and fingerprints. |
| [whisper-lifecycle.html](whisper-lifecycle.html) | Stage deadlines, cancellation, late/duplicate messages, worker/protocol failures, cleanup and per-page activity ownership. |
| [whisper-validation.html](whisper-validation.html) | Inclusive 15% WER gate, normalization, invalid/empty output and separate inference/accuracy outcomes. |
| [whisper-settings.html](whisper-settings.html) | Controls/layout, adaptive Test/Retest, cancellation, reports/copy, recovery, diagnostics and clearing. |
| [whisper-diagnostics.html](whisper-diagnostics.html) | Safe initialized-session metadata, timing and active production worker protocols with injected pipelines. |
| [whisper-attempts.html](whisper-attempts.html) | Durable stages/results, interrupted recovery, locking, retention, failures and history clearing. |
| [whisper-eligibility.html](whisper-eligibility.html) | Qualification rules, exact-context storage and preservation of adverse/successful evidence. |
| [whisper-evidence.html](whisper-evidence.html) | Live/recovered evidence, manual-pass restoration, legacy reviews and context identity. |
| [whisper-production-eligibility.html](whisper-production-eligibility.html) | Canonical selection and qualification gate; unsupported/stale/held configurations stay unavailable. |
| [whisper-production-selector.html](whisper-production-selector.html) | Qualified family-default dropdown, empty state, updates and active-batch protection. |
| [whisper-loader-gate.html](whisper-loader-gate.html) | Actual loader guard, override resistance, simulated iOS/desktop reuse/messages and idempotent release. |
| [runtime-diagnostics.html](runtime-diagnostics.html) | Bounded persistent page/event logs, real fixture navigation, retention and logging-failure isolation. |
| [whisper-disposal.html](whisper-disposal.html) | Disposal request IDs/acknowledgement/deadline, actual worker handlers and mandatory termination fallback. |

The independent `fixtures/whisper-registry-baseline-v2.json` was captured before baseline migration. Do not regenerate it from new production code to hide differences. The removed `whisper-test-worker.js` has no active test requirement; the two production workers remain covered.

## Latest recorded checks and acceptance

Build .24: eight Settings groups passed, with active retest wording, unchanged suspended eligibility and idle-message restoration after cancellation. No inference or cooldown was introduced. User wording acceptance pending.

- Build .20: four loader-gate and six diagnostics groups passed.
- Build .21: 15 catalogue, six production-eligibility, seven database-integration, eight Settings and four selector groups passed (40 total).
- Build .22: 16 catalogue, six production-eligibility and eight Settings groups passed (30 total).
- Build .23: eight Settings and seven database-integration groups passed (15 total), including synthetic exact qualification, collapsed historical validation, other-platform labeling and visible database failure. Its synthetic eligibility key is restored afterward.

These are prior focused runs, not a claim that every suite was rerun for each build or during this documentation refresh. The user accepted .23 presentation. Runtime/database integration previously passed user Mac/iPhone/Windows checks; this does not establish Windows acceptance for all later Whisper changes.

## Real model acceptance

For a future execution change, agree a bounded device checklist first. Settings self-test loads real models and records results in that browser. Manual Tiny is the usual small smoke test; confirm displayed build, chosen exact configuration, WER, eligibility and normal transcription only where relevant. Do not require revalidation for documentation or display-only edits.

Current defaults are 60s prepare/decode, 30s pre-test release, 600s load and 180s inference; the post-inference disposal acknowledgement wait is bounded at 5s. API acknowledgement and worker termination do not prove reclaimed memory. Session WebGPU settings are not an operator execution trace.

Automatic sequences/retries are not implemented. Repeated disposable iPhone tests have caused unexplained page loss, while normal reused Small transcription has remained stable in reported sessions. Do not run rapid Tiny/Base/Small or Medium/Large stress sequences. Do not edit watched files during user testing. Use a plain server without automatic reload for a future agreed diagnosis, preserve downloaded reports, and distinguish current page ID from attempt page ID.

For scope, unresolved issues and the deferred production-error audit, read [CURRENT_STATUS.md](../docs/CURRENT_STATUS.md) and [testing design](../docs/Whisper_Configuration_and_Test_Design.md).

Build .25: seven existing isolated database-integration groups passed after moving/clarifying the registry maintenance control. No reset behavior, inference or eligibility changes.

Build 2026-11-10.1: eight Settings and seven isolated database-integration groups passed after moving/renaming the unload control. No real models, cache deletion or resource reset executed.

Build 2026-11-10.2: four new failure-contract/workflow, six expanded loader-gate, six diagnostics, eight Settings, six production-eligibility and four selector groups passed (34 total). Actual production source is exercised with injected metadata/decode/model and worker reply/event/post faults, including simulated iOS/desktop. No real models or user evidence writes. No eligibility decision or page-loss recovery is added.

Build 2026-11-10.3: 44 groups passed (seven execution journal/UI/navigation, four failure/workflow, six diagnostics, eight Settings, seven database-integration, six production-eligibility and six loader-gate). Execution tests use in-memory fixtures and a dedicated `memora-execution-navigation-test.*` localStorage wrapper for real iframe page replacement, cleaning it afterward. Diagnostics/failure workflow pages substitute `whisper-executions-fixture.js` so normal production history is not modified. No models or real user qualification changes. User check: one short transcription/save, linked Copy/Download, same execution ID in Settings and persistence after refresh on Mac/iPhone; no deliberate interruption needed.

Build 2026-11-10.4: seven execution-history groups passed, adding View/Hide, native-disclosure synchronization and accessibility assertions to the existing shared report control coverage. No model run required.

Build 2026-11-10.5: eight execution-history/report groups passed. Simulated iOS source exercises Save report via native file-sharing API (injected), matching JSON File, gesture-path call, disabled pending action, success, cancel, rejection, unsupported payload/missing API and zero anchor/blob-download fallback. Existing desktop Download and View/Hide coverage remains. Real iPhone Save to Files acceptance is pending; use an existing record and verify source/session retention. Separate intermittent 120-file folder-selection behavior remains unresolved.

10 November acceptance update through .6: the user confirmed iPhone execution-report Save to Files preserves the session and accepted pending transcript-save emphasis. Mac Settings JSON matched transcript diagnostics/ID. A separate refresh-persistence result was not explicitly supplied. Source-folder selection intermittently returned to a blank iPhone Transcribe screen for a 120-file folder; cause remains unproven and must not count against Whisper eligibility. The next worker-provenance checkpoint should use injected faults/legacy replies and a bounded normal success smoke check; no new test run occurred for this documentation refresh.

Build 2026-11-10.7: 104 focused groups passed—four worker-failure envelope/actual source/self-test-verdict, six diagnostics, six loader-gate, 11 disposal, 22 lifecycle, four failure/workflow, eight execution-history/report, eight Settings, six production-eligibility, 13 evidence and 16 catalogue. New worker cases cover pipeline load/inference on iOS/desktop, desktop runtime-import failures, RuntimeError instance vs forged name, TypeError/network-looking text, DOM aborts, thrown strings, malformed/future/mismatched schemas and original error identity through actual parent branches. Self-test AbortError/TimeoutError/NetworkError replies retain failed/Error outer verdicts with original diagnostics nested. No real models or user data reset. User .7 check: one short normal transcription/save on Mac/iPhone and normal report access; no induced failures or fresh qualification required.

Build 2026-11-10.8: 163 focused groups passed across 18 harnesses (11 production reviews; four worker-failure; six diagnostics; six loader; 11 disposal; 22 lifecycle; four failure/workflow; eight execution history; eight Settings; seven production gate; 13 evidence; 16 configurations; five selector; nine eligibility; ten self-test attempts; seven runtime diagnostics; seven database integration). Policy fixtures cover mandatory retest, neutral faults, deferral/reconstruction, explained preservation, unverified/newer-failure protection, manual reference certificates after history clearing, live-owner/unprocessed retention, persistence refusal, stable-completion notes and historical-context UI. Model-share regression remains covered; no real failures/models/user qualification changes. Review fixture inspected at 390px width. Check .8 with one short normal transcription/save/report on Mac/iPhone and the new Settings section, optionally a labeled stability note; no forced failure/retest needed.

Build .13: 11 production-review groups passed, including muted read-only saved information above the new text box, cleared successful drafts, append-only follow-ups and retained eligibility behavior. Phone-width view inspected; no real model run required.

Pause handoff, 10 November, source .14: user accepted .14 locally and awaits Pages/iPhone layout confirmation. The user previously saw controlled reload reviews on both devices and accepted .13 saved-information presentation. No more induced failures are requested; inspect existing records for final layout acceptance. No application tests were rerun for the documentation-only pause refresh. Read docs/CURRENT_STATUS.md rather than historical pending checklists before resuming.


Build 2026-11-11.1: **71 focused groups passed across eight browser harnesses**. History changes are covered by isolated attempt/execution/Settings/review fixtures and evidence/production-selection/loader regressions. Coverage includes newest-pass filtering by complete context, retained failure outcomes, the exact 24-hour successful-record boundary with an injected clock, pending/live protection, empty and selected-only clearing, partial Check all state, View-only technical JSON, preserved iOS share export, top-positioned instability controls and expanded review groups. User acceptance: inspect existing entries on Mac/iPhone; select one report and verify only it clears, then check all behavior. A short normal transcription may verify the linked report. No large-model stress, artificial crash or 24-hour wait is needed.

Build 2026-11-11.2: 20 targeted groups passed (attempt journal and Settings). Added coverage for pass-card grouping across browser revisions and identifiable legacy context formats, and the unconditional separator before Model reviews. Stored qualification contexts remain unchanged. User confirmed .1 successful-transcription expiry at 24 hours; .2 visual acceptance is pending.


Build 2026-11-11.4: 51 focused groups passed across review (13), Settings (9), evidence (13), production eligibility (7) and execution/report (9) harnesses. New cases verify that active/deferred/retest-required/runtime-failure reviews cannot be archived; resolved review archive/restore survives history clearing/reload with original snapshots intact and unchanged eligibility; separate stability/incident views, Show archived, exported archive metadata, restored notes and independent Settings disclosures work. Mobile-width layout inspected using a synthetic observation. User acceptance: inspect major headings and all four View controls; use an existing resolved review or optional stability observation to Archive → Show archived → Restore. No induced crash or large-model test required.

## Self-test timeline/reporting checkpoint — 2026-11-13.8

98 groups across eight isolated browser harnesses passed: whisper-attempts, whisper-lifecycle, whisper-settings, whisper-executions, whisper-production-reviews, whisper-evidence, whisper-eligibility and runtime-diagnostics. New cases cover frozen prior sequence/durations/gaps, legacy backfill with unknown timings, compact snapshot privacy, cleanup-stage recovery semantics, cleanup checkpoint failures, and self-test observations surviving history clearing while PASS/qualification remain unchanged. Shared report exports retain their existing iOS no-navigation sharing coverage.

A separate temporary-profile production Settings check used synthetic Tiny/Base/Small history to verify reconstruction, measured 30/45-second gaps, note saving, matching technical export, persistence after clearing/reload and a contained table at 390 px. No real model inference or user storage was used. See [feature guide](../docs/Self_Test_Timelines_and_Problem_Reports.md) for remaining iPhone acceptance; do not rerun models solely to inspect reports.

## Saved-observation visibility follow-up — 2026-11-13.9

32 focused groups across whisper-settings, whisper-production-reviews and whisper-executions pass. Extended the self-test observation regression to check a read-only saved copy on the source card, visibility after the input clears and the direct-link target. A synthetic production Settings check also verifies real direct navigation, the two-pixel input border, preserved export/clear/reload behavior and 390 px containment. No models or real user storage are used.

## History presentation and wordmark follow-up — 2026-11-13.10

46 groups across whisper-attempts, whisper-settings, whisper-production-reviews and whisper-executions pass. Regression checks cover report summary ordering, seconds and model sequence, visible saved notes and removal of the redundant direct button. Synthetic production UI checks cover the first-entry divider, summary-first export, notes surviving clear/reload and 390 px containment. Header checks at 320/359/360/390/430/600/601/768/900/1280 px verify the 10% smaller wordmark, preserved baseline proportions, unchanged section icon sizes and Settings/tab interactions. No real model inference or user data used.
