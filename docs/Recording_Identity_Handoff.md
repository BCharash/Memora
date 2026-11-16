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

## What was found in iMuse

Read-only review of the local sibling iMuse checkout:

- `js/recorder.js` creates the session ID when recording starts, normally with `crypto.randomUUID()`. Its fallback is a timestamp/random string, not necessarily a UUID. The ID is saved with the session in IndexedDB.
- Ordinary `downloadAudioBlob` downloads the audio Blob as-is; it does not explicitly embed that session ID. Renaming a download is not identity transport.
- `js/recording-combine-metadata.js` gives combined audio its own ID and retains source IDs. `js/recording-combine-mux.js` appends its versioned provenance box to combined M4A and verifies readback.
- Memora's current `js/metadata.js` specifically searches for Apple's `voice-memo-uuid`; it does not yet read iMuse's provenance format or a universal exported recording ID.

## Next work, in order

1. Switch to the **iMuse repository**. Inspect the current files and propose a versioned ordinary-export recording-ID contract and tests before coding. Preserve the ID across renaming/repeated export; preserve audio and existing combined provenance. Prefer a UUID for newly created recordings, and explicitly handle legacy non-UUID session IDs without silently changing existing identities.
2. Ensure export carries the ID reliably for the supported audio formats. Validate ordinary and combined exports, repeated downloads, missing/invalid metadata, desktop and real iPhone Safari. Do not claim current ordinary exports already carry the session ID.
3. Return to Memora for Phase 3: read Apple UUIDs and the agreed iMuse export metadata; write the universal `Recording ID` and readable archive/audio provenance consistently for new transcripts. Audit all existing parser/editor/export consumers of `Voice Memo ID`; changing only the writer would be incomplete.
4. Continue the approved sequence: shared authoritative editing/preference, persistent Combine/reference import, portable exports/Output controls, query-only history and shared source-specific audio resolution. Existing architecture/contracts remain the governing plan, with the completed one-time migration retired.

No iMuse implementation change, production Memora change, commit or deployment is part of this checkpoint. Historical journal entries retain earlier migration experiments for context; they are not active instructions to recreate or ship the tool.
