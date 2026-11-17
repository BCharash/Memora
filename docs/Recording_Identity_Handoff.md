# Recording identity — checkpoint and iMuse handoff

**Latest resume point — checkpoint 2A complete, 17 November 2026:** Source JSON validation and identity decisions are implemented in memory only. New 31/31 and existing reader 21/21 groups passed in Node and isolated Edge. User already manually passed/committed checkpoint 1; 2A awaits user manual review/commit. Read [implementation contract section 13](Recording_Identity_Implementation_Contract.md#13-stable-checkpoint-2a--in-memory-source-schema-and-identity-decisions) for APIs, limits, technical choices and exact next scope. Stop before 2B (hashing/discovery/persistence); no production integration, source JSON writes, build change or deployment. Older scope notes below predate this checkpoint.

**Checkpoint 1 complete — 17 November 2026:** Isolated Apple/iMuse reader and tests added after explicit step-1 authorization; 21/21 groups passed in Node and isolated Edge. Production behavior remains unchanged (Apple-only reader and Voice Memo ID writer). Start at [implementation contract section 12](Recording_Identity_Implementation_Contract.md#12-stable-checkpoint-1--isolated-embedded-identity-reader). Step 2 (source JSON) is not authorized yet. Older no-code statements below describe the prior design stage.

**Latest resume point — 17 November 2026:** Read [Recording Identity Implementation Contract](Recording_Identity_Implementation_Contract.md) first. It consolidates the subsequently approved source JSON schema, all-entry fingerprints, recovery reasons, safe writes, source-ID conflict handling and prompts. It supersedes earlier open questions below where those decisions have since been settled. Application code is still not authorized. The remaining technical checklist is in section 11 of that contract; do not restart the already approved decisions.

16 November 2026. All four existing archives were successfully migrated according to the user. The user then renamed the migrated TXT header label from `Voice Memo ID` to `Recording ID` externally, preserving the values. The disposable migration utility, its tests, generated HTML and temporary migration validation reports have been removed at the user's request. No further migration tool is needed.

Production Memora remains unchanged at build **2026-11-13.10**. It does not yet implement the full archive-ID, universal recording-ID and shared playback contracts. Do not mistake the completed external migration for production feature completion. The earlier integrated candidate 2026-11-16.1 was withdrawn; do not reuse that release ID.

## Agreed readable TXT contract

- Keep the audio filename on the first line and the existing dates, duration, model and operation fields.
- Use **Recording ID** as the universal label. Apple Voice Memo UUID values are preserved, not translated into new IDs. Older `Voice Memo ID` labels must remain accepted on input.
- Retain the existing **Audio Relative Path**, measured from the transcript directory (for example `../memo.m4a`). No duplicate source-relative path is required for the user's known Audio Folder/transcription layout.
- Retain readable metadata version, archive UUID, audio-source ID and original audio-folder name. Archive identity and audio-source identity have different purposes; same folder/display names alone never establish identity.
- All model/operation transcripts of one recording share its recording ID within the archive. No cross-archive content reconciliation or deduplication.
- Reuse the source recording ID when available. Otherwise assign and persist a Memora identity once; do not generate a new recording ID on each transcription or access.
- Preserve bodies, IDs, unknown metadata and known provenance. Do not repeat the first-line filename or model/operation in an opaque JSON line. Keep internal object representation separate from readable TXT encoding.

The archive manifests remain with the user's actual archives, outside this repository. Migration-progress JSON was only a resume/checksum record; its output checksums became obsolete after the external header-label edits. It is not a production playback index. This repository cleanup does not delete, readjust or reverify any actual archive, manifest or progress file.

## Historical iMuse review (superseded by the resume checkpoint below)

Read-only review of the local sibling iMuse checkout:

- `js/recorder.js` creates the session ID when recording starts, normally with `crypto.randomUUID()`. Its fallback is a timestamp/random string, not necessarily a UUID. The ID is saved with the session in IndexedDB.
- Ordinary `downloadAudioBlob` downloads the audio Blob as-is; it does not explicitly embed that session ID. Renaming a download is not identity transport.
- `js/recording-combine-metadata.js` gives combined audio its own ID and retains source IDs. `js/recording-combine-mux.js` appends its versioned provenance box to combined M4A and verifies readback.
- Memora's current `js/metadata.js` specifically searches for Apple's `voice-memo-uuid`; it does not yet read iMuse's provenance format or a universal exported recording ID.

## Earlier next-work sequence (superseded below)

1. Switch to the **iMuse repository**. Inspect the current files and propose a versioned ordinary-export recording-ID contract and tests before coding. Preserve the ID across renaming/repeated export; preserve audio and existing combined provenance. Prefer a UUID for newly created recordings, and explicitly handle legacy non-UUID session IDs without silently changing existing identities.
2. Ensure export carries the ID reliably for the supported audio formats. Validate ordinary and combined exports, repeated downloads, missing/invalid metadata, desktop and real iPhone Safari. Do not claim current ordinary exports already carry the session ID.
3. Return to Memora for Phase 3: read Apple UUIDs and the agreed iMuse export metadata; write the universal `Recording ID` and readable archive/audio provenance consistently for new transcripts. Audit all existing parser/editor/export consumers of `Voice Memo ID`; changing only the writer would be incomplete.
4. Continue the approved sequence: shared authoritative editing/preference, persistent Combine/reference import, portable exports/Output controls, query-only history and shared source-specific audio resolution. Existing architecture/contracts remain the governing plan, with the completed one-time migration retired.

No iMuse implementation change, production Memora change, commit or deployment is part of this checkpoint. Historical journal entries retain earlier migration experiments for context; they are not active instructions to recreate or ship the tool.

## Earlier checkpoint — 16 November 2026: source-owned recording identity

The user stopped after a read-only integration/design review. **No application code is authorized yet.** No application code, build, database schema, actual archive or audio was changed. Resume with the focused design below, asking only one question at a time when user input is needed.

### iMuse exporter is now implemented

The user reports stable recording UUID assignment, embedding of that same UUID on export, and successful device testing. Filenames, encoded audio and combined-recording provenance are preserved. Read the current sibling contract `../iMuse/docs/recording-identity-export.md` and reference `../iMuse/js/recording-identity.js`; the historical review above no longer describes the ordinary exporter.

Version 1 uses UTF-8 JSON with `format: "imuse-recording"`, `version: 1` and `recordingId`, bounded to 4 KiB. Locations: top-level MP4 UUID box with user type `91c3892e-57a4-4f78-a983-3a19947c9c01`; WebM SimpleTag or Ogg Opus/Vorbis comment named `IMUSE_RECORDING_METADATA`; WAV `imID` chunk. Detection is by file signature. Reject/report invalid payloads, unsupported versions and duplicate identity entries, including identical duplicates. Reference readback alone does not check combined-provenance ID agreement; Memora must check that separately.

### Existing archive evidence inspected read-only

User supplied `C:\Users\billc\OneDrive\Documents\Desktop\memora-archive.json`. It parses as schema version 1, with root fields `schemaVersion`, `archiveUuid`, `archiveName`, `recordings`; 105 recordings and 106 transcript references. Each recording has `recordingId` and `transcripts`; each transcript has `relativePath`, `model`, `operation`. This manifest has no audio-source association fields.

The user pasted a corresponding migrated TXT header. Its Recording ID and Archive UUID agree with the manifest. It separately includes Metadata version, Audio Source ID, Original Audio Folder, first-line audio filename and transcript-relative Audio Relative Path. This confirms the readable layout, not a full verification of all four archives. Preserve Apple ID spelling/case and historical model values; do not relabel historical `large` as `large-v3`.

### Agreed correction: persist fallback identity with the audio

The initial suggestion to persist a newly assigned Recording ID only in a transcript archive was rejected by the user: the same audio may later be transcribed into another destination without that manifest, creating a second ID.

The accepted direction is a **separate audio-source JSON manifest beside the audio files**, independent of transcript destinations. It holds the Audio Source ID and recording entries associating audio-relative paths with Recording IDs, with checks for changed/ambiguous files. Its exact filename, schema, validation and persistence protocol remain to be designed. Audio paths locate files; paths alone cannot establish unchanged identity after replacement, renaming or moving. Audio files are not rewritten as part of this proposal.

The user approved automatically assigning a cryptographic Memora UUID when audio has no embedded ID and no established identity. Assign once and persist at the source for reuse across models, operations and transcript destinations. Never present a Memora-assigned UUID as an embedded identity. Do not generate IDs during metadata listing/read access.

**The four migrated transcript archive JSON files remain unchanged.** They continue to associate their own Archive UUID with Recording IDs and relative transcript paths. The audio-source manifest is additional, not a replacement. The same audio can appear in different transcript archives with the same Recording ID and different Archive UUIDs. When establishing source manifests for existing audio, reuse identities already established in migrated transcripts, validate against embedded IDs, and report conflicts rather than generating replacements. This must not recreate the disposable migration tool or rewrite the migrated archives.

Recommendation given, not yet a finalized schema: keep transcript paths in each transcript archive manifest rather than maintain links to every transcript destination in the audio-source manifest. The user has not separately settled this detail.

### Integration boundaries and proposed error behavior

- Read iMuse UUIDs and Apple's existing `voice-memo-uuid`; write the universal Recording ID label. Accept legacy Voice Memo ID on input. Preserve Recording ID, Archive UUID, Audio Source ID and combined provenance as distinct concepts.
- Current `metadata.js` returns Apple-specific `uuid` and chooses MP4 by extension. `app.js` writes Voice Memo ID; `combine.js` parses only that label; TXT/HTML/DOCX and Search/semantic consumers carry the old field. Audit/update identity compatibility only; no unrelated Search or Combine implementation.
- Separate bounded identity extraction from duration/date extraction, audio decoding and UUID assignment. An iMuse UUID must not activate the current Apple-specific recording-date inference.
- Proposed: return explicit missing/invalid/unsupported/conflicting states; do not silently convert errors into missing metadata or choose between disagreeing identities. A valid embedded ID must agree with any established source/archive association. Keep combined provenance separately and validate its output ID against the portable recording ID; do not substitute source/segment IDs.
- Proposed: identity errors preserve available transcript text and are not Whisper/model failures. Exact continuation/save behavior for unresolved identity still needs a concrete design; the earlier suggestion to block authoritative identity-bearing saves is a proposal, not independently approved behavior.
- Preserve inference options, paragraphing, transcript text, filenames, dates/duration semantics, existing data and save/share behavior.

### Next steps before any code

1. Specify the smallest audio-source manifest schema and lifecycle: source-root location, source ID reuse, recording association, validation, concurrent/interrupted writes and source/manifest conflicts. Explain handling for renamed, moved or replaced audio without claiming filename/path proves identity.
2. Specify how new source manifests reuse migrated identities through matching embedded IDs and validated transcript/audio provenance. Missing/ambiguous evidence must remain unresolved; no automatic historical ID replacement or archive rewrite.
3. Settle desktop and iPhone persistence. Writable-folder workflows can persist beside audio; file-input/iPhone workflows cannot assume write access. Browser-local storage alone does not meet portable source-owned identity. Define explicit export/reselection or other handling before claiming stable reuse, and explain any user action needed. This is the principal remaining design gap.
4. Present concrete error/fallback behavior, minimal affected files and tests for review. Existing architecture/readable-label decisions do not need reconfirmation. Wait for implementation authorization; the user repeatedly requested no code.
5. After authorization, implement focused Phase 3 recording identity integration, then validate on desktop and real iPhone. Later architecture phases remain separate.

Planned tests: actual iMuse exporter/readback fixtures for all containers and both Ogg codecs; misleading extensions and renamed/repeated exports; Apple values and legacy/new TXT labels; malformed UTF-8/JSON, UUIDs, format/version, duplicates, limits and truncated containers; combined-provenance agreement; repeat/model/operation/different-destination fallback reuse; same-named distinct sources and changed files; source write failure/interruption/concurrency; iPhone persistence/export; unchanged transcript bodies, filenames, inference settings and existing IndexedDB. No automated/device Memora integration tests have run in this review.

## Current resume checkpoint — 17 November 2026: agreed behavior and prompts

**This section supersedes conflicting proposals and open questions in the earlier checkpoint. No application code is authorized yet.** This session settled behavior and prompt wording only. Production still does not read iMuse's embedded UUID and still writes Voice Memo ID; the user observed this, consistent with the inspected code. No application build/schema change, deployment or actual archive/audio modification is part of this documentation checkpoint. Ask only one question at a time if further user input is needed; do not ask again about settled decisions.

### Agreed source manifest and identity rules

1. Use **`memora-audio-source.json` in the selected audio folder**, separate from the existing transcript archive `memora-archive.json`. Maintain the source JSON even for audio with embedded UUIDs. Recording ID, Audio Source ID and Archive UUID remain distinct. The same audio transcribed into different archives retains its Recording ID; the archives retain their separate Archive UUIDs.
2. A **valid, supported embedded Recording ID takes priority** over a disagreeing source JSON entry. Explain the mismatch and require confirmation before updating the source JSON. After confirmation, use the embedded ID for future transcriptions; leave existing transcripts unchanged. Do not silently rewrite historical transcript/archive references. Report duplicate/conflicting embedded identities rather than choosing one by precedence.
3. For audio with no embedded ID and no established identity, automatically assign a cryptographic Memora UUID and persist the source association before the first transcript save in writable-folder workflows. Reuse it across model/operation variants and destinations. UUID syntax stays standard; distinguish origin in each source JSON recording entry using `identityOrigin`, with values `memora-assigned`, `imuse-embedded`, `apple-embedded`, or `unknown` when genuinely unestablished. **Do not add an identity-origin field to transcript headers.** Transcript headers use Recording ID universally; legacy Voice Memo ID remains accepted on input.
4. The four migrated transcript archive manifests remain unchanged. The user clarified that **all archived/transcribed source audio was Apple Voice Memos and all migrated Recording IDs are Voice Memo IDs**; all iMuse use so far was disposable. Creating source lists for these archives should reuse readable Apple embedded IDs. Do not build historical recovery of Memora-assigned IDs from migrated transcripts for this dataset or recreate the migration tool.
5. Automatically look for the source JSON where folder access permits. If access cannot establish whether it exists, distinguish selection/access failure from confirmed absence: offer selecting the existing JSON or explicitly creating a new list. An inaccessible/unselected list is not evidence that none exists.
6. For audio without an embedded ID that changes at a catalogued relative path, explain that the audio differs and let the user keep the existing ID for an edited version or assign a new ID for a different recording. Existing transcripts remain unchanged. The exact bounded change-detection mechanism is still a technical design item; path alone is insufficient evidence.
7. Invalid or unsupported embedded metadata must be reported distinctly, but **must not permanently prevent essential audio from being transcribed**. Offer an explicit new Memora ID, skip, or cancel. Save the recovery decision with the source entry so subsequent access reuses it without repeating the same warning for unchanged metadata. This does not repair/rewrite the embedded data or invent an embedded identity. Do not prompt users to update Memora: no available update is established. If a later reader can interpret a valid embedded UUID, apply the ordinary mismatch/confirmation process, replacing the JSON identity only after confirmation and leaving existing transcripts unchanged.
8. Reuse the **existing Memora iPhone save/share flow**; do not redesign it. There is no reliable verification that Save to Files wrote the JSON to the intended folder. Do not claim verified source persistence after a completed share request. Later selection/readback can establish presence. The writable-folder ordering rule cannot be presented as a verified filesystem guarantee on iPhone.
9. Keep a browser-local recovery copy of source identity data separate from the 24-hour transcript cache, with no automatic expiry and explicit removal supported. Clearing/eviction may remove it. **Do not mention local retention in the ordinary save message.** If a source JSON is missing and a reliably matching local copy exists, offer restoration; folder name alone cannot establish a match. If none is available, offer a new JSON. Exact reliable source matching remains to be designed without speculative move/copy protection.
10. **No special protection/reconciliation for deleted manifests or audio moved/copied without its manifest.** The user considers this unusual and accepts responsibility for managing those files. Such audio without embedded identity may receive a new UUID. Do not build cross-folder deduplication, tracking or a warning about possibly different historical IDs into the normal create-list prompt. This exclusion does not remove the agreed changed-file-at-a-catalogued-path check.

Keeping transcript paths in their respective transcript manifests was recommended, rather than recording all destinations in the audio-source manifest. The exact source JSON schema and whether any transcript links belong there have not received a separate final schema review. Preserve the four existing manifests regardless.

### Approved prompt wording

Use plain language, name the affected audio file, explain what was found and what each action changes. Cancellation leaves files unchanged. Use the actual reason for invalid versus unsupported metadata rather than an ambiguous combined diagnosis. Render filenames safely. These are recording identity prompts, not Whisper/model failures.

**Cannot determine whether a source list exists** (only when access cannot establish presence):

> **Does this audio folder already have a Memora recording list?**
>
> If you previously saved `memora-audio-source.json` for this folder, select it so Memora can reuse its recording IDs. If this is the first time, create a new list.
>
> **Select existing JSON** · **Create new list** · **Cancel**

**Changed audio at an existing path**, without an embedded ID:

> **This audio file has changed**
>
> “memo.wav” differs from the file previously recorded in Memora’s recording list.
>
> If it is an edited version of the same recording, keep its Recording ID. If it is a different recording, assign a new ID. Existing transcripts will remain unchanged.
>
> **Keep existing ID** · **Assign new ID** · **Cancel**

**Valid embedded ID disagrees with source JSON:**

> **The recording IDs do not match**
>
> “memo.m4a” contains a different Recording ID from the one in Memora’s recording list.
>
> The valid ID embedded in the audio takes priority. Updating the list will use that ID for future transcriptions. Existing transcripts will remain unchanged.
>
> **Update recording list** · **Cancel**

**Unreadable embedded identity, with recovery:**

> **Memora cannot use this recording’s ID**
>
> The ID information in “memo.m4a” is damaged or uses an unsupported format.
>
> You can assign a new Memora Recording ID and continue. It will be saved in the recording list for reuse. The audio file and existing transcripts will remain unchanged.
>
> **Assign new Memora ID** · **Skip recording** · **Cancel**

In the actual message, replace “is damaged or uses an unsupported format” with the identified reason. The earlier prompt that blocked all transcript saves until external repair is superseded. Successful persistence must still be described honestly for the applicable desktop/iPhone path.

**iPhone JSON save guidance:**

> **Save this folder’s recording list**
>
> Save `memora-audio-source.json` in the audio folder so Memora can reuse its Recording IDs.

This concise guidance records the agreed removal of the local-retention sentence from the proposed save wording; its final UI placement/action label remains implementation design. Use the existing share/save transport and do not claim verified save.

**Missing source JSON with a reliably matching recovery copy:**

> **Restore this folder’s recording list?**
>
> Memora has a saved copy of the recording list for this audio folder. Restore it to reuse its Recording IDs.
>
> **Restore recording list** · **Cancel**

**No source JSON or recoverable copy:**

> **Create a recording list**
>
> Memora will reuse readable IDs embedded in your audio and assign new IDs to recordings without one. Your audio and existing transcripts will remain unchanged.
>
> **Create recording list** · **Cancel**

### Next steps on resume — design first, no code yet

1. Consolidate the minimal source JSON schema and lifecycle for review: schema version, Audio Source ID, recording-relative path, Recording ID, origin, bounded change evidence and explicit unreadable-metadata recovery state. Specify validation/preservation of unknown fields, source-ID reuse, safe interrupted/concurrent writes, and reliable local recovery matching. Preserve standard UUIDs and original Apple values. Do not reopen approved behavior or add move/copy tracking.
2. Map that design to existing desktop folder and iPhone selection/save flows. Specify persistence failure messages, cancellation and recovery without claiming share completion proves a saved file. Do not introduce another save mechanism or change established transcript filenames/text/inference behavior.
3. Present the smallest application change scope and acceptance tests. Cover actual iMuse exporter fixtures across all supported containers, Apple IDs, legacy/new header labels, embedded/source mismatches and confirmation/cancel, unchanged historical transcripts, invalid/unsupported recovery and later readable embedded IDs, repeat/model/operation/destination reuse, changed-path choices, source JSON presence/access distinctions, local restoration and iPhone save limitations. Include malformed/duplicate/oversized/truncated metadata and separate combined provenance. No special deleted/moved/copied-file protection tests are required.
4. Obtain implementation authorization before editing application code. Then implement only focused Phase 3 identity work, with appropriate automated and desktop/real-iPhone acceptance. No disposable migration utility, unrelated Search/Combine work, build change for documentation alone, or deployment is authorized by this checkpoint.

No application integration tests were run during this design/documentation session.
