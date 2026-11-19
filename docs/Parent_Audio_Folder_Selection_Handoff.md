# Parent audio-folder selection — handoff, 19 November 2026

## Resume here

The user requested documentation so this work can continue later. **Production Combine/Search parent-folder selection is not implemented.** The completed work is a standalone access test and user testing on MacBook Chrome and iPhone Safari. No further production implementation is authorized by this handoff alone.

Latest committed source at this checkpoint: **42af3fe** (report sharing), preceded by **e69536c** (test page) and **3ad6a1f** (documentation review). Application build remains **2026-11-19.25**, schema **6**. The test is [test.html](../test.html), labeled **Standalone test 2**. Its additions do not change the production build. Inspect Git status and current code before resuming.

## Agreed workflow

- Combine and Search should allow selecting the **parent audio archive folder**, independently of any prior use of Transcribe. Reuse the selected parent for audio playback and discover transcript subfolders below it.
- Each transcript subfolder remains independent, with its own **memora-transcript-archive.json** and **search-embeddings.json**. Do not merge their lists or indexes at the parent. The user's rule: if transcripts should live together, place them together.
- One eligible transcript folder opens automatically; several produce a folder choice using relative names. The discussion settled on **choosing one folder**, not silently searching or combining all folders.
- Recognizable Memora TXT files should allow discovery even when that folder has no JSON yet. Presence of arbitrary TXT alone does not establish valid transcript/archive identity. Detect candidates without modifying them or creating JSONs in every discovered folder.
- Preserve direct transcript-folder selection. The proposed initial scope is one audio archive and its immediate transcript subfolders; deeper recursive discovery and multi-archive ownership remain separate decisions. The test enumerates deeper paths for evidence, not production authorization to process everything recursively.
- On iPhone, use audio and transcripts supplied in the same directory-input selection. Saving still requires an explicit Files action, with destination guidance identifying **archive / selected transcript subfolder / JSON filename**. File selection is not a writable folder handle or proof of save placement.
- Keep reconciliation scoped to the chosen transcript folder. Preserve identity/conflict/read-failure safeguards; do not infer deletion simply because another folder or uncertain selection omitted files. Search's shared transcript reconciliation/independent two-JSON save integration remains separate unfinished work.

## Why production currently asks for audio

The shared playback path in searchUI.js resolves against the selected transcript source and source-scoped in-memory audio roots/cache. It cannot navigate upward through a directory handle. Desktop Audio Recording List recovery records can contain directory handles, but playback currently does not retrieve them by Audio Source ID. The proposed parent selection supplies access directly and does not require Transcribe first. JSON IDs describe identity; they do not grant browser filesystem access.

## Standalone test and limits

The test deliberately uses **webkitdirectory file input on both devices**. It groups supplied relative paths, counts audio/TXT/JSON/other files and recognizes audio/transcript/embedding JSON filenames. It does not import production modules, use IndexedDB, upload files, write archive files or load models. Listing does not read file contents. Explicit file checks read at most 64 KB; JSON validation is attempted only when the whole file fits. Audio loads only on request using an object URL.

Test 2 adds **Share Report** and **Download Report**, including every supplied path. Copy Report retains the shorter summary. The user successfully saved and supplied a report from iPhone. Synthetic Chrome checks passed for nested grouping/counts, recognized JSON, a supplied-file read, omission of transcript text from the report, missing-path warnings, replacement selection and audio reset. Native iPhone sharing and actual playback were reported by the user, not established by those synthetic checks.

The test cannot establish selection completeness or iCloud sync state. Empty folders do not appear in directory-input file lists. A listed filename does not prove its contents are readable; only explicitly checked files were read. It does not validate archive/recording associations, production reconciliation, embedding saves or full large-archive reliability.

## User device evidence

Archive: **Dayananda Ashram Audio journal**.

| Observation | MacBook Chrome | iPhone Safari |
|---|---|---|
| Initial report time (UTC) | 2026-11-19 18:13:58.982 | 2026-11-19 18:16:15.084 |
| Browser reported | Chrome 157.0.0.0, Macintosh | iPhone OS 18_7; Version/26.6.3 Safari |
| All supplied files | 303 | 313 |
| Audio / TXT / JSON / other | 107 / 185 / 3 / 8 | 107 / 200 / 3 / 3 |
| Nested files / missing relative paths | 194 / 0 | 205 / 0 |
| Parent audio / audio-source JSON | 107 / 1 | 107 / 1 |
| transcription TXT / JSON | **91 / 2** | **91 / 2** |
| transcription-original TXT | **91** | **106** |
| testing TXT | 3 | 3 |
| Explicit JSON read | Audio Recording List, 44,652 bytes, valid JSON | Same filename/size, valid JSON |
| Explicit TXT read | First Dream at the Ashram, transcription-original | Last day, testing |
| Playback started from original selection | I am awareness.m4a | Wednesday 20 september forehead to pranam.m4a |

Both devices supplied memora-audio-source.json at the parent plus memora-transcript-archive.json and search-embeddings.json under transcription. This supports parent-selection access and playback **for this archive**, without a second audio picker. It is not production acceptance or evidence that every listed file was read.

## The 15-file discrepancy

The iPhone test-2 report at **2026-11-19T18:27:16.473Z** repeated the 313-file/106-original-TXT result. The user saved it as memora-folder-selection-report.txt in Dreams/2018; that location is only the report's save destination, not the tested archive. No report or transcript content was copied into the repository.

A read-only filename comparison found **106 distinct immediate original-folder TXT paths**, containing all **91** current Mac TXT names plus these **15**:

- 2023-06-26 - Alaksmi - medium.txt
- 2023-06-26 - Rituals and precision - medium.txt
- 2023-07-03 - We are not our thoughts - medium.txt
- 2023-07-13 - Non meditation meditation - medium.txt
- 2023-07-14 - The ugly part two - medium.txt
- 2023-07-15 - Means to end - medium.txt
- 2023-07-16 - Stabilized samadhi what is Satya - medium.txt
- 2023-07-18 - Be sugar 2 - medium.txt
- 2023-07-19 - Karma - medium.txt
- 2023-07-21 - Ashtavakra - medium.txt
- 2023-07-21 - Defective pot - medium.txt
- 2023-07-22 - Devine feminine worship - medium.txt
- 2023-07-22 - Ganesha - medium.txt
- 2023-07-27 - Final thoughts - being there - medium.txt
- 2023-07-27 - Giving - medium.txt

There were **no duplicate supplied paths** (313 total, 313 distinct), and no Mac-only original-folder TXT names. The local Mac folder had 85 Medium and 6 Large TXT files, no nested TXT, and .DS_Store as its only other immediate file. The main transcription folder matched on both reports. Do not attribute the discrepancy to a particular sync/cache mechanism: its cause is unconfirmed. Do not delete the 15 files, reset storage or reconcile them away. If that original folder is used later, verify the extra filenames and readability on-device, then compare current inventories before trusting removal reconciliation.

## Earlier unnecessary Audio Recording List save

The user also reported one iPhone .25 source opening requesting a save for 121 recordings in Dreams/2018 while Mac Chrome did not. Later supplied old/replacement JSON files were byte-for-byte identical, but the original pre-save snapshot was not preserved during the first investigation. An isolated Chrome exercise of the iPhone file-input persistence path accepted the supplied 121-entry list as unchanged. After saving/reloading, the iPhone stopped requesting a save, and it subsequently accepted a newly Mac-created list. **Root cause remains unconfirmed; no production fix or diagnostic change was made.** Do not label this as a confirmed serialization, stale-cache or iCloud defect. If it recurs, preserve distinct before/proposed snapshots before saving.

## Next implementation checkpoint

On resumption, read this handoff, CURRENT_STATUS and current file-access/playback contracts. Propose a small shared parent-selection/discovery adapter with native writable subfolder handles versus correctly rebased iPhone File selections. Preserve chosen-subfolder scope, archive identities, independent JSON ownership, current save/conflict safeguards and source-scoped playback checks. Determine how candidate folders are recognized and how missing/ambiguous/mixed identities are presented before updating production UI. Do not assume a selected ancestor makes every nested transcript folder a single archive.

Validate native and iPhone paths independently: one/multiple/no eligible folders; transcript folders with/without JSON; duplicate audio basenames; correct selected-folder save guidance; missing/cancelled/unreadable selections; retained direct-folder flow; and playback without first visiting Transcribe. Reuse supplied immutable File snapshots rather than rereading the archive for discovery and again for each consumer. Defer index generation until the chosen transcript folder is known.
