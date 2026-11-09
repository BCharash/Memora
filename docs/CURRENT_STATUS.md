# Memora — current status and resume instructions

Updated 9 November 2026. Read this first, inspect Git status/current source, then consult the linked plan. Archived plans and journals preserve history; this file gives the current sequence.

## Current sequence

1. **Runtime identification: complete for the agreed scope.** Shared OS/device classification, consistent reporting, production/self-test consumers and Search audio detection are implemented. Do not restart runtime migration.
2. **IndexedDB foundation: complete for the repair scope.** Canonical version-5 ownership and the missing-registry repair passed isolated tests and the user's Mac, iPhone and Windows checks.
3. **Vite/release asset conversion: deferred for Memora.** The isolated installation was discarded, and remaining untracked tooling was moved outside the repository. No Vite configuration/dependencies remain in the checkout; normal Live Server/main-root publishing continues. Design documents are reference only.
4. **Whisper configuration and testing: current priority.** Step 1 audit/design is prepared; review PASS criteria and deadlines before implementing safe standalone Tiny tests, then common resolution and durable evidence. Automatic sequences remain later scope.
5. **Offline Tiny, sharing consolidation and iMuse integration: deferred.** Align their contracts with the above work before implementation.

## Immediate next action

A diagnostics checkpoint is implemented locally to investigate unusually slow Large inference before 2B. Candidate build **2026-11-09.2**, not committed/published by the agent. Registry definitions, worker loading options and runtime versions remain unchanged. Added read-only session/device/dtype snapshots to all three worker replies, worker-internal inference timing, production metadata/decode/load/reuse/inference/audio timings, and separate paragraphing time. Production/self-test expose “Timing and model diagnostics”; production also logs structured timing data. This is observability, not a performance fix or full resolver.

Pinned Transformers.js 4.0.0 package source was inspected: models/session.js selects device/dtype and backends/onnx.js attaches that configuration to initialized sessions. Snapshots are best-effort; they do not establish every operator used GPU. actual operator backend remains unknown. No extra GPU adapter requests, verbose profiling, fallback, model option or quantization changes were added. Old cached workers show unavailable diagnostics; an older loader's missing optional diagnostic getter no longer prevents module startup. HTTP cache mismatch was encountered in isolated testing and resolved there by disabling the test profile's HTTP cache, not by clearing app storage.

Verification: seven controlled diagnostics groups (including all three worker scripts with synthetic pipelines), 22 lifecycle groups and five Settings groups passed in isolated Chrome. No real model inference or user-device performance trial was run by the agent. Build/app source parsing and whitespace checks passed. No database mutation in these diagnostic tests.

User diagnostic checks passed for Mac Small self-test (WER 0.0%, load 15.0s, inference 26.3s/worker 26.1s), Mac normal Small (load 12.1s, inference 20.2s), Mac normal Large (load 39.4s, inference 76.2s/worker 76.0s; reused English-selected repeat 81.7s/81.6s), and iPhone normal Tiny (load 2.1s, inference 3.8s). Audio durations differ between self-test (15.5s) and normal Mac recordings (16.7s); no exact same-input cross-path comparison is established. Full table and limitations are in the step-1 design's performance-observations section.

Both desktop session components report selected WebGPU settings: Small fp32/fp32 and Large fp16/q4. iPhone Tiny reports wasm/q8 for both. No evidence of desktop WASM fallback; operator-level backend remains unknown. Inference/worker times closely agree and other stages are negligible, so delay is inside the pipeline invocation. User reports Mac UI sluggishness during Large. Contention/resource pressure is a hypothesis, not measured. No tuning or configuration changes are authorized by these results. No more repeated Large tests are required now. Next review/implement 2B output validation as a separate checkpoint; obtain Tiny self-test output/WER baselines before approving its provisional threshold. Performance profiling/tuning can remain optional separate work.

Checkpoint 2A observations: user reports MacBook Tiny/Large self-tests reload after cancellation and normal Tiny production transcription works on MacBook/iPhone. Earlier successful Tiny/Large MacBook and Tiny iPhone self-tests were reported. Explicit iPhone cancellation/retry still needs confirmation if not included. Large was reported at 90+ seconds inference after about 42 seconds load in self-test, and slow in normal Transcribe too. No root cause established; prior model/runtime/worker settings were unchanged in 2A. WER gate and durable test history remain unimplemented (2B and later).

Cleanup remains explicit: use a fresh production desktop worker for self-tests and retire duplicate whisper-test-worker.js during resolver/protocol integration (3B), not during this diagnostic checkpoint. Vite remains deferred/removed. Continue small changes and stop for user results.

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
