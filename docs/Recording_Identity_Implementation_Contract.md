# Recording identity implementation contract

**Library plan update — 18 November 2026:** The user agreed that opening/refreshing the library discovers child sources, opening/refreshing a source inventories all eligible audio independently of transcription selection, and new source registration is confirmed. Writable access saves approved changes directly; file-input access uses explicit JSON saves. Incomplete access never proves deletion. See [agreed maintenance and ordered checkpoints](Audio_Library_Architecture_Proposal.md#agreed-catalogue-and-recording-list-maintenance). First finish ownership/schema/access contracts, then production desktop/mobile reconciliation, shared multi-source audio resolution and parent discovery; resume shared editing, persistent Combine/imports and exports/history afterward. Parent schema and application implementation remain pending; this task authorizes documentation only. Four-archive remigration and rebuilt Search indexes are user-reported successful. iPhone Search worked after cache/reload and reopening; the crash cause is unconfirmed.


**Architecture pause — 18 November 2026:** Complete-source indexing, nested-folder ownership and a parent audio-library catalogue are under review. Read [Audio library hierarchy proposal](Audio_Library_Architecture_Proposal.md) before further indexing/Search/Combine changes. The user wants all audio in the managed source inventoried independently of transcription selection; the current selected-recording enrollment is not the agreed end state. No recursive implementation or archive reorganization is authorized yet.

**iPhone clarity candidate — 2026-11-18.3:** The user clarified that the wrong kind of JSON was selected; a native picker defect is unconfirmed and the earlier .2 update was not tried. Approved interface names are **Audio recording list** (`memora-audio-source.json`, in the audio folder) and **Transcript file list** (`memora-archive.json`, in the transcription folder). Wrong-kind selection now explains the correct file/folder without changing data. Pending list-save buttons reuse the existing subtle pulse, retain it after cancellation and clear it after completed sharing, respecting reduced motion. Device/visual acceptance is pending. These interface changes are committed in `22ec32d`; no agent deployment is recorded.

Database schema remains **6**; existing stores/model evidence are preserved. The new candidate writes `Recording ID` and accepts legacy `Voice Memo ID`; conflicting identities block affected operations. The broader persistent Combine redesign is still pending. No actual user archive/audio/database was used in automated verification. Earlier build/status/authorization statements below are historical where superseded here.

The [Combine architecture](MEMORA_COMBINE_ARCHITECTURE.md) and [Phase 1 contracts](MEMORA_COMBINE_PHASE_1_CONTRACTS.md) govern the broader plan. The [recording identity implementation contract](Recording_Identity_Implementation_Contract.md) governs current identity details and supersedes older design proposals. Sections 12–14 record isolated foundations; section 15 records production integration. Earlier design-stage authorization statements are historical.

## 1. Outcome and current implementation

Every transcript of the same source recording must reuse its Recording ID regardless of model, operation or transcript destination. Use a valid, supported embedded source identity when available. Otherwise reuse a previously established Memora assignment, or assign a cryptographic UUID once and persist it with the audio source. Never claim that a generated identity was embedded in audio.

Current interface/header candidate is **2026-11-18.4**, following committed checkpoint 3 (`4c8e5f7`). Source-owned identity is wired through transcription and delivery; universal `Recording ID` headers and legacy input compatibility are implemented. Earlier published/source checkpoint 2026-11-13.10 was Apple-only / Voice Memo ID. No deployment or real-device acceptance of the new candidate is recorded. Section 15 records the integration; section 16 and the library proposal define the current pause and picker retest.

All four migrated archives contain Apple Voice Memos and established Voice Memo IDs, now labeled Recording ID. Archived iMuse or historical Memora-assigned identities are not a user migration requirement; previous iMuse transcriptions were disposable. The disposable migration tool remains retired.

## 2. Separate identities and files

| Item | Meaning | Persistence |
|---|---|---|
| Recording ID | Individual source recording, shared across model/operation transcripts | Embedded metadata when present; audio-source list; transcript headers and transcript archive manifest |
| Audio Source ID | Collection managed by one audio-source list, normally its containing audio folder and covered subfolders | Audio-source list and existing readable transcript provenance |
| Archive UUID | Logical transcript archive, independent of audio location | Existing `memora-archive.json` and readable transcript metadata |
| Combined-recording provenance | iMuse parents, sources, segments and output identity | Read/preserve separately; never substitute a constituent source ID for the output Recording ID |

**Approved filename:** `memora-audio-source.json`, located in the selected audio-source root. Normally audio is beside it, so each relative path is just the recording filename. Covered subfolders may use paths such as `subfolder/memo.m4a`. Renaming a source folder while retaining its JSON does not change its Audio Source ID. A folder name never proves identity.

The four existing transcription archive JSON files remain unchanged by source-list establishment. They continue mapping Recording IDs to transcript-relative paths, model and operation. Do not add identityOrigin to them or to transcript headers. Different transcript archives may contain the same Recording ID and different Archive UUIDs.

Transcript destination must never own fallback audio identity. Do not generate new source or recording IDs merely because a destination lacks an archive manifest. New-transcript archive integration remains subject to its existing contract; do not silently rewrite existing manifests to repair a source-ID change.

## Transcript-folder reconciliation stage 1 — 19 November 2026

Candidate `2026-11-19.19` connects the shared reader/reconciler to Edit/Combine source opening. Transcribe and Search integration, shared Search records and combined iPhone JSON saving remain subsequent stages. The source reader returns parsed records from one root enumeration and one text read per File snapshot, with bounded manifest parsing and explicit read issues. The records also serve Combine sorting/export/editor preparation without another initial text read; a fresh source selection obtains new snapshots.

Existing headers/manifest establish archive and recording identity; reconciliation never assigns or replaces IDs. A missing manifest can be reconstructed only when the selected transcripts establish one consistent Archive UUID and usable recording/model metadata. Mixed archive identities, invalid JSON, conflicting references, unreadable/invalid transcript headers or unsuccessful inventory prevent manifest updates. These findings are shown separately while successfully parsed transcripts can still be viewed/combined. A failed enumeration leaves the previous source selected.

Successful complete native-root inventories remove absent immediate references and empty recording groups. Nested references remain outside the scanned scope. File-input is conservatively partial, retaining unseen references. Existing extension fields are preserved on surviving entries. Membership/model/operation changes can dirty the manifest; text-only edits do not. Unchanged manifests retain their original bytes and require no save.

Updates are deferred while this page has active transcription or pending completed TXT saves. Native persistence uses the same per-archive lock as append saves, rechecks original JSON bytes, verifies readback and keeps a retryable pending candidate on write/readback errors. Concurrently changed JSON is not overwritten. This is optimistic file concurrency protection, not a filesystem-wide transaction across TXT and JSON files. iPhone changes use Save Transcript File List with the intended folder and filename displayed before sharing; cancellation keeps the pending action, and completed sharing acknowledges only the current session's exact File object. Sharing cannot verify delivery/location. An unsaved pending Combine update must be kept or explicitly discarded before switching sources; it is session-local and not added to the audio-recovery database.

No transcript/audio files or embedding JSON are rewritten by folder reconciliation, and no model inference is required. See CURRENT_STATUS for synthetic verification and real-device acceptance boundaries.

## Local-copy Settings, retention and deletion — 19 November 2026

Candidate `2026-11-19.15` presents audio recovery data once as **Audio Recording List — Saved Local Copies**, separate from **Model Registry Cache**. The generic Other IndexedDB category is removed. Empty reserved semantic metadata is hidden without dropping its schema store; nonempty legacy data remains surfaced for explicit clearing.

The recovery store still has one current row per Audio Source UUID. UI grouping additionally combines rows only when directory handles prove the same folder, showing the latest row plus retained-pending-work indicators. Same names never prove association; distinct unresolved source identities remain separate. Verified native source read/write completion can prune older verified rows for that same folder, with a guard on the winning revision. Pending audio lists and pending transcript-list exports are never automatically pruned. Cleanup is attempted once per source session and cannot turn a verified save into a reported failure.

As of candidate `2026-11-19.17`, deletion uses checkboxes and Delete Selected, with explicit confirmation; individual row buttons are removed. Select All/Deselect All selects only deletable groups; Delete Selected replaces the separate all-inactive action. Active groups are protected both before and after confirmation. Multi-row deletion verifies every expected revision and commits atomically; a stale selection aborts the whole deletion. Browser-local removal does not remove audio, transcripts or JSON files in folders.

Successful sharing acknowledges exact payloads only. An acknowledged audio list is not reflagged merely by another persistence call. A matching shared transcript-list payload is removed from pending recovery, while a newer different pending export is retained. Failed recovery retries bind to current pending export data as well as manifest/state/base bytes.

Storage refresh initializes/reconciles Model Registry Cache from canonical configuration before counting it; View is read-only. Clear/delete actions refresh counts without immediately recreating cache data. Canonical definition fields are synchronized while unrelated extensions and historical validation/status are retained. Current model qualification and downloaded models are separate and are not deleted by cache controls. Registry-cache initialization failure still leaves storage inspection/deletion available. Real iPhone visual and share acceptance remains pending; synthetic coverage is recorded in CURRENT_STATUS.

## Authoritative saved lists and bounded inventory work — 19 November 2026

Candidate `2026-11-19.14` supersedes earlier requirements to resume a differing browser-local pending audio list when a valid saved audio JSON is selected. The selected valid JSON owns source/recording identity; stale pending audio data never forces a Resume choice or replacement of that file. Pending transcript-archive exports remain retained separately. If a valid folder JSON appears while an old Create/Replace/Resume decision is outstanding, the decision is cleared and that valid list is accepted. The obsolete audio pending-list dialog is removed. Invalid/unreadable documents still require explicit resolution; neither recovery storage nor databases are reset.

Coverage is a session observation. Current available/unverified/unresolved/removed counts are shown, while historical `sourceAvailability` fields are preserved without being edited or added merely because the device/access scope changed. Complete authorized root scans still prune absent entries; partial/file-input scans retain them. Consequently reopening unchanged membership does not create a portable JSON edit. Actual additions/removals still require normal direct desktop save or explicit file-input sharing.

Known-recording lookup uses validated indexes over source paths, Recording IDs and selected file paths. It does not clone, validate or serialize the entire manifest for each file. Newly inspected entries use compact identity planning with session-wide duplicate checks; complete manifests are validated before saving. Normal full-list serialization remains bounded to scan/persistence boundaries. Existing valid lists query their own recovery record rather than loading every source; file-input without a source identity loads no unrelated recovery archives. Identical persisted recovery records are not repeatedly staged. Unchanged source JSON is recognized before pending-write staging.

Scans yield by batch and report metadata/list preparation separately. Synthetic scale tests cover 1500 known recordings and 250 new entries, with zero per-record full-list serializations and no reads of known audio bodies. This is not a claim of measured Safari/iCloud memory limits, guaranteed large-folder completeness, or actual iPhone acceptance. Existing Restore criteria, durable write/readback, source JSON conflict checks, bounded header reads and transcript data preservation remain enforced.

## Restore visibility and action eligibility — 19 November 2026

Candidate `2026-11-19.13` supersedes the earlier general recovery chooser. Restore is offered and accepted only when all conditions hold:

1. Discovery establishes `absent` for the source JSON. A present valid/invalid/unsupported list, a denied or failed read, and file-input `not-included` do not establish absence.
2. A validated recovery record is associated independently by a browser-confirmed directory handle or established Audio Source UUID. Folder names, matching filenames and hashes never establish source association.
3. The current eligible files include a bounded-reader-confirmed `absent` embedded ID at a path whose entry in that associated recovery is `memora-assigned`. A backup containing only embedded IDs, no present matching fallback path, or no recordings is not a useful restoration candidate.

Only qualifying copies can appear in a Restore comparison. Valid current JSON is authoritative over older same-directory backups. Ineligible direct restore requests are blocked in the session layer, so hiding a button is not the only safeguard. Explicit Browse remains available for selecting an existing list; replacing a present list with a browsed copy retains confirmation. Present interrupted-write shells are not called missing.

Current iPhone/file-input access cannot prove JSON absence merely from omission and thus does not show Restore. This does not delete recovery records. Pending-list continuation is a separate workflow for an already-established source and is not a general Restore chooser. The source inventory/automatic desktop save/explicit iPhone sharing behavior remains unchanged.

## Save outcome diagnostic — 19 November 2026

Candidate `2026-11-19.10` retains the actual source-persistence outcome for the Source status: Saved and verified (native write plus readback), Already up to date (equivalent existing list), or Save required (prepared export). The selected root folder label and canonical audio-list filename are displayed; browser folder access does not expose a full absolute Finder/iCloud path. Native readback verifies the selected local file, not cloud synchronization. Saving progress is emitted at the native write boundary only. Retry dialogs and their cancelled outcomes preserve actual error name/message and target. The MacBook missing-file report is not reproduced or declared fixed; this diagnostic supports the user's next real-folder test. Restore visibility, Browse wording and transcript reconciliation remain separate pending changes.

## Simplified scan controls — 19 November 2026

Candidate `2026-11-19.9` removes the Cancel Scan UI. The source picker retains its native Cancel action; internal workflow cancellation and failed/interrupted-read protections remain. A reading status begins after folder selection. Save Audio Recording List is kept hidden until inventory, compilation and metadata/list display preparation finish, then uses the existing pending-save highlight. Failed/cancelled selection restores the prior pending action. This supersedes earlier references to a user-facing Cancel Scan control.

## Source controls — 19 November 2026

Candidate `2026-11-19.8` removes the dedicated Refresh Source button. Reselect the source folder to reread it. For file-input/iPhone access, the source row now contains **Save Audio Recording List**, shown immediately when a compiled JSON needs saving. It uses the existing pending-save pulse and outline, retains them on cancellation and clears them after completed sharing. The status appears under the source row. A saved unchanged list needs no new save, and writable desktop access still saves automatically. This supersedes earlier references to a dedicated Refresh Source control.

## Fast audio membership policy — 19 November 2026

The user's subsequent approval supersedes audio-edit detection and retained-missing-root-entry rules below. Build `2026-11-19.7` tracks current source membership, not edits to audio contents. Known exact paths reuse saved Recording IDs/origins without reading identity headers or hashing payloads. New paths use bounded identity metadata reads and the established embedded/fallback identity policy. Duplicate/ambiguous paths and identities remain explicit conflicts; names are not used to associate different sources or deduplicate recordings.

`audioFingerprint` is now optional in version 1. Existing valid fingerprint fields and their extensions are preserved as historical information, but production inventory/transcription preparation neither recomputes nor uses them to detect audio edits. New entries omit the field instead of inventing a digest. The low-level optional verification path and its historical tests remain isolated from the production UI. Old manifests remain readable by the current version; older builds that required fingerprints may not read newly enrolled entries without them.

A successfully enumerated/inspected writable root removes entries for absent immediate audio paths. Partial, skipped, cancelled, provider-failed or file-input coverage cannot authorize pruning. Previously catalogued nested entries outside the immediate-root scope remain unverified. A returned file is enrolled anew: embedded IDs persist naturally; a removed Memora fallback ID is not recovered by name or digest. Source pruning never deletes audio, transcripts or transcript-archive references. Availability statuses remain accepted for older manifests, but complete scans now remove absent root entries instead of writing `missing`.

Routine source listing also avoids full-file Web Audio decoding for non-M4A duration: HTML media metadata is requested with cleanup of its temporary URL. This is browser/provider metadata access, not a guarantee that every format/provider fetches only a fixed number of bytes. Actual transcription still decodes audio as needed. Saved identity origin supplies metadata context without pretending its headers were reverified.

The production source scan below and older fingerprint/identity-mutation rules are historical where they conflict with this policy. Transcript content-change detection and archive reconciliation are separate and are not relaxed by this audio-only decision.

## Production source inventory — 19 November 2026

Build `2026-11-19.6` implements the user's subsequent approval to maintain the audio recording list on source open/Refresh, independently of transcription selection. This supersedes older selected-recording-only enrollment descriptions for the audio source. Parent catalogue, transcript destination reconciliation and recursive source ownership remain separate work.

Both directory and file-input access inventory eligible audio immediately inside the selected source folder. Nested audio is excluded, and previously stored nested entries remain unverified. File-input Refresh requires folder reselection. Scans inspect IDs and fingerprints sequentially, show progress, and support cancellation before the final native write. Read/provider errors block partial publication. Existing identity choices apply to changed audio; Skip preserves incomplete coverage. Approved missing entries are retained rather than removed.

Version 1 adds optional entry `sourceAvailability: {"status": "available"}`. Allowed statuses:

| Status | Meaning |
|---|---|
| `available` | The entry's selected audio was inspected and its identity resolved during this scan. |
| `missing` | Its immediate-root path was not observed after successful writable-folder enumeration and inspection. This does not delete its identity or prove permanent physical deletion. |
| `unverified` | Not observed within accessible scope: partial/file-input access, skipped scan coverage, or a nested entry outside the root inventory. |
| `unresolved` | The path was observed but the user skipped resolving its identity. |

Old manifests without this optional field remain valid; unrelated fields and nested availability extension fields survive. Availability is an observation, never an identity-matching key. A read failure is not a completed inventory. No transcript references are removed or rewritten by these scans.

Desktop saves changed JSON through durable staging and readback; equivalent JSON is not rewritten. File-input publishes a changed JSON for explicit sharing only after successful scan completion; selecting an identical already-saved copy does not request another export. Model inference is never started by inventory. Transcription rechecks source/audio state before delivery. Synthetic verification is recorded in CURRENT_STATUS; real iPhone/iCloud and representative performance acceptance remain pending.

## 3. Audio-source JSON schema, version 1

Core fields, origin values, fingerprint structure and optional recovery reason below were approved incrementally by the user. Technical validation details and lifecycle recommendations in subsequent sections are the implementation proposal, not evidence of implemented behavior.

Illustrative document (digest placeholder must be replaced by an actual 64-digit SHA-256 hex digest):

```json
{
  "schemaVersion": 1,
  "audioSourceId": "15d91f9a-735e-4d73-a6b6-427140869795",
  "recordings": [
    {
      "audioRelativePath": "memo.m4a",
      "recordingId": "A9BB039E-11D1-4EEA-83DE-24F9C179C0CE",
      "identityOrigin": "apple-embedded",
      "audioFingerprint": {
        "algorithm": "sha256",
        "byteLength": 1234567,
        "digest": "<64 hexadecimal digits>"
      }
    },
    {
      "audioRelativePath": "subfolder/essential.wav",
      "recordingId": "12345678-1234-4234-8234-123456789abc",
      "identityOrigin": "memora-assigned",
      "audioFingerprint": {
        "algorithm": "sha256",
        "byteLength": 7654321,
        "digest": "<64 hexadecimal digits>"
      },
      "identityRecovery": {
        "reason": "invalid-embedded-metadata"
      }
    }
  ]
}
```

| Field | Required meaning |
|---|---|
| `schemaVersion` | Integer 1. Unsupported versions are not silently interpreted or downgraded. |
| `audioSourceId` | Stable source UUID; reuse validated established provenance where available, otherwise generate once for a genuinely new source. |
| `recordings` | Array of recording entries. Never use an object keyed by unchecked filenames. |
| `audioRelativePath` | Path relative to this source root, normally filename only; locates a file, does not prove its identity. |
| `recordingId` | Standard hyphenated UUID. Preserve embedded Apple/iMuse value, including spelling/case. Newly generated values use browser cryptographic facilities; no timestamp/random-string fallback. |
| `identityOrigin` | `apple-embedded`, `imuse-embedded`, or `memora-assigned`. Mandatory for every new entry; no inferred origin from UUID shape. |
| `audioFingerprint.algorithm` | Literal `sha256`. |
| `audioFingerprint.byteLength` | Nonnegative safe integer: complete audio-file size in bytes. |
| `audioFingerprint.digest` | SHA-256 of the complete file bytes, 64 hexadecimal digits. New output should use lowercase digest text. |
| `identityRecovery` | Optional, only for explicit Memora assignment following unreadable embedded identity. |
| `identityRecovery.reason` | `invalid-embedded-metadata` or `unsupported-embedded-metadata`. Omit for ordinary assignment when embedded identity is absent. |

Fingerprints are optional historical information under the fast audio membership policy above. If present, their structure is validated and their data preserved. They are never a Recording ID, global match key or cross-source deduplication mechanism. Do not alter the audio to add a Memora ID.

Do not add Archive UUID, transcript text, model/operation, device handles or transcript destinations to this minimal source schema. Transcript paths remain in transcript archive manifests. This is the recommended minimal separation; any later reverse links to transcripts require a separate concrete need and review.

### Validation recommendations

- Parse into temporary memory, validate fully, then offer mutations. Preserve accepted unknown fields at every level; do not execute them or merge unchecked keys into prototypes.
- UUID syntax follows the iMuse v1 contract's hyphenated 8-4-4-4-12 hexadecimal representation. Do not impose UUID-v4-only restrictions that reject existing Apple values. Compare UUID identity case-insensitively while preserving source text on output. Explicitly test case-only differences.
- Require unique unambiguous relative paths. Reject absolute paths, traversal, empty paths, control characters and paths outside the selected source root. Use `/` for new serialized path separators. Detect collisions introduced by normalization; never silently overwrite one entry with another.
- Do not collapse duplicate Recording IDs at different paths automatically. Stage a clear ambiguity for review; cross-folder/copy deduplication is excluded. Exact policy for multiple paths intentionally sharing one UUID must be finalized before validator implementation.
- Validate origin/recovery combinations. Recovery implies `memora-assigned`; malformed fingerprint data is invalid list data, not permission to skip change detection. A later valid embedded identity removes the active recovery flag only after any required confirmation; preserve unrelated extension data.
- Bound JSON input, entry count, path/extension lengths and fingerprint memory/time. Exact constants require a documented technical choice and representative measurements; none are approved release limits yet. Check file size before whole-file allocation. Do not reuse the 4 KiB embedded-payload bound for an entire source list.

## 4. Embedded readers and metadata boundaries

Read `../iMuse/docs/recording-identity-export.md` and `../iMuse/js/recording-identity.js` from the sibling checkout before implementation. The user reports successful iMuse device testing. That is exporter evidence, not Memora reader acceptance.

| Container, detected by signature | iMuse storage |
|---|---|
| M4A/MP4 | Top-level UUID box, user type `91c3892e-57a4-4f78-a983-3a19947c9c01` |
| WebM | SimpleTag `IMUSE_RECORDING_METADATA` |
| Ogg Opus/Vorbis | Comment `IMUSE_RECORDING_METADATA` |
| RIFF WAVE | `imID` chunk, respecting RIFF padding |

Payload: UTF-8 JSON `{"format":"imuse-recording","version":1,"recordingId":"…"}`, at most 4 KiB. Validate format, numeric supported version, UUID, structural bounds and all occurrences. Duplicate iMuse identity metadata, even identical copies, is an error. Unsupported/incomplete containers are not proof of absent metadata. Do not search arbitrary audio bytes for a UUID and claim it was metadata.

Continue recognizing Apple's `voice-memo-uuid` convention. Audit the current marker/context scan for bounds and ambiguity while preserving known Apple compatibility. Keep `recordingId` separate from legacy Apple `uuid` semantics. In particular, an iMuse UUID must not cause the Apple-specific MP4 recording-date inference to apply.

Reader results must distinguish valid, absent, invalid, unsupported and conflicting identity information, with safe user-facing reasons. Metadata errors are not inference/model failures. Identity inspection is read-only and generates no IDs.

If both Apple and iMuse conventions are present and agree, use the ID without fabricating a conflict. The single-origin schema needs a documented deterministic origin representation for this unusual dual-convention case; this remains a small technical decision, not permission to silently discard conflicting evidence. If they disagree, neither convention has approved priority over the other: do not choose one automatically. The explicit valid-embedded-versus-JSON precedence rule does not settle competing embedded IDs.

Combined provenance remains independent. Check its output ID against the portable identity; do not take a source/segment ID as fallback identity. iMuse reference readback does not itself enforce combined-ID agreement (the writer does). Conflicting or unsupported provenance must be reported without destroying it. The permissibility of explicit recovery for multiple valid embedded IDs or a combined-output conflict remains to be specified; do not extend the unreadable-metadata recovery rule silently.

## 5. Resolution rules and state transitions

Resolve within the selected source, independently of transcript destination. All dialogs refer to the affected audio by name. Cancellation leaves source JSON, audio, existing transcripts and existing durable state unchanged. A skip affects the current recording; final batch-cancel semantics should follow existing Memora behavior and must be stated in the implementation review.

| Observed state | Required action |
|---|---|
| Valid embedded UUID, no source entry | Stage an entry with that UUID, detected origin and current fingerprint. |
| Valid embedded UUID matches entry | Reuse it. Changed bytes alone do not require a new UUID. Refresh fingerprint through safe persistence; preserve unrelated fields. |
| Valid embedded UUID differs from entry | Embedded ID is authoritative, but require approved confirmation before updating the source list. Cancel makes no change; do not silently continue saving under the old ID. Existing transcripts/archive manifests remain unchanged. |
| No embedded identity, existing unchanged entry | Reuse the established ID; do not regenerate per model, operation, run or destination. |
| No embedded identity, no established entry | Assign one cryptographic UUID and stage origin `memora-assigned`, with fingerprint. Persist before first transcript save subject to the explicit file-input exception below. |
| No readable embedded identity, bytes changed at catalogued path | User selects Keep existing ID, Assign new ID or Cancel. Either confirmed choice records the current fingerprint. Explicit recovery rules still apply if metadata is unreadable rather than absent. |
| Invalid/unsupported embedded identity, no applicable saved recovery | Explain actual reason; offer Assign new Memora ID, Skip or Cancel. Explicit assignment records recovery reason and fingerprint; it neither repairs audio nor claims embedded identity. |
| Same unchanged bytes and saved recovery; embedded identity still unreadable | Reuse the recovery ID without repeating the same warning. Still attempt current reader interpretation, so future support can discover an embedded UUID. |
| Later reader finds valid embedded ID after recovery | Apply ordinary embedded-ID precedence and mismatch confirmation. If same ID, reconcile origin/recovery state without inventing another identity. |
| Source list or established source IDs conflict | Resolve explicitly; never substitute a folder-name match or generate a new source ID to hide disagreement. |

Fingerprint processing: compare byte length first; when size matches, compute/compare SHA-256 before relying on unchanged bytes. A different length already proves a change, but compute the new digest before committing an accepted decision. For embedded IDs, re-read metadata even when a previous fingerprint matches; cached recovery must not bypass a newly capable reader. Hashing must not decode/re-encode audio. Hash results must correspond to the same selected file snapshot used for identity inspection and transcription; revalidate a mutable handle before source commit. Avoid repeated full-file hashing within one unchanged operation.

Do not assign persistent IDs while merely listing audio or sorting by date. Assignment is an explicit create-list/transcription/recovery action. An implementation may catalogue selected recordings incrementally; full-folder eager hashing versus incremental enrollment is an outstanding technical choice, not a requirement to scan every file before any transcription.

## 6. Source-list discovery, creation and restoration

1. Inspect the selected source root for `memora-audio-source.json` when the access mechanism permits it. Distinguish found, confirmed absent, not included in selection, permission denied and read failure.
2. If found, fully validate without changing it. It is a source identity record even if every audio file has an embedded UUID.
3. If access cannot establish whether it exists, ask Select existing JSON / Create new list / Cancel. Do not assume a picker that hides JSON proves absence. Use an explicit JSON picker if the existing directory selection omits it; preserve the current audio selection.
4. If missing and a reliably matching local recovery copy is available, offer restoration. Matching folder names alone are insufficient. Technical recommendation: use a validated existing Audio Source ID or a browser-confirmed same directory handle where available. Do not infer a source association from a single matching audio digest. If evidence cannot establish the match, do not offer automatic restoration; proceed through the approved existing/new-list choice. No move/copy tracking is required.
5. Creating a genuinely new source generates one Audio Source ID. When validated associated transcript provenance already establishes an Audio Source ID, reuse it. Current user archives contain Apple IDs; source-list establishment reads those embedded IDs rather than needing historical Memora-ID recovery. Do not crawl arbitrary transcript archives or restore a migration utility.
6. If the source JSON and associated transcript headers give different Audio Source IDs, explain the evidence and require the user to select the correct association or cancel. Do not change existing transcripts or automatically generate a third ID. Exact association-selection UI remains to be designed with concrete candidate labels; raw unexplained UUIDs are insufficient.
7. Invalid/unsupported list JSON is left untouched. Offer another copy, a valid reliably matching local copy when available, or Create replacement list. Replacement requires a separate explicit overwrite confirmation. Reuse readable embedded IDs and assign new IDs where none are available. No requirement to recover historical assignments from an unreadable list.

**Excluded:** special protection for a deliberately deleted list or audio moved/copied without it. The user accepts that such recordings without embedded identity may receive new IDs. Do not implement cross-source deduplication, filesystem tracking or speculative recovery warnings. This exclusion does not remove detection of changed audio at an already catalogued path.

## 7. Persistence, concurrency and truthfulness

### Writable source-directory flow

Approved requirements:

1. Validate and retain the original JSON/byte state before staging an update. Preserve unknown fields and entries not involved in the operation.
2. Recheck the file immediately before writing. Content comparison/digest is required; modification time alone is insufficient. If changed by another tab/program, withhold overwrite and ask the user to reload. No automatic last-writer-wins merge.
3. Write/close and read back/validate expected contents before reporting success. If new fallback identity cannot be persisted, withhold saving its first authoritative transcript. Keep an already produced transcript available for retry/recovery; do not rerun inference solely because identity persistence failed.
4. Existing audio, transcript bodies and four migrated archive manifests are never changed by these source updates. Source-ID reconciliation does not silently relabel historical transcripts.

Technical recommendation: coordinate app-owned source writes under a per-source lock and serialize commits. Stage the complete validated document; use the existing storage owner for actual I/O. Do not claim a filesystem-wide atomic transaction across source JSON, audio, transcript and archive manifest. A read-before-write check does not eliminate external-program races. Exact interrupted-write/recovery strategy must be documented and tested before implementation acceptance. Do not introduce unapproved permanent sidecar/backup formats casually.

Persist source identity before transcript delivery. If a later transcript write fails, the source assignment remains and is reused on retry. Cache or retain a staged UUID across retries rather than generating a fresh one. Re-read/validate the archive contract before adding new transcript references; do not change its key semantics.

### File-input/iPhone flow

Use the established readable file-input descriptor and share/save transport. Capability branches also apply to desktop file-input users; do not classify solely by device name. File input supplies readable Files, not writable source handles.

- Retain the assigned ID and updated source-list payload durably in browser-local recovery storage before offering dependent transcript delivery. The source JSON is offered using the established save/share flow, with clear instruction to save it beside the audio.
- A completed share request proves neither destination nor actual filesystem save. Do not label source persistence verified. Later user selection/readback can establish that the saved JSON exists.
- Do not block essential iPhone use waiting for impossible filesystem verification. Keep explicit Save-to-Files action and pending state; cancellation/errors preserve pending list and transcript artifacts and reuse IDs on retry. Precise ordering/grouping of source JSON and transcript save actions must be mapped to existing controls before implementation; do not redesign sharing or imply one destination applies to both source JSON and transcript files.
- Browser-local copies have no automatic expiry, remain separate from 24-hour transcript cache and support explicit removal. Do not silently clear them with transcript expiry/cleanup. Browser clearing/eviction can remove them; no guaranteed permanent storage claim.
- Do not mention local retention in ordinary save guidance. Surface recovery only when a matching copy can actually be restored. If no valid copy exists, permit a new source JSON under the approved create flow.
- If durable browser storage fails, do not invent successful persistence or a fresh ID on retry. The exact usable export/recovery path for this failure remains to be specified; preserve generated text and staged identity in the current session while reporting the limitation.

All new browser persistence must use `database.js`, the sole schema owner. Any additive source-recovery store/version increment is an implementation proposal requiring schema review. Preserve existing stores and filename key paths; do not clear semantic/model history or silently convert legacy cached records into source identity evidence.

## 8. Prompt contract

Explain the affected file, the evidence, choices and effects in plain language. Render names as text, never trusted HTML. Cancel is non-mutating. Present actual invalid/unsupported reason. Do not suggest checking for a software update; no available update has been established. Prompts below were approved unless marked as wording still to finalize.

### Cannot establish whether a source list exists

> **Does this audio folder already have a Memora recording list?**
>
> If you previously saved `memora-audio-source.json` for this folder, select it so Memora can reuse its recording IDs. If this is the first time, create a new list.
>
> **Select existing JSON** · **Create new list** · **Cancel**

### Changed audio at an existing path, no embedded identity

> **This audio file has changed**
>
> “memo.wav” differs from the file previously recorded in Memora’s recording list.
>
> If it is an edited version of the same recording, keep its Recording ID. If it is a different recording, assign a new ID. Existing transcripts will remain unchanged.
>
> **Keep existing ID** · **Assign new ID** · **Cancel**

### Valid embedded ID differs from JSON

> **The recording IDs do not match**
>
> “memo.m4a” contains a different Recording ID from the one in Memora’s recording list.
>
> The valid ID embedded in the audio takes priority. Updating the list will use that ID for future transcriptions. Existing transcripts will remain unchanged.
>
> **Update recording list** · **Cancel**

### Unreadable embedded metadata

> **Memora cannot use this recording’s ID**
>
> The ID information in “memo.m4a” is damaged.
>
> You can assign a new Memora Recording ID and continue. It will be saved in the recording list for reuse. The audio file and existing transcripts will remain unchanged.
>
> **Assign new Memora ID** · **Skip recording** · **Cancel**

For unsupported metadata replace the diagnosis with “The ID information in ‘memo.m4a’ uses an unsupported format.” Do not conflate absence with damage. Adapt persistence-success wording to the platform without claiming verified save.

### Missing JSON with matching recovery copy

> **Restore this folder’s recording list?**
>
> Memora has a saved copy of the recording list for this audio folder. Restore it to reuse its Recording IDs.
>
> **Restore recording list** · **Cancel**

### Create a list

> **Create a recording list**
>
> Memora will reuse readable IDs embedded in your audio and assign new IDs to recordings without one. Your audio and existing transcripts will remain unchanged.
>
> **Create recording list** · **Cancel**

### Unreadable source-list JSON

> **Memora cannot read this recording list**
>
> “memora-audio-source.json” is damaged or uses an unsupported version. The existing file will not be overwritten unless you choose to replace it.
>
> **Select another copy** · **Create replacement list** · **Cancel**

Show only the actual diagnosis. Add Restore saved copy only if valid and reliably matched. The replacement option is approved; this combined final wording was consolidated here rather than separately approved word for word.

Replacement confirmation:

> **Replace this recording list?**
>
> Memora will reuse readable IDs embedded in the audio and assign new IDs where none can be read. The existing recording list will be replaced. Your audio and existing transcripts will remain unchanged.
>
> **Replace recording list** · **Cancel**

An unreadable embedded-ID recovery still needs explicit consent; choosing replacement of a source list is not blanket consent to bypass all embedded errors. On file-input systems deliver a replacement file and explain manual placement, rather than claim Memora overwrote the original.

### iPhone source JSON guidance

> **Save this folder’s recording list**
>
> Save `memora-audio-source.json` in the audio folder so Memora can reuse its Recording IDs.

This implements the approved removal of the local-retention sentence; final control placement and action label remain UI design. Do not use a “verified saved” success message after sharing.

Source-ID conflicts, concurrent-change/reload, write/readback failures and unavailable local persistence still need concrete prompts once their technical flow is mapped. Follow the same plain-language/unchanged-files principles; do not ask users to select unexplained UUIDs.

## 9. Minimal implementation map (proposed, not authorization)

| Responsibility | Existing location / intended scope |
|---|---|
| Container identity reader | `js/metadata.js` integration with a small focused read-only module if helpful; do not import iMuse's writer into production or depend on sibling files at runtime. |
| Source-list schema and resolution | Focused pure module(s), names to select during review; separate parsing/validation, identity decisions and I/O. Avoid a framework. |
| Source selection/listing | `js/app.js`, `js/storage.js`, `js/transcriptionUI.js`; inspect source list without assigning UUIDs during date sorting. |
| Transcription/save orchestration | `js/app.js`, `js/transcription.js`; resolve/source-persist identity without changing inference parameters, date/duration or paragraphing. Preserve completed inference on later identity/save failure. |
| File I/O and sharing | Existing `storage.js` and transcription save controls; no new competing transport or general sharing refactor. |
| Durable recovery | Additive `database.js`-owned storage if necessary; storage reporting/removal must distinguish it from transcript expiry. Review exact `storageManager.js`/Settings touchpoints before editing. |
| TXT writing/parsing | `app.js:buildTranscript`, `combine.js:parseTranscriptFile`; write Recording ID, accept legacy Voice Memo ID, validate disagreeing dual labels. Header-only metadata handling must not rewrite body bytes. |
| Existing consumers | Audit `combine.js`, `html.js`, `docx.js`, `search.js`, `semantic.js` and editor paths for label/property compatibility. Only identity propagation/rendering compatibility; no new Search/Combine behaviors or ranking. |
| Tests/docs/build | Isolated browser fixtures following current conventions; documentation evidence. Build update only after actual application changes are authorized, following build-versioning.md; never reuse withdrawn 2026-11-16.1. |

Current source uses Apple-specific `metadata.uuid`/`voiceMemoId`. Introduce universal internal `recordingId` semantics without making legacy readers silently lose values. A temporary compatibility alias, if needed, must not assert that every ID came from Apple. Audit all saves/exports/editor callbacks, not just the first TXT writer.

Preserve first-line filename, existing date/duration/model/operation/language fields, transcript-relative Audio Relative Path and readable Metadata version/Archive UUID/Audio Source ID/Original Audio Folder contracts. No origin field in transcript headers. Do not recreate opaque individual JSON metadata lines or use parsing that trims bodies for a lossless header rewrite. Existing inference output/body normalization stays unchanged for newly generated transcripts.

## 10. Acceptance matrix

Tests must assert identity results and non-mutation, not merely that a function returns. Use synthetic/private test sources; do not write to the user's four archives or audio. Existing iMuse device success does not replace desktop/real-iPhone Memora testing.

| Area | Required cases and evidence |
|---|---|
| iMuse readers | Real exporter-produced M4A/MP4, WebM, Ogg Opus/Vorbis and WAV fixtures; filename-extension mismatch, repeated export, UUID unchanged across renames; structural bounds, metadata size boundaries and truncated containers. |
| Embedded validation | Invalid UTF-8/JSON/UUID, wrong format/version, zero/oversized payload, duplicates including identical entries, unsupported container distinct from confirmed missing metadata. |
| Apple compatibility | Known Apple fixture values preserved exactly; case-only comparisons; dates/duration unchanged; no Apple recording-date assumption for iMuse identity. |
| Combined provenance | Output ID agrees; source/segment IDs remain separate; mismatch reported, no provenance alteration or silent recovery. |
| Source schema | Valid core/fingerprint/recovery entries; version/type/path validation; normalization collisions; bounds; unknown fields round-trip; invalid lists not overwritten before explicit replacement. |
| ID reuse | Repeat transcribe/translate and different models/destinations reuse source UUID; a missing transcript manifest does not create a new source identity. |
| Embedded precedence | Match, mismatch confirm/cancel, same/different UUID discovered after saved recovery; no automatic historical transcript relabeling. |
| Fingerprints | Same bytes; different size; same size/different content; embedded ID remains authoritative after byte change; no-ID keep/new/cancel; confirmed decisions refresh evidence. |
| Recovery | Invalid and unsupported explicit assignment, skip/cancel, saved unchanged recovery avoids repeated warnings; later capable reader still runs. No unsolicited update prompt. |
| Source discovery | Present, confirmed absent, JSON filtered from picker, denied permission/read failure; never infer absence from inaccessibility. Valid local restoration only with reliable source evidence; wrong same-name source rejected. |
| Source IDs | Reuse established Audio Source ID via validated association; new source generates once; conflicts resolved explicitly/cancelled without historical edits. |
| Write safety | External changes before commit, concurrent app writes, interrupted writes, close/readback failure, denied permission/quota; no false success or lost preserved fields. Retrying preserves staged UUID. Document external filesystem race limit. |
| iPhone/file input | Existing selection/source state survives; pending JSON/transcripts and IDs survive share cancellation/error; truthful completed-share status; later saved-file selection/readback; actual iPhone Save to Files acceptance without claiming destination verification. |
| Browser retention | No automatic expiry; transcript cache expiry/clear does not silently delete source recovery; explicit removal; storage failure handled honestly; reload reuse after committed local recovery. |
| Transcript compatibility | Recording ID output; legacy label input; disagreeing dual labels reported; origin absent from headers; unknown metadata/body bytes preserved during edits; filenames unchanged. |
| Regressions | Inference options/paragraphing/transcript content, date/duration, desktop save and iPhone share behavior, old IndexedDB records, semantic/model evidence and historical archive bytes remain intact. |

Excluded tests/features: global content matching, copy/move tracking, recovery of a deliberately deleted list from unrelated archives, migration tooling, unrelated Search/Combine phases.

## 11. Resume checklist and approval boundary

The core JSON schema, per-entry origins, all-entry fingerprints, recovery reasons, changed-path choices, safe-write principles, source-ID reuse/conflicts and prompt behaviors above are agreed. Do not ask for them again.

Before coding, close only the remaining concrete technical items:

1. Map the exact local recovery storage/key and reliable source-match evidence, source-list enrollment timing and JSON/hash limits. Confirm fingerprint implementation can handle realistic large audio without a new unreviewed dependency or unbounded allocation.
2. Specify dual embedded-convention origin handling, valid embedded/provenance conflicts and duplicate-ID/multiple-path policy. These edge cases are not decided by the generic unreadable-ID fallback.
3. Map existing UI/I/O for staged identity, source JSON save/replacement, transcript delivery, cancellation, write failures and local-store failures, including the iPhone no-verification exception. Supply missing prompt wording only where needed.
4. Describe interrupted/concurrent-write recovery without overclaiming atomicity or introducing unreviewed permanent files. Identify any required additive database migration and cleanup/reporting changes.
5. Review the concrete affected files and acceptance scope with the user, one question at a time if a user decision is required. **Wait for explicit application implementation authorization.**

No application code, build, database, audio or actual archive was changed by creating this document. No implementation tests were run. The next deliverable is the remaining technical design/implementation review, not a migration utility or deployment.

## 12. Stable checkpoint 1 — isolated embedded identity reader

17 November 2026. The user explicitly authorized only step 1 of the staged plan: reader, source JSON, transcription integration, then device acceptance. Step 1 is complete as an isolated module. **Stop here; step 2 requires the user's go-ahead.** No commit or deployment was performed. The source working tree contains this checkpoint; it is not a published release.

### Files and API

- `js/recordingIdentity.js`: exports `readEmbeddedRecordingIdentity(blob)`. Not imported by any production entry point. It has no audio decoding, UUID generation, writes, storage or UI dependencies.
- `tests/recording-identity.html` and `.test.js`: focused browser harness; synthetic fixture helpers in `recording-identity-fixtures.js`.
- `tests/fixtures/imuse-recording-identity.json`: six committed byte fixtures produced by the actual sibling iMuse exporter, with exporter/provenance-codec SHA-256 source fingerprints. Five container/codec variants plus M4A containing actual iMuse provenance. Runtime tests need no sibling checkout.
- `tests/run-recording-identity.mjs`: dependency-free Node 22+ test runner; `--browser` uses isolated Edge and localhost; `--generate-fixtures` reads the sibling exporter and regenerates only the test fixture JSON.

Result shape:

```js
{
  status: 'valid' | 'absent' | 'invalid' | 'unsupported' | 'conflicting',
  container: 'mp4' | 'webm' | 'ogg' | 'wav' | null,
  recordingId: 'source UUID' | null,
  identityOrigins: ['apple-embedded', 'imuse-embedded'],
  evidence: [{ recordingId: 'source UUID', origin: 'imuse-embedded' }],
  issues: [{ status: 'invalid', code: 'invalid-uuid', message: '…' }],
  combinedProvenance: null // or unchanged parsed provenance, separate from identity
}
```

The displayed origins array illustrates possible values, not mandatory presence of both. Resolved `recordingId` is non-null only for `valid`; error evidence must never be used as automatic fallback. Issues retain distinct causes. Overall precedence is conflicting, then invalid, then unsupported; otherwise evidence yields valid and no evidence yields absent. Read failures produce an invalid result, not a thrown workflow/model error. No IDs are invented.

Apple parsing is structural: `moov`/`udta`/`meta`/`ilst` freeform `----` items with `name = voice-memo-uuid`, supported UTF-8 data and the expected iTunes namespace where provided. It preserves original case, compares UUID values case-insensitively, detects duplicates and avoids nearby UUID guesses or scanning `mdat`. This convention passed the actual bundled Apple Voice Memo. Other undocumented Apple storage conventions are not claimed supported; wider device/archive samples remain an integration gate.

iMuse readers use signature detection, 4 KiB identity bounds, structural lengths, UTF-8/JSON/version/UUID validation and duplicate detection. MP4 supports ordinary/extended/open-ended boxes. WebM supports known/unknown Segment and Cluster sizes, requires WebM DocType and rejects unsupported segment CRC processing. Ogg supports Opus/Vorbis comments including multi-page packets and verifies the complete page chain/checksums; chained/multiplexed streams are conservatively rejected. A structurally incomplete stream never resolves a valid ID merely because earlier tags were readable. WAV respects RIFF length and padding. The metadata/comment bound is 1 MiB, nesting bound 8 and structural element bound 1,000,000; these are reader implementation limits, not source-JSON limits.

Agreeing dual Apple/iMuse IDs preserve both origins; disagreeing IDs resolve to conflict. Choosing a single origin for the future JSON remains a later adapter decision. Combined provenance is bounded, parsed and retained independently; supported envelope/output ID and agreement are checked. This is not a full semantic validator of combined timelines, sources or sample counts. Combined provenance alone never supplies a Recording ID.

### Validation evidence

**21/21 focused groups passed in Node v24.22.1 and isolated Windows Edge.** Node was provided by installed VS Code's Electron runtime (`ELECTRON_RUN_AS_NODE=1`), with native Blob/TextDecoder/File APIs. Browser execution used a temporary profile, a localhost read-only fixture server, and an explicit asynchronous completion report. Initial restricted-process Edge startup failed before tests; the final isolated run outside that subprocess restriction passed. No real user profile/database or actual archive was tested or modified. No iPhone acceptance is claimed.

Coverage includes all supported containers/both Ogg codecs; misleading names/MIME; missing/unsupported identity; exact Apple case; non-metadata UUID traps; agreeing/conflicting dual origins; identical duplicate entries; malformed UTF-8/JSON/UUID; unsupported versions; zero/4 KiB/oversized payloads; later valid metadata not hiding an earlier error; Apple field ambiguity; MP4 length variants; separate provenance/mismatch; WebM unknown sizes/duplicate tag values/DocType; WAV padding/truncation; large Ogg comments/lowercase keys/checksum/truncation/unfinished chains; deterministic non-mutating reads; bounded file reads and I/O failure; actual iMuse export fixtures; bundled real Apple metadata. Fixture generation also verified repeated export idempotence and iMuse provenance readback.

Run with Node 22+:

```text
node tests/run-recording-identity.mjs
node tests/run-recording-identity.mjs --browser
```

`--browser` defaults to installed Windows Edge; override `MEMORA_TEST_BROWSER` for another Chromium binary. Or open `tests/recording-identity.html` through existing Live Server. Do not interpret synthetic container tests as audio playback or transcription acceptance. Regenerate fixtures only intentionally, using the sibling iMuse checkout and `--generate-fixtures`; the ordinary test suite is self-contained.

### Unchanged production behavior and next checkpoint

Production `metadata.js`, `app.js`, transcription, parsers/exporters, database, build ID and save flows are unchanged. The live app still reads Apple only and writes Voice Memo ID. This dormant module is not a user-visible fix yet. Build 2026-11-13.10 is retained because no changed production contents were published. The user's four archive manifests, audio and transcript files remain untouched.

Next, if authorized, implement **checkpoint 2 only: source JSON validation/resolution/persistence** against the approved schema and prompts. First settle the bounded section 11 items needed for that checkpoint, including local recovery source matching, large-file fingerprinting, safe/interrupted writes, persistence limits and single-origin adaptation. Keep the reader isolated until checkpoint 3 deliberately connects production transcription and universal headers. Device acceptance and deployment remain later, separately authorized work. Do not restart migration or unrelated Search/Combine work.

## 13. Stable checkpoint 2A — in-memory source schema and identity decisions

17 November 2026. User reports **21/21 manual browser passes and committed checkpoint 1**, then explicitly authorized 2A only. Implemented `js/audioSourceIdentity.js` as an isolated pure module, not imported by production. It reads supplied JSON text/plain in-memory data, validates, resolves and stages complete candidate source lists. It never opens files, hashes audio, generates UUIDs, writes storage, calls a picker/share API, changes transcripts or renders dialogs. **Stop after this checkpoint; obtain the user's go-ahead before 2B.** These new changes are not committed/deployed by the agent.

### Exported API

| Function | Input and result |
|---|---|
| `parseAudioSourceManifest(text)` | JSON text already read by a future adapter. Checks encoded-byte size, syntax, duplicate JSON names and schema. Returns `{status, manifest, issues}`; `manifest` is a fully validated copy only for `valid`, otherwise null. |
| `validateAudioSourceManifest(value)` | Plain JSON-compatible in-memory object. Descriptor-based copy rejects getters/custom prototypes/non-JSON values without running their code. Same result shape as parse. |
| `serializeAudioSourceManifest(value)` | Validate, preserve unknown fields and return pretty JSON with terminal newline in `text`. Invalid input returns `text: null`; no file is written. Checks size of the actual serialized text too. |
| `createAudioSourceManifest(audioSourceId)` | Validate an empty schema-1 source using a supplied UUID. Does not generate a source ID or establish folder ownership. |
| `resolveAudioSourceId(options)` | Options: `audioSourceId` (existing or null), `establishedAudioSourceIds` (already validated associations), optional `selectedAudioSourceId`. Returns resolved ID/candidates, decision-required for conflict, assignment-required when none exists, or invalid input. Only a known candidate can be explicitly selected. |
| `planRecordingIdentity(options)` | Options and result below. Returns decisions or a fully validated independent candidate; never mutates inputs. |
| `AUDIO_SOURCE_LIMITS` | Frozen implementation bounds, listed below. Not an assertion of tested iPhone capacity. |

Parse/validate statuses: `valid`, `invalid`, `unsupported`, `conflicting`. Unknown positive schema versions are unsupported; missing/noninteger/nonpositive versions are invalid. Duplicate paths/IDs are conflicting. Unknown accepted JSON fields are preserved at every level, including inert own keys such as `__proto__`; no unchecked prototype merge. Exceptions from invalid inputs are projected to an invalid result rather than becoming workflow/model exceptions.

Planner inputs:

```js
planRecordingIdentity({
    manifest,                    // fully validated again internally; never modified
    audioRelativePath: 'memo.wav',
    fingerprint: { algorithm: 'sha256', byteLength, digest },
    embedded,                    // current checkpoint-1 reader result
    choice: null,                // use-embedded | keep-existing | assign-new | skip | cancel
    assignedRecordingId: null,   // caller-reserved UUID, only when assignment is needed
    establishedAudioSourceIds: [],
    selectedAudioSourceId: null  // explicit known source-conflict choice only
})
```

Fingerprints must describe complete file bytes from the same snapshot as `embedded`. **2A validates supplied fingerprint data but does not compute or verify a hash against audio.** Actual snapshot/stream hashing is 2B work. Supplied source associations must have been established through provenance or access evidence, not folder-name matching; this module does not discover them.

Every planner result includes:

```js
{
    status, code,
    recordingId: null,           // populated only for ready
    candidate: null,             // complete independent manifest only for ready
    requiresPersistence: false,  // true when ready differs from supplied manifest
    choices: []                 // applicable explicit choice strings, when needed
}
```

Possible statuses:

- `ready`: an in-memory candidate is usable **after the later persistence gate**. It does not mean saved or verified. Read `requiresPersistence` to distinguish unchanged reuse from a staged update.
- `decision-required`: return the relevant code/options; no candidate or usable Recording ID. Source conflicts also include `sourceResolution` with known candidates.
- `assignment-required`: the decision is eligible for a fresh UUID, but the caller has not supplied a reserved one. No UUID is generated. The future adapter reserves it once for the pending operation and reuses it on retries.
- `blocked`: validation, unsafe association, unresolved embedded/container/provenance conflict or an inapplicable choice. Some results include validation/issues for explanation.
- `cancelled` / `skipped`: no candidate or ID and no mutation. Skip is only a decision result; batch control belongs to the future UI adapter.

### Implemented decision mapping

| Condition | Result / required caller behavior |
|---|---|
| Valid embedded ID, new entry | `ready / embedded-id`; preserve embedded value/case and origin. |
| Valid embedded ID matches entry | Reuse embedded identity; update fingerprint if bytes changed without asking for a new UUID. |
| Valid embedded ID differs | `decision-required / embedded-id-mismatch`, choices use-embedded/cancel. Confirmed use produces embedded-id-confirmed; assign-new/keep-existing cannot override a valid embedded ID. Historical transcripts/manifests are not touched. |
| No embedded ID, unchanged source entry | `ready / reused`; no destination/model/operation input exists, so destination cannot influence identity. |
| No embedded ID, no source entry | `assignment-required / new-assignment`; with a valid supplied UUID, stage `memora-assigned`. |
| No embedded ID, changed bytes at existing path | `decision-required / audio-changed`, choices keep-existing/assign-new/cancel. Confirmed choices refresh the fingerprint. Size or same-size digest change both count. |
| Invalid/unsupported embedded identity metadata | `decision-required / unreadable-embedded-id`, choices assign-new/skip/cancel; explicit assignment stages the appropriate recovery reason and current fingerprint. |
| Existing recovery and unchanged bytes, still unreadable | Reuse the assignment without a repeat warning. Keep the originally consented recovery reason even if reader classification changes between invalid/unsupported for the same bytes. Current reader inspection is still mandatory. |
| Recovery but changed bytes | Consent is required again for unreadable metadata; an old recovery cannot silently authorize a changed file. |
| Later reader finds a valid ID | Normal embedded priority/confirmation; update origin and clear active recovery after confirmation where needed. Same UUID needs no new identity. |
| Source IDs disagree | No candidate until a known association is selected explicitly. Selecting changes only the staged source ID; no external transcript rewrite. |
| Valid-ID/combined conflict, file-read failure, unchecked/unsupported container | Block rather than misclassify as an absent or damaged embedded ID. These are not covered by generic recovery consent. |
| Duplicate resulting UUID at another path | Block for explicit review, never deduplicate or silently assign a replacement. |

Cancel/skip always return without modifying inputs. Stale or inapplicable actions do not rotate unchanged IDs; a new assignment must be a different UUID from the old one. Caller-reserved IDs are deterministic on retry. The eventual UI must bind confirmation to the exact source/observation shown: after an intervening file/list change, re-read and re-plan, and repeat confirmation if its evidence changed. The pure planner alone is not a concurrency protocol.

### Concrete technical choices for 2A

1. **Bounds:** 8 MiB UTF-8 source JSON, 10,000 recording entries, 4,096 path characters, 65,536 characters per other string/key, depth 16, 200,000 JSON value nodes. These are conservative implementation limits with synthetic boundary tests, not measured release/device capacity. File adapters must check Blob/File size before allocating text in 2B. Pretty output may be larger than compact input and is independently bounded.
2. **Paths:** slash-separated relative paths; reject absolute/drive/backslash paths, control characters, empty/dot/dot-dot segments and trailing dot/space ambiguity. Detect collisions by NFC-normalized, case-insensitive key, but preserve original path text. A requested path that differs from a catalogued one only in case/Unicode spelling is blocked for explicit association; no rename tracking is inferred. This conservative cross-platform policy may reject distinct case-sensitive paths instead of guessing.
3. **Duplicate UUIDs:** multiple paths with the same UUID, compared case-insensitively, yield an unresolved conflict. No multi-path aliases, copy matching or automatic reconciliation are implemented. A later deliberate alias feature would require its own policy.
4. **Dual agreeing origins:** preserve an existing origin if it is one of the currently observed embedded origins. For a new dual-convention entry with the same UUID, choose imuse-embedded deterministically. This chooses a provenance label only, not priority between competing IDs; the reader retains both pieces of evidence and different values remain blocked.
5. **Recovery extensions:** active `identityRecovery.reason` requires memora-assigned origin and one of the two approved reasons. When promotion clears the active reason, preserve unknown sibling fields in an extension-only `identityRecovery` object rather than discard them. It is inert history/extension data, never active recovery consent. Delete the object if nothing remains; an empty object is invalid input. No additional serialized field is introduced. This is the lossless interpretation of the requirement to remove active recovery while preserving unknown metadata.
6. **Reader issue scopes:** the checkpoint-1 module now adds `scope: identity | container | provenance` to issues. This small additive refinement prevents malformed provenance JSON from masquerading as malformed recording-ID JSON. Unreadable-ID recovery requires explicitly identity-scoped, supported issue codes, no conflicting issue and no competing valid embedded evidence. Unscoped older-reader errors are blocked, not guessed. No production module imports this reader, so live behavior remains unchanged.
7. **No incidental UUID generation or I/O:** source IDs and new Recording IDs are supplied by the future caller; source selection/listing or validation cannot mint IDs. Fingerprints are compared as size plus case-insensitive SHA-256 text. New staged digest text is lowercase; embedded UUID/source spelling is preserved.

### Test evidence and manual checkpoint

New harness: `tests/audio-source-identity.html`, with `audio-source-identity.test.js`. The existing Node/browser runner now accepts `--source` and retains its original reader-suite default.

**31/31 new groups passed in Node v24.22.1 and isolated Windows Edge. The existing reader's 21/21 groups also passed in both runtimes after the scope refinement.** No real user data, source file writes, database changes, crypto generation, audio hashing or inference. Browser runner uses an isolated temporary profile and read-only fixtures. Tests include actual checkpoint-1 results from all six committed iMuse fixtures and malformed actual provenance-box JSON. Initial restricted Electron runtime emitted crash-reporting access noise; final full verification outside that subprocess restriction passed cleanly.

Coverage: core/unsupported/invalid schemas; duplicate JSON names including escaped aliases; every origin/fingerprint/recovery combination; unknown JSON/prototype-safe round trips; getters/toJSON/non-JSON/cyclic/sparse input rejection; UUID case and non-v4 syntax; safe/colliding/unsafe paths; duplicate IDs; bounded data; source association/reuse/conflicts; unchanged/repeated IDs; caller-reserved fallback; embedded priority/cancel; all changed-byte choices; explicit invalid/unsupported recovery; unchanged recovery reuse; later reader promotion with unknown metadata preserved; cancel/skip; blocked provenance/container/read issues; stale/inconsistent choices; independent frozen input/output copies; current reader integration.

Run manually through Live Server: **`tests/audio-source-identity.html` should show 31/31 groups passed.** Optional regression page: `tests/recording-identity.html` should still show 21/21. No transcription/model/device save testing is required for this isolated checkpoint.

```text
node tests/run-recording-identity.mjs --source
node tests/run-recording-identity.mjs --source --browser
node tests/run-recording-identity.mjs
node tests/run-recording-identity.mjs --browser
```

Node was supplied locally by installed VS Code's Electron runtime with ELECTRON_RUN_AS_NODE=1; no package/dependency installation was needed. The test-only runner's temporary browser profile is the only browser-write artifact; it is unrelated to Memora identity persistence.

### Exact stop/resume boundary

Checkpoint 2A is committed as `5eb536e`. The manual harness remains available; commit status does not establish user manual/device acceptance. No deployment is recorded. Production source selection, `metadata.js`, `app.js`, TXT labels, inference, save/share controls, archive manifests and database remain unchanged. Build remains 2026-11-13.10. **The live app still does not read iMuse UUIDs or write Recording ID.** No actual audio-source JSON was created or overwritten.

Next, only if authorized, **2B** implements actual complete-file fingerprinting, source discovery/association, durable UUID reservation/recovery and safe persistence. Before production wiring it must settle:

- Bounded hashing of large audio snapshots and cancellation, with matching reader/hash/transcription snapshots.
- Check source-file size before text reads; integrate the 2A byte/entry limits and measure representative desktop/iPhone lists rather than assert capacity.
- Reliable local recovery matching and additive database schema/cleanup/reporting. A folder name or matching digest alone is insufficient.
- Re-read/compare, locking, interrupted write/replacement/readback, permission/quota errors and retry reuse of staged IDs. No external-filesystem atomicity claim.
- Existing file-input/iPhone Save to Files ordering, cancellation and pending artifacts; no claim that completed sharing verifies a destination/save.
- Concrete plain-language messages for source-ID association conflicts, blocked reader/provenance/container evidence, reload/write/local-storage failures. General unreadable-ID recovery must not bypass unresolved valid evidence.

Keep both modules isolated until checkpoint 3 deliberately connects production transcription/universal headers. No migration tool, cross-folder deduplication/move tracking, unrelated Search/Combine work, archive rewrite or deployment.

## 14. Checkpoint 2B — isolated source persistence

Historical checkpoint: subsequently user-tested and committed as `9d38697`; production integration is now section 15.

18 November 2026. The user authorized 2B after the documentation reconciliation. Implementation is ready for review in the working tree; no commit or deployment was made. This section supersedes section 13's next-work/authorization boundary, not its pure schema/decision contract. Production identity wiring remains checkpoint 3.

### Files and API boundaries

- `audioFingerprint.js`: `fingerprintAudio(blob, { signal, chunkBytes, onProgress })` computes complete raw-byte SHA-256 incrementally, with a default 256 KiB input chunk, at most 1 MiB configurable input chunks and fixed algorithm buffers. It yields between chunks and supports cancellation/read errors. No audio decoding, external dependency or whole-audio allocation. The implementation is checked against native Web Crypto vectors and chunk-boundary cases; representative large recordings/iPhone throughput remain unmeasured.
- `audioSourcePersistence.js`: `discoverAudioSource(source, { selectedFile })` distinguishes found/absent/not-included, ambiguous selections, size limits, denied permission and read errors. `openAudioSourceSession(...)` opens valid existing JSON or returns an explicit decision. Actions `create`, `replace` (separate confirmation), `restore` and `resume` are supplied by the future UI adapter, never inferred consent. `establishedAudioSourceIds`, `selectedAudioSourceId` and `selectedRecoverySourceId` resolve known evidence; they do not search transcript archives.
- The returned session exposes `stageRecording({ audioRelativePath, choice, onProgress })`, `getManifest()`, `persist()`, `exportPending()` and `verifySelectedCopy(file)`. Staging reads identity and fingerprints the same returned File snapshot, enrolls recordings incrementally and reserves UUIDs once per pending assignment. It does not write. The future transcription adapter must consume that exact snapshot, handle all non-ready outcomes, and await the persistence gate before dependent delivery. A choice must follow inspection of identical current evidence; changed observations return `stale-choice`. Unresolved entries block persistence; explicit skip removes that path's staged change. Cancel changes no staged/durable state and does not itself trigger persistence.
- `audioSourceRecovery.js`: a lazy `createAudioSourceRecoveryStore({ openDatabase })` offers `get`, `list`, revision-checked `put` and explicit revision-checked `remove`. `matchAudioSourceRecovery` requires an independently established source UUID or browser-confirmed same directory handle. Names, path similarity and matching audio hashes are never matching evidence. Multiple matches require selection; conflicting established/recovered source IDs require explicit resolution. No copy/move tracking is added.
- `storage.js`: bounded recording-list reads, root-only discovery, safe nested audio-handle lookup and source-list stream writes. The writer aborts on write/close failure rather than closing and publishing partial data. The existing generic write/share functions and their callers are unchanged.

No production entry point imports the three new modules. However, `database.js` is shared: **schema version 6** adds `audioSourceRecovery`, keyed by lowercased Audio Source ID, while retaining the existing four stores, key paths and indexes. This upgrade takes effect when current source code opens the database, even before checkpoint 3. No data reset/downgrade is introduced. Keep version-6-compatible code after an upgrade; the old version-5 opener will refuse that newer database. The build ID is unchanged because nothing is published; advance it before release.

### Recovery and write protocol

One recovery record per source holds the validated complete candidate JSON, original source bytes (or confirmed absence), a fresh revision token, state (`pending`, `verified`, `export-pending`), optional directory handle, descriptive source name and timestamp. Original bytes and candidate JSON are each bounded by the existing 8 MiB JSON limit; there is no claim that all 10,000-entry documents fit within it. Browser storage quota still applies. Records have no automatic expiry, are included in existing storage reporting and survive transcript/semantic cleanup. Explicit removal is available through the isolated API; user-facing management belongs to integration. Browser eviction/clearing can remove recovery data.

Writable flow:

1. Recheck original source JSON bytes; reject external change, without last-writer-wins merging.
2. Save pending candidate and base bytes transactionally in recovery storage, using a revision comparison to reject concurrent updates. UUIDs and pending content remain in the session if storage fails.
3. Revalidate enrolled mutable audio handles by size and full digest against the inspected snapshots. Recheck source bytes immediately before opening the writer. Same-realm queues and Web Locks (where available) coordinate app-owned commits; recovery revision checks remain active without Web Locks.
4. Write/close and read back exact expected JSON bytes before returning `verified`, then mark recovery verified. Failures retain a pending recovery record. If creation left an empty new file after stream abort, the current session recognizes only that empty shell for retry. Partial/corrupt/externally changed files require explicit restore/replacement, never blind overwrite.
5. A successful source write followed by a recovery-store failure is still reported as failure; the same session can retry with the same IDs. Reloaded pending state requires explicit resume or restore. Complete old/new bytes permit resume; damaged/intervening bytes require review and replacement consent.

There is no filesystem-wide atomic transaction or cross-process compare-and-swap. External programs can race the final check. Filesystem stream guarantees vary; the separate durable recovery candidate, validation and truthful failure are the recovery mechanism. No permanent sidecar backup files are created. Original audio, transcript files and migrated archive manifests are never written.

File-input flow first saves `export-pending` recovery, then returns the JSON File and the approved “Save … in the audio folder” guidance. It returns `sourceVerified: false`: no sharing result proves placement or filesystem persistence. `shareFile(file)` remains a separate user action using the existing transport; cancellation retains pending JSON and IDs. Ordinary save guidance does not mention local retention. `verifySelectedCopy` can establish that an explicitly selected copy matches the pending bytes; it still cannot prove that copy is beside the audio. If browser persistence fails, `persist()` rejects and grants no dependent-delivery result; `exportPending()` retains a usable JSON artifact for explicit recovery while the session survives. No inference needs repeating because of persistence failure.

### UI integration still required at checkpoint 3

No prompts, picker changes, new Settings controls or transcription delivery changes are wired in 2B. The approved prompt actions in section 8 map to the explicit API actions above. A future UI must show evidence-labelled source candidates (selected JSON name/source versus associated transcript source), never unexplained UUID-only choices. Suggested technical-failure wording:

| Condition | User message/action |
|---|---|
| Source IDs disagree | “These recording lists refer to different audio sources. Choose the source association to use, or cancel.” Show each source name and evidence. |
| Concurrent source/recovery change | “This recording list changed in another session. Reload it before saving.” Retain current pending content for review. |
| Audio changed after inspection | Name the audio; ask to read it again and review its Recording ID. Do not reuse the previous confirmation. |
| Source write/readback failure | “Memora could not verify the recording list. Keep the pending copy and try again.” Do not report success or deliver a first fallback-ID transcript. |
| Browser recovery storage failure | “Memora could not retain this recording list. Keep this page open and save a copy before retrying.” Keep text/identity artifacts and offer explicit JSON export; no success claim. |
| Blocked reader/provenance/container evidence | State the actual reader issue for the named file; offer skip/cancel. Do not mislabel it as an absent ID or generic recoverable damaged identity. |

The source JSON Save-to-Files action must precede dependent transcript delivery after durable staging, with separate user gestures where needed; cancellation must preserve both pending artifacts. Exact visible control placement and device acceptance remain checkpoint 3 work. No deployment or iPhone integration test is implied by this isolated implementation.

### Verification and next checkpoint

The isolated browser harness is `tests/audio-source-persistence.html`; its source-only import map redirects every default database open to disposable fixture databases. Synthetic file adapters test faults; a native browser-private filesystem directory tests actual write/close/readback and structured-cloned directory-handle matching. No actual user folder or the real Memora database is touched. SHA tests compare native Web Crypto and known vectors, including an 8 MiB bounded-read case; this is correctness coverage, not a measured device-capacity guarantee.

Run with Node 22+: `node tests/run-recording-identity.mjs --persistence`. Add `--browser` and set `MEMORA_TEST_BROWSER` to a Chromium executable for real IndexedDB/native-directory coverage. Node explicitly skips those two browser-only groups. Existing `--source` and default reader suites are retained. `--suite=database --browser` and `--suite=database-integration --browser` run the existing schema and production-consumer regressions in isolated profiles.

Current evidence and final group counts are recorded in the documentation index/test guide after verification. Real iPhone Safari, user-selected source folders, representative large archives and UI acceptance remain untested. Review this checkpoint and run its manual harness before authorizing checkpoint 3. Do not begin unrelated Search/Combine phases, rebuild migration, change existing archives or deploy automatically.

## 15. Checkpoint 3 — production transcription integration

18 November 2026, candidate **2026-11-18.1**, uncommitted and undeployed. The user passed the 2B manual harness and committed `9d38697`, then authorized checkpoint 3. The source now connects identity to normal transcription; sections 12–14 remain evidence of earlier isolated foundations, not current no-integration instructions.

### Implemented behavior

- `recordingIdentityUI.js` presents approved source/recording decisions with text-only dialog content. JSON pickers and recovery export/share actions run from explicit button events. Merely selecting/listing recordings does not assign UUIDs. Source selection disables transcription until the recording list is ready.
- `transcriptionIdentity.js` reads associated source evidence only from the explicitly selected transcript destination, corroborating header Recording IDs with valid embedded IDs from selected audio. Names alone cannot establish an Audio Source ID. Conflicts require labelled choices. It coordinates the 2B APIs and uses their exact inspected File snapshot for inference. Finalized recording snapshots are released so batch processing does not repeatedly rehash every previously delivered audio file.
- Normal transcription resolves identity and passes source persistence before inference, then revalidates/persists before delivery. `metadata.js` retains Apple-specific dates only when the inspected identity includes Apple origin; iMuse UUIDs do not trigger that rule. Whisper task/language/chunk options, paragraphing, model definitions and eligibility fingerprints are unchanged.
- `transcriptMetadata.js` writes readable Metadata version/Archive UUID/Audio Source ID/Original Audio Folder/Recording ID. It accepts legacy Voice Memo ID, detects disagreeing dual labels/invalid UUIDs and reads only the bounded header. No identity origin or opaque JSON metadata line is written in TXT. First-line audio filename, dates/duration/model/operation/language and transcript-relative audio path are retained. New-body formatting remains the previous writer's formatting.
- `transcriptArchive.js` reads or creates a separate schema-1 `memora-archive.json`, preserving its UUID and unknown metadata, and adds recording/transcript references without changing existing ones. Duplicate keys, unsafe/colliding paths and conflicting references are rejected. App-owned writes are serialized with Web Locks where available; a final content comparison and readback detect changes/failures. There is no external-filesystem atomicity claim. Archive UUID reservation never owns the source Recording ID.
- Desktop writes the source JSON beside audio, and the archive JSON at the chosen transcript destination. Archive references are persisted before the dependent TXT write; an interrupted output may leave a reference to a pending/missing transcript. The app never reports successful complete delivery until both manifest and TXT pass their checks. A transcript-write failure retains text and the chosen filename with **Retry pending transcript save**, without rerunning inference. An empty file left by this failed creation is recognized only by that pending operation; unrelated existing text is never blindly overwritten. A concurrently changed list/manifest blocks rather than merging or retargeting the pending text automatically.
- File-input users explicitly select an existing transcript archive JSON, continue a pending one, or create a new archive. There are separate **Save recording list to Files**, **Save transcript archive JSON to Files** and existing transcript-share actions. The first JSON belongs beside audio; the second beside transcripts. Transcript sharing unlocks after the JSON share actions complete. Cancel/errors retain pending JSON/transcripts and IDs. Status says share completed and explicitly does not certify destination or filesystem persistence.
- The pending transcript-archive JSON is retained as an additional bounded field of the schema-6 source recovery record, not inside the portable audio-source JSON and not as links to every transcript destination. No schema/version/index change was needed. Browser clearing/eviction remains possible. Pending transcripts use the existing cache; this is not a permanent text-history guarantee. Unsaved in-session results attempt a before-unload warning, which browsers cannot guarantee.
- Settings → **Recording-list recovery → View** lists saved source copies and offers explicit confirmed removal. Revision checking rejects stale removal; the currently active source cannot be removed from that page. This control never deletes JSON/audio/transcripts on disk and remains separate from transcript/semantic cleanup.
- Combine/Search parsing, hashes, editing and TXT/HTML/DOCX visible metadata accept/carry the universal ID and archive scope. A compatibility `voiceMemoId` property may carry a universal ID; it does not assert Apple origin. Editors preserve the original header/line endings and use the user-edited body without silently rewriting header provenance. Direct writable edits check for external text changes and abort failed streams. This is compatibility work, not completed phase-4 dynamic selection/editor/workspace architecture.

### Verification

The new `tests/transcription-identity.html` harness loads the actual page and coordinator with synthetic audio, mocked inference/metadata where appropriate, a memory recovery fixture for synthetic directory objects, and disposable IndexedDB for cached transcripts. It never calls a real model or selects a user folder. Separate actual Apple metadata tests check dates/duration, and the 2B native harness still checks real browser handles/IndexedDB/private-filesystem writes. Synthetic memory recovery is not presented as native persistence evidence.

Recorded focused verification: **17/17 checkpoint-3 groups**, **32/32 native persistence groups**, **31/31 pure source identity groups**, **21/21 reader groups**, **6/6 Whisper diagnostics**, **4/4 failure classification**, **9/9 Settings/ownership** and **7/7 storage/Settings integration**. No actual user archives/audio/database were read or changed. No real model, Word rendering round trip, physical iPhone/Safari or representative large archive acceptance is claimed.

Run `node tests/run-recording-identity.mjs --suite=transcription-identity --browser`, setting `MEMORA_TEST_BROWSER` to Chromium. The standalone page replaces its body with the actual app for tests and places its final PASS/FAIL report at the top. The 2B harness remains `tests/audio-source-persistence.html` (32/32). Existing default reader and `--source` suites remain available.

### Desktop and iPhone acceptance still required

1. Use a **disposable copied-audio folder and new empty transcript destination**, not the four migrated archives. Include a short Apple recording and an ordinary iMuse export; if available include an ordinary supported WAV/WebM/Ogg recording without an embedded ID. Keep original files outside this scratch folder. Use an already-qualified model; no new stress/self-test is needed.
2. In build **2026-11-18.1**, select the scratch source/destination, create its recording list and transcribe. Confirm source JSON beside audio, archive JSON beside outputs, readable Recording ID/Archive UUID/Audio Source ID headers and normal dates/duration/text/paragraphing. The Apple/iMuse embedded ID should be reused; a no-ID recording should receive a stable Memora assignment.
3. Transcribe again or choose another empty output destination. Recording ID/Audio Source ID must remain stable; a genuinely new transcript archive gets its own Archive UUID. Existing audio and earlier transcript files must remain intact. Open a generated transcript through Search/Combine and check reading/editing/export metadata compatibility using only scratch outputs.
4. After desktop acceptance and separately arranged test deployment, use **real iPhone Safari** with the scratch source. Select its source JSON if the folder picker omits it. Select/create the transcript archive, then use the two JSON Save-to-Files actions followed by transcript saving. Cancel one share first: pending files and IDs must remain, and transcript sharing must stay gated until JSON actions complete. Save JSON files to their stated folders, reselect them on a later run, and check ID reuse. No completed share is described as a verified save.
5. Inspect Settings recovery using synthetic/scratch entries only. Active-source removal must be unavailable; cancelling removal of an inactive copy must retain it. Do not remove real recovery evidence merely to test this control.

Known boundaries: the identity reader supports MP4/M4A, WebM, WAV and Ogg Opus/Vorbis. Unsupported/unchecked containers (including currently listed MP3/AIFF/FLAC) are blocked with skip/cancel instead of being silently treated as missing identity. Extending those readers is a separate bounded compatibility task if required. Large-file/device throughput remains unmeasured. Quota, externally changed manifests and conflicting identity can block authoritative delivery; pending text remains available for retry/review, without automatic last-writer-wins repair. Earlier static combined exports are not upgraded into reference-importable documents by this work.

Stop at candidate/device review. Do not commit, publish, reset data, rewrite the four archives, recreate migration, or start the broader Combine phases automatically.

## 16. Architecture pause and historical picker investigation

The user's complete-source inventory requirement supersedes the earlier incremental-enrollment recommendation as the intended behavior. Implementation is paused pending the [library hierarchy review](Audio_Library_Architecture_Proposal.md); the current code still enrolls selected recordings. Parent/child ownership, nested scanning and the common Search/Combine resolver are proposals with open decisions, not a new schema or coding authorization.

Historical .2 investigation, superseded by the user clarification in section 17: checkpoint 3 is committed as `4c8e5f7`. The initial report was an existing archive index visible but unselectable in the iPhone iCloud Drive picker. Candidate **2026-11-18.2** removes the shared picker's `.json,application/json` filter, keeping bounded content/schema validation. The UI now says **Select archive index** and **Save archive index to Files**; no existing filename, manifest format or ID changes. Automated picker/integration verification does not establish actual iCloud resolution. Retest the same file on the iPhone before claiming the fix accepted. No agent deployment or library implementation is performed.

Picker follow-up verification: **19/19** isolated Chrome integration groups passed, including provider-classified JSON selection without an `accept` filter and cancellation cleanup. The user-facing archive index filename remains unchanged. This does not establish native iPhone/iCloud acceptance.

## 17. Approved iPhone list clarity and pending-save feedback

18 November 2026, candidate **2026-11-18.3**. The user clarified that the audio recording list was being confused with the transcript file list; the initial picker-defect report is unconfirmed and the .2 update was not tried. This candidate implements the approved prompts and confirmations with exact filenames/folders, validates the expected document kind before leaving the picker action, and retains the chooser after wrong-kind selection. Both schemas retain existing bounded validation; no list is overwritten or converted merely by selection. Unknown/malformed content still fails validation.

User-facing names: **Audio recording list** (`memora-audio-source.json`, audio folder) and **Transcript file list** (`memora-archive.json`, transcription folder). This supersedes the earlier user-facing archive-index wording only. File names, schemas, IDs and the distinction between audio and transcript archives are unchanged.

Pending-save buttons reuse the existing Memora animation and reduced-motion rules. Cancellation or share failure retains pending emphasis. Completed sharing clears the emphasis only for the artifact actually shared; a newer pending artifact stays pending. Status names its list and intended folder, without claiming verified filesystem saving. The broader library/full-source indexing architecture remains paused. No agent commit or deployment was made; actual iPhone acceptance is still required.

Candidate .3 verification: **22/22** isolated Chrome groups passed. The runner now serves CSS with its proper MIME type so computed animation tests exercise the real stylesheet. No user files, actual archives or real model inference were used. Manual iPhone prompt/pulse acceptance is pending.

## 18. Readable TXT header ordering — candidate 2026-11-18.4

Approved order for new outputs: audio filename; blank line; Recording date, File date, Duration, Whisper model, Operation and optional Original language; blank line; Metadata version, Archive UUID, Audio Source ID, Original Audio Folder, Recording ID and optional Audio Relative Path; existing header/body separator and spacing. Metadata values/body formatting remain unchanged, as verified for transcription and translation. No existing file, JSON schema or iMuse audio export is rewritten.

The interface/header candidate is separate from the paused complete-source/library work and isolated reconciliation prototype. The earlier Windows/iCloud availability blocker is superseded: the user has successfully remigrated four archives and rebuilt Search indexes. Future reconciliation validation still starts with disposable copies, not writes to those real archives. This candidate does not turn a partial manifest into a complete verified inventory or implement multi-archive audio resolution.
