# Database schema tests

## Whisper catalogue/resolver and first baseline migration

Open `/tests/whisper-configurations.html` using Live Server. Initial 12 groups passed for unused 3A; after the first 3B migration, 13 groups passed including independent complete snapshot parity against `tests/fixtures/whisper-registry-baseline-v2.json`. That fixture was captured from the old source before replacing the baseline and must not be regenerated from the new projection to hide differences. No inference/backend support is established. modelManager now consumes definitions for legacy records; resolver execution callers are not migrated.

The expanded database integration suite has seven groups, including saved validation/custom evidence preservation across registry refresh; all passed after this change. The nine accuracy/UI groups also passed. These tests use isolated data/synthetic responses and do not touch the user's registry.

Serve the repository over localhost and open `/tests/database.html` in Chrome. The page runs automatically and should finish with `ALL TESTS PASSED`.

Tests use unique `Memora-schema-test-…` database names and remove those fixtures afterward. They never open or delete the `Memora` database. Closing the page mid-run may leave temporary fixtures; they do not affect Memora. The manager is now integrated into application code; opening the normal app can upgrade its database to version 5.

The harness checks fresh/empty databases, healthy and incomplete version-4 upgrades, missing indexes, record and binary embedding preservation, unknown-store preservation, incompatible-schema rollback, partial current-version rejection, future-version refusal, concurrent independent connections, blocked-upgrade abandonment/retry, versionchange closing, unavailable storage, and retry after an injected synchronous failure.

Initial execution: 29 October 2026, headless installed Chrome on the Mac, separate `/private/tmp/memora-db-test-profile` profile and temporary localhost server. Eleven test groups passed. These are isolated real-browser IndexedDB tests, not verification of the user's existing database or iPhone/Windows behavior. At that initial isolated checkpoint the live database had not been upgraded. Those remaining checks subsequently passed, as recorded below.

Integration checkpoint: the expanded schema suite passed all 12 groups, including incompatible-index rollback. Open `/tests/database-integration.html` for six production-module integration groups. Its import map substitutes a temporary `Memora-integration-test-…` database owner for storage, semantic, registry, and Settings modules. Fixture records include transcripts and binary embeddings; no ML models are downloaded. It tests registry seeding, transcript operations, semantic persistence/reuse/removal, atomic failed batches, connection cleanup, storage accounting, Settings registry rendering, visible registry failures, and runtime reporting after a storage error. All six groups passed in the separate headless Chrome profile. Expected injected errors may appear in the test page's Console; the page result determines success.

User confirmed the actual Mac upgrade and all requested Mac checks passed for the build committed as `35d69cd`. User also confirmed the recommended iPhone and Windows integration checks passed. Exact OS/browser versions were not supplied. The separate `imuse-recording-breadboard` database is outside this change. Do not downgrade to an older hardcoded version-4 app after upgrading the real database; retain the version-5 owner in any forward fix.

## Whisper checkpoint 2A safety tests

Open `/tests/whisper-lifecycle.html` and `/tests/whisper-settings.html` using Live Server. Both run automatically and should end with ALL TESTS PASSED. They use synthetic fixtures/worker replies or cancelled stub fetches only: no model downloads, real inference, database mutation or website-data clearing. Settings tests temporarily stub fetch/Worker within their own page; close test pages afterward.

On 9 November 2026, 22 lifecycle groups and five Settings/production-entry groups passed in isolated headless Chrome. Covered desktop/iOS protocols, cancellation before and during stages, all stage watchdogs, absolute deadlines, late/duplicate messages, constructor/post/error/messageerror handling, cleanup failures, exclusivity, retry, invalid limits and refresh during an active test. Existing 12 schema and six database integration groups also passed after this change.

Candidate build 2026-11-09.1 awaits real user Tiny completion/cancellation/retry and short production transcription checks on desktop/iPhone. These controlled tests do not establish model accuracy or hardware/backend support. Runtime/library/model options are unchanged; output gates and persistent history are later checkpoints.

## Whisper timing/session diagnostics checkpoint

Open `/tests/whisper-diagnostics.html` using Live Server. Seven groups verify safe session-metadata extraction, unavailable/getter-error handling, production timing boundaries and unchanged task/language forwarding, application display parsing, and all three real worker scripts using synthetic pipelines substituted for remote ML imports. No actual models/GPU inference are exercised. On 9 November 2026 all seven groups passed in isolated Chrome; the 22 lifecycle and five Settings regressions also passed with HTTP caching disabled in that isolated profile.

Candidate app build 2026-11-09.2 awaits the user's MacBook Large timing sample and normal iPhone Tiny check. Timing/session metadata does not constitute operator-level WebGPU profiling. Inspected pinned source: Transformers.js 4.0.0 src/models/session.js constructs selected device/dtype; src/backends/onnx.js attaches session.config. Missing metadata in any runtime stays unknown; no private undocumented getter is required for inference to work.

## Whisper checkpoint 2B accuracy tests

Open `/tests/whisper-validation.html` using Live Server. Nine groups cover exact 15% inclusion, above-boundary rejection without rounding into PASS, unchanged normalization, empty/malformed output, invalid references/scores, WER above 100%, lifecycle quality failure versus inference completion, no-worker fixture failure, Settings transcript inspection and retry. All nine groups passed on 9 November 2026 in isolated headless Chrome. The 22 lifecycle, five Settings and seven diagnostics groups also passed. These use synthetic replies/audio and no model downloads or databases.

User accepted build 2026-11-09.3 after real Tiny standalone self-tests on MacBook (WER 6.38%) and iPhone (WER 0.00%). User explicitly approved WER ≤15%; no provisional 25% gate remains. Production transcription settings/workers are unchanged. Capture output/WER and verdict; failures are evidence to inspect, not justification to tune the reference or limit silently.

## Durable self-test recovery — build 2026-11-09.7

Open `/tests/whisper-attempts.html` on localhost. Eight groups use in-memory fixtures and a dedicated `memora-test-journal.*` localStorage namespace for a real page-navigation test; no models or IndexedDB. Covers last-stage recovery/idempotence, active Web Lock ownership, initial/stage/final write failures, unavailable locking, terminal outcomes, last-success retention and bounded history. The Settings suite now has six groups, including visible model/stage interruption recovery. The 22 lifecycle checks also pass with the checkpoint hook. Run browser fixtures in an isolated profile: the Settings suite exercises the normal journal integration and can leave synthetic attempt records in that profile.

User acceptance: confirm build .7, run/cancel Tiny and verify saved records survive refresh. To check interruption without loading a large model, start Tiny and reload promptly while it is preparing/loading; open Settings and expect “Interrupted—no final result recorded” with the last saved stage. If it completed first, it should remain passed instead. Do not force a Medium crash. Repeat the small smoke/recovery check on iPhone after publishing. No attempt existed for prior crashes, so those are not recoverable.

Build 2026-11-09.8: nine journal and seven Settings groups pass, including terminal-history clearing, preservation of a live owned attempt/unrelated keys, and immediate Settings refresh. User check: clear saved history and refresh; records should stay cleared. This intentionally removes prior successful evidence too, while leaving model caches and IndexedDB intact.

Build 2026-11-09.10: ten journal and eight Settings groups pass. Covers normalized legacy provisional snapshots without mutating history/real failures, readable saved report/technical disclosure, and clipboard success and denial fallback. For user acceptance, expand existing saved reports, check local dates/stages, and use Copy report on Mac/iPhone. No model execution required.

## Whisper eligibility foundation

Open `/tests/whisper-eligibility.html`: eight groups use synthetic attempts and injected memory storage, with real browser Web Locks. No model execution or user eligibility storage. Covers inclusive WER gate, interruption/runtime/accuracy blocking, neutral cancellations/timeouts, deliberate retest, last success, replay ordering, history-clear isolation, context changes, concurrent updates and explicit write errors. Production does not consume the new module yet; this verifies rules, not active selector filtering or iPhone model suitability.

## Eligibility evidence integration — build 2026-11-09.13

Open `/tests/whisper-evidence.html`: seven groups verify actual test-worker fingerprint/recipe, shipped fixture bytes/digest, exact terminal evidence/idempotence, recovered/live-owner handling, conservative legacy review surviving cleared history, changed context and storage errors. Uses synthetic attempts and memory storage, plus fetched local fixture bytes; no models. The eight Settings groups also verify a visible legacy block and its survival after clearing history. Combined with eight eligibility and nine validation groups, 32 groups passed. Production choices are not filtered yet.

Device check: selected-model status appears beneath controls and changes with model selection. Run Tiny, refresh and inspect saved context/digests/status. Existing blocks persist through ordinary passes until deliberate retest is implemented. Do not crash Medium again; retained old iPhone Medium interruptions are enough for a review block.

Build 2026-11-09.14: nine eligibility, ten evidence-integration, eight Settings and nine accuracy groups pass (36 total). New coverage distinguishes suspended interruption from confirmed failure, migrates old holds, restores eligibility through deliberate passes, resolves legacy reviews without replay regression, reopens newer holds, scopes resolution to exact contexts, and persists UI retest intent/cancellation. Real-device check: Retest Tiny, verify Test-qualified and persistence after refresh; optional cancellation preserves prior state. No Medium run required.

Build 2026-11-09.15: eight Settings and nine validation groups pass. Main button switches between Run test and Retest for the exact selected configuration/context, preserves hold after cancellation, records deliberate intent and returns to Run test after qualification. There is no separate Retest action.

## Strict production gating — build 2026-11-09.16

- `/tests/whisper-production-eligibility.html`: six groups use the real production-gate factory with injected evidence. Empty state, exclusion/restoration, exact Medium defaults, quantization isolation, unsupported environments and storage failure.
- `/tests/whisper-production-selector.html`: four groups execute the actual selector refresh function extracted from app.js against fixture DOM/injected choices; onboarding, qualification/removal, active-batch preservation, stale async updates and errors.
- `/tests/whisper-loader-gate.html`: two groups substitute only the gate decision and Worker to verify loader refusal before worker creation and canonical repository/dtype enforcement. No models.

These plus ten evidence, eight Settings, seven diagnostics, nine validation and 22 lifecycle groups passed (68 groups). Model/backend device acceptance remains separate. Desktop needs a fresh Tiny test because self-test now uses the same production worker and therefore a different fingerprint from historical desktop evidence. iOS worker fingerprint remains unchanged. Only family-default variants can qualify a family selector entry; other variant tests remain available in Settings.

Build 2026-11-09.17: 13 evidence-integration, nine eligibility, eight Settings, six production-gate and nine validation groups pass (45 total). Manual passes with deliberateRetest:false restore exact/legacy holds, historical withheld passes migrate without rerunning (including later neutral cancellation), newer adverse results win, and explicit automatic/sequence markers cannot use manual recovery. No resource or sequencing changes.

## Runtime/page diagnostics — build 2026-11-09.18

Open `/tests/runtime-diagnostics.html`: seven groups use injected storage/synthetic workers and a dedicated `memora-test-runtime.*` namespace for a real navigation fixture. Covers page-instance correlation and prior-stage persistence, page/event retention, storage failure, fresh export snapshots, actual app navigation handlers/reasons, worker lifecycle ordering and diagnostic-hook exceptions. No models. The Settings suite verifies attempt pageId and diagnostic metadata in copied reports. Together with 22 lifecycle, seven worker diagnostics, ten attempt, two loader and nine accuracy groups, 65 groups passed. Browser fixtures exercising normal Settings integration create diagnostic records in their profile; use an isolated browser profile.

Device acceptance: confirm .18; run Tiny once, close/reopen Settings, refresh the page, reopen Settings and download that original Tiny report. It should include `runtimeDiagnostics.currentPageId`, `attemptPageId`, retained page events, Settings-close reasons and test worker lifecycle. Runtime snapshots are captured at export rather than frozen at test completion. Older reports have no attempt page ID and cannot provide retrospective correlation. No additional Small run until this instrumentation is reviewed.

## Bounded disposal — build 2026-11-09.19

Open `/tests/whisper-disposal.html`: 11 groups cover request-ID matching, handler restoration, duplicate/late replies, absolute deadline, cancellation, post/worker/message errors, unavailable API, ordering before termination, timeout fallback/ownership/retry, accuracy-versus-cleanup outcomes, forced termination of active failed/cancelled/timed-out inference, and actual iOS/desktop worker source using injected complete/throw/unavailable dispose methods. No real models. With 22 lifecycle, nine accuracy, eight Settings, seven worker diagnostics, 13 catalogue and 13 evidence groups, 83 groups pass.

Device acceptance: fresh Tiny test on changed worker context; verify Cleanup details shows model disposal API acknowledged and worker termination invoked, then download report. Five-second disposal timeout is a bound, not a guaranteed memory cooldown. Review before further Small testing; no rapid sequences or repeated crashes.

Obsolete-worker cleanup: removed whisper-test-worker.js and its single historical worker case. Diagnostics now has six groups; disposal retains 11 groups. Both pass. Active workers and production/self-test execution are unchanged.

Build .20 dead-code cleanup: loader-gate suite now has four groups, including actual loader source with simulated iOS/desktop worker selection, reuse, transcription messages, idempotent termination and unloaded-call refusal. All four plus six diagnostics groups pass. Worker scripts/options/fingerprints are unchanged.
