# Memora — Model Registry and Runtime Architecture: Next Steps

## Purpose

Overhaul Memora's model-management architecture so that it has:

- One authoritative Model Registry.
- One standardized environment determination shared by all modules.
- One canonical database-schema initialization and upgrade process.
- Clear, persistent diagnostics for Whisper self-tests, including failures.
- Consistent registry updates based on actual test evidence.

The missing `modelRegistry` store observed on the Mac is an important problem to investigate and resolve as part of this work. It should not be treated as an isolated symptom or fixed by deleting the database.

**Scope:** Focus on environment detection, database initialization, the Model Registry, and self-test reporting. Avoid unrelated refactoring.

**Working constraint:** This is an architecture and implementation plan, not authorization to change code immediately. Before modifying any file, obtain and use the user's current version of that file.

---

## 1. Establish a shared environment service

### Goal

Determine the app's environment once during startup and make the result available to any module that needs it. Individual modules must not independently guess whether they are running on mobile or desktop.

### Standardized terminology

Use a consistent vocabulary throughout the app. Proposed fields:

- `deviceClass`: `mobile` or `desktop`
- `operatingSystem`: `ios`, `android`, `windows`, `macos`, or `linux` (plus a defined fallback for unknown/other platforms)
- `runtime`: the actual selected execution backend, such as `webgpu` or `wasm`
- `runtimeStatus`: `available`, `unavailable`, or `unknown`
- `executionStatus`: whether the intended runtime actually loaded and ran successfully

These names are a proposed target schema; reconcile them with existing code before implementation.

### Requirements

1. Run environment detection once during app startup.
2. Expose a shared environment object/service to modules that need it.
3. Distinguish platform detection from runtime capability detection.
4. Distinguish runtime capability from the runtime actually used by Whisper.
5. Avoid assuming that every non-iOS device is desktop/WebGPU or that an OS guarantees a runtime is usable.
6. Represent uncertain detection explicitly rather than silently choosing an incorrect configuration.
7. Use the same environment terminology in Settings, the Model Registry, self-tests, and production model loading.

### Acceptance checks

- Windows PC, MacBook, and iPhone are identified consistently.
- Android is represented as mobile if/when used.
- All modules read the shared determination instead of implementing their own device checks.
- Reported runtime matches the runtime Whisper actually uses, not merely what the browser supports.

---

## 2. Create one canonical database-schema initializer

### Problem to resolve

The current code examined so far has multiple modules opening the same `Memora` IndexedDB database with their own `onupgradeneeded` handlers. In particular, `storage.js` and `semantic.js` have overlapping but different store-creation logic. This could explain how a version-4 database can exist without `modelRegistry`, but the exact historical creation sequence has not been proven.

### Requirements

1. Designate one authoritative owner for the IndexedDB schema and initialization/upgrade process.
2. Define the complete set of required object stores in one canonical place, including `modelRegistry`.
3. Prevent other modules from independently creating incomplete versions of the same database schema.
4. Provide a safe, deliberate upgrade path for existing databases.
5. Preserve existing data wherever possible, especially semantic index entries and cached Whisper model assets.
6. Separate schema repair from a registry rebuild and from a full database reset.
7. Do not delete or reset a database simply because a store is missing.
8. Ensure initialization errors are visible and diagnosable; Settings' storage report must not be the only mechanism that discovers problems.

### Investigation before implementation

- Trace every `indexedDB.open("Memora", ...)` call and every `onupgradeneeded` handler.
- Identify which code paths open the database first on startup and when Settings or self-tests are opened.
- Confirm why the Mac's version-4 database lacks `modelRegistry`.
- Check whether any other device or existing database has a similar schema discrepancy.

### Acceptance checks

- Every supported environment gets the same required schema.
- Existing records survive a schema upgrade.
- A missing registry store is repaired through a controlled upgrade, without deleting semantic entries or cached model assets.
- Reopening the app does not trigger unnecessary resets or repeated upgrades.
- An empty or incompatible database is handled safely and reported clearly.

---

## 3. Make the Model Registry authoritative

### Goal

The registry becomes the single source of truth for model configurations, recorded validation evidence, and current eligibility.

### Separate definitions from device-specific results

A model configuration definition should describe the configuration itself, including as applicable:

- Stable configuration ID
- Model family (Tiny, Base, Small, Medium, Large)
- Repository/model source
- Runtime/backend
- Dtype or quantization
- Configuration revision
- Supported capabilities

Device/environment-specific records should describe:

- Environment identity
- Configuration ID and revision tested
- Asset availability
- Load result
- Transcription result
- Sequence-test result
- Cleanup result
- Last test time
- Failure details
- Recent bounded test history

The exact schema should be reconciled with the current `modelManager.js`, self-test code, and storage functions before implementation.

### Keep these concepts separate

- **Availability:** Are the required assets accessible?
- **Validation:** Has this exact configuration been tested, and what happened?
- **Eligibility:** Is there sufficient current evidence to offer this configuration for use?

Do not equate cached files with a working model. Do not equate an individual successful test with success after other models have run.

Eligibility should be derived from the definition, environment, current availability, and recorded evidence using explicit rules—not maintained as an unrelated manual flag.

### Registry ownership rules

- One registry manager owns registry initialization, reads, writes, migrations, and rebuilds.
- Settings displays registry information and invokes approved operations; it should not create a separate source of truth.
- Self-tests report their outcomes through the registry manager.
- Production loading resolves configurations through the registry's configuration resolver.
- Built-in defaults can restore missing definitions, but must not silently erase valid test evidence.
- A deliberate registry rebuild is distinct from a database reset and must not delete cached Whisper models or semantic indexes.

### Acceptance checks

- There is one authoritative catalogue of configurations.
- Settings, self-tests, and production loading resolve the same configuration IDs and settings.
- Validation results persist across reloads.
- Rebuilding definitions does not accidentally erase unrelated data.
- A failed test updates the evidence; it is not silently lost.

---

## 4. Improve Whisper self-test progress and diagnostics

### Problem

On iPhone, the Medium self-test can take a long time and eventually fail. The current UI does not make it clear whether it is still loading or has started transcribing, and the failure information does not reliably reach the registry.

### Required observable stages

Each test should report stage changes with timestamps and elapsed time:

1. `preparing` — select configuration, prepare worker and test audio.
2. `loading` — load model and runtime resources.
3. `load-complete` — confirm successful model load.
4. `transcribing` — run inference on the test audio.
5. `checking-result` — compare output with expected text and calculate relevant metrics.
6. `cleaning-up` — release resources and record cleanup outcome.
7. `complete` or a classified failure/interruption.

Use consistent stage names across the worker, self-test coordinator, UI, and registry. Reconcile these proposed names with existing event names rather than introducing duplicates.

### Diagnostic information to retain

- Configuration ID and revision
- Shared environment identity
- Test/run ID
- Test order and preceding model, if any
- Stage transitions and timestamps
- Load duration and transcription duration, when available
- Success/failure/interruption/timeout classification
- Error name, message, and useful stack/details
- Cleanup outcome
- Final validation result

The UI should display the current stage and how long it has been there. A timeout or interruption must not be misreported as a confirmed incompatibility.

### Failure categories to distinguish

- Configuration or model-load failure
- Transcription/inference failure
- Sequence-dependent failure
- Timeout or interruption
- Result-check failure
- Cleanup failure

Do not assume that a slow test is stuck solely because it is slow. Any timeout policy should be explicit and based on the expected behavior of the target device/model.

### Acceptance checks

- On iPhone, the UI clearly distinguishes loading from transcribing.
- If Medium fails, the final report identifies the last confirmed stage and elapsed time.
- The user can inspect the error details after the test finishes.
- A worker failure or interrupted run leaves a recoverable record where feasible.
- Standalone and sequence tests can be distinguished.

---

## 5. Persist every self-test outcome in the Registry

### Required flow

1. Start a test with a unique run ID.
2. Record the resolved configuration and environment.
3. Persist stage progress and the final outcome through the registry manager.
4. Update the current validation summary from the recorded evidence.
5. Make the result available to Settings and subsequent configuration selection.

Successful, failed, timed-out, and interrupted tests should all be represented. Avoid a design where only successful tests update the registry.

If a worker or page terminates unexpectedly, preserve enough information to mark the run interrupted rather than leaving it indefinitely as “not tested” or “running,” where technically feasible.

### Preserve evidence and history

- Keep the latest result readily accessible.
- Retain a bounded history of recent attempts for diagnosis.
- Record the preceding model and test order for sequence failures.
- Do not erase a previous successful result merely because a later attempt timed out; retain both pieces of evidence and apply explicit eligibility rules.
- Treat cleanup failure separately from transcription failure.

### Acceptance checks

- Every completed test outcome updates the registry automatically.
- Failure details remain available after reloading Settings or the app.
- Registry state distinguishes an untested configuration from a failed, interrupted, or stale test.
- The latest result and prior evidence can be compared.
- The registry can explain whether a model was tested alone or after other models.

---

## 6. Implementation sequence

Proceed in small, reviewable steps:

1. **Audit the current code.** Trace database opens, schema creation, environment checks, configuration definitions, model loading, self-test events, and registry writes.
2. **Agree on the target design.** Finalize terminology, ownership boundaries, registry fields, event stages, and status/eligibility rules before coding.
3. **Implement shared environment detection.** Replace independent mobile/desktop guesses with the shared service.
4. **Consolidate schema ownership.** Add a safe upgrade path and verify the Mac's missing `modelRegistry` store is repaired without data loss.
5. **Consolidate registry access.** Ensure every consumer uses the same registry manager and configuration resolver.
6. **Improve self-test event reporting.** Add clear stages, timing, and failure classification.
7. **Persist outcomes and history.** Ensure success and failure results are recorded consistently.
8. **Integrate production loading and eligibility.** Use registry evidence without treating cached assets as proof of functionality.
9. **Test all three current devices.** Windows PC, MacBook, and iPhone; include Android in the platform design.
10. **Run standalone and sequential model tests.** Pay particular attention to iPhone Medium and failures after preceding models.

Do not combine this work with unrelated semantic-search changes, service-worker/offline implementation, or broad UI cleanup.

---

## 7. Cross-device verification checklist

### Environment
- [ ] Windows PC classified as desktop / Windows.
- [ ] MacBook classified as desktop / macOS.
- [ ] iPhone classified as mobile / iOS.
- [ ] Android represented correctly by the shared model, even if not available for testing.
- [ ] Runtime capability and actual Whisper runtime are reported separately.

### Database and registry
- [ ] One canonical schema definition exists.
- [ ] Mac's missing `modelRegistry` store is repaired safely.
- [ ] Existing semantic index entries and cached Whisper model files are preserved.
- [ ] Registry definitions and evidence persist across reloads.
- [ ] Rebuild and reset operations remain separate.

### Self-test
- [ ] UI distinguishes preparation, loading, transcription, result checking, and cleanup.
- [ ] Elapsed time and last confirmed stage are retained.
- [ ] Successes and failures update the registry.
- [ ] Interrupted/timed-out runs are distinguishable from confirmed failures.
- [ ] Test order and preceding model are recorded.
- [ ] iPhone Medium standalone and sequence behavior can be diagnosed.

### Production use
- [ ] Production loading resolves the same configuration definition as self-test.
- [ ] Eligibility is based on current, relevant evidence.
- [ ] A model is not considered validated merely because its files are cached.

---

## 8. Working practices and constraints

- Discuss and agree on architecture before making changes.
- Before editing a file, ask for and use its current version; the latest user-supplied file is authoritative.
- Implement and test substantial changes on the Windows PC when practical.
- Preserve existing data and avoid database resets unless a specific, justified recovery plan requires one.
- Keep changes focused and reviewable; do not mix in unrelated refactoring.
- This plan does not authorize immediate code changes.

## Definition of done

The overhaul is complete when Memora has one shared environment determination, one authoritative registry and schema owner, consistent configuration resolution, transparent self-test progress, and persistent evidence for successes and failures. The Windows PC, MacBook, and iPhone should each report the environment and actual runtime correctly, while existing semantic indexes and cached model assets remain intact.
