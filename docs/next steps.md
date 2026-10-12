# Memora — Next Steps
**Planning date:** 12 October 2026

## Purpose

This document summarizes the issues discussed today and sets out a practical, prioritized plan for improving Memora's storage reliability, runtime diagnostics, Whisper self-testing, and model-management architecture.

The guiding principle is to fix the smallest, most informative problem first, then proceed in stages. Do not combine unrelated fixes into a broad refactor.

## 1. Summary of today's discussion

### 1.1 MacBook Settings and IndexedDB

On the MacBook, the first attempt to open Settings in both Chrome and Safari displayed:

- “Unable to read Memora storage information.”
- “Runtime information has not been loaded.”

The browser console reported:

`InvalidAccessError: Failed to execute 'transaction' on 'IDBDatabase': The storeNames parameter was empty.`

The relevant code paths identified during the discussion were:

- `storageManager.js` opens the `Memora` database without specifying a version, then tries to read its object stores.
- `storage.js` opens `Memora` at version 4 and defines the expected stores.

A likely explanation is that the storage-reporting path encountered a database with no object stores and tried to create a transaction against them. Opening IndexedDB without a version can create a new empty database when one does not exist. This is a strong hypothesis, but the initialization sequence should be verified before treating it as conclusively proven.

Runtime reporting should be independent of storage reporting. A storage error should not prevent unrelated runtime information from being displayed.

### 1.2 Preferred IndexedDB strategy: reset and rebuild when necessary

The user prefers resetting IndexedDB when genuinely necessary rather than maintaining a growing set of migration procedures.

Recovery options already available or understood:

| Data | Recovery approach |
|---|---|
| Cached transcripts | Existing mechanism can save cached transcripts |
| Semantic indexes and models | JSON-based approach can preserve existing information, generate missing indexes, and update the JSON |
| Cached Whisper models | Can be cached again |
| Runtime information and temporary resources | Can be regenerated |
| Other derived indexes | Rebuild from source data where possible |

The preferred design is:

- One authoritative module opens and initializes IndexedDB.
- One defined schema describes the expected stores.
- If the database is genuinely incompatible or unusable, Memora can reset and rebuild it instead of maintaining a complicated migration chain.
- Do not reset databases routinely on every launch.
- Do not reset existing databases as part of the initial MacBook repair.
- Ensure recovery does not depend on opening the Settings page successfully.

IndexedDB still has a browser-managed version mechanism, but the application can avoid complex migration logic. Before relying on a reset, confirm that the relevant source data is independently recoverable.

### 1.3 Large Whisper transcription on the MacBook

The user completed a transcription with the Large model on the MacBook for the first time. The Memora status log showed only:

> Loading large in the desktop Whisper worker…

It did not show the WebGPU confirmation seen on the PC, or the WASM indication seen on the iPhone.

The previously supplied `whisper-desktop-worker.js` explicitly requests WebGPU. However, the missing confirmation does not by itself prove that WASM was used, nor does a WebGPU availability check prove that the transcription actually ran on WebGPU.

Three separate things need to be checked:

1. Runtime capabilities reported by Settings.
2. Backend requested and successfully initialized by the desktop worker.
3. Status messages sent by the worker and received/displayed by Memora.

The current priority is to diagnose the missing confirmation before changing Whisper execution code.

### 1.4 iPhone sequential Whisper self-test problem

The iPhone has not reliably completed the full sequential model-test suite:

- Tiny and Base ran in sequence.
- Safari crashed when Small was reached.
- After Safari was reopened, Small ran successfully on its own.
- Desktop sequential testing worked.
- The self-test was changed to let the user test one configuration at a time.

Possible contributing factors discussed include resource pressure, retained audio buffers, model resources, worker lifecycle, and order-dependent failures. These are hypotheses, not established causes. Terminating a worker does not prove that browser memory has been reclaimed.

The objective is not simply to restore the old loop. The objective is a resource-aware sequential test process that either completes or stops safely and records a useful diagnosis.

### 1.5 Model Registry work to follow

The longer-term objective is for the Model Registry to become the authoritative source for model configurations, validation results, and production model selection.

Earlier code review identified potential competing sources of truth:

- `modelManager.js` contains both `MODEL_CATALOG` and `MODEL_REGISTRY_BASELINE`.
- Self-test options use the baseline, while other production paths use catalog/registry-derived definitions.
- Self-test results are not yet consistently persisted as registry validation results.
- Repository/cache availability does not prove successful runtime loading or transcription.
- Production selection has special-case handling for Medium.

The registry work should follow the sequential testing reliability work, not precede it.

## 2. Prioritized plan

### Priority 1 — Repair Settings and database initialization

**Goal:** Make Settings reliable on the MacBook without disrupting the working PC and iPhone installations.

Tasks:

1. Inspect the current database initialization and opening paths in `storage.js`, `storageManager.js`, and `app.js`.
2. Verify the startup sequence and determine how an empty database can be opened or created.
3. Eliminate inconsistent database-opening behavior and handle a fresh or empty database safely.
4. Make Runtime reporting independent of storage reporting.
5. Ensure a storage-reporting failure does not prevent unrelated Settings sections from working.
6. Do not reset existing databases as part of the initial repair.

**Success criteria:**

- Settings opens on MacBook Chrome and Safari.
- Runtime information is displayed even if storage reporting fails.
- The PC and iPhone continue to work.
- Existing stored data is not deliberately erased during this initial repair.

### Priority 2 — Verify the MacBook's actual Whisper backend

**Goal:** Explain why the Large transcription's status log stopped at the initial loading message.

Tasks:

1. Read Runtime information in Settings after Priority 1 is complete.
2. Trace desktop-worker model loading, successful initialization, and transcription messages.
3. Verify which backend is requested and which backend actually executes the work.
4. Determine whether the missing confirmation is a logging issue, a message-handling issue, or an execution problem.
5. Make status messages clearly distinguish backend availability, requested backend, successful initialization, and successful transcription.

**Success criteria:**

- A successful transcription reports the model and backend clearly.
- The log does not imply that a backend was used merely because it was available.
- No unnecessary changes are made to Whisper execution before the discrepancy is understood.

### Priority 3 — Establish a reset-and-rebuild database policy

**Goal:** Simplify database maintenance and recovery.

Tasks:

1. Centralize database creation and initialization.
2. Define the expected object stores in one authoritative place.
3. Detect empty, incomplete, or incompatible database states.
4. Reset and rebuild when necessary instead of maintaining a complex migration chain.
5. Reuse the existing transcript-saving and semantic-JSON recovery mechanisms.
6. Regenerate caches and derived indexes when needed.
7. Keep recovery independent of Settings.
8. Do not reset on every launch.

**Success criteria:**

- All modules use one database initialization path.
- An unexpected database state is handled safely.
- Resetting is deliberate and recoverable, not an automatic routine action.
- Source data that must be preserved has a confirmed recovery path.

This policy can be developed after the immediate Settings repair; it does not need to become a broad rewrite.

### Priority 4 — Make sequential Whisper self-testing reliable on iPhone

**Goal:** Run a full model-test sequence without Safari crashing.

Tasks:

1. Instrument test phases: worker creation, model loading, transcription, cleanup, and termination.
2. Record whether failures occur during loading or inference.
3. Distinguish a model/configuration failure from likely runtime instability or an interrupted page.
4. Avoid automatically continuing after errors that may indicate resource exhaustion.
5. Investigate audio-buffer retention, message transfer/copying, model-resource lifetime, and worker cleanup.
6. Test different model orders and fresh sessions to identify order-dependent behavior.
7. Do not assume worker termination guarantees memory reclamation.

**Success criteria:**

- The full sequence completes, or stops safely with a useful diagnosis.
- Failures are classified as well as the available browser evidence allows.
- Safari is not repeatedly pushed into an unstable state by continuing blindly after a serious failure.
- The manual one-configuration-at-a-time test option remains available as a fallback until sequential testing is proven reliable.

### Priority 5 — Make the Model Registry authoritative

**Goal:** Use one consistent configuration and validation path for both testing and production.

Tasks:

1. Create one authoritative configuration resolver.
2. Make self-test options come from that resolver.
3. Persist self-test outcomes in the registry.
4. Ensure production selection uses the same configuration that was tested.
5. Distinguish repository/cache availability from successful runtime loading and transcription.
6. Eventually use device-specific test results to guide eligibility and recommendations.
7. Keep the user-facing selector simple: Tiny, Base, Small, Medium, or Large.

**Success criteria:**

- No competing sources of truth for model configurations.
- Validation results are retained and used consistently.
- Production selection cannot silently diverge from the configuration tested.

### Priority 6 — Resume search and deferred feature work

After the reliability and model foundations are stable, revisit:

- Hybrid search combining exact-phrase/lexical matching with semantic similarity.
- The deferred chronological and alphabetical sorting controls.
- Other model-management refinements that depend on the Registry.

These are worthwhile but should not distract from the immediate reliability problems.

## 3. Execution stages and checkpoints

| Stage | Work | Checkpoint |
|---|---|---|
| A — Restore visibility | Fix Settings/database initialization and verify MacBook runtime reporting | Can we reliably inspect what Memora is doing? |
| B — Establish runtime and test reliability | Verify Whisper backend reporting and investigate sequential iPhone testing | Can we trust the runtime diagnostics and test outcomes? |
| C — Simplify architecture | Establish reset/rebuild policy, then consolidate model configuration and validation in the Registry | Can Memora recover predictably and use tested configurations consistently? |

## 4. Working method

- Discuss the design and agree on the smallest change before implementation.
- Use the latest user-supplied version of each file that needs to change; ask for the current file if necessary.
- Make and test changes on the Windows PC where programming is easier, while also validating behavior on the MacBook and iPhone.
- Avoid combining unrelated fixes into one large change.
- Keep each change narrow and test it before proceeding.
- Do not reset the working PC or iPhone databases during the initial MacBook repair.
- Do not assume the MacBook used WASM solely because the WebGPU confirmation was missing.
- Do not restore automatic sequential testing on iPhone until a safety and failure-handling strategy is in place.
- Do not implement a broad Model Registry refactor before sequential testing is dependable.

## 5. Immediate next action

Start with **Priority 1: repair Settings and database initialization**.

The first task is to inspect the current `storage.js`, `storageManager.js`, and relevant startup path in `app.js` together, confirm why the empty-store transaction occurs, and agree on a minimal fix. Test that fix before moving on to the MacBook Whisper runtime discrepancy.

No code changes have been made as a result of the planning discussion.

## Guiding principle

**Rebuildable local state should be easy to discard and recreate. Database initialization should be centralized. Failures should be contained rather than allowed to spread. Reliability should come before architectural consolidation.**
