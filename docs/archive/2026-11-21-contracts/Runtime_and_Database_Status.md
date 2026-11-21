> **Archived 21 November 2026 - superseded contract/history.**
> Current references: [file workflows](../../Architecture_and_File_Workflows.md), [identity and storage](../../Recording_Identity_and_Storage.md), [future Combine contract](../../Multi_Archive_Combine_Contract.md). Original narrative is preserved below; only this notice and local navigation targets are adapted. Historical approvals, schema/JSON rules and next steps are not current implementation instructions.

# Runtime and database foundation — completed

## Current cleanup and playback fix — 21 November 2026

Build **2026-11-21.7**, schema **10**, removes legacy audio JSON code, optional recovery UI and the retired audioSourceRecovery store at the user’s explicit request. All current caches, TXT identities, models and Search embeddings are preserved. Shared audio lookup now consumes the actual inventory **records** field, fixing the .6 filter-on-undefined regression; connected playback tests cover both platforms. Standalone audio inventory no longer compares JSON. Existing disk JSON files are untouched and may be removed by the user; **search-embeddings.json remains active**. See [current status](../../CURRENT_STATUS.md#audio-access-and-playback). Earlier retained-legacy claims below describe superseded .6 behavior.


## Current production inventory candidate — 21 November 2026

Build **2026-11-21.6**, schema **9**, supersedes older audio JSON save/recovery requirements below. Source audio supplies embedded or unchanged reproducible Recording IDs; the new local metadata cache replaces external audio JSON persistence. TXT retains recording/archive identity; **search-embeddings.json remains**. Latest identified snapshots replace older copies, with conservative scope association and stale/partial/failure protection. Existing disk files and older local data are preserved; legacy local lists have optional Settings inspection/deletion. The prefix algorithm is unchanged. See [current status and acceptance checklist](../../CURRENT_STATUS.md#identities-and-local-data) for native/iPhone differences and implementation evidence. Multi-archive Combine remains future work; .6 device acceptance is pending. Earlier entries below are historical.


Current candidate **2026-11-21.2**, schema **8**: atomically migrate full-text cached transcripts from filename keys to existing Archive UUID/Recording ID variant keys, preserving legacy copies and other stores. Failed upgrades roll back. Browse labels and conditional Enable Transcription gating are refined. See [current status](../../CURRENT_STATUS.md). Earlier entries below describe their dated versions.


## TXT catalogue and explicit transcription candidate — 21 November 2026

Build **2026-11-21.1**, schema **7**, implements the approved change: retire the external transcript JSON requirement, retain **memora-audio-source.json** and **search-embeddings.json**, and read identity/model/operation/audio metadata from TXT into a rebuildable local cache. Existing sidecars stay untouched. New empty destinations need no JSON; desktop creates a child, while iPhone names an intended folder for Save to Files. Source stays above and destination below. Enable Transcription guards untouched returns from Combine/Search while excluding Settings; recording defaults are unchecked. Save warnings distinguish pending from share-return verification; iPhone shares TXT only, with a prominent batch-bound destination. Settings exposes the bounded metadata cache; the schema upgrade preserves other stores. See [current implementation and device checklist](../../CURRENT_STATUS.md#transcription-and-saving). Earlier proposals below are historical. The numbered audio-JSON replacement and hosted Mac picker reports remain unresolved/separate; no deployment or user-data modification.


Verification: **129 groups passed** — 18 current TXT-catalogue/session integration, 13 database/schema, 10 database/Settings integration, 19 recording identity/embedding compatibility, 47 audio persistence/recovery, 10 playback, 7 shared-folder access and 5 bounded metadata groups. Tests use synthetic files, isolated databases and stubbed model/Search execution. These counts replace the old .7 app-sidecar test counts; they do not establish real iPhone Files or model acceptance.


## Current storage/access addendum — 19 November 2026

Application source reviewed at 47ca641, displayed build **2026-11-19.25**, database schema **6**. Recent storage work changes presentation, safe deletion and cache synchronization without a new database version, store drop or reset. AudioSourceRecovery is shown as Audio Recording List — Saved Local Copies, with latest proven-source grouping, active protection and pending-work retention. Model Registry Cache is the canonical definition projection, not qualification; refreshing initializes it before counting. Empty unused semanticMetadata is hidden; nonempty legacy data can be explicitly cleared without deleting current embeddings.

storage.selectFolder marks actual whole-folder file-input results with selectionScope=folder. Complete readable coverage does not imply write access. Transcript reconciliation and, since .24, audio reconciliation both honor successful whole-folder iPhone coverage for missing immediate entries. Audio skips and partial/error/cancelled access still prevent removal. iPhone saves require user sharing and cannot force/verify a Files destination. Recognized browser versions are retained in diagnostics but normalized to browser family for qualification continuity. Earlier runtime/database acceptance does not prove the latest iPhone layout, iCloud writes or large-archive timing. See [current status](../../CURRENT_STATUS.md).

Closed for the agreed scopes as of 7 November 2026; reviewed again 9 November through build .23. Whisper configuration/testing has since progressed; release conversion remains deferred. See [current handoff](../../CURRENT_STATUS.md).

## Runtime ownership

runtime.js computes immutable runtimeIdentity with separate OS, device type and device class. Shared isIOS/isMobile/isDesktop derive from it. Live capability queries report API presence, not permission, working adapters or successful inference. OS and tablet/phone identity remain separate; unknown signals stay explicit.

Production Whisper, self-test, Settings and Search audio use shared detection. getRuntimeInfo derives from shared identity and capabilities; outdated speculative Whisper fields are removed. Browser naming remains a reporting heuristic. domDiagnostics records the user agent without independently classifying devices.

Self-test reports environment, requested backend, WebGPU presence and unknown actual backend. Existing worker policy/model options are preserved. Explicitly identified iPads now use the existing iOS audio path. File access stays source/capability-driven; old local names such as isIPhoneSource do not constitute independent device detection.

User startup/Settings, Tiny production/self-test and desktop/iPhone audio checks passed. Separate Android/iPad hardware tests were not reported. Exact model/backend configuration and execution evidence now belong to the implemented Whisper testing/eligibility layer, not unfinished identity work. See the [current catalogue contract](../2026-11-21-whisper/Whisper_Catalogue_Resolver_Contract.md).

## Database ownership and schema

database.js alone owns application opens/schema. Current version **10** removes only the retired audioSourceRecovery store; version 9 added audioFolderCatalogues. All active stores remain intact. The known schema-7 filename-keyed transcript cache migrates atomically to durable keys in schema 8; source JSON recovery is now explicitly retired. Feature modules release caller-owned connections. Model registry initialization remains separate from schema repair.

| Store | Inline key | Required indexes |
|---|---|---|
| audioFolderCatalogues | id | None; metadata-only, revision-checked latest snapshots |
| transcriptCatalogues | id | None; TXT-derived latest metadata snapshots |
| transcripts | id | filenameKey, archiveFilename |
| semanticEntries | id | representationKey/sourceKey, non-unique and non-multiEntry |
| semanticMetadata | key | None; legacy |
| modelRegistry | id | None |

Upgrade adds missing stores/indexes, validates definitions and preserves unknown stores/records. Known transcript key migration preserves every body and rolls back on failure. Other incompatible structures abort rather than reset. Connections close on versionchange; blocked/abandoned requests cannot silently upgrade later. Future versions are refused without downgrade. Registry rebuild remains record replacement, not schema repair.

Settings displays registry loading/errors and runtime diagnostics before storage reporting. Bulk accounting remains a separate potential memory concern, not a proven cause of earlier intermittent Settings behavior.

## Evidence and boundaries

Integration checkpoint `35d69cd`: 12 isolated schema groups and six production-module/Settings groups passed using temporary databases and separate Chrome profile. User confirmed all recommended Mac, iPhone and Windows checks. Mac Chrome on a 2018 MacBook Pro showed version 4/three stores before repair and version 5/four stores afterward. No reset or full live record comparison; fixtures checked exact records and binary embeddings. This does not establish broader model/sequence validation.

imuse-recording-breadboard remains untouched. HTTP app caching and model Cache Storage are separate from IndexedDB. After upgrading to version 6, code fixed to version 5 cannot open that database. Retain schema-6 compatibility in forward fixes/rollbacks; never reset or downgrade to work around it.

## Historical records

- [Original runtime plan](../Initial%20runtime.md)
- [Database audit/history](../IndexedDB_Audit_and_Repair_Design.md)
- [Database repair plan](../IndexedDB_Repair_and_Ownership_Plan.md)
- [Test reproduction](../../../tests/README.md)

18 November 2026 checkpoint 3 candidate: identity now has production callers. Schema remains 6. Source recovery rows can also retain a pending transcript-archive JSON; no new store/index or transcript-cache expiry rule is introduced. Settings → Recording-list recovery offers explicit revision-checked removal, protects the active source, and does not delete files on disk.
