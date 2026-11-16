# Recording identity — checkpoint and iMuse handoff

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

## Resume checkpoint — 16 November 2026: source-owned recording identity

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
