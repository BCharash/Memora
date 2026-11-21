# Memora — current status and resume instructions

Reviewed **21 November 2026** against source commit **8d4cf88** plus the local Settings fix: candidate application **2026-11-21.11**, database schema **10**. Whisper consolidation is documentation-only; a separate authorized fix restores the Model Registry Cache View/Hide and selected-delete path. Publication and actual .10 device acceptance are not established by this review.

## Current behavior

The application has Transcribe, Combine/Edit and Search, with shared page-session audio/transcript folder access. Desktop uses native directory handles when available; iPhone uses supplied file snapshots and explicit Files sharing. Selecting a folder does not upload its contents to a Memora server.

Both external inventory sidecars are retired: **memora-audio-source.json** and **memora-transcript-archive.json**, including the earlier memora-archive.json, are not production authorities and are not created or saved. Existing files remain untouched. **search-embeddings.json remains active** and separate. No inventory JSON rebuild, archive remigration, cache reset or detailed model-metadata backfill is required for the current code.

The source of truth is embedded/reproducible audio identity and the selected TXT files' metadata/current text. A locally cached observation does not grant access to a file or supply an invented identity to an existing transcript.

## Audio access and playback

**Select Audio Folder** in any tab selects one parent audio folder. Immediate audio is inventoried; transcript children can be discovered, and a unique child named transcription becomes the shared default. Other transcript folders can be selected with **Select Transcript Folder**. Direct transcript-folder selection works, but cannot grant access to an unselected parent audio folder.

Combine and Search use the selected audio inventory to resolve recordings by Recording ID, including renamed files. Actual-file identity checks remain part of supported playback/inference paths. Ambiguous duplicate recording identities are reported; a newer audio file is not silently chosen. The current shared selection retains one active audio source, not a multi-archive resolver.

Source preparation has activity/progress feedback. Browser/iCloud preparation may still delay delivery of files; bounded application reads do not prove bounded provider download time. Native directory picking avoids upload-style selection where the API exists; iPhone's folder-input confirmation is browser-controlled.

## Transcription and saving

Audio Source is at the top; Transcript Destination controls are below the transcription settings. Desktop can use/create transcription, use the source or browse for a destination. Destination TXT metadata is read before a new collection is used. A new empty destination needs no JSON; its first generated TXT carries its session Archive UUID.

Initial Transcribe setup is visible. After an untouched departure to Combine/Search, return is guarded by **Enable Transcription** only if a transcript source/destination has been selected. Settings alone does not trigger the gate. Shared audio-only selection can prepare visible unchecked recordings without inference. Enabling Transcription reuses available shared access; it does not automatically transcribe.

Desktop writes TXT to its granted destination. iPhone prepares named TXT files and shares a files-only batch, with the intended batch destination shown in the app. It cannot force or verify the Files destination. Before any share attempt, pending warnings say transcripts await saving; after share returns, they ask the user to verify the save. Cancellation/failure retains the batch. There is no audio-list or transcript-list JSON save prerequisite.

## Combine and Search

Combine reads selected-folder TXT metadata/text and displays its current list. The box below **Transcripts** shows the folder and **All** for a folder load, or **Search: description** for a Search handoff. Search handoff keeps the selected subset; tab returns preserve it, while selecting a transcript folder loads that folder and resets the origin to All. The selector remains Select Transcript Folder.

Search terms are separated with **semicolons**; commas stay inside a term. Suggested document titles and Combine origin descriptions retain that delimiter. Each term participates in lexical and semantic retrieval. Qualifying lexical results precede semantic-only results; current semantic ranking uses sentence-heavy fusion and contextual representations. MiniLM remains the embedding model.

Search reads current TXT snapshots and reconciles its derived embeddings; compatible unchanged vectors can be reused. Preserve the active embeddings file and hash-format compatibility. Updating local transcript metadata alone must not be treated as a reason to rebuild all embeddings.

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

Browser-version changes alone do not invalidate qualification within the same recognized browser family and matching execution context. Changed configurations/contexts and real failure holds still matter. Confirmed runtime failures require a qualifying reference retest; uncertain interruptions have the existing review path. Notes alone do not release holds. There are no automatic test sequences/retries, cooldowns or preferred-variant discovery.

Successful production execution history expires after 24 hours; failures/interruption records remain until selected for clearing. Durable eligibility incidents/decisions and stability observations are separate from clearable histories. See the [current Whisper guide](Whisper_Architecture_and_Qualification.md) and separate [failure/review contract](Whisper_Execution_Failure_Contract.md). The new [memory handoff](Memora_Whisper_Memory_Handoff.md) is preserved unchanged as future feasibility-first work; no memory instrumentation or model policy changed.

## Validation and acceptance

The registry-cache fix passed **57 synthetic browser groups**: database integration 12, catalogue/app/Settings 33 and Whisper Settings 12. They include actual View/Hide, cancel/selected deletion, read-only reopening, explicit refresh restoration and empty/error/retry paths. Documentation consolidation ran no models, memory measurements or actual-device tests. [Recorded evidence and preserved source checkpoints](archive/Current_Guides_Preservation_2026-11-21.md) keep prior test results and device observations with their original limits; the [test guide](../tests/README.md) lists current runnable harnesses.

Outstanding focused .11 acceptance on MacBook/iPhone: confirm Model Registry Cache View/Hide and the retained .10 checks below:
1. Open a parent audio folder in Combine, confirm the transcription child/All label and automatic audio playback.
2. Search with semicolon-separated terms containing a comma within one term; send a subset to Combine, return across tabs, then select a folder and confirm All.
3. Refresh Settings and confirm one latest identified transcript-folder snapshot.
4. When Transcribe is used, check its conditional gate, unchecked recordings, accurate batch destination and before/after-share warning; verify saved iPhone TXT files in Files.

Earlier user-reported playback, identity reconstruction, report saving and Pages recovery successes do not certify every current pathway. No fresh self-test or destructive failure exercise is needed for documentation review. Large-archive provider waits and actual iPhone Files placement remain device-dependent.

## Next work

**Current authorized checkpoint:** documentation step 5 consolidates four Whisper guides into one current reference, archives complete originals and keeps the failure contract separate. The user's new memory handoff stays at its original path byte-for-byte unchanged. The registry-cache View bug is fixed separately as candidate .11. Next proposed documentation batch: operations/build/Pages guidance. Memory feasibility/implementation, broader structural JavaScript cleanup and multi-archive Combine are not activated by this consolidation.

After documentation: perform the separate JavaScript structural audit. Then design multi-archive Combine: additive membership, per-archive retained audio access, durable-reference selection/editing/export, duplicate-version policy and source-specific refresh/removal. The identity/cache foundation exists; the workspace does not.

Other deferred work stays separate: equal-model filename-counter priority; portable collection imports/metadata and DOCX/HTML output controls; query-only Search history; broader recursive library ownership; offline Tiny/release conversion; variant comparison/discovery; iMuse convergence. Older plans may contain superseded prerequisites and are not today's implementation instructions.

## Resume references

[Documentation index](README.md) · [Audit/disposition register](Documentation_Audit_2026-11-21.md) · [File map](../filemap.md) · [Test guide](../tests/README.md) · [Journal](journal-index.md) · [Dated preservation/evidence record](archive/Current_Guides_Preservation_2026-11-21.md)

Read this handoff and Git status before further work. Do not reconstruct retired sidecar workflows from older contracts, clear user caches to make a check pass, or treat cached data as permission to access unavailable folders.
