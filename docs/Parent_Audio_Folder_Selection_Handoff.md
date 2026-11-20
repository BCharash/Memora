# Parent audio-folder selection — handoff, 19 November 2026

## Planned for 21 November: Enable Transcription

Decision recorded 20 November 2026; **documentation only**, not implemented. Keep the initial Transcribe Audio Source and Transcript Destination selectors visible. If the user leaves untouched Transcribe for Combine/Search, returning hides its controls behind **Enable Transcription**; Settings is excluded. Direct Transcribe activity or Enable Transcription keeps setup available for the session. Reuse shared folders, defer Transcribe-only recording-list work and leave its recordings unchecked by default.

The same planned pass distinguishes never-saved batches from share-return verification prompts, fixes stale iPhone destination guidance with one prominent current-batch location, and presents one concise Audio Recording List status before the Transcript File List status. Preserve canceled/failed-save retries, files-only transcript-plus-JSON sharing, independent audio-parent JSON saves and identity/write safeguards. See the [current implementation plan](CURRENT_STATUS.md#next-implementation-enable-transcription-and-save-guidance) for the full state rules, wording, checkpoints and device acceptance. Current code/build remains **2026-11-20.7**, schema **6**; no new tests or device results are established by this plan.


## Destination reconciliation and combined iPhone delivery — 20 November 2026

Build **2026-11-20.7**, schema **6**, restores the top **Transcript Destination** selector on both desktop and iPhone. The lower desktop shortcuts remain convenient and use the same read/reconciliation path. Browse displays the selected folder's name. Selecting/reselecting a destination rereads its transcript list and immediate transcripts; native changed lists save with the existing verification/locking safeguards, unchanged lists do not rewrite. A uniquely supplied transcription child remains the default. Combine can reuse its already-read folder session rather than reading each TXT again. Corrupt/conflicting destinations block Transcribe without hiding readable Combine files.

New native transcript references are added only after the TXT write/readback succeeds; a failed TXT write does not publish a dangling list reference. Completed TXT remains available for retry if the later list save fails.

On iPhone, **Save N Transcriptions and File List to Files** shares all pending batch TXT files plus the updated memora-transcript-archive.json together, using a files-only share payload. The standalone transcript-list action is hidden for that batch. Archive/folder guidance is visible before the share sheet and remains on the page; no title/text attachment is added. Cancellation retains the batch for retry. The Audio Recording List remains a separate save because it belongs in the audio parent. Sharing cannot enforce or verify where Files writes the bundle.

After sharing, a working in-memory destination snapshot retains that bundle for subsequent batches. It is marked partial, not verified disk coverage, so it cannot authorize deletion of unseen files. A fresh folder selection replaces it with supplied Files observations. New phone batches reread the chosen snapshot rather than carrying discarded unsaved references forward. iPhone cannot reread provider changes through native handles; reselect the folder for fresh disk snapshots.

The user reports the hosted MacBook Chrome picker disappearing while browsing, before selecting a folder. Source selection calls the native picker once per click and performs no automatic reopen/reload loop. Cause is unconfirmed; no picker workaround was silently introduced. A similar Chrome 157 cancellation report is documented for Windows, with Mac reproduction explicitly unestablished: [Chromium issue 582407452](https://issues.chromium.org/issues/582407452). This is a troubleshooting lead, not a confirmed Mac diagnosis. Prior reports of unchanged iPhone JSON requiring saves also remain distinct from the now-replaced separate transcript-list delivery gate.

Verification for .7: **176 groups passed** (7 shared-folder, 59 actual-page integration, 19 production identity, 10 playback, 29 transcript-folder, 47 persistence and 5 metadata groups). Synthetic archives, isolated browser storage and a stub Search backend; no real model or user archive was used.

Device acceptance: refresh to .7; choose/rechoose a destination using top and lower controls; confirm the displayed folder name and safe JSON reconciliation. On iPhone transcribe multiple recordings, save the batch and JSON together to the named folder, inspect filenames/content, cancel/retry, then run another batch and confirm previous references remain. Actual Files placement and cloud sync are unverified by synthetic harnesses. No user-archive mutation, commit or deployment.


## Shared folder access in production — 20 November 2026

Build **2026-11-20.5**, schema **6**, integrates the tested shared Audio Source and Transcript Destination/Source rows. Select the parent audio folder in any workspace; one page-session selection supplies all three views. A unique immediate **transcription** subfolder becomes the shared default. The transcript chooser offers immediate child folders or a separate folder; changing the audio root clears the previous override. No default means **None Selected**, not an arbitrary backup folder. Direct transcript selection without audio still works; it cannot grant access to an unselected parent. Selecting another transcript folder retains existing audio access.

Combine and Search open the shared transcript choice when visited. Selecting audio in Transcribe does not start Search indexing. A granted parent resolves playback through the prepared Recording ID inventory, including renamed audio, followed by the existing actual embedded/sample identity check. Manual playback caches are scoped to that exact parent selection. Missing IDs do not silently borrow another parent's audio. Each child owns its own transcript and embedding JSON; no folders or indexes are merged.

Native browsers use directory handles, avoiding the upload-style input. iPhone reuses supplied File snapshots and rebases only the chosen child's immediate files; grandchildren such as combined exports remain excluded. This grants read access, not writing or upward navigation. Transcribe reuses a supplied child transcript JSON, or reconstructs a missing list from established TXT identities; corrupt/conflicting metadata blocks rather than inventing a replacement. Files sharing remains explicit with destination guidance and no claim of verified placement. An iPhone selection cannot reveal empty folders omitted by Files, and newly saved files require a fresh folder selection to enter that snapshot.

Source activity/save controls are available from Combine and Search. Folder changes protect unsaved edits, transcript/list exports and Search Index updates; cancellation retains selections. Actual device picker/share/playback and cloud behavior still need user acceptance. Synthetic tests use isolated storage and stub Search indexing; they do not demonstrate real model execution. No user-archive edits, commit or deployment were performed.

Verification: **174 groups passed** — 7 shared-folder access, 57 page integration, 19 production identity, 10 playback, 29 transcript-folder, 47 persistence and 5 metadata/performance groups. These use synthetic data and isolated browser storage.

Acceptance: refresh to build .5; select a parent from Combine without first using Transcribe; verify the default transcript folder and Play without another audio picker; switch transcript children and confirm audio access remains; visit Search and verify only the chosen child's transcripts; change the audio parent and confirm the old transcript choice clears; cancel a selection with pending work; on iPhone save JSON to the displayed archive / child destination. Retest on both MacBook and iPhone.


## Shared folder rows test ready — 20 November 2026

**test.html test 5** adds the user's proposed shared folder architecture. Transcribe shows Audio Source and Transcript Destination; Edit/Combine and Search show Audio Source and Transcript Source. Values begin at **None Selected**. The button remains **Select Source Folder**, with **Select Transcript Destination/Source** for the second row. Names use Title Case; nested locations show archive / subfolder. One state object supplies all three test views during the page session. These are folder-selection views, not actual transcription/editing/indexing.

Selecting a root defaults to its immediate transcription subfolder when uniquely present. An explicit folder choice propagates across views. Changing audio root discards the previous transcript choice/inventory and discovers the new default; without one the value remains None Selected even if another lone transcript folder exists. The chooser lists supplied immediate subfolders and can browse a separate folder. Separately selected folders are labeled as such rather than claiming an unverified ancestor path. Their transcripts can still link by Recording ID against the selected parent audio. Native empty subfolders are visible through handles; iPhone cannot infer an empty folder omitted from supplied Files entries.

Desktop source/browse actions use **showDirectoryPicker** whenever available, bypassing the upload-style file input. The fallback remains directory input where that API is absent. Native enumeration requests read access and stores handles only in page memory. Picker cancellation/failure retains the prior selection. The old lower-level transcript selector remains available for diagnostic testing and synchronizes with the shared rows.

**Save Test File** is an explicit exception to the earlier read-only test: it creates a new uniquely named disposable text sample containing destination guidance, never a real transcript/JSON. Desktop requests write permission when needed, refuses an existing name and verifies readback. iPhone uses file sharing (or a download fallback) and names the intended destination without claiming verified placement; the user must choose Save to Files. No sample is created by selecting folders or switching views. No Memora IndexedDB, model, production startup, application build/schema or actual archive content was changed while implementing/testing this page; synthetic handles covered the write tests.

Device steps: refresh until Standalone test 5 appears; select an Audio Source; check transcription defaults; switch all three views; choose an alternate transcript folder and verify it follows across views; choose another root and verify the old choice clears. In Transcribe, optionally press Save Test File and confirm the destination in Files. Then use the existing temporary-list/link/player actions and Share Report. Keep production pending-edit/save handling as a separate integration requirement: this prototype has no real unsaved transcription/editor state.

**15 new synthetic groups passed**, alongside 20 adapter/UI and 22 identity-helper groups (**57 total**). Coverage includes default/override/reset, no/ambiguous defaults, empty native folders, native picker routing without input, cancellation, separately selected native/file-input transcripts, sample save/readback/refusal/permission/cancellation, report guidance and 320px layout containment. Actual test-5 MacBook/iPhone folder/save acceptance remains pending. Test-4 device acceptance below is established separately: both reports rebuilt identical 107-entry embedded-ID inventories, had zero blocked/ambiguous entries, linked/played the selected transcript, and passed the synthetic fallback check; those reports did not include optional JSON comparison.

## Archive data maintenance completed — 20 November 2026

A later read-only comparison confirmed all 107 audio-ZIP IDs against the Dayananda audio list. The updated transcript ZIP lacked Alaksmi relative to the original; 15 other audio recordings had no transcript in either supplied ZIP. Alaksmi was restored with current metadata and unchanged body. This does not repair the other missing transcripts or resolve the earlier cross-device original-folder discrepancy.

At explicit user request, Audio Source ID header lines were then removed from 95 Dayananda TXT files (92 authoritative transcripts and 3 testing transcripts), and 318 Dreams transcripts (2016:83, 2017:114, 2018:121). Byte-exact pre-cleanup ZIPs were saved in each archive and every remaining byte was verified unchanged. Original folders and JSONs were untouched. Dreams original/current comparisons had identical filenames, Recording IDs, models, operations, dates, durations and body bytes; no transcript loss was found in those three archives. Production currently accepts absent source headers but still writes the field on new transcripts; checkpoint 3 must finish that retirement. This data cleanup does not implement production identity changes.

## Checkpoint 2 device test ready — 20 November 2026

Root **test.html now says Standalone test 4**. The read-only adapter rebuilds a temporary inventory from immediate parent audio using checkpoint-1 identities. It ignores obsolete Audio Source ID header fields during this test's parsing and linking; production parsers/writers are unchanged. “Pretend the Audio Recording List is missing” is checked by default: Build Temporary Recording List does not read or replace the existing JSON. Unchecking enables a read-only comparison against that JSON; invalid/mismatching list contents are diagnosed, not used to override verified audio identities. The preview is inventory evidence, not a production-schema replacement file.

Device steps: select the parent archive; build the temporary list with simulation checked; choose a transcript subfolder and transcript; Find Linked Audio and Play; run Synthetic Fallback Check; share the report. Then uncheck simulation, rebuild and compare, and repeat the link. Do not delete/rename any real JSON to test missing-list behavior. The report file includes the latest temporary inventory preview and link results, never transcript body text. A page refresh discards the inventory. The test still uses directory input on both devices; native desktop folder-picker integration remains production work.

Audio with embedded IDs is linked directly by Recording ID; absent IDs use the frozen sampled fallback. Unreadable/unsupported/invalid/conflicting metadata remains blocked and reported. Several files sharing an ID remain ambiguous with locations. Legacy TXT without a Recording ID can use a root-contained relative path only and is labeled unverified. Combined exports/nested audio are outside the immediate-folder scope. Existing transcript-folder Archive UUID safeguards remain in place.

**20 synthetic adapter/UI groups plus 22 identity-helper groups passed.** Coverage includes no-JSON and simulated-missing rebuilds, ignored historical source IDs, invalid/list-conflicting data, missing/wrong/duplicate Recording IDs, subfolder isolation, root-contained legacy paths, sampled rebuild/rename, unsupported/invalid metadata, cancellation and the actual page controls/report privacy. Synthetic media tests establish player loading, not actual playback. MacBook/iPhone test-4 acceptance, iCloud behavior and real-archive timing remain pending. No production startup, file persistence, database, model, application-build or user-archive change. Checkpoint 3 is not started.

## Superseding identity direction — 20 November 2026

Use the [recording identity checkpoint plan](Recording_Identity_Checkpoints.md) before continuing. Later audits and four repaired audio lists established that recording IDs match while generated source UUIDs can diverge. The agreed target no longer requires those UUIDs for matching; embedded IDs or a reproducible sampled fallback make the audio list rebuildable. Earlier test-3 source checks below describe current code, not the new target. Production integration/cache retirement/header cleanup remain staged future work. The user reports repaired linking worked; that does not establish the new identity design on-device.

## Follow-up test — 20 November 2026

The user authorized extending the standalone test, not production integration. **test.html now says Standalone test 3.** A new read-only js/archiveFolderAccess.js adapter discovers recognizable TXT in immediate subfolders (or folders with a transcript-list filename), caches bounded header reads, and resolves selected transcripts through the parent Audio Recording List plus IDs. tests/parent-folder-test-ui.js supplies folder/transcript choices, a bounded preview, link results and a player. These modules are not imported by production startup.

Select a parent, choose one transcript subfolder when several are found, select a transcript, tap **Find Linked Audio**, then Play. Full verification requires matching transcript Audio Source ID, list Recording ID and embedded audio ID. List-only/legacy links are explicitly labeled; mismatched source/embedded IDs, invalid lists, absent ID entries, missing audio and ambiguous supplied paths block linking. Legacy fallback uses a safe exact archive-relative filename rather than searching unrelated subfolders. Mixed Archive UUIDs block the selected folder in this test. No list creation/reconciliation, saves, embeddings or models are involved. Shared reports include link outcomes, not preview text.

Disposable Chrome checks passed for discovery, ID-based resolution, missing audio/list, invalid list, wrong source/recording/embedded IDs, legacy labeling, duplicate/missing paths, preview access, folder choice, player loading and report privacy. Synthetic identity fixtures are not playable-audio acceptance. Actual test-3 MacBook/iPhone association and playback acceptance remain pending. The earlier test-1/2 evidence below is preserved; it does not establish these new resolver results on-device. Application build/schema remain unchanged.

## Historical resume point — 19 November 2026

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
