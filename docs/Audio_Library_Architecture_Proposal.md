# Audio library hierarchy — agreed behavior and delivery plan

## Current cleanup and playback fix — 21 November 2026

Build **2026-11-21.7**, schema **10**, removes legacy audio JSON code, optional recovery UI and the retired audioSourceRecovery store at the user’s explicit request. All current caches, TXT identities, models and Search embeddings are preserved. Shared audio lookup now consumes the actual inventory **records** field, fixing the .6 filter-on-undefined regression; connected playback tests cover both platforms. Standalone audio inventory no longer compares JSON. Existing disk JSON files are untouched and may be removed by the user; **search-embeddings.json remains active**. See [current status](CURRENT_STATUS.md#audio-access-and-playback). Earlier retained-legacy claims below describe superseded .6 behavior.


## Current production inventory candidate — 21 November 2026

Build **2026-11-21.6**, schema **9**, supersedes older audio JSON save/recovery requirements below. Source audio supplies embedded or unchanged reproducible Recording IDs; the new local metadata cache replaces external audio JSON persistence. TXT retains recording/archive identity; **search-embeddings.json remains**. Latest identified snapshots replace older copies, with conservative scope association and stale/partial/failure protection. Existing disk files and older local data are preserved; legacy local lists have optional Settings inspection/deletion. The prefix algorithm is unchanged. See [current status and acceptance checklist](CURRENT_STATUS.md#identities-and-local-data) for native/iPhone differences and implementation evidence. Multi-archive Combine remains future work; .6 device acceptance is pending. Earlier entries below are historical.


## TXT catalogue and explicit transcription candidate — 21 November 2026

Build **2026-11-21.1**, schema **7**, implements the approved change: retire the external transcript JSON requirement, retain **memora-audio-source.json** and **search-embeddings.json**, and read identity/model/operation/audio metadata from TXT into a rebuildable local cache. Existing sidecars stay untouched. New empty destinations need no JSON; desktop creates a child, while iPhone names an intended folder for Save to Files. Source stays above and destination below. Enable Transcription guards untouched returns from Combine/Search while excluding Settings; recording defaults are unchecked. Save warnings distinguish pending from share-return verification; iPhone shares TXT only, with a prominent batch-bound destination. Settings exposes the bounded metadata cache; the schema upgrade preserves other stores. See [current implementation and device checklist](CURRENT_STATUS.md#transcription-and-saving). Earlier proposals below are historical. The numbered audio-JSON replacement and hosted Mac picker reports remain unresolved/separate; no deployment or user-data modification.


Verification: **129 groups passed** — 18 current TXT-catalogue/session integration, 13 database/schema, 10 database/Settings integration, 19 recording identity/embedding compatibility, 47 audio persistence/recovery, 10 playback, 7 shared-folder access and 5 bounded metadata groups. Tests use synthetic files, isolated databases and stubbed model/Search execution. These counts replace the old .7 app-sidecar test counts; they do not establish real iPhone Files or model acceptance.


## Planned UI/session follow-up — 20 November 2026

The [next implementation plan](CURRENT_STATUS.md#transcription-and-saving) records **Enable Transcription** for untouched returns from Combine/Search, with selectors initially visible and Settings excluded. Shared audio/transcript access must not itself enable or prepare Transcribe's recording controls. That future pass also corrects per-batch save-warning state and destination guidance and simplifies audio-before-transcript list statuses. It preserves identity/schema rules, separate parent/child JSON ownership, files-only iPhone bundles, partial-coverage safeguards and pending-work recovery. Documentation only; implementation planned for 21 November. Current build remains .7, schema 6.


## Implemented roots and remaining hierarchy work — 19 November 2026

Current source reviewed at 47ca641, displayed build **2026-11-19.25**. Audio source opening inventories immediate audio independently of transcription selection and reconciles the Audio Recording List before transcription on desktop and iPhone. Successful complete native or explicitly marked whole-folder iPhone scans remove absent immediate audio as of .24. Explicit/unmarked partial selections and scans with skipped recordings retain unseen entries; failed/cancelled reads cannot publish removal candidates. Valid selected JSON takes precedence over stale pending recovery; unchanged lists are not re-saved. Existing audio IDs are reused without content hashing; new files use bounded embedded metadata inspection. Source reselection replaces Refresh Source; explicit iPhone saving remains.

Edit/Combine now uses shared root transcript reading/reconciliation. Whole-folder iPhone input is complete transcript coverage, while explicit partial input/read errors cannot prove deletion. Canonical transcript list is memora-transcript-archive.json; archive/year plus folder guidance reduces ambiguity between yearly archives. The user's four old-name lists are to be rebuilt from existing headers before Transcribe use.

These root implementations do **not** establish the proposed parent library catalogue, recursive child ownership, multi-source resolution, persistent multi-archive Combine or document import. Shared reconciliation in Transcribe saves/Search remains subsequent work. The iPhone audio-removal parity gap identified in the documentation review is fixed in .24. The detailed Whisper metadata/backfill plan was dropped; family-then-filename-counter priority is agreed but not coded. Read [current status](CURRENT_STATUS.md) before applying the earlier ordered checkpoints.

**Earlier 19 November implementation checkpoint:** Candidate `2026-11-19.14` maintains immediate audio membership on source selection. A valid selected list is authoritative over stale local pending audio data; pending transcript exports remain separate. Known IDs are reused through indexed lookups without audio hashes or per-file whole-manifest copies. New identities use bounded metadata reads and compact planning with global duplicate checks. Complete writable-root scans remove absent entries; partial selections retain them. Availability is reported in the current session instead of modifying portable JSON for device/coverage differences; historical availability fields are preserved. Unchanged JSON and identical recovery records are not rewritten. Large-inventory work yields by batch and reports the detail-reading phase. Source reselection replaces the former Refresh control; file-input saves retain the explicit Save Audio Recording List action. Synthetic regressions cover stale-pending recovery, no-op saves and scale, while actual iPhone/iCloud acceptance remains pending.

The parent catalogue, recursive source discovery/ownership, Transcribe/Search full-folder transcript integration, shared multi-source audio resolver and persistent multi-archive Combine workspace remain pending. Edit/Combine root transcript reconciliation is implemented as noted above. The ordered plan below remains applicable to those broader changes. See [production inventory contract](archive/2026-11-21-contracts/Recording_Identity_Implementation_Contract.md#production-source-inventory--19-november-2026) and [current status](CURRENT_STATUS.md). Earlier 18 November authorization statements refer to that documentation-only task; the new audio-source implementation was explicitly authorized afterward.

The user reports all four archives migrated successfully and Search embeddings rebuilt on the Mac. iPhone Search returned to the default Transcribe tab during folder preparation, then worked after Safari Web Inspector Empty Caches and reload and again after reopening. This is user-reported recovery, not proof of memory exhaustion, a stale-file diagnosis or a complete device acceptance pass. No IndexedDB reset is required. The Windows/iCloud mismatch described at the end is historical, not a current migration blocker.

## Proposed preferred organization

```text
All Audio Archives/
├── memora-library.json                 # Proposed library catalogue
├── Audio Archive 1/
│   ├── recording-a.m4a
│   ├── recording-b.m4a
│   ├── memora-audio-source.json        # Recording list for this audio source
│   └── transcription/
│       ├── memora-transcript-archive.json         # Transcript file list
│       ├── individual transcripts...
│       └── combine/
│           └── combined documents...
└── Audio Archive 2/
    ├── recordings...
    ├── memora-audio-source.json
    └── transcription/
        ├── memora-transcript-archive.json
        └── combine/
```

`memora-library.json` is a proposed filename, not an approved schema. The layout is a proposed preferred pathway, not a requirement to move the user's four existing archives. Each child should remain usable independently when selected without its parent. Archives in separate locations must remain supportable by explicit association.

## Three document responsibilities

| Document / user-facing name | Responsibility | Authority boundary |
|---|---|---|
| Library catalogue (proposed parent JSON) | Identifies participating child audio sources and transcript archives, with locations relative to the chosen library root. | References child manifests; does not become a second authoritative recording inventory or a filesystem permission grant. |
| Audio recording list (`memora-audio-source.json`) | Audio Source ID, recording paths, Recording IDs, origins, fingerprints and approved recovery state for one managed audio source. | Source-owned recording identity remains independent of transcript destination/model/operation. |
| Transcript file list (`memora-transcript-archive.json`) | Archive UUID and associations between Recording IDs and transcript paths, models and operations. | Identifies a logical transcript archive; does not own fallback audio identity or contain transcript bodies. |

Latest approved user-facing names: **Audio recording list** and **Transcript file list**. Prompts identify the exact filename and destination folder. The earlier “Transcript archive index” recommendation was superseded after the user explained confusing the two JSON documents. The file names, schemas and identities remain unchanged. A separate Search index remains derived search data.

Recommendation: the parent catalogue should reference existing child identities/manifest locations rather than duplicate every recording entry. A derived lookup cache may accelerate resolution, but child manifests remain authoritative and refresh/validation rules must prevent a stale cache from claiming current file availability. Whether the library itself needs a UUID and the exact schema fields remain open. Discovery/update behavior is agreed below; serialization and validation details still need specification.

The folder layout commonly gives one audio source a nearby transcript archive, but these identities must stay distinct. Different transcript destinations can refer to the same audio source; provenance remains per recording rather than assuming every transcript archive permanently has exactly one audio source.

## Complete inventory and source ownership

The user's requirement is that selecting only one recording for transcription must not restrict the source recording list to that recording. All audio belonging to the managed source should be inventoried; only checked recordings should be transcribed. The previous incremental-enrollment implementation does not satisfy that requirement and is now subject to architectural revision.

Recommended separation:

1. **Library discovery:** identify participating child archives/manifests and their boundaries.
2. **Recording inventory:** inspect IDs/fingerprints for all audio belonging to each source being indexed.
3. **Transcription:** run inference only for explicitly selected recordings.
4. **Search/Combine resolution:** use validated source/archive references and current access associations.

Opening a library starts catalogue discovery and checks available child lists; opening an audio source starts its complete eligible-file inventory. Both views offer an explicit Refresh action for changes made while Memora stays open. Discovery, inventory and transcription remain separate operations: opening a parent does not silently assign identities to every unregistered child. New-source registration is confirmed first. Enumeration and any required fingerprinting need bounded work, progress and cancellation. Exact change-detection optimizations remain to be specified; do not rehash an entire library whenever one recording is played or a query runs.

Do not recursively enrol a child recording into both a parent source list and its own child source list. The proposed parent is a catalogue of sources, not another source encompassing every child recording. A nested folder with its own source manifest introduces an ownership boundary. Generated `transcription`/`combine` outputs should not be scanned indiscriminately for source audio; inclusion/exclusion rules remain to be specified, especially if combined audio is intentionally stored there.

Still unresolved: may an individual child audio source own additional nested audio folders without a separate manifest? If so, define source-relative paths, manifest boundaries, ambiguous names and consistent desktop/file-input behavior before coding. Source UUIDs/Recording IDs remain authoritative; names and paths locate files but do not establish identity. Do not infer duplicate recordings from matching names/content or introduce unapproved move/copy tracking.

## Shared design, capability-specific access

Both writable directory handles and supported folder-input selection can expose nested files. Mobile must not be categorically described as incapable of subfolder selection. Apple documents iOS directory-input support beginning with Safari 18.4. This is platform capability evidence, not validation of the user's particular iPhone/provider/tree.

| Access actually available | Proposed pathway |
|---|---|
| Selected directory handle with granted access | Discover descendants beneath that selected root, retain source-specific handles where supported, recheck permission, and write authorized manifest updates directly. |
| Folder selection returning Files and relative paths | Build a session view from the files actually returned; use their relative paths, explicit JSON selection when needed and Save-to-Files for updates. No direct-write or persistent-directory-access claim. |
| Incomplete selection or unavailable provider/permission | Preserve known catalogue entries as unresolved and ask for the missing source/subtree/file. Never infer absence from inaccessibility or substitute a similarly named source. |

Use capability and permission checks rather than OS labels alone: desktop users can also use file-input pathways. Selecting a parent may make multiple child sources accessible in one session, but a catalogue itself does not grant access or guarantee future availability. Reselection may be needed. Cloud placeholders, provider behavior, path completeness, large-library selection cost and iPhone persistence need measurement; do not equate API presence with successful traversal/playback.

Relevant primary references:

- [WebKit: Safari 18.4 features](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) — iOS directory-input support.
- [Chrome: File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) — directory handles, enumeration, serialized handles and permission checks.

Current source scope: `storage.js:listAudioFiles` inventories immediate audio files for both directory handles and file-input folder selections. Nested audio is excluded consistently; existing nested manifest entries remain unverified. Recursive source/library ownership remains deferred.

## Multi-archive playback and Search

Recommended shared resolution:

```text
Combine entry or Search result
    → transcript archive UUID + Recording ID + operation
    → recording's Audio Source ID + Recording ID
    → matching child source registered in the selected library
    → recording's path relative to that child source
    → accessible, validated audio file
```

The parent-relative child path and child-relative audio path locate the file. Identity checks distinguish same-named files in different sources. Folder names alone never select the winner. A renamed/moved child requires catalogue/path refresh or explicit reassociation; do not silently generate new identities or claim automatic tracking.

Search and Combine should share the library catalogue, source association registry and audio resolver. Search could scope one archive, several archives or a whole library, while retaining the approved preferred-transcript-before-search behavior. Search results continue to feed the same persistent Combine workspace. This is a proposed extension of the existing architecture, not an implemented Search refactor.

If only some referenced sources are accessible, preserve other entries visibly as unresolved and request access on use. One source's association must not overwrite another's. Browser-local handles/permissions/object URLs are not portable catalogue data. Standalone HTML relative playback, browser-session playback and imported reference resolution have separate acceptance requirements; the catalogue does not automatically make exported HTML able to bypass browser file-access restrictions.

## Agreed catalogue and recording-list maintenance

The JSONs are saved inventories maintained by Memora from authorized folder access, not documents the user must edit manually and not continuous filesystem watchers.

### Parent library

- On library open or Refresh, compare accessible child archive folders with the catalogue. Register an existing child manifest using its established Audio Source ID; validate conflicting/duplicate identities rather than choosing by folder name. Do not silently adopt an unrelated or malformed manifest.
- A newly discovered folder without an audio recording list is a proposed source. Ask whether to register it; after confirmation, inventory its eligible recordings, establish identities through the existing identity policy and prepare its recording list and parent catalogue reference. No transcription is required.
- A child manifest is authoritative for that source's recording inventory. The parent records child identities and manifest locations, not another copy of every recording.
- Preserve existing source identities. A renamed/moved source requires validated rediscovery or explicit reassociation; a matching name/content is insufficient. Flag absent/inaccessible children for review, retaining references instead of silently deleting them.
- Coordinate child-list and parent-catalogue persistence: never report both saved when only one succeeded. Detect interruption/concurrent replacement, retain pending work and allow a fresh reviewed retry without issuing replacement identities. Exact write/recovery contract is a prerequisite below.

### Individual audio source and transcript destination

- On source open or Refresh, enumerate all eligible audio within the agreed ownership boundary. Only selected recordings are transcribed; selecting one never limits the recording-list inventory to one.
- Enroll new recordings under the established embedded-ID/fallback-assignment policy. Changed recordings, conflicting IDs and confirmed-missing recordings require the applicable review/retention decisions. Neither paths nor content alone authorize identity reassignment or deletion.
- On transcript destination open or Refresh, reconcile eligible transcript files with its transcript file list, preserving Archive UUID, Recording IDs, model/operation alternatives, unknown extension data and transcript bodies. Legacy/foreign/conflicting metadata requires explicit resolution; do not relabel it from folder membership.
- Partial selections, cloud placeholders, read failures or permission errors do not prove deletion. Add only validated observations where safe; preserve unobserved entries and show incomplete coverage. The production apply policy must retain the prototype's blocking rules for read/provider errors and reviewed removals.
- With writable directory access, save approved updates directly using conflict checks. With file-input access, offer each updated JSON through Files, name its destination and retain pending-save feedback after cancellation/error. Sharing is not proof of placement: verify the next selected/read copy before declaring it current.
- Library/source views need visible inventory coverage, unresolved decisions, pending saves and Refresh. No background watcher or automatic cloud synchronization is promised.

Example: the user adds `All Audio Archives/New Journal/` with two audio files. On the next library open/Refresh, Memora proposes registering that child, inventories both recordings after confirmation, and prepares its recording list and the parent reference. Existing children remain independently usable. No transcript or embedding generation is involved.

## Ordered implementation and acceptance checkpoints

The library prerequisites below amend the old delivery order: shared audio resolution moves ahead of persistent Combine, while existing identity, preferred-transcript, edit, merge and portable-document contracts remain in force. Agreement on this plan does not mark any checkpoint implemented.

| Order | Deliverable | Required acceptance before continuing |
|---|---|---|
| 1. Finish contracts and disposable access check | Settle nested source ownership, eligible formats and output exclusions; parent filename/schema and optional library identity; relative-path rules; discovery scope; cancellation, conflict and interrupted multi-file-save behavior. Keep independent/outside-root archives supported. | Review the concrete contract. On disposable desktop and real iPhone/iCloud hierarchies, establish actual returned paths/files, coverage limits, save/reselection behavior and two-source access. Do not write test changes to the four real archives. |
| 2. Production complete-source reconciliation on desktop | Integrate the isolated planner/apply safeguards into source and transcript destination open/Refresh, with progress, review and pending-save state. | One selected transcription out of 120 audio files still produces a 120-record audio inventory; existing eligible transcripts are inventoried independently. Add an audio file, add/delete a transcript, refresh twice, cancel and retry, and interrupt a save. Stable IDs, idempotence, extension preservation, reviewed removals and unchanged audio/TXT bodies must hold. |
| 3. Mobile inventory and save pathway | Use actual folder-input coverage, explicit missing-list selection when needed and separate Save-to-Files actions. | Real iPhone/iCloud tests: partial selection, offline/provider failure, cancelled/repeated save and reread. No unobserved entry is removed, no false complete/saved status, and existing Search remains usable. |
| 4. Shared multi-source audio resolver | Search and Combine resolve Audio Source ID + Recording ID through validated child lists and source-specific access associations. Preserve other sources when adding one. | Two sources with identical audio basenames play the correct recordings; wrong folder, stale paths, conflicts and denied permission cannot select a substitute. Reuse associations where access survives; request only the affected source otherwise. |
| 5. Parent catalogue and discovery | Implement the agreed catalogue on top of child inventories/resolution; select a parent or register independent sources. | Add a new child with an existing list and one without a list; confirmation/refresh updates the right JSONs. Test moved/inaccessible children, duplicate source IDs, partial access and interrupted child/parent saves. No duplicate parent-owned audio inventory. |
| 6. Shared authoritative editing (architecture Phase 4) | Search and Combine share preferred-transcript selection and exact-file editing. | Both interfaces select the same candidate; higher/lower-model changes, operation separation, external modification and dirty-editor protections pass. Saving preserves identity and updates only affected derived Search data. |
| 7. Persistent Combine and imports (Phase 5) | Persist multi-archive reference membership, selections, order, title/settings and applicable draft state; implement reviewed Merge/import contracts. | Add recordings from two archives, play either, reopen and retain both references. Unavailable sources remain visible/unresolved; access prompts are source-specific. JSON catalogues alone do not provide workspace persistence. |
| 8. Portable exports and Output (Phase 6) | TXT/DOCX/HTML reference round trips and agreed presentation controls. | Metadata/identity round trips, readable static exports, import/merge, desktop/iPhone save flows and standalone HTML playback restrictions pass. |
| 9. Search scope/history and final regression | Complete agreed query-only history (Phase 7); specify and separately validate multi-archive/library Search scope using the same resolver. Finish Phase 8 audio/export regression gates. | Query-only retention/settings, no unrelated data deletion, supported per-archive/index configuration, two-source selection and full desktop/iPhone regression pass. Multi-archive Search is not assumed to exist merely because the catalogue exists. |

Resource checks apply throughout: measure folder-open, JSON parse/decode, reconciliation, cache restoration and peak-memory behavior on representative iPhone archives. Use bounded work and avoid unnecessary whole-library copies or model loading during inventory. A healthy matching Search index should not be regenerated just because a catalogue/source list is refreshed; preserve existing model/configuration/text validation. Do not clear IndexedDB or rebuild all embeddings as a routine prerequisite.

Immediate next work is checkpoint 1: a concrete contract and disposable device-access validation, followed by separately authorized, small implementation checkpoints. This documentation update changes no application code, build ID, JSON schema, user archive or filesystem layout.

## Approved interface changes — candidate 2026-11-18.4

The initial iPhone picker-defect report was withdrawn as a diagnosis: the user had confused the two JSON types and had not tried .2. There is no confirmed native iCloud picker defect or accepted device fix. The unfiltered picker is retained as a compatibility choice alongside strict bounded content/schema validation.

Approved names and messages:

- **Audio recording list:** select/save `memora-audio-source.json` in the audio folder.
- **Transcript file list:** select/save `memora-transcript-archive.json` in the transcription folder.
- Choosing the wrong list explains which document was selected and names the correct file/folder. The chooser remains open for retry/cancel; no file is converted or overwritten by selection.
- Both pending list-save buttons reuse the existing blue-halo/black-outline animation. Cancellation/error retains the pending state. Completed sharing clears only that artifact's emphasis; reduced motion suppresses animation. Share completion does not establish filesystem placement.
- New TXT headers place dates/duration, Whisper model/operation/optional language first, followed by a blank line and identity/provenance. Values, existing transcripts, audio and JSON schemas are unchanged.

Verification: **22/22** isolated Chrome integration groups passed. Direct comparison of transcription and translation headers confirmed identical metadata values and transcript body bytes after reordering. Actual iPhone wording, wrapping, picker and pulse acceptance remain pending. These changes do not implement the parent library or archive-wide reconciliation.

## Historical migration-copy and inventory findings (superseded by successful remigration)

The earlier investigation recorded the following; these availability constraints are superseded by the later successful four-archive migration and rebuilt indexes. Preserve this as evidence of that earlier snapshot, not current repair instructions.

The user clarified that migration was completed on Windows: `transcription1` retains the legacy files and `transcription` contains the migrated files. Those migrated folders remain unsynced on the Windows desktop and are unavailable while the user is away. The Mac/iCloud copies examined contain legacy headers; this is not evidence that migration failed.

Read-only Mac audit found 110 audio files in the Ashram source, 91 legacy transcripts in its main transcription folder, and only the recent one-entry source/transcript manifests. All 91 transcripts matched available audio uniquely by Recording ID. The source test entry's ID/size/SHA-256 matched, while the transcript list referenced the deleted test TXT and omitted the existing transcripts. A stored underscore/question-mark filename difference also broke one relative audio path despite matching IDs. No archive, audio, transcript or manifest was changed.

Do not replace these identities, rerun a migration against the originals, or promote the one-entry test UUIDs as the original migrated archive identities. A separate migrated **test copy** can be evaluated with explicit test identities; comparison with the original Windows manifests is still required for real-archive reconciliation. Archive-wide availability checking remains an application gap, independent of the sync discrepancy.

An isolated reconciliation prototype has passed 27 automated groups and the user's manual harness check, using synthetic data and disposable browser-private folders. That lab is held separately from the interface/header candidate. It is not production reconciliation or evidence of iCloud/mobile enumeration. Real multi-archive Search/Combine audio playback remains an acceptance priority; the current resolver still relies substantially on filenames/manual source selection rather than the proposed shared identity resolver.
