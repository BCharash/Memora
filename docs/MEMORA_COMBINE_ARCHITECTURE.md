# Memora — Edit & Combine, Search History, and Portable Collections

**Status:** Architectural proposal / Codex handoff; **no implementation authorized by this document alone**  
**Date:** 2026-11-16 (updated)  
**Scope:** Search history, cross-archive historical results, Edit & Combine, structured import/export, and persistence  
**Primary principle:** Preserve user-selected content and metadata without imposing cross-archive duplicate detection.

## 1. Executive summary

Evolve Edit & Combine from a TXT-file concatenation workflow into a format-independent collection workspace. A collection contains individual transcript entries (not nested combined documents), with explicit provenance and stable membership. Memora-produced TXT, HTML, and DOCX must be able to export and reimport a collection with its contents, metadata, and ordering intact. Search already has **Add to Combine**; extend that pathway, rather than introducing a competing action. Search History must let users inspect original results from an archive that is no longer loaded, and optionally rerun a saved query against a chosen currently available archive. Preserve snapshots and search definitions separately.

**Archive boundary rule:** Do not detect, reconcile, warn about, or deduplicate coincidentally matching recordings/transcripts across distinct archives. Users manage cross-archive overlap. Within the *same archive*, repeated selection of the same identified transcript entry should not accidentally create duplicates. Preserve existing same-recording Whisper-model preference behavior where applicable, but do not silently discard meaningful edited or translated variants.

This document specifies target behavior and implementation sequencing. Codex must inspect the actual repository before selecting files, storage APIs, parser libraries, or UI wiring. Only three current source files were supplied for this planning discussion; do not assume other modules' behavior.

## 2. Decisions and boundaries

### Confirmed user decisions

1. Expand previously combined files into **individual selectable recordings**, selected by default.
2. Accept Memora-produced **TXT, DOCX, HTML** as interchangeable structured inputs and outputs; preserve full metadata across round trips.
3. **No backward compatibility requirement** for older combined document formats. Do not add a legacy parser solely for this purpose.
4. Users may assemble results from multiple searches and archives.
5. Search already implements **Add to Combine** for the current search; extend that existing feature.
6. Search History must preserve **viewable original results**, even when the originating archive is unloaded; rerunning alone is insufficient.
7. Also support **explicit rerun** of a historical search against a selected available archive; do not overwrite the original snapshot.
8. **No cross-archive deduplication or reconciliation**, even if content is identical.
9. No code until the user approves implementation; this file is an architectural handoff.
10. Export must offer **independent visible-display toggles for recording filenames and recording metadata**, applying consistently to TXT, HTML, and DOCX, while retaining complete metadata in the underlying portable document.
11. Every entry must preserve **original archive provenance**: archive name, folder name, and the most complete available source-relative path, plus an archive ID where known. Missing filesystem paths must not be invented.
12. Keep **original archive provenance** distinct from the **immediate import source** (such as a later combined DOCX).

### Proposals requiring explicit confirmation before implementation

- How many historical searches to retain; whether to pin or delete them.
- Whether Combine workspace persistence across app restarts is desired (recommended: yes).
- Whether edits in Combine should be collection-local by default (recommended: non-destructive) or update original transcript files.
- Whether historical search snapshots should contain full transcript bodies or reference immutable shared stored transcript versions (recommended: logical snapshots with shared immutable content blobs).
- Policy for multiple transcription versions of one recording within one archive; recommend explicit selection of edited/translated alternatives, with existing model preference as the default for unedited Whisper variants.
- Whether arbitrary non-Memora TXT/DOCX/HTML should be importable as a single unstructured text entry (recommend defer to separate scope).
- Whether to allow saved collections to be reopened as named workspaces beyond simple import/export (recommended, but not prerequisite for first delivery).

Codex must not treat recommendations above as user-confirmed requirements.

## 3. Current code evidence and repository discovery

Files reviewed in the planning conversation:

- `combine.js`: `parseTranscriptFile` reads a **single** transcript header and takes text after the first dashed separator; `readTranscriptFiles` filters to `.txt`; `selectHighestModelRecords` groups by Voice Memo ID or filename/date plus operation and retains the highest model; `combineTranscriptRecords` emits a readable TXT document with repeated headings and Unicode separators. Its output omits some parsed fields, notably `Operation` and `Audio Relative Path`.
- `combineUI.js`: displays records as one row per input file; selects all initially; sorts by recording date or name; offers Show/Hide and Edit; `getSelectedTranscriptFiles` returns files based on filename-matched checkboxes; editing reconstructs a single-transcript TXT header/body and replaces the selected in-memory file reference.
- `combineShareExport.js`: iPhone export UI chooses TXT/DOCX/HTML and passes a generated File to `navigator.share`; this is transport/UI code, not a general-purpose serializer.

**Important:** These observations do not establish the current Search, archive, IndexedDB, desktop export, DOCX/HTML generation, or module initialization implementations. Inspect the repository before proposing concrete changes. Search for existing Add to Combine integration and reuse it. Do not invent an `app.js` or reorganize the repository gratuitously.

Discovery checklist:

- Map Search state, query execution, ranking/highlighting, result selection, and Add to Combine call chain.
- Identify archive identity and archive-loading semantics; establish whether archive IDs already exist and are durable.
- Identify existing transcript metadata schema, stable IDs, model registry, edit persistence, and audio path handling.
- Locate current TXT/HTML/DOCX export functions and platform-specific save/share pathways.
- Inventory IndexedDB stores, migrations, quotas, recovery behavior, and file-handle assumptions.
- Identify mobile Safari constraints, lazy rendering, existing tests, and performance instrumentation.
- Produce a precise file-change plan for review **before** modifying source files.

## 4. Target conceptual architecture

```text
Sources:
  Individual transcript files   Structured combined TXT/HTML/DOCX
  Current Search results        Historical Search snapshots
                    |                  |
                    +-------- Import / adapters --------+
                                       |
                       Canonical transcript entries
                         + immutable provenance
                                       |
                         Combine workspace manager
                         selection / ordering / edits
                                       |
                           Collection document
                                       |
                    Format-specific serializers
                       TXT     HTML     DOCX
                                       |
                     Desktop save / iOS share

Search execution -> Search definition + immutable result snapshot
Search History -> View snapshot OR rerun definition
View result -> existing Add to Combine -> workspace
```

Keep concerns separate: source adapters, identity/provenance, storage, search history, workspace, serialization, and save transport. UI must not parse serialized file text to manage internal state. Import must not depend on whether a source was produced by Search or by a document export.

## 5. Canonical data contracts

The following are **logical schemas**, not mandated JavaScript object names or a directive to create a new database unnecessarily.

### 5.1 Archive identity

- `archiveId`: stable identifier for a particular source archive; do not infer identity from a display name alone.
- `archiveLabel`: human-readable display label; can change independently of ID.
- `archiveContext`: optional non-sensitive metadata describing source or import session.
- `originalArchiveName`: archive display name as known when the recording was first imported; preserve historical value even if folder is later renamed.
- `originalFolderName`: name of the source folder, if exposed by the import pathway.
- `originalRelativePath`: path within the selected source root, if exposed; preserve separators/normalization rules and distinguish it from a full absolute filesystem path.
- `originalAbsolutePath`: optional only if legitimately supplied or exposed; browsers generally do **not** reveal full local filesystem paths, especially on iOS. Never fabricate one.
- `provenanceAvailability`: explicitly distinguish known, unavailable, and unknown path/name fields; do not substitute guessed parent directories.
- Archives are independent identity domains. A recording in Archive A is **not** equated with one in Archive B.
- If the repository lacks durable archive IDs, propose a minimally disruptive mechanism; explicitly describe behavior for old archive data that lacks an ID. Never silently merge separate archives based on filename.

### 5.2 Recording and transcript version

Distinguish recording identity from a particular text version:

- `archiveId`, `recordingId`, `transcriptVersionId` (stable within the archive).
- Original audio filename, recording date (original string plus normalized sortable value if possible), duration, Voice Memo ID, audio relative path.
- Whisper model, operation (`transcribe`/`translate`), language if available.
- Full transcript body with preserved paragraph/line-break semantics.
- Original transcript filename; created/modified metadata where available.
- Edit lineage / revision metadata where supported; unknown fields must remain unknown rather than fabricated.
- Optional extensible metadata bag for future fields; prevent accidental loss of unknown metadata through import/export.
- `sourceProvenance`: original archive ID/name/folder/path where available, source document/search snapshot, and source entry identity; source provenance must not be confused with transcript identity.
- `immediateImportSource`: the file or collection through which this entry was most recently brought into the workspace, separate from and never overwriting original archive provenance.
- `displayPreferences`: collection-level settings, not modifications to the recording metadata itself.

**Do not** derive globally unique recording identity from text similarity, hashes, or same filename across archives. Hashes may be used to store identical immutable payloads efficiently, but never to infer that two different archive entries represent the same recording.

### 5.3 Collection/workspace

- Collection ID, title, created/modified timestamps, schema version.
- Export presentation settings: `showRecordingFilenames` and `showRecordingMetadata` as independent booleans, retained in the portable payload and restored on reimport. Default values should be confirmed against existing UX; neither setting may affect metadata preservation.
- Ordered list of **entry references or self-contained immutable entry versions**, with selection state and optional collection-local edits.
- Each entry records originating archive and transcript-version identity, plus the exact selected content version.
- An item added from a historical snapshot must represent the version the user saw, not silently substitute the currently loaded version.
- Workspace may include entries from different archives, with no cross-archive duplicate detection.
- Distinguish membership identity from recording identity: repeated addition of the **same archive + recording + version** should not unintentionally create duplicate rows. A deliberate duplicate insertion, if ever supported, must be explicit.
- Export includes sufficient content to be portable even when the original archive is unloaded.

### 5.4 Search definition

- Search ID; original query; strategy; all behavior-affecting parameters; engine/configuration version where available.
- Archive ID/label and scope used when executed.
- Created and last-executed timestamps, original result count, and last-result count if useful.
- Rerun semantics: user explicitly selects the target archive/scope; if unavailable, show a clear message rather than silently switching scope.

### 5.5 Immutable search snapshot

- Snapshot ID; associated search definition/execution; archive identity; timestamp.
- Ordered results with recording/transcript-version identities, scores/ranks where meaningful, highlighted passages or stable highlight spans, and display metadata.
- Sufficient **original text** to display original search results even if archive is unloaded, changed, or deleted; full transcript versions are required if the user can Add to Combine from snapshots.
- Preserve the distinction between historical content and live current content.
- Avoid redundant storage by referencing immutable content blobs where feasible. A reference is safe only if the referenced blob is retained as long as the snapshot requires it.
- Snapshots are immutable; rerun produces a new execution/snapshot or updates a clearly separate latest-run pointer, without replacing historical evidence.

## 6. Structured portable document format

**Round-trip invariant:** Exporting a Memora collection as TXT, HTML, or DOCX, and reimporting it, must reconstruct the same entry content, metadata, identity, provenance, and order. Cross-format conversions must preserve canonical data, even if visual formatting differs.

Use a single versioned **canonical payload** (e.g., structured JSON schema) as the authoritative interchange representation embedded in each of the three user-readable formats. The choice of JSON is an implementation recommendation, not a requirement to expose JSON as the primary visible document.

- **Presentation vs. data:** The visible rendering is a projection of canonical data. Four modes must work: filenames + metadata, filenames only, metadata only, or transcript text only. Hide/show settings must **never** strip canonical fields. Keep individual transcript boundaries unambiguous even when both display toggles are off; define a readable separator policy independently from metadata display.
- **TXT limitation:** Plain text cannot make metadata genuinely invisible. When display toggles are off, keep the reading portion clean and put the machine-readable payload in a clearly delimited trailing section. It will still be visible to anyone scrolling through the raw TXT. Do not promise otherwise.
- **HTML/DOCX:** Suppressed metadata and filenames should not appear in the normal rendered reading view, but must remain in the inert embedded payload.
- **TXT:** Human-readable document plus an unambiguous, versioned, reversible machine-readable payload. Define exact encoding, delimiters, length/escaping rules, Unicode handling, and corruption detection. Do not parse arbitrary headings or dashed lines as structural boundaries.
- **HTML:** Readable semantic HTML plus an embedded canonical payload in a safe, inert structured-data container. Do not execute imported HTML or scripts; parse in an inert context and validate data.
- **DOCX:** Readable Word document plus canonical payload in a supported package part or metadata structure. Confirm compatibility with existing DOCX generation library and common Word editing/export behavior. Never depend solely on visible paragraphs for lossless reconstruction.

Specify whether the visible document is editable independently of its embedded payload. **Recommended initial policy:** payload is authoritative for exact reimport; detect when visible text and embedded text disagree (e.g., after editing in Word), alert user, and offer an explicit choice or safe failure. Never silently use stale content. If reliable change detection cannot be guaranteed in a target format, document the limitation and defer that edit-import pathway.

- Validate schema version, payload size, content shape, archive/record IDs, and declared entry count before importing.
- Reject malformed or unsupported structured payloads with actionable messages; do not import partial/truncated data as though successful.
- Preserve arbitrary transcript text, including separator-like lines, emojis, diacritics, HTML-sensitive characters, long paragraphs, and mixed line endings.
- Explicitly define export naming and user title behavior without changing existing naming conventions accidentally.
- No backward-compatibility requirement for previously exported combined documents; document that older files may be unsupported.
- Arbitrary third-party documents are **not** guaranteed to be losslessly importable; avoid promising general document understanding.

## 7. Import and Edit & Combine UX

1. Accept supported files and existing internal sources through adapters.
2. Normalize each structured input into individual entries; **never** present a previously combined document as one nested transcript entry.
3. Display individual entries in the established Edit & Combine list; **all initially selected**.
4. Preserve current sorting choices (recording date newest/oldest; name ascending/descending) and selection state when sorting.
5. Keep Show/Hide Transcript, Edit, Select All, collapse/expand, and existing styling unless a change is necessary and approved.
6. Display archive/source provenance unobtrusively, particularly when entries come from several archives.
7. Maintain the workspace when adding more sources; additions must not unexpectedly reset prior selections or edits.
8. Export only selected entries in the chosen order; never export an unselected entry merely because it was part of a combined input.
9. Keep sorting by **individual recording date/name**, not the outer combined-document filename or export date.
10. Provide clear feedback for malformed imports, unsupported format/schema, missing metadata, and failed exports.
11. Provide two independent export display controls: **Show recording filenames** and **Show recording metadata**. Apply them to all three formats, with a preview if practical; toggles affect appearance only.
12. On reimport, restore the stored display preferences without altering source content or archive provenance.
13. For each entry, retain the original archive name/folder/available path even if it arrived through an intermediate combined document; separately track the most recent import document.

**Editing policy to confirm:** Favor collection-local non-destructive edits, with an explicit separate operation if the user wishes to update the original archive transcript. If the existing Edit button writes back to original files, preserve current behavior until user approves the new policy; do not silently change it.

### 7.1 Archive path availability and provenance policy

- Desktop folder handles or directory imports may expose a selected root folder name and paths *relative to that root*. Browser privacy restrictions normally prevent access to a full absolute local filesystem path; iPhone imports may expose only a filename. Capture only what the actual API returns.
- Preserve **original archive** information on each individual entry across successive Combine → export → import cycles; do not replace it with the name/path of a later combined file.
- Track **immediate import source** separately (e.g., `Research Collection.docx`, imported on a given date), without changing the recording's original provenance.
- Use archive IDs as identity domains when known; a folder name/path alone must not trigger cross-archive deduplication. Unknown archive IDs require explicit safe handling rather than an invented ID that implies historical certainty.
- Export all known provenance fields in the canonical payload even if the visible metadata toggle is off. If visible metadata is on, display a sensible subset (archive name and relative path if available); avoid exposing sensitive absolute paths by default.
- If an imported file has no provenance metadata, represent that honestly as unknown; do not infer an archive from the combined document's name.

## 8. Same-archive versions and duplicate rules

- Preserve the existing preference for the highest-ranked available Whisper model for otherwise equivalent, unedited transcriptions **within one archive**.
- Translations and edited transcript versions are potentially distinct; do not silently discard them under a model-ranking heuristic.
- The exact rule for edited versions, translated versions, and duplicate file imports needs approval and must be documented as a deterministic decision table.
- Same archive + same identified transcript version added repeatedly from different searches: one workspace entry by default.
- Different archive IDs: **always independent entries**, regardless of same Voice Memo ID, filename, content, timestamp, or audio path.
- Do not implement cross-archive fingerprint matching, similarity comparisons, warning banners, or reconciliation UI.

## 9. Search History and Search integration

### 9.1 Existing workflow

Search already has **Add to Combine** for current search results. Locate the actual code and preserve its user-visible behavior. Make the same action available when viewing historical results.

### 9.2 History UI

- Show recent searches in Search, with query, source archive, date, original result count, and optional current status.
- Selecting a history item defaults to **View original results** (snapshot), not rerun.
- Provide an explicit **Rerun search** action, with target archive clearly identified or selected.
- Historical results must show original ordering and matching passages; preserve scores where the engine provides them.
- Distinguish historical snapshot view from live rerun view visibly but without disruptive UI.
- Users can select individual historical results and use the **existing Add to Combine** pathway.
- Avoid automatically rerunning all historical searches when the archive changes or transcripts are edited.
- Retention count, pinning, deletion, and clearing behavior require user approval. Deletion must not inadvertently remove content already selected into Combine.

### 9.3 Source/version correctness

- Opening Archive 2's historical search while Archive 3 is loaded must display Archive 2's **original** results without loading Archive 2.
- Adding an item from that snapshot must add the **snapshot's original transcript version**.
- Rerunning against Archive 3 must produce a **new** result set associated with Archive 3, not rewrite the Archive 2 snapshot.
- If a historical result no longer exists in the live library, it remains viewable and combinable from the saved snapshot if its content was retained.
- If historical snapshot content was removed under an explicit retention action, surface that fact; do not pretend it can be reconstructed.

## 10. Persistence, quotas, and integrity

Prefer reuse of existing IndexedDB infrastructure and migration conventions. Do not add unnecessary transcript copies.

- Persist search definitions and their immutable snapshots; recommend persistent workspace pending user confirmation.
- Use immutable transcript payload references where possible; maintain reference lifetimes so deleting an archive does not invalidate saved historical results or collections.
- Treat source file handles and audio relative paths as **references**, not guarantees of future audio availability. Do not imply exported documents contain audio unless explicitly implemented.
- Make imports and workspace mutations transactional where feasible; use commit/validation before replacing any durable state.
- Handle quota exhaustion, interrupted imports, browser reloads, failed DOCX generation, and share-sheet cancellation without losing originals.
- Define deletion semantics separately for history, snapshots, workspace, archive records, and shared content blobs; avoid dangling references.
- Provide understandable storage use and cleanup controls if retained snapshots become large; do not silently evict data needed for saved searches.
- Protect against hostile or oversized imported HTML/DOCX/TXT payloads; avoid script execution and unsafe HTML insertion.

## 11. Export and platform transport

Keep generation separate from delivery:

1. Collection serializer constructs the canonical payload and readable document.
2. Format-specific exporter creates a TXT/HTML/DOCX File/Blob.
3. Existing desktop save/download and iPhone share-sheet mechanisms deliver the file.

Preserve the current iPhone `navigator.share` flow and its cancellation/error handling unless repository inspection reveals a concrete issue. Do not assume that iOS permits silent file writes. Preserve desktop behavior as discovered. Ensure MIME types, file extensions, filenames, and generated content match. No export pathway should mutate or delete the collection or its source entries.

## 12. Proposed modules and dependency boundaries

These are **responsibilities**, not mandated filenames:

- Canonical schema/validation and stable IDs.
- Archive and transcript-version lookup.
- Structured import adapters (TXT/HTML/DOCX).
- Collection/workspace manager (membership, order, selection, edit overlays).
- Same-archive transcript-version preference logic.
- Search History definition/snapshot store and controller.
- Existing Search → Combine adapter, generalized for current/historical results.
- Structured export serializers (TXT/HTML/DOCX).
- Existing platform save/share UI adapters.

Reuse current modules when they already own these concerns. Avoid a sweeping refactor or new build tool solely to implement this plan. Keep the application browser-compatible, including mobile Safari.

## 13. Phased implementation plan and gates

### Phase 0 — Audit and design confirmation (no code)

- Inspect repository; document actual file graph and storage model.
- Present current behavior vs proposed behavior and identify changes to existing Add to Combine.
- Resolve the open decisions in §2, especially edit semantics, persistence, retention, and version preference.
- Specify canonical schema, archive ID strategy, payload embedding strategy, and data migration scope.
- Obtain approval before modifying code.

### Phase 1 — Canonical collection and identity layer

- Implement validated canonical records and ordered collection membership.
- Preserve archive boundaries and same-archive version semantics.
- Test sorting, selection, exact identity, provenance, unknown metadata, and non-destructive operations.
- Keep current UI behavior functional.

### Phase 2 — Portable structured formats

- Implement TXT, HTML, DOCX exporters/importers using one versioned canonical payload.
- Verify lossless same-format and cross-format round trips, including multiple nested-source imports flattened into entries.
- Test malformed/oversized files, Unicode, line breaks, and externally edited visible documents.

### Phase 3 — Edit & Combine integration

- Replace file-as-row assumptions with canonical entry-as-row semantics.
- Default select all; preserve sort, collapse, Show/Hide, Edit, and existing controls.
- Make multiple imported combined documents produce one flat collection.
- Validate mixed-format inputs and export selection.

### Phase 4 — Search History and cross-archive snapshots

- Persist search definitions and immutable results with complete viewable text.
- Add history list and View Original / Rerun actions.
- Extend **existing** Add to Combine to historical results.
- Test Archive 2 snapshot with Archive 3 loaded, plus multi-search accumulation.

### Phase 5 — Persistence, mobile integration, and hardening

- Finalize workspace persistence if approved.
- Test desktop save and iOS share flows.
- Stress-test hundreds/thousands of transcripts, large result sets, storage quotas, reloads, and interrupted operations.
- Remove temporary diagnostics after validation; update project design journal and documentation.

Each phase must have a small reviewable diff, regression evidence, and explicit go/no-go acceptance before advancing.

### Additional presentation and provenance test requirements

Test the four combinations of filename/metadata visibility in **each** of TXT, HTML, and DOCX. For every combination, reimport and assert identical recording identities, full metadata (including archive provenance), transcript bodies, ordering, and restored display settings. In TXT, confirm that suppressed fields are absent from the reading portion but present in the trailing structured payload. For HTML/DOCX, confirm that suppressed fields are not shown in normal reading view. Test that a file with both toggles off still maintains discernible recording boundaries and is exactly reconstructable.

Test archive provenance for: desktop directory import with relative paths; mobile file import without path; unknown archive name; folder rename/move after import; multiple generations of combined-document export/import; and cross-archive assembly without duplicate detection. Confirm that original archive fields remain unchanged while immediate import source changes. Do not assert availability of absolute filesystem paths when the browser did not provide them.

## 14. Acceptance-test matrix

| ID | Scenario | Expected result |
|---|---|---|
| C01 | Import one Memora TXT with 8 entries | 8 individually selectable, preselected rows |
| C02 | Import combined TXT + DOCX + HTML | All entries flattened; no nested document rows |
| C03 | Sort by recording date | Uses individual recording dates, not export timestamps |
| C04 | Change sort after deselecting entries | Selection remains attached to same entries |
| C05 | Export TXT then reimport | Same content, metadata, identities, provenance, order |
| C06 | Export DOCX then HTML then TXT | Same canonical collection after each conversion |
| C07 | Transcript includes separator-looking lines/Unicode | Text round-trips unchanged |
| C08 | Metadata has unknown future field | Field survives round trip |
| C09 | Import corrupted or unsupported payload | Clear failure; no partial workspace corruption |
| C10 | Same identified item added twice from Archive 2 | No accidental duplicate workspace row |
| C11 | Identical-looking item from Archive 3 | Remains distinct; no cross-archive comparison |
| C12 | Multiple Whisper versions in same archive | Applies approved preference policy only within archive |
| C13 | Edited/translated variants | Not silently discarded |
| S01 | Search Archive 2; load Archive 3; open history | Original Archive 2 results visible without reload |
| S02 | Archive 2 transcript edited after search | Original snapshot remains unchanged |
| S03 | Add historical result to Combine | Adds exact snapshot text/version |
| S04 | Rerun Archive 2 query against Archive 3 | New Archive 3 results; original snapshot intact |
| S05 | Add from multiple historical/current searches | Accumulates selections without clearing workspace |
| S06 | Missing original archive | Snapshot still viewable and combinable |
| P01 | Reload during/after collection assembly | Approved persistence behavior, no silent loss |
| P02 | Storage quota reached | Graceful failure and recoverable existing data |
| P03 | iPhone Share cancelled | Collection preserved; accurate status |
| P04 | Large collections/search history | Acceptable performance; lazy rendering preserved |
| X01 | DOCX/HTML visible text edited outside Memora | Mismatch detected or explicitly documented safe behavior |
| X02 | User deletes search history entry | No unintended deletion of already collected content |

Add regression tests for existing Search ranking/highlighting, Edit & Combine editing, Whisper selection, desktop export, and iPhone share functionality.

## 15. Risks and design tradeoffs

1. **Snapshot size:** Full historical text may consume substantial storage. Prefer immutable shared payloads with safe retention semantics; measure real usage.
2. **DOCX embedding:** Some external editors may remove custom metadata. Validate import and detect loss rather than claiming universal reversibility after third-party editing.
3. **Editing semantics:** Current edits may write back to source files. Collection-local edits are safer for historical snapshots but require user approval.
4. **Archive identity:** A stable ID is essential for preventing accidental same-archive duplicates without cross-archive matching. Define behavior for archives lacking IDs.
5. **Search algorithm evolution:** Rerunning a saved definition may differ due to changed engine versions or changed transcripts. Snapshot is historical truth; rerun is a new execution.
6. **Security:** Imported HTML and DOCX must be treated as untrusted documents; do not render executable imported markup.
7. **Browser constraints:** iPhone Safari storage, memory, and share activation limitations require real-device validation.
8. **Scope control:** Do not build cross-archive deduplication, third-party document inference, or broad repository restructuring as part of this project.

## 16. Instructions to Codex

1. **First read this document and inspect the current repository. Do not start coding immediately.**
2. Produce a concise repository audit: existing relevant modules, functions, storage, and integration points; note where this proposal differs from actual code.
3. Identify all unresolved user decisions and propose concrete defaults; request approval.
4. Produce a file-by-file implementation plan, schema specification, serialization contract, migration plan, and phase-specific tests.
5. Do not remove or replace the current Search **Add to Combine** feature; extend it.
6. Do not implement cross-archive duplicate matching or warning logic.
7. Do not promise compatibility with old combined exports; user explicitly does not require it.
8. Preserve UI styling, browser-only architecture, iPhone compatibility, and established export flows wherever possible.
9. Never discard original transcript data, audio references, or historical snapshots during an incomplete import/export/migration.
10. For implementation work, use the **latest repository files**, not older copies or remembered versions. The user prefers only changed files returned, packaged in a ZIP with original filenames unchanged when files are delivered through chat; simple one-line edits may instead be explained as instructions.
11. Keep temporary diagnostics out of final production code; maintain a design journal or equivalent project documentation.
12. Implement only after user approval, phase by phase, with test evidence and review points.

---

**Desired outcome:** A flexible, lossless, format-independent Edit & Combine workspace that can assemble individual transcripts from current files, previously combined documents, and historical searches across independent archives, while preserving the user's explicit choices and avoiding unnecessary cross-archive complexity.
