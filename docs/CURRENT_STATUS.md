# Memora — current status and resume instructions

Updated 9 November 2026. Read this first, inspect Git status/current source, then consult the linked plan. Archived plans and journals preserve history; this file gives the current sequence.

## Current sequence

1. **Runtime identification: complete for the agreed scope.** Shared OS/device classification, consistent reporting, production/self-test consumers and Search audio detection are implemented. Do not restart runtime migration.
2. **IndexedDB foundation: complete for the repair scope.** Canonical version-5 ownership and the missing-registry repair passed isolated tests and the user's Mac, iPhone and Windows checks.
3. **Vite/release asset conversion: deferred for Memora.** The isolated installation was discarded, and remaining untracked tooling was moved outside the repository. No Vite configuration/dependencies remain in the checkout; normal Live Server/main-root publishing continues. Design documents are reference only.
4. **Whisper configuration and testing: current priority.** 2A lifecycle safety and 2B WER ≤15% validation are implemented and accepted as recorded. 3A catalogue/resolver is implemented; 3B registry baseline and self-test option consumers now use catalogue definitions. Execution resolver integration is paused for durable interruption recovery. Automatic sequences remain deferred.
5. **Offline Tiny, sharing consolidation and iMuse integration: deferred.** Align their contracts with the above work before implementation.

## Immediate next action

Candidate **2026-11-09.10** completes saved-report presentation: readable outcomes/model labels and browser-local dates, expanded plain-language stage/result summary, Copy report with manual selection fallback, and separately collapsed/wrapped Technical report JSON. New stage snapshots use in-progress instead of provisional failed; a presentation copy normalizes legacy placeholders without rewriting history or changing terminal failures. Ten journal and eight Settings groups passed (including clipboard success/denial). User visual/copy acceptance on Mac/iPhone pending. No inference required for this UI check; use existing reports. Eligibility rules/storage remain the next separate checkpoint, followed by selector integration, resolver consolidation and automatic sequences. No commit/publication by agent.

Candidate **2026-11-09.9** is layout checkpoint 1: selector dimensions and adjacent Run button unchanged; conditional Cancel stays below. Current result precedes collapsed advanced settings and collapsed saved-history section at the bottom of the test area. One live stage line replaces the visible growing log; stage/environment and cleanup details are collapsed. Seven Settings and nine accuracy/UI groups passed in isolated Chrome. User visual acceptance on Mac/iPhone pending. No model, journal, eligibility or worker execution changes. Next separate UI checkpoint: readable saved-report summaries, local dates and Copy report; eligibility work remains authorized future scope after layout acceptance.

Candidate **2026-11-09.8** adds “Clear saved test history” above saved attempts. Explicit clearing removes terminal records (including previous successes and recovered interruptions), preserves running/locked records and unrelated storage, then refreshes the panel. Nine journal and seven Settings groups passed in isolated Chrome. User verification pending; no model inference needed for this follow-up.

User acceptance for .7: Mac Tiny cancellation persisted; page refresh during Small load and inference recovered the correct stages. A prior Small passed result remained visible. iPhone Base interruption retained inference-stage WASM/q8 diagnostics. The supplied iPhone record proves recovery, not the cause of interruption. No further Medium stress test requested. Raw observation.status currently retains the runner's provisional “failed” placeholder; authoritative outcome is top-level status and terminal result when present. Improve snapshot vocabulary separately to avoid confusing provisional state with an established failure.

Candidate **2026-11-09.7** implements local durable self-test attempts and interruption recovery. Each run saves started/configuration/build/environment/protocol/effective limits before model work and checkpoints stages plus available diagnostics. Terminal results preserve pass/failure/cancellation/timeout separately; a terminal persistence failure warns without changing inference outcome. Startup and Settings recover abandoned records as interrupted, last stage visible, cause unknown; Web Locks avoid claiming another live tab's run. No automatic retry/resume. Storage/ownership unavailable blocks new tests before work. Eight recovery, six Settings and 22 lifecycle groups passed in isolated Chrome, including real navigation and active-owner protection. Tiny smoke/cancel/reload acceptance on Mac and iPhone remains pending; do not repeat Medium to force a crash.

Journal keys are `memora.whisper-attempt.v1.*` in localStorage, separate from IndexedDB/model caches; no schema upgrade. Retention keeps roughly 20 recent attempts plus the last success per configuration and any unfinished/live records. Browser data clearing/eviction can remove evidence; synchronous saved checkpoints are not a guarantee against OS/disk loss. This is self-test evidence, not production-transcription recovery or automated eligibility. Actual desktop test-worker path is recorded separately from the declared future production-worker definition.

Build **2026-11-09.6** option-source migration is user-accepted on iPhone; user also supplied Mac Medium q4 pass (66.7s inference, WER 0%), q4f16 accuracy failure (91.49%), and mixed fp16/q4 inference RuntimeError. iPhone Medium appeared to reload the app, losing the old in-memory result; cause unconfirmed. This prompted bringing recovery ahead of further 3B migration. Those earlier events cannot be recovered retroactively.

Build **2026-11-09.5** Cancel layout is user-accepted. First 3B baseline migration in **2026-11-09.4** passed the user's MacBook and iPhone registry/option checks.

User excludes Medium from routine testing because earlier runs severely taxed resources and offered little practical benefit over Small. Keep that as a testing constraint; revisit model eligibility/selector policy separately. Current source still offers Medium self-test choices; this checkpoint does not change them or request Medium/Large inference.

First **3B migration** implemented locally, candidate build **2026-11-09.4**: modelManager now projects its legacy built-in registry records from whisperConfigurations.js. All 13 IDs/fields/defaults are preserved; no fingerprint/schema fields are injected into saved records. Family MODEL_CATALOG, self-test ID lists, worker scripts and production/self-test resolver execution are unchanged. This is partial consolidation, not the completed single-source migration.

Checks passed in isolated Chrome: 13 catalogue/resolver groups (including complete parity against an independent pre-change snapshot), seven production-module/database integration groups (including retained saved validation/custom evidence), and nine accuracy/UI groups. No actual models ran. New baseline adapter and returned records use independent dtype clones; canonical definitions stay immutable.

Acceptance of the baseline migration is complete: user reported unchanged registry/selector behavior on MacBook and iPhone. No Rebuild Registry/reset or larger-model inference was needed.

After durable-recovery acceptance, separately review the legacy family-catalogue adapter, then route actual tests/production through the resolver with exact configuration parity. Android/unknown restriction and iOS Medium identity correction must remain explicit before execution migration; do not silently change unsupported-platform behavior while moving a list. Duplicate desktop test worker retirement remains after protocol parity in 3B. No commit/publication by the agent.

## Prior accepted checkpoints and context

Checkpoint 2B is accepted by user testing on MacBook and iPhone in build **2026-11-09.3**. Mac Tiny self-test: load 3.3s, inference/worker 6.3s, WER 6.38%, WebGPU/fp32 for both sessions. iPhone Tiny: load 2.8s, inference/worker 4.2s, WER 0.00%, WASM/q8 for both sessions. Both passed the approved inclusive 15% gate. User also supplied successful Mac Base production transcription: load 5.4s, inference 8.0s/worker 7.9s, audio 16.7s, WebGPU/fp32 sessions. That is production smoke evidence, not a Base reference-accuracy validation. No additional model/device runs required for 2B. Natural break reached before registry resolver integration; commit/publish only on user instruction.

New whisperValidation.js centralizes the unchanged text normalization/WER calculation and versioned fixture gate (whisper-fixture-wer-v1). Exactly 15% passes without rounding the comparison. Empty/non-string/punctuation-only output, invalid/non-finite/negative score and above-limit WER fail; invalid reference fails before worker creation. A valid WER can exceed 100% due to insertions and correctly fails the threshold. Inference completion remains passed when output validation fails; the overall result fails at validation and Settings retains the transcript. Timeout/cancellation and cleanup remain separate. This is a short-fixture functional check, not general accuracy, model eligibility, backend profiling or persistent evidence.

Verification: nine controlled accuracy/UI groups, 22 lifecycle groups, five Settings groups and seven timing/worker diagnostics groups passed in isolated Chrome using synthetic data. No real model runs performed by the agent. Production loader, workers, model catalogue, fixtures and database remain unchanged in 2B. Next: commit this accepted checkpoint if desired, then design/migrate the canonical registry resolver in small increments; remove duplicate desktop test worker during 3B after protocol parity.

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
