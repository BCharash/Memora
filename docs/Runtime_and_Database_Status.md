# Runtime and database foundation — completed

Closed for the agreed scopes as of 7 November 2026. Next work is release consistency, followed by Whisper configuration/testing. See [current handoff](CURRENT_STATUS.md).

## Runtime ownership

runtime.js computes immutable runtimeIdentity with separate OS, device type and device class. Shared isIOS/isMobile/isDesktop derive from it. Live capability queries report API presence, not permission, working adapters or successful inference. OS and tablet/phone identity remain separate; unknown signals stay explicit.

Production Whisper, self-test, Settings and Search audio use shared detection. getRuntimeInfo derives from shared identity and capabilities; outdated speculative Whisper fields are removed. Browser naming remains a reporting heuristic. domDiagnostics records the user agent without independently classifying devices.

Self-test reports environment, requested backend, WebGPU presence and unknown actual backend. Existing worker policy/model options are preserved. Explicitly identified iPads now use the existing iOS audio path. File access stays source/capability-driven; old local names such as isIPhoneSource do not constitute independent device detection.

User startup/Settings, Tiny production/self-test and desktop/iPhone audio checks passed. Separate Android/iPad hardware tests were not reported. Exact model/backend configuration and execution evidence belong to the next Whisper phase, not unfinished identity work.

## Database ownership and schema

database.js alone owns application opens/schema, fixed version 5. storage.js, semantic.js and storageManager.js obtain caller-owned connections and release them on success/failure. ModelManager retains registry seeding/merging; queries remain in feature/storage modules.

| Store | Inline key | Required indexes |
|---|---|---|
| transcripts | filename | None |
| semanticEntries | id | representationKey/sourceKey, non-unique and non-multiEntry |
| semanticMetadata | key | None |
| modelRegistry | id | None |

Upgrade adds missing required stores/indexes, validates existing definitions and preserves unknown stores/records. Incompatible structures abort rather than being dropped/recreated. Connections close on versionchange. Blocked requests report errors and abandoned requests do not later upgrade unnoticed. No automatic reset/downgrade is implemented. Registry rebuild is record replacement, not schema repair.

Settings displays registry loading/errors and runtime diagnostics before storage reporting. Bulk accounting remains a separate potential memory concern, not a proven cause of earlier intermittent Settings behavior.

## Evidence and boundaries

Integration checkpoint `35d69cd`: 12 isolated schema groups and six production-module/Settings groups passed using temporary databases and separate Chrome profile. User confirmed all recommended Mac, iPhone and Windows checks. Mac Chrome on a 2018 MacBook Pro showed version 4/three stores before repair and version 5/four stores afterward. No reset or full live record comparison; fixtures checked exact records and binary embeddings. This does not establish broader model/sequence validation.

imuse-recording-breadboard remains untouched. HTTP app caching and model Cache Storage are separate from IndexedDB. Rollback/forward fixes must retain compatible version-5 opens.

## Historical records

- [Original runtime plan](archive/Initial%20runtime.md)
- [Database audit/history](archive/IndexedDB_Audit_and_Repair_Design.md)
- [Database repair plan](archive/IndexedDB_Repair_and_Ownership_Plan.md)
- [Test reproduction](../tests/README.md)
