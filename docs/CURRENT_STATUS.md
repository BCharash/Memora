# Memora — current status and resume instructions

Reviewed 10 November 2026 against committed build **2026-11-10.6** (`cdcfead`). Runtime/database/catalogue consolidation, production failure classification and execution history/reporting are implemented. The user confirmed the iPhone report-save fix preserves the session and accepted the pending transcript-save styling. Production eligibility feedback and richer worker failure provenance are not implemented. This is a documentation-only checkpoint; build number and code are unchanged.

## Current acceptance and resume boundary

- .2 classification: user reported normal transcription checks worked.
- .3 history: the supplied Mac Settings JSON matched the completed transcription's ID/timings, recorded both workflow/model completion and excluded audio/transcript contents. A dedicated refresh-persistence result was not separately reported. Later iPhone testing produced transcriptions but exposed the report-download session-loss issue.
- .4 inline View/Hide: implemented; the iPhone session loss was subsequently attributed by the user to Download, not inline View.
- .5 iOS report sharing: user explicitly confirmed session preservation after changing execution-report saving to the file share sheet. Desktop keeps Download; iOS offers Save report → Save to Files. No link fallback there.
- .6 pending transcript-save styling: user accepted the shared Search-style border/pulse. It stops on successful sharing and respects reduced motion.
- Intermittent blank Transcribe screen after selecting a 120-file iPhone folder remains unresolved. Do not label it a Whisper model fault, claim report saving fixed it, or force repeated reproductions.

The dated implementation notes below retain original test scopes; this current acceptance summary supersedes their older pending instructions.

## Latest presentation change — pending iPhone transcript save (.6)

The iPhone Save N Transcripts to Files button now reuses Search index-update styling: blue fill, strong border/independent outline and subtle pulse. A pending-export class enables emphasis only while a nonempty batch is ready; disabled/empty/reset states do not pulse, and successful share removes emphasis. Cancellation/failure preserves pending emphasis. Re-export remains available without pulsing after completion. Reduced-motion preference suppresses both animations. Existing share behavior is unchanged.

Verified using the actual app state functions and computed styles at a 390px viewport, including matching Search appearance, outline, saved/reset/empty states and reduced motion; screenshot inspected. No new automated test files or model runs for this visual change. User iPhone check: the next normal unsaved transcript batch should show the prominent button; completed sharing removes emphasis. No model revalidation needed. Existing report-export .5 and separate intermittent source-folder observations remain documented below.

## Current iPhone fix candidate — report sharing (2026-11-10.5)

The user clarified that execution-report Download, not inline View, removed the whole iPhone session including source/recording selection. This is consistent with blob-link download navigation replacing the app document; an OS trace has not established the exact lifecycle mechanism. The execution-report component now uses shared runtime isIOS to label the action Save report and invoke navigator.share with the JSON File, from the click gesture. Choose Save to Files in the sheet. No blob URL/anchor download fallback on iOS: unsupported/error cases retain inline/copy access, cancellation is neutral, and the button is disabled while sharing. Desktop Download remains unchanged. This applies to both normal-transcription result and Settings execution-history report controls; the separate self-test report exporter is unchanged.

Eight execution-report groups passed, adding simulated iOS file content, synchronous gesture-path share invocation, cancellation/error/unsupported cases and absence of anchor/blob fallback; desktop export and View/Hide regressions also pass. No real iPhone share sheet was exercised by these fixtures. User acceptance: publish .5, use an existing Settings execution record first, select Save report → Save to Files, and confirm the page/source selection remains. Cancel once if useful. No new transcription/self-test or storage clearing required. If unsaved transcript UI was lost, Settings → Cached Transcripts → View → Save Cached Transcripts may recover the existing local transcript copy.

The earlier intermittent folder-selection issue is distinct: .4 sometimes returned to a blank Transcribe tab after selecting a 120-file folder, then worked repeatedly on the same build. File selection/list/metadata code and iOS worker are unchanged from .2, and report controls do not run in that handler. Full page loss versus list failure/root cause is not established. Do not claim the report-export change fixes folder loading. Preserve records; no stress/crash loops or eligibility integration until iPhone acceptance is reviewed.

## Latest presentation change — View/Hide execution report (2026-11-10.4)

Completed-transcription diagnostics and Settings execution history now offer View report beside Copy/Download. It expands the existing saved JSON inline and becomes Hide report. The button follows native disclosure changes and reports aria-expanded/aria-controls. Seven execution-history groups passed, including View/Hide, copy/download and recovery. This is presentation-only: no new model test or qualification needed; inspect an existing execution report. The user supplied a correct .3 Mac Settings report matching the completed transcription's ID/timings; refresh persistence/iPhone acceptance was not explicitly confirmed in that exchange.

## Latest checkpoint — transcription execution history (2026-11-10.3)

Normal transcription now owns a separate `memora.whisper-execution.v1.*` history, with explicit production origin, canonical definition/fingerprint, actual operation recipe, stage, model outcome, timings and diagnostics. It starts before preparation/model work and marks model completion before optional paragraphing/saving. Failure or interruption after inference cannot erase the completed model outcome. Metadata and history exclude audio/transcript contents and source filenames; original technical error messages may contain incidental source details. Error message/stack storage is truncated at 4,000/8,000 characters with an explicit flag.

Settings → Transcription execution history is collapsed beside self-test history. Completed-transcription Timing and model diagnostics links to the same execution ID. Both provide collapsed technical JSON, Copy and Download; Settings can clear finished history. Cleared/aged records are explicitly unavailable from older links rather than exporting stale copies. Keep 20 terminal records plus active work; live Web Locks protect other tabs during recovery/clear/prune. Startup/history recovery marks abandoned work Interrupted—cause unknown, preserving its last model outcome. No automatic retry or eligibility changes.

History storage/locking failure warns visibly on the transcription result/error and continues transcription once; it never retries model work. Such failures can leave only the last durable stage, which recovery labels unknown interruption rather than inventing a final outcome. This observation-only fail-open policy must be reviewed before connecting durable failures to eligibility. Copy/Download exports saved execution data, not an audio/transcript copy. File-input save completion means local transcript/cache preparation; later user share-sheet delivery is outside this execution record.

Forty-four focused browser groups passed, including true iframe navigation recovery, live-owner protection, bounded retention, initial/late storage failure, copy/download/clear, actual transcription callback/save-failure attribution and existing loader/Settings/eligibility/diagnostics/database regressions. No real models were loaded. User check: one short normal transcription/save on Mac and iPhone; expand its timing diagnostics to download the execution report, then find the same ID in Settings history. Refresh once after completion to confirm persistence. No crash, model revalidation, cache reset or cooldown trial required. Natural stopping point before any eligibility feedback.

## Latest checkpoint — production failure classification (2026-11-10.2)

Implemented the first [execution-failure contract](Whisper_Execution_Failure_Contract.md) checkpoint. A pure shared classifier annotates normal transcription errors with stage/source/category, original details and canonical configuration ID where known. Metadata/decode, eligibility checks and paragraphing/save boundaries remain distinct from worker failures; generic worker/runtime text stays cause unknown. Original messages, model reuse and actual worker inputs are preserved. No production eligibility changes, durable production records, recovery, cooldown or retries are introduced. Existing self-test policy is unchanged.

Thirty-four focused browser groups passed with synthetic fixtures. User acceptance pending: one normal short transcription using an already-qualified model on Mac/iPhone and its usual save path. No model revalidation or intentional crash is needed. Stop here for review before connecting production failures to eligibility or adding interruption recovery. Worker scripts, catalogue definitions, fingerprints and database schema are unchanged; no agent commit/publication.

## Latest presentation change — unload control (2026-11-10.1)

Moved the standalone Whisper Resources control into Model Registry → Advanced maintenance, alongside Reset stored model definitions. Renamed it Unload active Whisper model, explaining that it stops the production worker while preserving downloaded files and test qualification; the model initializes again when needed. Confirmation/status wording now matches. Underlying release and cache/reset behavior is unchanged. Eight Settings and seven isolated database-integration groups passed; user visual acceptance pending. No model run/reset/cache clearing is needed to inspect this change.

## Latest narrow change — registry maintenance control (.25)

The former Rebuild Registry action is now Reset stored model definitions, inside collapsed Advanced maintenance at the bottom of Model Registry. Explanation and confirmation make clear that it removes historical registry validation/customizations, preserves eligibility/reports/downloaded models, does not refresh test results and does not repair the database schema. The underlying reset is unchanged and is not needed after ordinary tests. Seven existing isolated database-integration groups passed. User check is visual only: expand Advanced maintenance and inspect wording; do not perform a reset merely to test placement. No model tests required.

## Latest narrow change — active retest wording (.24)

While a manual test/retest runs, its selected-model status says Test/Retest in progress rather than presenting the saved eligibility hold as a paused current operation. Unqualified models remain unavailable until a qualifying result; existing eligible models retain their saved status until new evidence. After completion/cancellation/error, the actual saved eligibility message returns. Async status reads cannot overwrite an active test with old paused wording. Eight Settings groups passed, including active wording, unchanged hold and cancellation restoration. Worker inputs, fingerprints and eligibility rules are unchanged; no new qualification is required.

User reported three iPhone tests without crashes when deliberately waiting about a minute between runs. This is a useful uncontrolled observation, not a safe minimum or proof of reclaimed memory. The user explicitly deferred cooldown implementation and asked to study whether 25 seconds might suffice. No cooldown, beep or extra lockout is added. A future agreed comparison should hold device/model/cache and predecessor conditions steady, compare a spaced baseline with a shorter interval in limited sessions, record actual intervals and page continuity, and stop on the first instability rather than stress until failure. No new device trials are requested now.

User check: start one needed retest and confirm the active wording; after finishing/cancelling, confirm saved eligibility returns. Do not deliberately interrupt or rerun Large/Medium merely for a wording check. iPhone shared UI acceptance can be checked after the user's next publication.

## What is complete

| Area | Current state |
|---|---|
| Runtime identity | Shared OS, device type/class and capability reporting. Production Whisper, self-test, Settings and Search audio consume the shared runtime. Runtime migration is closed for the agreed scope. |
| IndexedDB | `database.js` owns version 5 and its four stores. Missing-store/index repair and preservation passed isolated tests and user Mac/iPhone/Windows acceptance. No routine reset is needed. |
| Model definitions | `whisperConfigurations.js` owns 13 built-in exact configurations, family defaults, platform restrictions, loader parameters, worker/library versions and test order/permission. |
| Selection | Async resolver and production gate share the synchronous canonical selector. Self-test lists use the canonical list API. Availability family metadata is a projection of definitions. |
| Worker parity | Self-tests instantiate fresh instances of the production desktop/iOS worker scripts. The obsolete desktop test worker and unused page-side execution fallback are removed. Production retains normal worker/model reuse. |
| Self-test | One selected configuration per run; stage deadlines/cancellation, WER ≤15%, timing/session diagnostics, durable attempt recovery and separate cleanup observations. |
| Eligibility | Browser-local exact-context qualification feeds the transcription selector and loader. Unverified/stale/suspended/failed configurations are withheld. A successful manual test restores eligibility; manual attempts are unlimited. |
| Settings presentation | Current eligibility is authoritative; historical registry validation is collapsed and explicitly separate. Saved reports are at the bottom, with Copy/Download and clearable history. |
| File map | [filemap.md](../filemap.md) explains all 43 application JavaScript files, including the 18 Whisper files, dependencies and cleanup findings. |

“Single source of truth” does not mean combining definitions, downloaded files, test reports and eligibility into one database record. They answer different questions. Definition/selection duplication addressed in builds .20–.23 is complete for that cleanup scope. Exact availability/offline guarantees and production-failure feedback remain separate work.

## Important behavior to remember

- Only **qualified family-default configurations** appear in the transcription dropdown. Passing an alternative Medium quantization does not substitute it for the configured family default. Changing that policy is not implemented.
- Qualification is local to the browser/origin/profile and exact configuration, worker, runtime, fixture, recipe and environment context. A Mac pass does not qualify an iPhone. Browser/PWA storage loss or a material context change can require fresh testing.
- Current eligibility survives clearing saved test reports. Clearing all website data can remove both. Legacy IndexedDB registry validation is historical evidence, not an eligibility override.
- A later self-test execution/accuracy failure blocks the context; unexplained load/inference page loss suspends it pending a successful manual test. Cancellation/timeouts do not establish incompatibility or erase a hold.
- Normal transcription checks eligibility before loading/reusing a worker, but **normal transcription failures do not yet feed new durable eligibility decisions**. Do not promise automatic removal after such a failure.
- Session diagnostics report initialized device/dtype settings. Actual operator backend remains unknown without execution tracing. WebGPU API presence alone proves neither successful inference nor use of every GPU operator.
- Disposal acknowledgement means the API completed; termination means the worker was terminated. Neither proves browser/OS memory reclamation.

## Unresolved iPhone test instability

Repeated disposable tests have sometimes caused whole-page replacement, including after a saved Small pass and during later inference/load. This is more than a Settings-panel close. Resource pressure or repeated worker/model creation remains a hypothesis, not a proven leak or root cause. Disposal acknowledgement did not establish a fix.

The user rebooted and reported at least nine normal Small transcriptions without trouble using production model reuse. This supports keeping stable production reuse separate from disposable-test investigation. The supplied Jetsam log did not correlate with the reported failure; no matching OS/WebKit evidence established the cause. A cable for Safari remote inspection was unavailable.

The proposed resource lab was discarded at the user's request and is absent. Do not recreate it automatically, ask for repeated Small/Medium crash trials, or activate automatic sequences. Avoid editing watched files during user inference; use a server without automatic reload for future controlled diagnosis. File reads alone are not evidence that Live Server caused a reload.

## Next new checkpoint 1 — trustworthy worker failure details

Implement richer error provenance at the existing worker/parent boundary: original error name/message/stack where available, exact configuration, load versus inference stage and a versioned structured description. Feed the existing shared failure-classification contract rather than creating per-model exceptions, a second registry or message-keyword rules. Keep unknown causes unknown: an original error name alone does not prove a network, hardware or model root cause. Legacy/cached workers without new fields must degrade conservatively. **Eligibility decisions stay unchanged in this checkpoint.**

Use injected iOS/desktop faults to verify successful paths, worker error replies/events/posting faults, unknown/legacy replies, aborts, and reliable network/runtime distinctions only where evidence supports them. Confirm no change to dtype, task/language, model reuse or library selection. Review worker protocol/implementation revision and fingerprint implications explicitly: if execution identity changes, retain existing evidence and explain any fresh qualification required; never reset storage or silently reuse incompatible evidence. Stop for one normal short Mac/iPhone transcription check; no deliberate crash required.

## Following checkpoint 2 — production evidence to eligibility

The user agrees with the existing decision rules. Connect verified observations to the single eligibility mechanism, not model definitions:

- Evaluate immediately after a production failure and persist the decision before refreshing choices.
- On startup, recover unfinished executions and evaluate the last durable stage/model outcome. Interruption after model completion cannot penalize Whisper.
- Existing loader checks continue to recheck eligibility before the next use; a stale dropdown cannot bypass a hold.
- Existing successful reference self-tests restore exact-context eligibility; ordinary production success cannot grant WER qualification.

Preserve eligibility for input/decode, known download/network, cancellation and saving/paragraphing errors. Withhold exact configurations on confirmed model/runtime failure; record uncertainty/suspend for unexplained interruption during model work rather than invent incompatibility. Agree persistence-failure behavior before activating decisions. The production journal remains separate from manual self-test evidence. No button press, scheduled scan, background AI or Rebuild Registry action is required for evaluation.

This integration follows checkpoint 1 acceptance. The iPhone source-folder investigation, cooldown duration study, automatic sequences/retries and candidate/variant selection below are separate future work.

## Future model discovery and preferred-variant selection

Currently, production uses fixed qualified family defaults: desktop Medium q4, iOS Medium runtime default. Passing a different candidate does not replace that default. Memora does not automatically choose the fastest/most accurate tested variant.

The intended future direction is to show newly added compatible exact configurations for deliberate evaluation, compare eligible candidates on this browser/device and recommend a preferred variant within each family. The user should see why it was chosen, retain an override, and never lose useful failure history. Begin with reviewed catalogue updates; remote repository discovery is later scope and does not establish executable compatibility. The short fixture is a functional/accuracy gate, not enough to rank broad real-world accuracy or prove repeated-run reliability. See [catalogue roadmap](Whisper_Catalogue_Resolver_Contract.md#future-candidate-discovery-and-device-specific-variant-selection).

## Verification recorded so far

- Runtime/version-5 database foundation: user Mac, iPhone and Windows acceptance passed. These earlier checks do not imply every later Whisper change was tested on Windows.
- Real manual runs on Mac/iPhone demonstrated Tiny qualification and ordinary transcription; Base/Small and larger-model observations are preserved in the [checkpoint history](archive/Development_Checkpoints_2026-11-09.md). No general hardware-support guarantee follows from a short fixture pass.
- Build .21: 40 focused synthetic/browser groups passed. Build .22: 30 focused groups passed. Build .23: eight Settings plus seven isolated database-integration groups passed, including current qualification, collapsed history, other-platform labeling and database errors. These are recorded prior results, not reruns during this documentation refresh.
- Latest .5 iPhone report-sharing and .6 styling acceptance are summarized above. No application tests, model execution, storage migration or publication are required for this documentation-only refresh.

## Deferred work and working rules

Vite/release conversion was intentionally discarded; no Vite configuration/dependencies remain. GitHub Pages remains `main` → `/(root)` and Live Server remains usable. Cache consistency is unresolved; a build footer does not prove all loaded assets match. [Vite](archive/Vite_Design_and_Rollout_Plan.md), [asset inventory](archive/Asset_and_Deployment_Inventory.md) and [Offline Tiny](archive/Offline_Whisper_Tiny_Implementation_Plan.md) are archived deferred proposals, not active instructions. Sharing consolidation, Search experiments and iMuse integration remain deferred; leave `imuse-recording-breadboard` untouched.

Proceed in small, independently testable steps and stop at natural breakpoints. No agent commits/publication, hosting changes or storage resets without instruction. Preserve evidence, user files, model identities and existing file-delivery behavior. Do not restart completed runtime/database work or broadly rename/merge Whisper modules.

Start with [documentation index](README.md), [file map](../filemap.md), [catalogue contract](Whisper_Catalogue_Resolver_Contract.md) and [test guide](../tests/README.md). Detailed chronological handoffs are in the [archive](archive/README.md); the [design journal, section 60](design-journal.md#60-runtime-and-whisper-consolidation-through-build-2026-11-0923) records the decisions.

Resume prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. Build 2026-11-10.6 includes accepted iOS execution-report sharing and transcript-save emphasis. Begin new checkpoint 1: preserve trustworthy worker failure details through the shared contract, with injected tests and no eligibility changes. Checkpoint 2 will evaluate production evidence through the existing eligibility mechanism after acceptance. Keep folder-loading diagnosis, cooldown, automatic sequences and candidate/variant recommendations separate.”
