# iPhone Dreams/2017 audio crash — desktop handoff

Recorded **24 November 2026**, covering the conversation of 23–24 November. Inspected source: build **2026-11-21.11**, schema **10**. Actual deployed iPhone build was not verified.

## Authorization and resume boundary

The user requests investigation and documentation: **“no code yet.”** No application changes, instrumentation, build/schema changes, cache clearing, commit or deployment have been made. Proposals below are not authorized implementation. This issue is separate from the JavaScript cleanup plan and Whisper memory work.

Resume with the early audio-selection and identity-inspection path. Do not replace required initial transcript preparation with lazy loading. Do not require large cloud transfers to continue the investigation.

## Observations and user corrections

1. Loading Dreams/2017 audio on iPhone consistently crashed Memora in either Combine or Search, soon after selection. The screen went blank, unlike other resource crashes the user had seen.
2. Dreams/2018, much smaller, loaded. Dreams/2016, just under 150 MB, loaded. 2017's size and file count were not supplied. No safe size threshold is established.
3. The user tested a transcript-only copy, with and without one audio file in the same folder, through both Select Audio Folder and Select Transcript Folder. They reported success, including that the audio-folder route loaded with at least one audio file present. The exact outcome of each combination was not individually recorded; do not invent a full test matrix or establish an empty-folder bug from this exchange.
4. The user had no Wi-Fi and tethered the computer to the iPhone. Syncing a large cloud folder was impractical. An initial suggestion to split copies of the audio archive was therefore unsuitable at that time.
5. Subsequently, loading **2017 transcription first, then 2017 audio worked**. The user believes this suggests a resource issue.
6. Both Combine and Search require transcripts prepared initially. The transcription child is the preferred default. Other children need not be loaded unless selected, but **2017 has only one transcription child**, so loading other children does not explain this case.
7. The failure also occurs on the **first run after restarting the iPhone**. Obsolete session retention is therefore unlikely to be the primary cause.
8. The user says it crashes very early, normally before transcripts are read, and believes audio loading is responsible. The exact last visible progress message and whether the first per-file check appears remain unknown.

## Interpretation and unresolved boundary

Resource pressure or preparation timing is plausible, not measured or proven. A blank page is compatible with process termination, not diagnostic. There is no console trace, termination report or iPhone memory measurement.

The two leading stages are:

- **Files/browser prepares the selected folder**, before delivering it to Memora. The current picker does not let Memora control delivery in incremental batches.
- **Memora inspects audio identity**, immediately after delivery. Reads are sequential and bounded individually, but many small reads can still have browser/provider overhead.

Successful transcripts-first loading makes a consistently unreadable recording less likely, without excluding file/provider problems. Timing, provider preparation and caching are possible explanations, not established causes. Current code resets transcript consumers when attaching audio; this success is not evidence of a deliberate transcript-reuse optimization.

## Verified source findings

### Picker and early audio work

- `js/storage.js`, `selectFolder()`: uses native directory picking where available; otherwise the existing folder input (`webkitdirectory`), as on iPhone. The change handler captures `Array.from(input.files)` and returns those File objects; it does not explicitly read their full bodies.
- `listAudioFiles()` filters immediate audio only, **after** selection delivery. Filtering cannot restrict prior Files/provider preparation of descendants. Browser download/materialization/internal buffering was not measured.
- The input is cleared before a subsequent selection, not immediately after successful capture. Reviewing its lifetime is an option, but clearing it cannot be assumed to free backing bytes retained by other File references.
- `js/app.js`, `loadAudioSource()`: picker → immediate audio list → `prepareSource()` → discover child folders → commit source/reset consumers → prepare Transcribe destination → optional recording details → active Combine/Search preparation.
- `js/transcriptionIdentity.js` delegates to `openAudioFolderInventory()` in `js/audioFolderCache.js`.
- Every new iPhone File snapshot is inspected before association with cached metadata. Filename/size/time alone are intentionally insufficient identity evidence.
- Identity checks are already **sequential**, with an event-loop yield every 16 successful records. There is no unbounded parallel audio inspection to fix by reducing concurrency to one.
- `js/recordingIdentity.js`: container inspection uses Blob slices. MP4 traversal skips payloads by box size rather than reading/decoding entire recordings. It can perform many small reads. Payload/traversal limits exist; real-archive total read overhead was not measured.
- `js/reproducibleRecordingIdentity.js`: only after a supported container positively lacks embedded identity, samples at most **256,000 bytes**, frames that sample with file size and hashes it. This allocates a sample and framed input, not a whole-file hash buffer.
- Successful identity results are WeakMap-cached for the exact immutable File; a new selection must be inspected again.
- Duplicate Recording IDs are checked across the completed inventory. Progressive loading must preserve ambiguity safeguards.
- Catalogue storage contains metadata, not full audio. Current catalogue operations read complete saved rows, including other folders. This is an optimization possibility, not evidence of the cause.

### Later work and independent opportunities

- `js/sharedFolderSelection.js`: child discovery constructs `File([file], ...)` wrappers for every immediate file of each child, including non-TXT contents. A unique transcription child is the default. Wrappers do not establish full byte duplication in RAM. Lazy construction for unselected children is sensible but not an explanation for this single-child case.
- Audio selection resets Combine/Search and reads the default transcript folder for Transcribe destination preparation, then loads the active consumer. Previously enabled Transcribe can also trigger recording-list preparation while another tab is active.
- `js/transcriptionUI.js`: recording details use at most two readers. The application wrapper requests `metadataOnly:true`; MP4/M4A uses slices and other formats temporary media elements with cleanup, avoiding full decoding for the list.
- `js/combine.js`: immutable-File WeakMap snapshots retain original TXT text and parsed bodies while those Files remain reachable. Consumers of the same File reuse reads; rewrapped/new File objects do not.
- `js/combineUI.js` already defers transcript-body DOM, editors and audio controls until needed. Playback uses preload none and attaches audio on demand.
- `js/searchUI.js`/`js/search.js`: Search reads TXT and the embeddings JSON, reuses compatible vectors and constructs in-memory sentence/context representations. Archived vectors are also restored to the local semantic cache. New embeddings require the semantic worker only when missing during index preparation.
- Separate cleanup gaps: Search UI reset does not call the existing search-module `clearSearchIndex()`; playback file/root maps persist across resets; clearing Combine rows does not clear its selected-file array. These may retain prior resources but do not explain a first-run-after-restart crash by themselves.

## Possibilities to assess — no implementation approval

| Option | Possible benefit | Limits/tradeoffs |
|---|---|---|
| Establish picker versus inspection boundary | Targets the actual early phase | Last message is coarse evidence; UI rendering may lag |
| Smaller scheduled batches of identity inspection | Reduce bursts and give UI/browser work opportunities | Already sequential; yields do not guarantee garbage collection/provider release |
| Bounded buffering of nearby container reads | Reduce many tiny provider/Blob operations | Preserve validation and ID semantics; may increase bytes read |
| Review input/File handoff lifetime | Avoid unnecessary retained selection state | File references are not proof of full RAM copies; measure benefit |
| Progressive identity inventory | Reduce work before initial attachment becomes usable | Larger design: pending state, playback/inference verification and later duplicate detection |
| Alternative individual/batch audio selection | Avoid one large folder preparation | Changes workflow and completeness/renamed-file lookup guarantees |
| Lazy views for unselected children | Avoid unnecessary wrappers | Independent improvement, not the leading explanation here |

Do not skip identity validation based on cached filenames/sizes/times. Do not change the prefix fingerprint size or hash format as a shortcut. Do not defer transcripts required by Combine/Search. Do not present transcript deferral or obsolete-session cleanup as the main fix for this incident.

## Next evidence and validation

The key missing observation is whether **“Checking audio: 1 of …”** appears. Existing phases include waiting for Files, reading audio metadata, per-file checking, finding child folders and transcript loading. A recurring filename would motivate inspecting its container/read pattern. Failure before per-file progress favors picker/handoff investigation, but rendering lag prevents a definitive inference from the message alone.

Useful when convenient: archive count/bytes/largest file/formats, iOS/browser/PWA version and deployed build. These are not prerequisites for further source inspection. Do not require duplicate cloud archives, cache resets, JSON rebuilding, schema changes or model self-tests.

If later authorized, propose lightweight phase timing and read-count/byte diagnostics, without logging audio/transcript content or repeatedly forcing crashes. No instrumentation has been implemented or approved. Use already local files where possible; no large cloud transfer is needed for application diagnostics.

For a later narrow change, validate unchanged IDs/duplicate detection, bounded reads/concurrency, cancellation/failure, preferred transcription-child preparation in both Combine and Search, and renamed-recording playback. Automated checks cannot establish iPhone stability; device acceptance remains separate.

## Evidence limits and external references

This is source review plus user-reported observations, not a measured diagnosis. No automated tests or device profiling ran for this documentation task. Review source again if the desktop checkout differs.

- [WebKit memory debugging](https://webkit.org/blog/6425/memory-debugging-with-web-inspector/): resource spikes can terminate pages on constrained platforms; does not diagnose this incident.
- [W3C File API](https://www.w3.org/TR/FileAPI/): File/Blob and slice semantics; does not establish actual iPhone RAM cost of wrappers/provider reads.
- Historical picker defects surfaced in web searches were not matched to this device/version and are not evidence of the cause.
