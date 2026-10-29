# IndexedDB audit and repair design

Current status: integrated in `35d69cd`, Mac acceptance passed, iPhone/Windows pending. See [current handoff](CURRENT_STATUS.md). The audit and design sections below retain their original pre-implementation context. Audited 29 October 2026 at HEAD `8391155`. The working tree also contained the uncommitted Settings shared-predicate change. No application code or database was modified by this audit.

## User-confirmed Mac localhost schema

Chrome DevTools inspection on the user's 2018 MacBook Pro confirmed Memora version 4 with exactly three stores: transcripts, semanticEntries, and semanticMetadata. semanticEntries has representationKey and sourceKey indexes. modelRegistry is absent. This is the localhost database, not the separately hosted GitHub Pages/iPhone database. Record counts, key-path/index options, and representative preservation comparisons have not yet been captured; obtain them before applying the repair. No record contents were requested or shared.

## Opening and ownership map

Repository-wide searches found four direct `indexedDB.open` sites, all in application modules. No application `deleteDatabase` call was found. Third-party libraries' internal databases are outside the ownership of this repair.

| Opener | Existing contract | Consumers |
|---|---|---|
| `storage.js`, `openTranscriptDatabase()` | Memora version 4; upgrade creates all four known stores | Cached transcription existence/save and registry list/save/clear. `modelManager.js` initializes/merges definitions, updates evidence, and rebuilds registry records through these functions. |
| `semantic.js`, `openDatabase()` | Memora version 4; upgrade creates three stores, omitting modelRegistry | Embedding persistence/reuse, stored-entry lookup, statistics, semantic clearing and removal of obsolete transcript embeddings. Called through Search and its edit/reindex flow. |
| `storageManager.js`, `openMemoraDatabase()` | Versionless open; returns null if IndexedDB unavailable | Settings storage accounting. A first open can create an empty version-1 database. |
| `storageManager.js`, `openReadWriteStore()` | Versionless open; returns null if requested store absent | Cached transcript listing/export/clearing and semantic representation/all-entry clearing from Settings. Despite its name, also serves reads. Missing stores currently look like empty/no-op results. |

Production transcription's file-input path saves transcript records through storage.js. Direct filesystem writes are not IndexedDB operations. Registry self-test results reach the registry persistence layer through modelManager; built-in model definitions and worker routing must not change in this repair.

## Canonical schema to preserve

All known stores use inline keys with autoIncrement false. Only semanticEntries has application-defined indexes. Preserve unknown additional stores/indexes rather than deleting them.

| Store | Key path | Required indexes | Contents and preservation |
|---|---|---|---|
| transcripts | filename | None | Cached generated transcript text and metadata/model/operation/time. May be the only browser-held copy before export; preserve all records. |
| semanticEntries | id | representationKey → representationKey; sourceKey → sourceKey; both non-unique, non-multiEntry | Representation identity, source/transcript hashes, text, parameters and binary float embeddings. Derived but potentially expensive to regenerate; preserve records and binary values. |
| semanticMetadata | key | None | Reserved existing store created by both schema handlers; no application transaction against it found. Preserve any records regardless. |
| modelRegistry | id | None | Exact configuration definitions and validation evidence. Missing definitions are seeded/merged by existing modelManager behavior; preserve existing records/evidence. |

The only index read found is semanticEntries.representationKey in `loadExistingEntries()`. sourceKey remains part of the required existing schema even though current deletion scans a cursor. Record formats, configuration identifiers, representation keys and embedding formats are unchanged.

## Failures and lifecycle findings

- Different version-4 upgrade handlers can create an incomplete database; opening that version again does not repair it. The user's missing-store error is confirmed; the historical opener order remains unknown.
- Only the storage report opener installs `onversionchange` close handling. Other open connections can block future upgrades.
- Several operations close connections only on success, omit transaction abort handling, or resolve on request success before transaction completion. Synchronous transaction creation errors can also skip cleanup. Semantic operations hold a connection across hashing/worker work and do not universally use finally. Integration must ensure release on every path without changing successful return values.
- Reporting uses getAll for every store and JSON serialization for size estimates. This can allocate substantial memory, especially for semantic text/embeddings. It is a separate performance concern, not proof of the observed Settings behavior. Prefer a cursor-based accounting pass in a later isolated change; do not combine that optimization with the schema transition unless testing demonstrates it is necessary.
- Settings starts registry rendering without catching its rejected promise, and creates the heading only after records load. Its error boundary needs a separate fix. Opening Settings also depends on a successful storage report before runtime rows render.
- Explicit clear/rebuild actions exist for transcript records, semantic records, model registry records, and Cache Storage model files. Keep their current user-confirmation boundaries; none is a schema-repair mechanism. The repair must not call them. No full application database deletion was found.

## Concrete manager design

Use `js/database.js` as the sole owner of schema/open/upgrade logic. Keep data queries in storage.js, semantic.js and storageManager.js.

Expose `openMemoraDatabase()` returning a caller-owned, schema-validated connection. Consumers must release it in finally or after transaction completion/error/abort. Do not return one shared connection: existing callers close connections, and semantic work can overlap Settings and transcription. Add a narrow connection helper if it simplifies guaranteed cleanup; keep business queries outside the owner.

Deduplicate initial schema initialization per page with an internal promise; close the initialization connection when finished. Then each operation opens its own connection through the same owner and validates schema before returning it. Reset failed initialization state so explicit retry is possible. Every connection closes on versionchange; track an invalidated initialization state so later opens revalidate normally.

Propose version 5 based on repository version 4. Confirm live schema/version first; if a deployed database is newer, stop and reconcile rather than dynamically bumping or downgrading. Use a fixed version, never repeated automatic increments. A future-version database must produce an explicit VersionError path and no changes.

During upgrade, create missing stores and indexes only. Verify existing key paths, autoIncrement and required index definitions; if incompatible, abort the transaction with an actionable schema diagnostic. Do not delete/recreate an incompatible store or index automatically. Perform the same structural validation after a normal open. Unknown additional stores/indexes are retained. IndexedDB's upgrade transaction supplies atomicity; failed upgrades must leave the old version and data intact.

Keep registry seeding on demand through existing modelManager functions after schema initialization. Creating modelRegistry during upgrade does not itself reset or rebuild evidence. Test initialization races: concurrent callers may both attempt baseline merges, but the manager must prevent competing schema definitions; do not redesign registry synchronization in this patch.

Handle blocked upgrades visibly. An open request cannot simply be cancelled after onblocked: if the public promise rejects, ensure a subsequent late success closes its connection rather than leaking it or resuming stale UI. Define retry behavior and test it. Reject storage unavailability explicitly rather than treating a missing required store as zero records. The Settings reporting error boundary must accommodate this intentional distinction.

## Integration and test gates

1. Obtain a live read-only inventory from Chrome DevTools Application → IndexedDB → Memora: version, store/index names and counts where available. No transcript content or binary values need to be shared. Localhost and GitHub Pages are separate origins and databases; one does not establish the other's schema.
2. Build the manager unused, plus a browser test harness using dedicated test database names only. Expose a factory/test injection for isolated database names without allowing production callers to select arbitrary versions. Use real browser IndexedDB for schema/transaction acceptance; mocks alone are insufficient.
3. Test fresh, empty version 1, healthy version 4, incomplete version 4, and preserved registry evidence. Add a missing-index fixture and incompatible key/index definitions. Assert version/schema plus exact fixture records (including binary embeddings) before/after; unknown stores/records survive.
4. Test concurrent opens, blocked upgrade with a held legacy connection, late success after a blocked rejection, close-on-versionchange, failed/aborted upgrade with old data intact, future-version refusal, unavailable IndexedDB and retry after failure. Never run fixture deletion against Memora or the user's origin data.
5. Migrate all four open sites and their cleanup paths together when activating version 5. Preserve exported feature APIs and result shapes. Include the version transition in one deployable change; hardcoded version-4 opens cannot coexist safely after upgrade. Add visible Settings errors as a separate reviewable change/checkpoint.
6. Verify the user's existing Mac database after isolated tests pass; compare baseline counts/representative records and test registry display, semantic reuse/reload, cached transcripts and Settings accounting. Reading registry may legitimately add baseline definitions; account for that expected difference.
7. Publish once for relevant iPhone checks after Mac success. Retain a forward-fix strategy: old version-4 code cannot be assumed to work with an upgraded database. Close/reload other Memora tabs during deployment and handle blocked cases without reset. No downgrade/delete is proposed.

## Checkpoint history (newest first)

Current next action: collect iPhone results for deployed `35d69cd`; do not repeat completed manager implementation. Earlier checkpoint statements below describe their historical state, not outstanding implementation work.

Mac acceptance: user reported all requested checks passed in Chrome on the 2018 MacBook Pro: registry display/current-device WebGPU filter, Search with embedding reuse after reload, Tiny production transcription, and standalone Tiny self-test. DevTools confirmed version 5 with four stores: modelRegistry, semanticEntries, semanticMetadata, and transcripts (user typed “transcrips”). This is user-reported acceptance on the current local working build, not Windows/iPhone acceptance or a full content-preservation comparison. Natural break reached before commit/publication and iPhone tests. No storage reset was needed.

Integration checkpoint: all four production open sites now route through `database.js`; existing consumers retain caller-owned connections with finally cleanup. The version-5 upgrade is active on the next application database access. Settings displays registry loading/failure states and renders runtime diagnostics before reading storage. Batch persistence aborts on synchronous invalid-record errors. Expanded isolated Chrome tests passed: 12 schema groups and six production-module/Settings integration groups. See `tests/README.md` for reproduction. The actual Mac database has not been accessed by the agent; user reload/verification and iPhone publication/testing are pending. The user has stated current data is disposable, so a content baseline is no longer a prerequisite, but the upgrade remains non-destructive and no reset was performed. Leave `imuse-recording-breadboard` untouched. Do not deploy an older hardcoded version-4 opener after this upgrade. Natural break: after the user confirms Mac registry, Search persistence, and Tiny transcription/self-test behavior, stop before iPhone publication.

Second natural break point: `js/database.js` now implements the unused version-5 schema owner. No existing application module imports it. The isolated browser harness is `tests/database.html`; see `tests/README.md`. Eleven groups passed in headless Chrome with a separate temporary profile, covering preservation, missing stores/indexes, blocked retry, concurrency, incompatible-schema rollback, and newer-version refusal. The manager is not a live repair yet. Before integration, add incompatible-index coverage, verify caller cleanup/transaction behavior, capture live preservation baselines, and prepare the coordinated opener migration. iPhone/Windows and the actual Mac database remain untested for upgrade behavior.

The audit/design is ready for review. The user confirmed the Mac localhost version/store/index names as recorded above; the agent has not accessed the live browser database. The next implementation checkpoint is an unused manager plus isolated browser tests; no production migration until those pass. Windows and iPhone database repair behavior remain untested. Runtime migration stays paused; the Settings filter change is implemented but its Mac UI verification is blocked by the missing store.
