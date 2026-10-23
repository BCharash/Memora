# Memora — Model Registry and Self-Test Architecture Overhaul

**Planning document:** 17 October 2026  
**Purpose:** A detailed design and implementation plan to use when development resumes on the desktop.  
**Status:** Proposal for discussion and agreement — **not authorization to edit code yet**.


## Handoff summary — read this first when resuming

**Project goal:** Make Whisper model definitions, environment assessment, self-test evidence, eligibility, and production loading consistent and trustworthy across desktop and iPhone.

**Current status:** This is a design proposal. No implementation work is authorized by this document alone. Inspect the current repository and device builds before translating this plan into code; this document is not proof that the current code still behaves as described.

**First action:** Audit the latest user-supplied repository/build and produce an audit map plus baseline report. Trace the selected model from the UI through configuration resolution, worker execution, result validation, cleanup, and persisted evidence. Separately trace every IndexedDB open/upgrade path and inventory all stores.

**Important constraints:**
- Preserve working safeguards, especially one-configuration-at-a-time testing and the known Medium q4 handling, until replacements are verified.
- Do not repeatedly crash or destabilize Safari to obtain test data. Stop a sequence after serious resource or execution failures.
- Do not delete or reset IndexedDB to conceal a schema error. Establish recovery and data-preservation behavior first.
- Do not claim a model is supported, a backend was used, or resources were released unless the available evidence supports that claim.
- Keep search ranking/selectivity, hybrid lexical/semantic retrieval, service-worker/offline work, and unrelated UI cleanup out of this project.
- Use the newest files supplied for the active session. If a needed current file is absent, ask for it rather than silently relying on an older archive or remembered copy.

**Completion evidence:** A reviewed audit map, agreed decisions, passing regression/acceptance tests, and a handoff note identifying the code revision and what was actually tested on each device.

---

## 1. Executive summary

Memora needs to move from a registry that is becoming authoritative in some paths to a single, dependable model-management system that can explain what each Whisper implementation is, whether it is usable in a particular environment, what has actually been tested, and why a test succeeded or failed.

The target is not simply a list of Tiny, Base, Small, Medium, and Large models. A family name is insufficient to identify the implementation that Transformers.js and ONNX will load. The successful Medium q4 investigation demonstrated that the exact repository, runtime, platform, dtype/quantization, and configuration identity matter: production once resolved the generic name `medium` differently from the known-working `medium-webgpu-q4` registry configuration. Using the exact registry configuration fixed that discrepancy.

The redesign should deliver:

1. **One shared environment determination** used by Settings, registry resolution, workers, self-tests, and production loading.
2. **One canonical IndexedDB owner and schema definition**, including a safe way to detect and repair a missing `modelRegistry` store.
3. **One authoritative model-configuration catalogue and resolver**—no parallel `MODEL_CATALOG`, baseline, self-test list, and production special cases that can drift apart.
4. **A self-test that records evidence, not just a green/red result**: stages, timings, environment, exact configuration, order, predecessor, output checks, cleanup, and errors.
5. **A careful distinction between availability, validation, and eligibility** so cached files do not imply that a model works, and one failure does not erase useful prior evidence.
6. **A safe route to test sequences on iPhone**, without blindly continuing after possible memory/resource exhaustion.
7. **A production loader that consumes the same resolved configuration that the self-test validated.**

The work should remain incremental. First establish a trustworthy baseline for the existing self-test and its iPhone sequence/resource problem. Then agree the data model and ownership boundaries. Implement the architecture in small, testable stages. Do not combine this with semantic-search work, deferred sorting, service-worker/offline work, or general UI cleanup.

## 2. What the current evidence says — and what it does not say

This section consolidates the uploaded `Memora_Next_Steps_Model_Registry.md`, `next steps.md`, and relevant design-journal history. Observations are separated from hypotheses so that implementation does not accidentally encode an unproven explanation as fact.

### 2.1 Confirmed or recorded observations

- On the MacBook, Settings previously showed “Unable to read Memora storage information” and “Runtime information has not been loaded.” The console reported `InvalidAccessError: Failed to execute 'transaction' on 'IDBDatabase': The storeNames parameter was empty.`
- The code paths identified at the time included `storageManager.js`, which opened `Memora` without an explicit version before reading stores, and `storage.js`, which opened version 4 and created expected stores.
- The MacBook's database was observed to lack the `modelRegistry` store despite being at database version 4. The precise historical sequence that created that state has not yet been proven.
- Runtime reporting must not depend on storage reporting: a database error should not suppress otherwise useful runtime information.
- Desktop Whisper uses a dedicated worker and a Transformers.js 4.0.0 / WebGPU path. The desktop environment has a powerful NVIDIA GPU and WebGPU has been useful there.
- The iPhone/iPad path has used a separate Transformers.js 3.7.2 worker/WASM path. iPhone WebGPU availability has been observed, but that alone has not established a reliable WebGPU Whisper execution path.
- The MacBook's Large-model status log once stopped at “Loading large in the desktop Whisper worker…”. That missing confirmation did not prove that WASM was used; it could have been a logging/message problem or an execution problem.
- On iPhone, Tiny and Base have run sequentially; Safari then crashed when Small was reached. After Safari was reopened, Small succeeded alone. This suggests a possible order/resource/lifecycle issue, but does not prove the cause.
- Desktop sequential tests have worked. A disposable self-test worker per model has been used on desktop so that one model starts in a new worker rather than reusing the previous model's worker.
- Memora has already introduced a Whisper Model Registry and a registry-driven self-test. The registry has configuration IDs and separates desktop WebGPU implementations from iPhone/iPad WASM implementations.
- The registry baseline has represented Tiny, Base, Small, Medium variants, and Large-v3 on desktop, with separate mobile configurations. The exact current catalogue must be inspected before changing it.
- The Medium q4 problem was resolved by using the exact registered `medium-webgpu-q4` configuration in production instead of resolving a generic `medium` name through the older path.
- Earlier code review identified overlapping sources of truth: `MODEL_CATALOG` and `MODEL_REGISTRY_BASELINE`; self-test options and production resolution did not always use the same source; validation results were not consistently persisted; and production had a Medium-specific resolution exception.
- A cached model repository/assets is not proof that the exact model/runtime/configuration can load, transcribe, and clean up successfully.

### 2.2 Hypotheses to test, not assumptions to bake into code

- Multiple modules independently opening `Memora` with different `onupgradeneeded` handlers may have caused the missing-store condition. The call sequence must be traced.
- The iPhone crash may involve retained audio buffers, memory pressure, runtime/model allocations, message transfer/copying, workers, or browser cleanup. Worker termination does not guarantee immediate memory reclamation.
- The MacBook's missing WebGPU confirmation may be a missing worker event, a message-handling issue, or an actual model/runtime failure. Runtime capability alone cannot settle it.
- A slow test is not necessarily hung. Any timeout must be explicit, model/environment aware, and reported as timeout/interruption rather than confirmed incompatibility.

### 2.3 A sequencing constraint to preserve

The earlier prioritized plan explicitly put reliable, safe iPhone sequential testing ahead of the full registry-authority refactor. Preserve that intent: begin by auditing and instrumenting the current test path enough to understand the sequence failure, establish repeatable baselines, and ensure tests stop safely. Then complete the registry/schema consolidation that will make those results authoritative. Do not restore an unsafe automatic iPhone sequence merely to claim that the suite runs end-to-end.

## 3. Architectural principles

### 3.1 A configuration is an implementation, not just a model family

`Medium` is a family/display label. It is not a complete loading instruction. A configuration should identify the exact implementation that can be reproduced and tested, including the repository/model source, runtime/backend, platform/device class, dtype or quantization, relevant Transformers.js/runtime version constraints, and a stable configuration revision.

A configuration ID such as `medium-webgpu-q4` is meaningful because it selects the complete known implementation. Production must not silently discard that identity and fall back to the family label.

### 3.2 Separate definition, availability, validation, and eligibility

These are different questions and must not be represented by one overloaded status field.

- **Definition:** What exact implementation is this?
- **Availability:** Are the assets reachable or cached, and can the browser/runtime prerequisites be found?
- **Validation:** What happened when this exact configuration was tested in this environment?
- **Eligibility:** Given the definition, environment, availability, and current evidence, should Memora offer or recommend this configuration here?

For example, “assets cached” is an availability fact. It does not mean “model validated.” A successful standalone test does not automatically prove that a configuration is safe after three other models have run. A timed-out run is not the same as a model-load failure.

### 3.3 Preserve evidence; derive summaries

Store individual test attempts as evidence. Derive a concise current summary from that evidence using explicit rules. Do not make the current summary the only record, and do not overwrite the last successful run simply because a later attempt was interrupted.

### 3.4 One owner per responsibility

- Environment service: identifies the environment and runtime facts.
- Database module: owns opening, schema creation/upgrades, and database diagnostics.
- Registry manager: owns configuration definitions, normalization, evidence persistence, and summary/eligibility derivation.
- Configuration resolver: resolves a stable ID to a complete configuration and checks compatibility.
- Self-test coordinator: runs tests and emits stage events; it does not invent model definitions or write directly to IndexedDB.
- Worker adapter: executes the selected configuration and reports actual backend/load/inference facts.
- Settings UI: displays information and asks owners to perform operations; it is not another data store or business-logic implementation.
- Production transcription: resolves a registry configuration and executes it; it should not contain a parallel catalogue or model-specific exception.

### 3.5 Make uncertainty explicit

Unknown environment, unconfirmed runtime, missing stage completion, interrupted execution, and uncertain cleanup should remain explicit states. Do not silently map them to a reassuring default.

### 3.6 Data recovery must be deliberate

The earlier notes prefer a simple reset-and-rebuild path when the database is genuinely incompatible, rather than a growing chain of complex migrations. The newer registry plan correctly warns not to delete a database merely because `modelRegistry` is missing. These are compatible if applied in this order:

1. Diagnose the database and schema.
2. Use a controlled schema upgrade/repair when the database is otherwise usable.
3. Preserve source data and derived indexes where possible.
4. Offer reset-and-rebuild only for a defined incompatible/unrecoverable state, after verifying recovery paths and making the action deliberate.
5. Never reset routinely at startup, and never use reset as the first response to a missing store.

The architecture should avoid elaborate migrations, but still use IndexedDB's versioning mechanism correctly and have a safe path for the currently observed missing-store case.

## 4. Target module boundaries and data flow

The names below are conceptual until the current repository is audited. Do not create files solely to match these names if existing modules can own the responsibility cleanly.

```text
Application startup
    ├── Environment service ───────────────┐
    └── Database service / schema owner    │
                 │                         │
                 ▼                         ▼
           Registry manager ◄──── environment snapshot
                 │
        ┌────────┴───────────┐
        ▼                    ▼
Configuration resolver   Registry diagnostics / Settings
        │
        ├───────────────────────┐
        ▼                       ▼
Production transcription   Self-test coordinator
        │                       │
        ▼                       ▼
Whisper worker adapter    Disposable test worker/session
        │                       │
        └──── actual events/results ───────┘
                         │
                         ▼
               Registry evidence store
                         │
                         ▼
             Derived validation / eligibility
```

### Ownership rules

1. Every consumer uses the same environment object rather than checking user-agent strings independently.
2. Every database consumer obtains the database from the canonical database service; only that service calls `indexedDB.open("Memora", ...)`.
3. Only the registry manager reads/writes registry stores or normalizes registry records.
4. Both production and self-test resolve the same configuration ID through the same resolver.
5. Workers report what actually happened; the coordinator does not infer successful runtime use from a capability check.
6. Settings displays current state and diagnostic evidence but does not independently construct registry defaults or create stores.

## 5. Shared environment and runtime service

### 5.1 Suggested environment snapshot

Treat this as a proposed target, not a mandate to replace existing names before auditing them:

- `deviceClass`: `mobile`, `desktop`, or `unknown`.
- `operatingSystem`: `ios`, `android`, `windows`, `macos`, `linux`, `other`, or `unknown`.
- `browser` and, if useful, browser/version information.
- `runtimeCapabilities`: capability observations such as WebGPU availability, worker support, and relevant APIs.
- `requestedRuntime`: what the configuration/worker intends to use (`webgpu`, `wasm`, or another supported value).
- `actualRuntime`: the backend confirmed by successful initialization/execution, if the worker can establish it.
- `runtimeStatus`: `available`, `unavailable`, or `unknown` for the relevant capability/path.
- `executionStatus`: for example `not-started`, `initializing`, `initialized`, `executing`, `succeeded`, `failed`, or `unknown`.
- `environmentId` or stable fingerprint composed from non-identifying technical properties relevant to model behavior.
- `detectedAt` and an environment-schema version.

Do not collect unnecessary identifying information. The fingerprint should identify a useful testing environment, not a person.

### 5.2 Do not collapse capability into actual execution

For each test, preserve the distinction:

1. Browser says WebGPU is available.
2. Configuration requests WebGPU.
3. Worker initializes the intended runtime/model.
4. Inference runs successfully on that path.

A status message should not say “using WebGPU” at step 1 or 2. It should report capability, requested backend, initialization confirmation, and successful execution separately. If Transformers.js does not expose a reliable way to confirm the actual backend, record that limitation as `unknown` rather than claiming certainty.

### 5.3 Environment service acceptance criteria

- Windows PC is consistently `desktop/windows`.
- MacBook is consistently `desktop/macos`.
- iPhone is consistently `mobile/ios`.
- Android is supported in the schema even if not currently tested.
- Unknown or ambiguous detection remains explicit.
- Settings, resolver, self-test, and production loading use the same vocabulary and source.
- Runtime capability and actual successful execution are displayed separately.

## 6. Canonical IndexedDB schema and recovery

### 6.1 Audit before changing

Trace every `indexedDB.open("Memora", ...)`, every `onupgradeneeded`, and all code that creates transactions. Inspect at least the current versions of `storage.js`, `storageManager.js`, `semantic.js`, `app.js`, the registry module, and any self-test persistence code. Determine startup order and which page/module may open the database first.

The goal of the audit is to establish how a version-4 database could lack `modelRegistry`, not merely to patch the visible error.

### 6.2 Canonical schema owner

Create or designate one module as the sole owner of:

- database name and current schema version;
- complete list of required object stores;
- key paths and indexes;
- schema initialization/upgrades;
- detection/reporting of missing stores and indexes;
- database-open errors and recovery state.

Other modules should request a database connection from this owner. They should not open the same database with their own partial upgrade handlers.

### 6.3 Store inventory

Before implementation, produce a table of every current store, its owner, key path/indexes, purpose, whether it contains source or derived data, and its recovery method. Include `modelRegistry` and any stores used by semantic search, cached transcripts, model assets, or other app state. The actual inventory must come from the current code, not from memory or assumptions.

### 6.4 Missing-store handling

A missing `modelRegistry` store is a schema defect, not a reason by itself to erase the database. Use a controlled version upgrade that creates the missing store and any required indexes while preserving existing stores and records. If the database reports the expected version but has an incomplete schema, the initialization layer should detect and diagnose that discrepancy and apply a supported repair strategy rather than relying on Settings to discover it later.

### 6.5 Startup and failure isolation

- Environment/runtime information should load even when IndexedDB fails.
- Storage diagnostics should be able to report “database unavailable,” “schema incomplete,” or “initialization failed” without creating an invalid transaction with an empty `storeNames` list.
- Settings must not be the component responsible for initializing the database.
- Startup should expose initialization failure clearly and avoid letting unrelated app features fail silently.
- Reopening the app must not trigger unnecessary schema changes or resets.

### 6.6 Reset-and-rebuild policy

Support a deliberate reset/rebuild operation only after the audit documents what can be recovered. Separate these actions:

- schema repair/upgrade;
- rebuild registry definitions;
- recompute registry summaries from evidence;
- rebuild derived indexes;
- clear cached model assets;
- full database reset.

These must not be one ambiguous “reset” button. A registry rebuild must not clear semantic indexes or cached Whisper assets. A schema repair must not reset anything unrelated. A full reset should explain its effects and require an explicit user action.

### 6.7 Database acceptance tests

- Fresh installation creates all required stores and indexes.
- Existing database with valid data opens without losing records.
- Database missing `modelRegistry` is repaired without deleting semantic entries or cached assets.
- An initialization failure is visible even if Settings storage reporting fails.
- A missing/empty database does not cause an empty-store transaction exception.
- Reopening a healthy database does not rerun destructive initialization.
- Registry rebuild and full reset are demonstrably different operations.

## 7. One authoritative model registry

### 7.1 Remove parallel sources of truth

Audit the current `MODEL_CATALOG`, `MODEL_REGISTRY_BASELINE`, persisted registry, self-test list, production model resolver, and user-facing model selector. Decide which information belongs in the authoritative definition and which is only display metadata or runtime evidence.

The desired end state is:

- one canonical set of built-in configuration definitions;
- one normalization/merge mechanism for persisted definitions and built-ins;
- one configuration resolver;
- one validation-evidence store;
- one derived eligibility function;
- no hard-coded special-case configuration resolution in production.

Built-in definitions may be restored if missing, but restoring them must not erase valid test evidence. A persisted configuration that is no longer in the built-in set should not be silently deleted; mark it as retired/unsupported if that is the agreed policy, and preserve its historical test evidence.

### 7.2 Definition record: proposed fields

The exact shape must be reconciled with the existing registry schema before implementation. A conceptual definition may include:

- `configurationId`: stable unique ID, e.g. `medium-webgpu-q4`.
- `schemaVersion` and `configurationRevision`.
- `modelFamily`: Tiny, Base, Small, Medium, Large.
- `displayName` and optional short description.
- `repository`: exact model repository/source.
- `runtime`: `webgpu`, `wasm`, or another supported backend.
- `deviceClass` and `operatingSystem` constraints, if needed.
- `dtype` / quantization settings and any per-component overrides.
- `transformersVersion` or compatibility range when version materially affects the model representation.
- worker type/implementation identifier where desktop and mobile use distinct execution paths.
- expected capabilities and known limitations.
- default visibility / lifecycle (`active`, `deprecated`, `retired`).
- definition revision/hash so a changed configuration cannot inherit validation as if it were unchanged.

Do not add fields that the runtime cannot actually use or verify. Keep the record focused on properties that determine loading, execution, compatibility, or clear display.

### 7.3 Configuration identity and revision

A stable `configurationId` identifies the logical configuration. A revision or deterministic configuration fingerprint distinguishes materially different implementations under that ID. If repository, dtype, runtime, worker path, or relevant library version changes, the previous validation may no longer apply.

Validation should be keyed to the exact configuration revision and environment fingerprint. Otherwise a new configuration could accidentally inherit an old “passed” status.


### 7.3.1 Configuration fingerprint inputs and evidence freshness

Before implementation, classify fingerprint inputs as **execution-critical**, **environment-relevant**, or **descriptive only**. Review the exact model repository/revision, runtime/backend, dtype and per-component quantization overrides, Transformers.js/runtime version, worker implementation/protocol version, and loader options. The final list must come from the current code and runtime behavior, not this example list alone.

- An execution-critical change must produce a new configuration revision/fingerprint and must not inherit a previous pass as current evidence.
- An environment-relevant change may require revalidation according to a documented compatibility rule.
- A descriptive-only change (for example, a display label) should not invalidate execution evidence.
- Store fingerprint inputs or a diagnostic representation alongside the fingerprint so stale evidence can be explained.
- Define the canonicalization/hash method once. Equivalent configurations must fingerprint consistently; omitted defaults and explicit defaults should not create confusing identities unless they genuinely change execution.

The audit should determine whether the current code can reliably identify upstream model revisions. If it cannot, record the limitation; a repository name alone must not be presented as proof that model contents are immutable.

### 7.4 Keep family labels simple for the user

The user-facing selector should continue to show simple model-family labels such as Tiny, Base, Small, Medium, and Large. Internally, a family can map to one or more environment-specific implementations. If more than one configuration exists for a family, the resolver must choose among eligible configurations using explicit rules, not whichever entry happens to appear first.

The UI need not expose every repository/dtype detail in the ordinary transcription selector. Settings should expose enough technical detail to diagnose a particular implementation.

### 7.5 Resolver contract

Given a requested family or configuration ID plus the shared environment, the resolver should return either:

- a fully resolved, exact configuration with all loading parameters and its revision; or
- a structured reason that no compatible/eligible configuration is available.

It must not silently fall back to a generic model name, silently change dtype, or select a desktop-only configuration on iPhone. Any fallback should be explicit, deterministic, logged, and covered by tests.

Both self-test and production must use this resolver. For a self-test, the chosen configuration ID/revision should be frozen into the run record at test start so a registry update during the run cannot change what that run claims to have tested.


### 7.5.1 Controlled catalogue update protocol

If definitions are refreshed from an upstream catalogue or maintained manifest, treat an update as a reviewed data change—not automatic enablement. The update flow should:

1. Identify the catalogue source and version/revision.
2. Validate required metadata and reject malformed or incompatible entries.
3. Report additions, removals, and execution-relevant modifications before applying them.
4. Preserve retired definitions and historical evidence; mark evidence stale when identity changes require it.
5. Keep newly discovered configurations disabled/not eligible until compatibility and validation policy allow them.
6. Retain the last known valid catalogue if the network is unavailable or an update fails validation.
7. Record update time, source/revision, outcome, and rejected entries for diagnostics.

Runtime model loading must not depend on a live catalogue request. Keep a known-good local set of definitions; this does not imply the model assets themselves are cached.

## 8. Registry evidence and eligibility model

### 8.1 Keep definitions separate from attempts

Prefer separate logical records for configuration definitions and individual test runs, even if the existing storage design uses a different arrangement. The conceptual model is:

- **Definition record:** what this configuration is.
- **Test-run record:** one attempt to validate that exact configuration in one environment.
- **Derived summary:** latest attempt, last confirmed success, sequence stability, freshness, and eligibility explanation.

This makes it possible to retain several outcomes without bloating the configuration definition or losing history.

### 8.2 Proposed test-run record

A run record should capture, where available:

- unique `runId`;
- `configurationId` and exact configuration revision/fingerprint;
- environment snapshot/fingerprint;
- test type: standalone, sequence, production smoke test, or another explicitly named type;
- run start/end timestamps and total elapsed time;
- test audio identifier/version and expected-transcript fixture version;
- sequence position and preceding configuration, if applicable;
- stage events with timestamps and elapsed durations;
- requested runtime and confirmed runtime, if known;
- load duration and inference/transcription duration;
- result-check metrics and pass/fail reason;
- cleanup start/end and cleanup outcome;
- outcome classification;
- error name, message, relevant stack/details, and last confirmed stage;
- whether the result was fully recorded or the run ended unexpectedly;
- app/build and relevant runtime/library versions.

Avoid storing the full audio or full transcription in the registry unless necessary. Prefer stable fixture identifiers and compact result metrics; keep detailed error text bounded. The test fixture should remain in the repository as already intended.

### 8.3 Suggested outcome categories

Use categories that preserve the meaning of the evidence, for example:

- `passed` — load, inference, result check, and required cleanup completed successfully;
- `load-failed` — configuration/runtime/model initialization failed;
- `inference-failed` — model loaded but inference failed;
- `result-check-failed` — inference completed but output did not meet the agreed validation rule;
- `sequence-failed` — configuration fails in a sequence context, with stage and predecessor recorded;
- `cleanup-failed` — transcription/result check completed but cleanup failed;
- `timed-out` — an explicit timeout fired; this is not proof of model incompatibility;
- `interrupted` — page, worker, or run ended before a reliable final result;
- `cancelled` — user intentionally stopped the run;
- `inconclusive` — evidence was insufficient to classify confidently.

The implementation should reuse existing terminology if it already serves these distinctions; avoid creating two names for the same state.

### 8.4 Eligibility is derived, not manually toggled

Eligibility should be computed from:

1. configuration definition and active/retired status;
2. environment compatibility;
3. asset availability;
4. most relevant validation evidence;
5. evidence freshness and exact configuration revision;
6. standalone versus sequence-specific requirements;
7. known safety constraints, particularly on iPhone.

Do not implement a single hand-maintained `available: true` flag as the whole decision. The derived answer should include a reason, e.g. “not offered on iPhone: no current successful validation for this configuration,” or “standalone test passed; sequential stability not yet established.”

### 8.5 Do not overinterpret failures

- A failure before runtime initialization does not prove that the model is inherently unsupported.
- A browser crash may leave only an incomplete run record, not a normal exception.
- A timeout is not an inference failure unless the test actually failed during inference and the evidence supports that classification.
- A cleanup failure should not be conflated with a transcription failure.
- One sequence failure should not erase a prior standalone success.
- One standalone success does not prove sequence safety.


### 8.6 Separate functional validity, performance suitability, stability, and recommendation

A single `passed` result must not be treated as the complete answer to whether a model should be offered. Keep these questions distinct:

- **Functional validity:** Did this exact configuration load, transcribe, pass the fixture check, and complete the required observable cleanup steps?
- **Performance suitability:** Were load and inference times acceptable for the intended interaction on this environment, based on measured timings and an agreed policy?
- **Stability evidence:** Has it succeeded alone, and has it been shown to remain usable in relevant sequences or repeated sessions?
- **Production eligibility/recommendation:** Given compatibility, current evidence, availability, safety, and user choice, should the app offer or recommend it for ordinary use?

Do not invent universal time or memory thresholds before collecting baselines. A slow but functioning configuration may be valid yet unsuitable as a default; a fast standalone success may still lack sequence-safety evidence. Preserve measurements so eligibility policy can change without rewriting historical test results.

## 9. Self-test lifecycle and reporting

### 9.1 Standardized stages

Use one consistent stage vocabulary across the UI, coordinator, worker protocol, and registry. Suggested stages:

1. `preparing` — resolve configuration, fixture, and worker/session plan.
2. `loading` — initialize worker/runtime and load the model.
3. `load-complete` — worker confirms the intended model/runtime is initialized.
4. `transcribing` — run inference on the test fixture.
5. `checking-result` — normalize and compare output with expected text; calculate validation metrics.
6. `cleaning-up` — release worker/runtime/audio resources and record cleanup outcome.
7. `complete` — all required checks and cleanup passed.
8. terminal failure/interruption state — classified, with last confirmed stage and details.

These are proposed labels. Audit current worker messages and event names first, then normalize them instead of creating parallel event protocols.

### 9.2 Every stage event should be observable

For each transition, record:

- run ID;
- configuration ID/revision;
- stage and event timestamp;
- elapsed time since start and, if useful, time spent in the previous stage;
- message/details;
- worker/session identity where useful.

The UI should show the current stage and how long it has been there. For completed tests, show stage timings. If a test fails, show the last confirmed stage and elapsed time, not merely “failed.”

### 9.3 Worker protocol

The exact protocol should be designed after reviewing current worker files, but the intent is:

- coordinator sends a fully resolved configuration and run ID;
- worker reports preparation/load/runtime initialization events;
- worker reports actual load success or a structured error;
- worker reports inference start and completion;
- coordinator validates the result and persists it;
- cleanup is explicit and separately reported;
- worker crash/error/termination without a final message becomes interrupted or inconclusive, not silently “not tested.”

Use structured event types and stable fields rather than relying only on human-readable status strings. Human-readable messages can be generated from those structured events.

### 9.4 Timeout policy

Do not invent one global timeout for every device and model. Establish baseline timings from actual tests, then define explicit limits per environment/configuration or test stage where justified. The UI should distinguish a slow active test from a timed-out test. If a timeout occurs, stop safely, preserve evidence, and do not automatically continue to a potentially larger model when resource exhaustion is plausible.

### 9.5 Persist progress as well as final results

Persist at least a run-start record and the terminal outcome. Where practical, persist stage transitions as they occur so a page reload or crash does not lose all diagnostics. If write frequency or storage complexity makes persisting every event undesirable, store a bounded stage timeline in the run record and checkpoint it at meaningful stages.

If the page disappears while a run is marked active, the next startup should be able to identify a stale run and mark it `interrupted` after applying an explicit rule. Do not leave it “running” indefinitely. Do not pretend that the app can always know why Safari closed; record that the interruption cause is unknown.

## 10. Self-test fixtures and validation quality

### 10.1 Keep a known test audio and expected transcript

The repository has included test audio and expected transcription files. Audit the current fixture and ensure it is stable, short enough to run reliably, and appropriate for cross-device comparison. Give it a fixture ID/version so a changed audio file or expected transcript does not make historical results incomparable.

### 10.2 Define what “passed” means

A successful model load is not a successful self-test. The pass criterion should include:

1. model/runtime initialization completed;
2. inference completed without error;
3. output is non-empty and plausibly shaped;
4. output meets a documented comparison threshold against the expected transcript;
5. required cleanup completed or any cleanup exception is recorded separately.

Exact text equality can be too strict for speech recognition because punctuation, capitalization, and minor wording can vary. Conversely, merely getting non-empty text is too weak. Choose a deterministic normalization and comparison metric based on the fixture and intended use, document the threshold, and test the test itself. Preserve raw output or a bounded diagnostic excerpt if it helps explain a failed comparison, but do not put unnecessarily large transcripts into every registry record.

### 10.3 Separate test dimensions

Do not make one test answer every question. Distinguish at least:

- **configuration smoke test:** can this exact implementation load and transcribe the fixture in a fresh worker/session?
- **standalone validation:** does it meet the quality and cleanup criteria when run alone?
- **sequence stability test:** does it remain usable after other configurations have run in a defined sequence?
- **production-path verification:** does production resolve and execute the same configuration the test validated?

A small targeted diagnostic can test runtime initialization without claiming the model is fully validated. Label the evidence honestly.

## 11. iPhone sequential testing and resource safety

This is a high-priority investigation because Safari previously crashed after Tiny and Base when Small was reached, while Small worked after Safari was reopened.

### 11.1 Establish baselines before changing the architecture

On the current iPhone build, run and record:

- each currently supported model alone in a fresh page/session;
- Tiny → Base, then stop and inspect;
- Tiny → Base → Small only if the earlier steps complete safely;
- Small alone after a fresh reload;
- repeat tests after a fresh Safari session where practical;
- timing and last confirmed stage for every attempt.

Do not repeatedly crash Safari to gather data. Stop if a run appears to be causing instability. Keep the manual one-configuration-at-a-time option as the safe fallback.

### 11.2 Investigate resource lifetime systematically

Inspect, instrument, and test one category at a time:

- whether the audio fixture is copied or transferred between main thread and worker;
- whether decoded audio arrays/buffers remain referenced after a test;
- whether the coordinator retains worker objects or message payloads;
- whether Transformers.js pipeline/session objects are released;
- whether a worker is terminated and references cleared;
- whether object URLs, AudioBuffers, tensors, and other resources have explicit cleanup paths;
- whether the next test starts before the previous worker has actually terminated;
- whether memory pressure correlates with model size or order.

Do not assume that calling `worker.terminate()` guarantees immediate OS/browser memory reclamation. The test should record cleanup actions and observable completion, while recognizing that the browser may not expose actual memory release.

### 11.3 Sequence policy

Sequence tests should be ordered deliberately, with larger models last where that reduces risk. After a serious allocation error, worker crash, page instability, or likely memory exhaustion, stop the sequence by default instead of automatically continuing. Record the stopping reason and next configuration not attempted.

A test that is not run because the sequence safely stopped is `not-run-after-prior-failure`, not a model failure.

### 11.4 Sequence evidence

Every sequence attempt must record:

- sequence/run ID;
- order/index;
- current configuration;
- previous configuration;
- whether each configuration used a fresh worker/session;
- outcome and stage;
- elapsed time;
- whether the sequence continued or stopped and why.

This enables a useful comparison between standalone and sequence behavior without claiming a definitive root cause prematurely.


### 11.5 Resource measurements and claims

Record resource information with an explicit evidence class:

- **Measured:** directly exposed by a reliable API or captured by an instrumented test.
- **Estimated:** calculated from known inputs using a documented method.
- **Inferred:** a possible explanation supported by observations but not directly measured.
- **Unavailable/unknown:** the browser or runtime does not expose enough information.

A browser crash after several model loads may support a resource-pressure hypothesis, but it does not measure memory use or prove that memory was not released. Worker termination is an attempted cleanup action, not confirmation that GPU/OS allocations have been reclaimed.

Before adding a “clear resources” control, document what it can actually release (such as references, workers, object URLs, or app-owned buffers), the action taken, observable confirmation, and what remains outside the app's control. Do not promise to clear all memory or GPU resources.

## 12. Production transcription must use the same configuration

The Medium q4 incident is the key regression test for this architecture.

### Required behavior

1. The model selector expresses a family-level request (e.g. Medium) or an explicit configuration selection where appropriate.
2. The configuration resolver selects an exact compatible/eligible registry configuration for the shared environment.
3. The resolved configuration object is passed to the worker without reconstructing it from the display label.
4. The worker loads the exact repository/runtime/dtype settings defined by that configuration.
5. The run logs the configuration ID/revision and requested/confirmed runtime.
6. Production success/failure may contribute validation evidence only if explicitly classified as a validation/smoke-test event; ordinary transcription should not silently rewrite the formal self-test status.

Remove the Medium-specific workaround only when the generic resolver has demonstrably replaced its purpose and the Medium q4 regression test passes. Do not remove a working safeguard prematurely.

### Regression cases

- `medium-webgpu-q4` resolves to the exact intended repository and q4 configuration.
- Production and self-test resolve the same definition and revision.
- A family label never silently maps to an unquantized decoder when the registry configuration specifies q4.
- An iPhone environment does not receive a desktop-only WebGPU configuration merely because WebGPU capability is reported.
- A configuration-definition change invalidates or ages out evidence from a previous revision.

## 13. Settings and diagnostics

Settings should become a clear diagnostic view of the shared state, not the place where architecture decisions are independently made.

### 13.1 Runtime panel

Show, as available:

- device class and OS;
- browser/runtime capabilities;
- requested backend for the selected configuration;
- backend initialization result and confirmed execution backend, if knowable;
- runtime/version information;
- whether a fact is confirmed, unavailable, or unknown.

Do not hide runtime information because the storage panel failed.

### 13.2 Registry panel

For each configuration, show a concise view of:

- family/display name and configuration ID;
- repository and important dtype/quantization/runtime details;
- environment compatibility;
- asset availability;
- latest test outcome and time;
- last successful validation;
- standalone/sequence status;
- eligibility and a human-readable reason;
- expandable recent attempt history and diagnostic details.

The UI should distinguish “not tested,” “passed,” “failed,” “timed out,” “interrupted,” “stale evidence,” and “not eligible here.” Avoid using one ambiguous red/green status to represent all of these.

### 13.3 Self-test controls

Retain a way to test one configuration at a time. Offer sequential testing only where the current environment's policy allows it. Provide a way to inspect detailed errors after completion. A manual resource-clear/release action may be useful, but implement it only after defining exactly what it can release and what it cannot guarantee; do not label it “clear all memory” if the browser does not expose that capability.

## 14. Implementation plan and checkpoints

The stages below are intentionally small. Do not implement the entire design in one pass.

### Stage 0 — Repository audit and baseline capture

**Goal:** Understand the current implementation before editing.

Inspect the latest versions of relevant files, including as applicable:

- `app.js` and startup logic;
- `storage.js`, `storageManager.js`, `semantic.js`, and every database open/upgrade call;
- registry module and current schema/normalization code;
- `modelManager.js`, `MODEL_CATALOG`, and `MODEL_REGISTRY_BASELINE`;
- `whisper.js`, desktop worker, mobile/WASM worker, worker adapters;
- self-test coordinator, test UI, and registry persistence;
- test audio and expected transcript fixtures;
- Settings runtime/storage/registry reporting.

Deliverables before code changes:

- dependency/ownership map;
- all `indexedDB.open` and `onupgradeneeded` locations;
- list of current registry sources of truth;
- current worker event protocol;
- current self-test sequence and result flow;
- current IndexedDB store inventory;
- baseline test table for Windows, MacBook, and iPhone using the available current builds.

**Checkpoint:** Can we explain the path from a selected model family to the exact worker configuration and the persisted test result?

### Stage 1 — Make current self-tests safe and observable

**Goal:** Diagnose sequence problems before a broad refactor.

- Add or normalize stage timing/events using the existing architecture.
- Ensure a worker error, timeout, or interruption produces a visible terminal state.
- Ensure serious iPhone failures stop a sequence rather than continuing blindly.
- Preserve the one-at-a-time test option.
- Record standalone versus sequence test type and predecessor/order.
- Establish repeatable fresh-session baselines.

This stage should be deliberately narrow: improve observability and safety without simultaneously replacing the registry schema.

**Checkpoint:** An iPhone Small failure can be described as “failed at stage X after Y seconds following configuration Z,” or as an interruption with the last confirmed stage, rather than only a crash or generic failure.

### Stage 2 — Agree the target data model and ownership

**Goal:** Resolve design questions before code changes multiply.

Agree on:

- environment snapshot fields and terminology;
- database owner and store inventory;
- definition versus test-run record;
- configuration identity/revision policy;
- event/stage names;
- outcome categories;
- eligibility rules;
- bounded history policy;
- reset/rebuild behavior;
- the exact meaning of “passed.”

**Checkpoint:** Each piece of information has one owner, one canonical representation, and a known consumer.

### Stage 3 — Centralize database initialization

**Goal:** Fix schema ownership and the missing-store class of problem.

- Route all database opens through one owner.
- Define the full schema centrally.
- Repair the Mac's missing `modelRegistry` store through a controlled upgrade/repair path.
- Isolate runtime reporting from storage reporting.
- Add startup diagnostics for schema/open failures.
- Preserve semantic data and model assets.
- Implement explicit reset/rebuild only after recovery paths are verified.

**Checkpoint:** Fresh, existing, and incomplete databases all reach a known state, with no accidental data loss.

### Stage 4 — Consolidate registry definitions and resolver

**Goal:** Remove competing definitions.

- Normalize the built-in configuration definitions.
- Merge/restore definitions without erasing evidence.
- Introduce one resolver for both test and production paths.
- Replace self-test options that independently reconstruct configurations.
- Remove production special cases only after the resolver covers them.
- Add configuration revision/fingerprint checks.

**Checkpoint:** Given the same environment and configuration request, self-test and production receive the same resolved definition.

### Stage 5 — Persist complete test evidence

**Goal:** Make the registry an honest record of testing.

- Persist a run at start and its stage timeline/terminal result.
- Save success, failure, timeout, cancellation, interruption, and cleanup outcome.
- Keep bounded recent history.
- Preserve last success when a later run is inconclusive.
- Recompute derived summaries/eligibility from evidence.
- Mark stale active runs as interrupted when appropriate.

**Checkpoint:** Reloading Memora does not erase a test failure or leave a crashed run indefinitely marked as running.

### Stage 6 — Integrate production and eligibility

**Goal:** Make runtime model choice consistent and safe.

- Production resolves configuration through the registry resolver.
- It passes the full configuration to the worker.
- Logs show configuration ID/revision and actual runtime evidence.
- Eligibility uses environment, availability, validation freshness, and sequence safety.
- The ordinary model selector remains simple.

**Checkpoint:** The Medium q4 regression case and all existing working configurations pass production-path verification.

### Stage 7 — Cross-device verification and controlled rollout

Test the Windows PC, MacBook, and iPhone. Include Android in the design and schema, but do not claim Android execution is verified without testing it.

- Fresh install and existing database.
- Missing `modelRegistry` store.
- Runtime reporting when storage fails.
- Standalone tests across currently supported configurations.
- Desktop sequence tests, larger models last.
- iPhone standalone tests and safe sequences.
- Production-versus-self-test configuration identity.
- Reload/persistence and interrupted-run recovery.
- Registry rebuild without deleting semantic indexes or cached model assets.

**Checkpoint:** No unsupported configuration is offered merely because assets are cached, and no failed/inconclusive test disappears from diagnostics.

## 15. Cross-device test matrix

| Test area | Windows PC | MacBook | iPhone | Android |
|---|---|---|---|---|
| Environment classification | Required | Required | Required | Schema/design requirement; execution when available |
| Runtime capability vs actual execution | Required | Required | Required | Required when tested |
| Fresh database schema | Required | Required | Required | Required when tested |
| Existing database preserved | Required | Required | Required | Required when tested |
| Missing `modelRegistry` repair | At least one controlled test | Specifically reproduce/verify | Verify compatibility | When available |
| Standalone Tiny/Base/Small | Required where configuration exists | Required where configuration exists | Required for offered configurations | When available |
| Medium variants | Test eligible desktop variants | Test eligible desktop variants | Do not offer unless a specific mobile configuration is validated | When available |
| Large-v3 | Test if configuration supported | Test if configuration supported | Do not offer unless a specific mobile configuration is validated | When available |
| Sequence behavior | Required | Required | Required, with stop-on-serious-failure | When available |
| Production uses same resolved config | Required | Required | Required | When available |
| Persistent failure/interruption record | Required | Required | Required | When available |
| Registry rebuild preserves unrelated data | Required | Required | Required | When available |

Do not force identical model availability across devices. The target is consistent architecture and honest reporting, not identical capabilities.


### 15.1 Failure-injection and regression acceptance checks

In addition to normal device testing, exercise controlled failure paths where feasible. Use mocked worker/database failures for deterministic cases rather than repeatedly crashing a real device; then perform only necessary real-device confirmation.

- Worker reports an initialization error; the run is terminally classified and persisted.
- Worker fails during inference after loading; this is not recorded as a load failure.
- Worker exits or the page reloads before a terminal event; the run is recovered as interrupted/inconclusive, not left active forever.
- A timeout fires; the UI and evidence distinguish timeout from confirmed incompatibility.
- Result validation fails despite successful inference; output-check failure is distinct from runtime failure.
- Cleanup reports failure or cannot be confirmed; that fact remains distinct from transcription success.
- A new configuration revision is introduced; old evidence is retained but no longer treated as current for that revision.
- Catalogue refresh is offline, malformed, or partially incompatible; the last known valid catalogue remains usable.
- Registry definitions are rebuilt while semantic indexes, transcript records, and model caches exist; unrelated data remains intact.
- Two consumers request initialization concurrently; schema ownership prevents competing partial upgrades or invalid transactions.

For every test, record expected and actual outcomes, evidence/artifact, device/build, and whether the test was simulated or performed on a real device.

## 16. Definition of done

The overhaul is complete when all of the following are true:

- One environment service provides consistent platform and runtime terminology.
- Runtime capability, requested backend, initialized backend, and successful execution are not conflated.
- One module owns all IndexedDB opens and schema initialization.
- The Mac's missing `modelRegistry` store can be repaired without a full database deletion.
- Registry definitions have one authoritative source and one resolver.
- Configuration IDs and revisions identify the exact implementation tested and loaded.
- Self-test and production use the same resolver and exact configuration.
- Every test attempt has a durable record of outcome, stage, timing, environment, order, and useful diagnostics.
- A failure or interruption is not silently lost, and a timeout is not mislabeled as confirmed incompatibility.
- Standalone success and sequence stability are distinct pieces of evidence.
- iPhone sequence tests stop safely after serious failures and retain a useful diagnostic record.
- Cached assets are never treated as proof of a working model.
- Registry rebuild, schema repair, derived-index rebuild, asset clearing, and full reset are separate operations.
- Windows PC, MacBook, and iPhone are tested; Android is represented but not described as verified unless actually tested.
- Unrelated semantic-search and UI changes have not been bundled into the refactor.

## 17. Working rules for the development session

1. **Do not start by editing.** First review this plan together and confirm priorities and trade-offs.
2. **Use current files only.** Before changing any file, ask for the user's current version of that file if it is not already supplied in the active development session. The latest user-supplied file is authoritative; do not silently use an older ZIP or an earlier conversation copy.
3. **Keep each change narrow.** Make a small change, run the appropriate checks, inspect the diff, and only then proceed.
4. **Test on desktop first when practical**, then verify the MacBook and iPhone. Desktop success is not proof of iPhone stability.
5. **Preserve working safeguards.** Do not remove the one-at-a-time test option or the known Medium q4 handling until their replacements are verified.
6. **No destructive repair by guesswork.** Do not reset IndexedDB to make an error disappear. Document what is preserved and how rebuild works before introducing a reset path.
7. **Report evidence honestly.** Distinguish tested, inferred, unknown, and not tested. Do not claim real-device testing unless it happened.
8. **Do not mix in deferred work.** Hybrid lexical/semantic search, sort controls, service-worker/offline behavior, and unrelated interface changes remain separate.

## 18. First session checklist

When development resumes on the desktop, the practical starting sequence should be:

1. Confirm the current repository/build and collect the latest relevant files.
2. Read this plan and agree the priority order.
3. Audit the current model-to-worker-to-registry path and database-opening paths.
4. Capture one clean standalone baseline per currently testable configuration, especially on iPhone, without repeatedly triggering unstable sequences.
5. Add only the missing observability/safety needed to diagnose the current sequence behavior.
6. Finalize the schema and registry design before making the authoritative refactor.
7. Implement the canonical database owner and resolver in small changes, with regression tests.
8. Persist test evidence and then connect eligibility/production selection to it.
9. Verify cross-device behavior and update the design journal with the actual implementation and test results.

The first tangible deliverable should be an **audit map and baseline report**, not a large code rewrite. That will reduce the chance of replacing a working component based on an incomplete understanding of the current system.

---

## 19. Decision log and conversation-to-conversation handoff

This document is intended to survive a pause or a new conversation. Update this section as decisions are made; do not silently turn a proposal into an agreed requirement.

### 19.1 Decision log

| Date | Topic | Decision and rationale | Alternatives deferred/rejected | Status |
|---|---|---|---|---|
| To be completed during design review | To be agreed | No new decisions are implied by this document revision | To be completed | Proposed |

Use `proposed`, `agreed`, `implemented`, or `verified` consistently. “Implemented” means code was changed; “verified” means the stated check was actually run and its result recorded. Code inspection alone is not verification.

### 19.2 Implementation status by stage

| Stage | Status | Code revision / files | Checks run and results | Remaining risks / next action |
|---|---|---|---|---|
| Stage 0 — audit and baseline | Not started for the resumed session | — | — | Obtain current repository/build and map current paths |
| Stage 1 — self-test safety/observability | Not started for the resumed session | — | — | Establish safe baseline before broader refactor |
| Stages 2–7 | Not started for the resumed session | — | — | Follow the checkpoints in Section 14 |

Replace these placeholders with evidence when work occurs. If implementation diverges from this plan, record why and whether the plan should be updated.

### 19.3 Handoff checklist for a new conversation

Before pausing or moving to a new conversation, record:
- current repository/build identity and commit or other stable revision identifier, if available;
- files changed and the purpose of each change;
- checks run, exact results, and checks not run;
- which results came from real devices versus simulations or code inspection;
- decisions agreed since the previous handoff and unresolved questions;
- known regressions, risks, and the next single recommended action;
- the latest version of this plan and any design-journal updates that must accompany code changes.

At the start of the next session, re-read this handoff and inspect the current files. The handoff is a navigation aid, not a substitute for current source code or fresh verification.

### 19.4 Acceptance evidence record

For each acceptance area, retain a compact record with test ID, date, device/OS/browser, app revision, configuration ID/revision, expected result, actual result, and evidence location. Never claim “tested on iPhone/Mac/Windows” without identifying which build and what was actually run.

---

## Appendix A — Questions to settle during the design review

These questions should be answered from current code and test evidence, not guessed in advance.

1. Which module currently owns the persisted registry schema and normalization?
2. Does the registry definition currently include all loader-relevant settings, including per-component dtype overrides?
3. Which fields materially change configuration identity and invalidate previous validation?
4. Which IndexedDB stores are source data, which are rebuildable derived data, and which are caches?
5. Can the schema owner detect an incomplete schema at the expected version and safely repair it?
6. Which worker messages already exist, and which are missing from the loading/transcription/cleanup lifecycle?
7. Can the worker reliably confirm the actual backend, or can it only confirm the requested backend and successful inference?
8. What output comparison metric and threshold are appropriate for the current test fixture?
9. Which stage-specific timeout limits are justified by measured device/model timings?
10. What evidence is sufficient to offer a configuration for ordinary use versus only to permit manual testing?
11. How long should detailed test history be retained, and what size limits should apply to errors/timelines?
12. What recovery paths exist for every persisted store before a full reset is allowed?

## Appendix B — Source and confidence notes

This plan is based primarily on the two supplied planning documents and the available Memora design-journal history through Sections 49–51, plus prior conversation context about model testing, the registry, and the Medium q4 discrepancy. It is a design proposal, not a claim that every described component currently exists in the exact form shown.

This revision adds a first-read handoff summary, explicit configuration-fingerprint rules, a controlled catalogue-update protocol, separate functional/performance/stability/eligibility dimensions, resource-evidence labels, failure-injection acceptance checks, and a decision/implementation handoff log. These additions strengthen the plan; they do not authorize code changes or assert that proposed mechanisms already exist.

- Facts about the observed Mac Settings error, missing `modelRegistry`, runtime ambiguity, and iPhone sequence failure are retained as observations from the supplied planning notes.
- Possible causes of the missing store and iPhone crash remain hypotheses until confirmed by code tracing or controlled tests.
- Field names and stage/outcome labels in this plan are proposed targets; reconcile them with current code before implementation.
- The Medium q4 fix is treated as a regression case and an architectural lesson: production must use the exact tested configuration, not a generic family name.
- The plan deliberately preserves the established rule to obtain current versions of files before modifying them.
