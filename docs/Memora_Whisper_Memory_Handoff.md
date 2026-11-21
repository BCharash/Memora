# Memora — Whisper self-test memory footprint: Codex handoff

Date: 2026-11-21

## Objective and scope

Add a useful **model memory footprint** column alongside Memora's existing Whisper self-test comparison of relative transcription speed and model load time. **iPhone is the priority** because of observed resource-pressure instability. Profile only during the **existing user-initiated self-test**; do not add monitoring or overhead to production transcription. The self-test audio is short: **do not claim to measure representative peak memory for long recordings**. Do not implement peak tracking as part of this task.

The requested result is a practical indication of each *exact Whisper configuration's* memory cost, especially iPhone WASM memory. Distinguish **model weight size**, **WASM linear-memory capacity**, **JS heap**, **GPU buffer allocations**, and **total resident RAM**. They are not interchangeable. Avoid labeling a model-file byte count or WASM capacity as measured physical RAM. Unknown should be shown as **Unavailable**, with an explanation and measurement provenance. If only an estimate is possible, label it **Estimated model weights**, not RAM footprint.

## Current source findings (uploaded files reviewed)

- `whisperConfigurations.js`: canonical model registry. Families: tiny (`onnx-community/whisper-tiny`), base (`onnx-community/whisper-base`), small (`onnx-community/whisper-small`), medium (`Xenova/whisper-medium`), large (`onnx-community/whisper-large-v3-ONNX`). Exact configuration ID, platform, repository, runtime-library version, requested dtype and worker script are present. Desktop variants: tiny/base/small WebGPU default; medium default (not currently self-test allowed), medium q4, q4f16, encoder fp16 + decoder q4; large encoder fp16 + decoder q4. iPhone uses default dtype and WASM-intended execution. iPhone Large is **not** self-test allowed by current policy. Preserve that policy.
- `whisper-ios-worker(1).js` (repository counterpart `js/whisper-ios-worker.js`): imports Transformers.js **3.7.2**, calls `pipeline('automatic-speech-recognition', message.repository)` with no explicit dtype/device; sends `ready` with `diagnostics` after load, then `transcription` after inference; disposable worker. Do not assume a particular actual quantization or memory layout without evidence.
- `whisper-desktop-worker(8).js` (repository counterpart `js/whisper-desktop-worker.js`): Transformers.js **4.0.0**, WebGPU pipeline with requested dtype, sends `loaded` with diagnostics, and disposes on request.
- `whisperDiagnostics.js`: `describeWhisperPipeline()` currently examines `pipeline.model.sessions` for session `config.device` and `config.dtype`, with explicit caveat that session settings are **not** a verified operator execution trace. Good place for read-only, exception-safe observations, but do not turn unsupported internals into a stable contract.
- `whisperTestLifecycle.js`: `createWhisperTestRunner` runs prepare → decode → release production resources → create disposable worker → load → short inference → validate → dispose/terminate. `workerStage()` expects iOS `ready`, desktop `loaded`, then `transcription`. The loaded reply is available as `loaded`, stored as `result.diagnostics`, and inference reply as `reply`. Results are emitted via `model-complete` and `run-complete`; cleanup is in `finally`. Preserve all deadlines, cancellation semantics, eligibility decisions, WER validation, failure classification, and worker cleanup.
- `whisperSelfTest(20261121-150532).js`: orchestrates self-tests, using the same production worker scripts and `whisperTestLifecycle.js`.
- `whisperAttemptReport.js`, `whisperAttempts.js`, `whisperExecutionReports.js`: existing reports and test history; inspect full current repository versions to locate the **actual comparison table** and persistence path before editing. The comparison table's source was not definitively located in this review.
- `whisperDisposal.js`: disposal acknowledgement means API completion, **not proof of physical memory reclamation**.

## First task: feasibility, before modifying behavior

1. Trace the exact existing self-test comparison table, storage schema, and rendering logic in the *current repository*. Confirm how speed/load metrics are collected and saved. Do not invent a parallel registry or history store.
2. Investigate whether **Transformers.js 3.7.2 / ONNX Runtime Web** provides a supported, read-only way to observe WASM linear-memory capacity after loading. `WebAssembly.Memory.buffer.byteLength` reports **linear-memory capacity, not resident RAM**; only use it if the relevant actual memory object can be reached safely. Avoid private-property traversal, monkey-patching WASM instantiation, patching ONNX Runtime, or expensive heap snapshots. If unsupported, report unavailable.
3. Investigate any browser memory APIs usable **inside an iOS module worker**. Do not assume `performance.memory` or `performance.measureUserAgentSpecificMemory()` exists or measures this worker; check capability and scope. Browser-reported totals may include unrelated allocations and are not per-model unless carefully attributable.
4. Investigate reliable, configuration-specific **model weight-byte estimates** from actual ONNX artifacts and external-data files. The browser cache/download size is not automatically the runtime memory footprint; compressed bytes, quantization, mixed dtypes, and duplicated temporary allocations matter. If the exact selected artifact(s) cannot be established, do not present fabricated precision or theoretical parameter count as an actual measurement.
5. Return a concise feasibility matrix: metric, iOS availability, desktop availability, meaning, precision, limitations, cost, and recommendation. **If the result is only model-file size, say so plainly.**

## Minimal implementation if feasible

- Capture an optional, best-effort **post-load** memory observation at the point where the self-test worker already sends `ready` (iOS) / `loaded` (desktop). Optionally capture a baseline immediately before model load **only if** the metric has consistent scope and the difference is meaningful. A worker cannot safely infer model-attributable delta from an unrelated page-wide reading.
- Send additive, structured metadata in existing worker messages (e.g., `memoryFootprint`), with `metric`, `bytes`, `unit`, `scope`, `method`, `certainty` (`measured`/`estimated`/`unavailable`), and explanatory note. Distinguish WASM capacity, model-weight bytes, and browser heap rather than summing incompatible metrics. Avoid huge payloads or storing internal session objects.
- In `whisperTestLifecycle.js`, retain this metadata in the **same self-test result** as load time and speed; ensure JSON serialization and existing report compatibility. Missing/old records should render cleanly as unavailable.
- Extend the **existing** comparison table with a column named according to what was actually obtained: `Model memory (estimated)`, `WASM allocation (observed)`, etc. Do not call it `RAM` unless that is genuinely measured. A short tooltip/footnote should explain the metric and why it does not predict safe maximum recording duration.
- Key values by exact configuration ID, browser/platform, runtime version and effective dtype where known. Do not merge distinct Medium quantizations.
- Keep all new instrumentation read-only, exception-safe, small, optional and **self-test-only**. Memory-observation failures must never fail a model self-test, alter qualification, trigger retries, or change production behavior.

## Explicit non-goals

- No periodic sampling or long-recording peak claims.
- No inferred 'safe for iPhone' threshold, memory-based model eligibility gate, or automatic model selection.
- No downloading models solely to calculate size, unless explicitly approved later.
- No changes to audio capture, transcription accuracy, model loading semantics, or resource cleanup.
- No claim that worker termination proves RAM was physically returned.

## Acceptance tests

1. iPhone self-test Tiny/Base/Small/Medium: existing test outcomes and WER unchanged; memory field shows a grounded number with accurate provenance or `Unavailable`. Large remains excluded under current self-test policy.
2. Desktop self-test: existing WebGPU behavior and quantization options unchanged; avoid equating model weights with VRAM.
3. Failed/aborted/timed-out load, unavailable memory APIs, and legacy saved tests: no crashes or false zero-memory values; cleanup and history preserved.
4. Existing relative speed and load time table continues to work. Compare reports before/after; do not break existing self-test persistence, eligibility or production evidence.
5. Verify a post-load reading is not confused with peak inference memory. State explicitly that a short self-test cannot establish long-transcription peak requirements.
6. Document what was **actually observed on device** versus inferred from source. Codex cannot claim iPhone runtime measurements without a device test.

## Delivery and working conventions

**Start by reporting feasibility and exact proposed files/changes; do not immediately perform an invasive implementation.** Ask for approval if actual RAM measurement requires internal runtime instrumentation. Use the latest repository versions as source of truth, not just these uploaded snapshot names. For any modified code delivered as files, package in a ZIP preserving each repository filename exactly, without appended suffixes or parentheses. Include concise verification results and any untestable browser/device assumptions.

## Core decision rule

A useful, honestly labeled **estimated model weight** column is better than a misleading 'RAM footprint' number. If no meaningful iPhone memory observation is exposed, implement only the defensible estimate (after confirmation) and clearly state that iPhone instability from resource pressure cannot be predicted from it alone.
