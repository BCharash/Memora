# Recording identity implementation contract

17 November 2026. **Design and implementation plan only. Application code is not authorized yet.** This document consolidates the user's approved identity decisions and makes technical recommendations explicit. Read it with [the handoff](Recording_Identity_Handoff.md), [approved architecture](MEMORA_COMBINE_ARCHITECTURE.md) and [Phase 1 contracts](MEMORA_COMBINE_PHASE_1_CONTRACTS.md). For recording identity, the latest user decisions here supersede conflicting older proposals. They do not authorize unrelated architecture phases.

## 1. Outcome and current implementation

Every transcript of the same source recording must reuse its Recording ID regardless of model, operation or transcript destination. Use a valid, supported embedded source identity when available. Otherwise reuse a previously established Memora assignment, or assign a cryptographic UUID once and persist it with the audio source. Never claim that a generated identity was embedded in audio.

Current production is build 2026-11-13.10. `metadata.js` reads Apple's `voice-memo-uuid` only; `app.js` still writes Voice Memo ID. iMuse UUID reading and the universal Recording ID writer are not implemented. The user confirmed that current iMuse imports do not expose their UUID in Memora. No application integration/device testing has occurred for this design.

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

Every recording entry uses the fingerprint, including Apple/iMuse entries. A digest is change evidence, never a Recording ID, global match key or cross-source deduplication mechanism. Do not alter the audio to add a Memora ID.

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
