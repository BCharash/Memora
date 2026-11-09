# Whisper configuration and standalone test design

3A update, 9 November 2026: unused catalogue/resolver and fingerprint foundation is implemented; 12 isolated browser groups passed. Existing application/modelManager/self-test loaders remain untouched. See [resolver contract](Whisper_Catalogue_Resolver_Contract.md). Next is a separately authorized 3B migration, including legacy shape adapters, configuration/worker parity and duplicate desktop worker retirement.

2B acceptance, 9 November 2026 (user-reported build 2026-11-09.3): Mac Tiny self-test passed WER 6.38%, load 3.3s, inference 6.3s, initialized WebGPU/fp32 sessions; iPhone Tiny passed WER 0.00%, load 2.8s, inference 4.2s, initialized WASM/q8 sessions. Both use the existing 15.5s fixture and satisfy WER ≤15%. Mac Base production smoke transcription also succeeded (load 5.4s, inference 8.0s, worker 7.9s, 16.7s audio, WebGPU/fp32); no Base accuracy inference is implied. This supersedes pending-device-acceptance notes below. Next phase is canonical definitions/resolver; duplicate desktop test-worker cleanup remains tracked for 3B.

Latest checkpoint, 9 November 2026: user approved WER ≤15%; 2B is implemented locally in candidate build 2026-11-09.3, with controlled checks passing and real Tiny device acceptance pending. This supersedes the earlier provisional 25% discussion. No configuration/resolver/evidence-store implementation is implied. See CURRENT_STATUS.md.

Acceptance update, 9 November 2026: user reports Tiny/Large self-tests passed on MacBook and Tiny on iPhone for checkpoint 2A. Cancellation/retry and ordinary transcription are not yet explicitly confirmed. Cleanup tracking: replace the duplicate desktop test worker with a disposable production-worker instance during 3B after configuration/protocol parity tests; keep it through the safety/accuracy checkpoints.

Implementation update, 9 November 2026: checkpoint 2A is implemented locally and controlled tests pass; user acceptance is pending. See CURRENT_STATUS.md for limits, coverage and device checklist. Its lifecycle was extracted into whisperTestLifecycle.js with injected dependencies for failure testing; per-page activity exclusion lives in whisperActivity.js. Larger-model deadline calibration, output validation (2B), resolver and durable attempts remain future work.

Step 1 review, 9 November 2026. Source baseline HEAD `3805951`, application build `2026-11-07.1`. Repository inspection only: no inference, model downloads, new device benchmarks, application edits or database changes. Runtime identification and canonical version-5 database ownership are completed prerequisites. Vite is deferred; its installation was discarded. This is the concrete next-phase design supplement to the [larger architecture proposal](Memora_Model_Registry_and_Self_Test_Architecture_Plan.md), not authorization to implement all stages.

## Current ownership and execution map

| Path | Current flow | Gap |
|---|---|---|
| Production family selection | transcription.transcribeRecording → whisper.loadTranscriber → getModelDefinition from MODEL_CATALOG, except Medium | Family catalogue competes with registry definitions. |
| Production Medium | Unconditionally chooses built-in medium-webgpu-q4 → loadTranscriberConfiguration → loadTranscriberDefinition | Shortcut occurs before iOS routing. Preserve known desktop fix until a compatible resolver replaces it. |
| Exact production configuration | loadTranscriberConfiguration passes label/repository/dtype into loader; worker/backend still selected using isIOS | Configuration's declared platform/runtime are not enforced. |
| Production desktop worker | Transformers.js 4.0.0, explicit device webgpu, optional dtype, task/language options forwarded | No shared configuration fingerprint; pending load/transcription slots are not a concurrent request queue. |
| Production iOS worker | Transformers.js 3.7.2, pipeline called with repository only; load emits ready; inference receives language and fixes task to transcribe | WASM is the intended labelled route, not explicit/confirmed backend evidence. dtype and task parity are not guaranteed. |
| Self-test selection | getWhisperSelfTestOptions → hardcoded platform ID list → getModelRegistryBaseline | Uses built-in records rather than persisted registry/resolver; an unmatched requested ID silently falls back to first option. |
| Self-test execution | Decode bundled M4A; iOS uses fresh production iOS worker, desktop uses separate whisper-test-worker | Separate desktop implementation can drift. One selected configuration runs alone; constants named SEQUENCE are option lists, not an active all-model sequence. |
| Test result | transcription reply → WER calculation → unconditional passed → worker.terminate → Settings display | Empty/inaccurate text can pass; no watchdog/cancel or durable attempt. Termination does not prove memory reclaimed. |
| Persisted registry | modelManager → storage registry APIs → canonical database owner | Registry schemaVersion 2 is a record format, distinct from database version 5. Existing validation fields/updater are not used by current self-test flow. |
| Availability | modelManager family API checks plus cached-file matching | Repository reachable or any cached file does not establish exact configuration availability, offline readiness or execution. |

All relevant local modules were inspected, including transcription, loader, three Whisper workers, self-test, Settings, modelManager and audioProcessor. Existing fixture files are present. No claim about current library behavior beyond the code's requested parameters is inferred from this inspection.

### Concrete discrepancies to retain as regression cases

- Tiny/Base/Small catalogue preferredDtype q8 is logged but desktop load uses definition.dtype, so it currently omits dtype; do not silently turn that preference into an enforced option. Their desktop baseline records also omit dtype intentionally.
- Medium on iOS can carry a desktop q4 ID while using the iOS worker, which ignores dtype. That is inconsistent identity, not evidence of q4 executing on iOS. Do not run Medium on iPhone merely to reproduce it.
- Large has a built-in iOS definition but is excluded from offered self-test options. A definition's existence is not test eligibility.
- Production desktop forwards requested transcription task/language; the iOS path currently forwards language but fixes task to transcribe. Translation parity is a separate decision/regression, not something an English transcription fixture can validate.
- Both tests and production use decodeAudio; its already-16-kHz branch reads channel zero. Do not bundle resampling/stereo changes into test safety work; record input provenance and test shared preprocessing separately if changed.
- Non-iOS routing remains WebGPU-intended regardless of operating system. Android/unknown environments are represented by runtime identity but are not verified implementations.

## Proposed single configuration contract

One definition catalogue and one resolver, owned by model management, should serve production and tests. Persisted records must not become another unreviewed definition source. Normalize legacy records under an explicit merge/version policy; preserve old validation evidence and mark it stale when execution identity changes. Keep existing configuration IDs initially.

The resolver accepts a family or exact ID plus the shared environment and purpose (production/manual test). It returns either a complete immutable resolved configuration with selection reason, or an explicit unsupported/not-found result. An explicit unknown/incompatible ID must never silently select Tiny. During rollout, a family request uses documented existing defaults; do not suddenly require fresh passes for every working model.

Required resolved fields:

- Stable configuration ID/family and definition revision/fingerprint.
- Repository and immutable upstream revision when actually known. Use explicit unknown/unpinned provenance when it is not; a fingerprint of a floating repository URL cannot freeze its weights.
- Exact Transformers.js version, worker implementation/protocol revision and requested backend policy. Distinguish explicit backend options from a legacy runtime default; do not claim the current iOS worker explicitly forces WASM.
- dtype: null meaning omit the option, explicit string, or per-component map; material loader/model-file options and platform restrictions.
- Test capability flags (standalone allowed, manual-only where relevant); catalogue membership alone does not authorize a resource-heavy test.

Hash a canonical, sorted representation of execution-critical fields. Keep descriptive label/updatedAt outside the hash. Preserve null/omitted semantics deliberately; do not collapse defaults across library versions. Retain diagnostic fingerprint inputs alongside the hash. Record inference recipe/task/language/chunk/stride separately in each attempt; changes to that recipe or fixture create a new validation protocol revision.

Freeze the resolved object for each run. Cache reuse in production must compare exact execution identity, not merely family. Both callers pass that definition through a common worker adapter; retain disposable workers for tests and production reuse for normal transcription. Prefer fresh instances of the production worker scripts once protocol parity is verified, rather than sharing an active production worker or retaining a duplicate desktop loader indefinitely.

## What PASS should mean

Separate four dimensions: load completion, inference completion, output correctness, and cleanup observation. A performance measurement is not a quality verdict. Proposed functional PASS requires:

1. Valid non-empty audio and non-empty reference fixture, with recorded hashes and decoded sample rate/length.
2. The expected worker load acknowledgement for the frozen configuration, then an inference reply for that run. Record requested options; actual backend stays unknown unless independently observable evidence supports it.
3. Non-empty normalized transcript, finite WER and the agreed fixture-specific WER gate satisfied.
4. No timeout, cancellation, worker/protocol failure or interruption before validation completes. Late/duplicate messages cannot reverse a terminal result.

Cleanup is a separate field. A passed transcription with uncertain cleanup is not sequence-safe or automatically recommended. Report “worker termination invoked” only if a worker existed and termination was actually invoked. Never equate elapsed terminate() call time with confirmed memory release.

### Approved output gate — WER ≤15%

Retain existing case/Unicode-apostrophe/punctuation normalization and word-level Levenshtein WER initially. Version that algorithm. Do not silently equate digit spellings with written-out numbers or remove arbitrary words to improve results. Preserve raw output and normalized reference/output for explanation.

The user approved **WER ≤15%** on 9 November 2026. Exactly 15% passes; compare the unrounded score. This replaces the earlier provisional 25% candidate. Capture Tiny device output/WER as acceptance evidence; do not relax the threshold automatically when a model fails. Number formatting in the Moon-landing reference can affect scores; inspect and deliberately version any later fixture/normalization correction. Empty or malformed outputs and invalid scores must never pass. Inference completion and output accuracy are separate outcomes, and an accuracy failure retains the transcript for review.

This short English fixture validates a smoke-test transcription, not general language accuracy, translation, long audio, model size suitability, offline readiness or sequence stability. No universal support badge should follow from one pass.

## Outcomes and lifecycle

Stages: preparing fixture → decoding → creating/loading worker → inference → output validation → cleanup → terminal result. Use monotonic elapsed timing and wall-clock start/end, recording last confirmed stage.

| Terminal outcome | Meaning |
|---|---|
| passed | Functional fixture gate satisfied; cleanup/stability remain separately described. |
| failed | Confirmed worker/runtime error, invalid input/output, protocol error or accuracy failure, with phase/reason. |
| timed-out | Explicit stage/deadline exceeded; not confirmed incompatibility. |
| cancelled | User stopped the run; not a model failure. |
| interrupted | A started attempt did not finish reliably (reload/crash/worker loss as appropriate). |
| unsupported | Resolver rejects the requested configuration/environment before execution. |

Unknown actual backend, unavailable resource telemetry and persistence failure are separate evidence fields. Never turn inability to save a result into a claim that inference failed; clearly show that evidence is not durable.

### Timeouts and cancellation

Every asynchronous stage needs an explicit bound, not one global model-support cutoff. Measure Tiny load/inference baselines, distinguish cold download from warm cache, then agree the limits. No current timings were gathered in this design review. For initial safety-harness implementation, inject short deadlines into mocks; do not treat those test deadlines as production values.

Practical proposal for the first Tiny-only device trial: configurable ceilings of 10 minutes for worker boot/download/load and 3 minutes for this short-fixture inference, plus finite fixture-fetch/decode guards. These are conservative safety ceilings for review, not measured performance expectations; they must be shown/recorded and can be revised before trials. Other models retain manual-only testing until justified stage limits are assigned; do not apply Tiny limits indiscriminately to Large/Medium.

Watchdogs use an absolute monotonic deadline, since background tabs can throttle callbacks. A timeout records the last stage, actual elapsed time, visibility and configured limit. Cancellation aborts owned fetches, settles exactly once, clears watchdogs/listeners and terminates only the disposable test worker. Decode cancellation may only abandon a late result, not physically stop a browser decoder. Handle worker error/messageerror and exceptions from worker construction/postMessage. An error before a worker exists must not report successful termination.

Keep one active self-test; starting a test must not compete silently with an active production transcription or retained production model. At first require production to be idle and explicitly release its app-owned worker before a heavy test, with honest limits on reclamation. No automatic multi-model sequences in this implementation stage.

## Durable evidence — later checkpoint

Each attempt should carry run ID, app build and known revision, shared environment/browser details, configuration ID/fingerprint/provenance, fixture/protocol identity, requested/observed backend evidence, stage times, terminal reason, output score and cleanup observation. Save “started” before work when persistence is introduced, then terminal result. Recover unfinished attempts as interrupted after reload; preserve the last successful attempt when later runs fail or are inconclusive.

A separate model-test-runs store is the preferred direction, requiring a deliberate future migration through database.js; do not overload definition records or open another database. Exact schema/history limits and cross-tab run ownership must be reviewed before that checkpoint. Legacy validation without run/config/environment provenance remains legacy evidence, never silently upgraded into a current pass.

Eligibility remains derived: compatibility, asset availability, validation freshness and stability are distinct. No automatic disabling of currently working selections while the evidence system is being bootstrapped.

## Incremental implementation and natural breaks

| Checkpoint | Scope and acceptance | Estimate |
|---|---|---|
| Step 1 (this document) | Audit/design complete; agree output gate, initial deadlines and supported trial scope before behavior changes | Completed design; no device execution |
| 2A | Single-run lifecycle, watchdog/cancel/error handling and visible outcomes; deterministic failure injection; Tiny only in real-device verification | 1–2 hours |
| 2B | Versioned output validator, non-empty/finite checks, agreed WER gate and clear Settings result; fixtures for correct/empty/wrong output | 1–2 hours |
| 3A | Canonical definition/resolver API, exact-ID rejection and configuration fingerprints, unused by production initially | 1–2 hours |
| 3B | Migrate test then production in separate reviewable changes; worker contract parity; Medium q4 regression and unchanged Tiny defaults | 2–3 hours |
| 4 | Review evidence schema; persist start/terminal/interruption and bounded history; display last attempt/last success | 3–5 hours |
| 5 | Cross-platform configuration parity, reload recovery, selected model trials; broaden only after safe Tiny baseline | 2–4 hours active testing |

All estimates exclude publication waits, downloads and unattended inference. Each checkpoint can stop safely; do not bundle all production/worker/schema edits together. Avoid iPhone publication after purely unused/mocked utilities; publish when a coherent changed device path needs acceptance. No larger-model automatic sequence is required to close standalone safety work.

For step 2, compare current known-working Tiny fixture outputs before activating the accuracy threshold. After timeout/cancellation changes, test normal Tiny completion and one controlled cancellation on desktop/iPhone; simulate stalls/errors instead of crashing Safari. For resolver integration compare ID/revision/repository/dtype/options at both worker boundaries; the desktop Medium q4 regression needs its own test, not an iPhone stress run.

## Release verification without Vite

Vite is optional/deferred, not a prerequisite. Continue source publication from main/root. Advance the human build ID for changed released application contents and verify it on the test device. Because the footer alone cannot detect mixed cached modules, retain exact configuration/protocol identifiers in diagnostic evidence and inspect/cache-troubleshoot inconsistencies before attributing them to models. Do not clear IndexedDB/model caches as routine deployment troubleshooting or add unplanned URL-versioning hacks in this phase.

## Decisions for the user

Recommended starting scope: **Tiny standalone safety first, existing workers/options preserved**, with the user-approved WER ≤15% fixture gate. Initial Tiny watchdog ceilings above require agreement before real trials. 2A and 2B were separately authorized and implemented; later stages still require their own checkpoints. No actual backend-confirmation claim, upstream model revision pin or durable history has been implemented here.


## User performance observations — build 2026-11-09.2, 9 November 2026

User-supplied diagnostic output; no new agent-run inference. MacBook is the previously identified 2018 MacBook Pro, Chrome; exact browser version, power/thermal state and competing workloads were not recorded. iPhone/browser version not supplied. These are observations, not controlled benchmarks or evidence that all graph operators ran on one backend.

| Device/path | Selection and initialized session settings | Audio | Load | Caller inference / worker inference | Other evidence |
|---|---|---:|---:|---:|---|
| Mac self-test | small-webgpu-default; onnx-community/whisper-small; model webgpu/fp32, decoder_model_merged webgpu/fp32 | 15.5s | 15.0s | 26.3s / 26.1s | WER 0.0%; passed; 41.4s total; termination invoked |
| Mac self-test | large-webgpu-fp16-q4; onnx-community/whisper-large-v3-ONNX; model webgpu/fp16, decoder_model_merged webgpu/q4 | Not supplied in latest Large excerpt | Not supplied | Not supplied | Initialized settings match production Large; no latest WER supplied |
| Mac production | small; same repository/default dtype request; model webgpu/fp32, decoder_model_merged webgpu/fp32 | 16.7s | 12.1s, new | 20.2s / 20.2s | Metadata 0.0s, decode 0.1s, paragraphing 0.0s |
| Mac production | large; requested encoder fp16/decoder q4; model webgpu/fp16, decoder_model_merged webgpu/q4 | 16.7s | 39.4s, new | 76.2s / 76.0s | Metadata 0.0s, decode 0.1s, paragraphing 0.0s; user reports window switching/typing sluggish |
| Mac production, English selected | Same Large settings | 16.7s | 0.0s, reused | 81.7s / 81.6s | Metadata 0.0s, decode 0.1s, paragraphing 0.0s |
| iPhone production | tiny; onnx-community/whisper-tiny; runtime-default backend (WASM intended), Transformers.js 3.7.2; model wasm/q8, decoder_model_merged wasm/q8 | 16.6s | 2.1s, new | 3.8s / 3.8s | Metadata/decode/paragraphing displayed 0.0s |

Desktop sessions use Transformers.js 4.0.0. Worker-level time closely matches caller inference time, localizing the reported delay to the pipeline invocation rather than messaging, metadata, audio decoding or paragraphing. Reusing Large did not eliminate the slow inference. Selecting English did not improve the supplied repeat, but these are not controlled comparisons and do not establish causality. Small test and production inputs have different reported durations, so do not compare their times as an exact same-input regression benchmark.

There is no evidence here of desktop WASM fallback: both session components report selected WebGPU settings. actual operator backend remains unknown without runtime profiling. System contention/shared GPU or memory pressure is a plausible hypothesis for sluggish UI, not measured/proven. Do not claim a watchdog regression, thermal fault, memory leak, or GPU-only execution from these data. Large may be unsuitable as the routine default on this device; do not alter model/quantization/eligibility automatically. Small currently selects fp32 when dtype is omitted; evaluating an explicit quantized variant is separate configuration/test work.

Diagnostics acceptance now includes normal Mac Small/Large and iPhone Tiny, plus Mac Small self-test. Further repeated Large runs are not required for this checkpoint. Next planned change is 2B output validation after reviewing Tiny fixture WER/reference outputs; retain the deferred desktop-test-worker consolidation in 3B. Large performance tuning/profiling is a separate optional investigation, not a prerequisite for implementing reliable quality verdicts.
