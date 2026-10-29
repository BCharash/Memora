# Memora — current status and resume instructions

Updated 29 October 2026. Read this first in a new session, then inspect current code and Git status. This file is the current handoff; older plans/audit checkpoints preserve historical context.

## Immediate next action

The user confirmed iPhone verification passed for the published database integration checkpoint `35d69cd`, following the requested checklist: WASM registry view, Tiny production transcription and standalone self-test, Search/embedding reuse after reload, and cached transcript export. This is user-reported acceptance, not agent-operated device testing.

**Stable stopping point:** Mac, iPhone, and Windows acceptance passed. No further implementation is pending within this database integration checkpoint. The user also confirmed Windows worked as expected against all recommended tests. No additional acceptance tests are requested for this checkpoint. Commit any outstanding documentation updates before the week-long break; do not commit/publish automatically.

When resuming, inspect Git status and this handoff, then choose one remaining runtime cleanup item with the user (Search audio predicate review or legacy reporting cleanup). Do not restart completed database work or repeat iPhone tests unless a new change or failure warrants it. The larger registry overhaul remains a separate next project.

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
| iPhone database integration | User confirmed verification passed for the published `35d69cd` checkpoint after the requested registry, Tiny transcription/self-test, Search persistence, and cached export checklist. |
| Windows database integration | User confirmed all recommended tests worked as expected. Exact Windows/browser versions were not supplied. |
| Android/iPad database integration | Not separately verified in this session. |

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

Suggested new-session prompt: “Read docs/CURRENT_STATUS.md and inspect Git status. Mac, iPhone, and Windows verification of 35d69cd passed; review remaining runtime cleanup with me; preserve the small-change/test checkpoints. Do not restart completed database work.”
