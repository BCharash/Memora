# Audio library hierarchy — architectural review

18 November 2026. **Design discussion recorded at the user's request; implementation is paused.** The user wants a complete audio-source inventory independent of transcription selection and proposed a parent `All Audio Archives` folder containing individually self-contained archives. This note records that direction and the recommendations/open decisions; it does not approve a final parent schema, recursive indexing implementation, reorganization or migration. The separately approved iPhone list-selection clarity and pending-save feedback work is allowed to proceed.

The current code still enrolls selected recordings incrementally. It does not implement the library catalogue, complete-source indexing or a unified recursive scan. Checkpoint 3 is committed as `4c8e5f7`; broader acceptance is incomplete. Candidate 2026-11-18.4 includes the reordered TXT header and implements the separately approved iPhone list-selection wording, wrong-kind checks and pending-save pulse; the previous picker defect report is unconfirmed after the user clarified selecting the other JSON type.

## Proposed preferred organization

```text
All Audio Archives/
├── memora-library.json                 # Proposed library catalogue
├── Audio Archive 1/
│   ├── recording-a.m4a
│   ├── recording-b.m4a
│   ├── memora-audio-source.json        # Recording list for this audio source
│   └── transcription/
│       ├── memora-archive.json         # Transcript file list
│       ├── individual transcripts...
│       └── combine/
│           └── combined documents...
└── Audio Archive 2/
    ├── recordings...
    ├── memora-audio-source.json
    └── transcription/
        ├── memora-archive.json
        └── combine/
```

`memora-library.json` is a proposed filename, not an approved schema. The layout is a proposed preferred pathway, not a requirement to move the user's four existing archives. Each child should remain usable independently when selected without its parent. Archives in separate locations must remain supportable by explicit association.

## Three document responsibilities

| Document / user-facing name | Responsibility | Authority boundary |
|---|---|---|
| Library catalogue (proposed parent JSON) | Identifies participating child audio sources and transcript archives, with locations relative to the chosen library root. | References child manifests; does not become a second authoritative recording inventory or a filesystem permission grant. |
| Audio recording list (`memora-audio-source.json`) | Audio Source ID, recording paths, Recording IDs, origins, fingerprints and approved recovery state for one managed audio source. | Source-owned recording identity remains independent of transcript destination/model/operation. |
| Transcript file list (`memora-archive.json`) | Archive UUID and associations between Recording IDs and transcript paths, models and operations. | Identifies a logical transcript archive; does not own fallback audio identity or contain transcript bodies. |

Latest approved user-facing names: **Audio recording list** and **Transcript file list**. Prompts identify the exact filename and destination folder. The earlier “Transcript archive index” recommendation was superseded after the user explained confusing the two JSON documents. The file names, schemas and identities remain unchanged. A separate Search index remains derived search data.

Recommendation: the parent catalogue should reference existing child identities/manifest locations rather than duplicate every recording entry. A derived lookup cache may accelerate resolution, but child manifests remain authoritative and refresh/validation rules must prevent a stale cache from claiming current file availability. Whether the library itself needs a UUID, exact schema fields and discovery/update rules remain open.

The folder layout commonly gives one audio source a nearby transcript archive, but these identities must stay distinct. Different transcript destinations can refer to the same audio source; provenance remains per recording rather than assuming every transcript archive permanently has exactly one audio source.

## Complete inventory and source ownership

The user's requirement is that selecting only one recording for transcription must not restrict the source recording list to that recording. All audio belonging to the managed source should be inventoried; only checked recordings should be transcribed. The previous incremental-enrollment implementation does not satisfy that requirement and is now subject to architectural revision.

Recommended separation:

1. **Library discovery:** identify participating child archives/manifests and their boundaries.
2. **Recording inventory:** inspect IDs/fingerprints for all audio belonging to each source being indexed.
3. **Transcription:** run inference only for explicitly selected recordings.
4. **Search/Combine resolution:** use validated source/archive references and current access associations.

Opening a library need not automatically fingerprint all audio or assign IDs. An explicit indexing action or transcription-triggered full inventory is proposed; the exact timing, progress/cancellation, refresh policy and persistence failure behavior are not settled. Avoid full-library hashing every time one file is played or a search runs.

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

Current Memora source audit: `storage.js:listAudioFiles` enumerates only immediate files for directory handles. Its file-input branch filters the returned File list and can include nested selections. That difference must be resolved deliberately; neither branch constitutes a complete library implementation.

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

## Decisions and evidence needed before implementation resumes

1. Agree individual-source nested-folder ownership and child-manifest boundaries.
2. Confirm the preferred layout and whether it remains optional for independently located archives.
3. Specify the parent catalogue schema, identity if needed, relative paths and validation/conflict/update rules without duplicating child authority.
4. Specify complete-source inventory timing, supported formats, changed/invalid recordings, cancellation, write failures and large-library limits. Indexing completion must not be reported after silently skipping unresolved audio.
5. Inspect a disposable nested hierarchy on actual desktop and real iPhone/iCloud Drive: file/path completeness, JSON selection, save/refresh and playback across at least two child sources. Do not use the user's four real archives for write tests.
6. Review shared playback/Search interfaces and incremental implementation/acceptance checkpoints. Existing approved merge/edit/preferred-transcript rules remain unless a specific revision is agreed.

No recursive/library implementation, filesystem reorganization, new schema or migration is authorized by this documentation update.

## Approved interface changes — candidate 2026-11-18.4

The initial iPhone picker-defect report was withdrawn as a diagnosis: the user had confused the two JSON types and had not tried .2. There is no confirmed native iCloud picker defect or accepted device fix. The unfiltered picker is retained as a compatibility choice alongside strict bounded content/schema validation.

Approved names and messages:

- **Audio recording list:** select/save `memora-audio-source.json` in the audio folder.
- **Transcript file list:** select/save `memora-archive.json` in the transcription folder.
- Choosing the wrong list explains which document was selected and names the correct file/folder. The chooser remains open for retry/cancel; no file is converted or overwritten by selection.
- Both pending list-save buttons reuse the existing blue-halo/black-outline animation. Cancellation/error retains the pending state. Completed sharing clears only that artifact's emphasis; reduced motion suppresses animation. Share completion does not establish filesystem placement.
- New TXT headers place dates/duration, Whisper model/operation/optional language first, followed by a blank line and identity/provenance. Values, existing transcripts, audio and JSON schemas are unchanged.

Verification: **22/22** isolated Chrome integration groups passed. Direct comparison of transcription and translation headers confirmed identical metadata values and transcript body bytes after reordering. Actual iPhone wording, wrapping, picker and pulse acceptance remain pending. These changes do not implement the parent library or archive-wide reconciliation.

## Migration-copy and inventory findings

The user clarified that migration was completed on Windows: `transcription1` retains the legacy files and `transcription` contains the migrated files. Those migrated folders remain unsynced on the Windows desktop and are unavailable while the user is away. The Mac/iCloud copies examined contain legacy headers; this is not evidence that migration failed.

Read-only Mac audit found 110 audio files in the Ashram source, 91 legacy transcripts in its main transcription folder, and only the recent one-entry source/transcript manifests. All 91 transcripts matched available audio uniquely by Recording ID. The source test entry's ID/size/SHA-256 matched, while the transcript list referenced the deleted test TXT and omitted the existing transcripts. A stored underscore/question-mark filename difference also broke one relative audio path despite matching IDs. No archive, audio, transcript or manifest was changed.

Do not replace these identities, rerun a migration against the originals, or promote the one-entry test UUIDs as the original migrated archive identities. A separate migrated **test copy** can be evaluated with explicit test identities; comparison with the original Windows manifests is still required for real-archive reconciliation. Archive-wide availability checking remains an application gap, independent of the sync discrepancy.

An isolated reconciliation prototype has passed 27 automated groups and the user's manual harness check, using synthetic data and disposable browser-private folders. That lab is held separately from the interface/header candidate. It is not production reconciliation or evidence of iCloud/mobile enumeration. Real multi-archive Search/Combine audio playback remains an acceptance priority; the current resolver still relies substantially on filenames/manual source selection rather than the proposed shared identity resolver.
