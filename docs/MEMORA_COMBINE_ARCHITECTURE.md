# Memora — Archives, Dynamic Transcript Selection, Edit & Combine

**Date:** 16 November 2026
**Status:** Revised architecture and eight-phase sequence approved. Phase 1 contracts below remain proposed until reviewed and approved. Documentation preparation only; application implementation is not authorized yet.
**Scope:** Archive identity and migration, dynamic preferred transcripts, authoritative editing, persistent Combine, reference-based TXT/DOCX/HTML interchange, query-only Search History, and audio provenance/playback.

This revision supersedes the previous snapshot/version-based architecture. The user's revised instructions and subsequent mandatory dynamic-selection clarification govern. Unchanged requirements are retained below. The detailed Phase 1 review package is [MEMORA_COMBINE_PHASE_1_CONTRACTS.md](MEMORA_COMBINE_PHASE_1_CONTRACTS.md).

## 1. Approved decisions and boundaries

- Archives have persistent UUIDs; recordings have persistent IDs within their archive. Names and paths are descriptive, never sufficient identity.
- Transcripts belong to an archive, recording, Whisper model, and operation (`transcribe` or `translate`). Translation never replaces transcription.
- Search and Combine dynamically select the highest-ranked currently available transcript for each archive/recording/operation. No permanent preferred flag is authoritative.
- Lower-model transcripts remain in the archive. Corrections affect only the selected transcript; do not synchronize corrections to alternatives.
- Edits use explicit Save Changes and replace the current saved text. No historical transcript-version store or collection-local edited copies.
- Combine persists across searches, archive changes, reloads and combined-document imports. Preserve membership, checked selections, order, sorting choice, title, settings and unsaved edits.
- Combined exports remain full, independently readable TXT, DOCX and HTML documents. Structured metadata contains references, not another authoritative transcript body.
- Reimport resolves current preferred transcripts. Previously exported readable files never change automatically.
- No cross-archive content matching, duplicate detection, reconciliation or warning logic. Identical names/content in distinct archive UUIDs remain independent.
- No compatibility parser for older combined formats is required. Arbitrary third-party documents and synchronization of external Word edits are outside initial scope.
- Remove Create paragraphs from Combine and its processing. Preserve authoritative transcript paragraph structure.
- Search History stores queries/settings/archive references/timestamps only. Default retention is **90 days**, configurable in Settings, with clear-history controls. No transcript bodies or result snapshots.
- On combined-document import into a nonempty workspace, ask **each time**, with **Merge preselected**. Replacement requires explicit choice and unsaved-edit protection.
- Merge matches only archive UUID + recording ID + operation. Preserve existing entries, selection state, order, title and output settings. Append genuinely new entries in imported order. Never silently discard unsaved edits.
- Application code remains unchanged until the updated contracts are approved. Each implementation phase needs reviewable changes and acceptance evidence.

## 2. Repository evidence and reuse

Repository reviewed on 16 November 2026; this is a source audit, not browser/device acceptance.

| Existing module | Relevant ownership and required extension |
|---|---|
| `js/app.js` | Actual orchestrator; `useSearchSelectionInCombine`, `combineSelectedFiles`, `buildTranscript`, saving and destination controls. Current Search handoff resets source/destination context. |
| `js/combine.js` | Single-transcript TXT parsing, sorting, model ranks and model selection. Group keys currently lack archive identity. TXT output loses some parsed metadata. |
| `js/combineUI.js` | Rows, selection, editing and playback integration; filename-based selection/replacement must become stable-reference based. |
| `js/search.js` | Already imports `selectHighestModelRecords` from Combine and selects records before sentence/index work. Preserve shared logic and invalidate stale derived search data. |
| `js/searchUI.js` | Search, selected-results handoff, editing and audio controls/resolution. Extend existing Add to Combine; do not create a competing pathway. |
| `js/database.js` | Sole database schema/open owner, version 5. Stores: transcripts, semanticEntries, semanticMetadata, modelRegistry. Transcript key is filename. |
| `js/storage.js` | File access and transcript persistence. Desktop writable handles differ from file-input/iPhone access. |
| `js/docx.js`, `js/html.js` | Existing browser export generators; DOCX loads docx 9.7.1. No verified structured DOCX import/embedding capability yet. |
| `js/combineShareExport.js` | Existing iPhone file-sharing transport; preserve cancellation and user-gesture behavior. |
| `js/settings.js`, `js/storageManager.js` | Settings, storage reporting/cleanup; history and new durable data must be included deliberately. |
| `index.html`, `css/`, `tests/` | Existing layout/styling and isolated browser test conventions. |

Desktop destination labels currently are Use Source Folder, Create/Use "combined" Folder, and Browse for Another Folder. Retain their relative order, then TXT/DOCX/HTML creation controls. Existing paragraph checkbox is initialized unchecked, but the revised requirement removes it completely from Combine only.

Reuse browser modules and the existing database owner. Do not invent another app entry point, database owner, build system or broad refactor. Specific new module names and dependencies require Phase 1 review.

## 3. Identity and archive migration

Store archive UUID in `memora-archive.json` (proposed filename) and each transcript's metadata. The manifest describes archive name, recording IDs and associated transcript files. Model-specific transcripts share a recording ID. Preserve model, operation, original text, unknown metadata and audio provenance.

Migration creates a new migrated archive at a separate destination by default. Inventory and preview every proposed change, resolve ambiguous associations explicitly, and verify source files have not changed since preview before copying. Write migrated transcripts and the manifest to the new destination, verify all written files and unchanged transcript bodies, and record progress so interruption is detected and work can safely restart or complete. Never automatically modify or delete the source archive. Reject a destination that aliases or overlaps the source; do not overwrite unrelated destination files. Detect source changes during copying and withhold successful completion until validation passes. No in-place backup/rollback machinery is required for initial delivery; in-place migration is deferred pending separate justification and approval. Never delete lower-ranked transcripts or assign a permanent preferred transcript. Folder names cannot identify archives. Conflicting manifest/header identities block affected operations rather than silently winning by precedence.

Recommend an **integrated Archive Migration & Validation tool** using existing permissions, storage and validation. Read-only/iPhone sources require an explicit migrated-copy export/save workflow; success must not imply originals were changed. Filesystem writes across an archive are not atomic. Phase 1 specifies recovery and acceptance before migration implementation.

New transcription writes must produce the same metadata and manifest contract as migration. Capture provenance at audio import/transcription, not only during Combine export. Existing IndexedDB data must remain intact; old filename keys cannot be assumed to represent globally unique recordings.

## 4. Dynamic preferred-transcript contract

The membership key is `(archiveUuid, recordingId, operation)`. Evaluate candidates at Search/Combine invocation, combined-document import, and relevant archive refresh/access. Use one shared selector. The current ordering is tiny < base < small < medium < large-v3; unknown models and tied conflicting candidates must not be guessed into a winner.

Search selects preferred transcripts **before** text matching/indexing. Derived indexes may be reused only when validated against the current candidate inventory and saved content. Added, removed or modified files can change preference or searchable text. Do not persist a selected file/model as authoritative during migration, import or transcription.

Transient file-resolution and permission state may be cached for efficiency, but must be revalidated; persistent manifests describe available files, not the preferred choice. With an unavailable archive, mark the reference unresolved and request access; do not pretend it was freshly checked.

Reevaluation changes resolved content, not workspace membership, checked selections, order, sorting choice, title or presentation settings. Explicit user sorting can reorder entries. Missing preferred files allow the next valid ranked candidate; no valid candidates leaves a visible unresolved entry. Identity conflicts remain errors, not automatic fallback opportunities.

## 5. Authoritative editing and dirty-editor safety

Both Search and Combine edit the same currently selected transcript, with explicit Save Changes. Preserve archive/recording identity, model, operation, provenance and other metadata. Saving corrects that file only, replaces its previous text, and invalidates affected search/display data. No historical text store or automatic lower-model correction.

An editor binds to the **specific transcript file it loaded**, its base saved revision/content and its recording reference. It must not follow a changed preference while saving. If preference changes with unsaved edits, retain the draft and require explicit action: continue editing the original file, save that original file if safe, or discard and switch. Recheck source changes before any save. A vanished target or lost permission requires explicit recovery/save-as; never silently redirect to another model.

Detect external changes after editor load; timestamps alone are not a reliable conflict check. Warn before discarding drafts on navigation, merge/replacement or reload where supported. Do not persist or recover unsaved editor text across reloads. Browser termination cannot guarantee a warning; unsaved changes may be lost. After reload, reopen currently saved text for user review while retaining durable workspace selections, order, title and settings. Protect unsaved edits during the current session, including preference reevaluation and Merge.

Direct filesystem overwrite detection is best-effort without cross-process locking; do not claim atomic compare-and-swap against external editors. Report successful source update only after actual successful write/close and validation. Where original writes are unavailable, provide explicit replacement/export and explain which file was saved.

## 6. Persistent Combine workspace and import

Persist reference membership, checked selections, order/sort choice, document title and the four output booleans. Do not persist authoritative transcript copies. Resolved content is fetched from currently accessible archives.

All imported combined documents flatten into individual recording references. New entries are initially checked. Same-reference additions are idempotent, including additions from current Search. Different archives remain independent.

Nonempty-workspace import always presents Merge (preselected), explicit replacement, and Cancel. Merge keeps all existing entry states, order, title/settings and drafts, appends new references in imported order and does not silently resort. Duplicate imported references do not overwrite existing entries. Imported settings/title apply when opening into an empty workspace or explicitly replacing; they do not replace settings during Merge. Dirty state must be settled or safely retained before replacement. Cancel changes nothing. Validate before durable commit; unresolved references must not disappear or cause unrelated workspace data to be removed.

Preserve Show/Hide, Edit, Select All, collapse/expand, existing date/name sort options and styling. Export selected entries only, in workspace order. Do not silently omit unresolved selected entries; obtain access or report inability to generate the complete requested document.

## 7. Portable documents

Use one versioned reference payload across TXT, HTML and DOCX. It contains document identity/title, ordered archive/recording/operation references, relevant descriptive selection/export information, original provenance, and output settings. Export-time model information may be descriptive but never bind future selection. No duplicate authoritative transcript body is stored in this payload.

Visible output contains full selected transcript text as resolved for that export, preserving paragraphs. Previously exported documents are static. Reimport restores references/order/settings, then resolves current preferred text; later corrections or model availability changes intentionally alter regenerated output. Never overwrite source transcripts from imported visible text.

The round-trip guarantee is **references, order, provenance and settings**, not identical historical transcript text. Memora must request unavailable archives. Exported files remain readable without those archives, but reimport cannot promise current resolution without them.

- TXT: readable text plus a clearly delimited trailing reference payload. Plain text cannot hide this metadata. Specify UTF-8, exact framing, Unicode/escaping, size limits and corruption checks in Phase 1.
- HTML: safe inert embedded reference payload; parse without executing imported scripts or inserting untrusted markup. Preserve existing standalone desktop relative-audio playback and iPhone suppression.
- DOCX: approved leading candidate is the standard `Memora.Collection.v1` custom string property in `docProps/custom.xml`, retaining the existing docx 9.7.1 exporter. Isolated Edge round trips passed through 5,000 references and installed Windows Word open/resave preserved metadata through 1,000 references; see the [validation evidence](validation/docx-custom-properties/README.md). Keep reference schema validation and envelope encoding/decoding separate from property storage and from readable rendering. Preserve existing readable DOCX output except for separately approved presentation controls. Microsoft documents a 255-character string-property limit despite longer values surviving the tested Word build; retain this known interoperability risk. Do not implement a custom XML part unless additional tests establish necessity. Real iPhone Safari acceptance is required before declaring cross-platform readiness.

Validate schema versions, IDs, shape, entry counts, sizes, path safety and integrity before commit. Reject malformed/unsupported payloads with actionable messages; do not guess from headings or parse old combined formats. Failed imports must not change the workspace, selections, drafts, settings or existing transcripts. Use bounded ZIP inspection/decompression, entry-count and expansion limits, and reject ambiguous/duplicate metadata parts and unsafe paths. JSZip alone does not establish these safeguards. External Word text-edit synchronization is outside scope. Metadata loss/corruption must be reported, never silently reconstructed from visible text. Measurement-based import limits and the DOCX direction are approved; numeric thresholds and remaining framing/schema details must be finalized without claiming unimplemented capabilities.

## 8. Output and delivery

Desktop and iPhone share a delimited Output section in this order:

1. Output heading/boundary.
2. Editable combined document title.
3. Four independent inclusion checkboxes: recording filenames; recording date and duration together; other metadata; visible separators.
4. Existing platform-specific save controls.

Remove Combine Create paragraphs and its processing; keep transcription paragraphing unchanged. Approved initial defaults: filenames, date/duration and separators on; other metadata off. Presentation settings never strip underlying reference/provenance metadata. Suppressed metadata remains in the portable payload; TXT's trailing payload is visible as raw text. All-off output retains readable section spacing and structured recording boundaries without optional visible rules.

Desktop keeps three destination buttons followed by three create/export buttons. iPhone keeps format selector then Save/share. Keep serialization separate from file transport, MIME/extension consistent, and cancellation non-destructive. Preserve user activation for pickers/share sheets and no silent iOS writes.

For selected entries from exactly one known original audio source with a known folder name, suggest that name; otherwise use a neutral combined name. Do not equate same-named folders. Suggested filename stays editable; preserve a manually chosen title during reevaluation/Merge. Specify title-versus-filename automatic-suggestion behavior in Phase 1. Preserve existing overwrite safeguards.

## 9. Provenance and audio resolution

Keep archive provenance separate from audio provenance and immediate import source. Preserve known original archive name/folder/relative path, original audio source logical ID/folder/relative path/filename, recording identifiers and availability states. Do not invent absolute browser filesystem paths. Unknown metadata remains unknown; preserve extensible fields through editing/import/export. Later imports update immediate source context without replacing original provenance.

Audio source identity differs from transcript archive identity. A per-source device-local association registry is shared by Search and Combine. Store handles/permissions separately from portable metadata; no serialized object URLs or promise of portable access.

On Play, reuse a validated association for that source; otherwise prompt with expected source/recording and use available folder/file pickers. Validate paths and identifiers where available, reject ambiguous filename matches, retain existing associations after failed selection, and allow multiple sources concurrently. Recheck permissions on reuse/reload; support iPhone reselection. A successful current association does not prove historical provenance. Unknown source IDs allow explicit limited associations, not automatic archive reconciliation.

No default audio copying into IndexedDB or embedding in documents. Revoke temporary object URLs appropriately. Standalone HTML remains separate from in-app resolution: desktop relative paths, iPhone controls suppressed.

## 10. Query-only Search History

Store search terms, archive UUIDs, behavior-affecting settings and execution timestamp. Retention defaults to 90 days and is configurable in Settings, with clear-history control. No transcript text, result snapshots, immutable content blobs or reference counting for history.

Selecting history restores parameters and permits explicit rerun using current preferred transcripts. Clearly identify target archives; request missing archives or explicit target changes rather than silently changing scope. Results may differ. History expiry/deletion never deletes transcripts, archives, workspace entries or combined files. Approved retention range is 1–365 days, measured from execution time; viewing does not extend retention. Purge on startup, history access and retention changes. Reruns create fresh entries.

## 11. Storage, migration and integrity

Reuse `database.js` and existing isolated database tests. Prefer additive stores for archive registry/workspace/history where needed; preserve existing transcript and semantic/model data. Do not replace filename key paths in place or silently assign historical identity to legacy IndexedDB entries.

Workspace/history writes should be transactional. Stage/validate imports before mutation. Handle quota exhaustion, interrupted writes, permission expiry, failed generation and cancelled share without losing previous durable state. Do not clear unrelated stores. Update storage reporting and cleanup semantics with any new stores. No automatic history expiry may clear workspaces or archives.

Avoid unnecessary abstractions/dependencies. Security limits include payload sizes, DOCX expanded size/entry counts, inert HTML parsing and rejection of traversal/unsafe paths. Large-collection behavior and lazy rendering require measurement and real iPhone acceptance.

## 12. Approved eight-phase implementation sequence

Phase 1 prepares contracts only until their approval. Subsequent phases require implementation authorization and acceptance evidence. Data-integrity testing applies throughout.

| Phase | Work and principal affected files | Acceptance gate |
|---|---|---|
| 1. Contracts and feasibility | Architecture and Phase 1 contracts; inspect `combine.js`, `search.js`, `searchUI.js`, `combineUI.js`, `app.js`, `storage.js`, `database.js`, `docx.js`, `html.js`, Settings and tests. No application edits yet. | Identity, dynamic selection, editing, merge, payload, migration and feasibility decisions approved. |
| 2. Archive migration tool | Integrated inventory/preview/copy verification/restart; likely `storage.js`, `app.js`, `index.html`, relevant CSS and focused migration responsibilities. Database changes only through its owner if required. | Ambiguities block writes; original text/models preserved; interrupted migration recoverable; read-only copy workflow honest. |
| 3. New transcription/storage integration | `app.js` header writer/import/save, `storage.js`, metadata handling and `database.js` as needed. | New and migrated transcripts satisfy the same contract; no preferred flag; existing IndexedDB preserved. |
| 4. Shared authoritative editing | `searchUI.js`, `combineUI.js`, shared preference in `combine.js`, `search.js`, persistence adapters and `app.js`. | Search/Combine use identical preference before searching; exact-file saves, external-change and dirty-editor protections pass. |
| 5. Combine workspace and imports | `combineUI.js`, `combine.js`, `app.js`, `storage.js`, `database.js`, structured import responsibilities and UI. | Persistent multi-archive workspace; Merge prompt/default; duplicate reference rules; unresolved references/drafts/settings preserved. |
| 6. Export formats and Output UI | `combine.js`, `docx.js`, `html.js`, `app.js`, `index.html`, CSS; preserve `combineShareExport.js` transport. | Three-format metadata round trips; static readable exports; four controls; no Combine paragraphing; desktop/iPhone flows accepted. |
| 7. Lightweight Search History | `searchUI.js`, `search.js` integration, `settings.js`, `database.js`, `storageManager.js`, UI/CSS as needed. | Query-only persistence, 90-day default/configuration/clear, explicit current rerun, no unrelated deletion. |
| 8. Shared audio resolution | Existing `searchUI.js` resolution, `combineUI.js` integration, `app.js`, `storage.js`, shared source association responsibility. | Two sources concurrently, wrong-folder/ambiguity/permission tests, cross-interface reuse and standalone HTML regression checks. |

Phases 2–3 share the Phase 1 schema. Phase 5 requires the format reader/writer contract and DOCX feasibility from Phase 1 even though finished exporters/UI ship in Phase 6. Existing playback remains functional until Phase 8. Avoid assuming a new dependency works until verified.

## 13. Acceptance matrix

| Area | Required evidence |
|---|---|
| Identity/migration | Same filenames in different archives remain separate; recording IDs shared across models; ambiguous associations require confirmation; renamed folders retain manifest identity; no deleted alternatives; untouched originals and interrupted-copy recovery. |
| Dynamic selection | Add higher model, remove winner, modify winner, reopen Search/Combine and reimport documents; both interfaces agree; translation/transcription remain separate; ambiguous top candidates fail visibly; no permanent preference metadata. |
| Search | Preference applied before lexical/semantic matching; changed content invalidates derived results; existing ranking/highlighting retained; lower-model-only matches excluded. |
| Editing | Explicit save updates exact target only; metadata/paragraphs retained; next invocation sees correction; concurrent modification blocked; preference changes with dirty editor never retarget save or discard draft. |
| Workspace/Merge | Nonempty import always prompts with Merge preselected; repeated same-reference additions produce one row; existing order/checks/title/settings/drafts untouched; genuinely new entries append in imported order; Cancel is inert; reload preserves approved state. |
| Portable formats | TXT/DOCX/HTML restore the same references/order/provenance/settings; regeneration uses current preferred text; old readable export stays unchanged; missing archives requested; malformed/oversized/unsupported payloads rejected without partial state loss. |
| Output | Four independent controls across all formats, including all-off/all-on and mixed cases; readable boundaries persist; metadata retained; no Combine paragraphing; suggested filename respects source identity and manual choices. |
| History | Default 90 days; Settings changes honored; explicit rerun may differ; no bodies/snapshots; expiry/clear affects only history; absent archive not silently substituted. |
| Audio | Original source survives successive imports/exports; same-named distinct folders not merged; second source leaves first accessible; wrong/ambiguous selection changes no association; permissions rechecked; standalone desktop/iPhone behavior retained. |
| Integrity/platform | Quota, interrupted import/save/migration, cancelled share and permission loss preserve prior state; large-collection behavior measured; desktop and real iPhone accepted. |

## 14. Implementation instructions

Use latest repository sources and existing module boundaries. Do not implement cross-archive matching, legacy combined parsers, transcript history stores, historical search snapshots, collection-local transcript edits, another Combine paragraphing pass, or a global default audio source. Do not update application build IDs for documentation-only work.

Record phase evidence in project documentation. When delivering changed application files through chat, preserve original filenames and package only changed files in a ZIP where applicable. Do not modify application code until the updated contracts are approved.
