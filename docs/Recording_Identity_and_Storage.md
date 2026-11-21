# Recording identity and storage

Current-source contract, **21 November 2026**, commit **95fe938**, application **2026-11-21.10**, database **10**. It consolidates identity, cache and database guidance without changing those implementations.

The [exact prefix-ID contract](Recording_Identity_Prefix_Contract.md#prefix-method-version-1) stays separate. Its method/vector remain authoritative; historical rollout/JSON instructions elsewhere in that file are superseded by this current integration contract. Full earlier handoffs, implementation checkpoints and audits remain in the [dated archive](archive/README.md#contracts-superseded-by-current-references--21-november-2026).

## Authorities and identity boundaries

| Information | Current authority | Does not establish |
|---|---|---|
| Recording ID | Valid embedded Apple/iMuse identity, or approved reproducible fallback after supported metadata inspection reports absent. | Archive membership, physical-folder identity or complete byte equality. |
| Transcript collection | Archive UUID in readable TXT; empty new collections receive a session UUID written into the first TXT. | Permission to an archive, or a different identity merely because its folder was renamed. |
| Transcript candidate and content | Current TXT model/operation/recording metadata and body. | A permanently preferred model flag or automatically preserved edit history. |
| Original folder/path | Descriptive provenance where available. | Unique identity, access permission or a required source UUID binding. |
| Local inventory/cache | Derived observation of accessible files; actual handles/snapshots are separate. | Missing TXT identity, authoritative transcript text outside its own full-text cache role, or access to an unavailable file. |
| Search index | Compatible derived embeddings/text representations. | The authoritative transcript or recording identity. |

A recording may have multiple model/operation transcripts. Collection membership and future Combine references are archive-scoped; two archive UUIDs remain independent even with equal filenames, text or embedded recording IDs. Copying TXT while retaining its Archive UUID retains its logical collection identity. Different physical native folders can still be kept separate in local scope bookkeeping. Any independent-copy identity policy needs explicit design; do not rewrite IDs on folder selection.

## Embedded and reproducible recording identity

The read-only [container reader](../js/recordingIdentity.js) recognizes supported Apple/iMuse identities. Valid embedded identity takes precedence and is retained, including spelling/case. Conflicting, invalid, unsupported or unreadable metadata is an explicit issue; unsupported does not mean absent.

Only a supported container positively reporting no embedded ID permits the [reproducible method](../js/reproducibleRecordingIdentity.js):
- Method version: memora-recording-prefix-v1.
- SHA-256 input: exact versioned frame containing file size/sample bound, followed by up to the first **256000 bytes**.
- Filename is not an input. Rename and cache clearing must reproduce the same ID for the same sampled input.
- The returned UUID uses the method's specified version/variant transformation; the full digest/sample evidence is separate.
- Same-size files with the same sampled prefix can remain indistinguishable despite different tails. This is not a full-file hash or proof of byte identity.
- Short/unreadable/canceled inspection must not produce a speculative replacement identity.

The [independent test vector](Recording_Identity_Prefix_Contract.md#independent-test-vector), framing and cancellation rules must remain stable. Do not change the sample length, framing, normalization or UUID transformation as cosmetic cleanup. The resolver's immutable-File cache is not permission to reuse identity for a different snapshot.

Historical random source-list UUIDs and source-UUID bindings are retired, with no legacy audio JSON support requested. Existing disk JSON is ignored/untouched; current code does not invent replacement IDs from it. A genuine unidentified legacy association would need explicit investigation, not resurrection of a removed recovery workflow.

## Current readable TXT contract

[transcriptMetadata.js](../js/transcriptMetadata.js), [combine.js](../js/combine.js) and the current writer in [app.js](../js/app.js) own parsing/output. Existing date/duration/model/operation/language and audio-relative-path fields remain readable rather than duplicated into a JSON header.

Identity/provenance fields written for new TXT:
- Metadata version: 1.
- Archive UUID.
- Original Audio Folder.
- Recording ID.
- Recording ID method: memora-recording-prefix-v1 only where fallback identity requires that declaration.

The audio filename remains the first line and the supported dashed header/body separator remains. Historical Voice Memo ID is accepted; disagreement with Recording ID is a conflict. Invalid UUIDs, repeated identity fields or unsupported declared metadata/method versions are reported without speculative rewriting. Historical Audio Source ID is intentionally ignored, including malformed/repeated values.

Paths are descriptive and retain their context; do not reinterpret a transcript-relative audio path as source-relative. Metadata is not inferred from spoken body text. Original folder names must fit a single readable header line.

Existing transcripts are not automatically backfilled with repository/precision/backend fields or a new timestamp. Their model-family labels remain valid; exact runtime provenance belongs in execution/self-test evidence.

## Collection loading and preference

The TXT catalogue reads the currently selected folder, including the immediate files supplied by a complete file-input folder selection. Conflicts/read failures stay explicit. Empty new destinations need no sidecar; stable session collection identity permits their first generated TXT.

Current highest-family selection is shared by Search and Combine. Same-family filename-counter priority remains agreed but unimplemented; equal ranks currently keep the first encountered candidate. Complete cache snapshot replacement is a different rule and cannot select the newest actual transcript version.

A read-only mixed collection may be displayed, but adding new transcripts to an ambiguous/missing-identity collection is blocked rather than silently assigning historical membership. Actual loaded TXT content remains the authority over old cache observations.

## Three local-data roles

1. **Audio folder metadata:** inspection/identity, relative paths, metadata and scope evidence; no audio bytes or decoded samples.
2. **Transcript folder metadata:** current file/identity/model/operation/path/size/time observations; no copied transcript bodies.
3. **Cached full-text transcripts:** a distinct browser-local store of TXT content with durable variant identity.

The full-text key uses Archive UUID, Recording ID, normalized filename, model and operation. Same-named transcripts in different archive UUIDs remain distinguishable. Preserved legacy records and normalization collisions from the schema-8 migration are not silently merged or discarded. Cache availability still does not implement a persistent Combine workspace or grant folder access.

Both folder-metadata caches are bounded to 16 scopes. Native directory handles associate through isSameEntry, with unchanged size/time plus inspection version supporting metadata reuse. Phone file-input snapshots require current recording identity inspection before logical inventory association/date-duration reuse. Identical copies without native physical-folder proof cannot always be distinguished; uncertainty must not borrow another folder's access.

Successful complete refreshes replace an established scope's latest snapshot. Partial, canceled, malformed or failed scans preserve its last successful complete observation. A new unproven/empty logical scope is not grounds to delete a different folder's cache. Actual duplicate audio IDs remain ambiguous, not “newest file wins.”

Settings refresh/listing also consolidates identified old transcript snapshots and removes empty rows; proven separate native locations survive. Revision checks reject stale replacement/deletion; Web Locks coordinate supported cross-tab work. Cache failure is reported without inventing identity or converting a successful file read into a model failure.

## Database ownership and preservation

[database.js](../js/database.js) alone owns Memora schema/opening. Feature consumers close their caller-owned connections. Runtime classification, schema repair and model-registry population are separate responsibilities.

| Store | Key | Required indexes / purpose |
|---|---|---|
| audioFolderCatalogues | id | Metadata-only latest audio observations. |
| transcriptCatalogues | id | TXT-derived latest folder observations. |
| transcripts | id | filenameKey and archiveFilename; durable full-text variant cache. |
| semanticEntries | id | representationKey and sourceKey; derived embeddings. |
| semanticMetadata | key | Retained legacy semantic metadata. |
| modelRegistry | id | Persisted definition projection; not downloaded weights or qualification. |

Schema 9 added audioFolderCatalogues; schema 10 removes only retired audioSourceRecovery. The known filename-keyed transcript migration is schema 8 and preserves bodies/legacy collisions transactionally. These are recorded historical transitions, not instructions to open the current database at an older version.

Unknown compatible stores/records are preserved. Incompatible structures/future versions are refused rather than reset; aborted upgrades roll back. Connections close on versionchange and blocked/abandoned initialization must not silently change the database later. A rollback needs a compatible forward fix, not downgrade/reset. Keep the sibling iMuse recording database untouched.

Deletion controls must distinguish derived folder metadata, cached full text, embedding data, registry definitions, downloaded model weights and evidence histories. Deleting a local observation does not delete audio/TXT/JSON in user folders. Clearing model definitions does not create qualification or imply deletion of weights. Browser storage is origin/profile-local and subject to eviction; project paths alone do not guarantee isolation.

## Search compatibility and delivery

search-embeddings.json remains active and independent. Reuse requires current format/model/content/identity compatibility; changed text cannot reuse stale vectors merely because a filename matches. The literal audioSourceId:null slot in serialized hashes is intentionally retained for key compatibility, not source-JSON authority.

Native writing, local cache persistence and external mobile sharing have different success states. [File workflows](Architecture_and_File_Workflows.md#delivery-and-honest-completion) owns delivery rules. Sharing returns without verifying Files destination or replacement; no sidecar save is required before TXT export.

## Preserved lessons and limits

The retired lists failed as durable authorities under deletion/recreation, backups, cross-device writes and numbered mobile copies. Preserve the archived evidence, complete/partial-read distinction, meaningful conflict presentation, bounded-read limits and revision protection. Do not ask users to redo the completed four-archive migration.

Requested slice bytes are not cloud-transfer measurements; timestamps alone are not file-content conflict proof; cached IDs are not current file access; current durable keys are not multi-archive UI completeness. See [future Combine contract](Multi_Archive_Combine_Contract.md) for the latter boundary.

This consolidation ran no runtime/model/device tests or migrations. [Prefix contract](Recording_Identity_Prefix_Contract.md), original histories, research and validation evidence remain available; the [audit](Documentation_Audit_2026-11-21.md) records their disposition.
