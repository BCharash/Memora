# Memora — current status and resume instructions

Save and editor workflows updated **25 November 2026** for application **2026-11-25.9**, database schema **10**. See the [iPhone save flow audit](iPhone_Save_Flow_Audit.md) for destinations, revision history and device checks.

## Current behavior

The application has Transcribe, Combine/Edit and Search, with shared page-session audio/transcript folder access. Desktop uses native directory handles when available; iPhone uses supplied file snapshots and explicit Files sharing. Selecting a folder does not upload its contents to a Memora server.

Both external inventory sidecars are retired: **memora-audio-source.json** and **memora-transcript-archive.json**, including the earlier memora-archive.json, are not production authorities and are not created or saved. Existing files remain untouched. **search-embeddings.json remains active** and separate. No inventory JSON rebuild, archive remigration, cache reset or detailed model-metadata backfill is required for the current code.

The source of truth is embedded/reproducible audio identity and the selected TXT files' metadata/current text. A locally cached observation does not grant access to a file or supply an invented identity to an existing transcript.

## Audio access and playback

**Select Audio Folder** in any tab selects one parent audio folder. Immediate audio is inventoried; transcript children can be discovered, and a unique child named transcription becomes the shared default. Other transcript folders can be selected with **Select Transcript Folder**. Direct transcript-folder selection works, but cannot grant access to an unselected parent audio folder.

Combine and Search use the selected audio inventory to resolve recordings by Recording ID, including renamed files. Actual-file identity checks remain part of supported playback/inference paths. Ambiguous duplicate recording identities are reported; a newer audio file is not silently chosen. The current shared selection retains one active audio source, not a multi-archive resolver.

Both views try to resolve and verify the recording when Play is tapped. The audio location hint appears when manual selection is needed.

Source preparation has activity/progress feedback. Browser/iCloud preparation may still delay delivery of files; bounded application reads do not prove bounded provider download time. Native directory picking avoids upload-style selection where the API exists; iPhone's folder-input confirmation is browser-controlled.

## Transcription and saving

Transcript Destination sits directly below Audio Source. Select Transcript Folder opens a single picker for existing folders, the audio source itself, and new destinations. The default is an existing transcription subfolder when available, or the audio folder. Destination TXT metadata is read before a new collection is used. A new empty destination needs no JSON; its first generated TXT carries its session Archive UUID.

Initial Transcribe setup is visible. After an untouched departure to Combine/Search, return is guarded by **Enable Transcription** only if a transcript source/destination has been selected. Settings alone does not trigger the gate. Shared audio-only selection can prepare visible unchecked recordings without inference. Enabling Transcription reuses available shared access; it does not automatically transcribe.

Desktop writes TXT to its granted destination. iPhone can begin without choosing a transcript destination. The export shows the intended folder. Choosing Create “transcription” Folder on iPhone adds a prompt to create that folder in Save to Files, while desktop creates it from the picker. Pending warnings distinguish transcripts awaiting sharing from files that need placement verification. Cancellation or failure retains the batch.

## Combine and Search

Combine reads selected-folder TXT metadata/text and displays its current list. The box below **Transcripts** shows the folder and **All** for a folder load, or **Search: description** for a Search handoff. Search handoff keeps the selected subset; tab returns preserve it, while selecting a transcript folder loads that folder and resets the origin to All. The selector remains Select Transcript Folder.

When the list clears, the combined title returns to **Combined Transcription**. Unchecking every transcript hides DOCX/HTML options and preserves the current title. On iPhone, TXT, DOCX and HTML exports suggest the transcript source's `combined` subfolder and allow the user to choose another destination.

Search and Combine show **Save** only after the text changes and hide it again if the original text is restored. **Cancel** remains visible with the same styling. The two actions sit below the textarea. The file-sharing routes show the original filename and destination so the user can replace it and verify the result.

Search **Show transcript** displays the entire text with colored matches. **Edit** opens the entire text and focuses the first match. Previous and Next sit on one row and navigate matches across line breaks and repeated spaces. Tap elsewhere in the editor to place the cursor and clear the selection. A preview shows the match when the box loses focus. On narrow screens, Edit, Show transcript and Hide result sit below the filename.

Search terms are separated with **semicolons**; commas stay inside a term. Suggested document titles and Combine origin descriptions retain that delimiter. Each term participates in lexical and semantic retrieval. Qualifying lexical results precede semantic-only results; current semantic ranking uses sentence-heavy fusion and contextual representations. MiniLM remains the embedding model.

Search reads current TXT snapshots and reconciles its derived embeddings; compatible unchanged vectors can be reused. Preserve the active embeddings file and hash-format compatibility. Updating local transcript metadata alone must not be treated as a reason to rebuild all embeddings.

Both desktop and iPhone keep **Update Search Index** separate from the transcript edit. On iPhone, share the TXT by itself, verify its exact name and edited contents in Files, then share `search-embeddings.json` on its own. Edits refresh the live index and keep the displayed results in place. Search advises rerunning the query after verifying an iPhone TXT or saving a desktop edit because matches and rankings can change. The index button pulses for pending work and stays active for repeat sharing without pulsing after success.

The optional **Verify in Files** action checks contents and modification time. A confirmed edit becomes the default across Search and Combine even when a higher model exists. Alternative versions can be compared, and Combine can use the alternate in the current output. Index update guidance explains why the save is pending, including when deleting an indexed TXT is the only change.

Verification appears beside each save after sharing. Edited TXT verification stays with the transcript, with a Search status fallback if its result is absent. Transcribe checks an entire batch with one folder selection and offers single-file retries for any unresolved files. A successful check clears the instructions and Verify action and leaves a confirmation. A partial batch keeps the action available.

**Use once** overrides a version for the next successful Combine export and survives a canceled or failed attempt. **Make default** remembers an explicit version for Search and Combine in this browser, scoped to the archive, recording and operation. **Reset to automatic** or removal from **Settings → Preferred transcript versions** restores automatic selection. Settings lists explicitly saved preferences only.

The comparison appears when there is an edited version to compare or when the highest model has numbered duplicates. Unedited lower-model copies are excluded from comparison prompts.

Combine lists one default transcript per recording and operation. Eligible alternatives remain in the version selector, including after a Search handoff. **Edited in Memora** is unchecked by default and adds only the confirmed edit date to DOCX and HTML.

Production paragraphing uses R4/MiniLM and inserts paragraph breaks rather than rewriting words. Existing blank-line paragraphing is preserved. Combine has no paragraphing selector. The current [paragraphing methodology](Paragraphing_Methodology.md) and [Search methodology](Search_Methodology.md) explain source behavior and limitations. The full [paragraphing comparison](archive/Memora_Revision4_vs_Revision5_Complete_Analysis.md) and [Search research](archive/Search_Optimization_Research_Record.md) remain intact protected evidence.

## Identities and local data

Embedded Apple/iMuse Recording IDs take precedence. Supported audio positively lacking an embedded ID uses the versioned SHA-256 framing of file size and at most **256000 prefix bytes**, producing a reproducible UUID. Filename is not a hash input. Malformed, unsupported or unreadable identity is not silently replaced. Identical sampled input/size can remain indistinguishable; the [exact contract](Recording_Identity_Prefix_Contract.md) records this limit and independent vector.

TXT retains Recording ID, Archive UUID, model-family/operation and audio provenance where present. Historical Audio Source ID is ignored. Detailed configuration/precision/backend provenance stays in model execution/self-test reports; no expansion/backfill tool is planned for TXT.

| Store | Current purpose |
|---|---|
| audioFolderCatalogues | Rebuildable metadata-only audio inventory and inspection metadata. |
| transcriptCatalogues | Rebuildable metadata from current TXT folder reads; no transcript body copies. |
| transcripts | Separate cached full-text TXT records, keyed by Archive UUID, Recording ID, filename and model/operation; preserved legacy records remain distinguishable. |
| semanticEntries | Derived embedding entries. |
| semanticMetadata | Retained legacy semantic metadata; no current user-facing cache category. |
| modelRegistry | Persisted model-definition projection, separate from weights and eligibility. |

Folder metadata caches retain latest identified snapshots, bounded to 16 scopes each. Complete successful refreshes remove missing members; partial/failed reads do not replace valid complete snapshots. Settings refresh also prunes identified duplicate transcript snapshots and empty entries. Proven distinct native folders remain separate; handle-free identical copies cannot be physically distinguished.

Native handles permit unchanged metadata reuse after folder association; iPhone verifies current immutable audio snapshots' IDs before association/date-duration reuse. Clearing a derived metadata cache does not delete files, cached full-text transcripts or Search embeddings. Database version 10 removes only retired audioSourceRecovery during upgrade; preserving migrations/refusal/rollback remain owned by database.js.

## Models, Settings and evidence

Canonical Whisper definitions and family defaults remain the model-selection authority. An alternative variant's pass does not automatically replace a family default. Registry cache, downloaded weights, historical test summary and current qualification are separate.

Settings shows selectable local metadata/cache entries with matching View/Hide controls. The self-test summary contains the latest retained successful measurement per family; it is not loaded status or current qualification. Settings Refresh Storage Information synchronizes model definitions before counting.

On iPhone, cached transcript export prompts for a recovery folder, and Whisper JSON export asks the user to check the named report in the chosen folder. [Save flow details](iPhone_Save_Flow_Audit.md#memora-save-flows)

Browser-version changes alone do not invalidate qualification within the same recognized browser family and matching execution context. Changed configurations/contexts and real failure holds still matter. Confirmed runtime failures require a qualifying reference retest; uncertain interruptions have the existing review path. Notes alone do not release holds. There are no automatic test sequences/retries, cooldowns or preferred-variant discovery.

Successful production execution history expires after 24 hours; failures/interruption records remain until selected for clearing. Durable eligibility incidents/decisions and stability observations are separate from clearable histories. See the [current Whisper guide](Whisper_Architecture_and_Qualification.md) and separate [failure/review contract](Whisper_Execution_Failure_Contract.md). The new [memory handoff](Memora_Whisper_Memory_Handoff.md) is preserved unchanged as future feasibility-first work; no memory instrumentation or model policy changed.

## Validation and acceptance

For **2026-11-25.9**, headless Edge passed **45** catalogue/app checks, including one visible Combine row, one-time and persistent choices, optional edit date export, and the iPhone batch and individual save verification flows. The two baseline failures remain. Actual iPhone verification still needs a device check.

For **2026-11-25.4**, headless Edge passed **41** catalogue/app checks, including verification of exact filenames, edited-copy priority, alternatives and deletion-only index updates. The same two baseline failures remain. Verify in Files still needs an iPhone device check.

For **2026-11-25.3**, headless Edge passed **38** catalogue/app checks, including separate TXT and JSON sharing from iPhone-style editor flows. The two baseline failures recorded below remain. The user confirmed on iPhone that separating the saves corrected the silent duplication seen with the combined TXT and JSON share. Keep one file per share for replacement. Files behavior for multiple TXT files with name collisions remains untested. [iPhone overwrite rule](iPhone_Save_Flow_Audit.md#iphone-overwrite-rule)

Earlier headless runs passed **37** checks in **2026-11-25.1** and **38** in **.2**, covering optional destination selection, Search refresh, the separate desktop index write and starting iPhone transcription beside a mixed collection. The combined iPhone edit and index share was replaced in **.3** after device testing.

For **2026-11-24.10**, headless Edge passed **35** catalogue/app checks, including clean/changed/undone editor states on both source types and matching Cancel styles. The suite retained the two known baseline failures for the Search-to-Combine title expectation and transcription destination text sizing. The **.9** audio-location run passed **11** checks. Native Safari keyboard focus, first-swipe behavior and actual Files placement still need a device check. [Device checks](iPhone_Save_Flow_Audit.md#device-verification)

The registry-cache fix passed **57 synthetic browser groups**: database integration 12, catalogue/app/Settings 33 and Whisper Settings 12. They include actual View/Hide, cancel/selected deletion, read-only reopening, explicit refresh restoration and empty/error/retry paths. Documentation consolidation ran no models, memory measurements or actual-device tests. [Recorded evidence and preserved source checkpoints](archive/Current_Guides_Preservation_2026-11-21.md) keep prior test results and device observations with their original limits; the [test guide](../tests/README.md) lists current runnable harnesses.

Outstanding focused .11 acceptance on MacBook/iPhone: confirm Model Registry Cache View/Hide and the retained .10 checks below:
1. Open a parent audio folder in Combine, confirm the transcription child/All label and automatic audio playback.
2. Search with semicolon-separated terms containing a comma within one term; send a subset to Combine, return across tabs, then select a folder and confirm All.
3. Refresh Settings and confirm one latest identified transcript-folder snapshot.
4. When Transcribe is used, check its conditional gate, unchecked recordings, accurate batch destination and before/after-share warning; verify saved iPhone TXT files in Files.

Earlier user-reported playback, identity reconstruction, report saving and Pages recovery successes do not certify every current pathway. No fresh self-test or destructive failure exercise is needed for documentation review. Large-archive provider waits and actual iPhone Files placement remain device-dependent.

## Next work

**24 November 2026 investigation handoff:** [iPhone Dreams/2017 audio-folder crash](iPhone_2017_Audio_Load_Investigation.md) records user observations, source findings and corrections for desktop continuation. Focus on early audio picker/identity inspection; Combine and Search still require initial transcript preparation. **No code yet:** investigation/documentation only, no fix or measured memory diagnosis. The cleanup proposal below remains separate.

The [JavaScript survey and staged cleanup plan](JavaScript_Survey_and_Cleanup_Plan.md) remains a proposal, with preservation rules, scoped acceptance and stop points. Its historical assessment covered 57 modules, 54 production-referenced paths and three standalone diagnostic modules.

Recommended first implementation after review: checkpoint 1 (obsolete tooling/routes and carefully reviewed public exports), then a small naming batch. Shared hashing, playback/edit rules and source/session extraction follow separately. Multi-archive Combine remains future work after the relevant boundaries are safe; low-value cosmetic cleanup need not become a prerequisite. The user memory handoff remains unchanged for separate feasibility work.

Other deferred work includes portable collection imports/metadata and DOCX/HTML output controls, query-only Search history, broader recursive library ownership, offline Tiny/release conversion, model variant comparison/discovery and iMuse convergence. Equal-model unedited copies keep first-encountered order.

## Resume references

[Documentation index](README.md) · [Audit/disposition register](Documentation_Audit_2026-11-21.md) · [File map](../filemap.md) · [Test guide](../tests/README.md) · [Journal](journal-index.md) · [Dated preservation/evidence record](archive/Current_Guides_Preservation_2026-11-21.md)

Read this handoff and Git status before further work. Do not reconstruct retired sidecar workflows from older contracts, clear user caches to make a check pass, or treat cached data as permission to access unavailable folders.
