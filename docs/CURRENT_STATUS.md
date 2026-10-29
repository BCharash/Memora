# Memora — current status and resume instructions

Updated 29 October 2026. Read this first in a new session, then inspect current code and Git status. This file is the current handoff; older plans/audit checkpoints preserve historical context.

## Immediate next action

Await GitHub Pages publication of commit **`35d69cd` — migrated to central IndexedDB**, then collect the user's iPhone results. User is waiting for publication; the agent has not verified deployment or tested the phone. No further application code changes are needed before that test.

On iPhone, check:

1. Settings → Whisper Models → View: Model Registry appears and the current-device view shows WASM configurations.
2. Tiny production transcription and one standalone Tiny self-test succeed.
3. Search works; after reload and source reselection, saved embeddings are reused.
4. Cached transcript export/share works.

If an error appears, record its exact text and operation, stop dependent changes, and investigate narrowly. Do not repeatedly run larger models or unstable sequences. After tests, update this handoff with results and actual deployed revision. Windows verification waits until the Alienware is available.

## Completed work

- Renamed the original worker to `whisper-ios-worker.js`; updated production/self-test URLs. Renamed the Combine sharing module to `combineShareExport.js` and its initializer/references. User reported successful iPhone checks for both changes.
- Added immutable `runtimeIdentity`, separate OS/device type/device class, shared platform helpers, and live capability queries in `runtime.js`. Migrated production Whisper, self-test, and Settings classification. Existing worker routing and persisted configuration IDs were preserved.
- Corrected Settings descriptions to identify workers and requested backends rather than claim verified execution. Retained the legacy runtime accessor for browser naming.
- Audited IndexedDB and implemented `database.js` as the sole application schema/open owner, fixed version 5. Migrated storage.js, semantic.js and storageManager.js; added finally cleanup, abort handling and atomic rejection of malformed persistence batches.
- Upgrade creates missing required stores/indexes without resetting data, validates existing definitions, preserves unknown stores, handles blocked upgrades/late requests and closes on versionchange. Registry seeding remains with modelManager.
- Settings now exposes registry loading/errors and renders runtime diagnostics before storage reporting. Model selection, ranking, sharing workflows and model assets were not redesigned.

## Evidence and limits

| Evidence | Actual result |
|---|---|
| Representative runtime classification fixtures | 11 passed in JavaScript execution; simulated device signals, not hardware coverage. |
| `tests/database.html` | Initial 11 groups passed in isolated headless Chrome and user-run local Chrome. Expanded 12-group suite, including incompatible-index rollback, passed in isolated headless Chrome. |
| `tests/database-integration.html` | Six groups passed using production modules, an import-map test adapter, temporary database names and a separate Chrome profile. Includes binary embedding reuse, transaction rollback, registry display/error paths, and storage failure diagnostics. |
| Existing Mac database | User inspected Chrome on a 2018 MacBook Pro: version 4, three stores, missing modelRegistry before repair; version 5, four stores afterward. |
| Mac acceptance of integrated working build subsequently committed as `35d69cd` | User reported all requested checks passed: current-device WebGPU registry, Search/embedding reuse after reload, Tiny transcription and standalone Tiny self-test. No full content baseline comparison was performed. |
| iPhone database integration | Pending publication/test of `35d69cd`; earlier runtime Tiny transcription/self-test tests passed before this database integration. |
| Windows/Android/iPad database integration | Not verified in this session. |

Four canonical stores: `transcripts` (key filename), `semanticEntries` (key id; non-unique representationKey/sourceKey indexes), `semanticMetadata` (key key), and `modelRegistry` (key id). Existing Mac data was not reset. No evidence ties earlier intermittent Settings closure/favicon flashing to a crash; Live Server reloads were a possibility, not a confirmed cause.

## Constraints and future work

- One small, reviewable change at a time; give focused tests and pause for user results at natural break points. Do not commit/publish without instruction.
- Before a coordinated database edit under Live Server, close the app tab to avoid partial-code automatic upgrades. Current integration is already complete.
- Do not revert to application code with hardcoded version-4 opens after upgrading a database. Retain the version-5 owner in forward fixes; no database downgrade/reset is planned.
- User says existing IndexedDB contents are disposable if recovery is necessary. This does not require deletion; normal repair remains non-destructive. Whisper assets in Cache Storage are separate from Memora IndexedDB.
- **`imuse-recording-breadboard` is a separate database and remains untouched.** Future iMuse/audio integration needs inspection of both repositories and origins/database names. Do not rename/copy audio databases or add speculative audio stores now.
- Runtime completion: separately review Search audio's different iPhone/iPad predicate, reconcile stale legacy getRuntimeInfo fields, and consider honest self-test environment wording. Do not replace source/capability checks with device flags.
- Sharing consolidation/extraction is deferred. File_Workflow_Inventory.md is an overview, not an exhaustive dependency audit; audit relevant paths just before changes.
- The larger registry/self-test overhaul still needs its model-to-worker-to-evidence baseline/audit, resolver/catalogue consolidation, durable attempts and eligibility work. Database foundation is implemented, not the whole overhaul.

## Documentation map

- [Runtime status and remaining work](Initial%20runtime.md)
- [Database audit/design and checkpoint history](IndexedDB_Audit_and_Repair_Design.md)
- [Database repair plan](IndexedDB_Repair_and_Ownership_Plan.md)
- [Test instructions](../tests/README.md)
- [File workflow overview](File_Workflow_Inventory.md)
- [Larger registry/self-test plan](Memora_Model_Registry_and_Self_Test_Architecture_Plan.md)
- [Archive index](archive/README.md): paragraphing comparison, older mobile file proposal, and future iMuse migration. Five journals remain untouched; restructuring them is deferred. Search model optimization remains active because it contains governing requirements.

Suggested new-session prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. Resume from the pending iPhone verification of 35d69cd; preserve the small-change/test checkpoints. Do not restart completed database work.”
