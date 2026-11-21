# Audio JSON retirement audit and staged plan

## Current cleanup and playback fix — 21 November 2026

Build **2026-11-21.7**, schema **10**, removes legacy audio JSON code, optional recovery UI and the retired audioSourceRecovery store at the user’s explicit request. All current caches, TXT identities, models and Search embeddings are preserved. Shared audio lookup now consumes the actual inventory **records** field, fixing the .6 filter-on-undefined regression; connected playback tests cover both platforms. Standalone audio inventory no longer compares JSON. Existing disk JSON files are untouched and may be removed by the user; **search-embeddings.json remains active**. See [current status](CURRENT_STATUS.md#automatic-audio-lookup-fix-and-legacy-audio-json-removal--21-november-2026). Earlier retained-legacy claims below describe superseded .6 behavior.


## Production implementation candidate — 21 November 2026

The authorized coordinated switch is implemented in **2026-11-21.6**, schema **9**. The standalone-first proposal below is historical; the user approved direct production integration. See [current implementation, limits and device checklist](CURRENT_STATUS.md#production-audio-metadata-cache-and-audio-json-retirement--21-november-2026). Production no longer requires/writes audio JSON; Search embeddings remain. Latest identified audio/transcript cache snapshots replace older copies; iPhone identity verification remains necessary on reopen. Previous legacy data is retained separately for explicit inspection/deletion. Real .6 device acceptance is pending.


21 November 2026. Audited checkout **736a292**, application **2026-11-21.2**, database schema **8**. This is a code audit and implementation proposal, not a production change. The user has approved moving toward removing the external audio JSON, starting with this audit. No user archives or local user databases were inspected or modified, and no timing measurements were made.

## Conclusion

Modern recording identity and playback do not fundamentally require memora-audio-source.json. Embedded Recording IDs and the fixed reproducible fallback can reconstruct an inventory from granted audio files. Transcript Archive UUIDs identify transcript collections independently. Search embeddings remain in search-embeddings.json.

The JSON cannot simply be disconnected today: production source preparation, transcription, shared playback inventory, Settings and export readiness still depend on its session interface and recovery state. Replace that interface with a metadata-only local inventory first. Do not silently change older randomly assigned IDs.

## Current responsibilities and replacement

| Current responsibility | Evidence | Replacement |
|---|---|---|
| Discover, validate and select/create an audio list | [storage.js](../js/storage.js), [recordingIdentityUI.js](https://github.com/BCharash/Memora/blob/456fbffaec2a06e3eea2311c12f0291e977434d9/js/recordingIdentityUI.js), [audioSourcePersistence.js](https://github.com/BCharash/Memora/blob/456fbffaec2a06e3eea2311c12f0291e977434d9/js/audioSourcePersistence.js) | Enumerate granted audio files and open/rebuild a local inventory; no routine JSON dialog. |
| Preserve path-to-Recording-ID associations | [audioSourceIdentity.js](https://github.com/BCharash/Memora/blob/456fbffaec2a06e3eea2311c12f0291e977434d9/js/audioSourceIdentity.js) | Existing embedded ID first; exact prefix method only when a supported container positively reports no ID. Keep origin and method. |
| Reconcile membership | [transcriptionIdentity.js](../js/transcriptionIdentity.js), [audioSourcePersistence.js](https://github.com/BCharash/Memora/blob/456fbffaec2a06e3eea2311c12f0291e977434d9/js/audioSourcePersistence.js) | Retain complete-folder versus partial-selection distinction. Add new files, remove absent members only after a successful complete read; do not publish partial failure as a complete snapshot. |
| Supply Recording IDs during transcription | [transcriptionIdentity.js](../js/transcriptionIdentity.js), [transcriptMetadata.js](../js/transcriptMetadata.js) | Inventory resolves the selected file; verify its actual identity before inference. TXT retains Recording ID, Archive UUID, Original Audio Folder and fallback method where applicable. |
| Link selected transcripts to audio | [sharedFolderSelection.js](../js/sharedFolderSelection.js), [searchUI.js](../js/searchUI.js) | Keep ID-to-candidate-location inventory plus actual playback verification; reject ambiguity instead of selecting an arbitrary duplicate. |
| Save and recover pending audio-list changes | [audioSourcePersistence.js](https://github.com/BCharash/Memora/blob/456fbffaec2a06e3eea2311c12f0291e977434d9/js/audioSourcePersistence.js), [audioSourceRecovery.js](https://github.com/BCharash/Memora/blob/456fbffaec2a06e3eea2311c12f0291e977434d9/js/audioSourceRecovery.js) | Local snapshot transactions, without file sharing/readback state. Preserve older data until migration is verified. |
| Gate iPhone export on audio-list sharing | [app.js](../js/app.js), iPhoneExportReady and Save Audio Recording List handlers | Remove that gate and the external audio-list save controls together. Keep transcript save warnings and transcript destination guidance. |
| Revalidate unchanged JSON before a new transcription batch | [transcriptionIdentity.js](../js/transcriptionIdentity.js), session revalidateSource | Validate the selected actual file and current access, rather than an external inventory's bytes. |
| Protect active recovery copies in Settings | [settings.js](../js/settings.js), getActiveAudioSourceId | Replace source-UUID recovery UI with latest inventory information and cache actions. Do not delete unrelated pending transcript text or embeddings. |
| Standalone test/diagnostic list comparison | [archiveFolderAccess.js](../js/archiveFolderAccess.js) | Clearly distinguish optional historical diagnostics from the new production requirements. |

Historical Audio Source ID headers are already ignored by transcriptMetadata.js. Search and semantic representations normalize that field to null. The active source UUID is still used by the audio persistence/recovery implementation and Settings, but it is not the modern transcript-to-audio identity link. Retiring it does not require removing Recording IDs or transcript Archive UUIDs.

## What is actually cached today

The audioSourceRecovery store holds serialized manifests, baseline bytes, revisions, states and optional directory handles. It is a recovery system, not the proposed incremental audio metadata cache. A manifest can also retain historical fingerprints, availability, recovery and extension fields. It does not provide the display date/duration metadata parsed separately by metadata.js.

The reproducible resolver caches successful results in a WeakMap keyed by the exact immutable File/Blob object. This avoids repeat reads of the same snapshot within a session, not cross-session metadata reads. Its current contract explicitly forbids treating filename/size/time as proof of identity. Keep that resolver strict; a separate inventory cache can treat those properties as reuse hints.

transcriptCatalogues holds metadata-only snapshots derived from loaded TXT, bounded to 16 selection-object scopes. Reopening the same physical folder through a new selection object can produce another snapshot. The separate transcripts store holds generated full-text copies keyed by durable transcript identity; it is not folder inventory history. Do not remove those text copies when pruning folder snapshots.

## Identity and legacy compatibility

1. Valid embedded Apple/iMuse IDs are returned unchanged.
2. Only a supported container reporting no embedded ID permits the existing fallback: framed SHA-256 over file size and the first min(size, **256000**) bytes, converted to the existing UUIDv8 representation. Filename is excluded. Preserve the exact algorithm and Recording ID method header.
3. Invalid, conflicting, unreadable or unsupported metadata must remain visible as unresolved, not receive a newly invented ID merely to complete the scan.
4. Some historical entries have identityOrigin memora-assigned without sampledIdentity. Their random IDs cannot be reproduced from audio alone. A full-file fingerprint, if present, is association evidence, not a way to regenerate that old UUID. Some such records also represent explicit recovery from malformed/unsupported embedded metadata.
5. Do not treat every memora-assigned entry as legacy: modern sampled entries use that origin too. Distinguish by validated sampledIdentity evidence.
6. Preserve a legacy association only with corroborated source/file evidence. Do not copy a same-named file's old ID into a different folder, or infer an audio ID from a transcript UUID alone. If correspondence cannot be established, report the affected recording and retain the old data for explicit migration.

The user reports all current archived audio has embedded Recording IDs. This audit did not inspect those audio files, so the remaining legacy population is unmeasured. First implementation should report embedded, reproducible, legacy and unresolved counts. Existing JSON can be read as optional migration evidence during transition, but must not be rewritten or required for ordinary modern files. Leave existing disk JSON untouched. Do not tell users to delete it before the legacy check succeeds.

## Proposed local inventory

Keep only metadata: relative path, filename, size, modification time, Recording ID, identity origin/method, sampled evidence when applicable, inspection version and verification status. Cache parsed recording date/duration/timescale when obtained for Transcribe, so display work need not be repeated. Do not add audio bytes, decoded samples, File snapshots or object URLs to persistent storage. Directory handles, when supported, are access associations, not universally available identities.

Each refresh enumerates current files. Match unchanged candidates to cached records; inspect new/changed or ambiguous files. A metadata match is a performance hint, not proof of identity. Before inference or playback, preserve actual-file identity checks. Size or timestamp changes should invalidate automatically; a Rescan Audio Metadata action covers edits preserving both. Replacing an entire folder with same-named/sized/timestamped files is another reason to avoid globally trusting those fields.

Native directory handles provide isSameEntry evidence for matching a previously selected folder. iPhone File selections do not provide the equivalent durable directory identity. A folder name, relative path or metadata-tuple inventory alone cannot prove that two selections are the same physical folder. A complete content-identity signature can describe a logical inventory, but changes on addition/removal and cannot distinguish two exact copied folders.

Therefore use conservative cache candidates and rebuild/verify when association is uncertain. Do not promise both zero rereads and perfect physical-folder distinction on iPhone. Use an opaque local scope plus evidence, not the display folder name as a primary key. Cached data must never grant folder access. Avoid introducing a new external identity file merely to replace the retired JSON.

## Time, work and memory assessment

- Current valid-list opens already enumerate the folder and reconcile each member. Known entries normally reuse list identity without reading embedded metadata; selected recordings are checked before inference. A missing-list rebuild already exercises the bounded embedded/sample resolver.
- Cold cache opens therefore add per-file identity metadata reads relative to a valid JSON-backed open. MP4 inspection walks container headers and selected metadata rather than decoding audio or hashing the full audio file. File-provider fetching can still exceed the requested read ranges.
- Fallback sampling adds at most 250 KiB per unidentified recording; embedded-ID files do not need prefix hashing. A hundred fallback files request about 24.4 MiB of prefix data in total, processed incrementally, not retained together.
- Warm cache opens can avoid identity/display metadata reads for safely associated unchanged entries. They still need folder enumeration and comparison; granting a folder on iPhone may itself take time before JavaScript receives the files.
- Use sequential or tightly bounded reads. Prefix hashing holds a sample and framed input plus implementation overhead, so do not claim a strict 250-KiB memory ceiling. Persistent metadata and in-memory path/ID indexes scale with file count; source selection still retains supplied File references during the session.
- Removing manifest serialization, baseline copies and recovery-save staging should remove work and some transient allocations. Exact speed/memory improvement is unmeasured; it cannot be inferred from the JSON file size or synthetic suite counts.

Measure cold/warm/new/removed-file runs on MacBook and Dreams/2018 on iPhone. Record picker/provider wait separately from enumeration, identity reading, metadata display and IndexedDB write durations. Count bytes requested and files inspected. No decoding/model loading should be introduced by inventory preparation. Do not require memory APIs unavailable on iPhone to determine pass/fail.

## Settings and latest snapshots

Show **Audio Folder Cache** and **Transcript Folder Cache**, with one latest verified snapshot per established scope, folder/context label, last-updated time, record count and storage size. Replace the previous snapshot atomically after successful refresh; retain the previous valid snapshot on failure. Never collapse distinct same-named sources. Uncertain iPhone associations require conservative scope handling rather than presenting a falsely proven latest copy.

Show selection controls only when entries exist: select all and delete selected above the entries. Clearing a derived inventory does not delete audio, TXT, disk JSON, cached full-text transcripts or embeddings. Keep full-text Cached Transcripts as a separate category. During transition, retain legacy recovery data needing migration; do not automatically discard it as obsolete inventory history. A retention limit for unassociated scopes may be used only for fully rebuildable metadata, not irreplaceable legacy IDs.

## Checkpoints and acceptance

1. **Read-only comparison and migration classification.** Build an independent local-inventory adapter, retaining existing production behavior. Compare its result with current lists using isolated fixtures and optional user-selected archives. Report the four identity categories. Verify identical IDs after cache clearing/rebuild and on both devices. No writes to user JSON or TXT.
2. **Persistent incremental inventory and cache association.** Add a preserving schema migration, atomic latest snapshots, automatic size/time invalidation, explicit rescan and conservative same-name folder handling. Integrate date/duration reuse without eagerly preparing Transcribe when entering Combine/Search. Test unavailable IndexedDB: modern audio must remain usable from a session inventory, while legacy data must not be silently discarded. Benchmark cold and warm paths.
3. **Switch all production consumers together.** Route source selection, transcription and shared playback to the new inventory. Remove external audio JSON creation/sharing/revalidation, the dependent iPhone export gate and list recovery prompts. Preserve progress/spinner, existing successful destination workflow, actual identity verification, selected-source rollback on failure and independent embeddings persistence. Leave disk JSON untouched; retain read-only legacy migration support only where needed.
4. **Settings and documentation closure.** Expose latest audio/transcript folder snapshots, retain full-text cache separately, and retire recovery UI only after legacy preservation is verified. Update active contracts, tests and journal to distinguish retired sidecars from still-active Search embeddings. Device acceptance precedes removing old compatibility code.

Checkpoint 1 is the recommended next implementation, not a claim that these checkpoints have already run. Essential cases: no JSON; valid/stale/corrupt JSON ignored for modern identity; fallback reproducibility; unavailable/cleared cache; added/removed/renamed audio; same-named folders with different IDs; duplicate embedded IDs; legacy random IDs; failed/partial reads; reopened iPhone folder; current TXT audio playback; no unwanted JSON share; unchanged Search embeddings reuse.

Audit validation: source/dependency review and documentation consistency checks only. No production behavior, build or schema was changed by the audit; no new runtime test results are claimed.

## Checkpoint 1 implemented — 21 November 2026

The user confirmed all four active archives came from Apple Voice Memos. The only deliberately unidentified test recording already passed reproducible-ID rebuilding; that is the modern prefix-method case, not evidence of an irreplaceable randomly assigned legacy ID. No general legacy conversion UI is introduced at this checkpoint. Classification remains in the comparison to detect unexpected evidence rather than assume it away.

The independent [audioInventory.js](../js/audioInventory.js) reconstructs metadata-only inventories from current audio snapshots, optionally compares an existing manifest, and reports embedded/reproducible/unresolved counts, old assigned mappings, matched/mismatched IDs, additions, absent paths and renames. It never adopts a manifest ID as the observed audio identity. Duplicate IDs/paths and unreadable/malformed/unsupported metadata remain explicit issues. Successful complete-folder coverage is distinguished from partial or failed reads. Results contain no File/audio-byte payloads and no persistent data is written.

The standalone [audio-inventory-test.html](../audio-inventory-test.html) selects one parent folder, reads immediate audio and optionally compares memora-audio-source.json, displays progress and requested read counts/bytes/durations, and offers **Save Test Report**. Desktop requests read-only directory access. iPhone uses supplied relative-path snapshots; nested audio is excluded. Invalid/unavailable list data does not stop independent audio identity reconstruction. JSON is not created, changed or shared. The report itself is a named TXT file with a files-only share payload. Provider fetching and memory use are not inferred from requested bytes.

Verification: **44 targeted groups passed** — 16 independent inventory cases, 3 standalone native/phone/report cases, 22 existing reproducible-identity cases and 3 iPhone transcription gate regressions. Tests use synthetic data; no real archive/model execution or iPhone acceptance is claimed. Production source/JSON behavior, APP_BUILD **2026-11-21.3** and schema **8** remain unchanged.

Device checkpoint: open audio-inventory-test.html on the same origin as Memora; select each archive on MacBook and iPhone and save reports. For a matching current list expect all listed modern recordings to match, zero mismatches, zero unresolved and zero old assigned mappings. Renames/additions/removals may legitimately differ from a stale list. The stripped test should report a reproducible ID, not an old assigned mapping. If a list is absent, reconstruction should still complete; a comparison cannot claim matches without a baseline. Repeat a selection to check reproducibility; this cold-inspection page deliberately does not reuse a persistent cache. Do not delete JSON for this test.

Next implementation checkpoint is the preserving local inventory store and incremental refresh. Actual device comparison/timing evidence should be reviewed before switching production consumers or removing audio-list export controls.

## Audio inventory device comparison: Dayananda — 21 November 2026

The user supplied MacBook Chrome and iPhone Safari reports for **Dayananda Ashram Audio journal**, at 10:52:38Z and 11:18:21Z. Both enumerated the same **107 audio files** (489,775,383 bytes), recovered **107 embedded Apple Recording IDs**, and matched all 107 against a valid existing audio JSON. There were no path-set, file-size or case-insensitive Recording ID differences between devices; both reported zero unresolved, mismatched, added, absent, renamed or old assigned entries and no inventory issues.

Identity inspection took **1,193 ms on MacBook** and **972 ms on iPhone**. Both requested **68,277 audio bytes in 2,458 reads**. Enumeration after folder access took 116 ms and 0 ms respectively. These are single-run measurements, excluding picker/provider preparation and JSON discovery/comparison; requested bytes are not a measurement of iCloud downloads or peak memory. This does not prove a general device speed advantage or warm persistent-cache performance.

The user reports the Pages recovery worked and the iPhone test became accessible. No cancellation API response was provided, so server-side recovery details are not independently established. The paired reports establish cross-device inventory parity for this archive; they do not test the other three archives or the stripped fallback recording, and they do not establish acceptance of the separate .4 Transcribe UI fix. Both reports found a valid JSON despite the earlier deletion report; reconstruction still derives identities from audio and uses JSON only for comparison.

Checkpoint 1's cross-device proof is established for Dayananda. The next staged implementation is the preserving local inventory/cache and incremental refresh; production audio JSON retirement remains pending. No code/build/schema or user files were changed while reviewing these reports.
