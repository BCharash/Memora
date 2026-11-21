# Memora — Phase 1 Contract Review Package

## TXT catalogue and explicit transcription candidate — 21 November 2026

Build **2026-11-21.1**, schema **7**, implements the approved change: retire the external transcript JSON requirement, retain **memora-audio-source.json** and **search-embeddings.json**, and read identity/model/operation/audio metadata from TXT into a rebuildable local cache. Existing sidecars stay untouched. New empty destinations need no JSON; desktop creates a child, while iPhone names an intended folder for Save to Files. Source stays above and destination below. Enable Transcription guards untouched returns from Combine/Search while excluding Settings; recording defaults are unchecked. Save warnings distinguish pending from share-return verification; iPhone shares TXT only, with a prominent batch-bound destination. Settings exposes the bounded metadata cache; the schema upgrade preserves other stores. See [current implementation and device checklist](CURRENT_STATUS.md#implemented-candidate-txt-catalogue-and-explicit-transcription--21-november-2026). Earlier proposals below are historical. The numbered audio-JSON replacement and hosted Mac picker reports remain unresolved/separate; no deployment or user-data modification.


Verification: **129 groups passed** — 18 current TXT-catalogue/session integration, 13 database/schema, 10 database/Settings integration, 19 recording identity/embedding compatibility, 47 audio persistence/recovery, 10 playback, 7 shared-folder access and 5 bounded metadata groups. Tests use synthetic files, isolated databases and stubbed model/Search execution. These counts replace the old .7 app-sidecar test counts; they do not establish real iPhone Files or model acceptance.


## Planned for 21 November: Enable Transcription

Decision recorded 20 November 2026; **documentation only**, not implemented. Keep the initial Transcribe Audio Source and Transcript Destination selectors visible. If the user leaves untouched Transcribe for Combine/Search, returning hides its controls behind **Enable Transcription**; Settings is excluded. Direct Transcribe activity or Enable Transcription keeps setup available for the session. Reuse shared folders, defer Transcribe-only recording-list work and leave its recordings unchecked by default.

The same planned pass distinguishes never-saved batches from share-return verification prompts, fixes stale iPhone destination guidance with one prominent current-batch location, and presents one concise Audio Recording List status before the Transcript File List status. Preserve canceled/failed-save retries, files-only transcript-plus-JSON sharing, independent audio-parent JSON saves and identity/write safeguards. See the [current implementation plan](CURRENT_STATUS.md#next-implementation-enable-transcription-and-save-guidance) for the full state rules, wording, checkpoints and device acceptance. Current code/build remains **2026-11-20.7**, schema **6**; no new tests or device results are established by this plan.


## Current boundary and later selection decision — 19 November 2026

Reviewed at **47ca641**, displayed build **2026-11-19.25**, the source implements root transcript reconciliation/Edit/Combine source reading and save guidance, not the full workspace/import contracts below. Canonical transcript list: memora-transcript-archive.json. Paragraph controls are removed from Combine; DOCX/HTML output-metadata selectors remain deferred.

The later user decision keeps transcript model-family metadata simple: no repository/configuration/precision/backend expansion, transcription timestamp or backfill tool. Priority should be family then recognized filename counter for the same archive/recording/operation, preserving all alternatives. Counter priority is agreed but not implemented; desktop generates -2/-3 names and file-input/iPhone leaves collisions to Files. Missing timestamps are not to be filled by guessing filesystem creation dates. Parent/recursive catalogue work, persistent workspace/imports and Search/Transcribe full reconciliation are still subsequent stages. See [current status](CURRENT_STATUS.md) before interpreting older “current/next” statements.

**Date:** 16 November 2026
**Status — 18 November 2026:** Archive migration is complete and retired. Identity checkpoints 1/2A/2B are committed; the user passed the 2B harness. Candidate **2026-11-18.1** now integrates checkpoint 3 transcription/storage identity within architecture Phase 3. Checkpoint 3 is committed as `4c8e5f7`; complete desktop/real-iPhone acceptance remains pending. See [implementation contract section 15](Recording_Identity_Implementation_Contract.md#15-checkpoint-3--production-transcription-integration). Broader Combine phases, portable document imports and their gates remain pending.
**Authority:** [Approved revised architecture](MEMORA_COMBINE_ARCHITECTURE.md). The eight-phase sequence, individual metadata contract and separate-destination migration implementation are authorized. Later integration and device acceptance remain phased.

**Library plan update — 18 November 2026:** The user agreed that opening/refreshing the library discovers child sources, opening/refreshing a source inventories all eligible audio independently of transcription selection, and new source registration is confirmed. Writable access saves approved changes directly; file-input access uses explicit JSON saves. Incomplete access never proves deletion. See [agreed maintenance and ordered checkpoints](Audio_Library_Architecture_Proposal.md#agreed-catalogue-and-recording-list-maintenance). First finish ownership/schema/access contracts, then production desktop/mobile reconciliation, shared multi-source audio resolution and parent discovery; resume shared editing, persistent Combine/imports and exports/history afterward. Parent schema and application implementation remain pending; this task authorizes documentation only. Four-archive remigration and rebuilt Search indexes are user-reported successful. iPhone Search worked after cache/reload and reopening; the crash cause is unconfirmed.

## 1. Approval boundary

Already approved: dynamic preference; archive/recording identity; direct authoritative editing; persistent reference workspace; no Combine paragraphing; query-only history; 90-day configurable retention; nonempty-import prompt with Merge preselected; reference-based merge preserving existing state; eight implementation phases.

Subsequent approved decisions: no persistent unsaved drafts; other metadata defaults off while the other three output controls default on; retention range 1–365 days; separate-destination migration with originals untouched; measurement-based import limits; standard DOCX custom properties as leading candidate. Preserve DOCX rendering, separate metadata from rendering/schema, reject invalid imports without state changes, retain the Microsoft 255-character discrepancy, implement production ZIP safeguards, defer custom XML unless demonstrated necessary, and require real iPhone Safari acceptance before cross-platform readiness. These decisions do not require reconfirmation.

Unsettled proposals below remain subject to their specific review gates; superseded historical proposals are explicitly identified. Technical feasibility items remain open and must be verified before claiming the corresponding contract is implementable. Do not request approval again for settled architectural decisions.

## 2. Logical schemas (proposed schema version 1)

Names below describe serialized fields, not required module/class names. IDs are opaque strings; newly assigned archive, recording, document, workspace and audio-source identities use UUIDs generated with browser cryptographic facilities. Recording UUIDs are interpreted within the archive. Never derive identity solely from filename or content hashes.

| Record | Required fields and semantics |
|---|---|
| Archive manifest | `schemaVersion`, `archiveUuid`, `archiveName`, `recordings[]`; optional preserved extensions. Each recording has `recordingId`, source metadata and `transcripts[]`. |
| Transcript manifest item | `relativePath`, `model`, `operation`. Paths are relative to archive root; manifest lists candidates, never the preferred transcript. Duplicate/conflicting candidates require validation. |
| Individual transcript metadata | `schemaVersion`, `archiveUuid`, `recordingId`, `model`, `operation`, provenance and optional revision/extension fields. Existing readable header fields retained. |
| Recording reference | `archiveUuid`, `recordingId`, `operation`; exact three-field membership identity. `operation` is only `transcribe` or `translate`. |
| Workspace | `schemaVersion`, `workspaceId`, `title`, `sortMode`, `entries[]`, `outputSettings`, timestamps. Entry = recording reference plus `selected`. Array order is authoritative until explicit sorting. |
| Combined-document payload | `schemaVersion`, `documentId`, `title`, ordered `entries[]` of references with provenance, `outputSettings`; optional export-time model/revision annotations are descriptive only. Contains exported entries only; all are initially selected when opened. |
| History entry | ID, search terms, archive UUIDs, behavior-affecting search settings, execution timestamp. No transcript text, result rows or scores. |
| Device-local source association | Audio source ID to accessible handles/files and permission/resolution state. Never part of portable payload. |

Use `outputSettings.showRecordingFilenames`, `showRecordingDateDuration`, `showOtherMetadata`, `showSeparators`; approved defaults true for filenames, date/duration and separators, false for other metadata. No paragraphing property or Combine transformation.

Provenance separates original archive identity/name/folder/relative path, original audio-source ID/folder/relative path/filename, and immediate import source. Missing information uses absent/null values plus explicit unknown/unavailable states where meaningful. No fabricated paths. Preserve unknown extension metadata. Original provenance is not overwritten by re-selection or a subsequent import source.

## 3. Transcript metadata encoding

**Latest user-approved correction:** Individual TXT metadata is readable `Label: value`, not a JSON line. Use `Recording ID` universally, retaining Apple UUID values and accepting legacy `Voice Memo ID` labels on input. Add readable metadata version, archive UUID, audio-source ID and original audio-folder name; reuse first-line filename, model/operation and transcript-relative audio path without duplicates. Preserve nonredundant information and body bytes. The four archives were corrected externally after migration; the utility is now removed. The prior JSON proposal below is superseded for individual TXT output; JSON remains an internal/interchange concern.

Preserve the existing readable header/body separator and use readable `Label: value` metadata. Keep the audio filename on the first line, existing date/duration/model/operation fields and transcript-relative `Audio Relative Path`. Add readable metadata version, Archive UUID, Audio Source ID and Original Audio Folder. Do not duplicate those fields in an opaque JSON header line or require another source-relative audio path for the known archive layout. Source-owned JSON (`memora-audio-source.json`) and combined-document reference JSON are separate formats with separate purposes.

The earlier `Memora metadata v1: {…}` individual-header proposal is superseded and must not be implemented. Migration-era JSON codec details are historical, not the current TXT writer/parser contract. All four migrated archives were subsequently corrected externally to use `Recording ID`; do not recreate migration or rewrite those archives.

Preserve body bytes, nonredundant metadata, unknown fields and established identities. Accept legacy `Voice Memo ID` on input; disagreeing dual identity labels are a conflict. Archive and audio-source identity remain distinct. Do not reinterpret a transcript-relative audio path as a source-relative one. Unsupported or conflicting identity metadata must be reported without speculative rewriting. The latest detailed identity rules and compatibility work are in the [implementation contract](Recording_Identity_Implementation_Contract.md).

Recording association is archive-scoped. Names alone do not establish shared identity. A copied manifest retaining its UUID denotes the same logical archive; independent archive identity requires explicit assignment rather than folder-name detection. No cross-archive matching is authorized.

## 4. Preferred-transcript decision table

Use the shared selector behind current Search and Combine integration. Implemented family ranks are tiny 1, base 2, small 3, medium 4, and historical large/large-v3 5. Current equal ranks keep first encounter. The table below records the approved target, including the later filename-counter decision; it is not a claim that the whole workspace/import contract or tie-breaker is implemented.

| Situation within archive/recording/operation | Result |
|---|---|
| One or several valid differently ranked candidates | Highest ranked currently available file. |
| Higher model newly appears | It becomes preferred on next invocation/refresh/import; dirty editor is protected. |
| Winning file removed | Next highest valid file; no candidates leaves unresolved reference. |
| Winning file edited | Same candidate, new text; invalidate affected derived search/index data. |
| Lower-ranked file edited | It remains lower-ranked; no correction propagation or override. |
| Multiple recognized same-family versions | Agreed target: highest recognized filename counter; unsuffixed = 1. This tie-breaker is not implemented yet. Retain older TXT/edits; define iPhone Files naming scope explicitly. |
| Conflicting identity, unknown candidate model or names outside the recognized counter policy | Keep the conflict/unresolved state explicit; do not invent a generation, filesystem date or precision priority. |
| Different operation or archive UUID | Independent group, regardless of matching text/name/Voice Memo ID. |
| Archive unavailable | Preserve reference, request archive; no validated-current claim. |

Re-inventory candidates when a relevant archive is accessed/refreshed and at workflow invocation. Validate file content/revision for reused derived Search data; neither a persistent preferred flag nor stale manifest alone proves current availability. Browser access cannot guarantee passive filesystem watching; changes become effective through the next permitted access/refresh.

Before Search matching/indexing, resolve preferred records. Preserve current ranking/highlighting semantics over that selected content. Before export, refresh selected references and build one consistent in-memory render input; do not mutate the workspace if file access or generation fails. Exports are a resolved reading of accessible files, not an atomic filesystem-wide snapshot.

## 5. Editor contract

Editor state includes recording reference, exact target file/model/operation, base content or content digest, base metadata/revision, draft and dirty flag. This is temporary editor state, not a historical version database.

On Save Changes, re-read exact target and compare with base state. Use content comparison/digest, not only last-modified timestamps. Conflict preserves draft and requires explicit reload/review/save-as; never overwrite automatically. Write/close and verify before reporting success. Other models stay unchanged. Recheck/refresh affected Search/Combine data after save.

Preference change with dirty draft: prompt before any switch; permit continue editing original, explicit safe save to original, or discard and switch. No Save handler may resolve a new preferred file and write the old draft into it. Merge must not close/reset the editor. Replacement must settle drafts or cancel.

Approved: do not persist or recover unsaved editor drafts across reloads. Protect drafts during normal in-session use and attempt browser reload/close warnings where supported; warnings are not guaranteed. After reload, reopen saved transcript text for review. Durable workspace selections/order/title/settings persist. A missing edit target requires explicit recovery/export during the current session.

No guarantee of atomic compare-and-swap with external programs: recheck immediately before write, coordinate app-owned editors, retain a verified recovery copy during replacement, and document the remaining filesystem race.

## 6. Merge/open contract

Validate entire payload first. Empty workspace: restore title/settings/order, entries checked. Nonempty workspace: always ask Merge (preselected), Replace, or Cancel.

Merge builds a set of existing reference tuples. Keep existing objects, checked states, relative order, drafts, title, output settings and sort choice. Append first occurrence of each genuinely new tuple in imported order, checked. Repeated incoming references collapse by exact tuple only. Do not apply a stored sort automatically during Merge or preferred-content refresh. Preserve unresolved references as entries needing archive access. Resolve available references without retargeting dirty editors.

Replace requires explicit choice and draft protection, then restores imported state. Cancel leaves memory and durable workspace unchanged. Commit resulting workspace in one IndexedDB transaction after validation and user choice. Loading additional archives must not clear workspace or silently substitute an archive.

## 7. Portable framing and security proposal

One logical JSON payload, with deterministic UTF-8 serialization and no canonical transcript bodies. Proposed envelope: format marker `memora-collection`, envelope version 1, Base64-encoded UTF-8 payload, declared decoded byte length and SHA-256 checksum. Checksum detects accidental damage, not authenticity. Reject unsupported versions, invalid encoding, checksum/length mismatches, invalid references or counts before mutation. Unknown extension metadata is preserved within limits.

- TXT: append `-----BEGIN MEMORA COLLECTION V1-----`, one compact envelope JSON line, and `-----END MEMORA COLLECTION V1-----` at EOF. Parser uses this exact terminal frame, not readable headings/separators. User transcript text containing markers must not affect parsing. Prove collision handling with fixtures.
- HTML: one inert structured-data container with an exact Memora marker and envelope JSON; Base64 avoids raw script-closing sequences in payload strings. Parse without executing imported content or fetching its resources. Never import/render arbitrary document markup as trusted UI.
- DOCX: standard `Memora.Collection.v1` custom string property is the approved leading implementation candidate. Retain the existing exporter/readable rendering except for approved Output settings. Isolated Edge round trips passed through 5,000 references; installed Windows Word open/resave preserved exact metadata through 1,000 references. See the [validation report](validation/docx-custom-properties/README.md). Real iPhone Safari and broader Word/browser compatibility remain pending. Keep Microsoft's documented 255-character discrepancy as an explicit risk. Do not implement custom XML unless further tests demonstrate necessity. The test-only JSZip use does not automatically approve a production dependency addition.

Proposed initial safety limits for approval/measurement: 25 MiB decoded reference payload; 100 MiB input file; DOCX 200 MiB total expanded data and 10,000 ZIP entries; 10,000 recording references per document; reject traversal paths and external package relationships used for payload access. These are configurable implementation constants, not measured device capacity guarantees. Adjust from representative desktop/iPhone samples before release.

### Approved separation of responsibilities

Canonical reference schema and validation are format-independent. The envelope codec handles UTF-8/Base64, length and checksum only. The DOCX adapter reads/writes the named custom property and package structures only. Rendering continues to receive resolved recording records and approved presentation settings; it must not parse metadata or depend on its storage location. Changing from a property to a custom XML part later must not require canonical schema changes or changes to paragraph/style generation. Keep these responsibilities small; separate functions may suffice rather than a framework or extra abstraction layers.

### Production import and decompression requirements

1. Check input file size before loading it wholly into memory. Inspect ZIP directory structure with explicit entry-count, declared expanded-size and compression-ratio limits; reject unsupported encryption/multipart features and duplicate or colliding metadata entries before any filename normalization can hide them. Do not trust declared sizes as the only protection.
2. Read only the metadata and necessary package-description parts. Bound each part's **actual emitted decompressed bytes** and the cumulative output, with cancellation/timeout behavior; stop as soon as a limit is exceeded, before materializing a giant string. Do not inflate all media or use all-entry CRC verification as an import prerequisite. If the chosen ZIP API cannot support enforceable bounds, change the extraction approach before production integration; a post-inflate length check is insufficient.
3. Reject unsafe/ambiguous paths and external payload relationships. Parse custom-property XML without executing markup, resolving entities or fetching external resources. Require one unambiguous correctly typed Memora property, supported envelope/schema versions, valid encoding, byte length, checksum, entry count and recording references, valid output settings and bounded fields/extension data. Preserve accepted unknown extension metadata without treating it as executable UI or object prototypes.
4. Produce a fully validated candidate import in temporary memory first. Only then offer Merge/Replace and resolve archives. Recheck workspace revision after asynchronous operations before one transactional workspace commit so newer selections or edits are not overwritten. Cancel, invalid metadata, quotas, permission failures and decompression failures must leave prior durable/in-session workspace state intact. Document import never writes transcript text to source files.
5. Report missing, incomplete, invalid, unsupported or size-limited metadata distinctly and clearly. Never silently recover references from visible Word text. Keep unresolved archive references visible under the agreed import policy; distinguish them from invalid input.

Numeric thresholds remain measurement-led; none of the illustrative values above is a release limit yet. Test boundary sizes, forged ZIP size declarations, extreme expansion, duplicate parts/properties, malformed XML/envelopes, checksum/reference errors, cancellation, quota failure and workspace changes during asynchronous validation. Invalid-input tests must assert unchanged workspace contents/settings/selections/drafts and zero source-transcript writes. Test exact baseline readable XML independently of metadata storage.

Reimport ignores visible text for authority and requests referenced archives. External Word editing synchronization and arbitrary third-party import are excluded. Missing/stripped structured metadata is actionable unsupported input; no legacy combined-format parser. Exported readable text remains untouched.

## 8. Persistence and migration proposal

Add lightweight stores through `database.js` only: archive registry, Combine workspace, and query history as required. Final names/version increment are selected with implementation review. Keep existing stores and filename-keyed records; do not change their key path in place or clear semantic/model data. Legacy IndexedDB items require explicit identity assignment through migration; do not merge filename collisions across archives.

Approved migration: create a new migrated archive at a separate destination; leave originals completely untouched. Inventory and preview all changes, record source checksums and planned identities, resolve ambiguities, then verify sources still match the preview. Reject overlapping/aliased destinations and unrelated destination-file overwrites. Copy transcripts with updated metadata and write the manifest; verify every output and exact preservation of transcript body text. Record a durable operation ID, planned IDs, source checksums and per-file completion/verification state outside the original archive. Resume only after revalidating sources and existing outputs; otherwise stop for a fresh preview or restart into a new destination. Detect changes during copying and mark incomplete rather than claiming success. Completion requires all planned files and manifest verified. Never automatically delete/modify source files. In-place migration and its backup/rollback system are deferred. Destination packaging for read-only/iPhone access remains a feasibility task.

Migration is completed and retired: all four archives were migrated, the universal labels were corrected externally, and the utility/tests/transient reports have been removed. Do not build a production migration feature or require the user to repeat the migration. The historical validation/restart design does not change later production Combine merge/edit requirements.

## 9. History Settings proposal

Approved default: 90 days; configurable integer retention days from 1 through 365; expiry measured from each execution's UTC timestamp, unaffected by selecting an entry. Reruns create a fresh execution entry. Retention changes apply on save; purge expired entries at startup, history access and retention save. Increasing retention cannot restore deleted history. Provide explicit Clear Search History confirmation. Expiry/clear transactions target history only. Clock changes follow stored timestamps; document that this is retention behavior, not a trusted time service.

Restoring history parameters does not execute immediately. Missing archives require selection/access or explicit scope change. No transcript bodies or historical results retained.

## 10. Dependency and review checklist before application changes

1. Approve schema/metadata encoding and conflict rules, including explicit independent-copy archive identity behavior.
2. Settled: no draft persistence; other metadata defaults off and the other three controls on; history 1–365 days with 90-day default; copy-based migration leaves originals untouched. Initial import limits remain proposed.
3. DOCX direction approved; existing isolated browser/Word evidence retained. Complete bounded ZIP extraction design, real iPhone Safari and other supported environments before readiness claims. Production dependency addition still requires separate approval; no unnecessary rendering change.
4. Confirm TXT framing with marker-containing content, Unicode and corruption fixtures; confirm safe HTML extraction does not execute/fetch imported content.
5. Inventory representative real archive headers, ambiguous same-model candidates, large collections and iPhone read-only access; select separate-destination migration/export packaging from evidence.
6. Review additive database migration and cleanup compatibility against `tests/database*`, `storageManager.js` and existing browser harness conventions.

No approval of this package should be represented as passed feasibility tests or real-device acceptance. If feasibility requires changing a proposed contract, return that specific change for review before implementation.

## 11. Planned acceptance evidence

### DOCX source-level feasibility investigation

The following paragraphs record the initial source-only investigation. They are superseded where applicable by the subsequently approved and executed [isolated validation report](validation/docx-custom-properties/README.md), its saved browser harness and evidence. Production implementation is still pending approval; installed Windows Word preserved metadata beyond the documented 255-character risk in the tested flow, while real Safari remains untested.

The existing exporter uses docx 9.7.1 and `Packer.toBlob`. Inspection of that exact release confirms two embedding mechanisms: Document options accept `customProperties`, and Packer accepts additional package files through its overrides argument. The compiler emits `docProps/custom.xml` and already depends internally on JSZip. These are source-level findings, not an executed round-trip or Word/iPhone acceptance result.

Recommendation for review: first evaluate a named Memora custom document property containing the reference envelope, using the existing generated custom-properties part rather than introducing `memora/collection.json` and bespoke relationships. This changes the earlier proposed DOCX location and is not yet an approved final contract. Property value encoding and practical large-payload compatibility must be verified before selection. Keep a dedicated package part as a fallback if representative tests show the property approach is unsuitable.

For import, use a directly accessible, pinned ZIP reader to extract the metadata part and the browser XML parser to read the named property. JSZip is a reasonable candidate because docx 9.7.1 already uses it internally; its internal dependency is not a public ZIP-reading API available to Memora. No new general Word renderer/parser is needed. A direct browser import could add download/bundle cost even though the generator internally uses the same library. Verify archive bounds, duplicate/path handling and bounded decompression; JSZip alone does not establish safe import limits. Do not decompress all document media merely to read one metadata part.

Required later evidence: create/reimport Memora DOCX with Unicode references, ordering and output settings; reject missing/corrupt metadata without workspace mutation; measure large payloads and bounded extraction; confirm normal Word reading hides the payload and that desktop/iPhone flows work. No promise of metadata preservation after arbitrary third-party editing/resaving. No application code, dependency installation or executable feasibility fixture was introduced during this investigation.

Primary sources inspected:

- [docx 9.7.1 Document property options](https://github.com/dolanmiu/docx/blob/9.7.1/src/file/core-properties/properties.ts)
- [docx 9.7.1 Packer](https://github.com/dolanmiu/docx/blob/9.7.1/src/export/packer/packer.ts)
- [docx 9.7.1 compiler](https://github.com/dolanmiu/docx/blob/9.7.1/src/export/packer/next-compiler.ts)
- [docx 9.7.1 dependencies](https://github.com/dolanmiu/docx/blob/9.7.1/package.json)
- [JSZip archive loading API](https://stuk.github.io/jszip/documentation/api_jszip/load_async.html)

Import-limit decision: the user approved measurement-based internal limits with clear failure and no workspace mutation. Numeric limits in section 7 remain illustrative proposals, not approved release thresholds.

Each phase's file map and gates are in the architecture. Focused fixtures must establish: archive-scoped identity and migration recovery; added/removed/modified model candidates selected identically in Search/Combine; preferred-before-search indexing; exact-file editing and conflicts; dirty-editor preference changes; reference-preserving reload/Merge/Cancel; cross-format reference round trips with static old readable text; all presentation combinations without metadata loss; 90-day query-only expiry; source-specific playback and real iPhone save/share.

Validation status: isolated DOCX browser/Word evidence remains preserved. Historical migration tests and user-reported completion are recorded in the design journal; the disposable code and temporary migration reports were removed after all four migrations and external label corrections. No production change or iPhone feature acceptance is implied. Next steps are in the [handoff](Recording_Identity_Handoff.md).

## 12. Historical Phase 2 audit — completed tool removed

Read-only repository audit finds `app.js:buildTranscript` writes readable headers and trims newly generated body text; `combine.js:parseTranscriptFile` also trims parsed bodies. Neither is a lossless migration rewrite. Migration must read the original text/bytes, locate a validated header boundary, preserve the body byte-for-byte and modify only metadata in the new copy. Unrecognized/ambiguous headers block affected files for review rather than rewriting them speculatively.

`storage.js:listTextFiles` enumerates only top-level TXT entries, and `writeTextFile` creates/opens a filename and writes directly. Do not reuse these unchanged as a recursive migration inventory or no-overwrite writer. Migration needs source-relative inventory, destination overlap/alias checks, create-without-unrelated-overwrite behavior, per-file verification, and a progress record outside the source. File-input sessions cannot prove disk originals remain unchanged without reselection; explicitly reselect/revalidate or report that verification cannot be completed. Do not imply File objects are live filesystem handles.

Initial desktop delivery: standalone disposable HTML inventory/preview, user-selected empty separate destination, durable operation plan with assigned IDs/source hashes, copy metadata updates, re-read/verify output bodies and manifest, completion marker only after all verification succeeds. Resume reuses the planned IDs and only verified outputs of the same operation; unrelated destination files are never overwritten or deleted. Read-only/iPhone delivery needs explicit packaging/save verification and must not claim unverified device filesystem completion.

At this historical Phase 2 audit, `database.js` was the sole version-5 owner; its four stores/key paths are preserved. Checkpoint 2B later adds only source recovery in schema 6 (implementation contract section 14). Phase 2 can keep operation progress in the destination without migrating the production database merely to copy an archive. Final archive-registry/workspace stores belong to their later integration steps; do not create them prematurely for DOCX validation or migration preview.

The repository contains no representative user transcript archive: the only TXT fixture found is `data/whisper-test/expected-transcription.txt`, which is expected speech text, not an archive-header fixture. Inventory the writer's supported headers with synthetic fixtures first; acceptance against a representative archive still requires explicit user-selected source access. No archive contents have been rewritten or migrated.
