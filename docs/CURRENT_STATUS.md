# Memora — current status and resume instructions

Updated 9 November 2026. Read this first, inspect Git status/current source, then consult the linked plan. Archived plans and journals preserve history; this file gives the current sequence.

## Current sequence

1. **Runtime identification: complete for the agreed scope.** Shared OS/device classification, consistent reporting, production/self-test consumers and Search audio detection are implemented. Do not restart runtime migration.
2. **IndexedDB foundation: complete for the repair scope.** Canonical version-5 ownership and the missing-registry repair passed isolated tests and the user's Mac, iPhone and Windows checks.
3. **Vite/release asset conversion: deferred for Memora.** The isolated installation was discarded, and remaining untracked tooling was moved outside the repository. No Vite configuration/dependencies remain in the checkout; normal Live Server/main-root publishing continues. Design documents are reference only.
4. **Whisper configuration and testing: current priority.** Step 1 audit/design is prepared; review PASS criteria and deadlines before implementing safe standalone Tiny tests, then common resolution and durable evidence. Automatic sequences remain later scope.
5. **Offline Tiny, sharing consolidation and iMuse integration: deferred.** Align their contracts with the above work before implementation.

## Immediate next action

Checkpoint 2B is implemented locally with the user's approved **WER ≤15%**, candidate build **2026-11-09.3**. No commit/publication by the agent. Validate one standalone Tiny self-test on MacBook and, after publication, iPhone. Check footer, accuracy verdict, WER and transcript. Capture an unexpected failure rather than changing the threshold to make it pass. No repeated Large trials or normal production transcription regression is required for this self-test-only accuracy change.

New whisperValidation.js centralizes the unchanged text normalization/WER calculation and versioned fixture gate (whisper-fixture-wer-v1). Exactly 15% passes without rounding the comparison. Empty/non-string/punctuation-only output, invalid/non-finite/negative score and above-limit WER fail; invalid reference fails before worker creation. A valid WER can exceed 100% due to insertions and correctly fails the threshold. Inference completion remains passed when output validation fails; the overall result fails at validation and Settings retains the transcript. Timeout/cancellation and cleanup remain separate. This is a short-fixture functional check, not general accuracy, model eligibility, backend profiling or persistent evidence.

Verification: nine controlled accuracy/UI groups, 22 lifecycle groups, five Settings groups and seven timing/worker diagnostics groups passed in isolated Chrome using synthetic data. No real model runs performed by the agent. Production loader, workers, model catalogue, fixtures and database remain unchanged in 2B. Next after user acceptance: commit this checkpoint if desired, then design/migrate the canonical registry resolver in small increments; remove duplicate desktop test worker during 3B after protocol parity.

Previous diagnostics build 2026-11-09.2 is user-verified on Mac Small self-test and Small/Large production, and iPhone Tiny production. Both desktop components report selected WebGPU settings (Small fp32/fp32, Large fp16/q4); iPhone Tiny reports wasm/q8. Large worker inference closely matched caller time (76–82s for 16.7s audio), locating delay inside pipeline invocation. Resource contention is a hypothesis, not proven; no fallback evidence or tuning changes. Full supplied measurements are in the step-1 design. Performance profiling remains optional separate work.

Checkpoint 2A normal/cancel/retry checks passed as reported for Mac Tiny/Large; normal Tiny production passed on Mac/iPhone. Exact iPhone cancellation/retry coverage was not separately stated. Existing 600s load/180s inference guards remain visible/adjustable; larger-model calibration and automatic sequences remain deferred. Vite remains deferred/removed. Durable attempt persistence is a later checkpoint.

## Completed evidence

| Checkpoint | Actual result |
|---|---|
| Worker/Combine module naming | References maintained; user iPhone checks passed. |
| Database integration `35d69cd` | 12 isolated schema groups and six production-module/Settings groups passed in separate Chrome profile. User Mac/iPhone/Windows acceptance passed. Mac version 4 without modelRegistry became version 5 with all four stores; no reset/full live-record comparison. |
| Runtime reporting `560d93f` | Nine simulated environments; user startup/Settings checks passed. |
| Self-test environment `4c41d6d` | Parsing and five simulated environment checks; user reported success, exact latest devices unspecified. |
| Search audio `560fff7` | Simulated controls/picker checks; user desktop/iPhone playback passed. Explicit iPad behavior intentionally joined the iOS path; no separate iPad hardware result. |
| Build label `7cfb099` | Label checks passed; user confirmed Mac display and iPhone caching problem. |

These checks do not validate all model families, sequences, backends or browsers. Separate Android/iPad hardware acceptance is unreported. See [foundation record](Runtime_and_Database_Status.md) and [test instructions](../tests/README.md).

## Working rules and deferred scope

- One small change at a time; focused tests and pauses at natural break points. Batch publication after local checks to reduce GitHub Pages waiting time.
- Do not commit/publish, reset storage or change hosting settings without instruction. An inventory request does not authorize implementation.
- Keep Medium q4 and standalone-test safeguards until replacements pass regressions. Distinguish API availability, requested backend and confirmed execution.
- Do not revert to hardcoded version-4 openers after database upgrade. User data is disposable if recovery is necessary, but routine resets remain inappropriate.
- Leave `imuse-recording-breadboard` untouched. Future recording migration requires both repositories/schema inspection; no speculative audio store or database renaming now.
- No forced refresh during active work. HTTP caching, model Cache Storage and IndexedDB are separate concerns.
- Sharing inventory is an overview; trace full dependencies immediately before changing workflows. No sharing extraction is implemented.
- Leave five design journals intact pending a separate restructuring request. Their historical statements do not override current source/status.

Start from [documentation index](README.md). Completed planning records are in [archive](archive/README.md). Suggested resume prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. Runtime and database repair are complete. Review docs/Whisper_Configuration_and_Test_Design.md next. Step 1 design is complete; agree the proposed PASS gate/deadlines before step 2. Vite is deferred. Preserve small changes and test checkpoints.”
