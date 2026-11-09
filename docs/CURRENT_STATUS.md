# Memora — current status and resume instructions

Reviewed 9 November 2026. Baseline build **2026-11-09.23** (`58cfd3f`) is user-accepted. Candidate **2026-11-09.25** adds the maintenance-button presentation change below; .24 active-test wording is also included. User acceptance is pending. No commit/publication by agent.

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
| File map | [filemap.md](../filemap.md) explains all 40 application JavaScript files, including the 15 Whisper files, dependencies and cleanup findings. |

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

## Next optional checkpoint — not started

The last proposal was a **read-only audit of normal transcription error paths**, estimated **15–25 minutes**, to decide which failures should affect eligibility. The user deferred this work. Resume only when requested.

The audit should distinguish model execution failure, invalid audio/decode/input faults, cancellation, storage/export errors and page interruption. Then propose exact persistence/recovery rules and tests before a separate implementation checkpoint. Do not apply one blanket failure rule or assume a production journal already exists.

Afterward, revisit the iPhone stability investigation only with a bounded, agreed diagnostic plan. Durable automatic sequences remain future scope: one configuration at a time, an initial attempt plus at most one automatic retry, saved retry budget, explicit resume after page loss, and separate retry qualification policy. See [testing design](Whisper_Configuration_and_Test_Design.md#future-sequences-and-retries).

## Verification recorded so far

- Runtime/version-5 database foundation: user Mac, iPhone and Windows acceptance passed. These earlier checks do not imply every later Whisper change was tested on Windows.
- Real manual runs on Mac/iPhone demonstrated Tiny qualification and ordinary transcription; Base/Small and larger-model observations are preserved in the [checkpoint history](archive/Development_Checkpoints_2026-11-09.md). No general hardware-support guarantee follows from a short fixture pass.
- Build .21: 40 focused synthetic/browser groups passed. Build .22: 30 focused groups passed. Build .23: eight Settings plus seven isolated database-integration groups passed, including current qualification, collapsed history, other-platform labeling and database errors. These are recorded prior results, not reruns during this documentation refresh.
- The latest user accepted .23 presentation. No new model execution, storage migration or iPhone publish/test is required for documentation-only changes.

## Deferred work and working rules

Vite/release conversion was intentionally discarded; no Vite configuration/dependencies remain. GitHub Pages remains `main` → `/(root)` and Live Server remains usable. Cache consistency is unresolved; a build footer does not prove all loaded assets match. [Vite](archive/Vite_Design_and_Rollout_Plan.md), [asset inventory](archive/Asset_and_Deployment_Inventory.md) and [Offline Tiny](archive/Offline_Whisper_Tiny_Implementation_Plan.md) are archived deferred proposals, not active instructions. Sharing consolidation, Search experiments and iMuse integration remain deferred; leave `imuse-recording-breadboard` untouched.

Proceed in small, independently testable steps and stop at natural breakpoints. No agent commits/publication, hosting changes or storage resets without instruction. Preserve evidence, user files, model identities and existing file-delivery behavior. Do not restart completed runtime/database work or broadly rename/merge Whisper modules.

Start with [documentation index](README.md), [file map](../filemap.md), [catalogue contract](Whisper_Catalogue_Resolver_Contract.md) and [test guide](../tests/README.md). Detailed chronological handoffs are in the [archive](archive/README.md); the [design journal, section 60](design-journal.md#60-runtime-and-whisper-consolidation-through-build-2026-11-0923) records the decisions.

Resume prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. Build .23 was accepted; runtime, database and the agreed catalogue/display cleanup are complete. Normal-transcription failure feedback is proposed but deferred. Review its error paths without changing code first. Keep automatic sequences and resource experiments paused.”
