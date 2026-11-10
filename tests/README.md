# Memora test guide

Reviewed 9 November 2026 through candidate application build **2026-11-10.2**. These browser harnesses support focused changes; they are separate from Settings' real model self-test. Detailed prior run counts, device results and checkpoint instructions are preserved in [test history](../docs/archive/Test_Checkpoint_History_2026-11-09.md). Old pending instructions there are historical.

## How to run safely

Serve the repository over localhost using Live Server or a plain static server. Open a test page from the table below; it runs automatically and should finish with **ALL TESTS PASSED**. Use a separate browser profile for developer harnesses: Settings/evidence/selector integration can create synthetic journal, eligibility and diagnostic records. Do not run them in the profile used to establish real model qualification.

Schema tests use temporary `Memora-schema-test-…` databases. Database integration substitutes a temporary `Memora-integration-test-…` owner through an import map; it must not be bundled in a way that bypasses that substitution. Fixtures clean up their temporary databases; closing mid-run may leave fixture databases. Never clear the real Memora or iMuse database for testing.

Whisper harnesses use synthetic workers/pipelines/audio or cancelled/stubbed network responses. Their passes establish code behavior under those fixtures, not real model accuracy, GPU operator execution, iPhone memory reclamation or sequence stability. Expected injected errors can appear in the Console; use the test page's final result. Close fixtures after use.

## Choose a focused harness

| Page | Coverage |
|---|---|
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
