> **Volume 5 of 5 — sections 60–62.** Synchronized against the whole journal on 21 November 2026. These entries retain their historical dates and decisions; the current handoff governs implementation status.
>
> [Whole journal](design-journal.md) · [Journal index](journal-index.md) · [Current status](CURRENT_STATUS.md) · [Previous volume](04-design-journal-sections-49-51.md)

# 60. Runtime and Whisper Consolidation Through Build 2026-11-09.23

**Date:** 9 November 2026
**Status:** Completed consolidation checkpoint; latest registry presentation user-accepted. Normal-transcription failure feedback is proposed and deferred. Automatic sequences remain paused.

## 60.1 Runtime and database foundation are complete

Runtime identity now has one shared owner, with operating system separate from phone/tablet/desktop form factor and observed capabilities. Whisper, self-test, Settings and Search audio consume that identity. A tablet may run iOS, Android or another OS; device shape alone must not select the iOS implementation. API presence does not establish successful inference or a resolved operator backend.

`database.js` owns Memora schema version 5, with `transcripts`, `semanticEntries`, `semanticMetadata` and `modelRegistry`. Its repair adds missing compatible stores/indexes, preserves records and refuses incompatible/future schemas instead of resetting them. The observed version-4/three-store Mac database became version 5/four stores; user Mac/iPhone/Windows checks passed. The separate iMuse database `imuse-recording-breadboard` remains untouched. Future audio migration requires inspecting both repositories and is not part of this completion.

These scopes are closed. Do not restart runtime migration or routine database repair to resume Whisper work.

## 60.2 What “one source of truth” now means

`whisperConfigurations.js` owns 13 immutable built-in exact configurations, including repositories, loader options, platform rules, worker/library identity, family defaults and test ordering/permissions. The async resolver and production gate share a synchronous selection core. Self-test choices use the canonical list API. `modelManager` derives legacy registry shapes and family availability metadata from those definitions.

Definitions, file availability, test reports and eligibility remain separate because they answer different questions. Removing duplicate execution definitions does not require deleting historical validation or merging all storage into one record. Cache/repository availability remains a limited check, not exact offline-readiness proof.

Production and self-test use the same desktop/iOS worker scripts, while self-tests create disposable instances and production normally reuses its loaded model. The obsolete separate desktop test worker was removed, followed by unused page-side Transformers loading/direct-pipeline fallbacks. The file audit found no byte-identical application modules; the remaining 40 application JavaScript files, including 15 Whisper files, have documented responsibilities in [the file map](../filemap.md). Broad file merging/renaming is not a necessary next step.

Builds .20–.23 completed the agreed dead-code, catalogue-selection, self-test-list and registry-presentation cleanup. Those cleanup builds did not change active worker execution inputs or fingerprints and did not require new model qualification.

## 60.3 Test accuracy, reports and recovery

Self-tests run one selected exact configuration at a time. They have cancellation, bounded stages, activity ownership, durable attempts and last-stage recovery after page loss. The agreed smoke-test accuracy gate is **WER ≤15%**, compared without rounding; inference completion and accuracy are separate outcomes. The short English fixture does not establish multilingual, translation, long-audio, offline or sequence reliability.

Saved reports retain model/context, build, stages, timing, transcript/accuracy and cleanup observations. Settings puts current results first and saved history at the bottom, with readable summaries, Copy/Download, collapsed technical detail and visible separation. Cancel sits below the selector/action row and is hidden when idle. Clearing completed reports preserves independent eligibility/review decisions; it is not a reset of model suitability.

Runtime diagnostics retain bounded page/navigation, Settings and worker lifecycle observations. Downloads take a fresh snapshot so page events after a saved success can be inspected. A passing inference can be followed by whole-page loss; these are separate facts, not grounds to relabel the saved pass as an accuracy failure.

## 60.4 Qualification and manual recovery

Current eligibility is local to an exact configuration, worker/library, protocol/fixture, recipe, browser/environment and observed capabilities. A qualifying self-test grants eligibility. Confirmed model execution/accuracy failure blocks; unexplained load/inference interruption suspends pending retest. Cancellation and timeout do not prove incompatibility or clear a hold. A newer adverse decision cannot be erased by replaying an older pass.

The initial implementation required a `deliberateRetest` flag to release a hold. User reports exposed the confusing case of a genuinely passing manual test that did not restore eligibility. Build .17 simplified recovery: **any qualifying user-requested manual pass can restore its exact context**, regardless of the old flag or button label. Older withheld manual passes can be reprocessed conservatively. Manual attempts are unlimited; automatic/sequence attempts cannot inherit that manual rule.

The transcription dropdown exposes only qualified **family-default configurations**. A pass of another Medium dtype does not replace or qualify the selected family default. The loader rechecks eligibility before creating/reusing a worker; unsupported OS targets do not silently become desktop configurations. Storage failure cannot grant eligibility.

Build .23 made Settings registry wording agree with current eligibility. Historical IndexedDB validation is retained in collapsed disclosures; availability is labeled separately. Other platforms are not presented as tested on the current device, and a custom/older definition cannot borrow eligibility merely by reusing an ID. The user accepted this presentation.

Normal transcription presently consumes eligibility but does **not** persist new eligibility decisions from its own failures. That feedback loop is remaining work, not an implemented promise.

## 60.5 iPhone repeated-test instability remains unresolved

Reports showed whole-page replacement around repeated disposable Small tests, sometimes during load/inference and sometimes after a saved successful result. Resource pressure or repeated model/worker creation/disposal is plausible but unproven. The user later rebooted and completed at least nine normal Small transcriptions without trouble using production reuse. This supports distinguishing normal reuse from disposable-test behavior; it does not identify a root cause.

Build .19 added a bounded post-inference disposal request: await the pipeline disposal API if available, accept only a matching acknowledgement, wait at most five seconds, then always terminate. Active failed/cancelled/timed-out work uses forced termination. Tiny reports on Mac/iPhone acknowledged disposal. An API acknowledgement and termination request do not verify physical memory reclamation, and later Small page loss did not establish that cleanup solved the problem.

The supplied Jetsam event did not correlate with the reported failure, and matching OS/WebKit evidence was unavailable. Remote Safari inspection was constrained by the missing cable. A proposed isolated reuse/resource lab was discarded at the user's request; it is absent and must not be recreated automatically. No rapid sequence or repeated Medium crash trial is requested. Stop editing watched files while the user tests, and use a non-reloading server for future agreed diagnosis; reading files alone does not demonstrate a Live Server reload cause.

## 60.6 Sequential testing and retry policy are future work

The intended design is an explicit saved sequence, one configuration at a time, with an initial attempt plus at most one automatic retry. Reserve the budget durably before retrying; preserve both outcomes, and distinguish “Passed on retry” from consistent success. Manual testing remains unlimited.

A reload/page loss must recover paused and require explicit resume, not automatically relaunch the interrupted model. Cancellation stops; checkpoint/storage/cleanup uncertainty pauses. Shared preparation faults must not cascade through model retries. Qualification after an automatic failure/pass pair still needs an agreed confirmation rule. None of this automatic coordination is active, and it remains on hold pending stability decisions.

## 60.7 Evidence, next boundary and documentation

The recorded focused regressions were 40 groups for .21, 30 for .22 and 15 for .23. They exercised synthetic/local fixtures, not real model/GPU accuracy or memory reclamation. Earlier runtime/database acceptance covered Mac/iPhone/Windows; later Whisper acceptance must not be generalized to untested Windows or Android/iPad hardware. Exact run observations and historical counts remain in the [checkpoint archive](archive/Development_Checkpoints_2026-11-09.md) and [test history](archive/Test_Checkpoint_History_2026-11-09.md).

The next proposed checkpoint is a **15–25 minute read-only audit of normal transcription error paths**, deferred by the user. Distinguish model faults from input/decode, cancellation, storage/export and page interruption before agreeing persistence/recovery rules. Implementation would be a separate authorized step. There is no need to begin it now; .23 is a stable stopping point.

Vite/release conversion was intentionally discarded. Live Server and GitHub Pages `main` → `/(root)` publishing continue. The human build footer identifies its module, not full cached-asset consistency. Vite, asset publication and Offline Tiny plans are archived deferred work; sharing consolidation, Search research and iMuse integration are also outside the current scope.

This documentation refresh preserves prior handoffs in the archive, adds current summaries and repairs links. It does not change application code, build .23, model options/fingerprints, storage or publishing. Start future sessions with [CURRENT_STATUS.md](CURRENT_STATUS.md); historical journal instructions do not override that handoff.

## 60.8 Follow-up: active status wording and cooldown observation — candidate .24

The saved eligibility message “Paused pending retest” was ambiguous while a new retest was running. Candidate .24 temporarily presents “Retest in progress. Transcription remains unavailable until this test passes.” for held configurations, then returns to saved eligibility at the end. Already eligible models have separate wording that preserves their current qualification. Async reads are guarded so they cannot restore stale paused text during a run. Eight Settings groups passed, including unchanged hold and cancellation restoration. User acceptance is pending; worker execution/fingerprints and qualification rules are unchanged.

The user reported three successive iPhone tests without crashes when waiting about a minute. Cooldown duration remains unproven; the user deferred the proposed 60-second lockout and asked whether 25 seconds might suffice. No timer, beep or cooldown is implemented. Any later study should use limited, agreed comparisons with actual cleanup-to-next-start intervals and controlled model/device/cache conditions; stop at instability rather than repeatedly force crashes. Disposal acknowledgement is still distinct from confirmed memory reclamation. Normal-transcription failure feedback remains separately deferred.

## 60.9 Registry reset presentation — candidate .25

The user found Rebuild Registry confusing when reviewing recent tests. This action resets the older stored definition records; it does not ingest or refresh test outcomes. It is now labeled Reset stored model definitions inside collapsed Advanced maintenance at the bottom of Model Registry. Explanation and confirmation explicitly distinguish removal of historical registry validation/customizations from preserved current eligibility, saved reports and downloaded models. It is troubleshooting only, not routine post-test work or database-schema repair. Reset implementation is unchanged. Seven existing isolated database-integration groups passed; user visual acceptance is pending. No real reset/model run is needed for this presentation check.

## 60.10 Unload control placement — 10 November 2026, candidate 2026-11-10.1

Moved the standalone Clear resources action into the existing collapsed registry Advanced maintenance area and renamed it Unload active Whisper model. Explanation/confirmation distinguish stopping the active production worker from deleting downloaded model files or resetting eligibility. Self-tests already terminate their own workers; initialization for later transcription may reuse disk-cached files but not the disposed test instance. Cache clearing remains beside storage figures. Underlying release, cache and eligibility behavior is unchanged. Eight Settings and seven isolated database-integration groups passed; user visual acceptance pending. No cooldown, release guarantee or model-setting change was introduced.

## 60.11 Production execution-failure contract — 10 November 2026, candidate .2

The user asked for a well-thought-out addition to shared registry/model management rather than scattered error rules. Definitions remain canonical; the new pure whisperFailures module owns classification, future execution records own observations, and the existing eligibility layer remains the decision authority. Errors attach versioned stage/source/category/certainty, original details and exact configuration ID when known. Metadata/decode, eligibility, paragraphing/save and model-work errors are distinguished. Abort intent and worker/network/runtime root causes are not invented from text. Existing worker protocol/fingerprints and self-test policy are unchanged.

The first checkpoint annotates production errors only, including parent worker replies/events and local posting failures. It neither persists execution records nor changes qualification. Thirty-four injected browser groups passed. One short normal transcription/save on Mac/iPhone is the acceptance scope; no intentional crash or fresh qualification required. Review trustworthy cause evidence and eligibility integration next, then durable production interruption recovery separately. Ordinary transcription has no reference WER and must never be reclassified as a qualifying manual self-test pass. Cooldown and automatic sequences remain deferred.

## 60.12 Durable transcription execution history — 10 November 2026, candidate .3

After user acceptance of classification, the user requested inspectable execution data. The existing per-transcription timing/model area is the natural completed-run view, but a crash may produce no transcript. A separate production journal now provides one saved record referenced by that result and by collapsed Settings Transcription execution history, both with technical JSON, Copy and Download. Clearing history does not clear qualification. The record exists before model work and marks model completion before paragraphing/save; interrupted postprocessing cannot turn completed inference into a model failure.

The explicit production-origin namespace is separate from self-test attempts. It stores configuration identity, operation/environment, stages, timing and failure diagnostics but not audio, transcript contents or filenames. Retention is 20 terminal records plus live work. Web Locks protect live owners during recovery, pruning and clearing; real page-navigation fixtures verify abandoned work becomes interrupted with cause unknown. Storage/locking failures warn and continue transcription once in this observation-only phase. Any future eligibility integration must separately settle persistence-failure safety. Manual external share delivery remains outside the recorded local save workflow.

Forty-four focused browser groups passed, including seven new execution journal/UI/navigation groups and actual workflow post-inference/save-failure integration. User Mac/iPhone report/persistence acceptance is pending. Worker/fingerprint/model settings, qualification decisions and database schema are unchanged; no cooldown or automatic retry. This is a stopping point before eligibility feedback.

## 60.13 Inline execution report visibility — 10 November 2026, candidate .4

Added View report beside Copy/Download in the shared execution-report component used by completed results and Settings history. It expands the existing saved JSON inline and changes to Hide report, synchronized with native disclosure toggling and accessibility state. Seven execution-history groups passed, including copy/download, recovery and new View/Hide assertions. No storage/model/eligibility behavior changed. Mac .3 report from Settings matched the transcription ID/timing; this verified the shared-record relationship, not a separately confirmed refresh/iPhone result.

## 60.14 iPhone execution-report export — 10 November 2026, candidate .5

User iPhone .4 testing distinguished two symptoms: intermittent return to a blank Transcribe tab after selecting a 120-file source folder, and loss of the whole source/transcription session when downloading an execution report. The latter was clarified as Download rather than inline View. Blob-link download navigation is the working explanation; exact OS/page lifecycle is unproven. Candidate .5 changes the shared execution-report iOS action to Save report through navigator.share with a JSON File. No link fallback is allowed there; unavailable sharing offers Copy/inline report, cancellation is neutral and desktop Download remains unchanged. Runtime OS identity is reused, covering iOS/iPadOS rather than a new phone classifier. Separate self-test export is outside this narrow change.

Eight execution-report groups passed, including simulated iOS success/cancel/error/unavailable cases, payload identity and no blob-link navigation fallback. Real iPhone acceptance remains required. Check an existing record first and verify returning from Save to Files preserves source/result state. Cached Transcripts export can recover a locally stored transcript after UI session loss; do not clear browser data. Folder-loading instability remains a distinct unresolved observation and must not be declared fixed by report export. Eligibility/cooldown/model parameters/storage schema are unchanged.

## 60.15 Pending iPhone transcript-save emphasis — 10 November 2026, candidate .6

At the user's request, Save N Transcripts to Files now shares the existing Search index-update button styling instead of adding another animation definition. Pending nonempty enabled batches show the blue fill/border, independent black outline and pulse. Successful sharing removes attention; cancellation/error does not clear it, and empty/source-reset states remain plain/disabled. Reduced motion suppresses both shared animations. Real state functions/computed CSS were checked at 390px width and a screenshot inspected; no model or share-path change. iPhone visual acceptance on the next ordinary save is pending.

## 60.16 Acceptance, next worker checkpoint and variant roadmap — 10 November 2026

The user confirmed the iPhone execution-report Save to Files fix preserves the session and accepted the prominent pending transcript-save styling. Source build .6 is committed as cdcfead. The earlier supplied Mac Settings execution JSON matched the displayed transcript ID/timings and contained no audio/transcript. Dedicated refresh-persistence acceptance was not separately reported. The intermittent 120-file iPhone folder-selection blank screen remains unresolved and is not evidence of a model failure. No change to runtime/model settings or eligibility followed from these UI fixes.

Next new checkpoint 1 is trustworthy worker failure provenance through the existing shared classification contract: original error type/details, stage and exact configuration, conservative legacy/unknown handling, with injected iOS/desktop tests. Error text/name alone must not establish a network or model root cause. This checkpoint leaves eligibility unchanged; worker version/fingerprint implications must be explicit, with preserved historical evidence and fresh validation if required. Checkpoint 2, after acceptance, will connect production evidence to the single eligibility authority. Evaluation will run immediately after production failures and on startup recovery; existing loader checks and successful reference retests complete the loop. No background AI, manual registry rebuild or periodic scan is needed. Preserved model completion prevents saving/paragraphing/page faults from disqualifying successful inference; ordinary transcription success cannot replace reference WER qualification. Persistence-failure policy must be agreed before decisions activate.

The user also asked why multiple Medium variants do not compete in the Transcribe dropdown. Current production uses a fixed platform family default—desktop q4, iOS runtime default—and offers it only when exactly qualified. A passing alternative does not replace it. The user's Mac measurements suggest Medium may provide less practical benefit than Small/Large there; that is device-specific evidence, not a universal model judgment.

The future registry roadmap is reviewed candidate introduction, visible evaluation choices, device/context-specific comparison and explainable preferred-variant selection within each family, with user override. Compare speed/load cost, accuracy and observed reliability separately. The existing short English WER fixture is a functional gate, not broad general-accuracy ranking; better accuracy comparisons require broader evaluation. Start new candidates with reviewed canonical catalogue updates; remote repository discovery is a later suggestion mechanism, not automatic compatibility approval or execution. Keep evidence, definitions and preference/eligibility distinct. Automatic sequences/retries, cooldown and candidate ranking remain future work. This entry/documentation refresh implements none of those policies and does not advance build .6.

## 60.17 Structured worker failure provenance — 10 November 2026, candidate .7

Implemented the agreed first new checkpoint without connecting production errors to eligibility. Shared whisperFailures helpers serialize and validate an additive version-1 worker failure envelope across both actual workers and parent adapters, preserving original type/message/stack/code, canonical ID, load/inference stage and owned module/pipeline/state boundary. Legacy messages remain usable; malformed/future or mismatched identities never acquire confident cause. Error events preserve available exception/location evidence. Actual Wasm runtime-error instances are distinguished from names or network-looking strings; generic errors remain uncertain.

Production history retains typed failure evidence with bounded nested diagnostics. Self-test error JSON gains richer failure details while its legacy outer Error and pass/fail/cancel/timeout semantics remain unchanged; worker AbortError is not silently treated as user cancellation. No eligibility reducer, dtype/library/task/language selection, pipeline/disposal/reuse or successful message change. Worker execution/protocol revisions intentionally stay 2 and fingerprints remain unchanged for this diagnostic-only addition; the envelope has its own schema version. Existing qualification is preserved.

104 focused synthetic/local browser groups passed, including real worker source injected with load/inference/import faults, typed production-parent round-trip, forged-name/legacy/mismatch checks, self-test verdict parity and lifecycle/disposal/history/Settings/eligibility/catalogue regressions. No models or intentional device failures. User Mac/iPhone one-short-transcription/save acceptance is pending. Checkpoint 2 remains separate and unimplemented until acceptance; cooldown, source-folder investigation, automatic retry and model candidate selection remain deferred.

## 60.18 Production eligibility, deferred reviews and session stability — candidate .8

The user accepted .7 on Mac/iPhone and refined checkpoint 2: confirmed runtime faults require reference retest, uncertain active-model incidents need user input with Decide later, and successful inference followed by unstable session behavior must not itself disqualify the model. Candidate .8 implements those rules through the existing evidence bridge, preserving the base qualification and canonical definitions rather than adding another registry. A new production-evidence repository retains incident snapshots, user actions/explanations and successful manual-reference certificates independently of clearable execution history.

Current-context pending reviews have a persistent Transcribe route to Settings. Choices are Require a retest, Keep previous eligibility (proof of prior/current reference qualification plus explanation required) and Decide later. Confirmed runtime holds and user-chosen retest requirements cannot be overridden through reviews. Historical-context incidents remain auditable without blocking/nagging current contexts. Newer failures remain authoritative; a later manual reference pass resolves applicable holds. Production success/automatic attempts cannot masquerade as qualification. Delayed page recovery uses last durable pre-recovery time, not startup time, so it cannot undo a later reference pass—even if self-test history was cleared.

Model completion precedes paragraphing/save. Post-completion workflow interruption creates a stability observation only; users can also attach notes after a completed execution, with unknown cause and up to five available same-page production summaries and five retained self-test summaries. No physical-memory confirmation, pressure attribution, automatic cooldown or retry is claimed. Fully completed workflows followed by later page loss are not automatically called crashes. Older execution records without full qualification context are retained without invented identity/automatic disqualification.

Initial/required pre-model evidence failures stop risky work; late successful-result history failure is warned separately. Incidents remain protected from execution clear/prune until durable capture/acknowledgement. The gate refuses older cached bridge support. Automatic model-choice refresh preserves earlier successful iPhone exports waiting to be shared, while deliberate model changes retain reset behavior. Worker inference settings/fingerprints and database schema are unchanged.

163 focused browser groups passed, including 11 new policy/UI groups, five selector groups (including pending-export preservation), seven gate groups (including stale-adapter refusal) and previous worker/history/evidence/Settings/storage regressions. Narrow review layout was inspected. User .8 normal-use acceptance is pending; no deliberate model/device failure required. This is the next stopping point. Cooldown, large-folder diagnosis, automatic sequences and preferred-variant discovery remain deferred.

## 60.19 Storage refresh separator — 10 November 2026, candidate .9

The user reported normal transcription working so far and no eligibility reviews, then requested clearer separation above Refresh Storage Information. Added the same thin category divider used elsewhere, above the general refresh action. This only changes markup/build identification. Refresh rereads storage/cache/IndexedDB totals, model-file availability and Settings/runtime/history; it can synchronize saved evidence through existing history rendering, but does not test models, download weights, clear caches, reset definitions or reload the page. Settings opening already refreshes. No new model run/test required for this presentation edit; .8 device acceptance scope remains as reported, without inventing additional coverage.

Correction in candidate 2026-11-10.10: moved that divider above the Browser storage usage description rather than between the description and Refresh Storage Information. Both now remain grouped below the model area. No behavior change.

Grouping follow-up in 2026-11-10.11: the storage explanation and refresh button now sit below Whisper Models, with a double-line divider below them before Whisper Self-Test. The original button/listener is retained across Settings rerenders. Presentation only; existing Settings regression checks passed.

Delimiter refinement in 2026-11-10.12: added a single standard rule above the refresh group, and replaced the compact double border below with the same two thin spaced rules used between Browser storage quota and Semantic Index (bottom border plus category divider). No behavior change.

## 60.20 Saved review observations versus additional information — candidate .13

User controlled reloads on MacBook/iPhone produced reviews, and they described the interruption as a deliberate test. They asked why Save observation stayed enabled and preferred saved text greyed above a fresh input. .13 now shows timestamped saved entries in muted read-only text above Additional information, renames the action Add additional information and clears a successfully submitted draft. Failed saves retain text; newer typing during a save is preserved. Original entries remain unchanged and additional notes do not affect eligibility. Eleven review groups passed and a narrow screenshot was inspected. Existing records suffice for visual acceptance; no model interruption needed. The user's report did not specify whether Keep previous eligibility was chosen, so saving the explanation alone must not be recorded as proven hold resolution.

## 60.21 Settings history organization — candidate .14

Kept Advanced test settings with Whisper Self-Test and added a two-line boundary before a distinct History and Reviews area. Its collapsed entries are Self-test history (reference tests), Transcription history (ordinary executions), and Model reviews and stability notes (eligibility decisions and nonblocking observations), each with a short scope description. Added a separator before Runtime. Existing IDs/handlers and direct review navigation are preserved. Eight existing Settings test groups passed; no model/storage/eligibility behavior changed. Visual acceptance uses existing entries only.

## 60.22 Stable pause and current resume boundary — 10 November 2026

The user is nearly at the weekly usage limit and wants a reliable stop/resume record. Source build 2026-11-10.14 (de50cfb) is the completed implementation checkpoint, with its latest grouping accepted in Live Server and public/iPhone visual confirmation pending. Earlier worker provenance passed normal Mac/iPhone use; controlled production reloads on both devices produced review characterization, and .13 saved-observation presentation was accepted. Saving the explanation alone is not proof that Keep previous eligibility was selected or a hold resolved. No further crash/reload trial is required.

The current-status document is condensed into an authoritative handoff; full accumulated 10 November notes are preserved in archive/Development_Checkpoints_2026-11-10.md so old pending instructions cannot masquerade as new work. Documentation index, contracts, broader plan, test guide and file map point to this boundary. Documentation-only refresh; no code/build change or new application test run.

Next: finish .14 Pages/iPhone visual acceptance with existing records, then use the stable build normally. No implementation needs to continue uninterrupted. Optional future investigation is the intermittent 120-file iPhone source-folder blank screen, beginning with read-only evidence review if it recurs, without attributing it to Whisper. Cooldown measurement and automatic sequence/retry remain deferred; no 25/60-second safety guarantee. Later candidate discovery and preferred-variant selection remain separate reviewed designs requiring better accuracy/reliability evidence. Do not restart completed runtime/database/catalogue/eligibility work, reset storage or automatically resume Vite/offline/iMuse plans.


## 60.23 History controls and retention — 11 November 2026, candidate 2026-11-11.1

After confirming .14 on Mac/iPhone, the user requested consistent right-side View controls for the three History and Reviews categories, simpler technical reports, selective clearing and useful retention. Implemented initially unchecked per-result/Check all selection in both histories; clear stays disabled until a selectable record is chosen and deletes only that selection under owner locks after evidence synchronization. Active work and unprocessed production evidence remain protected. Failures, interruptions and cancellations are retained until explicitly cleared rather than discarded by the former count limit. Successful transcription reports expire after 24 hours during journal maintenance, leaving saved reviews/stability observations independent. This provides a full-day observation window without claiming a scientifically derived stability threshold.

Self-test presentation shows only the newest passed attempt per complete eligibility context; older passes remain stored as evidence, and incomplete legacy contexts are not merged. Removing a visible latest pass may expose an older stored pass. Technical report is a heading above View/Copy/Download; JSON has no redundant native triangle. Production reports preserve the established iOS share-sheet Save route. Instability reporting moves above the technical controls. Review group headings display immediately within the viewed category; individual review entries remain disclosures. Added a double Runtime boundary. No model definitions, worker lifecycle, eligibility policy or cooldown changed. Device acceptance is pending; test fixtures use isolated storage and clocks, without real model workloads.


## 60.24 Historical pass duplicates and empty-history boundary — candidate 2026-11-11.2

The user confirmed successful transcription history expired at 24 hours, but older duplicate self-test passes remained visible. The .1 display filter required a complete identical eligibility context, so legacy records and changes in browser/fingerprint could bypass grouping. .2 groups passed cards by configuration ID plus OS/platform, using recorded legacy environment fields when available. Full eligibility contexts and stored evidence remain independent; failures and records without identifiable configuration/platform remain visible. Added an unconditional divider between Transcription history and Model reviews, independent of whether any execution rows exist. Targeted attempt/Settings checks cover the correction; device acceptance remains pending.


Build 2026-11-11.3 adds the matching permanent divider below Self-test history and above Transcription history, as requested. Both category boundaries remain visible regardless of empty/collapsed history; presentation only.


## 60.25 Settings hierarchy and reversible review archiving — candidate 2026-11-11.4

The user approved matching Whisper Self-Test and History and Reviews to the major Display/Storage headings, splitting Model eligibility reviews from Session stability observations, and archiving while preserving data. Implemented four independent View/Hide history/review areas with permanent separators. Stability observations retain optional additional information and have no eligibility decisions. Resolved reviews/stability observations can be archived, shown through Show archived and restored. The existing repository stores an optional archivedAt and append-only archive/restore events under its writer lock; original evidence and qualification remain unchanged. Unresolved reviews cannot be archived, and active incidents remain visible even if an archive timestamp exists. Direct Transcribe review navigation still opens the eligibility area. No model definitions, worker lifecycle, schema or cooldown change. User device acceptance pending; automated tests use isolated storage and synthetic observations.


## 60.26 Graphic-and-lettering Memora wordmark — candidate 2026-11-13.1

13 November 2026. User requests the iMuse wordmark treatment in Memora: icons/Memora.png suggests Me, followed closely by mora. Added a central 56 px brand image plus Dancing Script 500 at 42 px, with a cyan/blue/violet gradient, adjusted baseline and accessible Memora heading. The original context icon remains linked to the active tab; its mobile size is 56 px to fit the new central title. Font is locally bundled unchanged from Google Fonts under SIL OFL, with source/hash/license documented. No external font service is needed at runtime.

Isolated Chrome checks passed for local asset/font loading, accessible heading label, 320/390/900 px fit, non-overlapping visible header elements, all tab/context-icon transitions and Settings opening. Rendered phone/desktop headers were reviewed. No model inference, real recordings or user storage were used, and no model/runtime regression suite was rerun for this presentation-only change. The earlier .4 Settings acceptance and resource-profiling plans are unaffected. iMuse itself was not changed by this Memora task.


## 60.27 Wordmark size adjustment — candidate 2026-11-13.2

13 November 2026. Increased mora lettering from 42 px to 43 px at the user’s request to better match the graphic’s figurative e. Color, position and all application behavior are unchanged. CSS/build diff checked; runtime tests were not repeated for the 1 px adjustment.


## 60.28 Wordmark enlarged by 20% — candidate 2026-11-13.3

13 November 2026. User approves the 43 px lettering and requests a 20% enlargement of both graphic and suffix, checking phone fit. Increased central artwork from 56 to 67.2 px and lettering from 43 to 51.6 px, scaling gap, rounding and baseline offset proportionally. The separate tab-context icon remains 56 px on phones.

Isolated Chrome checks passed at 320/360/390/430/900 px without horizontal overflow or header control overlap. At 320 px, the visible wordmark is about 157.6 px wide, with about 9.2 px clearance from the section icon and 25.2 px before Settings. Reviewed 320/390 px renders; tab switching, stable branding, local font and Settings opening still pass. Presentation only; no model/runtime tests repeated. Final appearance remains for user preference review.


## 60.29 Restore full-size phone section icons and fit branding — candidate 2026-11-13.4

13 November 2026. User wants Transcribe/Combine/Search graphics to remain 80 px on phones and permits reducing only the central wordmark when necessary. Removed the 56 px phone override. A phone header grid reserves 80 px for section art, 40 px for Settings and 12 px gaps; the caption occupies a full-width second row. Central artwork remains 67.2 px on ordinary phone/desktop widths; only below 360 px does the wordmark scale to 90%. Desktop section artwork remains 120 px.

Applied the requested extra 1 px to mora (51.6 to 52.6 px at normal scale). Anchored its baseline relative to the artwork so changing text size does not lower it; measured baseline difference from the previous design is under 0.01 px, including proportional narrow scaling. Existing gradients, local font, accessible name and tab behavior remain.

Isolated Chrome passed at 320/359/360/375/390/430/600/601/900 px: exact section-icon sizes, no horizontal overflow/visible control overlap, caption clearance, preserved baseline and normal tab/Settings operation. At 320 px, the wordmark has about 12.3 px clearance on each side. Reviewed 320/390 px renders. This is a presentation change; no model/runtime regression suite was repeated and the 2026-11-11.4 runtime acceptance remains separate.


## 60.30 Tagline revision — candidate 2026-11-13.5

13 November 2026. Changed the tagline to Your memories, rediscovered. User asks about desktop graphic sizes: central artwork is 67.2 px versus 120 px section art; no new size is selected or implemented in this change. Existing responsive layout and lettering are retained. Static diff/whitespace checks only for this text change.


## 60.31 Larger desktop brand graphic — candidate 2026-11-13.6

13 November 2026. User approves increasing the central desktop graphic to match the 120 px section graphics. Above 600 px, scale the complete wordmark by 120/67.2: artwork is 120 px and mora about 93.93 px, preserving gradient, spacing and artwork-relative baseline. Phone sizes, 80 px section icons and the narrow-phone wordmark reduction remain unchanged. Tagline stays Your memories, rediscovered.

Isolated Chrome checked 320/359/360/390/430/600/601/768/900/1280 px, confirming expected graphic sizes, proportional baseline, caption clearance on phones, no overlap/overflow and working tabs/Settings. Reviewed the desktop render. No runtime/model/storage changes or full inference tests; user visual acceptance remains next.


## 60.32 Moderate desktop wordmark — candidate 2026-11-13.7

13 November 2026. User finds the 120 px desktop brand too large. Reduced central artwork to 96 px (20% smaller) and scaled mora proportionally to about 75.14 px, retaining alignment and gradient. Desktop section art remains 120 px; all phone sizes and the tagline are unchanged. Browser layout checks cover both desktop and preserved phone sizes; this is a presentation-only revision.


## 60.33 Persistent self-test timelines and separate problem observations — candidate 2026-11-13.8

13 November 2026. User reports Tiny/Base/Small tests with uncertain waits, successful Small work followed by Settings returning to Transcribe, and requests useful sequence/timing evidence for each self-test. No cause or page-termination mechanism is inferred. Added frozen compact histories of up to ten preceding tests at start, progressively saved stage/cleanup timestamps, and once-only old-history reconstruction from remaining records. Missing finish/stage information stays unknown. Snapshots survive clearing their earlier source records and are never populated with later tests.

Each finished/interrupted report offers Report a problem after this self-test, saving the original result, timeline and existing bounded page/Settings diagnostics into separate Session stability observations. PASS and eligibility are unchanged; snapshots/notes survive raw-history clearing. Shared report controls provide consistent View/Copy/export, with iOS sharing to preserve the app document. Cleanup checkpoint failure cannot skip termination, and cleanupPhase is kept separate from the model phase used by qualification recovery. No new models, test sequence, cooldown or database migration.

98 groups across eight focused browser suites pass. Production Settings with synthetic older records confirms reconstruction/gaps, note/export agreement, preserved PASS, clear/reload retention and phone table containment. Existing Small reports can be used for iPhone UI acceptance without running models again. Details: [Self-test timelines and problem reports](Self_Test_Timelines_and_Problem_Reports.md). Resource profiling remains separate and unimplemented.


## 60.34 Visible saved self-test observations — candidate 2026-11-13.9

13 November 2026. User reports the observation input border is hard to see and their text disappears after Save, leaving its destination unclear. Saving was clearing the draft after durable persistence; the note lived under Session stability observations. Added read-only Saved observations to the originating test card (including after history is reopened), with a direct button that opens the exact durable entry and reveals archived observations if needed. Saving does not automatically move the page. Made both source observation and additional-information boxes clearly bordered with a focus outline. No evidence format, qualification, result or history-clearing behavior changed.

32 focused browser groups pass, including extended source-card visibility and direct-target tests. Synthetic production UI confirms visible saved note after draft clearing, exact-entry navigation, defined border, consistent export and clear/reload retention at 390 px. User reporting checks so far are on MacBook; no iPhone acceptance is inferred.

## 60.35 Simpler self-test history and smaller wordmark — candidate 2026-11-13.10

13 November 2026. Removed the extra source-observation navigation button while retaining visible saved notes and the defined input border. Added a divider above the first self-test, below selection controls. Self-test JSON now starts with a short summary (model sequence, duration and gap in seconds), then its timeline and captured history; full technical evidence remains available. Reduced the entire central Memora wordmark by 10% at every breakpoint, preserving relative baseline alignment and section icon dimensions.

46 focused browser groups pass. Isolated production UI checks cover saved notes, report ordering and clear/reload retention; header checks cover 320–1280 px, unchanged section graphics and containment. No real model run or storage migration. Changes remain uncommitted for user review.

## 61. Archive identity and separate-destination migration — candidate 2026-11-16.1

16 November 2026. User approved the revised eight-phase architecture, query-only Search History (90-day default, 1–365-day range), Merge-preselected import behavior, no persistent unsaved drafts, other-metadata visibility off by default, copy-only migration, and the individual `Memora metadata v1: {…}` header contract. Audio provenance includes source ID, original audio folder/filename and source-relative path where known, distinct from transcript archive identity/folder. Unknown values remain null. Standard DOCX custom properties are the leading approved candidate after isolated validation; real iPhone acceptance, bounded ZIP extraction and the documented Word property-length discrepancy remain later gates.

Phase 2 implementation adds `transcriptMetadata.js`, `archiveMigration.js`, `archiveMigrationUI.js` and an integrated Settings disclosure. Migration previews and confirms grouping, preserves every original source file, copies non-TXT files unchanged, updates only transcript-header bytes, creates the archive manifest and durable progress at a separate destination, verifies source/output hashes and exact body bytes, and detects paused/partial operations. Resume revalidates the saved identities and outputs; changed/partial/unrelated destination content is never automatically overwritten. Restart into another empty destination remains the safe path for an invalid partial output. No in-place migration, production dependency or IndexedDB schema change. Existing DOCX rendering and transcription paragraphing are unchanged.

Migration does not persist a preferred model or remove alternatives. Legacy audio paths are kept in the readable header without relabeling them as paths within a known original audio source. Browser handles are confined to the migration UI and do not replace transcription/Search/Combine/playback associations. New transcription integration is Phase 3 and has not started.

Verification: 17 migration scenario groups passed in an isolated Edge profile, including native browser-private filesystem and integrated UI tests; 12 database-preservation groups and 7 runtime/Settings groups passed. The runtime harness needed a test-only CRLF normalization before finding its navigation source block on Windows. Tests use synthetic archives; no real user archive was migrated. Operating-system picker/permissions and real-archive acceptance remain pending. Initial copy delivery requires desktop writable-directory support; iPhone migration delivery is explicitly unavailable rather than claiming successful filesystem verification from a share request. See `docs/Archive_Migration_and_Metadata.md` and `tests/archive-migration.html`.

### 61.1 Correction — migration is a standalone disposable app

The user clarified that migration will be used for three folders only and must not run through production Memora. Removed the Settings markup, app imports/init, styling and build bump; production files now match the earlier 2026-11-13.10 contents. The 2026-11-16.1 integrated candidate is withdrawn and must not be reused for another changed release.

Moved migration code into `tools/archive-migration/` and built `Memora-Archive-Migration.html`, a single offline HTML with no server, dependencies, installation or app database. The user can select the original audio folder or supply a historical folder name, source ID, filename and source-relative path during preview. Selected-folder matches are validated; manual details are explicit user statements; unknowns remain null and known values are never overwritten. Source identities are retained across the three-folder session without equating display names. Confirmed group details apply across model/operation variants. Twenty-one isolated scenario groups passed, including the real bundled UI, supplied provenance, wrong-path rejection, manual entry and source reuse. No real archive was migrated.

### 61.2 Legacy filename model/operation fallback

The user reported that original transcripts named ` - large.txt` were blocked for missing model metadata. Corrected the standalone utility to use the naming convention in `app.js:createTranscriptFilename`/`createUniqueTranscriptFilename` and the existing Combine filename-fallback precedent, while additionally supporting the user-confirmed older generic `large` label. Missing header models/operations are recovered from standard suffixes, including ` - eng` translations and numbered copies. Generic large is not relabeled large-v3. Known header/filename conflicts still block, and the body/originals remain byte-preserved. Rebuilt standalone HTML; 23 synthetic scenario groups passed in isolated Edge. No production files changed.

### 61.3 Simplify to the four known Memora folder trees

The user clarified that all four archives were created by Memora and use Audio Folder/transcription/combine. Replaced the generalized form with top-level audio-folder selection, automatic discovery of transcription and audio provenance/IDs, separate destination, review of exceptions only, preview/confirmation and verified copy. Existing combine/combined subfolders are copied unchanged and are not parsed as recordings. The destination receives transcription contents only, without duplicating source audio. Destinations are checked against the entire original audio root, not merely transcription. Generic identity/source-name/group fields are removed; complete archives show no text inputs. Missing audio shows only match/path exceptions and may remain unknown. Twenty-three isolated groups passed, including four complete trees and the actual standalone bundle. Production Memora remains unchanged; no real archive has been migrated.

### 61.4 Preview action feedback with a long recording list

The user reported that Preview Copy did nothing after reviewing 83 transcripts. The UI wrote failure status only at the page bottom and did not scroll a successful preview into view. Added focused inline preview feedback beside the button and automatic scrolling/focus to the confirmation preview on success. Missing destination and inventory problems now produce specific local messages; failed previews remain non-mutating and confirmation stays disabled. Rebuilt the standalone HTML. Twenty-four synthetic scenario groups passed, including an 83-file UI test, missing destination and a duplicate-recording error. The actual reason for any user-specific plan rejection cannot be determined from a pasted result list alone; it is now displayed directly. No production files or user archives changed.

### 61.5 One action, default transcription2, no interactive confirmation

The user explicitly instructed the tool to default to transcription2 under the same audio folder and not wait for preview/confirmation. The standalone UI now has a single Choose Audio Folder and Migrate button. The chosen root requests write permission for creating the output sibling; originals are never opened for writing. Planning/validation still runs before output creation. Valid previous progress is resumed/reverified; unrelated existing output is refused unchanged. Audio inventory excludes transcription2 as well as transcription. Missing audio remains unknown for post-migration review. The original manual preview/destination UI is superseded only for this disposable migration tool, not for later production Combine requirements. Twenty-three synthetic groups passed, including the real bundle automatically migrating 83 recordings, rerunning without new identities and protecting unrelated transcription2 files. No real archive or production code changed.

### 61.6 Readable minimal transcript headers

User approved replacing the opaque metadata JSON line with readable Label: value fields and removing redundancy. The codec now emits Metadata version, Archive UUID, Audio Source ID and Original Audio Folder, keeping the existing audio filename on line one and the existing Whisper model/Operation/Audio Relative Path. A valid Voice Memo ID is the recording ID where available; only missing or previously established distinct recording identities require an additional Recording ID label. Recognized model/operation are added as readable fields if missing in legacy headers. Per-file archive names/paths and extra source paths are omitted when already represented by the known structure or existing fields; genuinely distinct/unknown information is preserved rather than silently discarded. Legacy JSON from the earlier utility is input-only. Header byte rewriting never changes the transcript body. All 24 synthetic groups passed, including the actual automatic 83-recording utility, minimal readable header, ID reuse, no duplicate fields, idempotence and future-version refusal. Original source files and production Memora remain unchanged.

### 61.7 Migration complete; disposable implementation removed

The user confirmed all four archives were successfully migrated and then corrected all TXT labels externally to Recording ID. At the user's request, removed tools/archive-migration, the migration browser harness/tests, temporary migration validation JSON and obsolete utility instructions. Keep the archive/metadata contracts, original DOCX feasibility evidence and this journal history. Actual audio/transcript archives and their manifests/progress files outside the repository were not changed or deleted. No production app/build/schema/dependency change remains. The next work is the iMuse recording-ID export contract, then Memora's Apple/iMuse reader and universal readable writer; see Recording_Identity_Handoff.md. No commit/deployment was performed.

### 61.8 Recording identity checkpoint 1 — isolated reader

17 November 2026. After approving source-owned identity/schema/prompt rules, the user requested stable checkpoints and explicitly authorized step 1 only. Added an unused read-only `recordingIdentity.js` module supporting structured Apple Voice Memo metadata and iMuse v1 MP4/WebM/Ogg Opus/Vorbis/WAV identities. Results distinguish valid/absent/invalid/unsupported/conflicting states, preserve original UUID spelling and separate combined provenance, and never generate/write identities. Agreement of combined output and portable IDs is checked; full provenance timeline validation remains separate.

Twenty-one focused groups passed in Node v24.22.1 and isolated Windows Edge, including six byte fixtures produced by actual iMuse codecs and the bundled real Apple recording. The initial restricted Edge launch failed before tests; the final isolated run passed. Tests do not access user databases or modify audio/archives; no iPhone readiness claim. Production metadata/transcription/header/parser/save paths remain unchanged, build remains 2026-11-13.10, and the live app still reads Apple only/writes Voice Memo ID. No commit/deployment. See Recording_Identity_Implementation_Contract.md section 12 for the API, limits, test commands and next authorization boundary. Stop before checkpoint 2 (source JSON); do not recreate migration or start unrelated Search/Combine work.

### 61.9 Recording identity checkpoint 2A — pure source-list validation and resolution

17 November 2026. The user reported 21/21 manual browser passes and committed checkpoint 1, then authorized 2A only. Added isolated `audioSourceIdentity.js`: bounded schema-v1 parsing/validation/serialization, lossless unknown JSON fields, path/UUID collision reporting, source-ID association decisions, embedded-ID priority, unchanged/change-fingerprint decisions, caller-supplied fallback UUID staging and explicit unreadable-ID recovery. Active recovery reasons are cleared on later valid embedded promotion while unknown extension data is retained. Reader issues now include identity/container/provenance scope so recovery cannot bypass malformed provenance as though it were damaged identity JSON.

31/31 new groups and the reader's existing 21/21 passed in Node v24.22.1 and isolated Windows Edge. The new manual page is tests/audio-source-identity.html. No application entry point imports these modules; no hashing, UUID generation, database/file writes, transcript/audio/archive edits, build change, commit or deployment. Existing production remains Apple-only/Voice Memo ID. See Recording_Identity_Implementation_Contract.md section 13 for precise APIs, limits and conservative unresolved-conflict policies. Stop for checkpoint review/commit before separately authorized 2B (actual source discovery/hashing/recovery storage/persistence), then later production integration. No migration, move/copy tracking or unrelated Search/Combine scope.


### 61.10 Source persistence and recovery checkpoint 2B — 18 November 2026

The subsequent isolated persistence checkpoint implemented actual source-list discovery, bounded validation/readback, staged identity ownership, optimistic concurrent-write checks and explicit pending file-input exports. The shared schema advanced additively to 6 for audioSourceRecovery without dropping existing stores. Device/source capability and portable saved state remain separate; a browser-local recovery copy alone is not proof of JSON placement beside audio. The user reported passing the checkpoint-2B harness before production integration. The full API, original checks and boundaries remain in [contract section 14](Recording_Identity_Implementation_Contract.md#14-checkpoint-2b--isolated-source-persistence). Later 19 November membership-only policy supersedes the original whole-audio hash/change-review path in normal inventory; do not revive it from this historical description.

### 61.11 Production identity integration checkpoint 3 — 18 November 2026

Production transcription was connected to source-owned identity, readable Recording ID/Archive UUID/Audio Source ID provenance, transcript archive references and pending-save recovery. Source identity persistence precedes dependent transcription delivery; desktop saves verify JSON/TXT bytes and retain completed text/filename for retry after save failure, without rerunning inference. iPhone has explicit JSON/transcript sharing actions, and successful sharing cannot establish destination placement. Universal Recording ID accepts legacy Voice Memo ID and rejects conflicts; iMuse container identity does not imply Apple recording-date metadata. Checkpoint 3 was committed as 4c8e5f7. See [contract section 15](Recording_Identity_Implementation_Contract.md#15-checkpoint-3--production-transcription-integration). Full real-device acceptance remained separate from isolated fixtures.

### 61.12 Readable file-list terminology and header layout — 18 November 2026

The user clarified that the wrong JSON kind had been selected; the initially suspected native-picker defect was not established. Guidance distinguishes Audio Recording List and Transcript File List, validates the expected JSON kind and keeps retry/cancellation in the chooser. Pending saves use the existing subtle pulse and respect reduced motion. New headers group model/operation/language after dates/duration, followed by a blank line and identity/provenance. Existing transcript body bytes and identities are preserved. The former transcript filename at this checkpoint was memora-archive.json; section 62 records its later rename to memora-transcript-archive.json. The old standalone migration remains complete/retired.

## 62. Self-test summary, Settings and root archive maintenance — 18–19 November 2026

Consolidated documentation at source **957b493**, application build **2026-11-19.23**, schema **6**. See [current handoff](CURRENT_STATUS.md#consolidated-handoff--19-november-2026) for current behavior, checks and exact resume boundaries. This entry records the completed work and subsequent decisions without rewriting earlier checkpoints.

### 62.1 Passed self-test summary and its limits

18 November added the compact Model/RTF/Load (s) table, latest retained successful test per Tiny/Base/Small/Medium/Large family, grouped across variants/platforms. Detailed history retains failures and interruptions. RTF excludes model loading; unavailable measurements are explicit, not fabricated RAM estimates. A summary row is not a current loaded-model/qualification indicator. The supplied earlier Large attempt was interrupted; the later one passed. Current summary filtering excludes non-passes; the specific earlier displayed row remains unconfirmed.

### 62.2 Transcribe/Combine flow and Settings

Transcribe has grouped, horizontally aligned model/language/operation selectors, checked paragraphing, destination/action controls and Transcripts output. Combine's paragraph option is removed; Output groups title and desktop formats or iPhone format/save. Additional DOCX/HTML output-metadata selectors remain deferred.

Settings storage categories are ordered Semantic Index, Other Cached Models, DOM Diagnostics, Cached Transcripts, Audio Recording List — Saved Local Copies, Model Registry Cache, Whisper Models. Counts center consistently. Readable model/runtime descriptions precede exact cached URLs. Descriptions precede Select All/Deselect All and Delete Selected, then checkbox rows; empty lists hide actions, individual/all-delete buttons are removed and active items remain protected. Cache View is read-only; one Refresh initializes/synchronizes canonical model definitions before counting. Empty unused semanticMetadata is hidden without dropping its store.

### 62.3 Audio inventory, saves and recovery

Source opening reconciles immediate audio before transcription, independently of which recordings will be transcribed. Known IDs are reused without content hashing; new files use bounded identity reads; work yields by batch and no longer serializes the full manifest per recording. Unchanged lists/availability observations do not cause JSON rewrites. Non-M4A folder-list durations use media metadata rather than whole-file Web Audio decoding.

Desktop saves/verifies changed lists; iPhone explicitly shares Save Audio Recording List after reading, with pending highlighting and cancellation retention. Refresh Source and Cancel Scan were removed. Valid selected JSON overrides stale pending recovery; successful exact sharing releases only matching pending exports, preserving newer work. Restore requires the specific missing-list/association evidence. Settings shows latest proven-source copies once, with guarded deletion and safe verified-copy cleanup; pending work is retained. The user reported functional improvement and continued testing, not complete cross-device acceptance.

Coverage gap found during this documentation audit: complete native scans prune absent audio, but file-input audio still retains unseen entries. The later transcript coverage fix did not change this audio caller.

### 62.4 Transcript folder reconciliation

Edit/Combine uses transcriptFolder.js for a single immediate inventory/read/parse and cached immutable File snapshots, reused by sorting/export/editor preparation. Writable JSON updates use an archive lock, prior-byte comparison, readback and retry. Complete successful native and explicitly marked whole-folder iPhone selections prune absent immediate transcript references; partial/error/cancelled coverage cannot prove deletion. Nested references remain out of scope. Conflicting identities/invalid data block updates while readable transcripts remain available. Body-only edits do not dirty membership JSON. Shared Transcribe-save/Search reconciliation is not yet implemented.

### 62.5 Naming and destination guidance

Current files: memora-audio-source.json, memora-transcript-archive.json and separate search-embeddings.json. The user plans to delete/rebuild four old memora-archive.json lists. Rebuild existing transcription folders through Edit/Combine first, preserving header Archive UUID/Recording IDs, then use those rebuilt files in Transcribe. Desktop auto-saves; iPhone explicitly saves. This is not another migration or a request to delete audio lists/embeddings.

iPhone Transcribe/Edit/Combine guidance includes archive/year plus folder, such as the “transcription” folder for archive “2016”. Use meaningful validated archiveName or one consistent Original Audio Folder when rebuilding; missing/ambiguous provenance cannot establish a full Files path. The web share cannot force or verify the chosen destination.

### 62.6 Large compatibility and browser continuity

Historical `large` headers/filenames are accepted and kept distinct from a claimed large-v3 generation. Exact current runtime precision stays in diagnostic evidence. Recognized browser version changes alone no longer invalidate valid qualification (.22). Existing raw keys/reports remain; latest matching decisions and unresolved failures/interruptions still govern. Resolved reviews do not reactivate; other browser families or actual execution/context changes cannot borrow qualification.

### 62.7 Simpler transcript metadata and agreed priority

A proposal to add model repository/configuration/encoder-decoder precision/backend/provenance, plus a later transcription timestamp/backfill tool, was discussed and **dropped**. It is unnecessary for ordinary Memora selection; keep family metadata and Metadata version 1. No standalone ChatGPT metadata-tool prompt is currently required.

The user instead agreed on higher family, then higher Memora filename counter for the same archive/recording/operation, retaining older edited TXT alternatives. That preference is not coded: equal ranks still take first encounter. Desktop generates -2/-3 counters, while iPhone leaves collisions to Files. Future counter implementation must explicitly handle that naming scope; Finder/Explorer creation dates are not available through the standard browser File API, and modification time is not the chosen authority.

### 62.8 Evidence and next boundaries

Recorded .23 core checks: 29 transcript-folder, 43 production integration and 47 persistence groups (119), plus 27 independent historical-lab fixture checks. Browser continuity .22 passed 112 groups across eligibility/reviews/selector/UI/history. Repeated checkpoint groups are not independent model validations. Tests use synthetic/disposable profiles, database and OPFS fixtures; no user archive/database modifications. Current source was committed by the user; this consolidation changes docs only, not build/model/schema or deployment.

Remaining work: filename-counter preference and iPhone naming scope; audio whole-folder parity; Transcribe's shared full-folder/save reconciliation; Search's shared scan/records and independent two-JSON dirty/save state; possible same-folder batch JSON sharing after device validation; broader save-location guidance. Parent/recursive ownership, multi-source resolution, persistent Combine/imports and document-output metadata remain distinct later phases. Real iPhone/iCloud destination, final layout and large-archive timing/memory acceptance remain pending. This documentation request does not authorize those code changes.


### 62.9 iPhone whole-folder audio coverage parity — candidate 2026-11-19.24

After the documentation review identified the audio coverage gap, the user authorized the focused correction. transcriptionIdentity.js now considers an explicitly marked whole-folder file-input result complete, independently of writable access, provided no recordings were skipped. Successful iPhone root inventories remove missing immediate Audio Recording List entries just like desktop. Nested entries remain out of scope; partial/unmarked selections, skipped recordings, provider/read failure and cancellation retain removal safeguards. No audio files are deleted and iPhone still explicitly saves changed JSON.

Six new workflow/UI groups verify deletion, returning embedded identity, unchanged saved reopening, partial/unmarked retention, skipped records, provider failures/cancellation, empty root coverage, nested retention and actual share cancellation/completion. 49 production integration, 47 persistence and 29 transcript-folder groups passed (125 total) in isolated Chrome with synthetic/disposable data. The production change is small and has no schema/model/filename-priority effect. Actual iPhone/iCloud acceptance remains pending. This fixes the parity item listed as outstanding in .23/section 62.8; Transcribe/Search shared reconciliation and counter priority remain future work. No agent commit/deployment.


### 62.10 Shared audio-location guidance — candidate 2026-11-19.25

The user authorized archive/folder guidance when locating audio in Combine and Search. Both already share a playback control, now showing known archive label, Original Audio Folder and requested basename above Play before Files opens and again in missing/wrong-file messages. iPhone/file-input selects recordings or batches; native folder fallback uses the same context. Combine supplies its reconciled archive label; Search uses transcript provenance. No full Files path/start-folder control is claimed.

Inspection found prior playback matched filenames without a shared Recording ID check. The focused change scopes caches/root handles to source/archive (or selected-source object for unidentified legacy results) and uses the existing bounded reader to reject inspectable ID mismatches and invalid/conflicting metadata. Absence/unsupported-container IDs preserve legacy filename matching without claiming verification; the full source-JSON/multi-source resolver is still deferred. Audio/transcripts/indexes are not rewritten. Eight isolated guidance/playback groups, 49 app integration and 29 transcript-folder groups passed (86), including 240px hints, cancellation/missing/correct batches, identical filenames across archives and native fallback. Actual iPhone/Files/media playback acceptance remains pending. The earlier .24 correction remains in the working changes; no agent commit/deployment.


### 62.11 Whole-journal and five-volume documentation review — 19 November 2026

The whole journal had acquired sections 60–62 while the split set stopped at 59. A comprehensive documentation pass verified the first four split bodies against the matching whole-journal sections by section number **and title**. The pre-existing repeated section numbers 22/24 and numbering gaps are historical and retained; they are not silently renumbered. Volume 4's stable filename ends in 49-51 but its actual range is 49–59. Volume 5 now contains sections 60–62, including the checkpoint-2B/3/header bridge added to section 61 above. A new [journal index](journal-index.md) gives actual ranges, navigation and the maintenance rule: edit the canonical whole journal, then synchronize its affected extract. All five bodies must match; navigation stays outside the copied section content.

The audit checked active documents against source at 47ca641, updated stale candidate/commit claims and conflicting selection text, and retained archives/research/licences/validation evidence with their original dates and limits. Recent HTML-reader work at 47ca641 adds standalone date/name sort controls and explicit audio-folder locating; it is distinct from the app's source-scoped playback checks and does not implement portable collection import or structured metadata settings. The build module remains 2026-11-19.25, so that label alone does not identify the later html.js revision. Only static source review, journal parity, links and documentation consistency were checked on this turn; prior test evidence is not a new test run or new device acceptance. See [documentation review](Documentation_Review_2026-11-19.md) and [current status](CURRENT_STATUS.md).


### 62.12 Parent audio-folder selection — device test and pause, 19 November 2026

The user wants Combine/Search to select the parent audio archive so audio playback and transcript discovery do not depend on prior Transcribe use. Each transcript subfolder keeps its own transcript list and embedding JSON; several folders should produce a choice of one, not implicit merging. Direct transcript-folder selection remains supported. Initial immediate-subfolder scope is proposed; deeper recursion and multi-archive ownership are separate. **Production integration is not implemented.**

Standalone root test.html (test 2, committed through 42af3fe) uses directory input, groups paths and checks selected files/audio without production modules or storage. Both MacBook Chrome and iPhone Safari supplied parent audio, nested transcript files and all three expected JSONs, and the user confirmed playback from that selection. The active transcription folder matched at 91 TXT/2 JSON. Original transcripts differed: Mac 91, iPhone 106; the exported full-path report showed 15 distinct phone-only names and no duplicate paths. Cause is unconfirmed; this is not proof of complete synchronized inventories or permission to delete entries. The prior unnecessary iPhone audio-list save also stopped recurring after reload/new Mac list; no cause or production fix was established.

The user requested documentation to continue later. The [detailed handoff](Parent_Audio_Folder_Selection_Handoff.md) retains device timings/counts, the 15 filenames, access/reconciliation limits, proposed adapter boundary and next validation cases. Keep each chosen subfolder's JSON ownership and iPhone destination labels explicit. The standalone test establishes feasibility for the tested archive, not production reconciliation/indexing or general device acceptance. No application build/schema change accompanies this documentation checkpoint.


### 62.13 Reproducible recording identity and delivery checkpoints — 20 November 2026

The four supplied archives had consistent per-transcript source UUIDs differing from their audio lists; all 409 checked transcript/audio pairs matched embedded Recording IDs. At user request, the lists were backed up and repaired, including the absent Why is silence difficult?.m4a entry. The user reported linking worked. This repairs current data, not the underlying dependency on a generated catalogue UUID. A create/replace path can generate a new source identity when existing transcript associations are missed; the exact historical trigger remains unconfirmed.

The later agreed design uses embedded Recording IDs, with file size plus SHA-256 of the first 250 KiB as a versioned reproducible fallback only when IDs are absent. Filename is a location hint; sampled fingerprints cannot distinguish same-size files sharing that prefix and cannot guarantee partial iCloud downloads. Stop writing Audio Source ID to new headers and stop requiring historical values for matching. Retain transcript Archive UUIDs and independent JSONs per subfolder. Keep the audio JSON as a rebuildable inventory, then retire saved audio-list identity-recovery copies and their Settings section while preserving pending exports and desktop folder handles. Legacy assigned IDs require explicit compatibility before deleting their recovery data.

The user requested documentation before implementation and a later UI redesign after the identity flow is proven. The [checkpoint plan](Recording_Identity_Checkpoints.md) sets the sequence: isolated identity contract/tests; parent-folder device proof; coordinated production changes; recovery/Settings retirement; optional byte-preserving header cleanup; separate UI redesign. Current test 3 still checks source UUIDs; the new plan is not implemented. Full-file hashing is superseded by the sampled fallback. No application build/schema/user-file change accompanies this documentation update.


### 62.14 Reproducible identity checkpoint 1 — 20 November 2026

Authorized checkpoint 1 is implemented only as an isolated read-only helper. Valid embedded IDs are reused; supported audio with positively absent metadata uses SHA-256 of a versioned UTF-8 frame (method, decimal byte size, fixed 256000 limit) plus the first min(size,256000) bytes. A deterministic UUIDv8 retains compatibility with existing UUID fields, and the full digest/method remains available as evidence. Invalid/conflicting/unsupported metadata blocks fallback. Successful identity results cache only against exact immutable snapshots; candidate grouping preserves ambiguity and unresolved inputs.

All 22 synthetic browser groups passed, including an independent Python test vector, rebuild/rename stability, prefix/size changes, deliberate same-prefix ambiguity, bounded synthetic large-file reads, cache/cancellation and current manifest/TXT validator compatibility. The [contract](Recording_Identity_Prefix_Contract.md) freezes the algorithm and limits. Neither uniqueness beyond sampled inputs nor partial iCloud downloads is claimed. No production imports, user files, build/schema or source-recovery behavior changed. Checkpoint 2 is next; test.html device proof, production integration/cache retirement and the later UI redesign remain separate.


### 62.15 Recording identity checkpoint 2 device test — 20 November 2026

The user authorized the next standalone test after clarifying that reconstructing in memory means treating the JSON as missing without changing it. Root test.html is now test 4: build a temporary immediate-parent audio inventory using embedded IDs or the checkpoint-1 sampled fallback; choose one transcript subfolder; link by Recording ID; play; and share results. Historical Audio Source ID header fields no longer affect the test. An optional read-only comparison inspects the actual JSON; default simulation never reads it. Temporary inventory previews are report evidence, not production replacement JSONs. A generated WAV demo tests fallback rebuild/rename without touching user audio.

Twenty synthetic adapter/UI groups passed and the 22 helper groups passed again. They cover missing/no-list operation, source independence, list disagreement, missing/wrong/duplicate IDs, scope/legacy paths, fallback determinism, blocked metadata, cancellation and actual page/report controls. Device acceptance and real playback/iCloud timing remain pending. No production UI/parser/storage wiring, build/schema or user-file change. See [handoff](Parent_Audio_Folder_Selection_Handoff.md) for the exact device steps. Checkpoint 3 is not started.


### 62.16 Shared source and transcript folder architecture test — 20 November 2026

The user supplied test-4 MacBook/iPhone reports: both reconstructed identical 107-record embedded-ID inventories with zero blocked/ambiguous recordings, verified the selected transcript link and played it, and reproduced the same synthetic fallback IDs. Existing-JSON comparison was not reported. Separate audits verified the complete audio ZIP and found Alaksmi absent from the updated transcripts plus 15 audio recordings absent from both supplied transcript ZIPs. Alaksmi was restored; user-authorized source-header cleanup then removed only Audio Source ID lines from 95 Dayananda and 318 Dreams TXT files with verified ZIP backups. Dreams original/current inventories and bodies matched exactly. Production still writes the obsolete field pending integration.

Before production, the user proposed shared folder rows and authorized another test. Root test.html is now test 5: Audio Source / Select Source Folder across three views; Transcript Destination for Transcribe, Transcript Source for Edit/Combine/Search; None Selected empty values; default transcription subfolder; shared explicit override; reset on changing audio root. Desktop uses native directory picking, iPhone its supported input fallback. Separate transcript folders can be read/linked while retaining selected parent audio. Test views do not perform actual transcription/editing/indexing.

Save Test File is an explicitly requested, uniquely named disposable sample. Native access checks permission/refuses an existing name/verifies readback; iPhone offers destination guidance without claiming placement. No automatic folder-selection writes occur. Fifteen synthetic groups plus the prior 42 passed, including native routing, fallback/separate folder linking, shared/reset state, sample saves/cancellation and 320px containment. Actual test-5 device acceptance is pending. Production build/schema remain unchanged. See [handoff](Parent_Audio_Folder_Selection_Handoff.md). The prototype does not authorize checkpoint 3 or the later broader UI redesign.


### 62.17 Production recording identity foundation — candidate 2026-11-20.3

The user approved part 1 of the production plan after the standalone identity/folder tests. New or rebuilt audio enrollment now reuses embedded Recording IDs or the fixed sampled fallback; routine membership scans reuse known IDs. Actual embedded/sample identity is verified before inference or accepting a browsed list, blocking incorrect known catalogue IDs. Complete missing-source lists rebuild automatically unless pending/legacy recovery needs an explicit choice. Invalid/partial input and read failures keep their safeguards. Relocation requires complete observed paths and an absent old path; available duplicates are blocked. No random replacement identity is assigned to unreadable/unsupported embedded metadata.

New TXT headers omit Audio Source ID and historical values no longer affect parsing, recovery evidence or playback cache scope. Archive/Recording ID conflicts remain enforced. Rare fallback headers declare their method; audio JSON retains validated full sampled evidence. Internal catalogue UUIDs/recovery locks remain. Pending exports, verified native writes, iPhone sharing/cancellation and legacy assigned-ID restore are preserved. Missing phone list recovery associates pending work only through an exact embedded-ID set, not names. Search reuses existing model/representation-compatible vectors only for exact text/ordinal matches and unique filenames; changed text and ambiguous archives cannot borrow them.

The final focused run records 19 production identity/Search groups, 48 app integration, 47 persistence, 34 schema/planner, 29 transcript-folder, 22 helper, 10 playback groups and 10 database/semantic-cache groups (219 passing). These are synthetic/disposable harness results, not real inference, cloud sync or device acceptance. Candidate build advances to 2026-11-20.3; schema remains 6. User files, shared folder UI and Settings recovery storage were not changed. Real MacBook/iPhone acceptance precedes the next production step. See [current status](CURRENT_STATUS.md) and [prefix contract](Recording_Identity_Prefix_Contract.md). No agent commit/deployment.


### 62.18 Audio source activity and bounded details reads — 2026-11-20.4

The user reported a silent wait exceeding a minute when selecting Dreams/2018 on iPhone. Source selection now shows a spinner, elapsed time and Files/iCloud waiting guidance from the initial click, then recording-details progress. Cancellation, failure and completion clear the activity state; repeated selection and background model refresh cannot enable transcription during the wait. Reduced-motion users receive a static indicator with elapsed time.

Recording-details display reuses the prepared audio list's resolved identity instead of scanning up to the first MiB of every M4A again. Apple recording-date behavior is preserved; other identities do not acquire an Apple date. MP4 header reads still supply duration and file creation date. Two bounded readers overlap provider latency while retaining deterministic row order and isolating per-file metadata failures. The inventory and pre-inference identity checks remain in place. No new full-file reads or archive/schema changes are introduced.

120 groups passed (5 focused, 49 app integration, 19 production identity and 47 persistence). Focused browser verification covers delayed picker cancellation, ordinary completion, a virtual 400 MiB MP4 with bounded metadata reads, 121-row concurrency and metadata failure isolation, together with production identity and persistence regression suites. Real iPhone/iCloud timing remains unmeasured: the browser cannot accelerate provider downloads or animate behind the native Files sheet. User archives were not modified. Build 2026-11-20.4; schema 6.


### 62.19 Shared Audio Source and transcript folder access — 2026-11-20.5

The user authorized integrating the tested architecture after confirming that direct transcript selection cannot grant parent audio access. Production now shares Audio Source and Transcript Destination/Source across the three workspaces, defaults to an immediate transcription child, and preserves audio access when the user chooses another transcript folder. A new audio root resets the previous override. Direct transcript-only use remains supported; no arbitrary parent access is inferred from metadata. Folder choices and labels are separate from whether a browser has writable handles.

Native child handles avoid recursive content loading. iPhone child selections reuse supplied snapshots rebased to that child's root and exclude grandchildren. Each selected child retains separate JSON ownership. Combine/Search load only on activation; selecting audio in Transcribe does not eagerly build an index. Playback looks up the Recording ID in the selected parent's prepared inventory and verifies the actual file with the existing embedded/sample checks. Parent-scoped manual caches prevent borrowing from a different selected root. Transcribe can consume a supplied child JSON or reconstruct a missing list from established transcript identities, while corrupt/conflicting lists block.

Pending edits/exports/list/index changes require an explicit keep/discard decision before switching folders. Cancelled/failed reads preserve the prior selection. Activity and audio-list saving are accessible in all three workspaces. iPhone saving remains explicit/unverified, empty omitted folders cannot be discovered, and newly saved files require reselection. This step does not implement multi-archive aggregation or merge transcript/embedding JSON reconciliation into one Search pass. See [current status](CURRENT_STATUS.md) and [handoff](Parent_Audio_Folder_Selection_Handoff.md) for acceptance and limits. Build 2026-11-20.5; schema 6; no user-file mutation or deployment.

Verification for .5: 7 shared-folder access, 57 actual-page integration (stubbed Search backend), 19 production identity, 10 playback, 29 transcript-folder, 47 persistence and 5 metadata groups passed (174 total). Device Files/playback/save behavior remains user acceptance work.


### 62.20 Transcribe destination placement and device follow-up — 2026-11-20.6

Build **2026-11-20.6** removes the duplicate destination row at the top of Transcribe. The lower **Transcript Destination** area shows the current shared folder in the same output box style as Combine/Search. Desktop Use Source / Use transcription / Browse actions set the shared transcript selection; Browse opens the folder picker directly. iPhone still inherits the supplied transcription child (or the shared choice from another tab), displays the destination below, and saves through Files without writable folder access.

The user confirms Combine audio playback on iPhone and MacBook. They also report repeated saves for apparently unchanged audio/transcript JSON on iPhone. The timing and before/proposed data remain unestablished; this layout change does **not** claim to fix that report or relax content-change checks. A new transcript legitimately changes its list; reopening an unchanged folder should not. Preserve distinguishable before/proposed lists if the issue recurs.

The supplied 99-byte text export contains only the destination guidance, exactly matching the title added to transcript sharing in .5. Build .6 removes that title: Files receives only the named file attachments; guidance stays on the page. The page harness rejects any added share title/text. This establishes the unwanted guidance-file defect, not the cause of repeated JSON save requests.


### 62.21 Destination reconciliation and combined iPhone transcript delivery — 2026-11-20.7

Build **2026-11-20.7**, schema **6**, restores the top **Transcript Destination** selector on both desktop and iPhone. The lower desktop shortcuts remain convenient and use the same read/reconciliation path. Browse displays the selected folder's name. Selecting/reselecting a destination rereads its transcript list and immediate transcripts; native changed lists save with the existing verification/locking safeguards, unchanged lists do not rewrite. A uniquely supplied transcription child remains the default. Combine can reuse its already-read folder session rather than reading each TXT again. Corrupt/conflicting destinations block Transcribe without hiding readable Combine files.

New native transcript references are added only after the TXT write/readback succeeds; a failed TXT write does not publish a dangling list reference. Completed TXT remains available for retry if the later list save fails.

On iPhone, **Save N Transcriptions and File List to Files** shares all pending batch TXT files plus the updated memora-transcript-archive.json together, using a files-only share payload. The standalone transcript-list action is hidden for that batch. Archive/folder guidance is visible before the share sheet and remains on the page; no title/text attachment is added. Cancellation retains the batch for retry. The Audio Recording List remains a separate save because it belongs in the audio parent. Sharing cannot enforce or verify where Files writes the bundle.

After sharing, a working in-memory destination snapshot retains that bundle for subsequent batches. It is marked partial, not verified disk coverage, so it cannot authorize deletion of unseen files. A fresh folder selection replaces it with supplied Files observations. New phone batches reread the chosen snapshot rather than carrying discarded unsaved references forward. iPhone cannot reread provider changes through native handles; reselect the folder for fresh disk snapshots.

The user reports the hosted MacBook Chrome picker disappearing while browsing, before selecting a folder. Source selection calls the native picker once per click and performs no automatic reopen/reload loop. Cause is unconfirmed; no picker workaround was silently introduced. A similar Chrome 157 cancellation report is documented for Windows, with Mac reproduction explicitly unestablished: [Chromium issue 582407452](https://issues.chromium.org/issues/582407452). This is a troubleshooting lead, not a confirmed Mac diagnosis. Prior reports of unchanged iPhone JSON requiring saves also remain distinct from the now-replaced separate transcript-list delivery gate.

Device acceptance: refresh to .7; choose/rechoose a destination using top and lower controls; confirm the displayed folder name and safe JSON reconciliation. On iPhone transcribe multiple recordings, save the batch and JSON together to the named folder, inspect filenames/content, cancel/retry, then run another batch and confirm previous references remain. Actual Files placement and cloud sync are unverified by synthetic harnesses. No user-archive mutation, commit or deployment.

Verification for .7: **176 groups passed** (7 shared-folder, 59 actual-page integration, 19 production identity, 10 playback, 29 transcript-folder, 47 persistence and 5 metadata groups). Synthetic archives, isolated browser storage and a stub Search backend; no real model or user archive was used.


### 62.22 Planned session enablement, save warnings and location/status cleanup — 20 November 2026

**Decision recorded 20 November 2026; planned implementation 21 November 2026. Documentation only.** Current application remains **2026-11-20.7**, schema **6**, source **ce1583b**. No feature in this section is implemented by this documentation update. This revised plan supersedes the earlier suggestion to hide transcription setup immediately on opening. The exact button label is **Enable Transcription**, not Set Up Transcription or Select Source.

### First visit, tab navigation and Settings

Transcribe remains the default opening tab, with both Audio Source and Transcript Destination selectors visible. Track session-local Transcribe activity separately from shared folder access and from which panel happens to be visible. The current tab controller already keeps the active primary tab separate from Settings, so the requested distinction is feasible; the fallback of hiding setup from the outset is not needed unless implementation/device evidence shows a limitation.

| Session event | Planned Transcribe behavior |
|---|---|
| App opens on Transcribe | Both folder selectors visible; no automatic transcription. |
| Open, use and close Settings while Transcribe is the active primary tab | Keep the initial visible state; Settings neither counts as leaving Transcribe nor as doing transcription work. |
| Leave untouched Transcribe for Combine or Search | Mark transcription setup as guarded for the next visit. |
| Return after that untouched departure | Show Enable Transcription; hide the transcription selectors, recording list and Transcribe action. |
| Press Enable Transcription | Replace the button with setup and recording controls, using any folders already selected elsewhere; do not open another picker or begin inference automatically. |
| Work directly with Transcribe's own controls before leaving | Keep setup enabled for the rest of the app session. |
| Reload/reopen the app | Reset to the initial visible-selector state; do not persist this enablement in IndexedDB/localStorage. |

Direct user interaction with Transcribe's own setup/recording controls expresses transcription intent. Merely visiting, scrolling, receiving background shared-folder/model updates, or using Settings does not. Interactions originating in Combine/Search must not be mistaken for Transcribe activity even if they reuse a shared helper. Switching to Combine/Search from Settings still counts as a primary-tab departure from untouched Transcribe. Opening/closing Settings alone never adds an Enable Transcription gate.

Keep shared audio access available for Combine/Search playback and shared transcript access for their normal work. Defer Transcribe-only recording-list rendering, display-metadata preparation and checkbox selection until the user expresses transcription intent or presses Enable Transcription. This does not remove inventory/identity validation required by the requesting Combine/Search workflow. Reuse granted handles/File snapshots; do not introduce another picker or a model run merely to enable the UI. No recordings are checked by default when a new Transcribe list is prepared; Select All remains available. Do not change Combine/Search/Settings selection defaults as part of this task.

### Pending-save warning must reflect this batch's save attempt

The current warning always says Keep pending transcripts? and There are transcripts waiting to be saved, even after the user has used Save. Track the current batch's delivery state independently of the pulsing button and independently of filesystem verification.

- Before Save has been used: **There are transcripts waiting to be saved…** Keep the pending-save highlight and the existing explicit keep/discard protection.
- After the normal Save/share return: **Please verify that your transcripts were saved…** Include the transcript file list and the intended destination where useful. Do not describe the batch as definitely unsaved, and do not claim that Memora verified its location.
- Known cancellation or failure must remain clearly pending, retain the exact files for retry and show the actual cancellation/error outcome. A click alone is not proof that Files saved anything.
- Reset attempt/result state for every newly generated batch. A previous batch's Save click must not change the warning for a new unsaved batch. Reopening Settings, model-list refreshes and display rerenders must not reset a successful share return to the never-attempted state or restart its pending pulse.

Retain completed text and safe retry behavior, including failures after inference. Keep/discard decisions concern the in-memory pending copy; they must not delete user files. iPhone share completion remains different from verified placement.

### One accurate, prominent destination for iPhone delivery

The user reports the small text above Save N Transcriptions and File List to Files naming an old destination instead of the folders currently selected in Transcribe. Treat this as a reported stale-guidance defect, not evidence that a particular JSON or file was actually saved in that old folder.

Bind a single destination context to each generated batch, derived from the selected Transcribe audio/archive and transcript-folder selection. It must agree with the current selection when the batch is created. Use that same context for pre-save instructions, post-share text, pending-save warnings and retries. Do not let an older pending-archive label, historical header provenance or a stale cached status override it. Pending-work guards must prevent a folder change from silently relabeling an existing batch; after an explicit discard/new selection, clear the obsolete context. For a separately selected transcript folder, show the known label without inventing an unverified parent path.

Immediately above the iPhone save action, use a clearly readable body-size or larger location line, for example **Save in: 2018 / transcription**, followed by the short instruction **Choose this folder in Save to Files.** The exact archive/folder varies with the selected batch. Remove surrounding repeated instructions and technical explanation; do not put the destination only in small settings-note text. Keep the files-only share payload, so guidance cannot become another text.txt attachment. Save all batch transcripts and memora-transcript-archive.json together. The Audio Recording List stays separate in the audio parent. Files still controls the actual save destination; Memora cannot force it or verify placement from the share sheet alone.

### Status order and shorter wording

Below the source/destination controls, present the **Audio Recording List first**, then the **Transcript File List**. Consolidate the two current audio JSON messages into one status block. Use one current state per list and optional short counts, rather than concatenating stale inventory, save and destination messages.

Examples of intended wording:

- **Audio Recording List: Up to date.** Optional next phrase: **121 recordings.**
- **Audio Recording List: Save required.** Keep Save Audio Recording List available and highlighted when appropriate.
- **Transcript File List: Up to date.**
- **Transcript File List: Updated; save with transcripts.**

During a read, preserve the spinner, elapsed time and useful progress/counts. Remove routine success boilerplate such as Audio directly in this folder was checked; subfolders are not included and No new save was needed. Real read errors, skipped/unresolved files, partial coverage or identity conflicts still need concise actionable feedback; simplification must not hide those conditions or weaken reconciliation/write safeguards. Apply the same audio-then-transcript ordering to mirrored/shared status displays where they appear in Combine/Search. Keep the prominent iPhone destination near the save action rather than burying it among the JSON status sentences.

### Implementation checkpoints and acceptance

1. Add the session-only activity/gate state around primary-tab navigation; preserve the separate Settings route and shared folder state. Defer Transcribe-only list work and initialize its recording checkboxes unchecked.
2. Track save attempt/result per batch. Bind all delivery messages to one immutable batch destination context; preserve cancellation/failure/retry and explicit pending-work decisions.
3. Consolidate and reorder list status rendering. Show the correct destination prominently beside the combined iPhone save action; retain files-only sharing and separate audio-parent JSON ownership.
4. Test on disposable/synthetic folders first, then MacBook and iPhone: initial visible selectors; Settings-only visits; untouched departures to each primary tab; Enable Transcription reuse; no automatic inference or checked recordings; ordinary Transcribe work remaining enabled; model refresh not counting as intent; folder changes while guarded; never-saved versus share-return warnings; canceled/failed save; a second new batch; retries after destination changes; prominent correct locations for two same-named transcription folders in different yearly archives and a separately selected folder; audio-first/transcript-second status; unchanged JSON no-op behavior and meaningful error feedback.

This is tomorrow's implementation plan, not permission to change application code today, not a new build, and not new test/device acceptance. The .7 implementation previously passed 176 targeted groups; those tests have not yet been extended or rerun for these proposed behaviors. The user reports test.html loaded successfully; this alone does not establish whether its picker stayed open while browsing. The production MacBook picker-closing report remains unconfirmed and separate from this UI/message plan. Broader multi-archive/import, Search shared-scan reconciliation and other deferred architecture work stay separate.


### 62.23 TXT-derived catalogue and explicit transcription candidate — 21 November 2026

Build **2026-11-21.1**, database schema **7**. This candidate implements the approved simplification and session/save UI changes. **Only the external transcript JSON dependency is retired. memora-audio-source.json and search-embeddings.json remain in use.** Removing the audio list was discussed but not approved or implemented.

### TXT metadata and local catalogue

Production Transcribe, Combine and Search read selected TXT metadata instead of creating, reading, reconciling or exporting memora-transcript-archive.json. Existing sidecars are ignored and left untouched; do not delete or modify existing TXT headers/identities. Legacy sidecar validators/test helpers remain for old-file diagnostics and historical tests, not as the production catalogue. The .7 sidecar/bundle page harness is superseded by tests/transcript-catalogue.html; tests/transcription-identity.html now runs that current harness too.

Existing Recording IDs and Archive UUIDs come from TXT metadata. A genuinely empty destination receives a session Archive UUID, written into its first TXT; subsequent loads recover it from TXT. Adding to missing/conflicting-identity collections blocks rather than using an old JSON or local cache to invent/replace identities. Read-only Combine/Search can inspect records from different archives. Embedded audio IDs, reproducible fallback IDs, legacy audio-list identities and actual playback verification are preserved.

transcriptCatalogue.js writes a derived IndexedDB transcriptCatalogues cache of important metadata (identities, filename, model/operation, recording date/duration, audio references and file size/time), not transcript bodies. Cache scope belongs to the selected access object, not a guessed same-name folder; only the latest 16 scope snapshots are retained. Every load reads the supplied TXT snapshots; the cache is never an identity authority or a substitute for granted folder access. Cache failure does not prevent valid TXT loading. Settings adds Transcript Metadata Cache with counts, View and Clear when populated. Clearing it preserves pending exports, all files, audio-list recovery, model definitions and embeddings. Schema 6 upgrades add this store without dropping/resetting existing stores; schema-6 preservation is covered explicitly.

### Layout, intent and empty destinations

Transcribe has Audio Source at the top and Transcript Destination below, with both controls visible on initial opening. Leaving untouched Transcribe for Combine/Search guards its return behind **Enable Transcription**. Opening/using/closing Settings alone does not trigger that gate or count as transcription intent. Direct interaction with Transcribe or pressing Enable keeps it enabled for that app session; reload resets the session state. Shared access selected elsewhere prepopulates the controls but does not render/read display metadata for Transcribe's recording rows until intent/enablement. Newly prepared recording lists have no recordings checked; Select All remains available. No automatic inference occurs.

The lower common destination selector offers existing subfolders, Browse and **New Transcript Folder…**. Desktop creates/reads a real child handle, including an empty directory. iPhone can name an intended new destination without requiring any files or JSON to be readable; the folder must then be created/chosen in Save to Files. Naming does not claim a writable phone handle or actual folder creation. Existing nonempty transcript folders need no JSON. Native picking remains the non-upload directory picker. iPhone cannot infer empty folders omitted by Files enumeration; New Transcript Folder is the explicit route around that limitation.

### Delivery and messages

Desktop saves/verifies only TXT for transcription. iPhone shares only the pending TXT files together, using a files-only payload; no transcript sidecar or guidance text attachment is included. The audio list remains a separate parent-folder save; Search still loads and saves its existing embeddings archive, reusing unchanged vectors.

Each generated batch captures the selected destination label. A prominent **Save in: [archive / folder]** line above the phone save action uses that same context for retry/status text, rather than old transcript-JSON provenance. Never-saved or canceled/failed batches keep a pending pulse and the waiting-to-be-saved warning. After a normal share return, the pulse clears and the warning instead asks **Please verify that your transcripts were saved…**. New batches reset this state. Before-unload and explicit pending-work guards retain unsaved text; browser share completion still cannot prove Files placement or replacement. A partial in-session TXT snapshot supports subsequent batches without claiming verified disk contents; reselecting supplies fresh provider observations.

Status messages show one concise Audio Recording List state first, followed by Transcripts loaded/new-destination state; there is no external Transcript File List save status. Routine subfolder/no-new-save boilerplate is removed; real skipped/unverified/read/identity issues remain visible. Audio-saving guidance names the canonical parent/file. iPhone Files may still create a numbered audio JSON instead of replacing the original; the app does not control that naming/replacement. This reported issue remains separate, as does the MacBook hosted picker disappearing while browsing. test.html loading was reported, not a confirmed native picker diagnosis.

### Acceptance boundary

The candidate has not been deployed or device-accepted by this implementation. Automated checks use synthetic folders/media, isolated databases and stubbed model/Search execution. Real MacBook/iPhone acceptance: initial setup and Settings-only visits; untouched Combine/Search departure/Enable return; playback using shared audio; existing TXT-only collections; desktop new empty-folder creation; iPhone naming a new folder; unchecked recordings; TXT-only single/multiple transcript saves; correct large destination label; cancel/retry; never-saved versus share-return warnings; a new batch after sharing; unchanged audio JSON no-repeat behavior; Search embeddings unchanged/reusable; metadata cache View/Clear. Preserve original archives; existing transcript sidecars can remain unused during testing.

Older sections below retain historical decisions, including the superseded top destination selector, bundled transcript JSON and next-day plan. This candidate changes no model configuration, self-test requirements or audio/embedding schemas. No user archives, models, commits or hosting were modified by the harnesses.

Verification: **129 groups passed** — 18 current TXT-catalogue/session integration, 13 database/schema, 10 database/Settings integration, 19 recording identity/embedding compatibility, 47 audio persistence/recovery, 10 playback, 7 shared-folder access and 5 bounded metadata groups. Tests use synthetic files, isolated databases and stubbed model/Search execution. These counts replace the old .7 app-sidecar test counts; they do not establish real iPhone Files or model acceptance.

### 62.24 Durable full-text cache identity and conditional transcription gate — 21 November 2026

Build **2026-11-21.2**, database schema **8**. This update supersedes the earlier unconditional unused-return gate. Returning to untouched Transcribe shows **Enable Transcription** only when a transcript source/destination is selected; without one its controls remain visible. Settings navigation remains excluded. Direct destination selection prepares deferred recording rows when needed. The destination button always says **Browse for Another Folder**; the destination field displays the selected location.

Two local stores have different purposes: transcriptCatalogues holds rebuildable metadata from loaded TXT; transcripts holds full-text cached copies of generated transcripts. Full-text cache keys now include the existing Archive UUID, Recording ID, filename, model and operation, rather than filename alone. TXT headers supply the identities; no replacement IDs are invented. Equal folder/file names in different archives stay separate. Settings selects, exports and deletes by exact cache key, displays archive identity, and gives same-named selected exports distinct filenames without changing their contents. Native exports also protect existing case-equivalent filenames.

Schema 8 atomically migrates old full-text cache entries, preserving their bodies, dates, unidentified legacy entries and normalization collisions. A failed upgrade rolls back to the old store. Other stores remain intact. This preserves essential identity information for future multi-archive Combine; it does not implement a persistent multi-archive workspace. Audio-source JSON and Search embeddings JSON remain unchanged.

**136 targeted groups passed**: 7 durable-cache/migration/Settings, 18 catalogue/page, 13 database, 10 storage integration, 19 production identity, 47 audio persistence, 10 playback, 7 shared folders and 5 source performance. Tests use isolated data and disposable Chrome profiles; real iPhone/Mac visual and Files acceptance remains pending. No user archives were modified and no commit or deployment was performed.

### 62.25 Audio JSON retirement audit — 21 November 2026

The requested [audio JSON audit](Audio_JSON_Retirement_Audit.md) is complete against checkout 736a292, build **2026-11-21.2**, schema **8**. Modern transcript/audio linking depends on Recording ID, not Audio Source ID. Production source preparation, transcription, shared playback inventory, iPhone export readiness and Settings still depend on audio-list session/recovery APIs; these need a coordinated replacement rather than simply deleting the JSON writer.

Recommended direction: a metadata-only, rebuildable local inventory; cold identity reads, incremental warm reuse, automatic size/time invalidation, actual-file checks before inference/playback, and latest snapshots per established scope. Preserve the exact embedded/prefix ID rules, old random-ID associations needing migration, same-name folder separation, complete-folder reconciliation and Search embeddings. iPhone lacks persistent directory handles: folder names and metadata tuples alone cannot prove physical-folder identity. Cache association must stay conservative. Current recovery records are not yet the proposed incremental metadata cache, and transcriptCatalogue selection scopes are not durable physical-folder identities.

Next proposed checkpoint: an independent read-only inventory/comparison adapter, reporting embedded, reproducible, legacy and unresolved counts before switching production. Later checkpoints cover persistent cache, consumer/save-gate replacement, Settings and device acceptance. Existing disk JSON stays untouched. This audit changes documentation only; no build/schema increment, user-data edits, runtime test results, commit or deployment.

### 62.26 iPhone hidden shared-save gate bypass — 21 November 2026

Build **2026-11-21.3**, schema **8** unchanged. Saving the audio recording list from Combine/Search forwards a click to Transcribe's original save button. Previously its delegated activity listener treated that hidden click as transcription intent, bypassing Enable Transcription before the recording rows were prepared. Transcribe activity now counts only while its panel and setup workspace are visible. Explicit Enable Transcription still prepares shared recordings unchecked; Settings and no-transcript-folder gating rules are unchanged.

Verification: **28 targeted groups passed** — 3 new iPhone shared-save/gate regression groups, 18 catalogue/page groups and 7 shared-folder groups. The regression reproduces the hidden-save gate bypass and verifies shared audio rows after Enable, without automatic inference. This is a simulated iPhone file-input/share path in isolated Chrome; real iPhone acceptance remains required. On a fresh app load, enter Combine, select an audio parent with a transcription child, save the audio recording list if requested, return to Transcribe, and press Enable Transcription. Expect the shared audio rows unchecked. No audio JSON retirement implementation or user-data changes are included.

### 62.27 Read-only audio inventory comparison checkpoint — 21 November 2026

User confirmation: all four active archives are Apple Voice Memo recordings; the deliberately stripped test recording already reproduced its fallback ID. This is the modern prefix case, not an irreplaceable random legacy ID. Independent reconstruction and comparison are now implemented in [audioInventory.js](../js/audioInventory.js), with the standalone [audio-inventory-test.html](../audio-inventory-test.html) for MacBook/iPhone reports. It reads current audio, optionally compares the list, classifies differences/legacy mappings, and reports bounded requested reads and timing without writing files/caches. Report export alone saves a named TXT. Duplicate/unsupported/unreadable identity stays visible; complete-folder and partial reads remain distinct.

**44 targeted groups passed**: 16 inventory, 3 standalone page, 22 existing reproducible identity and 3 iPhone gate regressions. Production behavior/build **2026-11-21.3**, schema **8**, audio JSON and embeddings remain unchanged. No real archive or model tests were run. See the [audit checkpoint addendum](Audio_JSON_Retirement_Audit.md#checkpoint-1-implemented--21-november-2026) for device steps and interpretation. Review archive comparison/timing reports before the later production switch; next code checkpoint is a preserving incremental local cache.

### 62.28 iPhone return lifecycle and parent-grouped metadata cache — 21 November 2026

Build **2026-11-21.4**, database schema **8** unchanged. The user reported .3 had not resolved iPhone Enable Transcription or missing shared recording rows. Expanded tests now use production selectFolder/file-input handling instead of the synthetic folder-return shortcut. Two additional paths are handled: returning without a discovered transcript folder prepares the selected audio list while leaving setup open; child discovery finishing after return immediately refreshes the gate when shared selection commits. Selecting a new audio root clears stale rows before deferred rendering. A discovered/selected transcript folder still gates untouched Transcribe; Enable populates the selected audio unchecked. No automatic inference occurs. The hidden forwarded-save protection from .3 remains.

Settings Transcript Metadata Cache is grouped by Original Audio Folder from TXT where consistent, with stored granted-parent context as fallback. Unknown parents and mixed-parent collections have explicit labels. Same-name groups are presentation only: cache scope records and Archive UUIDs remain distinct and no data is merged/deleted. Existing snapshots can be grouped from their stored TXT metadata without a schema migration. This is not persistent physical-folder deduplication, which remains part of the staged inventory work.

**80 targeted groups passed**: 5 iPhone gate/actual-input/delayed-discovery, 21 catalogue/page/cache-grouping, 7 shared-folder and 47 audio persistence. Real iPhone confirmation remains pending; these synthetic checks do not prove the exact cause on the user's device. Refresh .4, open a parent in Combine, return to Transcribe, and verify either Enable then unchecked rows (transcript folder selected), or directly visible unchecked rows (no transcript folder). Settings-only visits remain excluded.

The user has deleted existing JSON files. The standalone audio-inventory-test.html can reconstruct without them and reports an absent baseline; no recreation is required for that checkpoint. Production still uses its current audio-list create/save workflow until the staged retirement switch. Search embeddings are independent; the user did not specify which JSON filenames were deleted. No user files were inspected or changed by this fix.

### 62.29 Dayananda cross-device audio inventory proof — 21 November 2026

The user supplied MacBook Chrome and iPhone Safari reports for **Dayananda Ashram Audio journal**, at 10:52:38Z and 11:18:21Z. Both enumerated the same **107 audio files** (489,775,383 bytes), recovered **107 embedded Apple Recording IDs**, and matched all 107 against a valid existing audio JSON. There were no path-set, file-size or case-insensitive Recording ID differences between devices; both reported zero unresolved, mismatched, added, absent, renamed or old assigned entries and no inventory issues.

Identity inspection took **1,193 ms on MacBook** and **972 ms on iPhone**. Both requested **68,277 audio bytes in 2,458 reads**. Enumeration after folder access took 116 ms and 0 ms respectively. These are single-run measurements, excluding picker/provider preparation and JSON discovery/comparison; requested bytes are not a measurement of iCloud downloads or peak memory. This does not prove a general device speed advantage or warm persistent-cache performance.

The user reports the Pages recovery worked and the iPhone test became accessible. No cancellation API response was provided, so server-side recovery details are not independently established. The paired reports establish cross-device inventory parity for this archive; they do not test the other three archives or the stripped fallback recording, and they do not establish acceptance of the separate .4 Transcribe UI fix. Both reports found a valid JSON despite the earlier deletion report; reconstruction still derives identities from audio and uses JSON only for comparison.

Checkpoint 1's cross-device proof is established for Dayananda. The next staged implementation is the preserving local inventory/cache and incremental refresh; production audio JSON retirement remains pending. No code/build/schema or user files were changed while reviewing these reports.

### 62.30 Settings folder cache list and selection cleanup — 21 November 2026

Build **2026-11-21.5**, database schema **8** unchanged. Settings now presents **Audio Recording List Cache**, **Transcript Folder Metadata Cache**, then **Model Registry Cache**, with a separator before each category and centered size/count summaries. The transcript disclosure now uses the same toggle action styling as the other View/Hide controls. Storage disclosure widths remain fixed when the label changes; transcript metadata rows share the audio/registry checkbox grid on narrow screens.

Transcript metadata is shown as individual folder-snapshot rows under parent audio headings, with transcript count, estimated metadata size, update time, Archive UUIDs and an expandable Transcript Files list. Same-name scopes remain separate. This replaces the combined preformatted report. Select all and Delete Selected appear above the folder rows only when populated; Delete Selected starts disabled. The separate Clear action is removed. Canceling deletion preserves all snapshots; deleting metadata leaves files, cached full-text transcripts, pending exports, audio-list recovery, registry definitions and embeddings intact. Selection targets exact scope IDs; if a chosen snapshot changed after viewing, the deletion transaction aborts and preserves all targeted snapshots for refresh.

Validation: **47 targeted groups passed** — 25 catalogue/page/Settings, 10 database integration, 7 full-text identity and 5 iPhone gate.

This pass does not change cache scope association/deduplication, implement the incremental audio cache, retire audio JSON or remove active audio-list recovery protections. Those remain within the staged inventory plan. Device visual acceptance is pending. Tests cover individual selection, select-all, cancel/empty states, parent grouping, category order and separator placement, matching disclosures, a true 390px iframe layout with production CSS/inline styles, stale-snapshot atomic rollback, existing cache identity and iPhone gating.

### 62.31 Production audio metadata inventory and latest cache snapshots — 21 November 2026

Candidate **2026-11-21.6**, database schema **9**. Implements the authorized production switch after the Dayananda MacBook/iPhone identity proof. Production source selection no longer discovers, creates, reconciles, writes or shares memora-audio-source.json. Existing audio JSON, numbered copies and transcript JSON files remain untouched and are not inventory authorities. **search-embeddings.json remains active and independent.** No new Recording IDs or transcript Archive UUIDs are invented to replace existing embedded identities.

### Inventory and cache behavior

audioFolderCache.js owns a rebuildable metadata-only audioFolderCatalogues store. Embedded Apple/iMuse IDs remain authoritative; supported audio positively lacking an ID uses the unchanged 256000-byte prefix/size SHA-256 UUID method. Cache clearing reproduces those identities. Before inference the actual selected file is verified; playback retains its independent ID verification. Cached folder IDs are local bookkeeping, not exported recording/source identities. The schema-9 upgrade adds this store while retaining full-text transcripts, transcript metadata, model definitions/evidence, embeddings and previous recording-list recovery data.

Native folders associate through isSameEntry; unchanged size/time and inspection version permit reuse of identity and date/duration metadata. New/changed files are inspected. iPhone always checks the current immutable File snapshots for identity before reusing date/duration metadata; name/size/time alone cannot establish its source. iPhone cache associations describe logical inventories: equal names plus a verified exact ID set, or one unambiguous overlapping known inventory, can update the same scope. Exact copied folders with equal labels and IDs cannot be physically distinguished through this API. Ambiguous overlaps remain separate, and current file access is never borrowed from another cache scope. Different IDs with equal folder/filenames remain distinct. This limitation is explicit; it is not a claim of persistent physical-folder handles on iPhone.

Successful complete scans replace the latest identified inventory, removing missing members without retaining versions. Existing duplicate identified snapshots choose the newer entry and remove older copies in the same transaction. Partial, aborted, unreadable, malformed or duplicate-ID scans do not replace a complete valid inventory. Duplicate actual audio files are reported, never resolved by modification date. A cache failure does not block a valid in-memory inventory or alter its IDs. Revision checks prevent stale sessions/deletions overwriting refreshed entries. Web Locks, where available, serialize cross-tab inventory preparation. Retention is bounded to 16 metadata scopes; no audio bytes/decoded samples or persistent File objects are stored. Date/duration work remains deferred until Transcribe display needs it and is saved in one metadata update.

Transcript metadata is still read from TXT on every load to detect edits. Identified folder snapshots now replace earlier matching snapshots and consolidate duplicates; complete cached folders survive partial or failed reads. Native handles distinguish known locations; handle-free logical matching uses transcript Archive UUIDs, folder labels and parent context. Different folder names or archive identities remain separate. These caches are derived views, not a persistent multi-archive Combine workspace or substitutes for file access.

### UI and preserved data

Source activity/spinner and the .4 return/Enable Transcription rules remain. The audio list save button, mirrored save controls, pending-list prompts and audio-JSON-dependent iPhone transcript export gate are removed. Status is a concise recordings-ready message with a nonblocking local-cache warning when needed. Transcript batch destination, TXT-only sharing, before/after-share warnings, failed TXT retry and unchecked defaults remain. Identity dialogs are shared from identityDialog.js without loading the retired persistence workflow into app.js.

Settings now shows **Audio Folder Metadata Cache**, **Transcript Folder Metadata Cache**, then **Model Registry Cache**, using the standardized layouts and selection deletion. Clear/delete metadata preserves files, cached full-text copies, pending exports and embeddings. Previous browser-local recording-list data is retained under optional **Previous Audio Recording Lists** inspection/deletion for compatibility; it is not used by the new inventory. No ongoing history of the new inventories is kept. Legacy persistence/helper suites remain compatibility evidence, not current production requirements.

### Validation and device checklist

Verification: **191 focused groups passed** — 17 new audio cache, 29 current catalogue/page/Settings, 5 iPhone gate, 13 database/schema, 10 database integration, 7 full-text cache identity, 7 shared-folder, 10 playback, 22 reproducible identity, 19 recording identity/embedding compatibility and 47 historical audio persistence/recovery plus 5 bounded metadata/performance. Historical sidecar suites verify retained helpers/data, not current JSON requirements. Tests use isolated stores, synthetic audio and stubbed inference; native cache checks include real origin-private directory handles. No real Whisper model or user archive execution is claimed.

Focused isolated Chrome regression coverage includes the new audio cache with real origin-private directory handles, identity checks, latest replacement, native concurrency, incremental membership, cleared/unavailable cache, stale transactions, schema-8 preservation, current app/page/Settings (including a 390px iframe), iPhone folder-input flow, full-text cache identity, playback, embedding reuse, shared access and retained historical data. These checks do not establish real iPhone production acceptance or new model performance. The earlier device reports establish only the isolated Dayananda reconstruction proof. No user archive, audio, TXT or disk JSON was modified; no commit, push or deployment was performed by Codex.

After publishing .6, refresh both devices and confirm the build. Open a parent audio folder from Combine/Search: expect no audio-list JSON dialogs or save button; verify transcript playback and existing Search embeddings. Return to Transcribe: a selected transcript folder guards unused setup behind Enable; without one, setup remains visible with unchecked audio rows. Save a short transcription to the displayed destination; iPhone shares TXT only, independently of any audio list. Reopen the same folder and check the cache keeps one latest identified entry. Delete that metadata entry in Settings and reopen: IDs should be unchanged, files preserved. Repeat with the stripped test recording if available. Real provider downloads/picker wait and memory usage remain unmeasured by the synthetic tests.

### 62.32 Automatic audio lookup contract fix and final audio JSON cleanup — 21 November 2026

Candidate **2026-11-21.7**, database schema **10**. The user explicitly rejected legacy audio JSON support and authorized removing its local recovery data and unused code. The schema upgrade deletes **only audioSourceRecovery**. Audio/transcript metadata caches, full-text cached transcripts, model definitions/evidence, embeddings, semantic metadata and unrelated stores remain. A failed upgrade rolls back the deletion along with all other changes. No JSON, audio or TXT files in user folders are deleted by this code.

The reported .6 automatic playback failure was an integration mismatch: audioFolderCache.getInventory() returns **records**, while sharedFolderSelection.setAudio still read the retired **recordings** property. Lookup therefore called filter on undefined. setAudio now validates and consumes inventory.records before changing shared state. Tests now use the actual producer output, the actual Combine Show transcript → Play path, and both native/file-input shared controls. The .6 isolated helper tests supplied the old shape and did not establish this connection; .7 closes that coverage gap. Renamed audio is still found by Recording ID, independently of transcript filenames.

Removed the Previous Audio Recording Lists Settings section, source recovery/discovery/writing APIs, old source UUID/manifest workflow and obsolete sidecar reconciliation tools/tests. Standalone inventory and root-folder diagnostic tools now derive identity directly from audio; audio JSON comparison/simulation controls and schema parsers are gone. Generic file/JSON inspection for unrelated diagnostics is not inventory support. Legacy TXT/Voice Memo ID parsing and Search header/embedding compatibility remain because those preserve transcript identity and existing vectors; they are separate from audio JSON support.

The unused transcript-sidecar helpers coupled to the removed audio APIs were also removed; current TXT catalogue loading, editing and saving are unchanged. Shared identity dialogs remain in identityDialog.js. Historical documentation links to removed code point to the last committed version; the design journal retains its history.

Verification: **183 focused groups passed** across 15 suites: 19 audio cache/migration, 30 current app/catalogue/Settings (including actual Combine playback), 13 schema, 10 database integration, 7 full-text identity, 5 iPhone gate, 7 shared production folders, 11 audio controls (including the real producer contract on phone/desktop branches), 22 reproducible identity, 6 TXT/embedding compatibility, 10 standalone inventory, 3 standalone page, 20 root-folder adapter/UI, 15 folder-selection prototype and 5 bounded metadata cases. Removed obsolete suites are excluded from this count. Tests use isolated stores and synthetic data; media play is mocked to test file resolution, not audio decoding/speaker output. Actual .7 device acceptance remains pending.

Once .7 is published, reload both devices and select the parent Audio Source again. Combine Show transcript → Play and Search playback should resolve against the selected inventory without another picker. There is no need to clear the new metadata caches to fix this field mismatch. Existing **memora-audio-source.json** and its numbered copies are unused and can be deleted by the user. **Keep search-embeddings.json**; it remains the active Search index file. Old local recording-list recovery data disappears on successful schema upgrade. Actual MacBook/iPhone production confirmation of .7 remains pending; no real user archive/model was executed by Codex and no commit/push/deployment was performed.
